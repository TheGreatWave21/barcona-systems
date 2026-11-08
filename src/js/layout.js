/* ==========================================================
   Shared layout: header, footer, logo and TraceUnit illustration.
   Edit navigation and footer links here once; every page updates.
   ========================================================== */
(function () {
  document.documentElement.classList.remove("no-js");

  /* Visitor statistics: GoatCounter (no cookies, no personal data).
     Only counts on the live site, not when opening the files locally. */
  if (location.protocol.startsWith("http")) {
    const gc = document.createElement("script");
    gc.async = true;
    gc.src = "https://gc.zgo.at/count.js";
    gc.dataset.goatcounter = "https://something123.goatcounter.com/count";
    document.head.appendChild(gc);
  }

  const LOGO = `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M2 9V2h7M23 2h7v7M30 23v7h-7M9 30H2v-7" fill="none" stroke="#ff5b1f" stroke-width="2.2"/>
      <rect x="8" y="9" width="2.2" height="14" fill="currentColor"/>
      <rect x="12" y="9" width="1.2" height="14" fill="currentColor"/>
      <rect x="15" y="9" width="3" height="14" fill="currentColor"/>
      <rect x="20" y="9" width="1.2" height="14" fill="currentColor"/>
      <rect x="22.6" y="9" width="1.6" height="14" fill="currentColor"/>
      <rect x="6" y="15.4" width="20" height="1.2" fill="#ff5b1f"/>
    </svg>`;

  const NAV = [
    ["barcona-ai.html", "BARCONA AI"],
    ["detection-unit.html", "Detection Unit"],
    ["traceunit.html", "TraceUnit"],
    ["about.html", "About"],
    ["news.html", "News"],
    ["contact.html", "Contact"],
  ];

  // Works for local files ("traceunit.html") and Squarespace URLs ("/traceunit")
  const norm = (p) => (p.split("#")[0].split("/").pop() || "index").replace(/\.html$/, "").toLowerCase() || "index";
  const page = norm(location.pathname);

  const header = `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header" id="top">
      <div class="container header-inner">
        <a class="brand" href="index.html" aria-label="Barcona Systems, home">${LOGO}<span>BARCONA<b>Systems</b></span></a>
        <nav class="nav" id="site-nav" aria-label="Main">
          ${NAV.map(([href, label]) => `<a href="${href}"${norm(href) === page && !href.includes("#") ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
          <a class="btn btn-primary nav-cta-mobile" href="contact.html">Get in touch <span class="arrow">→</span></a>
        </nav>
        <a class="btn btn-primary btn-sm header-cta" href="contact.html">Get in touch <span class="arrow">→</span></a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
      </div>
    </header>`;

  const footer = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <a class="brand" href="index.html" style="margin-bottom:1rem">${LOGO}<span>BARCONA<b>Systems</b></span></a>
            <p>Autonomous vision systems for real-time inventory control. Built in Lörrach, Germany.</p>
            <a class="link-arrow" href="mailto:info@barconasystems.de">info@barconasystems.de <span>→</span></a>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li><a href="barcona-ai.html">BARCONA AI</a></li>
              <li><a href="detection-unit.html">Detection Unit</a></li>
              <li><a href="traceunit.html">TraceUnit-1-30x</a></li>
              <li><a href="index.html#demo">Live map demo</a></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><a href="about.html">About &amp; team</a></li>
              <li><a href="news.html">News</a></li>
              <li><a href="contact.html">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><a href="impressum.html">Impressum</a></li>
              <li><a href="datenschutz.html">Datenschutz</a></li>
            </ul>
          </div>
        </div>
        <p class="footer-wordmark" aria-hidden="true">BARCONA</p>
      </div>
      <div class="container footer-bottom">
        <span>© <span data-year>2026</span> Barcona Systems · Lörrach, BW, Germany</span>
        <span>47.61° N, 7.66° E</span>
      </div>
    </footer>`;

  /* Detection Unit: a small camera + compute module on an ordinary forklift,
     with a zoomed-in inset of the module itself */
  let flCount = 0;
  function forkliftSVG() {
    const id = "f" + flCount++;
    const label = (x, y) => `<rect x="${x}" y="${y}" width="26" height="12" rx="1.5" fill="#d9dde2"/><g fill="#0a0b0d"><rect x="${x + 3}" y="${y + 2}" width="1.4" height="8"/><rect x="${x + 6}" y="${y + 2}" width="0.8" height="8"/><rect x="${x + 8.5}" y="${y + 2}" width="2" height="8"/><rect x="${x + 12}" y="${y + 2}" width="0.8" height="8"/><rect x="${x + 14.5}" y="${y + 2}" width="1.4" height="8"/><rect x="${x + 18}" y="${y + 2}" width="0.8" height="8"/><rect x="${x + 20.5}" y="${y + 2}" width="2" height="8"/></g>`;
    const box = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#2a2620" stroke="rgba(255,255,255,.1)"/>`;
    const Y = "#c9a227", Yd = "#8f7419"; // generic forklift yellow, not Barcona orange
    const MX = 312, MY = 133; // module position after the forklift's transform
    return `
    <svg class="unit forklift" viewBox="0 0 640 440" role="img" aria-label="Illustration of the BARCONA Detection Unit: a small camera and compute module mounted on the overhead guard of an ordinary forklift, shown enlarged in an inset, reading barcodes on a shelf">
      <defs>
        <linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:#2b3038"/><stop offset="1" style="stop-color:#14171c"/></linearGradient>
        <linearGradient id="${id}-cone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:#7fe3ff;stop-opacity:.4"/><stop offset="1" style="stop-color:#7fe3ff;stop-opacity:.03"/></linearGradient>
        <radialGradient id="${id}-shadow"><stop offset="0" style="stop-color:#000;stop-opacity:.7"/><stop offset="1" style="stop-color:#000;stop-opacity:0"/></radialGradient>
      </defs>
      <ellipse cx="270" cy="398" rx="200" ry="13" fill="url(#${id}-shadow)"/>
      <line x1="20" y1="398" x2="620" y2="398" stroke="rgba(255,255,255,.08)"/>

      <g class="beam beam-vision"><polygon points="${MX + 4},${MY} 476,50 476,392" fill="url(#${id}-cone)"/></g>

      <!-- Shelf rack -->
      <g>
        <rect x="474" y="50" width="8" height="348" fill="#20242b"/><rect x="616" y="50" width="8" height="348" fill="#20242b"/>
        <rect x="474" y="148" width="150" height="7" fill="#ff5b1f" opacity=".75"/><rect x="474" y="258" width="150" height="7" fill="#ff5b1f" opacity=".75"/><rect x="474" y="368" width="150" height="7" fill="#ff5b1f" opacity=".75"/>
        ${box(486, 96, 56, 52)}${box(548, 110, 60, 38)}${box(486, 214, 46, 44)}${box(540, 200, 68, 58)}${box(490, 318, 58, 50)}${box(556, 330, 52, 38)}
        ${label(500, 118)}${label(565, 124)}${label(496, 230)}${label(560, 222)}${label(506, 336)}${label(569, 344)}
        ${label(530, 154)}${label(530, 264)}
      </g>
      <g class="dets" font-family="IBM Plex Mono, monospace" font-size="8.5" letter-spacing=".5">
        <g class="det" style="--i:0"><rect x="496" y="114" width="34" height="20" fill="none" stroke="#7fe3ff" stroke-dasharray="3 2"/><text x="496" y="110" fill="#7fe3ff">READ</text></g>
        <g class="det" style="--i:1"><rect x="561" y="120" width="34" height="20" fill="none" stroke="#7fe3ff" stroke-dasharray="3 2"/><text x="561" y="116" fill="#7fe3ff">READ</text></g>
        <g class="det" style="--i:2"><rect x="526" y="150" width="34" height="20" fill="none" stroke="#7fe3ff" stroke-dasharray="3 2"/><text x="563" y="166" fill="#7fe3ff">SHELF</text></g>
        <g class="det" style="--i:3"><rect x="492" y="226" width="34" height="20" fill="none" stroke="#ff5b1f" stroke-dasharray="3 2"/><text x="486" y="210" fill="#ff5b1f">REVIEW</text></g>
        <g class="det" style="--i:4"><rect x="556" y="218" width="34" height="20" fill="none" stroke="#7fe3ff" stroke-dasharray="3 2"/><text x="556" y="196" fill="#7fe3ff">CONFIRMED</text></g>
        <g class="det" style="--i:5"><rect x="502" y="332" width="34" height="20" fill="none" stroke="#7fe3ff" stroke-dasharray="3 2"/><text x="502" y="328" fill="#7fe3ff">READ</text></g>
      </g>

      <!-- Ordinary forklift -->
      <g transform="translate(52 48) scale(0.88)">
        <rect x="352" y="84" width="14" height="306" rx="3" fill="#2a2e35" stroke="rgba(255,255,255,.1)"/>
        <rect x="370" y="100" width="8" height="290" rx="2" fill="#22262c"/>
        <rect x="366" y="292" width="12" height="58" rx="2" fill="#30353d"/>
        <rect x="370" y="344" width="86" height="8" rx="2" fill="#4a5059"/>
        <rect x="374" y="326" width="76" height="18" rx="2" fill="#5a4630"/>
        <rect x="380" y="276" width="64" height="50" rx="2" fill="#2a2620" stroke="rgba(255,255,255,.12)"/>
        ${label(399, 294)}
        <path d="M172 250 L180 118 M300 250 L296 118" stroke="#3a404a" stroke-width="7" stroke-linecap="round"/>
        <rect x="164" y="108" width="146" height="10" rx="4" fill="#3a404a"/>
        <rect x="204" y="198" width="40" height="54" rx="8" fill="#1c2026"/>
        <rect x="80" y="262" width="62" height="96" rx="14" fill="${Yd}"/>
        <rect x="112" y="248" width="244" height="112" rx="16" fill="${Y}"/>
        <rect x="112" y="304" width="244" height="56" rx="0" fill="${Yd}" opacity=".5"/>
        <rect x="128" y="262" width="60" height="22" rx="4" fill="rgba(0,0,0,.18)"/>
        <circle cx="168" cy="366" r="32" fill="#0c0e11" stroke="rgba(255,255,255,.14)"/>
        <g class="wheel-hub"><circle cx="168" cy="366" r="13" fill="#262b33"/><rect x="166" y="353" width="4" height="8" fill="#5f656e"/></g>
        <circle cx="318" cy="368" r="28" fill="#0c0e11" stroke="rgba(255,255,255,.14)"/>
        <g class="wheel-hub"><circle cx="318" cy="368" r="11" fill="#262b33"/><rect x="316" y="357" width="4" height="7" fill="#5f656e"/></g>
        <!-- the Detection Unit: a small module on the overhead guard -->
        <rect x="276" y="99" width="12" height="9" rx="2" fill="#14171c" stroke="#ff5b1f" stroke-width="1"/>
        <rect x="290" y="96" width="18" height="12" rx="3" fill="#1a1e24" stroke="#ff5b1f" stroke-width="1"/>
        <circle class="part part-vision" cx="306" cy="102" r="2.6" fill="#7fe3ff"/>
        <circle class="led" cx="280" cy="103.5" r="1.4" fill="#7fe3ff"/>
      </g>

      <!-- Zoom: ring + leader lines + inset -->
      <circle class="zoom-ring" cx="${MX}" cy="${MY}" r="17" fill="none" stroke="#ff5b1f" stroke-width="1.5" stroke-dasharray="4 3"/>
      <line x1="${MX - 12}" y1="${MY - 12}" x2="232" y2="26" stroke="rgba(255,91,31,.55)" stroke-width="1"/>
      <line x1="${MX - 14}" y1="${MY + 8}" x2="232" y2="150" stroke="rgba(255,91,31,.55)" stroke-width="1"/>
      <g class="zoom-inset">
        <rect x="14" y="26" width="218" height="124" rx="10" fill="#0d0f12" stroke="#ff5b1f" stroke-width="1.2"/>
        <text x="26" y="45" font-family="IBM Plex Mono, monospace" font-size="11" font-weight="600" letter-spacing="1.5" fill="#ff5b1f">DETECTION UNIT</text>
        <text x="220" y="44" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="8" letter-spacing="1" fill="#5f656e">ZOOM</text>
        <rect x="22" y="118" width="202" height="14" rx="4" fill="#3a404a"/>
        <rect x="52" y="108" width="10" height="26" rx="2" fill="#262b33"/><rect x="150" y="108" width="10" height="26" rx="2" fill="#262b33"/>
        <rect x="36" y="74" width="74" height="40" rx="6" fill="#14171c" stroke="rgba(255,255,255,.22)"/>
        <g fill="rgba(255,255,255,.12)"><rect x="44" y="84" width="3" height="20" rx="1.5"/><rect x="51" y="84" width="3" height="20" rx="1.5"/><rect x="58" y="84" width="3" height="20" rx="1.5"/></g>
        <circle class="led" cx="98" cy="84" r="3" fill="#7fe3ff"/>
        <path d="M110 96 C 122 96, 122 86, 134 86" stroke="#ff5b1f" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <rect x="134" y="66" width="74" height="46" rx="10" fill="url(#${id}-body)" stroke="rgba(255,255,255,.25)"/>
        <rect x="140" y="72" width="30" height="5" rx="2.5" fill="rgba(255,255,255,.12)"/>
        <circle cx="194" cy="89" r="14" fill="#0a0b0d" stroke="rgba(255,255,255,.25)"/>
        <circle cx="194" cy="89" r="8" fill="#112233" stroke="#7fe3ff" stroke-width="1"/>
        <circle class="part part-vision" cx="194" cy="89" r="3.5" fill="#7fe3ff"/>
        <circle cx="190" cy="85" r="1.6" fill="#fff" opacity=".7"/>
        <g font-family="IBM Plex Mono, monospace" font-size="9" letter-spacing=".6" fill="#b4b8be">
          <text x="36" y="68">COMPUTE</text>
          <text x="146" y="61">CAMERA</text>
        </g>
      </g>
    </svg>`;
  }

  document.querySelectorAll('[data-include="forklift"]').forEach((el) => {
    const live = el.hasAttribute("data-live");
    el.outerHTML = forkliftSVG().replace('class="unit forklift"', live ? 'class="unit forklift is-live"' : 'class="unit forklift"');
  });

  document.querySelectorAll('[data-include="header"]').forEach((el) => (el.outerHTML = header));
  document.querySelectorAll('[data-include="footer"]').forEach((el) => (el.outerHTML = footer));
})();
