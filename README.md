# IREVA website

Streetwear and gym wear store. Plain HTML, one stylesheet, vanilla JavaScript. No build step, no frameworks.

## Run it
Products and reviews load from `content/*.json`, so open the site through a server, not by double-clicking:
- VS Code: right-click `index.html` and choose Open with Live Server, or
- Terminal: `python3 -m http.server` in this folder, then open http://localhost:8000
- Deploy: drag the folder onto Netlify (the contact form and `/admin` work there).

## Before launch
1. `content/settings.json`: real WhatsApp number (digits only, with country code, e.g. 2348012345678), Gmail, Instagram and TikTok links. Until then checkout shows "Ordering is not switched on yet".
2. `content/reviews.json`: replace the six sample reviews with real ones and set `"sample": false` (the "Sample review" tag disappears).
3. `content/products.json`: confirm prices, add photos for the six products that have none.
4. `size-guide.html`: replace the starter measurements with the real ones.
5. Replace `YOUR-SITE.netlify.app` in every page's `og:image`, `robots.txt` and `sitemap.xml`.
6. Have the privacy and terms text reviewed.
7. Netlify: turn on Identity and Git Gateway so `/admin` can save changes.

## Edit content without code
Go to `/admin` (Decap CMS). You can edit settings, products (price, photos, sizes, sold-out sizes, badge, featured) and reviews.

## Structure
```
index.html shop.html about.html contact.html faq.html size-guide.html privacy-terms.html 404.html
admin/      Decap CMS (index.html, config.yml)
content/    settings.json, products.json, reviews.json
css/        styles.css   one file, sectioned: fonts, tokens, base, buttons, header, hero, home, cards,
                         reviews, footer, size modal, cart, inner pages, responsive
js/         main.js      every page: content, cart, size picker, product grids, checkout, menu
            home.js      home page only: hero slideshow and reviews carousel
assets/     images/ (logo, favicon, product photos)   fonts/ (Syne and Inter, self-hosted)
```
Each page repeats the header, footer, cart drawer and size picker markup. If you change one, change it on all 8 pages.

## Design notes
- Dark and light sections alternate (`.is-dark` / `.is-light` on any section).
- Colours, spacing and type sizes are variables at the top of `css/styles.css`.
- Motion respects "reduce motion"; the hero and reviews have a pause button.
