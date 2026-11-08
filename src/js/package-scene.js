/* ==========================================================
   "How it works" scene: no robot, just a package moving through
   the four steps. Each sensor looks from the angle it really uses:
   - Scan: barcode scanner in front of the label
   - Recognise: camera looking down from above
   - Map: LiDAR scanning a flat plane at floor level
   - Flag: package on the wrong slot, flagged, then moved to the right one
   The active step comes from data-active on .scene-figure (main.js).
   ========================================================== */
(function () {
  const host = document.querySelector("[data-package-scene]");
  if (!host) return;
  const figure = host.closest(".scene-figure");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const C = {
    floor: "#14171c", grid: "rgba(255,255,255,.05)", rack: "#d9561d", rackDim: "#7a3a1c",
    box: ["#b08a5c", "#8c6c48", "#6f5538"], label: "#ecebe6", ink: "#15171a",
    laser: "#ff4d4d", cam: "#7fe3ff", lidar: "#6ee7a8", bad: "#ff4d4d", ok: "#3ddc84",
    text: "#9a9fa7", mono: "IBM Plex Mono, monospace",
  };

  /* ---- isometric projection (world units ≈ 0.5 m) ---- */
  const K = 30, OX = 300, OY = 96;
  const P = (x, y, z) => [OX + (x - y) * 0.866 * K, OY + (x + y) * 0.5 * K - z * K];
  const pts = (list) => list.map((p) => P(...p).map((n) => n.toFixed(1)).join(",")).join(" ");
  const poly = (list, fill, extra = "") => `<polygon points="${pts(list)}" fill="${fill}" ${extra}/>`;
  const line = (a, b, stroke, extra = "") => { const [x1, y1] = P(...a), [x2, y2] = P(...b); return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" ${extra}/>`; };
  const text = (x, y, s, fill, size = 10, weight = 600, anchor = "start") => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${fill}" font-family="${C.mono}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${s}</text>`;
  function tag(x, y, s, color) {
    const w = s.length * 6.4 + 12;
    return `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - 12).toFixed(1)}" width="${w.toFixed(1)}" height="17" rx="2" fill="rgba(10,11,13,.88)" stroke="${color}"/>${text(x, y + 1, s, color, 10, 600, "middle")}`;
  }

  /* ---- world ---- */
  const FLOOR = { w: 10, d: 8 };
  const RACK = { x0: 4, x1: 9.4, y0: 0, y1: 1.4, levels: [0.1, 1.7, 3.3], top: 4.7 };
  const BAYS = [[4.15, 5.85], [5.85, 7.55], [7.55, 9.25]];
  const PKG = { w: 1.25, d: 1.0, h: 0.95 };
  const slot = (bay, level) => ({ x: BAYS[bay][0] + 0.22, y: 0.25, z: RACK.levels[level] + 0.06 });
  const STATIC = [ // other packages already on the rack
    { ...slot(0, 0), w: 1.3, d: 1.0, h: 1.1 }, { ...slot(2, 0), w: 1.2, d: 1.0, h: 0.9 },
    { ...slot(1, 1), w: 1.3, d: 1.0, h: 1.0 }, { ...slot(1, 2), w: 1.1, d: 1.0, h: 0.8 },
    { ...slot(2, 2), w: 1.3, d: 1.0, h: 1.05 },
  ];
  const WRONG = slot(0, 1), RIGHT = slot(2, 1);
  const STATION = {
    scan: { x: 1.4, y: 5.2, z: 0 },
    recognise: { x: 4.6, y: 4.4, z: 0 },
    map: { x: 4.6, y: 4.4, z: 0 },
  };
  const SCANNER = [1.95, 7.6, 0.9];
  const CAMERA = [7.8, 7.0, 6.2];
  const LIDAR = [0.9, 2.6, 0.3];

  /* ---- geometry helpers ---- */
  function box(b, shade = 1, stroke = "rgba(0,0,0,.35)") {
    const { x, y, z, w, d, h } = b, X1 = x + w, Y1 = y + d, Z1 = z + h;
    const s = `stroke="${stroke}" stroke-width="1" stroke-linejoin="round"`;
    const f = (c) => shade === 1 ? c : `color-mix(in srgb, ${c} ${Math.round(shade * 100)}%, #0a0b0d)`;
    return poly([[x, Y1, z], [X1, Y1, z], [X1, Y1, Z1], [x, Y1, Z1]], f(C.box[1]), s) + // front-left face
      poly([[X1, y, z], [X1, Y1, z], [X1, Y1, Z1], [X1, y, Z1]], f(C.box[2]), s) +      // front-right face
      poly([[x, y, Z1], [X1, y, Z1], [X1, Y1, Z1], [x, Y1, Z1]], f(C.box[0]), s) +      // top
      poly([[x + 0.12, Y1, Z1], [X1 - 0.12, Y1, Z1], [X1 - 0.12, Y1 - 0.04, Z1], [x + 0.12, Y1 - 0.04, Z1]], "rgba(0,0,0,.12)"); // tape
  }
  // shipping label with barcode on the front-left face
  function label(b, torn = false) {
    const { x, y, z, w, d, h } = b, Y1 = y + d + 0.001;
    const lx0 = x + 0.18, lx1 = x + Math.min(w - 0.15, 0.95), lz0 = z + 0.2, lz1 = z + Math.min(h - 0.12, 0.62);
    let out = poly([[lx0, Y1, lz0], [lx1, Y1, lz0], [lx1, Y1, lz1], [lx0, Y1, lz1]], C.label, 'stroke="rgba(0,0,0,.25)"');
    let bx = lx0 + 0.06, i = 0;
    while (bx < lx1 - 0.08) {
      const bw = 0.012 + ((i * 7) % 4) * 0.01;
      out += poly([[bx, Y1, lz0 + 0.06], [bx + bw, Y1, lz0 + 0.06], [bx + bw, Y1, lz1 - 0.14], [bx, Y1, lz1 - 0.14]], C.ink);
      bx += bw + 0.018 + ((i * 3) % 3) * 0.01; i++;
    }
    out += poly([[lx0 + 0.06, Y1, lz1 - 0.1], [lx0 + 0.4, Y1, lz1 - 0.1], [lx0 + 0.4, Y1, lz1 - 0.06], [lx0 + 0.06, Y1, lz1 - 0.06]], "#3b3d41");
    if (torn) out += poly([[lx1 - 0.3, Y1, lz0], [lx1, Y1, lz0], [lx1, Y1, lz1 - 0.05], [lx1 - 0.12, Y1, lz0 + 0.18]], C.box[1]);
    return { svg: out, lx0, lx1, lz0, lz1, Y1 };
  }
  function screenBounds(b) {
    const c = [];
    for (const X of [b.x, b.x + b.w]) for (const Y of [b.y, b.y + b.d]) for (const Z of [b.z, b.z + b.h]) c.push(P(X, Y, Z));
    const xs = c.map((p) => p[0]), ys = c.map((p) => p[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }
  function brackets(r, color, pad = 6, len = 10) {
    const x0 = r.x0 - pad, x1 = r.x1 + pad, y0 = r.y0 - pad, y1 = r.y1 + pad;
    const d = `M${x0},${y0 + len}V${y0}H${x0 + len} M${x1 - len},${y0}H${x1}V${y0 + len} M${x1},${y1 - len}V${y1}H${x1 - len} M${x0 + len},${y1}H${x0}V${y1 - len}`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2"/>`;
  }
  // 2D ray against axis-aligned rectangles in the floor plane
  function rayHit(ox, oy, a, rects) {
    const dx = Math.cos(a), dy = Math.sin(a);
    let best = 12;
    for (const r of rects) {
      let t0 = -Infinity, t1 = Infinity, ok = true;
      for (const [o, d, lo, hi] of [[ox, dx, r[0], r[2]], [oy, dy, r[1], r[3]]]) {
        if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) ok = false; continue; }
        let u0 = (lo - o) / d, u1 = (hi - o) / d; if (u0 > u1) [u0, u1] = [u1, u0];
        t0 = Math.max(t0, u0); t1 = Math.min(t1, u1);
      }
      if (!ok || t0 > t1) continue;
      const hit = r[4] ? t1 : t0; // r[4]: inside the room walls
      if (hit > 0.01 && hit < best) best = hit;
    }
    return best;
  }

  /* ---- static layers ---- */
  function floorSVG() {
    let g = poly([[0, 0, 0], [FLOOR.w, 0, 0], [FLOOR.w, FLOOR.d, 0], [0, FLOOR.d, 0]], C.floor, 'stroke="rgba(255,255,255,.14)"');
    for (let i = 1; i < FLOOR.w; i++) g += line([i, 0, 0], [i, FLOOR.d, 0], C.grid);
    for (let j = 1; j < FLOOR.d; j++) g += line([0, j, 0], [FLOOR.w, j, 0], C.grid);
    // aisle marking
    g += poly([[0.2, 6.9, 0], [9.8, 6.9, 0], [9.8, 7.0, 0], [0.2, 7.0, 0]], "rgba(255,196,61,.35)");
    return g;
  }
  function rackBack() {
    const { x0, x1, y0, y1, levels, top } = RACK;
    let g = "";
    for (const z of levels) g += poly([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], "rgba(255,255,255,.06)", 'stroke="rgba(255,255,255,.1)"');
    for (const x of [x0, x1]) g += line([x, y0, 0], [x, y0, top], C.rackDim, 'stroke-width="3"');
    for (const z of levels.slice(1).concat(top)) g += line([x0, y0, z], [x1, y0, z], C.rackDim, 'stroke-width="2.5"');
    return g;
  }
  function rackFront(hl) {
    const { x0, x1, y1, levels, top } = RACK;
    let g = "";
    for (const x of [x0, x1]) g += line([x, y1, 0], [x, y1, top], C.rack, 'stroke-width="3.5"');
    for (const z of levels.slice(1).concat(top)) g += line([x0, y1, z], [x1, y1, z], C.rack, 'stroke-width="3"');
    for (const x of [BAYS[1][0], BAYS[2][0]]) g += line([x, y1, levels[1]], [x, y1, top], C.rack, 'stroke-width="1.5" opacity=".6"');
    // slot labels on the beam: A04-01 … A04-03 (level 2)
    BAYS.forEach(([a], i) => {
      const [sx, sy] = P(a + 0.25, y1, levels[1] - 0.05);
      const on = hl && hl.bay === i;
      g += `<rect x="${(sx - 2).toFixed(1)}" y="${(sy - 1).toFixed(1)}" width="42" height="12" fill="${on ? hl.color : C.label}" transform="skewY(30) translate(0 ${(-sx * Math.tan(Math.PI / 6)).toFixed(1)})"/>`;
      g += `<text x="${(sx + 19).toFixed(1)}" y="${(sy + 8.5).toFixed(1)}" fill="${C.ink}" font-family="${C.mono}" font-size="8" font-weight="700" text-anchor="middle" transform="skewY(30) translate(0 ${(-sx * Math.tan(Math.PI / 6)).toFixed(1)})">A04-0${i + 1}</text>`;
    });
    return g;
  }

  /* ---- devices ---- */
  function scanner(active) {
    const [x, y, z] = SCANNER;
    const o = active ? 1 : 0.3;
    return `<g opacity="${o}">${line([x, y, 0], [x, y, z - 0.15], "#3a3d42", 'stroke-width="4"')}
      ${poly([[x - 0.3, y, z - 0.15], [x + 0.3, y, z - 0.15], [x + 0.3, y, z + 0.25], [x - 0.3, y, z + 0.25]], "#2a2d33", 'stroke="#0a0b0d"')}
      ${poly([[x - 0.18, y - 0.001, z], [x + 0.18, y - 0.001, z], [x + 0.18, y - 0.001, z + 0.1], [x - 0.18, y - 0.001, z + 0.1]], C.laser)}
      ${(() => { const [sx, sy] = P(x, y, z); return text(sx, sy + 34, "BARCODE SCANNER", active ? C.laser : C.text, 9.5, 600, "middle"); })()}</g>`;
  }
  function camera(active) {
    const [x, y, z] = CAMERA;
    const [sx, sy] = P(x, y, z);
    const o = active ? 1 : 0.3;
    return `<g opacity="${o}"><line x1="${sx.toFixed(1)}" y1="0" x2="${sx.toFixed(1)}" y2="${(sy - 8).toFixed(1)}" stroke="#3a3d42" stroke-width="3"/>
      <rect x="${(sx - 13).toFixed(1)}" y="${(sy - 9).toFixed(1)}" width="26" height="15" rx="3" fill="${C.cam}" stroke="#0a0b0d"/>
      <circle cx="${(sx - 4).toFixed(1)}" cy="${(sy + 6).toFixed(1)}" r="4" fill="#0a0b0d"/>
      ${text(sx + 18, sy + 1, "CAMERA", active ? C.cam : C.text, 9.5)}</g>`;
  }
  function lidar(active) {
    const [x, y, z] = LIDAR;
    const [sx, sy] = P(x, y, z);
    const o = active ? 1 : 0.3;
    return `<g opacity="${o}"><ellipse cx="${sx.toFixed(1)}" cy="${(sy + 6).toFixed(1)}" rx="11" ry="5" fill="#1f5c43"/>
      <rect x="${(sx - 11).toFixed(1)}" y="${(sy - 4).toFixed(1)}" width="22" height="10" fill="#1f5c43"/>
      <ellipse cx="${sx.toFixed(1)}" cy="${(sy - 4).toFixed(1)}" rx="11" ry="5" fill="${C.lidar}"/>
      ${text(sx, sy - 14, "LiDAR", active ? C.lidar : C.text, 9.5, 600, "middle")}</g>`;
  }

  /* ---- state ---- */
  const pkg = { ...STATION.scan, x: -1.5 };
  let key = "scan", stepT = 0, last = 0;
  function targetFor(k, t) {
    if (k === "flag") return t < 3.2 ? WRONG : RIGHT;
    return STATION[k] || STATION.scan;
  }

  function render(t) {
    const target = targetFor(key, stepT);
    const b = { ...pkg, ...PKG };
    const settled = Math.hypot(target.x - pkg.x, target.y - pkg.y, target.z - pkg.z) < 0.05;
    let under = "", over = "";

    // step-specific sensor layers
    if (key === "map") {
      const [lx, ly, lz] = LIDAR;
      const rects = [[b.x, b.y, b.x + b.w, b.y + b.d], [RACK.x0, RACK.y0, RACK.x1, RACK.y1], [0, 0, FLOOR.w, FLOOR.d, true]];
      const spin = t * 1.8;
      for (let i = 0; i < 90; i++) {
        const a = (i / 90) * Math.PI * 2, d = rayHit(lx, ly, a, rects);
        const hx = lx + Math.cos(a) * d, hy = ly + Math.sin(a) * d;
        const sw = ((((a - spin) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
        const glow = sw > Math.PI * 1.7 ? (sw - Math.PI * 1.7) / (Math.PI * 0.3) : 0;
        under += line([lx, ly, lz], [hx, hy, lz], C.lidar, `stroke-width="1" opacity="${(0.06 + glow * 0.3).toFixed(2)}"`);
        const [px, py] = P(hx, hy, lz);
        under += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="1.6" fill="${C.lidar}" opacity="${(0.5 + glow * 0.5).toFixed(2)}"/>`;
      }
      if (settled) {
        under += poly([[b.x - 0.1, b.y - 0.1, 0.01], [b.x + b.w + 0.1, b.y - 0.1, 0.01], [b.x + b.w + 0.1, b.y + b.d + 0.1, 0.01], [b.x - 0.1, b.y + b.d + 0.1, 0.01]], "rgba(110,231,168,.18)", `stroke="${C.lidar}" stroke-dasharray="4 3"`);
        const [px, py] = P(b.x + b.w / 2, b.y + b.d / 2, b.h + 1.2);
        over += line([b.x + b.w / 2, b.y + b.d / 2, b.h], [b.x + b.w / 2, b.y + b.d / 2, b.h + 1.0], C.lidar, 'stroke-width="1.5"');
        over += tag(px, py, "LOCATED · AISLE A04", C.lidar);
      }
    }
    if (key === "recognise") {
      const [cx, cy] = P(...CAMERA);
      const corners = [[b.x, b.y, b.h], [b.x + b.w, b.y, b.h], [b.x + b.w, b.y + b.d, b.h], [b.x, b.y + b.d, b.h]].map((p) => P(...p));
      under += `<polygon points="${cx},${cy + 6} ${corners[0].join(",")} ${corners[3].join(",")} ${corners[2].join(",")} ${corners[1].join(",")}" fill="rgba(127,227,255,.12)" stroke="rgba(127,227,255,.55)"/>`;
    }

    // packages in depth order
    const list = STATIC.map((s) => ({ b: s, main: false })).concat([{ b, main: true }]);
    list.sort((p, q) => (p.b.x + p.b.y + p.b.z * 0.01) - (q.b.x + q.b.y + q.b.z * 0.01));
    let boxes = "";
    for (const it of list) {
      boxes += box(it.b, it.main ? 1 : 0.8);
      const lb = label(it.b, it.main && key === "recognise");
      boxes += lb.svg;
      if (it.main) it.lb = lb;
    }
    const mainLb = list.find((i) => i.main).lb;

    if (key === "scan") {
      const [sx, sy, sz] = SCANNER;
      const zz = mainLb.lz0 + 0.04 + ((Math.sin(t * 4) + 1) / 2) * (mainLb.lz1 - mainLb.lz0 - 0.08);
      const a = P(mainLb.lx0 - 0.05, mainLb.Y1, zz), c = P(mainLb.lx1 + 0.05, mainLb.Y1, zz), s0 = P(sx, sy, sz + 0.05);
      if (pkg.x > 0) {
        over += `<polygon points="${s0.join(",")} ${a.join(",")} ${c.join(",")}" fill="rgba(255,77,77,.28)" stroke="rgba(255,77,77,.5)"/>`;
        over += `<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke="${C.laser}" stroke-width="2"/>`;
      }
      if (settled && stepT > 1.4) { const r = screenBounds(b); over += brackets(r, C.ok, 5, 8) + tag((r.x0 + r.x1) / 2, r.y0 - 14, "ID READ ✓", C.ok); }
    }
    if (key === "recognise" && settled) {
      const r = screenBounds(b);
      over += brackets(r, C.cam);
      over += tag((r.x0 + r.x1) / 2, r.y0 - 16, "PACKAGE · MATCHED", C.cam);
      if (stepT > 1.2) over += text((r.x0 + r.x1) / 2, r.y1 + 22, "label damaged, still identified", C.cam, 9.5, 500, "middle");
    }
    let hl = null;
    if (key === "flag") {
      const r = screenBounds(b);
      if (stepT < 3.2) {
        hl = { bay: 0, color: C.bad };
        if (settled) {
          const blink = reduce || Math.sin(t * 6) > -0.3;
          if (blink) over += brackets(r, C.bad);
          over += tag((r.x0 + r.x1) / 2, r.y0 - 16, "WRONG SLOT", C.bad);
          // ghost outline where it belongs + arrow
          const g = { ...RIGHT, ...PKG };
          const gr = screenBounds(g);
          over += `<rect x="${gr.x0}" y="${gr.y0}" width="${gr.x1 - gr.x0}" height="${gr.y1 - gr.y0}" fill="none" stroke="${C.ok}" stroke-dasharray="5 4"/>`;
          over += tag((gr.x0 + gr.x1) / 2, gr.y0 - 16, "BELONGS HERE", C.ok);
          const ax0 = r.x1 + 10, ax1 = gr.x0 - 10, ay0 = (r.y0 + r.y1) / 2, ay1 = (gr.y0 + gr.y1) / 2;
          over += `<path d="M${ax0},${ay0} Q${(ax0 + ax1) / 2},${Math.min(ay0, ay1) - 50} ${ax1},${ay1}" fill="none" stroke="${C.ok}" stroke-width="2" stroke-dasharray="6 4"/>`;
          over += `<polygon points="${ax1},${ay1} ${ax1 - 10},${ay1 - 8} ${ax1 - 12},${ay1 + 3}" fill="${C.ok}"/>`;
        }
      } else {
        hl = { bay: 2, color: settled ? C.ok : C.label };
        if (settled) { over += brackets(r, C.ok); over += tag((r.x0 + r.x1) / 2, r.y0 - 16, "FIXED ✓", C.ok); }
      }
    }

    return `<svg viewBox="0 0 600 440" role="img" aria-label="A package moving through the four steps: barcode scan, camera recognition, LiDAR positioning and error check on the rack">
      ${floorSVG()}${rackBack()}${under}${boxes}${rackFront(hl)}
      ${scanner(key === "scan")}${lidar(key === "map")}${camera(key === "recognise")}
      ${over}
    </svg>`;
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    const k = (figure && figure.dataset.active) || "scan";
    if (k !== key) {
      if (k === "scan" && key !== "scan") Object.assign(pkg, { x: -1.5, y: STATION.scan.y, z: 0 }); // next package slides in
      key = k; stepT = 0;
    }
    stepT += dt;
    const target = targetFor(key, stepT);
    const e = reduce ? 1 : 1 - Math.exp(-dt * 3.2);
    // lift first, then slide in, when moving onto the rack
    pkg.x += (target.x - pkg.x) * e;
    pkg.y += (target.y - pkg.y) * e;
    pkg.z += (target.z - pkg.z) * (target.z > pkg.z ? Math.min(1, e * 1.6) : e);
    host.innerHTML = render(now / 1000);
  }

  if (reduce) {
    // static: redraw whenever the active step changes
    const draw = () => { key = (figure && figure.dataset.active) || "scan"; stepT = 2; Object.assign(pkg, targetFor(key, 2)); host.innerHTML = render(0); };
    draw();
    if (figure) new MutationObserver(draw).observe(figure, { attributes: true, attributeFilter: ["data-active"] });
    return;
  }
  let running = false;
  new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting && !running) {
      running = true; last = performance.now();
      requestAnimationFrame(function loop(n) { if (!running) return; tick(n); requestAnimationFrame(loop); });
    }
    else if (!e.isIntersecting) running = false;
  })).observe(host);
})();
