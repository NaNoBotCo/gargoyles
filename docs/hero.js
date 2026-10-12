/* hero.js — the upper gallery of Notre-Dame de Paris at the hour it is in Paris now.
   A gargoyle juts from the buttress pier on the left, Le Stryge leans on the balustrade on the right,
   the flèche, the roof of the choir and its flying buttresses stand behind, Paris lies below.
   Rain makes every gargoyle spout. G.HERO.draw(c, W, H, st) with
   st = { t, alt (sun altitude, degrees), moon (phase 0..1), rain 0..1, wind, poke, pokeWho, cloud 0..1, min? }.
   G.HERO.hit(x, y) names what is under a tap: "notre", "stryge", "pigeon", or "sky".
   The still parts (sky, city, cathedral, pier, balustrade) are drawn once into three cached layers; the
   frame draws only what moves: clouds, stars, boat, smoke, crows, windows, beasts, pigeons, water, rain.
   The beasts may offer G.BEASTS.stryge.drip (tongue tip) and .perch (horn tip), both in the 200 box. */
(function () {
  "use strict";
  var G = window.GARG, S = G.STONES, H = G.HERO = {};
  var sin = Math.sin, cos = Math.cos, PI = Math.PI, abs = Math.abs, hyp = Math.hypot;
  var mix = G.mix, rgba = G.rgba, clamp = G.clamp, rng = G.rng, ease = G.ease, lerp = G.lerp;
  var lay = null;        /* the last layout, for hit tests */
  var lastT = 0;         /* the last frame's clock, so a tap seen by hit() can be timed */
  var taps = [];         /* who was tapped when: the pigeons' scatter outlives the page's 2.2 s poke */
  var bell = null;       /* a tap on the spire: the rooster spins, three crows burst */

  /* ---------------------------------------------------------------- materials */
  /* stone weathered toward grey: Paris limestone is not cream (the beasts use the same) */
  function aged(st, k) { return { base: mix(st.base, S.grey.base, k), light: mix(st.light, S.grey.light, k), dark: mix(st.dark, S.grey.dark, k), ink: st.ink, pit: mix(st.pit, S.grey.pit, k) }; }
  var PARIS = aged(S.lime, 0.42);
  var LEAD = { base: "#8791a1", light: "#cdd5e0", dark: "#434b5a", ink: "#1d222c", pit: "#626c7c" };
  var ZINC = { base: "#7a8aa0", light: "#bccadc", dark: "#3b4559", ink: "#1a202b", pit: null };
  var CREAM = { base: "#dacdb3", light: "#f3ebd7", dark: "#8c7f69", ink: "#2b261f", pit: "#a99c84" };
  var TERRA = { base: "#b4593c", light: "#e08a5e", dark: "#6c2e1d", ink: "#2d140c", pit: null };
  /* a palette pulled toward a colour: haze with distance, dusk, wet */
  function tone(st, col, a) { return { base: mix(st.base, col, a), light: mix(st.light, col, a), dark: mix(st.dark, col, a), ink: mix(st.ink, col, a * 0.5), pit: st.pit ? mix(st.pit, col, a) : null }; }
  function look(st, K, haze) {
    var o = tone(st, K.sky[1], haze);
    if (K.night > 0.02) o = tone(o, "#2a2f58", K.night * 0.52);
    if (K.rain > 0.02) o = tone(o, "#59616f", K.rain * 0.2);
    return o;
  }
  function R(x0, y0, x1, y1) { return [[x0, y0, 1], [x1, y0, 1], [x1, y1, 1], [x0, y1, 1]]; }
  function poly(c, pts, st, o) { o = o || {}; if (o.steps == null) o.steps = 1; return G.part(c, pts, st, o); }
  function E(a, b, t) { return clamp((t - a) / (b - a), 0, 1); }
  function mk(w, h) { var cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(w)); cv.height = Math.max(1, Math.round(h)); return cv; }
  /* a tapered stroke, wide at the start: soot, a rivulet */
  function taper(c, x0, y0, x1, y1, w, col) {
    var dx = x1 - x0, dy = y1 - y0, d = hyp(dx, dy) || 1, nx = -dy / d * w / 2, ny = dx / d * w / 2;
    c.fillStyle = col; c.beginPath(); c.moveTo(x0 + nx, y0 + ny); c.lineTo(x1, y1); c.lineTo(x0 - nx, y0 - ny); c.closePath(); c.fill();
  }

  /* ---------------------------------------------------------------- layout */
  function layout(W, Hh) {
    var port = W < Hh * 0.9, L = { W: W, H: Hh, port: port };
    L.u = port ? Hh / 1000 : Hh / 680;
    L.rail = Hh * (port ? 0.87 : 0.865); L.bal = Hh * (port ? 0.11 : 0.13); L.cop = L.bal * 0.2;
    L.xp = W * (port ? 0.09 : 0.1);
    var sn = port ? 0.86 * W : Math.min(W * 0.5, Hh * 0.8), k = sn / 200;
    /* the beam it lies along is drawn from box x 0 to 125, y 108 (top) to 152 (underside) */
    L.notre = { s: sn, k: k, x: L.xp - 0.1 * sn, y: port ? 0.42 * Hh - 0.54 * sn : 0.06 * Hh };     /* the pier face falls at box x 20: the tail's spade and curl are behind it, the haunch grows out of the wall */
    L.yt = L.notre.y + 108 * k; L.yb = L.notre.y + 152 * k;
    L.cs = Hh * 0.026;                                              /* a course of the corbel under the beam */
    L.yA = L.yb + L.cs * 3 + Hh * (port ? 0.03 : 0.035);             /* set-off A */
    L.yB = L.rail - Hh * 0.04;                                      /* set-off B */
    L.pA = Math.max(10, W * (port ? 0.032 : 0.04)); L.pB = Math.max(5, W * (port ? 0.014 : 0.012));
    L.xA = L.xp + L.pA; L.xB = L.xA + L.pB; L.xb0 = L.xB - 3;       /* the balustrade starts against the pier foot */
    var ss = port ? 0.62 * W : Math.min(W * 0.3, Hh * 0.46);
    L.stryge = { s: ss, k: ss / 200, x: port ? 0.965 * W - 175 * ss / 200 : W - ss, y: L.rail - 0.75 * ss };
    L.hz = Hh * (port ? 0.585 : 0.5);
    L.bands = port ? [0.625, 0.665, 0.70] : [0.545, 0.6, 0.66];      /* base lines of the three Left Bank bands */
    L.seine = Hh * (port ? 0.735 : 0.675); L.riverH = Hh * 0.05;   /* the portrait frame keeps 4% of its height in water above the near roofs */
    L.sp = { x: W * (port ? 0.62 : 0.58) }; L.sp.top = Hh * (port ? 0.07 : 0.08);
    L.cy = port ? { ridge: 0.31, eave: 0.365, cler: 0.41, aisle: 0.45, xend: W + 20 } : { ridge: 0.395, eave: 0.465, cler: 0.525, aisle: 0.57, xend: W * 0.745 };
    L.sp.base = Hh * L.cy.ridge;
    return L;
  }
  function riverY(L, x) { return L.seine + L.H * 0.012 * sin(x / L.W * 3.1 + 0.5) - L.H * 0.008 * x / L.W; }
  /* where the sun stands: at dawn and dusk it slides into the free sky between the beast's horn and the flèche, so the needle is cut out against it */
  function sunPos(L, alt) {
    var port = L.port, x = L.W * lerp(0.4, 0.505, E(14, 3, alt)), y = L.H * ((port ? 0.32 : 0.36) - clamp(alt / 60, 0, 1) * (port ? 0.21 : 0.24));
    return { x: x, y: Math.min(y, L.H * L.cy.ridge - 16) };
  }
  /* the two bridges: one rectangle of deck from quai to quai, shared by the cached drawing and the live traffic */
  var BRIDGES = [0.375, 0.7];
  function bridgeAt(L, f) {
    var bw = 24 * L.u, bx = L.W * f, yy = riverY(L, bx + bw / 2);
    return { x: bx, w: bw, y0: yy - 8 * L.u, y1: yy + L.riverH + 9 * L.u };
  }

  /* ---------------------------------------------------------------- the cache */
  function params(st) {
    var ab = Math.round(st.alt / 0.5), rb = Math.round(clamp(st.rain, 0, 1) * 10), cb = Math.round(clamp(st.cloud == null ? 0.35 : st.cloud, 0, 1) * 4), mb = Math.round((st.moon == null ? 0.5 : st.moon) * 20);
    var K = { ab: ab, rb: rb, cb: cb, mb: mb, alt: ab * 0.5, rain: rb / 10, cloud: cb / 4, moon: mb / 20 };
    K.night = clamp((2 - K.alt) / 10, 0, 1); K.sky = G.skyCols(K.alt, K.rain);
    return K;
  }
  function layers(c, L, K) {
    var cv = c.canvas, dpr = c.getTransform().a || 1, dims = L.W + "x" + L.H + "@" + dpr, key = dims + "|" + [K.ab, K.rb, K.cb, K.mb].join(","), ent = cv._gh;
    if (ent && ent.key === key) return ent;
    var now = window.performance ? performance.now() : 0;
    if (ent && ent.dims === dims && now - ent.at < Math.max(100, ent.cost * 2.2)) return ent;   /* a dragged time slider rebuilds at most every 100 ms, and never more than a third of the time */
    var made = build(L, K, dpr); made.key = key; made.dims = dims; made.at = now; made.cost = 0; made.fresh = true; cv._gh = made;
    return made;
  }
  function canvasAt(L, dpr) { var cv = mk(L.W * dpr, L.H * dpr), c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); return { cv: cv, c: c }; }

  function build(L, K, dpr) {
    var e = { L: L, K: K, dpr: dpr }, back = canvasAt(L, dpr), mid = canvasAt(L, dpr), near = canvasAt(L, dpr);
    drawBack(back.c, L, K);
    e.M = { wins: [], smoke: [], lamps: [], glints: [], spouts: [], drips: [], spark: [] };
    drawMid(mid.c, L, K, e.M);
    drawNear(near.c, L, K, e.M);
    e.back = back.cv; e.mid = mid.cv; e.near = near.cv;
    e.clouds = makeClouds(L, K, dpr);
    var r = rng(12); e.stars = [];
    for (var i = 0; i < 45; i++) e.stars.push([r() * L.W, L.H * (L.hz / L.H - 0.1) * Math.pow(r(), 1.5), 0.45 + r() * 0.55, r() * 6, r() < 0.15 ? 2 : 1.3]);
    return e;
  }

  /* ---------------------------------------------------------------- sky: gradient, sun or moon */
  function drawBack(c, L, K) {
    var W = L.W, Hh = L.H, sky = K.sky, alt = K.alt, wet = K.rain;
    var g = c.createLinearGradient(0, 0, 0, L.hz + Hh * 0.04);
    g.addColorStop(0, sky[0]); g.addColorStop(0.62, sky[1]); g.addColorStop(1, sky[2]);
    c.fillStyle = g; c.fillRect(0, 0, W, L.hz + Hh * 0.08);
    var rr = Math.min(W, Hh * 1.2) * 0.34;
    /* the sun, as light left in the paper: it sits where the stone's upper-left light would have it */
    var sx = L.sun.x, sy = L.sun.y, vis = clamp((alt + 4) / 6, 0, 1) * (1 - wet * 0.75);
    if (vis > 0.01) {
      var low = clamp(1 - abs(alt - 4) / 14, 0, 1), core = mix("#fffdf2", "#ffe2b0", low * 0.8), halo = mix("#ffeec8", "#ffb27a", low * 0.9);
      var sg = c.createRadialGradient(sx, sy, 0, sx, sy, rr);
      sg.addColorStop(0, rgba(core, 0.9 * vis)); sg.addColorStop(0.1, rgba(halo, 0.42 * vis)); sg.addColorStop(0.35, rgba(halo, 0.14 * vis)); sg.addColorStop(1, rgba(halo, 0));
      c.fillStyle = sg; c.fillRect(Math.max(0, sx - rr), Math.max(0, sy - rr), Math.min(W, 2 * rr), Math.min(L.hz + Hh * 0.08 - Math.max(0, sy - rr), 2 * rr));
      var cr = Math.max(11, W * 0.016), dg = c.createRadialGradient(sx, sy, 0, sx, sy, cr * 1.35);
      dg.addColorStop(0, rgba("#fffef8", vis)); dg.addColorStop(0.72, rgba("#fffbe8", 0.92 * vis)); dg.addColorStop(1, rgba("#fff2c8", 0));
      c.fillStyle = dg; c.beginPath(); c.arc(sx, sy, cr * 1.35, 0, 7); c.fill();
    }
    /* the moon, once the sun is below the horizon; at dusk the two can share the sky */
    if (alt < 0 && K.night > 0.05) {
      var mp = K.moon, mx = W * (L.port ? 0.3 : 0.35), my = Hh * (L.port ? 0.1 : 0.19), mr = Math.max(14, W * 0.022);
      c.save(); c.globalAlpha = K.night * (1 - wet * 0.8);
      var mg = c.createRadialGradient(mx, my, mr, mx, my, mr * 4); mg.addColorStop(0, "rgba(255,250,225,.25)"); mg.addColorStop(1, "rgba(255,250,225,0)");
      c.fillStyle = mg; c.beginPath(); c.arc(mx, my, mr * 4, 0, 7); c.fill();
      var k = cos(mp * PI * 2), side = mp < 0.5 ? 1 : -1, darkM = G.mix(sky[0], "#3a3f55", 0.4), q, ang;
      c.fillStyle = darkM; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
      /* the lit face: the limb on the sunward side and the terminator, an ellipse that thins to a crescent or swells to a gibbous */
      c.save(); c.beginPath(); c.moveTo(mx, my - mr);
      c.arc(mx, my, mr, -PI / 2, PI / 2, side < 0);
      for (q = 0; q <= 20; q++) { ang = PI / 2 - PI * q / 20; c.lineTo(mx + side * k * mr * cos(ang), my + mr * sin(ang)); }
      c.closePath(); c.clip();
      c.fillStyle = "#fbf6e0"; c.fillRect(mx - mr - 1, my - mr - 1, mr * 2 + 2, mr * 2 + 2);
      /* the maria: six grey-blue seas at fixed places, and the limb a shade darker, so it is the moon and not a coin */
      var mr2 = rng(77), mpos = [[-0.32, -0.3, 0.26], [0.12, -0.46, 0.17], [0.38, -0.08, 0.22], [-0.12, 0.12, 0.3], [0.2, 0.42, 0.14], [-0.5, 0.2, 0.12]];
      c.fillStyle = rgba("#b9bfc4", 0.42);
      mpos.forEach(function (b) { c.beginPath(); c.ellipse(mx + b[0] * mr, my + b[1] * mr, b[2] * mr, b[2] * mr * (0.7 + mr2() * 0.3), mr2() * 3, 0, 7); c.fill(); });
      c.strokeStyle = rgba("#bdb8a0", 0.35); c.lineWidth = 1.2; c.beginPath(); c.arc(mx, my, mr - 0.6, 0, 7); c.stroke();
      c.restore();
      c.restore();
    }
  }

  /* clouds: a few heaped masses and one thin streak, each a sprite of hard-edged lobes with a warm-grey belly and a lost upper-left edge */
  function makeClouds(L, K, dpr) {
    var W = L.W, Hh = L.H, sky = K.sky, wet = K.rain, cover = clamp(K.cloud + wet * 0.7, 0, 1), out = [], n = 2 + Math.round(cover * 3);
    var warm = clamp(1 - abs(K.alt - 5) / 12, 0, 1) * (1 - wet);
    var lit = mix(mix(sky[2], "#ffffff", 0.55 - wet * 0.3), "#ffbf8c", warm * 0.5);
    var body = mix(mix(sky[1], "#c9cfdb", 0.55), "#3b4150", wet * 0.7), belly = mix(mix(sky[1], "#8c8a94", 0.5), "#242732", wet * 0.5 + K.night * 0.5);
    if (K.night > 0.3) { lit = mix(lit, "#6a7298", K.night * 0.6); body = mix(body, "#2a3050", K.night * 0.7); }
    for (var i = 0; i < n; i++) {
      var r = rng(200 + i), s = W * (0.14 + r() * 0.18) * (1 + wet * 0.4), cw, ch;
      if (L.port) s *= 1.3;
      cw = Math.ceil(s * 1.42); ch = Math.ceil(s * 0.56);
      var cv = mk(cw * dpr, ch * dpr), c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* five to seven hard-edged lobes heaped on a flat base: each is a disc of the lit tone with a flat crescent of belly along its lower right,
         and a hairline only on that edge, so the upper-left edge is lost in the sky */
      var nb = 5 + ((r() * 3) | 0), base = ch * 0.8, bl = [], j, fill = mix(lit, body, wet * 0.8), ink = mix(belly, "#000000", 0.5);
      for (j = 0; j < nb; j++) { var u = (j + 0.5) / nb, rad = s * (0.058 + Math.pow(sin(u * PI), 1.3) * 0.12 + r() * 0.04); bl.push([cw * (0.17 + u * 0.66) + (r() - 0.5) * s * 0.05, base - rad * (0.42 + r() * 0.3) - Math.pow(sin(u * PI), 1.6) * s * 0.08, rad]); }
      for (j = 0; j < 2; j++) { var uu = 0.3 + j * 0.34 + (r() - 0.5) * 0.1; bl.push([cw * (0.17 + uu * 0.66), base - s * (0.19 + r() * 0.05), s * (0.055 + r() * 0.025)]); }     /* two small lobes heaped on the top */
      bl.sort(function (a, b) { return a[2] - b[2]; });
      bl.forEach(function (b) {
        var x = b[0], y = b[1], rd = b[2];
        c.fillStyle = fill; c.beginPath(); c.arc(x, y, rd, 0, 7); c.fill();
        c.save(); c.beginPath(); c.arc(x, y, rd, 0, 7); c.clip();
        c.fillStyle = rgba(belly, 0.62); c.beginPath(); c.rect(x - rd - 2, y - rd - 2, rd * 2 + 4, rd * 2 + 4); c.moveTo(x - rd * 0.3 + rd * 1.02, y - rd * 0.36); c.arc(x - rd * 0.3, y - rd * 0.36, rd * 1.02, 0, 7, true); c.fill("evenodd");
        c.restore();
        c.strokeStyle = rgba(ink, 0.25); c.lineWidth = 0.6; c.beginPath(); c.arc(x, y, rd, -0.1 * PI, 0.62 * PI); c.stroke();
      });
      /* the flat base: a hard line, the belly darkening toward it */
      c.globalCompositeOperation = "source-atop";
      var fg = c.createLinearGradient(0, base - s * 0.11, 0, base); fg.addColorStop(0, rgba(belly, 0)); fg.addColorStop(1, rgba(belly, 0.62));
      c.fillStyle = fg; c.fillRect(0, base - s * 0.11, cw, s * 0.11 + 1);
      c.globalCompositeOperation = "destination-in"; c.fillStyle = "#000"; c.fillRect(0, 0, cw, base); c.globalCompositeOperation = "source-over";
      out.push({ cv: cv, w: cw, h: ch, y: Hh * (L.port ? 0.03 + r() * 0.14 : 0.04 + r() * 0.24) - ch * 0.5, x0: r() * W * 1.7, v: 0.005 + r() * 0.005 });
    }
    /* one thin cirrus streak */
    var cw2 = Math.ceil(W * 0.55), ch2 = 26, cv2 = mk(cw2 * dpr, ch2 * dpr), c2 = cv2.getContext("2d"); c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    var r2 = rng(333);
    for (var q = 0; q < 14; q++) { var qx = cw2 * (0.1 + q / 16), qy = ch2 * 0.5 + (r2() - 0.5) * 7 - q * 0.35, qr = cw2 * (0.05 + r2() * 0.06); c2.save(); c2.translate(qx, qy); c2.scale(1, 0.1); var g2 = c2.createRadialGradient(0, 0, 0, 0, 0, qr); g2.addColorStop(0, rgba(lit, 0.5 * (1 - wet))); g2.addColorStop(1, rgba(lit, 0)); c2.fillStyle = g2; c2.beginPath(); c2.arc(0, 0, qr, 0, 7); c2.fill(); c2.restore(); }
    out.push({ cv: cv2, w: cw2, h: ch2, y: Hh * (L.port ? 0.2 : 0.12), x0: W * 0.3, v: 0.0025, thin: true });
    return out;
  }

  /* ---------------------------------------------------------------- Paris: roofs, landmarks, the river */
  /* one band of Haussmann roofs. Each street block gets its own cornice height (within 15% of its run), its own flat tint (cream, ochre,
     grey-blue, now and then rose) shaded down its right edge, and floors of small windows under a balcony line; the lower slope of the mansard is
     steep and carries dormers, the upper one shallow. Every sixth block is a corner pavilion with a conical turret or a slate gable, every tenth
     stands taller with a row of skylights. Chimney stacks stand in clusters of two to four: square and tan on the far bands, potted in terracotta
     on the near one; streets are dark gaps. */
  function roofBand(c, L, K, M, o) {
    var W = L.W, Hh = L.H, sc = o.sc * L.u, r = rng(o.seed), night = K.night, wet = K.rain, hz = o.haze * 0.6;
    var zn = look(ZINC, K, o.haze), cr = look(CREAM, K, o.haze), tc = look(TERRA, K, o.haze + 0.1), gap = mix(mix(K.sky[1], "#2c2c3a", 0.55), "#10131f", night * 0.6);
    var tints = [cr.base, mix(cr.base, mix("#d8bf8a", K.sky[1], hz), 0.35), mix(cr.base, mix("#aab4c4", K.sky[1], hz), 0.3), mix(cr.base, mix("#d9b5a4", K.sky[1], hz), 0.3)];
    var glass = rgba(mix(K.sky[0], "#1d2233", 0.5), 0.55), stack = mix(cr.base, mix("#b79c70", K.sky[1], hz), 0.45);
    var base = o.base * Hh, x = -20 * sc, left = 0, fh0 = 0, rh0 = 0, gapNext = false;
    c.fillStyle = mix(cr.base, cr.dark, 0.45); c.fillRect(0, base - 2, W, Hh - base + 2);
    while (x < W + 30) {
      if (left <= 0) { left = 3 + ((r() * 4) | 0); fh0 = (24 + r() * 14) * sc; rh0 = (14 + r() * 7) * sc; gapNext = x > 0; }
      if (gapNext) { var gw = (5 + r() * 5) * sc; c.fillStyle = gap; c.fillRect(x, base - fh0 * 0.9, gw, fh0 * 0.9 + 2); x += gw; gapNext = false; continue; }
      var pav = r() < 0.17, tall = !pav && r() < 0.11, tt = r(), tn = r();
      var w = (24 + r() * 24) * sc * (pav ? 1.4 : 1), fh = fh0 * (0.85 + r() * 0.3) * (tall ? 1.25 : 1), rh = rh0 * (tall ? 1.1 : 1);
      var yc = base - fh, ym = yc - rh * 0.62, yr = yc - rh, i, j;
      /* facade: one flat tint, a lit edge on the left, the right sixth in shade, and the cornice line */
      c.fillStyle = tints[tt < 0.45 ? 0 : tt < 0.7 ? 1 : tt < 0.92 ? 2 : 3]; c.fillRect(x, yc, w, fh + 2);
      c.fillStyle = rgba(cr.dark, 0.22); c.fillRect(x + w * 0.84, yc, w * 0.16, fh + 2);
      c.fillStyle = rgba(cr.light, 0.9); c.fillRect(x, yc, 1, fh + 2);
      c.fillRect(x, yc - 1.2 * sc, w, 1.8 * sc); c.fillStyle = rgba(cr.dark, 0.5); c.fillRect(x, yc + 0.8 * sc, w, 1.6 * sc);
      c.fillStyle = rgba(cr.ink, 0.28); c.fillRect(x + w - 1, yc, 1, fh);
      /* floors of windows, one path per block: two floors under 20 px, else three; a hairline balcony under the second */
      var nf = fh < 20 ? 2 : 3, rows = nf === 2 ? [0.36, 0.76] : [0.27, 0.56, 0.84], pitch = 4.6 * sc, ww = 1.7 * sc + 0.4, wh = 3 * sc + 0.5;
      var nc = Math.max(1, Math.floor((w - 3 * sc) / pitch)), wx0 = x + (w - nc * pitch) / 2 + (pitch - ww) / 2;
      c.beginPath();
      for (i = 0; i < nf; i++) for (j = 0; j < nc; j++) {
        var wxx = wx0 + j * pitch, wyy = yc + fh * rows[i] - wh / 2, pl = r(), ps = (r() * 1e6) | 0;
        c.rect(wxx, wyy, ww, wh);
        if (night > 0.05 && M.wins.length < 260 && pl < 0.2) M.wins.push([wxx, wyy, ww, wh, ps]);
      }
      c.fillStyle = glass; c.fill();
      c.strokeStyle = rgba(cr.ink, 0.35); c.lineWidth = 0.5; c.beginPath(); c.moveTo(x, yc + fh * rows[1] + wh / 2 + 0.3); c.lineTo(x + w, yc + fh * rows[1] + wh / 2 + 0.3); c.stroke();
      /* mansard: steep lower slope in blue-grey zinc lit on the left, a shallow upper slope that catches the sky */
      var zg = c.createLinearGradient(x, 0, x + w, 0); zg.addColorStop(0, mix(zn.light, zn.base, 0.35)); zg.addColorStop(0.45, zn.base); zg.addColorStop(1, mix(zn.base, zn.dark, 0.7));
      c.fillStyle = zg; c.beginPath(); c.moveTo(x + w * 0.02, yc); c.lineTo(x + w * 0.98, yc); c.lineTo(x + w * 0.9, ym); c.lineTo(x + w * 0.1, ym); c.closePath(); c.fill();
      c.fillStyle = mix(zn.light, zn.base, 0.45 - wet * 0.3); c.beginPath(); c.moveTo(x + w * 0.1, ym); c.lineTo(x + w * 0.9, ym); c.lineTo(x + w * 0.76, yr); c.lineTo(x + w * 0.24, yr); c.closePath(); c.fill();
      c.strokeStyle = rgba(zn.ink, 0.6); c.lineWidth = Math.max(0.5, 0.8 * sc); c.beginPath(); c.moveTo(x + w * 0.02, yc); c.lineTo(x + w * 0.1, ym); c.lineTo(x + w * 0.24, yr); c.lineTo(x + w * 0.76, yr); c.lineTo(x + w * 0.9, ym); c.lineTo(x + w * 0.98, yc); c.stroke();
      c.strokeStyle = rgba(zn.light, 0.75); c.lineWidth = Math.max(0.5, 0.7 * sc); c.beginPath(); c.moveTo(x + w * 0.24, yr + 0.4); c.lineTo(x + w * 0.76, yr + 0.4); c.stroke();
      /* dormers, each with a pediment and a window that can light at night */
      var nd = w > 30 * sc ? 3 : 2;
      for (var d = 0; d < nd; d++) {
        var dx = x + w * (0.2 + (d + 0.5) / nd * 0.6) - 2.6 * sc, dy = yc - rh * 0.5, dw = 5.2 * sc, dh = 6 * sc;
        if (sc < 0.7) { dw = 4 * sc + 0.8; dh = 4.6 * sc + 0.8; }
        c.fillStyle = cr.base; c.fillRect(dx - 0.8, dy - 0.8, dw + 1.6, dh + 0.8);
        c.fillStyle = mix(K.sky[0], "#1d2233", 0.55); c.fillRect(dx, dy, dw, dh);
        c.fillStyle = zn.dark; c.beginPath(); c.moveTo(dx - 1.4, dy - 0.6); c.lineTo(dx + dw / 2, dy - 3 * sc - 0.6); c.lineTo(dx + dw + 1.4, dy - 0.6); c.closePath(); c.fill();
        c.strokeStyle = rgba(zn.ink, 0.6); c.lineWidth = 0.5; c.stroke();
        var dsd = (r() * 1e6) | 0; if (night > 0.05 && M.wins.length < 260) M.wins.push([dx, dy, dw, dh, dsd]);
      }
      if (pav) {
        if (tn < 0.5) {
          /* a round turret on the left corner under a conical zinc cap */
          var tx = x + w * 0.14, tw2 = w * 0.2, ty = yc - rh * 1.1, ta = ty - rh * 0.95;
          c.fillStyle = tints[tt < 0.45 ? 0 : tt < 0.7 ? 1 : tt < 0.92 ? 2 : 3]; c.fillRect(tx - tw2 / 2, ty, tw2, yc - ty + 1);
          c.fillStyle = rgba(cr.light, 0.9); c.fillRect(tx - tw2 / 2, ty, Math.max(0.8, tw2 * 0.2), yc - ty + 1); c.fillStyle = rgba(cr.dark, 0.3); c.fillRect(tx + tw2 * 0.18, ty, tw2 * 0.32, yc - ty + 1);
          c.fillStyle = glass; c.fillRect(tx - 0.5 * sc, ty + (yc - ty) * 0.3, Math.max(0.9, 1.3 * sc), Math.max(1.5, 3.2 * sc));
          c.fillStyle = zn.base; c.beginPath(); c.moveTo(tx - tw2 * 0.64, ty); c.lineTo(tx, ta); c.lineTo(tx + tw2 * 0.64, ty); c.closePath(); c.fill();
          c.fillStyle = mix(zn.light, zn.base, 0.3); c.beginPath(); c.moveTo(tx - tw2 * 0.64, ty); c.lineTo(tx, ta); c.lineTo(tx - tw2 * 0.1, ty); c.closePath(); c.fill();
          c.strokeStyle = rgba(zn.ink, 0.6); c.lineWidth = 0.5; c.beginPath(); c.moveTo(tx - tw2 * 0.64, ty); c.lineTo(tx, ta); c.lineTo(tx + tw2 * 0.64, ty); c.stroke();
          c.beginPath(); c.moveTo(tx, ta); c.lineTo(tx, ta - 2 * sc - 1); c.stroke();
        } else {
          /* a pitched slate gable standing on the mansard */
          c.fillStyle = zn.dark; c.beginPath(); c.moveTo(x + w * 0.18, ym); c.lineTo(x + w * 0.5, yc - rh * 1.55); c.lineTo(x + w * 0.82, ym); c.closePath(); c.fill();
          c.fillStyle = mix(zn.base, zn.light, 0.25); c.beginPath(); c.moveTo(x + w * 0.18, ym); c.lineTo(x + w * 0.5, yc - rh * 1.55); c.lineTo(x + w * 0.5, ym); c.closePath(); c.fill();
          c.strokeStyle = rgba(zn.ink, 0.6); c.lineWidth = 0.5; c.beginPath(); c.moveTo(x + w * 0.18, ym); c.lineTo(x + w * 0.5, yc - rh * 1.55); c.lineTo(x + w * 0.82, ym); c.stroke();
          c.fillStyle = glass; c.beginPath(); c.arc(x + w * 0.5, ym - rh * 0.2, Math.max(0.7, 1.5 * sc), 0, 7); c.fill();
        }
      }
      if (tall) {                                                    /* skylights on the shallow slope */
        for (i = 0; i < 3; i++) { var kx = x + w * (0.33 + i * 0.17), ky = lerp(yr, ym, 0.3); c.fillStyle = rgba(zn.ink, 0.7); c.fillRect(kx - 0.4, ky - 0.4, 2.4 * sc + 0.8, 1.6 * sc + 0.6); c.fillStyle = rgba(zn.light, 0.95); c.fillRect(kx, ky, 2.4 * sc, 1.6 * sc); }
      }
      /* chimney stacks, two to four to a cluster, a lit left edge; terracotta pots only on the near band */
      if (tn > 0.28 || tall) {
        var ns = 2 + ((r() * 3) | 0), cx0 = x + w * (0.2 + r() * 0.5), stw = (o.pots ? 4.6 : 5.2) * sc, sth = (8 + r() * 6) * sc * (o.pots ? 1 : 1.15);
        for (var s2 = 0; s2 < ns; s2++) {
          var sx = cx0 + s2 * (stw + 0.8 * sc), top = yr + 1 - sth + (s2 % 2) * 2 * sc;
          c.fillStyle = o.pots ? mix(cr.base, cr.dark, 0.25) : stack; c.fillRect(sx, top, stw, sth + 1); c.fillStyle = rgba(cr.light, 0.85); c.fillRect(sx, top, Math.max(0.8, stw * 0.22), sth + 1);
          c.fillStyle = rgba(cr.dark, 0.18); c.fillRect(sx + stw * 0.68, top, stw * 0.32, sth + 1);
          c.fillStyle = cr.dark; c.fillRect(sx - 0.5, top - 1, stw + 1, 1.4 * sc + 0.4);
          if (o.pots) {
            c.fillStyle = tc.base; c.fillRect(sx + stw * 0.2, top - 3.4 * sc - 1, stw * 0.6, 2.8 * sc + 0.4);
            c.fillStyle = tc.light; c.fillRect(sx + stw * 0.2, top - 3.4 * sc - 1, Math.max(0.6, stw * 0.16), 2.8 * sc + 0.4);
            c.fillStyle = tc.dark; c.fillRect(sx + stw * 0.1, top - 3.4 * sc - 1.6, stw * 0.8, 1.1);
          }
          if (o.smoke && s2 === 0 && r() < o.smoke && M.smoke.length < 5) M.smoke.push([sx + stw / 2, top - 3.4 * sc - 2, sc]);
        }
      }
      if (o.flash) M.glints.push([x, yc - rh * 0.9, w, rh * 0.9]);
      x += w; left--; if (left <= 0) gapNext = true;
    }
  }

  function pantheon(c, x, yb, h, K) {
    var st = look(CREAM, K, 0.52), dm = look(LEAD, K, 0.5), r = h / 100;
    var dw = 17 * r, dyT = yb - 24 * r, domeB = yb - 30 * r, domeT = yb - 70 * r;
    /* portico to the left, a pediment over columns */
    poly(c, R(x - 56 * r, yb - 22 * r, x - 15 * r, yb), st, { lw: 0.8, pits: false, hatch: false });
    poly(c, [[x - 59 * r, yb - 22 * r, 1], [x - 36 * r, yb - 32 * r, 1], [x - 12 * r, yb - 22 * r, 1]], st, { lw: 0.8, pits: false, hatch: false });
    for (var i = 0; i < 6; i++) G.cut(c, [[x - 54 * r + i * 7.4 * r, yb - 21 * r], [x - 54 * r + i * 7.4 * r, yb - 1]], st, 0.7);
    /* drum with its colonnade, the dome ribbed, the lantern and cupola on top */
    poly(c, R(x - dw, domeB, x + dw, yb), st, { lw: 0.9, pits: false, hatch: false });
    for (var j = 0; j < 7; j++) G.cut(c, [[x - dw + 3 * r + j * 4.7 * r, domeB + 2 * r], [x - dw + 3 * r + j * 4.7 * r, domeB + 24 * r]], st, 0.6);
    poly(c, [[x - dw - 2 * r, domeB, 1], [x + dw + 2 * r, domeB, 1], [x + dw + 2 * r, domeB + 2.4 * r, 1], [x - dw - 2 * r, domeB + 2.4 * r, 1]], st, { lw: 0.7, pits: false, hatch: false });
    G.part(c, [[x - 15.5 * r, domeB, 1], [x - 14.5 * r, domeB - 14 * r], [x - 8.5 * r, domeB - 27 * r], [x - 1 * r, domeB - 33 * r], [x + 8 * r, domeB - 28 * r], [x + 14.5 * r, domeB - 14 * r], [x + 15.5 * r, domeB, 1]], dm, { lw: 0.9, round: 0.6, pits: false, hatch: false });
    G.cut(c, [[x - 6 * r, domeB - 1], [x - 5 * r, domeB - 18 * r], [x - 2 * r, domeB - 32 * r]], dm, 0.5); G.cut(c, [[x + 5 * r, domeB - 1], [x + 5 * r, domeB - 18 * r], [x + 3 * r, domeB - 30 * r]], dm, 0.5);
    poly(c, R(x - 3.4 * r, domeB - 42 * r, x + 3.4 * r, domeB - 32 * r), st, { lw: 0.7, pits: false, hatch: false });
    G.part(c, [[x - 4 * r, domeB - 42 * r, 1], [x - 2.5 * r, domeB - 47 * r], [x, domeB - 50 * r], [x + 2.5 * r, domeB - 47 * r], [x + 4 * r, domeB - 42 * r, 1]], dm, { lw: 0.6, pits: false, hatch: false });
    c.strokeStyle = st.ink; c.lineWidth = Math.max(0.6, r * 0.8); c.beginPath(); c.moveTo(x, domeB - 50 * r); c.lineTo(x, domeB - 56 * r); c.moveTo(x - 1.6 * r, domeB - 53.5 * r); c.lineTo(x + 1.6 * r, domeB - 53.5 * r); c.stroke();
  }
  function sulpice(c, x, yb, h, K) {
    var st = look(CREAM, K, 0.5), r = h / 100, dk = look(ZINC, K, 0.5);
    poly(c, R(x - 30 * r, yb - 42 * r, x + 30 * r, yb), st, { lw: 0.8, pits: false, hatch: false });
    for (var i = 0; i < 7; i++) G.cut(c, [[x - 26 * r + i * 8.6 * r, yb - 40 * r], [x - 26 * r + i * 8.6 * r, yb - 4 * r]], st, 0.6);
    poly(c, [[x - 32 * r, yb - 42 * r, 1], [x, yb - 54 * r, 1], [x + 32 * r, yb - 42 * r, 1]], st, { lw: 0.8, pits: false, hatch: false });
    /* the taller left tower, finished with a lantern; the right one shorter, left square */
    [[-20, 98, 1], [20, 80, 0]].forEach(function (tw) {
      var tx = x + tw[0] * r, th = tw[1] * r, w = 11 * r;
      poly(c, R(tx - w, yb - th, tx + w, yb - 40 * r), st, { lw: 0.9, pits: false, hatch: false });
      poly(c, R(tx - w - 1.4 * r, yb - th, tx + w + 1.4 * r, yb - th + 3 * r), st, { lw: 0.7, pits: false, hatch: false });
      [[-6, 1], [6, 1]].forEach(function (lv) { G.hollow(c, [[tx + lv[0] * r - 2.2 * r, yb - th + 28 * r, 1], [tx + lv[0] * r - 2.2 * r, yb - th + 14 * r], [tx + lv[0] * r, yb - th + 10 * r, 1], [tx + lv[0] * r + 2.2 * r, yb - th + 14 * r], [tx + lv[0] * r + 2.2 * r, yb - th + 28 * r, 1]], st, { deep: 0.7, lw: 0.5 }); });
      if (tw[2]) { poly(c, R(tx - 6 * r, yb - th - 12 * r, tx + 6 * r, yb - th), st, { lw: 0.8, pits: false, hatch: false }); poly(c, [[tx - 6.8 * r, yb - th - 12 * r, 1], [tx, yb - th - 22 * r, 1], [tx + 6.8 * r, yb - th - 12 * r, 1]], dk, { lw: 0.7, pits: false, hatch: false }); }
      else for (var m = 0; m < 4; m++) poly(c, R(tx - w + m * 6.2 * r, yb - th - 2 * r, tx - w + m * 6.2 * r + 3.2 * r, yb - th), st, { lw: 0.5, pits: false, hatch: false });
    });
  }
  function montparnasse(c, x, yb, h, K, M) {
    var col = mix(mix(K.sky[1], "#262833", 0.62), "#10131f", K.night * 0.5), r = h / 100, hi = mix(col, K.sky[2], 0.35);
    c.save();
    c.fillStyle = col; c.beginPath(); c.moveTo(x - 9 * r, yb); c.lineTo(x - 9 * r, yb - 96 * r); c.quadraticCurveTo(x - 9 * r, yb - 100 * r, x - 5 * r, yb - 100 * r); c.lineTo(x + 5 * r, yb - 100 * r); c.quadraticCurveTo(x + 9 * r, yb - 100 * r, x + 9 * r, yb - 96 * r); c.lineTo(x + 9 * r, yb); c.closePath(); c.fill();
    c.fillStyle = hi; c.fillRect(x - 9 * r, yb - 96 * r, 2.4 * r, 96 * r);
    c.strokeStyle = rgba("#000000", 0.28); c.lineWidth = 0.5;
    for (var i = 1; i < 30; i++) { c.beginPath(); c.moveTo(x - 9 * r, yb - i * 3.3 * r); c.lineTo(x + 9 * r, yb - i * 3.3 * r); c.stroke(); }
    c.strokeStyle = col; c.lineWidth = Math.max(0.7, r * 0.8); c.beginPath(); c.moveTo(x, yb - 100 * r); c.lineTo(x, yb - 108 * r); c.stroke();
    /* at night the offices are lit: three columns of cells, about half of them on; a red light at the mast's foot blinks in the frame */
    if (K.night > 0.15) {
      var wr = rng(21), j, i;
      c.beginPath();
      for (i = 0; i < 30; i++) for (j = -1; j <= 1; j++) if (wr() < 0.45) c.rect(x + j * 4.8 * r - 0.8 * r, yb - (i + 1) * 3.3 * r + 1.1 * r, 1.6 * r, 1.4 * r);
      c.fillStyle = rgba("#ffd98a", K.night * 0.7); c.fill();
    }
    c.restore();
    if (M) M.mont = [x, yb - 108 * r, r];
  }
  /* the Eiffel Tower: the outline is an exponential, the arch is cut between the legs, platforms at a third and two thirds,
     X-bracing in the legs, an antenna; the legs fade into the roofs in front of them */
  function eiffel(c, x, yb, h, K, M) {
    var night = K.night, col = mix(mix(K.sky[1], "#4a4452", 0.42), "#e0a850", clamp(night - 0.25, 0, 1) * 0.85);
    var bw = h * 0.26, tip = h * 0.012, hz = mix(K.sky[2], K.sky[1], 0.4), i, v;
    c.save();
    c.fillStyle = col; c.beginPath();
    for (i = 0; i <= 24; i++) { v = i / 24; c.lineTo(x - (bw * Math.exp(-3.4 * v) + tip * (1 - v)), yb - v * h * 0.94); }
    for (i = 24; i >= 0; i--) { v = i / 24; c.lineTo(x + (bw * Math.exp(-3.4 * v) + tip * (1 - v)), yb - v * h * 0.94); }
    c.closePath(); c.fill();
    /* the open arch and the gaps between the lower legs */
    c.fillStyle = rgba(hz, 0.92); c.beginPath(); c.ellipse(x, yb + 1, bw * 0.55, h * 0.115, 0, Math.PI, 0); c.fill();
    c.beginPath(); c.moveTo(x - bw * 0.36, yb - h * 0.1); c.quadraticCurveTo(x, yb - h * 0.2, x + bw * 0.36, yb - h * 0.1); c.lineTo(x + bw * 0.3, yb - h * 0.2); c.quadraticCurveTo(x, yb - h * 0.27, x - bw * 0.3, yb - h * 0.2); c.closePath(); c.fill();
    /* platforms */
    c.fillStyle = col;
    [[0.2, 0.9], [0.4, 0.62], [0.66, 0.35]].forEach(function (p) { var pw = (bw * Math.exp(-3.4 * p[0]) + tip) * 1.25; c.fillRect(x - pw, yb - p[0] * h * 0.94 - h * 0.012, pw * 2, h * 0.02); });
    /* lattice */
    c.strokeStyle = rgba("#ffffff", 0.28); c.lineWidth = 0.5;
    for (i = 0; i < 7; i++) { v = 0.03 + i * 0.027; var w0 = bw * Math.exp(-3.4 * v), w1 = bw * Math.exp(-3.4 * (v + 0.027)); c.beginPath(); c.moveTo(x - w0, yb - v * h * 0.94); c.lineTo(x - w1 * 0.7, yb - (v + 0.027) * h * 0.94); c.moveTo(x + w0, yb - v * h * 0.94); c.lineTo(x + w1 * 0.7, yb - (v + 0.027) * h * 0.94); c.stroke(); }
    c.strokeStyle = col; c.lineWidth = Math.max(0.7, h * 0.006); c.beginPath(); c.moveTo(x, yb - h * 0.94); c.lineTo(x, yb - h); c.stroke();
    c.restore();
    if (M) M.spark = [x, yb, h];
  }

  /* the river: a curved band lit by the sky, the plane trees and quai of the far bank, two bridges with lamps and parapets, the quai wall with its
     lamps, a row of near roofs under it. The traffic on the decks, the boat and the glints are drawn in the frame. */
  function river(c, L, K, M) {
    var W = L.W, Hh = L.H, sky = K.sky, night = K.night, rh = L.riverH, u = L.u, i, x;
    var wcol = mix(mix(sky[2], "#7f98b0", 0.55), "#10162a", night * 0.7), wdark = mix(wcol, "#3b4f66", 0.5);
    c.beginPath(); c.moveTo(0, riverY(L, 0));
    for (x = 0; x <= W; x += W / 24) c.lineTo(x, riverY(L, x));
    for (x = W; x >= 0; x -= W / 24) c.lineTo(x, riverY(L, x) + rh * (1 + 0.12 * sin(x * 0.01)));
    c.closePath();
    var rg = c.createLinearGradient(0, L.seine - rh * 0.3, 0, L.seine + rh * 1.6); rg.addColorStop(0, wcol); rg.addColorStop(1, wdark);
    c.fillStyle = rg; c.fill();
    /* a lighter reach under the sun, long still strokes of current */
    c.save(); c.clip();
    var sx = L.sun.x, lg = c.createLinearGradient(sx - W * 0.22, 0, sx + W * 0.22, 0); lg.addColorStop(0, rgba("#ffffff", 0)); lg.addColorStop(0.5, rgba("#fff6dc", 0.28 * (1 - night) * (1 - K.rain))); lg.addColorStop(1, rgba("#ffffff", 0));
    c.fillStyle = lg; c.fillRect(0, L.seine - rh, W, rh * 4);
    var rr = rng(61); c.strokeStyle = rgba(wdark, 0.35); c.lineWidth = 0.7;
    for (i = 0; i < 22; i++) { var qx = rr() * W, qy = riverY(L, qx) + rh * (0.15 + rr() * 0.7); c.beginPath(); c.moveTo(qx, qy); c.lineTo(qx + (10 + rr() * 30) * u, qy); c.stroke(); }
    c.restore();
    var qs = look(PARIS, K, 0.22), lp = 30 * u, dx0 = W / 40;
    /* the far bank: a low quai wall with its lit coping, and a row of plane trees standing on it, in two greens */
    for (x = 0; x < W; x += dx0) {
      var fq = riverY(L, x), fq2 = riverY(L, x + dx0);
      c.fillStyle = mix(qs.base, qs.dark, 0.35); c.beginPath(); c.moveTo(x, fq - 2.6 * u); c.lineTo(x + dx0 + 0.5, fq2 - 2.6 * u); c.lineTo(x + dx0 + 0.5, fq2 + 0.4); c.lineTo(x, fq + 0.4); c.closePath(); c.fill();
      c.fillStyle = rgba(qs.light, 0.85); c.fillRect(x, fq - 2.8 * u, dx0 + 0.5, 1.1 * u);
    }
    var tr = rng(63), g0 = mix(mix("#5f7f58", sky[1], 0.28), "#141c34", night * 0.7), g1 = mix(mix("#7e9a68", sky[1], 0.25), "#1c2644", night * 0.7);
    for (i = 0; i < 2; i++) {
      c.fillStyle = i ? g1 : g0; c.beginPath();
      for (x = 3 * u; x < W; x += (9 + tr() * 8) * u) {
        var ty = riverY(L, x) - 2.8 * u, tz = (2.4 + tr() * 2) * u; if (tr() < 0.22) continue;
        if (i === 0) { c.moveTo(x + tz, ty - tz * 0.9); c.arc(x, ty - tz * 0.9, tz, 0, 7); c.moveTo(x + tz * 1.5, ty - tz * 0.6); c.arc(x + tz * 0.7, ty - tz * 0.6, tz * 0.8, 0, 7); }
        else { c.moveTo(x - tz * 0.1 + tz * 0.55, ty - tz * 1.25); c.arc(x - tz * 0.1, ty - tz * 1.25, tz * 0.55, 0, 7); }
      }
      c.fill();
    }
    /* the bridges, seen from above and across the flow: the cutwaters and a cast shadow in the water, then the deck from quai to quai, a roadway
       between two pavements, a lit parapet each side with its lamps */
    var st = look(CREAM, K, 0.3), asph = mix(mix(st.dark, "#6c6a66", 0.5), "#10131f", night * 0.5);
    M.bridges = [];
    BRIDGES.forEach(function (f) {
      var b = bridgeAt(L, f), bx = b.x, bw = b.w, y0 = b.y0, y1 = b.y1, ry = riverY(L, bx + bw / 2), n;
      M.bridges.push(b);
      /* the piers: a dark cutwater and a trail of ripple on each side of the deck */
      [0.3, 0.7].forEach(function (pf) {
        var py = lerp(ry, ry + rh, pf);
        c.fillStyle = rgba(st.ink, 0.5); c.beginPath(); c.moveTo(bx - 1, py - 2.4 * u); c.lineTo(bx - 4.5 * u, py); c.lineTo(bx - 1, py + 2.4 * u); c.moveTo(bx + bw + 1, py - 2.4 * u); c.lineTo(bx + bw + 4.5 * u, py); c.lineTo(bx + bw + 1, py + 2.4 * u); c.fill();
        c.fillStyle = rgba("#ffffff", 0.3); c.fillRect(bx + bw + 4.5 * u, py - 0.5, 10 * u, 1); c.fillRect(bx - 15 * u, py - 0.5, 10 * u, 1);
      });
      /* its shadow on the water, thrown down and to the right */
      var sg = c.createLinearGradient(bx + bw * 0.5, 0, bx + bw + 9 * u, 0); sg.addColorStop(0, rgba("#0a1228", 0.32)); sg.addColorStop(1, rgba("#0a1228", 0));
      c.fillStyle = sg; c.fillRect(bx + bw * 0.5, ry + 0.5, bw * 0.5 + 9 * u, rh - 0.5);
      /* the deck */
      var dg = c.createLinearGradient(bx, 0, bx + bw, 0); dg.addColorStop(0, mix(st.base, st.light, 0.55)); dg.addColorStop(0.5, st.base); dg.addColorStop(1, mix(st.base, st.dark, 0.5));
      c.fillStyle = dg; c.fillRect(bx, y0, bw, y1 - y0);
      c.fillStyle = asph; c.fillRect(bx + bw * 0.2, y0, bw * 0.6, y1 - y0);
      c.fillStyle = rgba(st.light, 0.55); c.fillRect(bx + bw * 0.5 - 0.35, y0, 0.7, y1 - y0);                      /* the centre line, a hairline */
      c.fillStyle = rgba(st.ink, 0.28); for (n = 0; n < 5; n++) c.fillRect(bx + bw * 0.2, y0 + (y1 - y0) * (n + 0.5) / 5, bw * 0.6, 0.6);   /* joints of the paving */
      /* the parapets: a lit cap, ink on the outer faces */
      c.fillStyle = mix(st.light, "#ffffff", 0.3); c.fillRect(bx, y0, 2.4 * u, y1 - y0);
      c.fillStyle = mix(st.base, st.dark, 0.35); c.fillRect(bx + bw - 2.4 * u, y0, 2.4 * u, y1 - y0);
      c.fillStyle = rgba(st.light, 0.9); c.fillRect(bx + bw - 2.4 * u, y0, 0.8, y1 - y0);
      c.strokeStyle = rgba(st.ink, 0.8); c.lineWidth = Math.max(0.7, 0.9 * u); c.beginPath(); c.moveTo(bx, y0); c.lineTo(bx, y1); c.moveTo(bx + bw, y0); c.lineTo(bx + bw, y1); c.moveTo(bx, y0 + 0.5); c.lineTo(bx + bw, y0 + 0.5); c.stroke();
      /* the end plinths and six lamps a side; they burn gold at night */
      [[bx - 1.2 * u, y0], [bx + bw - 1.4 * u, y0], [bx - 1.2 * u, y1 - 3 * u], [bx + bw - 1.4 * u, y1 - 3 * u]].forEach(function (q) { c.fillStyle = mix(st.base, st.light, 0.25); c.fillRect(q[0], q[1], 2.6 * u, 3 * u); c.strokeStyle = rgba(st.ink, 0.7); c.lineWidth = 0.6; c.strokeRect(q[0] + 0.3, q[1] + 0.3, 2.6 * u - 0.6, 3 * u - 0.6); });
      for (n = 0; n < 6; n++) [bx + 1.2 * u, bx + bw - 1.2 * u].forEach(function (lx) {
        var ly = lerp(y0 + 2.5 * u, y1 - 3 * u, n / 5);
        if (night > 0.2) { c.fillStyle = rgba("#ffd98a", night * 0.38); c.beginPath(); c.arc(lx, ly, 3.4 * u, 0, 7); c.fill(); }
        c.fillStyle = night > 0.2 ? mix("#ffe9a8", "#fff6d8", 0.5) : mix("#f7efd0", st.ink, 0.25); c.beginPath(); c.arc(lx, ly, Math.max(0.9, u), 0, 7); c.fill();
        c.strokeStyle = rgba(st.ink, 0.7); c.lineWidth = 0.5; c.stroke();
      });
    });
    /* the quai wall, lamps standing on it */
    for (x = 0; x < W; x += dx0) {
      var yq = riverY(L, x) + rh * 1.05, yq2 = riverY(L, x + dx0) + rh * 1.05;
      c.fillStyle = mix(qs.base, qs.dark, 0.3); c.beginPath(); c.moveTo(x, yq); c.lineTo(x + dx0 + 0.5, yq2); c.lineTo(x + dx0 + 0.5, yq2 + 9 * u); c.lineTo(x, yq + 9 * u); c.closePath(); c.fill();
      c.fillStyle = rgba(qs.light, 0.9); c.fillRect(x, yq - 0.5, dx0 + 0.5, 1.8 * u);
    }
    c.strokeStyle = rgba(qs.ink, 0.5); c.lineWidth = 0.7;
    for (x = lp * 0.5; x < W; x += lp) {
      var lyq = riverY(L, x) + rh * 1.05;
      c.strokeStyle = rgba(qs.ink, 0.8); c.lineWidth = Math.max(0.7, 1.1 * u); c.beginPath(); c.moveTo(x, lyq + 0.5); c.lineTo(x, lyq - 6.5 * u); c.stroke();
      c.fillStyle = mix("#f7efd0", qs.ink, 0.2 + (1 - night) * 0.3); c.beginPath(); c.arc(x, lyq - 7.2 * u, Math.max(1, 1.5 * u), 0, 7); c.fill();
      if (night > 0.2) { c.fillStyle = rgba("#ffd98a", night * 0.38); c.beginPath(); c.arc(x, lyq - 7.2 * u, 3.6 * u + 1, 0, 7); c.fill(); c.fillStyle = rgba("#fff3c8", night * 0.95); c.beginPath(); c.arc(x, lyq - 7.2 * u, 1.4 * u + 0.4, 0, 7); c.fill(); }
      if (M.lamps.length < 60) M.lamps.push([x, lyq - 7.2 * u, lyq + 1]);
    }
  }
  /* the near bank: big roofs and facades with windows, shutters in three colours, balconies, now a flower box, now an awning, a corner pavilion
     under a zinc cone every ninth to twelfth building; under the river and behind the balustrade */
  function nearBank(c, L, K, M) {
    var W = L.W, Hh = L.H, u = L.u, r = rng(88), cr = look(CREAM, K, 0.07), zn = look(ZINC, K, 0.07), tc = look(TERRA, K, 0.07), night = K.night, port = L.port;
    var yc = Hh * (port ? 0.83 : 0.775), rh = Hh * (port ? 0.03 : 0.036), x = -10, base = L.rail + 10, sc = 1.3 * u, x2, nB = 0, pavAt = 9 + ((r() * 4) | 0);
    var shut = ["#7f9a86", "#5f6e86", "#8c4a44"], bloom = ["#d9503c", "#f0a0b8", "#f4efe0", "#e8b83a"], awn = [["#b8463a", "#efe6d2"], ["#3f5c8a", "#efe6d2"], ["#4c7a58", "#efe6d2"]];
    c.fillStyle = mix(cr.base, cr.dark, 0.45); c.beginPath(); c.moveTo(0, riverY(L, 0) + L.riverH * 1.05 + 9 * u);
    for (x2 = 0; x2 <= W + W / 40; x2 += W / 40) c.lineTo(x2, riverY(L, x2) + L.riverH * 1.05 + 9 * u);
    c.lineTo(W + W / 40, Hh); c.lineTo(0, Hh); c.closePath(); c.fill();
    var left = 0, gapNext = false;
    while (x < W + 20) {
      if (left <= 0) { left = 3 + ((r() * 3) | 0); gapNext = x > 0; }
      if (gapNext) { var gw = (7 + r() * 7) * sc; c.fillStyle = mix(mix(K.sky[1], "#2c2c3a", 0.5), "#10131f", night * 0.6); c.fillRect(x, yc - 4, gw, base - yc + 6); x += gw; gapNext = false; continue; }
      var pav = ++nB >= pavAt; if (pav) { nB = 0; pavAt = 9 + ((r() * 4) | 0); }
      var w = (40 + r() * 34) * sc * (pav ? 1.12 : 1), ym = yc - rh * 0.62, yr = yc - rh, shC = shut[(r() * 3) | 0], shF = r() < 0.5 ? 0 : 1, deco = r(), dk = (r() * 3) | 0;
      var fg = c.createLinearGradient(x, 0, x + w, 0); fg.addColorStop(0, mix(cr.base, cr.light, 0.55)); fg.addColorStop(0.3, cr.base); fg.addColorStop(1, mix(cr.base, cr.dark, 0.5));
      c.fillStyle = fg; c.fillRect(x, yc, w, base - yc);
      c.fillStyle = rgba(cr.light, 0.9); c.fillRect(x, yc - 1.5, w, 2.4); c.fillStyle = rgba(cr.dark, 0.5); c.fillRect(x, yc + 1, w, 2);
      /* two floors of tall windows, a balcony rail under the upper ones; one floor carries shutters, and a flower box or an awning on one in five */
      var nw = Math.max(2, Math.round(w / (12 * sc)));
      for (var f = 0; f < 2; f++) {
        var wy = yc + 7 * u + f * 24 * u, wh = 15 * u;
        for (var k = 0; k < nw; k++) {
          var wx = x + w * (k + 0.5) / nw - 2.8 * sc, lit = r() < 0.5, wsd = (r() * 1e6) | 0;
          c.fillStyle = rgba(cr.dark, 0.5); c.fillRect(wx - 1, wy - 1, 5.6 * sc + 2, wh + 1.5);
          c.fillStyle = mix(K.sky[0], "#1b2133", 0.5); c.fillRect(wx, wy, 5.6 * sc, wh);
          c.fillStyle = rgba(cr.light, 0.5); c.fillRect(wx + 5.6 * sc * 0.48, wy, 0.8, wh);
          if (f === shF) {
            c.fillStyle = shC; c.fillRect(wx - 2.6, wy - 0.5, 1.6, wh + 0.5); c.fillRect(wx + 5.6 * sc + 1, wy - 0.5, 1.6, wh + 0.5);
            c.fillStyle = rgba("#000000", 0.28); c.fillRect(wx - 1.3, wy - 0.5, 0.3, wh + 0.5); c.fillRect(wx + 5.6 * sc + 2.3, wy - 0.5, 0.3, wh + 0.5);
          }
          if (deco < 0.1 && f === 1) {                                                   /* a flower box on the balcony: a dark trough and a row of blooms */
            c.fillStyle = "#4a3326"; c.fillRect(wx - 1.2, wy + wh - 3.2, 5.6 * sc + 2.4, 2.4);
            for (var fl = 0; fl < 4; fl++) { c.fillStyle = bloom[(dk + fl) % 4]; c.beginPath(); c.arc(wx + 0.3 + fl * (5.6 * sc) / 3.4, wy + wh - 4.2, 1.15, 0, 7); c.fill(); }
            c.fillStyle = "#5f7f4c"; c.fillRect(wx - 1.2, wy + wh - 3.8, 5.6 * sc + 2.4, 0.9);
          } else if (deco >= 0.1 && deco < 0.2 && f === 0 && k < 3) {                    /* an awning, striped, slanting out over the window */
            var aw = awn[dk], ax0 = wx - 1.8, aw0 = 5.6 * sc + 3.6;
            for (var st2 = 0; st2 < 4; st2++) { c.fillStyle = aw[st2 % 2]; c.beginPath(); c.moveTo(ax0 + st2 * aw0 / 4, wy - 0.6); c.lineTo(ax0 + (st2 + 1) * aw0 / 4, wy - 0.6); c.lineTo(ax0 + (st2 + 1) * aw0 / 4 + 0.7, wy + 4.6); c.lineTo(ax0 + st2 * aw0 / 4 - 0.7, wy + 4.6); c.closePath(); c.fill(); }
            c.fillStyle = rgba("#000000", 0.22); c.fillRect(ax0 - 0.7, wy + 4.6, aw0 + 1.4, 1.3);
          }
          if (night > 0.05 && M.wins.length < 460 && lit) M.wins.push([wx, wy, 5.6 * sc, wh, wsd]);
        }
        c.strokeStyle = rgba(cr.ink, 0.55); c.lineWidth = 0.9; c.beginPath(); c.moveTo(x, wy + wh - 4 * u); c.lineTo(x + w, wy + wh - 4 * u); c.stroke();
      }
      var zg = c.createLinearGradient(x, 0, x + w, 0); zg.addColorStop(0, mix(zn.light, zn.base, 0.35)); zg.addColorStop(0.45, zn.base); zg.addColorStop(1, mix(zn.base, zn.dark, 0.7));
      c.fillStyle = zg; c.beginPath(); c.moveTo(x + w * 0.02, yc); c.lineTo(x + w * 0.98, yc); c.lineTo(x + w * 0.9, ym); c.lineTo(x + w * 0.1, ym); c.closePath(); c.fill();
      c.fillStyle = mix(zn.light, zn.base, 0.45 - K.rain * 0.3); c.beginPath(); c.moveTo(x + w * 0.1, ym); c.lineTo(x + w * 0.9, ym); c.lineTo(x + w * 0.76, yr); c.lineTo(x + w * 0.24, yr); c.closePath(); c.fill();
      c.strokeStyle = rgba(zn.ink, 0.6); c.lineWidth = 0.9; c.beginPath(); c.moveTo(x + w * 0.02, yc); c.lineTo(x + w * 0.1, ym); c.lineTo(x + w * 0.24, yr); c.lineTo(x + w * 0.76, yr); c.lineTo(x + w * 0.9, ym); c.lineTo(x + w * 0.98, yc); c.stroke();
      c.strokeStyle = rgba(zn.light, 0.7); c.beginPath(); c.moveTo(x + w * 0.24, yr + 0.5); c.lineTo(x + w * 0.76, yr + 0.5); c.stroke();
      for (var d = 0; d < 3; d++) {
        var dx = x + w * (0.18 + (d + 0.5) / 3 * 0.64) - 3 * sc, dy = yc - rh * 0.52, dw = 6 * sc, dh = 7.5 * sc, dsd = (r() * 1e6) | 0;
        c.fillStyle = cr.base; c.fillRect(dx - 1, dy - 1, dw + 2, dh + 1); c.fillStyle = mix(K.sky[0], "#1d2233", 0.55); c.fillRect(dx, dy, dw, dh);
        c.fillStyle = zn.dark; c.beginPath(); c.moveTo(dx - 1.6, dy - 0.8); c.lineTo(dx + dw / 2, dy - 3.6 * sc); c.lineTo(dx + dw + 1.6, dy - 0.8); c.closePath(); c.fill();
        if (night > 0.05 && M.wins.length < 460) M.wins.push([dx, dy, dw, dh, dsd]);
      }
      if (pav) {
        /* the corner pavilion: a round turret climbing out of the mansard on the left, with a slit window and a cone of zinc */
        var tx = x + w * 0.1, tw2 = w * 0.17, ty = yr - rh * 0.1, ta = yr - rh * 0.78;
        c.fillStyle = cr.base; c.fillRect(tx - tw2 / 2, ty, tw2, yc - ty); c.fillStyle = rgba(cr.light, 0.9); c.fillRect(tx - tw2 / 2, ty, tw2 * 0.2, yc - ty); c.fillStyle = rgba(cr.dark, 0.32); c.fillRect(tx + tw2 * 0.12, ty, tw2 * 0.38, yc - ty);
        c.fillStyle = mix(K.sky[0], "#1b2133", 0.5); c.fillRect(tx - 0.9, ty + (yc - ty) * 0.25, 1.8, (yc - ty) * 0.5);
        c.fillStyle = zn.base; c.beginPath(); c.moveTo(tx - tw2 * 0.66, ty); c.lineTo(tx, ta); c.lineTo(tx + tw2 * 0.66, ty); c.closePath(); c.fill();
        c.fillStyle = mix(zn.light, zn.base, 0.3); c.beginPath(); c.moveTo(tx - tw2 * 0.66, ty); c.lineTo(tx, ta); c.lineTo(tx - tw2 * 0.08, ty); c.closePath(); c.fill();
        c.strokeStyle = rgba(zn.ink, 0.65); c.lineWidth = 0.8; c.beginPath(); c.moveTo(tx - tw2 * 0.66, ty); c.lineTo(tx, ta); c.lineTo(tx + tw2 * 0.66, ty); c.closePath(); c.stroke();
        c.beginPath(); c.moveTo(tx, ta); c.lineTo(tx, ta - 4); c.stroke();
      }
      if (r() < 0.7) {
        var cx0 = x + w * (0.2 + r() * 0.5), stw = 5.6 * sc, sth = (9 + r() * 6) * sc, ns = 2 + ((r() * 3) | 0);
        if (pav) cx0 = x + w * 0.5;
        for (var s = 0; s < ns; s++) {
          var sx = cx0 + s * (stw + 1), top = yr + 1 - sth + (s % 2) * 2 * sc;
          c.fillStyle = mix(cr.base, cr.dark, 0.25); c.fillRect(sx, top, stw, sth + 1); c.fillStyle = rgba(cr.light, 0.85); c.fillRect(sx, top, 1.3, sth + 1);
          c.fillStyle = cr.dark; c.fillRect(sx - 0.6, top - 1, stw + 1.2, 2);
          c.fillStyle = tc.base; c.fillRect(sx + stw * 0.2, top - 5.4 * sc, stw * 0.6, 4.6 * sc); c.fillStyle = tc.light; c.fillRect(sx + stw * 0.2, top - 5.4 * sc, 1, 4.6 * sc);
          c.fillStyle = tc.dark; c.fillRect(sx + stw * 0.1, top - 6.2 * sc, stw * 0.8, 1.4);
          if (s === 0 && r() < 0.5 && M.smoke.length < 5) M.smoke.push([sx + stw / 2, top - 6.4 * sc, sc]);
        }
      }
      M.glints.push([x, yc - rh * 0.9, w, rh * 0.9]);
      x += w; left--; if (left <= 0) gapNext = true;
    }
  }

  /* ---------------------------------------------------------------- the cathedral behind the gargoyle */
  /* a pinnacle: a stone spirelet on a cornice, crockets up both edges, a finial */
  function pinnacle(c, cx, yb, hw, h, st, o) {
    o = o || {};
    var n = o.crockets == null ? 6 : o.crockets, tipY = yb - h, i;
    /* the cornice it stands on */
    poly(c, R(cx - hw * 1.12, yb - hw * 0.16, cx + hw * 1.12, yb), st, { lw: 0.9, pits: false, hatch: false });
    poly(c, R(cx - hw * 1.0, yb - hw * 0.34, cx + hw * 1.0, yb - hw * 0.16), st, { lw: 0.8, pits: false, hatch: false });
    var by = yb - hw * 0.34;
    G.part(c, [[cx - hw * 0.92, by, 1], [cx - hw * 0.6, by - (h - hw * 0.34) * 0.42], [cx - hw * 0.26, by - (h - hw * 0.34) * 0.82], [cx, tipY + hw * 0.18, 1], [cx + hw * 0.26, by - (h - hw * 0.34) * 0.82], [cx + hw * 0.6, by - (h - hw * 0.34) * 0.42], [cx + hw * 0.92, by, 1]], st, { lw: 1.1, round: 0.2, hatchGap: 2.6 });
    G.cut(c, [[cx - hw * 0.3, by], [cx - hw * 0.12, by - h * 0.5], [cx - hw * 0.02, tipY + hw * 0.3]], st, Math.max(0.6, hw * 0.026));
    G.cut(c, [[cx + hw * 0.34, by], [cx + hw * 0.14, by - h * 0.5], [cx + hw * 0.04, tipY + hw * 0.3]], st, Math.max(0.5, hw * 0.02));
    if (o.band) G.cut(c, [[cx - hw * 0.62, by - h * 0.32], [cx + hw * 0.64, by - h * 0.32]], st, Math.max(0.6, hw * 0.022));
    for (i = 0; i < n; i++) {
      var u = (i + 0.7) / (n + 0.4), ly = by - (h - hw * 0.34) * 0.9 * u, lw = hw * 0.92 * (1 - u * 0.95) * (1 - 0.25 * u);
      var ln = Math.max(3.4, hw * 0.28 * (1 - u * 0.5));
      G.leaf(c, cx - lw, ly, -PI / 2 - 0.95, ln, ln * 0.36, 1, st, { lw: 0.6 });
      G.leaf(c, cx + lw, ly, -PI / 2 + 0.95, ln, ln * 0.36, 1, st, { lw: 0.6 });
    }
    G.part(c, [[cx, tipY - hw * 0.06, 1], [cx + hw * 0.1, tipY + hw * 0.1], [cx, tipY + hw * 0.24, 1], [cx - hw * 0.1, tipY + hw * 0.1]], st, { lw: 0.7, steps: 3, pits: false, hatch: false });
  }
  /* a tiny gargoyle at a pier head: back arched, forelegs gripping, a horned head thrust out with the jaw open; returns where the water leaves */
  function tinyGarg(c, x, y, s, st) {
    var P = function (a) { return a.map(function (p) { return p.length > 2 ? [x + p[0] * s, y + p[1] * s, 1] : [x + p[0] * s, y + p[1] * s]; }); };
    var dk = { base: mix(st.base, st.dark, 0.35), light: st.base, dark: st.dark, ink: st.ink, pit: null };
    G.part(c, P([[-2, 5, 1], [-1, -3], [5, -6], [11, -6.4], [15, -4.4], [15.6, 3], [10, 6], [3, 6.6, 1]]), dk, { lw: 0.8, round: 0.5, pits: false, hatch: false });
    G.part(c, P([[11, 4, 1], [14.2, 5], [14.8, 9, 1], [11, 9, 1]]), dk, { lw: 0.6, pits: false, hatch: false });
    G.part(c, P([[13, -5], [15.6, -9.4], [19.6, -8.8], [24, -5.6], [27, -3.4, 1], [26, -1.6, 1], [20, -1.2], [16, 0.6]]), dk, { lw: 0.8, round: 0.4, pits: false, hatch: false });
    G.part(c, P([[16.4, -9], [15.4, -13.8], [18.6, -9.4]]), dk, { lw: 0.6, pits: false, hatch: false });
    G.part(c, P([[16, 1.2], [20, 0.4], [26, -0.2, 1], [25, 3.4], [20, 4.6], [15.4, 3.8]]), dk, { lw: 0.7, pits: false, hatch: false });
    G.hollow(c, P([[19, -0.7], [26, -0.9], [25.4, 0.2], [19.4, 0.3]]), dk, { deep: 0.95, lw: 0.4 });
    G.dot(c, x + 19.4 * s, y - 4.4 * s, Math.max(0.5, 0.55 * s), dk.ink);
    G.cut(c, P([[1, -2], [6, -4.6], [12, -4.8]]), dk, 0.5, { glint: 1 });
    return [x + 25.6 * s, y + 0.2 * s];
  }
  /* one flying buttress, the cathedral's signature: a stout quadrant arch that leaves the clerestory wall flat and drops steeply onto the pier head,
     its voussoir joints, a lit extrados and a shaded soffit; a lower rib beneath it, joined to the upper by five little shafts (the wheel-spoke look
     of the choir); the arch's shadow thrown on the wall; the pier with its set-offs, its right third in shade, and a pinnacle on its head; a
     spouting gargoyle at the pier head */
  function fbuttress(c, L, K, M, x, sc, st, lead) {
    var Hh = L.H, W = L.W, yE = Hh * L.cy.eave, yC = Hh * L.cy.cler, yF = Hh * (L.cy.aisle + 0.06);
    var pw = W * 0.0125 * sc, yHead = yC + Hh * 0.014 * sc, span = W * 0.066 * sc, yw = yE + Hh * 0.016 * sc, th = Hh * 0.014 * sc + 1.5, yS = yHead + th * 0.5;
    var i, n = 10;
    /* from a (on the pier, low) to b (on the wall, high): a quadratic that is level at the wall and steep at the pier; the ring tapers toward the wall */
    function arch(ax, ay, bx, by, tk, cf) {
      var cx = bx + (ax - bx) * cf, cy = by, top = [], bot = [], nrm = [], q;
      for (q = 0; q <= n; q++) {
        var u = q / n, v = 1 - u, px = v * v * ax + 2 * u * v * cx + u * u * bx, py = v * v * ay + 2 * u * v * cy + u * u * by;
        var tx = 2 * v * (cx - ax) + 2 * u * (bx - cx), ty = 2 * v * (cy - ay) + 2 * u * (by - cy), tl = hyp(tx, ty) || 1, nx = ty / tl, ny = -tx / tl, k = 1 - 0.25 * u;
        if (ny > 0) { nx = -nx; ny = -ny; }
        top.push([px + nx * tk * k, py + ny * tk * k]); bot.push([px - nx * tk * k, py - ny * tk * k]); nrm.push([nx, ny]);
      }
      return { top: top, bot: bot, nrm: nrm };
    }
    var ring = function (a) { return a.top.map(function (p, k) { return [p[0], p[1], k === 0 || k === n ? 1 : 0]; }).concat(a.bot.slice().reverse().map(function (p, k) { return [p[0], p[1], k === 0 || k === n ? 1 : 0]; })); };
    var yAtX = function (arr, xq) { for (var q = 0; q < arr.length - 1; q++) if ((arr[q][0] - xq) * (arr[q + 1][0] - xq) <= 0 && arr[q][0] !== arr[q + 1][0]) return lerp(arr[q][1], arr[q + 1][1], (xq - arr[q][0]) / (arr[q + 1][0] - arr[q][0])); return null; };
    var up = arch(x - pw * 0.2, yS, x - span, yw, th, 0.55);
    var yL = lerp(yHead, yF, 0.55), lo = arch(x - pw * 0.2, yL, x - span * 0.92, yw + th * 2.4, th * 0.6, 0.5);
    /* the arches' shadow on the clerestory wall behind them, down and to the right of the light */
    c.save(); c.beginPath(); c.rect(L.xb0, yE - 1, L.cy.xend - L.xb0, yF - yE); c.clip();
    G.trace(c, ring(up).map(function (p) { return [p[0] + 0.5 * th, p[1] + 1.4 * th]; }), true); c.fillStyle = rgba(st.ink, 0.22); c.fill();
    G.trace(c, ring(lo).map(function (p) { return [p[0] + 0.3 * th, p[1] + 0.9 * th]; }), true); c.fillStyle = rgba(st.ink, 0.16); c.fill();
    c.restore();
    /* the lower rib, and between the two ribs five short vertical shafts, each lit on its left */
    function rib(a, lw) {
      G.part(c, ring(a), st, { lw: lw, steps: 3, pits: false, hatchGap: 2.4, hatchAng: 1.2 });
      c.save(); G.trace(c, G.sp(ring(a), true, 3), true); c.clip();                          /* the soffit in shade, the extrados lit */
      c.strokeStyle = rgba(st.ink, 0.3); c.lineWidth = th * 0.5; c.beginPath(); a.bot.forEach(function (p, q) { if (q) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.stroke();
      c.strokeStyle = rgba(st.light, 0.7); c.lineWidth = Math.max(0.8, th * 0.16); c.beginPath(); a.top.forEach(function (p, q) { var nn = a.nrm[q]; if (q) c.lineTo(p[0] - nn[0] * th * 0.14, p[1] - nn[1] * th * 0.14); else c.moveTo(p[0] - nn[0] * th * 0.14, p[1] - nn[1] * th * 0.14); }); c.stroke();
      c.restore();
      for (var q = 1; q < n; q++) { var nn2 = a.nrm[q]; G.cut(c, [[a.top[q][0] - nn2[0] * 0.8, a.top[q][1] - nn2[1] * 0.8], [a.bot[q][0] + nn2[0] * 0.8, a.bot[q][1] + nn2[1] * 0.8]], st, q % 2 ? 0.55 : 0.4); }
    }
    for (i = 0; i < 5; i++) {
      var xq = x - span * (0.2 + i * 0.15), y1 = yAtX(up.bot, xq), y2 = yAtX(lo.top, xq);
      if (y1 != null && y2 != null && y2 > y1 + 2) {
        var sw = Math.max(1.5, th * 0.26);
        G.part(c, R(xq - sw / 2, y1 - 0.6, xq + sw / 2, y2 + 0.6), st, { lw: 0.8, pits: false, hatchGap: 2 });
        G.cut(c, [[xq - sw * 0.2, y1 + 0.6], [xq - sw * 0.2, y2 - 0.6]], st, 0.5, { glint: 1 });
      }
    }
    rib(lo, 0.9);
    rib(up, 1.1);
    /* the pier shaft over the arches' feet, two set-offs, its right third in shade, the pinnacle on its head */
    G.part(c, [[x - pw, yHead, 1], [x - pw, yF, 1], [x + pw * 1.04, yF, 1], [x + pw * 1.04, yHead, 1]], st, { lw: 1, steps: 1, hatchGap: 2.6 });
    c.fillStyle = rgba(st.dark, 0.35); c.fillRect(x + pw * 0.38, yHead, pw * 0.66, yF - yHead);
    G.cut(c, [[x - pw * 0.36, yHead + 3], [x - pw * 0.34, yF - 4]], st, 0.5, { glint: 1 });
    [0.34, 0.68].forEach(function (f) {
      var yy = lerp(yHead, yF, f);
      poly(c, [[x - pw * 1.25, yy, 1], [x + pw * 1.3, yy, 1], [x + pw * 1.3, yy + Hh * 0.006 * sc, 1], [x - pw * 1.25, yy + Hh * 0.01 * sc, 1]], st, { lw: 0.8, pits: false, hatch: false });
      taper(c, x + pw * 0.2, yy + Hh * 0.01 * sc, x + pw * 0.3, yy + Hh * 0.05 * sc, pw * 0.7, rgba(st.ink, 0.13));
    });
    pinnacle(c, x, yHead, pw * 1.08, Hh * 0.1 * sc, st, { crockets: 5 });
    var m = tinyGarg(c, x + pw * 0.95, yHead + Hh * 0.02 * sc, 0.62 * sc * L.u * 1.7, st);
    if (M.spouts.length < 8) M.spouts.push([m[0], m[1], sc]);
  }

  /* Viollet-le-Duc's flèche: an octagonal needle in lead, a foot with four gablets, tiers that each narrow, crockets on every edge,
     tracery openings, the apostles in threes at the base, a finial; the rooster is drawn live */
  function spire(c, L, K, st, M) {
    var Hh = L.H, x = L.sp.x, top = L.sp.top, base = L.sp.base, hs = base - top, i, side;
    var pierce = mix(K.sky[1], st.ink, 0.45);
    var tiers = [[0.0, 0.05, 0.145, 0.15], [0.05, 0.3, 0.078, 0.064], [0.3, 0.58, 0.056, 0.042], [0.58, 0.86, 0.034, 0.016], [0.86, 0.97, 0.013, 0.003]];
    /* the foot: a platform with four gablets */
    poly(c, [[x - hs * 0.15, base, 1], [x - hs * 0.145, base - hs * 0.05, 1], [x + hs * 0.145, base - hs * 0.05, 1], [x + hs * 0.15, base, 1]], st, { lw: 1, pits: false });
    [-1, 1].forEach(function (sd) {
      var gx = x + sd * hs * 0.1;
      poly(c, [[gx - hs * 0.04, base - hs * 0.05, 1], [gx, base - hs * 0.11, 1], [gx + hs * 0.04, base - hs * 0.05, 1]], st, { lw: 0.8, pits: false, hatch: false });
      G.cut(c, [[gx, base - hs * 0.056], [gx, base - hs * 0.092]], st, 0.5);
    });
    /* tiers, from the foot up */
    for (i = 1; i < tiers.length; i++) {
      var t = tiers[i], y0 = base - t[0] * hs, y1 = base - t[1] * hs, w0 = t[2] * hs, w1 = t[3] * hs;
      G.part(c, [[x - w0, y0, 1], [x + w0, y0, 1], [x + w1, y1, 1], [x - w1, y1, 1]], st, { lw: 1.1, steps: 1, hatchGap: 2.4, pits: false });
      G.cut(c, [[x - w0 * 0.34, y0 - 1], [x - w1 * 0.34, y1 + 1]], st, 0.6); G.cut(c, [[x + w0 * 0.4, y0 - 1], [x + w1 * 0.4, y1 + 1]], st, 0.5);
      if (i < 4) poly(c, [[x - w1 * 1.18, y1, 1], [x + w1 * 1.18, y1, 1], [x + w1 * 1.18, y1 + hs * 0.012, 1], [x - w1 * 1.18, y1 + hs * 0.016, 1]], st, { lw: 0.7, pits: false, hatch: false });
      /* tracery: pointed openings in the tiers, the sky seen through */
      if (i === 2 || i === 3) {
        var oy0 = lerp(y0, y1, 0.14), oy1 = lerp(y0, y1, 0.86), ow = lerp(w0, w1, 0.5) * 0.4;
        [-0.52, 0.52].forEach(function (f) { var ox = x + f * lerp(w0, w1, 0.5);
          c.save(); c.beginPath(); c.moveTo(ox - ow * 0.7, oy1); c.lineTo(ox - ow * 0.7, oy0 + (oy1 - oy0) * 0.28); c.quadraticCurveTo(ox - ow * 0.7, oy0, ox, oy0); c.quadraticCurveTo(ox + ow * 0.7, oy0, ox + ow * 0.7, oy0 + (oy1 - oy0) * 0.28); c.lineTo(ox + ow * 0.7, oy1); c.closePath();
          c.fillStyle = pierce; c.fill(); c.strokeStyle = rgba(st.ink, 0.85); c.lineWidth = 0.8; c.stroke(); c.restore();
          G.cut(c, [[ox, oy1], [ox, oy0 + 1]], st, 0.4); });
      }
      /* crockets up both edges of the tier */
      var nn = Math.max(2, Math.round((y0 - y1) / (hs * 0.045)));
      for (var k = 0; k < nn; k++) {
        var uu = (k + 0.5) / nn, ey = lerp(y0, y1, uu), ew = lerp(w0, w1, uu), ln = Math.max(3.2, hs * 0.03 * lerp(1, 0.55, (i - 1) / 3));
        G.leaf(c, x - ew, ey, -PI / 2 - 1.0, ln, ln * 0.4, 1, st, { lw: 0.5 });
        G.leaf(c, x + ew, ey, -PI / 2 + 1.0, ln, ln * 0.4, 1, st, { lw: 0.5 });
      }
    }
    /* the needle and its finial: an orb and a cross */
    G.part(c, [[x - hs * 0.004, base - hs * 0.97, 1], [x + hs * 0.004, base - hs * 0.97, 1], [x + hs * 0.0015, top + hs * 0.006, 1], [x - hs * 0.0015, top + hs * 0.006, 1]], st, { lw: 0.6, steps: 1, pits: false, hatch: false });
    G.dot(c, x, top + hs * 0.012, Math.max(1.4, hs * 0.007), st.light);
    /* the apostles: three at each end of the platform, cut small in the lead */
    [-1, 1].forEach(function (sd) {
      for (var a = 0; a < 3; a++) {
        var ax = x + sd * (hs * 0.1 + (a - 1) * hs * 0.021), ah = hs * (0.036 + (a === 1 ? 0.006 : 0));
        G.cut(c, [[ax, base - hs * 0.05 - 0.5], [ax + sd * 0.4, base - hs * 0.05 - ah]], st, Math.max(0.8, hs * 0.0068), { col: st.dark });
        G.dot(c, ax + sd * 0.4, base - hs * 0.05 - ah - Math.max(0.8, hs * 0.0042), Math.max(0.8, hs * 0.0042), st.light);
      }
    });
    /* soot under the tiers' ledges */
    for (side = -1; side <= 1; side += 2) taper(c, x + side * hs * 0.04, base - hs * 0.3, x + side * hs * 0.043, base - hs * 0.2, hs * 0.012, rgba(st.ink, 0.15));
    M.spireRect = [x - hs * 0.16, top - hs * 0.04, hs * 0.32, hs * 1.04];
  }

  /* the nave roof, the clerestory, the aisle, the flying buttresses, the flèche */
  function cathedral(c, L, K, M) {
    var W = L.W, Hh = L.H, u = L.u, port = L.port, xs = L.sp.x;
    var stn = look(PARIS, K, 0.27), lead = look(LEAD, K, 0.27), sky = K.sky, night = K.night, wet = K.rain;
    var yr = Hh * L.cy.ridge, ye = Hh * L.cy.eave, yc = Hh * L.cy.cler, ya = Hh * L.cy.aisle, xa = L.xb0, xb = L.cy.xend, i, x;
    var xst = port ? W * 2 : xs + W * 0.045, dh = Hh * 0.035, dh2 = Hh * 0.02;   /* the choir roof steps down east of the crossing */
    var rim = 0.25 * (1 - wet) * (K.alt > 0 ? 1 : 0);
    function ridge(x) { return x < xst ? yr : yr + dh; }
    function eave(x) { return x < xst ? ye : ye + dh2; }
    /* the aisle roof, a lean-to in lead behind everything; it hides the buttress feet */
    var ag = c.createLinearGradient(0, yc, 0, ya + Hh * 0.02); ag.addColorStop(0, mix(lead.base, lead.dark, 0.2)); ag.addColorStop(1, mix(lead.dark, lead.base, 0.2));
    c.fillStyle = ag; c.beginPath(); c.moveTo(xa, yc); c.lineTo(xb - W * 0.02, yc); c.lineTo(xb + W * 0.012, ya + Hh * 0.03); c.lineTo(xa, ya + Hh * 0.03); c.closePath(); c.fill();
    c.strokeStyle = rgba(lead.ink, 0.35); c.lineWidth = 0.7;
    for (x = xa; x < xb; x += 9 * u) { c.beginPath(); c.moveTo(x, yc + 1); c.lineTo(x + (x - xs) * 0.02, ya + Hh * 0.03); c.stroke(); }
    /* the clerestory wall, tall lancets in pairs under small oculi */
    var cwall = c.createLinearGradient(0, ye, 0, yc); cwall.addColorStop(0, mix(stn.base, stn.light, 0.3)); cwall.addColorStop(1, mix(stn.base, stn.dark, 0.4));
    var wallRect = function (x0, x1) { c.fillStyle = cwall; c.fillRect(x0, ye - 1, x1 - x0, yc - ye + 1); };
    wallRect(xa, xb);
    var pitch = W * 0.034, glass = mix(mix(sky[0], "#1b2238", 0.65), "#ffcf7a", night * 0.55);
    for (x = xa + pitch * 0.4; x < xb - pitch * 0.4; x += pitch) {
      var lh = (yc - ye) * 0.74, lw = pitch * 0.15;
      [-1, 1].forEach(function (sd) {
        var lx = x + sd * pitch * 0.17;
        c.beginPath(); c.moveTo(lx - lw, yc - 3 * u); c.lineTo(lx - lw, ye + (yc - ye) * 0.36); c.quadraticCurveTo(lx - lw, ye + (yc - ye) * 0.2, lx, ye + (yc - ye) * 0.12); c.quadraticCurveTo(lx + lw, ye + (yc - ye) * 0.2, lx + lw, ye + (yc - ye) * 0.36); c.lineTo(lx + lw, yc - 3 * u); c.closePath();
        var gg = c.createLinearGradient(0, ye, 0, yc); gg.addColorStop(0, mix(glass, "#000000", 0.2)); gg.addColorStop(1, glass); c.fillStyle = gg; c.fill(); c.strokeStyle = rgba(stn.ink, 0.85); c.lineWidth = 0.9; c.stroke();
        c.strokeStyle = rgba(stn.light, 0.5); c.lineWidth = 0.6; c.beginPath(); c.moveTo(lx + lw + 0.7, yc - 3 * u); c.lineTo(lx + lw + 0.7, ye + (yc - ye) * 0.38); c.stroke();
      });
      c.fillStyle = mix(glass, "#000000", 0.2); c.beginPath(); c.arc(x, ye + (yc - ye) * 0.17, lw * 0.85, 0, 7); c.fill(); c.strokeStyle = rgba(stn.ink, 0.8); c.lineWidth = 0.8; c.stroke();
      c.strokeStyle = rgba(stn.ink, 0.3); c.lineWidth = 0.7; c.beginPath(); c.moveTo(x + pitch * 0.5, ye); c.lineTo(x + pitch * 0.5, yc); c.stroke();
    }
    c.fillStyle = rgba(stn.ink, 0.35); c.fillRect(xa, yc - 1, xb - xa, 2); c.fillStyle = rgba(stn.light, 0.6); c.fillRect(xa, ye - 1, xb - xa, 1.6);
    /* the east gable of the nave where the choir roof steps down */
    if (!port) {
      var gx0 = xst - 0.5, gy = ye + dh2;
      poly(c, [[gx0, yr, 1], [gx0 + 3 * u, yr, 1], [gx0 + 3 * u, ye + dh2 + 4, 1], [gx0, ye + dh2 + 4, 1]], stn, { lw: 0.7, pits: false, hatch: false });
    }
    /* the lead roof of the nave: two spans, a step, a hipped east end; seams, a ridge with its cresting */
    function leadSpan(x0, x1, yR, yE2, hip) {
      var g = c.createLinearGradient(x0, yR, x0, yE2); g.addColorStop(0, mix(lead.light, lead.base, 0.5)); g.addColorStop(0.5, lead.base); g.addColorStop(1, mix(lead.base, lead.dark, 0.55));
      c.fillStyle = g; c.beginPath(); c.moveTo(x0, yR); c.lineTo(x1, yR); c.lineTo(hip ? x1 + (yE2 - yR) * 0.9 : x1, yE2); c.lineTo(x0, yE2); c.closePath(); c.fill();
      var gl = c.createLinearGradient(x0, 0, x1, 0); gl.addColorStop(0, rgba(lead.light, 0.3)); gl.addColorStop(1, rgba(lead.dark, 0.35)); c.fillStyle = gl; c.fill();
      if (rim > 0.01) {                                                            /* the sun on the lead: a warm rim down from the ridge, strongest on the left face */
        var rg = c.createLinearGradient(0, yR, 0, yR + (yE2 - yR) * 0.55); rg.addColorStop(0, rgba("#ffe2b0", rim)); rg.addColorStop(1, rgba("#ffe2b0", 0));
        c.fillStyle = rg; c.fill();
        var rg3 = c.createLinearGradient(x0, 0, x1, 0); rg3.addColorStop(0, rgba("#ffe2b0", rim * 0.8)); rg3.addColorStop(0.5, rgba("#ffe2b0", 0)); c.fillStyle = rg3; c.fill();
      }
      c.strokeStyle = rgba(lead.ink, 0.28); c.lineWidth = 0.6;
      for (var sx = x0 + 4 * u; sx < x1; sx += 7 * u) { c.beginPath(); c.moveTo(sx, yR + 1); c.lineTo(sx, yE2); c.stroke(); }
      c.strokeStyle = rgba(lead.ink, 0.5); c.lineWidth = 1; c.beginPath(); c.moveTo(x0, yE2); c.lineTo(hip ? x1 + (yE2 - yR) * 0.9 : x1, yE2); c.stroke();
      c.strokeStyle = rgba(lead.light, 0.9); c.lineWidth = 1.6; c.beginPath(); c.moveTo(x0, yR + 0.5); c.lineTo(x1, yR + 0.5); c.stroke();
      if (wet > 0.05) {                                                            /* rain: a bright sheen band along the lower roof and a dark wash above */
        var sh = c.createLinearGradient(0, yR, 0, yE2); sh.addColorStop(0, rgba("#1b2233", 0.18 * wet)); sh.addColorStop(0.55, rgba("#dfeaff", 0)); sh.addColorStop(0.78, rgba("#eaf2ff", 0.34 * wet)); sh.addColorStop(1, rgba("#dfeaff", 0.05 * wet));
        c.fillStyle = sh; c.beginPath(); c.moveTo(x0, yR); c.lineTo(x1, yR); c.lineTo(hip ? x1 + (yE2 - yR) * 0.9 : x1, yE2); c.lineTo(x0, yE2); c.closePath(); c.fill();
      }
      c.fillStyle = lead.dark;                                                     /* cresting: tiny fleurs along the ridge */
      for (var fx = x0 + 4 * u; fx < x1; fx += 8.5 * u) { c.beginPath(); c.moveTo(fx - 1.8 * u, yR); c.lineTo(fx - 1.2 * u, yR - 2.4 * u); c.lineTo(fx, yR - 1.4 * u); c.lineTo(fx + 1.2 * u, yR - 3.6 * u); c.lineTo(fx + 1.8 * u, yR - 1.2 * u); c.lineTo(fx + 2 * u, yR); c.closePath(); c.fill(); }
      c.strokeStyle = rgba(lead.ink, 0.55); c.lineWidth = 0.5; c.stroke();
    }
    leadSpan(xa, Math.min(xst, xb), yr, ye, false);
    if (!port) leadSpan(xst, xb, yr + dh, ye + dh2, true);
    /* the flying buttresses of the choir, three, each smaller than the last */
    /* the buttresses are cut from a warmer, paler stone than the blue lead behind them, so they stand out at card size */
    var stb = tone(stn, mix(mix("#e2d5b4", sky[1], 0.15), "#3a3f66", night * 0.75), 0.3);
    if (!port) [[0.625, 1], [0.68, 0.8], [0.727, 0.64]].forEach(function (b) { fbuttress(c, L, K, M, W * b[0], b[1], stb, lead); });
    else {
      /* a portrait frame keeps one pinnacle on the wall */
      pinnacle(c, W * 0.9, yc, W * 0.022, Hh * 0.05, stn, { crockets: 3 });
    }
    spire(c, L, K, lead, M);
  }

  /* ---------------------------------------------------------------- mid layer: Paris and the cathedral */
  function drawMid(c, L, K, M) {
    var W = L.W, Hh = L.H, sky = K.sky, night = K.night, u = L.u, hz = L.hz, b = L.bands;
    var g = c.createLinearGradient(0, hz - Hh * 0.14, 0, hz + Hh * 0.14);
    g.addColorStop(0, rgba(sky[2], 0)); g.addColorStop(0.45, rgba(sky[2], 0.9)); g.addColorStop(1, rgba(sky[1], 1));
    c.fillStyle = g; c.fillRect(0, hz - Hh * 0.14, W, Hh);
    if (night > 0.1) {                                                /* the city's own light, a warm band standing above the roofs */
      var gb = c.createLinearGradient(0, hz - Hh * 0.13, 0, hz + Hh * 0.08); gb.addColorStop(0, rgba("#ff9a54", 0)); gb.addColorStop(0.6, rgba("#ff9a54", 0.26 * night)); gb.addColorStop(1, rgba("#ffb878", 0.1 * night));
      c.fillStyle = gb; c.fillRect(0, hz - Hh * 0.13, W, Hh * 0.21);
    }
    /* far Left Bank, then the farthest landmarks, then the nearer roofs and landmarks */
    roofBand(c, L, K, M, { base: b[0], sc: 0.6, haze: 0.62, seed: 70 });
    var ex = W * (L.port ? 0.3 : 0.945), mx = W * (L.port ? 0.5 : 0.89);
    var eh = Hh * (L.port ? 0.105 : 0.215), eby = b[0] * Hh + 4;
    montparnasse(c, mx, eby, eh * 0.78, K, M);
    eiffel(c, ex, eby, eh, K, M);
    roofBand(c, L, K, M, { base: b[1], sc: 0.8, haze: 0.45, seed: 71 });
    var ph = Hh * (L.port ? 0.075 : 0.125), pby = b[1] * Hh + 3;
    pantheon(c, W * (L.port ? 0.14 : 0.775), pby, ph, K);
    sulpice(c, W * (L.port ? 0.64 : 0.835), pby, ph * 0.95, K);
    cathedral(c, L, K, M);
    roofBand(c, L, K, M, { base: b[2], sc: 1.0, haze: 0.22, seed: 72, smoke: 0.7, flash: true, pots: true });
    river(c, L, K, M);
    nearBank(c, L, K, M);
    if (night > 0) lampLight(c, L, night, 0.1);
  }
  /* lamp-light from below: a warm wash over what is already drawn (so it does not tint empty sky) */
  function lampLight(c, L, night, a) {
    c.save(); c.globalCompositeOperation = "source-atop";
    var lg = c.createLinearGradient(0, L.H, 0, L.H * 0.3); lg.addColorStop(0, rgba("#ffb066", a * night)); lg.addColorStop(1, rgba("#ffb066", 0));
    c.fillStyle = lg; c.fillRect(0, 0, L.W, L.H); c.restore();
  }

  /* ---------------------------------------------------------------- near layer: the buttress pier and the balustrade */
  /* coursed limestone blocks: tall courses, block widths one to two courses, hairline joints, a few lighter replacements */
  function courses(c, x0, y0, x1, y1, ch, st, seed, yAnchor) {
    var r = rng(seed), row;
    c.save(); c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip();
    c.fillStyle = st.base; c.fillRect(x0, y0, x1 - x0, y1 - y0);
    var first = Math.floor((yAnchor - y1) / ch);
    for (row = first; yAnchor - row * ch > y0 - ch; row++) {
      var yy = yAnchor - row * ch, xx = x0 - ((row & 1) ? ch * 0.55 : 0) - r() * ch * 0.35;
      while (xx < x1) {
        var bw = ch * (1 + r() * 0.9), by = yy - ch, tn = r();
        c.fillStyle = tn < 0.13 ? mix(st.base, st.light, 0.55) : tn < 0.42 ? mix(st.base, st.dark, 0.1 + r() * 0.12) : mix(st.base, st.light, r() * 0.22);
        c.fillRect(xx + 1, by + 1, bw - 1, ch - 1);
        c.fillStyle = rgba(st.light, 0.5); c.fillRect(xx + 1, by + 1, bw - 1, 2); c.fillStyle = rgba(st.dark, 0.38); c.fillRect(xx + 1, by + ch - 3, bw - 1, 2.4);
        c.strokeStyle = rgba(st.ink, 0.1); c.lineWidth = 0.6;                         /* chisel dressing, slanted */
        for (var k = 0; k < 7; k++) { var hx = xx + 3 + r() * (bw - 6), hy = by + 6 + r() * (ch - 12); c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + 7, hy - 4); c.stroke(); }
        c.fillStyle = rgba(st.pit, 0.55);
        for (var q = 0; q < 10; q++) c.fillRect(xx + r() * bw, by + r() * ch, 0.5 + r(), 0.5 + r());
        c.strokeStyle = rgba(st.ink, 0.42); c.lineWidth = 0.8; c.strokeRect(xx + 0.5, by + 0.5, bw, ch);
        xx += bw;
      }
    }
    c.restore();
  }

  function yt0(L) { return L.yt; }

  function drawNear(c, L, K, M) {
    var W = L.W, Hh = L.H, u = L.u, rail = L.rail, bal = L.bal, cop = L.cop, wet = K.rain;
    var st = look(PARIS, K, 0.05), sky = K.sky, night = K.night, warm = clamp((12 - K.alt) / 12, 0, 1) * (K.alt > -2 ? 1 : 0) * (1 - wet);
    var xp = L.xp, xA = L.xA, xB = L.xB, yb = L.yb, cs = L.cs, yA = L.yA, yB = L.yB, yBot = rail + bal + 6, ch = Hh * 0.09, i;
    var yCap = Hh * (L.port ? 0.215 : 0.285);
    /* ---- the pier: shaft, corbel under the beam, set-offs, pinnacle ---- */
    var dyS = Hh * 0.013, shaftPath = function () { c.beginPath(); c.moveTo(-6, yCap); c.lineTo(xp, yCap); c.lineTo(xp, yA); c.lineTo(xA, yA + dyS); c.lineTo(xA, yB); c.lineTo(xB, yB + dyS); c.lineTo(xB, yBot); c.lineTo(-6, yBot); c.closePath(); };
    courses(c, -6, yCap, xp, yb + cs * 3, ch, st, 2, yb + cs * 3);
    courses(c, -6, yb + cs * 3 - 1, xp, yA, ch, st, 3, yb + cs * 3 + ch * 2);
    courses(c, -6, yA, xp, yA + dyS, ch, st, 4, yA + ch * 3); courses(c, -6, yA + dyS, xA, yB, ch, st, 4, yA + ch * 3);
    courses(c, -6, yB, xA, yB + dyS, ch, st, 5, yBot); courses(c, -6, yB + dyS, xB, yBot, ch, st, 5, yBot);
    /* the form: lit on the left, the right face in shade */
    c.save(); shaftPath(); c.clip();
    var fg = c.createLinearGradient(0, 0, xA, 0); fg.addColorStop(0, rgba(st.light, 0.25)); fg.addColorStop(0.45, rgba(st.light, 0)); fg.addColorStop(0.82, rgba(st.dark, 0)); fg.addColorStop(1, rgba(st.dark, 0.34));
    c.fillStyle = fg; c.fillRect(-6, yCap, xB + 6, yBot - yCap);
    c.restore();
    /* a blind niche in the pier face, hooded, with a carved figure standing in it */
    var nx0 = xp * 0.2, nx1 = xp * 0.8, ny0 = Hh * 0.355, ny1 = yt0(L) - Hh * 0.04, nm = (nx0 + nx1) / 2;
    var niche = [[nx0, ny1, 1], [nx0, ny0 + (ny1 - ny0) * 0.36], [nx0 + (nm - nx0) * 0.35, ny0 + (ny1 - ny0) * 0.1], [nm, ny0, 1], [nx1 - (nx1 - nm) * 0.35, ny0 + (ny1 - ny0) * 0.1], [nx1, ny0 + (ny1 - ny0) * 0.36], [nx1, ny1, 1]];
    G.hollow(c, niche, st, { deep: 0.32, lw: 1 });
    G.cut(c, niche.map(function (q) { return [q[0] - 4, q[1] - (q[1] === ny0 ? 5 : 0)]; }).slice(0, 7), st, 0.8, { glint: 1 });
    poly(c, R(nx0 + 3, ny1 - 6, nx1 - 3, ny1), st, { lw: 0.9, pits: false });
    var fx = nm, fh = (ny1 - ny0) * 0.62, fy = ny1 - 6, fw = (nx1 - nx0) * 0.2;
    G.part(c, [[fx - fw * 0.55, fy, 1], [fx - fw * 0.5, fy - fh * 0.5], [fx - fw * 0.38, fy - fh * 0.78], [fx - fw * 0.2, fy - fh * 0.9], [fx - fw * 0.2, fy - fh * 0.98], [fx, fy - fh * 1.04], [fx + fw * 0.2, fy - fh * 0.98], [fx + fw * 0.2, fy - fh * 0.9], [fx + fw * 0.4, fy - fh * 0.78], [fx + fw * 0.52, fy - fh * 0.5], [fx + fw * 0.6, fy, 1]], st, { lw: 0.9, steps: 3, round: 0.4, pits: false, hatchGap: 2.4 });
    G.cut(c, [[fx - fw * 0.1, fy - fh * 0.74], [fx - fw * 0.16, fy - fh * 0.4], [fx - fw * 0.22, fy - 1]], st, 0.6); G.cut(c, [[fx + fw * 0.16, fy - fh * 0.7], [fx + fw * 0.22, fy - fh * 0.4], [fx + fw * 0.3, fy - 1]], st, 0.6);
    G.cut(c, [[fx - fw * 0.34, fy - fh * 0.74], [fx + fw * 0.4, fy - fh * 0.66]], st, 0.5);
    /* the corbel under the beam: three stepped courses, each moulded */
    var cw = [L.W * 0.05, L.W * 0.034, L.W * 0.018];
    for (i = 0; i < 3; i++) {
      poly(c, [[xp - 4, yb + cs * i, 1], [xp + cw[i], yb + cs * i, 1], [xp + cw[i], yb + cs * (i + 1) - 4, 1], [xp + cw[i] - 5, yb + cs * (i + 1), 1], [xp - 4, yb + cs * (i + 1), 1]], st, { lw: 1.3, hatchGap: 3, seed: 40 + i });
      G.cut(c, [[xp + 2, yb + cs * i + 4], [xp + cw[i] - 4, yb + cs * i + 4]], st, 0.8, { glint: 1 });
      G.cut(c, [[xp + 4, yb + cs * (i + 1) - 4], [xp + cw[i] - 7, yb + cs * (i + 1) - 4]], st, 0.6);
    }
    /* the beam throws its shadow down the pier and over the steps */
    var sg = c.createLinearGradient(0, yb, 0, yb + cs * 3 + Hh * 0.05); sg.addColorStop(0, rgba(st.ink, 0.42)); sg.addColorStop(1, rgba(st.ink, 0));
    c.save(); c.beginPath(); c.rect(-6, yb, xp + 6, cs * 3 + Hh * 0.05); for (i = 0; i < 3; i++) c.rect(xp, yb + cs * i, cw[i], cs); c.clip();
    c.fillStyle = sg; c.fillRect(-6, yb, xp + cw[0] + 6, cs * 3 + Hh * 0.05); c.restore();
    /* set-offs: a sloped lit top, the face, a shadowed underside */
    [[yA, xp, xA], [yB, xA, xB]].forEach(function (so, k) {
      var y = so[0], xi = so[1], xo = so[2];
      poly(c, [[xi - 2, y - 1, 1], [xo, y + dyS, 1], [xo, y + dyS + Hh * 0.016, 1], [xi - 2, y + Hh * 0.012, 1]], st, { lw: 1.3, lift: 1.3, hatchGap: 3, seed: 50 + k });
      c.fillStyle = rgba(st.light, 0.55); c.beginPath(); c.moveTo(xi - 2, y - 1); c.lineTo(xo, y + dyS); c.lineTo(xo, y + dyS + 3); c.lineTo(xi - 2, y + 3); c.closePath(); c.fill();
      c.save(); shaftPath(); c.clip();
      var ug = c.createLinearGradient(0, y + Hh * 0.014, 0, y + Hh * 0.06); ug.addColorStop(0, rgba(st.ink, 0.36)); ug.addColorStop(1, rgba(st.ink, 0));
      c.fillStyle = ug; c.fillRect(-6, y + Hh * 0.014, xo + 6, Hh * 0.05); c.restore();
    });
    /* weathering: soot under every ledge, patina where the water runs, streaks down the shaft */
    var wr = rng(77);
    for (i = 0; i < 14; i++) { var sx = 6 + wr() * (xp - 10), sy = yb + cs * 3 + wr() * 4; taper(c, sx, sy, sx + (wr() - 0.5) * 5, sy + Hh * (0.02 + wr() * 0.03), 3 + wr() * 5, rgba(st.ink, 0.1 + wr() * 0.08)); }
    for (i = 0; i < 6; i++) { var px = 4 + wr() * (xp - 6), py = yb + cs * 3 + Hh * 0.01; taper(c, px, py, px + 2, py + Hh * (0.02 + wr() * 0.025), 2 + wr() * 3, "rgba(104,128,96,.14)"); }
    for (i = 0; i < 8; i++) { var qx = 4 + wr() * (xp - 8), qy = yCap + wr() * (ny0 - yCap); taper(c, qx, qy, qx + (wr() - 0.5) * 3, qy + 20 + wr() * 40, 2.5 + wr() * 3, rgba(st.ink, 0.07)); }
    for (i = 0; i < 5; i++) { var rx = 6 + wr() * (xp - 12), ry = yB + dyS + 6; taper(c, rx, ry, rx + 1, ry + (yBot - ry) * (0.2 + wr() * 0.4), 3 + wr() * 3, rgba(st.ink, 0.1)); }
    /* old graffiti cut into the bare wall under the beam: a heart pierced by an arrow, a date, two initials, each with a lit lip */
    var gy = yt0(L) + Hh * 0.035, gs = Math.max(3.4, Math.min(xp * 0.075, Hh * 0.012)), gw = Math.max(0.55, gs * 0.13);
    if (yb - gy > gs * 9) {
      var hx = xp * 0.3, hy = gy + gs * 1.1;
      G.cut(c, [[hx, hy + gs * 0.95], [hx - gs * 0.95, hy - gs * 0.05], [hx - gs * 0.9, hy - gs * 0.6], [hx - gs * 0.42, hy - gs * 0.78], [hx, hy - gs * 0.36], [hx + gs * 0.42, hy - gs * 0.78], [hx + gs * 0.9, hy - gs * 0.6], [hx + gs * 0.95, hy - gs * 0.05], [hx, hy + gs * 0.95]], st, gw * 1.1, { glint: 1 });
      G.cut(c, [[hx - gs * 1.5, hy + gs * 0.62], [hx + gs * 1.55, hy - gs * 0.7]], st, gw, { glint: 1 });                                          /* the arrow */
      G.cut(c, [[hx + gs * 0.95, hy - gs * 0.95], [hx + gs * 1.55, hy - gs * 0.7], [hx + gs * 1.12, hy - gs * 0.2]], st, gw, { glint: 1 });
      G.cut(c, [[hx - gs * 1.5, hy + gs * 0.62], [hx - gs * 1.85, hy + gs * 0.12]], st, gw); G.cut(c, [[hx - gs * 1.3, hy + gs * 0.72], [hx - gs * 1.62, hy + gs * 0.28]], st, gw);
      var DG = { "1": [[[0.25, 0.2], [0.6, 0], [0.6, 1]]], "7": [[[0, 0.02], [1, 0], [0.35, 1]]], "9": [null, [[0.78, 0.4], [0.74, 0.78], [0.4, 1]]],
                 "J": [[[0.7, 0], [0.7, 0.8], [0.5, 1], [0.2, 0.86]]], "+": [[[0.08, 0.5], [0.92, 0.5]], [[0.5, 0.18], [0.5, 0.82]]], "M": [[[0, 1], [0.04, 0], [0.5, 0.62], [0.96, 0], [1, 1]]] };
      var ring8 = function (cx, cy, rx, ry) { var o = []; for (var q = 0; q <= 8; q++) o.push([cx + cos(q / 8 * PI * 2 - PI / 2) * rx, cy + sin(q / 8 * PI * 2 - PI / 2) * ry]); return o; };
      DG["8"] = [ring8(0.5, 0.26, 0.3, 0.24), ring8(0.5, 0.73, 0.4, 0.27)]; DG["9"][0] = ring8(0.5, 0.3, 0.36, 0.28);
      var letters = function (str, x0, y0, dh) {
        var dw = dh * 0.55;
        for (var li = 0; li < str.length; li++) DG[str[li]].forEach(function (pl) { G.cut(c, pl.map(function (q) { return [x0 + li * dw * 1.45 + q[0] * dw, y0 + q[1] * dh]; }), st, gw * 0.9, { glint: 1 }); });
      };
      letters("1789", xp * 0.2, hy + gs * 2.4, gs * 1.5);
      letters("J+M", xp * 0.36, hy + gs * 5.4, gs * 1.35);
    }
    /* the cornice, then the pinnacle: crockets on both edges, a finial */
    poly(c, [[-6, yCap - Hh * 0.012, 1], [xp + 8, yCap - Hh * 0.012, 1], [xp + 8, yCap, 1], [-6, yCap, 1]], st, { lw: 1.2, hatchGap: 3, seed: 60 });
    poly(c, [[-6, yCap - Hh * 0.024, 1], [xp + 3, yCap - Hh * 0.024, 1], [xp + 3, yCap - Hh * 0.012, 1], [-6, yCap - Hh * 0.012, 1]], st, { lw: 1, hatchGap: 3, seed: 61, pits: false });
    taper(c, xp * 0.55, yCap, xp * 0.55 + 4, yCap + Hh * 0.04, xp * 0.5, rgba(st.ink, 0.1));
    pinnacle(c, xp * 0.5, yCap - Hh * 0.024, xp * 0.42, yCap - Hh * 0.024 - Hh * 0.035, st, { crockets: 8, band: 1 });

    /* ---- the balustrade ---- */
    var x0 = L.xb0, x1 = W + 4, p = bal - cop, nP = Math.ceil((x1 - x0) / p), wcol = mix(sky[1], st.ink, 0.3);
    poly(c, [[x0, rail + 5, 1], [x0 + 4, rail, 1], [x1 - 4, rail, 1], [x1, rail + 5, 1], [x1, rail + cop, 1], [x0, rail + cop, 1]], st, { lw: 1.3, hatchGap: 3, seed: 7 });
    c.fillStyle = rgba(st.light, 0.85); c.beginPath(); c.moveTo(x0 + 1, rail + 4); c.lineTo(x0 + 4.4, rail + 0.8); c.lineTo(x1 - 4.4, rail + 0.8); c.lineTo(x1 - 1, rail + 4); c.closePath(); c.fill();
    G.cut(c, [[x0 + 3, rail + cop - 3.4], [W * 0.5, rail + cop - 3.4], [x1, rail + cop - 3.4]], st, 0.9, { glint: 1 });          /* the drip groove */
    poly(c, [[x0, rail + cop, 1], [x1, rail + cop, 1], [x1, rail + bal + 6, 1], [x0, rail + bal + 6, 1]], st, { lw: 1.1, hatchGap: 3.4, seed: 8, lift: 0.5 });
    var bandTop = rail + cop, bandH = bal - cop;
    for (i = 0; i < nP; i++) {
      var px0 = x0 + i * p, pcx = px0 + p / 2, pcy = bandTop + bandH * 0.5, rr = 0.2 * p, d = 0.21 * p;
      /* a shallow recessed frame */
      c.fillStyle = rgba(st.dark, 0.14); c.fillRect(px0 + 7, bandTop + 5, p - 14, bandH - 7);
      c.strokeStyle = rgba(st.ink, 0.55); c.lineWidth = 1; c.beginPath(); c.moveTo(px0 + 7, bandTop + bandH - 2); c.lineTo(px0 + 7, bandTop + 5); c.lineTo(px0 + p - 7, bandTop + 5); c.stroke();
      c.strokeStyle = rgba(st.light, 0.8); c.beginPath(); c.moveTo(px0 + p - 7, bandTop + 6); c.lineTo(px0 + p - 7, bandTop + bandH - 2); c.lineTo(px0 + 7, bandTop + bandH - 2); c.stroke();
      /* the quatrefoil: four lobes, a hard cusp between each pair; pierced, so the haze shows through */
      var a1 = (d + Math.sqrt(2 * rr * rr - d * d)) / 2, pts = [];
      var ctr = [[0, -d], [d, 0], [0, d], [-d, 0]];
      for (var lb = 0; lb < 4; lb++) {
        var cc = ctr[lb], ang0 = Math.atan2(a1 * (lb % 2 ? -1 : -1), 0), sA = 0;
        var cuspA = [[-a1, -a1], [a1, -a1], [a1, a1], [-a1, a1]][lb], cuspB = [[a1, -a1], [a1, a1], [-a1, a1], [-a1, -a1]][lb];
        var tA = Math.atan2(cuspA[1] - cc[1], cuspA[0] - cc[0]), tB = Math.atan2(cuspB[1] - cc[1], cuspB[0] - cc[0]);
        while (tB < tA) tB += PI * 2;
        for (var s = 0; s <= 8; s++) { var th = lerp(tA, tB, s / 8); pts.push([pcx + cc[0] + cos(th) * rr, pcy + cc[1] + sin(th) * rr, s === 0 || s === 8 ? 1 : 0]); }
      }
      c.save(); G.trace(c, pts.map(function (q) { return [q[0], q[1]]; }), true); c.fillStyle = wcol; c.fill(); c.restore();
      G.hollow(c, pts, st, { deep: 0.55, lw: 1 });
      c.save(); G.trace(c, G.sp(pts, true, 6), true); c.clip(); c.translate(-1.3, -1.3); G.outline(c, G.sp(pts, true, 6), true, rgba(st.light, 0.7), 1.3); c.restore();
      /* soot trailing from the two lower cusps, patina at the foot */
      taper(c, pcx - a1, pcy + a1, pcx - a1 + 1, pcy + a1 + bandH * 0.22, 3.4, rgba(st.ink, 0.15)); taper(c, pcx + a1, pcy + a1, pcx + a1 - 1, pcy + a1 + bandH * 0.2, 3, rgba(st.ink, 0.12));
      /* about a panel in four is not plain: a chipped lobe, a tuft of weed in the lower cusp, or a long streak of soot from the coping */
      var vh = G.hash("bp" + i) % 100;
      if (vh < 28) {
        var vv = vh % 3;
        if (vv === 0) {
          var ntx = pcx + (vh % 2 ? 0.55 : -0.55) * rr, nty = pcy - d - rr * 0.82;
          c.fillStyle = wcol; c.beginPath(); c.moveTo(ntx - 2.6, nty + 2); c.lineTo(ntx + 0.2, nty - 3); c.lineTo(ntx + 3, nty + 1.6); c.closePath(); c.fill();
          G.cut(c, [[ntx - 2.8, nty + 2.2], [ntx - 1.2, nty - 0.6], [ntx + 0.2, nty - 3.1]], st, 0.7, { glint: 1 }); G.cut(c, [[ntx + 0.2, nty - 3.1], [ntx + 1.8, nty - 0.8], [ntx + 3.1, nty + 1.7]], st, 0.8);
          c.fillStyle = rgba(st.pit, 0.9); c.fillRect(ntx + 4, bandTop + bandH - 3.6, 1.8, 1.2); c.fillRect(ntx + 7, bandTop + bandH - 3.2, 1.2, 0.9);                    /* the chip on the sill */
        } else if (vv === 1) {
          var wxk = pcx - a1 * 0.9, wyk = bandTop + bandH - 2.5, weed = { base: "#6b8f55", light: "#a9c883", dark: "#35522c", ink: "#1b2c17", pit: null };
          [[-0.42, 8.5], [0.08, 10.5], [0.5, 7.2]].forEach(function (bd) { G.leaf(c, wxk + bd[0] * 4, wyk, -PI / 2 + bd[0], bd[1], 1.5, 1, weed, { lw: 0.5 }); });
        } else taper(c, pcx + rr * 0.55, bandTop + 3, pcx + rr * 0.65, bandTop + bandH - 1.5, 5.2, rgba(st.ink, 0.22));
      }
    }
    var pg = c.createLinearGradient(0, bandTop + bandH * 0.72, 0, rail + bal + 6); pg.addColorStop(0, "rgba(104,128,96,0)"); pg.addColorStop(1, "rgba(104,128,96,.16)"); c.fillStyle = pg; c.fillRect(x0, bandTop + bandH * 0.72, x1 - x0, bandH * 0.3 + 6);
    /* colonnette posts between the panels, a square pier with a pyramid cap and a crocket every fourth */
    for (i = 0; i <= nP; i++) {
      var qx2 = x0 + i * p, sw = Math.max(4, 5 * u);
      if (i % 4 === 0) {
        var pw2 = Math.max(6, 6.4 * u), ph = 10 * u + 4;
        poly(c, R(qx2 - pw2, rail - ph, qx2 + pw2, rail + bal + 6), st, { lw: 1.1, hatchGap: 2.8, seed: 90 + i, lift: 1.1 });
        poly(c, [[qx2 - pw2 - 1.6, rail - ph, 1], [qx2, rail - ph - pw2 * 1.5, 1], [qx2 + pw2 + 1.6, rail - ph, 1]], st, { lw: 0.9, hatchGap: 2.4, pits: false });
        G.leaf(c, qx2 + pw2 * 0.32, rail - ph - pw2 * 0.7, -PI / 2 + 0.9, 5.4 * u + 1, 1.8 * u + 0.6, 1, st, { lw: 0.5 });
        G.cut(c, [[qx2 - pw2 * 0.4, rail - ph - 1], [qx2 - pw2 * 0.4, rail + cop]], st, 0.5, { glint: 1 });
      } else {
        poly(c, R(qx2 - sw / 2, bandTop + 2, qx2 + sw / 2, rail + bal + 6), st, { lw: 0.8, pits: false, hatch: false, seed: 100 + i });
        poly(c, R(qx2 - sw * 0.95, bandTop + 1, qx2 + sw * 0.95, bandTop + 5), st, { lw: 0.7, pits: false, hatch: false });
        poly(c, R(qx2 - sw * 0.95, bandTop + bandH - 7, qx2 + sw * 0.95, bandTop + bandH - 2), st, { lw: 0.7, pits: false, hatch: false });
        if (warm > 0.05) { c.strokeStyle = rgba("#ffcf9a", 0.55 * warm); c.lineWidth = 1; c.beginPath(); c.moveTo(qx2 - sw / 2 + 0.6, bandTop + 6); c.lineTo(qx2 - sw / 2 + 0.6, bandTop + bandH - 8); c.stroke(); }
      }
    }
    /* low sun: a warm rim along the lit chamfer of the coping */
    if (warm > 0.05) { c.fillStyle = rgba("#ffc890", 0.5 * warm); c.fillRect(x0 + 3, rail + 0.4, x1 - x0 - 6, 1.6); }
    /* wet stone darkens; a sheen runs along the coping; puddles on the pier's set-offs */
    if (wet > 0.02) {
      c.fillStyle = rgba("#1f2638", 0.2 * wet); c.fillRect(-6, rail, W + 12, bal + 6);
      c.save(); shaftPath(); c.clip(); c.fillRect(-6, yCap - Hh * 0.024, xB + 6, yBot - yCap + Hh * 0.024); c.restore();
      var sh = c.createLinearGradient(0, rail, 0, rail + 5); sh.addColorStop(0, rgba("#e8f2ff", 0.6 * wet)); sh.addColorStop(1, rgba("#e8f2ff", 0));
      c.fillStyle = sh; c.fillRect(x0 + 3, rail + 0.5, x1 - x0 - 6, 4.5);
      c.fillStyle = rgba("#dfeaff", 0.4 * wet); c.fillRect(xp - 2, yA + 2, L.pA + 2, 2.4); c.fillRect(xA - 2, yB + 2, L.pB + 2, 2.4);
    }
    if (night > 0) lampLight(c, L, night, 0.1);
  }

  /* ---------------------------------------------------------------- pigeons */
  /* a pigeon: plump grey body, iridescent neck, orange eye, coral feet. peck 0..1 dips the head; fly > 0 draws the wings open
     (the position is the caller's: o.flap -1..1 beats them); o = { hunch, shake, preen, ruffle, rot, crouch, walk } */
  /* four plumages: the town grey, a dark checker with two black wing bars, a pale bird patched with grey, a brown-red one; the neck's sheen goes with each */
  var PLUM = [
    { gr: { base: "#9aa0ad", light: "#d9dde6", dark: "#565b68", ink: "#1f2128", pit: null }, near: { base: "#a7adba", light: "#e1e5ec", dark: "#5b606d", ink: "#1f2128" }, far: { base: "#7c8290", light: "#a9afbc", dark: "#444956", ink: "#1b1d24" },
      fold: { base: "#b5bac5", light: "#e6e9ef", dark: "#6c717d", ink: "#2a2c33" }, bar: "#3a3d46", bw: 1.2, head: "#8d93a1", lid: "#6c717f", neck: ["#6a4f8e", "#3f8f7a", "#8a8f9c"] },
    { gr: { base: "#6f7683", light: "#a6acb9", dark: "#3a3f4a", ink: "#16181d", pit: null }, near: { base: "#5e6573", light: "#8c93a2", dark: "#323640", ink: "#16181d" }, far: { base: "#4a505c", light: "#737a89", dark: "#262a32", ink: "#101216" },
      fold: { base: "#59606e", light: "#868d9b", dark: "#2d313b", ink: "#14161b" }, bar: "#0c0d10", bw: 1.7, head: "#656c7a", lid: "#454b57", neck: ["#5a3f7e", "#2f7f6a", "#6a7080"] },
    { gr: { base: "#d4d6dc", light: "#f5f6f9", dark: "#9a9ea9", ink: "#2a2c33", pit: null }, near: { base: "#dcdde2", light: "#fafafc", dark: "#a4a8b2", ink: "#2a2c33" }, far: { base: "#bcc0c9", light: "#e2e4e9", dark: "#848994", ink: "#25272e" },
      fold: { base: "#e6e7eb", light: "#ffffff", dark: "#aeb2bb", ink: "#2a2c33" }, bar: "#9aa0ad", bw: 1.1, head: "#d2d4da", lid: "#a8acb6", neck: ["#b6a8cc", "#93c4b4", "#c4c6ce"], patch: "#9aa0ad" },
    { gr: { base: "#8a6a5a", light: "#c4a28e", dark: "#4e382e", ink: "#201510", pit: null }, near: { base: "#9a7664", light: "#d0ae9a", dark: "#583f33", ink: "#201510" }, far: { base: "#6e5144", light: "#9a7a68", dark: "#3c291f", ink: "#180f0b" },
      fold: { base: "#a07c68", light: "#d6b4a0", dark: "#5a4034", ink: "#2a1a12" }, bar: "#3e2a20", bw: 1.3, head: "#7c5e50", lid: "#5a4036", neck: ["#6a4a5a", "#4f7a62", "#8a6a5a"] }
  ];
  G.pigeon = function (c, x, y, s, flip, peck, t, fly, o) {
    o = o || {};
    c.save(); c.translate(x, y); if (o.rot) c.rotate(flip ? -o.rot : o.rot); c.scale(flip ? -s : s, s);
    var pl = PLUM[o.plum || 0], gr = pl.gr, hunch = o.hunch || 0, crouch = o.crouch || 0;
    if (o.shake) c.translate(sin(t * 0.09) * o.shake * 1.3, 0);
    if (crouch) c.translate(0, crouch * 3);
    var wing = function (th, shade) {
      /* a spread wing from the shoulder: th = 0 trails straight back, + lifts it, - lowers it */
      var sx = -1, sy = -10, dx = -cos(th), dy = -sin(th), nx = -dy, ny = dx, P = function (a, b) { return [sx + dx * a + nx * b, sy + dy * a + ny * b]; };
      var pts = [P(0, 3.2), P(9, 5.4), P(19, 4), P(29, 1.6), P(32, -0.4), P(27, -3.4), P(22, -5.8), P(16, -7), P(10, -7.6), P(4, -6)];
      pts[0].push(1); pts[4].push(1);
      G.part(c, pts, shade ? pl.far : pl.near, { lw: 0.7, pits: false, hatchGap: 2.4, steps: 3 });
      for (var f = 1; f < 5; f++) G.cut(c, [P(10 + f * 4.6, 2.4 - f * 0.4), P(14 + f * 4.6, -3 - f * 0.5)], gr, 0.4);
    };
    var th = o.flap == null ? 0.5 : o.flap * 1.0 + 0.1;
    if (fly > 0) wing(th * 0.95 + 0.2, true);
    /* tail, body, and (at rest) the folded wing with its two dark bars */
    G.part(c, [[-14, -6], [-26, -4 + (o.tailUp || 0), 1], [-24, 2 + (o.tailUp || 0), 1], [-10, 2]], gr, { lw: 0.8, pits: false });
    c.save(); if (hunch) c.scale(1 + 0.1 * hunch, 1 + 0.14 * hunch);
    G.part(c, [[-14, -8], [-6, -16], [6, -16], [12, -8], [10, 2], [-4, 6], [-14, 2]], gr, { lw: 1, round: 1, pits: false });
    if (fly > 0) { wing(th, false); }
    else {
      G.part(c, [[-12, -8], [0, -12], [8, -6], [-2, 0]], pl.fold, { lw: 0.7, pits: false });
      if (pl.patch) { c.fillStyle = pl.patch; c.beginPath(); c.ellipse(-6, -6.4, 2.6, 1.7, -0.35, 0, 7); c.ellipse(3.4, -6.2, 2.1, 1.4, -0.5, 0, 7); c.fill(); }
      c.strokeStyle = pl.bar; c.lineWidth = pl.bw; c.beginPath(); c.moveTo(-8, -7); c.lineTo(-1, -9); c.moveTo(-6, -4); c.lineTo(1, -6); c.stroke();
    }
    c.restore();
    /* the head: bobs while it walks, dips to peck, turns back to preen, tucks in the rain */
    var hb = peck ? 6 * peck : sin(t * 0.008) * 1.5 * (1 - hunch), pr = o.preen || 0;
    c.save(); c.translate(8 - hunch * 5, -14 + hb + hunch * 4); c.rotate(peck ? 0.7 * Math.min(1, peck * 1.4) : 0); if (pr) { c.translate(-5 * pr, 3 * pr); c.rotate(-2.1 * pr); }
    var neck = c.createLinearGradient(-4, 0, 6, 8); neck.addColorStop(0, pl.neck[0]); neck.addColorStop(0.5, pl.neck[1]); neck.addColorStop(1, pl.neck[2]);
    c.fillStyle = neck; c.beginPath(); c.ellipse(0, 4, 5.5, 6.5, 0, 0, 7); c.fill();
    c.fillStyle = pl.head; c.beginPath(); c.arc(3, -2, 4.6, 0, 7); c.fill(); c.strokeStyle = gr.ink; c.lineWidth = 0.8; c.stroke();
    if (hunch > 0.5 && !pr) { c.fillStyle = pl.lid; c.beginPath(); c.arc(4.2, -3, 1.5, 0, PI); c.fill(); }     /* the eye shut */
    else { c.fillStyle = "#e0782a"; c.beginPath(); c.arc(4.2, -3, 1.4, 0, 7); c.fill(); c.fillStyle = "#111"; c.beginPath(); c.arc(4.4, -3, 0.6, 0, 7); c.fill(); }
    c.fillStyle = "#e9e0d0"; c.beginPath(); c.ellipse(7, -1.6, 1.4, 1, 0.3, 0, 7); c.fill();
    c.fillStyle = "#2c2a2a"; c.beginPath(); c.moveTo(7.4, -1.6); c.lineTo(11, -0.6); c.lineTo(7.4, 0); c.fill();
    c.restore();
    if (!fly || o.legs) {
      c.strokeStyle = "#d06a5a"; c.lineWidth = 1.4; c.beginPath();
      var wk = o.walk || 0, l0 = sin(wk) * 3, l1 = -sin(wk) * 3;
      if (o.legs && fly) { c.moveTo(-2, 4); c.lineTo(-4 + l0, 11); c.moveTo(3, 4); c.lineTo(5 + l1, 11); }
      else { c.moveTo(-2, 4); c.lineTo(-3 + l0, 9 - Math.max(0, -sin(wk)) * 1.6); c.moveTo(3, 4); c.lineTo(4 + l1, 9 - Math.max(0, sin(wk)) * 1.6); c.moveTo(-5 + l0, 9); c.lineTo(0 + l0, 9); c.moveTo(1 + l1, 9); c.lineTo(7 + l1, 9); }
      c.stroke();
    }
    c.restore();
  };

  /* A pigeon through a small sprite of its own: its pose is quantised, so a perched bird is redrawn only when the pose changes. */
  function drawPigeon(c, e, slot, x, y, s, flip, peck, t, fly, o) {
    var cv = c.canvas, dpr = e.dpr, P = cv._gp || (cv._gp = []), ent = P[slot], q8 = function (v) { return Math.round((v || 0) * 8); };
    var w = Math.ceil(54 * s * dpr), h = Math.ceil(58 * s * dpr), tq = Math.round(t / 100) * 100;
    if (!ent || ent.w !== w || ent.h !== h) ent = P[slot] = { cv: mk(w, h), w: w, h: h, key: null, c: null }, ent.c = ent.cv.getContext("2d");
    var night = o.night || 0, wetg = o.wet || 0, key = [dpr, s.toFixed(2), o.plum || 0, Math.round(night * 10), Math.round(wetg * 10), q8(peck), fly ? q8(o.flap) + "f" : 0, q8(o.hunch), q8(o.shake), q8(o.preen), q8(o.crouch), q8(o.tailUp), o.legs ? 1 : 0, o.walk ? Math.round(o.walk * 3) : 0, fly ? t : tq].join("|");
    if (ent.key !== key) {
      var sc = ent.c; sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, w, h); sc.setTransform(dpr, 0, 0, dpr, 0, 0);
      G.pigeon(sc, 38 * s, 42 * s, s, false, peck, fly ? t : tq, fly, { hunch: o.hunch, shake: o.shake, preen: o.preen, crouch: o.crouch, tailUp: o.tailUp, legs: o.legs, walk: o.walk, flap: o.flap, plum: o.plum });
      if (night > 0.05 || wetg > 0.05) {                          /* the same dusk and wet grade as the stone it sits on */
        sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalCompositeOperation = "source-atop";
        if (night > 0.05) { sc.fillStyle = "rgba(28,35,64," + (0.34 * night) + ")"; sc.fillRect(0, 0, w, h); }
        if (wetg > 0.05) { sc.fillStyle = "rgba(60,70,90," + (0.2 * wetg) + ")"; sc.fillRect(0, 0, w, h); }
        sc.globalCompositeOperation = "source-over";
      }
      ent.key = key;
    }
    c.save(); c.translate(x, y); if (flip) c.scale(-1, 1); if (o.rot) c.rotate(flip ? -o.rot : o.rot);
    c.drawImage(ent.cv, -38 * s, -42 * s, w / dpr, h / dpr); c.restore();
  }

  /* ---------------------------------------------------------------- the frame */
  function water(c, x, y, vx, vy, flow, t, ground, o) { return G.jet(c, x, y, vx, vy, flow, t, ground, o); }
  /* a thin spout for the small gargoyles: one rope of water that breaks into a few drops, a ring where it lands */
  function jetLite(c, x, y, vx, vy, flow, t, ground, o) {
    if (flow <= 0.01) return;
    var gr = o.g || 0.0009, w0 = (o.w || 3) * Math.sqrt(flow), pts = [], T, px, py, i;
    for (T = 0; T < 3000; T += 18) { px = x + vx * T; py = y + vy * T + 0.5 * gr * T * T; pts.push([px, py]); if (py > ground) break; }
    var brk = Math.max(2, Math.floor(pts.length * (0.5 + 0.35 * Math.min(1, flow))));
    c.save(); c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = "rgba(127,180,232,.74)"; c.lineWidth = w0; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (i = 1; i < brk; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = w0 * 0.3; c.beginPath(); c.moveTo(pts[0][0] - w0 * 0.15, pts[0][1]); for (i = 1; i < brk; i++) c.lineTo(pts[i][0] - w0 * 0.15, pts[i][1]); c.stroke();
    var r = rng(o.seed || 7); c.fillStyle = "rgba(156,200,240,.85)"; c.beginPath();
    for (i = 0; i < 7; i++) { var ph = (t * 0.0012 + r()) % 1, id = Math.min(pts.length - 1, Math.floor(lerp(brk * 0.8, pts.length - 1, ph))), q = pts[id], sp = (1 + ph * 5) * (r() - 0.5) * 2; c.moveTo(q[0] + sp + w0 * 0.3, q[1] + sp * 0.4); c.arc(q[0] + sp, q[1] + sp * 0.4, w0 * (0.18 + r() * 0.2), 0, 7); }
    c.fill();
    var end = pts[pts.length - 1], ph2 = (t * 0.002) % 1; c.strokeStyle = "rgba(220,236,255," + (0.8 * (1 - ph2)) + ")"; c.lineWidth = 1; c.beginPath(); c.ellipse(end[0], ground, 3 + ph2 * 9, 1 + ph2 * 2.4, 0, Math.PI, 0); c.stroke();
    c.restore();
  }

  /* stryge: the slab under his claws is the page's own balustrade now, so parts that span the whole slab are skipped */
  function strygeDraw(c, x, y, s, clipY, state) {
    var P = G.part, Cu = G.cut;
    var spanY = function (pts) { var m = 1e9, x0 = 1e9, x1 = -1e9; for (var i = 0; i < pts.length; i++) { if (pts[i][1] < m) m = pts[i][1]; if (pts[i][0] < x0) x0 = pts[i][0]; if (pts[i][0] > x1) x1 = pts[i][0]; } return [m, x1 - x0]; };
    G.part = function (cc, pts, st, o) { var q = spanY(pts); if ((q[0] >= 149.5 && q[1] > 120) || q[0] >= 163) return []; return P.call(G, cc, pts, st, o); };
    G.cut = function (cc, pts, st, w, o) { if (spanY(pts)[0] >= 163) return; return Cu.call(G, cc, pts, st, w, o); };
    c.save(); c.beginPath(); c.rect(x - 4, y - s * 0.2, s + 8, clipY - (y - s * 0.2)); c.clip();
    try { G.beast(c, "stryge", x, y, s, state); } finally { G.part = P; G.cut = Cu; c.restore(); }
  }

  /* A beast drawn into a small canvas of its own and blitted: at rest they move slowly (breath, a blink, a flick), so the sprite is
     redrawn every ~100 ms (66 in rain); while one is being poked it is redrawn every frame. The dusk grade is baked into the sprite. */
  function beastSprite(c, e, id, bx, by, bs, y0, y1, state, o) {
    var cv = c.canvas, dpr = e.dpr, SP = cv._gs || (cv._gs = {}), ent = SP[id];
    var ox = Math.floor((bx - 4) * dpr) / dpr, oy = Math.floor(y0 * dpr) / dpr, w = Math.ceil((bs + 12) * dpr), h = Math.ceil((y1 - y0 + 4) * dpr);
    if (!ent || ent.w !== w || ent.h !== h) { ent = SP[id] = { cv: mk(w, h), w: w, h: h, key: null, sh: null }; ent.c = ent.cv.getContext("2d"); }
    var live = state.poke >= 0, step = live ? 33 : state.rain > 0.05 ? 83 : 100, q = Math.floor((state.t + o.phase) / step), tr = q * step - o.phase, pq = live ? Math.max(0, state.poke - (state.t - tr)) : -1;
    var key = [dpr, q, live ? 1 : 0, Math.round(state.rain * 20), Math.round(o.night * 10), Math.round((o.warm || 0) * 10), ox, oy, bs].join("|");
    if (ent.key !== key) {
      var sc = ent.c, st2 = { t: tr, poke: pq, rain: state.rain, look: state.look };
      sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, w, h); sc.setTransform(dpr, 0, 0, dpr, 0, 0); sc.translate(-ox, -oy);
      ent.mouth = o.draw(sc, st2);
      if (o.night > 0.05) {                                           /* the stone cools with the sky; lamp-light warms it from below */
        sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalCompositeOperation = "source-atop";
        sc.fillStyle = "rgba(28,35,64," + (0.34 * o.night) + ")"; sc.fillRect(0, 0, w, h);
        var lg = sc.createLinearGradient(0, h, 0, 0); lg.addColorStop(0, "rgba(255,176,102," + (0.2 * o.night) + ")"); lg.addColorStop(0.55, "rgba(255,176,102,0)");
        sc.fillStyle = lg; sc.fillRect(0, 0, w, h); sc.globalCompositeOperation = "source-over";
      }
      if (o.warm > 0.02) {                                            /* dawn and dusk: the faces that catch the sun go orange, from the sun's side */
        sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalCompositeOperation = "source-atop";
        var wg = sc.createLinearGradient(0, 0, w, h * 0.5); wg.addColorStop(0, "rgba(255,170,100," + (0.16 * o.warm) + ")"); wg.addColorStop(1, "rgba(255,170,100," + (0.04 * o.warm) + ")");
        sc.fillStyle = wg; sc.fillRect(0, 0, w, h); sc.globalCompositeOperation = "source-over";
      }
      ent.key = key; ent.shDirty = true; ent.ox = ox; ent.oy = oy;
    }
    ent.ox = ox; ent.oy = oy;
    return ent;
  }
  /* its silhouette, made when the shadow is wanted (a dark copy of the sprite) */
  function silOf(ent) {
    if (!ent.sh) { ent.sh = mk(ent.w, ent.h); ent.shc = ent.sh.getContext("2d"); ent.shDirty = true; }
    if (ent.shDirty) { var q = ent.shc; q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = "source-over"; q.clearRect(0, 0, ent.w, ent.h); q.drawImage(ent.cv, 0, 0); q.globalCompositeOperation = "source-in"; q.fillStyle = "#1c2340"; q.fillRect(0, 0, ent.w, ent.h); q.globalCompositeOperation = "source-over"; ent.shDirty = false; }
    return ent.sh;
  }

  /* rain: the kit's streaks, batched into three strokes by brightness so the frame stays cheap */
  function rainDrops(c, w, h, t, amt, wind, seed) {
    if (amt <= 0.01) return;
    var r = rng(seed || 3), n = Math.min(w * h < 300000 ? 140 : 260, Math.round(260 * amt * (w * h) / 600000) + 12), sl = 0.12 + (wind || 0) * 0.5, B = [[], [], []], i;
    for (i = 0; i < n; i++) {
      var sx = r() * (w + 200) - 100, sp = 0.7 + r() * 0.5, len = 9 + r() * 12, y = ((r() * h + t * sp) % (h + 40)) - 20, x = sx + y * sl, a = r() * 0.5;
      B[Math.min(2, (a * 6) | 0)].push([x, y, x + len * sl, y + len]);
    }
    c.save(); c.strokeStyle = "rgb(200,220,255)"; c.lineWidth = 1;
    for (i = 0; i < 3; i++) { c.globalAlpha = 0.35 + (i + 0.5) / 3 * 0.5; c.beginPath(); B[i].forEach(function (q) { c.moveTo(q[0], q[1]); c.lineTo(q[2], q[3]); }); c.stroke(); }
    c.restore();
  }

  H.draw = function (c, W, Hh, st) {
    st = st || {}; st.t = st.t || 0; if (st.alt == null) st.alt = 20; st.rain = clamp(st.rain || 0, 0, 1);
    var f0 = window.performance ? performance.now() : 0;
    lastT = st.t; taps = c.canvas._gt || (c.canvas._gt = []);
    var L = lay = layout(W, Hh), K = params(st);
    L.sun = sunPos(L, K.alt);
    var e = layers(c, L, K), M = e.M, t = st.t, wet = st.rain, night = K.night, u = L.u, dpr = e.dpr, i;
    var sky = K.sky, port = L.port, warm = clamp((12 - K.alt) / 12, 0, 1) * (K.alt > -2 ? 1 : 0) * (1 - wet);
    if (st.poke >= 0) taps.push({ who: st.pokeWho || "notre", at: t - st.poke });
    if (taps.length > 12) taps.splice(0, taps.length - 12);
    /* taps from the page arrive as poke >= 0 for 2.2 s: dedupe by start time */
    for (i = taps.length - 1; i > 0; i--) if (abs(taps[i].at - taps[i - 1].at) < 40 && taps[i].who === taps[i - 1].who) taps.splice(i, 1);

    /* sky, stars, clouds (blits are kept 1:1 with device pixels) */
    var bh = Math.min(e.back.height, Math.ceil((L.hz + Hh * 0.08) * dpr));
    c.drawImage(e.back, 0, 0, e.back.width, bh, 0, 0, e.back.width / dpr, bh / dpr);
    if (night > 0.05) {
      for (var sk = 0; sk < 4; sk++) {
        c.beginPath();
        for (i = 0; i < e.stars.length; i++) { var sr = e.stars[i], tw = 0.6 + 0.4 * sin(t * 0.002 + sr[3] * 3); if (Math.min(3, (sr[2] * tw * 4) | 0) === sk) c.rect(sr[0], sr[1], sr[4], sr[4]); }
        c.fillStyle = "rgba(255,255,240," + (night * (1 - wet) * (0.3 + sk * 0.23)) + ")"; c.fill();
      }
    }
    var wind = st.wind == null ? 0.1 : st.wind;
    for (i = 0; i < e.clouds.length; i++) {
      var cl = e.clouds[i], span = W * 1.7 + cl.w, cx = ((cl.x0 + t * cl.v * (1 + wind * 3)) % span) - cl.w;
      c.globalAlpha = cl.thin ? 0.9 : 1; c.drawImage(cl.cv, cx, cl.y, cl.w, cl.h); c.globalAlpha = 1;
    }
    c.drawImage(e.mid, 0, 0, e.mid.width / dpr, e.mid.height / dpr);

    /* life in the city: windows that light and go out, lamps and their shimmer, the boat, smoke, a roof flash, glints on the river */
    cityLife(c, L, K, e, st);
    /* crows round the spire, the rooster on its tip */
    crowsAndRooster(c, L, K, e, st);
    /* the flying buttresses' gargoyles spout in rain */
    for (i = 0; i < M.spouts.length; i++) {
      var sp = M.spouts[i];
      if (wet > 0.05) jetLite(c, sp[0], sp[1], 0.08 * (1 + (1 - sp[2]) * 0.3), 0.018, wet * 0.8, t + i * 300, sp[1] + Hh * 0.08 * sp[2] + 40, { w: 3.5 * sp[2], seed: 40 + i, g: 0.0009 });
    }

    /* ---- the near gargoyle on its beam ---- */
    var n = L.notre, pn = st.pokeWho === "notre" && st.poke >= 0 ? st.poke : -1, env = G.pk({ poke: pn }, 1600), mouth = null;
    var ne = beastSprite(c, e, "notre", n.x, n.y, n.s, n.y + 4 * n.k, n.y + 158 * n.k, { t: t, poke: pn, rain: wet }, { phase: 0, night: night, warm: warm, draw: function (sc, s2) { return G.beast(sc, "notre", n.x, n.y, n.s, s2); } });
    c.drawImage(ne.cv, ne.ox, ne.oy + (env > 0 ? n.s * 0.02 * env : 0), ne.w / dpr, ne.h / dpr);       /* the whole body hunches on a tap */
    mouth = ne.mouth;
    if (mouth) {
      var gush = wet + (pn >= 0 && pn < 1600 ? 0.6 * (1 - pn / 1600) : 0);
      water(c, mouth.x, mouth.y, mouth.dx * 0.22, mouth.dy * 0.2, gush, t, L.rail + L.bal * 0.3, { w: n.s / 60, seed: 3, g: 0.0011 });
      /* a dry spell: now and then a drop leaves the lip, falls, and splashes on the coping */
      if (wet < 0.05) lipDrop(c, mouth.x - 2 * n.k, mouth.y + 8 * n.k, t, L);
      /* a tap: a shower arc that sprinkles the pigeons on its back */
      if (pn >= 0 && pn < 1500) {
        var sr2 = rng(5), pu = pn / 1500;
        c.fillStyle = "rgba(176,210,240,.85)";
        for (i = 0; i < 18; i++) { var ph = (pu * 1.2 + sr2() * 0.6) % 1, px = n.x + n.s * (0.3 + sr2() * 0.34), py = n.y + n.s * 0.2 + ph * n.s * 0.2; c.globalAlpha = (1 - pu) * (1 - ph * 0.5); c.beginPath(); c.arc(px, py, 1.4 + sr2(), 0, 7); c.fill(); }
        c.globalAlpha = 1;
      }
    }
    /* the pier and the balustrade, in front of the beam's root and the falling water */
    var nx0 = Math.floor((L.xB + 8) * dpr), ry0 = Math.floor((L.rail - 14) * dpr);
    c.drawImage(e.near, 0, 0, nx0, e.near.height, 0, 0, nx0 / dpr, e.near.height / dpr);
    c.drawImage(e.near, nx0, ry0, e.near.width - nx0, e.near.height - ry0, nx0 / dpr, ry0 / dpr, (e.near.width - nx0) / dpr, (e.near.height - ry0) / dpr);
    if (wet > 0.05) wetStone(c, L, st);

    /* ---- the chimera on the rail ---- */
    var y = L.stryge, pyr = st.pokeWho === "stryge" && st.poke >= 0 ? st.poke : -1, SB = G.BEASTS.stryge || {};
    var perch = strygePerch(L, st, SB), clipY = L.rail + 12.5 * y.k;
    var ye = beastSprite(c, e, "stryge", y.x, y.y, y.s, y.y - 14 * y.k, clipY, { t: t, poke: pyr, rain: wet, look: perch.look }, { phase: 50, night: night, warm: warm, draw: function (sc, s2) { strygeDraw(sc, y.x, y.y, y.s, clipY, s2); return null; } });
    if (K.alt > -1 && wet < 0.6) strygeShadow(c, L, K, ye, dpr);
    c.drawImage(ye.cv, ye.ox, ye.oy, ye.w / dpr, ye.h / dpr);
    if (wet > 0.05) tongueDrop(c, L, y, SB, st);

    /* ---- pigeons ---- */
    pigeons(c, L, K, st, perch, e);

    /* rain on the roofs' eaves, then the streaks themselves */
    if (wet > 0.05) rainStone(c, L, K, st);
    rainDrops(c, W, Hh, t, wet, wind * 0.04 + 0.08, 9);
    if (e.fresh) { e.fresh = false; e.cost = (window.performance ? performance.now() : 0) - f0; e.at = f0 + e.cost; }      /* what a rebuild cost, so a slider drag backs off */
  };

  /* ---------------------------------------------------------------- life */
  function cityLife(c, L, K, e, st) {
    var W = L.W, Hh = L.H, t = st.t, M = e.M, night = K.night, wet = st.rain, u = L.u, i, wind = st.wind == null ? 0.1 : st.wind;
    /* windows: each lights and goes dark on its own 20-60 s turn; drawn in six batches (two colours, three brightnesses) */
    if (night > 0.15) {
      for (var wk = 0; wk < 6; wk++) {
        c.beginPath();
        for (i = 0; i < M.wins.length; i++) {
          var w = M.wins[i], per = 20000 + (w[4] % 40000), ph = ((t / per) + (w[4] % 997) / 997) % 1;
          if (ph > 0.72 || ((w[4] & 1) * 3 + ((w[4] >> 3) % 3)) !== wk) continue;
          c.rect(w[0], w[1], w[2], w[3]);
        }
        c.fillStyle = G.rgba(wk < 3 ? "#ffcf7a" : "#fff1c8", night * (0.55 + 0.2 * (wk % 3))); c.fill();
      }
    }
    /* quai lamps: the shimmer under each, a gold dash that wavers in the river (the lamps and their haloes are in the cached layer) */
    if (night > 0.2) {
      for (var d = 0; d < 4; d++) {
        c.beginPath();
        for (i = 0; i < M.lamps.length; i++) { var lp = M.lamps[i]; c.rect(lp[0] - 1 + sin(t * 0.002 + d + i) * 1.4, lp[2] + 2 + d * 3.4 * u, 2, 1.8); }
        c.fillStyle = G.rgba("#ffcf7a", night * 0.5 * (0.55 + 0.45 * sin(t * 0.003 + d * 1.3)) * (1 - d * 0.18)); c.fill();
      }
    }
    /* sun glints travelling on the river, thick under the sun */
    if (K.alt > 0 && wet < 0.7) {
      var rr = rng(19), sx = L.sun.x;
      for (i = 0; i < 26; i++) {
        var gx = (rr() * W + t * (0.008 + rr() * 0.01)) % W, gy = riverY(L, gx) + L.riverH * (0.2 + rr() * 0.6), near = Math.exp(-Math.pow((gx - sx) / (W * 0.24), 2)), a = (0.12 + 0.55 * near) * (0.5 + 0.5 * sin(t * 0.004 + i * 2.1)) * clamp(K.alt / 12, 0, 1) * (1 - wet);
        c.fillStyle = "rgba(255,250,228," + a + ")"; c.fillRect(gx, gy, (4 + rr() * 7) * u, 1.1);
      }
    }
    /* a zinc roof flashes as the sun's sweep passes, about every 8 s */
    if (K.alt > 6 && wet < 0.5) {
      var sw = ((t % 8000) / 8000 * 1.5 - 0.25) * W;
      for (i = 0; i < M.glints.length; i++) {
        var gl = M.glints[i], dd = 1 - abs(gl[0] + gl[2] / 2 - sw) / (W * 0.05);
        if (dd > 0) { c.fillStyle = "rgba(255,255,255," + (0.5 * dd * dd) + ")"; c.fillRect(gl[0] + gl[2] * 0.1, gl[1] + gl[3] * 0.1, gl[2] * 0.8, gl[3] * 0.52); }
      }
    }
    /* chimney smoke curls up from three or four pots, bent by the wind; the puffs fade in three batches */
    var sc0 = night > 0.5 ? "150,150,170" : "235,232,226";
    for (var sb = 0; sb < 3; sb++) {
      c.beginPath();
      for (i = 0; i < M.smoke.length; i++) {
        var sm = M.smoke[i];
        for (var q = 0; q < 6; q++) {
          var a2 = ((t / 6000) + q / 6 + i * 0.31) % 1; if (Math.min(2, (a2 * 3) | 0) !== sb) continue;
          var px = sm[0] + (wind * 60 + 6) * a2 * sm[2] + sin(a2 * 6 + i + q) * 2.4 * sm[2], py = sm[1] - a2 * 42 * sm[2], rr2 = (1.6 + a2 * 6) * sm[2];
          c.moveTo(px + rr2, py); c.arc(px, py, rr2, 0, 7);
        }
      }
      c.fillStyle = "rgba(" + sc0 + "," + ((1 - (sb + 0.5) / 3) * 0.36 * (1 - wet * 0.4)) + ")"; c.fill();
    }
    /* the traffic on the two bridges, then the red light on the Tour Montparnasse */
    bridgeTraffic(c, L, K, M, t);
    if (M.mont && night > 0.15) {
      var mq = M.mont, mpu = (t % 2400) < 520 ? 1 : 0.12, mrr = Math.max(0.9, mq[2] * 1.1);
      c.fillStyle = rgba("#ff6a4a", 0.16 * night * mpu); c.beginPath(); c.arc(mq[0], mq[1], mrr * 3.2, 0, 7); c.fill();
      c.fillStyle = rgba("#ff6a4a", 0.5 * night * (0.4 + 0.6 * mpu)); c.beginPath(); c.arc(mq[0], mq[1], mrr, 0, 7); c.fill();
    }
    /* the bateau-mouche: 80 units of white hull with a blue stripe and a rounded bow, a long glass canopy of ten panes, an open stern with five
       passengers (one waves) and a tricolour on a staff, a V of wake behind. It sails under the bridges and never over a roof: it is clipped to
       the river and the decks are cut out of the clip. At night its searchlight sweeps the quai. */
    var bl = 80 * u, bx = ((t / 78000 + 0.3) % 1) * (W + bl * 1.9) - bl * 0.95, by = riverY(L, bx) + L.riverH * 0.58 + sin(t * 0.0013) * 0.35 * u, clipY = riverY(L, bx) + L.riverH * 1.05;
    c.save();
    c.beginPath(); c.rect(0, 0, W, clipY);
    (M.bridges || []).forEach(function (b) { c.rect(b.x, b.y0, b.w, Math.max(0, clipY - b.y0)); });
    c.clip("evenodd");
    var xs = bx - bl * 0.5, xb2 = bx + bl * 0.5, deck = by - 2.4 * u, hull = mix("#f2efe6", "#8f98b4", night * 0.55), blue = mix("#2f5d9a", "#18284a", night * 0.5);
    /* wake: two long lines opening behind the bow, foam under the hull, a trail of bubbles */
    var wg = c.createLinearGradient(xb2, 0, xs - bl * 0.7, 0); wg.addColorStop(0, "rgba(255,255,255,.62)"); wg.addColorStop(1, "rgba(255,255,255,0)");
    c.strokeStyle = wg; c.lineWidth = Math.max(0.9, 0.8 * u); c.lineCap = "round";
    c.beginPath(); c.moveTo(xb2 - 3 * u, by + 0.9 * u); c.quadraticCurveTo(bx - bl * 0.25, by + 3.4 * u, xs - bl * 0.7, by + 5.6 * u + sin(t * 0.003) * 0.3 * u); c.stroke();
    c.beginPath(); c.moveTo(xb2 - 3 * u, by + 0.5 * u); c.quadraticCurveTo(bx - bl * 0.25, by - 0.6 * u, xs - bl * 0.7, by - 1.9 * u + sin(t * 0.003 + 1) * 0.3 * u); c.stroke();
    c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.ellipse(bx, by + 1.2 * u, bl * 0.52, 0.9 * u, 0, 0, 7); c.fill();
    for (i = 0; i < 8; i++) { c.globalAlpha = 0.5 - i * 0.055; c.beginPath(); c.arc(xs - bl * (0.04 + i * 0.1), by + 1.8 * u + sin(t * 0.004 + i) * 0.7, (1.7 - i * 0.12) * u, 0, 7); c.fill(); }
    c.globalAlpha = 1;
    /* the hull: a flat sheer, a bow that rounds over, a counter stern; a blue stripe along it, its underside in shade */
    c.beginPath(); c.moveTo(xs, deck); c.lineTo(xb2 - bl * 0.13, deck); c.quadraticCurveTo(xb2 + bl * 0.012, deck + 0.1 * u, xb2, by - 0.3 * u); c.quadraticCurveTo(xb2 - bl * 0.01, by + 0.95 * u, xb2 - bl * 0.07, by + 1.2 * u); c.lineTo(xs + bl * 0.03, by + 1.2 * u); c.quadraticCurveTo(xs - bl * 0.01, by + 0.8 * u, xs, by - 0.6 * u); c.closePath();
    c.fillStyle = hull; c.fill(); c.save(); c.clip();
    c.fillStyle = blue; c.fillRect(xs - 2, by - 0.75 * u, bl + 4, 0.8 * u); c.fillStyle = "rgba(20,30,50,.2)"; c.fillRect(xs - 2, by + 0.1 * u, bl + 4, 1.4 * u); c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(xs - 2, deck, bl + 4, 0.5 * u);
    c.restore(); c.strokeStyle = "rgba(40,50,64,.7)"; c.lineWidth = 0.7; c.stroke();
    /* the open stern: a rail, five passengers on the deck, the last one waving */
    var cs = xs + bl * 0.15, ce = xb2 - bl * 0.17, cth = 5.4 * u, ch0 = deck - cth;
    c.strokeStyle = "rgba(40,50,64,.75)"; c.lineWidth = 0.7; c.beginPath(); c.moveTo(xs + 0.4 * u, deck - 1.7 * u); c.lineTo(cs, deck - 1.7 * u); c.moveTo(xs + 0.4 * u, deck); c.lineTo(xs + 0.4 * u, deck - 1.7 * u); c.stroke();
    var coats = ["#c8442c", "#2f5d9a", "#e8b83a", "#4c7a58", "#7a4a8a"], skins = ["#e8c4a0", "#c89a74", "#f0d2b4", "#9a6a4a", "#e8c4a0"];
    for (i = 0; i < 5; i++) {
      var px = xs + (1.6 + i * 2.1) * u, bob = sin(t * 0.003 + i * 1.9) * 0.18 * u;
      c.fillStyle = coats[i]; c.fillRect(px - 0.5 * u, deck - 1.7 * u + bob, 1 * u, 1.7 * u);
      c.fillStyle = skins[i]; c.beginPath(); c.arc(px, deck - 2.1 * u + bob, 0.55 * u, 0, 7); c.fill();
      if (i === 4) { c.strokeStyle = coats[i]; c.lineWidth = Math.max(0.8, 0.45 * u); c.beginPath(); c.moveTo(px + 0.4 * u, deck - 1.3 * u + bob); c.lineTo(px + 1.1 * u, deck - 2.5 * u - abs(sin(t * 0.006)) * 0.9 * u); c.stroke(); }
    }
    /* the canopy: a glass hall of ten panes under a white roof, its front raked */
    var gc = mix(K.sky[1], "#6c88a4", 0.5), gcl = mix(gc, "#ffffff", 0.35);
    c.beginPath(); c.moveTo(cs, deck); c.lineTo(cs, ch0 + 0.6 * u); c.lineTo(ce - 1.3 * u, ch0); c.lineTo(ce, deck); c.closePath();
    var cg = c.createLinearGradient(0, ch0, 0, deck); cg.addColorStop(0, gcl); cg.addColorStop(1, gc); c.fillStyle = cg; c.fill();
    if (night > 0.3) { c.fillStyle = "rgba(255,214,140," + (0.7 * night) + ")"; c.fill(); }
    c.fillStyle = "rgba(255,255,255,.45)"; c.fillRect(cs, ch0 + 0.6 * u, ce - cs - 1.3 * u, 0.7 * u);
    c.strokeStyle = "rgba(40,50,64,.7)"; c.lineWidth = 0.6;
    for (i = 1; i < 10; i++) { var qx2 = cs + (ce - cs) * i / 10; c.beginPath(); c.moveTo(qx2, deck); c.lineTo(qx2, lerp(ch0 + 0.6 * u, ch0, i / 10)); c.stroke(); }
    c.beginPath(); c.moveTo(cs, deck); c.lineTo(cs, ch0 + 0.6 * u); c.lineTo(ce - 1.3 * u, ch0); c.lineTo(ce, deck); c.stroke();
    c.fillStyle = "#f7f4ec"; c.fillRect(cs - 0.6 * u, ch0 - 0.7 * u + 0.4 * u, ce - cs + 0.9 * u - 1.3 * u, 0.9 * u); c.strokeStyle = "rgba(40,50,64,.6)"; c.lineWidth = 0.5; c.strokeRect(cs - 0.6 * u, ch0 - 0.3 * u, ce - cs - 0.4 * u, 0.9 * u);
    /* the staff with its tricolour, flying aft in the boat's own wind; a lamp on the bow at night */
    c.strokeStyle = "rgba(40,50,64,.85)"; c.lineWidth = Math.max(0.7, 0.5 * u); c.beginPath(); c.moveTo(xs + 1 * u, deck); c.lineTo(xs + 1 * u, deck - 7.4 * u); c.stroke();
    ["#2f5d9a", "#f4f1ea", "#d33a2c"].forEach(function (fc, fi) { var fx = xs + 1 * u - (fi + 1) * 1.35 * u, w0 = sin(t * 0.007 + fi * 0.9) * 0.45 * u; c.fillStyle = fc; c.beginPath(); c.moveTo(fx + 1.35 * u, deck - 7.3 * u + (fi ? w0 * 0.5 : 0)); c.lineTo(fx, deck - 7.3 * u + w0); c.lineTo(fx, deck - 5.1 * u + w0); c.lineTo(fx + 1.35 * u, deck - 5.1 * u + (fi ? w0 * 0.5 : 0)); c.closePath(); c.fill(); });
    if (night > 0.3) { c.fillStyle = rgba("#ffe9a8", night * 0.9); c.beginPath(); c.arc(xb2 - bl * 0.09, deck - 0.6 * u, 0.7 * u + 0.3, 0, 7); c.fill(); }
    if (night > 0.4 && wet < 0.7) {
      var ang = -0.9 + sin(t * 0.0006) * 0.7, len = 150 * u, tx = xb2 - bl * 0.2, ty = ch0 - 0.3 * u;
      var lgs = c.createLinearGradient(tx, ty, tx + cos(ang) * len, ty + sin(ang) * len); lgs.addColorStop(0, "rgba(255,248,214," + (0.32 * night) + ")"); lgs.addColorStop(1, "rgba(255,248,214,0)");
      c.fillStyle = lgs; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + cos(ang - 0.08) * len, ty + sin(ang - 0.08) * len); c.lineTo(tx + cos(ang + 0.08) * len, ty + sin(ang + 0.08) * len); c.closePath(); c.fill();
    }
    c.restore();
    /* the Eiffel sparkles at the top of the hour, when the page tells us the minute; gold lamps burn all night */
    if (M.spark && M.spark.length && st.min != null && st.min < 5 && night > 0.15) {
      var ex = M.spark[0], eyb = M.spark[1], eh = M.spark[2];
      for (i = 0; i < 16; i++) { var v = (i + 1) / 17, ww = eh * 0.26 * Math.exp(-3.4 * v) * 0.8, tw2 = sin(t * 0.02 + i * 2.7); if (tw2 > 0.2) { c.fillStyle = "rgba(255,244,200," + (tw2 * night) + ")"; c.fillRect(ex + (i % 2 ? ww : -ww) - 1, eyb - v * eh * 0.94, 2, 2); } }
    }
  }

  /* the traffic on the bridges: five vehicles and three walkers a deck, each on its own 8-16 s loop from quai to quai. A car's long side runs along the
     deck; the lane toward us is on the left, as it is when you drive on the right. */
  function bridgeTraffic(c, L, K, M, t) {
    var u = L.u, night = K.night, cols = ["#c8442c", "#f0eee6", "#2c3a58", "#e8b83a", "#4c7a58", "#8a4a7a"], coat = ["#2f4a78", "#b8463a", "#3d3d46", "#e8e1d0", "#6a8a58"];
    (M.bridges || []).forEach(function (b, bi) {
      var r = rng(300 + bi * 17), n, len = b.y1 - b.y0;
      c.save(); c.beginPath(); c.rect(b.x, b.y0, b.w, len); c.clip();
      for (n = 0; n < 5; n++) {
        var per = 8000 + r() * 8000, ph = r(), lane = n % 2 === 0 ? 0 : 1, bus = n === 2, vw = (bus ? 2 : 1.7) * u, vh = (bus ? 5.4 : 3.1) * u, col = cols[(n + bi * 2) % cols.length];
        var f = (t / per + ph) % 1, vy = lane ? lerp(b.y1 + vh, b.y0 - vh, f) : lerp(b.y0 - vh, b.y1 + vh, f), vx = b.x + b.w * (lane ? 0.66 : 0.34) - vw / 2, fr = lane ? 0 : 1;
        c.fillStyle = "rgba(0,0,0,.3)"; c.fillRect(vx + 0.8, vy - vh / 2 + 0.9, vw, vh);
        c.fillStyle = col; c.fillRect(vx, vy - vh / 2, vw, vh);
        c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(vx, vy - vh / 2, Math.max(0.5, vw * 0.22), vh);
        c.fillStyle = "rgba(20,28,44,.75)"; c.fillRect(vx + vw * 0.12, fr ? vy + vh * 0.18 : vy - vh * 0.36, vw * 0.76, vh * 0.18);
        if (bus) { c.fillStyle = "rgba(20,28,44,.55)"; for (var wq = 0; wq < 4; wq++) c.fillRect(vx + vw * 0.15, vy - vh * 0.3 + wq * vh * 0.16, vw * 0.7, vh * 0.09); }
        if (night > 0.25) {
          c.fillStyle = rgba("#fff3c8", 0.9 * night); c.fillRect(vx, fr ? vy + vh / 2 - 0.9 : vy - vh / 2, 0.8, 0.9); c.fillRect(vx + vw - 0.8, fr ? vy + vh / 2 - 0.9 : vy - vh / 2, 0.8, 0.9);
          c.fillStyle = rgba("#ff5a40", 0.9 * night); c.fillRect(vx, fr ? vy - vh / 2 : vy + vh / 2 - 0.9, 0.8, 0.9); c.fillRect(vx + vw - 0.8, fr ? vy - vh / 2 : vy + vh / 2 - 0.9, 0.8, 0.9);
        }
      }
      for (n = 0; n < 3; n++) {
        var wper = 9000 + r() * 7000, wph = r(), dirn = n % 2 ? 1 : -1, wf = (t / wper + wph) % 1, wy = dirn > 0 ? lerp(b.y0 - 2 * u, b.y1 + 2 * u, wf) : lerp(b.y1 + 2 * u, b.y0 - 2 * u, wf);
        var wx = b.x + (n === 1 ? b.w - 3.6 * u : 3.6 * u) + sin(wy * 0.5 + n) * 0.15 * u, step = abs(sin(t * 0.009 + n * 2)) * 0.25 * u;
        c.fillStyle = "rgba(0,0,0,.28)"; c.fillRect(wx - 0.4 * u + 0.5, wy - 0.2 * u + 0.5, 1 * u, 1.5 * u);
        c.fillStyle = coat[(n + bi) % coat.length]; c.fillRect(wx - 0.5 * u, wy - 1.1 * u - step, 1 * u, 1.5 * u);
        c.fillStyle = "#e0b890"; c.beginPath(); c.arc(wx, wy - 1.5 * u - step, 0.5 * u, 0, 7); c.fill();
      }
      c.restore();
    });
  }

  /* the crows: dark birds in Meryon's plate, circling the spire tip and the roofs; the rooster turns with the wind */
  function crowsAndRooster(c, L, K, e, st) {
    var t = st.t, W = L.W, Hh = L.H, u = L.u, wet = st.rain, night = K.night, hs = L.sp.base - L.sp.top, wind = st.wind == null ? 0.1 : st.wind, i;
    var tb = bell ? t - bell.at : -1; if (tb > 3500) tb = -1;
    var a = (1 - wet) * (1 - night * 0.55);
    if (a > 0.05) {
      var cx = L.sp.x + 14 * u, cy = L.sp.top + hs * 0.2;
      for (i = 0; i < 5; i++) {
        var r = rng(900 + i), rx = (46 + r() * 90) * u * (L.port ? 0.7 : 1), ry = (16 + r() * 34) * u, om = (0.0006 + r() * 0.0006) * (r() < 0.5 ? 1 : -1), ph = r() * 6.28, cy2 = cy + (r() - 0.3) * hs * 0.3;
        var th = ph + t * om, px = cx + cos(th) * rx, py = cy2 + sin(th) * ry, vx = -sin(th) * rx * om, off = 0;
        if (tb >= 0 && i < 3) { var bu = E(0, 2500, tb), dir = [-1.2, 0.6, 1.5][i]; off = sin(PI * bu) * 150 * u; px += cos(dir) * off * 1.1; py -= abs(sin(dir)) * off * 0.9 + 0; }
        var fl = sin(t * (off > 0 ? 0.045 : 0.018) + i * 2) > 0 ? 1 : -1, sz = (2.6 + r() * 1.4) * u;
        c.strokeStyle = "rgba(22,24,34," + (0.85 * a) + ")"; c.fillStyle = c.strokeStyle; c.lineWidth = Math.max(0.9, 1.2 * u); c.lineCap = "round";
        c.beginPath(); c.moveTo(px - sz * 1.6, py - fl * sz * 0.9); c.lineTo(px - sz * 0.2, py - 0.2); c.lineTo(px + sz * 1.6 * (vx > 0 ? 1 : 1), py - fl * sz * 0.9); c.stroke();
        c.beginPath(); c.ellipse(px, py, sz * 0.75, sz * 0.4, 0, 0, 7); c.fill();
      }
    }
    /* now and then a single crow crosses the whole sky, about every 27 s */
    var cph = t % 27000;
    if (a > 0.05 && cph < 9500) {
      var cu = cph / 9500, cxx = -20 + (W + 40) * cu, cyy = Hh * (L.port ? 0.1 : 0.2) + sin(cu * 9) * 10 * u + cu * Hh * 0.04, cs = 3.2 * u, cf = sin(t * 0.016) > 0 ? 1 : -1;
      c.strokeStyle = "rgba(22,24,34," + (0.8 * a) + ")"; c.fillStyle = c.strokeStyle; c.lineWidth = Math.max(0.9, 1.2 * u); c.lineCap = "round";
      c.beginPath(); c.moveTo(cxx - cs * 1.7, cyy - cf * cs); c.lineTo(cxx - cs * 0.2, cyy); c.lineTo(cxx + cs * 1.7, cyy - cf * cs); c.stroke(); c.beginPath(); c.ellipse(cxx, cyy, cs * 0.8, cs * 0.42, 0, 0, 7); c.fill();
    }
    /* the rooster: gilded copper on the finial; it swings with the wind, and spins when the spire is tapped */
    var rx2 = L.sp.x, ry2 = L.sp.top - hs * 0.002, ru = Math.max(2.4, hs * 0.03), ang = 0.2 + 0.95 * sin(t * 0.0005 * (0.5 + wind * 3.5)) + (tb >= 0 ? 7 * PI * (1 - Math.pow(1 - E(0, 1900, tb), 3)) : 0);
    var sx = cos(ang), gold = K.night > 0.4 ? "#c9a24a" : "#e8bc3e", gl = K.night > 0.4 ? "#ffe3a0" : "#fff0b0";
    c.save(); c.translate(rx2, ry2); c.scale(sx, 1); c.scale(ru, ru);
    c.lineJoin = "round"; c.lineWidth = 0.2; c.strokeStyle = "#4a3004";
    var cp = function (a) { c.beginPath(); a.forEach(function (q, i) { if (i === 0) c.moveTo(q[0], q[1]); else c.lineTo(q[0], q[1]); }); c.closePath(); };
    c.fillStyle = mix(gold, "#7a5410", 0.3);                                                                                       /* the tail plume, behind */
    cp([[-0.5, -0.9], [-1.1, -1.4], [-1.45, -2.2], [-1.2, -2.9], [-1.0, -2.2], [-0.7, -1.7], [-0.25, -1.2]]); c.fill(); c.stroke();
    c.fillStyle = gold; cp([[-0.8, -0.9], [-0.45, -1.45], [0.1, -1.6], [0.55, -1.75], [0.7, -2.1], [0.95, -2.3], [1.15, -2.15], [1.55, -2.1], [1.2, -1.95], [1.02, -1.7], [0.95, -1.1], [0.5, -0.5], [-0.3, -0.5]]); c.fill(); c.stroke();
    c.fillStyle = "#c8442c"; c.beginPath(); c.arc(0.88, -2.42, 0.14, 0, 7); c.arc(1.08, -2.38, 0.12, 0, 7); c.arc(0.7, -2.38, 0.11, 0, 7); c.fill();                           /* the comb */
    c.strokeStyle = gl; c.lineWidth = 0.14; c.beginPath(); c.moveTo(-0.3, -1.35); c.quadraticCurveTo(0.3, -1.55, 0.6, -1.5); c.stroke();                            /* a glint along the back */
    c.strokeStyle = "#4a3004"; c.lineWidth = 0.18; c.beginPath(); c.moveTo(0.1, -0.5); c.lineTo(0.1, 0.1); c.moveTo(0.4, -0.5); c.lineTo(0.45, 0.1); c.stroke();
    c.fillStyle = "#2a1c04"; c.beginPath(); c.arc(1.0, -2.1, 0.07, 0, 7); c.fill();
    c.restore();
  }

  /* a drop that leaves the lip, falls to the coping and splashes: every ~6 s in dry weather */
  function lipDrop(c, x, y, t, L) {
    var per = 6000, u0 = (t % per) / per, ft = 0.1;
    if (u0 > ft + 0.4) return;
    var fall = L.rail - y;
    if (u0 < ft) {                          /* it swells on the lip first */
      var r0 = 0.6 + ease(u0 / ft) * 1.6; c.fillStyle = "rgba(176,210,240,.9)"; c.beginPath(); c.arc(x, y + r0, r0, 0, 7); c.fill(); return;
    }
    var T2 = (u0 - ft) * per, d = 0.5 * 0.00026 * T2 * T2;
    if (d < fall) { c.fillStyle = "rgba(176,210,240,.9)"; c.beginPath(); c.moveTo(x, y + d - 3); c.quadraticCurveTo(x - 1.6, y + d, x, y + d + 1.8); c.quadraticCurveTo(x + 1.6, y + d, x, y + d - 3); c.fill(); }
    else {                                  /* the splash: a small crown and a ring */
      var sp = clamp((d - fall) / 70, 0, 1); if (sp >= 1) return;
      c.strokeStyle = "rgba(235,246,255," + (0.9 * (1 - sp)) + ")"; c.lineWidth = 1; c.beginPath(); c.ellipse(x, L.rail + 1, 2 + sp * 9, 1 + sp * 2.2, 0, 0, 7); c.stroke();
      c.fillStyle = "rgba(235,246,255," + (0.8 * (1 - sp)) + ")"; for (var k = -2; k <= 2; k++) { c.beginPath(); c.arc(x + k * 2.4 * sp * 2.2, L.rail - sp * 8 * (1 - abs(k) * 0.28) + sp * sp * 8, 0.9, 0, 7); c.fill(); }
    }
  }

  /* in rain the grotesque does not spout: a drop swells on the tongue and falls, because the drop is the joke */
  function tongueDrop(c, L, y, SB, st) {
    var d = SB.drip || [172, 124], k = y.k, x = y.x + d[0] * k, y0 = y.y + d[1] * k, per = 1100, u0 = ((st.t + 300) % per) / per, rn = st.rain;
    var fall = L.rail - y0;
    if (u0 < 0.62) { var r0 = (0.5 + ease(u0 / 0.62) * 1.9) * clamp(k * 1.4, 0.8, 1.6); c.fillStyle = "rgba(190,220,246,.92)"; c.beginPath(); c.moveTo(x, y0 - 0.4); c.quadraticCurveTo(x - r0, y0 + r0 * 0.9, x, y0 + r0 * 2); c.quadraticCurveTo(x + r0, y0 + r0 * 0.9, x, y0 - 0.4); c.fill(); c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.arc(x - r0 * 0.3, y0 + r0 * 0.9, r0 * 0.25, 0, 7); c.fill(); return; }
    var T = (u0 - 0.62) / 0.38 * per, dd = 0.5 * 0.0011 * T * T * 0.5 + 3;
    if (dd < fall) { c.fillStyle = "rgba(190,220,246,.92)"; c.beginPath(); c.moveTo(x, y0 + dd - 3); c.quadraticCurveTo(x - 1.5, y0 + dd, x, y0 + dd + 1.8); c.quadraticCurveTo(x + 1.5, y0 + dd, x, y0 + dd - 3); c.fill(); }
    else { var sp = clamp((dd - fall) / 26, 0, 1); if (sp < 1) { c.strokeStyle = "rgba(235,246,255," + (0.85 * (1 - sp)) + ")"; c.lineWidth = 1; c.beginPath(); c.ellipse(x, L.rail + 1, 2 + sp * 7, 1 + sp * 1.6, 0, 0, 7); c.stroke(); } }
  }

  /* the stryge's cast shadow, flattened onto the top of the coping: sheared by the sun's height, squashed to the strip it falls on */
  function strygeShadow(c, L, K, ent, dpr) {
    var sil = silOf(ent), alt = clamp(K.alt, 3, 60), shx = clamp(1 / Math.tan(alt * PI / 180), 0.25, 3.2), rail = L.rail, k2 = 0.03, ox = ent.ox, oy = ent.oy;
    c.save(); c.beginPath(); c.rect(L.xb0, rail, L.W - L.xb0, L.cop * 0.34); c.clip();
    c.globalAlpha = 0.42 * (1 - K.night * 0.7);
    /* image (u, v) -> x' = ox + u + (rail - oy - v) * shx, y' = rail + (rail - oy - v) * k2 */
    c.transform(1, 0, -shx, -k2, ox + (rail - oy) * shx, rail + (rail - oy) * k2);
    c.drawImage(sil, 0, 0, ent.w / dpr, ent.h / dpr);
    c.restore();
  }

  /* wet stone: the pier's rivulets, drips off the coping's underside, rings on the coping, a sheen on the roofs is in the cache */
  function wetStone(c, L, st) {
    var t = st.t, rain = st.rain, Hh = L.H, xp = L.xp, i;
    /* rivulets down the pier, bright, joining at each set-off and dripping off it */
    var segs = [[L.yb + L.cs * 3 + 4, L.yA, xp * 0.2], [L.yb + L.cs * 3 + 4, L.yA, xp * 0.55], [L.yb + L.cs * 3 + 4, L.yA, xp * 0.86], [L.yA + 8, L.yB, xp * 0.35], [L.yA + 8, L.yB, xp * 0.8], [L.yB + 6, L.rail, xp * 0.6]];
    var r = rng(31); c.lineCap = "round";
    for (i = 0; i < segs.length; i++) {
      var sg = segs[i], len = sg[1] - sg[0], pos = (t * 0.04 + r() * len) % len, x = sg[2] + (r() - 0.5) * 8, l = 16;
      var y0 = sg[0] + pos;
      for (var q = 0; q < 2; q++) { var yy = sg[0] + ((pos + q * len * 0.5) % len); taper(c, x + sin(yy * 0.05) * 1.2, yy - l, x + sin(yy * 0.05) * 1.2, yy, 2.6, "rgba(206,226,246," + (0.55 * rain) + ")"); c.fillStyle = "rgba(255,255,255," + (0.7 * rain) + ")"; c.fillRect(x - 0.4, yy - l * 0.6, 0.8, l * 0.5); }
    }
    /* drips let go from each ledge's lip */
    [[L.yA + Hh * 0.027, L.xA], [L.yB + Hh * 0.027, L.xB], [L.yb + L.cs * 3, L.xp + L.W * 0.012]].forEach(function (lp, k) {
      var u0 = ((t / 900) + k * 0.37) % 1; c.fillStyle = "rgba(210,230,250," + (0.85 * rain) + ")";
      if (u0 < 0.5) { c.beginPath(); c.arc(lp[1] - 2, lp[0] + 1 + u0 * 3, 0.8 + u0 * 1.4, 0, 7); c.fill(); } else { var dd = (u0 - 0.5) * (u0 - 0.5) * 120; c.beginPath(); c.arc(lp[1] - 2, lp[0] + 4 + dd, 1.4, 0, 7); c.fill(); }
    });
    /* drops off the coping's underside, rings on its top */
    for (i = 0; i < 9; i++) {
      var dx = L.xb0 + ((i * 0.113 + 0.07) % 1) * (L.W - L.xb0), u2 = ((t / 1100) + i * 0.29) % 1;
      c.fillStyle = "rgba(235,245,255," + (0.85 * rain * (1 - u2 * 0.7)) + ")";
      c.beginPath(); c.arc(dx, L.rail + L.cop + u2 * u2 * L.bal * 0.62, 1.3, 0, 7); c.fill();
      var ru = ((t / 700) + i * 0.41) % 1; c.strokeStyle = "rgba(235,245,255," + (0.7 * rain * (1 - ru)) + ")"; c.lineWidth = 0.8; c.beginPath(); c.ellipse(L.xb0 + (((i * 0.171) + 0.31) % 1) * (L.W - L.xb0), L.rail + 1.6, 1 + ru * 7, 0.5 + ru * 1.4, 0, 0, 7); c.stroke();
    }
  }
  function rainStone(c, L, K, st) {
    /* gutters overflowing along the roof's eave: thin threads from the lead roof */
    var t = st.t, Hh = L.H, rain = st.rain, ye = Hh * (L.cy.eave), x, i, r = rng(41);
    c.strokeStyle = "rgba(220,235,252," + (0.45 * rain) + ")"; c.lineWidth = 1; c.lineCap = "round";
    for (i = 0; i < 14; i++) {
      x = L.xb0 + r() * (L.cy.xend - L.xb0); var yy = (t * 0.06 + r() * 60) % 40;
      c.beginPath(); c.moveTo(x, ye + yy); c.lineTo(x + 0.4, ye + yy + 7 + r() * 5); c.stroke();
    }
  }

  /* ---------------------------------------------------------------- pigeons */
  function strygePerch(L, st, SB) {
    /* a pigeon lands on his near horn every ~14 s, stays a while, and goes; he looks up at it cross-eyed */
    var t = st.t, per = 14000, ph = (t % per), pr = SB.perch || [122, 33], out = { on: false, look: null }, y = L.stryge, k = y.k;
    var tilt = sin(t * 0.0006) * 0.02, hx = 136, hy = 114;
    var px = hx + (pr[0] - hx) * cos(tilt) - (pr[1] - hy) * sin(tilt), py = hy + (pr[0] - hx) * sin(tilt) + (pr[1] - hy) * cos(tilt);
    out.x = y.x + px * k; out.y = y.y + py * k;
    if (ph > 1200 && ph < 6700) { out.on = true; out.look = [0.9, -0.8]; }
    out.t1 = ph; return out;
  }

  /* scatter state: the first start of each scatter run that has not yet begun its flight home */
  function scatterAt(who, i, t) {
    var start = null;
    for (var k = 0; k < taps.length; k++) {
      var tp = taps[k], rel = tp.who === "pigeon" || (tp.who === "notre" && i < 2) || (tp.who === "stryge" && i === 3);
      if (!rel) continue;
      if (tp.at > t) continue;
      if (start == null || tp.at >= start + 9000) start = tp.at;
    }
    return start;
  }

  function pigeons(c, L, K, st, perch, e) {
    var t = st.t, W = L.W, Hh = L.H, n = L.notre, rail = L.rail, wet = st.rain, sp = n.s / 270, k = n.k, i, out = [], night = K.night;
    var shelter = ease(clamp((wet - 0.05) / 0.3, 0, 1));
    /* perches: two on the gargoyle's back, one on the coping; shelter spots on the coping under the beam */
    var home = [
      { x: n.x + 86 * k, y: n.y + 71 * k, flip: false },
      { x: n.x + 118 * k, y: n.y + 66.4 * k, flip: false },        /* both look the same way, at their own heights on the back */
      { x: L.xb0 + (L.W - L.xb0) * (L.port ? 0.5 : 0.4), y: rail + 1, flip: true }
    ], size = [1, 0.92, 1.06, 0.88];
    var shel = L.port ? [L.notre.x + n.s * 0.16, L.notre.x + n.s * 0.3, L.notre.x + n.s * 0.44] : [L.xb0 + L.W * 0.065, L.xb0 + L.W * 0.125, L.xb0 + L.W * 0.19];
    for (i = 0; i < 3; i++) {
      var h = home[i], spi = sp * size[i], p = { x: h.x, y: h.y - 9 * spi, flip: h.flip, fly: 0, o: { plum: i % 4, night: night, wet: wet }, peck: 0, vis: true, ph: 0 };
      /* idle life: the one on the coping pecks three times, then walks 20 px, turns and walks back; one preens; one ruffles every ~9 s */
      var cyc = (t + i * 2600) % 9000, dir = h.flip ? -1 : 1;
      if (i === 2) {
        if (cyc > 1000 && cyc < 2500) p.peck = 0.5 + 0.5 * Math.max(0, sin((cyc - 1000) / 1500 * PI * 3 - PI / 2));
        if (cyc >= 2700 && cyc < 3900) { var w1 = (cyc - 2700) / 1200; p.x += dir * 20 * ease(w1); p.o.walk = (cyc - 2700) * 0.022; }
        else if (cyc >= 3900 && cyc < 5300) p.x += dir * 20;
        else if (cyc >= 5300 && cyc < 6500) { var w2 = (cyc - 5300) / 1200; p.x += dir * 20 * (1 - ease(w2)); p.flip = !h.flip; p.o.walk = (cyc - 5300) * 0.022; }
      } else if (i === 1) {
        if (cyc > 3000 && cyc < 5600) { var pr0 = sin(E(3000, 5600, cyc) * PI); p.o.preen = pr0 > 0.1 ? Math.min(1, pr0 * 1.6) : 0; }
      } else {
        if (cyc > 6200 && cyc < 6900) { p.o.ruffle = sin(E(6200, 6900, cyc) * PI); p.o.shake = p.o.ruffle; }
        if (cyc > 1000 && cyc < 2400) p.peck = 0.4 + 0.4 * Math.max(0, sin((cyc - 1000) / 1400 * PI * 2));
      }
      /* rain: they hop down to the coping under the beam and puff up, heads tucked; one shakes off its drops about every 7 s */
      if (shelter > 0.001) {
        var tx = shel[i], ty = rail + 1 - 9 * spi * 0.78;
        p.x = lerp(p.x, tx, shelter); p.y = lerp(p.y, ty, shelter);
        if (shelter < 0.999) { p.y -= Hh * 0.2 * sin(PI * shelter); p.fly = 1; p.o.flap = sin(t * 0.04 + i) * 0.9; p.o.legs = 1; p.flip = lerp(h.flip ? 1 : 0, 0.5, shelter) > 0.5 ? h.flip : (i % 2 === 0); }
        else {
          p.flip = i === 1 ? false : i === 2; p.o.hunch = 0.85; p.peck = 0; p.o.preen = 0;
          var shk = ((t + i * 2300) % 7000); if (shk < 700) { p.o.shake = sin(shk / 700 * PI); }
        }
      }
      /* the scatter: a tap sends them up and over the city; they come back to the same perch */
      var at = scatterAt("x", i, t);
      if (at != null && t - at < 9000 && wet < 0.3) {
        var t1 = t - at - i * 90;
        if (t1 >= 0) {
          var fp = flight(t1, p, L, i, sp);
          if (fp) { for (var kk in fp) p[kk] = fp[kk]; p.o.plum = i % 4; p.o.night = night; p.o.wet = wet; } else p.vis = false;
        }
      } else if (at != null && t - at < 700 && wet >= 0.3) {   /* startled in the rain: a hop and a shudder */
        var hq = (t - at) / 700; p.y -= 14 * sp * sin(PI * hq); p.o.shake = (p.o.shake || 0) + sin(PI * hq); p.fly = 0.2; p.o.flap = sin(t * 0.05); p.o.legs = 1;
      }
      /* a pigeon on the coping steps aside when the stryge lands one on his horn */
      if (p.vis) {
        drawPigeon(c, e, i, p.x, p.y, spi, p.flip, p.peck, t + i * 700, p.fly, p.o);
        out.push({ x: p.x, y: p.y - 9 * spi, r: Math.max(28, 14 * spi) });
      }
    }
    /* the fourth pigeon lands on the stryge's horn when the beast offers a perch (or the fallback horn tip) */
    var ph = perch.t1, hp = null;
    if (ph < 8000) {
      var fromX = L.stryge.x - L.stryge.s * 0.25, fromY = L.stryge.y - L.stryge.s * 0.5, lx = perch.x, ly = perch.y - 8.5 * sp * 0.7;
      var s4 = sp * 0.7;
      if (ph < 1200) { var a = ease(ph / 1200); hp = { x: lerp(fromX, lx, a), y: lerp(fromY, ly, a) - sin(PI * a) * 40 * sp * 0.7, fly: a < 0.95 ? 1 : 0, flip: false, o: { flap: sin(t * 0.045) * 0.9, legs: 1 } }; }
      else if (ph < 6700) { var wob = ph < 1450 ? sin((ph - 1200) / 250 * PI * 2) * 1.2 : 0; hp = { x: lx, y: ly + wob, fly: 0, flip: false, o: { shake: ph > 5600 && ph < 6000 ? 0.6 : 0 } }; }
      else { var b = E(6700, 8000, ph); if (b < 1) hp = { x: lx + (L.W + 60 - lx) * ease(b), y: ly - 0.3 * Hh * sin(PI * b * 0.7) - b * 30, fly: 1, flip: false, o: { flap: sin(t * 0.045) * 0.9, legs: 0 } }; }
      /* he is poked: it goes up at once, and does not come back this visit */
      var cs = t - ph, stTap = null; for (var q = taps.length - 1; q >= 0; q--) if (taps[q].who === "stryge" && taps[q].at <= t && taps[q].at >= cs + 1000) { stTap = taps[q]; break; }
      if (stTap && ph >= 1000) { var b2 = E(0, 1800, t - stTap.at); hp = b2 < 1 ? { x: lx + (L.W + 60 - lx) * ease(b2), y: ly - 0.25 * Hh * sin(PI * b2 * 0.7) - b2 * 30, fly: 1, flip: false, o: { flap: sin(t * 0.045) * 0.9, legs: 0 } } : null; }
      if (hp) { hp.o.plum = 3; hp.o.night = night; hp.o.wet = wet; drawPigeon(c, e, 3, hp.x, hp.y, s4 * size[3], hp.flip, 0, t, hp.fly, hp.o); out.push({ x: hp.x, y: hp.y - 9 * s4, r: 24 }); }
    }
    L.pig = out;
  }

  /* a scatter flight: crouch, climb in an arc over the city, away, then glide home, flare and land; each bird its own arc and beat */
  function flight(t1, p, L, i, sp) {
    var W = L.W, Hh = L.H, x0 = p.x, y0 = p.y, xEnd = W + 90 + i * 34, amp = [1, 1.28, 0.82][i % 3], ph = i * 2.3, fr = 14 - i * 0.7;
    if (t1 < 250) return { y: y0 + 1.5 * sp * ease(t1 / 250), fly: 0.5, o: { crouch: ease(t1 / 250), flap: 0.5 + 0.4 * sin(t1 * 0.05 + ph), legs: 1 } };
    if (t1 < 2600) {
      var u = (t1 - 250) / 2350, beat = Math.floor(t1 / 1000 * fr + i), glide = beat % 3 === 2;
      return { x: lerp(x0, xEnd, u) + sin(u * 5 + ph) * 8, y: y0 - 0.22 * amp * Hh * sin(PI * u * 0.8), fly: 1, flip: false, o: { flap: glide ? 0.35 : sin(t1 / 1000 * fr * PI * 2 + ph) * 0.95, rot: -0.35 * (1 - u) + 0.1, legs: u < 0.15 } };
    }
    if (t1 < 6500) return null;
    if (t1 < 9000) {
      var v = (t1 - 6500) / 2500, e2 = ease(v), gl = Math.floor((t1 - 6500) / 1000 * 12 + i) % 3 === 2;
      var xx = lerp(xEnd, x0, e2) + sin(v * 4 + ph) * 6 * (1 - v), yy = y0 - 0.2 * amp * Hh * Math.pow(1 - v, 1.7);
      if (v > 0.84) { var fl = E(0.84, 1, v); return { x: xx, y: yy, fly: 1, flip: true, o: { flap: 0.9 - 0.5 * fl + sin(t1 * 0.05 + ph) * 0.25 * (1 - fl), rot: 0.5 * fl, legs: 1 } }; }
      return { x: xx, y: yy, fly: 1, flip: true, o: { flap: gl ? 0.3 : sin(t1 / 1000 * 12 * PI * 2 + ph) * 0.95, rot: 0.12, legs: v > 0.7 } };
    }
    return null;
  }

  /* ---------------------------------------------------------------- hit */
  H.hit = function (x, y) {
    if (!lay) return "sky";
    var n = lay.notre, s = lay.stryge, i;
    if (lay.pig) for (i = 0; i < lay.pig.length; i++) if (hyp(x - lay.pig[i].x, y - lay.pig[i].y) < lay.pig[i].r) return "pigeon";
    if (x > n.x + n.s * 0.05 && x < n.x + n.s && y > n.y + n.s * 0.26 && y < n.y + n.s * 0.66) return "notre";
    if (x > s.x + s.s * 0.08 && x < s.x + s.s * 0.9 && y > s.y + s.s * 0.04 && y < s.y + s.s * 0.78) return "stryge";
    /* the spire: the page stays "sky" (a rain burst), here the rooster spins and three crows burst */
    var hs = lay.sp.base - lay.sp.top;
    if (abs(x - lay.sp.x) < hs * 0.17 && y > lay.sp.top - 8 && y < lay.sp.base + 8) bell = { at: lastT };
    return "sky";
  };
})();
