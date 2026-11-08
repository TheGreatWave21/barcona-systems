/* ==========================================================
   BARCONA AI result demo: simplified illustration with fictional labels and IDs.
   ========================================================== */
(function () {
  const hosts = document.querySelectorAll('[data-include="detect"]');
  if (!hosts.length) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Seeded bars so every barcode looks the same on each load
  function bars(x, y, w, h, seed, vertical) {
    let s = seed, out = "", pos = 0;
    const len = vertical ? h : w;
    while (pos < len - 2) {
      s = (s * 9301 + 49297) % 233280;
      const bw = 0.8 + (s % 4) * 0.55;
      s = (s * 9301 + 49297) % 233280;
      const gap = 0.7 + (s % 3) * 0.6;
      out += vertical
        ? `<rect x="${x}" y="${(y + pos).toFixed(1)}" width="${w}" height="${bw.toFixed(1)}"/>`
        : `<rect x="${(x + pos).toFixed(1)}" y="${y}" width="${bw.toFixed(1)}" height="${h}"/>`;
      pos += bw + gap;
    }
    return `<g fill="#15171a">${out}</g>`;
  }
  const lines = (x, y, n, w) => Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y + i * 7}" width="${w * (0.55 + ((i * 37) % 40) / 100)}" height="2.4" rx="1" fill="#9a9c9f"/>`).join("");
  const label = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#e8e7e3"/><rect x="${x + 8}" y="${y + 9}" width="26" height="6" rx="1" fill="#3b3d41"/>${lines(x + 8, y + 24, 5, w * 0.32)}${lines(x + w * 0.52, y + 12, 4, w * 0.3)}`;

  // Detections: [id, kind, x, y, w, h, tag, vertical]
  // Every barcode in the scene is detected; only the five TARGETs are packages
  // that get read. Text and numbers on labels are never boxed: the system
  // reads the barcode, not the printed digits.
  const D = [
    ["TARGET_1", "ok", 204, 168, 68, 30, "READ"],
    ["TARGET_2", "ok", 378, 148, 70, 30, "READ"],
    ["X1", "nt", 543, 128, 12, 60, "", true],
    ["X2", "nt", 178, 230, 50, 12, ""],
    ["X3", "nt", 178, 250, 50, 12, ""],
    ["TARGET_3", "ok", 290, 340, 76, 30, "READ"],
    ["X4", "nt", 484, 312, 12, 58, "", true],
    ["X7", "nt", 2, 468, 14, 64, "", true],
    ["TARGET_4", "ok", 146, 552, 70, 28, "READ"],
    ["X5", "nt", 318, 520, 12, 58, "", true],
    ["TARGET_5", "bad", 446, 478, 28, 72, "CHECK", true],
    ["SHELF_2", "shelf", 336, 638, 128, 24, "SHELF"],
  ];

  // Excel rows the pipeline writes (same columns as the real output)
  const ROWS = [
    ["Package 1", "40004218360", "A04-02", "READ"],
    ["Package 2", "40004218377", "A04-02", "READ"],
    ["Package 3", "40004295512", "A04-02", "READ"],
    ["Package 4", "40004295529", "A04-02", "READ"],
    ["Package 5", "", "A04-02", "CHECK"],
  ];

  const COLORS = { ok: "#3ddc84", nt: "#59606b", bad: "#ff4d4d", shelf: "#4fb3ff" };

  function svg() {
    const box = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="rgba(0,0,0,.35)"/>`;
    const card = "#8c6c48", white = "#cfcfcc";
    const dets = D.map(([id, kind, x, y, w, h, tag], i) => {
      const c = COLORS[kind];
      const tw = Math.max(w, tag.length * 5.6 + 8);
      // Shelf tag goes below the barcode so it doesn't cover the location text
      const ty = kind === "shelf" || y - 13 < 2 ? y + h + 4 : y - 13;
      return `<g class="dd-det" style="--i:${i}">
        <rect x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" fill="none" stroke="${c}" stroke-width="2"${kind === "nt" ? ' stroke-dasharray="4 2.5"' : ""}/>
        <rect x="${x - 3}" y="${ty}" width="${tag ? tw : 0}" height="12" fill="${c}"/>
        <text x="${x}" y="${ty + 9}" font-family="IBM Plex Mono, monospace" font-size="8.5" font-weight="600" fill="#0a0b0d">${tag}</text>
      </g>`;
    }).join("");
    const tgt = D.filter((d) => d[0].startsWith("TARGET"));
    const shelf = D.find((d) => d[0] === "SHELF_2");
    const sx = shelf[2] + shelf[4] / 2, sy = 604; // top edge of the shelf label
    const rels = tgt.map(([, , x, y, w, h], i) => {
      const cx = x + w / 2, cy = y + h / 2;
      const len = Math.hypot(sx - cx, sy - cy);
      return `<g class="dd-rel" style="--i:${i};--len:${len.toFixed(0)}"><line x1="${cx}" y1="${cy}" x2="${sx}" y2="${sy}" stroke="#4fb3ff" stroke-width="2" stroke-dasharray="${len.toFixed(0)}" stroke-dashoffset="${len.toFixed(0)}"/><circle cx="${cx}" cy="${cy}" r="3" fill="#ff4d4d"/></g>`;
    }).join("");

    return `
    <svg class="dd-svg" viewBox="0 0 800 680" role="img" aria-label="Simplified illustration of a BARCONA AI result: packages on a warehouse shelf with read barcodes linked to the shelf">
      <rect width="800" height="680" fill="#1b1a17"/>
      <!-- back of rack -->
      <rect x="580" y="40" width="110" height="640" fill="#24231f"/>
      <g fill="#2e2d29">${Array.from({ length: 8 }, (_, i) => `<rect x="592" y="${60 + i * 16}" width="90" height="2"/>`).join("")}</g>
      <rect x="586" y="300" width="100" height="70" fill="#2b2a26"/>
      <rect x="586" y="410" width="100" height="10" fill="#c4501d"/><rect x="586" y="455" width="100" height="10" fill="#c4501d"/>
      <!-- beams & upright -->
      <rect x="0" y="0" width="720" height="26" fill="#d9561d"/>
      <rect x="580" y="318" width="120" height="26" fill="#d9561d"/>
      <rect x="676" y="326" width="30" height="14" rx="1" fill="#e8e7e3"/><text x="691" y="337" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="8" fill="#333">402</text>
      <polygon points="700,0 745,0 745,680 700,680" fill="#24448c"/>
      <polygon points="640,170 700,100 700,140 600,600 580,600" fill="#1d3a7a"/>
      <g fill="#0e1a36">${Array.from({ length: 14 }, (_, i) => `<rect x="716" y="${30 + i * 48}" width="10" height="20" rx="3"/>`).join("")}</g>
      <!-- boxes -->
      ${box(0, 262, 166, 152, card)}${box(0, 414, 112, 186, card)}
      ${box(186, 28, 150, 182, white)}${box(345, 28, 240, 186, white)}
      ${box(166, 210, 414, 232, card)}
      ${box(108, 446, 264, 154, card)}${box(372, 446, 240, 154, card)}
      <rect x="336" y="210" width="62" height="60" fill="#7fb8e0" opacity=".85"/><rect x="336" y="382" width="62" height="60" fill="#7fb8e0" opacity=".85"/>
      <!-- labels -->
      ${label(194, 96, 134, 108)}${label(370, 60, 190, 136)}${label(282, 248, 214, 126)}${label(134, 474, 196, 112)}
      <rect x="436" y="468" width="122" height="132" rx="2" fill="#e8e7e3"/>${lines(482, 488, 8, 50)}
      <rect x="172" y="218" width="62" height="62" rx="2" fill="#e8e7e3"/>
      <rect x="0" y="424" width="20" height="120" fill="#e8e7e3"/>
      ${bars(206, 170, 64, 26, 3)}${bars(380, 150, 66, 26, 5)}${bars(545, 130, 8, 56, 7, true)}
      ${bars(180, 232, 46, 8, 13)}${bars(180, 252, 46, 8, 17)}${bars(292, 342, 72, 26, 19)}
      ${bars(486, 314, 8, 54, 23, true)}${bars(148, 554, 66, 24, 29)}${bars(320, 522, 8, 54, 31, true)}
      ${bars(448, 480, 24, 68, 37, true)}${bars(4, 470, 10, 60, 41, true)}
      <!-- shelf beam with location label (in front, boxes stand on it) -->
      <rect x="0" y="600" width="745" height="80" fill="#d9561d"/>
      <rect x="0" y="600" width="745" height="5" fill="#f07a3a"/>
      <rect x="0" y="672" width="745" height="8" fill="#a8400f"/>
      <rect x="0" y="596" width="745" height="4" fill="#000" opacity=".35"/>
      <g fill="#8f3a12">${[40, 110, 560, 630].map((x) => `<rect x="${x}" y="634" width="14" height="14" rx="7"/>`).join("")}</g>
      <rect x="322" y="606" width="156" height="62" rx="3" fill="#f2f1ec" stroke="rgba(0,0,0,.4)"/>
      <text x="400" y="629" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="16" font-weight="700" fill="#15171a">A04-02</text>
      ${bars(338, 640, 124, 20, 11)}
      <!-- scan sweep -->
      <rect class="dd-sweep" x="0" y="0" width="800" height="3" fill="#7fe3ff"/>
      ${rels}
      ${dets}
    </svg>`;
  }

  function table() {
    return `<table class="dd-table"><thead><tr><th>Item</th><th>Barcode</th><th>Location</th><th>Status</th></tr></thead><tbody>${ROWS.map(
      (r, i) => `<tr style="--i:${i}"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="st-${r[3].toLowerCase()}">${r[3]}</td></tr>`
    ).join("")}</tbody></table>`;
  }

  hosts.forEach((host) => {
    const el = document.createElement("div");
    el.className = "dd";
    el.innerHTML = `
      <div class="dd-stage">
        <span class="hud-label hud-label--tl"><span class="rec"></span>BARCONA AI · Output</span>
        <span class="hud-label hud-label--tr dd-phase" aria-live="off">Scanning</span>
        ${svg()}
      </div>
      <div class="dd-side">
        <div class="dd-legend">
          <span><i style="background:${COLORS.ok}"></i>Read</span>
          <span><i style="background:${COLORS.nt}"></i>Not relevant</span>
          <span><i style="background:${COLORS.bad}"></i>Needs a check</span>
          <span><i style="background:#4fb3ff"></i>Linked to shelf</span>
        </div>
        <div class="dd-excel"><div class="dd-excel-head">results.xlsx</div>${table()}</div>
      </div>`;
    host.replaceWith(el);

    const phase = el.querySelector(".dd-phase");
    const steps = [
      ["is-sweep", "Scanning", 0],
      ["is-det", "Scanning", 1300],
      ["is-rel", "Linking to shelf", 4200],
      ["is-rows", "Result", 6000],
    ];
    let timers = [];
    function play() {
      timers.forEach(clearTimeout); timers = [];
      el.classList.remove("is-sweep", "is-det", "is-rel", "is-rows");
      void el.offsetWidth;
      steps.forEach(([cls, text, t]) => timers.push(setTimeout(() => { el.classList.add(cls); phase.textContent = text; }, t)));
      timers.push(setTimeout(play, 14000));
    }
    if (reduce) { el.classList.add("is-det", "is-rel", "is-rows"); phase.textContent = "Result"; return; }
    let started = false;
    new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting && !started) { started = true; play(); }
      else if (!e.isIntersecting && started) { started = false; timers.forEach(clearTimeout); }
    }), { threshold: 0.35 }).observe(el);
  });
})();
