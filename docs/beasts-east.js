/* beasts-east.js — the cousins east and south of Europe, and the Maya rain god: Forbidden City
   spouts and ridge beasts, Japanese roof ogres and golden carp, the makara spouts of Nepal and Java,
   Kala, the Thai yaksha and the Lanna singha, Chaac. Same 200 × 200 box and conventions as beasts.js. */
(function () {
  "use strict";
  var G = window.GARG, S = G.STONES, B = G.BEASTS;
  var sin = Math.sin, cos = Math.cos, PI = Math.PI, exp = Math.exp, pow = Math.pow, abs = Math.abs;
  var blink = G.blink, wander = G.wander, rot = G.rot;

  /* ---------------------------------------------------------------- local helpers
     Each one that draws returns at once when G.sil is set: a cast shadow wants silhouettes only. */
  function frac(x) { return x - Math.floor(x); }
  /* a tap's reaction, a pure function of s.poke: about 170 ms of attack with a little overshoot, then a long settle */
  function env(s, len) {
    len = len || 1400;
    var q = s.poke;
    if (q == null || q < 0 || q > len) return 0;
    var u = q / len, a = u < 0.12 ? G.ease(u / 0.12) : pow(1 - (u - 0.12) / 0.88, 1.6);
    return a * (1 + 0.18 * sin(q * 0.02) * exp(-q / 400));
  }
  /* where the glint sits on a gold, glaze, jade or lacquer part: it travels, staggered by the part's y */
  function sweep(t, y, period) { return 0.15 + 0.7 * frac(t / (period || 5200) + y / 260); }
  /* a ring of n control points, a little off true so it is carved and not turned */
  function circ(x, y, r, n, wob) {
    var out = [];
    for (var i = 0; i < n; i++) { var a = i / n * PI * 2 - PI / 2, k = 1 + (wob || 0.05) * sin(i * 2.4 + 1); out.push([x + cos(a) * r * k, y + sin(a) * r * k]); }
    return out;
  }
  function mirror(pts, cx) { return pts.map(function (p) { return p[2] ? [2 * cx - p[0], p[1], 1] : [2 * cx - p[0], p[1]]; }); }
  /* a hand-placed spine of [x, y, half-width], run through a Catmull-Rom so it can be walked: n points per span */
  function densify(spine, n) {
    n = n || 5;
    var P = [], m = spine.length, i, k, d;
    for (i = 0; i < m - 1; i++) {
      var p0 = spine[Math.max(i - 1, 0)], p1 = spine[i], p2 = spine[i + 1], p3 = spine[Math.min(i + 2, m - 1)];
      for (k = 0; k < n; k++) {
        var u = k / n, u2 = u * u, u3 = u2 * u, q = [];
        for (d = 0; d < 3; d++) q.push(0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * u3));
        P.push(q);
      }
    }
    P.push(spine[m - 1].slice());
    return P;
  }
  /* a tube or a body swept along that spine: returns the outline's control points */
  function ribbon(spine, n) {
    var P = densify(spine, n), L = [], R = [], i;
    for (i = 0; i < P.length; i++) {
      var a = P[Math.max(i - 1, 0)], b = P[Math.min(i + 1, P.length - 1)], dx = b[0] - a[0], dy = b[1] - a[1], dd = Math.hypot(dx, dy) || 1, w = Math.max(P[i][2], 0.01);
      L.push([P[i][0] - dy / dd * w, P[i][1] + dx / dd * w]); R.unshift([P[i][0] + dy / dd * w, P[i][1] - dx / dd * w]);
    }
    return L.concat(R);
  }
  /* a hook that winds into a spiral: a ribbon along a path whose heading turns by `turn` radians, most of it near the tip.
     Returns the spine ([x, y, half-width] points) so the caller can build the part and find the tip. */
  function volute(x, y, ang, len, turn, w0, w1, n) {
    n = n || 18;
    var sp = [], px = x, py = y, ds = len / 60, i, u, th;
    for (i = 0; i <= 60; i++) {
      u = i / 60; th = ang + turn * u * u * u;
      if (i % Math.round(60 / n) === 0 || i === 60) sp.push([px, py, G.lerp(w0, w1, u)]);
      px += cos(th) * ds; py += sin(th) * ds;
    }
    return sp;
  }
  /* a spiral wound in round (cx, cy) from radius r0 to r1 over `turns` turns (clockwise when dir is +1), a straight tail leading in to its outer
     end: a cloud scroll. Returns the [x, y, half-width] spine for ribbon(). */
  function spiralSpine(cx, cy, r0, r1, a0, turns, dir, w0, w1, tail, n) {
    n = n || 22;
    var sp = [], i, u, a, T = [-sin(a0) * dir, cos(a0) * dir], x0 = cx + cos(a0) * r0, y0 = cy + sin(a0) * r0;
    if (tail) sp.push([x0 - T[0] * tail, y0 - T[1] * tail, w0 * 0.55], [x0 - T[0] * tail * 0.5, y0 - T[1] * tail * 0.5, w0 * 0.8]);
    for (i = 0; i <= n; i++) { u = i / n; a = a0 + dir * turns * PI * 2 * u; var r = G.lerp(r0, r1, u); sp.push([cx + cos(a) * r, cy + sin(a) * r, G.lerp(w0, w1, u)]); }
    return sp;
  }
  /* a spine that runs straight for `stem`, then bends round a circle of radius r through `turn` radians (clockwise when positive): a fat C-hook,
     where volute() makes a spiral. Returns the [x, y, half-width] spine like volute() does. */
  function arcSpine(x, y, ang, stem, r, turn, w0, w1, n) {
    n = n || 20;
    var sp = [], L = stem + abs(turn) * r, d = stem / L, px = x, py = y, ds = L / 60, i, u, th;
    for (i = 0; i <= 60; i++) {
      u = i / 60; th = ang + (u <= d ? 0 : turn * (u - d) / (1 - d));
      if (i % Math.round(60 / n) === 0 || i === 60) sp.push([px, py, G.lerp(w0, w1, u)]);
      px += cos(th) * ds; py += sin(th) * ds;
    }
    return sp;
  }
  /* a small flat shape for details too small to carve (fingers, tusks, nostrils): fill, a lit side, an ink line */
  function nub(c, pts, st, o) {
    o = o || {};
    var poly = G.sp(pts, true, o.steps || 5);
    if (G.sil) { c.fillStyle = G.sil; G.trace(c, poly, true); c.fill(); return; }
    var bb = G.bbox(poly);
    G.trace(c, poly, true); c.fillStyle = o.base || st.base; c.fill();
    var g = c.createLinearGradient(bb[0], bb[1], bb[2], bb[3]);
    g.addColorStop(0, G.rgba(st.light, 0.6)); g.addColorStop(0.5, G.rgba(st.light, 0)); g.addColorStop(1, G.rgba(st.dark, 0.5));
    c.fillStyle = g; c.fill();
    c.strokeStyle = o.ink || st.ink; c.lineWidth = o.lw || 0.8; c.lineJoin = "round"; c.stroke();
  }
  /* the same tapered comma as G.lock, without the carving: for the many small curls of a mane or a flame */
  function curl(c, x, y, ang, len, wid, bend, st, o) {
    o = o || {};
    var pts = [], L = [], R = [], i, m = 9;
    for (i = 0; i <= m; i++) {
      var u = i / m, a = ang + bend * u * u;
      pts.push([x + cos(ang) * len * u * 0.65 + cos(a) * len * u * 0.35, y + sin(ang) * len * u * 0.65 + sin(a) * len * u * 0.35, sin(PI * pow(u, 0.7)) * wid * (1 - u * 0.6)]);
    }
    for (i = 0; i < pts.length; i++) {
      var pp = pts[i], qq = pts[Math.min(i + 1, m)], rr = pts[Math.max(i - 1, 0)], dx = qq[0] - rr[0], dy = qq[1] - rr[1], d = Math.hypot(dx, dy) || 1;
      L.push([pp[0] - dy / d * pp[2], pp[1] + dx / d * pp[2], 1]); R.unshift([pp[0] + dy / d * pp[2], pp[1] - dx / d * pp[2], 1]);
    }
    nub(c, L.concat(R), st, { steps: 1, lw: o.lw || 0.8, base: o.base });
  }
  /* a small lizard walking along its own x axis, head toward +x, at (x, y) turned by ang; ph drives the diagonal gait and the tail's swing */
  function lizard(c, x, y, ang, ph, sc) {
    if (G.sil) return;
    var gk = { base: "#8d9a6b", light: "#cdd8a6", dark: "#4b5738", ink: "#1b2214", pit: null }, sw = sin(ph), cw = cos(ph);
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(sc || 1, sc || 1);
    nub(c, ribbon([[-5, 0, 1.9], [-12, 1.2 * sw, 1.5], [-19, -1.4 * sw, 1.0], [-26, 1.8 * sw, 0.4]], 3), gk, { lw: 0.6, steps: 1 });
    [[3, 1], [3, -1], [-4, 1], [-4, -1]].forEach(function (L, i) {
      var s2 = sin(ph + (i === 0 || i === 3 ? 0 : PI));
      nub(c, [[L[0], L[1] * 1.2], [L[0] + s2 * 2.4 + 0.4, L[1] * 4.8], [L[0] + s2 * 2.4 + 2.6, L[1] * 4.8], [L[0] + 1.8, L[1] * 1.2]], gk, { lw: 0.5, steps: 1 });
    });
    nub(c, ribbon([[-8, 0, 2.2], [-1, 0.3 * cw, 2.7], [5, 0, 2.3], [9, 0, 1.6]], 3), gk, { lw: 0.7, steps: 1 });
    nub(c, [[8, -1.8], [12, -1.4], [14.4, 0], [12, 1.4], [8, 1.8]], gk, { lw: 0.6 });
    G.dot(c, -2, -1.1, 0.7, "#d9894a"); G.dot(c, 2.4, 1.2, 0.7, "#d9894a"); G.dot(c, -5, 0.8, 0.6, "#d9894a"); G.dot(c, 11, -0.9, 0.55, gk.ink);
    c.restore();
  }
  /* a dragonfly at (x, y), turned by ang: a thin jointed body, four wings beating, the beat a pure function of t */
  function dragonfly(c, x, y, ang, t) {
    if (G.sil) return;
    var fb = sin(t * 0.06), wa = 0.35 + 0.5 * abs(fb);
    c.save(); c.translate(x, y); c.rotate(ang);
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 0.4;
    [[-1, 1], [-1, -1], [3, 1], [3, -1]].forEach(function (W, i) {
      c.save(); c.translate(W[0], 0); c.rotate(W[1] * (PI / 2 - wa * (i < 2 ? 1 : 0.8)));
      c.fillStyle = "rgba(205,230,246,.55)"; c.strokeStyle = "rgba(60,90,120,.7)"; c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(3, -3, 11, -1.4); c.quadraticCurveTo(12, 0.6, 4, 1.6); c.closePath(); c.fill(); c.stroke();
      c.restore();
    });
    c.strokeStyle = "#245f7a"; c.lineWidth = 1.5; c.lineCap = "round"; c.beginPath(); c.moveTo(-14, 0); c.lineTo(5, 0); c.stroke();
    c.strokeStyle = "#3fb0c9"; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-12, -0.2); c.lineTo(3, -0.2); c.stroke();
    c.fillStyle = "#245f7a"; c.beginPath(); c.arc(6.2, 0, 2, 0, 7); c.fill(); c.fillStyle = "#f4d85a"; c.beginPath(); c.arc(7, -0.8, 0.8, 0, 7); c.fill();
    c.restore();
  }
  /* a butterfly at (x, y): its wings fold and open as |cos|, a body between them */
  function butterfly(c, x, y, ang, t, col) {
    if (G.sil) return;
    var fl = 0.2 + 0.8 * abs(cos(t * 0.021));
    c.save(); c.translate(x, y); c.rotate(ang);
    [-1, 1].forEach(function (d) {
      c.save(); c.scale(1, d * fl);
      c.fillStyle = col; c.strokeStyle = "rgba(10,20,60,.85)"; c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(2, -6, 9, -9, 11, -4); c.bezierCurveTo(10, -1, 5, 0, 0, 0); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-1, 3, -6, 7, -8, 3); c.bezierCurveTo(-8, 0, -4, -0.5, 0, 0); c.fill(); c.stroke();
      c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.arc(7, -4, 1, 0, 7); c.fill();
      c.restore();
    });
    c.strokeStyle = "#141a2e"; c.lineWidth = 1.2; c.lineCap = "round"; c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.stroke();
    c.lineWidth = 0.5; c.beginPath(); c.moveTo(5, 0); c.quadraticCurveTo(8, -3, 10, -4.4); c.moveTo(5, 0); c.quadraticCurveTo(8, 1.4, 10, 1.6); c.stroke();
    c.restore();
  }
  /* a wet sheen sliding across stone: a soft pale band, for a painted-in part (call it inside paint) */
  function sheen(cc, bb, t, st, y, a, period) {
    var pos = frac(t / (period || 6400) + (y || 0) / 260) * 1.5 - 0.25, g = cc.createLinearGradient(bb[0], bb[1], bb[2], bb[3]);
    g.addColorStop(G.clamp(pos - 0.14, 0, 1), G.rgba(st.light, 0)); g.addColorStop(G.clamp(pos, 0, 1), G.rgba(st.light, a || 0.16)); g.addColorStop(G.clamp(pos + 0.14, 0, 1), G.rgba(st.light, 0));
    cc.fillStyle = g; cc.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]);
  }
  /* dappled light through leaves drifting over a stone part (call it inside paint): flecks of shade on pale stone, of sun on dark */
  function dapple(cc, bb, t, seed, shade) {
    var w = bb[2] - bb[0], h = bb[3] - bb[1], R = Math.max(w, h), A = shade ? "rgba(34,52,84,.10)" : "rgba(255,238,186,.17)", B = shade ? "rgba(34,52,84,0)" : "rgba(255,238,186,0)";
    for (var i = 0; i < 3; i++) {
      var cx = bb[0] + w * (0.5 + 0.42 * sin(t * 0.00071 + seed * 2.1 + i * 2.1)), cy = bb[1] + h * (0.5 + 0.42 * sin(t * 0.00057 + seed * 1.3 + i * 1.7 + 1)), r = R * (0.17 + 0.05 * i), g = cc.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, A); g.addColorStop(0.7, A); g.addColorStop(1, B);
      cc.fillStyle = g; cc.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  }
  /* a tapered stain running down the stone from a mouth, an eye socket or a ledge; call it inside a part's paint */
  function streak(c, x, y, len, w, st, a, col) {
    if (G.sil) return;
    var k = col || st.dark, g = c.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, G.rgba(k, a)); g.addColorStop(0.55, G.rgba(k, a * 0.55)); g.addColorStop(1, G.rgba(k, 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x + w / 2, y);
    c.quadraticCurveTo(x + w * 0.36, y + len * 0.6, x + w * 0.1, y + len); c.lineTo(x - w * 0.1, y + len);
    c.quadraticCurveTo(x - w * 0.36, y + len * 0.6, x - w / 2, y); c.fill();
  }
  /* a bulging eyeball in its socket: a drilled pupil, a heavy upper lid that drops on blink. o.slant tilts the lid
     edge (right end lower when positive), o.squint is how far the lid hangs when open, o.look [-1..1] moves the pupil */
  function goggle(c, x, y, r, st, o) {
    if (G.sil) return;
    o = o || {};
    var b = G.clamp(o.blink || 0, 0, 1), lk = o.look || [0, 0], sq = o.squint == null ? 0.2 : o.squint, cov = G.clamp(sq + b * (1 - sq), 0, 1);
    var lx = lk[0] * r * 0.34, ly = lk[1] * r * 0.26, sl = (o.slant || 0) * r * 0.5, y0 = -r + 2 * r * cov * 0.92;
    c.save(); c.translate(x, y);
    G.hollow(c, circ(0, 0, r * 1.34, 8, 0.07), st, { deep: o.deep == null ? 0.85 : o.deep });
    G.part(c, circ(0, 0, r, 8, 0.04), st, { lw: 1, round: 1, pits: false, hatch: false, base: o.white || G.mix(st.light, st.base, 0.4) });
    c.save(); c.beginPath(); c.arc(0, 0, r * 0.98, 0, 7); c.clip();
    if (o.rim) { c.strokeStyle = o.rim; c.lineWidth = r * 0.34; c.beginPath(); c.arc(0, 0, r * 0.98, 0, 7); c.stroke(); }
    if (o.iris) { c.fillStyle = o.iris; c.beginPath(); c.arc(lx, ly, r * 0.64, 0, 7); c.fill(); }
    c.fillStyle = o.pupil || st.ink; c.beginPath(); c.arc(lx, ly, r * (o.pr || 0.36), 0, 7); c.fill();
    c.strokeStyle = G.rgba(st.light, 0.8); c.lineWidth = r * 0.12; c.beginPath(); c.arc(lx, ly, r * (o.pr || 0.36), 0.2, 1.3); c.stroke();
    var cy = y0 - r * 0.55 * (1 - cov);
    if (!o.nolid) {
    /* the lid, with the shadow it throws on the ball */
    c.beginPath(); c.moveTo(-r * 1.3, -r * 1.4); c.lineTo(-r * 1.3, y0 - sl); c.quadraticCurveTo(0, cy * 2 - y0, r * 1.3, y0 + sl); c.lineTo(r * 1.3, -r * 1.4); c.closePath();
    c.fillStyle = o.lid || st.base; c.fill();
    c.strokeStyle = G.rgba(st.dark, 0.5); c.lineWidth = r * 0.5; c.beginPath(); c.moveTo(-r * 1.3, y0 - sl + r * 0.2); c.quadraticCurveTo(0, cy * 2 - y0 + r * 0.2, r * 1.3, y0 + sl + r * 0.2); c.stroke();
    c.restore();
    c.strokeStyle = st.ink; c.lineCap = "round"; c.lineWidth = r * 0.24;
    c.beginPath(); c.moveTo(-r * 1.04, y0 - sl); c.quadraticCurveTo(0, cy * 2 - y0, r * 1.04, y0 + sl); c.stroke();
    } else c.restore();
    c.restore();
  }
  /* a bead that swells at a lip, falls and rings the stone; fully set by t. fall = px to the stone below */
  function drip(c, x, y, t, period, seed, fall, col) {
    if (G.sil) return;
    fall = fall || 60; col = col || "#9cc8f0";
    var ph = frac((t + (seed || 0) * 733) / period), sw = 0.7;
    c.save();
    if (ph < sw) {
      var u = ph / sw, r = 0.5 + 1.9 * u * u, sx = 1 + 0.9 * u * u * u;
      c.fillStyle = G.rgba(col, 0.92); c.beginPath(); c.ellipse(x, y + r * sx, r, r * sx, 0, 0, 7); c.fill();
      c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.arc(x - r * 0.3, y + r * sx * 0.8, r * 0.26, 0, 7); c.fill();
    } else {
      var f = (ph - sw) / (1 - sw), land = 0.62;
      if (f < land) {
        var dy = y + 4.5 + (fall - 4.5) * (f / land) * (f / land);
        c.fillStyle = G.rgba(col, 0.92); c.beginPath(); c.moveTo(x, dy - 5); c.quadraticCurveTo(x + 2.3, dy - 0.5, x, dy + 2.2); c.quadraticCurveTo(x - 2.3, dy - 0.5, x, dy - 5); c.fill();
      } else {
        var g = (f - land) / (1 - land), rr = 2 + 8 * g;
        c.strokeStyle = G.rgba("#dcecff", 0.85 * (1 - g)); c.lineWidth = 1; c.beginPath(); c.ellipse(x, y + fall + 1, rr, rr * 0.3, 0, 0, 7); c.stroke();
      }
    }
    c.restore();
  }
  /* breath or smoke: four rings rising, widening, fading, once per period; o.dx leans it, o.rise is how far */
  function puff(c, x, y, t, period, seed, o) {
    if (G.sil) return;
    o = o || {};
    var dur = o.dur || 0.62, tt = frac((t + (seed || 0) * 517) / period) / dur, col = o.col || "#dfe3e8", rise = o.rise || 26;
    if (tt >= 1.6) return;
    for (var i = 0; i < 4; i++) {
      var ph = (tt - i * 0.14) / 0.62;
      if (ph <= 0 || ph >= 1) continue;
      var px = x + (o.dx || 0) * ph * rise + sin(ph * 5 + (seed || 0)) * 3 * ph, py = y - rise * ph + (o.dy || 0) * ph * ph * rise;
      c.fillStyle = G.rgba(col, 0.5 * (1 - ph) * Math.min(1, ph * 7));
      c.beginPath(); c.arc(px, py, (o.r || 2.2) + ph * 5.5, 0, 7); c.fill();
    }
  }

  /* ---------------------------------------------------------------- Forbidden City chishou */
  B.chishou = { stone: "marble", spout: true, mouth: [176, 132, 1, 0.15],
    draw: function (c, s) {
      var st = S.marble, t = s.t, rain = s.rain || 0, e = env(s, 1400), q = s.poke == null ? -1 : s.poke, sil = !!G.sil, algae = "#3b4a32";
      var e2 = env(s, 1900), sway = sin(t * 0.0017) * 0.06 + rain * sin(t * 0.011) * 0.05 + 0.2 * e2 * sin(q * 0.012), jaw = 0.1 * rain + 0.3 * e;
      /* a part's paint: a wet sheen, the dark wash of rain, and the beads running down it */
      function pn(y, sx) { return function (cc, bb) {
        sheen(cc, bb, t, st, y, 0.2); dapple(cc, bb, t, y * 0.07, true);
        /* in the last third of every nine seconds, when the sparrow has gone, a cloud's shadow crosses the whole marble, left to right */
        var cu = (frac(t / 9000) - 0.6) / 0.4;
        if (cu > 0 && cu < 1) { var cx0 = -70 + 340 * cu, cg = cc.createLinearGradient(cx0 - 60, 0, cx0 + 60, 0); cg.addColorStop(0, "rgba(30,45,72,0)"); cg.addColorStop(0.5, "rgba(30,45,72," + (0.17 * sin(PI * cu)) + ")"); cg.addColorStop(1, "rgba(30,45,72,0)"); cc.fillStyle = cg; cc.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]); }
        if (rain > 0.02) { cc.fillStyle = "rgba(40,60,90," + (0.12 * rain) + ")"; cc.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]); }
        if (sx) sx(cc, bb);
      }; }

      /* the sumeru terrace edge, stepping out, with a long wet streak and an algae stain under the head */
      G.part(c, [[0, 150, 1], [56, 150, 1], [56, 166, 1], [70, 166, 1], [70, 182, 1], [84, 182, 1], [84, 200, 1], [0, 200, 1]], st, { lw: 1.3, steps: 1, seed: 91, lift: 0.6,
        paint: pn(150, function (cc) {
          streak(cc, 30, 150, 50, 9, st, 0.3 + 0.3 * rain); streak(cc, 62, 166, 34, 7, st, 0.26, algae); streak(cc, 76, 182, 18, 6, st, 0.2 + 0.3 * rain);
          streak(cc, 42, 150, 50, 7, st, 0.35 + 0.3 * rain, "#2c2c2e"); streak(cc, 51, 150, 30, 4, st, 0.3 + 0.3 * rain, "#2c2c2e");
          if (rain > 0.02) for (var d = 0; d < 3; d++) { var ph = frac(t * 0.0006 + d / 3); cc.fillStyle = G.rgba("#cfe6ff", 0.8 * rain); cc.beginPath(); cc.arc(30 + (d - 1) * 1.5, 152 + ph * 46, 1.4, 0, 7); cc.fill(); }
        }) });
      G.cut(c, [[2, 168], [54, 168]], st, 0.8); G.cut(c, [[2, 184], [68, 184]], st, 0.8);
      /* the rail's plinth block, from whose right face the head comes out */
      G.part(c, [[0, 98, 1], [44, 98, 1], [44, 150, 1], [0, 150, 1]], st, { lw: 1.3, steps: 1, seed: 92, lift: 0.6, paint: pn(120, function (cc) { streak(cc, 40, 110, 40, 5, st, 0.32 + 0.3 * rain, "#2c2c2e"); }) });
      G.cut(c, [[5, 106], [39, 106], [39, 142], [5, 142], [5, 106]], st, 0.8, { glint: 1 });
      /* the baluster post: a round finial, a carved capital of clouds and dragons, a square shaft, a lotus band at its foot */
      G.part(c, [[8, 34, 1], [36, 34, 1], [36, 88, 1], [8, 88, 1]], st, { lw: 1.3, steps: 1, seed: 93, paint: pn(60, function (cc) {
        streak(cc, 16, 38, 44, 4, st, 0.22 + 0.3 * rain); streak(cc, 29, 44, 38, 3, st, 0.16 + 0.3 * rain);
        if (rain > 0.02) for (var d = 0; d < 5; d++) { var ph = frac(t * 0.00055 + d * 0.2); cc.fillStyle = G.rgba("#cfe6ff", 0.85 * rain); cc.beginPath(); cc.arc(11 + d * 5.5, 36 + ph * 60, 1.2, 0, 7); cc.fill(); }
      }) });
      G.cut(c, [[13, 41], [31, 41], [31, 82], [13, 82], [13, 41]], st, 0.8, { glint: 1 });
      G.part(c, [[6, 34, 1], [4, 27], [8, 20, 1], [36, 20, 1], [40, 27], [38, 34, 1]], st, { lw: 1.2, seed: 94, paint: pn(27) });
      [[14, 27], [30, 27]].forEach(function (V, k) { var sp = [], i, a; for (i = 0; i < 11; i++) { a = i * 0.75 + k * 3; sp.push([V[0] + cos(a) * (0.6 + i * 0.5), V[1] + sin(a) * (0.6 + i * 0.5)]); } G.cut(c, sp, st, 0.9); });
      G.part(c, [[1, 12, 1], [43, 12, 1], [41, 20, 1], [3, 20, 1]], st, { lw: 1.2, steps: 1, seed: 95, paint: pn(16) });
      G.part(c, circ(22, 6.5, 5.6, 8, 0.03), st, { lw: 1.2, round: 1, seed: 96, pits: false });
      /* the lotus band is a block of its own, flaring from the shaft to the plinth, so the post stands on the stone and does not hang over it */
      G.part(c, [[6, 88, 1], [38, 88, 1], [41, 98, 1], [3, 98, 1]], st, { lw: 1.2, steps: 1, seed: 97, paint: pn(92) });
      for (var lp = 0; lp < 5; lp++) { var lx = 8 + lp * 5.6; G.cut(c, [[lx, 98 - 2], [lx + 0.6, 92], [lx + 2.8, 88.8], [lx + 5, 92], [lx + 5.6, 96]], st, 0.8); }

      /* the sparrow: lands on the cap every nine seconds, hops twice, goes */
      var sp9 = frac(t / 9000);
      if (sp9 > 0.12 && sp9 < 0.62 && !sil) {
        var sx, sy, wing = 0, a9 = (sp9 - 0.12) / 0.5;
        if (a9 < 0.14) { var u = a9 / 0.14; sx = G.lerp(88, 33, u); sy = G.lerp(-6, 12, u) - sin(u * PI) * 8; wing = sin(a9 * 200); }
        else if (a9 < 0.8) { var hp = (a9 - 0.14) / 0.66, h = hp > 0.3 && hp < 0.42 ? sin((hp - 0.3) / 0.12 * PI) * 3 : hp > 0.58 && hp < 0.7 ? sin((hp - 0.58) / 0.12 * PI) * 3 : 0; sx = 33 + (hp > 0.36 ? -3 : 0) + (hp > 0.64 ? -3 : 0); sy = 12 - h; }
        else { var v = (a9 - 0.8) / 0.2; sx = G.lerp(30, 100, v * v); sy = 12 - v * 30 - sin(v * PI) * 6; wing = sin(a9 * 200); }
        c.save(); c.translate(sx, sy); c.scale(0.8, 0.8);
        var fl = abs(wing) > 0.01;
        nub(c, [[-6, -1], [-10, 3 - (fl ? 4 : 0)], [-5, 1.6]], S.grey, { lw: 0.6, steps: 1 });
        nub(c, [[-5, -3], [0, -6], [5, -4], [6, -1], [3, 1.5], [-3, 1.5]], S.grey, { lw: 0.8, base: "#9a8466" });
        nub(c, [[3, -5.4], [6, -7], [8.4, -5], [8, -2.4], [4.6, -3]], S.grey, { lw: 0.7, base: "#8a6f50" });
        nub(c, [[-3, -2], [2, -3], [1, 0.4], [-4, 0.2]], S.grey, { lw: 0.5, base: "#6c5238" });
        G.dot(c, 6, -5, 0.6, "#1d1d1d"); nub(c, [[8.2, -5], [10.5, -4.4], [8.2, -3.8]], S.grey, { lw: 0.4, steps: 1, base: "#e8c25a" });
        if (!fl) { G.cut(c, [[-1, 1.5], [-1, 4]], S.grey, 0.6); G.cut(c, [[2, 1.5], [2, 4]], S.grey, 0.6); }
        c.restore();
      }

      /* the dragonfly: crosses the terrace in the last third of every nine seconds, when the sparrow has gone, hovering twice as it goes */
      var df9 = (frac(t / 9000) - 0.64) / 0.33;
      if (df9 > 0 && df9 < 1 && rain < 0.35 && !sil) {
        var du = df9 < 0.5 ? G.ease(df9 / 0.5) * 0.5 : 0.5 + G.ease((df9 - 0.5) / 0.5) * 0.5, dxx = 212 - 250 * du + 3 * sin(df9 * 40), dyy = 52 + 24 * sin(du * 6.2) + 5 * sin(df9 * 60 + 1);
        dragonfly(c, dxx, dyy, PI + 0.25 * cos(du * 6.2), t);
      }

      /* the mane: five locks flowing back over the neck and onto the plinth */
      for (var mn = 0; mn < 5; mn++) G.lock(c, 70 - mn * 5, 84 + mn * 7, PI + 0.55 - mn * 0.07 + sway * (1 + mn * 0.2), 36 - mn * 2.5, 6.4 - mn * 0.4, -0.9, st, { lw: 1 });

      /* the foreleg under the head: a thick limb coming down onto the plinth, three toes hooked over its right edge, black drip stains below the claw */
      G.part(c, ribbon([[64, 120, 9], [56, 134, 8.4], [49, 146, 7]], 4), st, { lw: 1.4, steps: 1, round: 0.5, seed: 103, paint: pn(135, function (cc) { streak(cc, 52, 144, 22, 6, st, 0.3 + 0.3 * rain, "#2c2c2e"); }) });
      G.cut(c, [[58, 128], [53, 138], [49, 145]], st, 0.8, { glint: 1 });
      for (var tz = 0; tz < 3; tz++) {
        var ty0 = 140.4 + tz * 5.4, tw = 14 - tz * 0.6;
        nub(c, [[54, ty0 - 2.4], [47, ty0 - 2.7], [40.2 + tz * 0.6, ty0 - 0.2], [46.5, ty0 + 2.6], [54, ty0 + 2.4]], st, { lw: 0.9 });
        nub(c, [[41.4 + tz * 0.6, ty0 - 1.2, 1], [37.4 + tz * 0.6, ty0 + 0.8, 1], [41, ty0 + 1.6, 1]], st, { lw: 0.6, steps: 1, base: st.dark });
        G.cut(c, [[48, ty0 - 2], [48.4, ty0 + 2]], st, 0.5);
      }
      /* the head, tilted ten degrees down: short and tall, bulbous brow, a rolled lip over four fangs, hornless */
      var headPts = [[44, 96], [56, 84], [80, 76], [104, 80], [120, 92], [134, 98], [152, 95], [166, 89], [177, 91], [181, 100], [178, 109], [160, 112], [140, 116], [124, 122], [104, 126], [80, 128], [56, 126], [44, 118]];
      c.save(); rot(c, 44, 110, 0.17 - 0.1 * e, function () {
        /* two ribbon whiskers from the snout corner, swept back and down behind the jaw so only their ends hang free */
        G.lock(c, 152, 116, PI / 2 + 0.95 + sway * 1.4, 74, 3.8, -1.2, st, { lw: 0.9 }); G.lock(c, 160, 118, PI / 2 + 0.55 + sway * 1.8, 66, 3.4, -1.2, st, { lw: 0.9 });
        /* the tongue is the water trough: it lolls out under the lip and curls up at its tip */
        G.part(c, [[70, 124], [100, 128], [130, 128], [156, 126], [166, 128], [162, 134], [136, 142], [104, 144], [76, 140]], st, { lw: 1.5, round: 0.6, seed: 97, paint: pn(135, function (cc) { streak(cc, 160, 128, 14, 6, st, 0.3 + 0.3 * rain, "#2c2c2e"); streak(cc, 126, 129, 12, 5, st, 0.25 + 0.3 * rain, "#2c2c2e"); }) });
        G.part(c, ribbon([[106, 124, 5], [130, 126, 5.6], [156, 124, 5], [172, 120 - e * 2, 4], [180, 111 - e * 3, 2.6]], 4), st, { lw: 1.4, steps: 1, round: 0.5, seed: 98, base: G.mix(st.base, st.dark, 0.1) });
        G.cut(c, [[112, 124], [140, 126], [166, 122], [178, 114]], st, 1.2, { glint: 1 });
        rot(c, 130, 124, jaw, function () { G.part(c, [[96, 124], [128, 126], [150, 126], [158, 130], [150, 136], [120, 138], [98, 134]], st, { lw: 1.2, round: 0.5, seed: 99, paint: pn(130, function (cc) { streak(cc, 150, 126, 12, 5, st, 0.3 + 0.3 * rain, "#2c2c2e"); }) }); });
        G.part(c, headPts, st, { lw: 1.7, round: 0.8, seed: 100, paint: pn(100, function (cc) {
          streak(cc, 128, 118, 30, 5, st, 0.2 + 0.3 * rain); streak(cc, 90, 124, 26, 8, st, 0.14, algae);
          cc.strokeStyle = G.rgba(st.ink, 0.28); cc.lineWidth = 0.8;
          for (var r = 0; r < 3; r++) for (var x = 46 + (r % 2) * 4; x < 74; x += 8) { cc.beginPath(); cc.arc(x, 100 + r * 8, 4, 0.2, PI - 0.2); cc.stroke(); }
        }) });
        G.teeth(c, [[132, 116], [152, 113], [174, 110]], 4, 6, 1, st, { fangs: [0, 3] });
        G.cut(c, [[128, 120], [150, 116], [176, 110]], st, 1.3, { glint: 1 });
        /* raised brow ridges, a flame brow, the goggle eye */
        G.part(c, [[92, 86], [110, 79], [128, 85], [124, 92], [110, 88], [96, 93]], st, { lw: 1.3, round: 0.5, seed: 101 });
        curl(c, 100, 82, -2.3 + sway, 26, 5.4, 1.3, st, { lw: 0.9 }); curl(c, 112, 78, -1.9 + sway, 22, 4.6, 1.3, st, { lw: 0.9 });
        goggle(c, 112, 98, 7, st, { white: "#f4f1e8", pr: 0.4, squint: 0.3, slant: 0.2, blink: blink(t, 6), look: [0.6, 0.2] });
        /* the snout turns up, a flared round disc for each nostril */
        G.part(c, circ(167, 94, 4.8, 7, 0.05), st, { lw: 1.1, round: 0.8, pits: false }); G.hollow(c, circ(167.5, 94.5, 2.2, 6, 0.1), st, { deep: 1 });
        /* the nose is rolled: one scroll winds round the nostril, kept inside the snout's outline */
        c.save(); G.trace(c, G.sp(headPts, true, 7), true); c.clip();
        var nsp = [], nq; for (nq = 0; nq <= 30; nq++) { var na = 0.9 + nq * 0.78, nr = 6.4 + nq * 0.14 + (nq > 22 ? (nq - 22) * (nq - 22) * 0.1 : 0); nsp.push([167 + cos(na) * nr, 94.6 + sin(na) * nr * 0.92]); }
        G.cut(c, nsp, st, 0.9, { glint: 1 });
        c.restore();
        /* a ruyi spiral on the cheek, a scroll cut, a rolled ear */
        var spr = [], i, a; for (i = 0; i < 14; i++) { a = i * 0.7; spr.push([86 + cos(a) * (0.8 + i * 0.5), 108 + sin(a) * (0.8 + i * 0.5)]); } G.cut(c, spr, st, 1, { glint: 1 });
        G.cut(c, [[93, 114], [101, 117], [110, 116]], st, 0.8);
        G.part(c, [[70, 82], [66, 70], [78, 68], [84, 78]], st, { lw: 1.1, round: 0.6, seed: 102 });
        /* a beard of three curls */
        for (var bd = 0; bd < 3; bd++) curl(c, 106 + bd * 10, 142, PI / 2 + 0.25 + bd * 0.1 + sway * 0.4, 20 - bd * 2, 4.4, 1.3, st, { lw: 0.9 });
      });
      c.restore();

      /* the bead at the tongue's tip every two seconds, and in the rain a thread of water along the trough */
      drip(c, 177, 134, t, 2000, 0, 60, "#a9d0f2");
      /* a tap: the dragon spits its flaming pearl out and back, with a short gush */
      if (q >= 0 && q < 1500 && !sil) {
        var pu = q / 1500, pr = G.clamp(pu, 0, 1), px = 176 + 17 * sin(PI * pr), py = 128 - 46 * sin(PI * pr) + 12 * sin(PI * pr) * sin(PI * pr);
        if (pu < 1) {
          var pearl = { base: "#d8501c", light: "#ffd27a", dark: "#7a1a06", ink: "#2a0703", pit: null, shine: 0.8 };
          for (var fl2 = 0; fl2 < 3; fl2++) G.lock(c, px, py, PI + 0.6 + fl2 * 0.55 - (pu < 0.5 ? 0.4 : -0.4) + sin(q * 0.02 + fl2) * 0.1, 15 - fl2 * 2, 3.8, 1.1, pearl, { lw: 0.8 });
          G.part(c, circ(px, py, 6.2, 8, 0.03), pearl, { lw: 1.2, round: 1, shineAt: sweep(t, 128), pits: false });
          G.dot(c, px - 1.8, py - 2, 1.4, "#ffe9a8");
        }
      }
      if (e2 > 0.02) G.jet(c, 177, 132, 0.07, -0.015, e2, q, 196, { w: 5.5, g: 0.0013, seed: 5 });
    } };

  /* ---------------------------------------------------------------- chiwen ridge-end */
  B.chiwen = { stone: "glaze", spout: false,
    draw: function (c, s) {
      var st = S.glaze, gr = S.jade, t = s.t, e = env(s, 1400), q = s.poke == null ? -1 : s.poke, sil = !!G.sil;
      var rg = { base: "#e9b92a", light: "#fff0a0", dark: "#9a5d0a", ink: "#3b1f02", pit: null, shine: 0.7 };
      var rd = S.red, gdk = S.gold;
      var tc = sin(t * 0.0012) * 0.1, tas = sin(t * 0.0014) * 0.35 + (q >= 0 && q < 900 ? 0.9 * sin(q * 0.03) * exp(-q / 350) : 0);
      /* a swallow runs from the throat up the spine to the tail */
      function W(y) { return y < 140 && y > 14 && q >= 0 ? 2.6 * e * sin((140 - y) * 0.085 - q * 0.012) : 0; }
      function P(a) { return a.map(function (p) { var o = [p[0] + W(p[1]), p[1]]; if (p[2]) o[2] = 1; return o; }); }
      /* the roof it sits on, jade barrel tiles in perspective, and the yellow-glaze ridge band that runs into its mouth */
      G.part(c, [[0, 172, 1], [200, 172, 1], [200, 200, 1], [0, 200, 1]], gr, { lw: 1.2, steps: 1, seed: 101, shineAt: sweep(t, 190) });
      for (var tl = 0; tl < 6; tl++) G.cut(c, [[10 + tl * 36, 173], [4 + tl * 40 - 10, 200]], gr, 1, { glint: 1 });
      G.hollow(c, [[104, 142, 1], [150, 143, 1], [168, 150], [172, 176, 1], [104, 178, 1]], st, { deep: 1 });
      c.save(); c.translate(-4 * e, 0);
      G.part(c, [[118, 146, 1], [200, 146, 1], [200, 172, 1], [118, 172, 1]], rg, { lw: 1.4, steps: 1, seed: 102, shineAt: sweep(t, 160) });
      G.cut(c, [[122, 150], [200, 150]], rg, 0.9, { glint: 1 });
      [[140, 160], [165, 160], [190, 160]].forEach(function (V, k) {
        var sp = [], i, a, r;
        for (i = 0; i < 12; i++) { a = i * 0.7 + k; r = 1 + i * 0.5; sp.push([V[0] + cos(a) * r, V[1] + sin(a) * r * 0.9]); }
        G.cut(c, sp, rg, 0.9); G.cut(c, [[V[0] + 7, V[1] + 6], [V[0] + 14, V[1] + 3], [V[0] + 20, V[1] + 6]], rg, 0.8);
      });
      c.restore();

      /* the body: one S-curve, the back on the left, the tail flung over the top and hooking inward; scales run along the axis */
      var Ly = [172, 150, 110, 56, 26, 18], Lx = [36, 33, 35, 44, 68, 98], Ry = [178, 150, 126, 100, 76, 54, 36], Rx = [100, 98, 93, 92, 96, 102, 112];
      function lerpAt(ys, xs, y) { for (var i = 0; i < ys.length - 1; i++) { var a = ys[i], b = ys[i + 1]; if ((y <= a && y >= b) || (y >= a && y <= b)) return G.lerp(xs[i], xs[i + 1], (y - a) / (b - a)); } return xs[xs.length - 1]; }
      var tailTip = 2 * tc;
      G.part(c, P([[36, 172, 1], [33, 150], [35, 110], [44, 56], [68, 26], [98, 18], [126, 20], [146, 32], [150, 48], [142, 60 + tailTip * 20], [128, 62 + tailTip * 30], [124, 54 + tailTip * 24], [134, 50], [138, 40], [128, 32], [112, 36], [102, 54], [96, 76], [92, 100], [93, 126], [98, 150], [100, 172, 1]]), st, { lw: 1.7, round: 0.6, seed: 103, shineAt: sweep(t, 90),
        paint: function (cc) {
          var rr = 0;
          for (var y = 168; y > 26; y -= 10.5, rr++) {
            var xl = lerpAt(Ly, Lx, y) + 5 + W(y), xr = (y > 100 ? lerpAt(Ry, Rx, y) : lerpAt(Ry, Rx, y)) - 4 + W(y), sk = (lerpAt(Ly, Lx, y - 10) - lerpAt(Ly, Lx, y + 10)) / 20;
            for (var x = xl + (rr % 2) * 5.5; x < xr; x += 11) {
              cc.strokeStyle = G.rgba(st.dark, 0.6); cc.lineWidth = 0.95; cc.beginPath(); cc.arc(x - sk * 3, y, 6.4, 0.2, PI - 0.2); cc.stroke();
              cc.strokeStyle = G.rgba(st.light, 0.5); cc.lineWidth = 0.8; cc.beginPath(); cc.arc(x - sk * 3 - 0.6, y - 0.9, 6.4, 0.5, PI - 0.9); cc.stroke();
            }
          }
        } });
      /* one big cloud scroll in relief on the flank, a ribbon that sweeps up from the base and winds into a spiral */
      var cvs = spiralSpine(68, 98, 19, 3.2, PI, 1.6, 1, 4.4, 1.1, 28, 24).map(function (p) { return [p[0] + W(p[1]), p[1], p[2]]; });
      G.part(c, ribbon(cvs, 2), st, { lw: 1.1, steps: 1, round: 0.5, pits: false, seed: 108, base: rg.base, shineAt: sweep(t, 100, 6800) });
      G.cut(c, cvs.map(function (v) { return [v[0], v[1] - 2.4]; }), rg, 0.8, { glint: 1 });
      /* a serrated flange of the body's own glaze along the back edge: seven triangular teeth, big at the base and small at the tip, a rib cut behind them */
      var fp = [], fi, fy2;
      for (fi = 0; fi < 7; fi++) {
        var fy = 160 - fi * 17, fh = 7.5 - fi * 0.55, fz = 15 - fi * 1.6;
        fp.push([lerpAt(Ly, Lx, fy + fh) + W(fy + fh), fy + fh, 1], [lerpAt(Ly, Lx, fy) + W(fy) - fz * 0.85, fy - fz * 0.55, 1], [lerpAt(Ly, Lx, fy - fh) + W(fy - fh), fy - fh, 1]);
      }
      for (fy2 = 54; fy2 <= 170; fy2 += 14.5) fp.push([lerpAt(Ly, Lx, fy2) + 10 + W(fy2), fy2, 1]);
      G.part(c, fp, rg, { lw: 1.1, steps: 1, seed: 109, shineAt: sweep(t, 110, 6200) });
      G.cut(c, [160, 130, 100, 70].map(function (y) { return [lerpAt(Ly, Lx, y) + 13 + W(y), y]; }), rg, 0.9, { glint: 1 });
      /* the sword hilt in its back, put there to keep it on the roof: lacquer grip, gold guard, a ring pommel, a red tassel */
      G.part(c, [[83, 34, 1], [91, 34, 1], [90, 12, 1], [84, 12, 1]], S.lacq, { lw: 1, steps: 1, shineAt: sweep(t, 22, 7000), pits: false });
      G.part(c, [[75, 26, 1], [99, 26, 1], [99, 31, 1], [75, 31, 1]], gdk, { lw: 1, steps: 1, shineAt: sweep(t, 28), pits: false });
      for (var sg = 0; sg < 3; sg++) G.cut(c, [[84, 17 + sg * 5], [90, 18 + sg * 5]], S.lacq, 0.8, { col: gdk.base });
      if (!sil) { c.strokeStyle = gdk.ink; c.lineWidth = 4.6; c.beginPath(); c.arc(87, 7, 4.6, 0, 7); c.stroke(); c.strokeStyle = gdk.base; c.lineWidth = 2.8; c.beginPath(); c.arc(87, 7, 4.6, 0, 7); c.stroke(); c.strokeStyle = gdk.light; c.lineWidth = 0.9; c.beginPath(); c.arc(87, 7, 4.6, 3.5, 4.8); c.stroke(); }
      G.lock(c, 90, 9, 0.6 + tas * 0.5, 28, 3.6, 0.5 - tas * 0.4, { base: "#c9351f", light: "#ff8a6a", dark: "#6e140a", ink: "#2a0703", pit: null }, { lw: 0.9 });

      /* the little dragon on the spine: it peeks out and goes back every eight seconds, and on a tap scrambles up to the sword */
      var pk8 = frac(t / 8000), peek = pk8 < 0.3 ? sin(pk8 / 0.3 * PI) : 0, run = q >= 0 && q < 1400 ? (q < 600 ? G.ease(q / 600) : q < 950 ? 1 : 1 - G.ease((q - 950) / 450)) : 0;
      var path = [[40, 136], [36, 112], [46, 86], [58, 58], [74, 40], [82, 33]], pp = G.clamp(peek * 0.18 + run, 0, 1) * (path.length - 1), pi = Math.min(path.length - 2, Math.floor(pp)), pf = pp - pi;
      var dx = G.lerp(path[pi][0], path[pi + 1][0], pf), dy = G.lerp(path[pi][1], path[pi + 1][1], pf), da = Math.atan2(path[pi + 1][1] - path[pi][1], path[pi + 1][0] - path[pi][0]);
      if (!sil) {
        c.save(); c.translate(dx + W(dy), dy); c.rotate(da);
        var cw = sin(t * 0.012 + run * 30) * 1.2, bob = sin(t * 0.007) * 0.6;
        for (var lg = 0; lg < 4; lg++) { var lx = lg < 2 ? 3 : -4, sw = sin(t * 0.012 + lg * 1.7 + run * 30) * 2; nub(c, [[lx, 1], [lx + sw - 1, 4.4], [lx + sw + 1.2, 4.4]], gr, { lw: 0.5, steps: 1 }); nub(c, [[lx, -1], [lx + sw - 1, -4.4], [lx + sw + 1.2, -4.4]], gr, { lw: 0.5, steps: 1 }); }
        nub(c, ribbon([[-11, cw * 0.8, 0.6], [-5, -cw, 1.8], [2, cw * 0.4, 2.2], [6, 0, 1.8]], 3), gr, { lw: 0.7, steps: 1 });
        nub(c, [[5, -2.4], [10, -2.6 + bob], [12.5, 0 + bob], [10, 2.2 + bob], [5, 2.4]], gr, { lw: 0.7 });
        nub(c, [[8, -2.4, 1], [10.5, -6, 1], [9.5, -2.2, 1]], gr, { lw: 0.5, steps: 1 });
        G.dot(c, 9, -0.6 + bob, 0.7, "#ffe08a");
        c.restore();
      }

      /* the head, focal: a hornless dragon's, the mouth gaping round the ridge so it truly swallows it */
      var bg = 1 + 0.07 * e, hx = 134, hy = 118;
      /* the whole head is a fifth larger than the body's mass wants it to be, so the eye goes there first */
      c.save(); c.translate(134, 142); c.scale(1.15, 1.15); c.translate(-134, -142);
      /* tongue and lower jaw, resting on the roof */
      G.part(c, [[100, 173], [128, 175], [158, 177], [168, 181], [162, 191], [132, 193], [104, 189]], st, { lw: 1.5, round: 0.6, seed: 105, shineAt: sweep(t, 182) });
      G.teeth(c, [[116, 175], [136, 176], [160, 177]], 4, 5, -1, st, { col: "#fff8e0" });
      G.part(c, ribbon([[118, 171, 3], [138, 168, 3.4], [156, 170, 3.2], [164, 166 - e * 3, 2.2]], 3), rd, { lw: 1, steps: 1, pits: false, seed: 106 });
      G.cut(c, [[124, 170], [140, 168], [156, 169]], rd, 0.6, { col: rd.dark });
      G.part(c, P([[96, 106], [106, 94], [128, 90], [148, 96], [162, 110], [170, 124], [168, 138], [158, 146], [130, 144], [110, 140], [98, 128]]).map(function (p) { return [hx + (p[0] - hx) * bg, hy + (p[1] - hy) * bg]; }), st, { lw: 1.7, round: 0.8, seed: 104, shineAt: sweep(t, 118) });
      G.teeth(c, [[118, 144], [140, 146], [166, 144]], 4, 6, 1, st, { col: "#fff8e0", fangs: [3] });
      /* rolled lip, flared nostril disc, flame brow with its two flames, ruyi whiskers, a beard of three curls */
      G.cut(c, [[104, 134], [130, 140], [160, 140], [168, 134]], st, 1.4, { glint: 1 });
      G.part(c, circ(164, 121, 5, 7, 0.06), st, { lw: 1.2, round: 0.7, shineAt: sweep(t, 121), pits: false });
      G.hollow(c, circ(164.5, 121.5, 2.4, 6, 0.1), st, { deep: 1 });
      G.part(c, [[112, 106], [126, 98], [144, 100], [154, 110], [140, 106], [126, 112]], st, { lw: 1.3, round: 0.5, seed: 107, shineAt: sweep(t, 104) });
      curl(c, 118, 101, -2.5 + tc, 26, 5, 1.0, rg, { lw: 0.9 }); curl(c, 128, 97, -2.1 + tc, 24, 4.4, 1.0, rg, { lw: 0.9 });
      /* a second, smaller scroll over the brow, winding back toward the ridge */
      var bsv = volute(124, 104, -2.35 + tc * 0.6, 30, 5.6, 2.8, 0.9, 12);
      G.part(c, ribbon(bsv, 2), rg, { lw: 0.9, steps: 1, pits: false, seed: 110 });
      goggle(c, 134, 114, 6.2, st, { white: "#fffbe8", iris: "#d9a21f", pupil: "#2a1400", pr: 0.3, squint: 0.25, slant: 0.25, blink: blink(t, 8), look: [0.7 * cos(t * 0.0006), 0.3] });
      G.lock(c, 160, 112, -0.8 + sin(t * 0.0013) * 0.07, 58, 3.8, 2.3, rg, { lw: 0.9 }); G.lock(c, 166, 122, -0.35 + sin(t * 0.0013 + 1) * 0.07, 50, 3.4, 2.2, rg, { lw: 0.9 });
      for (var bd = 0; bd < 3; bd++) curl(c, 136 + bd * 9, 191, PI / 2 + 0.1 + bd * 0.2, 12, 3.2, 1.2, gr, { lw: 0.8 });
      c.restore();
    } };

  /* ---------------------------------------------------------------- onigawara */
  B.onigawara = { stone: "clay", spout: false, front: true,
    draw: function (c, s) {
      /* ibushi: silver-grey fired clay, a graphite sheen, kiln-crackle pits */
      var st = { base: "#8b939c", light: "#d3d9de", dark: "#3b4149", ink: "#14181c", pit: "#5d646c", shine: 0.3 };
      var t = s.t, e = env(s, 1400), e2 = env(s, 1900), q = s.poke == null ? -1 : s.poke, sil = !!G.sil, wet = s.rain || 0;
      var rd = S.red, sh = sweep(t, 100, 7600);
      var rattle = q >= 0 && q < 1400 ? 1.5 * e * sin(q * 0.157) : 0;
      var tw = frac(t / 5000) < 0.07 ? sin(frac(t / 5000) / 0.07 * PI) * 2.2 : 0, tw2 = frac((t - 110) / 5000) < 0.07 ? sin(frac((t - 110) / 5000) / 0.07 * PI) * 2.2 : 0;
      var rollL = wander(t, 9), rollR = wander(t + 160, 9), pop = 3 * e2, cross = 0.55 + 0.4 * e2;
      c.save(); c.translate(rattle, 0);
      /* the roof course it stands on: three rows of grey kawara in offset arcs, and along the eave three tomoe roundels, a disc each with its three-comma swirl */
      G.part(c, [[0, 156, 1], [200, 156, 1], [200, 200, 1], [0, 200, 1]], st, { lw: 1.3, steps: 1, seed: 108, shineAt: sh,
        paint: function (cc) {
          cc.strokeStyle = G.rgba(st.ink, 0.5); cc.lineWidth = 0.9;
          for (var r = 0; r < 3; r++) for (var x = -(r % 2) * 7; x < 210; x += 14) { cc.beginPath(); cc.arc(x + 7, 164 + r * 10, 6.4, 0, PI); cc.stroke(); }
        } });
      /* the ridge cap along its top: a band of half-round tiles, each joint a short cut, and a dark lip along the eave */
      G.part(c, [[0, 152, 1], [200, 152, 1], [200, 162, 1], [0, 162, 1]], st, { lw: 1.3, steps: 1, seed: 107, shineAt: sh, lift: 1.2 });
      for (var rj = 0; rj < 20; rj++) G.cut(c, [[rj * 10 + 5, 153.4], [rj * 10 + 5.4, 160.6]], st, 0.6);
      G.cut(c, [[0, 163.4], [100, 163], [200, 163.4]], st, 1, { glint: 1 });
      G.part(c, [[0, 196, 1], [200, 196, 1], [200, 200, 1], [0, 200, 1]], st, { lw: 1, steps: 1, seed: 106, base: G.mix(st.base, st.dark, 0.35), pits: false });
      [40, 100, 160].forEach(function (X, k) {
        var Y = 184, spin = 0.0012 * 0 + k * 0.5;
        G.part(c, circ(X, Y, 10.4, 12, 0.02), st, { lw: 1.3, round: 0.7, seed: 109 + k, shineAt: sweep(t, Y + k * 30, 6400),
          paint: function (cc, bb) { sheen(cc, bb, t, st, Y + k * 40, 0.34, 5200); } });
        G.cut(c, circ(X, Y, 8.3, 12, 0.01).concat([circ(X, Y, 8.3, 12, 0.01)[0]]), st, 0.7, { glint: 1 });
        for (var j = 0; j < 3; j++) {                                          /* the tomoe: three commas chasing round, each a head and a swept tail */
          var a0 = j * 2.0944 + spin, hx = X + cos(a0) * 3.9, hy = Y + sin(a0) * 3.9, tp = [], u;
          for (u = 0; u <= 7; u++) { var ua = a0 + 0.5 + u * 0.26, ur = 3.6 + u * 0.56; tp.push([X + cos(ua) * ur, Y + sin(ua) * ur]); }
          G.cut(c, tp, st, 1.15);
          G.dot(c, hx, hy, 1.7, st.ink); G.dot(c, hx - 0.5, hy - 0.5, 0.7, st.light);
        }
      });
      /* the face, drawn on its own 200 box and set on the roof at four-fifths size */
      c.save(); c.translate(100, 156); c.scale(0.78, 0.78); c.translate(-100, -200);
      /* the tile: a broad arch with flared shoulders, a raised rim, the field sunk inside it */
      var out = [[100, 10], [150, 18], [184, 50], [196, 100], [190, 150], [196, 200, 1], [4, 200, 1], [10, 150], [4, 100], [16, 50], [50, 18]];
      G.part(c, out, st, { lw: 1.7, seed: 111, shineAt: sh,
        paint: function (cc, bb) { streak(cc, 80, 104, 52, 9, st, 0.36 + 0.2 * wet, "#14181c"); streak(cc, 120, 104, 52, 9, st, 0.36 + 0.2 * wet, "#14181c");
          cc.strokeStyle = G.rgba(st.ink, 0.35); cc.lineWidth = 0.7; var cr = G.rng(112);
          for (var k = 0; k < 7; k++) { var cx = 14 + cr() * 172, cy = 40 + cr() * 150; cc.beginPath(); cc.moveTo(cx, cy); cc.lineTo(cx + (cr() - 0.5) * 16, cy + 6 + cr() * 8); cc.lineTo(cx + (cr() - 0.5) * 20, cy + 14 + cr() * 10); cc.stroke(); } } });
      G.hollow(c, out.map(function (p) { var o = [100 + (p[0] - 100) * 0.92, 108 + (p[1] - 108) * 0.9]; if (p[2]) o[2] = 1; return o; }), st, { deep: 0.28 });
      G.cut(c, [[18, 178], [100, 172], [182, 178]], st, 1);
      /* a stepped cloud crest between the horns, three flame curls rising */
      G.part(c, [[74, 24, 1], [126, 24, 1], [122, 17, 1], [78, 17, 1]], st, { lw: 1.2, steps: 1, seed: 113, shineAt: sh });
      curl(c, 88, 20, -1.75 + sin(t * 0.0015) * 0.05, 24, 6.4, 1.2, st, { lw: 1 }); curl(c, 100, 17, -1.57 + sin(t * 0.0015 + 1) * 0.05, 27, 7.2, -1.0, st, { lw: 1 }); curl(c, 112, 20, -1.4 + sin(t * 0.0015 + 2) * 0.05, 24, 6.4, -1.2, st, { lw: 1 });
      /* kebori: eight combed strands of hair sweeping up from the brow between the horns, each a hair's width apart, swaying together */
      for (var hi = 0; hi < 8; hi++) {
        var hx0 = 77 + hi * 6.6, hm = hi - 3.5, hs = sin(t * 0.0017 + hi * 0.45) * 1.1;
        G.cut(c, [[hx0, 68 - abs(hm) * 1.3], [hx0 + hm * 0.8 + hs * 0.4, 56 - abs(hm) * 0.8], [hx0 + hm * 1.7 + hs * 0.8, 46 + abs(hm) * 1.2], [hx0 + hm * 2.6 + hs, 36 + abs(hm) * 2.8]], st, 0.8, { glint: hi % 2 === 0 });
      }
      /* horns */
      G.part(c, [[62, 50], [52, 30], [56, 12, 1], [66, 28], [74, 46]], st, { lw: 1.2, seed: 114, shineAt: sh });
      G.part(c, [[138, 50], [148, 30], [144, 12, 1], [134, 28], [126, 46]], st, { lw: 1.2, seed: 115, shineAt: sh });
      /* heavy brows dropping inward, knotted with creases; they twitch every five seconds */
      G.part(c, [[60, 68 - tw, 1], [78, 70 - tw], [98, 84 - tw * 0.4, 1], [96, 95, 1], [80, 85], [62, 79]], st, { lw: 1.5, seed: 116, shineAt: sh });
      G.part(c, [[140, 68 - tw2, 1], [122, 70 - tw2], [102, 84 - tw2 * 0.4, 1], [104, 95, 1], [120, 85], [138, 79]], st, { lw: 1.5, seed: 117, shineAt: sh });
      G.cut(c, [[84, 76 - tw], [90, 82], [92, 88]], st, 0.9); G.cut(c, [[78, 74 - tw], [84, 80]], st, 0.8);
      G.cut(c, [[116, 76 - tw2], [110, 82], [108, 88]], st, 0.9); G.cut(c, [[122, 74 - tw2], [116, 80]], st, 0.8);
      /* glaring eyes, the pupils turned in, a flat heavy lid, no sparkle */
      goggle(c, 79, 98, 9 + pop, st, { white: "#d9dde0", pupil: "#14181c", pr: 0.38, squint: 0.35, slant: 0.5, look: [cross * 0.8 + rollL[0] * 0.3 * (1 - e2), 0.2 + rollL[1] * 0.4], blink: blink(t, 9) });
      goggle(c, 121, 98, 9 + pop, st, { white: "#d9dde0", pupil: "#14181c", pr: 0.38, squint: 0.35, slant: -0.5, look: [-cross * 0.8 + rollR[0] * 0.3 * (1 - e2), 0.2 + rollR[1] * 0.4], blink: blink(t + 40, 9) });
      /* cheekbone planes with hard corners, chisel facets */
      [0, 1].forEach(function (k) {
        var F = function (a) { return k ? mirror(a, 100) : a; };
        G.part(c, F([[58, 108, 1], [78, 116, 1], [68, 132, 1]]), st, { lw: 1, steps: 1, seed: 118 + k, shineAt: sh, pits: false });
        G.part(c, F([[44, 116, 1], [58, 108, 1], [68, 132, 1], [50, 128, 1]]), st, { lw: 1, steps: 1, seed: 120 + k, shineAt: sh, base: G.mix(st.base, st.dark, 0.25), pits: false });
        G.cut(c, F([[58, 108], [66, 120], [68, 132]]), st, 0.8, { glint: 1 });
      });
      /* the nose: a narrow bridge between the eyes that flares into two round lobed wings, a small scroll cut in each, nothing hanging below */
      G.part(c, [[94, 100, 1], [106, 100, 1], [109, 112], [116, 121], [100, 125], [84, 121], [91, 112]], st, { lw: 1.3, round: 0.7, seed: 120, shineAt: sh });
      [[86, 122, -1], [114, 122, 1]].forEach(function (W, k) {
        G.part(c, circ(W[0], W[1], 7.2, 8, 0.05), st, { lw: 1.2, round: 0.8, seed: 123 + k, shineAt: sh, pits: false });
        var sp = [], i; for (i = 0; i < 14; i++) { var a = (k ? PI : 0) + W[2] * -i * 0.62 + 0.5; sp.push([W[0] + cos(a) * (4.6 - i * 0.28), W[1] - 1.2 + sin(a) * (4.6 - i * 0.28)]); }
        G.cut(c, sp, st, 0.8, { glint: 1 });
        G.hollow(c, circ(W[0] + W[2] * 1.6, W[1] + 3.6, 1.7, 6, 0.1), st, { deep: 1 });
      });
      G.cut(c, [[84, 108], [68, 126], [60, 148]], st, 1.3); G.cut(c, [[116, 108], [132, 126], [140, 148]], st, 1.3);
      /* the beard: combed, six short cuts hanging under the mouth and a scroll curling out at each corner */
      for (var bc = 0; bc < 6; bc++) G.cut(c, [[72 + bc * 11.2, 181 - abs(bc - 2.5) * 0.8], [72 + bc * 11.2 + (bc - 2.5) * 1.4 + sin(t * 0.0019 + bc) * 0.7, 190], [72 + bc * 11.2 + (bc - 2.5) * 2.4, 198]], st, 0.9, { glint: bc % 2 === 0 });
      [0, 1].forEach(function (k) {
        var vb = volute(k ? 124 : 76, 181, PI / 2 + (k ? 0.5 : -0.5), 24, k ? -4.6 : 4.6, 3.4, 1, 12).map(function (p) { return [p[0], p[1], p[2]]; });
        G.part(c, ribbon(vb, 2), st, { lw: 1, steps: 1, seed: 125 + k, pits: false, shineAt: sh });
      });
      /* the grin, the lip raised: eight teeth above, two long tusks over the lower lip, six below, a red tongue that comes out on a tap */
      G.hollow(c, [[52, 148, 1], [100, 152], [148, 148, 1], [138, 174], [100, 182], [62, 174]], st, { deep: 1 });
      G.part(c, [[76, 166], [100, 170], [124, 166], [120, 176], [100, 180 + e2 * 16], [80, 176]], rd, { lw: 1, round: 0.6, pits: false, seed: 121 });
      G.teeth(c, [[56, 150], [100, 154], [144, 150]], 8, 6, 1, st, { col: "#d9dde1", fangs: [1, 6] });
      G.teeth(c, [[70, 172], [100, 178], [130, 172]], 6, 4, -1, st, { col: "#d9dde1" });
      /* cheek whiskers */
      for (var w = 0; w < 3; w++) { curl(c, 44, 128 + w * 5, PI + 0.1 + w * 0.22 + sin(t * 0.002 + w) * 0.05, 22 - w * 3, 3.2, 1.0, st, { lw: 0.8 }); curl(c, 156, 128 + w * 5, -0.1 - w * 0.22 + sin(t * 0.002 + w + 1) * 0.05, 22 - w * 3, 3.2, -1.0, st, { lw: 0.8 }); }
      /* a swallow lands on the left horn every eight seconds, shifts, preens and goes */
      var sw8 = frac(t / 8000);
      if (sw8 > 0.08 && sw8 < 0.62 && !sil) {
        var sx2, sy2, wing = 0, tilt = 0, a8 = (sw8 - 0.08) / 0.54;
        if (a8 < 0.2) { var u2 = a8 / 0.2, ue = 1 - (1 - u2) * (1 - u2); sx2 = G.lerp(-34, 56, ue); sy2 = G.lerp(-22, 4, ue) - sin(u2 * PI) * 10; wing = sin(a8 * 160); tilt = 0.5 * (1 - ue); }
        else if (a8 < 0.8) { var pp = (a8 - 0.2) / 0.6; sx2 = 56; sy2 = 4; tilt = (pp > 0.3 && pp < 0.45 ? sin((pp - 0.3) / 0.15 * PI) * -0.25 : 0) + (pp > 0.6 && pp < 0.72 ? sin((pp - 0.6) / 0.12 * PI) * 0.2 : 0); }
        else { var v2 = (a8 - 0.8) / 0.2; sx2 = G.lerp(56, 150, v2 * v2); sy2 = 4 - v2 * 38 - sin(v2 * PI) * 5; wing = sin(a8 * 160); tilt = -0.35 * v2; }
        c.save(); c.translate(sx2, sy2); c.rotate(tilt); c.scale(1.25, 1.25);
        var flt = abs(wing) > 0.01, nv = { base: "#1f2b49", light: "#5a76b8", dark: "#0b1226", ink: "#050810", pit: null };
        nub(c, [[-6, -0.5, 1], [-14, 3 - (flt ? 5 : 0) , 1], [-9, 1.2, 1]], nv, { lw: 0.5, steps: 1 }); nub(c, [[-6, 1, 1], [-14, 4.6, 1], [-8, 2.2, 1]], nv, { lw: 0.5, steps: 1 });
        nub(c, [[-6, -2.4], [0, -4.2], [6, -3.4], [8, -0.6], [4, 2.2], [-3, 2.4]], nv, { lw: 0.8 });
        nub(c, [[1, 0.2], [6, 0.4], [4, 3.2], [-1, 2.8]], { base: "#efe3c6", light: "#fff8e6", dark: "#b8a888", ink: "#3a3220", pit: null }, { lw: 0.5 });
        if (flt) nub(c, [[-2, -2.6, 1], [-4 + wing * 2, -12 * wing - 4, 1], [3, -2.8, 1]], nv, { lw: 0.5, steps: 1 }); else nub(c, [[-4, -2.4, 1], [-12, -0.6, 1], [-3, 0.2, 1]], nv, { lw: 0.5, steps: 1 });
        nub(c, [[7, -3.2], [10, -2.6], [10.2, -0.6], [7.4, 0.2]], nv, { lw: 0.6 }); nub(c, [[10, -2], [12.6, -1.4], [10, -0.6]], { base: "#e7b84a", light: "#ffe08a", dark: "#8a6a1a", ink: "#3a2a08", pit: null }, { lw: 0.4, steps: 1 });
        G.dot(c, 8.6, -2.4, 0.6, "#ffffff");
        if (!flt) { G.cut(c, [[0, 2.4], [0, 5]], nv, 0.6); G.cut(c, [[3, 2.4], [3, 5]], nv, 0.6); }
        c.restore();
      }
      /* smoke from each nostril every three seconds; on a tap the nostrils jet puffs sideways and dust falls from the eave */
      puff(c, 86, 129, t, 3000, 0, { dx: -0.35, dy: -0.4, rise: 24, col: "#e3e6e9", r: 2.4 }); puff(c, 114, 129, t, 3000, 1.5, { dx: 0.35, dy: -0.4, rise: 24, col: "#e3e6e9", r: 2.4 });
      if (q >= 0 && q < 1500 && !sil) {
        for (var side = -1; side <= 1; side += 2) for (var k = 0; k < 5; k++) {
          var u = (q - k * 90) / 900; if (u <= 0 || u >= 1) continue;
          c.fillStyle = G.rgba("#e3e6e9", 0.6 * (1 - u)); c.beginPath(); c.arc(100 + side * (16 + u * 52), 126 + sin(u * PI) * -6 + u * 8, 2.6 + u * 5, 0, 7); c.fill();
        }
        var dr = G.rng(122);
        for (var d = 0; d < 7; d++) { var du = (q - 40 - d * 90) / 1100; if (du <= 0 || du >= 1) continue; c.fillStyle = G.rgba("#9aa0a6", 0.85 * (1 - du)); c.fillRect(14 + dr() * 172, 14 + du * du * 120 * (0.6 + dr() * 0.5), 1.3, 1.3); }
      }
      c.restore();
      /* cherry petals drifting down across the whole tile, each on its own slow fall and sway, always some in the air */
      if (!sil) for (var pe = 0; pe < 6; pe++) {
        var pph = frac((t + pe * 1130) / (6200 + pe * 640)), ppx = 14 + ((pe * 61) % 170) + 26 * sin(pph * 9 + pe) + pph * 18, ppy = -8 + pph * 214;
        c.save(); c.translate(ppx, ppy); c.rotate(pph * 9 + pe); c.scale(1 + 0.4 * sin(pph * 17 + pe), 1);
        nub(c, [[0, -3.4], [2.4, -1.4], [1.8, 2.6], [0, 1.6], [-1.8, 2.6], [-2.4, -1.4]], { base: "#f4bccb", light: "#ffe4ec", dark: "#cf7893", ink: "#93405b", pit: null }, { lw: 0.5 });
        c.restore();
      }
      c.restore();
    } };

  /* ---------------------------------------------------------------- shachihoko */
  B.shachi = { stone: "gold", spout: false,
    draw: function (c, s) {
      var st = S.gold, rd = S.red, t = s.t, e = env(s, 1400), q = s.poke == null ? -1 : s.poke, sil = !!G.sil;
      var jaw = 0.26 + 0.24 * e, wv = q >= 0 && q < 1400 ? 1 : 0;
      /* a mirror-gold reflection: a warm brown band laid over the metal, sliding with the glint */
      function warm(y) { return function (cc, bb) { var g = cc.createLinearGradient(bb[0], bb[1], bb[2], bb[3]), a = sweep(t, y, 7400) - 0.25; g.addColorStop(G.clamp(a, 0, 1), "rgba(122,63,8,0)"); g.addColorStop(G.clamp(a + 0.12, 0, 1), "rgba(122,63,8,.34)"); g.addColorStop(G.clamp(a + 0.3, 0, 1), "rgba(122,63,8,0)"); cc.fillStyle = g; cc.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]); }; }

      /* the roof ridge it stands on: grey kawara tile ends in rows under a white plaster line */
      G.part(c, [[0, 181, 1], [200, 181, 1], [200, 200, 1], [0, 200, 1]], S.clay, { lw: 1.2, steps: 1, seed: 121,
        paint: function (cc) {
          cc.strokeStyle = G.rgba(S.clay.ink, 0.55); cc.lineWidth = 0.9;
          for (var r = 0; r < 3; r++) for (var x = -(r % 2) * 7; x < 210; x += 14) { cc.beginPath(); cc.arc(x + 7, 186 + r * 6.5, 6.4, 0, PI); cc.stroke(); }
        } });
      G.part(c, [[0, 179, 1], [200, 179, 1], [200, 183.5, 1], [0, 183.5, 1]], S.white, { lw: 0.9, steps: 1, pits: false });

      /* the spine: head low at the ridge, the carp's body arching up and over, the tail flung forward; a wave runs up it on a tap */
      var base = [[146, 152, 8], [128, 138, 17], [96, 122, 21], [68, 98, 20], [56, 68, 18], [64, 40, 15], [88, 20, 11], [114, 14, 7]];
      var sp = base.map(function (b, i) {
        var a = base[Math.max(i - 1, 0)], z = base[Math.min(i + 1, base.length - 1)], dx = z[0] - a[0], dy = z[1] - a[1], d = Math.hypot(dx, dy) || 1;
        var w = wv ? 3.4 * e * sin(i * 1.15 - q * 0.011) * (i / 7) : 0;
        return [b[0] - dy / d * w, b[1] + dx / d * w, b[2]];
      });
      var dense = densify(sp, 8), tail = sp[sp.length - 1], fx = tail[0] + 4, fy = tail[1];

      /* the fluke, flung up and curling forward over the head: a fan of five lobes with ribs */
      var flex = sin(t * 0.002) * 0.05 + (wv ? 0.22 * e * sin(-q * 0.011 + 0.5) : 0);
      rot(c, fx, fy, flex, function () {
        var ax = 0.5, ang = [-1.0, -0.5, 0, 0.5, 1.05], len = [30, 42, 50, 43, 30], pts = [[fx - 6, fy + 5, 1]], i;
        for (i = 0; i < 5; i++) {
          var tipA = ax + ang[i];
          pts.push([fx + cos(tipA) * len[i], fy + sin(tipA) * len[i]]);
          if (i < 4) { var vA = ax + (ang[i] + ang[i + 1]) / 2; pts.push([fx + cos(vA) * len[i] * 0.55, fy + sin(vA) * len[i] * 0.55]); }
        }
        pts.push([fx - 4, fy - 6, 1]);
        G.part(c, pts, st, { lw: 1.3, steps: 4, shineAt: sweep(t, 20), seed: 122, paint: warm(20) });
        for (i = 0; i < 5; i++) G.cut(c, [[fx, fy], [fx + cos(ax + ang[i]) * len[i] * 0.55, fy + sin(ax + ang[i]) * len[i] * 0.55], [fx + cos(ax + ang[i]) * len[i] * 0.88, fy + sin(ax + ang[i]) * len[i] * 0.88]], st, 0.75, { glint: 1 });
      });

      /* the pectorals, as on the Nagoya pair: each a fan of seven ribs on a gold sphere. fan(root, angle, length, which) */
      var fan = function (rt, fa, ln, sd, behind) {
        var pts = [[rt[0] + cos(fa - 1.7) * 3, rt[1] + sin(fa - 1.7) * 3, 1]], i, nr = 7, ang = function (j) { return fa + (j - 3) * 0.25; }, rl = function (j) { return ln * (0.72 + 0.28 * (1 - abs(j - 3) / 3)); };
        for (i = 0; i < nr; i++) {
          pts.push([rt[0] + cos(ang(i)) * rl(i), rt[1] + sin(ang(i)) * rl(i)]);
          if (i < nr - 1) { var va = (ang(i) + ang(i + 1)) / 2; pts.push([rt[0] + cos(va) * Math.min(rl(i), rl(i + 1)) * 0.8, rt[1] + sin(va) * Math.min(rl(i), rl(i + 1)) * 0.8]); }
        }
        pts.push([rt[0] + cos(fa + 1.7) * 3, rt[1] + sin(fa + 1.7) * 3, 1]);
        G.part(c, pts, st, { lw: 1.2, steps: 4, shineAt: sweep(t, 140 + sd * 20), seed: 124 + sd, paint: warm(rt[1]) });
        for (i = 0; i < nr; i++) G.cut(c, [[rt[0], rt[1]], [rt[0] + cos(ang(i)) * rl(i) * 0.55, rt[1] + sin(ang(i)) * rl(i) * 0.55], [rt[0] + cos(ang(i)) * rl(i) * 0.9, rt[1] + sin(ang(i)) * rl(i) * 0.9]], st, 0.7, { glint: 1 });
        if (!behind) G.part(c, circ(rt[0], rt[1], 5.2, 8, 0.02), st, { lw: 1.2, round: 1, pits: false, shineAt: sweep(t, rt[1], 5200) });
      };
      var fb = dense[10], fa2 = -1.15 + sin(t * 0.0021) * 0.05 + (wv ? 0.2 * e * sin(-q * 0.011 + 1) : 0);
      fan(fb, fa2, 33, 1, true);                                   /* the far one, peeking out behind the neck */
      /* dorsal spikes, normal to the outer arch, sixteen down to eight */
      for (var d = 0; d < 7; d++) {
        var di = 5 + d * 5, pp = dense[di], pa = dense[di - 1], pz = dense[di + 1], tx = pz[0] - pa[0], ty = pz[1] - pa[1], tl = Math.hypot(tx, ty) || 1;
        var nx = ty / tl, ny = -tx / tl;                                           /* toward the outside of the arch */
        var wavy = sin(t * 0.0021 - d * 0.8) * 0.07;
        G.lock(c, pp[0] + nx * (pp[2] - 3), pp[1] + ny * (pp[2] - 3), Math.atan2(ny, nx) + 0.35 + wavy, 26 - d * 2.1, 5.6 - d * 0.4, 0.7, st, { lw: 0.9 });
      }
      /* the body, swept along the spine; large rounded scales in offset rows */
      G.part(c, ribbon(sp, 6), st, { lw: 1.7, steps: 1, round: 0.6, shineAt: sweep(t, 80), seed: 123,
        paint: function (cc, bb) {
          warm(70)(cc, bb);
          var acc = 0, row = 0, prev = dense[8];
          for (var i = 9; i < dense.length - 4; i++) {
            var pt = dense[i], dd = Math.hypot(pt[0] - prev[0], pt[1] - prev[1]); acc += dd; prev = pt;
            if (acc < 10.5) continue; acc = 0; row++;
            var a = dense[i - 1], z = dense[i + 1], ang = Math.atan2(z[1] - a[1], z[0] - a[0]), nx = -sin(ang), ny = cos(ang), n = pt[2] > 15 ? 3 : 2;
            for (var k = 0; k < n; k++) {
              var o = ((k - (n - 1) / 2) + (row % 2 ? 0.5 : 0)) * 12.4, cx = pt[0] + nx * o, cy = pt[1] + ny * o;
              if (abs(o) > pt[2] - 2) continue;
              cc.strokeStyle = G.rgba(st.dark, 0.7); cc.lineWidth = 1; cc.beginPath(); cc.arc(cx, cy, 7, ang - 1.35, ang + 1.35); cc.stroke();
              cc.strokeStyle = G.rgba(st.dark, 0.45); cc.lineWidth = 0.8; cc.beginPath(); cc.arc(cx, cy, 3.8, ang - 1.2, ang + 1.2); cc.stroke();
              cc.strokeStyle = G.rgba("#fff6c0", 0.55); cc.lineWidth = 0.8; cc.beginPath(); cc.arc(cx - 0.7, cy - 0.7, 7, ang - 1.0, ang - 0.2); cc.stroke();
            }
          }
        } });
      /* the near pectoral: rooted far back on the belly, it sweeps forward and up into the curve of the arch, a gold sphere at its root */
      var pb = dense[22], fa = -0.62 + sin(t * 0.0019) * 0.05 + (wv ? 0.2 * e * sin(-q * 0.011 + 3) : 0);
      fan(pb, fa, 40, 0, false);

      /* the mane of eight flame locks streaming back along the neck */
      for (var mn = 0; mn < 8; mn++) curl(c, 146 - mn * 4.6, 128 - mn * 1.4, -2.55 - mn * 0.04 + sin(t * 0.0023 - mn * 0.7) * 0.1 + wv * 0.15 * e * sin(mn), 24 - mn * 1.4, 4.6 - mn * 0.2, 1.1, st, { lw: 0.9 });

      /* the head, tiger and dragon: flame brow, a goggle eye, an upturned snout, open jaws, fangs, a tongue, barbels */
      /* the head is a seventh larger, standing on the ridge */
      c.save(); c.translate(160, 168); c.scale(1.15, 1.15); c.translate(-160, -168);
      var wob = sin(t * 0.0021);
      G.part(c, [[128, 144], [132, 130], [146, 124], [164, 126], [180, 132], [190, 140], [192, 150], [184, 154], [168, 156], [150, 159], [134, 158]], st, { lw: 1.7, round: 0.8, seed: 125, shineAt: sweep(t, 140), paint: warm(140) });
      if (!sil) { c.fillStyle = G.mix(st.ink, st.dark, 0.2); G.trace(c, G.sp([[148, 156, 1], [188, 152, 1], [192, 168], [172, 184], [150, 174]], true, 5), true); c.fill(); }
      G.hollow(c, [[148, 156, 1], [188, 152, 1], [192, 168], [172, 184], [150, 174]], st, { deep: 1 });
      rot(c, 146, 160, jaw, function () {
        G.part(c, [[132, 160], [156, 161], [178, 158], [188, 160], [186, 168], [172, 175], [148, 176], [134, 172]], st, { lw: 1.5, round: 0.6, seed: 126, shineAt: sweep(t, 168) });
        G.teeth(c, [[156, 161], [170, 160], [186, 160]], 4, 4.4, -1, st, { col: "#fff8e0", fangs: [3] });
        G.part(c, ribbon([[152, 162, 3.4], [168, 162, 3.6], [180, 161 - jaw * 4, 3]], 3), rd, { lw: 0.9, steps: 1, pits: false, seed: 127 });
      });
      G.teeth(c, [[154, 156], [170, 155], [186, 153]], 4, 5, 1, st, { col: "#fff8e0", fangs: [0, 3] });
      G.cut(c, [[150, 150], [166, 146], [182, 140]], st, 1.1, { glint: 1 });
      var nsp = [], nq; for (nq = 0; nq <= 14; nq++) nsp.push([187.4 + cos(0.4 + nq * 0.6) * (4.6 - nq * 0.26), 144.2 + sin(0.4 + nq * 0.6) * (4.6 - nq * 0.26)]);
      G.cut(c, nsp, st, 0.9, { glint: 1 });
      G.part(c, [[140, 126], [150, 116], [160, 118], [168, 124], [156, 124], [146, 130]], st, { lw: 1.2, round: 0.5, seed: 128, shineAt: sweep(t, 122) });
      curl(c, 148, 118, -2.0 + wob * 0.06, 20, 4.4, 1.2, st, { lw: 0.9 }); curl(c, 158, 116, -1.6 + wob * 0.06, 18, 4, 1.2, st, { lw: 0.9 });
      goggle(c, 156, 138, 6, st, { white: "#fff7d0", iris: "#7a4a08", pupil: "#2a1400", pr: 0.3, squint: 0.2, slant: 0.2, blink: blink(t, 10), look: [0.6, 0.3] });
      G.part(c, circ(142, 132, 5, 6, 0.06), st, { lw: 1, round: 0.6, pits: false, shineAt: sweep(t, 132) });
      /* two long wavy barbels from the snout, rippling */
      [[0, 190, 140, -0.9], [1, 188, 146, -0.45]].forEach(function (B2) {
        var bp = [], i, a = B2[3];
        for (i = 0; i < 9; i++) { var u = i / 8; bp.push([B2[1] + cos(a - u * 1.1) * u * 38 + sin(u * 9 - t * 0.004 + B2[0]) * 3.2 * u, B2[2] + sin(a - u * 1.1) * u * 38 + cos(u * 9 - t * 0.004 + B2[0]) * 2.4 * u]); }
        G.cut(c, bp, st, 2.4, { col: st.dark }); G.cut(c, bp, st, 1.1, { col: st.light });
      });
      c.restore();

      /* the water charm: a bead at the lip every two seconds, and on a tap ten drops thrown to the ridge */
      drip(c, 186.6, 168 + 41 * sin(jaw), t, 2000, 0, 14, "#9cc8f0");
      if (q >= 0 && q < 1300 && !sil) {
        var dr = G.rng(129);
        for (var w = 0; w < 10; w++) {
          var tt = q - 40 - w * 55, vx = -0.01 + dr() * 0.09, vy = -0.13 - dr() * 0.07, x2 = 188 + vx * tt, y2 = 164 + vy * tt + 0.5 * 0.00055 * tt * tt;
          if (tt < 0) continue;
          if (y2 > 179) { var g = G.clamp((y2 - 179) / 6, 0, 1); if (tt > 1100) continue; c.strokeStyle = G.rgba("#dcecff", 0.7 * (1 - g)); c.lineWidth = 0.8; c.beginPath(); c.ellipse(x2, 180, 2 + 4 * g, 1, 0, 0, 7); c.stroke(); continue; }
          c.fillStyle = G.rgba("#9cc8f0", 0.95); c.beginPath(); c.arc(x2, y2, 1.7, 0, 7); c.fill();
        }
        /* five sparkles flash on the scales */
        for (var sk = 0; sk < 5; sk++) {
          var sp2 = dense[10 + sk * 5], su = G.clamp((q - sk * 70) / 500, 0, 1), sr = 7 * sin(PI * su);
          if (su <= 0 || su >= 1) continue;
          c.strokeStyle = G.rgba("#ffffff", 0.95); c.lineWidth = 1.1; c.beginPath(); c.moveTo(sp2[0] - sr, sp2[1]); c.lineTo(sp2[0] + sr, sp2[1]); c.moveTo(sp2[0], sp2[1] - sr); c.lineTo(sp2[0], sp2[1] + sr); c.stroke();
          c.lineWidth = 0.7; c.beginPath(); c.moveTo(sp2[0] - sr * 0.6, sp2[1] - sr * 0.6); c.lineTo(sp2[0] + sr * 0.6, sp2[1] + sr * 0.6); c.moveTo(sp2[0] - sr * 0.6, sp2[1] + sr * 0.6); c.lineTo(sp2[0] + sr * 0.6, sp2[1] - sr * 0.6); c.stroke();
        }
      }
    } };

  /* ---------------------------------------------------------------- makara spout (hiti) */
  B.makara = { stone: "basalt", spout: true, mouth: [194, 138, 1, 0.2],
    draw: function (c, s) {
      var bor = s.variant === "borobudur", st = bor ? S.andesite : S.basalt, t = s.t, e = env(s, 1400), e2 = env(s, 1800), sil = !!G.sil;
      var wet = s.rain || 0, algae = "#3b4a32", q = s.poke == null ? -1 : s.poke;
      var lt = bor ? "#e9eef0" : "#cfd8d2";
      /* the wall it comes out of: coursed blocks; the Patan one has a carved arch panel in it, the Borobudur one carries the cornice (below) */
      if (!sil) G.ashlar(c, 0, 0, 40, 200, st, { course: 16, seed: 131 });
      G.part(c, [[0, 0, 1], [40, 0, 1], [40, 200, 1], [0, 200, 1]], st, { lw: 1.2, steps: 1, seed: 131, lift: 0.5, base: "rgba(0,0,0,0)",
        paint: function (cc, bb) { dapple(cc, bb, t, 1, false); streak(cc, 30, 100, 90, 8, st, 0.3 + 0.3 * wet); streak(cc, 12, 20, 70, 6, st, 0.18, algae); } });
      if (!bor) {
        G.hollow(c, [[8, 140, 1], [8, 86], [11, 72], [20, 62], [29, 72], [32, 86], [32, 140, 1]], st, { deep: 0.3, lw: 1 });
        G.cut(c, [[12, 140, 1], [12, 87], [14.5, 76], [20, 68], [25.5, 76], [28, 87], [28, 140, 1]], st, 0.8, { glint: 1 });
        G.cut(c, [[20, 82], [20, 98]], st, 0.7); G.cut(c, [[15, 92], [25, 92]], st, 0.7);
      }

      /* the sneeze and the spring: the trunk lifts and uncurls, the jaw drops, the ear flaps twice */
      var lift = -0.21 * e + 0.05 * sin(t * PI * 2 / 3000 + 0.8), ear = q >= 0 && q < 1100 ? -0.5 * abs(sin(q * 0.0057)) * exp(-q / 900) : 0, eflap = frac(t / 4000) < 0.09 ? -0.35 * sin(frac(t / 4000) / 0.09 * PI) : 0;
      var jaw = 0.26 * e;
      var sway = sin(t * PI * 2 / 3000) * 0.42;

      if (!bor) {
        /* ONE crest swept back from the crown to the wall, a vein down it and two curls off its edge; and two small scrolls at the neck */
        var cs = sin(t * 0.0016) * 2.2, crest = [[118, 70, 9], [92, 54 + cs * 0.5, 8], [62, 50 + cs, 5], [44, 64 + cs * 1.4, 2]];
        G.part(c, ribbon(crest, 5), st, { lw: 1.4, steps: 1, round: 0.5, seed: 134 });
        G.cut(c, [[112, 68], [92, 54 + cs * 0.5], [66, 50.5 + cs]], st, 0.9, { glint: 1 }); G.cut(c, [[108, 74], [90, 62 + cs * 0.4], [66, 55 + cs], [50, 63 + cs]], st, 0.7);
        G.cut(c, [[100, 61], [86, 52 + cs * 0.5], [70, 48 + cs]], st, 0.6); G.cut(c, [[84, 60], [70, 56 + cs * 0.8], [56, 58 + cs]], st, 0.6);
        curl(c, 80, 50 + cs * 0.6, -2.5 + sin(t * 0.0016 + 1) * 0.06, 24, 5.2, -1.3, st, { lw: 0.9 }); curl(c, 58, 52 + cs, -2.9 + sin(t * 0.0016 + 2) * 0.06, 16, 4, -1.3, st, { lw: 0.9 });
        /* the hooded bird of the Patan spout, on the crown: a ribbed hood, a swan's neck rising out of it, a hooked beak turned toward the water */
        var bb2 = sin(t * 0.0021) * 0.5;
        c.save(); c.translate(0, bb2);
        G.part(c, [[92, 72, 1], [91, 58], [95, 47], [104, 41], [111, 48], [114, 62], [115, 74, 1]], st, { lw: 1.2, seed: 138, base: G.mix(st.base, st.dark, 0.1) });
        for (var hr = 0; hr < 4; hr++) G.cut(c, [[96 + hr * 3.8, 70], [97 + hr * 3.3, 60], [101 + hr * 2.6, 50]], st, 0.6);
        G.part(c, ribbon([[100, 72, 5.4], [103, 61, 4.4], [100, 51, 3.6], [105, 44, 3.2]], 4), st, { lw: 1.2, steps: 1, round: 0.6, seed: 139, pits: false });
        G.part(c, circ(108.5, 41, 4.6, 7, 0.05), st, { lw: 1, round: 0.8, pits: false });
        nub(c, [[111.6, 39.2], [120.5, 42.4], [116, 46.8], [111.4, 44.8]], st, { lw: 0.8 });
        G.dot(c, 107.2, 40, 1.5, st.light); G.dot(c, 107.5, 40.2, 0.7, st.ink);
        c.restore();
        curl(c, 46, 100, PI + 0.3, 20, 5, 1.4, st, { lw: 0.9 }); curl(c, 46, 112, PI - 0.2, 16, 4, -1.4, st, { lw: 0.9 });
        /* the trunk: one thick part that tapers and curls up and back into a spiral, a nostril hollow at the tip */
        rot(c, 126, 84, lift, function () {
          var vs = volute(122, 84, 0.12, 100, -(5.6 - 1.9 * e) + sway, 11, 4.4, 22), tp = vs[vs.length - 1];
          G.part(c, ribbon(vs, 2), st, { lw: 1.7, steps: 1, round: 0.6, seed: 136,
            paint: function (cc) { streak(cc, 150, 92, 20, 8, st, 0.16, algae); } });
          G.cut(c, vs.slice(0, 12).map(function (v) { return [v[0], v[1] - 4]; }), st, 1, { glint: 1 });
          G.hollow(c, [[tp[0] - 2.5, tp[1] - 1.5], [tp[0] + 2, tp[1] - 2.5], [tp[0] + 2.5, tp[1] + 1.5], [tp[0] - 1.5, tp[1] + 2.5]], st, { deep: 1 });
        });
        /* the head: skull, brow and the crocodile's long upper face */
        G.part(c, [[40, 82], [46, 74], [62, 66], [90, 62], [112, 68], [130, 78], [146, 92], [152, 104], [148, 114], [120, 118], [96, 118], [70, 116], [48, 112], [40, 106]], st, { lw: 1.7, round: 0.7, seed: 132,
          paint: function (cc, bb) { sheen(cc, bb, t, st, 70, 0.2); dapple(cc, bb, t, 2, false); streak(cc, 118, 96, 26, 6, st, 0.22 + 0.3 * wet); streak(cc, 70, 100, 18, 9, st, 0.2, algae); streak(cc, 100, 108, 12, 14, st, 0.14, algae); } });
        G.part(c, [[100, 76], [114, 70], [132, 76], [134, 82], [118, 80], [102, 84]], st, { lw: 1.2, round: 0.5, seed: 134 });
        for (var rw = 0; rw < 3; rw++) for (var sc = 0; sc < 5; sc++) G.cut(c, [[56 + sc * 9 + (rw % 2) * 4.5, 94 + rw * 7], [60 + sc * 9 + (rw % 2) * 4.5, 99 + rw * 7], [64 + sc * 9 + (rw % 2) * 4.5, 94 + rw * 7]], st, 0.7);
        G.cut(c, [[92, 70], [104, 66], [122, 72]], st, 1.4, { glint: 1 });
        /* the boar's ear, a leaf that flaps */
        rot(c, 94, 76, ear + eflap, function () { G.leaf(c, 94, 76, -1.95, 26, 8.5, 2, st, { lw: 1.1 }); });
        goggle(c, 116, 88, 8, st, { white: "#d6d2c4", pr: 0.4, squint: 0.3, slant: 0.2, blink: Math.max(blink(t, 11), 0.9 * G.clamp(e * 2 - 0.6, 0, 1)), look: [0.7, 0.1] });
        /* the mouth: a rolled upper lip over five teeth, the boar's tusk curving up beside it */
        G.hollow(c, [[96, 119, 1], [180, 117, 1], [190, 130, 1], [150, 138], [100, 134]], st, { deep: 1 });
        G.part(c, [[94, 116], [128, 113], [158, 111], [182, 114], [184, 120], [160, 122], [130, 122], [98, 122]], st, { lw: 1.4, round: 0.4, seed: 135 });
        G.teeth(c, [[104, 122], [138, 123], [176, 121]], 5, 5, 1, st, { fangs: [4] });
        nub(c, [[148, 120], [156, 111], [166, 103], [174, 99, 1], [172, 107], [164, 115], [157, 122]], S.grey, { lw: 0.9, base: "#d9d3c2" });
        /* the lower jaw: the crocodile's, deep at the hinge and short at the tip, a groove along its top that widens to the lip */
        rot(c, 104, 128, jaw, function () {
          G.part(c, [[72, 124], [96, 127], [130, 131], [160, 133], [182, 135], [194, 138, 1], [190, 144], [168, 146], [140, 150], [110, 154], [84, 150], [70, 140]], st, { lw: 1.5, round: 0.4, seed: 133,
            paint: function (cc, bb) { dapple(cc, bb, t, 3, false); streak(cc, 188, 140, 40, 8, st, 0.24 + 0.3 * wet, lt); streak(cc, 120, 150, 30, 12, st, 0.16, algae); } });
          G.teeth(c, [[104, 130], [140, 133], [178, 135]], 5, 4.4, -1, st, { fangs: [2] });
          G.cut(c, [[96, 141], [130, 142], [166, 142]], st, 0.9); G.cut(c, [[84, 134], [92, 148]], st, 0.8);
          G.cut(c, [[120, 136], [160, 137], [194, 139]], st, 1.1, { glint: 1 });
          /* the spring runs along the groove toward the spout whether a jet is thrown or not */
          if (!sil) for (var d = 0; d < 5; d++) {
            var f = frac(t * 0.04 / 74 + d / 5), dx = 120 + f * 74, dy = 136 + f * 3;
            c.strokeStyle = G.rgba("#e8f4ff", 0.9 * Math.min(1, f * 5) * (0.5 + 0.5 * f)); c.lineWidth = 2.2; c.lineCap = "round"; c.beginPath(); c.moveTo(dx - 8, dy - 0.3); c.lineTo(dx, dy); c.stroke();
          }
        });
      } else {
        /* the Borobudur jaladwara, drawn again from the ground up: a rounder head, shorter and taller than the Patan one, its mouth held open on a dark
           throat, a round eye in a raised ring under a brow of leaf-scrolls, one great nostril bulb on the snout, a spool ear; the lower lip is a scoop that
           runs out to a pointed spout tip, and the stepped cornice sits on the wall where it belongs */
        var lichen = function (cc, bb) {
          sheen(cc, bb, t, st, 80, 0.3); dapple(cc, bb, t, 4, false);
          var lr = G.rng(137); cc.fillStyle = G.rgba(algae, 0.25);
          for (var i = 0; i < 7; i++) { cc.beginPath(); cc.ellipse(50 + lr() * 100, 70 + lr() * 50, 4 + lr() * 8, 3 + lr() * 4, lr(), 0, 7); cc.fill(); }
        };
        G.part(c, [[0, 22, 1], [46, 22, 1], [46, 32, 1], [0, 32, 1]], st, { lw: 1.3, steps: 1, seed: 138, paint: lichen });
        G.part(c, [[0, 32, 1], [42, 32, 1], [42, 42, 1], [0, 42, 1]], st, { lw: 1.3, steps: 1, seed: 139, paint: lichen });
        G.cut(c, [[2, 27], [44, 27]], st, 0.8, { glint: 1 });
        /* the head, its lower edge rising toward the snout to leave the gape */
        G.part(c, [[52, 104], [54, 88], [64, 74], [82, 66], [106, 66], [128, 71], [146, 82], [156, 97], [155, 108], [142, 114], [118, 118], [94, 124], [68, 124], [54, 116]], st, { lw: 1.7, round: 0.7, seed: 141,
          paint: function (cc, bb) { lichen(cc, bb); streak(cc, 146, 108, 24, 8, st, 0.16 + 0.3 * wet, lt); streak(cc, 72, 110, 18, 12, st, 0.14, algae); } });
        G.cut(c, [[60, 84], [72, 74], [90, 69]], st, 1.1, { glint: 1 });
        /* chisel planes on the brow and a ruyi scroll on the cheek, so the big round head is carved and not turned */
        G.cut(c, [[84, 74], [96, 71], [104, 72]], st, 0.8); G.cut(c, [[128, 78], [138, 84], [142, 94]], st, 0.9, { glint: 1 });
        var chs = [], cq; for (cq = 0; cq < 16; cq++) chs.push([99 + cos(cq * 0.7) * (0.8 + cq * 0.42), 108 + sin(cq * 0.7) * (0.8 + cq * 0.42)]);
        G.cut(c, chs, st, 0.9, { glint: 1 }); G.cut(c, [[88, 118], [110, 116], [132, 112]], st, 0.8);
        /* the eye: a raised ring, and over it a brow of five leaf-scrolls of five sizes */
        G.part(c, circ(110, 91, 16.4, 10, 0.03), st, { lw: 1.3, round: 0.9, seed: 142, pits: false });
        for (var bw = 0; bw < 5; bw++) {
          var ba = -PI / 2 + (bw - 2) * 0.54, bl = [11, 17, 14, 19, 12][bw], bwd = [3.4, 4.6, 4, 4.8, 3.4][bw];
          curl(c, 110 + cos(ba) * 14.4, 91 + sin(ba) * 14.4, ba + sin(t * 0.0019 + bw * 1.3) * 0.05, bl, bwd, bw < 2 ? -1.25 : bw > 2 ? 1.25 : 1.0, st, { lw: 0.9 });
        }
        goggle(c, 110, 91, 11, st, { white: "#cfcbbc", pr: 0.4, squint: 0.18, slant: 0.1, blink: Math.max(blink(t, 11), 0.9 * G.clamp(e * 2 - 0.6, 0, 1)), look: [0.7, 0.1] });
        /* the snout and its one big round nostril, which breathes and flares on the sneeze */
        var nf = 1 + 0.12 * sin(t * 0.0021) + 0.3 * e;
        G.part(c, circ(147, 91, 10.6, 9, 0.05), st, { lw: 1.4, round: 1, seed: 143 });
        G.hollow(c, circ(148.6, 91.4, 5.8 * nf, 8, 0.06), st, { deep: 1 });
        G.cut(c, [[136, 100], [141, 106], [150, 104]], st, 0.8); G.cut(c, [[133, 90], [136, 84], [142, 80.4]], st, 0.8, { glint: 1 });
        /* a gecko climbs the wall every nine seconds, up past the cornice and out of the top, its head bobbing as it goes */
        var gk9 = (frac(t / 9000) - 0.1) / 0.62;
        if (gk9 > 0 && gk9 < 1 && !sil) {
          var gu = G.ease(gk9 * 0.9 + 0.05) * 1.05 - 0.025;
          lizard(c, 19 + 7 * sin(gk9 * 11), G.lerp(190, -16, G.clamp(gu, 0, 1)), -PI / 2 + 0.2 * sin(gk9 * 11 + 1), gk9 * 95, 1.15);
        }
        /* and a second comes down again in the last third, head first, in no hurry */
        var gd9 = (frac(t / 9000) - 0.62) / 0.36;
        if (gd9 > 0 && gd9 < 1 && !sil) lizard(c, 29 + 6 * sin(gd9 * 8), G.lerp(-16, 190, G.ease(gd9)), PI / 2 + 0.2 * sin(gd9 * 8 + 2), gd9 * 80, 1.15);
        /* round ear flap with its spool, behind the eye */
        rot(c, 74, 98, ear + eflap, function () {
          G.part(c, circ(72, 99, 11, 8, 0.04), st, { lw: 1.3, round: 0.8, seed: 148 });
          G.part(c, circ(72, 99, 5.5, 7, 0.03), st, { lw: 1, round: 0.8, pits: false });
          G.hollow(c, circ(72, 99, 2, 6, 0.1), st, { deep: 1 });
        });
        /* three cheek scrolls under the eye, sweeping back toward the ear */
        for (var cm = 0; cm < 3; cm++) curl(c, 98 - cm * 5, 107 + cm * 6, PI + 0.12 + cm * 0.26 + sin(t * 0.002 + cm) * 0.05, 24 - cm * 4, 4.2, 1.3, st, { lw: 0.9 });
        /* the open mouth: a dark throat, the rolled upper lip over its teeth, then the lower lip as a scoop that ends in the spout */
        if (!sil) { c.fillStyle = G.mix(st.ink, st.dark, 0.25); G.trace(c, G.sp([[88, 124, 1], [156, 112, 1], [160, 122], [158, 136], [120, 143], [98, 136]], true, 6), true); c.fill(); }
        G.hollow(c, [[88, 124, 1], [156, 112, 1], [160, 122], [158, 136], [120, 143], [98, 136]], st, { deep: 1 });
        G.part(c, [[88, 114], [114, 111], [140, 107], [158, 104], [162, 112], [150, 118], [120, 122], [92, 124]], st, { lw: 1.4, round: 0.4, seed: 145 });
        G.teeth(c, [[98, 123], [124, 120.5], [156, 114]], 5, 5.4, 1, st, { fangs: [4] });
        rot(c, 92, 128, jaw * 0.3, function () {
          G.part(c, ribbon([[98, 133, 6.4], [132, 142.5, 6.2], [166, 146, 4], [194, 141, 0.8]], 4), st, { lw: 1.5, steps: 1, round: 0.4, seed: 146,
            paint: function (cc, bb) { lichen(cc, bb); streak(cc, 186, 142, 40, 9, st, 0.5 + 0.3 * wet, lt); streak(cc, 160, 144, 36, 6, st, 0.4, lt); } });
          G.teeth(c, [[110, 131], [136, 137.4], [164, 141]], 4, 3.6, -1, st, {});
          G.cut(c, [[112, 136], [150, 143.4], [192, 141.4]], st, 1.1, { glint: 1 });
          if (!sil) for (var d = 0; d < 5; d++) {
            var f = frac(t * 0.04 / 74 + d / 5), dx = 120 + f * 72, dy = 139.5 + f * 2 + sin(f * PI) * 2;
            c.strokeStyle = G.rgba("#e8f4ff", 0.9 * Math.min(1, f * 5) * (0.5 + 0.5 * f)); c.lineWidth = 2.2; c.lineCap = "round"; c.beginPath(); c.moveTo(dx - 8, dy - 0.3); c.lineTo(dx, dy); c.stroke();
          }
        });
      }
      /* the spring drips from the lip tip every 1.8 s; a sneeze throws eight drops from the trunk in set arcs */
      drip(c, 194, (bor ? 143 : 141) + 24 * Math.sin(jaw) * (bor ? 0.3 : 1), t, 1800, 0, 52, "#b6d8f4");
      if (!sil) for (var th = 0; th < 4; th++) {      /* a thread of the spring off the lip, a dash at a time */
        var tf = frac(t * 0.0007 + th / 4), ty = (bor ? 143 : 141) + 24 * Math.sin(jaw) * (bor ? 0.3 : 1) + tf * tf * 46;
        c.strokeStyle = G.rgba("#d6ebff", 0.7 * (1 - tf)); c.lineWidth = 1.4; c.lineCap = "round"; c.beginPath(); c.moveTo(194.5, ty); c.lineTo(194.5, ty + 3 + tf * 6); c.stroke();
      }
      puff(c, 195, (bor ? 142 : 138) + 24 * Math.sin(jaw) * (bor ? 0.3 : 1), t, 1500, 0.5, { dx: 0.5, dy: 0.7, rise: 14, col: "#e8f4ff", r: 1.6, dur: 0.7 });
      if (q >= 0 && q < 1300 && !sil) {
        var ox = bor ? 138 : 176, oy = bor ? 84 : 62, dr = G.rng(139);
        for (var dp = 0; dp < 8; dp++) {
          var dl = 60 + dp * 22, tt = q - dl, vx = 0.06 + dr() * 0.1, vy = -0.1 - dr() * 0.1, x2 = ox + 6 + vx * tt, y2 = oy + vy * tt + 0.5 * 0.0004 * tt * tt;
          if (tt < 0 || y2 > 196) continue;
          c.fillStyle = G.rgba("#b6d8f4", 0.9 * (1 - tt / 1300)); c.beginPath(); c.arc(x2, y2, 1.6 + dr() * 1.2, 0, 7); c.fill();
        }
      }
    } };

  /* ---------------------------------------------------------------- Kala / Kirtimukha (front) */
  B.kala = { stone: "sand", spout: false, front: true,
    draw: function (c, s) {
      var kh = s.variant === "khmer", t = s.t, ch = env(s, 1400), sil = !!G.sil, wet = s.rain || 0;
      /* two stones: grey andesite for the Javanese door-head, sand going to pink-red sandstone for the Khmer lintel */
      var st = kh ? { base: "#d8a67e", light: "#f7d9b6", dark: "#8c4f38", ink: "#3a1e14", pit: "#b6805e" } : S.andesite;
      var press = 1.5 * (0.5 + 0.5 * sin(t * 0.001257)), lookA = wander(t, 12), lookB = wander(t + 150, 12), lt = st.light;
      var foil = function (x, y, ang, len, wid, o) {
        var L = [], R = [], i;
        for (i = 0; i <= 8; i++) { var u = i / 8, w = sin(PI * pow(u, 0.8)) * wid * (1 + 0.25 * sin(u * PI * 6) * (u > 0.15 ? 1 : 0)), px = x + cos(ang) * len * u, py = y + sin(ang) * len * u; L.push([px - sin(ang) * w, py + cos(ang) * w, 1]); R.unshift([px + sin(ang) * w * 0.9, py - cos(ang) * w * 0.9, 1]); }
        nub(c, L.concat(R), st, { steps: 1, lw: 0.8, base: o && o.base });
        if (!sil) { c.strokeStyle = G.rgba(st.ink, 0.6); c.lineWidth = 0.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + cos(ang) * len * 0.9, y + sin(ang) * len * 0.9); c.stroke(); }
      };
      /* a spiral cut, wound in from radius r1 to r0 over `turns`: a nostril, a scroll */
      var spiral = function (x, y, r0, r1, turns, dir, a0, w) {
        var pts = [], n = Math.round(turns * 7), i, a, r;
        for (i = 0; i <= n; i++) { a = a0 + dir * i / n * turns * PI * 2; r = G.lerp(r1, r0, i / n); pts.push([x + cos(a) * r, y + sin(a) * r]); }
        G.cut(c, pts, st, w || 0.7, { glint: 1 });
      };
      /* a small makara, jaws open toward the door's middle: k picks the side, (cx, cy) its centre, sc its size */
      var mak = function (k, cx, cy, sc, seed) {
        var m = function (a) { return a.map(function (p) { return [(k ? -1 : 1) * (p[0] - 30), p[1] - 176]; }); }, d = k ? -1 : 1;
        c.save(); c.translate(cx, cy); c.scale(sc, sc);
        G.part(c, m([[14, 180], [20, 172], [34, 170], [44, 176], [46, 186], [30, 192], [16, 190]]), st, { lw: 1.2, round: 0.6, seed: seed });
        nub(c, m([[40, 176], [50, 172], [54, 164], [48, 160], [44, 168]]), st, { lw: 0.8 });
        foil(d * -12, -4, -PI / 2 - d * 0.7, 9, 2.6, {});
        G.dot(c, d * 2, 2, 2.6, st.light); G.dot(c, d * 2.6, 2.4, 1.2, st.ink);
        G.cut(c, m([[26, 186], [38, 187], [46, 184]]), st, 0.8);
        G.teeth(c, m([[34, 186.6], [40, 186.2], [45, 184.4]]), 3, 2.6, -1, st, { col: lt });
        c.restore();
      };

      /* the face, drawn in its own 200-box and placed: diadem, curling horns (flames, on the Khmer face), a heavy frowning brow with its
         notch, flat stone eyes, a broad nose whose wings wind into spirals that run out as a moustache, an upper jaw of fangs and squared
         teeth, and below them nothing: the jaw was eaten */
      var face = function (cx, cy, k) {
        c.save(); c.translate(cx, cy); c.scale(k, k); c.translate(-100, -95);
        /* the carved hollow where the lower jaw should be (the door-head leaves the doorway to say it) */
        if (kh) G.hollow(c, [[78, 140, 1], [122, 140, 1], [119, 156], [100, 162], [81, 156]], st, { deep: 1 });
        G.part(c, [[40, 44], [100, 30], [160, 44], [156, 56], [100, 46], [44, 56]], st, { lw: 1.3, seed: 143, paint: function (cc, bb) { sheen(cc, bb, t, st, 40, 0.18); } });
        for (var i = 0; i < 7; i++) G.dot(c, 52 + i * 16, 47 - abs(3 - i) * 2, 2.6, lt);
        if (kh) {                                                 /* a crest of five flames on the diadem, the middle one tallest */
          for (i = 0; i < 5; i++) foil(70 + i * 15, 40 - abs(2 - i) * 2.5, -PI / 2 + (i - 2) * 0.36 + sin(t * 0.0019 + i * 1.3) * 0.05, [15, 21, 27, 21, 15][i], 5.2 - abs(2 - i) * 0.3, {});
        } else {
          G.lock(c, 52, 50, -2.4 + sin(t * 0.0013) * 0.04, 30, 7, -1.6, st, { lw: 1 }); G.lock(c, 148, 50, -0.74 - sin(t * 0.0013 + 1) * 0.04, 30, 7, 1.6, st, { lw: 1 });
        }
        for (var mc = 0; mc < 4; mc++) {                          /* curls of the mane, out from the cheeks */
          curl(c, 52, 90 + mc * 13, PI - 0.15 + mc * 0.38 + sin(t * 0.002 + mc) * 0.05, 26 - mc * 2, 5.4, 1.3, st, { lw: 1 }); curl(c, 148, 90 + mc * 13, 0.15 - mc * 0.38 - sin(t * 0.002 + mc + 1) * 0.05, 26 - mc * 2, 5.4, -1.3, st, { lw: 1 });
        }
        /* the skull, a block: flat cheeks, hard corners where the planes turn */
        G.part(c, [[100, 52], [140, 56], [156, 84, 1], [154, 120, 1], [134, 138], [100, 141], [66, 138], [46, 120, 1], [44, 84, 1], [60, 56]], st, { lw: 1.7, round: 0.5, seed: 144,
          paint: function (cc, bb) { sheen(cc, bb, t, st, 80, 0.3); streak(cc, 76, 104, 30, 8, st, 0.2 + 0.2 * wet); streak(cc, 124, 104, 30, 8, st, 0.2 + 0.2 * wet); } });
        /* cheek planes cut flat, a chisel line down each */
        [0, 1].forEach(function (kk) {
          var F = function (a) { return kk ? mirror(a, 100) : a; };
          G.part(c, F([[46, 96, 1], [60, 104, 1], [58, 128, 1], [49, 122, 1]]), st, { lw: 0.9, steps: 1, seed: 152 + kk, base: G.mix(st.base, st.dark, 0.22), pits: false });
          G.cut(c, F([[60, 104], [60, 118], [58, 128]]), st, 0.7, { glint: 1 });
        });
        G.cut(c, [[70, 62], [86, 58]], st, 0.8, { glint: 1 }); G.cut(c, [[130, 62], [114, 58]], st, 0.8);
        if (kh) {                                                 /* the urna: a rosette jewel in the forehead's middle */
          for (i = 0; i < 8; i++) G.dot(c, 100 + cos(i * PI / 4) * 6.2, 68 + sin(i * PI / 4) * 6.2, 2, lt);
          G.part(c, circ(100, 68, 3.6, 7, 0.04), st, { lw: 0.9, round: 0.9, pits: false });
        }
        /* the brow volutes spring from the outer ends of the brow and curl up and out */
        G.lock(c, 50, 82, PI + 0.85, 40, 8, 2.0, st, { lw: 1.2 }); G.lock(c, 150, 82, -0.85, 40, 8, -2.0, st, { lw: 1.2 });
        G.lock(c, 64, 77, PI + 1.3, 24, 6.4, 1.7, st, { lw: 1.1 }); G.lock(c, 136, 77, -1.3, 24, 6.4, -1.7, st, { lw: 1.1 });
        goggle(c, 71, 100, 10.5, st, { white: G.mix(lt, st.base, 0.2), pr: 0.4, squint: 0.3, slant: 0.15, blink: blink(t, 12), look: lookA });
        goggle(c, 129, 100, 10.5, st, { white: G.mix(lt, st.base, 0.2), pr: 0.4, squint: 0.3, slant: -0.15, blink: blink(t + 60, 12), look: lookB });
        /* the nose: a broad block, a ridge down it, a lobed wing each side wound into a spiral */
        G.part(c, [[84, 104], [116, 104], [128, 122], [120, 128], [100, 124], [80, 128], [72, 122]], st, { lw: 1.3, round: 0.7, seed: 145 });
        G.cut(c, [[100, 106], [100, 120]], st, 0.8, { glint: 1 });
        G.part(c, circ(84, 118, 7.6, 8, 0.05), st, { lw: 1.1, round: 0.8, pits: false, seed: 156 }); G.part(c, circ(116, 118, 7.6, 8, 0.05), st, { lw: 1.1, round: 0.8, pits: false, seed: 157 });
        spiral(84, 118, 1, 6, 5, -1, 0.4, 0.7); spiral(116, 118, 1, 6, 5, 1, PI - 0.4, 0.7);
        /* the upper jaw, and nothing below it; the Khmer plate is broader, then four fangs and a row of squared teeth */
        G.part(c, kh ? [[52, 126], [100, 128], [148, 126], [150, 138], [100, 140], [50, 138]] : [[60, 126], [100, 128], [140, 126], [142, 138], [100, 140], [58, 138]], st, { lw: 1.3, seed: 146 });
        /* the heavy brow, ONE band frowning to the middle, a V cut between: the outer ends ride twelve units above the inner dip */
        G.part(c, kh ? [[38, 84], [60, 79], [84, 85], [100, 95, 1], [116, 85], [140, 79], [162, 84], [158, 93], [116, 98], [100, 107, 1], [84, 98], [42, 93]] : [[44, 80], [60, 74], [84, 82], [100, 94, 1], [116, 82], [140, 74], [156, 80], [150, 90], [116, 96], [100, 106, 1], [84, 96], [50, 90]], st, { lw: 1.5, round: 0.5, seed: 150 });
        G.cut(c, [[100, 94], [101, 100], [100, 104]], st, 1.2); G.cut(c, [[97, 56], [100, 60], [103, 56]], st, 0.8);
        for (i = 0; i < 4; i++) { G.cut(c, [[56 + i * 6, 88 - i * 1.5], [60 + i * 6, 82 - i * 1.2]], st, 0.6); G.cut(c, [[144 - i * 6, 88 - i * 1.5], [140 - i * 6, 82 - i * 1.2]], st, 0.6); }
        /* the moustache: three curls run out from each nostril spiral to the cheek */
        for (var mu = 0; mu < 3; mu++) {
          curl(c, 82, 121 + mu * 5, PI - 0.05 + mu * 0.26 + sin(t * 0.0021 + mu) * 0.05, 40 - mu * 5, 4.6, 1.6, st, { lw: 0.9 });
          curl(c, 118, 121 + mu * 5, 0.05 - mu * 0.26 - sin(t * 0.0021 + mu + 1) * 0.05, 40 - mu * 5, 4.6, -1.6, st, { lw: 0.9 });
        }
        var pr = press + ch * 4, tl = 8 + ch * 4;
        G.teeth(c, [[62, 139 + pr * 0.4], [72, 140.5 + pr * 0.4], [82, 141.5 + pr * 0.4]], 3, tl, 1, st, { col: lt, fangs: [0, 1] });
        G.teeth(c, [[118, 141.5 + pr * 0.4], [128, 140.5 + pr * 0.4], [138, 139 + pr * 0.4]], 3, tl, 1, st, { col: lt, fangs: [1, 2] });
        for (var sq = 0; sq < 6; sq++) nub(c, [[83 + sq * 6.6, 140.5 + pr * 0.4, 1], [88.6 + sq * 6.6, 140.5 + pr * 0.4, 1], [88.6 + sq * 6.6, 148 + pr + (sq % 2) * 1.6, 1], [83 + sq * 6.6, 148 + pr + (sq % 2) * 1.6, 1]], st, { steps: 1, lw: 0.9, base: lt });
        c.restore();
      };

      /* a hand curled on a garland: a palm, the garland over it, then four fingers that fan out on a 25 degree arc, middle longest, each
         bent a little further than the one before, a knuckle at every joint and a claw on every tip, and a thumb from the palm's heel */
      var hand = function (k, hx, hy, drawGarland) {
        var M = function (x) { return k ? 200 - x : x; }, d = 1;      /* drawn once, on the left, and mirrored by M */
        G.part(c, [[M(hx - 11 * d), hy - 11], [M(hx), hy - 13.5], [M(hx + 11 * d), hy - 12], [M(hx + 12.5 * d), hy], [M(hx + 11 * d), hy + 13], [M(hx), hy + 14], [M(hx - 10 * d), hy + 12], [M(hx - 12 * d), hy]], st, { lw: 1.2, round: 0.6, seed: 147 + k });
        drawGarland();
        G.cut(c, [[M(hx - 7), hy + 4], [M(hx - 1), hy + 8.5], [M(hx + 6), hy + 7]], st, 0.7); G.cut(c, [[M(hx - 5), hy - 3], [M(hx + 2), hy - 1], [M(hx + 7), hy - 4]], st, 0.6);
        var len = [15, 18, 17, 13], f, claw = function (x, y, a, n) {
          nub(c, [[M(x - sin(a) * 1.7 * d), y + cos(a) * 1.7], [M(x + cos(a) * n), y + sin(a) * n], [M(x + sin(a) * 1.7 * d), y - cos(a) * 1.7]], st, { lw: 0.6, steps: 1, base: lt });
        };
        for (f = 0; f < 4; f++) {
          var ry = hy - 9.2 + f * 6.2, rx = hx + (7 + 2.6 * sin(PI * (f + 0.5) / 4)) * d, a0 = 0.1 + f * 0.145, a1 = a0 + 0.35 + f * 0.14;     /* knuckles on an arc, the middle ones furthest out */
          var x1 = rx + cos(a0) * len[f] * 0.55 * d, y1 = ry + sin(a0) * len[f] * 0.55, x2 = x1 + cos(a1) * len[f] * 0.45 * d, y2 = y1 + sin(a1) * len[f] * 0.45;
          nub(c, ribbon([[M(rx), ry, 3.4], [M(x1), y1, 2.8], [M(x2), y2, 1.3]], 3), st, { lw: 0.9, steps: 1 });
          G.cut(c, [[M(x1 - 1.4 * d), y1 - 1.6], [M(x1), y1 - 0.4], [M(x1 + 1.4 * d), y1 - 1.8]], st, 0.6);
          G.cut(c, [[M(x1 - 1.4), y1 - 1.8], [M(x1), y1 - 0.6], [M(x1 + 1.4), y1 - 1.9]], st, 0.8, { glint: 1 });
          claw(x2, y2, a1 * (d), 4.2);
        }
        nub(c, [[M(hx + 7.6), hy - 11], [M(hx + 10.6), hy - 8.5], [M(hx + 11.6), hy - 1], [M(hx + 10.4), hy + 7.5], [M(hx + 7.6), hy + 9.4], [M(hx + 8.8), hy], [M(hx + 7.8), hy - 7]], st, { lw: 0.8 });     /* the knuckle ridge hides the roots */
        var th = [[hx + 1 * d, hy + 10, 4.8], [hx + 8 * d, hy + 14.5, 4.2], [hx + 14 * d, hy + 15, 3.2], [hx + 19 * d, hy + 12, 2]];
        nub(c, ribbon(th.map(function (p) { return [M(p[0]), p[1], p[2]]; }), 3), st, { lw: 0.9, steps: 1 });
        G.dot(c, M(hx + 8 * d), hy + 13.2, 1.1, lt);
        claw(hx + 19 * d, hy + 12, -0.5 * d, 4);
        for (f = 0; f < 3; f++) G.dot(c, M(hx - 9.6 * d), hy - 4 + f * 4.6, 0.9, lt);
      };
      /* a garland: a thick cut with a light core, a string of pearls travelling along it, pearls thrown from the mouth corner on a tap.
         thin = the pearls alone, riding a stem that is already carved (they shrink with it) */
      var garland = function (pts, k, thin) {
        if (!thin) { G.cut(c, pts, st, 6.5, {}); G.cut(c, pts, st, 2.2, { col: lt }); }
        if (sil) return;
        var poly = G.sp(pts, false, 8), cum = [0], i;
        for (i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
        var tot = cum[cum.length - 1];
        for (var p = 0; p < 9; p++) {
          var u = frac(t * 0.00024 + p / 9 + k * 0.08) * tot, j = 1; while (j < cum.length - 1 && cum[j] < u) j++;
          var f = (u - cum[j - 1]) / ((cum[j] - cum[j - 1]) || 1), x = G.lerp(poly[j - 1][0], poly[j][0], f), y = G.lerp(poly[j - 1][1], poly[j][1], f), pr = thin ? 3.1 - 1.7 * u / tot : 2.8;
          c.fillStyle = lt; c.beginPath(); c.arc(x, y, pr, 0, 7); c.fill(); c.strokeStyle = G.rgba(st.ink, 0.85); c.lineWidth = 0.8; c.stroke();
          c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.arc(x - 0.7, y - 0.8, 0.8, 0, 7); c.fill();
        }
        /* a tap: pearls fly out of the mouth corner */
        if (s.poke != null && s.poke >= 0 && s.poke < 1400 && ch > 0.02) for (var b = 0; b < 4; b++) {
          var tt = s.poke - b * 40, sx = pts[0][0], sy = pts[0][1];
          if (tt < 0) continue;
          var vx = (k ? 1 : -1) * (0.05 + b * 0.02), vy = -0.1 - b * 0.012, px = sx + vx * tt, py = sy + vy * tt + 0.5 * 0.0003 * tt * tt;
          c.fillStyle = G.rgba(lt, 0.95 * ch); c.beginPath(); c.arc(px, py, 2 + (b % 2) * 0.6, 0, 7); c.fill();
        }
      };
      var lf = [0.2, 0.65, 1, 0.7, 0.3, 0.1], li = ch * 18;
      var sd = function (k, i) { return sin(t * 0.0021 + i * 1.1 + k * 1.7) * 1.3; };

      if (!kh) {
        /* the door-head: a pointed arch of andesite, the doorway dark under it, the face at the apex, the garlands down both jambs to a makara each */
        G.hollow(c, [[44, 92, 1], [156, 92, 1], [156, 190, 1], [44, 190, 1]], st, { deep: 1 });
        G.part(c, [[14, 190, 1], [14, 72], [28, 44], [60, 26], [100, 18], [140, 26], [172, 44], [186, 72], [186, 190, 1], [156, 190, 1], [156, 92, 1], [44, 92, 1], [44, 190, 1]], st, { lw: 1.5, seed: 141, lift: 0.6,
          paint: function (cc, bb) { sheen(cc, bb, t, st, 60, 0.2); streak(cc, 29, 100, 90, 10, st, 0.2 + 0.2 * wet); streak(cc, 171, 100, 90, 10, st, 0.2 + 0.2 * wet); } });
        G.cut(c, [[22, 80], [22, 186]], st, 0.8); G.cut(c, [[178, 80], [178, 186]], st, 0.8); G.cut(c, [[36, 100], [36, 186]], st, 0.8); G.cut(c, [[164, 100], [164, 186]], st, 0.8);
        G.cut(c, [[34, 60], [66, 40], [100, 33], [134, 40], [166, 60]], st, 1, { glint: 1 });
        face(100, 66, 0.88);
        [0, 1].forEach(function (k) {
          var base = [[70, 100], [56, 106], [42, 118], [32, 138], [29, 160], [30, 178]], pts = base.map(function (p, i) { var li2 = env({ poke: s.poke == null || s.poke < 0 ? -1 : s.poke - k * 70 }, 1400) * 18; return [(k ? 200 - p[0] : p[0]) + (i ? sd(k, i) : 0), p[1] - li2 * lf[i]]; });
          hand(k, 40, 120 - env({ poke: s.poke == null || s.poke < 0 ? -1 : s.poke - k * 70 }, 1400) * 18, function () { garland(pts, k); });
          /* a small makara at the foot of the jamb, mouth open toward the door */
          mak(k, k ? 170 : 30, 176, 1, 149 + k);
        });
      } else {
        /* the Khmer lintel: sandstone going pink-red, its top bowed, the face large at the centre; from its mouth corners a rinceau of two scrolls a
           side (stems taper, leaves hang off them), a scalloped hem of palmettes and buds on a stepped moulding, a makara at each end */
        G.part(c, [[0, 54, 1], [36, 46], [100, 40], [164, 46], [200, 54, 1], [200, 166, 1], [0, 166, 1]], st, { lw: 1.4, seed: 141, lift: 0.6,
          paint: function (cc, bb) {
            var rg = cc.createLinearGradient(0, 40, 0, 170); rg.addColorStop(0, "rgba(214,150,120,0)"); rg.addColorStop(1, "rgba(180,80,78,.42)"); cc.fillStyle = rg; cc.fillRect(0, 40, 200, 130);
            sheen(cc, bb, t, st, 60, 0.14); streak(cc, 40, 120, 50, 10, st, 0.18 + 0.2 * wet); streak(cc, 160, 120, 50, 10, st, 0.18 + 0.2 * wet);
          } });
        G.cut(c, [[6, 60, 1], [38, 52], [100, 46], [162, 52], [194, 60, 1], [194, 148, 1], [6, 148, 1], [6, 60, 1]], st, 0.9, { glint: 1 });
        /* the hem: a large palmette, a small bud, a large palmette, hanging from the slab's lower edge between the makara, and under it two stepped bands */
        for (var pl = 0; pl < 9; pl++) {
          var hx2 = 50 + pl * 12.5;
          if (pl % 2 === 0) {
            var pts2 = [[hx2 - 7, 148, 1]], lens = [9, 13, 16, 13, 9], lo;
            for (lo = 0; lo < 5; lo++) { var lx2 = hx2 + (lo - 2) * 3.4; pts2.push([lx2 - 1.7, 148 + lens[lo] * 0.7], [lx2, 148 + lens[lo] + sin(t * 0.0021 + pl * 0.9 + lo) * 0.5, 1], [lx2 + 1.7, 148 + lens[lo] * 0.7]); }
            pts2.push([hx2 + 7, 148, 1]);
            nub(c, pts2, st, { steps: 3, lw: 0.9 });
            for (lo = 1; lo < 4; lo++) G.cut(c, [[hx2, 149], [hx2 + (lo - 2) * 2.4, 148 + lens[lo] * 0.5], [hx2 + (lo - 2) * 3.2, 148 + lens[lo] * 0.82]], st, 0.6);
          } else foil(hx2, 148, PI / 2 + sin(t * 0.0021 + pl * 0.9) * 0.08, 9, 3.2, {});
        }
        G.part(c, [[2, 166, 1], [198, 166, 1], [198, 171, 1], [2, 171, 1]], st, { lw: 1.2, steps: 1, seed: 153, pits: false });
        G.part(c, [[6, 171, 1], [194, 171, 1], [194, 176, 1], [6, 176, 1]], st, { lw: 1.2, steps: 1, seed: 154, base: G.mix(st.base, st.dark, 0.2), pits: false });
        G.cut(c, [[8, 168.5], [192, 168.5]], st, 0.6, { glint: 1 });
        /* the makara that end the lintel, jaws toward the middle, a quarter again as large as the door-head's, standing on the moulding */
        mak(0, 24, 150, 1.3, 149); mak(1, 176, 150, 1.3, 150);
        var legs = [];
        [0, 1].forEach(function (k) {
          var M = function (x) { return k ? 200 - x : x; }, lag = s.poke == null || s.poke < 0 ? -1 : s.poke - k * 70, li2 = env({ poke: lag }, 1400) * 18, br = 0.3 * sin(t * 0.0016 + k * 1.3), dsg = k ? -1 : 1;
          /* the lower stem leaves the mouth corner, runs out under the hand and winds down into a scroll of radius 12; the pearls ride it */
          var low = volute(64, 120, 3.2, 74, 6.6 + br, 3.2, 1, 14).map(function (p, i, a) { return [M(p[0]) + (i ? sd(k, i) : 0), p[1] - li2 * sin(PI * i / (a.length - 1)), p[2]]; });
          /* the upper stem leaves the same corner and winds up into a scroll of radius 18 */
          var up = volute(64, 110, 3.6, 126, 8.3 + br, 3.2, 1, 14).map(function (p, i) { return [M(p[0]), p[1] - li2 * 0.3 * (i < 8), p[2]]; });
          var stem = function (sp, sign, idx, lens, wids, adj) {
            G.part(c, ribbon(sp, 2), st, { lw: 1.2, steps: 1, round: 0.5, seed: 160 + k });
            idx.forEach(function (i, n) { var a = sp[i - 1], z = sp[i + 1], h = Math.atan2(z[1] - a[1], z[0] - a[0]); foil(sp[i][0], sp[i][1], h - sign * (1.05 + adj[n]) + sin(t * 0.0023 + n * 2 + k) * 0.1, lens[n], wids[n], {}); });
          };
          stem(up, dsg, [4, 6, 8, 10], [13, 19, 15, 10], [4.4, 5.4, 4.8, 3.6], [0.1, -0.15, 0.2, 0]);
          stem(low, dsg, [4, 6, 8, 10], [18, 12, 16, 9], [5, 4.2, 4.8, 3.4], [-0.1, 0.15, 0, 0.2]);
          G.cut(c, up, st, 0.6, { col: lt }); G.cut(c, low, st, 0.6, { col: lt });
          legs.push({ k: k, low: low, li2: li2 });
        });
        face(100, 86, 0.82);
        /* the hands come last: they curl in front of the cheeks, gripping the stem the pearls ride */
        legs.forEach(function (L) { hand(L.k, 34, 122 - L.li2 * 0.7, function () { garland(L.low.map(function (p) { return [p[0], p[1]]; }), L.k, true); }); });
      }
    } };

  /* ---------------------------------------------------------------- Thai yaksha */
  B.yaksha = { stone: "green", spout: false, front: true,
    draw: function (c, s) {
      var sk = S.green, gd = S.gold, rd = S.red, wh = S.white, lq = S.lacq, t = s.t, e = env(s, 1500), sil = !!G.sil;
      var u = (s.poke == null || s.poke < 0 || s.poke > 1500) ? -1 : s.poke / 1500;
      /* a tap: the club comes up over the first quarter, then is slammed down at 35% */
      var lift = 0, since = -1;
      if (u >= 0) { lift = u < 0.25 ? G.ease(u / 0.25) : u < 0.35 ? 1 - G.ease((u - 0.25) / 0.1) : 0; if (u >= 0.35) since = u - 0.35; }
      var hop = since >= 0 ? 3 * exp(-since * 10) : 0, shake = since >= 0 ? 1.5 * sin(since * 130) * exp(-since * 9) : 0;
      var br = sin(t * 0.0016) * 0.9, hb = sin((t - 150) * 0.0016) * 0.9;
      var gt = (t % 6000) / 700, grip = gt < 1 ? 0.03 * sin(gt * PI) * (1 - gt * 0.4) : 0;     /* every 6 s he shifts his grip */
      var rock = since >= 0 ? 0.035 * sin(since * 70) * exp(-since * 4) : 0;
      var dk = G.mix(sk.base, sk.dark, 0.45), by = hop - lift * 1.5, ly = lift * 14;
      var tsw = sin(t * 0.0021) * 0.12 + (u >= 0 ? 0.7 * sin(s.poke * 0.02) * exp(-s.poke / 500) : 0);

      /* plinth: white stucco, then a gold step */
      c.save(); c.translate(shake, 0);
      G.part(c, [[34, 188, 1], [166, 188, 1], [172, 200, 1], [28, 200, 1]], S.white, { lw: 1.2, steps: 1, seed: 171 });
      G.part(c, [[40, 182, 1], [160, 182, 1], [166, 188, 1], [34, 188, 1]], gd, { lw: 1.1, steps: 1, shineAt: sweep(t, 185) });
      G.cut(c, [[40, 194], [160, 194]], S.white, 0.7);
      c.restore();

      /* the giant stands a sixth smaller on his plinth, so the larger head and the taller crown stay inside the box */
      c.save(); c.translate(100, 186); c.scale(0.83, 0.83); c.translate(-100, -186);
      /* sampot: red cloth, a gold hem, a front panel running to a point */
      c.save(); c.translate(0, by);
      G.part(c, [[72, 112, 1], [128, 112, 1], [136, 132], [148, 156], [150, 160, 1], [50, 160, 1], [52, 156], [64, 132]], rd, { lw: 1.3, seed: 172, shineAt: 0.5 });
      G.part(c, [[50, 155, 1], [150, 155, 1], [150, 160, 1], [50, 160, 1]], gd, { lw: 0.9, steps: 1, shineAt: sweep(t, 158) });
      for (var h = 0; h < 11; h++) G.dot(c, 55 + h * 9, 157.5, 1.1, rd.base);
      G.part(c, [[91, 117, 1], [109, 117, 1], [104, 166], [100, 175, 1], [96, 166]], rd, { lw: 1.1, base: G.mix(rd.base, rd.dark, 0.35), seed: 173 });
      G.cut(c, [[100, 126], [95, 136], [100, 146], [97, 156]], gd, 1.1, { col: gd.base }); G.cut(c, [[100, 126], [105, 136], [100, 146], [103, 156]], gd, 1.1, { col: gd.base });
      c.restore();

      /* legs: gold greaves with a pointed knee-guard, the knees bent out; feet turned out, three toes each */
      c.save(); c.translate(shake, 0); c.translate(0, 186); c.scale(1, 1 - hop / 50); c.translate(0, -186);
      [0, 1].forEach(function (k) {
        var P = function (a) { return k ? mirror(a, 100) : a; };
        G.part(c, P([[74, 136], [62, 146], [54, 156], [52, 170], [50, 183, 1], [68, 183, 1], [70, 170], [76, 158], [88, 142]]), gd, { lw: 1.4, shineAt: sweep(t, 160 + k * 20), seed: 174 + k });
        G.cut(c, P([[52, 172], [60, 175], [69, 172]]), gd, 0.9); G.cut(c, P([[51, 178], [60, 180], [68, 178]]), gd, 0.9);
        nub(c, P([[62, 138, 1], [72, 150], [70, 166], [56, 168], [52, 154]]), gd, { lw: 1.1 });
        G.cut(c, P([[62, 146], [62, 158]]), gd, 0.8);
        G.part(c, P([[70, 181, 1], [60, 176], [48, 176], [40, 179], [35, 183], [34, 188, 1], [70, 188, 1]]), sk, { lw: 1.2, round: 0.5, seed: 176 + k });
        for (var tz = 0; tz < 3; tz++) { G.cut(c, P([[37 + tz * 4.6, 181 + tz * 0.6], [38 + tz * 4.6, 188]]), sk, 0.95); nub(c, P([[34 + tz * 4.6, 188, 1], [37.4 + tz * 4.6, 190, 1], [40 + tz * 4.6, 188, 1]]), sk, { lw: 0.7, steps: 1 }); }
      });
      c.restore();

      c.save(); c.translate(0, by);
      /* the chest: green under a gold plate in two halves with a deep V, breathing a pixel */
      c.save(); c.translate(0, br);
      G.part(c, [[72, 62], [128, 62], [128, 112, 1], [72, 112, 1]], sk, { lw: 1.2, round: 0.4, seed: 177 });
      G.part(c, [[68, 64, 1], [87, 64, 1], [100, 88, 1], [100, 114, 1], [78, 114], [70, 92]], gd, { lw: 1.4, shineAt: sweep(t, 90), seed: 178 });
      G.part(c, [[132, 64, 1], [113, 64, 1], [100, 88, 1], [100, 114, 1], [122, 114], [130, 92]], gd, { lw: 1.4, shineAt: sweep(t, 110), seed: 179 });
      /* the glass mosaic: lozenges in red, blue and white, each catching the light in its own time */
      if (!sil) {
        var gem = ["#d6342a", "#2f6fd6", "#fbf4e0"];
        for (var rw = 0; rw < 3; rw++) for (var q = 0; q < 4; q++) for (var sd = 0; sd < 2; sd++) {
          var gx = 75 + q * 5.6 + (rw % 2) * 2.8 + (sd ? 38 : 0) + (sd ? 3 : 0), gy = 80 + rw * 5.2 + q * 0.6;
          if (sd === 0 && gx > 92 - rw * 2) continue;
          c.globalAlpha = 0.6 + 0.4 * sin(t * 0.004 + (rw * 8 + q * 2 + sd) * 1.7);
          c.save(); c.translate(gx, gy); c.rotate(PI / 4); c.fillStyle = gem[(q + rw + sd) % 3]; c.fillRect(-1.6, -1.6, 3.2, 3.2); c.strokeStyle = G.rgba(gd.ink, 0.7); c.lineWidth = 0.5; c.strokeRect(-1.6, -1.6, 3.2, 3.2); c.restore();
        }
        c.globalAlpha = 1;
      }
      /* the sash: red with gold bands, over one shoulder and across to the opposite hip */
      G.part(c, ribbon([[72, 64, 4.5], [98, 84, 4.2], [128, 110, 4.5]], 6), rd, { lw: 1.1, steps: 1, shineAt: 0.5, seed: 180 });
      for (var sb = 0; sb < 4; sb++) G.cut(c, [[81 + sb * 11.5 - 3, 73 + sb * 9 + 3], [81 + sb * 11.5 + 3, 73 + sb * 9 - 3]], gd, 1.3, { col: gd.base });
      c.restore();
      /* the belt and its tassel */
      G.part(c, [[70, 110, 1], [130, 110, 1], [128, 119, 1], [72, 119, 1]], gd, { lw: 1.1, steps: 1, shineAt: sweep(t, 114) });
      curl(c, 118, 119, PI / 2 + 0.2 + tsw, 24, 3.4, 0.5 * sin(t * 0.0021 + 1), gd, { lw: 0.9 });
      curl(c, 82, 119, PI / 2 - 0.1 - tsw * 0.5, 18, 3, -0.3, rd, { lw: 0.9 });

      /* arms: green, an armlet with a point on each, elbows out, forearms coming in to the club; the near one lower */
      var ex = 50 - lift * 3, ey = 96 - lift * 6;
      [0, 1].forEach(function (k) {
        var P = function (a) { return k ? mirror(a, 100) : a; }, hy = 106 - ly + k * 11;
        c.save(); c.translate(0, br);
        G.part(c, P(ribbon([[64, 70, 8], [55, 84, 7.5], [ex, ey, 6.5]], 5)), sk, { lw: 1.3, steps: 1, round: 0.5, seed: 182 + k });
        nub(c, P([[60, 80, 1], [47, 85, 1], [54, 95, 1], [63, 91, 1]]), gd, { lw: 1 });
        G.part(c, P(ribbon([[ex, ey, 6.4], [(ex + 94) / 2 - 4, (ey + hy) / 2 + 1, 7], [92, hy, 4.6]], 6)), sk, { lw: 1.3, steps: 1, round: 0.5, seed: 184 + k, base: k ? sk.base : dk });
        G.cut(c, P([[ex + 7, ey + 5], [(ex + 94) / 2 - 3, (ey + hy) / 2 - 3], [74, hy - 5]]), sk, 0.7);
        c.restore();
      });
      /* pauldrons: two stacked half-moons a side, not spikes */
      c.save(); c.translate(0, br);
      [0, 1].forEach(function (k) {
        var P = function (a) { return k ? mirror(a, 100) : a; };
        G.part(c, P([[45, 78, 1], [48, 66], [56, 58], [66, 58], [76, 66], [79, 78, 1]]), gd, { lw: 1.3, shineAt: sweep(t, 66 + k * 9), seed: 186 + k });
        G.part(c, P([[46, 90, 1], [48, 80], [55, 74], [63, 76], [68, 84], [68, 90, 1]]), gd, { lw: 1.2, shineAt: sweep(t, 82 + k * 9), seed: 188 + k });
        G.cut(c, P([[52, 70], [60, 66], [70, 70]]), gd, 0.8);
      });
      c.restore();

      /* the club: a fluted gold melon on a lacquer shaft banded in gold, its point planted on the plinth, in front of the legs */
      c.save(); c.translate(0, -ly - hop); rot(c, 100, 112, grip + rock, function () {
        G.part(c, [[96, 108, 1], [104, 108, 1], [106, 186, 1], [94, 186, 1]], lq, { lw: 1.2, steps: 1, shineAt: sweep(t, 150, 7000), seed: 190 });
        for (var rg = 0; rg < 3; rg++) nub(c, [[94.6, 128 + rg * 20, 1], [105.4, 128 + rg * 20, 1], [105.8, 133 + rg * 20, 1], [94.2, 133 + rg * 20, 1]], gd, { lw: 0.9, steps: 1 });
        G.part(c, circ(100, 96, 11, 8, 0.06), gd, { lw: 1.4, round: 1, shineAt: sweep(t, 98), seed: 191 });
        G.cut(c, [[100, 85], [96.5, 96], [100, 107]], gd, 0.8); G.cut(c, [[100, 85], [103.5, 96], [100, 107]], gd, 0.8);
        G.cut(c, [[100, 85], [92, 94], [91, 101]], gd, 0.7); G.cut(c, [[100, 85], [108, 94], [109, 101]], gd, 0.7);
        nub(c, [[98, 86, 1], [102, 86, 1], [101, 79, 1], [99, 79, 1]], gd, { lw: 0.8, steps: 1 });
      });
      /* the hands: a fist round the club, four fingers and a thumb each, the near one over the far one */
      [0, 1].forEach(function (k) {
        var fy = 106 - ly + k * 11, fx = 100 + (k ? 1 : -1), tp = k ? 1 : -1;
        G.part(c, [[fx - 8.5, fy - 5], [fx, fy - 6.6], [fx + 8.5, fy - 5], [fx + 10.6, fy], [fx + 8.5, fy + 5.2], [fx, fy + 6.8], [fx - 8.5, fy + 5.2], [fx - 10.6, fy]], sk, { lw: 1.3, round: 0.7, seed: 192 + k, base: k ? sk.base : dk });
        for (var f = 0; f < 3; f++) G.cut(c, [[fx - 8, fy - 3 + f * 3.1], [fx - 1, fy - 2.2 + f * 3.1], [fx + 8, fy - 3.4 + f * 3.1]], sk, 0.75, { glint: 1 });
        nub(c, [[fx + tp * 8, fy - 5.5], [fx + tp * 12.5, fy - 9], [fx + tp * 11, fy - 3.5], [fx + tp * 7, fy - 1]], sk, { lw: 0.9 });
        for (var kn = 0; kn < 3; kn++) G.dot(c, fx - tp * 9.2, fy - 3 + kn * 3.1, 0.9, sk.light);
      });
      c.restore();

      /* dust sprayed off the plinth when the club lands */
      if (since >= 0 && since < 0.5 && !sil) for (var i = 0; i < 6; i++) {
        var lf = since / 0.5, dr = i % 2 ? 1 : -1, sp = 0.5 + 0.5 * ((i * 37) % 10) / 10;
        G.dot(c, 100 + dr * (9 + lf * 32 * sp), 184 - 15 * sin(lf * PI * 0.9) * sp - lf * 2, 2.8 * (1 - lf) + 0.5, G.rgba("#ece6d6", 0.85 * (1 - lf)));
      }

      /* head, a beat behind the chest, and a fifth larger than it was, so it is not a pot beside the pauldrons */
      c.save(); c.translate(0, by + hb); c.translate(100, 62); c.scale(1.2, 1.2); c.translate(-100, -62);
      var look = wander(t, 13), look2 = wander(t + 140, 13), mz = ["#2f6fd6", "#fbf4e0", gd.base];
      /* the ears: big leaf-shaped gilt panels with an inlaid cut and a gem, a red tassel hanging from each */
      [0, 1].forEach(function (k) {
        var P = function (a) { return k ? mirror(a, 100) : a; }, X = function (x) { return k ? 200 - x : x; };
        G.part(c, P([[75, 44, 1], [69, 34], [62, 37], [59, 48], [61, 60], [67, 67, 1], [73, 59], [75.4, 50]]), gd, { lw: 1.2, shineAt: sweep(t, 50 + k * 8), seed: 198 + k, steps: 5 });
        G.cut(c, P([[73, 43], [67.5, 50], [66, 60]]), gd, 0.9, { col: gd.ink }); G.cut(c, P([[70, 41], [64, 46], [62, 55]]), gd, 0.6, { col: gd.ink });
        G.dot(c, X(66), 51, 1.5, k ? "#d6342a" : "#2f6fd6"); G.dot(c, X(65), 58, 1.2, k ? "#2f6fd6" : "#d6342a");
        curl(c, X(66), 66, PI / 2 + (k ? -1 : 1) * 0.08 + tsw * (k ? 1 : -1), 17, 3.2, (k ? 1 : -1) * 0.5, rd, { lw: 0.9 });
      });
      G.part(c, [[79, 40, 1], [121, 40, 1], [126, 50], [124, 62], [116, 74 + e * 2], [100, 79 + e * 2.5], [84, 74 + e * 2], [76, 62], [74, 50]], sk, { lw: 1.6, round: 0.8, seed: 195 });
      /* the chada, twelve units taller: a base band, two scaled tiers (four rows of tiny petals), a neck, and on top a little head with a little crown */
      var petals = function (cc, y0, hw, n, h) {
        for (var pt = 0; pt < n; pt++) {
          var px = 100 + (pt - (n - 1) / 2) * (hw * 2 / n);
          cc.beginPath(); cc.moveTo(px - hw / n, y0); cc.quadraticCurveTo(px - hw / n, y0 - h * 0.7, px, y0 - h); cc.quadraticCurveTo(px + hw / n, y0 - h * 0.7, px + hw / n, y0);
          cc.fillStyle = G.rgba(gd.light, 0.5); cc.fill(); cc.strokeStyle = G.rgba(gd.ink, 0.65); cc.lineWidth = 0.55; cc.stroke();
        }
      };
      G.part(c, [[77, 41, 1], [123, 41, 1], [121, 31, 1], [79, 31, 1]], gd, { lw: 1.2, steps: 1, shineAt: sweep(t, 36) });
      G.part(c, [[81, 31, 1], [119, 31, 1], [115, 21], [110, 12, 1], [90, 12, 1], [85, 21]], gd, { lw: 1.2, shineAt: sweep(t, 25), seed: 196,
        paint: function (cc) { petals(cc, 30.6, 18.5, 8, 6); petals(cc, 22.4, 14, 7, 5.6); } });
      G.part(c, [[88, 12, 1], [112, 12, 1], [108, 5], [104, -1, 1], [96, -1, 1], [92, 5]], gd, { lw: 1.1, shineAt: sweep(t, 14), seed: 197,
        paint: function (cc) { petals(cc, 11.6, 10.5, 6, 4.4); petals(cc, 5.6, 7, 4, 4); } });
      nub(c, [[96, -1, 1], [104, -1, 1], [102, -3.6, 1], [98, -3.6, 1]], gd, { lw: 0.8, steps: 1 });
      G.part(c, circ(100, -7.6, 3.9, 7, 0.04), sk, { lw: 0.9, round: 0.8, pits: false });
      G.dot(c, 98.4, -8.2, 0.8, "#fff6e6"); G.dot(c, 101.6, -8.2, 0.8, "#fff6e6"); G.dot(c, 98.5, -8.1, 0.4, "#14301e"); G.dot(c, 101.5, -8.1, 0.4, "#14301e"); G.cut(c, [[98.6, -5.4], [101.4, -5.4]], sk, 0.5);
      nub(c, [[96.6, -10.6, 1], [103.4, -10.6, 1], [101.2, -14.6, 1], [100, -17.4, 1], [98.8, -14.6, 1]], gd, { lw: 0.7, steps: 1 });
      for (var cd = 0; cd < 5; cd++) { G.dot(c, 85 + cd * 7.5, 36, 1.4, cd % 2 ? "#2f6fd6" : "#d6342a"); }
      G.dot(c, 100, 16, 1.2, "#d6342a");
      /* face: brows dropping inward, goggle eyes, a flat nose, folds, then the mouth under a moustache, with tusks */
      nub(c, [[78, 43, 1], [89, 43], [100, 50, 1], [98, 54, 1], [89, 50], [78, 48]], sk, { lw: 1.3, base: dk }); nub(c, [[122, 43, 1], [111, 43], [100, 50, 1], [102, 54, 1], [111, 50], [122, 48]], sk, { lw: 1.3, base: dk });
      var er = 5.4 + 1.4 * e, eo = { white: "#fffdf4", iris: "#2a5fd0" };
      goggle(c, 88, 54, er, sk, { white: eo.white, iris: eo.iris, squint: 0.22, pr: 0.3, slant: 0.5, blink: blink(t, 13), look: look });
      goggle(c, 112, 54, er, sk, { white: eo.white, iris: eo.iris, squint: 0.22, pr: 0.3, slant: -0.5, blink: blink(t + 90, 13), look: look2 });
      if (!sil) { c.strokeStyle = gd.base; c.lineWidth = 0.8; c.lineCap = "round"; [[88, 0.5], [112, -0.5]].forEach(function (E) { c.beginPath(); c.moveTo(E[0] - er * 1.18, 54 - er * 0.3 + E[1] * er * 0.5); c.quadraticCurveTo(E[0], 54 - er * 1.55, E[0] + er * 1.18, 54 - er * 0.3 - E[1] * er * 0.5); c.stroke(); }); }
      G.part(c, [[96, 55], [104, 55], [110, 63], [106, 67], [100, 68], [94, 67], [90, 63]], sk, { lw: 1.2, round: 0.8, seed: 200 });
      G.hollow(c, [[92.5, 64.5], [96, 63.5], [96, 67], [93, 67]], sk, {}); G.hollow(c, [[107.5, 64.5], [104, 63.5], [104, 67], [107, 67]], sk, {});
      G.cut(c, [[90, 58], [84.5, 65], [85, 73]], sk, 0.8); G.cut(c, [[110, 58], [115.5, 65], [115, 73]], sk, 0.8);
      G.hollow(c, [[86, 70], [100, 71.5], [114, 70], [112, 76 + e * 3], [100, 79 + e * 3], [88, 76 + e * 3]], sk, { deep: 1 });
      G.teeth(c, [[88, 70.4], [100, 72], [112, 70.4]], 4, 3, 1, sk, { col: "#fff6e6" });
      G.teeth(c, [[91, 76.4 + e * 3], [100, 78.6 + e * 3], [109, 76.4 + e * 3]], 3, 2.2, -1, sk, { col: "#fff6e6" });
      /* red lips, a crescent above the hollow and a crescent below it */
      G.part(c, [[85, 70.6, 1], [100, 68.4], [115, 70.6, 1], [112, 71.6], [100, 70.6], [88, 71.6]], rd, { lw: 0.8, steps: 4, pits: false, seed: 202 });
      G.part(c, [[88, 76 + e * 3, 1], [100, 79.2 + e * 3], [112, 76 + e * 3, 1], [110, 79.6 + e * 3], [100, 82.4 + e * 3], [90, 79.6 + e * 3]], rd, { lw: 0.8, steps: 4, pits: false, seed: 203 });
      /* the tusks, longer: they sweep out past the cheek and up */
      nub(c, [[89, 78.5], [79.5, 75.5], [75.4, 65 - e * 3], [78.4, 57 - e * 3, 1], [83.4, 62.6 - e * 3], [84.6, 69.5], [91.2, 75.4]], wh, { lw: 0.8 });
      nub(c, mirror([[89, 78.5], [79.5, 75.5], [75.4, 65 - e * 3], [78.4, 57 - e * 3, 1], [83.4, 62.6 - e * 3], [84.6, 69.5], [91.2, 75.4]], 100), wh, { lw: 0.8 });
      /* the moustache: two thin curls that run out over the lip and wind into a spiral each */
      [0, 1].forEach(function (k) {
        var mv = volute(k ? 100.6 : 99.4, 69, k ? -0.18 : PI + 0.18, 24, k ? -4.4 : 4.4, 2.2, 0.55, 12);
        G.part(c, ribbon(mv, 2), lq, { lw: 0.8, steps: 1, pits: false, seed: 204 + k });
      });
      curl(c, 100, 79 + e * 2.5, PI / 2, 8, 2.2, 0.5, lq, { lw: 0.8 });
      /* the Wat Arun border: thirty-six beads of glass in blue, white and gold, ringing the mouth and running along both brows */
      if (!sil) {
        var bi = 0, bd2 = function (x, y) { c.fillStyle = mz[bi % 3]; c.beginPath(); c.arc(x, y, 1.1, 0, 7); c.fill(); c.strokeStyle = G.rgba(gd.ink, 0.6); c.lineWidth = 0.35; c.stroke(); bi++; };
        for (var rg = 0; rg < 20; rg++) bd2(100 + cos(rg * PI / 10 + 0.3) * 17.2, 75 + sin(rg * PI / 10 + 0.3) * 8.6 + (sin(rg * PI / 10 + 0.3) > 0 ? e * 3 : 0));
        for (var bw = 0; bw < 8; bw++) { bd2(78.6 + bw * 2.9, 42.8 + bw * 1.0); bd2(121.4 - bw * 2.9, 42.8 + bw * 1.0); }
      }
      c.restore();
      c.restore();
    } };

  /* ---------------------------------------------------------------- Lanna singha */
  B.singha = { stone: "white", spout: false,
    draw: function (c, s) {
      var st = S.white, gd = S.gold, rd = S.red, t = s.t, e = env(s, 1400), q = s.poke == null ? -1 : s.poke, sil = !!G.sil, cream = "#f3e7c2";
      /* the roar: the mouth flies open and is held until 40% of the window, then closes */
      var roar = q < 0 || q > 1400 ? 0 : q < 560 ? G.ease(q / 110) : Math.max(0, 1 - (q - 560) / 420);
      var br = sin(t * 0.0014) * 0.8, turn = sin(t * PI * 2 / 7000) * 0.04 - roar * 0.1, jaw = 0.2 + 0.25 * roar;
      var fl = frac(t / 3000) < 0.12 ? sin(frac(t / 3000) / 0.12 * PI) : 0, sway = sin(t * 0.002);
      var whip = q >= 0 && q < 1900 ? 0.55 * sin(q * 0.022) * exp(-q / 650) : 0, lin = q >= 0 && q < 1900 ? exp(-q / 650) : 0;

      /* plinth: two white steps, a gold lotus-petal band, a red stripe */
      G.part(c, [[4, 188, 1], [196, 188, 1], [198, 200, 1], [2, 200, 1]], st, { lw: 1.2, steps: 1, seed: 201 });
      G.cut(c, [[8, 194], [192, 194]], rd, 1.6, { col: rd.base });
      G.part(c, [[12, 178, 1], [188, 178, 1], [194, 188, 1], [6, 188, 1]], st, { lw: 1.2, steps: 1, seed: 202 });
      G.part(c, [[16, 171, 1], [184, 171, 1], [186, 178, 1], [14, 178, 1]], gd, { lw: 1.1, steps: 1, shineAt: sweep(t, 175) });
      for (var pt = 0; pt < 6; pt++) { var px = 28 + pt * 29; G.cut(c, [[px - 11, 187], [px - 8, 181], [px, 179], [px + 8, 181], [px + 11, 187]], gd, 0.9, { col: st.dark }); }

      /* the animal stands a little smaller on its plinth, so the raised head and its mane stay inside the box */
      c.save(); c.translate(100, 171); c.scale(0.86, 0.86); c.translate(-100, -171);
      /* the tail, as on the temple lions: a fan of five flame curls springing from the haunch, the longest at the back, the outer edge toothed like a leaf;
         it sways, and whips on the roar */
      for (var tl = 0; tl < 5; tl++) {
        var ta = -2.62 + tl * 0.22 + sway * 0.05 * (1 + tl * 0.3) + whip * (1 + tl * 0.3), tln = 84 - tl * 6;
        curl(c, 34 + tl * 3.5, 148 - tl * 1.5, ta, tln, 6.2 - tl * 0.5, 1.2 - tl * 0.12, tl === 2 ? gd : st, { lw: 1.1, base: tl === 2 ? null : (tl % 2 ? cream : null) });
        if (tl === 0) for (var sr = 0; sr < 6; sr++) {                               /* serrations along the outermost curl's outer edge */
          var su = 0.2 + sr * 0.13, sa = ta - 0.25 + 1.2 * su * su * 0.35, sx = 34 + cos(ta) * tln * su * 0.65 + cos(ta + 1.2 * su * su) * tln * su * 0.35, sy = 148 + sin(ta) * tln * su * 0.65 + sin(ta + 1.2 * su * su) * tln * su * 0.35;
          nub(c, [[sx, sy, 1], [sx + cos(sa - 1.3) * 7, sy + sin(sa - 1.3) * 7, 1], [sx + cos(sa) * 3.4, sy + sin(sa) * 3.4, 1]], st, { lw: 0.6, steps: 1, base: sr % 2 ? gd.base : cream });
        }
      }

      /* haunch, seated, and the hind foot at the plinth */
      G.part(c, [[30, 172, 1], [32, 130], [52, 110], [78, 112], [96, 130], [102, 156], [98, 166], [90, 172, 1]], st, { lw: 1.5, round: 0.7, seed: 203 });
      G.cut(c, [[44, 150], [60, 134], [82, 132]], st, 0.9, { glint: 1 });
      G.part(c, [[84, 170, 1], [86, 162], [96, 158], [106, 162], [108, 171, 1]], st, { lw: 1.2, round: 0.5, seed: 204 });
      for (var hf = 0; hf < 3; hf++) G.cut(c, [[92 + hf * 5, 162], [93 + hf * 5, 171]], st, 0.7);

      c.save(); c.translate(0, br);
      /* chest: a barrel */
      G.part(c, [[56, 126], [62, 88], [84, 66], [112, 66], [132, 86], [136, 118], [128, 150], [110, 168], [80, 160]], st, { lw: 1.6, round: 0.8, seed: 205 });
      c.restore();
      /* forelegs: two straight columns, the near one a little forward, each with a cream border down its outer edge, notched in six small leaves;
         four toes, claws and a gold anklet */
      [0, 1].forEach(function (k) {
        var x0 = 96 + k * 18, w = 15;
        G.part(c, [[x0, 118, 1], [x0 + w, 116, 1], [x0 + w + 1, 160, 1], [x0 + w + 3, 170, 1], [x0 - 2, 172, 1], [x0 - 1, 160, 1]], st, { lw: 1.3, steps: 1, round: 0.5, seed: 206 + k });
        G.part(c, [[x0 + w - 4.4, 119, 1], [x0 + w, 116, 1], [x0 + w + 1, 160, 1], [x0 + w - 3.6, 160, 1]], st, { lw: 0.8, steps: 1, base: cream, pits: false });
        for (var ln = 0; ln < 6; ln++) curl(c, x0 + w + 0.4 + ln * 0.14, 121 + ln * 6.5, 0.55 + sin(t * 0.0021 + ln + k) * 0.05, 7, 2.1, 0.7, st, { lw: 0.6, base: ln % 3 === 0 ? gd.base : cream });
        G.part(c, [[x0 - 1, 156, 1], [x0 + w + 1, 156, 1], [x0 + w + 2, 161, 1], [x0 - 2, 161, 1]], gd, { lw: 0.9, steps: 1, shineAt: sweep(t, 158 + k * 8), pits: false });
        for (var tc = 0; tc < 4; tc++) { G.cut(c, [[x0 + 1 + tc * 3.8, 164], [x0 + 1.5 + tc * 3.8, 171]], st, 0.7); nub(c, [[x0 + 0.4 + tc * 3.8, 171.5, 1], [x0 + 3 + tc * 3.8, 171.5, 1], [x0 + 2 + tc * 3.8, 174.5, 1]], st, { lw: 0.6, base: st.dark, steps: 1 }); }
      });
      c.save(); c.translate(0, br);
      /* the neck, a column running up from the chest to the head, ringed with collar bands and a ruff of curls down its back */
      G.part(c, [[88, 98], [96, 56], [118, 40], [138, 62], [134, 104]], st, { lw: 1.5, round: 0.7, seed: 220 });
      G.cut(c, [[92, 72], [112, 78], [136, 72]], st, 1.1, { glint: 1 }); G.cut(c, [[91, 88], [112, 95], [135, 88]], st, 1.1);
      G.cut(c, [[92, 80], [112, 86], [136, 80]], gd, 2.6, { col: gd.base });
      for (var rf = 0; rf < 5; rf++) curl(c, 95 - rf * 1.1, 58 + rf * 9, PI + 0.3 + rf * 0.11 + sin(t * 0.0021 - rf * 0.8) * 0.06, 18 - (rf % 2) * 3, 4.8, 1.3, rf % 3 === 1 ? gd : st, { lw: 0.9, base: rf % 3 === 1 ? null : cream });
      /* mane curls down the chest, three rows shrinking */
      for (var rw = 0; rw < 3; rw++) for (var cu = 0; cu < 3; cu++) {
        var sg = (cu + rw) % 2 ? 1 : -1, ln2 = 30 - rw * 7;
        curl(c, 64 + cu * 12 + rw * 3, 98 + rw * 14 + (cu % 2) * 3, PI * 0.5 + sg * 0.3 + sin(t * 0.0021 - (rw * 3 + cu) * 0.7) * 0.06, ln2, 6.4 - rw * 1, sg * 1.5, (cu + rw) % 3 === 0 ? gd : st, { lw: 1 });
      }
      /* the bib, a shield of white with a leaf-flame border: eight small flames round its edge, every third gold, and a gold lozenge of glass set in it */
      G.part(c, [[94, 92, 1], [128, 92, 1], [132, 132], [111, 156, 1], [90, 132]], st, { lw: 1.4, seed: 208 });
      G.part(c, [[111, 101, 1], [125, 121, 1], [111, 145, 1], [97, 121, 1]], gd, { lw: 1.1, steps: 1, shineAt: sweep(t, 120), seed: 209 });
      G.cut(c, [[111, 105], [121, 121], [111, 140], [101, 121], [111, 105]], gd, 0.8, { col: gd.ink });
      [[94, 96, PI + 0.5], [91.4, 109, PI + 0.2], [90.4, 124, PI - 0.1], [128, 96, -0.5], [130.6, 109, -0.2], [131.6, 124, 0.1], [101, 148, PI / 2 + 0.8], [121, 148, PI / 2 - 0.8]].forEach(function (V, n) {
        curl(c, V[0], V[1], V[2] + sin(t * 0.0021 + n) * 0.06, 12, 3.4, V[2] > PI * 0.4 && V[2] < PI * 1.4 ? -1 : 1, n % 3 === 0 ? gd : st, { lw: 0.8, base: n % 3 === 0 ? null : cream });
      });
      if (!sil) {
        var gem = ["#d6342a", "#2f6fd6", "#2fa36b", "#f7f2e0"], front = frac(t / 5000) * 6.2 - 0.6;
        for (var gr = 0; gr < 3; gr++) for (var gc = 0; gc < 5; gc++) {
          var gx = 100 + gc * 5, gy = 113 + gr * 7, lit = G.clamp(1 - abs(front - gc) * 1.1, 0, 1) + G.clamp(roar * 1.2 - 0.2, 0, 1);
          c.save(); c.translate(gx, gy); c.rotate(PI / 4); c.fillStyle = gem[(gc + gr) % 4]; c.fillRect(-2, -2, 4, 4);
          c.fillStyle = G.rgba("#ffffff", G.clamp(lit, 0, 1) * 0.85); c.fillRect(-2, -2, 4, 4);
          c.strokeStyle = G.rgba(gd.ink, 0.8); c.lineWidth = 0.6; c.strokeRect(-2, -2, 4, 4); c.restore();
        }
      }
      c.restore();

      /* the head, raised on its neck: three-quarter, with its mane; it turns a hair and lifts on the roar */
      c.save(); c.translate(0, br - 22 - 4 * roar); rot(c, 118, 92, turn, function () {
        var cx = 140, cy = 60, fa = 0.25 * roar, i, a;
        /* the mane: a ring of nine flame curls behind the skull, every third one gold */
        for (i = 0; i < 9; i++) {
          a = i / 9 * PI * 2 + 0.2;
          var back = 0.5 - 0.5 * cos(a), ml = 26 + 16 * back;                           /* longer at the back of the head than at the face */
          G.lock(c, cx + cos(a) * (30 + 3 * roar), cy + sin(a) * (30 + 3 * roar), a + 0.3 + fa + sin(t * 0.0021 - i * 0.7) * 0.05 + 0.3 * lin * sin(q * 0.011 - i * 0.8), ml * (1 + 0.1 * roar), 10 + 2 * back, 1.25, i % 3 === 0 ? gd : st, { lw: 1.3, base: i % 3 === 0 ? null : "#f1e6c4" });
        }
        /* ears, round, rimmed in gold */
        G.part(c, circ(112, 36, 9.5, 8, 0.05), gd, { lw: 1.1, round: 0.7, shineAt: sweep(t, 36), seed: 210 });
        G.part(c, circ(112.5, 37, 5.2, 7, 0.05), st, { lw: 0.9, pits: false });
        G.part(c, circ(158, 25, 7.5, 7, 0.05), gd, { lw: 1, round: 0.6, shineAt: sweep(t, 25), pits: false });
        /* skull */
        G.part(c, [[102, 56], [108, 40], [126, 30], [150, 28], [170, 38], [180, 56], [182, 74], [176, 90], [160, 98], [136, 98], [114, 90], [104, 74]], st, { lw: 1.7, round: 0.9, seed: 211 });
        /* the frill of curls over the skull's back edge */
        for (i = 0; i < 7; i++) { a = PI * 0.62 + i * 0.7; curl(c, cx + cos(a) * 38, cy + 4 + sin(a) * 38, a + 0.5 + fa + sin(t * 0.0021 - i * 0.7 + 1) * 0.05 + 0.3 * lin * sin(q * 0.011 - i * 0.8 + 1), 20 * (1 + 0.1 * roar), 5.5, 1.3, i % 3 === 1 ? gd : st, { lw: 1, base: i % 3 === 1 ? null : "#f6edd0" }); }
        /* heavy brows over the eyes, dropping toward the nose; a gold flame between them */
        G.part(c, [[110, 52], [124, 42], [142, 44], [148, 54], [136, 54], [120, 60]], st, { lw: 1.5, round: 0.5, seed: 212 });
        G.part(c, [[150, 46], [164, 42], [176, 48], [172, 56], [160, 54], [150, 58]], st, { lw: 1.4, round: 0.5, seed: 217 });
        G.lock(c, 146, 44, -1.9, 26, 7, 1.5, gd, { lw: 1 });
        G.lock(c, 130, 41, -2.3, 18, 5, 1.2, gd, { lw: 0.9 });
        goggle(c, 126, 62, 8.4, st, { white: "#ffffff", iris: "#6a3d12", pr: 0.46, squint: 0.3, slant: 0.5, blink: blink(t, 14), look: [0.6, 0.1], deep: 0.5 });
        goggle(c, 163, 60, 6.6, st, { white: "#ffffff", iris: "#6a3d12", pr: 0.46, squint: 0.3, slant: -0.5, blink: blink(t + 70, 14), look: [0.6, 0.1], deep: 0.5 });
        /* the muzzle: broad and short, the nose block ending at x 172, a bridge running down between the eyes, two round flared wings at its foot, wrinkles over it */
        G.part(c, [[146, 58], [157, 58], [165, 66], [171, 73], [175, 82], [174, 94], [164, 99], [152, 97], [144, 86], [142, 70]], st, { lw: 1.4, round: 0.8, seed: 213 });
        G.part(c, circ(160, 89, 6.6, 8, 0.05), st, { lw: 1.1, round: 0.8, pits: false, seed: 218 }); G.part(c, circ(168, 82, 5.6, 8, 0.05), st, { lw: 1.1, round: 0.8, pits: false, seed: 219 });
        G.hollow(c, [[157, 88], [162, 86], [164, 91], [159, 93]], st, { deep: 1 }); G.hollow(c, [[166, 80], [170, 79], [171, 84], [167, 85]], st, { deep: 1 });
        G.cut(c, [[142, 62], [149, 66], [147, 72]], st, 0.8); G.cut(c, [[150, 54], [158, 60]], st, 0.7); G.cut(c, [[160, 68], [166, 72]], st, 0.7); G.cut(c, [[146, 80], [140, 86]], st, 0.7);
        for (var wk = 0; wk < 3; wk++) G.dot(c, 150 + wk * 6, 98 - wk * 0.8, 0.9, st.dark);
        /* the mouth: the lip curled back from four fangs, the jaw short and hinged */
        G.hollow(c, [[138, 94], [168, 92], [176, 98], [168, 114], [150, 114]], st, { deep: 1 });
        rot(c, 140, 94, jaw, function () {
          G.part(c, [[134, 94], [148, 98], [158, 98], [163, 102], [161, 110], [148, 113], [138, 109]], st, { lw: 1.4, round: 0.6, seed: 214 });
          G.teeth(c, [[147, 98], [155, 99], [162, 102]], 4, 3, -1, st, { col: "#ffffff" });
          G.part(c, ribbon([[146, 99, 3.6], [156, 100, 3.8], [165, 104 + fl * 2, 3.2], [168, 109 + fl * 4, 2]], 4), rd, { lw: 1, steps: 1, pits: false, seed: 215 });
          G.cut(c, [[150, 99], [158, 101], [165, 104]], rd, 0.6, { col: rd.dark });
        });
        G.part(c, [[140, 90], [154, 92], [168, 92], [176, 96], [172, 102], [160, 99], [148, 98]], st, { lw: 1.3, round: 0.5, seed: 216 });
        G.teeth(c, [[149, 98], [160, 99], [172, 100]], 4, 4.6, 1, st, { col: "#ffffff", fangs: [0, 3] });
        G.cut(c, [[142, 90], [138, 98], [140, 104]], st, 0.8);
        G.lock(c, 174, 92, -0.6, 12, 3.6, -1.6, st, { lw: 0.9 });
      });
      c.restore();
      c.restore();
    } };


  /* ---------------------------------------------------------------- Maya Chaac mask (front) */
  B.chaac = { stone: "puuc", spout: false, front: true,
    draw: function (c, s) {
      var st = S.puuc, t = s.t, e = env(s, 1400), e2 = env(s, 1900), sil = !!G.sil, br = G.rng(161), blu = "#7fb4e8", nrel = 0;
      /* a carved relief on one block: a stepped fret, a round scroll, or chisel ridges, in turn, so no two neighbours match */
      function relief(x, y, w, h) {
        if (sil || w < 9 || h < 9) return;
        var kind = nrel++ % 3, l = x + 3, r = x + w - 3, tp = y + 3, b = y + h - 3, sp = Math.min(3.2, (r - l) / 6, (b - tp) / 6), i, pts = [];
        if (kind === 0) {
          pts = [[l, b, 1], [l, tp, 1], [r, tp, 1], [r, b, 1], [l + sp, b, 1], [l + sp, tp + sp, 1], [r - sp, tp + sp, 1], [r - sp, b - sp, 1], [l + 2 * sp, b - sp, 1], [l + 2 * sp, tp + 2 * sp, 1]];
          G.cut(c, pts, st, 0.8, { glint: 1 });
        } else if (kind === 1) {
          var cx = x + w / 2, cy = y + h / 2, R = Math.min(w, h) / 2 - 2.6, a0 = nrel * 1.7;
          for (i = 0; i <= 16; i++) { var a = a0 + i * 0.4; pts.push([cx + cos(a) * (R * (1 - i / 19) + 0.6), cy + sin(a) * (R * (1 - i / 19) + 0.6)]); }
          G.cut(c, pts, st, 0.85, { glint: 1 });
        } else {
          for (i = 0; i < 3; i++) G.cut(c, [[l, tp + (i + 0.6) * (b - tp) / 3], [r, tp + (i + 0.2) * (b - tp) / 3]], st, 0.75, { glint: i === 0 });
        }
      }
      /* a cut block of the veneer: hard corners, its own tone, a visible joint, one carving on its face */
      function blk(x, y, w, h, o) {
        o = o || {};
        nub(c, o.pts || [[x, y, 1], [x + w, y, 1], [x + w, y + h, 1], [x, y + h, 1]], st, { steps: 1, lw: 1.3, base: G.mix(st.base, st.dark, br() * 0.18 + (o.dk || 0)) });
        if (o.rel !== false && !o.pts) relief(x, y, w, h);
      }
      /* the wall: a flat recessed field of small rubble, long joints through it; the mask's own blocks stand proud of it, with a shadow on it */
      if (sil) { c.fillStyle = G.sil; c.fillRect(0, 10, 200, 186); } else {
        c.fillStyle = G.mix(st.dark, st.base, 0.25); c.fillRect(0, 10, 200, 186);
        var wg = c.createLinearGradient(0, 10, 0, 196); wg.addColorStop(0, G.rgba(st.ink, 0.22)); wg.addColorStop(0.3, G.rgba(st.ink, 0)); wg.addColorStop(1, G.rgba(st.light, 0.1)); c.fillStyle = wg; c.fillRect(0, 10, 200, 186);
        [[44, 0.8], [98, 1], [140, 0.9], [188, 0.8]].forEach(function (J) { G.cut(c, [[0, J[0]], [100, J[0] + 1.2], [200, J[0]]], st, J[1], { glint: 1, steps: 3 }); });
      }
      /* two courses of stepped frets along the top */
      for (var cr = 0; cr < 2; cr++) for (var i = 0; i < 10 + cr; i++) {
        var x = i * 20 - cr * 10, y = 10 + cr * 13, h = 13;
        if (x < 0 && cr) { x = 0; }
        var w = cr && (i === 0 || i === 10) ? 10 : 20;
        if ((i + cr) % 2) blk(x, y, w, h, {});
        else blk(0, 0, 0, 0, { pts: [[x, y, 1], [x + w, y, 1], [x + w, y + h, 1], [x + w * 0.72, y + h, 1], [x + w * 0.72, y + h * 0.5, 1], [x + w * 0.28, y + h * 0.5, 1], [x + w * 0.28, y + h, 1], [x, y + h, 1]], dk: 0.04 });
      }
      /* two cheek blocks, to fill the face out to the ear spools */
      blk(30, 98, 38, 30, { dk: 0.02 }); blk(132, 98, 38, 30, { dk: 0.02 });
      /* the eyes: square sockets framed in cut blocks, a sloped rim above, ONE carved ring, a flat disc with a drilled pupil, a spiral at the outer corner */
      var pl = wander(t, 15); pl = [pl[0] * 1.25, pl[1] * 1.4];
      [[56, 70, 0], [144, 70, 1]].forEach(function (E) {
        var ex = E[0], ey = E[1], k = E[2], m = k ? -1 : 1;
        blk(0, 0, 0, 0, { pts: [[ex - 27, ey - 22, 1], [ex + 27, ey - 22, 1], [ex + 23, ey - 14, 1], [ex - 23, ey - 14, 1]] });
        G.cut(c, [[ex - 20, ey - 18], [ex - 14, ey - 18], [ex - 14, ey - 16], [ex - 8, ey - 16], [ex - 8, ey - 18], [ex - 2, ey - 18]], st, 0.7); G.cut(c, [[ex + 2, ey - 18], [ex + 8, ey - 18], [ex + 8, ey - 16], [ex + 14, ey - 16], [ex + 14, ey - 18], [ex + 20, ey - 18]], st, 0.7);
        blk(ex - 27, ey - 14, 6, 34); blk(ex + 21, ey - 14, 6, 34); blk(ex - 21, ey + 17, 42, 6);
        G.hollow(c, [[ex - 21, ey - 14, 1], [ex + 21, ey - 14, 1], [ex + 21, ey + 17, 1], [ex - 21, ey + 17, 1]], st, { deep: 0.6 });
        if (!sil) {
          c.strokeStyle = G.rgba(st.ink, 0.5); c.lineWidth = 1.1; c.beginPath(); c.arc(ex, ey + 1, 19.5, 0, 7); c.stroke();
          c.strokeStyle = G.rgba(st.light, 0.5); c.beginPath(); c.arc(ex, ey + 1, 17, 0.6, 2.3); c.stroke();
        }
        /* the eye is a flat round disc, a hair proud of its socket, with one drilled dimple that wanders */
        var lk = k ? [pl[0] * 0.8, pl[1]] : [pl[0], pl[1] * 0.9], dx0 = lk[0] * 3.2, dy0 = lk[1] * 2.6;
        G.part(c, circ(ex, ey + 1, 12.4, 14, 0.001), st, { lw: 1.3, round: 0.35, pits: false, hatch: false, base: G.mix(st.light, st.base, 0.3), seed: 167 + k });
        G.hollow(c, circ(ex + dx0, ey + 1 + dy0, 2.5, 7, 0.05), st, { deep: 0.9 });
        if (!sil) { c.strokeStyle = G.rgba(st.light, 0.9); c.lineWidth = 0.7; c.beginPath(); c.arc(ex + dx0 - 0.4, ey + 1 + dy0 - 0.4, 2.7, 3.4, 5); c.stroke(); }
        /* spiral scroll at the outer corner */
        var sx = ex - m * 17, sy = ey + 12, sp = [];
        for (var q = 0; q < 14; q++) { var a = q * 0.62, r = 1 + q * 0.34; sp.push([sx + m * cos(a * m) * r, sy + sin(a) * r]); }
        G.cut(c, sp, st, 1);
      });
      /* ear spools: two round parts, a rope of ten dots, a hole */
      [[14, 104], [186, 104]].forEach(function (E, k) {
        G.part(c, circ(E[0], E[1], 13, 8, 0.03), st, { lw: 1.3, round: 0.8, seed: 162 + k });
        G.part(c, circ(E[0], E[1], 8, 7, 0.03), st, { lw: 1, round: 0.6, seed: 164 + k, pits: false });
        for (var d = 0; d < 10; d++) G.dot(c, E[0] + cos(d * PI / 5) * 10.4, E[1] + sin(d * PI / 5) * 10.4, 0.9, st.dark);
        G.hollow(c, circ(E[0], E[1], 3, 6, 0.1), st, { deep: 1 });
      });
      /* weathering: the streaks, under both sockets and from the lip; the lime pits */
      streak(c, 45, 94, 44, 4.5, st, 0.38 + 0.3 * (s.rain || 0)); streak(c, 155, 94, 44, 4.5, st, 0.38 + 0.3 * (s.rain || 0));
      streak(c, 45, 94, 40, 7, st, 0.2, "#3b4a32"); streak(c, 155, 94, 40, 7, st, 0.2, "#3b4a32");
      streak(c, 100, 126, 18, 14, st, 0.28 + 0.3 * (s.rain || 0));
      if (!sil) {
        var pr = G.rng(163); c.fillStyle = G.rgba(st.pit, 0.6);
        for (var pp = 0; pp < 70; pp++) { var px = pr() * 200, py = 12 + pr() * 184, ps = 0.5 + pr() * 1.1; c.fillRect(px, py, ps, ps); }
      }
      /* two sprigs of grass rooted in cracks of the top fret, bowing in the wind */
      if (!sil) [[58, 0], [148, 1.3]].forEach(function (V, k) {
        G.cut(c, [[V[0] - 1.5, 10], [V[0] + 1, 14.5], [V[0] - 1, 19], [V[0] + 1.5, 24]], st, 0.9);
        for (var b = 0; b < 5; b++) {
          var sw = sin(t * 0.0013 + V[1] + b * 0.9) * 1.8 + sin(t * 0.0031 + b + k) * 0.5, ln = 6.5 + (b % 3) * 1.7, bx = V[0] + (b - 2) * 1.1;
          c.strokeStyle = b % 2 ? "#6f8f45" : "#4d6b30"; c.lineWidth = 0.9; c.lineCap = "round";
          c.beginPath(); c.moveTo(bx, 10.5); c.quadraticCurveTo(bx + (b - 2) * 1.2 + sw * 0.4, 10.5 - ln * 0.55, bx + (b - 2) * 1.9 + sw, 10.5 - ln); c.stroke();
        }
      });
      /* the stone iguana, crossing the cheek once in six seconds, bobbing its head */
      var ig = frac(t / 6000) / 0.42;
      if (ig < 1 && !sil) {
        c.save(); c.beginPath(); c.rect(0, 10, 200, 186); c.clip();
        var ix = -26 + ig * 252, iy = 94 + sin(ig * 22) * 0.8, ib = sin(ig * 70) * 1.2;
        G.part(c, [[ix, iy], [ix + 6, iy - 5], [ix + 14, iy - 5.4], [ix + 20, iy - 3.5], [ix + 20, iy + 0.5], [ix + 8, iy + 1.6]], S.grey, { lw: 0.9, steps: 4, seed: 166, pits: false });
        G.part(c, [[ix + 19, iy - 3.6 + ib], [ix + 25, iy - 4.6 + ib], [ix + 27, iy - 1.6 + ib], [ix + 21, iy + 0.4 + ib]], S.grey, { lw: 0.8, pits: false });
        nub(c, [[ix + 1, iy - 1], [ix - 12, iy + 2 + sin(ig * 40) * 1.4], [ix - 18, iy - 1], [ix - 12, iy + 0.4], [ix + 2, iy + 1.5]], S.grey, { lw: 0.7 });
        for (var lg = 0; lg < 4; lg++) { var lx = ix + (lg % 2 ? 6 : 15), sw = sin(ig * 60 + lg * 1.6) * 1.6; nub(c, [[lx, iy + 0.5], [lx + sw - 1.5, iy + 4.4], [lx + sw + 1.6, iy + 4.4]], S.grey, { lw: 0.6 }); }
        for (var sp2 = 0; sp2 < 6; sp2++) G.dot(c, ix + 4 + sp2 * 2.6, iy - 5.4 - (sp2 === 3 ? 1.2 : 0.4), 0.8, S.grey.dark);
        G.dot(c, ix + 23, iy - 3.2 + ib, 0.7, S.grey.ink);
        c.restore();
      }
      /* mouth: a band of blocks that drops on a tap, five square upper teeth of five widths, a lower lip with four short teeth, and a fang
         at each corner that curls out and winds into a spiral */
      c.save(); c.translate(0, 4 * e);
      for (var mb = 0; mb < 5; mb++) blk(40 + mb * 24, 140, 24, 32, { rel: false });
      G.hollow(c, [[48, 148, 1], [152, 148, 1], [152, 164, 1], [48, 164, 1]], st, { deep: 0.95 });
      [[62, 9, 10], [79, 12, 12], [100, 13, 13], [121, 12, 11], [138, 9, 9.5]].forEach(function (T) {
        nub(c, [[T[0] - T[1] / 2, 148, 1], [T[0] + T[1] / 2, 148, 1], [T[0] + T[1] / 2 - 0.4, 148 + T[2], 1], [T[0] - T[1] / 2 + 0.4, 148 + T[2], 1]], st, { steps: 1, lw: 1, base: st.light });
        G.cut(c, [[T[0] - 0.5, 150], [T[0] - 0.3, 148 + T[2] * 0.8]], st, 0.5);
      });
      G.cut(c, [[48, 164.4], [100, 165.4], [152, 164.4]], st, 1, { glint: 1 });
      for (var lt2 = 0; lt2 < 4; lt2++) nub(c, [[68 + lt2 * 21 - 4, 164, 1], [68 + lt2 * 21 + 4, 164, 1], [68 + lt2 * 21 + 3, 158.6 + (lt2 % 2) * 1.4, 1], [68 + lt2 * 21 - 3, 158.6 + (lt2 % 2) * 1.4, 1]], st, { steps: 1, lw: 0.9, base: st.light });
      [0, 1].forEach(function (k) {
        var fv = volute(k ? 150 : 50, 152, PI / 2 + (k ? -0.12 : 0.12), 40, k ? -5.0 : 5.0, 4.6, 1.1, 14);
        nub(c, ribbon(fv, 2), st, { lw: 1.1, steps: 1, base: st.light });
        G.cut(c, fv.slice(0, 8).map(function (v) { return [v[0] + (k ? 1 : -1) * 1.2, v[1]]; }), st, 0.6);
      });
      c.restore();
      /* the nose: three cut blocks, 40, 36 and 32 wide, rising from the lip and casting a shadow on the face, then the fat C-hook */
      var vs = arcSpine(98, 106, -PI / 2, 24, 12.5, 4.3 - 3 * e + 0.4 * sin(t * PI * 2 / 3300), 11, 6.5, 20), tip = vs[vs.length - 1], tipx = tip[0], tipy = tip[1], hook = ribbon(vs, 2);
      if (!sil) {
        c.save(); c.translate(5, 6); c.fillStyle = G.rgba(st.ink, 0.28); G.trace(c, hook, true); c.fill();
        for (var nb = 0; nb < 3; nb++) { var wd0 = 40 - nb * 4; c.fillRect(100 - wd0 / 2, 126 - nb * 14, wd0, 14); }
        c.restore();
      }
      for (var nb2 = 0; nb2 < 3; nb2++) {
        var wd = 40 - nb2 * 4, ny = 126 - nb2 * 14, dx = nb2 === 1 ? 1.6 : 0;
        blk(100 - wd / 2 + dx, ny, wd, 14, { dk: nb2 === 1 ? 0.08 : 0, rel: false });
        if (!sil) { c.fillStyle = G.rgba(st.dark, 0.34); c.fillRect(100 - wd / 2 + dx + 1, ny + 11, wd - 2, 2.5); }
      }
      G.cut(c, [[100, 100], [100, 124]], st, 0.8, { glint: 1 });
      G.hollow(c, [[88, 130, 1], [93, 128, 1], [93, 137, 1], [88, 137, 1]], st, {}); G.hollow(c, [[112, 130, 1], [107, 128, 1], [107, 137, 1], [112, 137, 1]], st, {});
      G.part(c, hook, st, { lw: 1.6, steps: 1, round: 0.6, seed: 168,
        paint: function (cc, bb) {
          cc.fillStyle = "rgba(59,74,50,.3)";
          [[0.35, 4.5, 3], [0.55, 5, 3.4], [0.78, 3.6, 2.6], [0.9, 3, 2.2]].forEach(function (L, n) { var p = vs[Math.round(L[0] * (vs.length - 1))]; cc.beginPath(); cc.ellipse(p[0] + (n % 2 ? 2.4 : -2.4), p[1], L[1], L[2], n * 0.8, 0, 7); cc.fill(); });
        } });
      G.cut(c, vs.map(function (q) { return [q[0] - 2, q[1]]; }), st, 0.8, { glint: 1 });
      /* a tap: the nose unwinds, water from its tip, the eyes pour, a small rain cloud grows over the forehead */
      if (e2 > 0.01) {
        G.jet(c, tipx, tipy, 0.05, -0.01, e2, s.poke, 196, { w: 5, g: 0.0016, seed: 9 });
        G.jet(c, 45, 90, -0.004, 0.01, e2 * 0.7, s.poke + 200, 196, { w: 4, g: 0.0016, seed: 11 }); G.jet(c, 155, 90, 0.004, 0.01, e2 * 0.7, s.poke + 500, 196, { w: 4, g: 0.0016, seed: 12 });
        if (!sil) {
          var cs = G.clamp(e2 * 1.3, 0, 1);
          [[-16, 2, 6], [-6, -3, 8], [6, -2, 9], [17, 1, 6.5], [0, 3, 8]].forEach(function (C) {
            c.fillStyle = G.rgba("#9aa6b8", 0.92); c.beginPath(); c.arc(100 + C[0] * cs, 12 + C[1], C[2] * cs, 0, 7); c.fill();
            c.fillStyle = G.rgba("#d6deea", 0.5); c.beginPath(); c.arc(100 + C[0] * cs - 1.5, 12 + C[1] - 2, C[2] * cs * 0.6, 0, 7); c.fill();
          });
        }
      }
      /* idle: the eyes weep, a bead at each lower rim falling beside the stain, bright dashes running down the cheek; dappled light drifts over the stone */
      if (!sil) {
        for (var wd2 = 0; wd2 < 2; wd2++) for (var sd = 0; sd < 2; sd++) {
          var wf = frac(t * 0.00055 + wd2 * 0.5 + sd * 0.27), wy = 94 + wf * 46;
          c.strokeStyle = G.rgba("#cfe6ff", 0.8 * Math.sin(PI * wf)); c.lineWidth = 1.3; c.lineCap = "round"; c.beginPath(); c.moveTo(45 + sd * 110, wy); c.lineTo(45.4 + sd * 110, wy + 5); c.stroke();
        }
        c.save(); c.beginPath(); c.rect(0, 10, 200, 186); c.clip();
        for (var lp = 0; lp < 3; lp++) {
          var lx2 = 100 + 86 * sin(t * 0.00032 + lp * 2.3), ly = 78 + 62 * sin(t * 0.00027 + lp * 1.7 + 1), lg2 = c.createRadialGradient(lx2, ly, 0, lx2, ly, 56);
          lg2.addColorStop(0, "rgba(255,244,205,.3)"); lg2.addColorStop(1, "rgba(255,244,205,0)"); c.fillStyle = lg2; c.fillRect(lx2 - 56, ly - 56, 112, 112);
        }
        c.restore();
      }

      /* a butterfly crosses the mask in the half of every six seconds when the iguana is away */
      var bf6 = (frac(t / 6000) - 0.5) / 0.47;
      if (bf6 > 0 && bf6 < 1 && !sil) butterfly(c, 214 - 238 * bf6 + 9 * sin(bf6 * 17), 76 + 38 * sin(bf6 * 7.2) + 14 * cos(bf6 * 3), PI + 0.5 * cos(bf6 * 7.2 + 0.6), t, "#3f78d6");
      drip(c, 48.5, 93, t, 2400, 0, 47, blu); drip(c, 151.5, 93, t, 2400, 1.7, 47, blu);
      /* a bead swells at the tip of the nose every three seconds and falls onto the cheek */
      drip(c, tipx, tipy + 2, t, 3000, 0.4, 46, blu);
    } };

})();
