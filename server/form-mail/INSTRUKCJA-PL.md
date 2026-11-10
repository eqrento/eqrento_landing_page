# EQrento – formularze „Book a demo” i „Request a free audit”: wysyłka na e-mail (10.11.2026)

## O co chodzi

Formularz na eqrento.com wysyła dane zgłoszenia (JSON) na adres `/api/demo-request` w tej samej domenie i czeka na
odpowiedź `{"ok": true}`. Dziś pod tym adresem nic nie ma, więc odwiedzający dostaje gotowego e-maila do wysłania
z własnego programu pocztowego.

Strona jest statyczna, a serwer WWW tylko oddaje pliki. Plik `.php` wgrany do folderu strony wraca jako plik do
pobrania (sprawdzone 10.11.2026), więc samego skryptu w folderze strony uruchomić się nie da. Potrzebna jest mała
usługa, do której nginx przekaże ten jeden adres.

**Usługa jest gotowa:** `formmail.py`, jeden plik, Python 3.8+, bez dodatkowych bibliotek.

- Leży w tym folderze repozytorium strony (https://github.com/eqrento/eqrento_landing_page/tree/main/server/form-mail)
  razem z wzorem ustawień `formmail.env.example`, opisem po angielsku `README.md` i testami.
- Niczego nie zapisuje: przyjmuje zgłoszenie, wysyła e-mail przez SMTP, odpowiada.
- Ma 22 testy. Przeszły w GitHub Actions oraz na tym serwerze z jego Pythonem 3.12.3 (w folderze tymczasowym).
- Z serwera da się połączyć z `smtp.gmail.com:587`, `smtp.gmail.com:465` i `smtp-relay.gmail.com:587` (sprawdzone).

Konto, którym GitHub publikuje stronę, nie ma sudo ani dostępu do Dockera i nginx. Dlatego instalację robi
administrator serwera. Zajmuje około 30 minut.

## Kroki

1. Skopiuj `formmail.py` na serwer.
2. Utwórz plik ustawień `formmail.env` według wzoru (sekcja „Ustawienia”).
3. Uruchom usługę: wariant A (kontener obok nginx) albo B (systemd na hoście).
4. Dodaj jedną regułę w nginx (sekcja „Reguła nginx”).
5. Sprawdź (sekcja „Sprawdzenie”) i daj znać Łukaszowi. Claude podłączy wtedy formularz na stronie i przetestuje go
   na eqrento.com.

## Ustawienia (`formmail.env`)

Plik zostaje tylko na serwerze (`chmod 600`). Nie trafia do repozytorium, bo repozytorium jest publiczne.

```
MAIL_TO=<adres, na który mają przychodzić zgłoszenia; kilka adresów po przecinku>
MAIL_FROM=<adres nadawcy w domenie eqrento.com>
MAIL_FROM_NAME=EQrento website
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURITY=starttls
SMTP_USER=
SMTP_PASSWORD=
FORM_HOST=127.0.0.1
FORM_PORT=8787
FORM_PATH=/api/demo-request
```

Adres docelowy (`MAIL_TO`) poda Łukasz.

Wysyłka poczty, trzy możliwości (poczta firmy jest w Google Workspace):

1. **Konto SMTP, którego aplikacja EQrento już używa** do swoich e-maili. Najprostsze, jeśli takie jest.
2. **SMTP relay Google Workspace bez hasła:** `SMTP_HOST=smtp-relay.gmail.com`, port 587, `starttls`, puste
   `SMTP_USER` i `SMTP_PASSWORD`. W konsoli administratora Google (Aplikacje → Google Workspace → Gmail → Routing →
   Usługa przekazywania SMTP) trzeba dopuścić adres IP tego serwera i nadawców z własnej domeny.
3. **Skrzynka z hasłem aplikacji:** `SMTP_HOST=smtp.gmail.com`, port 587, `starttls`, `SMTP_USER=<skrzynka>`,
   `SMTP_PASSWORD=<hasło aplikacji>` (wymaga weryfikacji dwuetapowej na tej skrzynce).

Test samej poczty, bez strony:

```bash
set -a; . ./formmail.env; set +a; python3 formmail.py --test
```

Polecenie wysyła jeden testowy e-mail na `MAIL_TO` i kończy pracę. Przy błędzie wypisuje jego przyczynę.

## Wariant A – kontener obok nginx (nginx strony działa w kontenerze)

W `docker-compose.yml`, w tej samej sieci co nginx:

```yaml
  formmail:
    image: python:3.12-alpine
    restart: unless-stopped
    command: python /app/formmail.py
    volumes:
      - ./formmail/formmail.py:/app/formmail.py:ro
    env_file:
      - ./formmail/formmail.env
    environment:
      FORM_HOST: 0.0.0.0
    expose:
      - "8787"
```

W regule nginx: `proxy_pass http://formmail:8787;`.

## Wariant B – usługa systemd na hoście

`/etc/systemd/system/eqrento-formmail.service`:

```ini
[Unit]
Description=EQrento form-to-e-mail
After=network-online.target

[Service]
User=www-data
EnvironmentFile=/opt/eqrento-formmail/formmail.env
ExecStart=/usr/bin/python3 /opt/eqrento-formmail/formmail.py
Restart=always
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Nginx w kontenerze musi wtedy sięgnąć do hosta. Usługa powinna słuchać na adresie widocznym z kontenera
(`FORM_HOST=0.0.0.0` albo adres mostka Dockera), a w regule nginx trzeba użyć np.
`proxy_pass http://host.docker.internal:8787;` (z `extra_hosts: ["host.docker.internal:host-gateway"]` w kontenerze
nginx). Portu 8787 nie wystawiaj na zewnątrz.

