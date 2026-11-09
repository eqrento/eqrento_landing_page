# EQrento – landing page

Static website: HTML + CSS + JavaScript, no build step, no dependencies, no server-side code.
The draft runs on GitHub Pages; the final site will be served from SOLTIX's own dedicated server (OVH).

## Deploy

Upload **the contents of this folder** (`index.html` and the `assets` folder) to the web root of any static host
(own server – Apache / nginx, classic hosting via FTP / file manager, Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3…).
`index.html` must be at the root of the site, with `favicon.ico`, `apple-touch-icon.png` and `site.webmanifest` next to it.
All paths are relative, so the site also works from a sub-folder.

Recommended server settings (most hosts do this by default):

- HTTPS on, redirect http → https
- gzip or brotli compression for `.html`, `.css`, `.js`, `.svg`
- long cache for `/assets/*` (e.g. 30 days); short or no cache for `index.html`
- correct MIME types: `.woff2` → `font/woff2`, `.webm` → `video/webm`, `.mp4` → `video/mp4`,
  `.svg` → `image/svg+xml`
- byte-range requests allowed (standard) so the testimonial video can start before it is fully downloaded
- unknown addresses answered with `404.html` and status 404 (GitHub Pages does it by itself; Apache:
  `ErrorDocument 404 /404.html`, nginx: `error_page 404 /404.html;`)
- if the server sends a `Content-Security-Policy` header, it must allow the demo form to reach Google:
  `connect-src 'self' https://script.google.com https://script.googleusercontent.com`

Open the site through a web server, not by double-clicking `index.html`: some browsers block the self-hosted fonts
and the video on `file://`.

**Live site = https://eqrento.com/ on SOLTIX's OVH server (since 5 Nov 2026).**
- A push to `main` still updates only the GitHub Pages **preview** (`static.yml`).
- The live site is updated only by the workflow **“Publish to eqrento.com (OVH)”** (`.github/workflows/deploy-ovh.yml`). It is manual, with a dry run by default.
  - Run it with `gh workflow run deploy-ovh.yml -f dry_run=false`, or from Actions → Run workflow, and **only after Łukasz's OK**.
  - It copies the repo (without `README.md`, `.github`, `.gitignore`) with `rsync` over SSH, sending only changed files. It deletes files that are gone from the repo, except server-only ones (`.well-known/`, `google*.html`, `BingSiteAuth.xml`, `yandex_*.html`).
  - It clears the Cloudflare cache when `CF_ZONE_ID` and `CF_API_TOKEN` exist, and checks that eqrento.com serves the new `style.css?v=`.
- Required secrets: `OVH_HOST`, `OVH_PORT` (optional), `OVH_USER`, `OVH_PATH`, `OVH_SSH_KEY`, `OVH_KNOWN_HOSTS`. The server side is described in `../eqrento-ovh/INSTRUKCJA-2-DOKONCZENIE-I-PUBLIKACJA.md`.
- While eqrento.com goes through the Cloudflare proxy with Email Obfuscation, the live HTML differs from the repo (mailto links rewritten). Verify with CSS/JS checksums or the `?v=` string instead.

**OVH move (4 Nov 2026):** the package for the programmer lives outside this repo, in `../eqrento-ovh/`. It holds:
- `eqrento-strona/` and `.zip` – this repo without `README.md`, `.github` and `.gitignore`;
- `nginx-eqrento.conf`, tested;
- `INSTRUKCJA-DLA-PROGRAMISTY.md`, in Polish.

The nginx config sends a **Content-Security-Policy with the SHA-256 hashes of the two inline scripts**:
- `document.documentElement.classList.add('js')` in `index.html` and both policy pages;
- the `<base href>` script in `404.html`.

If either script changes, recompute its hash, e.g. with
`perl -0ne 'print $1 if /<script>(.*?)<\/script>/s' index.html | openssl dgst -sha256 -binary | openssl base64`.
Then give the new header to the server admin, otherwise browsers block the script.

Never add a new inline script or inline event handler (`onclick="…"`); put the code in `main.js` instead.

The config also sends every old-site language path to `/`: `/en`, `/pl`, `/de`, `/es`, `/fr`, `/it`, `/nl`, `/sv`, `/pt` and everything under them.

## Structure

