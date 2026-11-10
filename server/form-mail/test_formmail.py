"""Tests for formmail.py – run with:  python3 -m unittest -v test_formmail   (standard library only).

The service is started on a free local port and sends through a fake SMTP server in this file, so nothing leaves
the machine."""
import email
import email.policy
import json
import os
import socketserver
import threading
import unittest
import urllib.error
import urllib.request
from unittest import mock

import formmail


class FakeSMTPHandler(socketserver.StreamRequestHandler):
    def handle(self):
        def say(text):
            self.wfile.write(text.encode('ascii') + b'\r\n')
            self.wfile.flush()

        say('220 fake ESMTP')
        sender, recipients = None, []
        while True:
            line = self.rfile.readline()
            if not line:
                break
            command = line.decode('utf-8', 'replace').strip()
            upper = command.upper()
            if upper.startswith(('EHLO', 'HELO')):
                self.server.helo = command[5:]
                say('250-fake')
                say('250 8BITMIME')
            elif upper.startswith('MAIL FROM:'):
                sender = command[10:].split()[0].strip('<>')
                say('250 OK')
            elif upper.startswith('RCPT TO:'):
                if self.server.refuse_recipients:
                    say('550 no such user')
                else:
                    recipients.append(command[8:].strip().strip('<>'))
                    say('250 OK')
            elif upper == 'DATA':
                say('354 go ahead')
                data = b''
                while True:
                    part = self.rfile.readline()
                    if not part or part in (b'.\r\n', b'.\n'):
                        break
                    data += part[1:] if part.startswith(b'..') else part
                self.server.messages.append((sender, recipients, data))
                say('250 queued')
            elif upper == 'QUIT':
                say('221 bye')
                break
            else:
                say('250 OK')


class FakeSMTP(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self):
        super().__init__(('127.0.0.1', 0), FakeSMTPHandler)
        self.messages, self.helo, self.refuse_recipients = [], None, False


def sample(**changes):
    data = {
        'rents': ['Access platforms & lifts', 'Other'], 'rents_other': 'Trailers', 'fleet_size': '51–200',
        'company': 'ACME Rentals', 'name': 'Jan Kowalski', 'email': 'jan@acme.example', 'phone': '+48 600 100 200',
        'message': 'We work in spreadsheets.\nCan you show transport?', 'website': '',
        'source': 'hero', 'page': 'https://eqrento.com/', 'referrer': 'https://www.google.com/',
        'utm': 'utm_source=newsletter', 'timezone': 'Europe/Warsaw', 'language': 'pl-PL', 'seconds': 42,
    }
    data.update(changes)
    return data


class ServiceCase(unittest.TestCase):
    settings = {}

    def setUp(self):
        self.smtp = FakeSMTP()
        threading.Thread(target=self.smtp.serve_forever, daemon=True).start()
        self.env = {
            'FORM_HOST': '127.0.0.1', 'FORM_PORT': '0',
            'MAIL_TO': 'sales@example.com, second@example.com', 'MAIL_FROM': 'website@example.com',
            'SMTP_HOST': '127.0.0.1', 'SMTP_PORT': str(self.smtp.server_address[1]), 'SMTP_SECURITY': 'none',
        }
        self.env.update(self.settings)
        self.cfg = formmail.Config(self.env)
        self.http = formmail.make_server(self.cfg)
        threading.Thread(target=self.http.serve_forever, daemon=True).start()
        self.base = 'http://127.0.0.1:%d' % self.http.server_address[1]
        patcher = mock.patch('formmail.log')   # keep the test output clean; the calls are checked where it matters
        self.log = patcher.start()
        self.addCleanup(patcher.stop)

    def tearDown(self):
        for server in (self.http, self.smtp):
            server.shutdown()
            server.server_close()

    def request(self, method='POST', path='/api/demo-request', payload=None, raw=None, headers=None):
        body = raw if raw is not None else (json.dumps(payload).encode('utf-8') if payload is not None else None)
        req = urllib.request.Request(self.base + path, data=body, method=method, headers=headers or {})
        try:
            with urllib.request.urlopen(req, timeout=10) as res:
                return res.status, json.loads(res.read().decode('utf-8') or '{}'), res.headers
        except urllib.error.HTTPError as error:
            text = error.read().decode('utf-8')
            return error.code, (json.loads(text) if text else {}), error.headers

    def mail(self, index=0):
        sender, recipients, data = self.smtp.messages[index]
        return sender, recipients, email.message_from_bytes(data, policy=email.policy.default)