## Reguła nginx

W bloku `server` strony **eqrento.com**:

```nginx
    # formularz demo / audytu → usługa formmail (reszta strony zostaje statyczna)
    location = /api/demo-request {
        proxy_pass http://formmail:8787;          # wariant B: http://host.docker.internal:8787
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 32k;
        proxy_read_timeout 30s;
    }
```

Usługa liczy zgłoszenia na adres odwiedzającego (5 na 10 minut). Adres bierze z nagłówka `CF-Connecting-IP`, który
Cloudflare dodaje do każdego zapytania i który nginx przekazuje dalej bez dodatkowych ustawień.

Potem `nginx -t` i przeładowanie nginx.

## Sprawdzenie

```bash
curl -s -X POST https://eqrento.com/api/demo-request -d '{"rents":["Test"],"fleet_size":"Up to 50","company":"Test serwera","name":"Test","email":"ADRES@eqrento.com","seconds":60,"source":"curl"}'
```

Oczekiwany wynik: `{"ok": true}` i e-mail „Demo request – Test serwera” na `MAIL_TO`.

- `{"ok": false, "error": "mail"}` oznacza, że serwer poczty odmówił (ustawienia SMTP).
- `405` albo strona 404 oznacza, że reguła nginx nie działa.
- W logu usługi jest jedna linia na zgłoszenie, bez danych osobowych (`sent demo`, `mail-error ...`).

## Zamiast usługi: obsługa w aplikacji EQrento

Ten sam adres może obsłużyć backend aplikacji. Wystarczy trzymać się umowy (szczegóły w `README.md` w repozytorium):

- `POST /api/demo-request`, treść to obiekt JSON wysyłany jako `text/plain` (bez preflightu CORS);
- pola wymagane: `rents` (lista), `fleet_size`, `company`, `name`, `email`;
- pola opcjonalne: `rents_other`, `phone`, `message`, `kind` (`audit` = audyt godzin), `source`, `page`, `referrer`,
  `utm`, `timezone`, `language`, `seconds`;
- pole-pułapka `website`: wypełnione oznacza bota (odpowiedz `{"ok": true}` i nic nie wysyłaj);
- odpowiedź przy sukcesie: status 200 i `{"ok": true}`. Każda inna odpowiedź sprawia, że strona proponuje
  odwiedzającemu gotowy e-mail.