```
index.html
pricing.html           – the pricing page, https://eqrento.com/pricing (see “Pricing page” below)
privacy-policy.html    – Privacy Policy (see “Privacy Policy and Cookie Policy” below)
cookie-policy.html     – Cookie Policy
robots.txt, sitemap.xml – search engines (point to https://eqrento.com/)
404.html               – page for unknown addresses (GitHub Pages serves it automatically; works from the site root)
favicon.ico            – browser tab / bookmarks (16, 32, 48 px), made from the EQ mark
apple-touch-icon.png   – iOS home screen (180 px)
site.webmanifest       – Android home-screen icons (round 192 / 512 px + maskable)
assets/css/style.css   – all styles; design tokens at the top (:root)
assets/js/main.js      – interactions and animations (all pages)
assets/js/pricing.js   – pricing page only: yearly / monthly, “Show only differences”, the plan shown on phones
.github/scripts/check-prices.sh – stops the preview and the publish when the prices on the two pages differ
assets/fonts/          – Sora (variable, self-hosted, latin + latin-ext)
assets/img/            – images, client logos, og-image.png (1200×630 link-preview picture)
assets/icons/          – SVG icons, logo-light.png (footer logo, all white), icon-192/512 and icon-maskable-512 PNGs
assets/logos/          – partner logos for the Integrations section (the companies' own files, unchanged)
assets/video/          – testimonial video (mp4 + webm fallback)
```

## Sections (in page order) and menu

Hero (on phones: headline, lead, collage, checklist, button – CSS grid + `display: contents`, see “phones: the collage comes right after the lead” in style.css; the violet label above the headline has the button's height, type and padding there, both centred – Łukasz, 9 Nov 2026) → client logos → Why EQrento (“Between a basic spreadsheet and a complex ERP system”) → Platform
(“One platform…”) → How it works (“Six interconnected stages…”, pinned horizontal scroll) → Key features and
competitive differentiators → Telematics (“Telematics that safeguards your billing”) → Integrations (“Open API first.
Connectors included.”, added 5 Nov 2026 from Wojtek's design) → Testimonial → Pricing teaser (`id="pricing"`, four mini
tiles and the way to pricing.html) → FAQ → footer. (The closing “See it on your kind of fleet” section was removed on 4 Nov 2026 – Łukasz.)
Menu: Home, Why EQrento, How it works, Key features, Pricing, Case study, FAQ (header, mobile menu and footer follow the page order; the Platform section has no menu link).
“Pricing” and “Case study” in the menu and the footer lead to their pages (`pricing`, `case-study` – relative links); the
other items are sections of the home page (`./#why` etc. on the other pages). With 7 links the gaps between them are
40px, 24px up to 1440px and 20px up to 1320px, so the header logo keeps its 246px from ~1320px up (238px at 1280, 196px
at 1201).

## Pricing page (pricing.html, since 5 Nov 2026)

- **Address:** https://eqrento.com/pricing. The OVH server answers `/pricing` with pricing.html (`try_files $uri $uri.html`),
  and so does GitHub Pages. All paths and links are relative, like on the other pages, because the GitHub preview lives
  under `/eqrento_landing_page/`.
- **Old addresses** of the previous site, `/en/pricing`, `/pl/pricing` and `/de/pricing` (5 Nov 2026):
  - `en/`, `pl/` and `de/pricing.html` are one identical page with an instant `<meta http-equiv="refresh">` to
    `../pricing` and a canonical to https://eqrento.com/pricing.
  - The relative link also works on the preview. No script is used, because of the CSP.
  - A real 301 needs the server: the nginx rule is ready in `../eqrento-ovh/nginx-eqrento.conf`, above the language rule.
- **Old language versions** `/en/`, `/pl/`, `/de/`, `/es/`, `/fr/`, `/it/`, `/nl/`, `/sv/`, `/pt/` (9 Nov 2026, live):
  - Each folder has the same `index.html`: an instant meta refresh to `../` (the home page) and a canonical to
    https://eqrento.com/.
  - Before it, `/pl/`, `/en/` and `/de/` answered “403 Forbidden”: the folders exist for the old pricing addresses but
    had no index page. The live server does not have the language rule from `nginx-eqrento.conf` (`/es/` was a 404).
    With that rule in place, the server would also send deeper old pages (e.g. `/pl/kontakt`, now a 404) home with a
    real 301.
- **Order:**
  1. H1 + switch: one state for the cards and the table header (pricing.js).
  2. The four plan cards.
  3. “Compare all EQrento features” (`id="compare"`), always open.
  4. The telemetry and AI Assistant notes, then the USD / VAT / unit note. Each note's title and text are separate
     paragraphs (a grid): on phones the title sits beside the icon and the text runs under both (Łukasz, 9 Nov 2026).
  5. Pricing FAQ: only questions with an answer in the existing copy; the four without an answer were left out.
  6. The closing “Book a 30-minute demo”.
- **Table:**
  - `thead` holds the plan and its price (no buttons – Łukasz, 5 Nov 2026) and sticks under the page header
    (84 / 72 / 64px).
  - “Show only differences” (`aria-pressed`) hides the rows where all four plans have the same value and the categories
    left empty – worked out from the cells (`y`, `n` or the text). No row is marked by hand, so new rows need nothing extra.
  - Below 768px all four plans stay in one view, as the home page's table was before the pricing page (Łukasz, 9 Nov
    2026; it replaced a one-plan switch): each feature name on its own line above its four plan cells, the plan names
    stuck under the page header (their prices hidden below 641px – they are on the cards right above). CSS only. The
    explicit ARIA roles in the markup (`role="table"`, `rowgroup`, `row`, `columnheader`, `rowheader`, `cell`) keep it a
    table for screen readers – give new rows the same roles.
