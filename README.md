# Barcona Systems website

A static rebuild of barconasystems.de. It uses plain HTML, CSS and JavaScript, with no build step.

**To view it:** double-click `index.html`, or open it in any browser.

## Pages
| File | Content |
|---|---|
| `index.html` | Home: hero, problem, BARCONA AI steps, two ways to deploy, TraceUnit scroll scene, live floor-map demo, use cases, timeline, team, CTA |
| `barcona-ai.html` | Software core: architecture, 4 steps, multi-frame tracking, status flags, output, ready/next |
| `detection-unit.html` | Forklift-mounted unit: concept, operation, benefit, comparison with TraceUnit, FAQ |
| `traceunit.html` | Autonomous robot: capabilities, scan cycle, spec sheet, FAQ |
| `pilot.html` | Pilot program: benefits, process, application form |
| `about.html` | Story, values, team, location |
| `news.html` | Build log / news posts |
| `contact.html` | Contact details + form |
| `impressum.html` | Legal notice (German), **template, fill in the orange fields** |
| `datenschutz.html` | Privacy policy (German), **template, fill in the orange fields** |

## Where to change things
- **Colours, fonts, spacing:** `src/css/tokens.css`
- **Navigation, footer, logo, TraceUnit illustration:** `src/js/layout.js` (shared by every page)
- **Animations and forms:** `src/js/main.js`
- **Live map simulation:** `src/js/map-demo.js`
- **Team photos:** put them in `public/img/` and follow the comment in `about.html`
- **News posts:** copy an `<article class="post">` block in `news.html`

## Before going live
1. Fill in `impressum.html` and `datenschutz.html`, and get them checked.
2. Self-host the fonts (Archivo, IBM Plex Mono) instead of loading them from Google Fonts. This matters for GDPR.
3. Forms currently open the visitor's email app. To receive submissions directly, create a form endpoint (e.g. Formspree, Web3Forms) and add `data-endpoint="https://…"` to each `<form>`.
4. Replace the `TBC` values on the spec sheet with real numbers.
5. Optional: add real CAD renders or photos of the TraceUnit, and add a German language version.
6. Deploy (GitHub Pages, Netlify or Cloudflare Pages) and point barconasystems.de at it.