class TestRequests(ServiceCase):
    def test_demo_request_is_sent_as_an_email(self):
        status, reply, _ = self.request(payload=sample())
        self.assertEqual((status, reply), (200, {'ok': True}))
        self.assertEqual(len(self.smtp.messages), 1)
        sender, recipients, msg = self.mail()
        self.assertEqual(sender, 'website@example.com')
        self.assertEqual(recipients, ['sales@example.com', 'second@example.com'])
        self.assertEqual(msg['Subject'], 'Demo request – ACME Rentals')
        self.assertEqual(msg['From'].addresses[0].addr_spec, 'website@example.com')
        self.assertEqual(msg['From'].addresses[0].display_name, 'EQrento website')
        self.assertEqual(msg['Reply-To'].addresses[0].addr_spec, 'jan@acme.example')
        self.assertEqual(msg['Reply-To'].addresses[0].display_name, 'Jan Kowalski')
        self.assertEqual(msg['Auto-Submitted'], 'auto-generated')
        text = msg.get_content()
        for expected in ('Demo request from the EQrento website.', 'Company:     ACME Rentals', 'Name:        Jan Kowalski',
                         'E-mail:      jan@acme.example', 'Phone:       +48 600 100 200', 'Fleet size:  51–200 units',
                         'They rent:   Access platforms & lifts, Other (Trailers)',
                         'We work in spreadsheets.\nCan you show transport?', 'Button:      hero',
                         'Page:        https://eqrento.com/', 'Came from:   https://www.google.com/',
                         'Campaign:    utm_source=newsletter', 'Europe/Warsaw', 'pl-PL', 'form filled in: 42 s'):
            self.assertIn(expected, text)
        self.assertEqual(self.smtp.helo, 'example.com')
        self.log.assert_called_with('sent', 'demo')

    def test_audit_request_has_its_own_subject(self):
        self.request(payload=sample(kind='audit', source='case study – free hours audit'))
        self.assertEqual(self.mail()[2]['Subject'], 'Free hours audit request – ACME Rentals')
        self.assertIn('Free hours audit request from the EQrento website.', self.mail()[2].get_content())

    def test_audit_is_recognised_from_the_button_name_alone(self):
        self.request(payload=sample(source='case study – free hours audit'))
        self.assertEqual(self.mail()[2]['Subject'], 'Free hours audit request – ACME Rentals')

    def test_polish_letters_survive(self):
        self.request(payload=sample(company='Żuraw Rent Sp. z o.o.', name='Łukasz Żółć', message='Zażółć gęślą jaźń – 5 podnośników'))
        _, _, msg = self.mail()
        self.assertEqual(msg['Subject'], 'Demo request – Żuraw Rent Sp. z o.o.')
        self.assertEqual(msg['Reply-To'].addresses[0].display_name, 'Łukasz Żółć')
        self.assertIn('Zażółć gęślą jaźń – 5 podnośników', msg.get_content())

    def test_optional_fields_may_be_missing(self):
        status, reply, _ = self.request(payload={'rents': ['Event equipment'], 'fleet_size': 'Up to 50', 'company': 'Solo',
                                                 'name': 'Ann', 'email': 'ann@solo.example'})
        self.assertEqual((status, reply), (200, {'ok': True}))
        text = self.mail()[2].get_content()
        self.assertIn('Phone:       –', text)
        self.assertIn('Message:\n–', text)
        self.assertIn('form filled in: –', text)

    def test_trap_field_is_dropped_silently(self):
        status, reply, _ = self.request(payload=sample(website='http://spam.example'))
        self.assertEqual((status, reply), (200, {'ok': True}))
        self.assertEqual(self.smtp.messages, [])

    def test_form_filled_in_too_fast_is_dropped_silently(self):
        status, reply, _ = self.request(payload=sample(seconds=1))
        self.assertEqual((status, reply), (200, {'ok': True}))
        self.assertEqual(self.smtp.messages, [])

    def test_missing_and_wrong_fields_are_refused(self):
        status, reply, _ = self.request(payload=sample(email='not-an-address', company='  ', rents=[]))
        self.assertEqual(status, 400)
        self.assertEqual(reply, {'ok': False, 'error': 'invalid', 'fields': ['company', 'email', 'rents']})
        self.assertEqual(self.smtp.messages, [])

    def test_body_must_be_json_object(self):
        self.assertEqual(self.request(raw=b'{not json')[0], 400)
        self.assertEqual(self.request(raw=b'["a list"]')[0], 400)
        self.assertEqual(self.request(raw=b'\xff\xfe')[0], 400)
        self.assertEqual(self.smtp.messages, [])

    def test_header_injection_is_not_possible(self):
        self.request(payload=sample(name='Eve\r\nBcc: victim@example.com', company='X\nSubject: hacked'))
        sender, recipients, msg = self.mail()
        self.assertEqual(recipients, ['sales@example.com', 'second@example.com'])
        self.assertIsNone(msg['Bcc'])
        self.assertEqual(msg['Subject'], 'Demo request – X Subject: hacked')
        self.assertEqual(len(msg.get_all('Subject')), 1)

    def test_address_that_cannot_be_a_header_still_arrives(self):
        status, reply, _ = self.request(payload=sample(email='jan..kowalski@acme.example'))
        self.assertEqual((status, reply), (200, {'ok': True}))
        self.assertIn('E-mail:      jan..kowalski@acme.example', self.mail()[2].get_content())

    def test_text_plain_body_as_the_page_sends_it(self):
        status, reply, _ = self.request(raw=json.dumps(sample()).encode('utf-8'), headers={'Content-Type': 'text/plain;charset=UTF-8'})
        self.assertEqual((status, reply), (200, {'ok': True}))
        self.assertEqual(len(self.smtp.messages), 1)

    def test_other_addresses_and_methods(self):
        self.assertEqual(self.request(path='/api/other', payload=sample())[0], 404)
        self.assertEqual(self.request(method='GET')[0], 405)
        self.assertEqual(self.request(method='GET', path='/api/demo-request/health')[:2], (200, {'ok': True}))
        self.assertEqual(self.request(method='GET', path='/')[0], 404)
        self.assertEqual(self.smtp.messages, [])

    def test_mail_server_refusal_is_reported(self):
        self.smtp.refuse_recipients = True
        status, reply, _ = self.request(payload=sample())
        self.assertEqual((status, reply), (502, {'ok': False, 'error': 'mail'}))

    def test_no_personal_data_in_the_log(self):
        self.request(payload=sample())
        logged = ' '.join(str(part) for call in self.log.call_args_list for part in call.args)
        for private in ('Jan', 'Kowalski', 'acme', 'ACME', '600 100 200'):
            self.assertNotIn(private, logged)


