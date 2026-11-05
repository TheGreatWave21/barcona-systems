/* ==========================================================
   Simulation demo: a simplified example mission (illustrative only).
   ========================================================== */
(function () {
  const canvas = document.getElementById("floor-map");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Example hall ---- */
  const WORLD = { w: 18.0, h: 11.0 };
  const START = { x: 1.3, y: 1.2, a: 0 };
  const GOAL = { x: 16.2, y: 9.4 };
  const OBSTACLES = [
    { id: "rack-a1", kind: "rack", x: 4.0, y: 3.0, w: 4.8, d: 0.65 },
    { id: "rack-a2", kind: "rack", x: 4.0, y: 6.1, w: 4.8, d: 0.65 },
    { id: "rack-b1", kind: "rack", x: 10.3, y: 3.0, w: 4.8, d: 0.65 },
    { id: "rack-b2", kind: "rack", x: 10.3, y: 6.1, w: 4.8, d: 0.65 },
    { id: "pallet-01", kind: "pallet", x: 7.1, y: 8.7, w: 1.1, d: 0.9 },
    { id: "box-01", kind: "box", x: 13.5, y: 8.5, w: 0.8, d: 0.8 },
  ];
  const BARCODES = [
    { id: "BC-A1-001", x: 2.0, y: 3.42 },
    { id: "BC-A2-014", x: 5.5, y: 5.68 },
    { id: "BC-B1-006", x: 9.2, y: 3.42 },
    { id: "BC-B2-019", x: 12.0, y: 5.68 },
    { id: "BC-GOAL-001", x: 16.0, y: 8.8 },
  ];

  /* ---- Demo scan parameters (illustrative) ---- */
  const SCAN_RANGE = 3.2, SCAN_HALF = (30 * Math.PI) / 180, SCAN_RATE = 50;
  const SPEED = 1.3, TURN = Math.PI * 0.9;

  /* ---- Mission: drive the aisle, stop at each barcode, then the goal ---- */
  const MISSION = [
    { x: 1.0, y: 1.2 }, { x: 1.0, y: 4.55 },
    { x: 2.6, y: 4.55, scan: 0 }, { x: 5.0, y: 4.55, scan: 1 },
    { x: 8.6, y: 4.55, scan: 2 }, { x: 11.5, y: 4.55, scan: 3 },
    { x: 15.2, y: 4.55 }, { x: 15.2, y: 7.6, scan: 4 },
    { x: 16.2, y: 9.4, goal: true },
  ];

  const out = {
    scanned: document.querySelector('[data-map="scanned"]'),
    elapsed: document.querySelector('[data-map="elapsed"]'),
    state: document.querySelector('[data-map="state"]'),
    log: document.querySelector('[data-map="log"]'),
  };

  let bot, codes, wp, t, trail, phase, phaseT, logged;
  function reset() {
    bot = { ...START };
    codes = BARCODES.map((b) => ({ ...b, p: 0, done: false, vis: false, blocked: false }));
    wp = 0; t = 0; trail = []; phase = "drive"; phaseT = 0; logged = [];
    if (out.log) out.log.innerHTML = "";
  }

  const rect = (o) => ({ x0: o.x - o.w / 2, x1: o.x + o.w / 2, y0: o.y - o.d / 2, y1: o.y + o.d / 2 });
  function segHitsRect(ax, ay, bx, by, r) {
    // Liang–Barsky clip
    let t0 = 0, t1 = 1; const dx = bx - ax, dy = by - ay;
    const p = [-dx, dx, -dy, dy], q = [ax - r.x0, r.x1 - ax, ay - r.y0, r.y1 - ay];
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return false; }
      else { const u = q[i] / p[i]; if (p[i] < 0) { if (u > t1) return false; if (u > t0) t0 = u; } else { if (u < t0) return false; if (u < t1) t1 = u; } }
    }
    return t0 < t1 && t1 > 0.001 && t0 < 0.999;
  }
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  function scanStep(dt) {
    for (const c of codes) {
      if (c.done) { c.vis = false; continue; }
      const dx = c.x - bot.x, dy = c.y - bot.y, dist = Math.hypot(dx, dy);
      const inCone = dist <= SCAN_RANGE && Math.abs(angDiff(Math.atan2(dy, dx), bot.a)) <= SCAN_HALF;
      c.blocked = inCone && OBSTACLES.some((o) => segHitsRect(bot.x, bot.y, c.x, c.y, rect(o)));
      c.vis = inCone && !c.blocked;
      if (c.vis) {
        c.p = Math.min(100, c.p + SCAN_RATE * dt);
        if (c.p >= 100) { c.done = true; logged.push([c.id, t]); addLog(c.id, t); }
      } else c.p = Math.max(0, c.p - SCAN_RATE * dt * 0.5);
    }
  }
  function addLog(id, time) {
    if (!out.log) return;
    const li = document.createElement("li");
    li.innerHTML = `${id}<span>${time.toFixed(1)} s</span>`;
    out.log.appendChild(li);
  }

  function step(dt) {
    if (phase === "done") { phaseT += dt; if (phaseT > 3) reset(); return; }
    t += dt;
    const target = MISSION[wp];
    if (phase === "drive") {
      const dx = target.x - bot.x, dy = target.y - bot.y, dist = Math.hypot(dx, dy);
      const want = Math.atan2(dy, dx), d = angDiff(want, bot.a);
      if (dist > 0.02) {
        bot.a += Math.sign(d) * Math.min(Math.abs(d), TURN * dt);
        if (Math.abs(d) < 0.25) { const s = Math.min(dist, SPEED * dt); bot.x += Math.cos(bot.a) * s; bot.y += Math.sin(bot.a) * s; }
      } else {
        if (target.scan !== undefined) phase = "align";
        else if (target.goal) { phase = "done"; phaseT = 0; }
        else wp++;
      }
    } else if (phase === "align") {
      const c = codes[target.scan];
      const want = Math.atan2(c.y - bot.y, c.x - bot.x), d = angDiff(want, bot.a);
      bot.a += Math.sign(d) * Math.min(Math.abs(d), TURN * dt);
      if (c.done) { phase = "drive"; wp++; }
    }
    trail.push([bot.x, bot.y]); if (trail.length > 400) trail.shift();
    scanStep(dt);
  }

  /* ---- Rendering ---- */
  let W = 0, H = 0, S = 1, ox = 0, oy = 0;
  const X = (x) => ox + x * S, Y = (y) => oy + y * S;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pad = 28;
    S = Math.min((W - pad * 2) / WORLD.w, (H - pad * 2) / WORLD.h);
    ox = (W - WORLD.w * S) / 2; oy = (H - WORLD.h * S) / 2;
    if (reduce || !running) draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // 1 m grid
    ctx.lineWidth = 1;
    for (let i = 0; i <= WORLD.w; i++) { ctx.strokeStyle = i % 5 ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.08)"; ctx.beginPath(); ctx.moveTo(X(i) + 0.5, Y(0)); ctx.lineTo(X(i) + 0.5, Y(WORLD.h)); ctx.stroke(); }
    for (let j = 0; j <= WORLD.h; j++) { ctx.strokeStyle = j % 5 ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.08)"; ctx.beginPath(); ctx.moveTo(X(0), Y(j) + 0.5); ctx.lineTo(X(WORLD.w), Y(j) + 0.5); ctx.stroke(); }
    ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 2; ctx.strokeRect(X(0), Y(0), WORLD.w * S, WORLD.h * S);
    ctx.fillStyle = "#5f656e"; ctx.font = "10px 'IBM Plex Mono', monospace";
    ctx.fillText("18.0 m", X(WORLD.w) - 40, Y(0) - 8); ctx.fillText("11.0 m", X(0) + 4, Y(WORLD.h) + 16);

    // obstacles
    for (const o of OBSTACLES) {
      const r = rect(o);
      ctx.fillStyle = o.kind === "rack" ? "#1f232a" : o.kind === "pallet" ? "#3a2f22" : "#2e2a22";
      ctx.fillRect(X(r.x0), Y(r.y0), o.w * S, o.d * S);
      ctx.strokeStyle = o.kind === "rack" ? "rgba(255,91,31,.55)" : "rgba(255,255,255,.18)"; ctx.lineWidth = 1;
      ctx.strokeRect(X(r.x0) + 0.5, Y(r.y0) + 0.5, o.w * S - 1, o.d * S - 1);
      ctx.fillStyle = "#5f656e"; ctx.font = "9px 'IBM Plex Mono', monospace";
      ctx.fillText(o.id, X(r.x0) + 4, Y(r.y0) + Math.min(o.d * S - 3, 11));
    }

    // goal
    ctx.strokeStyle = "rgba(127,227,255,.6)"; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(X(GOAL.x), Y(GOAL.y), 0.35 * S, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#7fe3ff"; ctx.font = "9px 'IBM Plex Mono', monospace"; ctx.fillText("GOAL", X(GOAL.x) - 12, Y(GOAL.y) + 0.35 * S + 12);

    // trail
    ctx.strokeStyle = "rgba(255,91,31,.35)"; ctx.lineWidth = 2; ctx.setLineDash([2, 5]);
    ctx.beginPath(); trail.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke(); ctx.setLineDash([]);

    // scan cone
    const g = ctx.createRadialGradient(X(bot.x), Y(bot.y), 0, X(bot.x), Y(bot.y), SCAN_RANGE * S);
    g.addColorStop(0, "rgba(127,227,255,.22)"); g.addColorStop(1, "rgba(127,227,255,.02)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X(bot.x), Y(bot.y));
    ctx.arc(X(bot.x), Y(bot.y), SCAN_RANGE * S, bot.a - SCAN_HALF, bot.a + SCAN_HALF); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(127,227,255,.35)"; ctx.lineWidth = 1; ctx.stroke();

    // barcodes + line of sight
    for (const c of codes) {
      if (c.vis || c.blocked) {
        ctx.strokeStyle = c.vis ? "rgba(127,227,255,.9)" : "rgba(255,91,31,.9)"; ctx.setLineDash(c.vis ? [] : [4, 3]); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(X(bot.x), Y(bot.y)); ctx.lineTo(X(c.x), Y(c.y)); ctx.stroke(); ctx.setLineDash([]);
      }
      const col = c.done ? "#7fe3ff" : c.p > 0 ? "#ffc43d" : "#5f656e";
      ctx.fillStyle = col; ctx.fillRect(X(c.x) - 4, Y(c.y) - 4, 8, 8);
      if (!c.done && c.p > 0) {
        ctx.strokeStyle = "#ffc43d"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(X(c.x), Y(c.y), 9, -Math.PI / 2, -Math.PI / 2 + (c.p / 100) * Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = c.done ? "#7fe3ff" : "#9a9fa7"; ctx.font = "9px 'IBM Plex Mono', monospace";
      const below = c.y < 4; // labels go into the aisle, never onto the rack
      ctx.fillText(c.id + (c.done ? " ✓" : c.p > 0 ? ` ${Math.round(c.p)}%` : ""), X(c.x) - 26, Y(c.y) + (below ? 18 : -10));
    }

    // robot (≈0.6 × 0.45 m)
    ctx.save(); ctx.translate(X(bot.x), Y(bot.y)); ctx.rotate(bot.a);
    const rw = 0.6 * S, rh = 0.45 * S;
    ctx.fillStyle = "#ff5b1f"; ctx.shadowColor = "#ff5b1f"; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-rw / 2, -rh / 2, rw, rh, 4) : ctx.rect(-rw / 2, -rh / 2, rw, rh); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = "#0a0b0d";
    ctx.beginPath(); ctx.moveTo(rw / 2 - 2, 0); ctx.lineTo(rw / 2 - 9, -5); ctx.lineTo(rw / 2 - 9, 5); ctx.fill();
    ctx.restore();
  }

  function report() {
    const n = codes.filter((c) => c.done).length;
    if (out.scanned) out.scanned.textContent = `${n}/${codes.length}`;
    if (out.elapsed) out.elapsed.textContent = t.toFixed(1) + " s";
    if (out.state) out.state.textContent = phase === "done" ? "Goal reached" : phase === "align" ? "Scanning" : "Driving";
  }

  let running = false, last = 0, lastReport = 0;
  function loop(now) {
    if (!running) return;
    let dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    step(dt); draw();
    if (now - lastReport > 120) { report(); lastReport = now; }
    requestAnimationFrame(loop);
  }

  reset();
  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  if (reduce) {
    // static frame: mid-mission
    for (let i = 0; i < 420; i++) step(1 / 30);
    draw(); report(); return;
  }
  new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    else if (!e.isIntersecting) running = false;
  })).observe(canvas);
})();
