# Form-to-e-mail service for eqrento.com

`formmail.py` receives the request sent by the “Book a demo” / “Request a free audit” form and sends it as a plain-text
e-mail. It stores nothing. Python 3.8+ standard library only.

**This folder is not part of the website.** The publishing workflow does not copy it to the web folder and the preview
does not include it. The web server on the OVH machine serves files only (a `.php` or `.py` file in the site folder is
handed out as a download, checked 10 Nov 2026), so the service has to be started by the server administrator and one
address has to be passed to it by nginx. The step-by-step instruction in Polish is in
`../eqrento-ovh/INSTRUKCJA-4-FORMULARZ-EMAIL.md` (outside this repository).

## How it fits together

1. The page (`assets/js/main.js`) posts the form as JSON to the address in the form's `data-endpoint`
   (planned: `/api/demo-request`, same site, so no CORS).
2. nginx passes that one address to this service.
3. The service checks the request, sends the e-mail through SMTP and answers `{"ok": true}`.
4. Any other answer (or no answer in 20 s) makes the page offer the visitor a ready-made e-mail instead, so no request is
   lost while the service is down.

## The request

`POST /api/demo-request`, body = JSON object (the page sends it as `text/plain`; any content type is accepted):

| field | | |
|---|---|---|
| `rents` | required | list of strings (what the company rents) |
| `fleet_size`, `company`, `name`, `email` | required | strings |
| `rents_other`, `phone`, `message` | optional | strings |
| `kind` | optional | `"audit"` for the free hours audit, otherwise a demo (also recognised from `source` containing “audit”) |
| `source`, `page`, `referrer`, `utm`, `timezone`, `language`, `seconds` | optional | where the visitor clicked and came from; `seconds` = time the form was open |
| `website` | trap | hidden field; filled in = a bot |

Answers: `200 {"ok": true}` (sent, or silently dropped as spam), `400` (wrong or missing fields, listed in `fields`),
`413` (too large), `429` (too many requests from one address), `502` (the mail server refused).
`GET /api/demo-request/health` answers `{"ok": true}`.

## The e-mail

Subject `Demo request – <company>` or `Free hours audit request – <company>`; the visitor's address is in `Reply-To`,
so “Reply” answers them directly; `Auto-Submitted: auto-generated` keeps mailbox auto-replies away from the visitor.

## Spam protection

The hidden trap field, a minimum time to fill in the form (`MIN_SECONDS`), a limit per visitor address (`RATE_LIMIT` per
`RATE_WINDOW`; the address comes from `CF-Connecting-IP`, `X-Real-IP` or `X-Forwarded-For`), size limits on every
field, and no control characters or line breaks in anything that becomes an e-mail header.

## Privacy

Nothing is written to disk. The log (standard output) has one line per request with the result only – no name, e-mail
or address.

## Run and test

```bash
cp formmail.env.example formmail.env   # on the server; fill in; chmod 600
```

```bash
set -a; . ./formmail.env; set +a; python3 formmail.py --test   # sends one test e-mail to MAIL_TO
```

```bash
python3 -m unittest -v test_formmail   # the tests: a local fake mail server, nothing leaves the machine
```

The tests also run in GitHub Actions on every change in this folder (`.github/workflows/test-form-mail.yml`).