class TestLimits(ServiceCase):
    settings = {'RATE_LIMIT': '2', 'RATE_WINDOW': '600', 'MAX_BODY': '1500', 'ALLOW_ORIGIN': 'https://eqrento.com'}

    def test_rate_limit_per_visitor(self):
        visitor = {'CF-Connecting-IP': '203.0.113.7'}
        self.assertEqual(self.request(payload=sample(), headers=visitor)[0], 200)
        self.assertEqual(self.request(payload=sample(), headers=visitor)[0], 200)
        status, reply, _ = self.request(payload=sample(), headers=visitor)
        self.assertEqual((status, reply), (429, {'ok': False, 'error': 'rate'}))
        self.assertEqual(self.request(payload=sample(), headers={'CF-Connecting-IP': '203.0.113.8'})[0], 200)
        self.assertEqual(len(self.smtp.messages), 3)

    def test_too_large_body(self):
        status, reply, _ = self.request(payload=sample(message='x' * 3000))
        self.assertEqual((status, reply), (413, {'ok': False, 'error': 'too large'}))
        self.assertEqual(self.smtp.messages, [])

    def test_cors_only_for_the_allowed_origin(self):
        _, _, headers = self.request(payload=sample(), headers={'Origin': 'https://eqrento.com'})
        self.assertEqual(headers['Access-Control-Allow-Origin'], 'https://eqrento.com')
        _, _, headers = self.request(payload=sample(), headers={'Origin': 'https://evil.example'})
        self.assertIsNone(headers['Access-Control-Allow-Origin'])


class TestSettings(unittest.TestCase):
    def test_complete_settings_have_no_problems(self):
        cfg = formmail.Config({'MAIL_TO': 'a@example.com', 'MAIL_FROM': 'b@example.com'})
        self.assertEqual(cfg.problems(), [])
        self.assertEqual((cfg.host, cfg.port, cfg.path), ('127.0.0.1', 8787, '/api/demo-request'))
        self.assertEqual((cfg.smtp_host, cfg.smtp_port, cfg.smtp_security), ('smtp.gmail.com', 587, 'starttls'))
        self.assertEqual(cfg.smtp_helo, 'example.com')

    def test_problems_are_named(self):
        problems = formmail.Config({'MAIL_TO': 'not an address', 'SMTP_SECURITY': 'tls', 'SMTP_USER': 'u'}).problems()
        self.assertEqual(len(problems), 4)

    def test_rate_limiter_forgets_after_the_window(self):
        limiter = formmail.RateLimiter(1, 60)
        self.assertTrue(limiter.allow('a', now=1000))
        self.assertFalse(limiter.allow('a', now=1030))
        self.assertTrue(limiter.allow('a', now=1061))

    def test_test_mode_sends_one_email(self):
        smtp = FakeSMTP()
        threading.Thread(target=smtp.serve_forever, daemon=True).start()
        env = {'MAIL_TO': 'sales@example.com', 'MAIL_FROM': 'website@example.com', 'SMTP_HOST': '127.0.0.1',
               'SMTP_PORT': str(smtp.server_address[1]), 'SMTP_SECURITY': 'none'}
        try:
            with mock.patch.dict(os.environ, env), mock.patch('builtins.print'):
                self.assertEqual(formmail.main(['--test']), 0)
            self.assertEqual(len(smtp.messages), 1)
            with mock.patch.dict(os.environ, {'MAIL_TO': '', 'MAIL_FROM': ''}), mock.patch('builtins.print'):
                self.assertEqual(formmail.main([]), 2)
        finally:
            smtp.shutdown()
            smtp.server_close()


if __name__ == '__main__':
    unittest.main()