- **Cards:** the price with “/month” and, right under it, “billed yearly” / “billed monthly” beside the figure; Enterprise
  has “tailored to your fleet” under “Ask for a quote”. Each card is a subgrid of 7 rows.
- **Copied parts:** the header, mobile menu, footer, cookie banner and the demo dialog are copies of the ones in index.html
  (relative links back to the home page). Change them in every page.
- **Prices:**
  - They are in two pages: index.html (teaser, yearly, `<b data-price="…">`) and pricing.html (cards and table header,
    `data-price` + `data-yearly` + `data-monthly`).
  - The Essential price is also in pricing.html's title and descriptions (“from $199/month”) and in the home FAQ (“Plans
    start at $199 a month”).
  - Change a price in every place. `bash .github/scripts/check-prices.sh` checks them and runs before every preview and
    publish – a difference stops both.
- **Demo requests:** from pricing.html the `page` field is `/pricing`. The card buttons send `source` “pricing – <plan>”,
  the bottom button “pricing page – bottom”.
- **Home teaser:** four tiles (plan, price with “/month” over “billed yearly” beside it, fleet limit, “Unlimited users and
  branches”) and one button, “Compare plans and features” (Łukasz removed the “Book a demo” next to it on 5 Nov 2026).
  Four in a row above 1100px, 2 × 2 below, and on phones (≤ 640px) one under another at full width, as the plan cards
  were before (Łukasz, 9 Nov 2026) – with larger type and the “/month · billed yearly” pair beside the figure.

## Case study page (case-study.html, since 9 Nov 2026)

- **NOT on eqrento.com until Łukasz approves it** („Stronę umieść tylko w Github dopóki nie uznam, że może zostać
  opublikowana”). An OVH publish sends the whole main branch, so before any „publikuj” ask whether the case study (and
  the “Case study” links in the menus and footers) may go live too.
- **What:** Wojtek's BAC Polska case study (`bac-case-study.zip`, 5 Nov 2026), rebuilt in the site's own styles: white
  cards on the page grey, navy (the logo mark) for the highlighted cards, violet labels, orange only for the buttons and
  the flagged overuse. His texts, with the site's typography (curly quotes, `&nbsp;`) and “telemetry data” for the data.
- **Address:** `/case-study` (case-study.html, served like /pricing); in sitemap.xml. Header, menu, footer, cookie banner and
  demo dialog are copies, as on the pricing page.
- **Drafts:** the quotes of Gerben Slooijer and Rafał Lenartowicz must be approved by them word for word before the page
  goes live (Wojtek's note) – marked “DRAFT” in the HTML.
- **Order:** hero (label, H1, lead, two buttons, the client card with the BAC logo from the client logos) → yard photo with
  an example of a flagged rental → four results → the story (chapter list sticky on the left above 1200px; challenge, how
  it works with four steps and a drawn EQrento screen, control, one system, what changed) → the owner's quote (navy
  card) → the rental desk (a quote and what the team values) → free hours audit.
