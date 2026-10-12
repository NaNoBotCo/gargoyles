/* pen.js — the carving kit every drawing on the page uses.
   Shapes are hand-placed control points run through Catmull-Rom splines. A point
   [x, y, 1] is a hard corner. One light, from the upper left, shades every part:
   a wash, a gradient toward the dark side, hatching in the shadow, pits in the
   stone, then an ink outline that thickens where the form turns away from the light. */
(function () {
  "use strict";
  var G = window.GARG = window.GARG || {};
  var LX = -0.55, LY = -0.83;          /* direction the light comes FROM, unit vector */
  G.light = function (flip) { LX = flip ? 0.55 : -0.55; };
  G.sil = null;                        /* a colour here = draw silhouettes only (cast shadows) */

  /* stones and finishes: base wash, lit face, shadow, ink, pits */
  G.STONES = {
    lime:   { base: "#d6cab1", light: "#f5eedd", dark: "#7f735e", ink: "#2c2721", pit: "#9c8f77" },
    grey:   { base: "#aaa69c", light: "#e2ded4", dark: "#5f5b53", ink: "#24221f", pit: "#7d796f" },
    marble: { base: "#ebe8e0", light: "#ffffff", dark: "#a3a29c", ink: "#3e3f44", pit: "#c9c7bf" },
    sand:   { base: "#d9b27a", light: "#f6dcae", dark: "#8f683b", ink: "#3a2716", pit: "#b48c56" },
    andesite: { base: "#7e7c74", light: "#aeaba1", dark: "#45433e", ink: "#1d1c1a", pit: "#5f5d57" },
    basalt: { base: "#6c675e", light: "#a19b8e", dark: "#3b3832", ink: "#191714", pit: "#4f4b44" },
    steel:  { base: "#c3cad3", light: "#ffffff", dark: "#56606d", ink: "#1f252d", pit: null, shine: 1 },
    gold:   { base: "#e5ad1f", light: "#fff2a6", dark: "#8f5e05", ink: "#3d2600", pit: null, shine: 1 },
    clay:   { base: "#7f868e", light: "#c3c9cf", dark: "#3c4148", ink: "#16191d", pit: "#646a71" },
    glaze:  { base: "#e2a52a", light: "#ffe28c", dark: "#93530b", ink: "#3b1f02", pit: null, shine: 0.6 },
    jade:   { base: "#3f8f5a", light: "#9ddcaa", dark: "#1d4f2e", ink: "#0f2417", pit: null, shine: 0.6 },
    villa:  { base: "#d8b56c", light: "#f7e2a8", dark: "#8d6a2c", ink: "#382609", pit: "#b8964f" },
    puuc:   { base: "#d3c6a2", light: "#f1e8cc", dark: "#857955", ink: "#2d2716", pit: "#aa9e7b" },
    green:  { base: "#2f9a5e", light: "#86e0a6", dark: "#145232", ink: "#0b2416", pit: null, shine: 0.4 },
    white:  { base: "#f1ede3", light: "#ffffff", dark: "#a8a294", ink: "#2a2722", pit: null, shine: 0.3 },
    red:    { base: "#c9351f", light: "#ff8a6a", dark: "#6e140a", ink: "#2a0703", pit: null, shine: 0.4 },
    lacq:   { base: "#1b1a1f", light: "#55525e", dark: "#000000", ink: "#000000", pit: null, shine: 0.5 }
  };

  /* seeded random: the same seed draws the same pits every frame */
  G.rng = function (seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  G.hash = function (str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  G.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  G.lerp = function (a, b, t) { return a + (b - a) * t; };
  G.ease = function (t) { t = G.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  G.mix = function (a, b, t) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var r = Math.round(G.lerp(pa >> 16, pb >> 16, t)), g = Math.round(G.lerp((pa >> 8) & 255, (pb >> 8) & 255, t)), bl = Math.round(G.lerp(pa & 255, pb & 255, t));
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  };
  G.rgba = function (hex, a) { var p = parseInt(hex.slice(1), 16); return "rgba(" + (p >> 16) + "," + ((p >> 8) & 255) + "," + (p & 255) + "," + a + ")"; };

  /* Catmull-Rom through hand-placed points; [x,y,1] keeps a corner */
  G.sp = function (pts, closed, steps) {
    steps = steps || 7;
    var n = pts.length, out = [];
    if (n < 3) return pts.map(function (p) { return [p[0], p[1]]; });
    var get = function (i) { if (closed) return pts[(i + n) % n]; return pts[G.clamp(i, 0, n - 1)]; };
    var last = closed ? n : n - 1;
    for (var i = 0; i < last; i++) {
      var p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      if (p1[2]) p0 = p1;
      if (p2[2]) p3 = p2;
      for (var k = 0; k < steps; k++) {
        var t = k / steps, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        ]);
      }
    }
    if (!closed) out.push([pts[n - 1][0], pts[n - 1][1]]);
    return out;
  };
  G.trace = function (c, poly, closed) {
    c.beginPath(); c.moveTo(poly[0][0], poly[0][1]);
    for (var i = 1; i < poly.length; i++) c.lineTo(poly[i][0], poly[i][1]);
    if (closed) c.closePath();
  };
  function bbox(poly) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    poly.forEach(function (p) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; });
    return [x0, y0, x1, y1];
  }
  G.bbox = bbox;

  /* the ink line: per-segment width from how far the edge faces away from the light */
  G.outline = function (c, poly, closed, ink, lw, o) {
    o = o || {};
    var n = poly.length, cw = signedArea(poly) > 0 ? 1 : -1;
    c.strokeStyle = ink; c.lineCap = "round"; c.lineJoin = "round";
    var lim = closed ? n : n - 1;
    for (var i = 0; i < lim; i++) {
      var a = poly[i], b = poly[(i + 1) % n];
      var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      var nx = dy / L * cw, ny = -dx / L * cw;          /* outward normal */
      var face = nx * LX + ny * LY;                      /* 1 = faces the light */
      var w = lw * (0.45 + 0.85 * G.clamp(-face * 0.9 + 0.35, 0, 1.25));
      if (!closed && o.taper) { var u = i / lim; w *= Math.min(1, 0.25 + 3 * Math.min(u, 1 - u)); }
      if (o.broken && face > 0.55) continue;             /* the line breaks where light hits */
      c.lineWidth = w; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    }
  };
  function signedArea(p) { var s = 0; for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s; }

  /* one carved part */
  G.part = function (c, pts, st, o) {
    o = o || {};
    var poly = Array.isArray(pts[0]) && pts.sp ? pts : G.sp(pts, true, o.steps);
    if (G.sil) { c.fillStyle = G.sil; G.trace(c, poly, true); c.fill(); return poly; }
    var bb = bbox(poly), w = bb[2] - bb[0], h = bb[3] - bb[1], cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2, R = Math.max(w, h) * 0.6;
    var base = o.base || st.base;
    c.save();
    G.trace(c, poly, true); c.fillStyle = base; c.fill();
    c.clip();
    /* the form: lit toward the light, falling into shadow away from it */
    var g = c.createLinearGradient(cx + LX * R, cy + LY * R, cx - LX * R, cy - LY * R);
    var lift = o.lift == null ? 1 : o.lift;
    g.addColorStop(0, G.rgba(st.light, 0.85 * lift)); g.addColorStop(0.42, G.rgba(st.light, 0));
    g.addColorStop(0.62, G.rgba(st.dark, 0)); g.addColorStop(1, G.rgba(st.dark, 0.75));
    c.fillStyle = g; c.fillRect(bb[0] - 2, bb[1] - 2, w + 4, h + 4);
    /* a round form: a soft hot spot near the lit edge */
    if (o.round) {
      var rg = c.createRadialGradient(cx + LX * R * 0.45, cy + LY * R * 0.45, 0, cx + LX * R * 0.45, cy + LY * R * 0.45, R * 0.9);
      rg.addColorStop(0, G.rgba(st.light, 0.55 * o.round)); rg.addColorStop(1, G.rgba(st.light, 0));
      c.fillStyle = rg; c.fillRect(bb[0], bb[1], w, h);
    }
    /* metal and glaze: a sharp sky band and a dark band */
    if (st.shine) {
      var a0 = o.shineAt == null ? 0.33 : o.shineAt;
      var sg = c.createLinearGradient(bb[0], bb[1], bb[0] + w * 0.4, bb[3]);
      sg.addColorStop(G.clamp(a0 - 0.1, 0, 1), G.rgba(st.light, 0)); sg.addColorStop(G.clamp(a0, 0, 1), G.rgba("#ffffff", 0.7 * st.shine));
      sg.addColorStop(G.clamp(a0 + 0.06, 0, 1), G.rgba(st.dark, 0.35 * st.shine)); sg.addColorStop(G.clamp(a0 + 0.2, 0, 1), G.rgba(st.dark, 0));
      c.fillStyle = sg; c.fillRect(bb[0], bb[1], w, h);
    }
    /* hatching on the shadow side, along the form */
    if (o.hatch !== false && !st.shine) {
      var hs = o.hatchGap || 3.2, ang = o.hatchAng == null ? 0.9 : o.hatchAng;
      c.strokeStyle = G.rgba(st.ink, 0.22); c.lineWidth = 0.55;
      var ca = Math.cos(ang), sa = Math.sin(ang), span = R * 2.2;
      for (var k = -span; k < span; k += hs) {
        var px = cx + ca * k, py = cy + sa * k;
        var along = (px - cx) * -LX + (py - cy) * -LY;        /* + = shadow side */
        if (along < R * 0.05) continue;
        c.globalAlpha = G.clamp(along / R, 0, 1);
        c.beginPath(); c.moveTo(px - sa * span, py + ca * span); c.lineTo(px + sa * span, py - ca * span); c.stroke();
      }
      c.globalAlpha = 1;
    }
    /* pits in the stone */
    if (st.pit && o.pits !== false) {
      var r = G.rng(o.seed || (Math.round(bb[0] * 7 + bb[1] * 13) + 11)), n = Math.min(160, (w * h) / 55);
      c.fillStyle = G.rgba(st.pit, 0.55);
      for (var i = 0; i < n; i++) { var x = bb[0] + r() * w, y = bb[1] + r() * h, s = 0.35 + r() * 0.9; c.fillRect(x, y, s, s); }
    }
    if (o.paint) o.paint(c, bb);
    c.restore();
    if (o.line !== false) G.outline(c, poly, true, o.ink || st.ink, o.lw || 1.6, o);
    return poly;
  };

  /* an interior contour: thinner than the outline, tapered at both ends */
  G.cut = function (c, pts, st, w, o) {
    if (G.sil) return;
    o = o || {};
    var poly = G.sp(pts, false, o.steps || 6);
    c.save();
    if (o.glint) {                                         /* the lit lip of a cut */
      c.translate(LX * 0.7, LY * 0.7); G.outline(c, poly, false, G.rgba(st.light, 0.8), (w || 1) * 0.8, { taper: 1 });
      c.translate(-LX * 0.7, -LY * 0.7);
    }
    G.outline(c, poly, false, o.col || st.ink, w || 1, { taper: 1 });
    c.restore();
  };
  /* a carved hollow: dark pool with a lit rim on the far side */
  G.hollow = function (c, pts, st, o) {
    if (G.sil) return;
    o = o || {};
    var poly = G.sp(pts, true, 6), bb = bbox(poly);
    c.save(); G.trace(c, poly, true);
    var g = c.createLinearGradient(bb[0], bb[1], bb[2], bb[3]);
    g.addColorStop(0, G.rgba(st.ink, o.deep || 0.85)); g.addColorStop(1, G.rgba(st.dark, 0.6));
    c.fillStyle = g; c.fill(); c.restore();
    G.outline(c, poly, true, G.rgba(st.ink, 0.9), o.lw || 0.9);
  };
  G.dot = function (c, x, y, r, col) { if (G.sil) return; c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };

  /* a carved stone eye: lids, a ball, a drilled pupil. blink 0..1, look [-1..1, -1..1] */
  G.eye = function (c, x, y, r, st, o) {
    if (G.sil) return;
    o = o || {};
    var b = G.clamp(o.blink || 0, 0, 1), lx = (o.look ? o.look[0] : 0) * r * 0.32, ly = (o.look ? o.look[1] : 0) * r * 0.25;
    var tilt = o.tilt || 0, sq = o.squint || 0;
    c.save(); c.translate(x, y); c.rotate(tilt);
    /* socket shadow */
    c.fillStyle = G.rgba(st.dark, 0.55); c.beginPath(); c.ellipse(0.12 * r, 0.1 * r, r * 1.3, r * 1.05, 0, 0, 7); c.fill();
    /* ball */
    var top = -r * (1 - sq * 0.5), bot = r * 0.9;
    c.beginPath(); c.moveTo(-r, 0); c.quadraticCurveTo(-0.1 * r, top * 1.25, r, -0.05 * r); c.quadraticCurveTo(0.1 * r, bot * 1.15, -r, 0); c.closePath();
    var bg = c.createRadialGradient(-0.35 * r, -0.4 * r, 0, 0, 0, r * 1.2);
    bg.addColorStop(0, o.white || st.light); bg.addColorStop(1, o.whiteDark || st.base);
    c.fillStyle = bg; c.fill();
    c.save(); c.clip();
    if (o.iris) { c.fillStyle = o.iris; c.beginPath(); c.arc(lx, ly, r * 0.62, 0, 7); c.fill(); }
    c.fillStyle = o.pupil || st.ink; c.beginPath(); c.arc(lx, ly, r * (o.iris ? 0.3 : 0.36), 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.75)"; c.beginPath(); c.arc(lx - r * 0.14, ly - r * 0.16, r * 0.11, 0, 7); c.fill();
    /* the lids close from above, a little from below */
    if (b > 0) {
      c.fillStyle = o.lid || st.base;
      c.fillRect(-r * 1.3, -r * 1.4, r * 2.6, r * 1.4 * b * 1.05 + r * 0.05);
      c.fillRect(-r * 1.3, r * (1 - b * 0.45), r * 2.6, r * 1.4);
    }
    c.restore();
    /* lid lines and the inner corner */
    c.strokeStyle = st.ink; c.lineCap = "round";
    c.lineWidth = r * 0.22; c.beginPath(); c.moveTo(-r * 1.02, 0.02 * r); c.quadraticCurveTo(-0.1 * r, top * 1.3 + b * r * 1.2, r * 1.04, -0.05 * r); c.stroke();
    c.lineWidth = r * 0.1; c.beginPath(); c.moveTo(-r * 0.9, 0.12 * r); c.quadraticCurveTo(0.1 * r, bot * 1.2 - b * r * 0.5, r * 0.95, 0.05 * r); c.stroke();
    c.lineWidth = r * 0.08; c.beginPath(); c.moveTo(-r * 1.02, 0); c.lineTo(-r * 1.3, 0.12 * r); c.stroke();
    c.restore();
  };

  /* a row of teeth along a jaw line; dir +1 points down, -1 up */
  G.teeth = function (c, pts, n, len, dir, st, o) {
    if (G.sil) return;
    o = o || {};
    var poly = G.sp(pts, false, 10), L = 0, segs = [];
    for (var i = 1; i < poly.length; i++) { var d = Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]); segs.push(d); L += d; }
    var col = o.col || st.light;
    for (var k = 0; k < n; k++) {
      var at = (k + 0.5) / n * L, acc = 0, j = 0;
      while (j < segs.length - 1 && acc + segs[j] < at) { acc += segs[j]; j++; }
      var u = (at - acc) / (segs[j] || 1), a = poly[j], b = poly[j + 1] || a;
      var x = G.lerp(a[0], b[0], u), y = G.lerp(a[1], b[1], u);
      var tx = (b[0] - a[0]), ty = (b[1] - a[1]), tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      var fang = o.fangs && o.fangs.indexOf(k) >= 0, ln = len * (fang ? 2.1 : 0.75 + 0.35 * Math.sin(k * 2.7) * 0.5);
      var hw = (L / n) * 0.42 * (fang ? 1.25 : 1);
      var nx = -ty * dir, ny = tx * dir;
      if (Math.abs(ny) < 0.2) { nx = 0; ny = dir; }
      c.beginPath(); c.moveTo(x - tx * hw, y - ty * hw);
      c.quadraticCurveTo(x + nx * ln * 0.6 - tx * hw * 0.3, y + ny * ln * 0.6 - ty * hw * 0.3, x + nx * ln, y + ny * ln);
      c.quadraticCurveTo(x + nx * ln * 0.6 + tx * hw * 0.3, y + ny * ln * 0.6 + ty * hw * 0.3, x + tx * hw, y + ty * hw);
      c.closePath(); c.fillStyle = col; c.fill();
      c.strokeStyle = st.ink; c.lineWidth = 0.7; c.stroke();
    }
  };

  /* a lock of hair, mane or flame: a tapered comma */
  G.lock = function (c, x, y, ang, len, wid, curl, st, o) {
    o = o || {};
    var pts = [], m = 9;
    for (var i = 0; i <= m; i++) {
      var u = i / m, a = ang + curl * u * u;
      var px = x + Math.cos(ang) * len * u * 0.65 + Math.cos(a) * len * u * 0.35, py = y + Math.sin(ang) * len * u * 0.65 + Math.sin(a) * len * u * 0.35;
      pts.push([px, py, Math.sin(Math.PI * Math.pow(u, 0.7)) * wid * (1 - u * 0.6)]);
    }
    var L = [], R = [];
    for (var j = 0; j < pts.length; j++) {
      var p = pts[j], q = pts[Math.min(j + 1, pts.length - 1)], r0 = pts[Math.max(j - 1, 0)];
      var dx = q[0] - r0[0], dy = q[1] - r0[1], d = Math.hypot(dx, dy) || 1;
      L.push([p[0] - dy / d * p[2], p[1] + dx / d * p[2], 1]); R.unshift([p[0] + dy / d * p[2], p[1] - dx / d * p[2], 1]);
    }
    return G.part(c, L.concat(R), st, { lw: o.lw || 1, steps: 1, hatch: o.hatch, pits: false, lift: o.lift, base: o.base });
  };

  /* water thrown from a spout: a parabola that breaks into drops, landing on y = ground */
  G.jet = function (c, x, y, vx, vy, flow, t, ground, o) {
    if (G.sil || flow <= 0.01) return null;
    o = o || {};
    var gr = o.g || 0.0016, pts = [], T = 0, dt = 6;
    while (T < 5000) { var px = x + vx * T, py = y + vy * T + 0.5 * gr * T * T; pts.push([px, py]); if (py > ground) break; T += dt; }
    var w0 = (o.w || 5) * Math.sqrt(flow);
    c.save(); c.lineCap = "round";
    var brk = Math.floor(pts.length * (0.45 + 0.4 * Math.min(1, flow)));
    /* the rope of water */
    for (var pass = 0; pass < 2; pass++) {
      c.strokeStyle = pass ? "rgba(255,255,255,.75)" : G.rgba(o.col || "#7fb4e8", 0.72);
      for (var i = 1; i < brk; i++) {
        var u = i / brk;
        c.lineWidth = pass ? w0 * 0.28 * (1 - u) : w0 * (1 - 0.5 * u) + Math.sin(i * 0.9 - t * 0.03) * 0.6;
        c.beginPath(); c.moveTo(pts[i - 1][0] + (pass ? -w0 * 0.15 : 0), pts[i - 1][1]); c.lineTo(pts[i][0] + (pass ? -w0 * 0.15 : 0), pts[i][1]); c.stroke();
      }
    }
    /* breaking into drops, moving along the arc */
    var r = G.rng(o.seed || 7);
    c.fillStyle = G.rgba(o.col || "#9cc8f0", 0.85);
    for (var k = 0; k < 26 * Math.min(1.4, flow + 0.3); k++) {
      var ph = ((t * 0.0012 + r()) % 1), idx = Math.floor(G.lerp(brk * 0.8, pts.length - 1, ph));
      var p = pts[Math.min(idx, pts.length - 1)], sp = (1 + ph * 6) * (r() - 0.5) * 2;
      c.beginPath(); c.arc(p[0] + sp, p[1] + sp * 0.4, w0 * (0.18 + r() * 0.2) * (1 - ph * 0.5), 0, 7); c.fill();
    }
    /* splash */
    var end = pts[pts.length - 1];
    c.strokeStyle = "rgba(220,236,255,.8)"; c.lineWidth = 1.2;
    for (var s = 0; s < 3; s++) {
      var ph2 = ((t * 0.002 + s / 3) % 1), rr = 3 + ph2 * 14 * Math.min(1.3, flow + 0.2);
      c.globalAlpha = (1 - ph2) * 0.9; c.beginPath(); c.ellipse(end[0], ground, rr, rr * 0.28, 0, Math.PI, 0); c.stroke();
    }
    c.globalAlpha = 1; c.restore();
    return end;
  };

  /* falling rain; wind pushes it sideways */
  G.rain = function (c, w, h, t, amt, wind, seed) {
    if (amt <= 0.01) return;
    var r = G.rng(seed || 3), n = Math.round(260 * amt * (w * h) / 600000) + 12;
    c.save(); c.strokeStyle = "rgba(200,220,255,.55)"; c.lineWidth = 1;
    var sl = 0.12 + (wind || 0) * 0.5;
    for (var i = 0; i < n; i++) {
      var sx = r() * (w + 200) - 100, sp = 0.7 + r() * 0.5, len = 9 + r() * 12;
      var y = ((r() * h + t * sp) % (h + 40)) - 20, x = sx + y * sl;
      c.globalAlpha = 0.35 + r() * 0.5;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + len * sl, y + len); c.stroke();
    }
    c.globalAlpha = 1; c.restore();
  };

  /* sun altitude in degrees at a place and moment (good to a degree or so) */
  G.sunAlt = function (lat, lon, ms) {
    var d = ms / 86400000 - 10957.5, g = (357.529 + 0.98560028 * d) * Math.PI / 180, q = 280.459 + 0.98564736 * d;
    var L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * Math.PI / 180, e = (23.439 - 0.00000036 * d) * Math.PI / 180;
    var dec = Math.asin(Math.sin(e) * Math.sin(L)), ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
    var gmst = (18.697374558 + 24.06570982441908 * d) % 24, ha = ((gmst * 15 + lon) * Math.PI / 180) - ra, la = lat * Math.PI / 180;
    return Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha)) * 180 / Math.PI;
  };
  /* the moon's phase, 0 new .. 0.5 full .. 1 new */
  G.moonPhase = function (ms) { var p = ((ms / 86400000 - 6.8) / 29.530588853) % 1; return p < 0 ? p + 1 : p; };

  /* a sky for a sun altitude: [top, horizon, haze] */
  G.skyCols = function (alt, wet) {
    var stops = [[-18, "#070a1c", "#121834", "#1a2040"], [-8, "#0d1638", "#2b2f5e", "#3b3a66"], [-2, "#25306b", "#c0607a", "#e6896b"],
                 [3, "#3c5aa8", "#f2a46a", "#ffd2a0"], [12, "#4a86d6", "#bfdcf5", "#f1f4f4"], [40, "#2f74d0", "#a9d2f5", "#eef6fb"]];
    var a = stops[0], b = stops[stops.length - 1];
    for (var i = 0; i < stops.length - 1; i++) if (alt >= stops[i][0] && alt <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; break; }
    if (alt < stops[0][0]) b = a; if (alt > b[0]) a = b;
    var u = a === b ? 0 : (alt - a[0]) / (b[0] - a[0]);
    var out = [G.mix(a[1], b[1], u), G.mix(a[2], b[2], u), G.mix(a[3], b[3], u)];
    if (wet) out = out.map(function (h) { return G.mix(h, alt > 0 ? "#7d8796" : "#1a1d26", wet * 0.65); });
    return out;
  };

  /* ashlar: coursed stone blocks behind a figure */
  G.ashlar = function (c, x, y, w, h, st, o) {
    o = o || {};
    var ch = o.course || 22, r = G.rng(o.seed || 5);
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.fillStyle = st.base; c.fillRect(x, y, w, h);
    for (var yy = y, row = 0; yy < y + h; yy += ch, row++) {
      var off = (row % 2) * ch * 1.1, xx = x - off;
      while (xx < x + w) {
        var bw = ch * (1.6 + r() * 1.4);
        c.fillStyle = G.rgba(r() < 0.5 ? st.light : st.dark, 0.08 + r() * 0.14); c.fillRect(xx + 1, yy + 1, bw - 2, ch - 2);
        c.strokeStyle = G.rgba(st.ink, 0.35); c.lineWidth = 0.8; c.strokeRect(xx + 0.5, yy + 0.5, bw, ch);
        c.strokeStyle = G.rgba(st.light, 0.5); c.beginPath(); c.moveTo(xx + 1.5, yy + ch - 0.5); c.lineTo(xx + bw - 1, yy + ch - 0.5); c.stroke();
        xx += bw;
      }
    }
    if (o.wet) {                                           /* rain streaks down the face */
      c.fillStyle = G.rgba(st.dark, 0.18 * o.wet);
      for (var k = 0; k < 14; k++) { var sx = x + r() * w; c.fillRect(sx, y, 2 + r() * 4, h * (0.3 + r() * 0.7)); }
    }
    c.restore();
  };

  /* draw anything once as a silhouette, offset, as a cast shadow */
  G.castShadow = function (c, fn, dx, dy, alpha, col) {
    var cv = c.canvas, off = G._off || (G._off = document.createElement("canvas"));
    if (off.width !== cv.width || off.height !== cv.height) { off.width = cv.width; off.height = cv.height; }
    var o = off.getContext("2d"); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, off.width, off.height);
    o.setTransform(c.getTransform()); o.translate(dx, dy);
    var keep = G.sil; G.sil = col || "#000"; fn(o); G.sil = keep;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = alpha; c.drawImage(off, 0, 0); c.restore();
  };

  /* canvas sized to its box at device pixels; returns ctx with CSS-pixel units */
  G.fit = function (cv, hFn) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || cv.parentNode.clientWidth || 600;
    var h = hFn ? hFn(w) : (cv.clientHeight || w * 0.6);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c: c, w: w, h: h, dpr: dpr };
  };
  G.reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
})();
