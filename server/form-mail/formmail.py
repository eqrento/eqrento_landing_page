#!/usr/bin/env python3
"""EQrento website forms -> e-mail.

A tiny HTTP service that takes the request sent by the "Book a demo" / "Request a free audit" form on eqrento.com and
sends it as a plain-text e-mail. Nothing is stored: no file, no database, no spreadsheet.

Python standard library only (3.8+), no packages to install.

  POST {FORM_PATH}           the form's JSON (see README.md)  ->  {"ok": true}  or  {"ok": false, "error": "..."}
  GET  {FORM_PATH}/health    {"ok": true}  – for the server administrator's check

  python3 formmail.py           run the service (settings from environment variables, see formmail.env.example)
  python3 formmail.py --test    send one test e-mail with those settings and exit

The web server (nginx) passes the one address to this service; the page itself stays static. The form on the page
falls back to a ready-made e-mail in the visitor's own mail program whenever this service answers anything but
{"ok": true}, so a request is never lost.
"""
import json
import re
import smtplib
import ssl
import sys
import threading
import time
from email.headerregistry import Address
from email.message import EmailMessage
from email.policy import SMTP as SMTP_POLICY
from email.utils import formatdate, make_msgid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os

EMAIL = re.compile(r'^[^\s@<>,;:"()\[\]\\]+@[^\s@<>,;:"()\[\]\\]+\.[^\s@<>,;:"()\[\]\\]{2,}$')
CONTROL = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')   # everything below space except tab, LF and CR


