(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Hero: robot tracing the DXF test drawing on a dark floor ---------- */
  var canvas = document.getElementById("floor");
  if (canvas) {
    var ctx = canvas.getContext("2d");
    var path = [];
    var W = 0, H = 0, scale = 1, ox = 0, oy = 0;
    var drawn = 0, pause = 30, speed = 10;
    var robotImg = new Image();
    robotImg.src = "static/images/nova-carter-top-40-percent.png";
    var heading = 45;
    var ROBOT_SCALE = 1;          // 1 = true size, lower it (for example 0.8) to make the robot smaller
    var FRONT_ANGLE = Math.PI;    // Math.PI = wheels at the rear; change to 0 if it looks like it drives backwards
    var WHEELBASE_M = 0.265;      // from the paper
    var WHEEL_PX = 98.45;         // distance between the wheel centres in the image
    var AXLE_X = 98.45, AXLE_Y = 31.5;  // point between the wheels, where the pen is

    function line(x1, y1, x2, y2, step) {
      var d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(d / step));
      for (var i = 1; i <= n; i++) path.push({ x: x1 + (x2 - x1) * i / n, y: y1 + (y2 - y1) * i / n, pen: true });
    }
    function travel(x, y) { path.push({ x: x, y: y, pen: false }); }
    function poly(pts) {
      travel(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 12);
      line(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], 12);
    }
    function circle(cx, cy, r) {
      travel(cx + r, cy);
      for (var a = 3; a <= 360; a += 3) path.push({ x: cx + r * Math.cos(a * Math.PI / 180), y: cy + r * Math.sin(a * Math.PI / 180), pen: true });
    }

    // DXF test drawing: 1500 mm square, triangle, circle, two arrows
    poly([[0, 0], [1500, 0], [1500, 1500], [0, 1500]]);
    poly([[250, 330], [1250, 330], [750, 1196]]);
    circle(750, 620, 200);
    poly([[240, 1100], [330, 1000], [280, 1000], [280, 700], [200, 700], [200, 1000], [150, 1000]]);
    poly([[1260, 700], [1350, 800], [1300, 800], [1300, 1100], [1220, 1100], [1220, 800], [1170, 800]]);

    function P(p) { return [ox + p.x * scale, oy + (1500 - p.y) * scale]; }

    function resize() {
      var r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var size = Math.min(H * 0.8, W * 0.4);
      scale = size / 1500;
      ox = W > 900 ? W - size - W * 0.06 : (W - size) / 2;
      oy = (H - size) / 2;
      render();
    }

    function render() {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(142,171,221,0.07)"; ctx.lineWidth = 1;
      for (var x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (var y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.strokeStyle = "#2fe0ee"; ctx.shadowColor = "rgba(47,224,238,0.55)"; ctx.shadowBlur = 8;
      ctx.beginPath();
      var started = false;
      for (var i = 0; i < drawn && i < path.length; i++) {
        var q = P(path[i]);
        if (!path[i].pen) { started = false; continue; }
        if (!started) { var prev = P(path[i - 1] || path[i]); ctx.moveTo(prev[0], prev[1]); started = true; }
        ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      
      var j = Math.min(drawn, path.length) - 1;
      var cur = path[j] || path[0];
      var c = P(cur);

      var back = path[Math.max(0, j - 6)];
      var dx = cur.x - back.x, dy = cur.y - back.y;
      if (Math.hypot(dx, dy) > 20) {
        var want = Math.atan2(dx, dy);
        var diff = Math.atan2(Math.sin(want - heading), Math.cos(want - heading));
        heading += diff * 0.15;
      }

      if (robotImg.complete && robotImg.naturalWidth) {
        var k = (WHEELBASE_M / WHEEL_PX) * scale * 1000 * ROBOT_SCALE;
        ctx.save();
        ctx.translate(c[0], c[1]);
        ctx.rotate(heading + FRONT_ANGLE);
        ctx.shadowColor = "rgba(0,0,0,0.55)";
        ctx.shadowBlur = 14;
        ctx.drawImage(robotImg, -AXLE_X * k, -AXLE_Y * k, robotImg.naturalWidth * k, robotImg.naturalHeight * k);
        ctx.restore();
      }
      ctx.fillStyle = cur.pen ? "#ff4d6d" : "#8eabdd";
      ctx.beginPath(); ctx.arc(c[0], c[1], 4, 0, Math.PI * 2); ctx.fill();
      
    
    
    }

    function tick() {
      if (pause > 0) {
        pause--;
        if (pause === 0) drawn = 0;
      } else if (drawn < path.length) {
        drawn = Math.min(path.length, drawn + speed);
        if (drawn === path.length) pause = 30;
      }
      render();
      requestAnimationFrame(tick);
    }

    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(tick);
  }

  /* ---------- Videos: play when visible, click to pause or play ---------- */
  var media = document.querySelectorAll(".media");
  media.forEach(function (m) {
    var v = m.querySelector("video");
    if (!v) return;
    v.addEventListener("loadeddata", function () { m.classList.add("loaded"); });
    if (reduceMotion) v.setAttribute("controls", "");
    else m.addEventListener("click", function () { v.paused ? v.play() : v.pause(); });
  });
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target.querySelector("video");
        if (!v) return;
        if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.35 });
    media.forEach(function (m) { io.observe(m); });
  }

  /* ---------- Images: show a placeholder until the file is added ---------- */
  document.querySelectorAll("img[data-file]").forEach(function (img) {
    function mark() { img.classList.add("missing"); img.alt = img.alt + " (add " + img.getAttribute("data-file") + ")"; }
    if (img.complete && img.naturalWidth === 0) mark();
    img.addEventListener("error", mark);
  });

  /* ---------- Charts ---------- */
  if (window.Chart) {
    var indigo = "#524493", teal = "#0e9aa7", rose = "#c2415a", grid = "rgba(28,26,43,0.08)";
    Chart.defaults.font.family = '"Bricolage Grotesque", system-ui, sans-serif';
    Chart.defaults.font.size = 13;
    Chart.defaults.color = "#5d5a73";

    function pts(xs, ys) { return xs.map(function (x, i) { return { x: x, y: ys[i] }; }); }
    function series(label, data, color, dashed, square) {
      return { label: label, data: data, borderColor: color, backgroundColor: color, borderWidth: 2.2, pointRadius: 4, pointHoverRadius: 6, pointStyle: square ? "rectRot" : "circle", tension: 0, showLine: true, borderDash: dashed ? [6, 5] : [] };
    }
    function options(title, yTitle, xMax, ticks) {
      return {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: title, color: "#2a2250", font: { size: 15, weight: "700" }, padding: { bottom: 10 } },
          legend: { position: "bottom", labels: { boxWidth: 14, usePointStyle: true } },
          tooltip: { callbacks: { label: function (c) { return c.dataset.label + ": " + c.parsed.y + " at " + c.parsed.x.toFixed(2) + " m/s"; } } }
        },
        scales: {
          x: { type: "linear", min: 0, max: xMax, title: { display: true, text: "Base speed V0 (m/s)" }, grid: { color: grid }, ticks: { stepSize: 0.1 } },
          y: { beginAtZero: true, title: { display: true, text: yTitle }, grid: { color: grid } }
        }
      };
    }

    // Data read from the experiment graphs
    var lqrV    = [0.05, 0.10, 0.15, 0.20, 0.25, 0.35, 0.50];
    var lqrMean = [0.8, 0.8, 1.1, 1.8, 4.3, 7.9, 9.5];
    var lqrWp   = [14.7, 14.6, 14.5, 14.5, 15.0, 16.2, 19.7];
    var lqrTime = [34.87, 29.85, 22.14, 18.28, 22.27, 28.47, 40.59];

    var pV      = [0.10, 0.15, 0.20, 0.25, 0.35, 0.40, 0.50];
    var pMean   = [1.1, 1.0, 1.0, 1.0, 1.1, 1.8, 7.4];
    var pWp     = [19.9, 19.9, 19.8, 19.8, 21.3, 22.9, 24.7];
    var pTime   = [111.91, 69.96, 61.04, 50.54, 43.58, 53.06, 116.05];

    new Chart(document.getElementById("chartLqr"), {
      type: "scatter",
      data: { datasets: [series("Mean lateral deviation", pts(lqrV, lqrMean), indigo, false, false), series("Mean waypoint error", pts(lqrV, lqrWp), rose, true, true)] },
      options: options("PD-LQR: waypoint error and lateral deviation", "Error (mm)", 0.55)
    });
    new Chart(document.getElementById("chartP"), {
      type: "scatter",
      data: { datasets: [series("Mean lateral deviation", pts(pV, pMean), indigo, false, false), series("Mean waypoint error", pts(pV, pWp), rose, true, true)] },
      options: options("P-controller: waypoint error and lateral deviation", "Error (mm)", 0.55)
    });
    new Chart(document.getElementById("chartTime"), {
      type: "scatter",
      data: { datasets: [series("PD-LQR", pts(lqrV, lqrTime), indigo, false, false), series("P-controller", pts(pV, pTime), teal, true, true)] },
      options: options("Total task time", "Time (min)", 0.55)
    });
    new Chart(document.getElementById("chartMean"), {
      type: "scatter",
      data: { datasets: [series("PD-LQR", pts(lqrV, lqrMean), indigo, false, false), series("P-controller", pts(pV, pMean), teal, true, true)] },
      options: options("Mean lateral deviation", "Mean deviation (mm)", 0.55)
    });
  }
})();