- **Photos:** Wojtek's JPGs as WebP in `assets/img/case-bac/`. The yard photo has two crops in a `<picture>`: 2:1 from
  641px up (1024 / 1536px) and 4:5 on phones (720px; there the example card sits half over its bottom edge). Site photo
  4:3 at 700 / 900 / 1350px, Gerben 4:5, Rafał a 168px square. The JPG masters stay in Wojtek's zip, not in the repo.
- **Free hours audit:** “Request a free audit” opens the demo form as an audit request – `data-demo-kind="audit"`
  (main.js, `KINDS`) swaps the heading, lead, button, thank-you line and e-mail wording; any other button brings back the
  demo texts. `source` “case study – free hours audit”. “Get a free hours audit” in the hero only scrolls to that box.
- **No reveal animations and no page script** (main.js plays the reveals on the home page only).

## Things worth knowing

- **Section spacing** – two variables at the top of `style.css`: `--sec-y` (76px desktop / 50px from 1200px down)
  where the background changes, `--sec-join` (48px / 32px) where two neighbouring sections share the same background.
- **Hero background** – the block marked `EXPERIMENT` at the end of `style.css` gives the hero and header the light
  page background. To return to the dark hero: delete that block, use a light-lettered logo in the header and set
  `theme-color` back to `#0b0805`.
- **Dark surfaces** – navy from the logo mark (`--mark-navy: #1b1562`) instead of black on the EQrento card (Why),
  One platform, the testimonial card, the Complete plan, the compare button, the active How it works card and the
  footer, with violet glows and a cool grey for secondary text. It is the last `EXPERIMENT` block in `style.css`;
  delete it to go back to black.
- **Client logos** – each logo has a height `--lh` (set in `index.html`) chosen by optical balancing (wide and light
  marks bigger, compact and heavy marks smaller). Optional per logo: `--tone` darkens a pale logo in its grey state,
  `--logo-gray: url(#logo-gray-red)` uses a red-channel grey (for the red-on-black Tenge logo; the SVG filter is inline
  in the logos section). Logos are grey, full colour on hover / tap. When they don't fit in one row, JS turns the
  strip into a seamless marquee (currently always, with 9 logos).
- **Product screenshots** (Key features tabs and the telematics map) – raw light-theme screenshots (≈ 1900×960, no
  frame or glow) resized in advance to the sizes the page shows, so the browser never has to shrink a big picture (that
  is what made the small menu text look soft): `assets/img/screens/<name>-860|1080|1290|1720.png` (`gps` is JPEG) for
  Key features, `map-520|700|1040|1400.jpg` for the telematics card; `srcset` + `sizes` let the browser take the one
  that matches the screen (≈ 1:1 on 1×, 1.25×, 1.5× and 2× screens). Key features keeps the set per tab in
  `data-srcset` (main.js swaps it and preloads the other tabs once the section is near). Made with a Lanczos resize plus
  a light sharpen (`../narzedzia/zrzuty.ps1` + `Sharp.cs`, outside the repo); a new screenshot needs the same four sizes.
  The window frame is CSS (“ONE window frame” in `style.css`), shared by `.features__screen` and `.gps__map`: a light
  window like the ones in the hero collage – light title bar with red / yellow / green dots, hairline edge, a soft
  navy shadow all round and a violet glow under it.
