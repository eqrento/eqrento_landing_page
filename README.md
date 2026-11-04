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

## Structure

```
index.html
robots.txt, sitemap.xml – search engines (point to https://eqrento.com/)
404.html               – page for unknown addresses (GitHub Pages serves it automatically; works from the site root)
favicon.ico            – browser tab / bookmarks (16, 32, 48 px), made from the EQ mark
apple-touch-icon.png   – iOS home screen (180 px)
site.webmanifest       – Android home-screen icons (round 192 / 512 px + maskable)
assets/css/style.css   – all styles; design tokens at the top (:root)
assets/js/main.js      – interactions and animations
assets/fonts/          – Sora (variable, self-hosted, latin + latin-ext)
assets/img/            – images, client logos, og-image.png (1200×630 link-preview picture)
assets/icons/          – SVG icons, logo-light.png (footer logo, all white), icon-192/512 and icon-maskable-512 PNGs
assets/video/          – testimonial video (mp4 + webm fallback)
```

## Sections (in page order) and menu

Hero (on phones: headline, lead, collage, checklist, button – CSS grid + `display: contents`, see “phones: the collage comes right after the lead” in style.css) → client logos → Why EQrento (“Between a basic spreadsheet and a complex ERP system”) → Platform
(“One platform…”) → How it works (“Six interconnected stages…”, pinned horizontal scroll) → Key features and
competitive differentiators → Telematics (“Telematics that safeguards your billing”) → Testimonial → Pricing → FAQ → CTA →
footer.
Menu: Home, Why EQrento, How it works, Key features, Pricing, FAQ (header, mobile menu and footer follow the page order; the Platform section has no menu link).

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
- **Pricing** (`#pricing`) – four plans: Essential, Complete (recommended, dark card), Connected, Enterprise. Each card is
  a CSS subgrid of 8 rows, so names, prices, buttons and lists line up across the cards (4 in a row above 1200px, 2×2
  down to 641px, one column on phones). Yearly / monthly switch: every price has `data-yearly` and `data-monthly`, and
  `main.js` swaps the texts. Order below the cards: “Compare all EQrento features” (opens the full table, whose header sticks under the page header), the telemetry-device box, the price note.
  Below 900px each row shows the feature name above its four plan cells (the explicit ARIA roles in the table markup
  keep it a table for screen readers). Cells: `class="y"` included, `"n"` not included, `"t"` text. Every group
  heading has an icon (`<span class="cmp__ico">`, orange on a light tint like Key features) so the groups are easy to
  spot in the long table; `pricing`, `mailbox`, `settings` and `support.svg` were drawn for it, the rest are the
  Key features icons.
- **AI Assistant** (paid add-on, available in every plan – always say “paid add-on”, nothing about tokens or prices)
  appears in: the hero checklist (“Ask AI about your data”), the EQrento card in Why (“Optional AI Assistant…”), the
  One platform diagram (violet chip `.node--ai`, `data-node="t"` on top of the core; its connector is the `t` route in
  `drawLines()` in `main.js`), Key features (8th, last tab; screenshot `assets/img/screens/ai-860|1080|1290|1720.png` made by
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
  be in Equipment now live there. A Key features
  tab “Equipment sales” (after Warehouse (WMS)) waits for a screenshot of the app's “Equipment for Sale” screen and a
  small photo. Never call it the only system on the market that sells. Icon: `assets/icons/sales.svg` (orange tag).
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
  contact@eqrento.com (code and set-up guide are kept outside this public repo: `../formularz-demo/`). Body:
  `rents` (array), `rents_other`, `fleet_size`, `company`, `name`, `email`, `phone`, `message`, `website` (spam
  trap, must stay empty), `source` (which button), `page`, `referrer`, `utm`, `timezone`, `language`, `seconds`;
  expected answer `{"ok":true}` – any endpoint that does this (e.g. PHP on the own server) can replace Apps Script.
  No endpoint, or sending fails → the visitor gets a pre-filled e-mail to contact@eqrento.com instead. Events for
  analytics: `eq:demo-open`, `eq:demo-request` (on `document`).
- **Reveal on scroll** – any element with `data-reveal` (`up` default, `left`, `right`, `zoom`, `fade`); delay via
  `style="--d:200ms"`. **Parallax** – `data-parallax="0.1"`. All animations are off with “reduce motion”.

## Before going live – still to do

- Demo request form: put the Apps Script web-app URL (…/exec) into `data-endpoint` of `.demo__form` in `index.html`
  (until then the form falls back to a pre-filled e-mail).
- “Privacy Policy” and “Cookie Policy” links have `href="#"` – point them to the real documents. Keep the banner text
  and the Cookie Policy in line with the tools actually used.
- FAQ answers 2–6 and some Key features descriptions are placeholder copy.
- Optional: converting large PNG/JPG images to WebP.
- The free UIcons licence requires attribution (“Uicons by Flaticon”) unless you have a Flaticon subscription.

## Cache busting

`index.html` loads `style.css` and `main.js` with a version in the address (`?v=20261022b`). Browsers keep those
files for up to 10 minutes on GitHub Pages, so after changing either file bump the version (e.g. `20261023a`) in both
links, otherwise visitors may see new HTML with old styles.