class Config:
    """Settings, read from environment variables (or any mapping – the tests pass a dict)."""

    def __init__(self, source=None):
        source = os.environ if source is None else source

        def get(key, default=''):
            return str(source.get(key, default)).strip()

        self.host = get('FORM_HOST', '127.0.0.1')
        self.port = int(get('FORM_PORT', '8787'))
        self.path = get('FORM_PATH', '/api/demo-request').rstrip('/') or '/'
        self.mail_to = [a.strip() for a in get('MAIL_TO').split(',') if a.strip()]
        self.mail_from = get('MAIL_FROM')
        self.mail_from_name = get('MAIL_FROM_NAME', 'EQrento website')
        self.smtp_host = get('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(get('SMTP_PORT', '587'))
        self.smtp_security = get('SMTP_SECURITY', 'starttls').lower()   # starttls | ssl | none
        self.smtp_user = get('SMTP_USER')
        self.smtp_password = get('SMTP_PASSWORD')
        self.smtp_helo = get('SMTP_HELO') or (self.mail_from.rsplit('@', 1)[-1] if '@' in self.mail_from else '')
        self.allow_origin = [o.strip().rstrip('/') for o in get('ALLOW_ORIGIN').split(',') if o.strip()]
        self.rate_limit = int(get('RATE_LIMIT', '5'))        # requests per address…
        self.rate_window = int(get('RATE_WINDOW', '600'))    # …in this many seconds
        self.min_seconds = int(get('MIN_SECONDS', '3'))      # a form "filled in" faster than this is a bot
        self.max_body = int(get('MAX_BODY', '20000'))        # bytes

    def problems(self):
        found = []
        if not self.mail_to:
            found.append('MAIL_TO is empty (who gets the requests?)')
        for address in self.mail_to + ([self.mail_from] if self.mail_from else []):
            if not EMAIL.match(address):
                found.append('not an e-mail address: ' + address)
        if not self.mail_from:
            found.append('MAIL_FROM is empty (the sender address, e.g. the mailbox that sends)')
        if self.smtp_security not in ('starttls', 'ssl', 'none'):
            found.append('SMTP_SECURITY must be starttls, ssl or none')
        if self.smtp_user and not self.smtp_password:
            found.append('SMTP_USER is set but SMTP_PASSWORD is empty')
        return found


class Invalid(Exception):
    def __init__(self, fields):
        super().__init__(', '.join(fields))
        self.fields = fields


def one_line(value, limit):
    """Text for one line (and for e-mail headers): no control characters, no line breaks, single spaces."""
    if value is None or isinstance(value, (dict, list, bool)):
        return ''
    return ' '.join(CONTROL.sub('', str(value)).split())[:limit]


def many_lines(value, limit):
    if not isinstance(value, str):
        return ''
    return CONTROL.sub('', value.replace('\r\n', '\n').replace('\r', '\n')).strip()[:limit]


def parse(payload):
    """The form's JSON -> clean fields. Raises Invalid with the names of the fields that are missing or wrong."""
    if not isinstance(payload, dict):
        raise Invalid(['body'])
    rents = payload.get('rents')
    if isinstance(rents, str):
        rents = [rents]
    rents = [one_line(r, 80) for r in rents if isinstance(r, str)][:12] if isinstance(rents, list) else []
    source = one_line(payload.get('source'), 120)
    kind = one_line(payload.get('kind'), 20).lower() or ('audit' if 'audit' in source.lower() else 'demo')
    seconds = payload.get('seconds')
    data = {
        'kind': 'audit' if kind == 'audit' else 'demo',
        'rents': [r for r in rents if r],
        'rents_other': one_line(payload.get('rents_other'), 200),
        'fleet_size': one_line(payload.get('fleet_size'), 40),
        'company': one_line(payload.get('company'), 200),
        'name': one_line(payload.get('name'), 120),
        'email': one_line(payload.get('email'), 254),
        'phone': one_line(payload.get('phone'), 60),
        'message': many_lines(payload.get('message'), 4000),
        'source': source,
        'page': one_line(payload.get('page'), 300),
        'referrer': one_line(payload.get('referrer'), 300),
        'utm': one_line(payload.get('utm'), 500),
        'timezone': one_line(payload.get('timezone'), 80),
        'language': one_line(payload.get('language'), 40),
        'seconds': seconds if isinstance(seconds, (int, float)) and not isinstance(seconds, bool) else None,
    }
    wrong = [key for key in ('company', 'name', 'email', 'fleet_size') if not data[key]]
    if not data['rents']:
        wrong.append('rents')
    if data['email'] and not EMAIL.match(data['email']):
        wrong.append('email')
    if wrong:
        raise Invalid(sorted(set(wrong)))
    return data


def build_message(cfg, data):
    """The e-mail: plain text, the visitor in Reply-To, so "Reply" answers them directly."""
    what = 'Free hours audit request' if data['kind'] == 'audit' else 'Demo request'
    rents = ', '.join(data['rents']) + (' (%s)' % data['rents_other'] if data['rents_other'] else '')
    filled = '%d s' % round(data['seconds']) if data['seconds'] is not None else '–'
    lines = [
        '%s from the EQrento website.' % what,
        '',
        'Company:     ' + data['company'],
        'Name:        ' + data['name'],
        'E-mail:      ' + data['email'],
        'Phone:       ' + (data['phone'] or '–'),
        'Fleet size:  ' + data['fleet_size'] + ' units',
        'They rent:   ' + rents,
        '',
        'Message:',
        data['message'] or '–',
        '',
        '-- ',
        'Button:      ' + (data['source'] or '–'),
        'Page:        ' + (data['page'] or '–'),
        'Came from:   ' + (data['referrer'] or '–'),
        'Campaign:    ' + (data['utm'] or '–'),
        'Time zone:   %s · language: %s · form filled in: %s' % (data['timezone'] or '–', data['language'] or '–', filled),
        '',
        'Reply to this e-mail to answer %s directly.' % data['name'],
    ]
    sender_local, sender_domain = cfg.mail_from.rsplit('@', 1)

    def message(with_reply_to):
        msg = EmailMessage(policy=SMTP_POLICY)
        msg['Subject'] = '%s – %s' % (what, data['company'])
        msg['From'] = Address(cfg.mail_from_name, sender_local, sender_domain)
        msg['To'] = ', '.join(cfg.mail_to)
        if with_reply_to:
            msg['Reply-To'] = Address(data['name'], addr_spec=data['email'])
        msg['Date'] = formatdate(localtime=False)
        msg['Message-ID'] = make_msgid(domain=sender_domain)
        msg['Auto-Submitted'] = 'auto-generated'   # mailbox auto-replies (out of office) are not sent to the visitor
        msg.set_content('\n'.join(lines) + '\n', charset='utf-8', cte='quoted-printable')   # 7-bit safe for any mail server
        msg.as_bytes()   # fails here, not while sending, if a header cannot be written
        return msg

    try:
        return message(True)
    except Exception:   # an address the e-mail library cannot write as a header: the e-mail is in the text anyway
        return message(False)


def send_mail(cfg, msg):
    context = ssl.create_default_context()
    helo = cfg.smtp_helo or None
    if cfg.smtp_security == 'ssl':
        smtp = smtplib.SMTP_SSL(cfg.smtp_host, cfg.smtp_port, local_hostname=helo, timeout=15, context=context)
    else:
        smtp = smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, local_hostname=helo, timeout=15)
    try:
        if cfg.smtp_security == 'starttls':
            smtp.starttls(context=context)
        if cfg.smtp_user:
            smtp.login(cfg.smtp_user, cfg.smtp_password)
        smtp.send_message(msg, from_addr=cfg.mail_from, to_addrs=cfg.mail_to)
    finally:
        try:
            smtp.quit()
        except Exception:
            pass


class RateLimiter:
    """At most `limit` requests per key (the visitor's address) within `window` seconds. In memory only."""

    def __init__(self, limit, window):
        self.limit, self.window = limit, window
        self.hits, self.lock = {}, threading.Lock()

    def allow(self, key, now=None):
        now = time.time() if now is None else now
        with self.lock:
            recent = [t for t in self.hits.get(key, ()) if now - t < self.window]
            allowed = len(recent) < self.limit
            if allowed:
                recent.append(now)
            self.hits[key] = recent
            if len(self.hits) > 5000:   # forget addresses that have been quiet for a whole window
                self.hits = {k: v for k, v in self.hits.items() if v and now - v[-1] < self.window}
            return allowed


def log(result, detail=''):
    """One line per request, without personal data (no name, e-mail or address)."""
    print('%s formmail %s %s' % (time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), result, detail), flush=True)


