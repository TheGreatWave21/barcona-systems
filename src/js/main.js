/* ==========================================================
   Interactions: header, mobile nav, scroll reveals,
   "how it works" scene, HUD readouts, forms.
   ========================================================== */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header state + mobile menu */
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const onScroll = () => header && header.classList.toggle("is-scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  if (toggle) {
    toggle.addEventListener("click", () => {
      const open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
    });
    document.querySelectorAll(".nav a").forEach((a) =>
      a.addEventListener("click", () => {
        header.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "Menu";
      })
    );
  }

  /* Scroll reveal */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }),
      { rootMargin: "0px 0px -10% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  /* "How it works" sticky scene */
  const scene = document.querySelector("[data-scene]");
  if (scene) {
    const figure = scene.querySelector(".scene-figure");
    const steps = [...scene.querySelectorAll("[data-step]")];
    const dots = [...scene.querySelectorAll(".scene-progress i")];
    const label = scene.querySelector("[data-scene-label]");
    const setActive = (step) => {
      const key = step.dataset.step;
      figure.dataset.active = key;
      steps.forEach((s) => s.classList.toggle("is-active", s === step));
      const i = steps.indexOf(step);
      dots.forEach((d, j) => d.classList.toggle("on", j <= i));
      if (label) label.textContent = step.dataset.label || key;
    };
    setActive(steps[0]);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target)),
      { rootMargin: "-45% 0px -45% 0px" }
    );
    steps.forEach((s) => io.observe(s));
  }

  /* Flickering HUD readouts */
  const readouts = document.querySelectorAll("[data-readout]");
  if (readouts.length && !reduce) {
    setInterval(() => {
      readouts.forEach((el) => {
        const [min, max, dec] = el.dataset.readout.split(",").map(Number);
        el.textContent = (min + Math.random() * (max - min)).toFixed(dec || 0);
      });
    }, 900);
  }

  /* Forms: no backend yet, so they open the visitor's mail app with everything pre-filled.
     To use a form service later, set data-endpoint="https://..." on the form. */
  document.querySelectorAll("form[data-mailto]").forEach((form) => {
    const status = form.querySelector(".form-status");
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const endpoint = form.dataset.endpoint;
      if (endpoint) {
        try {
          const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error();
          form.reset();
          if (status) status.textContent = "→ Thanks! We'll get back to you within two working days.";
          return;
        } catch (_) {
          if (status) status.textContent = "→ Something went wrong. Please email info@barconasystems.de directly.";
          return;
        }
      }
      const subject = form.dataset.subject || "Website enquiry";
      const body = [...data.entries()].filter(([k]) => k !== "consent").map(([k, v]) => `${k}: ${v}`).join("\n");
      window.location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if (status) status.textContent = "→ Your email app should open with the message ready to send.";
    });
  });

  /* Footer year */
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
