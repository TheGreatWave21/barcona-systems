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
    ["pilot.html", "Pilot"],
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
          <a class="btn btn-primary nav-cta-mobile" href="pilot.html">Become a pilot partner <span class="arrow">→</span></a>
        </nav>
        <a class="btn btn-primary btn-sm header-cta" href="pilot.html">Become a pilot partner <span class="arrow">→</span></a>
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
              <li><a href="pilot.html">Pilot program</a></li>
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

  /* TraceUnit-1-30x, modelled on the CAD screenshots (Aug 2025).
     A small 3D model drawn with a proper axonometric projection:
     every circle (wheels, LiDAR, domes) is sampled in 3D and projected,
     so nothing is skewed. Animated layers (LiDAR sweep, laser, camera
     frustum) are driven by animateUnits() below. */
  const TU = { L: 280, D: 168, H: 188, g: 36, FZ: 118, SX: 218, SEAM: 150 };
  TU.LIDAR = [140, 84];
  TU.BOX = { x0: 392, x1: 452, y0: 26, y1: 116, h: 66 };
  TU.LABEL = { x0: 402, x1: 442, z0: 20, z1: 50 };
  TU.BAR = [212, 84, TU.H + 5];
  TU.LENS = [70, 46, TU.H + 13];
  function tuProject(x, y, z) {
    const k = 0.95, ox = 74, oy = 300;
    return [ox + k * (0.94 * x + 0.5 * y), oy + k * (0.17 * x - 0.3 * y - z)];
  }
  const f1 = (n) => n.toFixed(1);
  const tuPts = (list) => list.map((p) => tuProject(...p).map(f1).join(",")).join(" ");

  let unitCount = 0;
  function unitSVG() {
    const id = "u" + unitCount++;
    const { L, D, H, g, FZ, SX, SEAM, BOX, LABEL } = TU;
    const P = tuProject, pts = tuPts;
    const E = "rgba(20,23,28,.32)";
    const poly = (p, fill, extra = "") => `<polygon points="${pts(p)}" fill="${fill}" stroke="${E}" stroke-width="1.2" stroke-linejoin="round" ${extra}/>`;

    // sampled circles
    const ring = (cx, cy, cz, r, plane, n = 36) =>
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r;
        return plane === "z" ? [cx + c, cy + s, cz] : [cx + c, cy, cz + s];
      });
    // vertical cylinder: visible side band + top cap
    function cylZ(cx, cy, z0, r, h, side, top, cls = "") {
      const b = ring(cx, cy, z0, r, "z").map((p) => P(...p));
      const t = ring(cx, cy, z0 + h, r, "z").map((p) => P(...p));
      let iMin = 0, iMax = 0, iLow = 0;
      b.forEach((p, i) => { if (p[0] < b[iMin][0]) iMin = i; if (p[0] > b[iMax][0]) iMax = i; if (p[1] > b[iLow][1]) iLow = i; });
      const n = b.length, arc = [];
      // walk from iMin to iMax through the lowest point (the visible front)
      const forward = ((iLow - iMin + n) % n) < ((iMax - iMin + n) % n);
      for (let i = iMin; ; i = (i + (forward ? 1 : n - 1)) % n) { arc.push(i); if (i === iMax) break; }
      const sidePts = arc.map((i) => b[i]).concat(arc.slice().reverse().map((i) => t[i]));
      const s = (q) => q.map((p) => p.map(f1).join(",")).join(" ");
      return `<g class="${cls}"><polygon points="${s(sidePts)}" fill="${side}" stroke="${E}" stroke-width="1.1"/><polygon points="${s(t)}" fill="${top}" stroke="${E}" stroke-width="1.1"/></g>`;
    }
    function dome(cx, cy, r) {
      const base = cylZ(cx, cy, H, r, r * 0.35, "#b9bdc4", "#dfe2e6");
      const capC = P(cx, cy, H + r * 0.35);
      const capR = r * 0.98 * 0.98;
      return `<g>${base}
        <path d="M${f1(capC[0] - capR)} ${f1(capC[1])} A${f1(capR)} ${f1(capR * 0.95)} 0 0 1 ${f1(capC[0] + capR)} ${f1(capC[1])} Z" fill="#e3e6e9" stroke="${E}" stroke-width="1.1"/>
        <ellipse cx="${f1(capC[0] - capR * 0.32)}" cy="${f1(capC[1] - capR * 0.55)}" rx="${f1(capR * 0.26)}" ry="${f1(capR * 0.14)}" fill="#fff" opacity=".8"/>
        <circle class="part part-vision" cx="${f1(capC[0] + capR * 0.3)}" cy="${f1(capC[1] - capR * 0.35)}" r="${f1(capR * 0.22)}" fill="#5a6068"/></g>`;
    }
    function wheel(x, y, far) {
      const back = ring(x, y + 14, g, 30, "y"), front = ring(x, y - 3, g, 30, "y");
      const rim = ring(x, y - 3.5, g, 20, "y"), hub = ring(x, y - 4, g, 8, "y");
      const [hx, hy] = P(x, y - 4, g);
      return `<g>
        <polygon points="${pts(back)}" fill="${far ? "#5d636b" : "#8b9199"}"/>
        <polygon points="${pts(front)}" fill="${far ? "#80868e" : "#d3d6db"}" stroke="${E}" stroke-width="1.2"/>
        <polygon points="${pts(rim)}" fill="none" stroke="${E}" stroke-width="1"/>
        <g class="wheel-hub" style="transform-origin:${f1(hx)}px ${f1(hy)}px"><polygon points="${pts(hub)}" fill="${far ? "#6d737b" : "#bfc3c9"}" stroke="${E}" stroke-width="1"/></g>
      </g>`;
    }
    const arch = (x) => `<polygon points="${pts(ring(x, 0.5, g, 37, "y"))}" fill="#4a5058"/>`;
    const sideRect = (x, z, w, h) => poly([[x, 0, z], [x + w, 0, z], [x + w, 0, z + h], [x, 0, z + h]], "#9aa0a8");
    const endRect = (y, z, w, h) => poly([[L, y, z], [L, y + w, z], [L, y + w, z + h], [L, y, z + h]], "#8c9299");

    // package box on the floor ahead of the unit
    const B = BOX;
    const box = `
      ${poly([[B.x0, B.y0, B.h], [B.x1, B.y0, B.h], [B.x1, B.y1, B.h], [B.x0, B.y1, B.h]], "#a07f58")}
      ${poly([[B.x1, B.y0, 0], [B.x1, B.y1, 0], [B.x1, B.y1, B.h], [B.x1, B.y0, B.h]], "#6f5538")}
      ${poly([[B.x0, B.y0, 0], [B.x1, B.y0, 0], [B.x1, B.y0, B.h], [B.x0, B.y0, B.h]], "#8a6b47")}
      ${poly([[LABEL.x0, B.y0 - 0.5, LABEL.z0], [LABEL.x1, B.y0 - 0.5, LABEL.z0], [LABEL.x1, B.y0 - 0.5, LABEL.z1], [LABEL.x0, B.y0 - 0.5, LABEL.z1]], "#eceae5")}
      ${Array.from({ length: 13 }, (_, i) => { const x = LABEL.x0 + 4 + i * 2.6 + (i % 3) * 0.4, w = i % 4 === 0 ? 1.6 : 0.9; return `<polygon points="${pts([[x, B.y0 - 1, LABEL.z0 + 4], [x + w, B.y0 - 1, LABEL.z0 + 4], [x + w, B.y0 - 1, LABEL.z0 + 18], [x, B.y0 - 1, LABEL.z0 + 18]])}" fill="#16181b"/>`; }).join("")}`;

    // floor ring for the LiDAR field
    const [lcx, lcy] = TU.LIDAR, R = 265;
    const floorRing = pts(ring(lcx, lcy, 0, R, "z", 72));
    const labelBox = pts([[LABEL.x0 - 3, B.y0 - 1.5, LABEL.z0 - 3], [LABEL.x1 + 3, B.y0 - 1.5, LABEL.z0 - 3], [LABEL.x1 + 3, B.y0 - 1.5, LABEL.z1 + 3], [LABEL.x0 - 3, B.y0 - 1.5, LABEL.z1 + 3]]);
    const tagAt = P(LABEL.x0 - 3, B.y0 - 1.5, LABEL.z1 + 6);
    const flagAt = P((B.x0 + B.x1) / 2, B.y0, B.h + 26);
    const lens = P(...TU.LENS);
    const fr = [[B.x0, B.y0, 0], [B.x1, B.y0, 0], [B.x1, B.y0, B.h], [B.x0, B.y0, B.h]].map((p) => P(...p));

    return `
    <svg class="unit tu" data-tu viewBox="0 0 640 440" role="img" aria-label="Illustration of the TraceUnit-1-30x based on its CAD model: a compact boxy robot with a sloped front, LiDAR puck, two dome sensors and a sensor bar, scanning a package">
      <defs>
        <radialGradient id="${id}-shadow"><stop offset="0" style="stop-color:#000;stop-opacity:.7"/><stop offset="1" style="stop-color:#000;stop-opacity:0"/></radialGradient>
        <linearGradient id="${id}-side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:#b9bcbf"/><stop offset="1" style="stop-color:#95999e"/></linearGradient>
        <linearGradient id="${id}-end" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:#9fa3a8"/><stop offset="1" style="stop-color:#878b90"/></linearGradient>
      </defs>

      <!-- LiDAR field on the floor (behind everything) -->
      <g class="beam beam-lidar">
        <g class="tu-hits"></g>
      </g>

      <ellipse cx="${f1(P(L / 2, D / 2, 0)[0])}" cy="${f1(P(L / 2, D / 2, 0)[1] + 4)}" rx="220" ry="40" fill="url(#${id}-shadow)"/>

      <!-- package -->
      <g class="pkg">${box}
        <g class="flag"><circle cx="${f1(flagAt[0])}" cy="${f1(flagAt[1])}" r="10" fill="#ff5b1f"/><text x="${f1(flagAt[0])}" y="${f1(flagAt[1] + 4.5)}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="13" font-weight="700" fill="#0a0b0d">!</text></g>
      </g>

      <!-- far wheels -->
      ${wheel(62, D - 14, true)}${wheel(L - 62, D - 14, true)}

      <!-- body -->
      ${poly([[L, 0, g], [L, 0, FZ], [L, D, FZ], [L, D, g]], `url(#${id}-end)`)}
      ${poly([[0, 0, H], [SX, 0, H], [SX, D, H], [0, D, H]], "#c9ccd0")}
      ${poly([[SX, 0, H], [L, 0, FZ], [L, D, FZ], [SX, D, H]], "#b4b8bc")}
      ${poly([[0, 0, g], [L, 0, g], [L, 0, FZ], [SX, 0, H], [0, 0, H]], `url(#${id}-side)`)}
      <polyline points="${pts([[SEAM, 0, g + 2], [SEAM, 0, H], [SEAM, D, H]])}" fill="none" stroke="${E}" stroke-width="1"/>
      <polyline points="${pts([[3, 0, H - 4], [SX - 3, 0, H - 4]])}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1"/>
      ${sideRect(16, 128, 11, 11)}${sideRect(16, 104, 11, 18)}${sideRect(L - 36, 120, 10, 10)}
      ${endRect(24, 54, 10, 28)}${endRect(24, 88, 10, 10)}${endRect(D - 34, 54, 10, 28)}${endRect(D - 34, 88, 10, 10)}
      <circle class="led" cx="${f1(P(L, 74, 100)[0])}" cy="${f1(P(L, 74, 100)[1])}" r="2" fill="#4cc38a"/>
      <text x="0" y="0" transform="translate(${f1(P(168, 0, 72)[0])} ${f1(P(168, 0, 72)[1])}) rotate(10.2)" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="2" fill="#7c828a">TU-1-30X</text>
      ${arch(62)}${arch(L - 62)}
      ${wheel(62, 0, false)}${wheel(L - 62, 0, false)}

      <!-- roof sensors -->
      ${dome(70, 46, 15)}${dome(96, 132, 15)}
      ${cylZ(112, 70, H, 3, 10, "#9aa0a8", "#c9cdd3")}
      ${cylZ(lcx, lcy, H, 22, 16, "#c3c7ce", "#dde0e4")}
      ${cylZ(lcx, lcy, H + 7, 22.4, 4, "#4b5058", "#4b5058", "part part-lidar")}
      ${cylZ(lcx, lcy, H + 16, 9, 12, "#b7bcc3", "#e3e6e9")}
      ${poly([[190, 18, H], [212, 18, H], [212, 18, H + 5], [190, 18, H + 5]], "#b9bdc4")}
      ${poly([[212, 18, H], [212, 150, H], [212, 150, H + 5], [212, 18, H + 5]], "#a7acb4")}
      ${poly([[190, 18, H + 5], [212, 18, H + 5], [212, 150, H + 5], [190, 150, H + 5]], "#eceef0")}
      <polygon class="part part-barcode" points="${pts([[207, 24, H + 5.3], [210.5, 24, H + 5.3], [210.5, 144, H + 5.3], [207, 144, H + 5.3]])}" fill="#5a6068"/>

      <!-- camera frustum (in front of the body) -->
      <g class="beam beam-vision">
        <polygon points="${fr.map((p) => p.map(f1).join(",")).join(" ")}" fill="none" stroke="rgba(200,215,225,.35)" stroke-width="1" stroke-dasharray="3 4"/>
        ${fr.map((p) => `<line x1="${f1(lens[0])}" y1="${f1(lens[1])}" x2="${f1(p[0])}" y2="${f1(p[1])}" stroke="rgba(200,215,225,.28)" stroke-width="1" stroke-dasharray="3 4"/>`).join("")}
        <polygon points="${labelBox}" fill="none" stroke="#3ddc84" stroke-width="1.6"/>
        <rect x="${f1(tagAt[0])}" y="${f1(tagAt[1] - 12)}" width="88" height="12" fill="#3ddc84"/>
        <text x="${f1(tagAt[0] + 3)}" y="${f1(tagAt[1] - 3)}" font-family="IBM Plex Mono, monospace" font-size="8" font-weight="600" fill="#0a0b0d">HU_TARGET · READ</text>
      </g>

      <!-- barcode laser (in front) -->
      <g class="beam beam-barcode">
        <polygon class="tu-laser-fan" points="" fill="rgba(255,60,40,.05)"/>
        <line class="tu-laser" x1="0" y1="0" x2="0" y2="0" stroke="#ff2a1a" stroke-width="1.1" opacity=".9"/>
      </g>
      <g font-family="IBM Plex Mono, monospace" font-size="10" letter-spacing="1.5">
        <rect x="18" y="404" width="236" height="20" rx="4" fill="rgba(10,11,13,.7)" stroke="rgba(255,255,255,.14)"/>
        <text x="28" y="418" fill="#9a9fa7">PROTOTYPE · DESIGN NOT FINAL</text>
      </g>
    </svg>`;
  }

  /* Drive the TraceUnit's animated layers: LiDAR sweep + hits, laser scan */
  function animateUnits() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const units = [...document.querySelectorAll("svg[data-tu]")];
    if (!units.length) return;
    const { BOX: B, LABEL: Lb } = TU;
    const [cx, cy] = TU.LIDAR, R = 265;
    const P = tuProject;
    // hit points: package edges + a ring of "walls"
    const hits3d = [];
    for (let i = 0; i <= 6; i++) hits3d.push([B.x0, B.y0, (B.h * i) / 6], [B.x1, B.y0, (B.h * i) / 6], [B.x0 + ((B.x1 - B.x0) * i) / 6, B.y0, B.h]);
    for (let i = 0; i < 18; i++) { const a = -0.55 + (i / 17) * 1.1; const r = R * (0.92 + ((i * 13) % 7) / 100); hits3d.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0]); }
    const hitAng = hits3d.map(([x, y]) => Math.atan2(y - cy, x - cx));
    units.forEach((svg) => {
      const g = svg.querySelector(".tu-hits");
      g.innerHTML = hits3d.map((p) => { const [x, y] = P(...p); return `<circle cx="${f1(x)}" cy="${f1(y)}" r="1.6" fill="#8fd4e8" opacity="0"/>`; }).join("");
      svg._hitEls = [...g.children];
      svg._last = new Array(hits3d.length).fill(-9);
    });
    const visible = new Set();
    const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))));
    units.forEach((u) => io.observe(u));

    function frame(now) {
      const t = now / 1000;
      const th = (t * 1.6) % (Math.PI * 2);
      // sweep wedge on the floor
      const wedge = [P(cx, cy, 0)];
      for (let i = 0; i <= 12; i++) { const a = th - 0.7 + (0.7 * i) / 12; wedge.push(P(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0)); }
      const d = "M" + wedge.map((p) => p.map(f1).join(" ")).join(" L") + " Z";
      const edge = P(cx + Math.cos(th) * R, cy + Math.sin(th) * R, 0), c0 = P(cx, cy, 0);
      // laser scanning up and down the label
      const z = Lb.z0 + 3 + ((Math.sin(t * 3.2) + 1) / 2) * (Lb.z1 - Lb.z0 - 6);
      const bar = P(...TU.BAR), l0 = P(Lb.x0, B.y0 - 1.5, z), l1 = P(Lb.x1, B.y0 - 1.5, z);
      const fan = [bar, l0, l1].map((p) => p.map(f1).join(",")).join(" ");
      visible.forEach((svg) => {
        svg.querySelector(".tu-laser-fan").setAttribute("points", fan);
        const ln = svg.querySelector(".tu-laser");
        ln.setAttribute("x1", f1(l0[0])); ln.setAttribute("y1", f1(l0[1])); ln.setAttribute("x2", f1(l1[0])); ln.setAttribute("y2", f1(l1[1]));
        svg._hitEls.forEach((h, i) => {
          const diff = (th - hitAng[i] + Math.PI * 4) % (Math.PI * 2);
          if (diff < 0.08) svg._last[i] = t;
          const o = 0.75 * Math.max(0, 1 - (t - svg._last[i]) / 1.4);
          h.setAttribute("opacity", o.toFixed(2));
        });
      });
      if (!reduce) requestAnimationFrame(frame);
    }
    if (reduce) { units.forEach((u) => visible.add(u)); frame(2400); return; }
    requestAnimationFrame(frame);
  }

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
  document.querySelectorAll('[data-include="unit"]').forEach((el) => {
    const live = el.hasAttribute("data-live");
    el.outerHTML = unitSVG().replace('class="unit tu"', live ? 'class="unit tu is-live"' : 'class="unit tu"');
  });
  animateUnits();
})();
