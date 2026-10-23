# EQrento – landing page

Static website: HTML + CSS + JavaScript, no build step, no dependencies, no server-side code.

## Deploy

Upload **the contents of this folder** (`index.html` and the `assets` folder) to the web root of any static host
(classic hosting via FTP / file manager, Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3…).
`index.html` must be at the root of the site, with `favicon.ico`, `apple-touch-icon.png` and `site.webmanifest` next to it.
All paths are relative, so the site also works from a sub-folder.

Recommended server settings (most hosts do this by default):

- HTTPS on, redirect http → https
- gzip or brotli compression for `.html`, `.css`, `.js`, `.svg`
- long cache for `/assets/*` (e.g. 30 days); short or no cache for `index.html`
- correct MIME types: `.woff2` → `font/woff2`, `.webm` → `video/webm`, `.mp4` → `video/mp4`,
  `.svg` → `image/svg+xml`
- byte-range requests allowed (standard) so the testimonial video can start before it is fully downloaded

Open the site through a web server, not by double-clicking `index.html`: some browsers block the self-hosted fonts
and the video on `file://`.

## Structure

```
index.html
favicon.ico            – browser tab / bookmarks (16, 32, 48 px)
apple-touch-icon.png   – iOS home screen (180 px)
site.webmanifest       – Android home-screen icons (round 192 / 512 px + maskable)
assets/css/style.css   – all styles; design tokens at the top (:root)
assets/js/main.js      – interactions and animations
assets/fonts/          – Sora (variable, self-hosted, latin + latin-ext)
assets/img/            – images, client logos
assets/icons/          – SVG icons and logos, favicon.svg, icon-192/512 and icon-maskable-512 PNGs
assets/video/          – testimonial video (mp4 + webm fallback)
```

## Sections (in page order) and menu

Hero → client logos → Why EQrento (“Between a basic spreadsheet and a complex ERP system”) → Platform
(“One platform…”) → How it works (“Six interconnected stages…”, pinned horizontal scroll) → Key features and
competitive differentiators → Telematics (“Telematics that safeguards your billing”) → Testimonial → Pricing → FAQ → CTA →
footer.
Menu: Home, Why EQrento, Platform, How it works, Pricing, FAQ (header, mobile menu and footer follow the page order).

## Things worth knowing

- **Section spacing** – two variables at the top of `style.css`: `--sec-y` (76px desktop / 50px from 1200px down)
  where the background changes, `--sec-join` (48px / 32px) where two neighbouring sections share the same background.
- **Hero background** – the block marked `EXPERIMENT` at the end of `style.css` gives the hero and header the light
  page background. To return to the dark hero: delete that block, use `logo-light.svg` in the header and set
  `theme-color` back to `#0b0805`.
- **Client logos** – each logo has a height `--lh` (set in `index.html`) chosen by optical balancing (wide and light
  marks bigger, compact and heavy marks smaller). Optional per logo: `--tone` darkens a pale logo in its grey state,
  `--logo-gray: url(#logo-gray-red)` uses a red-channel grey (for the red-on-black Tenge logo; the SVG filter is inline
  in the logos section). Logos are grey, full colour on hover / tap. When they don't fit in one row, JS turns the
  strip into a seamless marquee (currently always, with 9 logos).
- **Telematics section** – machine → map → GPS report card → invoice card, one row above 1200px, a column below.
  The cards are HTML/CSS sized in container units (`cqi`) so they scale like a picture; the two documents are inline
  SVG. Arrows between stages are CSS masks.
- **Pricing** (`#pricing`) – four plans: Essential, Complete (recommended, dark card), Connected, Enterprise. Each card is
  a CSS subgrid of 8 rows, so names, prices, buttons and lists line up across the cards (4 in a row above 1200px, 2×2
  down to 641px, one column on phones). Yearly / monthly switch: every price has `data-yearly` and `data-monthly`, and
  `main.js` swaps the texts. “Compare all features” opens the full table; its header sticks under the page header.
  Below 900px each row shows the feature name above its four plan cells (the explicit ARIA roles in the table markup
  keep it a table for screen readers). Cells: `class="y"` included, `"n"` not included, `"t"` text.
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
- **Reveal on scroll** – any element with `data-reveal` (`up` default, `left`, `right`, `zoom`, `fade`); delay via
  `style="--d:200ms"`. **Parallax** – `data-parallax="0.1"`. All animations are off with “reduce motion”.

## Before going live – still to do

- “Book a demo” / “Book a 30-minute demo” buttons have `href="#"` – connect them to the booking form / calendar.
- “Privacy Policy” and “Cookie Policy” links have `href="#"` – point them to the real documents. Keep the banner text
  and the Cookie Policy in line with the tools actually used.
- FAQ answers 2–6 and some Key features descriptions are placeholder copy.
- Optional: social-sharing image (Open Graph), `robots.txt`, `sitemap.xml`, 404 page,
  converting large PNG/JPG images to WebP.
- The free UIcons licence requires attribution (“Uicons by Flaticon”) unless you have a Flaticon subscription.

## Cache busting

`index.html` loads `style.css` and `main.js` with a version in the address (`?v=20261022b`). Browsers keep those
files for up to 10 minutes on GitHub Pages, so after changing either file bump the version (e.g. `20261023a`) in both
links, otherwise visitors may see new HTML with old styles.
