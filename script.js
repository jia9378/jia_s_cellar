/* ==========================================================
   Site behaviour
   0. Dateline          — prints today's date in the masthead strip
   1. Signal plot       — draws five per-finger gyro traces, animated once on load
   2. Stage index       — highlights the stage currently in view
   3. Figures, plates   — swaps placeholders for real images when they exist
   ========================================================== */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 0. Dateline ---------- */

  var today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  document.querySelectorAll("[data-today]").forEach(function (el) {
    el.textContent = "New York, " + today;
  });

  /* ---------- 1. Hero signal plot ---------- */

  var canvas = document.getElementById("signal");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var W = 1200, H = 360;              // logical size; CSS scales it
    var style = getComputedStyle(canvas.closest("[data-skin]") || document.body);
    var fingers = [
      { name: "thumb",  color: style.getPropertyValue("--finger-thumb").trim(),  peakAt: 0.14, amp: 1.6 },
      { name: "index",  color: style.getPropertyValue("--finger-index").trim(),  peakAt: 0.32, amp: 1.2 },
      { name: "middle", color: style.getPropertyValue("--finger-middle").trim(), peakAt: 0.50, amp: 1.9 },
      { name: "ring",   color: style.getPropertyValue("--finger-ring").trim(),   peakAt: 0.66, amp: 1.0 },
      { name: "pinky",  color: style.getPropertyValue("--finger-pinky").trim(),  peakAt: 0.84, amp: 1.4 }
    ];
    var ink   = style.getPropertyValue("--ink").trim();
    var muted = style.getPropertyValue("--muted").trim();
    var rule  = style.getPropertyValue("--rule").trim();

    // Deterministic noise so the plot looks the same on every load.
    function noise(seed) {
      var x = Math.sin(seed * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    }

    // One sample of one finger's trace at t in [0, 1].
    // A press is a sharp positive spike followed by a smaller negative rebound,
    // plus low-level crosstalk from the other fingers' presses.
    function sample(f, t, i) {
      var v = (noise(i * 7.1 + f.peakAt * 100) - 0.5) * 0.06;
      fingers.forEach(function (g) {
        var d = (t - g.peakAt) * 60;
        var own = g === f;
        var spike = Math.exp(-d * d) - 0.55 * Math.exp(-(d - 1.6) * (d - 1.6) / 2.2);
        v += spike * g.amp * (own ? 1 : 0.12);
      });
      return v;
    }

    var traces = fingers.map(function (f) {
      var pts = [];
      for (var i = 0; i <= W; i += 2) {
        pts.push({ x: i, y: sample(f, i / W, i) });
      }
      return pts;
    });

    var pad = { l: 36, r: 12, t: 14, b: 26 };
    var yMax = 2.2, yMin = -1.4;
    function ty(v) { return pad.t + (yMax - v) / (yMax - yMin) * (H - pad.t - pad.b); }

    function drawAxes() {
      ctx.clearRect(0, 0, W, H);
      ctx.font = "12px JetBrains Mono, ui-monospace, monospace";
      ctx.fillStyle = muted;
      ctx.strokeStyle = rule;
      ctx.lineWidth = 1;
      [2, 1, 0, -1].forEach(function (v) {
        var y = ty(v);
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.textAlign = "right";
        ctx.fillText(v, pad.l - 8, y + 4);
      });
      // finger markers above the plot, like the coloured pins in the process sheets
      fingers.forEach(function (f) {
        var x = pad.l + f.peakAt * (W - pad.l - pad.r);
        ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.arc(x, 6, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = f.color;
        ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, ty(0)); ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }

    // Draw all traces up to fraction p of the width.
    function drawTraces(p) {
      var upto = Math.floor(traces[0].length * p);
      ctx.lineWidth = 1.6;
      ctx.lineJoin = "round";
      traces.forEach(function (pts, k) {
        ctx.strokeStyle = fingers[k].color;
        ctx.beginPath();
        for (var i = 0; i < upto; i++) {
          var x = pad.l + pts[i].x / W * (W - pad.l - pad.r);
          var y = ty(pts[i].y);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      // sweep cursor
      if (p < 1) {
        var cx = pad.l + p * (W - pad.l - pad.r);
        ctx.strokeStyle = ink;
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(cx, pad.t); ctx.lineTo(cx, H - pad.b); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    var raf = null;
    function play() {
      if (raf) cancelAnimationFrame(raf);
      if (reduceMotion) { drawAxes(); drawTraces(1); return; }
      var start = null, duration = 2400;
      function frame(now) {
        if (!start) start = now;
        var p = Math.min(1, (now - start) / duration);
        drawAxes();
        drawTraces(p);
        if (p < 1) raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }

    // Crisp on high-DPI screens
    function fit() {
      var dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawAxes();
      drawTraces(1);
    }
    fit();
    window.addEventListener("resize", fit);

    play();
    var replay = document.getElementById("replay");
    if (replay) replay.addEventListener("click", play);
  }

  /* ---------- 2. Stage index (scrollspy) ---------- */

  var links = Array.prototype.slice.call(document.querySelectorAll("#stage-index a"));
  var stages = links
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && stages.length) {
    var current = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) current = e.target;
      });
      if (!current) return;
      links.forEach(function (a) {
        var on = a.getAttribute("href") === "#" + current.id;
        if (on) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }, { rootMargin: "-30% 0px -60% 0px", threshold: 0 });
    stages.forEach(function (s) { io.observe(s); });
  }

  /* ---------- 3. Figures and plates: load real images if they exist ---------- */
  // Each .fig__frame and .plate carries data-src. If the file loads, it covers
  // the placeholder. If it 404s, a case-study figure keeps its dashed
  // placeholder with the path, so you can see which image is still missing,
  // and a plate keeps its typographic poster in the project's skin.

  document.querySelectorAll(".fig__frame[data-src], .plate[data-src]").forEach(function (frame) {
    var src = frame.getAttribute("data-src");
    var img = new Image();
    img.alt = "";
    img.onload = function () { frame.appendChild(img); };
    img.src = src;
  });
})();