- **Key features tab photos** (`data-photo`, the small picture over the screenshot's corner) – 287:186.
  - Older ones: `features-photo.png` (Offers), `-equipment.png` and `-service.png`, all 287×186 PNG.
  - Newer ones: 574×372 JPEG (2×) – `-gps.jpg`, `-invoicing.jpg`, `-wms.jpg`, `-transport.jpg`.
  - Transport photo: a Gemini picture (open plant trucks – a flatbed with a mini excavator, a low-loader with its ramps
    down carrying a scissor lift and a forklift). The same picture is the How it works “Transport” step card
    (`step-3.jpg`, 586×400 – 2× of 293×200 – with the step pictures' dark fade at the bottom).
  - Its phone shows a real screenshot of the EQrento driver app (light theme), made by
    `../narzedzia/telefon-transport2.ps1` + `PhoneScreen.cs`. The script finds the phone's white screen in the photo by
    itself, warps the app screen onto it, then makes both crops.
  - The app screen (status bar + screenshot + home bar) is `../narzedzia/transport-screen.png`, built by
    `telefon-transport.ps1` for the first, trucks-only photo.
- **How it works step pictures** (`.step__media`, 293×200 at 1×): the dark fade at the bottom is baked into the
  pictures (85 of 200 px, to #010101) and the CSS adds its own.
  - `step-1|2|5|6.png` are 1× PNGs.
  - `step-3.jpg` (Transport, see above) and `step-4.jpg` (Handover) are 586×400 JPEGs (2×).
  - In `step-4.jpg` the worker's phone shows the EQrento app (calendar with a repair task, light theme). It was made by
    `../narzedzia/telefon-przekazanie.ps1` from `step-4-orig.png` (the original picture, enlarged to 2×) and
    `handover-shot.png`. The phone's screen is found by itself, leaving out the camera notch.
  - `-sales.jpg` (Gemini picture, key fob retouched by `../narzedzia/zdjecie-sprzedaz.ps1`) belongs to the
    “Equipment sales” tab.
- **Key features motion** (main.js, “key features: tabs / accordion”):
  - On a click everything moves as one 0.5s movement on the page's `--ease` curve: the accordion, the page scroll (the
    tab ends right under the header) and, side by side, the picture.
  - The movement aims at the end state, measured first on an invisible copy of the list (`.is-probe`).
  - The picture moves with `translate`, set frame by frame in the same loop as the scroll, on its own layer while it
    moves. Never animate its margin: that relays out the page and repaints the big shadow and glow on every frame,
    which stutters.
  - For the last tabs the grid gets an animated bottom padding, so the picture doesn't cover the next section.
  - Stacked (≤ 1200px): the picture fades out and moves under the new tab, the tabs it shifts glide back (FLIP,
    `.is-flip`), then the page lines up the tab and the picture.
- **Hero picture** – a collage of three app windows (equipment list, “Ask AI about your data”, offer) between the
  forklift and the scissor lift; on wide screens (> 1200px) it is 10% larger (70.02% of the stage – the machines
  keep their size and move out with the offer window's edges); on phones (≤ 640px) the whole collage fills the
  content width and the machines, 25% smaller, stand in its empty bottom corners. Source: the designer's
  `collage 2.webp` (2640×1827, transparent); `../narzedzia/hero-kolaz.ps1` makes the window shadows 1.5× stronger,
  flattens it onto the hero colour `#f8f7f5` with a violet glow baked in and adds 8% of canvas at the bottom so the
  shadow and the glow fade out instead of stopping in a line. The result is kept as `../narzedzia/hero-flat.png`
  (2640×1973); from it the script saves sharp JPEGs in the exact widths the picture is shown at on common screens
  (`assets/img/screens/hero-574.jpg` … `hero-1842.jpg`, 23 sizes; the script lists which screen needs which).
  CSS rounds the picture to whole device pixels (`--dpx`, set by `main.js`), so the browser shows that file 1:1
  instead of resizing it (resizing, and the parallax moving it by fractions of a pixel, made it look soft – the
  collage has no parallax now). `sizes` in `index.html` is the picture's width in each layout minus .5px: change it
  together with the stage sizes. `fetchpriority="high"`: it is the first big picture. If the hero background colour
  changes, the pictures have to be made again. The forklift and the lift stand the same distance from the offer
  window's edges (on phones they overlap its edges by the same amount). When moving or resizing them, update the
  centring constants of the ≤ 1200px and ≤ 640px layouts (`--sw` divisor, margin factor) and the lift's `top` values
  (wheels on one line, parallax included, plus the reduced-motion ones) to match.
- **Telematics section** – machine → map → GPS report card → invoice card, one row above 1200px, a column below.
  The cards are HTML/CSS sized in container units (`cqi`) so they scale like a picture; the two documents are inline
  SVG. Arrows between stages are CSS masks.
- **Pricing** (on pricing.html since 5 Nov 2026; the home page keeps a teaser) – four plans: Essential, Complete
  (recommended, dark card), Connected, Enterprise. Each card is a CSS subgrid of 8 rows, so names, prices, buttons and
  lists line up across the cards (4 in a row above 1200px, 2×2 down to 641px, one column on phones). Yearly / monthly
  switch: every price has `data-yearly` and `data-monthly`, and `pricing.js` swaps the texts. Comparison table cells:
  `class="y"` included, `"n"` not included, `"t"` text. Every group heading has an icon (`<span class="cmp__ico">`,
  orange on a light tint like Key features) so the groups are easy to spot in the long table; `pricing`, `mailbox`,
  `settings` and `support.svg` were drawn for it, the rest are the Key features icons. More in “Pricing page” above.
- **AI Assistant** (paid add-on, available in every plan – always say “paid add-on”, nothing about tokens or prices)
  appears in: the hero checklist (“Ask AI about your data”), the EQrento card in Why (“Optional AI Assistant…”), the
  One platform diagram (violet chip `.node--ai`, `data-node="t"` on top of the core; its connector is the `t` route in
  `drawLines()` in `main.js`), Key features (9th, last tab; screenshot `assets/img/screens/ai-860|1080|1290|1720.png` made by
  `../narzedzia/zrzut-ai.ps1` from the raw screenshot; the tab has no `data-photo`, so `main.js` adds `.is-nophoto` and
  the small photo is hidden), the comparison table (group “AI Assistant”, cells “Paid add-on”), a box under the pricing
  cards and an FAQ question. Icons: `assets/icons/ai.svg` (orange) and `assets/icons/platform/ai.svg` (white).
- **Warehouse (WMS)** – Enterprise only: a group in the comparison table, the One platform chip in the former “Map”
  slot (`data-node="br"`), the first line of the Enterprise card and Key features (6th tab, after Service; screenshot
  `assets/img/screens/wms-860|1080|1290|1720.png` made by `../narzedzia/zrzut-wms.ps1` – the raw screenshot is much
  wider than the others, so app background is added under it and the sidebar's scrollbar is removed; small photo
  `assets/img/features-photo-wms.jpg`, a Gemini picture cropped and sized by `../narzedzia/zdjecie-wms.ps1`).
  Icons: `assets/icons/wms.svg` (orange), `assets/icons/platform/wms.svg` (white).
- **Equipment and parts sales** (selling machines and parts, plus after-sales service) – Enterprise only: a group in
  the comparison table after Warehouse (WMS) and the second line of the Enterprise card. The two sale rows that used to
  be in Equipment now live there. Key features: 7th tab “Equipment sales” (after Warehouse (WMS)), with the photo
  `assets/img/features-photo-sales.jpg`. Its screenshot is the Equipment one – it stays (Łukasz, 4 Nov 2026); if an
  “Equipment for Sale” screenshot ever comes, make its four sizes and swap `data-screen` / `data-srcset`. Never call it the only system
  on the market that sells. Icon: `assets/icons/sales.svg` (orange tag).
- **Testimonial** – the video slot is 4:3 on desktop (the film's own shape); captions are burned into the video and
  are never cropped. Poster: `testimonial-hardy-poster.jpg`; play button logic at the end of `main.js`.
- **Steps (How it works)** – pinned while the cards scroll; on short screens the pin position adapts so the cards and
  the 01/06 progress bar always fit (`.steps__pin` in CSS, `--pin-h` / `--pin-head` set in `layoutSteps()`).
- **Cookie banner** – markup at the end of `index.html`, styles under “COOKIE BANNER” in `style.css`, logic at the end
  of `main.js`. The choice (necessary / analytics / marketing) is stored in `localStorage` (`eq-cookie-consent`);
  “Cookie settings” in the footer reopens it. The site itself sets no cookies today – when you add analytics or
  marketing tags, load them only after consent:
  `window.eqOnConsent('analytics', () => { /* load the analytics script here */ });`
  (or listen to the `eq:consent` event). Change `VERSION` in `main.js` to ask everybody again after a policy change.
- **Demo request form** – every “Book a demo” / “Book a 30-minute demo” button links to `#book-demo` and opens the
  `<dialog id="book-demo">` near the end of `index.html` (styles under “DEMO REQUEST DIALOG”, logic at the end of
  `main.js`); `https://eqrento.com/#book-demo` opens it directly (links in e-mails, ads). Fields: what they rent
  (chips, several allowed, “Other” adds a text box), fleet size (chips matching the plan limits), company, name,
  email, phone (optional), note (optional, folded). The form posts JSON as `text/plain` (no CORS preflight) to the
  URL in the form's `data-endpoint` – a Google Apps Script web app that adds a row to a Google Sheet and e-mails
  the team (address: `NOTIFY_TO` in the script; code and set-up guide are kept outside this public repo:
  `../formularz-demo/`). Body:
  `rents` (array), `rents_other`, `fleet_size`, `company`, `name`, `email`, `phone`, `message`, `website` (spam
  trap, must stay empty), `source` (which button: the button's `data-demo-source` if it has one, else the plan or
  the section it sits in), `page`, `referrer`, `utm`, `timezone`, `language`, `seconds`;
  expected answer `{"ok":true}` – any endpoint that does this (e.g. PHP on the own server) can replace Apps Script.
  No endpoint, or sending fails → the visitor gets a pre-filled e-mail to contact@eqrento.com instead. Events for
  analytics: `eq:demo-open`, `eq:demo-request` (on `document`).
- **Integrations section** – Wojtek's design (5 Nov 2026) rebuilt in the site's styles (`INTEGRATIONS` block in
  `style.css`): the navy API card and three white cards of partner tiles. “Ask about API access” and “+ Your system”
  open the demo form (`source`: “integrations – API access” / “integrations – your system”). KSeF is shown on
  purpose (Łukasz, 5 Nov 2026: “na razie”), although the site otherwise targets the EU and the US.
  - Partner logos: **official files only**, never redrawn or recoloured, in `assets/logos/` named `zoomlion`,
    `teltonika`, `trackunit`, `ksef`, `comarch`, `wapro`, `exact`, `snelstart`, `microsoft-azure`, `google` (SVG, or
    PNG at least 120px tall on a transparent background). Until a company's file is there, its tile shows the name.
  - To show a logo, put `<img src="assets/logos/NAME.svg" width="…" height="…" style="--lh:30" alt="Company"
    loading="lazy">` in front of the name inside its `.int-tile`: the CSS hides the name. `--lh` = the logo's height
    in px, chosen by eye so the logos look equally heavy (20% less on phones). No `onerror` handlers (the server's CSP
    blocks inline JavaScript) – add the `<img>` only once the file is in the folder.
  - In place (5 Nov 2026), each file byte for byte as published by the company itself:
    - `teltonika.svg`: `TELTONIKA-LOGO-BLUE-RGB.svg` from the LOGO link on teltonika-iot-group.com/brand-guidelines.
    - `trackunit.png`: `trackunit_logotype_rgb_red.png` from trackunit.com/media-library.
    - `zoomlion.svg`, `comarch.svg`, `wapro.svg`, `snelstart.svg`: the logo files in the headers of en.zoomlion.com,
      comarch.com, wapro.pl and snelstart.nl.
    - `google.svg`: Google's own `googlelogo_clr_74x24px.svg` (gstatic.com).
    - `exact.jpg`: the logo named in exact.com's structured data, a 640×480 JPG with the logo on white.
    - `ksef.jpg` (341×148, the blue “KSeF” box) and `microsoft-azure.png` (1024×576, transparent): graphics Łukasz
      supplied himself on 5 Nov 2026. The KSeF site offers no logo file, and Microsoft's own Azure files come with
      terms for diagrams only.
  - A logo that sits in a band across a larger picture (Exact, Microsoft Azure) gets `class="int-tile__logo--band"`
    and `--band` (picture width / band height) and `--band-y` (the band's centre) in its `style`: the picture is
    cropped to the band and the file stays unchanged. A picture on white (Exact) also gets `int-tile__logo--on-white`,
    which blends the white into the tile.
  - Order (Łukasz, 5 Nov 2026): Teltonika, Trackunit, Zoomlion · Exact, SnelStart, Comarch, Asseco Wapro, KSeF ·
    Google, Microsoft Azure, + Your system.
  - Permission (checked 5 Nov 2026, details in `../eqrento-landing-ustalenia.md`): only Teltonika's rules cover this
    use. Trackunit's media library is for non-commercial use, Exact licenses its logo to App Store partners, Wapro to
    portal partners, Comarch on request, Google after an approved request, Microsoft only under licence. Łukasz decided
    to show them anyway, on his own responsibility („Na moją odpowiedzialność”). Remove a logo at once if a company
    objects.
- **Reveal on scroll** – any element with `data-reveal` (`up` default, `left`, `right`, `zoom`, `fade`); delay via
  `style="--d:200ms"`. **Parallax** – `data-parallax="0.1"`. All animations are off with “reduce motion”.
  - Exception: the hero plays its entrance from the CSS at first paint (`hero-in` / `hero-settle` keyframes), without
    waiting for main.js, and its collage is never transparent – it only settles from 96%. The collage is the page's
    largest element, so its paint time is the LCP.
- **Speed (PageSpeed, 5 Nov 2026: mobile 75, LCP 5.5 s; desktop 97)** – what was done and what to keep doing:
  - The hero entrance above.
  - WebP made in the browser's own encoder (canvas `toDataURL('image/webp')`; no extra tools). The PNG/JPG masters
    stay in the repo, so a new WebP is always made from the master, not from another WebP:
    - hero machines `hero-forklift-510|340.webp`, `hero-lift-490|330.webp` (q 0.85, `srcset` + measured `sizes`);
    - client logos and the testimonial logo `logo-*.webp` (q 0.9; `logo-rops.png` stays, the PNG is smaller);
    - footer logo `assets/icons/logo-light.webp` (740 px wide, used on all pages and in 404.html);
    - video poster `testimonial-hardy-poster.webp`.
  - The testimonial video has `preload="none"`: nothing is downloaded until “Watch the video” (it was 5.9 MB on load).
  - Key features is an accordion for screen readers (`aria-expanded` on the buttons, like the FAQ). There is no tab
    list, because tab panels may not sit inside it.
  - The big pale step numbers in How it works are decoration, drawn from `data-num` (`aria-hidden`). The
    “01 / 06” counter is dark enough to read.
  - Cloudflare adds its Web Analytics beacon and the e-mail obfuscation script to the live site. Those are switches
    in Cloudflare, not in this repo.
- **Icon credit** – the icons are Uicons on the free Flaticon licence, which requires “Uicons by Flaticon” with a link
  near the icons or in the footer: the last of the links in the footer's bottom row (after “Cookie settings”), on all three pages.
  Keep it while the site uses Uicons.
- **Privacy Policy and Cookie Policy** – `privacy-policy.html` and `cookie-policy.html`, linked from the footer (on
  every page), the cookie banner and the demo form (that link opens a new tab, so the form keeps what was typed).
  - The HTML is the source of truth. Łukasz's Word files of 4 Nov 2026 are only an archive copy, outside the repo in
    `../dokumenty-prawne/`.
  - To change a policy, edit the text inside `<article class="legal__doc">`. Every section starts with
    `<h2 id="…">`; `main.js` builds the “On this page” list from those headings, so the list needs no edit of its own.
  - With every update: change the “Last updated” date (the text and its `datetime`) and `lastmod` in `sitemap.xml`.
  - **Cookie Policy changed → raise `VERSION` in the cookie-consent part of `main.js`**, so every visitor is asked
    again (the policy promises that). A new analytics or marketing tool = a new row in the Cookie Policy table, and
    the tool loads only through `eqOnConsent`.
  - The header, mobile menu, footer and cookie banner of both pages are copies of those in `index.html`, with links
    back to it (`./`, `./#why`, `./#book-demo`) and to `pricing`. When you change them in `index.html`, change them in
    both policy pages and in pricing.html too.
  - Typography as on the home page: `SOLTIX&nbsp;Sp.&nbsp;z&nbsp;o.o.`, `&nbsp;–` before a dash,
    `<span class="nowrap">e-mail</span>`. Tables: each `<td>` has a `data-label` (the column name, shown above the
    cell when the table turns into cards on tablets and phones). Styles: the `POLICY PAGES` block in `style.css`
    (it includes a print layout).

## Before going live – still to do

- Demo request form: put the Apps Script web-app URL (…/exec) into `data-endpoint` of `.demo__form` in `index.html`
  (until then the form falls back to a pre-filled e-mail).
- FAQ answers 2–6 and some Key features descriptions are placeholder copy.
- Optional: WebP for the remaining pictures (Key features photos, How it works photos, the telematics images; the
  hero machines, logos, poster and footer logo are done – see “Speed”).

## Cache busting

`index.html` loads `style.css` and `main.js` with a version in the address (`?v=20261022b`). Browsers keep those
files for up to 10 minutes on GitHub Pages, so after changing either file bump the version (e.g. `20261023a`) in both
links, otherwise visitors may see new HTML with old styles. The two policy pages load the same files: bump the version
in `privacy-policy.html` and `cookie-policy.html` too.