def make_handler(cfg, limiter, send=send_mail):
    class Handler(BaseHTTPRequestHandler):
        server_version = 'formmail'
        sys_version = ''

        def log_message(self, *args):   # the default access log would write visitors' addresses
            pass

        def reply(self, status, payload):
            body = json.dumps(payload).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            origin = (self.headers.get('Origin') or '').rstrip('/')
            if origin and origin in cfg.allow_origin:   # only needed when the form is on another address than this service
                self.send_header('Access-Control-Allow-Origin', origin)
                self.send_header('Vary', 'Origin')
            self.end_headers()
            self.wfile.write(body)

        def visitor(self):
            for header in ('CF-Connecting-IP', 'X-Real-IP'):
                value = (self.headers.get(header) or '').strip()
                if value:
                    return value
            forwarded = (self.headers.get('X-Forwarded-For') or '').split(',')[0].strip()
            return forwarded or self.client_address[0]

        def route(self):
            return self.path.split('?', 1)[0].rstrip('/') or '/'

        def do_GET(self):
            if self.route() == cfg.path + '/health':
                self.reply(200, {'ok': True})
            elif self.route() == cfg.path:
                self.reply(405, {'ok': False, 'error': 'method'})
            else:
                self.reply(404, {'ok': False, 'error': 'not found'})

        def do_OPTIONS(self):
            self.send_response(204)
            origin = (self.headers.get('Origin') or '').rstrip('/')
            if origin and origin in cfg.allow_origin:
                self.send_header('Access-Control-Allow-Origin', origin)
                self.send_header('Access-Control-Allow-Methods', 'POST')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.send_header('Vary', 'Origin')
            self.send_header('Content-Length', '0')
            self.end_headers()

        def do_POST(self):
            try:
                length = int(self.headers.get('Content-Length') or '')
            except ValueError:
                return self.reply(411, {'ok': False, 'error': 'length'})
            if length <= 0:
                return self.reply(400, {'ok': False, 'error': 'empty'})
            # the body is always read (up to a cap) before answering: closing with unread data resets the connection
            if length > cfg.max_body:
                self.rfile.read(min(length, 262144))
                log('too-large')
                return self.reply(413, {'ok': False, 'error': 'too large'})
            raw = self.rfile.read(length)
            if self.route() != cfg.path:
                return self.reply(404, {'ok': False, 'error': 'not found'})
            if not limiter.allow(self.visitor()):
                log('rate-limited')
                return self.reply(429, {'ok': False, 'error': 'rate'})
            try:
                payload = json.loads(raw.decode('utf-8'))
            except (ValueError, UnicodeDecodeError):
                log('invalid', 'json')
                return self.reply(400, {'ok': False, 'error': 'json'})
            # the two spam checks answer "ok" on purpose: a bot learns nothing, and no e-mail goes out
            if isinstance(payload, dict) and one_line(payload.get('website'), 10):
                log('dropped', 'trap field filled')
                return self.reply(200, {'ok': True})
            try:
                data = parse(payload)
            except Invalid as error:
                log('invalid', ','.join(error.fields))
                return self.reply(400, {'ok': False, 'error': 'invalid', 'fields': error.fields})
            if data['seconds'] is not None and data['seconds'] < cfg.min_seconds:
                log('dropped', 'filled in too fast')
                return self.reply(200, {'ok': True})
            try:
                send(cfg, build_message(cfg, data))
            except Exception as error:   # the page then offers the visitor a ready-made e-mail instead
                log('mail-error', type(error).__name__)
                return self.reply(502, {'ok': False, 'error': 'mail'})
            log('sent', data['kind'])
            return self.reply(200, {'ok': True})

    return Handler


def make_server(cfg, send=send_mail):
    server = ThreadingHTTPServer((cfg.host, cfg.port), make_handler(cfg, RateLimiter(cfg.rate_limit, cfg.rate_window), send))
    server.daemon_threads = True
    return server


def main(argv):
    cfg = Config()
    problems = cfg.problems()
    if problems:
        print('formmail: settings are not complete:\n  ' + '\n  '.join(problems), file=sys.stderr)
        return 2
    if '--test' in argv:
        sample = parse({
            'rents': ['Access platforms & lifts'], 'fleet_size': '51–200', 'company': 'Test – form-to-e-mail service',
            'name': 'Test', 'email': cfg.mail_to[0], 'message': 'A test message sent with: python3 formmail.py --test',
            'source': 'server test', 'page': 'https://eqrento.com/', 'seconds': 60,
        })
        try:
            send_mail(cfg, build_message(cfg, sample))
        except Exception as error:
            print('formmail: the test e-mail was NOT sent: %s: %s' % (type(error).__name__, error), file=sys.stderr)
            return 1
        print('formmail: test e-mail sent to ' + ', '.join(cfg.mail_to))
        return 0
    server = make_server(cfg)
    print('formmail: listening on %s:%d%s, sending to %d address(es) through %s:%d (%s)' % (
        cfg.host, cfg.port, cfg.path, len(cfg.mail_to), cfg.smtp_host, cfg.smtp_port, cfg.smtp_security), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
