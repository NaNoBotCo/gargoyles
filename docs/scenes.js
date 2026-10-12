/* scenes.js — the drawings inside the toys. Each scene: { w, h, draw(c, W, H, st) }.
   The page keeps each toy's state and calls draw every frame; sheet.html calls draw with
   st = { t, arg, opts } so a scene can be reviewed at a step.

   The tap contract, the same in every scene. The page hands a scene:
     st.t          ms on the page clock
     st.poke       ms since the last tap on the scene, -1 when idle
     st.px, st.py  where that tap landed, in canvas pixels (optional)
     st.pokeIdx    which of many targets it hit: a map pin, a terrace head (optional)
   sheet.html passes the same fields as +poke= +px= +py= +pokeIdx= in st.opts.
   Every reaction is visible within 150 ms and settles inside 1.4 s (G.pk).

   Every scene is authored in its own w x h and fitted into whatever box the page gives it,
   so a phone-width canvas draws the same picture smaller. */
(function () {
  "use strict";
  var G = window.GARG, S = G.STONES, SC = G.SCENE = G.SHEET = {};
  var sin = Math.sin, cos = Math.cos, PI = Math.PI, abs = Math.abs, min = Math.min, max = Math.max, hyp = Math.hypot;
  var INK = "#27211b", CREAM = "#f4ecd7", HOT = "#c9391c";
  var FONT = '"Oswald","Barlow Condensed","Arial Narrow",system-ui,sans-serif';
  var pk = G.pk || function (s, len) { len = len || 1400; if (s.poke == null || s.poke < 0 || s.poke > len) return 0; var u = s.poke / len; return sin(PI * min(1, u * 2.2)) * (1 - u * 0.3) * (u < 0.45 ? 1 : 1 - (u - 0.45) / 0.55); };

  /* ---------------------------------------------------------------- the tap contract */
  function opt(st, k) { var v = st[k]; if (v == null && st.opts) v = st.opts[k]; return v; }
  function pokeOf(st) { var p = opt(st, "poke"); return p == null ? -1 : +p; }
  function tapPt(st) { var x = opt(st, "px"), y = opt(st, "py"); return x == null || y == null ? null : [+x, +y]; }
  /* the tap's envelope 0..1 for a given ms-since-tap */
  function env(ms, len) { return pk({ poke: ms }, len || 1400); }
  /* ms since the tap if it landed within r scene units of (x, y), else -1; focal = who answers when no point is known */
  function tapHit(st, F, x, y, r, focal) {
    var p = pokeOf(st); if (p < 0) return -1;
    var q = tapPt(st); if (!q) return focal ? p : -1;
    return hyp(q[0] - F.X(x), q[1] - F.Y(y)) <= r * F.s ? p : -1;
  }
  /* the tap in scene units, or null */
  function tapScene(st, F) { var q = tapPt(st); return q ? [(q[0] - F.ox) / F.s, (q[1] - F.oy) / F.s] : null; }
  G.tapHit = tapHit;

  /* fit a w x h drawing into the box the page gives; returns the mapping and the visible extent in scene units */
  function fit(W, H, DW, DH) {
    var s = min(W / DW, H / DH), ox = (W - DW * s) / 2, oy = (H - DH * s) / 2;
    return { s: s, ox: ox, oy: oy, x0: -ox / s, y0: -oy / s, w: W / s, h: H / s, X: function (x) { return ox + x * s; }, Y: function (y) { return oy + y * s; } };
  }
  function enter(c, F) { c.save(); c.translate(F.ox, F.oy); c.scale(F.s, F.s); }

  /* a static layer drawn once into an offscreen canvas and blitted every frame; key says what it depends on */
  var CACHE = {}, CKEYS = [];
  function layer(c, W, H, key, paint) {
    var dpr = (c.getTransform ? c.getTransform().a : window.devicePixelRatio) || 1, k = key + "|" + W + "x" + H + "@" + dpr, e = CACHE[k];
    if (!e) {
      var cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
      var g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); paint(g);
      e = CACHE[k] = cv; CKEYS.push(k); if (CKEYS.length > 16) delete CACHE[CKEYS.shift()];
    }
    c.drawImage(e, 0, 0, W, H);
  }

  /* ---------------------------------------------------------------- paper, wash, hatch */
  /* a granulating wash: cream, then seeded translucent blotches, then a faint grain */
  function wash(c, x, y, w, h, col, seed, k) {
    var r = G.rng(seed || 1), n = 16 + Math.floor(r() * 9);
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.fillStyle = G.mix(CREAM, col, k == null ? 0.2 : k); c.fillRect(x, y, w, h);
    for (var i = 0; i < n; i++) {
      c.fillStyle = G.rgba(col, 0.05 + r() * 0.12);
      c.beginPath(); c.ellipse(x + r() * w, y + r() * h, w * (0.1 + r() * 0.25), h * (0.08 + r() * 0.2), (r() - 0.5) * 0.7, 0, 7); c.fill();
    }
    c.fillStyle = G.rgba(INK, 0.07);
    for (var g = Math.min(700, Math.round(w * h / 500)); g > 0; g--) c.fillRect(x + r() * w, y + r() * h, 0.9, 0.9);
    c.restore();
  }
  /* sky: a pale wash with a hatch band thickening toward the horizon */
  function sky(c, x, y, w, hy, col, seed) {
    wash(c, x, y, w, hy - y, col, seed, 0.16);
    var r = G.rng((seed || 1) + 40); c.save(); c.lineCap = "round";
    for (var k = 0; k < 11; k++) {
      var yy = hy - 3 - k * k * 0.55 - k * 2.2; c.strokeStyle = G.rgba(INK, 0.13 * (1 - k / 12)); c.lineWidth = 0.6;
      for (var xx = x - 10 + r() * 14; xx < x + w; xx += 12 + r() * 22) { c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + 9 + r() * 14, yy + (r() - 0.5) * 0.8); c.stroke(); }
    }
    c.restore();
  }
  /* ground: a thin wash under ink hatching that closes up toward the viewer */
  function earth(c, x, y, w, h, col, seed, dens) {
    wash(c, x, y, w, h, col, seed, 0.28);
    var r = G.rng((seed || 1) + 17); dens = dens || 1; c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.lineCap = "round";
    for (var yy = y + 2; yy < y + h; yy += 3.4 / dens) {
      var u = (yy - y) / h; c.strokeStyle = G.rgba(INK, 0.1 + 0.2 * u); c.lineWidth = 0.5 + u * 0.5;
      for (var xx = x - 12 + r() * 10; xx < x + w; xx += 9 + r() * 16) { var l = 6 + r() * 16 * (0.4 + u); c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + l, yy - l * 0.3 + (r() - 0.5)); c.stroke(); }
    }
    c.restore();
  }
  /* falling rain as ink hatching inside a box */
  function streaks(c, x, y, w, h, t, n, slope, col, seed, spd) {
    var r = G.rng(seed || 3); c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.strokeStyle = col || "rgba(52,70,96,.5)"; c.lineWidth = 0.9; c.lineCap = "round";
    for (var i = 0; i < n; i++) {
      var sx = r() * (w + h * slope + 40), sp = (spd || 0.6) * (0.75 + r() * 0.5), len = 8 + r() * 10, yy = (r() * h + t * sp) % (h + 24) - 12, xx = x + sx - yy * slope - h * slope * 0.5;
      c.globalAlpha = 0.35 + r() * 0.55; c.beginPath(); c.moveTo(xx, y + yy); c.lineTo(xx - len * slope, y + yy + len); c.stroke();
    }
    c.restore();
  }
  function cloud(c, x, y, w, fill, line) {
    c.save(); c.fillStyle = fill; c.strokeStyle = line || INK; c.lineWidth = 1.1; c.lineJoin = "round";
    c.beginPath(); c.moveTo(x - w * 0.5, y); c.bezierCurveTo(x - w * 0.62, y - w * 0.2, x - w * 0.36, y - w * 0.3, x - w * 0.24, y - w * 0.18); c.bezierCurveTo(x - w * 0.18, y - w * 0.38, x + w * 0.14, y - w * 0.4, x + w * 0.2, y - w * 0.2);
    c.bezierCurveTo(x + w * 0.4, y - w * 0.28, x + w * 0.62, y - w * 0.12, x + w * 0.5, y); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  /* label: condensed caps, ink on a cream pill with a thin ink outline */
  function label(c, x, y, txt, o) {
    o = o || {}; txt = String(txt).toUpperCase(); c.save();
    var sz = o.size || 11; c.font = "700 " + sz + "px " + FONT; if ("letterSpacing" in c) c.letterSpacing = "0.06em";
    c.textBaseline = "middle"; c.textAlign = "left";
    var tw = c.measureText(txt).width, pw = tw + 11, ph = sz + 7, lx = o.align === "center" ? x - pw / 2 : o.align === "right" ? x - pw : x, ty = y - ph / 2, rr = ph / 2;
    c.beginPath(); c.moveTo(lx + rr, ty); c.lineTo(lx + pw - rr, ty); c.arc(lx + pw - rr, ty + rr, rr, -PI / 2, PI / 2); c.lineTo(lx + rr, ty + ph); c.arc(lx + rr, ty + rr, rr, PI / 2, PI * 1.5); c.closePath();
    c.fillStyle = o.fill || CREAM; c.fill(); c.lineWidth = 1; c.strokeStyle = o.line || INK; c.stroke();
    c.fillStyle = o.col || INK; c.fillText(txt, lx + 5.5, y + 0.5); c.restore();
    return pw;
  }
  G.label = label;

  /* a thick short rope of water: leaves (x,y) at (vx,vy) px/ms, falls under g px/ms², stops at y = gy.
     Draws the rope, a bright core, a few drops and the splash line; returns the landing point. */
  function rope(c, x, y, vx, vy, g, gy, w, t, o) {
    o = o || {}; var pts = [], T = 0, px, py;
    for (var i = 0; i < 110; i++) { px = x + vx * T; py = y + vy * T + 0.5 * g * T * T; pts.push([px, py]); if (py >= gy) break; T += o.dt || 10; }
    var end = pts[pts.length - 1], n = pts.length, col = o.col || "#6d9fc4";
    c.save(); c.lineCap = "round"; c.lineJoin = "round";
    for (var pass = 0; pass < 2; pass++) {
      c.strokeStyle = pass ? "rgba(255,255,255,.8)" : G.rgba(col, 0.82);
      for (var k = 1; k < n; k++) {
        var u = k / n; c.lineWidth = pass ? w * 0.26 * (1 - u * 0.6) : w * (1.0 - 0.42 * u) + sin(k * 0.9 - t * 0.02) * w * 0.07;
        c.beginPath(); c.moveTo(pts[k - 1][0] + (pass ? -w * 0.14 : 0), pts[k - 1][1]); c.lineTo(pts[k][0] + (pass ? -w * 0.14 : 0), pts[k][1]); c.stroke();
      }
    }
    var r = G.rng(o.seed || 5); c.fillStyle = G.rgba(col, 0.9);
    for (var d = 0; d < (o.drops == null ? 5 : o.drops); d++) {
      var ph = (t * 0.0013 + r()) % 1, id = Math.min(n - 1, Math.floor(G.lerp(n * 0.45, n - 1, ph))), p = pts[id], s2 = (r() - 0.5) * 2 * (1 + ph * 3);
      c.beginPath(); c.arc(p[0] + s2, p[1] + s2 * 0.3, w * (0.14 + r() * 0.14) * (1 - ph * 0.5), 0, 7); c.fill();
    }
    if (o.splash !== false && end[1] >= gy - 1) {
      c.strokeStyle = "rgba(250,252,255,.9)"; c.lineWidth = Math.max(0.8, w * 0.22);
      for (var s = 0; s < 2; s++) { var p2 = (t * 0.0022 + s / 2) % 1, rr = w * (0.8 + p2 * 3.2); c.globalAlpha = (1 - p2) * 0.9; c.beginPath(); c.ellipse(end[0], gy, rr, rr * 0.28, 0, PI, 0); c.stroke(); }
    }
    c.restore(); return end;
  }
  /* ripple rings on a water line */
  function ripples(c, x, y, t, n, size, col, seed) {
    c.save(); c.strokeStyle = col || "rgba(255,255,255,.8)"; c.lineWidth = 1;
    for (var i = 0; i < n; i++) { var p = ((t * 0.0011 + i / n + (seed || 0) * 0.37) % 1), rr = 2 + p * size; c.globalAlpha = (1 - p) * 0.85; c.beginPath(); c.ellipse(x, y, rr, rr * 0.26, 0, 0, 7); c.stroke(); }
    c.restore();
  }
  /* a tapered tube along a centre line: [x, y] points and a width at each end; returns the carved part's polygon */
  function tube(c, pts, w0, w1, st, o) {
    o = o || {}; var cl = G.sp(pts, false, o.steps || 5), n = cl.length, L = [], R = [];
    for (var i = 0; i < n; i++) {
      var a = cl[max(i - 1, 0)], b = cl[min(i + 1, n - 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = hyp(dx, dy) || 1, u = i / (n - 1);
      var w = (G.lerp(w0, w1, o.ease ? u * u * (3 - 2 * u) : u) + (o.bulge ? o.bulge * sin(PI * u) : 0)) / 2;
      L.push([cl[i][0] - dy / d * w, cl[i][1] + dx / d * w]); R.unshift([cl[i][0] + dy / d * w, cl[i][1] - dx / d * w]);
    }
    var poly = L.concat(R); poly.sp = true; G.part(c, poly, st, o); poly.cl = cl; return poly;
  }
  /* a point on a polyline at fraction u */
  function along(pl, u) { var f = G.clamp(u, 0, 1) * (pl.length - 1), i = Math.floor(f), j = min(pl.length - 1, i + 1), k = f - i; return [G.lerp(pl[i][0], pl[j][0], k), G.lerp(pl[i][1], pl[j][1], k)]; }
  function ang(pl, u) { var a = along(pl, u - 0.02), b = along(pl, u + 0.02); return Math.atan2(b[1] - a[1], b[0] - a[0]); }
  function smooth(a, b, v) { return G.ease((v - a) / (b - a)); }
  function skin(tone) { return { base: tone || "#e0b48e", light: "#fbe0c4", dark: "#96663f", ink: "#2a1a10", pit: null }; }
  /* a palette with the same keys as G.STONES for painted things */
  function pal(base, light, dark, ink, shine) { return { base: base, light: light, dark: dark, ink: ink, pit: null, shine: shine }; }
  var GREEN = pal("#6a8f56", "#b3d594", "#27432a", "#10200f");

  /* ================================================================ the dragon of Rouen
     G.dragon(c, x, y, s, o): top-left x,y of a 200 box drawn s px wide, facing right.
     o: stone (a G.STONES key), t, bow 0..1, flip, headOnly, spit (water flow), blink,
        char 0..1 (tail forward to ash), water (the surface y in the box: legs go, three humps break it),
        poke (ms since a tap), gleam 0..1 (a shine on the head and neck). */
  function lockAt(x, y, a0, len, curl, u) { var a = a0 + curl * u * u; return [x + cos(a0) * len * u * 0.65 + cos(a) * len * u * 0.35, y + sin(a0) * len * u * 0.65 + sin(a) * len * u * 0.35]; }
  function lockRings(c, x, y, a0, len, wid, curl, st, n) {
    for (var i = 0; i < n; i++) {
      var u = 0.22 + 0.56 * (i + 0.5) / n, p = lockAt(x, y, a0, len, curl, u), q = lockAt(x, y, a0, len, curl, u + 0.03), dx = q[0] - p[0], dy = q[1] - p[1], d = hyp(dx, dy) || 1, w = wid * sin(PI * Math.pow(u, 0.7)) * (1 - u * 0.6) * 0.9;
      G.cut(c, [[p[0] - dy / d * w, p[1] + dx / d * w], [p[0] + dx / d * 0.9, p[1] + dy / d * 0.9], [p[0] + dy / d * w, p[1] - dx / d * w]], st, 0.6);
    }
  }
  /* the neck's five centre-line points, upright and bowed; the head hangs from the last */
  var NECK_U = [[112, 106], [117, 88], [126, 70], [138, 58], [150, 54]], NECK_B = [[112, 106], [126, 97], [144, 93], [160, 99], [170, 113]], NECK_S = [[112, 106], [128, 107], [146, 113], [162, 124], [172, 136]];
  function neckPts(bow, pose) { var B = pose === "spout" ? NECK_S : NECK_B; return NECK_U.map(function (p, i) { return [G.lerp(p[0], B[i][0], bow), G.lerp(p[1], B[i][1], bow)]; }); }
  var DGY = 162;                                      /* the ground line in the box, where the feet stand */
  G.dragonGround = DGY;
  G.dragonMouth = function (x, y, s, o) {
    o = o || {}; var bow = G.clamp(o.pose === "spout" ? 1 : o.bow || 0, 0, 1), nk = neckPts(bow, o.pose), e = nk[4], hr = bow * (o.pose === "spout" ? 0.45 : 1.1), k = s / 200;
    var mx = e[0] + 50 * cos(hr) - 10 * sin(hr), my = e[1] + 50 * sin(hr) + 10 * cos(hr);
    return { x: o.flip ? x + (200 - mx) * k : x + mx * k, y: y + my * k, dir: o.flip ? -1 : 1 };
  };
  G.dragon = function (c, x, y, s, o) {
    o = o || {};
    var stone = !!o.stone, st = stone ? S[o.stone] : GREEN, t = o.t || 0, bow = G.clamp(o.pose === "spout" ? 1 : o.bow || 0, 0, 1), char = G.clamp(o.char || 0, 0, 1);
    var pms = o.poke != null && o.poke >= 0 ? o.poke : -1, p = pms >= 0 ? env(pms, 1400) : 0;
    var water = o.water ? (o.water > 2 ? o.water : 124) : 0, lod = s >= 130 ? 2 : s >= 64 ? 1 : 0, headOnly = !!o.headOnly;
    var bl = bow > 0.4 && o.pose !== "spout" ? 1 : G.blink(t, 5); if (o.blink != null) bl = max(bl, o.blink);
    var jaw = bow > 0.3 && o.pose !== "spout" ? 0 : 0.05 + 0.03 * sin(t * 0.0013) + p * 0.2 + (o.spit ? 0.24 : 0) + (o.open || 0) * 0.26;
    var breath = sin(t * PI * 2 / 2400), wl = sin(t * PI * 2 / 4000) * 0.08 - p * 0.14;
    var belly = stone ? G.mix(st.base, st.light, 0.5) : "#e4d7a2", wing = stone ? G.mix(st.base, st.dark, 0.2) : "#527a49";
    /* charring: near-black plates with ember cracks that pulse; the wing and legs go first, the body from the tail forward, the head and neck never */
    var cw = !stone && char > 0.01 ? G.clamp(char * 1.3 - 0.1, 0, 0.94) : 0;
    var embers = function (cc, bb, q, n) {
      var er = G.rng(bb[0] * 7 + bb[1] * 3 + 5);
      for (var e = 0; e < n; e++) {
        var ex = bb[0] + er() * (bb[2] - bb[0]), ey = bb[1] + er() * (bb[3] - bb[1]), a = er() * 6, ph = 0.5 + 0.5 * sin(t * 0.006 + e * 1.7 + bb[0]);
        cc.strokeStyle = "rgba(255," + Math.round(120 + ph * 70) + ",40," + (q * (0.35 + 0.65 * ph)) + ")"; cc.lineWidth = 0.9; cc.beginPath(); cc.moveTo(ex, ey);
        for (var z = 1; z < 4; z++) cc.lineTo(ex + cos(a + z * 0.9) * z * 3.4 + (z % 2 ? 1.4 : -1.4), ey + sin(a + z * 0.9) * z * 3.4); cc.stroke();
      }
    };
    var wpaint = cw > 0 ? function (cc, bb) { cc.fillStyle = "rgba(24,20,18," + cw + ")"; cc.fillRect(bb[0] - 2, bb[1] - 2, bb[2] - bb[0] + 4, bb[3] - bb[1] + 4); embers(cc, bb, cw, 4); } : null;
    var keepG = G.sil; c.save(); c.translate(x, y); c.scale(s / 200, s / 200);
    if (o.flip) { c.scale(-1, 1); c.translate(-200, 0); G.light(true); }
    try {
      /* the spine: tail tip to shoulder, hand-placed, with a wave running down the tail */
      var sp0 = [[18, 148 - bow * 36], [34, 140 - bow * 20], [52, 128 - bow * 8], [70, 114], [86, 104], [104, 102], [122, 108]];
      var spine = G.sp(sp0, false, water ? 2 : 4), n = spine.length, th0 = water ? 1 : 1.5, thk = water ? 16 : 26;
      var TH = [], bot = [], nor = [];
      for (var i = 0; i < n; i++) {
        var u = i / (n - 1), ii = (1 - u) * 6;
        spine[i][1] += (water ? 0 : sin(t * 0.004 - ii * 0.7) * 4 * (ii / 6)) - breath * 0.9 * sin(PI * Math.min(1, u * 1.15));
        TH.push(th0 + thk * (water ? Math.pow(u, 0.55) : G.ease(u / 0.62)) + breath * 1.1 * sin(PI * Math.min(1, u * 1.15)));
      }
      for (i = 0; i < n; i++) {
        var a = spine[max(i - 1, 0)], b = spine[min(i + 1, n - 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = hyp(dx, dy) || 1;
        nor.push([-dy / d, dx / d]); bot.push([spine[i][0] - dy / d * TH[i], spine[i][1] + dx / d * TH[i]]);
      }

      if (!headOnly) {
        /* ---- the wing: arm bone, three fingers, one scalloped membrane, four veins */
        var W0 = [98, 62], fa = [-2.5, -2.02, -1.55], fl = [56, 62, 52], tip = [];
        c.save(); c.translate(112, 100); c.rotate(wl - bow * 1.15); c.scale(1, 1 - bow * 0.35); c.translate(-112, -100);
        for (i = 0; i < 3; i++) { var fa2 = fa[i] + sin(t * 0.0016 + i * 1.1) * 0.025; tip.push([W0[0] + cos(fa2) * fl[i], W0[1] + sin(fa2) * fl[i]]); }
        var mid = function (p1, p2, k) { var mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2, dx = W0[0] - mx, dy = W0[1] - my, dd = hyp(dx, dy) || 1; return [mx + dx / dd * k, my + dy / dd * k]; };
        var m32 = mid(tip[2], tip[1], 10), m21 = mid(tip[1], tip[0], 12), m0b = mid(tip[0], [76, 104], 12);
        G.part(c, [[112, 100, 1], [W0[0], W0[1], 1], [tip[2][0], tip[2][1], 1], m32, [tip[1][0], tip[1][1], 1], m21, [tip[0][0], tip[0][1], 1], m0b, [76, 104, 1]], st, { lw: 1.2, base: wing, lift: 0.7, seed: 21, pits: false, paint: wpaint });
        if (lod > 0) { [m32, m21, m0b].forEach(function (m) { G.cut(c, [[W0[0], W0[1]], [(W0[0] + m[0]) / 2, (W0[1] + m[1]) / 2 + 2], [m[0], m[1] + 3]], st, 0.6); }); G.cut(c, [[W0[0] - 6, W0[1] + 14], [86, 84], [80, 100]], st, 0.6); }
        G.lock(c, 112, 100, Math.atan2(W0[1] - 100, W0[0] - 112), hyp(W0[0] - 112, W0[1] - 100), 3.2, 0.15, st, { lw: 1.1 });
        for (i = 0; i < 3; i++) G.lock(c, W0[0], W0[1], Math.atan2(tip[i][1] - W0[1], tip[i][0] - W0[0]), fl[i], 1.8, 0.1, st, { lw: 0.9 });
        G.lock(c, W0[0], W0[1], -0.7, 12, 2.4, 1.2, st, { lw: 0.9 });                          /* the thumb claw */
        c.restore();

        if (water) {
          /* three humps break the surface: domes of scaled back with spikes, the tail trailing under */
          tube(c, [[0, water + 10], [14, water + 3], [26, water + 2]], 2, 12, st, { lw: 1, seed: 8 });
          [[42, 15, 19], [78, 19, 21], [114, 24, 22]].forEach(function (h, q) {
            for (k = 0; k < 3; k++) G.lock(c, h[0] - 8 + k * 8, water - h[1] * 0.9 + abs(k - 1) * 4, -1.57 - 0.3 + k * 0.3 + sin(t * 0.0035 + k + q) * 0.07, 9 + 3 * q * 0.5, 2, -0.3, st, { lw: 0.9, base: G.mix(st.base, st.dark, 0.4) });
            G.part(c, [[h[0] - h[2], water + 6], [h[0] - h[2] * 0.62, water - h[1] * 0.5], [h[0], water - h[1]], [h[0] + h[2] * 0.62, water - h[1] * 0.5], [h[0] + h[2], water + 6], [h[0] + h[2] * 0.6, water + 16], [h[0] - h[2] * 0.6, water + 16]], st, { lw: 1.5, round: 0.8, seed: 9 + q });
            for (var rr = 0; rr < 3; rr++) for (var cc = 0; cc < 3; cc++) { var qx = h[0] - h[2] * 0.5 + cc * h[2] * 0.5 + (rr % 2) * 3, qy = water - h[1] * (0.72 - rr * 0.22) + abs(cc - 1) * 2; if (qy < water + 1) G.cut(c, [[qx - 3, qy - 2], [qx, qy + 1], [qx + 3, qy - 2]], st, 0.55); }
          });
        } else {
        /* ---- nine dorsal spikes, each with its own phase */
        var nsp = lod === 2 ? 9 : lod === 1 ? 6 : 4;
        for (var k = 0; k < nsp; k++) {
          var ui = 0.3 + 0.66 * k / (nsp - 1), ix = Math.round(ui * (n - 1)), P = spine[ix], N = nor[ix], up = Math.atan2(-N[1], -N[0]);
          G.lock(c, P[0] + N[0] * 2.5, P[1] + N[1] * 2.5, up - 0.35 + sin(t * 0.0035 + k * 1.3) * 0.07, 10 + 4 * Math.abs(sin(k * 1.9)), 2.1, -0.4, st, { lw: 0.9, base: G.mix(st.base, cw ? "#1a1614" : st.dark, cw ? 0.4 + cw * 0.5 : 0.4) });
        }
        /* contact shadows */
        if (!water) { c.fillStyle = "rgba(30,24,16,.28)"; c.beginPath(); c.ellipse(112, DGY, 18, 3.2, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(68, DGY, 20, 3.2, 0, 0, 7); c.fill(); }

        /* ---- the body: one part along the spine, the belly 20 below it */
        var chest = water ? [[130, 116], [128, 128]] : [[133, 114], [138, 127]], poly = [];
        for (i = 0; i < n; i++) poly.push(spine[i]);
        poly.push(chest[0], chest[1]);
        for (i = n - 1; i >= 0; i--) poly.push(bot[i]);
        poly.sp = true;
        G.part(c, poly, st, { lw: 1.6, round: 0.7, seed: 7, pits: stone, paint: char > 0.01 ? function (cc, bb) {
          var xf = G.lerp(14, 128, char), gr = cc.createLinearGradient(14, 0, xf + 10, 0);
          gr.addColorStop(0, "rgba(24,20,18,.97)"); gr.addColorStop(0.82, "rgba(24,20,18,.9)"); gr.addColorStop(1, "rgba(24,20,18,0)");
          cc.fillStyle = gr; cc.fillRect(bb[0] - 2, bb[1] - 2, bb[2] - bb[0] + 4, bb[3] - bb[1] + 4);
          embers(cc, [bb[0], bb[1], xf, bb[3]], 1, 10);
          /* the char line: a seam of glowing orange where the burn stops, at the base of the neck */
          var lg = cc.createLinearGradient(xf - 3, 0, xf + 7, 0); lg.addColorStop(0, "rgba(255,120,30,0)"); lg.addColorStop(0.45, "rgba(255,150,50," + (0.55 + 0.25 * sin(t * 0.008)) + ")"); lg.addColorStop(1, "rgba(255,120,30,0)"); cc.fillStyle = lg; cc.fillRect(xf - 3, bb[1], 10, bb[3] - bb[1]);
        } : null });
        /* cream belly plate with seven cross cuts */
        if (!water) {
          var b0 = Math.round(0.3 * (n - 1)), pa = [], pb = [];
          for (i = b0; i < n; i++) { pa.push([bot[i][0] - nor[i][0] * 1.2, bot[i][1] - nor[i][1] * 1.2]); pb.unshift([bot[i][0] - nor[i][0] * 8.5, bot[i][1] - nor[i][1] * 8.5]); }
          var strip = pa.concat(pb); strip.sp = true;
          G.part(c, strip, st, { lw: 0.8, base: belly, lift: 0.5, pits: false, hatch: false, paint: char > 0.01 ? function (cc, bb) { cc.fillStyle = "rgba(34,29,26," + 0.8 * G.clamp(char * 1.6 - (bb[0] - 14) / 120, 0, 0.8) + ")"; cc.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]); } : null });
          for (k = 0; k < 7; k++) { var j = Math.round(G.lerp(b0 + 2, n - 3, k / 6)); G.cut(c, [[bot[j][0] - nor[j][0] * 1.4, bot[j][1] - nor[j][1] * 1.4], [bot[j][0] - nor[j][0] * 4.5 + 0.8, bot[j][1] - nor[j][1] * 4.5], [bot[j][0] - nor[j][0] * 8, bot[j][1] - nor[j][1] * 8]], st, 0.55); }
        }
        /* scale chevrons on the lit side, fewer and smaller toward the tail */
        if (lod > 0) for (var r = 0; r < (lod === 2 ? 3 : 1); r++) for (k = 0; k < 6; k++) {
          var cu = 0.93 - k * 0.085 - r * 0.035, cx = Math.round(cu * (n - 1)); if (cu < 0.4 || (r === 2 && cu < 0.7) || ((k + r) % 3 === 2 && cu < 0.62)) continue;
          var cP = spine[cx], cN = nor[cx], cT = [cN[1], -cN[0]], f = [0.24, 0.5, 0.74][r] * TH[cx], z = 1.4 + 1.7 * cu, qx = cP[0] + cN[0] * f, qy = cP[1] + cN[1] * f;
          G.cut(c, [[qx + cT[0] * z - cN[0] * z * 1.7, qy + cT[1] * z - cN[1] * z * 1.7], [qx - cT[0] * z, qy - cT[1] * z], [qx + cT[0] * z + cN[0] * z * 1.7, qy + cT[1] * z + cN[1] * z * 1.7]], st, 0.55);
        }
        /* embers in the cracks of the burnt part, pulsing */
        if (char > 0.05) for (k = 0; k < 9; k++) {
          var eu = (k + 0.5) / 9 * Math.min(0.95, char * 1.05); if (eu > char) continue;
          var ex = Math.round(eu * (n - 1)), eP = spine[ex], eN = nor[ex], ef = 0.2 + 0.6 * ((k * 37) % 10) / 10, qx2 = eP[0] + eN[0] * TH[ex] * ef, qy2 = eP[1] + eN[1] * TH[ex] * ef, ph = 0.5 + 0.5 * sin(t * 0.006 + k * 1.7);
          c.save(); c.globalAlpha = 0.35 + 0.65 * ph; G.cut(c, [[qx2 - 4, qy2 - 1], [qx2 - 1, qy2 + 1.5], [qx2 + 3, qy2 - 0.5], [qx2 + 5, qy2 + 1]], st, 1.5, { col: "#ff8a2a" }); c.restore();
        }
        }
        /* water: the humps break the surface, rings widen round each, the rest lies under it */
        if (water) {
          var wg = c.createLinearGradient(-90, 0, 290, 0), wc = o.waterCol || "#6aa0b8"; wg.addColorStop(0, G.rgba(wc, 0)); wg.addColorStop(0.2, G.rgba(wc, 0.58)); wg.addColorStop(0.8, G.rgba(wc, 0.58)); wg.addColorStop(1, G.rgba(wc, 0));
          c.fillStyle = wg; c.fillRect(-90, water, 380, 150);
          c.strokeStyle = G.rgba(INK, 0.55); c.lineWidth = 1; c.beginPath(); for (var wx = -30; wx <= 230; wx += 6) { var wy = water + sin(wx * 0.18 + t * 0.003) * 0.9; if (wx === -30) c.moveTo(wx, wy); else c.lineTo(wx, wy); } c.stroke();
          [42, 78, 114].forEach(function (hx, q) { ripples(c, hx, water + 1.5, t + q * 400, 3, 24, "rgba(255,255,255,.85)", q); });
        }
        /* ---- legs: a planted foreleg, a folded haunch with its hock, a toe and a claw to each */
        if (!water && lod > 0) {
          var sh = { base: G.mix(st.base, st.dark, 0.12), light: st.light, dark: st.dark, ink: st.ink, pit: null }, gy = DGY;
          G.part(c, [[48, 128], [60, 116], [77, 119], [88, 133], [85, 148], [70, 154], [55, 148], [47, 138]], st, { lw: 1.4, round: 0.7, seed: 31, paint: wpaint });      /* haunch */
          G.cut(c, [[54, 131], [65, 124], [79, 128]], st, 0.7);
          tube(c, [[82, 144], [72, 151], [62, 153]], 13, 8, st, { lw: 1.2, seed: 32, paint: wpaint });                                                                    /* shank to the hock */
          tube(c, [[62, 153], [65, 157], [68, gy - 3]], 8, 7, st, { lw: 1, seed: 33, paint: wpaint });                                                                    /* metatarsal */
          G.part(c, [[54, gy - 3], [72, gy - 5], [84, gy], [54, gy + 1]], st, { lw: 0.8, pits: false, paint: wpaint });
          tube(c, [[112, 118], [101, 132], [106, gy - 14]], 19, 11, st, { lw: 1.3, seed: 34, paint: wpaint });                                                            /* upper arm and forearm */
          G.part(c, [[98, gy - 16], [114, gy - 17], [120, gy - 4], [100, gy - 3]], sh, { lw: 0.9, pits: false, paint: wpaint });                                          /* wrist */
          G.cut(c, [[100, 136], [108, 134]], st, 0.6); G.cut(c, [[104, 126], [112, 122]], st, 0.6);
          for (k = 0; k < 3; k++) {
            var fx = 96 + k * 9, fy = gy - 8;
            G.part(c, [[fx, fy - 3], [fx + 6, fy - 2], [fx + 8, fy + 7], [fx - 1, fy + 8]], sh, { lw: 0.7, pits: false, paint: wpaint });
            if (lod === 2) G.lock(c, fx + 5, fy + 7, 0.5 + k * 0.25, 6, 1.5, 0.8, st, { lw: 0.6, base: st.light });
          }
          for (k = 0; k < 3; k++) {
            G.part(c, [[54 + k * 9, gy - 6], [60 + k * 9, gy - 5], [62 + k * 9, gy + 1], [53 + k * 9, gy + 1]], sh, { lw: 0.7, pits: false, paint: wpaint });
            if (lod === 2) G.lock(c, 59 + k * 9, gy, 0.4 + k * 0.2, 6, 1.5, 0.8, st, { lw: 0.6, base: st.light });
          }
        }
      }

      /* ---- neck and head: bows when tamed, snaps and snorts when tapped */
      var jetEnd = null;
      var nkp = neckPts(bow, o.pose), hr = bow * (o.pose === "spout" ? 0.45 : 1.1) - p * 0.15 + sin(t * 0.0009) * 0.02;
      var neckHead = function (shim) {
        var nk = tube(c, nkp, stone ? 31 : 23, stone ? 21 : 14, st, { lw: 1.5, round: 0.6, seed: 61, hatchAng: 1.2 });
        if (shim) { c.save(); c.translate(nkp[4][0] - 150, nkp[4][1] - 54); G.rot(c, 150, 54, hr, function () { G.part(c, [[132, 40], [142, 38], [156, 38], [166, 44], [180, 50], [200, 56], [201, 63], [170, 67], [140, 66], [132, 58]], st, {}); }); c.restore(); return nk; }
        /* six gular bands across the throat, a facet or two on stone */
        var cl = nk.cl;
        for (var g = 0; g < 6; g++) {
          var gu = 0.12 + g * 0.13, gp = along(cl, gu), ga = ang(cl, gu), gw = G.lerp(stone ? 35 : 27, stone ? 22 : 15, gu) / 2, gx = -sin(ga), gy = cos(ga);
          G.cut(c, [[gp[0] + gx * gw * 0.1, gp[1] + gy * gw * 0.1], [gp[0] + gx * gw * 0.55 + cos(ga) * 1.2, gp[1] + gy * gw * 0.55 + sin(ga) * 1.2], [gp[0] + gx * gw * 0.95, gp[1] + gy * gw * 0.95]], st, 0.6);
        }
        if (stone) {                                                   /* chisel facets along the neck, on the lit side */
          [0.22, 0.4, 0.58, 0.76].forEach(function (fu, fi) {
            var fp = along(cl, fu), fa = ang(cl, fu), fw = G.lerp(stone ? 31 : 23, stone ? 21 : 14, fu) / 2, nx = sin(fa), ny = -cos(fa), tx = cos(fa), ty = sin(fa);
            G.cut(c, [[fp[0] + nx * fw * 0.1, fp[1] + ny * fw * 0.1], [fp[0] + nx * fw * 0.45 + tx * 3, fp[1] + ny * fw * 0.45 + ty * 3], [fp[0] + nx * fw * 0.85 + tx * 1, fp[1] + ny * fw * 0.85 + ty * 1]], st, 0.75, fi % 2 ? {} : { glint: 1 });
          });
          for (var sc2 = 0; sc2 < 8; sc2++) {                            /* a ridge of scale facets down the lit top of the neck */
            var su = 0.08 + sc2 * 0.115, sp2 = along(cl, su), sa2 = ang(cl, su), sw2 = G.lerp(31, 21, su) / 2, nx2 = sin(sa2), ny2 = -cos(sa2);
            G.cut(c, [[sp2[0] + nx2 * sw2 * 0.95 - cos(sa2) * 4, sp2[1] + ny2 * sw2 * 0.95 - sin(sa2) * 4], [sp2[0] + nx2 * sw2 * 0.6 + cos(sa2) * 2, sp2[1] + ny2 * sw2 * 0.6 + sin(sa2) * 2], [sp2[0] + nx2 * sw2 * 0.25 - cos(sa2) * 3, sp2[1] + ny2 * sw2 * 0.25 - sin(sa2) * 3]], st, 0.8, { glint: 1 });
          }
          var tp = along(cl, 0.5), ta = ang(cl, 0.5); G.cut(c, [[tp[0] - cos(ta) * 12 + sin(ta) * 3, tp[1] - sin(ta) * 12 - cos(ta) * 3], [tp[0] + sin(ta) * 4, tp[1] - cos(ta) * 4], [tp[0] + cos(ta) * 14 + sin(ta) * 3, tp[1] + sin(ta) * 14 - cos(ta) * 3]], st, 0.8, { glint: 1 });
        }
        c.save(); c.translate(nkp[4][0] - 150, nkp[4][1] - 54);
        G.rot(c, 150, 54, hr, function () {
          /* frill fins behind the skull */
          G.part(c, [[138, 50], [124, 36, 1], [128, 46], [114, 42, 1], [124, 53], [112, 56, 1], [128, 60], [140, 60]], st, { lw: 0.9, seed: 62, pits: false });
          G.cut(c, [[137, 52], [126, 39]], st, 0.5); G.cut(c, [[137, 55], [118, 44]], st, 0.5); G.cut(c, [[137, 58], [116, 56]], st, 0.5);
          /* two swept horns, ringed */
          G.lock(c, 140, 42, -2.62, 30, 3.6, 0.7, st, { lw: 1 }); lockRings(c, 140, 42, -2.62, 30, 3.6, 0.7, st, 4);
          G.lock(c, 148, 40, -2.3, 24, 3, 0.8, st, { lw: 0.9 }); lockRings(c, 148, 40, -2.3, 24, 3, 0.8, st, 3);
          /* mouth: the dark inside first, then the hinged lower jaw, then the skull and upper teeth over it */
          G.hollow(c, [[152, 67], [198, 65], [196, 72], [170, 78], [152, 74]], st, { deep: 1 });
          G.rot(c, 150, 68, jaw, function () {
            G.part(c, [[148, 66], [170, 68], [190, 68], [199, 67], [197, 73], [184, 77], [164, 79], [150, 77], [141, 72]], st, { lw: 1.3, seed: 63, round: 0.5 });
            if (jaw > 0.12 && !stone) G.part(c, [[160, 70], [178, 70], [186, 71], [172, 74], [162, 74]], st, { base: "#c46a5c", lw: 0.5, pits: false, hatch: false });   /* tongue */
            G.teeth(c, [[188, 68], [170, 68.5], [154, 68.5]], 6, 2.7, -1, st, { col: stone ? st.light : "#fbf5dc", fangs: [0] });
            G.cut(c, [[146, 74], [160, 77], [178, 76]], st, 0.6);
          });
          G.part(c, [[132, 48], [142, 40], [156, 38], [166, 44], [180, 50], [192, 52], [200, 56], [201, 63, 1], [188, 66], [170, 67], [152, 68], [140, 66], [132, 58]], st, { lw: 1.6, round: 0.8, seed: 64 });
          G.teeth(c, [[190, 66], [172, 67], [154, 68]], 7, 3.1, 1, st, { col: stone ? st.light : "#fbf5dc", fangs: [1, 5] });
          G.cut(c, [[140, 60], [150, 64], [150, 68]], st, 0.7);
          G.cut(c, [[152, 40], [162, 37], [174, 42]], st, 1.4, { glint: 1 });                              /* the brow hood */
          if (stone) {                                                                                  /* a heavy brow, a boss on the nostril, a chin boss, chisel facets on the lit side */
            G.part(c, [[148, 42], [162, 35], [178, 39], [191, 48], [176, 47], [162, 44]], st, { lw: 1.3, pits: false, lift: 1.3, steps: 3 });
            G.part(c, [[186, 50], [194, 48], [199, 54], [193, 59], [185, 56]], st, { lw: 0.9, pits: false, round: 1, steps: 3 });
            G.part(c, [[166, 71], [180, 70], [187, 75], [178, 82], [167, 78]], st, { lw: 0.9, pits: false, round: 0.8, steps: 3 });
            G.cut(c, [[146, 46], [166, 57], [190, 61]], st, 0.9, { glint: 1 }); G.cut(c, [[154, 62], [172, 66]], st, 0.7, { glint: 1 }); G.cut(c, [[196, 54], [190, 56]], st, 0.5);
          }
          G.cut(c, [[158, 57], [168, 60], [180, 60], [192, 62]], st, 0.6);                                 /* the lip */
          G.hollow(c, [[189, 52.5], [194, 51.5], [195, 55.5], [190, 56]], st, { lw: 0.6 });                /* the nostril */
          G.eye(c, 163, 49, 3.6, st, { blink: bl, look: [0.8, 0.1], white: stone ? st.light : "#f4de78", whiteDark: stone ? st.base : "#c8942a", pupil: stone ? st.ink : "#111", squint: 0.3, lid: st.base });
          if (bl < 0.5 && !stone) { c.fillStyle = "#101010"; c.beginPath(); c.ellipse(164.2, 49.4, 0.8, 2.7 - bl * 2, 0, 0, 7); c.fill(); }
          if (stone) { G.cut(c, [[172, 46], [180, 50], [186, 54]], st, 0.7); G.cut(c, [[158, 44], [152, 52]], st, 0.6); G.cut(c, [[176, 58], [184, 58]], st, 0.6); }
          if (o.gleam) { c.save(); c.globalAlpha = o.gleam * (0.6 + 0.4 * sin(t * 0.005)); G.cut(c, [[154, 42], [166, 41], [178, 46]], st, 1.2, { col: "#ffffff" }); G.cut(c, [[122, 78], [128, 68], [134, 62]], st, 1.4, { col: "#ffffff" }); c.restore(); }
          /* a nostril wisp rising, and a ring when poked */
          if (!stone) {
            c.save(); for (var w = 0; w < 4; w++) { var ph = (t * 0.0004 + w / 4) % 1; c.fillStyle = "rgba(90,86,80," + (0.3 * (1 - ph)) + ")"; c.beginPath(); c.arc(193 + sin(ph * 6 + w) * 3 + ph * 5, 51 - ph * 15, 1.4 + ph * 3.4, 0, 7); c.fill(); }
            if (pms >= 0 && pms < 900) { var ru = pms / 900; c.strokeStyle = "rgba(90,86,80," + (1 - ru) * 0.8 + ")"; c.lineWidth = 1.4 * (1 - ru) + 0.4; c.beginPath(); c.ellipse(198 + ru * 18, 50 - ru * 6, 2 + ru * 6, 3 + ru * 8, 0, 0, 7); c.stroke(); }
            c.restore();
          }
        });
        c.restore();
        return nk;
      };
      c.save();
      if (char > 0.2 && !stone) {                                       /* heat shimmer: two faint offset copies that wobble */
        var keepS = G.sil; G.sil = "#9fd68a"; c.save(); c.globalAlpha = 0.16 * char;
        for (var q = 0; q < 2; q++) { c.save(); c.translate(sin(t * 0.009 + q * 2.4) * 2.2, -1 - q * 1.6 + sin(t * 0.007 + q) * 1.4); neckHead(true); c.restore(); }
        c.restore(); G.sil = keepS;
      }
      neckHead(false);
      c.restore();
      if (o.spit) {
        var mp = G.dragonMouth(0, 0, 200, { bow: bow, pose: o.pose }); c.save(); c.translate(0, 0);
        rope(c, mp.x, mp.y + 1, 0.2, 0.01, 0.0006, 190, 6 * Math.sqrt(Math.min(1.5, o.spit)), t, { seed: 4, drops: 6 }); c.restore();
      }
    } finally { c.restore(); G.light(false); G.sil = keepG; }
  };

  /* ================================================================ the Puerta de Ramos: carved motifs
     Each motif draws in a 100-unit box centred on (0, 0), "up" being outward from the arch.
     Sizes are set by the caller's scale, so every line width here is in those units. */
  var V = S.villa, MO = { pits: false, hatchGap: 9, lw: 3.4, steps: 4 };
  function mp(c, pts, o) { var q = {}, k; for (k in MO) q[k] = MO[k]; if (o) for (k in o) q[k] = o[k]; return G.part(c, pts, V, q); }
  function mc(c, pts, w, o) { return G.cut(c, pts, V, w || 2.4, o); }
  function ml(c, x, y, a, len, wid, curl) { return G.lock(c, x, y, a, len, wid, curl, V, { lw: 2.6, hatch: false, pits: false }); }
  function mdot(c, x, y, r, col) { G.dot(c, x, y, r, col || V.ink); }
  var MOT = {
    /* a bearded face in a roundel: hair like flames, brows, both eyes, a moustache, a forked beard */
    face: function (c, o) {
      var bl = o.blink || 0;
      mp(c, [[0, -48], [34, -34], [48, 0], [34, 34], [0, 48], [-34, 34], [-48, 0], [-34, -34]], { lw: 3.6, lift: 1.2 });
      mc(c, [[-38, -22], [-42, 0], [-38, 22]], 2.2, { glint: 1 });
      for (var i = 0; i < (o.few ? 5 : 8); i++) { var a = -PI / 2 + (i - (o.few ? 2 : 3.5)) * (o.few ? 0.6 : 0.4); ml(c, cos(a) * 20, -2 + sin(a) * 22, a, 22, 5.5, i % 2 ? 0.9 : -0.9); }
      mp(c, [[-18, -22], [0, -30], [18, -22], [22, 2], [14, 24], [0, 30], [-14, 24], [-22, 2]], { lw: 3.2, round: 0.8 });
      mc(c, [[-16, -12], [-9, -17], [-3, -12]], 2.4); mc(c, [[3, -12], [9, -17], [16, -12]], 2.4);
      G.eye(c, -9, -7, 5.4, V, { blink: bl, look: [0.3, 0.1] }); G.eye(c, 9, -7, 5.4, V, { blink: bl, look: [0.3, 0.1], tilt: PI });
      mc(c, [[0, -8], [-2, 4], [3, 8]], 2.2);
      ml(c, -2, 10, PI * 0.95, 14, 3.6, 0.9); ml(c, 2, 10, PI * 0.05, 14, 3.6, -0.9);
      mp(c, [[-16, 12], [0, 16], [16, 12], [14, 30], [4, 44], [0, 38], [-4, 44], [-14, 30]], { lw: 3 });
      mc(c, [[-9, 22], [-6, 34]], 1.8); mc(c, [[9, 22], [6, 34]], 1.8); mc(c, [[-5, 18], [5, 18]], 1.6);
    },
    /* a putto lifting a swag of fruit; the swag swings */
    putto: function (c, o) {
      var sw = o.swing || 0;
      ml(c, -12, -30, PI * 0.85, 22, 6, 1); ml(c, 12, -30, PI * 0.15, 22, 6, -1);
      mp(c, [[-24, 8], [-14, -6], [0, -10], [14, -6], [24, 8], [14, 22], [-14, 22]].map(function (p) { return [p[0], p[1] + 14]; }), { lw: 3.4, round: 0.8 });
      mp(c, [[-14, -22], [0, -26], [14, -22], [16, -8], [8, 0], [-8, 0], [-16, -8]].map(function (p) { return [p[0], p[1] - 4]; }), { lw: 3, round: 0.8 });
      mdot(c, -5, -28, 1.6); mdot(c, 5, -28, 1.6); mc(c, [[-4, -20], [0, -18], [4, -20]], 1.8); mc(c, [[-1, -26], [0, -23]], 1.4);
      for (var i = 0; i < 3; i++) ml(c, -9 + i * 9, -34, -PI / 2 + (i - 1) * 0.5, 12, 4, (i - 1) * 1.2);
      mp(c, [[-22, 4], [-38, -14 + sw * 6], [-42, -22 + sw * 6], [-34, -22 + sw * 6], [-20, -4]], { lw: 2.6, round: 0.6 }); mp(c, [[22, 4], [38, -14 - sw * 6], [42, -22 - sw * 6], [34, -22 - sw * 6], [20, -4]], { lw: 2.6, round: 0.6 });
      var g = [[-40, -22 + sw * 6], [-26, 6 + sw * 4], [0, 16 + sw * 5], [26, 6 - sw * 4], [40, -22 - sw * 6]];
      mc(c, g, 7); mc(c, g, 3, { col: V.light });
      for (i = 0; i < 5; i++) { var q = G.sp(g, false, 6), pq = q[3 + i * 6]; if (pq) { mdot(c, pq[0], pq[1] + 4, 3, V.dark); mdot(c, pq[0] - 0.8, pq[1] + 3, 1.1, V.light); } }
      mp(c, [[-8, 30], [-12, 46], [-2, 48], [0, 32]], { lw: 2.6 }); mp(c, [[8, 30], [12, 46], [2, 48], [0, 32]], { lw: 2.6 });
    },
    /* a lion couchant, looking out, blinking */
    lion: function (c, o) {
      var bl = o.blink || 0;
      ml(c, -38, 14, PI * 1.05, 26, 4, -1.6);
      mp(c, [[-42, 24], [-40, 2], [-22, -8], [4, -8], [22, -2], [26, 10], [22, 24], [-10, 28]], { lw: 3.4, round: 0.6 });
      mc(c, [[-30, 6], [-18, 12], [-14, 22]], 2); mc(c, [[-18, 0], [-6, 8], [-2, 20]], 2);
      for (var i = 0; i < 7; i++) ml(c, 28, -8, -PI / 2 - 0.6 + i * 0.5 - (i > 3 ? 0 : 0), 20, 5, i % 2 ? 1.1 : -1.1);
      mp(c, [[18, -16], [32, -24], [46, -18], [50, -4], [44, 8], [28, 10], [18, 0]], { lw: 3.2, round: 0.8 });
      G.eye(c, 38, -10, 4.4, V, { blink: bl, look: [0.7, 0.2] }); mc(c, [[30, -16], [38, -19], [46, -14]], 2.2, { glint: 1 });
      mc(c, [[46, -4], [49, 2], [45, 5]], 2); mdot(c, 47, -2, 1.5); mc(c, [[30, 4], [40, 6], [47, 4]], 1.8);
      mp(c, [[14, 20], [14, 26], [46, 28], [48, 22], [40, 18], [26, 20]], { lw: 2.8 }); mc(c, [[34, 20], [34, 27]], 1.4); mc(c, [[40, 20], [41, 27]], 1.4);
      mp(c, [[-38, 26], [-30, 22], [-22, 26], [-24, 30], [-38, 30]], { lw: 2.4 });
    },
    /* a pelican in its piety: the long bill drops to the breast */
    pelican: function (c, o) {
      var pk2 = o.peck || 0, hx = 6 + pk2 * 6, hy = -42 + pk2 * 16;
      mc(c, [[-6, 22], [-8, 40]], 2.6); mc(c, [[8, 22], [10, 40]], 2.6); mc(c, [[-10, 40], [-2, 41]], 2); mc(c, [[6, 41], [14, 40]], 2);
      ml(c, -34, 16, PI * 1.02, 22, 4, 0.7);
      mp(c, [[-36, 8], [-30, -12], [-6, -22], [16, -12], [22, 10], [6, 28], [-22, 26]], { lw: 3.4, round: 0.8 });
      mp(c, [[-30, 2], [-26, -10], [-10, -14], [-4, -2], [-14, 14], [-28, 14]], { lw: 2.4, lift: 1.2 }); mc(c, [[-24, -4], [-14, 0]], 1.6); mc(c, [[-24, 4], [-12, 8]], 1.6); mc(c, [[-22, 10], [-10, 14]], 1.6);
      mp(c, [[8, -12], [18, -28], [hx + 4, hy + 12], [hx - 6, hy + 8], [4, -22]], { lw: 3, round: 0.6 });
      mp(c, [[hx - 6, hy + 4], [hx + 2, hy - 4], [hx + 10, hy], [hx + 8, hy + 8], [hx - 2, hy + 10]], { lw: 2.8, round: 0.8 });
      mp(c, [[hx + 6, hy + 2], [hx + 24, hy + 12 + pk2 * 8], [hx + 20, hy + 22 + pk2 * 10], [hx + 6, hy + 10]], { lw: 2.4 });
      mdot(c, hx + 3, hy + 2, 1.5); mc(c, [[hx + 8, hy + 8], [hx + 22, hy + 18 + pk2 * 8]], 1.4);
      mdot(c, 2, 8, 1.8, V.dark);
    },
    /* a griffin: eagle's head and wing, lion's body */
    griffin: function (c, o) {
      ml(c, -38, 14, PI * 1.05, 26, 4, 1.4);
      mp(c, [[-30, -14], [-40, -38], [-24, -50], [-4, -42], [8, -18]], { lw: 2.8 }); for (var i = 0; i < 4; i++) mc(c, [[-6, -16], [-12 - i * 6, -34 - i * 2], [-18 - i * 5, -44]], 1.6);
      mp(c, [[-42, 24], [-38, 2], [-18, -10], [8, -8], [24, 4], [20, 24], [-10, 28]], { lw: 3.4, round: 0.7 });
      mc(c, [[-28, 6], [-16, 12], [-12, 22]], 2); mp(c, [[-34, 26], [-26, 22], [-18, 28], [-34, 32]], { lw: 2.4 });
      mp(c, [[14, -8], [22, -22], [26, -28], [34, -26], [34, -16], [28, 0], [20, 8]], { lw: 3, round: 0.6 });
      mp(c, [[24, -34], [34, -42], [46, -36], [54, -26, 1], [42, -24], [34, -18], [26, -22]], { lw: 3, round: 0.7 });
      mp(c, [[44, -30], [56, -26, 1], [52, -14], [46, -18]], { lw: 2.4 });
      G.eye(c, 38, -32, 3.6, V, { look: [0.5, 0.2] }); mc(c, [[32, -39], [38, -41], [44, -37]], 1.8, { glint: 1 }); ml(c, 28, -40, -2.2, 14, 3.6, -0.8);
      mp(c, [[14, 18], [28, 14], [36, 20], [36, 30], [18, 30]], { lw: 2.6 }); mc(c, [[28, 20], [30, 29]], 1.4);
    },
    /* a sea-monster: a dolphin curving through the vine, a scaled back, a flukes */
    dolphin: function (c, o) {
      tube(c, [[-40, 22], [-22, 4], [0, 14], [22, 0], [38, -20]], 8, 22, V, { lw: 3.4, pits: false, hatchGap: 9, steps: 4, ease: 1, bulge: 8 });
      mp(c, [[34, -22], [48, -30], [58, -26, 1], [46, -18], [40, -10]], { lw: 2.6 }); mc(c, [[40, -26], [54, -26]], 1.4);
      mdot(c, 40, -24, 1.6);
      ml(c, -4, 4, -1.9, 22, 5, -0.9); ml(c, -40, 22, 2.8, 22, 5, 1.2); ml(c, -42, 20, 1.5, 22, 5, -1.2);
      mp(c, [[8, 10], [14, 24], [20, 28], [20, 16]], { lw: 2.2, round: 0.5 });
      for (var i = 0; i < 6; i++) mc(c, [[-30 + i * 11, 10 - i * 2.4], [-26 + i * 11, 16 - i * 2.4], [-22 + i * 11, 10 - i * 2.4]], 1.2);
    },
    /* a scallop shell, the badge of Santiago */
    shell: function (c, o) {
      mp(c, [[0, 40, 1], [-26, 24], [-42, 0], [-40, -16], [-30, -26], [-22, -22], [-14, -36], [-4, -34], [0, -42], [4, -34], [14, -36], [22, -22], [30, -26], [40, -16], [42, 0], [26, 24]], { lw: 3.4, steps: 3, lift: 1.2 });
      for (var i = -3; i <= 3; i++) mc(c, [[i * 1.4, 34], [i * 9, 4], [i * 11, -26]], 1.7);
      mp(c, [[-9, 36], [-8, 46], [8, 46], [9, 36]], { lw: 2.6 });
      mc(c, [[-34, -14], [-18, -26]], 1.4, { glint: 1 });
    },
    /* a bunch of grapes on a leafy stalk */
    grape: function (c, o) {
      ml(c, 0, -30, -PI / 2, 22, 3, 0.7); G.leaf(c, 0, -26, -PI * 0.78, 34, 12, 3, V, { lw: 2 }); G.leaf(c, 0, -26, -PI * 0.22, 32, 12, 3, V, { lw: 2 });
      var P = [[0, 34], [-9, 24], [9, 24], [-18, 12], [0, 14], [18, 12], [-22, 0], [-8, 2], [8, 2], [22, 0], [-14, -12], [0, -10], [14, -12], [-6, -22], [6, -22]];
      P.forEach(function (p, i) { var r = 9 + (i % 3) * 0.6; c.fillStyle = V.base; c.beginPath(); c.arc(p[0], p[1] - 4, r, 0, 7); c.fill(); c.strokeStyle = V.ink; c.lineWidth = 2.2; c.stroke(); c.fillStyle = G.rgba(V.light, 0.9); c.beginPath(); c.arc(p[0] - 3, p[1] - 8, r * 0.34, 0, 7); c.fill(); c.fillStyle = G.rgba(V.dark, 0.35); c.beginPath(); c.arc(p[0] + 3, p[1], r * 0.5, 0, 7); c.fill(); });
    },
    /* a kneeling saint with a halo and joined hands */
    saint: function (c, o) {
      mp(c, [[-26, 40, 1], [-28, 12], [-18, -14], [-4, -22], [12, -18], [22, -2], [30, 22], [28, 40, 1]], { lw: 3.4, round: 0.6 });
      mc(c, [[-14, -2], [-12, 22], [-16, 38]], 2); mc(c, [[2, 0], [6, 22], [4, 38]], 2); mc(c, [[16, 6], [20, 24], [22, 38]], 2);
      mp(c, [[14, 26], [38, 24], [44, 34], [40, 42], [16, 42]], { lw: 2.8, round: 0.5 });
      mp(c, [[-14, -30], [-8, -42], [4, -44], [12, -36], [12, -24], [0, -18], [-12, -22]], { lw: 2.8, round: 0.8 });
      mp(c, [[-16, -24], [-14, -40], [-4, -48], [8, -46], [16, -34], [14, -22], [4, -26], [-6, -26]], { lw: 2.6, round: 0.7, lift: 0.6 });
      c.strokeStyle = V.ink; c.lineWidth = 2.2; c.beginPath(); c.ellipse(-2, -34, 20, 20, 0, 0, 7); c.stroke(); c.strokeStyle = G.rgba(V.light, 0.9); c.lineWidth = 1.2; c.beginPath(); c.ellipse(-3.2, -35.2, 20, 20, 0, PI * 1.1, PI * 1.6); c.stroke();
      mdot(c, 0, -34, 1.2); mc(c, [[-4, -28], [2, -27]], 1.4);
      mp(c, [[8, -6], [18, -14], [24, -8], [14, 2]], { lw: 2.4 }); mc(c, [[12, -8], [20, -11]], 1.2);
    },
    /* an acanthus rosette: seven leaves round a boss; sway turns the leaves a little */
    rosette: function (c, o) {
      var sw = o.sway || 0;
      for (var i = 0; i < 8; i++) { var a = i / 8 * PI * 2 + sw * (i % 2 ? 1 : -1) * 0.12; G.leaf(c, cos(a) * 8, sin(a) * 8, a, 42, 12, 3, V, { lw: 2.2 }); }
      mp(c, [[0, -12], [12, -8], [14, 4], [4, 12], [-10, 8], [-12, -4]], { lw: 3, round: 1 }); mc(c, [[-6, -4], [0, -7], [6, -3]], 1.6); mdot(c, 0, 0, 3.2, V.dark);
    }
  };
  /* a small vine curl for the rests between carvings, in four authored leaf shapes so no two neighbours repeat */
  function vineCurl(c, st, v) {
    v = (v || 0) % 4;
    if (v === 0) { ml(c, 0, 8, -PI / 2, 40, 5, 1.8); G.leaf(c, 0, 0, -0.6, 40, 11, 3, V, { lw: 2 }); }                                              /* a trefoil leaf on a curling stem */
    else if (v === 1) { ml(c, 0, 10, -PI / 2, 34, 4, -1.4); G.leaf(c, 0, -4, -2.2, 46, 8, 5, V, { lw: 2 }); G.leaf(c, 2, 6, -0.4, 34, 7, 5, V, { lw: 2 }); }      /* narrow acanthus, many lobes */
    else if (v === 2) { ml(c, 0, 10, -PI / 2, 30, 4.4, 2.2); G.leaf(c, 0, -6, -1.1, 30, 17, 5, V, { lw: 2 }); mdot(c, 6, -26, 3, V.dark); }               /* a broad round vine leaf with a berry */
    else { for (var i = -1; i <= 1; i++) G.leaf(c, 0, 8, -PI / 2 + i * 0.7, 36 - abs(i) * 6, 9, 3, V, { lw: 2 }); mdot(c, 0, 10, 3.4, V.dark); }           /* a palmette fan */
  }

  /* ================================================================ find the astronaut: the Puerta de Ramos */
  var HUNT = [];   /* filled on draw: [{id, x, y, r}] in canvas pixels */
  var HCX = 360, HY0 = 312, HGROUND = 500, HRING = [260, 230, 200, 170];
  var HTAB = [
    [[188, "face", 1.0, 0.05], [201, "rosette", 0.95, 0], [215, "shell", 1.08, -0.08], [229, "lion", 1.0, 0.1], [243, "grape", 0.9, -0.12], [256, "putto", 1.06, 0], [271, "pelican", 1.0, 0.04],
     [285, "face", 0.92, -0.05], [298, "griffin", 1.1, 0.1], [312, "saint", 0.95, -0.1], [326, "dolphin", 1.05, 0], [340, "rosette", 1.1, 0.15], [353, "shell", 0.9, -0.1]],
    [[186, "grape", 1.0, 0.1], [205, "astro"], [222, "saint", 1.0, -0.05], [236, "dolphin", 0.92, 0], [251, "face", 1.08, 0.05], [264, "shell", 0.95, 0.1], [279, "griffin", 1.0, -0.08],
     [293, "putto", 0.9, 0.05], [308, "pelican", 1.1, 0], [322, "lion", 1.0, 0.12], [337, "rosette", 0.9, 0], [352, "face", 1.0, -0.1]],
    [[190, "lion", 0.95, 0], [205, "shell", 1.1, 0.08], [220, "face", 0.9, 0], [236, "pelican", 1.0, -0.1], [250, "grape", 1.1, 0.05], [265, "rosette", 0.9, 0], [281, "saint", 1.05, 0.1],
     [296, "dolphin", 0.95, -0.06], [311, "putto", 1.0, 0.1], [327, "griffin", 0.92, -0.1], [344, "face", 1.05, 0.06]],
    [[192, "putto", 1.0, -0.1], [210, "rosette", 1.05, 0], [229, "dolphin", 0.9, 0.1], [247, "saint", 1.0, 0], [266, "lion", 1.1, -0.05], [284, "shell", 0.9, 0.1], [303, "face", 1.0, 0.05],
     [318, "grape", 0.95, -0.1], [330, "ice"], [348, "rosette", 0.88, 0.1]]
  ];
  /* the carvings that move at rest: [ring, index, what] */
  var HLIVE = { "0.6": "peck", "0.7": "blink", "1.7": "swing", "2.0": "blink", "2.2": "blink", "3.1": "sway", "1.9": "blink" };
  function hpos(ring, deg) { var a = deg * PI / 180, R = HRING[ring] - 15; return [HCX + R * cos(a), HY0 + R * sin(a), a]; }
  /* an astronaut among acanthus: helmet, visor, backpack, a hose curling into the vine; he stays upright */
  function astro(c, x, y, t, o) {
    o = o || {}; var wave = o.wave || 0, alive = o.alive ? 1 : 0, bob = alive ? sin(t * 0.0022) * 1.6 - wave * 3 : 0;
    G.leaf(c, x - 14, y + 10, PI * 0.92, 24, 8, 3, V, { lw: 1 }); G.leaf(c, x + 14, y + 10, PI * 0.08, 24, 8, 3, V, { lw: 1 }); G.leaf(c, x - 4, y - 10, -PI * 0.7, 22, 7, 3, V, { lw: 1 }); G.leaf(c, x + 6, y - 12, -PI * 0.3, 22, 7, 3, V, { lw: 1 });
    c.save(); c.translate(0, bob);
    G.cut(c, [[x - 11, y + 0], [x - 21, y + 6], [x - 24, y + 17], [x - 17, y + 22], [x - 11, y + 18]], V, 2.1, { col: V.dark });
    G.part(c, [[x - 13, y - 8], [x - 7, y - 10], [x - 6, y + 9], [x - 13, y + 10]], V, { lw: 1.1, steps: 2, seed: 241 });
    G.part(c, [[x - 4, y + 7], [x + 1, y + 7], [x + 3, y + 16], [x + 7, y + 20], [x + 7, y + 23], [x - 1, y + 22], [x - 2, y + 15]], V, { lw: 1, steps: 2, seed: 242, pits: false });
    G.part(c, [[x - 8, y + 7], [x - 4, y + 7], [x - 8, y + 16], [x - 11, y + 21], [x - 14, y + 21], [x - 13, y + 15]], V, { lw: 1, steps: 2, seed: 243, pits: false });
    G.part(c, [[x - 9, y - 8], [x + 9, y - 8], [x + 10, y + 9], [x - 10, y + 9]], V, { lw: 1.3, steps: 3, round: 0.8, seed: 244 });
    G.part(c, [[x - 4, y - 2, 1], [x + 4, y - 2, 1], [x + 4, y + 3, 1], [x - 4, y + 3, 1]], V, { lw: 0.7, steps: 1, pits: false }); G.dot(c, x - 1.6, y + 0.4, 0.7, V.dark); G.dot(c, x + 1.6, y + 0.4, 0.7, V.dark);
    G.part(c, [[x - 8, y - 7], [x - 14, y - 2], [x - 12, y + 5], [x - 8, y + 2]], V, { lw: 0.9, steps: 2, pits: false });                     /* the far arm holds the vine */
    c.save(); c.translate(x + 8, y - 5); c.rotate(-0.5 - (alive ? sin(t * 0.0045) * 0.35 : 0) - wave * 1.2);
    G.part(c, [[0, -1.5], [11, -2.4], [15, 0], [11, 3], [0, 3]], V, { lw: 1, steps: 3, pits: false }); G.part(c, [[12, -3], [17, -4], [19, 0], [15, 3], [12, 2]], V, { lw: 0.8, steps: 3, pits: false }); G.cut(c, [[16, -4], [18, -7]], V, 0.5); G.cut(c, [[18, -2], [21, -4]], V, 0.5);
    c.restore();
    G.part(c, [[x - 10, y - 16], [x - 8, y - 22], [x, y - 25], [x + 8, y - 22], [x + 10, y - 16], [x + 8, y - 9], [x, y - 7], [x - 8, y - 9]], V, { lw: 1.4, steps: 4, round: 1, seed: 245 });
    G.hollow(c, [[x - 5.4, y - 18], [x - 2, y - 22], [x + 5, y - 20], [x + 6, y - 14], [x + 1, y - 11], [x - 5, y - 13]], V, { deep: 0.7, lw: 0.6 }); G.cut(c, [[x - 3, y - 19], [x + 1, y - 21]], V, 0.9, { col: V.light });
    c.restore();
    if (alive) for (var i = 0; i < 4; i++) { var ph = (t * 0.0012 + i / 4) % 1; c.fillStyle = "rgba(255,246,220," + 0.7 * (1 - ph) + ")"; c.beginPath(); c.arc(x - 10 - ph * 8, y + 10 + bob + ph * 10, 2 + ph * 3, 0, 7); c.fill(); }
  }
  /* the ice-cream dragon: a small stone dragon with a cone in its claws, a scoop that shrinks as it licks */
  function iceDragon(c, x, y, t, o) {
    o = o || {}; var lick = o.lick || 0, alive = o.alive ? 1 : 0, sc = 1 - 0.4 * lick, i;
    /* a shallow carved roundel with a lit rim on the upper left and a dark one on the lower right, not a dark halo */
    G.hollow(c, [[x - 31, y - 2], [x - 22, y - 23], [x, y - 29], [x + 24, y - 23], [x + 32, y - 2], [x + 22, y + 21], [x, y + 27], [x - 22, y + 21]], V, { deep: 0.2, lw: 0.6 });
    c.lineCap = "round"; c.strokeStyle = "rgba(255,244,208,.85)"; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y - 1, 29.5, PI * 0.9, PI * 1.62); c.stroke(); c.strokeStyle = "rgba(50,30,10,.55)"; c.beginPath(); c.arc(x, y - 1, 29.5, -PI * 0.08, PI * 0.62); c.stroke();
    G.dragon(c, x - 44, y - 52, 86, { stone: "villa", t: t, bow: lick * 0.45, blink: 0 });
    var cx = x + 24, cy = y + 16, wf = pal("#dcb877", "#fbe6b0", "#8a6828", "#3a2810");
    /* a waffle cone: a triangle with a grid cut into it, held in the dragon's claw */
    G.part(c, [[cx - 7, cy - 7, 1], [cx + 7, cy - 7, 1], [cx, cy + 13, 1]], wf, { lw: 1, steps: 1, pits: false });
    for (i = 0; i < 3; i++) { G.cut(c, [[cx - 5 + i * 4, cy - 6], [cx - 1.4 + i * 1.4, cy + 10]], V, 0.45, { col: wf.dark }); G.cut(c, [[cx + 5 - i * 4, cy - 6], [cx + 1.4 - i * 1.4, cy + 10]], V, 0.45, { col: wf.dark }); }
    G.cut(c, [[cx - 5, cy - 1], [cx + 5, cy - 1]], V, 0.4, { col: wf.dark });
    /* the scoop: two lobes and a curl on top, shrinking as it is licked */
    var sp = pal("#f4ecd0", "#fffaf0", "#b8a070", "#4a3c24");
    G.part(c, [[cx - 8 * sc, cy - 7], [cx - 9 * sc, cy - 12 * sc - 4], [cx - 4, cy - 17 * sc - 5], [cx + 4, cy - 17 * sc - 5], [cx + 9 * sc, cy - 12 * sc - 4], [cx + 8 * sc, cy - 7]], sp, { lw: 1, steps: 4, round: 1, pits: false });
    G.cut(c, [[cx - 7 * sc, cy - 9 * sc - 4], [cx, cy - 12 * sc - 4], [cx + 7 * sc, cy - 9 * sc - 4]], V, 0.5, { col: sp.dark });
    G.lock(c, cx, cy - 16 * sc - 4, -PI / 2 + 0.2, 7 * sc, 2.4 * sc, 1.4, sp, { lw: 0.6, hatch: false, pits: false });
    c.fillStyle = "#efe2c0"; c.beginPath(); c.ellipse(cx + 5 * sc, cy - 7 + (alive ? (t * 0.0007) % 1 * 4 : 1.6), 1, 2.2, 0, 0, 7); c.fill();
    /* the claw: a palm round the cone's rim and three curled toes */
    G.part(c, [[cx - 12, cy - 3], [cx - 7, cy - 8], [cx - 3, cy - 5], [cx - 5, cy + 2], [cx - 11, cy + 3]], V, { lw: 0.8, steps: 3, pits: false });
    for (i = 0; i < 3; i++) G.lock(c, cx - 4, cy - 6 + i * 3.4, -0.1 + i * 0.3, 8, 1.8, 0.9, V, { lw: 0.5, hatch: false, pits: false });
  }
  var HLK = {};   /* per-frame reaction envelopes for the live carvings */

  SC.hunt = { w: 720, h: 520,
    draw: function (c, W, H, st) {
      var t = st.t, found = st.found || (st.opts && st.opts.found ? { astro: 1, ice: 1 } : {}), F = fit(W, H, 720, 520), pms = pokeOf(st), tq = tapPt(st), V2 = V, ro = 0;
      var tapD = tq ? [(tq[0] - F.ox) / F.s, (tq[1] - F.oy) / F.s] : null;
      var key = "hunt-" + (found.astro ? 1 : 0) + (found.ice ? 1 : 0);
      var apos = hpos(1, 205), dpos = hpos(3, 330);
      layer(c, W, H, key, function (g) {
        enter(g, F);
        /* the wall: golden Salamanca sandstone, coursed */
        wash(g, F.x0, F.y0, F.w, F.h, "#d9b062", 201, 0.55);
        G.ashlar(g, F.x0, F.y0, F.w, F.h, V, { course: 26, seed: 31 });
        g.fillStyle = "rgba(255,240,200,.08)"; g.fillRect(F.x0, F.y0, F.w, F.h);
        /* the tympanum: a dark recess with the entry into Jerusalem in low relief, palms either side */
        g.save(); g.beginPath(); g.moveTo(HCX - 140, HY0); g.arc(HCX, HY0, 140, PI, 0); g.lineTo(HCX + 140, HY0); g.closePath(); g.clip();
        var rg = g.createRadialGradient(HCX, HY0 - 60, 10, HCX, HY0 - 40, 150); rg.addColorStop(0, "#8a6a34"); rg.addColorStop(1, "#3a2810"); g.fillStyle = rg; g.fillRect(HCX - 150, HY0 - 150, 300, 160);
        var rs = G.rng(206); g.fillStyle = "rgba(255,230,170,.1)"; for (var q = 0; q < 160; q++) g.fillRect(HCX - 140 + rs() * 280, HY0 - 140 + rs() * 140, 1, 1);
        [[-96, 1], [100, -1]].forEach(function (P, pi) { var px = HCX + P[0]; G.cut(g, [[px, HY0 - 4], [px + P[1] * 4, HY0 - 50], [px + P[1] * 2, HY0 - 100]], V, 5, { col: V.base }); for (var f = 0; f < 8; f++) ml2(g, px + P[1] * 2, HY0 - 100, -PI / 2 + (f - 3.5) * 0.45 + P[1] * 0.1, 40 - Math.abs(f - 3.5) * 3, 4.4, (f - 3.5) * 0.4); });
        /* the donkey: body, neck, a long head and ears, four legs, a tail; the rider with a halo */
        var dx = HCX + 6, dy = HY0 - 32;
        G.part(g, [[dx - 46, dy - 2], [dx - 44, dy - 16], [dx - 28, dy - 26], [dx + 8, dy - 28], [dx + 32, dy - 22], [dx + 40, dy - 10], [dx + 34, dy + 8], [dx + 8, dy + 12], [dx - 26, dy + 12]], V, { lw: 1.3, round: 0.7, seed: 207, pits: false });
        G.part(g, [[dx + 26, dy - 22], [dx + 38, dy - 40], [dx + 50, dy - 50], [dx + 60, dy - 44], [dx + 52, dy - 32], [dx + 42, dy - 12]], V, { lw: 1.2, round: 0.5, seed: 208, pits: false });
        G.part(g, [[dx + 48, dy - 52], [dx + 62, dy - 60], [dx + 72, dy - 52], [dx + 78, dy - 40], [dx + 68, dy - 36], [dx + 56, dy - 42]], V, { lw: 1.2, round: 0.7, seed: 209, pits: false });
        G.lock(g, dx + 56, dy - 56, -1.95, 16, 3.2, -0.5, V, { lw: 0.8 }); G.lock(g, dx + 62, dy - 58, -1.45, 16, 3.2, 0.5, V, { lw: 0.8 }); G.dot(g, dx + 64, dy - 50, 1.2, V.ink); G.cut(g, [[dx + 70, dy - 42], [dx + 77, dy - 40]], V, 0.6);
        [[-32, 0.1], [-22, -0.05], [22, 0.05], [32, -0.1]].forEach(function (L, li) { G.part(g, [[dx + L[0] - 5, dy + 6], [dx + L[0] + 4, dy + 6], [dx + L[0] + 3 + L[1] * 10, dy + 36], [dx + L[0] - 3 + L[1] * 10, dy + 36]], V, { lw: 1, steps: 2, seed: 210 + li, pits: false }); G.part(g, [[dx + L[0] - 4 + L[1] * 10, dy + 36, 1], [dx + L[0] + 4 + L[1] * 10, dy + 36, 1], [dx + L[0] + 5 + L[1] * 10, dy + 41, 1], [dx + L[0] - 5 + L[1] * 10, dy + 41, 1]], V, { lw: 0.8, steps: 1, pits: false }); });
        G.lock(g, dx - 46, dy - 8, PI * 1.05, 26, 3.4, 1.2, V, { lw: 0.9 });
        G.part(g, [[dx - 8, dy - 26], [dx + 16, dy - 26], [dx + 20, dy - 2], [dx - 14, dy - 2]], V, { lw: 1.1, round: 0.5, seed: 214, pits: false }); G.cut(g, [[dx - 2, dy - 22], [dx, dy - 4]], V, 0.6); G.cut(g, [[dx + 8, dy - 22], [dx + 11, dy - 4]], V, 0.6);
        G.part(g, [[dx - 4, dy - 28], [dx + 2, dy - 56], [dx + 12, dy - 58], [dx + 14, dy - 36]], V, { lw: 1.1, round: 0.6, seed: 215, pits: false });
        G.part(g, [[dx - 2, dy - 66], [dx + 2, dy - 74], [dx + 11, dy - 74], [dx + 14, dy - 66], [dx + 10, dy - 58], [dx + 2, dy - 58]], V, { lw: 1.1, round: 0.8, seed: 216, pits: false });
        g.strokeStyle = G.rgba(V.ink, 0.8); g.lineWidth = 1.1; g.beginPath(); g.ellipse(dx + 6, dy - 68, 13, 13, 0, 0, 7); g.stroke();
        G.part(g, [[dx + 12, dy - 50], [dx + 28, dy - 62], [dx + 30, dy - 58], [dx + 14, dy - 44]], V, { lw: 0.9, round: 0.5, pits: false });
        G.dot(g, dx + 7, dy - 69, 0.8, V.ink);
        g.restore();
        /* ---- the four archivolts: moulded bands that run down the jambs, a thick vine scroll on each, carvings seated in the vine */
        HRING.forEach(function (Ro, ri) {
          var Ri = Ro - 30, Rm = Ro - 15, poly = [], a, k;
          poly.push([HCX - Ro, HGROUND]); for (k = 0; k <= 30; k++) { a = PI + k / 30 * PI; poly.push([HCX + Ro * cos(a), HY0 + Ro * sin(a)]); } poly.push([HCX + Ro, HGROUND], [HCX + Ri, HGROUND]);
          for (k = 30; k >= 0; k--) { a = PI + k / 30 * PI; poly.push([HCX + Ri * cos(a), HY0 + Ri * sin(a)]); } poly.push([HCX - Ri, HGROUND]); poly.sp = true;
          G.part(g, poly, V, { lw: 2.2, seed: 220 + ri, lift: 0.7 + ri * 0.12, pits: true });
          /* edges of the moulding */
          var arc = function (R, off) { var p = []; for (var j = 0; j <= 36; j++) { var aa = PI + j / 36 * PI; p.push([HCX + R * cos(aa), HY0 + R * sin(aa)]); } return p; };
          G.cut(g, arc(Ro - 2.5), V, 1.1); G.cut(g, arc(Ri + 2.5), V, 1.1, { glint: 1 });
          [[-1], [1]].forEach(function (d) { G.cut(g, [[HCX + d[0] * (Ro - 2.5), HY0], [HCX + d[0] * (Ro - 2.5), HGROUND - 10]], V, 1); G.cut(g, [[HCX + d[0] * (Ri + 2.5), HY0], [HCX + d[0] * (Ri + 2.5), HGROUND - 10]], V, 1, { glint: 1 }); });
          /* the continuous vine, swinging a little in and out, thick at one end of each swing, tapering */
          var vine = []; for (k = 0; k <= 44; k++) { a = PI + 0.02 + k / 44 * (PI - 0.04); vine.push([HCX + (Rm + 4.5 * sin(k * 0.95 + ri * 1.7)) * cos(a), HY0 + (Rm + 4.5 * sin(k * 0.95 + ri * 1.7)) * sin(a)]); }
          G.cut(g, vine, V, 4.6, { col: V.dark }); G.cut(g, vine, V, 1.9, { col: V.light });
          /* the carvings, and between them bare rests with a leaf curl */
          var T = HTAB[ri];
          T.forEach(function (e, ei) {
            var P = hpos(ri, e[0]), key2 = ri + "." + ei, mot = e[1];
            if (mot === "astro") { if (!found.astro) astro(g, apos[0], apos[1], 4200, {}); return; }
            if (mot === "ice") { if (!found.ice) iceDragon(g, dpos[0], dpos[1], 4200, {}); return; }
            if (HLIVE[key2]) return;
            g.save(); g.translate(P[0], P[1]); g.rotate(P[2] + PI / 2 + e[3]); g.scale(e[2] * 0.27, e[2] * 0.27);
            if (mot !== "grape" && mot !== "saint") { G.castShadow(g, function (o) { MOT[mot](o, {}); }, -3.4, -4, 0.5, "#fff4d0"); G.castShadow(g, function (o) { MOT[mot](o, {}); }, 3.8, 5, 0.5, "#3a2410"); }   /* a pale lit edge up-left, a dark undercut crescent down-right */
            MOT[mot](g, {}); g.restore();
          });
          for (var e2 = 0; e2 < T.length - 1; e2++) { if (T[e2][1] === "astro" || T[e2 + 1][1] === "astro" || T[e2][1] === "ice" || T[e2 + 1][1] === "ice") continue; var ma = (T[e2][0] + T[e2 + 1][0]) / 2, PP = hpos(ri, ma); g.save(); g.translate(PP[0], PP[1]); g.rotate(PP[2] + PI / 2 + (e2 % 2 ? 0.5 : -0.5)); g.scale(0.2, 0.2); vineCurl(g, V, e2 + ri); g.restore(); }
        });
        /* rain has run down the archivolt face for centuries: long faint stains from the crown of each ring, darker at the lip of the carvings */
        var sr3 = G.rng(270); g.fillStyle = "rgba(70,48,22,.13)";
        for (var sk = 0; sk < 26; sk++) { var sring = Math.floor(sr3() * 4), sdeg = 188 + sr3() * 164, sp3 = hpos(sring, sdeg), sl3 = 30 + sr3() * 90, sw3 = 1.4 + sr3() * 2.6; g.beginPath(); g.moveTo(sp3[0] - sw3, sp3[1]); g.quadraticCurveTo(sp3[0] - sw3 * 0.4 + (sr3() - 0.5) * 4, sp3[1] + sl3 * 0.6, sp3[0] + (sr3() - 0.5) * 3, sp3[1] + sl3); g.quadraticCurveTo(sp3[0] + sw3 * 0.4, sp3[1] + sl3 * 0.5, sp3[0] + sw3, sp3[1]); g.fill(); }
        /* the jambs: candelabra pilasters, each a stack of vases, masks and leaf scrolls, differently ordered each side */
        var cand = function (px, order) {
          var y = HY0 + 12;
          G.part(g, [[px - 24, y + 2, 1], [px - 26, y - 6, 1], [px + 26, y - 6, 1], [px + 24, y + 2, 1]], V, { lw: 1.2, steps: 1, pits: false });
          order.forEach(function (it, i) {
            var yy = y + 10 + i * 30; if (yy > HGROUND - 38) return;
            if (it === "vase") { G.part(g, [[px - 6, yy + 1, 1], [px - 14, yy + 7], [px - 16, yy + 16], [px - 9, yy + 26], [px - 4, yy + 27, 1], [px + 4, yy + 27, 1], [px + 9, yy + 26], [px + 16, yy + 16], [px + 14, yy + 7], [px + 6, yy + 1, 1]], V, { lw: 1.2, steps: 4, seed: 230 + i, round: 0.6, pits: false }); G.cut(g, [[px - 11, yy + 13], [px, yy + 15], [px + 11, yy + 13]], V, 0.7); G.lock(g, px - 15, yy + 12, PI * 0.9, 9, 2, 1, V, { lw: 0.6 }); G.lock(g, px + 15, yy + 12, PI * 0.1, 9, 2, -1, V, { lw: 0.6 }); }
            else if (it === "mask") { G.part(g, [[px - 11, yy + 3], [px, yy], [px + 11, yy + 3], [px + 10, yy + 18], [px, yy + 25], [px - 10, yy + 18]], V, { lw: 1.2, steps: 4, round: 0.8, seed: 235 + i, pits: false }); G.eye(g, px - 4.6, yy + 10, 2.6, V, {}); G.eye(g, px + 4.6, yy + 10, 2.6, V, { tilt: PI }); G.cut(g, [[px - 3, yy + 17], [px, yy + 19], [px + 3, yy + 17]], V, 0.6); G.cut(g, [[px - 8, yy + 6], [px - 2, yy + 5]], V, 0.6); G.cut(g, [[px + 8, yy + 6], [px + 2, yy + 5]], V, 0.6); G.lock(g, px - 9, yy + 4, PI * 1.1, 10, 2.4, 1, V, { lw: 0.6 }); G.lock(g, px + 9, yy + 4, -PI * 0.1, 10, 2.4, -1, V, { lw: 0.6 }); }
            else if (it === "scroll") { G.lock(g, px, yy + 22, -PI * 0.8, 24, 4, 1.8, V, { lw: 0.9 }); G.lock(g, px, yy + 22, -PI * 0.2, 24, 4, -1.8, V, { lw: 0.9 }); G.cut(g, [[px, yy + 26], [px, yy + 2]], V, 1.6); G.leaf(g, px, yy + 8, -PI / 2, 14, 5, 3, V, {}); }
            else { G.part(g, [[px - 4, yy + 1, 1], [px + 4, yy + 1, 1], [px + 3, yy + 9], [px + 8, yy + 15], [px + 3, yy + 22], [px + 4, yy + 27, 1], [px - 4, yy + 27, 1], [px - 3, yy + 22], [px - 8, yy + 15], [px - 3, yy + 9]], V, { lw: 1.1, steps: 3, seed: 240 + i, pits: false }); G.cut(g, [[px - 5, yy + 15], [px + 5, yy + 15]], V, 0.6); }
          });
        };
        cand(HCX - 170, ["vase", "mask", "scroll", "baluster", "mask", "vase"]); cand(HCX + 170, ["baluster", "scroll", "vase", "mask", "scroll", "vase"]);
        /* capitals at the springing line and plinths at the foot of the outer jambs */
        [-1, 1].forEach(function (d) { [[200, 260]].forEach(function (R) { G.part(g, [[HCX + d * R[0], HY0 - 4, 1], [HCX + d * R[1] + d * 4, HY0 - 4, 1], [HCX + d * R[1] + d * 4, HY0 + 10, 1], [HCX + d * R[0], HY0 + 10, 1]], V, { lw: 1.2, steps: 1, pits: false }); G.part(g, [[HCX + d * R[0], HGROUND - 14, 1], [HCX + d * R[1] + d * 4, HGROUND - 14, 1], [HCX + d * R[1] + d * 4, HGROUND + 2, 1], [HCX + d * R[0], HGROUND + 2, 1]], V, { lw: 1.2, steps: 1, pits: false }); }); });
        /* the impost, the two dark door leaves with their studs, the step */
        G.part(g, [[HCX - 142, HY0 - 5, 1], [HCX + 142, HY0 - 5, 1], [HCX + 142, HY0 + 6, 1], [HCX - 142, HY0 + 6, 1]], V, { lw: 1.4, steps: 1, seed: 250 }); G.cut(g, [[HCX - 138, HY0 - 1.5], [HCX + 138, HY0 - 1.5]], V, 0.7, { glint: 1 });
        var wood = pal("#3d2a1a", "#6e4e34", "#1b1008", "#0a0604");
        [[-1], [1]].forEach(function (d, li) {
          var x1 = HCX + (d[0] < 0 ? -140 : 2), x2 = HCX + (d[0] < 0 ? -2 : 140);
          G.part(g, [[x1, HY0 + 6, 1], [x2, HY0 + 6, 1], [x2, HGROUND, 1], [x1, HGROUND, 1]], wood, { lw: 1.6, steps: 1, seed: 255 + li, pits: false });
          for (var r = 0; r < 4; r++) for (var cc = 0; cc < 2; cc++) { var px2 = x1 + 8 + cc * 62, py2 = HY0 + 16 + r * 44; G.hollow(g, [[px2, py2], [px2 + 58, py2], [px2 + 58, py2 + 38], [px2, py2 + 38]], wood, { deep: 0.4, lw: 0.8 }); G.cut(g, [[px2 + 2, py2 + 2], [px2 + 56, py2 + 2]], wood, 0.6, { glint: 1 }); }
          var rr = G.rng(260 + li); for (r = 0; r < 5; r++) for (cc = 0; cc < 7; cc++) { var sx = x1 + 6 + cc * 20 + (r % 2) * 5 + (rr() - 0.5) * 1.4, sy = HY0 + 22 + r * 38 + (rr() - 0.5) * 1.4, sr = 2 + rr() * 0.6; g.fillStyle = "#3a3a42"; g.beginPath(); g.arc(sx, sy, sr, 0, 7); g.fill(); g.fillStyle = "rgba(220,224,232,.85)"; g.beginPath(); g.arc(sx - 0.7, sy - 0.8, sr * 0.45, 0, 7); g.fill(); }
        });
        G.cut(g, [[HCX, HY0 + 6], [HCX, HGROUND]], wood, 1.6, { col: "#0a0604" });
        G.part(g, [[HCX - 270, HGROUND, 1], [HCX + 270, HGROUND, 1], [HCX + 276, F.y0 + F.h + 10, 1], [HCX - 276, F.y0 + F.h + 10, 1]], V, { lw: 1.6, steps: 1, seed: 265, lift: 0.9 });
        G.cut(g, [[HCX - 268, HGROUND + 3], [HCX + 268, HGROUND + 3]], V, 0.8, { glint: 1 });
        g.restore();
      });
      enter(c, F);
      /* the carvings that move at rest, each in its own phase; a tap beside one makes it flap or blink */
      var pokeNear = -1, pn = null;
      if (tapD && pms >= 0) { var bd = 80; HTAB.forEach(function (T, ri) { T.forEach(function (e, ei) { if (!HLIVE[ri + "." + ei]) return; var P = hpos(ri, e[0]), d = hyp(P[0] - tapD[0], P[1] - tapD[1]); if (d < bd) { bd = d; pn = ri + "." + ei; } }); }); }
      HTAB.forEach(function (T, ri) {
        T.forEach(function (e, ei) {
          var key2 = ri + "." + ei, what = HLIVE[key2]; if (!what || e[1] === "astro" || e[1] === "ice") return;
          var P = hpos(ri, e[0]), ph = key2.length * 977 + ri * 313 + ei * 191, re = pn === key2 ? env(pms, 900) : 0, o = {};
          if (what === "blink") o.blink = max(G.blink(t, ph * 0.001), re * 0.95);
          if (what === "peck") o.peck = max(0, sin((t % 3200) / 3200 * PI * 2 * 2 - 1.2)) * (((t % 3200) < 1400) ? 1 : 0) * 0.9 + re * abs(sin(pms * 0.02));
          if (what === "swing") o.swing = sin(t * 0.0023) * 0.8 + re * sin(pms * 0.025);
          if (what === "sway") o.sway = sin(t * 0.0019) + re * sin(pms * 0.03) * 2;
          if (e[1] === "face") o.few = true;
          c.save(); c.translate(P[0], P[1]); c.rotate(P[2] + PI / 2 + e[3]); c.scale(e[2] * 0.27, e[2] * 0.27); MOT[e[1]](c, o); c.restore();
        });
      });
      /* the finds: still while hidden (they are in the static layer); alive once found, answering a tap */
      HUNT = [];
      var hitR = max(22, 22 * F.s);
      var ta = pms >= 0 && (tapD ? hyp(tapD[0] - apos[0], tapD[1] - apos[1]) < 34 : false), td = pms >= 0 && (tapD ? hyp(tapD[0] - dpos[0], tapD[1] - dpos[1]) < 34 : false);
      if (pms >= 0 && !tapD && found.astro && !found.ice) ta = true;
      if (found.astro) astro(c, apos[0], apos[1], t, { alive: 1, wave: ta ? env(pms, 1400) : 0 });
      if (found.ice) iceDragon(c, dpos[0], dpos[1], t, { alive: 1, lick: td ? env(pms, 1400) : (sin(t * 0.0013) > 0.92 ? 0.5 : 0) });
      HUNT.push({ id: "astro", x: F.X(apos[0]), y: F.Y(apos[1]), r: hitR }); HUNT.push({ id: "ice", x: F.X(dpos[0]), y: F.Y(dpos[1]), r: hitR });
      [["astro", apos], ["ice", dpos]].forEach(function (f) { if (found[f[0]]) { c.strokeStyle = "#ffd23a"; c.lineWidth = 3; c.beginPath(); c.arc(f[1][0], f[1][1], 25 + sin(t * 0.006) * 2, 0, 7); c.stroke(); c.strokeStyle = "rgba(255,244,170,.6)"; c.lineWidth = 1; c.beginPath(); c.arc(f[1][0], f[1][1], 29 + sin(t * 0.006 + 1) * 2.4, 0, 7); c.stroke(); for (var sp = 0; sp < 6; sp++) { var sa = sp * 1.05 + t * 0.002; c.fillStyle = "rgba(255,236,140,.9)"; c.beginPath(); c.arc(f[1][0] + cos(sa) * 31, f[1][1] + sin(sa) * 31, 1.4, 0, 7); c.fill(); } } });
      /* a light moving across the relief every six seconds: a glint on the stone */
      var gx = -130 + ((t % 6000) / 6000) * (F.w + 190) + F.x0, gg = c.createLinearGradient(gx, 0, gx + 90, 0);
      gg.addColorStop(0, "rgba(255,250,224,0)"); gg.addColorStop(0.5, "rgba(255,250,224,.2)"); gg.addColorStop(1, "rgba(255,250,224,0)");
      c.save(); c.beginPath(); c.moveTo(gx + 40, F.y0); c.lineTo(gx + 130, F.y0); c.lineTo(gx + 30, F.y0 + F.h); c.lineTo(gx - 60, F.y0 + F.h); c.closePath(); c.fillStyle = gg; c.fill(); c.restore();
      /* a stork glides over the roofs, wings spread, now and then beating them */
      var sc2 = (t % 11000) / 11000; if (sc2 < 0.8) { var su = sc2 / 0.8, stx = F.x0 - 40 + su * (F.w + 80), sty = 34 + sin(su * 5) * 8 + su * 14, fl = su * 40; c.save(); c.translate(stx, sty); c.fillStyle = "#f4f0e6"; c.strokeStyle = "#2a2622"; c.lineWidth = 0.9;
        c.beginPath(); c.ellipse(0, 0, 9, 3.4, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.moveTo(8, -1); c.lineTo(17, -3); c.lineTo(8, 1); c.fillStyle = "#f4f0e6"; c.fill(); c.stroke(); c.fillStyle = "#d9543a"; c.beginPath(); c.moveTo(16, -3.4); c.lineTo(24, -3.2); c.lineTo(16, -2); c.fill();
        var wb = max(0, sin(fl)) > 0.6 ? sin(t * 0.012) * 0.5 : 0.1 * sin(t * 0.004);
        [[-1], [1]].forEach(function (d) { c.save(); c.rotate(d[0] * 0.0); c.fillStyle = "#f4f0e6"; c.beginPath(); c.moveTo(-3, 0); c.quadraticCurveTo(-6, (-14 - wb * 10) * 1, -18, -10 - wb * 14); c.lineTo(-20, -7 - wb * 10); c.quadraticCurveTo(-10, -3, 3, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#26221e"; c.beginPath(); c.moveTo(-14, -9.4 - wb * 12); c.lineTo(-20, -7 - wb * 10); c.lineTo(-18, -10 - wb * 14); c.closePath(); c.fill(); c.restore(); });
        c.strokeStyle = "#d9543a"; c.lineWidth = 1; c.beginPath(); c.moveTo(-9, 1); c.lineTo(-18, 3); c.moveTo(-9, 0); c.lineTo(-18, 1); c.stroke(); c.restore(); }
      /* a small lizard on the step: every 3.6 s it darts a short way along the stone, legs scuttling, then freezes with its tail flicking */
      var lz = (t % 3600) / 3600, lzx = HCX - 258 + (lz < 0.3 ? lz / 0.3 * 54 : 54) + 0, lzr = lz < 0.3 ? 1 : 0, lzf = Math.sin(t * 0.0045) * 0.5;
      c.save(); c.translate(lzx, HGROUND - 6); c.fillStyle = "#b8905a"; c.strokeStyle = "#3a2716"; c.lineWidth = 0.9; c.lineCap = "round"; c.lineJoin = "round";
      c.beginPath(); c.moveTo(-12, 0); c.quadraticCurveTo(-24, 1 + lzf * 5 + lzr * Math.sin(t * 0.03) * 2, -34, -2 + lzf * 9); c.stroke();
      c.beginPath(); c.ellipse(0, -3, 12, 3.6, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.moveTo(10, -4); c.quadraticCurveTo(16, -5, 19, -3); c.quadraticCurveTo(16, -0.6, 10, -1.2); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); for (var lg = 0; lg < 2; lg++) { var lph = lzr * Math.sin(t * 0.045 + lg * PI) * 3; c.moveTo(-5 + lg * 12, -1); c.lineTo(-7 + lg * 12 + lph, 3); c.moveTo(-3 + lg * 12, -1); c.lineTo(-1 + lg * 12 - lph, 3); } c.stroke();
      c.fillStyle = "#1a1108"; c.beginPath(); c.arc(15, -4.4, 0.8, 0, 7); c.fill(); c.restore();
      /* a stone-dust puff where a wrong spot was tapped */
      if (tapD && pms >= 0 && pms < 900 && !ta && !td) { var du = pms / 900; for (var dd = 0; dd < 9; dd++) { var da = dd * 0.7 + 0.3; c.fillStyle = "rgba(226,208,160," + 0.55 * (1 - du) + ")"; c.beginPath(); c.arc(tapD[0] + cos(da) * 16 * du, tapD[1] + sin(da) * 11 * du - du * 10, 2 + du * 6 * (0.6 + (dd % 3) * 0.25), 0, 7); c.fill(); } }
      c.restore();
    } };
  function ml2(c, x, y, a, len, wid, curl) { return G.lock(c, x, y, a, len, wid, curl, V, { lw: 0.9, hatch: false, pits: false }); }
  G.huntHit = function (x, y) { for (var i = 0; i < HUNT.length; i++) if (Math.hypot(x - HUNT[i].x, y - HUNT[i].y) < HUNT[i].r * 1.3) return HUNT[i].id; return null; };

  /* ================================================================ the world map */
  /* the crop of each beast's 200 box that fills its pin: [cx, cy, r] */
  var PORTRAIT = { notre: [166, 96, 46], stryge: [140, 92, 52], lionGreek: [100, 100, 62], lionEgypt: [122, 88, 56], chishou: [138, 106, 56], chiwen: [112, 104, 60], onigawara: [100, 96, 66], shachi: [158, 152, 48],
                   makara: [112, 96, 62], kala: [100, 96, 60], yaksha: [100, 50, 38], singha: [138, 56, 46], chaac: [100, 100, 64], eagle: [152, 98, 50], astronaut: [98, 64, 42], greenman: [100, 96, 58] };
  /* a beast's portrait in a disc: the crop fills the disc, a dark-to-base stone behind so pale stones read, ink ring, cream ring, an inner shadow from the one light */
  var PTONE = { notre: "#6f8fa8", stryge: "#9a6a8a", lionGreek: "#d9a63a", lionEgypt: "#d98a3a", chishou: "#c9391c", chiwen: "#2f8f84", onigawara: "#7a3a4a", shachi: "#2b5aa0", makara: "#3f8f5a", kala: "#c98a5e", yaksha: "#3aa5a0", singha: "#b8672a", chaac: "#4a8a4e", eagle: "#8a98a8", astronaut: "#e8b83a", greenman: "#5a9a3a" };
  function portrait(c, id, variant, cx, cy, r, t, poke, rain, sel) {
    var b = G.BEASTS[id], stn = b && S[b.stone] ? S[b.stone] : S.lime, cr = PORTRAIT[id] || [100, 100, 70], k = r / cr[2];
    c.save(); c.fillStyle = "#f6efdc"; c.beginPath(); c.arc(cx, cy, r + 2.6, 0, 7); c.fill();
    c.beginPath(); c.arc(cx, cy, r, 0, 7); c.clip(); c.fillStyle = PTONE[id] || G.mix(stn.dark, stn.base, 0.55); c.fillRect(cx - r, cy - r, r * 2, r * 2);
    G.beast(c, id, cx - cr[0] * k, cy - cr[1] * k, 200 * k, { t: t, poke: poke == null ? -1 : poke, rain: rain ? 1 : 0, variant: variant });
    var sh = c.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.55, cx, cy, r * 1.02); sh.addColorStop(0, "rgba(20,14,8,0)"); sh.addColorStop(1, "rgba(20,14,8,.42)"); c.fillStyle = sh; c.fillRect(cx - r, cy - r, r * 2, r * 2);
    c.restore();
    c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
    c.strokeStyle = "rgba(255,250,236,.95)"; c.lineWidth = 1.4; c.beginPath(); c.arc(cx, cy, r + 3, 0, 7); c.stroke();
  }
  /* a teardrop pin: the point at (x, y), the disc above it */
  function teardrop(c, x, y, cx, cy, r) {
    c.fillStyle = "#f6efdc"; c.strokeStyle = INK; c.lineWidth = 1.5; c.lineJoin = "round";
    var dx = x - cx, dy = y - cy, d = hyp(dx, dy), a = Math.atan2(dy, dx), th = Math.acos(G.clamp((r + 2.6) / d, -1, 1));
    c.beginPath(); c.moveTo(x, y); c.lineTo(cx + cos(a - th) * (r + 2.6), cy + sin(a - th) * (r + 2.6)); c.arc(cx, cy, r + 2.6, a - th, a + th, true); c.closePath(); c.fill(); c.stroke();
  }
  var MAPSPR = {};
  function sprite(c, key, sz, paint) {
    var dpr = (c.getTransform ? c.getTransform().a : 1) || 1, k = key + "@" + sz + "x" + dpr, e = MAPSPR[k];
    if (!e) { var cv = document.createElement("canvas"); cv.width = Math.ceil(sz * dpr); cv.height = Math.ceil(sz * dpr); var g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); paint(g, sz / 2, sz / 2); e = MAPSPR[k] = cv; }
    return e;
  }
  SC.map = { w: 900, h: 470,
    draw: function (c, W, H, st) {
      var t = st.t, land = st.land || G.LAND, pins = st.pins || [], F = fit(W, H, 900, 470), pms = pokeOf(st), tq = tapPt(st), pidx = opt(st, "pokeIdx");
      var proj = function (lon, lat) { return [(lon + 180) / 360 * 900, (78 - lat) / (78 + 58) * 470]; };
      layer(c, W, H, "map-" + (land ? land.length : 0), function (g) {
        enter(g, F);
        wash(g, F.x0, F.y0, F.w, F.h, "#9cc6cf", 301, 0.5);
        g.strokeStyle = "rgba(60,90,110,.14)"; g.lineWidth = 0.8;
        for (var lo = -180; lo <= 180; lo += 30) { var a = proj(lo, 78), b = proj(lo, -58); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
        for (var la = -45; la <= 75; la += 15) { var p = proj(-180, la), q = proj(180, la); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); }
        if (land) {
          g.save(); g.beginPath(); g.rect(0, 0, 900, 470); g.clip(); g.lineJoin = "round";
          var path = function (ox, oy) { g.beginPath(); land.forEach(function (ring) { for (var i = 0; i < ring.length; i += 2) { var pt = proj(ring[i], ring[i + 1]); if (i) g.lineTo(pt[0] + ox, pt[1] + oy); else g.moveTo(pt[0] + ox, pt[1] + oy); } g.closePath(); }); };
          /* two pale ripple strokes parallel to the coasts, then the land's shadow, then the land */
          path(0, 0); g.strokeStyle = "rgba(255,255,255,.2)"; g.lineWidth = 13; g.stroke(); g.strokeStyle = "rgba(255,255,255,.3)"; g.lineWidth = 6.5; g.stroke();
          path(2, 2); g.fillStyle = "rgba(40,60,70,.3)"; g.fill();
          path(0, 0); g.fillStyle = "#f3e8cf"; g.fill(); g.strokeStyle = "#6b5a3a"; g.lineWidth = 0.9; g.stroke();
          g.restore();
        }
        /* a small compass rose in the south Pacific */
        g.save(); g.translate(70, 408); g.strokeStyle = INK; g.fillStyle = "#f6efdc"; g.lineWidth = 1;
        g.beginPath(); g.arc(0, 0, 21, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(0, 0, 16, 0, 7); g.stroke();
        for (var k = 0; k < 8; k++) { var an = k * PI / 4 - PI / 2, ll = k % 2 ? 11 : 21; g.fillStyle = k === 0 ? HOT : INK; g.beginPath(); g.moveTo(cos(an - 0.22) * 4, sin(an - 0.22) * 4); g.lineTo(cos(an) * ll, sin(an) * ll); g.lineTo(cos(an + 0.22) * 4, sin(an + 0.22) * 4); g.closePath(); g.fill(); }
        g.font = "700 9px " + FONT; g.fillStyle = INK; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("N", 0, -29);
        g.restore();
        g.restore();
      });
      enter(c, F);
      /* the sea answers a tap with rings spreading */
      var tapPin = pms >= 0 && pidx != null && pidx >= 0 ? pidx : -1;
      if (pms >= 0 && pms < 1400 && tapPin < 0 && tq) { var tp = [(tq[0] - F.ox) / F.s, (tq[1] - F.oy) / F.s]; for (var rg = 0; rg < 3; rg++) { var ru = G.clamp((pms - rg * 160) / 1000, 0, 1); if (ru > 0 && ru < 1) { c.strokeStyle = "rgba(255,255,255," + (0.85 * (1 - ru)) + ")"; c.lineWidth = 1.6 * (1 - ru) + 0.4; c.beginPath(); c.ellipse(tp[0], tp[1], 6 + ru * 56, (6 + ru * 56) * 0.55, 0, 0, 7); c.stroke(); } } }
      /* a tiny sea serpent arcs out of the Pacific every nine seconds */
      var ph = (t % 9000) / 9000;
      if (ph < 0.3) { var sp = proj(-138, -8), su = ph / 0.3, sx = sp[0] + (su - 0.5) * 70; c.save(); c.translate(sx, sp[1]); c.strokeStyle = "#274a52"; c.fillStyle = "#3e7a80"; c.lineWidth = 1; c.globalAlpha = sin(PI * su);
        for (var hmp = 0; hmp < 3; hmp++) { var hx = -22 + hmp * 15, hh = (6 - hmp * 1.2) * sin(PI * G.clamp(su * 1.4 - hmp * 0.16, 0, 1)); c.beginPath(); c.moveTo(hx - 6, 0); c.quadraticCurveTo(hx, -hh * 2, hx + 6, 0); c.closePath(); c.fill(); c.stroke(); }
        c.beginPath(); c.moveTo(18, 0); c.quadraticCurveTo(20, -14 * sin(PI * su), 28, -9 * sin(PI * su)); c.lineTo(31, -8 * sin(PI * su)); c.quadraticCurveTo(24, -4 * sin(PI * su), 24, 0); c.closePath(); c.fill(); c.stroke();
        ripples(c, -2, 1, t, 3, 36, "rgba(255,255,255,.8)", 1); c.restore(); }
      /* pins: true positions, then heads nudged apart where they would overlap */
      var base = Math.max(44, 46 * W / 900), rd = []; st.hits = [];
      var P = pins.map(function (pn, i) { var pt = proj(pn.lon, pn.lat), sel = st.sel === i, sz = sel ? base * 1.7 : base; return { i: i, pn: pn, x: pt[0], y: pt[1], sz: sz, sel: sel, hx: 0, hy: 0, r: sz * 0.42 }; });
      var s0 = F.s;
      P.forEach(function (p) { p.hx = p.x; p.hy = p.y - p.sz * 0.78 / s0; });
      for (var it = 0; it < 8; it++) for (var a = 0; a < P.length; a++) for (var b = a + 1; b < P.length; b++) {
        var A = P[a], B = P[b], dx = B.hx - A.hx, dy = B.hy - A.hy, d = hyp(dx, dy), md = (A.r + B.r) / s0 * 1.35 + 3;
        if (d < md) { if (d < 0.01) { dx = 0.01; dy = 1; d = 1; } var push = (md - d) / 2, nx = dx / d, ny = dy / d * 1.6; A.hx -= nx * push * 0.6; A.hy -= ny * push; B.hx += nx * push * 0.6; B.hy += ny * push; }
        [A, B].forEach(function (Q) { Q.hx = G.clamp(Q.hx, Q.x - 14, Q.x + 14); Q.hy = G.clamp(Q.hy, Q.y - Q.sz * 0.78 / s0 - 20, Q.y - Q.sz * 0.78 / s0 + 20); });
      }
      /* back to front: south first so northern pins sit over them; the selected one last */
      P.sort(function (A, B) { return (A.sel ? 1e9 : A.y) - (B.sel ? 1e9 : B.y); });
      P.forEach(function (p) {
        var i = p.i, pn = p.pn, r = p.r / s0, sel = p.sel, bob = sin(t * 0.003 + i) * 2, mine = tapPin === i ? pms : -1, hop = mine >= 0 && mine < 700 ? 10 * sin(PI * mine / 700) : 0, sq = mine >= 0 && mine < 700 ? 1 - 0.16 * sin(PI * mine / 700 * 2) : 1;
        /* the ground: a soft shadow and a dot, and a damp patch where it rains */
        c.fillStyle = "rgba(30,20,10,.28)"; c.beginPath(); c.ellipse(p.x, p.y + 0.5, 5, 2, 0, 0, 7); c.fill();
        if (pn.rain > 0) { var dg = c.createRadialGradient(p.x, p.y - 4, 2, p.x, p.y - 4, 26); dg.addColorStop(0, "rgba(36,56,84,.42)"); dg.addColorStop(1, "rgba(36,56,84,0)"); c.fillStyle = dg; c.beginPath(); c.ellipse(p.x, p.y - 2, 28, 15, 0, 0, 7); c.fill(); }
        c.fillStyle = INK; c.beginPath(); c.arc(p.x, p.y, 2, 0, 7); c.fill();
        var hx = p.hx, hy = p.hy - bob - hop;
        if (hyp(p.hx - p.x, p.hy - (p.y - p.sz * 0.78 / s0)) > 3) { c.strokeStyle = "rgba(40,30,20,.65)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(hx, hy); c.stroke(); }
        c.save(); c.translate(p.x, p.y); c.scale(1 / sq, sq); c.translate(-p.x, -p.y);
        teardrop(c, p.x, p.y - bob * 0.3 - hop * 0.2, hx, hy, r);
        if (sel) { c.strokeStyle = "#f1b928"; c.lineWidth = 3; c.beginPath(); c.arc(hx, hy, r + 6 + sin(t * 0.005) * 2, 0, 7); c.stroke(); c.strokeStyle = "rgba(255,236,150,.55)"; c.lineWidth = 1; c.beginPath(); c.arc(hx, hy, r + 10 + sin(t * 0.005 + 1) * 2.4, 0, 7); c.stroke(); }
        if (sel || mine >= 0) portrait(c, pn.id, pn.variant, hx, hy, r, t + i * 500, mine >= 0 ? mine : -1, pn.rain > 0, sel);
        else { var spr = sprite(c, "pin-" + pn.id + "-" + (pn.variant || "") + (pn.rain > 0 ? "r" : ""), (r + 6) * 2, function (g, ox, oy) { portrait(g, pn.id, pn.variant, ox, oy, r, 4200 + i * 500, -1, pn.rain > 0, false); }); c.drawImage(spr, hx - r - 6, hy - r - 6, (r + 6) * 2, (r + 6) * 2); }
        c.restore();
        /* rain: a cloud over the pin, eight streaks to the ground, a ring where they land */
        if (pn.rain > 0) {
          var cd = sin(t * 0.0007 + i) * 6 / 1;
          cloud(c, hx + cd, hy - r - 12, 34, "#9aa7b6", INK);
          cloud(c, hx + cd + 10, hy - r - 9, 22, "#b4bfcb", INK);
          /* a rain patch about 24 px wide: twelve slanting streaks that fall for ever from the cloud to the ground */
          c.strokeStyle = "rgba(34,76,150,.95)"; c.lineWidth = 1.5; c.lineCap = "round";
          for (var d = 0; d < 12; d++) { var q = ((t * 0.0017 * (0.85 + (d % 4) * 0.1) + d / 12) % 1), sx0 = p.x + (d - 5.5) * 2.2 + 2, sy0 = hy - r - 6 + q * (p.y - (hy - r - 6) + 4); c.beginPath(); c.moveTo(sx0 + 1.6, sy0 - 4.2); c.lineTo(sx0 - 0.4, sy0 + 1); c.stroke(); }
          ripples(c, p.x, p.y, t + i * 300, 2, 22, "rgba(80,120,170,.75)", i);
          if (mine >= 0 && mine < 900) { var mu = mine / 900; c.fillStyle = "rgba(48,84,140,.8)"; for (var sh = 0; sh < 14; sh++) { var sa = -PI / 2 + (sh - 6.5) * 0.3; c.beginPath(); c.arc(hx + cos(sa) * (r + 12 + mu * 36), hy + sin(sa) * (r + 12 + mu * 30) + mu * mu * 40, 1.6 * (1 - mu * 0.5), 0, 7); c.fill(); } }
        }
        if (sel) label(c, p.x, p.y + 15, pn.place || pn.name || pn.id, { align: "center", size: 11, fill: "#fff3c4" });
        st.hits.push([F.X(hx), F.Y(hy), (r + 4) * F.s, i]);
      });
      c.restore();
    } };

  /* ================================================================ people
     figure(c, x, y, h, robe, o): feet at (x, y), h px head to heel, five and a half heads tall.
     o: dir (+1 faces right, -1 left), t, seed, ph (walk phase, radians), poke (ms since a tap),
        saint (mitre, halo, crozier, pallium, stole), prisoner (tunic, rope belt, bare feet, cuffs),
        aF / aB (the front and back arm raised forward from hanging, rad), bF / bB (forearm bend, rad),
        hF / hB ('open' 'bless' 'fist' 'grip'), cross (a gold cross held in the front hand),
        look [x, y] (the head turns / tips back), mood ('calm' 'fear' 'awe'), flare 0..1 (the halo),
        stole false = leave the stole to the scene. */
  var HALOP = pal("#f4de8a", "#fff9d6", "#c9a43a", "#2a1c04"), GOLDP = S.gold, WOOD = pal("#8b5d2e", "#cf9a5c", "#4a2c10", "#24140a"), IRON = pal("#6c7076", "#b9bec5", "#2b2f35", "#121418"), BLOODRED = pal("#bd3a22", "#f08a68", "#6c1608", "#2a0803");
  function cross(c, x, y, s, st) { G.cut(c, [[x, y - s], [x, y + s]], st, 0.9, { col: st.ink }); G.cut(c, [[x - s * 0.75, y - s * 0.25], [x + s * 0.75, y - s * 0.25]], st, 0.9, { col: st.ink }); }
  /* a hand in the wrist frame, fingers along +y, 11 units long */
  function hand(c, sk, kind, grip) {
    var cx = [-2.6, -0.9, 0.8, 2.5], ln = kind === "bless" ? [1.5, 1.7, 5.8, 5.2] : kind === "fist" || kind === "grip" ? [1.8, 2.0, 2.2, 2.0] : [3.2, 4.0, 4.5, 3.9], p = [[-2.9, 0, 1], [-3.5, 3.4]];
    for (var i = 0; i < 4; i++) { var b = kind === "bless" && i < 2 ? 5.6 : 5.2; p.push([cx[i] - 0.78, b, 1], [cx[i] - 0.74, b + ln[i] * 0.82], [cx[i], b + ln[i]], [cx[i] + 0.74, b + ln[i] * 0.82], [cx[i] + 0.78, b, 1]); }
    p.push([3.5, 3.4], [2.9, 0, 1]);
    G.part(c, p, sk, { lw: 0.55, pits: false, hatch: false, steps: 3 });
    G.part(c, kind === "bless" ? [[2.6, 1.6], [4.2, 2.6], [3.6, 5.2], [1.8, 4.2]] : [[2.8, 1], [4.6, 1.8], [6.2, 5.2], [5.0, 6.0], [3.2, 3.8]], sk, { lw: 0.5, pits: false, hatch: false });
    if (kind === "grip" || kind === "fist") G.cut(c, [[-2.8, 4.2], [0, 4.6], [2.8, 4.2]], sk, 0.4);
  }
  function figure(c, x, y, h, robe, o) {
    o = o || {};
    var dir = o.dir || 1, k = h / 100, t = o.t || 0, sd = o.seed || 0, sk = skin(o.skin), saint = !!o.saint, pr = !!o.prisoner;
    var pms = o.poke != null && o.poke >= 0 ? o.poke : -1, pe = pms >= 0 ? env(pms, 1400) : 0, walking = o.ph != null, ph = o.ph || 0;
    var bob = walking ? abs(sin(ph)) * 1.2 : 0, br = 1 + 0.012 * sin(t * 0.002 + sd * 3), sway = sin(t * 0.0021 + sd) * 0.7;
    var jump = pr && pms >= 0 && pms < 600 ? 9 * sin(PI * pms / 600) : 0, bl = G.blink(t, sd + 1.3), look = o.look || [0, 0], mood = o.mood || "calm";
    var keepG = G.sil, xs = o.xs || 1; c.save(); c.translate(x, y - jump * k); c.scale(dir * k * xs, k * br); if (dir < 0) G.light(true);
    try {
      c.fillStyle = "rgba(30,22,14,.24)"; c.beginPath(); c.ellipse(1, 0.6, 25 - bob * 3, 2.6, 0, 0, 7); c.fill();
      c.translate(0, -bob);
      var cloth = robe, hem = pr ? -33 : -3, lift = function (side) { return walking ? -max(0, side * sin(ph)) * 1.6 : 0; };
      /* halo behind the head, flaring on a tap */
      if (saint) {
        var fl = (o.flare || 0), hr = 15 * (1 + 0.45 * fl);
        if (fl > 0.02) { c.save(); c.strokeStyle = G.rgba("#ffd96a", 0.8 * fl); c.lineWidth = 0.9; for (var q = 0; q < 14; q++) { var a = q / 14 * PI * 2 + t * 0.001; c.beginPath(); c.moveTo(-1.5 + cos(a) * hr * 1.05, -95.5 + sin(a) * hr * 1.05); c.lineTo(-1.5 + cos(a) * hr * 1.7, -95.5 + sin(a) * hr * 1.7); c.stroke(); } c.restore(); }
        G.part(c, [[-1.5, -95.5 - hr], [hr - 1.5, -95.5], [-1.5, -95.5 + hr], [-hr - 1.5, -95.5]], HALOP, { lw: 1.5, steps: 5, round: 0.5, pits: false, hatch: false, lift: 0.7 });
        c.strokeStyle = G.rgba(HALOP.ink, 0.85); c.lineWidth = 0.8; c.beginPath(); c.arc(-1.5, -95.5, hr * 0.8, 0, 7); c.stroke(); c.strokeStyle = G.rgba(HALOP.dark, 0.9); c.lineWidth = 0.5; c.beginPath(); c.arc(-1.5, -95.5, hr * 0.64, 0, 7); c.stroke();
      }
      /* the crozier: shaft, knop, and a carved volute, planted (and tapped when walking) */
      var hands = {};
      var armDir = function (a1, b) { return [[sin(a1), cos(a1)], [sin(a1 + b), cos(a1 + b)]]; };
      var armPose = function (side) {
        var a1 = side > 0 ? (o.aF || 0.08) : (o.aB == null ? (saint ? -0.9 : 0.1) : o.aB), b = side > 0 ? (o.bF || 0.25) : (o.bB == null ? (saint ? 1.2 : 0.3) : o.bB), S0 = [side * 12, -74], d = armDir(a1, b);
        var E = [S0[0] + d[0][0] * 17, S0[1] + d[0][1] * 17], Wr = [E[0] + d[1][0] * 15, E[1] + d[1][1] * 15];
        return { a1: a1, b: b, S: S0, E: E, W: Wr, d: d };
      };
      var pF = armPose(1), pB = armPose(-1);
      if (pr && pms >= 0) { var rat = sin(pms * 0.04) * 2 * pe; pF.W[1] += rat * 0.5; }
      /* an arm: wide sleeve in two pieces, a cuff, then the hand */
      var arm = function (P, kind, back) {
        c.save(); c.translate(P.S[0], P.S[1]); c.rotate(-P.a1);
        G.part(c, [[-3.6, -1.5], [3.6, -1.5], [4.8, 8], [5.6, 17.4], [-5.6, 17.4], [-4.8, 8]], cloth, { lw: 1.1, pits: false });
        G.cut(c, [[-1.4, 2], [-1.2, 11], [-2.6, 16.6]], cloth, 0.5);
        c.translate(0, 17); c.rotate(-P.b);
        G.part(c, [[-5.2, -0.8], [5.2, -0.8], [6.4, 10], [7, 15.6], [-7, 15.6], [-6.4, 10]], cloth, { lw: 1.1, pits: false });
        G.cut(c, [[1.6, 1.5], [2.4, 9], [3.4, 14.6]], cloth, 0.5); G.cut(c, [[-2, 2], [-3, 9], [-3.8, 14.8]], cloth, 0.5);
        /* cuff */
        if (pr) { G.part(c, [[-4.4, 14.6], [4.4, 14.6], [4.6, 18.4], [-4.6, 18.4]], IRON, { lw: 0.7, pits: false, hatch: false }); }
        else G.part(c, [[-6.9, 15.2, 1], [6.9, 15.2, 1], [6.4, 18.2, 1], [-6.4, 18.2, 1]], saint ? GOLDP : cloth, { lw: 0.8, pits: false, hatch: false, base: saint ? undefined : cloth.dark });
        c.translate(0, 18); hand(c, sk, kind, 0);
        if (pr && !back) { /* two chain links hang from the near cuff and rattle */
          var rat2 = pms >= 0 ? sin(pms * 0.04) * 2 * pe : sin(t * 0.002) * 0.3;
          c.strokeStyle = G.rgba(IRON.ink, 0.95); c.lineWidth = 0.9;
          c.beginPath(); c.ellipse(rat2 * 0.5, -1.2 + 2.2, 1.5, 2.3, rat2 * 0.08, 0, 7); c.stroke();
          c.beginPath(); c.ellipse(rat2, -1.2 + 6.1, 1.4, 2.1, rat2 * 0.12, 0, 7); c.stroke();
        }
        c.restore();
      };
      arm(pB, o.hB || (saint ? "grip" : "open"), true);

      /* body: neck and shoulders, an A-line robe, a scalloped hem with four folds */
      var legs = pr ? 1 : 0;
      if (pr) {
        var swingL = walking ? sin(ph) * 5 : 0, kneeL = walking ? max(0, sin(ph)) * 3 : 0;
        [[-5.5, swingL, kneeL, 1], [5.5, -swingL, walking ? max(0, -sin(ph)) * 3 : 0, 0]].forEach(function (L) {
          var lx = L[0], dx = L[1];
          G.part(c, [[lx - 3.6, -34], [lx + 3.6, -34], [lx + 3 + dx * 0.4, -16 - L[2]], [lx + 2.8 + dx, -3 - L[2] * 0.4], [lx - 2.8 + dx, -3 - L[2] * 0.4], [lx - 3 + dx * 0.4, -16 - L[2]]], sk, { lw: 1, pits: false, round: 0.5 });
          G.part(c, [[lx - 3.2 + dx, -3.4 - L[2] * 0.4], [lx + 3 + dx, -3.4 - L[2] * 0.4], [lx + 7.2 + dx, -0.6 - L[2] * 0.4, 1], [lx + 6.8 + dx, 0.6 - L[2] * 0.4, 1], [lx - 3 + dx, 0.6 - L[2] * 0.4, 1]], sk, { lw: 0.9, pits: false });
          for (var q2 = 0; q2 < 3; q2++) G.cut(c, [[lx + 3 + q2 * 1.4 + dx, -1.2 - L[2] * 0.4], [lx + 4 + q2 * 1.4 + dx, 0.2 - L[2] * 0.4]], sk, 0.4);
          G.cut(c, [[lx - 1.5, -22], [lx + 0.5, -20], [lx + 1.8, -22]], sk, 0.5);
        });
      }
      var pts = [[-4.6, -78.4, 1], [-12.6, -75.4], [-14.4, -70], [-11.6, -54], [-10.2, -47]];
      var span = pr ? 12.5 : 21, hy0 = hem;
      pts.push([-10.6 - (span - 10.6) * 0.45, hy0 * 0.55 - 20], [-span, hy0 + lift(-1) - 1]);
      /* the hem: scallops that sway, rise by turns when walking, and tear on the prisoner */
      var nsc = 6;
      for (var i = 0; i <= nsc; i++) {
        var u = i / nsc, hx = G.lerp(-span, span, u), hv = (pr ? (i % 2 ? -3.5 : 0.2) : sin(PI * u * nsc) * 0.5 + 0.8) + sin(t * 0.002 + i * 0.9 + sd) * (pr ? 0.4 : 0.7) + lift(u < 0.5 ? -1 : 1);
        pts.push([hx + (i && i < nsc ? sway * 0.4 : 0), hy0 + hv - (i % 2 ? 0 : 0.6), 1]);
        if (!pr && i < nsc) pts.push([hx + (span * 2 / nsc) * 0.5 + sway * 0.4, hy0 + 2.3 + sin(t * 0.0023 + i * 1.3 + sd) * 0.6 + lift(u < 0.5 ? -1 : 1)]);
      }
      pts.push([span, hy0 - 1 + lift(1)], [10.6 + (span - 10.6) * 0.45, hy0 * 0.55 - 20], [10.2, -47], [11.6, -54], [14.4, -70], [12.6, -75.4], [4.6, -78.4, 1]);
      G.part(c, pts, cloth, { lw: 1.4, pits: false, round: 0.35, seed: sd + 3 });
      /* hem folds as cuts, the neckline, and the robe's own colour changes */
      [-13, -5, 3.5, 11.5].forEach(function (fx, q3) { var s2 = fx * (span / 21); G.cut(c, [[s2 + sway * 0.3, hy0 - 0.5], [s2 * 0.88 + sin(t * 0.0018 + q3) * 0.5, hy0 * 0.5 - 14], [s2 * 0.62, hy0 * 0.4 - 38]], cloth, 0.7); });
      G.cut(c, [[-2.4, -77], [0, -72.6], [2.4, -77]], cloth, 0.8);
      G.cut(c, [[-10, -46], [0, -44], [10, -46]], cloth, 0.6);
      if (pr) {
        /* rope belt with a knot and a dangling end */
        G.cut(c, [[-10.6, -47.5], [0, -45], [10.4, -47.5]], WOOD, 2.4, { col: "#c9a46a" }); G.cut(c, [[-10.6, -47.5], [0, -45], [10.4, -47.5]], WOOD, 1.2, { col: "#6e4d22" });
        G.dot(c, 4, -45.4, 1.8, "#c9a46a"); G.cut(c, [[4, -44.4], [4.6, -38], [3.8, -33]], WOOD, 1.3, { col: "#c9a46a" });
        /* torn hem: a few threads */
        for (var q4 = 0; q4 < 4; q4++) G.cut(c, [[-9 + q4 * 5.4, hem - 1], [-9.4 + q4 * 5.4, hem + 2.4]], cloth, 0.5);
      }
      if (saint) {
        /* pallium: a band round the shoulders with a tail down the chest, three crosses */
        G.part(c, [[-12.6, -75.8], [-6, -72.4], [0, -70.8], [6, -72.4], [12.6, -75.8], [11.6, -72.6], [5.4, -68.8], [0, -67], [-5.4, -68.8], [-11.6, -72.6]], { base: "#f3ead2", light: "#fff", dark: "#b6a98a", ink: "#2a2418" }, { lw: 0.8, pits: false, steps: 4 });
        G.part(c, [[-1.7, -69], [1.7, -69], [2, -44], [-2, -44]], { base: "#f3ead2", light: "#fff", dark: "#b6a98a", ink: "#2a2418" }, { lw: 0.7, pits: false, steps: 1 });
        cross(c, 0, -71, 1.5, { ink: "#1a1510" }); cross(c, -8, -74, 1.4, { ink: "#1a1510" }); cross(c, 0, -52, 1.5, { ink: "#1a1510" });
        if (o.stole !== false) {
          /* the stole: two long bands from the neck, crosses, fringe */
          [-1, 1].forEach(function (sg) {
            var sx = sg * 3.4, fx2 = sg * 6 + sin(t * 0.0023 + sg) * 0.8 + (walking ? sin(ph) * sg * 0.9 : 0);
            G.part(c, [[sx - 1.8, -78], [sx + 1.8, -78], [fx2 + 2, -14], [fx2 - 2, -14]], BLOODRED, { lw: 0.9, pits: false, steps: 1 });
            for (var q5 = 0; q5 < 3; q5++) cross(c, sx + (fx2 - sx) * (0.3 + q5 * 0.28), -66 + q5 * 18, 1.3, { ink: GOLDP.base });
            for (var q6 = 0; q6 < 4; q6++) G.cut(c, [[fx2 - 1.7 + q6 * 1.15, -14], [fx2 - 1.9 + q6 * 1.15 + sin(t * 0.004 + q6 + sg) * 0.5, -10.4]], GOLDP, 0.6, { col: "#d4a830" });
          });
        }
      }
      /* toes: two pointed shoes under the hem; they alternate when walking */
      if (!pr) {
        [[-7, 1], [6, -1]].forEach(function (T) {
          var dx = walking ? sin(ph) * 5 * T[1] : 0, up = walking ? max(0, sin(ph) * T[1]) * 1.8 : 0;
          G.part(c, [[T[0] - 3.4 + dx, hem + 1.2 - up], [T[0] + 2.6 + dx, hem + 0.6 - up], [T[0] + 7.4 + dx, 0.2 - up, 1], [T[0] + 6.8 + dx, 1.2 - up, 1], [T[0] - 3.2 + dx, 1.2 - up, 1]], { base: "#4a3626", light: "#8a6a4a", dark: "#20160d", ink: "#0e0905" }, { lw: 0.9, pits: false, steps: 3 });
        });
      }
      if (saint && o.crozier !== false) {
        var cx0 = pB.W[0] + pB.d[1][0] * 5, lift0 = walking ? max(0, sin(ph + 1.57)) * 3 : 0;
        G.part(c, [[cx0 - 1.1, -96], [cx0 + 1.1, -96], [cx0 + 1.1, -lift0], [cx0 - 1.1, -lift0]], WOOD, { lw: 0.8, steps: 1, pits: false });
        G.part(c, [[cx0 - 2.4, -96.5, 1], [cx0, -99.5], [cx0 + 2.4, -96.5, 1], [cx0, -93.5]], GOLDP, { lw: 0.8, steps: 3 });
        G.cut(c, [[cx0, -99.5], [cx0, -106], [cx0 + 5, -111], [cx0 + 10, -108], [cx0 + 9, -102.5], [cx0 + 5, -103.5]], GOLDP, 2.8, { col: GOLDP.dark });
        G.cut(c, [[cx0, -99.5], [cx0, -106], [cx0 + 5, -111], [cx0 + 10, -108], [cx0 + 9, -102.5], [cx0 + 5, -103.5]], GOLDP, 1.4, { col: GOLDP.base, glint: 1 });
        G.dot(c, cx0 + 5.3, -104.2, 1.2, GOLDP.dark);
        if (lift0 < 0.5 && walking) { c.fillStyle = "rgba(60,48,30,.35)"; c.beginPath(); c.ellipse(cx0, 0.3, 2.4, 0.8, 0, 0, 7); c.fill(); }
        /* the back hand closes over the staff, in front of it */
        c.save(); c.translate(pB.S[0], pB.S[1]); c.rotate(-pB.a1); c.translate(0, 17); c.rotate(-pB.b); c.translate(0, 18); hand(c, sk, "grip", 0); c.restore();
      }
      /* the neck and the head, which turns and tips */
      G.part(c, [[-3.4, -83.4], [3.4, -83.4], [3.8, -76.6], [-3.8, -76.6]], sk, { lw: 0.8, pits: false, steps: 1 });
      G.cut(c, [[-3.6, -79], [0, -77.6], [3.6, -79]], sk, 0.5);
      c.save(); c.translate(0.5, -82); c.rotate(look[1] * -0.22); c.translate(-0.5, 82);
      var fx0 = look[0] * 1.4;
      if (saint) {                                  /* lappets of the mitre hang behind the head */
        G.part(c, [[-7.4, -99], [-9.8, -99], [-11.8, -81.4, 1], [-9.2, -79.6, 1]], { base: "#f3ead2", light: "#fff", dark: "#b6a98a", ink: "#2a2418" }, { lw: 0.7, pits: false, steps: 1 });
        G.part(c, [[-9.4, -99], [-11.6, -98], [-14.2, -82, 1], [-11.4, -80.6, 1]], { base: "#f3ead2", light: "#fff", dark: "#b6a98a", ink: "#2a2418" }, { lw: 0.7, pits: false, steps: 1 });
        G.cut(c, [[-12.2, -83.5], [-10.3, -81.8]], GOLDP, 1, { col: GOLDP.base });
      }
      G.part(c, [[-0.5, -100.4], [5.2, -99.4], [7.7, -94.5], [7.7, -89.5], [6.1, -85.2], [3.6, -82.6], [0.8, -81.9], [-2.4, -83.2], [-5.8, -86.6], [-7.4, -91.2], [-6.6, -96.6]].map(function (p) { return [p[0] + (p[1] < -90 ? fx0 * 0.3 : fx0 * 0.6), p[1]]; }), sk, { lw: 1.1, pits: false, round: 0.7, seed: sd + 8, steps: 5 });
      /* ear on the far side, brows, both eyes, nose, mouth */
      G.part(c, [[-7.1, -92], [-8.7, -91.4], [-8.5, -88.4], [-7, -88]], sk, { lw: 0.6, pits: false, hatch: false });
      var brow = pr ? -2.4 : mood === "awe" ? -1.2 : 0, ex = [-1.7 + fx0, 4.5 + fx0], ey = -91.8, er = [1.6, 1.3];
      G.cut(c, [[ex[0] - 3.2, -94.6 + brow * 0.3], [ex[0] - 0.4, -95.6 + brow], [ex[0] + 2.4, -94.6 + brow * 0.6]], sk, 0.8, { col: pr ? "#2b1d12" : sk.ink });
      G.cut(c, [[ex[1] - 2.4, -94.6 + brow * 0.6], [ex[1] + 0.2, -95.4 + brow], [ex[1] + 2.4, -94.4 + brow * 0.3]], sk, 0.7, { col: pr ? "#2b1d12" : sk.ink });
      var lk = [look[0] * 0.8 + 0.3, look[1] * 0.6];
      G.eye(c, ex[0], ey, er[0] * (pr ? 1.15 : 1), sk, { blink: bl, look: lk, white: "#fff8ea", whiteDark: "#eed9bd", iris: "#4a3524", squint: pr ? 0 : mood === "awe" ? 0.1 : 0.25 });
      G.eye(c, ex[1], ey, er[1] * (pr ? 1.15 : 1), sk, { blink: bl, look: lk, white: "#fff8ea", whiteDark: "#eed9bd", iris: "#4a3524", squint: pr ? 0 : 0.25 });
      G.cut(c, [[1.2 + fx0, -91], [2.2 + fx0, -88], [4.2 + fx0, -86.4]], sk, 0.7); G.cut(c, [[2.4 + fx0, -86.3], [3.5 + fx0, -86.9]], sk, 0.5);
      var mo = mood === "fear" || pr ? 0.9 : mood === "awe" ? 0.4 : -0.3;
      G.cut(c, [[0 + fx0, -84.2 - mo * 0.2], [1.9 + fx0, -83.7 + mo * 0.4], [3.8 + fx0, -84.4 - mo * 0.2]], sk, 0.7, { col: "#6e2f22" });
      if (pr) { c.fillStyle = "rgba(60,42,28,.55)"; for (var q7 = 0; q7 < 9; q7++) { var qa = 0.35 + q7 / 8 * 2.45; c.fillRect(0.4 + cos(qa) * 6.4 - 0.2, -90 + sin(qa) * 7.4 - 0.2, 0.55, 0.55); } }
      /* hair: tousled locks on the prisoner, a fringe under the mitre */
      var hairS = pr ? pal("#3b2a1e", "#6b5040", "#1a120c", "#0d0905") : pal("#d8d4cc", "#fff", "#8c887e", "#2a2824");
      if (pr) {
        G.part(c, [[-7.4, -91.6], [-6.6, -98.6], [0, -101.4], [6.4, -99.6], [7.6, -93.4], [4.4, -96.4], [-3, -97.4]], hairS, { lw: 0.8, pits: false, steps: 4 });
        [[-5, -98, -2.6, 8, 1.4], [-1, -101, -1.9, 9, -1.2], [3, -100, -1.2, 8, 1.1], [6, -97, -0.5, 7, 1.4], [-6.5, -95, -3, 6, -1], [0, -99.5, -1.5, 7, 0.9]].forEach(function (L2) { G.lock(c, L2[0] + fx0 * 0.3, L2[1], L2[2] + sin(t * 0.002 + L2[0]) * 0.05, L2[3], 1.8, L2[4], hairS, { lw: 0.6 }); });
      } else if (saint) { G.part(c, [[-7.4, -92], [-6.9, -97.6], [-4, -98.6], [-5.6, -93]], hairS, { lw: 0.6, pits: false }); G.part(c, [[7.5, -92], [7.2, -97.2], [5, -98.2], [6, -93]], hairS, { lw: 0.6, pits: false }); }
      if (saint) {
        /* a true mitre: cleft top, a gold band round the base, a gold titulus up the middle */
        var mit = { base: "#f4ecd6", light: "#ffffff", dark: "#b8aa86", ink: "#2a2418" };
        G.part(c, [[-8.3, -98.4, 1], [-8.1, -104], [-5.6, -111], [-3.2, -116.6, 1], [0.1, -112.4, 1], [3.5, -116.9, 1], [5.9, -111], [8.2, -104], [8.5, -98.4, 1]].map(function (p) { return [p[0] + fx0 * 0.3, p[1]]; }), mit, { lw: 1.1, pits: false, steps: 4 });
        G.part(c, [[-8.6 + fx0 * 0.3, -97.6], [8.7 + fx0 * 0.3, -97.6], [8.5 + fx0 * 0.3, -101.2], [-8.4 + fx0 * 0.3, -101.2]], GOLDP, { lw: 0.8, pits: false, steps: 1 });
        G.part(c, [[-1.3 + fx0 * 0.3, -101], [1.3 + fx0 * 0.3, -101], [1.1 + fx0 * 0.3, -112.6], [-1.1 + fx0 * 0.3, -112.6]], GOLDP, { lw: 0.6, pits: false, steps: 1 });
        cross(c, 4.6 + fx0 * 0.3, -105.6, 1.1, { ink: GOLDP.dark }); cross(c, -4.8 + fx0 * 0.3, -105.6, 1.1, { ink: GOLDP.dark });
        G.cut(c, [[-6.8, -106.4], [-3.4, -112.4]], mit, 0.5);
      }
      c.restore();
      /* the front arm last, over the robe; a held cross is laid across the closed fist so the hand grips it */
      var fk = o.hF || (o.cross ? "grip" : "open");
      arm(pF, fk, false);
      if (o.cross) {
        var cxp = [pF.W[0] + pF.d[1][0] * 12, pF.W[1] + pF.d[1][1] * 12];
        G.part(c, [[cxp[0] - 0.9, cxp[1] - 19], [cxp[0] + 0.9, cxp[1] - 19], [cxp[0] + 0.9, cxp[1] + 4], [cxp[0] - 0.9, cxp[1] + 4]], GOLDP, { lw: 0.7, pits: false, steps: 1 });
        G.part(c, [[cxp[0] - 5.6, cxp[1] - 14.4], [cxp[0] + 5.6, cxp[1] - 14.4], [cxp[0] + 5.6, cxp[1] - 12.4], [cxp[0] - 5.6, cxp[1] - 12.4]], GOLDP, { lw: 0.7, pits: false, steps: 1 });
        G.dot(c, cxp[0], cxp[1] - 13.4, 0.9, GOLDP.dark);
        c.save(); c.translate(pF.W[0] + pF.d[1][0] * 9, pF.W[1] + pF.d[1][1] * 9); c.rotate(-(pF.a1 + pF.b)); G.part(c, [[-3, -1.6], [3, -1.6], [3.4, 1.4], [-3.4, 1.4]], sk, { lw: 0.6, pits: false, hatch: false, steps: 1 }); c.restore();       /* the fingers over the shaft */
      }
    } finally { c.restore(); G.light(false); G.sil = keepG; }
    return { head: [x, y - h * 0.9], neck: [x, y - h * 0.78], hand: [x + dir * pF.W[0] * k, y + pF.W[1] * k] };
  }

  /* ================================================================ Rouen: the pieces */
  var WALL = pal("#ecdfbd", "#fff7e2", "#a8946e", "#2b2218"), ROOF = pal("#c8402a", "#f2896c", "#6b1d11", "#2a0b05"), TIMB = "#4a3120";
  var STONEC = pal("#a9a498", "#e6e1d4", "#5d5a52", "#24221f");
  /* a tiny townsperson, 14-18 px tall, in the middle of a run (wave: one arm up and swinging) */
  function runner(c, x, y, h, col, dir, ph, wave) {
    var k = h / 16, l = sin(ph) * 3.4, a = wave ? sin(ph * 2) * 1.6 : 0.8; c.save(); c.translate(x, y); c.scale(dir * k, k);
    c.strokeStyle = INK; c.lineWidth = 0.9; c.lineCap = "round"; c.lineJoin = "round";
    c.beginPath(); c.moveTo(-0.6, -6); c.lineTo(l - 0.6, -0.3); c.moveTo(0.6, -6); c.lineTo(-l + 0.6, -0.5); c.stroke();
    c.beginPath(); c.moveTo(-2, -12); c.lineTo(-4.6, -9 + a); c.moveTo(2, -12); c.lineTo(wave ? 4.8 : 5, wave ? -17 + a : -16 - a * 0.4); c.stroke();
    c.fillStyle = col; c.beginPath(); c.moveTo(-2.4, -13); c.lineTo(2.4, -13); c.lineTo(3.6, -5.2); c.lineTo(-3.6, -5.2); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = "#e6c09c"; c.beginPath(); c.arc(0.4, -15.2, 2.3, 0, 7); c.fill(); c.stroke();
    c.restore();
  }
  /* reeds: stalks that lean and sway, a few with a brown seed head */
  function reeds(c, x0, x1, by, t, n, hmin, hmax, seed, col) {
    var r = G.rng(seed || 4); c.save(); c.lineCap = "round";
    for (var i = 0; i < n; i++) {
      var x = G.lerp(x0, x1, r()), h = G.lerp(hmin, hmax, r()), lean = (r() - 0.5) * h * 0.25, sw = sin(t * 0.0013 + x * 0.045 + i) * h * 0.05 + sin(t * 0.0029 + i * 2.1) * h * 0.012;
      c.strokeStyle = G.mix(col || "#5d6a3c", INK, 0.25 + r() * 0.3); c.lineWidth = 0.9 + r() * 0.9;
      c.beginPath(); c.moveTo(x, by + (r() - 0.5) * 6); c.quadraticCurveTo(x + lean * 0.4, by - h * 0.55, x + lean + sw, by - h); c.stroke();
      if (r() < 0.32) { c.fillStyle = "#6a4a2a"; c.beginPath(); c.ellipse(x + lean + sw, by - h - 4, 1.8, 5.2, lean * 0.02 + sw * 0.03, 0, 7); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.5; c.stroke(); }
      else if (r() < 0.5) { c.lineWidth = 0.8; c.beginPath(); c.moveTo(x + lean * 0.5, by - h * 0.55); c.lineTo(x + lean * 0.5 + 9, by - h * 0.7 + sw); c.stroke(); }
    }
    c.restore();
  }
  var HWIN = [];     /* windows of the town in panel 0, so the page can light them: [x, y, w, h, house] */
  /* a half-timbered house: gable front, long roof, or a tall narrow one; vermilion roof */
  function house(c, o) {
    var x = o.x, by = o.base, w = o.w, h = o.h, st = o.style || "gable", sd = o.seed || 1, r = G.rng(sd), pitch = o.pitch || 0.6, wins = [];
    c.save(); c.translate(x, by);
    var up = st === "tall" ? 0.46 : 0.5, h1 = h * up, jet = 3;
    /* walls: a ground storey and an upper storey that overhangs it */
    G.part(c, [[-w / 2, 0, 1], [-w / 2, -h1, 1], [-w / 2 - jet, -h1, 1], [-w / 2 - jet, -h, 1], [w / 2 + jet, -h, 1], [w / 2 + jet, -h1, 1], [w / 2, -h1, 1], [w / 2, 0, 1]], WALL, { lw: 1.1, steps: 1, seed: sd * 3, pits: true });
    /* timber: posts, the rail under the jetty, and diagonals */
    var tc = { col: TIMB };
    [-w / 2 + 1.5, 0, w / 2 - 1.5].forEach(function (px) { G.cut(c, [[px, 0], [px + (r() - 0.5), -h1 * 0.5], [px, -h1]], WALL, 1.5, tc); });
    [-w / 2 - jet + 1.5, -w * 0.12, w / 2 + jet - 1.5].forEach(function (px) { G.cut(c, [[px, -h1], [px + (r() - 0.5), -(h1 + h) / 2], [px, -h]], WALL, 1.5, tc); });
    G.cut(c, [[-w / 2 - jet, -h1], [w / 2 + jet, -h1]], WALL, 1.7, tc);
    G.cut(c, [[-w / 2 - jet, -h + 1.5], [w / 2 + jet, -h + 1.5]], WALL, 1.3, tc);
    if (r() < 0.6) { G.cut(c, [[-w / 2 - jet + 2, -h1 - 1], [-w * 0.12 - 1, -h + 2]], WALL, 1.2, tc); G.cut(c, [[w / 2 + jet - 2, -h1 - 1], [-w * 0.12 + 1, -h + 2]], WALL, 1.2, tc); }
    else { G.cut(c, [[-w / 2 - jet + 2, -h + 2], [-w * 0.12 - 1, -h1 - 1]], WALL, 1.2, tc); G.cut(c, [[w * 0.12 + 1, -h + 2], [w / 2 + jet - 2, -h1 - 1]], WALL, 1.2, tc); }
    G.cut(c, [[-w / 2 + 2, -2], [-w * 0.12 - 1, -h1 + 2]], WALL, 1, tc);
    /* door and windows; the windows are dark here, lit by the page's overlay */
    var dw = Math.min(8, w * 0.22);
    G.part(c, [[w * 0.18 - dw / 2, 0, 1], [w * 0.18 - dw / 2, -h1 * 0.66], [w * 0.18, -h1 * 0.78], [w * 0.18 + dw / 2, -h1 * 0.66], [w * 0.18 + dw / 2, 0, 1]], { base: "#4d3524", light: "#7a5a3c", dark: "#2a1c12", ink: "#150d07" }, { lw: 0.8, steps: 3, pits: false });
    var wy = [[-w * 0.34, -h1 * 0.55], [-w * 0.34 + 0.5, -h1 - (h - h1) * 0.55], [w * 0.28, -h1 - (h - h1) * 0.55]];
    wy.forEach(function (q, i) {
      if (i === 0 && w < 30) return; var ww = 5.4, wh = 6.4;
      G.part(c, [[q[0] - ww / 2, q[1] - wh / 2, 1], [q[0] + ww / 2, q[1] - wh / 2, 1], [q[0] + ww / 2, q[1] + wh / 2, 1], [q[0] - ww / 2, q[1] + wh / 2, 1]], { base: "#3a3a44", light: "#6a6a78", dark: "#1a1a22", ink: "#0c0c10" }, { lw: 0.8, steps: 1, pits: false, hatch: false });
      G.cut(c, [[q[0], q[1] - wh / 2], [q[0], q[1] + wh / 2]], WALL, 0.6, { col: "#d8c9a2" }); G.cut(c, [[q[0] - ww / 2, q[1]], [q[0] + ww / 2, q[1]]], WALL, 0.6, { col: "#d8c9a2" });
      wins.push([x + q[0] - ww / 2, by + q[1] - wh / 2, ww, wh]);
    });
    /* the roof */
    var rw = w + jet * 2 + 5, ph = rw / 2 * pitch;
    if (st === "long") {
      G.part(c, [[-rw / 2 - 2, -h, 1], [-rw / 2 + 9, -h - ph * 0.9, 1], [rw / 2 - 9, -h - ph * 0.9, 1], [rw / 2 + 2, -h, 1], [rw / 2, -h + 3, 1], [-rw / 2, -h + 3, 1]], ROOF, { lw: 1.1, steps: 1, seed: sd + 5, pits: false });
      for (var i = 1; i < 4; i++) G.cut(c, [[-rw / 2 + 2 + i, -h - ph * 0.9 * i / 4 + 1], [rw / 2 - 2 - i, -h - ph * 0.9 * i / 4 + 1]], ROOF, 0.6);
    } else {
      G.part(c, [[-rw / 2, -h, 1], [0, -h - ph, 1], [rw / 2, -h, 1], [rw / 2 - 2, -h + 3, 1], [-rw / 2 + 2, -h + 3, 1]], ROOF, { lw: 1.1, steps: 1, seed: sd + 5, pits: false });
      for (i = 1; i < 4; i++) { var f = i / 4; G.cut(c, [[-rw / 2 * (1 - f) - 0.5, -h - ph * f], [rw / 2 * (1 - f) + 0.5, -h - ph * f]], ROOF, 0.6); }
      G.cut(c, [[0, -h - ph], [0, -h - ph * 0.2]], ROOF, 0.5);
    }
    /* chimney on the roof slope, with a cap */
    if (o.chim !== false) { var cxp = w * 0.2, cyb = -h - ph * 0.35; G.part(c, [[cxp - 2.6, cyb + 2, 1], [cxp - 2.6, cyb - 11, 1], [cxp + 2.6, cyb - 11, 1], [cxp + 2.6, cyb + 2, 1]], STONEC, { lw: 0.9, steps: 1, seed: sd }); G.part(c, [[cxp - 3.6, cyb - 11, 1], [cxp - 3.2, cyb - 13.4, 1], [cxp + 3.2, cyb - 13.4, 1], [cxp + 3.6, cyb - 11, 1]], STONEC, { lw: 0.8, steps: 1, pits: false }); wins.chim = [x + cxp, by + cyb - 13.4]; }
    c.restore(); return wins;
  }
  /* the church tower behind the houses: lancets, a belfry, a tall slate spire and pinnacles */
  function church(c, x, by, h) {
    c.save(); c.translate(x, by);
    G.part(c, [[-17, 0, 1], [-17, -h, 1], [17, -h, 1], [17, 0, 1]], STONEC, { lw: 1.3, steps: 1, seed: 71 });
    G.part(c, [[-22, -h + 8, 1], [-22, -h - 18, 1], [22, -h - 18, 1], [22, -h + 8, 1]], STONEC, { lw: 1.3, steps: 1, seed: 72 });
    G.part(c, [[-26, -h - 18, 1], [0, -h - 78, 1], [26, -h - 18, 1]], pal("#6c7380", "#a9b0bb", "#383d47", "#14171c"), { lw: 1.3, steps: 1, seed: 73, pits: false });
    for (var i = 1; i < 6; i++) G.cut(c, [[-26 + i * 2.2, -h - 18 - 12 * i], [26 - i * 2.2, -h - 18 - 12 * i]], STONEC, 0.5);
    G.cut(c, [[0, -h - 78], [0, -h - 20]], STONEC, 0.6); G.dot(c, 0, -h - 80, 1.8, "#d9a21e");
    [[-18, -h - 18], [18, -h - 18]].forEach(function (p) { G.part(c, [[p[0] - 3, p[1], 1], [p[0], p[1] - 17, 1], [p[0] + 3, p[1], 1]], STONEC, { lw: 0.9, steps: 1, pits: false }); });
    [-9, 9].forEach(function (px) { G.hollow(c, [[px - 3, -h * 0.35], [px, -h * 0.35 - 9], [px + 3, -h * 0.35], [px + 3, -h * 0.35 + 18], [px - 3, -h * 0.35 + 18]], STONEC, { deep: 0.9 }); });
    G.hollow(c, [[-8, -h - 8], [-8, -h - 2], [8, -h - 2], [8, -h - 8], [0, -h - 14]], STONEC, { deep: 0.9 });
    for (i = 1; i < 6; i++) G.cut(c, [[-17, -i * h / 6], [17, -i * h / 6]], STONEC, 0.45);
    c.restore();
  }
  /* an overturned boat: the hull up, planks, pegs */
  function boat(c, x, y, w, rot) {
    c.save(); c.translate(x, y); c.rotate(rot); var wd = pal("#6b4a2c", "#a7794a", "#33200f", "#150c05");
    G.part(c, [[-w / 2, 0, 1], [-w * 0.42, -w * 0.16], [-w * 0.15, -w * 0.27], [w * 0.2, -w * 0.26], [w * 0.44, -w * 0.14], [w / 2, 0.5, 1], [w * 0.3, 3.4], [-w * 0.3, 3.4]], wd, { lw: 1.2, seed: 41 });
    for (var i = 1; i < 4; i++) G.cut(c, [[-w * 0.46 + i * 1.4, -w * 0.05 * i], [-w * 0.1, -w * (0.11 + i * 0.045)], [w * 0.42 - i * 1.4, -w * 0.05 * i]], wd, 0.6);
    for (i = 0; i < 6; i++) G.dot(c, -w * 0.32 + i * w * 0.13, -w * 0.12 - sin(i * 1.3) * 2, 0.8, wd.ink);
    G.cut(c, [[-w / 2 + 1, -0.5], [w / 2 - 1, -0.5]], wd, 1, { glint: 1 });
    c.restore();
  }
  /* footprints in mud: a pair every stride, the heel deeper than the toe */
  function prints(c, x, y, sc, side) { c.save(); c.translate(x, y); c.scale(sc, sc); c.fillStyle = "rgba(40,28,18,.5)"; c.beginPath(); c.ellipse(0, 0, 4.4, 1.6, 0.1 * side, 0, 7); c.fill(); c.fillStyle = "rgba(255,244,220,.35)"; c.beginPath(); c.ellipse(-0.8, -0.7, 3.2, 0.7, 0.1 * side, 0, PI); c.fill(); c.restore(); }
  /* a glowing line: three strokes, wide and faint to narrow and bright */
  function glowLine(c, pts, col, w) {
    c.save(); c.lineCap = "round"; c.lineJoin = "round";
    [[w * 3, 0.14], [w * 1.7, 0.3], [w * 0.8, 0.95]].forEach(function (L, i) { c.strokeStyle = i === 2 ? "#fff6cc" : G.rgba(col, L[1]); c.lineWidth = L[0]; c.beginPath(); pts.forEach(function (p, j) { if (j) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.stroke(); });
    c.restore();
  }

  /* a bird in flight: a body, two wings that beat, a forked tail */
  function bird(c, x, y, sz, ph, dir, col, wing) {
    c.save(); c.translate(x, y); c.scale(dir * sz, sz); var w = sin(ph); c.strokeStyle = col; c.fillStyle = col; c.lineCap = "round"; c.lineJoin = "round";
    c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-3, -6 * w - 1, -10, -7 * w + 1); c.moveTo(0, 0); c.quadraticCurveTo(2, -5.4 * w - 1, 8, -6 * w + 1); c.stroke();
    c.beginPath(); c.moveTo(-5, 0.4); c.quadraticCurveTo(-1, -1.4, 5, 0); c.quadraticCurveTo(-1, 1.6, -5, 0.4); c.fill();
    c.lineWidth = 0.9; c.beginPath(); c.moveTo(-5, 0.4); c.lineTo(-9, 2); c.moveTo(-5, 0.4); c.lineTo(-8.6, -0.8); c.stroke();
    c.restore();
  }

  /* ================================================================ the dragon of Rouen: five panels */
  function tri(v) { v = v % 2; if (v < 0) v += 2; return v < 1 ? v : 2 - v; }
  var R0 = { wins: null, houses: [] };
  var HOUSES = [[366, 32, 56, "gable", 9, 0.55], [404, 34, 52, "gable", 1, 0.7], [444, 30, 68, "tall", 2, 0.85], [484, 40, 46, "long", 3, 0.5], [556, 34, 60, "gable", 4, 0.65],
                [596, 40, 50, "long", 5, 0.55], [634, 30, 72, "tall", 6, 0.9], [672, 36, 54, "gable", 7, 0.6], [708, 34, 62, "gable", 8, 0.75]];
  function sheen(c, x, y, w, t, col) { c.save(); c.strokeStyle = col || "rgba(255,255,255,.55)"; c.lineWidth = 0.9; c.lineCap = "round"; for (var i = 0; i < 9; i++) { var xx = x + ((i * 83 + t * 0.012 * (1 + (i % 3) * 0.3)) % w); c.globalAlpha = 0.25 + 0.4 * abs(sin(t * 0.0011 + i)); c.beginPath(); c.moveTo(xx, y + (i % 4) * 14); c.lineTo(xx + 10 + (i % 3) * 5, y + (i % 4) * 14); c.stroke(); } c.restore(); }

  function rouen0(c, W, H, st, F, t, u) {
    var GY = 300, pms = pokeOf(st);
    layer(c, W, H, "r0", function (g) {
      enter(g, F);
      sky(g, F.x0, F.y0, F.w, 294, "#8da6b2", 11);
      church(g, 520, 292, 72);
      R0.wins = []; R0.houses = [];
      HOUSES.forEach(function (h, i) { var w = house(g, { x: h[0], base: 292, w: h[1], h: h[2], style: h[3], seed: h[4], pitch: h[5] }); R0.houses.push([h[0], h[1], h[2], w]); w.forEach(function (q) { R0.wins.push(q.concat(i)); }); if (w.chim) R0.houses[i].chim = w.chim; });
      earth(g, F.x0, 292, F.w, 9, "#8a7a5c", 12, 0.9);
      g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(F.x0, 301); g.lineTo(F.x0 + F.w, 301); g.stroke();
      wash(g, F.x0, 301, F.w, F.y0 + F.h - 301, "#6da1a8", 13, 0.42);
      var r = G.rng(14); g.strokeStyle = G.rgba(INK, 0.22); g.lineWidth = 0.7; g.lineCap = "round";
      for (var yy = 306; yy < F.y0 + F.h; yy += 5.5) { var u2 = (yy - 301) / 100; for (var xx = F.x0 + r() * 20; xx < F.x0 + F.w; xx += 14 + r() * 26) { var l = 8 + r() * 22 * (0.4 + u2); g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + l, yy + (r() - 0.5) * 1.2); g.stroke(); } }
      /* the marsh bank in the near left corner */
      g.save(); g.beginPath(); g.moveTo(F.x0, 346); g.bezierCurveTo(60, 340, 120, 352, 168, 370); g.bezierCurveTo(190, 380, 200, 392, 210, F.y0 + F.h + 2); g.lineTo(F.x0, F.y0 + F.h + 2); g.closePath(); g.clip();
      earth(g, F.x0, 338, 260, F.h, "#6f7a48", 15, 1.1); g.restore();
      g.strokeStyle = INK; g.lineWidth = 1.3; g.beginPath(); g.moveTo(F.x0, 346); g.bezierCurveTo(60, 340, 120, 352, 168, 370); g.bezierCurveTo(190, 380, 200, 392, 210, F.y0 + F.h + 2); g.stroke();
      g.restore();
    });
    enter(c, F);
    /* rain, ripples, light on the water */
    streaks(c, F.x0, F.y0, F.w, 300 - F.y0, t, 46, 0.14, "rgba(46,62,84,.5)", 5, 0.55);
    sheen(c, F.x0, 312, F.w, t);
    /* the town's windows and chimney smoke; a tap on a house floods its windows with light */
    var tapH = -1, tapMs = -1;
    R0.houses.forEach(function (h, i) { var m = tapHit(st, F, h[0], 292 - h[2] * 0.5, 26, false); if (m >= 0 && tapH < 0) { tapH = i; tapMs = m; } });
    (R0.wins || []).forEach(function (q, i) {
      var base = ((i * 37) % 10) < 5 ? 0.55 + 0.15 * sin(t * 0.0013 + i * 1.7) : 0.0, fl = q[4] === tapH ? env(tapMs, 1200) : 0, a = max(base, fl);
      if (a < 0.02) return; c.fillStyle = "rgba(255,214,110," + (0.9 * a) + ")"; c.fillRect(q[0] + 0.6, q[1] + 0.6, q[2] - 1.2, q[3] - 1.2);
      c.fillStyle = "rgba(255,200,90," + (0.22 * a) + ")"; c.beginPath(); c.arc(q[0] + q[2] / 2, q[1] + q[3] / 2, 8, 0, 7); c.fill();
    });
    R0.houses.forEach(function (h, i) {
      if (!h.chim) return;
      for (var k = 0; k < 3; k++) { var ph = (t * 0.00035 + k / 3 + i * 0.21) % 1; c.fillStyle = "rgba(96,98,104," + 0.34 * (1 - ph) + ")"; c.beginPath(); c.arc(h.chim[0] + sin(ph * 5 + i) * 3 + ph * 8, h.chim[1] - ph * 22, 2 + ph * 4.5, 0, 7); c.fill(); }
    });
    /* tiny townspeople running along the quay, away from the water */
    [[0, 390, 700, 0.00006, "#8a5a3a"], [1, 410, 690, 0.00008, "#3d5a7a"], [2, 380, 640, 0.00005, "#c9b27a"], [3, 440, 710, 0.00007, "#7a3a3a"], [4, 520, 705, 0.00009, "#5c6a4a"], [5, 400, 560, 0.00011, "#6a4a7a"]].forEach(function (R, i) {
      var v = t * R[3] * 2 + i * 0.37, p = tri(v), dir = (v % 2 + 2) % 2 < 1 ? 1 : -1;
      runner(c, G.lerp(R[1], R[2], p), 293 + (i % 3) * 3.4, 15 + (i % 3) * 1.3, R[4], dir, t * 0.016 + i, false);
    });
    if (tapH >= 0) { var hh = R0.houses[tapH]; c.save(); c.globalAlpha = G.clamp(env(tapMs, 1400) * 3, 0, 1); runner(c, hh[0] + hh[1] * 0.18, 293, 19, "#d94a2a", 1, t * 0.012, true); c.restore(); }
    /* the overturned boat rocks at the edge of the quay */
    boat(c, 372, 316 + sin(t * 0.0017) * 0.8, 44, -0.06 + sin(t * 0.0015) * 0.03);
    c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 0.9; for (var q = 0; q < 2; q++) { var pp = (t * 0.0009 + q / 2) % 1; c.globalAlpha = 1 - pp; c.beginPath(); c.ellipse(372, 320, 24 + pp * 10, 3 + pp, 0, 0, 7); c.stroke(); } c.globalAlpha = 1;
    /* the dragon in the Seine; a tap makes it snort and the flame doubles for 400 ms */
    var dm = tapHit(st, F, 150, 215, 88, true), dbl = dm >= 0 && dm < 400 ? sin(PI * dm / 400) : 0;
    G.dragon(c, 30, 139, 260, { t: t, water: 124, waterCol: "#6da1a8", open: 1, poke: dm });
    var mo = G.dragonMouth(30, 139, 260, {});
    /* fire from the jaws: the legend's dragon burns and eats; its own fire later tempers its head */
    (function () {
      var len = 120 + dbl * 60 + sin(t * 0.011) * 9, x0 = mo.x - 2, y0 = mo.y + 2;
      for (var f = 0; f < 4; f++) {
        var L = len * (1 - f * 0.18), w = 22 - f * 4.4, wob = sin(t * 0.017 + f * 1.9) * 4, col = ["#ff5a1f", "#ff8a1f", "#ffc02e", "#fff2a8"][f];
        c.fillStyle = col; c.globalAlpha = 0.9 - f * 0.08; c.beginPath(); c.moveTo(x0, y0 - w * 0.35);
        c.quadraticCurveTo(x0 + L * 0.5, y0 - w - 2 + wob, x0 + L, y0 - 6 + wob * 1.4);
        c.quadraticCurveTo(x0 + L * 0.55, y0 + w * 0.9 + wob * 0.5, x0, y0 + w * 0.35); c.fill();
      }
      for (var k = 0; k < 7; k++) { var ph = (t * 0.0016 + k / 7) % 1; c.globalAlpha = 1 - ph; c.fillStyle = "#ffb347"; c.beginPath(); c.arc(x0 + len * (0.6 + ph * 0.5), y0 - 8 - ph * 26 + sin(k * 3.1) * 6, 2.2 * (1 - ph) + 0.6, 0, 7); c.fill(); }
      c.globalAlpha = 1;
    })();
    reeds(c, F.x0, 200, 388, t, 46, 40, 84, 3, "#5d6a3c");
    reeds(c, F.x0, 150, 398, t, 26, 56, 100, 8, "#46552e");
    c.restore();
  }

  function rouen1(c, W, H, st, F, t, u) {
    var GY = 312, T = t * 0.028 + u * 86, S = 36, pms = pokeOf(st);
    layer(c, W, H, "r1", function (g) {
      enter(g, F);
      sky(g, F.x0, F.y0, F.w, 306, "#b3a7b6", 21);
      g.fillStyle = G.rgba(INK, 0.16); var r = G.rng(22); g.beginPath(); g.moveTo(F.x0, 306); for (var x = F.x0; x < F.x0 + F.w; x += 14) g.lineTo(x, 296 - r() * 14 - 4 * sin(x * 0.02)); g.lineTo(F.x0 + F.w, 306); g.fill();
      earth(g, F.x0, 304, F.w, F.y0 + F.h - 304, "#8c7b62", 23, 1.2);
      g.save(); g.beginPath(); g.moveTo(500, 316); g.bezierCurveTo(540, 308, 600, 312, F.x0 + F.w + 2, 306); g.lineTo(F.x0 + F.w + 2, F.y0 + F.h + 2); g.lineTo(480, F.y0 + F.h + 2); g.bezierCurveTo(500, 380, 470, 340, 500, 316); g.closePath(); g.clip();
      wash(g, 470, 300, 300, 200, "#6c9da3", 24, 0.45); g.restore();
      g.strokeStyle = INK; g.lineWidth = 1.1; g.beginPath(); g.moveTo(500, 316); g.bezierCurveTo(540, 308, 600, 312, F.x0 + F.w + 2, 306); g.stroke();
      g.restore();
    });
    enter(c, F);
    /* back reeds slide by at half speed: the world moves as they walk */
    reeds(c, 460, F.x0 + F.w + 20, 320, t, 40, 60, 100, 5, "#5d6a3c");
    for (var cl = 0; cl < 5; cl++) { var rx = ((cl * 190 - T * 0.5) % 950 + 950) % 950 - 120; reeds(c, rx, rx + 40, 306, t, 8, 24, 46, 30 + cl, "#6b7448"); }
    /* the dragon peers from the reeds, eye on the saint */
    var dm = tapHit(st, F, 520, 230, 70, false);
    G.dragon(c, 440, 150, 250, { t: t, headOnly: true, flip: true, poke: dm, bow: 0 });
    reeds(c, 440, F.x0 + F.w + 20, 352, t, 50, 56, 96, 6, "#46552e");
    /* footprints trailing back from the figures, sliding left */
    var Rx = 215 + u * 0, k0 = Math.max(0, Math.floor((T - 800) / S));
    for (var k = k0; k * S <= T; k++) { var px = Rx - 12 - (T - k * S), py = GY + 2 + (k % 2 ? 4 : -2); if (px > -10) { c.globalAlpha = G.clamp((px + 10) / 100, 0.15, 1); prints(c, px, py, 2.6, k % 2 ? 1 : -1); prints(c, px - 105, py + 8 - (k % 2 ? 6 : -1), 2.1, k % 2 ? 1 : -1); } }
    c.globalAlpha = 1;
    /* the condemned man behind, Romanus lifting the cross */
    var ph = T * PI / S, tP = tapHit(st, F, 125, 215, 60, false), tR = tapHit(st, F, Rx, 190, 70, true);
    figure(c, Rx - 105, GY + 8, 214, pal("#8d7f6a", "#c4b8a0", "#4e4437", "#1e1810"), { prisoner: 1, dir: 1, t: t, seed: 2, ph: ph + 1.2, poke: tP, aF: 0.15, bF: 0.3, aB: 0.1, bB: 0.25, mood: "fear", look: [0.4, 0.1] });
    figure(c, Rx + 6, GY + 4, 238, pal("#d1ba7e", "#f2e6b8", "#80702f", "#2a2210"), { saint: 1, dir: 1, xs: 0.88, t: t, seed: 1, ph: ph, poke: tR, aF: 0.95, bF: 1.55, hF: "grip", cross: 1, flare: env(tR, 1200), look: [0.6, -0.1], mood: "awe" });
    c.restore();
  }

  function rouen2(c, W, H, st, F, t, u) {
    var GY = 318, pms = pokeOf(st);
    layer(c, W, H, "r2", function (g) {
      enter(g, F);
      sky(g, F.x0, F.y0, F.w, 310, "#e0c78a", 31);
      earth(g, F.x0, 308, F.w, F.y0 + F.h - 308, "#9a8e62", 33, 1.1);
      g.restore();
    });
    enter(c, F);
    var tR = tapHit(st, F, 190, 200, 80, false), tD = tapHit(st, F, 520, 220, 130, true);
    var cu = tR >= 0 ? G.clamp(tR / 1000, 0, 1) : u;
    /* the saint's light, behind his head */
    var gl = c.createRadialGradient(190, 108, 0, 190, 108, 190); gl.addColorStop(0, "rgba(255,238,170,.7)"); gl.addColorStop(1, "rgba(255,238,170,0)"); c.fillStyle = gl; c.fillRect(F.x0, F.y0, F.w, F.h);
    /* the dragon bows, eyes shut, led by the stole */
    G.dragon(c, 392, 318 - 162 * 1.5, 300, { t: t, flip: true, bow: u, poke: tD, blink: 0 });
    var nk = neckPts(u), np = nk[2], dxn = 392 + (200 - np[0]) * 1.5, dyn = 318 - 162 * 1.5 + np[1] * 1.5;
    var fR = figure(c, 188, GY, 268, pal("#d1ba7e", "#f2e6b8", "#80702f", "#2a2210"), { saint: 1, dir: 1, t: t, seed: 1, poke: tR, aF: 0.55, bF: 1.9, hF: "bless", stole: false, flare: env(tR, 1200), look: [0.7, -0.05], mood: "awe" });
    /* the stole: a 2.5 px band from his neck that droops under its own weight in a catenary to the dragon's neck, passing behind the prisoner, once round the neck */
    var N = [fR.neck[0] + 3, fR.neck[1] + 4], D = [dxn, dyn], span = hyp(D[0] - N[0], D[1] - N[1]), sg = span * 0.17 + sin(t * 0.002) * 2;
    var pq = function (u) { var cx2 = (N[0] + D[0]) / 2, cy2 = (N[1] + D[1]) / 2 + sg * 2; return [(1 - u) * (1 - u) * N[0] + 2 * u * (1 - u) * cx2 + u * u * D[0], (1 - u) * (1 - u) * N[1] + 2 * u * (1 - u) * cy2 + u * u * D[1]]; };
    c.save(); c.lineCap = "round"; c.lineJoin = "round";
    [[8.4, INK], [6, "#bd3a22"]].forEach(function (L) { c.strokeStyle = L[1]; c.lineWidth = L[0]; c.beginPath(); for (var j = 0; j <= 24; j++) { var q = pq(j / 24); if (j) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); } c.stroke(); });
    c.strokeStyle = "#e4b83a"; c.lineWidth = 0.9; c.setLineDash([2.4, 6]); c.beginPath(); for (var j2 = 0; j2 <= 24; j2++) { var q2 = pq(j2 / 24); if (j2) c.lineTo(q2[0], q2[1] - 1.2); else c.moveTo(q2[0], q2[1] - 1.2); } c.stroke(); c.setLineDash([]);
    [[8.4, INK], [6, "#bd3a22"]].forEach(function (L) { c.strokeStyle = L[1]; c.lineWidth = L[0] * 0.9; c.beginPath(); c.ellipse(D[0] + 2, D[1], 11, 5, 0.9, 0, 7); c.stroke(); });
    c.restore();
    var fP = figure(c, 322, GY + 4, 232, pal("#8d7f6a", "#c4b8a0", "#4e4437", "#1e1810"), { prisoner: 1, dir: 1, t: t, seed: 2, aF: 0.7, bF: 0.45, aB: 0.12, bB: 0.2, mood: "awe", look: [0.7, 0.1], poke: tapHit(st, F, 322, 205, 60, false) });
    /* his hand closes on the band where it passes */
    var qh = pq(0.62); c.save(); c.strokeStyle = INK; c.lineWidth = 7.4; c.lineCap = "round"; c.beginPath(); c.moveTo(fP.hand[0] + 3, fP.hand[1] - 1); c.lineTo(fP.hand[0] + 7, fP.hand[1] + 1); c.stroke(); c.strokeStyle = "#bd3a22"; c.lineWidth = 5; c.stroke(); c.restore();
    /* the cross drawn in light: the upright first, then the arm, toward the dragon */
    var cx = 452, top = 74, bot = 160, ay = 100, l0 = cx - 36, l1 = cx + 36;
    var vp = G.clamp(cu / 0.5, 0, 1), hp = G.clamp((cu - 0.5) / 0.5, 0, 1);
    if (vp > 0) glowLine(c, [[cx, top], [cx, top + (bot - top) * vp]], "#ffd96a", 3.2);
    if (hp > 0) glowLine(c, [[l0, ay], [l0 + (l1 - l0) * hp, ay]], "#ffd96a", 3.2);
    var tip = hp > 0 ? [l0 + (l1 - l0) * hp, ay] : [cx, top + (bot - top) * vp];
    if (cu < 1) { c.fillStyle = "rgba(255,250,214,.95)"; c.beginPath(); c.arc(tip[0], tip[1], 3 + sin(t * 0.03) * 0.8, 0, 7); c.fill(); }
    for (var q = 0; q < 8; q++) { var ph2 = (t * 0.0007 + q / 8) % 1; c.fillStyle = "rgba(255,230,140," + (1 - ph2) * 0.8 + ")"; c.beginPath(); c.arc(cx + sin(q * 2.3) * 40 * (0.4 + ph2), 100 + q * 9 + ph2 * 26 * (cu > 0.5 ? 1 : 0.4), 1.2 + (q % 3) * 0.4, 0, 7); c.fill(); }
    c.restore();
  }

  /* the crowd: authored figures in a 100-unit frame, feet at the origin, facing right toward the fire. Each is a dark silhouette with its own interior
     lines (cloak folds, a hood's edge, a profile) and an orange rim on the side the fire lights. */
  var CROWDK = ["hood", "mother", "fists", "monk", "torch", "dog", "hat", "child", "bonnet", "staff"];
  function crowdFig(c, x, base, h, kind, dir, t, fk, sd) {
    var k = h / 100, sway = sin(t * 0.0021 + sd * 1.7) * 0.9, K = CROWDK[kind % CROWDK.length], fold = "rgba(140,150,205,.34)", dark = sd % 2 ? "#0b0c18" : "#13142b";
    c.save(); c.translate(x, base); c.scale(dir * k, k); c.translate(0, sway * 0.4); c.lineCap = "round"; c.lineJoin = "round";
    /* fill a path in the silhouette colour, then wash the fire's side of it with orange light */
    var shape = function (build, rimW) {
      c.beginPath(); build(); c.fillStyle = dark; c.fill();
      c.save(); c.clip(); var g = c.createLinearGradient(-22, 0, 22, 0); g.addColorStop(0, "rgba(255,150,70,0)"); g.addColorStop(0.55, "rgba(255,150,70,0)"); g.addColorStop(1, "rgba(255,150,70," + 0.62 * fk * (rimW || 1) + ")"); c.fillStyle = g; c.fillRect(-30, -130, 60, 134);
      var gt = c.createLinearGradient(0, -110, 0, -50); gt.addColorStop(0, "rgba(255,170,90," + 0.18 * fk + ")"); gt.addColorStop(1, "rgba(255,170,90,0)"); c.fillStyle = gt; c.fillRect(-30, -110, 60, 60); c.restore();
    };
    var line = function (pts, col, w) { c.strokeStyle = col || fold; c.lineWidth = (w || 0.9) / k * 0.9 + 0.3; c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.stroke(); };
    var cloak = function (w, sh, top) { shape(function () { c.moveTo(-w, 0); c.quadraticCurveTo(-w - 2, top * 0.45, -sh, top); c.lineTo(sh, top); c.quadraticCurveTo(w + 2, top * 0.45, w, 0); c.closePath(); }); line([[-w * 0.45, -2], [-w * 0.3, top * 0.5], [-sh * 0.5, top + 4]]); line([[w * 0.1, -2], [w * 0.05, top * 0.5], [0, top + 6]]); line([[w * 0.6, -2], [w * 0.5, top * 0.45], [sh * 0.6, top + 4]]); };
    var head = function (cx, cy, r, nose) { shape(function () { c.arc(cx, cy, r, 0, 7); if (nose) { c.moveTo(cx + r - 1, cy - 2); c.lineTo(cx + r + 2.6, cy + 1); c.lineTo(cx + r - 1, cy + 2.6); } }, 1.3); };
    var arm = function (x0, y0, x1, y1, w) { c.strokeStyle = dark; c.lineWidth = w || 5; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = "rgba(255,150,70," + 0.5 * fk + ")"; c.lineWidth = 1; c.beginPath(); c.moveTo(x0 + (w || 5) * 0.35, y0); c.lineTo(x1 + (w || 5) * 0.35, y1); c.stroke(); };
    if (K === "hood") {
      cloak(17, 10, -62);
      shape(function () { c.moveTo(-12, -58); c.quadraticCurveTo(-13, -82, 1, -98); c.quadraticCurveTo(12, -80, 12, -58); c.closePath(); }, 1.3);
      c.fillStyle = "rgba(0,0,0,.75)"; c.beginPath(); c.ellipse(4, -74, 4.4, 7, 0, 0, 7); c.fill();                      /* the dark of the hood's mouth */
      line([[-9, -62], [-3, -80], [-1, -94]]); line([[-12, -58], [0, -56], [11, -58]], "rgba(255,150,70,.4)");
      arm(7, -58, 13, -40, 4);
    } else if (K === "mother") {
      cloak(18, 11, -62); head(0, -70, 8.6, true); line([[-8, -72], [-2, -80], [6, -76]]);                                 /* a headscarf's edge */
      shape(function () { c.moveTo(-8, -64); c.lineTo(-7, -90); c.lineTo(5, -92); c.lineTo(6, -64); c.closePath(); }, 1);        /* the child sits on her shoulders */
      head(-1, -101, 5.6, true); arm(5, -94, 15, -111, 3); arm(-7, -80, -11, -68, 3);
      line([[-3, -90], [-1, -76]]);
    } else if (K === "fists") {
      cloak(16, 10, -62); head(0, -71, 8.8, true); line([[-6, -76], [0, -79], [6, -76]], "rgba(140,150,205,.3)");
      arm(-8, -60, -16, -100, 5); arm(8, -60, 17, -104, 5); [[-16, -102], [17, -106]].forEach(function (f) { shape(function () { c.arc(f[0], f[1], 3.6, 0, 7); }, 1.2); });
    } else if (K === "monk") {
      cloak(17, 10, -62); shape(function () { c.moveTo(-11, -60); c.quadraticCurveTo(-14, -78, 0, -86); c.quadraticCurveTo(13, -78, 11, -60); c.closePath(); }, 1.3);
      c.fillStyle = "rgba(0,0,0,.7)"; c.beginPath(); c.ellipse(4, -72, 4, 6, 0, 0, 7); c.fill();
      line([[-8, -64], [-3, -80], [3, -85]]); c.strokeStyle = "rgba(200,170,110,.7)"; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-9, -52); c.quadraticCurveTo(-6, -30, 0, -20); c.stroke();     /* a rope belt with its tail */
      arm(8, -58, 15, -84, 4);
      c.strokeStyle = "#ecdcb0"; c.lineWidth = 2.8; c.beginPath(); c.moveTo(16, -84); c.lineTo(16, -112); c.moveTo(9, -103); c.lineTo(23, -103); c.stroke();
      c.strokeStyle = "rgba(255,170,80," + 0.6 * fk + ")"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(17, -84); c.lineTo(17, -108); c.stroke();
    } else if (K === "torch") {
      cloak(15, 9, -62); head(0, -71, 8.6, true); line([[-5, -78], [3, -81]], "rgba(140,150,205,.3)");
      arm(7, -60, 15, -92, 4.4); c.strokeStyle = "#8a6238"; c.lineWidth = 2.6; c.beginPath(); c.moveTo(15, -90); c.lineTo(17, -116); c.stroke();
      var fl = 0.8 + 0.2 * sin(t * 0.02 + sd) + 0.1 * sin(t * 0.047 + sd * 2), gg = c.createRadialGradient(17, -122, 1, 17, -122, 22); gg.addColorStop(0, "rgba(255,190,90," + 0.5 * fl + ")"); gg.addColorStop(1, "rgba(255,150,60,0)"); c.fillStyle = gg; c.fillRect(-8, -150, 50, 50);
      [["#d94a1c", 1], ["#ff9a2a", 0.7], ["#ffe08a", 0.38]].forEach(function (F2) { c.fillStyle = F2[0]; c.beginPath(); c.moveTo(17 - 4 * F2[1], -116); c.quadraticCurveTo(17 - 4.6 * F2[1], -124 - 5 * fl * F2[1], 17 + sin(t * 0.03 + sd) * 2, -132 * (0.96 + 0.06 * fl) - 3 * F2[1]); c.quadraticCurveTo(17 + 5 * F2[1], -122, 17 + 4 * F2[1], -116); c.fill(); });
    } else if (K === "dog") {
      c.fillStyle = dark;
      shape(function () { c.moveTo(-16, -20); c.quadraticCurveTo(-8, -32, 6, -30); c.quadraticCurveTo(14, -30, 18, -36); c.lineTo(26, -33); c.lineTo(28, -29); c.lineTo(20, -25); c.quadraticCurveTo(14, -20, 10, -16); c.lineTo(-12, -14); c.closePath(); }, 1.3);
      shape(function () { c.moveTo(16, -36); c.lineTo(15, -44); c.lineTo(20, -39); c.closePath(); }, 1);
      [[-13, -3], [-8, 2], [8, -2], [12, 3]].forEach(function (L, i) { c.strokeStyle = dark; c.lineWidth = 3; c.beginPath(); c.moveTo(L[0], -16); c.lineTo(L[0] + L[1] * 0.6, 0); c.stroke(); });
      c.strokeStyle = dark; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-16, -21); c.quadraticCurveTo(-26, -26 + sin(t * 0.012 + sd) * 4, -28, -36 + sin(t * 0.012 + sd) * 6); c.stroke();     /* the tail wags */
      line([[-8, -26], [-2, -20], [4, -24]]); c.fillStyle = "rgba(255,200,120,.8)"; c.beginPath(); c.arc(22, -33, 0.9, 0, 7); c.fill();
    } else if (K === "hat") {
      cloak(15, 10, -60); head(0, -69, 8.4, true);
      shape(function () { c.ellipse(0, -77, 15, 3.6, 0, 0, 7); }, 1.2); shape(function () { c.moveTo(-8, -77); c.lineTo(-6, -92); c.lineTo(6, -92); c.lineTo(8, -77); c.closePath(); }, 1.1);
      arm(8, -58, 27, -66, 4.4); line([[-6, -90], [6, -90]], "rgba(140,150,205,.3)");
    } else if (K === "child") {
      shape(function () { c.moveTo(-9, 0); c.quadraticCurveTo(-10, -22, -6, -34); c.lineTo(6, -34); c.quadraticCurveTo(10, -22, 9, 0); c.closePath(); }, 1); head(0, -42, 8, true);
      arm(-6, -30, -12, -52, 3.6); arm(6, -30, 12, -50, 3.6); line([[-2, -4], [-2, -26]]);
    } else if (K === "bonnet") {
      shape(function () { c.moveTo(-22, 0); c.quadraticCurveTo(-18, -34, -8, -60); c.lineTo(8, -60); c.quadraticCurveTo(18, -34, 22, 0); c.closePath(); }); line([[-12, -2], [-8, -40]]); line([[2, -2], [0, -50]]); line([[14, -2], [9, -40]]);
      head(0, -68, 8.2, true); shape(function () { c.moveTo(-9, -66); c.quadraticCurveTo(-12, -82, 2, -80); c.quadraticCurveTo(12, -76, 8, -64); c.closePath(); }, 1.2); line([[-8, -70], [-2, -77]]);
    } else {
      cloak(16, 10, -62); head(0, -71, 8.6, true);
      c.strokeStyle = "#3a2410"; c.lineWidth = 2.2; c.beginPath(); c.moveTo(14, 0); c.lineTo(15, -96); c.stroke(); arm(8, -58, 14, -50, 4);
    }
    c.restore();
  }

  /* the cathedral's west front as a lit stone wall: two blocks and a gable, buttresses, three portals, a gallery of small arches, lancets, and a rose window set in a ring of tracery */
  var NSTONE = pal("#2a2c48", "#4d5176", "#101224", "#06070f"), NLITE = pal("#383b5c", "#6a6f9a", "#161830", "#08091a");
  function facadePath(g) {
    g.beginPath(); g.moveTo(10, 340); g.lineTo(10, 78); g.lineTo(22, 70); g.lineTo(22, 60); g.lineTo(30, 48); g.lineTo(38, 60); g.lineTo(38, 70);
    g.lineTo(322, 70); g.lineTo(322, 60); g.lineTo(330, 48); g.lineTo(338, 60); g.lineTo(338, 108);
    g.lineTo(410, 126); g.lineTo(470, 84); g.lineTo(530, 126); g.lineTo(602, 108); g.lineTo(602, 60); g.lineTo(610, 48); g.lineTo(618, 60); g.lineTo(618, 70);
    g.lineTo(922, 70); g.lineTo(922, 340); g.closePath();
  }
  function rouen3Facade(g, F, CX, RY) {
    g.save(); facadePath(g); g.fillStyle = "#1c1e36"; g.fill(); g.clip();
    G.ashlar(g, 0, 40, 930, 300, NSTONE, { course: 20, seed: 9 });
    /* firelight climbs the stone from below */
    var fg = g.createLinearGradient(0, 340, 0, 110); fg.addColorStop(0, "rgba(255,140,60,.3)"); fg.addColorStop(0.5, "rgba(255,120,50,.08)"); fg.addColorStop(1, "rgba(255,120,50,0)"); g.fillStyle = fg; g.fillRect(0, 40, 930, 300);
    /* string courses */
    [66, 154, 252].forEach(function (y) { G.cut(g, [[10, y], [330, y]], NSTONE, 1.1, { col: "rgba(150,158,210,.4)" }); G.cut(g, [[602, y], [930, y]], NSTONE, 1.1, { col: "rgba(150,158,210,.4)" }); });
    /* buttresses: tall pilasters with a sloping cap */
    [10, 106, 214, 322, 338, 602, 618, 720].forEach(function (bx, i) {
      var w = i === 3 || i === 4 || i === 5 || i === 6 ? 6 : 9;
      G.part(g, [[bx - w, 340, 1], [bx - w, 84, 1], [bx + w, 84, 1], [bx + w, 340, 1]], NLITE, { lw: 0.9, steps: 1, seed: 20 + i, pits: false });
      G.part(g, [[bx - w, 84, 1], [bx - w + 2, 74, 1], [bx + w - 2, 74, 1], [bx + w, 84, 1]], NLITE, { lw: 0.8, steps: 1, seed: 40 + i, pits: false, lift: 1.3 });
      for (var y = 120; y < 330; y += 46) G.cut(g, [[bx - w, y], [bx + w, y + 5]], NLITE, 0.6);
    });
    /* lancets in the blocks, a pale warm gleam in the glass */
    [[60, 150], [160, 150], [270, 150], [660, 150], [60, 270], [160, 270], [270, 270], [660, 270]].forEach(function (L, i) {
      var x = L[0], y = L[1];
      G.part(g, [[x - 13, y + 36, 1], [x - 13, y - 6], [x, y - 24, 1], [x + 13, y - 6], [x + 13, y + 36, 1]], NLITE, { lw: 1, seed: 60 + i, steps: 4, pits: false });
      G.hollow(g, [[x - 8, y + 34], [x - 8, y - 4], [x, y - 17], [x + 8, y - 4], [x + 8, y + 34]], pal("#1a2036", "#3b4766", "#0a0d18", "#04060c"), { deep: 0.92, lw: 0.7 });
      g.fillStyle = "rgba(255,150,70,.12)"; g.fillRect(x - 8, y + 6, 16, 28); G.cut(g, [[x, y - 16], [x, y + 34]], NLITE, 0.7); G.cut(g, [[x - 8, y + 8], [x + 8, y + 8]], NLITE, 0.6);
    });
    /* the central gable: a rose window in a ring, a row of niches beneath the slopes, a gallery of small arches either side */
    var ring = [], ring2 = [], j; for (j = 0; j < 32; j++) { var a = j / 32 * PI * 2, rr = j % 2 ? 56 : 59; ring.push([CX + cos(a) * rr, RY + sin(a) * rr, 1]); } for (j = 31; j >= 0; j--) { var a2 = j / 32 * PI * 2; ring2.push([CX + cos(a2) * 42, RY + sin(a2) * 42, 1]); }
    var rp = ring.concat(ring2); rp.sp = true; G.part(g, rp, NLITE, { lw: 1.2, steps: 1, seed: 80 });
    for (j = 0; j < 12; j++) { var a3 = j / 12 * PI * 2 + 0.26; G.hollow(g, [[CX + cos(a3 - 0.12) * 46, RY + sin(a3 - 0.12) * 46], [CX + cos(a3) * 53, RY + sin(a3) * 53], [CX + cos(a3 + 0.12) * 46, RY + sin(a3 + 0.12) * 46]], NLITE, { deep: 0.6, lw: 0.5 }); }
    [[342, 410], [530, 598]].forEach(function (R, ri) {
      var n = 5, wd = (R[1] - R[0]) / n;
      G.part(g, [[R[0], 164, 1], [R[1], 164, 1], [R[1], 176, 1], [R[0], 176, 1]], NLITE, { lw: 0.8, steps: 1, seed: 90 + ri, pits: false });
      for (var q = 0; q < n; q++) { var ax = R[0] + q * wd; G.hollow(g, [[ax + 2, 202], [ax + 2, 188], [ax + wd / 2, 180], [ax + wd - 2, 188], [ax + wd - 2, 202]], NLITE, { deep: 0.85, lw: 0.6 }); G.part(g, [[ax - 1.5, 204, 1], [ax - 1.5, 180, 1], [ax + 1.5, 180, 1], [ax + 1.5, 204, 1]], NLITE, { lw: 0.5, steps: 1, pits: false }); }
      G.cut(g, [[R[0], 206], [R[1], 206]], NLITE, 0.8);
    });
    /* three portals with their archivolts and a figure-carved tympanum band */
    [[CX, 340, 26, 124], [CX - 62, 340, 17, 92], [CX + 62, 340, 17, 92]].forEach(function (P, i) {
      var px = P[0], pw = P[2], ph = P[3], top = 340 - ph;
      for (var r = 3; r >= 0; r--) { var rw = pw + r * 5, pts = [[px - rw, 340], [px - rw, top + 20], [px - rw * 0.7, top + 6], [px, top - 4 - r * 3], [px + rw * 0.7, top + 6], [px + rw, top + 20], [px + rw, 340]]; G.cut(g, pts, NLITE, 1.2 - r * 0.15, { col: "rgba(150,158,210," + (0.55 - r * 0.1) + ")", glint: r === 0 }); }
      G.hollow(g, [[px - pw, 340], [px - pw, top + 22], [px - pw * 0.7, top + 8], [px, top - 1], [px + pw * 0.7, top + 8], [px + pw, top + 22], [px + pw, 340]], pal("#0a0b16", "#161830", "#040409", "#020204"), { deep: 0.97, lw: 0.9 });
      G.cut(g, [[px - pw, top + 36], [px + pw, top + 36]], NLITE, 0.8); if (i === 0) G.cut(g, [[px, top + 36], [px, 340]], NLITE, 1.4);
    });
    g.restore();
  }

  function rouen3(c, W, H, st, F, t, u) {
    var GY = 336, pms = pokeOf(st), PX = -80, CX = 470;
    layer(c, W, H, "r3", function (g) {
      enter(g, F);
      wash(g, F.x0, F.y0, F.w, 340 - F.y0, "#2c3250", 41, 0.62);
      rouen3Facade(g, F, CX, 176);
      /* the parvis: dark cobbles */
      wash(g, F.x0, 340, F.w, F.y0 + F.h - 340, "#262436", 42, 0.7);
      var r = G.rng(43); g.strokeStyle = "rgba(200,190,170,.13)"; g.lineWidth = 0.8; g.lineCap = "round";
      for (var yy = 346; yy < F.y0 + F.h; yy += 6) for (var xx = F.x0 + r() * 12; xx < F.x0 + F.w; xx += 12 + r() * 14) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + 7 + r() * 8, yy + (r() - 0.5)); g.stroke(); }
      /* the pyre: two rows of logs behind the dragon */
      var wd = pal("#6b4a2c", "#b0804a", "#33200f", "#150c05");
      [[342, [150, 220, 290, 360]], [330, [182, 254, 326]]].forEach(function (R, ri) { R[1].forEach(function (lx, k) { var ly = R[0] + (k % 2) * 1.5; G.part(g, [[lx - 40, ly - 7], [lx + 40, ly - 7.6], [lx + 43, ly], [lx + 40, ly + 7.4], [lx - 40, ly + 7], [lx - 44, ly]], wd, { lw: 1.1, seed: 50 + ri * 9 + k }); G.cut(g, [[lx - 40, ly - 2], [lx, ly - 3], [lx + 36, ly - 2]], wd, 0.6); G.hollow(g, [[lx + 40, ly - 3], [lx + 43, ly], [lx + 40, ly + 3.4]], wd, { lw: 0.6 }); }); });
      g.restore();
    });
    enter(c, F);
    var tD = tapHit(st, F, 350, 170, 120, true), flare = tD >= 0 ? env(tD, 1000) : 0;
    /* the rose window glows; fire-light from the pyre breathes on the front */
    var fk = 0.85 + 0.15 * sin(t * 0.011) + 0.06 * sin(t * 0.027), rg = c.createRadialGradient(CX, 176, 2, CX, 176, 46);
    rg.addColorStop(0, "rgba(255,226,140,.95)"); rg.addColorStop(0.6, "rgba(232,120,52,.9)"); rg.addColorStop(1, "rgba(150,40,22,.85)");
    c.fillStyle = rg; c.beginPath(); c.arc(CX, 176, 41, 0, 7); c.fill();
    c.strokeStyle = "#16182a"; c.lineWidth = 2; c.beginPath(); c.arc(CX, 176, 41, 0, 7); c.stroke(); c.lineWidth = 1.4; c.beginPath(); c.arc(CX, 176, 12, 0, 7); c.stroke();
    for (var s = 0; s < 12; s++) { var a = s * PI / 6 + 0.2; c.beginPath(); c.moveTo(CX + cos(a) * 12, 176 + sin(a) * 12); c.lineTo(CX + cos(a) * 41, 176 + sin(a) * 41); c.stroke(); c.beginPath(); c.arc(CX + cos(a + 0.26) * 27, 176 + sin(a + 0.26) * 27, 5, 0, 7); c.stroke(); }
    var glow = c.createRadialGradient(250 + PX * 0, 300, 10, 250, 300, 340); glow.addColorStop(0, "rgba(255,150,60," + 0.5 * fk + ")"); glow.addColorStop(1, "rgba(255,120,40,0)"); c.fillStyle = glow; c.fillRect(F.x0, F.y0, F.w, F.h);
    /* tall flames behind the dragon, then the dragon, then the front logs and low flames */
    var tongue = function (fx, by, fh, fw, sw) { [[1, "rgba(190,40,24,.88)"], [0.72, "rgba(240,128,36,.92)"], [0.42, "rgba(255,222,104,.95)"]].forEach(function (L) { c.fillStyle = L[1]; var hh = fh * L[0], ww = fw * L[0]; c.beginPath(); c.moveTo(fx - ww, by); c.quadraticCurveTo(fx - ww * 0.7, by - hh * 0.55, fx + sw * L[0], by - hh); c.quadraticCurveTo(fx + ww * 0.8, by - hh * 0.5, fx + ww, by); c.closePath(); c.fill(); }); };
    var fx0 = 126, fx1 = G.lerp(170, 320, 0.4 + 0.6 * u), k;
    for (k = 0; k < 12; k++) { var fr = (k + 0.5) / 12, fx = G.lerp(fx0, fx1, fr); tongue(fx, 322, (60 + 90 * (0.5 + 0.5 * sin(k * 2.7 + 0.6)) * (1 - fr * 0.4)) * (1 - u * 0.2) * (0.8 + 0.2 * sin(t * 0.012 + k * 1.9)), 12 + (k % 3) * 3, sin(t * 0.008 + k * 1.3) * 8); }
    /* the head and neck are lit by the burning body: a bright halo behind them */
    var hg = c.createRadialGradient(262, 172, 4, 262, 172, 70); hg.addColorStop(0, "rgba(255,196,110," + 0.32 * fk + ")"); hg.addColorStop(1, "rgba(255,150,60,0)"); c.fillStyle = hg; c.fillRect(190, 100, 150, 150);
    G.dragon(c, 110, 318 - 162 * 1.5, 300, { t: t, char: 0.3 + 0.65 * u, gleam: 1, poke: tD });
    var wd2 = pal("#6b4a2c", "#b0804a", "#33200f", "#150c05");
    for (k = 0; k < 4; k++) { var lx = 130 + k * 62 + (k % 2) * 6, ly = 323 + (k % 2) * 3; G.part(c, [[lx - 40, ly - 8], [lx + 40, ly - 8.6], [lx + 44, ly], [lx + 40, ly + 8.4], [lx - 40, ly + 8], [lx - 44, ly]], wd2, { lw: 1.1, seed: 70 + k }); G.cut(c, [[lx - 38, ly - 2], [lx, ly - 3], [lx + 34, ly - 2]], wd2, 0.6); }
    for (k = 0; k < 14; k++) { var fr2 = (k + 0.5) / 14, fxx = G.lerp(fx0 + 6, fx1 + 4, fr2); tongue(fxx, 326, (22 + 26 * (0.5 + 0.5 * sin(k * 3.3 + 2))) * (1 - u * 0.2) * (0.75 + 0.25 * sin(t * 0.015 + k * 2.3)) * (1 + flare * 0.6), 8 + (k % 2) * 3, sin(t * 0.011 + k * 1.7) * 4); }
    /* sparks from a seeded list, and a column of smoke leaning off toward the window */
    var rs = G.rng(77);
    for (k = 0; k < 44; k++) { var sx = 125 + rs() * 190, sp = 0.03 + rs() * 0.05, life = 1500 + rs() * 2200, age = (t + rs() * life) % life, q = age / life;
      c.fillStyle = "rgba(255," + Math.round(230 - q * 150) + "," + Math.round(120 - q * 90) + "," + (1 - q) * 0.95 + ")"; c.beginPath(); c.arc(sx + sin(age * 0.004 + k) * 9 + age * 0.012, 316 - age * sp, 1 + rs() * 1.3, 0, 7); c.fill(); }
    for (k = 0; k < 15; k++) { var ph = (t * 0.00018 + k / 15) % 1, a2 = (ph < 0.1 ? ph * 10 : 1) * 0.3 * (1 - ph); c.fillStyle = "rgba(58,54,66," + a2 + ")"; c.beginPath(); c.arc(238 + ph * 110 + sin(ph * 6 + k) * 16, 262 - ph * 250, 12 + ph * 36, 0, 7); c.fill(); }
    /* the crowd: ten authored figures of different height, lit on the side toward the fire; one holds up a child, one shakes both fists, a monk raises a crucifix, a torch-bearer, a dog */
    var bot = F.y0 + F.h + 4, CR = [[28, 0, 74, 1], [78, 6, 66, 1], [128, 3, 80, 1], [176, 9, 62, 1], [232, 2, 88, 1], [300, 5, 70, 1], [392, 1, 78, -1], [452, 9, 60, -1], [510, 4, 84, -1], [566, 7, 56, -1], [626, 0, 80, -1], [684, 8, 72, -1]];
    CR.forEach(function (R, i) { crowdFig(c, R[0], bot + (i % 3) * 3 + (R[1] === 5 ? -4 : 0), R[2], R[1], R[3], t, fk, i + 1); });
    c.restore();
  }

  function rouen4(c, W, H, st, F, t, u) {
    var GY = 352, pms = pokeOf(st), SZ = 340, K = SZ / 200, BX = 304, BY = 168, OX = BX - 112 * K, OY = BY - 106 * K;
    layer(c, W, H, "r4", function (g) {
      enter(g, F);
      sky(g, F.x0, F.y0, F.w, 356, "#9aabb7", 61);
      earth(g, F.x0, GY, F.w, F.y0 + F.h - GY, "#7e7a6a", 62, 1.1);
      var lime = S.lime, glass = pal("#3b4766", "#6a789c", "#1a2036", "#0a0d18");
      /* the church wall, wet, with a lancet window */
      G.ashlar(g, F.x0, F.y0, 300 - F.x0, GY - F.y0, lime, { course: 22, seed: 8, wet: 0.5 });
      G.part(g, [[44, 268, 1], [44, 156], [52, 124], [88, 92, 1], [124, 124], [132, 156], [132, 268, 1]], lime, { lw: 1.4, seed: 63 });
      G.hollow(g, [[56, 262], [56, 160], [62, 132], [88, 106], [114, 132], [120, 160], [120, 262]], glass, { deep: 0.95 });
      [[72, 262, 72, 138], [88, 262, 88, 108], [104, 262, 104, 138]].forEach(function (m) { G.cut(g, [[m[0], m[1]], [m[2], m[3]]], lime, 1.3); });
      G.cut(g, [[56, 190], [120, 190]], lime, 1); G.cut(g, [[62, 150], [88, 140], [114, 150]], lime, 1.1); G.hollow(g, [[80, 130], [88, 118], [96, 130], [88, 138]], glass, { deep: 0.8 });
      G.part(g, [[36, 270, 1], [140, 270, 1], [136, 280, 1], [40, 280, 1]], lime, { lw: 1.2, seed: 64 });
      /* the string course that carries the gutter along the wall to the buttress */
      G.part(g, [[132, 82, 1], [222, 82, 1], [222, 96, 1], [132, 96, 1]], lime, { lw: 1.2, steps: 1, seed: 91 });
      G.cut(g, [[136, 89], [218, 89]], lime, 2.2, { col: "#2a3a46" });
      /* the buttress: three stages with sloped set-offs, a gablet, a pinnacle with crockets */
      G.part(g, [[196, GY, 1], [196, 262, 1], [300, 262, 1], [300, GY, 1]], lime, { lw: 1.4, steps: 1, seed: 65 });
      G.part(g, [[196, 262, 1], [206, 248, 1], [290, 248, 1], [300, 262, 1]], lime, { lw: 1.2, steps: 1, seed: 66, lift: 1.3 });
      G.part(g, [[206, 248, 1], [206, 152, 1], [290, 152, 1], [290, 248, 1]], lime, { lw: 1.4, steps: 1, seed: 67 });
      G.part(g, [[206, 152, 1], [216, 138, 1], [280, 138, 1], [290, 152, 1]], lime, { lw: 1.2, steps: 1, seed: 68, lift: 1.3 });
      G.part(g, [[216, 138, 1], [216, 74, 1], [280, 74, 1], [280, 138, 1]], lime, { lw: 1.4, steps: 1, seed: 69 });
      G.part(g, [[210, 74, 1], [248, 34, 1], [286, 74, 1]], lime, { lw: 1.4, steps: 1, seed: 70 });
      G.hollow(g, [[238, 74], [248, 56], [258, 74]], lime, { deep: 0.7 }); G.cut(g, [[244, 60], [248, 52], [252, 60]], lime, 0.8);
      G.part(g, [[242, 34, 1], [248, 6, 1], [254, 34, 1]], lime, { lw: 1.1, steps: 1, pits: false });
      [[0.3, -1], [0.55, 1], [0.78, -1]].forEach(function (cr) { G.leaf(g, 248 + cr[1] * 4, 34 - cr[0] * 26 + 8, cr[1] > 0 ? -0.5 : -2.64, 8, 2.4, 2, lime); });
      G.dot(g, 248, 5, 2.2, lime.light);
      for (var yy = GY - 18; yy > 160; yy -= 22) G.cut(g, [[196 + (yy < 262 ? 10 : 0), yy], [300 - (yy < 262 ? 10 : 0), yy]], lime, 0.6);
      /* the sloped chute down the buttress face to the neck, its groove, and the corbel under the head */
      G.part(g, [[216, 78, 1], [226, 74, 1], [316, 160, 1], [318, 178, 1], [306, 180, 1], [214, 92, 1]], lime, { lw: 1.2, steps: 1, seed: 92 });
      G.cut(g, [[222, 86], [262, 118], [308, 166]], lime, 2.4, { col: "#2a3a46" });
      [[290, 178, 348, 194], [290, 194, 338, 208], [290, 208, 326, 222], [290, 222, 314, 234]].forEach(function (b, i) { G.part(g, [[b[0], b[1], 1], [b[2], b[1], 1], [b[2] - 4, b[3], 1], [b[0], b[3], 1]], lime, { lw: 1.2, steps: 1, seed: 80 + i }); });
      /* stains run down from the corbel and the wall under the gutter */
      var rs = G.rng(95); g.fillStyle = "rgba(38,58,48,.3)";
      for (var k = 0; k < 9; k++) { var sx = 292 + rs() * 40, y0 = 232 + k * 2, sh = 20 + rs() * 90; g.beginPath(); g.moveTo(sx - 2.4, y0); g.quadraticCurveTo(sx - 1.2, y0 + sh * 0.6, sx, y0 + sh); g.quadraticCurveTo(sx + 1.2, y0 + sh * 0.6, sx + 2.4, y0); g.fill(); }
      for (k = 0; k < 6; k++) { var sx3 = 140 + k * 14 + rs() * 6, sh3 = 16 + rs() * 40; g.beginPath(); g.moveTo(sx3 - 2, 96); g.quadraticCurveTo(sx3 - 1, 96 + sh3 * 0.6, sx3, 96 + sh3); g.quadraticCurveTo(sx3 + 1, 96 + sh3 * 0.6, sx3 + 2, 96); g.fill(); }
      g.restore();
    });
    enter(c, F);
    streaks(c, F.x0, F.y0, F.w, GY - F.y0, t, 80, 0.12, "rgba(46,62,84,.5)", 7, 0.6);
    /* water running along the string course and down the chute, chevrons moving toward the neck */
    var path = [[136, 89], [218, 89], [262, 118], [308, 166]], L = [0], q;
    for (q = 1; q < path.length; q++) L.push(L[q - 1] + hyp(path[q][0] - path[q - 1][0], path[q][1] - path[q - 1][1]));
    c.save(); c.strokeStyle = "rgba(196,230,250,.97)"; c.lineWidth = 1.7; c.lineCap = "round"; c.lineJoin = "round";
    for (var w = 0; w < 9; w++) {
      var d = ((t * 0.00055 + w / 9) % 1) * L[L.length - 1], j = 1; while (j < L.length - 1 && L[j] < d) j++;
      var f = (d - L[j - 1]) / (L[j] - L[j - 1]), px = G.lerp(path[j - 1][0], path[j][0], f), py = G.lerp(path[j - 1][1], path[j][1], f), an = Math.atan2(path[j][1] - path[j - 1][1], path[j][0] - path[j - 1][0]);
      c.save(); c.translate(px, py); c.rotate(an); c.beginPath(); c.moveTo(-3, -3.2); c.lineTo(2, 0); c.lineTo(-3, 3.2); c.stroke(); c.restore();
    }
    c.restore();
    /* the head and neck grow out of the corbel, a stone gargoyle with rain at its lip */
    var tD = tapHit(st, F, 410, 210, 120, true), dm = G.dragonMouth(OX, OY, SZ, { pose: "spout" });
    G.dragon(c, OX, OY, SZ, { t: t, headOnly: true, stone: "lime", pose: "spout", poke: tD });
    /* rain stains running down from the lip over the jaw */
    var rs2 = G.rng(96); c.fillStyle = "rgba(34,52,44,.34)";
    for (var k2 = 0; k2 < 7; k2++) { var sx2 = dm.x - 62 + k2 * 9, sy = dm.y - 4 + (k2 % 2) * 6 + abs(k2 - 3) * 1.6, sh2 = 16 + rs2() * 24; c.beginPath(); c.moveTo(sx2 - 1.6, sy); c.quadraticCurveTo(sx2 - 0.8, sy + sh2 * 0.6, sx2, sy + sh2); c.quadraticCurveTo(sx2 + 0.8, sy + sh2 * 0.6, sx2 + 1.6, sy); c.fill(); }
    var boost = tD >= 0 ? 1 + 0.7 * env(tD, 900) : 1;
    var end = rope(c, dm.x - 2, dm.y + 4, 0.085, 0.01, 0.0006, GY - 2, 8 * boost, t, { seed: 7, drops: 7 });
    c.fillStyle = "rgba(110,150,170,.45)"; c.beginPath(); c.ellipse(end[0], GY + 6, 50, 6, 0, 0, 7); c.fill();
    ripples(c, end[0], GY + 6, t, 3, 44, "rgba(255,255,255,.8)", 2);
    /* one small townsman stands in the rain with his head tipped back, watching the spout */
    figure(c, 618, GY + 16, 44, pal("#7a5a3a", "#c09a6a", "#3a2410", "#140c06"), { dir: -1, t: t, seed: 4, look: [-0.5, -1.4], aF: 0.2, bF: 0.3 });
    c.restore();
  }

  SC.rouen = { w: 720, h: 400,
    draw: function (c, W, H, st) {
      var step = st.arg != null ? +st.arg : (st.step || 0), t = st.t, u = st.u == null ? 1 : st.u, F = fit(W, H, 720, 400);
      var si = Math.max(0, Math.min(4, step | 0));
      [rouen0, rouen1, rouen2, rouen3, rouen4][si](c, W, H, st, F, t, u);
    } };

  /* ================================================================ the face that ate itself */
  var INDG = pal("#3c4a8e", "#7d8ed0", "#1a2150", "#0b0f2c"), ASH = "#f0e6d0";
  /* the creature is gilded sandstone: the same warm family as the kala plaque it ends as */
  var KST = { base: "#e0ac66", light: "#fde6b4", dark: "#7a4a1f", ink: "#30200d", pit: "#b78744" };
  var KFAR = { base: "#b98748", light: "#e8c590", dark: "#5a3516", ink: "#26170a", pit: "#8c6232" };
  var KMANE = pal("#c88a46", "#f8d89c", "#5e3414", "#26170a");
  var KTONGUE = pal("#c9564a", "#f08a78", "#7a2218", "#2a0a06");
  var KFANG = "#fff3d6";
  function spiralPts(x, y, r0, r1, turns, a0, dir) { var pts = [], n = Math.round(turns * 7), i, a, r; for (i = 0; i <= n; i++) { a = a0 + dir * i / n * turns * PI * 2; r = G.lerp(r1, r0, i / n); pts.push([x + cos(a) * r, y + sin(a) * r]); } return pts; }
  /* a lion's paw on the ground at (x, y): one polygon with its toes, cuts between them, a claw to each */
  function paw(c, x, y, dir, st, n, sz) {
    c.save(); c.translate(x, y); c.scale(dir * sz, sz);
    var p = [[-6, -13], [5, -14], [9, -10]], tx = 0, i;
    for (i = 0; i < n; i++) { tx = 10 + i * 4.8; p.push([tx - 1.3, -6.4 + i * 0.3], [tx + 0.5, -7 + i * 0.3], [tx + 2, -5.6 + i * 0.3], [tx + 2.4, -3.2, 1]); }
    p.push([tx + 2.4, 0, 1], [-7, 0, 1]);
    G.part(c, p, st, { lw: 1.1, pits: false, steps: 3 });
    for (i = 0; i < n - 1; i++) G.cut(c, [[12.5 + i * 4.8, -3.4], [11.6 + i * 4.8, -8]], st, 0.55);
    G.cut(c, [[-3, -10], [2, -7.5], [6, -9]], st, 0.5);
    for (i = 0; i < n; i++) G.lock(c, 11 + i * 4.8, -1.4, 0.5, 6, 1.5, 0.9, st, { lw: 0.6, base: st.light });
    c.restore();
  }
  /* the snarling lion-demon head in profile, facing right, ~100 units long (mouth tip at 98, 56): o.jaw (rad), o.jawS (jaw scale), o.t, o.blink, o.look
     A short blunt muzzle with a big nose disc, a heavy brow over a bulging eye, a ram-curl horn, a leaf ear, a mane of nine licking locks, two long fangs. */
  function kirtiHead(c, x, y, s, o) {
    o = o || {}; var st = KST, t = o.t || 0, jaw = o.jaw == null ? 0.2 : o.jaw, js = o.jawS == null ? 1 : o.jawS, i, lol = 2.2 * sin(t * 0.0031);
    c.save(); c.translate(x, y); c.scale(s / 100, s / 100);
    /* the mane behind the skull: nine locks of different length that lick back from nape, cheek and throat */
    [[30, 8, 0.95, 30, 6, 1.3], [22, 14, 0.62, 38, 7, -1.3], [16, 24, 0.3, 44, 8, 1.4], [12, 34, 0.05, 48, 8.5, -1.3], [12, 44, -0.22, 46, 8, 1.4], [14, 54, -0.46, 42, 7.5, -1.2], [18, 63, -0.72, 36, 7, 1.2], [26, 70, -1.0, 28, 6, -1.1], [36, 74, -1.3, 20, 5, 1]].forEach(function (L, k) {
      G.lock(c, L[0], L[1], PI + L[2] + sin(t * 0.0035 + k * 0.9) * 0.08, L[3], L[4], L[5], KMANE, { lw: 0.9 });
    });
    /* a ram-curl horn that sweeps up from the brow and winds back, ringed */
    var horn = tube(c, [[58, 14], [62, -6], [50, -20], [32, -20], [20, -8], [22, 6], [32, 10]], 15, 3.5, st, { lw: 1.1, seed: 321, ease: 1 });
    for (i = 1; i < 7; i++) { var hu = 0.1 + i * 0.12, hp = along(horn.cl, hu), ha = ang(horn.cl, hu), hw = G.lerp(15, 3.5, hu) / 2; G.cut(c, [[hp[0] - sin(ha) * hw, hp[1] + cos(ha) * hw], [hp[0] + cos(ha) * 1.6, hp[1] + sin(ha) * 1.6], [hp[0] + sin(ha) * hw, hp[1] - cos(ha) * hw]], st, 0.6); }
    /* the leaf-shaped ear behind the eye */
    G.part(c, [[40, 36], [26, 28], [20, 12], [27, 5, 1], [38, 14], [44, 28]], st, { lw: 1.1, pits: false, round: 0.5 });
    G.cut(c, [[36, 31], [28, 20], [28, 11]], st, 0.7); G.cut(c, [[39, 27], [34, 17]], st, 0.5);
    /* the hinged lower jaw: dark inside first, the tongue lolling over the lip, then the jaw and its fangs */
    G.hollow(c, [[26, 54], [94, 55], [90, 63], [64, 70], [40, 68]], st, { deep: 1 });
    G.rot(c, 30, 56, jaw, function () {
      c.save(); c.translate(30, 56); c.scale(js, js); c.translate(-30, -56);
      G.part(c, [[16, 52], [40, 58], [66, 60], [88, 58], [95, 60], [93, 69], [80, 77], [58, 81], [38, 79], [22, 69]], st, { lw: 1.3, round: 0.5, seed: 322 });
      G.part(c, [[52, 62], [76, 62], [90, 65], [97, 75 + lol], [93, 87 + lol], [84, 86 + lol], [81, 74], [64, 69]], KTONGUE, { lw: 0.9, pits: false, round: 0.6 });
      G.cut(c, [[86, 69], [88, 80 + lol]], KTONGUE, 0.5, { col: KTONGUE.dark });
      G.teeth(c, [[88, 60], [74, 61], [58, 61]], 3, 4, -1, st, { col: KFANG, fangs: [0] });
      G.cut(c, [[26, 68], [48, 74], [74, 72]], st, 0.6); G.cut(c, [[34, 62], [54, 67]], st, 0.5);
      G.lock(c, 56, 78, PI / 2 + 0.3, 22, 4.6, 1.1, KMANE, { lw: 0.8 }); G.lock(c, 44, 77, PI / 2 + 0.75, 18, 4, -1, KMANE, { lw: 0.8 });
      c.restore();
    });
    /* the skull, the heavy brow, the bulging eye in its socket, the nose disc */
    G.part(c, [[8, 36], [10, 24], [20, 14], [34, 8], [48, 6], [60, 9], [70, 15], [78, 19], [86, 24], [92, 30], [98, 35], [102, 41], [103, 49, 1], [100, 54, 1], [92, 55], [80, 56], [62, 57], [44, 57], [28, 55], [14, 48]], st, { lw: 1.7, round: 0.9, seed: 323, pits: true });
    G.cut(c, [[30, 34], [40, 46], [58, 53]], st, 0.8);                                                                 /* cheek fur contour */
    G.cut(c, [[24, 42], [30, 50], [40, 55]], st, 0.55);
    G.part(c, [[44, 22], [54, 13], [68, 11], [80, 16], [91, 24], [83, 29], [70, 22], [58, 26], [50, 32]], st, { lw: 1.3, pits: false });        /* the brow ridge */
    G.cut(c, [[50, 21], [62, 15], [78, 20]], st, 0.8, { glint: 1 });
    G.hollow(c, [[53, 29], [58, 21], [68, 19], [77, 25], [76, 36], [66, 41], [56, 38]], st, { deep: 0.8, lw: 0.8 });
    G.part(c, [[64, 19], [73, 23], [76, 31], [71, 40], [62, 42], [54, 37], [53, 28], [58, 22]], st, { lw: 1, pits: false, round: 1, lift: 1.1 });  /* the eyeball bulges */
    G.eye(c, 64.5, 31, 6.4, st, { blink: o.blink || 0, look: o.look || [0.6, 0.3], white: "#fff2cc", whiteDark: "#e8c070", iris: "#c9391c", pupil: "#1a0c04", lid: st.base });
    G.cut(c, [[54, 31], [59, 24], [70, 22], [77, 29]], st, 1.1); G.cut(c, [[55, 38], [63, 43], [73, 40]], st, 0.6);
    G.part(c, [[87, 33], [96, 30], [103, 36], [104, 44, 1], [99, 50], [90, 49], [85, 42]], st, { lw: 1.2, pits: false, round: 0.8 });          /* the nose disc */
    G.hollow(c, [[96, 40], [101, 39], [102, 44], [97, 46]], st, { lw: 0.6 }); G.cut(c, [[90, 48], [95, 51], [101, 48]], st, 0.6);
    G.cut(c, [[73, 22], [79, 26], [83, 33]], st, 0.7); G.cut(c, [[78, 19], [85, 23], [88, 30]], st, 0.6); G.cut(c, [[68, 25], [73, 31], [75, 38]], st, 0.55);   /* wrinkles on the snout bridge */
    G.cut(c, [[100, 54], [86, 58], [66, 59], [48, 57]], st, 0.8); G.cut(c, [[88, 52], [85, 58]], st, 0.5);                                         /* the lip */
    G.teeth(c, [[100, 55], [82, 58], [56, 59]], 6, 5, 1, st, { col: KFANG, fangs: [0, 4] });
    for (i = 0; i < 4; i++) G.dot(c, 80 + i * 4.6, 47 + (i % 2) * 2.2, 0.8, st.dark);                                                           /* whisker pits */
    /* tufts of cheek fur along the jaw */
    G.lock(c, 22, 46, PI - 0.5 + sin(t * 0.004) * 0.06, 18, 3.4, 1, KMANE, { lw: 0.7 }); G.lock(c, 24, 53, PI - 0.9 + sin(t * 0.004 + 1) * 0.06, 15, 3, -1, KMANE, { lw: 0.7 });
    c.restore();
  }

  /* the creature's silhouette is gathered as it is drawn, so the fresh-cut face can be laid on the stone and nowhere else */
  var KSIL = [];
  function kpart(c, pts, st, o) { var p = G.part(c, pts, st, o); KSIL.push(p); return p; }
  function ktube(c, pts, w0, w1, st, o) { var p = tube(c, pts, w0, w1, st, o); KSIL.push(p); return p; }
  var KTOP = [[190, 236], [196, 224], [214, 216], [262, 222], [320, 224], [370, 218], [418, 208], [446, 214], [474, 232], [490, 260], [500, 290]];
  var KTAIL = [[200, 244], [176, 258], [150, 266], [126, 258], [110, 240], [102, 222]];
  /* the top line of the creature at x: the tail's line out past the rump, then the back, then down the chest */
  function kbackY(x) {
    var P = x < 196 ? KTAIL : KTOP, i, a, b;
    if (x < 196) { for (i = 1; i < P.length; i++) if (x >= P[i][0]) { a = P[i - 1]; b = P[i]; return G.lerp(a[1], b[1], (a[0] - x) / (a[0] - b[0])); } return P[P.length - 1][1]; }
    for (i = 1; i < P.length; i++) if (x <= P[i][0]) { a = P[i - 1]; b = P[i]; return G.lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0])); }
    return P[P.length - 1][1];
  }
  /* the bite edge: it leans down and to the right under the jaws, and it is rough where the teeth tore it */
  function kedge(bite, y) { return bite + 0.22 * (y - kbackY(bite)) + 2.2 * sin(y * 0.83) + 1.6 * sin(y * 0.31 + 1.2); }

  /* the whole creature without its head and neck: tail, far legs, torso, near legs, carved scrolls. Facing right, standing on y = gy. */
  function kirtiBody(c, t, gy) {
    var br = sin(t * PI * 2 / 2600), flick = Math.pow(max(0, sin(t * 0.0017)), 8) * 14, tw = sin(t * 0.004) * 4, st = KST, i, k;
    KSIL.length = 0;
    c.fillStyle = "rgba(10,6,20,.38)"; [[222, 15], [222 + 0, 0], [236, 14], [440, 26], [462, 30]].forEach(function (E, q) { if (E[1]) { c.beginPath(); c.ellipse(E[0] + 12, gy + 1, E[1] + 8, 3.2, 0, 0, 7); c.fill(); } });
    /* the S of the tail: a ropey tube with a flaming tuft whose tip flicks */
    var tail = KTAIL.map(function (p, i) { return [p[0], p[1] + (i > 2 ? (tw + flick * -0.7) * (i - 2) / 3 : 0)]; });
    var tl = ktube(c, tail, 17, 6, st, { lw: 1.2, seed: 301 });
    for (i = 1; i < 9; i++) { var tp = along(tl.cl, i / 9.5), ta = ang(tl.cl, i / 9.5), tw2 = G.lerp(17, 6, i / 9.5) / 2; G.cut(c, [[tp[0] - sin(ta) * tw2, tp[1] + cos(ta) * tw2], [tp[0] + cos(ta) * 1.4, tp[1] + sin(ta) * 1.4], [tp[0] + sin(ta) * tw2, tp[1] - cos(ta) * tw2]], st, 0.55); }
    var te = tail[tail.length - 1];
    for (i = 0; i < 4; i++) G.lock(c, te[0], te[1], -2.3 - i * 0.42 + sin(t * 0.005 + i) * 0.15, 22 + i * 3, 4.2, i % 2 ? 0.9 : -0.9, KMANE, { lw: 0.8 });
    /* the far legs, darker, behind the body */
    ktube(c, [[262, 288], [248, 308], [236, 320]], 17, 10, KFAR, { lw: 1, seed: 330 }); ktube(c, [[236, 320], [233, 336], [238, gy - 9]], 10, 9, KFAR, { lw: 0.9, seed: 331 }); paw(c, 232, gy, 1, KFAR, 4, 0.95);
    ktube(c, [[428, 270], [422, 302], [427, 328]], 26, 15, KFAR, { lw: 1, seed: 332 }); ktube(c, [[427, 328], [428, 340], [430, gy - 11]], 15, 12, KFAR, { lw: 0.9, seed: 333 }); paw(c, 420, gy, 1, KFAR, 4, 1);
    /* the torso: a deep-chested lion, a hollow flank, a spine of small flames */
    var P = [[190, 236], [196, 224], [214, 216], [262, 222], [320, 224], [370, 218], [418, 208], [446, 214], [474, 232], [490, 260], [490, 292 + br * 1.5], [470, 312 + br * 2], [438, 317 + br * 2.4], [400, 306 + br * 2], [360, 290 + br * 1.4], [320, 274], [288, 276], [262, 284], [234, 284], [210, 274], [194, 256]];
    for (i = 0; i < 7; i++) { var fx = 224 + i * 30; G.lock(c, fx, kbackY(fx) + 3, -PI / 2 - 0.35 + sin(t * 0.003 + i) * 0.06, 14 + (i % 3) * 3, 3.2, -0.6, KMANE, { lw: 0.8 }); }
    kpart(c, P, st, { lw: 1.6, round: 0.7, seed: 305, steps: 4, paint: function (cc, bb) { var gg = cc.createLinearGradient(0, 236, 0, 322); gg.addColorStop(0, "rgba(60,30,8,0)"); gg.addColorStop(0.55, "rgba(60,30,8,0.06)"); gg.addColorStop(1, "rgba(50,24,6,.5)"); cc.fillStyle = gg; cc.fillRect(bb[0], 236, bb[2] - bb[0], 90); } });
    G.cut(c, [[214, 219], [262, 225], [320, 227], [370, 221], [418, 211], [440, 214]], st, 0.9, { glint: 1 });
    G.hollow(c, [[290, 262], [316, 257], [338, 266], [330, 281], [304, 282]], st, { deep: 0.4 });                              /* the hollow flank */
    for (i = 0; i < 6; i++) { var rx = 330 + i * 14; G.cut(c, [[rx, 230], [rx + 8, 250 + br * 0.8], [rx + 2, 276 + br * 1.4]], st, 0.55 + i * 0.07, i > 3 ? { glint: 1 } : {}); }   /* the ribs */
    G.cut(c, [[250, 290], [320, 281], [380, 296], [436, 312]], st, 0.7);                                                          /* the line of the belly */
    /* the chest wedge, in its own lighter plane, and tufts of chest fur */
    kpart(c, [[458, 226, 1], [484, 258], [489, 292], [470, 310], [450, 276]], st, { lw: 1.2, round: 0.8, seed: 306, pits: false, lift: 1.25 });
    G.cut(c, [[462, 236], [474, 262], [472, 296]], st, 0.6);
    for (i = 0; i < 3; i++) G.lock(c, 482 - i * 2, 270 + i * 11, 0.35 + i * 0.4, 15, 3.4, 0.9, KMANE, { lw: 0.7 });
    /* the near hind leg: the haunch with its scroll, the shank to the hock, the metatarsal, a paw */
    kpart(c, [[198, 240], [216, 226], [246, 228], [268, 246], [274, 272], [262, 290], [240, 296], [216, 290], [200, 272]], st, { lw: 1.5, round: 0.8, seed: 302, pits: true });
    G.cut(c, [[214, 232], [240, 232], [262, 250], [268, 272]], st, 0.8, { glint: 1 }); G.cut(c, spiralPts(238, 262, 1.6, 13, 2.1, 0.4, 1), st, 0.75, { glint: 1 });
    ktube(c, [[262, 284], [238, 304], [212, 316]], 21, 11, st, { lw: 1.2, seed: 303 });
    ktube(c, [[212, 316], [206, 334], [210, gy - 9]], 11, 9, st, { lw: 1, seed: 304 });
    kpart(c, [[200, 306], [213, 303], [219, 318], [206, 327]], st, { lw: 0.9, pits: false }); G.cut(c, [[204, 311], [212, 313]], st, 0.5);          /* the hock */
    paw(c, 204, gy, 1, st, 4, 1.05);
    /* the near foreleg: the shoulder blade and its scroll, upper arm, elbow, forearm, wrist, a paw of four toes */
    kpart(c, [[414, 214], [446, 211], [474, 236], [476, 266], [452, 288], [430, 276], [418, 246]], st, { lw: 1.5, round: 0.8, seed: 307, pits: true });
    G.cut(c, [[420, 214], [446, 222], [464, 246], [462, 268]], st, 0.9, { glint: 1 }); G.cut(c, spiralPts(444, 248, 1.6, 12, 2.1, 0.2, -1), st, 0.75, { glint: 1 });
    ktube(c, [[452, 262], [447, 294], [453, 322]], 32, 19, st, { lw: 1.2, seed: 308 });
    kpart(c, [[436, 288], [450, 285], [458, 298], [446, 306]], st, { lw: 0.9, pits: false }); G.cut(c, [[440, 294], [450, 292]], st, 0.5);           /* the elbow */
    ktube(c, [[453, 322], [456, 338], [458, gy - 12]], 19, 13, st, { lw: 1, seed: 309 });
    G.cut(c, [[449, 332], [457, 334]], st, 0.5); G.cut(c, [[450, 340], [458, 341]], st, 0.5);
    paw(c, 450, gy, 1, st, 4, 1.12);
    /* ground shadows under all four feet */
    return KSIL;
  }

  /* where the head sits when its jaws are at the bite: the mouth (98, 56 in the head) on the cut, the head tilted down toward it */
  function kirtiPose(bite, snap, t) {
    var by = kbackY(bite) - 3, bx = bite + 5 + snap * 7, th = -0.55, sc = 1.18 + 0.02 * sin(t * 0.0019);
    var cs = cos(th), sn = sin(th), mx = (-46 * cs - 12 * sn) * sc, my = (-46 * sn + 12 * cs) * sc;
    return { Bp: [bx, by - snap * 3], C: [bx - mx, by - snap * 3 - my], th: th, sc: sc };
  }
  /* a point on the head: local (lx, ly) in the 100-box, with the head placed at centre C, tilt th, scale sc, flipped to face left */
  function kheadPt(P, lx, ly) { var cs = cos(P.th), sn = sin(P.th), dx = -(lx - 52) * P.sc, dy = (ly - 44) * P.sc; return [P.C[0] + dx * cs - dy * sn, P.C[1] + dx * sn + dy * cs]; }
  function kplace(c, P, sx) { c.translate(P.C[0], P.C[1]); c.rotate(P.th); c.scale(-P.sc * sx, P.sc); c.translate(-52, -44); }

  SC.kirti = { w: 720, h: 420,
    draw: function (c, W, H, st) {
      var eat = st.arg != null ? +st.arg : (st.eat || 0), t = st.t, F = fit(W, H, 720, 420), pms = pokeOf(st), gy = 353, i, k;
      var e = G.clamp(eat / 0.86, 0, 1), tr = G.clamp((eat - 0.86) / 0.14, 0, 1);
      var pe = pms >= 0 ? env(pms, 1400) : 0, snap = pms >= 0 && pms < 160 ? 1 - pms / 160 : 0, chew = abs(sin(t * 0.012));
      var ir = tr > 0.1 ? G.lerp(0, 820, smooth(0.1, 0.72, tr)) : 0;                    /* the temple opens round the arch like an iris */
      /* ---- the dark scene: Shiva's brow over the ledge, its eye lighting the creature */
      if (ir < 800) {
        layer(c, W, H, "k-scene", function (g) {
          enter(g, F);
          g.fillStyle = "#231d4c"; g.fillRect(F.x0, F.y0, F.w, F.h);
          var r = G.rng(101); for (var i = 0; i < 20; i++) { g.fillStyle = G.rgba(r() < 0.5 ? "#4a3d86" : "#171238", 0.2 + r() * 0.2); g.beginPath(); g.ellipse(F.x0 + r() * F.w, F.y0 + r() * F.h, F.w * (0.1 + r() * 0.2), F.h * (0.06 + r() * 0.16), (r() - 0.5) * 0.6, 0, 7); g.fill(); }
          g.fillStyle = "rgba(255,230,190,.07)"; for (i = 0; i < 600; i++) g.fillRect(F.x0 + r() * F.w, F.y0 + r() * F.h, 0.9, 0.9);
          /* Shiva's forehead: blue skin, matted hair above, three ash lines, a crescent, brows, the eye socket */
          g.save(); g.beginPath(); g.moveTo(F.x0, F.y0); g.lineTo(F.x0 + F.w, F.y0); g.lineTo(F.x0 + F.w, 78); g.bezierCurveTo(520, 90, 470, 84, 360, 88); g.bezierCurveTo(250, 84, 200, 90, F.x0, 78); g.closePath(); g.clip();
          wash(g, F.x0, F.y0, F.w, 100, "#3a4a94", 102, 0.8);
          var hr = G.rng(103); g.fillStyle = "#12122a"; g.beginPath(); g.moveTo(F.x0, F.y0); g.lineTo(F.x0 + F.w, F.y0); g.lineTo(F.x0 + F.w, 8); for (var x = F.x0 + F.w; x > F.x0; x -= 14) g.lineTo(x, 14 + hr() * 14 + 6 * sin(x * 0.05)); g.lineTo(F.x0, 8); g.closePath(); g.fill();
          for (i = 0; i < 16; i++) G.lock(g, F.x0 + i * (F.w / 15), 18, PI / 2 + (hr() - 0.5) * 0.7, 18 + hr() * 12, 4, (hr() - 0.5) * 2.4, pal("#1c1c3e", "#4a4a86", "#0a0a1c", "#04040c"), { lw: 0.7 });
          [[28, 150, 560], [37, 160, 560], [46, 170, 550]].forEach(function (L2) { G.cut(g, [[360 - 160, L2[0] + 3], [360, L2[0] - 2], [360 + 160, L2[0] + 3]], INDG, 3.6, { col: ASH }); });
          g.restore();
          g.strokeStyle = G.rgba("#0b0f2c", 0.7); g.lineWidth = 1.4; g.beginPath(); g.moveTo(F.x0, 78); g.bezierCurveTo(200, 90, 250, 84, 360, 88); g.bezierCurveTo(470, 84, 520, 90, F.x0 + F.w, 78); g.stroke();
          g.fillStyle = "#e8ecf6"; g.strokeStyle = "#0b0f2c"; g.lineWidth = 1; g.beginPath(); g.arc(214, 24, 11, 0.5, PI * 2 - 0.5); g.arc(219, 24, 8.5, PI * 2 - 0.7, 0.7, true); g.closePath(); g.fill(); g.stroke();
          [[-1], [1]].forEach(function (d) { G.cut(g, [[360 + d[0] * 24, 70], [360 + d[0] * 78, 62], [360 + d[0] * 150, 66]], INDG, 7, { col: "#0f1030" }); G.cut(g, [[360 + d[0] * 34, 66], [360 + d[0] * 80, 59]], INDG, 2, { col: "#3a3a78" }); });
          /* the ledge it stands on */
          G.part(g, [[F.x0 - 20, gy + 2, 1], [90, gy - 2], [200, gy - 5], [360, gy - 4], [520, gy - 6], [640, gy - 2], [F.x0 + F.w + 20, gy + 2, 1], [F.x0 + F.w + 20, F.y0 + F.h + 20, 1], [F.x0 - 20, F.y0 + F.h + 20, 1]], S.andesite, { lw: 1.6, seed: 104, steps: 5 });
          G.cut(g, [[150, gy + 8], [210, gy + 12], [260, gy + 7]], S.andesite, 0.8); G.cut(g, [[470, gy + 10], [540, gy + 16], [600, gy + 11]], S.andesite, 0.8); G.cut(g, [[340, gy + 20], [380, gy + 26]], S.andesite, 0.7);
          g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(360, gy + 1, 300, 5, 0, 0, 7); g.fill();
          g.restore();
        });
        enter(c, F);
        /* the beam from the third eye: a cone that pulses, with embers drifting down it */
        var pulse = 0.8 + 0.2 * sin(t * 0.0033), eyeFlare = pms >= 0 && pms < 200 ? 1 - pms / 200 : 0;
        var bg = c.createLinearGradient(0, 70, 0, gy); bg.addColorStop(0, "rgba(255,196,96," + 0.5 * pulse + ")"); bg.addColorStop(1, "rgba(255,196,96," + 0.06 * pulse + ")");
        c.fillStyle = bg; c.beginPath(); c.moveTo(350, 74); c.lineTo(370, 74); c.lineTo(560, gy); c.lineTo(160, gy); c.closePath(); c.fill();
        c.save(); c.beginPath(); c.moveTo(350, 74); c.lineTo(370, 74); c.lineTo(560, gy); c.lineTo(160, gy); c.closePath(); c.clip();
        var er = G.rng(105); for (var em = 0; em < 18; em++) { var eph = (t * 0.00019 * (0.7 + er() * 0.6) + er()) % 1, ex = G.lerp(360, 160 + er() * 400, eph * eph) + sin(t * 0.002 + em * 2) * 6; c.fillStyle = "rgba(255,214,130," + (0.85 * (1 - eph)) + ")"; c.beginPath(); c.arc(ex, 80 + eph * (gy - 90), 1 + er() * 1.6, 0, 7); c.fill(); }
        c.restore();
        /* the third eye: a vertical almond with flame lashes, a red-orange iris; it winks on a tap */
        var wink = pms >= 150 && pms < 750 ? sin(PI * (pms - 150) / 600) : 0, ew = 40, eh = 62, ecx = 360, ecy = 52;
        for (var f = 0; f < 5; f++) G.lock(c, ecx + (f - 2) * 4.5, ecy - eh / 2 + 5, -PI / 2 + (f - 2) * 0.32 + sin(t * 0.006 + f) * 0.12, 14 + (f % 2) * 6 + eyeFlare * 10, 3.2, (f - 2) * 0.5, pal("#e8641c", "#ffd060", "#8a2a08", "#2a0c04"), { lw: 0.8 });
        c.save(); c.beginPath(); c.moveTo(ecx, ecy - eh / 2); c.quadraticCurveTo(ecx + ew / 2 + 6, ecy, ecx, ecy + eh / 2); c.quadraticCurveTo(ecx - ew / 2 - 6, ecy, ecx, ecy - eh / 2); c.closePath();
        c.fillStyle = "#fff1c8"; c.fill(); c.clip();
        var ig = c.createRadialGradient(ecx, ecy + 2, 1, ecx, ecy + 2, 15 + eyeFlare * 6); ig.addColorStop(0, "#ffd070"); ig.addColorStop(0.45, "#e8501c"); ig.addColorStop(1, "#a01808"); c.fillStyle = ig; c.beginPath(); c.ellipse(ecx, ecy + 2, 11 + eyeFlare * 4, 22 + eyeFlare * 6, 0, 0, 7); c.fill();
        c.fillStyle = "#14080a"; c.beginPath(); c.ellipse(ecx + sin(t * 0.0011) * 2, ecy + 3, 3.4, 12, 0, 0, 7); c.fill();
        c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.arc(ecx - 4, ecy - 8, 2, 0, 7); c.fill();
        if (wink > 0) { c.fillStyle = "#33418a"; c.fillRect(ecx - 30, ecy - eh / 2 - 2, 60, (eh + 4) * wink); c.strokeStyle = "#0b0f2c"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(ecx - 30, ecy - eh / 2 + (eh + 4) * wink - 2); c.lineTo(ecx + 30, ecy - eh / 2 + (eh + 4) * wink - 2); c.stroke(); }
        c.restore();
        c.strokeStyle = "#0b0f2c"; c.lineWidth = 2; c.beginPath(); c.moveTo(ecx, ecy - eh / 2); c.quadraticCurveTo(ecx + ew / 2 + 6, ecy, ecx, ecy + eh / 2); c.quadraticCurveTo(ecx - ew / 2 - 6, ecy, ecx, ecy - eh / 2); c.stroke();
        if (eyeFlare > 0) { var fg = c.createRadialGradient(ecx, ecy, 4, ecx, ecy, 80); fg.addColorStop(0, "rgba(255,200,100," + 0.7 * eyeFlare + ")"); fg.addColorStop(1, "rgba(255,200,100,0)"); c.fillStyle = fg; c.fillRect(ecx - 90, ecy - 90, 180, 180); }
        c.restore();
      }

      /* ---- the creature, eaten from the tail forward by its own head: the bite edge crosses tail, haunch, loins, ribs, shoulder in that order */
      var bite = G.lerp(76, 494, e), pose = kirtiPose(bite, snap, t), jaw = (0.14 + 0.26 * chew) * (1 - snap * 0.9);
      if (eat < 0.86) {
        enter(c, F);
        /* the neck from the shoulder up and back over the spine to the head */
        var N0 = [446, 240], Jn = kheadPt(pose, 12, 40), dxn = N0[0] - Jn[0], hh = G.clamp(30 + dxn * 0.1, 30, 52), yc = function (u) { return G.lerp(N0[1], Jn[1], u); };
        var np = [N0, [N0[0] + 8, N0[1] - 42], [G.lerp(N0[0], Jn[0], 0.36), yc(0.36) - hh * 1.5], [G.lerp(N0[0], Jn[0], 0.74), yc(0.74) - hh * 0.9], Jn];
        var neck = tube(c, np, 54, 38, KST, { lw: 1.5, seed: 311, round: 0.5, steps: 6, hatchAng: 1.1 });
        for (i = 0; i < 5; i++) { var nu = 0.16 + i * 0.16, nq = along(neck.cl, nu), na = ang(neck.cl, nu), nw = G.lerp(54, 38, nu) / 2; G.cut(c, [[nq[0] - sin(na) * nw * 0.8, nq[1] + cos(na) * nw * 0.8], [nq[0] + cos(na) * 3, nq[1] + sin(na) * 3], [nq[0] + sin(na) * nw * 0.8, nq[1] - cos(na) * nw * 0.8]], KST, 0.6); }
        for (i = 0; i < 12; i++) {                                  /* the mane: flame locks along the top of the neck, leaning back toward the shoulder */
          var mu = 0.05 + i * 0.075, mp = along(neck.cl, mu), ma = ang(neck.cl, mu), mw = G.lerp(54, 38, mu) / 2, nx = -sin(ma), ny = cos(ma);
          G.lock(c, mp[0] + nx * mw * 0.55, mp[1] + ny * mw * 0.55, Math.atan2(ny * 0.85 - sin(ma) * 0.55, nx * 0.85 - cos(ma) * 0.55) + sin(t * 0.004 + i) * 0.12, 22 + (i % 3) * 7, 5.5, i % 2 ? 1.1 : -1.1, KMANE, { lw: 0.9 });
        }
        c.save();
        /* clip to the right of the ragged bite edge */
        c.beginPath(); c.moveTo(kedge(bite, 40), 40); for (var yy = 46; yy <= 390; yy += 6) c.lineTo(kedge(bite, yy), yy); c.lineTo(900, 390); c.lineTo(900, 40); c.closePath();
        c.save(); c.clip();
        var sil = kirtiBody(c, t, gy);
        c.restore();
        /* the fresh-cut face: a pale band of new stone along the edge with pecked marks, laid only where there is stone */
        var edge = []; for (yy = 120; yy <= 340; yy += 4) edge.push([kedge(bite, yy), yy]);
        c.save(); c.beginPath(); c.moveTo(kedge(bite, 40), 40); for (yy = 46; yy <= 390; yy += 6) c.lineTo(kedge(bite, yy), yy); c.lineTo(900, 390); c.lineTo(900, 40); c.closePath(); c.clip();
        sil.forEach(function (pl) {
          c.save(); G.trace(c, pl, true); c.clip();
          c.strokeStyle = "rgba(255,238,196,.62)"; c.lineWidth = 11; c.lineJoin = "round"; c.beginPath(); edge.forEach(function (q, j) { if (j) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); c.stroke();
          c.strokeStyle = "rgba(60,34,12,.55)"; c.lineWidth = 1.4; c.beginPath(); edge.forEach(function (q, j) { if (j) c.lineTo(q[0] + 4.6, q[1]); else c.moveTo(q[0] + 4.6, q[1]); }); c.stroke();
          var pr = G.rng(107); c.fillStyle = "rgba(96,62,28,.55)"; for (var d = 0; d < 46; d++) { var q = edge[Math.floor(pr() * edge.length)], dx = q[0] + 0.5 + pr() * 8; c.beginPath(); c.arc(dx, q[1] + (pr() - 0.5) * 3, 0.5 + pr() * 0.9, 0, 7); c.fill(); }
          c.restore();
        });
        c.restore();
        /* the mane tufts over the shoulder weld the neck into the body: no flat end shows */
        for (i = 0; i < 5; i++) G.lock(c, 424 + i * 9, 206 + i * 2, PI * 0.5 + i * 0.12 + sin(t * 0.0035 + i) * 0.07, 24 - i * 1.5, 6, i % 2 ? 1.2 : -1.2, KMANE, { lw: 0.9 });
        /* an undercut shadow where the jaw closes on the stone */
        var sg = c.createRadialGradient(pose.Bp[0] + 4, pose.Bp[1] + 14, 2, pose.Bp[0] + 4, pose.Bp[1] + 14, 40); sg.addColorStop(0, "rgba(30,16,4,.4)"); sg.addColorStop(1, "rgba(30,16,4,0)"); c.fillStyle = sg; c.fillRect(pose.Bp[0] - 40, pose.Bp[1] - 30, 90, 90);
        /* the head, turned back to bite: its snout on the cut */
        c.save(); kplace(c, pose, 1); G.light(true); kirtiHead(c, 0, 0, 100, { t: t, jaw: jaw, jawS: 1, blink: G.blink(t, 4), look: [0.6, 0.6] }); G.light(false); c.restore();
        /* crumbs fall from the cut, and burst on a tap */
        var cr = G.rng(106);
        for (var q = 0; q < 16; q++) { var cph = (t * 0.0011 + cr()) % 1, cy0 = G.clamp(pose.Bp[1] + cr() * 80, 140, 330); c.fillStyle = q % 3 ? "#e6a84a" : "#86542a"; c.beginPath(); c.arc(kedge(bite, cy0) + 2 + cr() * 8 + cph * 7, cy0 + cph * cph * (gy - cy0), 1.2 + cr() * 2 * (1 - cph * 0.5), 0, 7); c.fill(); }
        if (pms >= 0 && pms < 900) { var cu = pms / 900; for (q = 0; q < 26; q++) { var ca = q * 2.4 + 0.5, cv = 40 + (q * 53 % 50); c.fillStyle = q % 3 ? "#ffd690" : "#e6a84a"; c.globalAlpha = 1 - cu; c.beginPath(); c.arc(pose.Bp[0] + cos(ca) * cv * cu, pose.Bp[1] + 10 + sin(ca) * cv * cu * 0.7 + cu * cu * 80, 1.6 + (q % 3), 0, 7); c.fill(); } c.globalAlpha = 1; }
        c.restore(); c.restore();
      }

      /* ---- the finale: the head alone on the ledge, then it rises into the arch and turns to face us as the doorway opens round it */
      var Cend = kirtiPose(494, 0, t).C;
      if (eat >= 0.86) {
        var a1 = smooth(0, 0.3, tr), a2 = smooth(0.3, 0.8, tr), turn = smooth(0.5, 0.8, tr);
        /* the temple wall, opening round the arch */
        if (ir > 2) {
          c.save(); c.beginPath(); c.arc(F.X(360), F.Y(150), ir * F.s, 0, 7); c.clip();
          layer(c, W, H, "k-temple2", function (g) { kirtiTemple(g, F, gy); });
          c.restore();
        }
        enter(c, F);
        var Ph = { C: [G.lerp(G.lerp(Cend[0], 452, a1), 360, a2), G.lerp(G.lerp(Cend[1], 286, a1), 150, a2)], th: G.lerp(G.lerp(-0.55, 0, a1), 0, a2), sc: G.lerp(G.lerp(1.18, 1.5, a1), 2.0, a2) };
        Ph.C[1] += sin(t * 0.0026) * 1.2 * (1 - a2);
        if (ir > 2) { c.strokeStyle = "rgba(255,226,150," + (0.7 * (1 - smooth(0.6, 0.9, tr))) + ")"; c.lineWidth = 3; c.beginPath(); c.arc(360, 150, ir, 0, 7); c.stroke(); }
        var sxp = 1 - turn;
        if (sxp > 0.04) {
          c.save(); kplace(c, Ph, sxp); G.light(true);
          kirtiHead(c, 0, 0, 100, { t: t, jaw: 0.12 + 0.1 * chew * (1 - a1), jawS: 1 - smooth(0.2, 0.6, tr) * 0.9, blink: G.blink(t, 4), look: [0.2, 0.2] }); G.light(false); c.restore();
        }
        if (turn > 0.02) {
          c.save(); c.translate(360, 150); c.scale(turn, 1); c.translate(-360, -150);
          G.beast(c, "kala", 170, -30, 380, { t: t, poke: pms, variant: "khmer" });
          /* raking light: shadows under the brow and the fangs so the face stands out of the stone */
          c.save(); c.beginPath(); c.rect(170, 70, 380, 210); c.clip();
          [[56, 108, 0.34, 7], [100, 148, 0.3, 6]].forEach(function (S2) { var sx0 = 170 + S2[0] * 1.9, sw = 88 * 1.9, sy0 = -30 + S2[1] * 1.9, g2 = c.createLinearGradient(0, sy0, 0, sy0 + S2[3] * 1.9); g2.addColorStop(0, "rgba(40,16,6," + S2[2] + ")"); g2.addColorStop(1, "rgba(40,16,6,0)"); c.fillStyle = g2; c.fillRect(S2[0] < 80 ? sx0 : 170 + 62 * 1.9, sy0, S2[0] < 80 ? sw : 76 * 1.9, S2[3] * 1.9); });
          c.restore(); c.restore();
        }
        if (tr > 0.7) {
          var ta = smooth(0.7, 1, tr);
          c.save(); c.globalAlpha = ta; kirtiLife(c, t, F); c.restore();
        }
        /* a tap on the finished face: the eye flares once and the lamps leap */
        if (tr > 0.95 && pms >= 0 && pms < 500) { var lf = sin(PI * pms / 500); c.fillStyle = "rgba(255,210,120," + 0.25 * lf + ")"; c.fillRect(F.x0, F.y0, F.w, F.h); }
        c.restore();
      }
    } };

  /* the doorway of the temple, drawn once: coursed sand-coloured stone, an arched niche for the kala, a lintel that carries the name, a door
     that runs off the bottom edge. The kala itself is the beast, drawn live over this. */
  function kirtiTemple(g, F, gy) {
    var bot = F.y0 + F.h + 12;
    enter(g, F);
    wash(g, F.x0, F.y0, F.w, F.h, "#c58a3c", 111, 0.55);
    G.ashlar(g, F.x0, F.y0, F.w, F.h, S.sand, { course: 26, seed: 12 });
    g.fillStyle = "rgba(255,226,170,.1)"; g.fillRect(F.x0, F.y0, F.w, F.h);
    /* the niche: a moulded arch round a dark recess, deeper pink-brown so the carved face stands out of it */
    var rec = function (R) { var p = [[360 - R, 262, 1]]; for (var j = 0; j <= 28; j++) { var a = PI + j / 28 * PI; p.push([360 + R * cos(a), 178 + R * sin(a)]); } p.push([360 + R, 262, 1]); return p; };
    var ring = rec(182).concat(rec(160).reverse()); ring.sp = true;
    G.part(g, ring, S.sand, { lw: 1.6, seed: 115, steps: 1, lift: 1.1 });
    g.save(); g.beginPath(); g.moveTo(200, 262); g.lineTo(200, 178); g.arc(360, 178, 160, PI, 0); g.lineTo(520, 262); g.closePath();
    var rg = g.createRadialGradient(360, 120, 20, 360, 150, 190); rg.addColorStop(0, "#7a4630"); rg.addColorStop(1, "#3c2014"); g.fillStyle = rg; g.fill();
    var rr = G.rng(116); g.fillStyle = "rgba(255,220,170,.1)"; for (var q = 0; q < 220; q++) g.fillRect(200 + rr() * 320, 20 + rr() * 242, 1, 1);
    g.restore();
    G.cut(g, [[190, 262], [190, 178]].concat((function () { var p = []; for (var j = 1; j < 24; j++) { var a = PI + j / 24 * PI; p.push([360 + 171 * cos(a), 178 + 171 * sin(a)]); } return p; })(), [[530, 178], [530, 262]]), S.sand, 1.2, { glint: 1 });
    /* the lintel with its cartouche and the name */
    G.part(g, [[236, 262, 1], [484, 262, 1], [488, 296, 1], [232, 296, 1]], S.sand, { lw: 1.5, steps: 1, seed: 114 });
    G.cut(g, [[240, 268], [480, 268]], S.sand, 0.8, { glint: 1 });
    G.hollow(g, [[290, 270], [430, 270], [438, 279], [430, 289], [290, 289], [282, 279]], S.sand, { deep: 0.4 });
    G.lock(g, 266, 279, PI, 16, 4.6, 1.4, S.sand, { lw: 0.8 }); G.lock(g, 454, 279, 0, 16, 4.6, -1.4, S.sand, { lw: 0.8 });
    g.font = "700 14px " + FONT; if ("letterSpacing" in g) g.letterSpacing = "0.14em"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "rgba(255,240,200,.65)"; g.fillText("KĪRTIMUKHA", 360.8, 280.2); g.fillStyle = "rgba(58,30,8,.92)"; g.fillText("KĪRTIMUKHA", 360, 279.4);
    /* the doorway and its stepped jambs, running off the bottom of the picture */
    G.part(g, [[286, bot, 1], [286, 296, 1], [434, 296, 1], [434, bot, 1]], S.sand, { lw: 1.6, steps: 1, seed: 112 });
    G.part(g, [[298, bot, 1], [298, 308, 1], [422, 308, 1], [422, bot, 1]], pal("#2a1a12", "#5a3a28", "#0f0805", "#050302"), { lw: 1.2, steps: 1, seed: 113, pits: false });
    G.cut(g, [[290, 396], [290, 304]], S.sand, 1, { glint: 1 }); G.cut(g, [[430, 396], [430, 304]], S.sand, 1);
    var dg = g.createLinearGradient(0, 308, 0, 420); dg.addColorStop(0, "rgba(255,170,80,.0)"); dg.addColorStop(1, "rgba(255,170,80,.12)"); g.fillStyle = dg; g.fillRect(298, 308, 124, 112);
    /* the oil lamps' little shelves */
    [[262, 334], [458, 334]].forEach(function (L, li) { G.part(g, [[L[0] - 15, L[1], 1], [L[0] + 15, L[1], 1], [L[0] + 11, L[1] + 8, 1], [L[0] - 11, L[1] + 8, 1]], S.sand, { lw: 1.1, steps: 1, seed: 117 + li }); });
    g.restore();
  }
  /* what moves in the temple: two lamps, a thread of incense, dust in the light, and the warm wash over the lintel */
  function kirtiLife(c, t, F) {
    [[262, 334], [458, 334]].forEach(function (L, li) {
      var fl = 0.8 + 0.2 * sin(t * 0.02 + li * 2) + 0.1 * sin(t * 0.051 + li);
      c.fillStyle = "rgba(255,196,90," + 0.28 * fl + ")"; c.beginPath(); c.arc(L[0], L[1] - 14, 26 * fl, 0, 7); c.fill();
      G.part(c, [[L[0] - 9, L[1] - 6, 1], [L[0] + 9, L[1] - 6, 1], [L[0] + 6, L[1] + 1, 1], [L[0] - 6, L[1] + 1, 1]], pal("#8a5c2a", "#d9a45a", "#3a2410", "#150c05"), { lw: 1, steps: 1, pits: false });
      c.fillStyle = "#ffb43a"; c.beginPath(); c.moveTo(L[0] - 2.6, L[1] - 6); c.quadraticCurveTo(L[0] - 3, L[1] - 13 - fl * 3, L[0] + sin(t * 0.03 + li) * 1.4, L[1] - 19 - fl * 4); c.quadraticCurveTo(L[0] + 4, L[1] - 12, L[0] + 2.6, L[1] - 6); c.fill();
      c.fillStyle = "#fff2b0"; c.beginPath(); c.ellipse(L[0], L[1] - 10, 1.2, 3, 0, 0, 7); c.fill();
    });
    /* incense: a brass pot on the doorstep, a stick, and a thread of smoke that climbs and sways */
    G.part(c, [[462, 402, 1], [484, 402, 1], [486, 414, 1], [460, 414, 1]], pal("#8a6a2a", "#e0c070", "#3a2a0a", "#150e02"), { lw: 1, steps: 1, pits: false });
    c.strokeStyle = "#4a2a14"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(473, 402); c.lineTo(474, 372); c.stroke(); c.fillStyle = "#ff7a2a"; c.beginPath(); c.arc(474, 372, 1.3, 0, 7); c.fill();
    c.lineCap = "round";
    for (var j = 0; j < 26; j++) { var sy = 372 - j * 4, sxx = 474 + sin(j * 0.42 - t * 0.0021) * (2 + j * 0.55) + sin(j * 0.17 + t * 0.0013) * j * 0.3; c.strokeStyle = "rgba(244,240,232," + (0.5 * (1 - j / 26)) + ")"; c.lineWidth = 1.3 + j * 0.05; c.beginPath(); c.moveTo(sxx, sy); c.lineTo(474 + sin((j + 1) * 0.42 - t * 0.0021) * (2 + (j + 1) * 0.55) + sin((j + 1) * 0.17 + t * 0.0013) * (j + 1) * 0.3, sy - 4); c.stroke(); }
    var rm2 = G.rng(113); for (var mo = 0; mo < 22; mo++) { var mph = (t * 0.00006 * (0.6 + rm2()) + rm2()) % 1; c.fillStyle = "rgba(255,240,200," + 0.6 * sin(PI * mph) + ")"; c.beginPath(); c.arc(G.lerp(120, 330, mph) + sin(t * 0.0007 + mo) * 8 + (rm2() - 0.5) * 80, G.lerp(60, 330, mph) + cos(t * 0.0008 + mo * 2) * 6, 0.9 + rm2() * 0.9, 0, 7); c.fill(); }
    var wl = c.createLinearGradient(0, 100, 0, 300); wl.addColorStop(0, "rgba(255,200,110,.2)"); wl.addColorStop(1, "rgba(255,200,110,0)"); c.fillStyle = wl; c.fillRect(F.x0, F.y0, F.w, F.h);
  }

  /* ================================================================ throw it clear
     Rain on a roof runs down a groove and leaves the spout at the critical speed
     of an open channel, v = √(g·d), d = (q²/g)^⅓. It then falls freely. */
  G.throwCalc = function (st) {
    var g = 9.81, b = 0.12, Q = (st.rain / 1000 / 3600) * (st.area || 40), q = Q / b;
    var d = Math.pow(q * q / g, 1 / 3), v = Math.sqrt(g * d), tf = Math.sqrt(2 * (st.height || 10) / g), x = v * tf;
    return { Q: Q, litres: Q * 1000, d: d, v: v, fall: tf, x: x, land: (st.L || 0) + x, wet: (st.L || 0) < 0.12 };
  };
  var SLATE = pal("#59606c", "#9aa3b0", "#2a2f38", "#101318"), LEAD = pal("#8a919c", "#d5dae1", "#434953", "#16191e");
  function umbrella(c, x, y, r, tilt, t, wob) {
    c.save(); c.translate(x, y + wob); c.rotate(tilt);
    var red = pal("#c9391c", "#f58b6a", "#6a1608", "#2a0803");
    c.strokeStyle = INK; c.lineWidth = 1.1; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, r * 1.1); c.stroke();
    G.part(c, [[-r, 0, 1], [-r * 0.8, -r * 0.5], [0, -r * 0.78], [r * 0.8, -r * 0.5], [r, 0, 1], [r * 0.5, r * 0.12, 1], [0, 0, 1], [-r * 0.5, r * 0.12, 1]], red, { lw: 1.1, pits: false, steps: 5, seed: 12 });
    for (var i = -2; i <= 2; i++) G.cut(c, [[0, -r * 0.76], [i * r * 0.36, -r * 0.4], [i * r * 0.46 + (i ? 0 : 0), -0.2 * r * (i ? 0 : 0)]], red, 0.6);
    G.dot(c, 0, -r * 0.8, 1.2, INK);
    c.restore();
  }
  /* a sky of washed drifts: a two-stop wash, four hand-placed ragged-edged drifts, the hatch band at the horizon (no stacked ovals) */
  function skyDrift(g, x, y, w, hy, base, seed) {
    var gr = g.createLinearGradient(0, y, 0, hy); gr.addColorStop(0, G.mix(CREAM, base, 0.44)); gr.addColorStop(1, G.mix(CREAM, base, 0.14)); g.fillStyle = gr; g.fillRect(x, y, w, hy - y);
    var r = G.rng(seed);
    [[0.14, 0.2, 0.46, 0.1], [0.55, 0.1, 0.56, 0.11], [0.32, 0.46, 0.62, 0.1], [0.82, 0.4, 0.4, 0.09]].forEach(function (D, di) {
      var cx = x + D[0] * w, cy = y + D[1] * (hy - y), rw = D[2] * w * 0.5, rh = (hy - y) * D[3], pts = [];
      for (var i = 0; i < 16; i++) { var a = i / 16 * PI * 2, rr = 1 + (r() - 0.5) * 0.4 + 0.2 * sin(a * 3 + di * 2); pts.push([cx + cos(a) * rw * rr, cy + sin(a) * rh * rr * (sin(a) < 0 ? 1.35 : 0.7)]); }
      g.fillStyle = G.rgba(INK, 0.075 + di * 0.012); G.trace(g, G.sp(pts, true, 5), true); g.fill();
      g.strokeStyle = G.rgba(INK, 0.1); g.lineWidth = 0.6; g.lineCap = "round";
      for (var h = 0; h < 7; h++) { var hx = cx - rw * 0.7 + h * rw * 0.22 + r() * 6, hy2 = cy + rh * (0.2 + (h % 3) * 0.22); g.beginPath(); g.moveTo(hx, hy2); g.lineTo(hx + 10 + r() * 12, hy2 + (r() - 0.5)); g.stroke(); }
    });
    var r2 = G.rng(seed + 40); g.save(); g.lineCap = "round";
    for (var k = 0; k < 11; k++) { var yy = hy - 3 - k * k * 0.55 - k * 2.2; g.strokeStyle = G.rgba(INK, 0.13 * (1 - k / 12)); g.lineWidth = 0.6; for (var xx = x - 10 + r2() * 14; xx < x + w; xx += 12 + r2() * 22) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + 9 + r2() * 14, yy + (r2() - 0.5) * 0.8); g.stroke(); } }
    g.restore();
  }
  /* water thrown from a lip: a tapered ribbon w0 px at the mouth thinning to w1 where it lands, a white core, a blue edge; the last third breaks into drops;
     returns the landing point. vx, vy px/ms; g px/ms^2 */
  function jetRibbon(c, x, y, vx, vy, g, gy, w0, w1, t, o) {
    o = o || {}; var pts = [], T = 0, i, n, col = o.col || "104,160,206";
    for (i = 0; i < 200; i++) { pts.push([x + vx * T, y + vy * T + 0.5 * g * T * T]); if (pts[i][1] >= gy) break; T += o.dt || 10; }
    n = pts.length; var end = pts[n - 1], brk = Math.max(3, Math.floor(n * (o.brk || 0.64))), L = [], R = [], wv = function (u) { return G.lerp(w0, w1, u) * (1 + 0.07 * sin(u * 30 - t * 0.012)); };
    for (i = 0; i < brk; i++) {
      var a = pts[max(i - 1, 0)], b = pts[min(i + 1, n - 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = hyp(dx, dy) || 1, w = wv(i / (n - 1)) / 2;
      L.push([pts[i][0] - dy / d * w, pts[i][1] + dx / d * w]); R.unshift([pts[i][0] + dy / d * w, pts[i][1] - dx / d * w]);
    }
    c.save(); c.lineCap = "round"; c.lineJoin = "round";
    var edge = L.concat(R); c.beginPath(); edge.forEach(function (p, j) { if (j) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath();
    c.fillStyle = "rgba(" + col + ",.28)"; c.lineWidth = w0 * 0.9; c.strokeStyle = "rgba(" + col + ",.18)"; c.stroke(); c.fillStyle = "rgba(" + col + ",.92)"; c.fill(); c.lineWidth = 0.8; c.strokeStyle = "rgba(34,78,134,.75)"; c.stroke();
    c.strokeStyle = "rgba(255,255,255,.88)"; c.lineWidth = max(0.7, w0 * 0.26); c.beginPath(); for (i = 0; i < brk; i++) { var wq = wv(i / (n - 1)) * 0.16; if (i) c.lineTo(pts[i][0] - wq, pts[i][1]); else c.moveTo(pts[i][0] - wq, pts[i][1]); } c.stroke();
    /* the last third: broken lengths of water, then drops, each sliding down the arc */
    var ph0 = (t * 0.022) % 5;
    for (i = brk; i < n; i++) { var u = (i - brk) / max(1, n - brk), seg = ((i - ph0) % 5 + 5) % 5; if (seg < 3.2 - u * 1.8) { c.strokeStyle = "rgba(" + col + ",.9)"; c.lineWidth = max(0.7, wv(i / (n - 1)) * (1 - u * 0.4)); c.beginPath(); c.moveTo(pts[i - 1][0], pts[i - 1][1]); c.lineTo(pts[i][0], pts[i][1]); c.stroke(); } }
    var rr = G.rng(o.seed || 5), nd = o.drops || 8; c.fillStyle = "rgba(" + col + ",.95)";
    for (var d = 0; d < nd; d++) { var ph = (t * 0.0014 + rr()) % 1, id = Math.min(n - 1, Math.floor(G.lerp(brk, n - 1, ph))), p = pts[id], sp = (rr() - 0.5) * (1 + ph * 5); c.beginPath(); c.arc(p[0] + sp, p[1] + sp * 0.3, max(0.6, w0 * (0.2 + rr() * 0.12) * (1 - ph * 0.45)), 0, 7); c.fill(); }
    if (o.splash !== false && end[1] >= gy - 1) {
      var hg = c.createRadialGradient(end[0], gy + 2, 1, end[0], gy + 2, 22); hg.addColorStop(0, "rgba(34,52,66,.4)"); hg.addColorStop(1, "rgba(34,52,66,0)"); c.fillStyle = hg; c.beginPath(); c.ellipse(end[0], gy + 2, 22, 5, 0, 0, 7); c.fill();
      c.strokeStyle = "rgba(250,252,255,.9)"; c.lineWidth = 1.1;
      for (var s = 0; s < 2; s++) { var p2 = (t * 0.0022 + s / 2) % 1, rx = w0 * (1 + p2 * 3.4); c.globalAlpha = (1 - p2) * 0.9; c.beginPath(); c.ellipse(end[0], gy, rx, rx * 0.28, 0, PI, 0); c.stroke(); } c.globalAlpha = 1;
      c.fillStyle = "rgba(235,246,255,.9)"; for (var q = 0; q < 7; q++) { var pq = (t * 0.003 + q / 7) % 1, dxq = (q - 3) * 2.4 * pq; c.beginPath(); c.arc(end[0] + dxq, gy - sin(PI * pq) * (5 + (q % 3) * 2.4), 0.9 + (q % 2) * 0.4, 0, 7); c.fill(); }
    }
    c.restore(); return end;
  }
  SC.throw = { w: 720, h: 460,
    draw: function (c, W, H, st) {
      if (st.arg != null) { st.L = +st.arg; st.rain = 60; }
      if (st.L == null) st.L = 0.9; if (st.rain == null) st.rain = 40;
      var t = st.t, m = G.throwCalc({ rain: st.rain, L: st.L, height: 10, area: 40 }), wet = st.rain / 100, F = fit(W, H, 720, 460), pms = pokeOf(st);
      var gy = 388, top = 64, s = (gy - top) / 10, wx = 330, rainK = Math.min(1, st.rain / 60);
      var key = "throw-" + (m.wet ? 1 : 0) + "-" + Math.round(st.rain / 8);
      layer(c, W, H, key, function (g) {
        enter(g, F);
        skyDrift(g, F.x0, F.y0, F.w, gy, G.mix("#a9bcc6", "#7f8f9c", Math.min(1, wet + 0.2)), 51);
        earth(g, F.x0, gy, F.w, F.y0 + F.h - gy, "#8a8068", 52, 1.2);
        /* the building: coursed stone, dry unless the spout is too short to throw clear */
        G.ashlar(g, F.x0, top, wx - F.x0, gy - top, S.lime, { course: 18, seed: 4, wet: m.wet ? 0.05 : 0.05 });
        /* windows and a door give the height a scale */
        [[70, 120], [150, 120], [230, 120], [70, 250], [150, 250], [230, 250]].forEach(function (w2, i) {
          G.part(g, [[w2[0] - 17, w2[1] + 36, 1], [w2[0] - 17, w2[1] - 8], [w2[0], w2[1] - 22, 1], [w2[0] + 17, w2[1] - 8], [w2[0] + 17, w2[1] + 36, 1]], S.lime, { lw: 1.2, seed: 60 + i, steps: 4 });
          G.hollow(g, [[w2[0] - 12, w2[1] + 32], [w2[0] - 12, w2[1] - 5], [w2[0], w2[1] - 16], [w2[0] + 12, w2[1] - 5], [w2[0] + 12, w2[1] + 32]], pal("#3b4766", "#6a789c", "#1a2036", "#0a0d18"), { deep: 0.9 });
          G.cut(g, [[w2[0], w2[1] - 15], [w2[0], w2[1] + 32]], S.lime, 0.9); G.cut(g, [[w2[0] - 12, w2[1] + 10], [w2[0] + 12, w2[1] + 10]], S.lime, 0.8);
        });
        G.part(g, [[78, gy, 1], [78, gy - 56], [96, gy - 74], [114, gy - 56], [114, gy, 1]], S.lime, { lw: 1.3, seed: 70, steps: 4 });
        G.hollow(g, [[84, gy], [84, gy - 54], [96, gy - 66], [108, gy - 54], [108, gy]], pal("#4a3322", "#7a5a40", "#241810", "#0c0805"), { deep: 0.95 });
        /* the roof edge in section: a hatched rafter under the slate, a lead flashing, a lead-lined gutter that tilts to the spout, a stepped stone cornice with its drip groove */
        var i, rafter = pal("#9a7248", "#d4aa72", "#4a3016", "#20140a");
        G.part(g, [[F.x0, top - 40, 1], [wx - 104, top - 21, 1], [wx - 104, top - 8, 1], [F.x0, top - 24, 1]], rafter, { lw: 1.1, steps: 1, seed: 71, hatchGap: 2.4 });
        for (var rh = F.x0 + 10; rh < wx - 100; rh += 20) G.cut(g, [[rh, top - 40 + (rh - F.x0) * 0.059], [rh + 9, top - 25 + (rh - F.x0) * 0.059]], rafter, 0.6);
        G.part(g, [[F.x0, top - 54, 1], [wx - 104, top - 35, 1], [wx - 104, top - 21, 1], [F.x0, top - 40, 1]], SLATE, { lw: 1.2, steps: 1, seed: 72 });
        for (var si = 0; si < 14; si++) { var sxs = F.x0 + si * 30, sys = top - 54 + (sxs - F.x0) * 0.059; G.cut(g, [[sxs, sys], [sxs + 8, sys + 13]], SLATE, 0.6); }
        for (si = 1; si < 3; si++) G.cut(g, [[F.x0, top - 54 + si * 4.6], [wx - 104, top - 35 + si * 4.6]], SLATE, 0.5);
        G.part(g, [[wx - 150, top - 41, 1], [wx - 96, top - 34, 1], [wx - 96, top - 29, 1], [wx - 150, top - 35, 1]], LEAD, { lw: 0.9, steps: 1, seed: 74, pits: false });
        G.part(g, [[wx - 104, top - 27, 1], [wx + 10, top - 23, 1], [wx + 10, top - 6, 1], [wx - 104, top - 10, 1]], LEAD, { lw: 1.3, steps: 1, seed: 75 });
        G.part(g, [[wx - 98, top - 21, 1], [wx + 6, top - 18, 1], [wx + 6, top - 12, 1], [wx - 98, top - 15, 1]], pal("#4f6a82", "#a8c2da", "#223444", "#0a1018"), { lw: 0.6, steps: 1, pits: false });
        G.part(g, [[F.x0, top - 6, 1], [wx + 4, top - 6, 1], [wx + 4, top - 1, 1], [wx + 12, top - 1, 1], [wx + 12, top + 8, 1], [wx + 6, top + 11, 1], [wx + 6, top + 15, 1], [F.x0, top + 15, 1]], S.lime, { lw: 1.3, steps: 1, seed: 73 });
        G.cut(g, [[F.x0, top + 3], [wx + 3, top + 3]], S.lime, 0.8, { glint: 1 }); G.cut(g, [[F.x0, top + 10], [wx + 4, top + 10]], S.lime, 0.6);
        G.hollow(g, [[wx + 6.5, top + 8], [wx + 11, top + 8], [wx + 11, top + 11.5], [wx + 6.5, top + 11.5]], S.lime, { deep: 0.9, lw: 0.4 });          /* the drip groove under the overhang */
        g.fillStyle = "rgba(20,22,26,.22)"; g.fillRect(F.x0, top + 15, wx + 6 - F.x0, 9);
        if (m.wet) {
          /* the stain, run the whole height of the wall: a dark apron under the cornice, green-black algae in fanned tapering streaks, dark joints, a damp plinth */
          var gr = g.createLinearGradient(0, top + 15, 0, top + 52); gr.addColorStop(0, "rgba(28,40,34,.72)"); gr.addColorStop(1, "rgba(28,40,34,0)"); g.fillStyle = gr; g.fillRect(wx - 140, top + 15, 142, 40);
          var rs = G.rng(91), len = [320, 292, 262, 236, 204, 172, 138, 100, 68], H0 = gy - top - 20;
          for (i = 0; i < 9; i++) {
            var sx = wx - 10 - i * 14.5 - rs() * 4, sl = Math.min(H0, len[i] * (0.82 + 0.18 * rainK)), sw = 7.4 - i * 0.5, lean = -i * 2.6;
            g.fillStyle = "rgba(34,56,42," + (0.58 - i * 0.03) + ")"; g.beginPath(); g.moveTo(sx - sw, top + 20); g.quadraticCurveTo(sx - sw * 0.6 + lean * 0.3, top + 20 + sl * 0.6, sx + lean, top + 20 + sl); g.quadraticCurveTo(sx + sw * 0.6 + lean * 0.3, top + 20 + sl * 0.6, sx + sw, top + 20); g.closePath(); g.fill();
            g.fillStyle = "rgba(160,200,210,.2)"; g.beginPath(); g.moveTo(sx - sw * 0.2, top + 22); g.quadraticCurveTo(sx - sw * 0.1 + lean * 0.3, top + 20 + sl * 0.5, sx + lean * 0.9, top + 16 + sl * 0.82); g.lineTo(sx + lean * 0.9 + 0.8, top + 16 + sl * 0.82); g.quadraticCurveTo(sx + 0.6 + lean * 0.3, top + 20 + sl * 0.5, sx + sw * 0.1, top + 22); g.fill();
          }
          g.strokeStyle = "rgba(20,30,26,.55)"; g.lineWidth = 1; for (var yy = top + 24; yy < gy - 6; yy += 18) { g.globalAlpha = 0.9 - (yy - top) / 520; g.beginPath(); g.moveTo(wx - 150, yy); g.lineTo(wx, yy); g.stroke(); } g.globalAlpha = 1;
          for (var jx = wx - 140; jx < wx; jx += 26) { g.strokeStyle = "rgba(20,30,26,.3)"; g.beginPath(); g.moveTo(jx, top + 24); g.lineTo(jx + (jx - wx) * 0.05, gy - 10); g.stroke(); }
          var pg = g.createLinearGradient(0, gy - 44, 0, gy); pg.addColorStop(0, "rgba(40,54,50,0)"); pg.addColorStop(1, "rgba(40,54,50,.6)"); g.fillStyle = pg; g.fillRect(wx - 160, gy - 44, 160, 44);
        }
        /* the vertical dimension line: a tick every metre, 10 m at the middle */
        g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(22, top); g.lineTo(22, gy); g.stroke();
        for (i = 0; i <= 10; i++) { g.beginPath(); g.moveTo(i % 5 ? 17 : 13, top + i * s); g.lineTo(27, top + i * s); g.stroke(); }
        label(g, 31, (top + gy) / 2, "10 m", { size: 11 });
        /* the ground ruler out from the wall: a tick every half metre, a number each metre */
        g.strokeStyle = INK; g.lineWidth = 1.1; g.beginPath(); g.moveTo(wx, gy + 14); g.lineTo(wx + 6.5 * s, gy + 14); g.stroke();
        g.font = "700 9px " + FONT; g.fillStyle = INK; g.textAlign = "center"; g.textBaseline = "top";
        for (i = 0; i <= 13; i++) { g.beginPath(); g.moveTo(wx + i * s / 2, gy + 14); g.lineTo(wx + i * s / 2, gy + (i % 2 ? 19 : 23)); g.stroke(); if (!(i % 2)) g.fillText(String(i / 2), wx + i * s / 2, gy + 25); }
        g.restore();
      });
      enter(c, F);
      /* the gust: a tap on the wall or the sky pushes the rain over for 600 ms and the person tips the umbrella */
      var pxm = m.wet ? 0.3 : m.land + 0.35, perX = wx + pxm * s, perH = 1.7 * s;
      var tSpout = tapHit(st, F, wx + 18, top + 4, 34, true), tP = tapHit(st, F, perX, gy - 28, 34, false);
      var tGust = pms >= 0 && tSpout < 0 && tP < 0 ? pms : -1;
      var gust = tGust >= 0 && tGust < 600 ? sin(PI * tGust / 600) : 0, slope = 0.1 + 0.25 * gust;
      streaks(c, F.x0, F.y0, F.w, gy - F.y0, t, 70 + Math.round(wet * 60), slope, "rgba(48,66,92,.5)", 2, 0.65);
      /* the gutter's flow: three chevrons moving at the speed the water leaves the spout */
      var vpx = m.v * s / 1000, gdist = 106, fl = (t * vpx * 6) % gdist;
      c.strokeStyle = "rgba(235,248,255,.95)"; c.lineWidth = 1.5; c.lineCap = "round";
      if (st.rain > 0.5) for (var k = 0; k < 3; k++) { var cx = wx - 100 + ((fl + k * gdist / 3) % gdist), cy = top - 22 + (cx - (wx - 100)) / gdist * 4; c.beginPath(); c.moveTo(cx - 3, cy - 2.4); c.lineTo(cx + 1.5, cy); c.lineTo(cx - 3, cy + 2.4); c.stroke(); }
      /* the gargoyle at its length: never smaller than a 34 px beast, its mouth always at the true spout length, only what projects past the wall shown; a corbel carries it */
      var Lp = st.L * s, size = Math.max(Lp * 1.04, 34), bx = wx + Lp - 0.95 * size, by = top - size * 0.48, cw2 = Math.min(Lp * 0.8 + 8, 26);
      G.part(c, [[wx - 14, top + 15, 1], [wx + cw2, top + 15, 1], [wx + cw2 - 3, top + 22, 1], [wx - 14, top + 44, 1]], S.lime, { lw: 1.1, steps: 1, seed: 74 });
      G.cut(c, [[wx - 10, top + 18], [wx + cw2 - 4, top + 18]], S.lime, 0.6, { glint: 1 });
      c.save(); c.beginPath(); c.rect(wx - 2, top - 70, 520, 140); c.clip();
      var mo = G.beast(c, "notre", bx, by, size, { t: t, rain: wet, poke: tSpout });
      c.restore();
      var mx = mo ? mo.x : wx + Lp, my = mo ? mo.y : top + 10;
      /* the jet and its landing */
      var vx = vpx, gpx = 9.81 * s / 1e6, land = wx + m.land * s, end = null;
      if (st.rain > 0.5 && !m.wet) end = jetRibbon(c, mx, my, vx, 0, gpx, gy, 2.4 + 3.2 * rainK, 1.5, t, { seed: 5, dt: 14, drops: 9 });
      /* wet: the water clings and runs down the face, drips on the stain */
      if (m.wet && st.rain > 2) for (var d = 0; d < 5; d++) { var ph = (t * 0.0006 * (0.8 + d * 0.08) + d / 5) % 1, dx = wx - 10 - d * 11, dh = [158, 126, 104, 90, 76][d]; c.fillStyle = "rgba(170,208,235,.95)"; c.beginPath(); c.arc(dx - d * 2.4 * ph, top + 16 + ph * dh, 1.8 - d * 0.1, 0, 7); c.fill(); }
      /* a puddle that grows, ripples where the water lands */
      var pw = 8 + 40 * Math.min(1, wet / 0.8) * (0.8 + 0.2 * sin(t * 0.0008)), px = m.wet ? wx + 18 : land;
      c.fillStyle = "rgba(96,132,156,.5)"; c.beginPath(); c.ellipse(px, gy + 4, pw, 4.5, 0, 0, 7); c.fill();
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 0.8; c.beginPath(); c.ellipse(px, gy + 3.5, pw * 0.9, 3.6, 0, PI * 1.1, PI * 1.7); c.stroke();
      if (st.rain > 0.5) ripples(c, px, gy + 4, t, 3, pw * 0.7, "rgba(255,255,255,.8)", 3);
      /* the brackets on the ground ruler: the spout's length, then the throw beyond it */
      var yb = gy + 40;
      c.lineWidth = 1.6; c.lineCap = "butt"; c.strokeStyle = INK; c.beginPath(); c.moveTo(wx, yb); c.lineTo(wx + Lp, yb); c.stroke();
      if (!m.wet && st.rain > 0.5) { c.strokeStyle = HOT; c.beginPath(); c.moveTo(wx + Lp, yb); c.lineTo(land, yb); c.stroke(); c.beginPath(); c.moveTo(land, yb - 4); c.lineTo(land, yb + 4); c.stroke(); }
      c.strokeStyle = INK; c.beginPath(); c.moveTo(wx, yb - 4); c.lineTo(wx, yb + 4); c.moveTo(wx + Lp, yb - 4); c.lineTo(wx + Lp, yb + 4); c.stroke();
      label(c, wx + 6, yb + 14, "spout " + st.L.toFixed(2) + " m", { size: 10 });
      if (!m.wet && st.rain > 0.5) label(c, max(land + 10, wx + 120), yb + 14, "throw +" + m.x.toFixed(2) + " m", { size: 10, line: HOT });
      /* the landing tag */
      if (st.rain > 0.5) {
        var tag = m.wet ? "0 m" : m.land.toFixed(2) + " m", ty = gy - 26 - 6 * sin(t * 0.003), tgx = m.wet ? wx - 30 : px;
        c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.moveTo(px, gy - 2); c.lineTo(m.wet ? tgx : px, m.wet ? gy - 22 : ty + 8); c.stroke();
        label(c, m.wet ? tgx : px - 5, m.wet ? gy - 22 : ty, tag, { align: "right", size: 11, fill: "#fff3c4" });
      }
      /* the person, 1.7 m tall, with an umbrella: a step clear of the wall when dry, hard against it when the face is running */
      var look = tP >= 0 ? G.clamp(env(tP, 1200) * 1.4, 0, 1) : 0;
      var tilt = (m.wet ? -0.4 : -0.1) + gust * -0.35 + (tP >= 0 ? -env(tP, 1000) * 0.9 : 0), wob = sin(t * 0.017) * 0.5 * rainK + sin(t * 0.031) * 0.3 * rainK;
      var fig = figure(c, perX, gy, perH, pal("#4a5568", "#8794a8", "#222a36", "#0c1118"), { dir: -1, t: t, seed: 5, aF: 1.6, bF: 1.2, aB: 0.12, bB: 0.2, look: [-0.2, -look * 1.2], poke: tP });
      umbrella(c, fig.hand[0] - 1, fig.hand[1] - 14, 22, tilt, t, wob);
      if (tP >= 0 && tP < 900) { var tu = tP / 900; c.fillStyle = "rgba(170,208,235,.9)"; for (var q = 0; q < 9; q++) { c.beginPath(); c.arc(fig.hand[0] - 26 * cos(q) * tu - 4, fig.hand[1] - 24 + sin(q * 1.7) * 10 * tu + tu * tu * 40, 1.3, 0, 7); c.fill(); } }
      /* the loupe: the spout lip at x14, always on, with the water's behaviour inside */
      var lx = wx + 110, ly = top + 8, LR = 56;
      c.strokeStyle = INK; c.lineWidth = 1; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(mx, my); c.lineTo(lx - LR * 0.92, ly + LR * 0.3); c.stroke(); c.setLineDash([]);
      c.fillStyle = INK; c.beginPath(); c.arc(mx, my, 1.8, 0, 7); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.arc(mx, my, 6, 0, 7); c.stroke();
      c.save(); c.beginPath(); c.arc(lx, ly, LR, 0, 7); c.clip();
      c.fillStyle = "#e9e1cb"; c.fillRect(lx - LR, ly - LR, LR * 2, LR * 2);
      var lf = (t * 0.0009) % 1;
      if (m.wet) {
        G.part(c, [[lx - LR - 4, ly - LR - 4, 1], [lx - 14, ly - LR - 4, 1], [lx - 14, ly + LR + 4, 1], [lx - LR - 4, ly + LR + 4, 1]], S.lime, { lw: 1.4, steps: 1, seed: 81 });
        for (var jy = ly - 50; jy < ly + 60; jy += 22) G.cut(c, [[lx - LR, jy], [lx - 14, jy]], S.lime, 0.8);
        G.part(c, [[lx - 16, ly - 14, 1], [lx + 22, ly - 12, 1], [lx + 28, ly - 2], [lx + 24, ly + 8], [lx - 16, ly + 10, 1]], S.lime, { lw: 1.5, seed: 82, steps: 3 });
        G.cut(c, [[lx - 14, ly - 6], [lx + 20, ly - 5]], S.lime, 1.3, { col: "#2a3a46" });
        /* water over the lip, curling back under it, then down the face */
        c.lineCap = "round"; c.lineJoin = "round";
        [[7, "rgba(96,150,196,.95)"], [2.6, "rgba(235,248,255,.9)"]].forEach(function (L) { c.strokeStyle = L[1]; c.lineWidth = L[0]; c.beginPath(); c.moveTo(lx - LR, ly - 12); c.lineTo(lx + 22, ly - 11); c.quadraticCurveTo(lx + 33, ly - 6, lx + 26, ly + 5); c.quadraticCurveTo(lx + 16, ly + 14, lx - 10, ly + 16); c.lineTo(lx - 14, ly + 20); c.lineTo(lx - 12, ly + LR); c.stroke(); });
        for (var q2 = 0; q2 < 4; q2++) { var pp = (lf + q2 / 4) % 1; c.fillStyle = "rgba(96,150,196,.95)"; c.beginPath(); c.ellipse(lx - 13 + sin(q2 * 2) * 1.5, ly + 22 + pp * 34, 2.2, 3.2 + pp, 0, 0, 7); c.fill(); }
      } else {
        var lsz = 150, lox = lx + 14 - 197 * lsz / 200, loy = ly - 6 - 109 * lsz / 200;
        G.beast(c, "notre", lox, loy, lsz, { t: t, rain: wet, poke: tSpout });
        jetRibbon(c, lx + 14, ly - 6, 0.05, 0.002, 0.0009, ly + LR + 10, 7, 3.4, t, { seed: 8, dt: 18, drops: 5, splash: false, brk: 0.7 });
      }
      c.restore();
      c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.arc(lx, ly, LR, 0, 7); c.stroke();
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1.4; c.beginPath(); c.arc(lx, ly, LR - 4, PI * 1.05, PI * 1.45); c.stroke();
      label(c, lx + LR * 0.55, ly + LR * 0.82, "x14", { align: "center", size: 10 });
      c.restore();
    } };

  /* ================================================================ a thousand dragons */
  var MAR = S.marble, GLZ = S.glaze, REDC = S.red;
  /* a chishou seen end-on: a muzzle with nostrils, brow ridges, two side horns, an open mouth with a tongue; (x, y) its centre, s its width */
  function chishou(c, x, y, s, st) {
    var lw = 0.5 + s * 0.03; c.save(); c.translate(x, y); c.scale(s, s);
    /* a mane of curling locks each side, ear fins, then the shield of the face */
    [[-1], [1]].forEach(function (d) {
      for (var i = 0; i < 3; i++) G.lock(c, d[0] * 0.46, -0.05 + i * 0.2, d[0] > 0 ? 0.1 + i * 0.55 : PI - 0.1 - i * 0.55, 0.36, 0.09, d[0] * 0.9, st, { lw: lw / s, hatch: false, pits: false });
      G.lock(c, d[0] * 0.36, -0.46, d[0] > 0 ? -1.0 : -2.14, 0.58, 0.12, d[0] * 0.9, st, { lw: lw / s, hatch: false, pits: false });
    });
    G.part(c, [[-0.46, -0.52], [0, -0.7], [0.46, -0.52], [0.6, -0.08], [0.42, 0.4], [0, 0.62], [-0.42, 0.4], [-0.6, -0.08]], st, { lw: lw / s, pits: false, hatch: false, steps: 3 });
    G.cut(c, [[0, -0.66], [0, -0.38]], st, 0.05);
    G.part(c, [[-0.52, -0.32], [-0.3, -0.46], [-0.06, -0.26], [-0.2, -0.2], [-0.42, -0.2]], st, { lw: lw * 0.8 / s, pits: false, hatch: false, steps: 2, lift: 0.4 });
    G.part(c, [[0.52, -0.32], [0.3, -0.46], [0.06, -0.26], [0.2, -0.2], [0.42, -0.2]], st, { lw: lw * 0.8 / s, pits: false, hatch: false, steps: 2, lift: 0.4 });
    G.part(c, [[-0.3, 0.0], [0.3, 0.0], [0.36, 0.24], [0.18, 0.34], [-0.18, 0.34], [-0.36, 0.24]], st, { lw: lw * 0.7 / s, pits: false, hatch: false, steps: 3, lift: 1.2 });
    G.hollow(c, [[-0.26, 0.28], [0.26, 0.28], [0.2, 0.55], [0, 0.6], [-0.2, 0.55]], st, { deep: 1, lw: 0.02 });
    c.fillStyle = "#c4564a"; c.beginPath(); c.ellipse(0, 0.5, 0.11, 0.07, 0, 0, 7); c.fill();
    c.fillStyle = "#fffdf4"; c.beginPath(); for (var f = 0; f < 4; f++) { var fx = (f - 1.5) * 0.12; c.moveTo(fx - 0.04, 0.29); c.lineTo(fx, 0.38); c.lineTo(fx + 0.04, 0.29); } c.fill();
    c.fillStyle = INK; [[-0.25, -0.12], [0.25, -0.12]].forEach(function (e) { c.beginPath(); c.ellipse(e[0], e[1], 0.075, 0.055, e[0] > 0 ? -0.3 : 0.3, 0, 7); c.fill(); }); [[-0.1, 0.12], [0.1, 0.12]].forEach(function (e) { c.beginPath(); c.arc(e[0], e[1], 0.04, 0, 7); c.fill(); });
    c.restore();
  }
  /* a corner chishou in three-quarter view, projecting out of the slab like the real ones: a brow curl, a ridge over the eye, a flared nostril,
     an open jaw with a tongue (the jet leaves from its tip), a paw gripping the slab beneath. 100-unit frame, rear of the head at the origin, facing right
     (dir -1 mirrors it); (x, y) is where it leaves the post and s its length in px. */
  function chishou34(c, x, y, s, st, dir) {
    c.save(); c.translate(x, y); c.rotate(dir * 0.1); c.scale(dir * s / 100, s / 100); if (dir < 0) G.light(true);
    var tg = pal("#d98a80", "#f4b6ac", "#8c3a34", "#32100c"), i;
    try {
      G.part(c, [[-30, -22], [10, -28], [34, -20], [40, 12], [12, 24], [-30, 22]], st, { lw: 1.4, steps: 3, pits: false });
      G.part(c, [[4, 12], [22, 10], [34, 20], [33, 31], [20, 35], [8, 31]], st, { lw: 1.2, steps: 3, pits: false, round: 0.6 });
      for (i = 0; i < 3; i++) { G.cut(c, [[13 + i * 7, 20], [15 + i * 7, 33]], st, 0.9); G.lock(c, 14 + i * 7, 34, 1.5, 6, 2, 0.4, st, { lw: 0.6, hatch: false, pits: false }); }
      G.part(c, [[24, 2], [56, 8], [84, 8], [93, 14], [84, 23], [52, 23], [26, 16]], st, { lw: 1.3, steps: 3, pits: false });
      G.part(c, [[50, 7], [88, 9], [100, 16], [90, 21], [56, 15]], tg, { lw: 1, steps: 3, pits: false, hatch: false }); G.cut(c, [[56, 12], [80, 14], [94, 17]], tg, 0.7);
      G.teeth(c, [[86, 11], [62, 11], [40, 9]], 3, 4, -1, st, { col: "#ffffff", fangs: [0] });
      G.part(c, [[0, -30], [18, -37], [42, -33], [66, -26], [84, -18], [93, -8, 1], [91, 3, 1], [60, 5], [30, 3], [4, -6]], st, { lw: 1.6, steps: 4, pits: true, round: 0.7 });
      G.part(c, [[20, -31], [44, -36], [64, -27], [56, -21], [42, -27], [28, -22]], st, { lw: 1.2, steps: 3, pits: false, lift: 1.2 });
      G.cut(c, spiralPts(12, -26, 1, 8, 1.7, 0.4, 1), st, 1, { glint: 1 }); G.cut(c, [[26, -24], [42, -29], [58, -24]], st, 0.9, { glint: 1 });
      G.hollow(c, [[45, -14], [52, -20], [59, -14], [52, -9]], st, { deep: 0.9, lw: 0.7 }); G.dot(c, 52, -14, 1.8, st.ink); G.cut(c, [[45, -15], [52, -21], [60, -14]], st, 1);
      G.part(c, [[75, -14], [82, -21], [91, -15], [89, -5], [80, -5]], st, { lw: 1.1, steps: 3, pits: false, round: 0.8 }); G.hollow(c, [[82, -14], [88, -14], [88, -9], [83, -9]], st, { deep: 1, lw: 0.5 });
      G.cut(c, [[60, -16], [72, -12], [78, -7]], st, 0.7); G.cut(c, [[92, 1], [74, 4], [50, 5]], st, 0.8);
      G.teeth(c, [[91, 3], [62, 5], [34, 3]], 5, 4.6, 1, st, { col: "#ffffff", fangs: [0, 4] });
      G.lock(c, 4, -30, -2.5, 26, 6, 1.2, st, { lw: 1 }); G.lock(c, 14, -34, -2.0, 22, 5, -1, st, { lw: 0.9 });
      G.cut(c, [[-10, -18], [-4, -8], [-12, 4]], st, 0.8);
    } finally { c.restore(); G.light(false); }
  }
  var FB = { heads: [], roofs: null };
  function tiers() {
    return [{ w: 440, ft: 190, fb: 228, n: 9, land: 236, k: 0 }, { w: 560, ft: 246, fb: 286, n: 12, land: 294, k: 1 }, { w: 680, ft: 304, fb: 354, n: 15, land: 364, k: 2 }];
  }
  function spurt(c, x, y, dx, drop, w, t, seed, splash) {
    var pts = []; for (var i = 0; i <= 8; i++) { var u = i / 8; pts.push([x + dx * u, y + drop * u * u * 0.9 + drop * u * 0.1 + 0]); }
    c.save(); c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = "rgba(96,150,196,.9)"; c.lineWidth = w; c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.stroke();
    c.strokeStyle = "rgba(240,250,255,.85)"; c.lineWidth = Math.max(0.5, w * 0.3); c.beginPath(); pts.forEach(function (p, i) { var yy = p[1] + sin(t * 0.03 + i * 1.3 + seed) * 0.3; if (i) c.lineTo(p[0] - w * 0.15, yy); else c.moveTo(p[0] - w * 0.15, yy); }); c.stroke();
    if (splash) { var e = pts[8]; c.strokeStyle = "rgba(252,254,255,.9)"; c.lineWidth = 0.9; var ph = (t * 0.003 + seed * 0.37) % 1; c.globalAlpha = 1 - ph; c.beginPath(); c.ellipse(e[0], e[1], 2 + w * 0.9 + ph * 6, (2 + w * 0.9 + ph * 6) * 0.28, 0, PI, 0); c.stroke(); }
    c.restore();
  }
  SC.forbidden = { w: 760, h: 440,
    draw: function (c, W, H, st) {
      var rain0 = st.arg != null ? +st.arg : (st.rain || 0), t = st.t, F = fit(W, H, 760, 440), pms = pokeOf(st), CX = 380, TR = tiers();
      var roofTap = false, headTap = -1, tapq = tapPt(st);
      /* a tap on the roof brings a thunder-flash and more rain for a second; on a head, that head and its three nearest neighbours spit */
      var thunder = 0;
      if (pms >= 0 && tapq) { var ty0 = (tapq[1] - F.oy) / F.s; roofTap = ty0 < 128; }
      if (roofTap) thunder = env(pms, 1000);
      var rain = G.clamp(rain0 + thunder * 0.55, 0, 1);
      layer(c, W, H, "fb", function (g) {
        enter(g, F);
        sky(g, F.x0, F.y0, F.w, 356, "#a9bdc9", 81);
        earth(g, F.x0, 354, F.w, F.y0 + F.h - 354, "#b9ae96", 82, 0.8);
        /* stone flags */
        g.strokeStyle = G.rgba(INK, 0.28); g.lineWidth = 0.9; for (var yy = 362, row = 0; yy < F.y0 + F.h; yy += 14 + row * 2.4, row++) { g.beginPath(); g.moveTo(F.x0, yy); g.lineTo(F.x0 + F.w, yy); g.stroke(); for (var xx = F.x0 + (row % 2) * 24; xx < F.x0 + F.w; xx += 48 + row * 3) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx - 2, yy + 14 + row * 2.4); g.stroke(); } }
        /* ---- the hall: a double-eave hip roof, a bracket frieze under each, red columns with lattice doors between them */
        var cols = 6, cx0 = CX - 80;
        G.part(g, [[CX - 84, 168, 1], [CX - 84, 118, 1], [CX + 84, 118, 1], [CX + 84, 168, 1]], pal("#6e1c10", "#a3321f", "#3a0b05", "#150402"), { lw: 1.2, steps: 1, seed: 90, pits: false });
        for (var i = 0; i < cols - 1; i++) {
          var bx = cx0 + 6 + i * 31.2;
          G.hollow(g, [[bx + 5, 164], [bx + 5, 124], [bx + 25.6, 124], [bx + 25.6, 164]], pal("#4a1008", "#7a2314", "#240603", "#0c0201"), { deep: 0.8, lw: 0.6 });
          for (var q = 0; q < 5; q++) { G.cut(g, [[bx + 6 + q * 4.7, 125], [bx + 6 + q * 4.7, 163]], GLZ, 0.35, { col: "#caa43a" }); G.cut(g, [[bx + 5.5, 128 + q * 8.6], [bx + 25, 128 + q * 8.6]], GLZ, 0.35, { col: "#caa43a" }); }
        }
        for (i = 0; i < cols; i++) { var px2 = cx0 + i * 31.2 + 1; G.part(g, [[px2 - 4.6, 168, 1], [px2 - 4, 122, 1], [px2 + 4, 122, 1], [px2 + 4.6, 168, 1]], REDC, { lw: 1.1, steps: 1, seed: 91 + i }); G.cut(g, [[px2 - 1.2, 124], [px2 - 1.6, 164]], REDC, 0.5, { glint: 1 }); }
        /* the brackets (dougong) under the lower eave */
        var fr = function (x0, x1, y0, h) { var cc = ["#2e8f84", "#c9a227", "#2b5aa0", "#c9a227"], n2 = Math.round((x1 - x0) / 7); for (var b = 0; b < n2; b++) { g.fillStyle = cc[b % 4]; g.fillRect(x0 + b * (x1 - x0) / n2, y0, (x1 - x0) / n2 - 0.8, h); g.fillStyle = "rgba(255,255,255,.3)"; g.fillRect(x0 + b * (x1 - x0) / n2, y0, (x1 - x0) / n2 - 0.8, 1.2); g.fillStyle = "rgba(0,0,0,.28)"; g.fillRect(x0 + b * (x1 - x0) / n2, y0 + h - 1.6, (x1 - x0) / n2 - 0.8, 1.6); } g.strokeStyle = INK; g.lineWidth = 0.8; g.strokeRect(x0, y0, x1 - x0, h); };
        fr(CX - 108, CX + 108, 112, 8); fr(CX - 84, CX + 84, 76, 7);
        /* roofs: yellow glaze, upturned corners, rows of tiles */
        G.part(g, [[CX - 72, 72, 1], [CX + 72, 72, 1], [CX + 114, 104], [CX + 120, 98, 1], [CX + 108, 114], [CX + 60, 118], [CX, 119], [CX - 60, 118], [CX - 108, 114], [CX - 120, 98, 1], [CX - 114, 104]], GLZ, { lw: 1.4, steps: 4, seed: 92, pits: false });
        for (i = 1; i < 6; i++) { var f = i / 6; G.cut(g, [[CX - 72 - 42 * f, 72 + 34 * f + 2], [CX, 72 + 38 * f + 4], [CX + 72 + 42 * f, 72 + 34 * f + 2]], GLZ, 0.6); }
        for (i = -11; i <= 11; i++) { G.cut(g, [[CX + i * 6.2, 74], [CX + i * 9.6, 111]], GLZ, 0.45, i % 2 ? {} : { col: "#a56e10" }); }
        G.cut(g, [[CX - 72, 72], [CX - 104, 92], [CX - 118, 100]], GLZ, 2.4, { col: "#8f5e05" }); G.cut(g, [[CX + 72, 72], [CX + 104, 92], [CX + 118, 100]], GLZ, 2.4, { col: "#8f5e05" }); G.cut(g, [[CX - 72, 73], [CX - 104, 93], [CX - 117, 101]], GLZ, 0.8, { col: "#fff2a6" }); G.cut(g, [[CX + 72, 73], [CX + 104, 93], [CX + 117, 101]], GLZ, 0.8, { col: "#fff2a6" });
        G.part(g, [[CX - 38, 36, 1], [CX + 38, 36, 1], [CX + 82, 68], [CX + 90, 62, 1], [CX + 80, 78], [CX + 40, 82], [CX, 83], [CX - 40, 82], [CX - 80, 78], [CX - 90, 62, 1], [CX - 82, 68]], GLZ, { lw: 1.4, steps: 4, seed: 93, pits: false });
        for (i = 1; i < 6; i++) { f = i / 6; G.cut(g, [[CX - 38 - 44 * f, 36 + 40 * f + 1], [CX, 36 + 44 * f + 3], [CX + 38 + 44 * f, 36 + 40 * f + 1]], GLZ, 0.6); }
        for (i = -6; i <= 6; i++) G.cut(g, [[CX + i * 5.6, 38], [CX + i * 9.6, 79]], GLZ, 0.45, i % 2 ? {} : { col: "#a56e10" });
        G.cut(g, [[CX - 38, 36], [CX + 38, 36]], GLZ, 2.6, { col: "#8f5e05" }); G.cut(g, [[CX - 38, 36], [CX + 38, 36]], GLZ, 1.2, { glint: 1 });
        G.cut(g, [[CX - 38, 37], [CX - 66, 52], [CX - 86, 64]], GLZ, 2, { col: "#8f5e05" }); G.cut(g, [[CX + 38, 37], [CX + 66, 52], [CX + 86, 64]], GLZ, 2, { col: "#8f5e05" });
        /* the ridge: a chiwen at each end, ten small beasts down the hip lines */
        [[-1], [1]].forEach(function (d) {
          var ex = CX + d[0] * 38;
          G.part(g, [[ex - d[0] * 2, 36, 1], [ex + d[0] * 4, 26], [ex + d[0] * 8, 18], [ex + d[0] * 6, 9, 1], [ex - d[0] * 1, 14], [ex - d[0] * 5, 22], [ex - d[0] * 7, 33, 1]], GLZ, { lw: 1, steps: 3, seed: 94, pits: false });
          G.hollow(g, [[ex + d[0] * 3, 14], [ex + d[0] * 6, 11], [ex + d[0] * 6.4, 16]], GLZ, { lw: 0.5 }); G.cut(g, [[ex - d[0] * 3, 32], [ex - d[0] * 1, 24], [ex + d[0] * 2, 18]], GLZ, 0.6);
          for (var b = 0; b < 5; b++) { var u = 0.16 + b * 0.17, bxx = G.lerp(ex, CX + d[0] * 88, u * 0.7), byy = G.lerp(36, 66, u * 0.9) - 2; G.part(g, [[bxx - 2.2, byy + 0.5, 1], [bxx - 1.6, byy - 3.4], [bxx, byy - 5.6], [bxx + 1.8, byy - 3], [bxx + 2.2, byy + 0.5, 1]], GLZ, { lw: 0.5, steps: 3, seed: 95 + b, pits: false, hatch: false }); G.lock(g, bxx + d[0] * 1.2, byy - 5, -1.5 + d[0] * 0.5, 2.8, 0.7, d[0] * 0.8, GLZ, { lw: 0.3, hatch: false }); }
        });
        FB.roofs = true;
        /* ---- the terrace: three tiers of marble, a balustrade of 9, 12 and 15 posts, a dragon head under every post */
        FB.heads = [];
        var strip = function (y0, y1) { G.part(g, [[CX - 340 - 10, y0, 1], [CX + 340 + 10, y0, 1], [CX + 340 + 10, y1, 1], [CX - 340 - 10, y1, 1]], MAR, { lw: 0.8, steps: 1, seed: 100, lift: 0.4, pits: true }); };
        TR.forEach(function (T, ti) {
          var x0 = CX - T.w / 2, sp = T.w / (T.n - 1), top2 = T.ft - 28;
          /* the surface of the tier above's foot, seen from above, a strip of flags */
          if (ti) { G.part(g, [[CX - TR[ti - 1].w / 2 - 22, TR[ti - 1].fb, 1], [CX + TR[ti - 1].w / 2 + 22, TR[ti - 1].fb, 1], [CX + T.w / 2 - 20, T.ft, 1], [CX - T.w / 2 + 20, T.ft, 1]], MAR, { lw: 1, steps: 1, seed: 100 + ti, lift: 0.5, pits: true }); }
          /* the face, with its string courses */
          G.part(g, [[x0 - 10, T.ft, 1], [x0 + T.w + 10, T.ft, 1], [x0 + T.w + 10, T.fb, 1], [x0 - 10, T.fb, 1]], MAR, { lw: 1.3, steps: 1, seed: 105 + ti, lift: 0.7, pits: true });
          G.cut(g, [[x0 - 8, T.ft + 4], [x0 + T.w + 8, T.ft + 4]], MAR, 0.7); G.cut(g, [[x0 - 8, T.fb - 5], [x0 + T.w + 8, T.fb - 5]], MAR, 0.8, { glint: 1 });
          /* the balustrade: rails, posts with cloud-cap capitals, recessed panels between them (three of them hollowed) */
          G.part(g, [[x0 - 10, top2, 1], [x0 + T.w + 10, top2, 1], [x0 + T.w + 10, top2 + 4, 1], [x0 - 10, top2 + 4, 1]], MAR, { lw: 1, steps: 1, seed: 110 + ti, pits: false });
          G.part(g, [[x0 - 10, T.ft - 5, 1], [x0 + T.w + 10, T.ft - 5, 1], [x0 + T.w + 10, T.ft, 1], [x0 - 10, T.ft, 1]], MAR, { lw: 1, steps: 1, seed: 115 + ti, pits: false });
          for (var k = 0; k < T.n - 1; k++) {
            var xa = x0 + k * sp + 8, xb = x0 + (k + 1) * sp - 8;
            G.part(g, [[xa, top2 + 7, 1], [xb, top2 + 7, 1], [xb, T.ft - 8, 1], [xa, T.ft - 8, 1]], MAR, { lw: 0.8, steps: 1, seed: 120 + k, pits: false, lift: 0.2 });
            G.cut(g, [[xa + 3, top2 + 11], [xb - 3, top2 + 11], [xb - 3, T.ft - 12], [xa + 3, T.ft - 12], [xa + 3, top2 + 11]], MAR, 0.5);
            if (k === 1 || k === T.n - 4 || k === Math.floor(T.n / 2) - 1) G.hollow(g, [[xa + 7, top2 + 14], [xb - 7, top2 + 14], [xb - 7, T.ft - 15], [xa + 7, T.ft - 15]], MAR, { deep: 0.5, lw: 0.6 });
          }
          for (k = 0; k < T.n; k++) {
            var px = x0 + k * sp, corner = k === 0 || k === T.n - 1, pw = corner ? 8 : 6.6;
            G.part(g, [[px - pw * 0.75, T.ft - 3, 1], [px - pw * 0.62, top2 + 8], [px - pw * 0.7, top2 + 6, 1], [px + pw * 0.7, top2 + 6, 1], [px + pw * 0.62, top2 + 8], [px + pw * 0.75, T.ft - 3, 1]], MAR, { lw: 1, steps: 2, seed: 130 + k + ti * 20, pits: false });
            G.part(g, [[px - pw, top2 + 7, 1], [px - pw * 1.05, top2 + 2], [px - pw * 0.6, top2 - 3], [px - pw * 0.2, top2 - 1], [px, top2 - 5], [px + pw * 0.3, top2 - 1], [px + pw * 0.7, top2 - 3], [px + pw * 1.05, top2 + 2], [px + pw, top2 + 7, 1]], MAR, { lw: 0.9, steps: 3, seed: 150 + k, pits: false, lift: 1.1 });
            G.cut(g, [[px - pw * 0.5, top2 + 2], [px - pw * 0.1, top2 - 1], [px + pw * 0.4, top2 + 1.6]], MAR, 0.45);
            G.part(g, [[px - pw * 0.9, T.ft - 5, 1], [px + pw * 0.9, T.ft - 5, 1], [px + pw * 0.9, T.ft, 1], [px - pw * 0.9, T.ft, 1]], MAR, { lw: 0.7, steps: 1, pits: false });
            /* the head under the post */
            var hs = corner ? 26 : 14, hy = T.ft + (corner ? 13 : 8) + 2;
            if (Math.abs(px - CX) > 58) { var cd = k === 0 ? -1 : 1; var cl = ti === 2 ? 30 : 38; if (corner) chishou34(g, px, hy - 3, cl, MAR, cd); else chishou(g, px, hy, hs, MAR); FB.heads.push({ x: px, y: hy, s: hs, ti: ti, k: k, land: T.land, corner: corner, dir: corner ? cd : 0, len: corner ? cl : 0 }); }
          }
        });
        /* the central stair: a sloped ramp carved with a dragon among clouds, steps either side, breaking all three tiers */
        var sx0 = CX - 58, sx1 = CX + 58;
        [[sx0, sx0 + 28], [sx1 - 28, sx1]].forEach(function (S2, si) {
          G.part(g, [[S2[0], 188, 1], [S2[1], 188, 1], [S2[1], 368, 1], [S2[0], 368, 1]], MAR, { lw: 1.3, steps: 1, seed: 160 + si, lift: 0.8, pits: false });
          for (var yy = 192; yy < 368; yy += 7) { g.fillStyle = "rgba(255,255,255,.65)"; g.fillRect(S2[0] + 1, yy, S2[1] - S2[0] - 2, 1.6); g.fillStyle = "rgba(60,64,76,.2)"; g.fillRect(S2[0] + 1, yy + 2.2, S2[1] - S2[0] - 2, 4); g.strokeStyle = G.rgba(INK, 0.4); g.lineWidth = 0.5; g.beginPath(); g.moveTo(S2[0], yy + 6.6); g.lineTo(S2[1], yy + 6.6); g.stroke(); }
        });
        G.part(g, [[CX - 30, 186, 1], [CX + 30, 186, 1], [CX + 34, 374, 1], [CX - 34, 374, 1]], MAR, { lw: 1.6, steps: 1, seed: 170, lift: 0.9, pits: true });
        G.cut(g, [[CX - 25, 192], [CX - 28, 366]], MAR, 1); G.cut(g, [[CX + 25, 192], [CX + 28, 366]], MAR, 1);
        G.cut(g, [[CX - 18, 214], [CX + 6, 228], [CX - 8, 248], [CX + 16, 266], [CX - 10, 290], [CX + 14, 312], [CX - 6, 336], [CX + 6, 360]], MAR, 3.4, { col: "#6b6e78" });
        G.cut(g, [[CX - 18, 214], [CX + 6, 228], [CX - 8, 248], [CX + 16, 266], [CX - 10, 290], [CX + 14, 312], [CX - 6, 336], [CX + 6, 360]], MAR, 1.5, { col: MAR.light, glint: 1 });
        G.part(g, [[CX - 9, 200, 1], [CX + 2, 192], [CX + 11, 201], [CX + 4, 210], [CX - 7, 208]], MAR, { lw: 0.9, steps: 3, pits: false });                 /* the dragon's head at the top */
        G.dot(g, CX + 2, 200, 0.9, INK); G.cut(g, [[CX + 4, 205], [CX + 10, 203]], MAR, 0.5);
        for (i = 0; i < 6; i++) { var cy2 = 232 + i * 25, cxx = CX + (i % 2 ? 14 : -16); G.cut(g, [[cxx - 7, cy2 + 3], [cxx - 5, cy2 - 3], [cxx, cy2 - 4], [cxx + 3, cy2 - 1], [cxx + 7, cy2 + 1], [cxx + 8, cy2 + 4]], MAR, 0.9); }
        g.restore();
      });
      var dprq = (c.getTransform ? c.getTransform().a : 1) || 1, fbSrc = CACHE["fb|" + W + "x" + H + "@" + dprq];
      enter(c, F);
      /* roof glints, a cloud shadow drifting across the terrace */
      c.save(); c.beginPath(); c.moveTo(CX - 72, 72); c.lineTo(CX + 72, 72); c.lineTo(CX + 114, 104); c.lineTo(CX + 108, 114); c.lineTo(CX - 108, 114); c.lineTo(CX - 114, 104); c.closePath();
      c.moveTo(CX - 38, 36); c.lineTo(CX + 38, 36); c.lineTo(CX + 82, 68); c.lineTo(CX + 80, 78); c.lineTo(CX - 80, 78); c.lineTo(CX - 82, 68); c.closePath(); c.clip();
      var gx = ((t * 0.045) % 560) - 120, gg = c.createLinearGradient(gx, 0, gx + 40, 0); gg.addColorStop(0, "rgba(255,255,230,0)"); gg.addColorStop(0.5, "rgba(255,255,230," + (0.55 * (1 - rain * 0.7)) + ")"); gg.addColorStop(1, "rgba(255,255,230,0)");
      c.fillStyle = gg; c.fillRect(gx - 20, 30, 80, 100); c.restore();
      var cxs = ((t * 0.012) % 1100) - 200, csg = c.createRadialGradient(cxs, 270, 10, cxs, 270, 190); csg.addColorStop(0, "rgba(50,62,84,.26)"); csg.addColorStop(1, "rgba(50,62,84,0)"); c.fillStyle = csg; c.fillRect(cxs - 200, 180, 400, 190);
      /* swallows cross the sky in a loose line, their wings beating */
      for (var sw = 0; sw < 3; sw++) { var sp0 = ((t * 0.045 + sw * 90) % 1000) - 120, sy0 = 56 + sw * 22 + sin(t * 0.0012 + sw * 2) * 12 + sin(sp0 * 0.02) * 8; bird(c, F.x0 + sp0 * F.w / 760, sy0, 1.1 - sw * 0.1, t * 0.016 + sw * 1.7, 1, "#3a3e4a"); }
      /* the pennants on the ridge-ends flutter */
      [[-1], [1]].forEach(function (d, q) { var ex = CX + d[0] * 42, fy = 10; c.fillStyle = HOT; c.strokeStyle = INK; c.lineWidth = 0.7; c.beginPath(); c.moveTo(ex, fy); c.lineTo(ex, fy - 14); c.stroke(); c.beginPath(); c.moveTo(ex, fy - 14); c.quadraticCurveTo(ex + d[0] * (7 + sin(t * 0.008 + q) * 2), fy - 13 + sin(t * 0.011 + q * 2), ex + d[0] * (13 + sin(t * 0.009 + q) * 3), fy - 10 + sin(t * 0.013 + q)); c.quadraticCurveTo(ex + d[0] * 6, fy - 8, ex, fy - 7); c.fill(); c.stroke(); });
      /* rain over everything; the eaves drip along the whole edge */
      streaks(c, F.x0, F.y0, F.w, 354 - F.y0, t, Math.round(rain * 150), 0.06 + (rain0 > 0 ? 0.04 : 0), "rgba(46,62,88,.55)", 8, 0.7);
      if (rain > 0.2) for (var d = 0; d < 28; d++) { var ex2 = CX - 114 + d * 8.2, ph = (t * 0.0013 * (0.8 + (d % 5) * 0.1) + d * 0.37) % 1; c.fillStyle = "rgba(150,196,226,.9)"; c.beginPath(); c.arc(ex2, 116 + ph * 26, 1.1, 0, 7); c.fill(); }
      /* heads: the wet-dark streaks under each, then jets, thick and short, landing on the tier below */
      var tapHd = -1; if (pms >= 0 && !roofTap) { var bd = 1e9; FB.heads.forEach(function (h, i) { var q2 = tapq ? hyp(tapq[0] - F.X(h.x), tapq[1] - F.Y(h.y)) / F.s : (i === Math.floor(FB.heads.length * 0.7) ? 0 : 1e9); if (q2 < 24 && q2 < bd) { bd = q2; tapHd = i; } }); }
      var near = []; if (tapHd >= 0) { var th2 = FB.heads[tapHd]; near = FB.heads.map(function (h, i) { return [hyp(h.x - th2.x, h.y - th2.y) + (h.ti === th2.ti ? 0 : 200), i]; }).sort(function (a, b) { return a[0] - b[0]; }).slice(1, 4).map(function (a) { return a[1]; }); }
      var tapEnv = pms >= 0 && pms < 500 ? sin(PI * pms / 500) : 0;
      FB.heads.forEach(function (h, i) {
        var sp = i === tapHd ? tapEnv : near.indexOf(i) >= 0 ? tapEnv * 0.6 : 0, fl = (rain > 0.05 ? rain * (h.corner ? 1.3 : 1) * (0.8 + 0.2 * sin(i * 7.1)) : 0) + sp * 1.2;
        if (rain > 0.05) { c.fillStyle = "rgba(58,72,92," + (0.2 + 0.3 * rain) + ")"; var sl = (h.corner ? 22 : 14) + rain * 10; c.beginPath(); c.moveTo(h.x - h.s * 0.25, h.y + h.s * 0.4); c.quadraticCurveTo(h.x - 0.5, h.y + h.s * 0.4 + sl * 0.5, h.x, h.y + h.s * 0.4 + sl); c.quadraticCurveTo(h.x + 0.5, h.y + h.s * 0.4 + sl * 0.5, h.x + h.s * 0.25, h.y + h.s * 0.4); c.fill(); }
        var jx = h.corner ? h.x + h.dir * h.len * 0.9 : h.x, jy = h.corner ? h.y + 8 : h.y + h.s * 0.5;
        if (fl > 0.04) spurt(c, jx, jy, (h.x - CX) / 340 * (8 + fl * 8), h.land - jy, (h.corner ? 4.8 : 2.8) * (0.5 + fl * 1.2), t + i * 97, i, true);
        if (sp > 0.1) { c.fillStyle = "rgba(255,226,120," + sp * 0.9 + ")"; c.beginPath(); if (h.corner) c.arc(h.x + h.dir * h.len * 0.52, h.y - 8, 5 * (1 + sp), 0, 7); else { c.arc(h.x - h.s * 0.24, h.y - h.s * 0.14, h.s * 0.12 * (1 + sp), 0, 7); c.arc(h.x + h.s * 0.24, h.y - h.s * 0.14, h.s * 0.12 * (1 + sp), 0, 7); } c.fill(); }
        /* at rest the heads are not still: each blinks in its own 4-6 s cycle, gathers a drip at the chin and lets it fall, and a wet sheen sweeps over it in turn */
        var bph = ((t + i * 977) % (4200 + (i % 3) * 800)) / (4200 + (i % 3) * 800);
        if (!h.corner && bph > 0.94) { c.fillStyle = MAR.base; var bl2 = sin((bph - 0.94) / 0.06 * PI); c.beginPath(); c.ellipse(h.x - h.s * 0.25, h.y - h.s * 0.12, h.s * 0.1, h.s * 0.07 * bl2, 0.3, 0, 7); c.ellipse(h.x + h.s * 0.25, h.y - h.s * 0.12, h.s * 0.1, h.s * 0.07 * bl2, -0.3, 0, 7); c.fill(); }
        var dph = ((t * 0.0002 + i * 0.19) % 1), dx0 = h.corner ? h.x + h.dir * h.len * 0.8 : h.x, dy0 = h.corner ? h.y + 14 : h.y + h.s * 0.58;
        if (rain > 0.05 || true) { if (dph < 0.5) { c.fillStyle = "rgba(150,196,230,.95)"; c.beginPath(); c.ellipse(dx0, dy0 + (dph < 0.3 ? 0 : (dph - 0.3) * (dph - 0.3) * 260), 0.9 + (dph < 0.3 ? dph : 0.3) * 1.4, 1.2 + (dph < 0.3 ? dph * 3 : 0.9 + (dph - 0.3) * 6), 0, 0, 7); c.fill(); } }
        var sph = ((t * 0.00016 + (h.ti * 0.31 + h.k * 0.047)) % 1);
        if (sph < 0.12) { var sa = sin(sph / 0.12 * PI); c.strokeStyle = "rgba(255,255,255," + 0.8 * sa + ")"; c.lineWidth = 1.1; c.lineCap = "round"; c.beginPath(); if (h.corner) { c.moveTo(h.x + h.dir * 12, h.y - 13); c.quadraticCurveTo(h.x + h.dir * 28, h.y - 20, h.x + h.dir * 40, h.y - 8); } else { c.moveTo(h.x - h.s * 0.38, h.y - h.s * 0.38); c.quadraticCurveTo(h.x - h.s * 0.1, h.y - h.s * 0.6, h.x + h.s * 0.2, h.y - h.s * 0.46); } c.stroke(); }
      });
      /* water veils fall from the tier lips once the rain is hard */
      if (rain > 0.65) TR.forEach(function (T, ti) { var a = G.clamp((rain - 0.65) * 1.6, 0, 0.5), vg = c.createLinearGradient(0, T.ft, 0, T.fb); vg.addColorStop(0, "rgba(200,226,248," + a + ")"); vg.addColorStop(1, "rgba(200,226,248," + a * 0.3 + ")"); c.fillStyle = vg; c.fillRect(CX - T.w / 2 - 10, T.ft + 4, T.w + 20, T.fb - T.ft - 4); c.strokeStyle = "rgba(240,250,255," + a * 1.4 + ")"; c.lineWidth = 0.8; for (var v = 0; v < T.w / 9; v++) { var vx = CX - T.w / 2 - 6 + v * 9.2 + (v % 3), ph3 = (t * 0.0016 + v * 0.31) % 1; c.beginPath(); c.moveTo(vx, T.ft + 4 + ph3 * (T.fb - T.ft) * 0.5); c.lineTo(vx, T.ft + 14 + ph3 * (T.fb - T.ft) * 0.7); c.stroke(); } });
      /* three small whole figures walk the lowest terrace, each in a different robe, one under a parasol: they give the marble its height */
      [[0, "#2f5aa0", "#7d9fd6", "#142a50", 1, 160, 330, 0.00004, 0], [1, "#b8321f", "#f08a68", "#5a1008", -1, 196, 316, 0.000052, 0.4], [2, "#d8b040", "#f6e090", "#6e5410", 1, 120, 290, 0.000035, 0.7]].forEach(function (Fg) {
        var v = t * Fg[7] * 2 + Fg[8], p = tri(v), dr = (v % 2 + 2) % 2 < 1 ? 1 : -1, fx = G.lerp(Fg[5] - 60, Fg[6] + 60, p), robe = pal(Fg[1], Fg[2], Fg[3], "#0e0a06");
        var fgp = figure(c, fx, 300, 25, robe, { dir: dr, t: t, seed: Fg[0] + 3, ph: t * 0.011 + Fg[0] * 2 });
        if (Fg[0] === 0) umbrella(c, fgp.hand[0] - 1, fgp.hand[1] - 7, 10, -0.15 * dr, t, 0);
      });
      /* the ground: a puddle that mirrors the yellow roof once it is raining hard, with ripples */
      if (rain > 0.4) {
        var pa = G.clamp((rain - 0.4) * 2, 0, 1), py0 = 408; c.save(); c.beginPath(); c.ellipse(CX + 4, py0, 250, 24, 0, 0, 7); c.clip();
        c.fillStyle = "rgba(100,136,158," + 0.55 * pa + ")"; c.fillRect(0, py0 - 30, 760, 60);
        /* the hall upside down in the water: the painted picture itself, mirrored and squashed to the puddle, cut into 2 px rows that slide with the ripples so the reflection breaks */
        var src = fbSrc;
        if (src) for (var yd = py0 - 24; yd < py0 + 24; yd += 2) {
          var ys = 172 - (yd - (py0 - 24)) / 0.3, offx = sin(t * 0.002 + yd * 0.35) * (1 + (yd - py0 + 24) * 0.07) + sin(t * 0.0057 + yd) * 0.6;
          c.globalAlpha = 0.9 * pa; c.drawImage(src, F.X(CX - 260) * dprq, F.Y(ys) * dprq, 520 * F.s * dprq, Math.max(1, 2 / 0.3 * F.s * dprq), CX - 260 + offx, yd, 520, 2.3);
        }
        c.globalAlpha = 1; c.fillStyle = "rgba(100,136,158," + 0.34 * pa + ")"; c.fillRect(0, py0 - 30, 760, 60);
        c.strokeStyle = "rgba(255,255,255," + 0.35 * pa + ")"; c.lineWidth = 1; for (var wv = 0; wv < 9; wv++) { var wy2 = py0 - 18 + wv * 4.6, ofs = sin(t * 0.002 + wv) * 4; c.beginPath(); c.moveTo(CX - 120 + ofs, wy2); c.lineTo(CX - 60 + ofs, wy2); c.moveTo(CX + 30 - ofs, wy2 + 1.5); c.lineTo(CX + 110 - ofs, wy2 + 1.5); c.stroke(); }
        c.restore(); c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 1; c.beginPath(); c.ellipse(CX + 4, py0, 250, 24, 0, 0, 7); c.stroke();
        for (var rp = 0; rp < 5; rp++) ripples(c, CX - 160 + rp * 80 + sin(rp * 3) * 20, py0 - 6 + (rp % 2) * 12, t + rp * 311, 2, 22, "rgba(255,255,255,.8)", rp);
      }
      /* thunder-flash wash */
      if (thunder > 0.02) { c.fillStyle = "rgba(255,255,244," + 0.55 * thunder + ")"; c.fillRect(F.x0, F.y0, F.w, F.h); }
      c.restore();
    } };

  /* ================================================================ the hiti: a sunken court in section */
  var NEWAR = pal("#7c3b29", "#b6694b", "#3d170d", "#1a0804"), BRASS = pal("#d8a03a", "#fff0b0", "#7a5210", "#2c1c02", 0.9), STONEH = S.andesite;
  /* two braided strands of water falling from (x, y) to the line y = gy */
  function braid(c, x, y, vx, g, gy, w, t, seed) {
    var T = 0, pts = [], k;
    for (k = 0; k < 90; k++) { var py = y + 0.5 * g * T * T; pts.push([x + vx * T, py, T]); if (py >= gy) break; T += 12; }
    c.save(); c.lineCap = "round"; c.lineJoin = "round";
    for (var pass = 0; pass < 3; pass++) {
      for (var sd = -1; sd <= 1; sd += 2) {
        c.strokeStyle = pass === 0 ? "rgba(88,140,186,.9)" : pass === 1 ? "rgba(150,198,232,.9)" : "rgba(246,252,255,.85)";
        c.lineWidth = pass === 0 ? w * 0.7 : pass === 1 ? w * 0.42 : w * 0.16;
        c.beginPath(); pts.forEach(function (p, i) { var u = i / pts.length, lat = sin(p[2] * 0.014 + (sd > 0 ? 0 : PI) + seed - t * 0.012) * w * 0.36 * (0.4 + u); if (i) c.lineTo(p[0] + lat, p[1]); else c.moveTo(p[0] + lat, p[1]); }); c.stroke();
      }
    }
    c.restore(); return pts[pts.length - 1];
  }
  SC.hiti = { w: 720, h: 440,
    draw: function (c, W, H, st) {
      var fill = st.arg != null ? +st.arg : (st.fill || 0), t = st.t, F = fit(W, H, 720, 440), pms = pokeOf(st), tq = tapPt(st);
      var FL = 340, WL = 356, SX = [356, 462, 568], PTOP = 74;
      var tSp = -1, tPot = -1;
      if (pms >= 0) {
        if (tq) { var tx = (tq[0] - F.ox) / F.s, ty = (tq[1] - F.oy) / F.s; if (hyp(tx - (SX[1] + 17), ty - 306) < 44) tPot = pms; else if (ty > 120 && ty < 290 && tx > 270 && tx < 620) tSp = pms; }
        else tSp = pms;
      }
      var surge = tSp >= 0 && tSp < 700 ? 1 + 0.6 * sin(PI * tSp / 700) : 1, rock = tSp >= 0 && tSp < 1100 ? sin(tSp * 0.02) * 0.05 * (1 - tSp / 1100) : 0;
      layer(c, W, H, "hiti", function (g) {
        enter(g, F);
        /* the back wall first, over the whole picture, so no sky can show between wall and floor */
        G.ashlar(g, F.x0, F.y0, F.w, F.h, NEWAR, { course: 11, seed: 3 });
        g.fillStyle = "rgba(20,8,4,.18)"; g.fillRect(F.x0, F.y0, F.w, F.h);
        /* the street band only gets the sky, a shrine's eave, cobbles and a parapet */
        sky(g, F.x0, F.y0, F.w, PTOP, "#b6c1c4", 121);
        /* shrine: the lower tier's eave, its carved struts, a stone step */
        G.part(g, [[F.x0 - 6, F.y0 - 6, 1], [262, F.y0 - 6, 1], [270, 20], [276, 34, 1], [246, 38], [120, 30], [F.x0 - 6, 24]], pal("#b4503a", "#e58a68", "#6a2214", "#2a0c06"), { lw: 1.4, steps: 4, seed: 122, pits: false });
        for (var i = 1; i < 5; i++) G.cut(g, [[F.x0, 4 + i * 5.4], [90, 6 + i * 5.4], [250, 12 + i * 5.2]], ROOF, 0.6);
        G.part(g, [[F.x0 - 6, 38, 1], [276, 40, 1], [276, 48, 1], [F.x0 - 6, 48, 1]], WOOD, { lw: 1.1, steps: 1, seed: 123, pits: false });
        [28, 100, 172, 236].forEach(function (sx) { G.part(g, [[sx - 2, 48, 1], [sx + 3, 48, 1], [sx + 17, 72, 1], [sx + 9, 74, 1]], WOOD, { lw: 0.9, steps: 1, pits: false }); G.cut(g, [[sx + 1, 50], [sx + 10, 63]], WOOD, 0.6, { glint: 1 }); G.dot(g, sx + 8, 62, 1.8, WOOD.light); });
        G.part(g, [[F.x0 - 6, 74, 1], [168, 74, 1], [168, 64, 1], [150, 64, 1], [150, 56, 1], [F.x0 - 6, 56, 1]], STONEH, { lw: 1.3, steps: 1, seed: 124 });
        G.cut(g, [[F.x0, 62], [146, 62]], STONEH, 0.7, { glint: 1 });
        /* cobbles at street level, the cut through the ground either side: soil with stones */
        [[F.x0 - 6, 110], [610, F.x0 + F.w + 6]].forEach(function (R, ri) {
          earth(g, R[0], PTOP, R[1] - R[0], 330, "#8a6a44", 125 + ri, 1.3);
          g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(R[0], PTOP); g.lineTo(R[1], PTOP); g.stroke();
          var rs = G.rng(130 + ri); for (var k = 0; k < 16; k++) { g.fillStyle = G.rgba(rs() < 0.5 ? "#5a4630" : "#b09a74", 0.7); g.beginPath(); g.ellipse(R[0] + 4 + rs() * (R[1] - R[0] - 8), PTOP + 10 + rs() * 300, 3 + rs() * 5, 2 + rs() * 3, rs() * 3, 0, 7); g.fill(); }
          for (k = 0; k < 7; k++) { var cxx = R[0] + 6 + k * ((R[1] - R[0]) / 7); g.fillStyle = "#c3b08a"; g.strokeStyle = INK; g.lineWidth = 0.7; g.beginPath(); g.ellipse(cxx + 8, PTOP - 2.4, 8, 3.4, 0, 0, 7); g.fill(); g.stroke(); }
        });
        /* a kerb of dressed stone along the street, where the walkers stand */
        G.part(g, [[F.x0 - 6, PTOP, 1], [F.x0 + F.w + 6, PTOP, 1], [F.x0 + F.w + 6, PTOP + 5, 1], [F.x0 - 6, PTOP + 5, 1]], STONEH, { lw: 0.9, steps: 1, seed: 128, pits: false });
        /* the low parapet, the top courses of the back wall */
        G.part(g, [[112, PTOP, 1], [112, 56, 1], [608, 56, 1], [608, PTOP, 1]], NEWAR, { lw: 1.3, steps: 1, seed: 126 });
        G.part(g, [[108, 56, 1], [108, 50, 1], [612, 50, 1], [612, 56, 1]], STONEH, { lw: 1.2, steps: 1, seed: 127 });
        G.cut(g, [[110, 52.5], [610, 52.5]], STONEH, 0.7, { glint: 1 });
        /* six stone steps down the left, a lit tread and a dark riser to each */
        for (i = 0; i < 6; i++) {
          var x0 = 110 + i * 26, y0 = PTOP + (i + 1) * 44;
          G.part(g, [[x0, y0, 1], [x0 + 26, y0, 1], [x0 + 26, F.y0 + F.h + 10, 1], [x0, F.y0 + F.h + 10, 1]], STONEH, { lw: 1.2, steps: 1, seed: 140 + i, lift: 0.5 });
          g.fillStyle = "rgba(240,236,224,.85)"; g.fillRect(x0, y0, 26, 5); g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(x0, y0, 26, 1.6);
          g.fillStyle = "rgba(24,22,20,.62)"; g.fillRect(x0 + 21, y0, 5, 44);
          g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + 26, y0); g.lineTo(x0 + 26, y0 + 44); g.stroke();
          /* block joints in the riser (courses staggered from step to step), a worn lip on the tread, a green water-line stain on the lowest steps */
          g.strokeStyle = G.rgba(INK, 0.45); g.lineWidth = 0.8; g.beginPath(); g.moveTo(x0, y0 + 15); g.lineTo(x0 + 21, y0 + 15); g.moveTo(x0, y0 + 30); g.lineTo(x0 + 21, y0 + 30); g.moveTo(x0 + 6 + (i % 3) * 4, y0 + 5); g.lineTo(x0 + 6 + (i % 3) * 4, y0 + 15); g.moveTo(x0 + 14 - (i % 2) * 5, y0 + 15); g.lineTo(x0 + 14 - (i % 2) * 5, y0 + 30); g.stroke();
          var sr = G.rng(300 + i); g.strokeStyle = "rgba(255,252,240,.8)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, y0 + 0.5); for (var wx2 = 3; wx2 <= 26; wx2 += 3) g.lineTo(x0 + wx2, y0 + 0.5 + (sr() - 0.5) * 1.6); g.stroke();
          g.fillStyle = "rgba(24,22,20,.16)"; for (var pz = 0; pz < 4; pz++) g.fillRect(x0 + 2 + sr() * 16, y0 + 9 + sr() * 28, 3 + sr() * 5, 1);
          if (i > 3) { var ag = g.createLinearGradient(0, y0 + 44 - 30 - (i - 4) * 6, 0, y0 + 44); ag.addColorStop(0, "rgba(70,100,64,0)"); ag.addColorStop(1, "rgba(70,100,64," + (0.28 + (i - 4) * 0.1) + ")"); g.fillStyle = ag; g.fillRect(x0, y0 + 14, 21, 30); }
        }
        /* the court's floor, a stone plinth at the foot of the wall, the stone panel carrying the three spouts */
        G.part(g, [[266, FL, 1], [F.x0 + F.w + 6, FL, 1], [F.x0 + F.w + 6, F.y0 + F.h + 10, 1], [266, F.y0 + F.h + 10, 1]], STONEH, { lw: 1.3, steps: 1, seed: 150, lift: 0.6 });
        G.part(g, [[262, FL - 18, 1], [F.x0 + F.w + 6, FL - 18, 1], [F.x0 + F.w + 6, FL, 1], [262, FL, 1]], STONEH, { lw: 1.3, steps: 1, seed: 151 });
        G.cut(g, [[264, FL - 14], [F.x0 + F.w, FL - 14]], STONEH, 0.7, { glint: 1 });
        G.part(g, [[274, 144, 1], [606, 144, 1], [606, 302, 1], [274, 302, 1]], STONEH, { lw: 1.6, steps: 1, seed: 152, pits: true });
        G.cut(g, [[284, 154, 1], [596, 154, 1], [596, 292, 1], [284, 292, 1], [284, 154, 1]], STONEH, 0.8, { glint: 1 });
        G.part(g, [[290, 160, 1], [590, 160, 1], [590, 286, 1], [290, 286, 1]], pal("#6c6a62", "#9c998e", "#3e3c36", "#1a1916"), { lw: 0.8, steps: 1, seed: 153, lift: 0.3 });
        /* the basin: a stone rim at floor level, water in a thin line with the sides carved */
        G.part(g, [[274, FL - 3, 1], [606, FL - 3, 1], [606, FL + 6, 1], [274, FL + 6, 1]], STONEH, { lw: 1, steps: 1, seed: 154 });
        g.save(); g.beginPath(); g.rect(280, FL + 6, 322, 54); g.clip(); var wg = g.createLinearGradient(0, WL, 0, 394); wg.addColorStop(0, "rgba(110,166,198,.88)"); wg.addColorStop(1, "rgba(48,92,128,.95)"); g.fillStyle = wg; g.fillRect(280, FL + 6, 322, 54); g.restore();
        g.fillStyle = "rgba(255,255,255,.32)"; g.fillRect(280, WL, 322, 1.6);
        var bg2 = g.createLinearGradient(0, FL - 3, 0, WL + 2); bg2.addColorStop(0, "rgba(74,108,66,0)"); bg2.addColorStop(1, "rgba(74,108,66,.5)"); g.fillStyle = bg2; g.fillRect(274, FL - 3, 338, WL + 2 - (FL - 3)); g.fillStyle = "rgba(40,70,44,.35)"; g.fillRect(280, WL - 1, 322, 3);
        G.part(g, [[270, FL + 4, 1], [282, FL + 4, 1], [282, 398, 1], [270, 398, 1]], STONEH, { lw: 1.1, steps: 1, seed: 155 }); G.part(g, [[600, FL + 4, 1], [612, FL + 4, 1], [612, 398, 1], [600, 398, 1]], STONEH, { lw: 1.1, steps: 1, seed: 156 });
        /* a small carved Bhagiratha, kneeling in anjali, under each spout */
        SX.forEach(function (sx, k) {
          G.hollow(g, [[sx - 19, 296], [sx - 19, 244], [sx, 232], [sx + 19, 244], [sx + 19, 296]], STONEH, { deep: 0.45, lw: 0.7 });
          G.part(g, [[sx - 12, 284], [sx - 8, 270], [sx - 2, 266], [sx + 2, 266], [sx + 8, 270], [sx + 12, 284]], STONEH, { lw: 0.9, steps: 3, pits: false });           /* folded legs */
          G.part(g, [[sx - 5, 268], [sx - 5, 252], [sx, 250], [sx + 5, 252], [sx + 5, 268]], STONEH, { lw: 0.9, steps: 3, pits: false });                              /* the torso */
          G.part(g, [[sx - 4.4, 252], [sx - 4, 244], [sx, 241], [sx + 4, 244], [sx + 4.4, 252], [sx, 253]], STONEH, { lw: 0.9, steps: 3, pits: false, round: 0.8 });     /* the head */
          G.part(g, [[sx - 5, 241], [sx - 4, 235, 1], [sx, 232], [sx + 4, 235, 1], [sx + 5, 241]], STONEH, { lw: 0.7, steps: 3, pits: false });                        /* a tall crown */
          G.cut(g, [[sx - 5, 258], [sx - 1, 261], [sx + 1, 257]], STONEH, 0.7); G.cut(g, [[sx - 2, 247.5], [sx + 2, 247.5]], STONEH, 0.45); G.dot(g, sx - 1.6, 245, 0.5, STONEH.ink); G.dot(g, sx + 1.6, 245, 0.5, STONEH.ink);
        });
        /* the stone slab the pot stands on, the pot's base ring */
        G.part(g, [[SX[1] - 14, FL - 3, 1], [SX[1] + 48, FL - 3, 1], [SX[1] + 48, FL + 4, 1], [SX[1] - 14, FL + 4, 1]], STONEH, { lw: 1.1, steps: 1, seed: 157 });
        g.restore();
      });
      enter(c, F);
      /* the three makara, each pulled wholly inside its own niche: a stone bracket under the head, the shadow of the snout on the wall, the head and trunk lit from the upper left */
      var mouths = [];
      SX.forEach(function (sx, k) {
        var sz = 86, kk = sz / 200, ox = sx - 192 * kk, oy = 208 - 136 * kk, p0 = tSp >= 0 ? tSp : -1;
        G.part(c, [[sx - 46, 218, 1], [sx + 18, 221, 1], [sx + 12, 227, 1], [sx - 38, 237, 1]], STONEH, { lw: 1.1, steps: 1, seed: 340 + k, lift: 0.8 });
        G.cut(c, [[sx - 48, 220], [sx + 18, 223]], STONEH, 0.7, { glint: 1 });
        var sg = c.createRadialGradient(sx - 14, 232, 2, sx - 14, 232, 46); sg.addColorStop(0, "rgba(10,8,6,.42)"); sg.addColorStop(1, "rgba(10,8,6,0)"); c.fillStyle = sg; c.fillRect(sx - 62, 220, 100, 30);
        c.save(); c.beginPath(); c.rect(ox + 44 * kk, oy + 20 * kk, 170 * kk, 150 * kk); c.clip();
        G.beast(c, "makara", ox, oy, sz, { t: t + k * 640, poke: p0 >= 0 ? p0 + k * 60 : -1, variant: k === 1 ? "borobudur" : undefined });
        c.restore(); mouths.push([sx, 208]);
        /* a drop gathers on the lower lip and falls, each head in its own time */
        var dph = ((t * 0.00045 + k * 0.37) % 1);
        if (dph > 0.55) { var du = (dph - 0.55) / 0.45; c.fillStyle = "rgba(120,176,220,.95)"; c.beginPath(); c.ellipse(sx + 4, 226 + du * du * 70, 1.5 * (1 - du * 0.3), 2.2 + du * 2, 0, 0, 7); c.fill(); }
        else { var gu = dph / 0.55; c.fillStyle = "rgba(120,176,220,.95)"; c.beginPath(); c.ellipse(sx + 4, 224.6, 1.2 + gu * 0.8, 1 + gu * 1.5, 0, 0, 7); c.fill(); }
      });
      /* the cutaway pot at the middle jet: a thick brass wall, the inside shown, water rising to st.fill */
      var px = SX[1] + 17, pb = FL - 3, pt0 = 276;
      var inner = [[px - 12, pt0 + 4], [px - 11, pt0 + 14], [px - 21, pt0 + 34], [px - 22, pt0 + 52], [px - 14, pb - 5], [px + 14, pb - 5], [px + 22, pt0 + 52], [px + 21, pt0 + 34], [px + 11, pt0 + 14], [px + 12, pt0 + 4]];
      c.save(); c.translate(px, pb); c.rotate(rock); c.translate(-px, -pb);
      G.part(c, [[px - 17, pt0, 1], [px - 15, pt0 + 10], [px - 26, pt0 + 32], [px - 27, pt0 + 52], [px - 18, pb - 1], [px + 18, pb - 1], [px + 27, pt0 + 52], [px + 26, pt0 + 32], [px + 15, pt0 + 10], [px + 17, pt0, 1]], BRASS, { lw: 1.8, steps: 5, seed: 160, round: 0.5 });
      /* the cavity, the water in it, the wobble of its surface */
      c.save(); G.trace(c, G.sp(inner, true, 5), true); c.clip();
      var cg = c.createLinearGradient(px - 22, 0, px + 22, 0); cg.addColorStop(0, "#2a1a08"); cg.addColorStop(0.5, "#6a4614"); cg.addColorStop(1, "#8a5e1e"); c.fillStyle = cg; c.fillRect(px - 24, pt0, 48, pb - pt0);
      var lvH = pb - 5 - (pt0 + 8), wl = pb - 5 - fill * lvH * 0.92, wob = sin(t * 0.006) * 1.2 + sin(t * 0.0113 + 1) * 0.8 + (tPot >= 0 ? sin(tPot * 0.03) * 2.4 * (1 - G.clamp(tPot / 1100, 0, 1)) : 0);
      if (fill > 0.005) {
        c.fillStyle = "rgba(76,138,184,.95)"; c.beginPath(); c.moveTo(px - 26, wl + wob); for (var xx = -26; xx <= 26; xx += 4) c.lineTo(px + xx, wl + sin(xx * 0.3 + t * 0.008) * 1.1 + wob * (xx / 26)); c.lineTo(px + 26, pb); c.lineTo(px - 26, pb); c.closePath(); c.fill();
        c.fillStyle = "rgba(210,236,252,.9)"; c.fillRect(px - 22, wl - 0.5 + wob * 0, 44, 1.5);
      }
      c.restore();
      G.cut(c, [[px - 12, pt0 + 6], [px - 21, pt0 + 36], [px - 22, pt0 + 52]], BRASS, 0.8, { col: BRASS.light });
      G.part(c, [[px - 19, pt0 - 2, 1], [px + 19, pt0 - 2, 1], [px + 20, pt0 + 3, 1], [px - 20, pt0 + 3, 1]], BRASS, { lw: 1.1, steps: 1, seed: 161 });
      var gl0 = tPot >= 0 && tPot < 800 ? tPot : (t % 4200 < 700 ? (t % 4200) * 1.1 : -1);
      if (gl0 >= 0 && gl0 < 800) { var sw = (gl0 / 800) * 90 - 20, sg = c.createLinearGradient(px + sw - 10, 0, px + sw + 10, 0); sg.addColorStop(0, "rgba(255,255,255,0)"); sg.addColorStop(0.5, "rgba(255,255,255,.85)"); sg.addColorStop(1, "rgba(255,255,255,0)"); c.save(); c.beginPath(); c.moveTo(px - 17, pt0); c.lineTo(px - 27, pt0 + 52); c.lineTo(px - 18, pb); c.lineTo(px + 18, pb); c.lineTo(px + 27, pt0 + 52); c.lineTo(px + 17, pt0); c.closePath(); c.clip(); c.fillStyle = sg; c.fillRect(px - 40, pt0, 80, 80); c.restore(); }
      c.restore();
      /* the percentage tag rides the water level */
      label(c, px + 36, G.clamp(wl, pt0 + 12, pb - 12), Math.round(fill * 100) + "%", { size: 11, fill: "#fff3c4" });
      /* a drop hops out of the mouth when the pot is struck */
      if (tPot >= 0 && tPot < 900) { var du = tPot / 900; c.fillStyle = "rgba(96,150,196,.95)"; c.beginPath(); c.ellipse(px + 4 + du * 34, pt0 - 4 - sin(PI * du) * 30 + du * du * 14, 2.4, 3.2, 0, 0, 7); c.fill(); }
      /* the jets: each leaves the lip level, bends over and falls in a parabola, a 3-4 px ribbon with a white core; the middle one lands in the pot's mouth, the others in the pool */
      var g0 = 0.0006;
      SX.forEach(function (sx, k) {
        var w = (5.4 + sin(t * 0.004 + k) * 0.5) * surge, gl = k === 1 ? pt0 - 2 : WL, end = jetRibbon(c, sx + 9, 215, 0.03, 0, g0, gl, w, 2.2, t, { seed: k * 3 + 1, drops: 5, splash: false, brk: 0.8, dt: 12 });
        if (k === 1) { c.fillStyle = "rgba(210,236,252,.85)"; for (var q = 0; q < 4; q++) { var ph = (t * 0.003 + q / 4) % 1; c.beginPath(); c.arc(end[0] + (q - 1.5) * 4 + sin(ph * 6) * 2, pt0 - 3 - ph * 7 * surge, 1 + (1 - ph) * 1.2, 0, 7); c.fill(); } }
        else { ripples(c, end[0], WL + 1.5, t + k * 400, 4, 34 * surge, "rgba(255,255,255,.85)", k); c.fillStyle = "rgba(240,250,255,.8)"; for (q = 0; q < 5; q++) { var p2 = (t * 0.0035 + q / 5 + k * 0.2) % 1; c.beginPath(); c.arc(end[0] + (q - 2) * 5 * p2, WL - sin(PI * p2) * 12 * surge, 1.2, 0, 7); c.fill(); } }
      });
      if (tSp >= 0 && tSp < 700) { var ss = sin(PI * tSp / 700); c.fillStyle = "rgba(240,250,255,.8)"; for (var q2 = 0; q2 < 14; q2++) { var a = -0.3 - q2 * 0.17; c.beginPath(); c.arc(px + cos(a) * 28 * ss + (q2 - 7) * 3, pt0 - 6 + sin(a) * 26 * ss + ss * ss * 6, 1.4, 0, 7); c.fill(); } }
      /* the walkers' lower robes and feet on the street, the sparrow along the parapet, the lamp, the breath mist */
      var w1 = ((t * 0.026 + 60) % 840) - 60, w2 = 780 - ((t * 0.021 + 200) % 840);
      figure(c, w1, PTOP, 38, pal("#c9a46a", "#f0d9a0", "#7a5c2a", "#2a2010"), { dir: 1, t: t, seed: 1, ph: w1 * 0.34 });
      figure(c, w2, PTOP, 36, pal("#46608a", "#8ba3cc", "#1e2c48", "#0c1220"), { dir: -1, t: t, seed: 2, ph: w2 * 0.34 + 1 });
      var cyc = (t % 5000) / 5000;
      if (cyc < 0.62) { var u = cyc / 0.62, bx = G.lerp(590, 300, u), hop = abs(sin(u * 30)) * 5 * (sin(u * 15) > -0.3 ? 1 : 0);
        c.save(); c.translate(bx, 49.5 - hop); c.scale(-1, 1);
        c.fillStyle = "#8a6a46"; c.strokeStyle = INK; c.lineWidth = 0.8; c.beginPath(); c.ellipse(0, -4, 6, 4, 0, 0, 7); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(-5, -4); c.lineTo(-11, -2 + hop * 0.2); c.lineTo(-5, -1); c.fill(); c.stroke();
        c.beginPath(); c.arc(5, -8, 3, 0, 7); c.fillStyle = "#a88a62"; c.fill(); c.stroke();
        c.fillStyle = INK; c.beginPath(); c.arc(6, -8.4, 0.7, 0, 7); c.fill();
        c.fillStyle = "#e0b040"; c.beginPath(); c.moveTo(8, -8); c.lineTo(11, -7.4); c.lineTo(8, -6.6); c.fill();
        c.strokeStyle = INK; c.beginPath(); c.moveTo(-1, -0.4); c.lineTo(-1, hop > 1 ? -1 : 0.4); c.moveTo(2, -0.4); c.lineTo(2, hop > 1 ? -1 : 0.4); c.stroke(); c.restore(); }
      var fl = 0.8 + 0.2 * sin(t * 0.021) + 0.1 * sin(t * 0.053);
      c.fillStyle = "rgba(255,196,90," + 0.25 * fl + ")"; c.beginPath(); c.arc(40, 52, 16 * fl, 0, 7); c.fill();
      c.fillStyle = "#6a4a2a"; c.beginPath(); c.moveTo(34, 56); c.lineTo(46, 56); c.lineTo(44, 60); c.lineTo(36, 60); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
      c.fillStyle = "#ffb43a"; c.beginPath(); c.moveTo(38.4, 56); c.quadraticCurveTo(38, 50 - fl * 2, 40 + sin(t * 0.03) * 1.2, 46 - fl * 3); c.quadraticCurveTo(43, 50, 41.8, 56); c.fill(); c.fillStyle = "#fff2b0"; c.beginPath(); c.ellipse(40, 53.4, 1, 2.4, 0, 0, 7); c.fill();
      for (var m = 0; m < 6; m++) { var ph2 = (t * 0.00028 + m / 6) % 1; c.fillStyle = "rgba(250,248,244," + 0.4 * (1 - ph2) + ")"; c.beginPath(); c.arc(100 + sin(ph2 * 5 + m) * 12 + ph2 * 14, 54 - ph2 * 34, 3 + ph2 * 8, 0, 7); c.fill(); }
      c.restore();
    } };

  /* ================================================================ carve one */
  /* paint the uncut block into an offscreen canvas the page can chip away: a drafted margin with claw strokes,
     a rough point-chiselled boss in the middle, tool chatter, and a dashed charcoal line round the figure */
  G.makeBlock = function (px) {
    var cv = document.createElement("canvas"); cv.width = cv.height = px; var c = cv.getContext("2d"), r = G.rng(5), m = px * 0.07, i, j;
    G.part(c, [[0, 0, 1], [px, 0, 1], [px, px, 1], [0, px, 1]], S.lime, { lw: 3, steps: 1, seed: 99, hatchGap: 5 });
    /* the drafted margin: flat, with parallel claw strokes, a ruled inner edge */
    c.save(); c.beginPath(); c.rect(0, 0, px, px); c.rect(m, m, px - 2 * m, px - 2 * m); c.clip("evenodd");
    c.fillStyle = "rgba(255,248,230,.22)"; c.fillRect(0, 0, px, px);
    c.strokeStyle = "rgba(70,56,40,.34)"; c.lineWidth = 0.9; c.lineCap = "round";
    for (i = -px; i < px * 2; i += 5.2) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + px * 0.4, px); c.stroke(); }
    c.restore();
    c.strokeStyle = "rgba(40,30,20,.7)"; c.lineWidth = 1.6; c.strokeRect(m, m, px - 2 * m, px - 2 * m);
    c.strokeStyle = "rgba(255,250,236,.7)"; c.lineWidth = 1.2; c.strokeRect(m - 1.4, m - 1.4, px - 2 * m + 2.8, px - 2 * m + 2.8);
    /* the boss: peck dots in rows, each with a lit rim, 140 of them */
    var rows = 10, cols = 14;
    for (i = 0; i < rows; i++) for (j = 0; j < cols; j++) {
      var x = m + 14 + (j + (i % 2) * 0.5 + (r() - 0.5) * 0.5) * ((px - 2 * m - 28) / cols), y = m + 14 + (i + (r() - 0.5) * 0.5) * ((px - 2 * m - 28) / rows), rr = 1.5 + r() * 1.2;
      c.fillStyle = "rgba(70,56,40,.42)"; c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill(); c.fillStyle = "rgba(255,250,236,.55)"; c.beginPath(); c.arc(x - 0.9, y - 0.9, rr * 0.55, 0, 7); c.fill();
    }
    /* tool chatter: little groups of parallel strokes where the chisel skipped */
    c.strokeStyle = "rgba(60,50,40,.28)"; c.lineWidth = 1;
    for (i = 0; i < 16; i++) { var gx = m + 10 + r() * (px - 2 * m - 40), gy = m + 10 + r() * (px - 2 * m - 40), a = r() * 0.8 + 0.4; for (j = 0; j < 5; j++) { c.beginPath(); c.moveTo(gx + j * 3.4, gy - j * 1.2); c.lineTo(gx + j * 3.4 + cos(a) * 16, gy - j * 1.2 + sin(a) * 16); c.stroke(); } }
    c.strokeStyle = "rgba(60,50,40,.22)"; for (i = 0; i < 70; i++) { var sx = r() * px, sy = r() * px; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + 8 + r() * 10, sy + 2 + r() * 4); c.stroke(); }
    /* quarry work: a pitched face (flat chipped facets with their cracks), drill marks down the drafted margin, a few mica glints */
    c.save(); c.beginPath(); c.rect(m + 2, m + 2, px - 2 * m - 4, px - 2 * m - 4); c.clip();
    var qr = G.rng(41);
    for (i = 0; i < 16; i++) { var qx = m + qr() * (px - 2 * m), qy = m + qr() * (px - 2 * m), qq = []; for (j = 0; j < 6; j++) { var qa = j / 6 * PI * 2 + qr() * 0.5, qd = 14 + qr() * 22; qq.push([qx + cos(qa) * qd, qy + sin(qa) * qd * 0.8]); } c.fillStyle = qr() < 0.5 ? "rgba(255,248,230,.13)" : "rgba(70,56,40,.1)"; c.beginPath(); qq.forEach(function (pq, k) { if (k) c.lineTo(pq[0], pq[1]); else c.moveTo(pq[0], pq[1]); }); c.closePath(); c.fill(); c.strokeStyle = "rgba(50,40,28,.3)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(qq[0][0], qq[0][1]); c.lineTo(qq[1][0], qq[1][1]); c.lineTo(qq[2][0], qq[2][1]); c.stroke(); }
    c.restore();
    for (i = 0; i < 2; i++) for (j = 0; j < 20; j++) { var dx = m + 6 + j * ((px - 2 * m - 12) / 19), dy = i ? px - m * 0.78 : m * 0.22; c.fillStyle = "rgba(40,30,20,.5)"; c.fillRect(dx, dy, 2.2, m * 0.56); c.fillStyle = "rgba(255,250,236,.6)"; c.fillRect(dx - 1, dy, 1, m * 0.56); }
    for (i = 0; i < 2; i++) for (j = 0; j < 17; j++) { var dy2 = m + 6 + j * ((px - 2 * m - 12) / 16), dx2 = i ? px - m * 0.78 : m * 0.22; c.fillStyle = "rgba(40,30,20,.5)"; c.fillRect(dx2, dy2, m * 0.56, 2.2); c.fillStyle = "rgba(255,250,236,.6)"; c.fillRect(dx2, dy2 - 1, m * 0.56, 1); }
    c.strokeStyle = "rgba(255,255,250,.95)"; c.lineWidth = 1;
    for (i = 0; i < 26; i++) { var gx2 = r() * px, gy2 = r() * px, gr = 1.4 + r() * 2.2; c.beginPath(); c.moveTo(gx2 - gr, gy2); c.lineTo(gx2 + gr, gy2); c.moveTo(gx2, gy2 - gr); c.lineTo(gx2, gy2 + gr); c.stroke(); c.fillStyle = "rgba(255,255,250,.9)"; c.fillRect(gx2 - 0.5, gy2 - 0.5, 1, 1); }
    return cv;
  };
  var CVS = {};            /* cached 300 px layers: a charcoal dashed outline per beast */
  function outlineOf(id, w) {
    if (CVS["o" + id]) return CVS["o" + id];
    var a = document.createElement("canvas"); a.width = a.height = w; var g = a.getContext("2d"), keep = G.sil;
    /* a ring: the silhouette grown 2.4 px each way, the silhouette itself taken out */
    G.sil = "#000"; [[2.4, 0], [-2.4, 0], [0, 2.4], [0, -2.4], [1.7, 1.7], [-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7]].forEach(function (d) { g.save(); g.translate(d[0], d[1]); G.beast(g, id, 0, 0, w, { t: 4200 }); g.restore(); });
    g.globalCompositeOperation = "destination-out"; G.beast(g, id, 0, 0, w, { t: 4200 }); G.sil = keep;
    g.globalCompositeOperation = "source-in"; g.fillStyle = "rgba(34,28,24,.75)"; g.fillRect(0, 0, w, w);
    /* broken into dashes */
    g.globalCompositeOperation = "destination-out"; var r = G.rng(33); for (var i = 0; i < 150; i++) { g.save(); g.translate(r() * w, r() * w); g.rotate(r() * 3); g.fillRect(-5, -3, 10 + r() * 8, 6); g.restore(); }
    return (CVS["o" + id] = a);
  }
  var SHEETBLOCK = null, EFF = null, SHD = null, MSK = null, HLT = null;
  function mkc(w) { var cv = document.createElement("canvas"); cv.width = cv.height = w; return cv; }
  /* a mason's arm: a linen sleeve rolled to the elbow-less edge of the picture, a leather cuff, and a gloved hand closed round a shaft that runs from p0 toward p1;
     armAng is the direction the forearm leaves toward (rad), len its length */
  var LINEN = pal("#e6d8b8", "#fffaf0", "#968660", "#2a2418"), LEATH = pal("#8a5a34", "#c8905c", "#3e2512", "#1a0f06");
  function masonArm(c, p0, p1, armAng, len, t) {
    var hx = (p0[0] + p1[0]) / 2, hy = (p0[1] + p1[1]) / 2, sa = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), sway = sin(t * 0.0021) * 1.2, ca = cos(armAng), sn = sin(armAng), nx = -sn, ny = ca, i;
    /* the bare forearm, then the sleeve rolled back over it and widening toward the shoulder, which is off the picture */
    tube(c, [[hx, hy], [hx + ca * 20, hy + sn * 20], [hx + ca * 40, hy + sn * 40]], 13, 17, skin("#d7a67a"), { lw: 1, pits: false });
    var sl = tube(c, [[hx + ca * 34, hy + sn * 34], [hx + ca * len * 0.5 + sway, hy + sn * len * 0.5], [hx + ca * len, hy + sn * len]], 24, 42, LINEN, { lw: 1.2, pits: false, hatchGap: 4 });
    G.cut(c, [[hx + ca * 34 + nx * 12, hy + sn * 34 + ny * 12], [hx + ca * 38, hy + sn * 38], [hx + ca * 34 - nx * 12, hy + sn * 34 - ny * 12]], LINEN, 1.6, { glint: 1 });
    for (i = 0; i < 3; i++) { var fu = 0.18 + i * 0.22, fp = along(sl.cl, fu), fa = ang(sl.cl, fu); G.cut(c, [[fp[0] + cos(fa + 1.57) * 7, fp[1] + sin(fa + 1.57) * 7], [fp[0] + cos(fa) * 12, fp[1] + sin(fa) * 12], [fp[0] - cos(fa + 1.57) * 5, fp[1] - sin(fa + 1.57) * 5]], LINEN, 0.7); }
    G.part(c, [[hx + ca * 9 + nx * 8, hy + sn * 9 + ny * 8, 1], [hx + ca * 9 - nx * 8, hy + sn * 9 - ny * 8, 1], [hx + ca * 15 - nx * 8.5, hy + sn * 15 - ny * 8.5, 1], [hx + ca * 15 + nx * 8.5, hy + sn * 15 + ny * 8.5, 1]], LEATH, { lw: 0.9, steps: 1, pits: false });
    c.save(); c.translate(hx, hy); c.rotate(sa + PI / 2 + 0.2); c.scale(2.1, 2.1); c.translate(0, -5.5);
    hand(c, LEATH, "grip", 0);
    c.restore();
  }
  SC.carve = { w: 520, h: 440,
    draw: function (c, W, H, st) {
      var id = st.id || "notre", prog = st.arg != null ? +st.arg : null, t = st.t, F = fit(W, H, 520, 440), pms = pokeOf(st), tq = tapPt(st), sceneH = 440;
      var bench = sceneH * 0.86, s = Math.min(520, sceneH) * 0.86, x = (520 - s) / 2, y = bench - s * 0.94;
      layer(c, W, H, "carve-" + id, function (g) {
        enter(g, F);
        /* the workshop wall and a window; the one light comes through it from the upper left */
        wash(g, F.x0, F.y0, F.w, bench - F.y0, "#c9bba0", 171, 0.4);
        g.strokeStyle = G.rgba(INK, 0.08); g.lineWidth = 1; for (var yy = F.y0; yy < bench; yy += 22) { g.beginPath(); g.moveTo(F.x0, yy); g.lineTo(F.x0 + F.w, yy); g.stroke(); }
        G.part(g, [[20, 22, 1], [128, 22, 1], [128, 118, 1], [20, 118, 1]], S.lime, { lw: 1.4, steps: 1, seed: 172 });
        g.fillStyle = "#f6f1de"; g.fillRect(28, 30, 92, 80); g.strokeStyle = INK; g.lineWidth = 1.4; g.beginPath(); g.moveTo(74, 30); g.lineTo(74, 110); g.moveTo(28, 70); g.lineTo(120, 70); g.stroke();
        /* the pinned charcoal template: the beast as a smudge on a sheet, with its guide lines */
        g.save(); g.translate(402, 26); g.rotate(0.03);
        g.fillStyle = "#efe6cc"; g.strokeStyle = G.rgba(INK, 0.6); g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(104, 2); g.lineTo(100, 142); g.lineTo(-2, 140); g.closePath(); g.fill(); g.stroke();
        var keepS = G.sil; G.sil = "rgba(52,44,36,.55)"; G.beast(g, id, 2, 12, 98, { t: 0 }); G.sil = keepS;
        g.strokeStyle = "rgba(52,44,36,.5)"; g.lineWidth = 0.7; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(50, 8); g.lineTo(50, 130); g.moveTo(6, 70); g.lineTo(96, 70); g.stroke(); g.setLineDash([]);
        g.fillStyle = HOT; g.beginPath(); g.arc(14, 6, 3, 0, 7); g.arc(92, 8, 3, 0, 7); g.fill();
        g.restore();
        /* the banker: a plank bench, a leather pad, a mallet, a point chisel and a claw chisel lying on it */
        var wd = pal("#8f6a40", "#c9a070", "#4a3016", "#20140a");
        G.part(g, [[F.x0 - 10, bench, 1], [F.x0 + F.w + 10, bench, 1], [F.x0 + F.w + 10, F.y0 + F.h + 10, 1], [F.x0 - 10, F.y0 + F.h + 10, 1]], wd, { lw: 1.6, steps: 1, seed: 173, pits: true });
        for (var i = 1; i < 4; i++) G.cut(g, [[F.x0, bench + i * 17], [F.x0 + F.w, bench + i * 17 + (i % 2 ? 1 : -1)]], wd, 0.8);
        G.cut(g, [[F.x0, bench + 2], [F.x0 + F.w, bench + 2]], wd, 1, { glint: 1 });
        var padc = pal("#5a3a22", "#8a5c38", "#2a170a", "#120a04");
        G.part(g, [[x - 10, bench - 2, 1], [x - 12, bench - 12], [x + 10, bench - 18], [x + s - 10, bench - 18], [x + s + 12, bench - 12], [x + s + 10, bench - 2, 1]], padc, { lw: 1.4, steps: 4, seed: 174, pits: false });
        G.cut(g, [[x - 4, bench - 13], [x + s * 0.5, bench - 16], [x + s + 4, bench - 13]], padc, 0.8, { glint: 1 });
        G.part(g, [[22, bench + 12], [58, bench + 6], [62, bench + 22], [26, bench + 28]], wd, { lw: 1.3, seed: 175 });
        G.part(g, [[58, bench + 12], [150, bench + 16], [150, bench + 22], [58, bench + 20]], wd, { lw: 1.1, steps: 1, seed: 176, pits: false });
        G.cut(g, [[28, bench + 14], [56, bench + 10]], wd, 0.8, { glint: 1 });
        G.part(g, [[F.x0 + F.w - 170, bench + 11], [F.x0 + F.w - 74, bench + 13], [F.x0 + F.w - 60, bench + 17, 1], [F.x0 + F.w - 74, bench + 20], [F.x0 + F.w - 170, bench + 20]], S.steel, { lw: 1, steps: 1, seed: 177 });
        G.part(g, [[F.x0 + F.w - 150, bench + 34], [F.x0 + F.w - 80, bench + 33], [F.x0 + F.w - 62, bench + 30, 1], [F.x0 + F.w - 62, bench + 40, 1], [F.x0 + F.w - 80, bench + 38], [F.x0 + F.w - 150, bench + 40]], S.steel, { lw: 1, steps: 1, seed: 178 });
        for (var tk = 0; tk < 4; tk++) G.cut(g, [[F.x0 + F.w - 70 + tk * 2.4, bench + 31], [F.x0 + F.w - 66 + tk * 2.4, bench + 39]], S.steel, 0.6);
        g.restore();
      });
      enter(c, F);
      /* the cone of the window's light, with dust motes in it */
      var lg = c.createLinearGradient(40, 40, 360, 330); lg.addColorStop(0, "rgba(255,246,206,.34)"); lg.addColorStop(1, "rgba(255,246,206,0)");
      c.fillStyle = lg; c.beginPath(); c.moveTo(20, 24); c.lineTo(128, 24); c.lineTo(520, 330); c.lineTo(250, 420); c.closePath(); c.fill();
      var rm = G.rng(181);
      for (var d = 0; d < 34; d++) { var u0 = rm(), vv = rm(), ph = (t * 0.00005 * (0.5 + rm()) + rm()) % 1, px0 = G.lerp(60, 330, ph) + sin(t * 0.0006 + d) * 9 + (vv - 0.5) * 90 * ph, py0 = G.lerp(60, 330, ph) + cos(t * 0.0007 + d * 2) * 7 + (u0 - 0.5) * 50;
        c.fillStyle = "rgba(255,250,226," + (0.55 * sin(PI * ph)) + ")"; c.beginPath(); c.arc(px0, py0, 0.9 + (d % 3) * 0.4, 0, 7); c.fill(); }
      /* what is inside the block: new-cut pale stone, the beast, and its shadow on that ground */
      c.save(); c.fillStyle = "#e9ddc0"; c.fillRect(x, y, s, s);
      var gg = c.createLinearGradient(x, y, x + s, y + s); gg.addColorStop(0, "rgba(255,252,238,.55)"); gg.addColorStop(1, "rgba(150,126,92,.3)"); c.fillStyle = gg; c.fillRect(x, y, s, s);
      c.beginPath(); c.rect(x, y, s, s); c.clip();
      var bs = s * 0.8, bxo = x + s * 0.1, byo = y + s * 0.1;      /* the beast sits at 80% inside the drafted margin of the block */
      G.castShadow(c, function (o) { G.beast(o, id, bxo, byo, bs, { t: t }); }, s * 0.016, s * 0.02, 0.32, "#4a3a22");
      G.beast(c, id, bxo, byo, bs, { t: t, poke: pms }); c.restore();
      /* the remaining block: in the page its chipped canvas, in the sheet a circle the mason has cleared */
      var blk = st.block, cx = x + s * 0.55, cy = y + s * 0.5, rad = prog != null ? s * prog * 0.78 : 0;
      if (prog != null) {
        if (!SHEETBLOCK) SHEETBLOCK = G.makeBlock(600);
        if (!EFF) EFF = mkc(300);
        var e = EFF.getContext("2d"); e.setTransform(1, 0, 0, 1, 0, 0); e.clearRect(0, 0, 300, 300); e.save(); e.beginPath(); e.rect(0, 0, 300, 300); var ex = (cx - x) / s * 300, ey = (cy - y) / s * 300, er = rad / s * 300; var rg2 = G.rng(55); e.moveTo(ex + er, ey); for (var jj = 1; jj <= 56; jj++) { var ja = jj / 56 * PI * 2, jr = er * (1 + (rg2() - 0.5) * 0.1 + 0.035 * sin(ja * 7 + 1) + 0.02 * sin(ja * 13)); e.lineTo(ex + cos(ja) * jr, ey + sin(ja) * jr); } e.closePath(); e.clip("evenodd"); e.drawImage(SHEETBLOCK, 0, 0, 300, 300); e.restore();
        blk = EFF;
      }
      if (blk) {
        if (!SHD) SHD = mkc(300); if (!MSK) MSK = mkc(300);
        var sg = SHD.getContext("2d"); sg.globalCompositeOperation = "source-over"; sg.clearRect(0, 0, 300, 300); sg.drawImage(blk, 0, 0, 300, 300); sg.globalCompositeOperation = "source-in"; sg.fillStyle = "rgba(40,30,18,.5)"; sg.fillRect(0, 0, 300, 300);
        c.save(); c.beginPath(); c.rect(x, y, s, s); c.clip(); c.drawImage(SHD, x + s * 0.018, y + s * 0.024, s, s); c.restore();
        if (!HLT) HLT = mkc(300); var hl = HLT.getContext("2d"); hl.globalCompositeOperation = "source-over"; hl.clearRect(0, 0, 300, 300); hl.drawImage(blk, -1.4, -1.9, 300, 300); hl.globalCompositeOperation = "source-in"; hl.fillStyle = "rgba(255,251,238,.95)"; hl.fillRect(0, 0, 300, 300);
        c.drawImage(HLT, x, y, s, s);                                  /* the raised lip: a pale rim where the chipped edge catches the light */
        c.drawImage(blk, x, y, s, s);
        /* the dashed charcoal outline of the figure, only where stone is left */
        var mk = MSK.getContext("2d"); mk.globalCompositeOperation = "source-over"; mk.clearRect(0, 0, 300, 300); mk.drawImage(outlineOf(id, 300), 30, 30, 240, 240); mk.globalCompositeOperation = "destination-in"; mk.drawImage(blk, 0, 0, 300, 300);
        c.drawImage(MSK, x, y, s, s);
      }
      st.box = [F.X(x), F.Y(y), s * F.s];
      /* what has come off stays on the bench: two heaps of dust and a scatter of chips, growing as the block is cut away */
      var pile = G.clamp(prog != null ? prog : 0.5, 0.06, 1), dust = pal("#e0d4b8", "#faf4e2", "#8a7d62", "#3a3224");
      [[x + s * 0.13, 1], [x + s * 0.86, -1]].forEach(function (H, hi) {
        var hw = 26 + 30 * pile, hh = 8 + 20 * pile; G.part(c, [[H[0] - hw, bench + 2, 1], [H[0] - hw * 0.5, bench + 2 - hh * 0.55], [H[0] - hw * 0.1, bench + 2 - hh], [H[0] + hw * 0.3, bench + 2 - hh * 0.7], [H[0] + hw * 0.7, bench + 2 - hh * 0.25], [H[0] + hw, bench + 2, 1]], dust, { lw: 1, steps: 4, seed: 400 + hi, round: 0.5 });
        var pr2 = G.rng(410 + hi); for (var pc = 0; pc < 5 + 10 * pile; pc++) { var cxp = H[0] + (pr2() - 0.5) * hw * 1.9, cyp = bench + 3 + pr2() * 6, cs = 1.6 + pr2() * 3; c.fillStyle = pc % 2 ? "#efe6cc" : "#cdbf9c"; c.strokeStyle = "rgba(60,48,32,.55)"; c.lineWidth = 0.6; c.beginPath(); c.moveTo(cxp - cs, cyp); c.lineTo(cxp - cs * 0.2, cyp - cs); c.lineTo(cxp + cs, cyp - cs * 0.3); c.lineTo(cxp + cs * 0.4, cyp + cs * 0.5); c.closePath(); c.fill(); c.stroke(); }
      });
      /* the point chisel hovers at the edge and taps; the mallet comes down on its head every 0.9 s; two gloved hands in linen sleeves hold them */
      var ax = prog != null ? cx + cos(-0.62) * rad : x + s * 0.64, ay = prog != null ? cy + sin(-0.62) * rad : y + s * 0.44, ph2 = (t % 900) / 900, strike = ph2 < 0.12 ? 1 - ph2 / 0.12 : 0, hov = sin(t * 0.004) * 1.4;
      if (blk) {
        var base = c.getTransform(), inv = base.inverse(), toS = function (px2, py2) { var q = inv.transformPoint(c.getTransform().transformPoint({ x: px2, y: py2 })); return [q.x, q.y]; };
        c.save(); c.translate(ax + strike * 0.8, ay - 5 - hov + strike * 2); c.rotate(-0.62);
        G.part(c, [[-1.4, 0, 1], [1.4, 0, 1], [3, -52, 1], [-3, -52, 1]], S.steel, { lw: 1, steps: 1, seed: 190 });
        G.part(c, [[-4.4, -52, 1], [4.4, -52, 1], [3.6, -57, 1], [-3.6, -57, 1]], S.steel, { lw: 0.9, steps: 1, seed: 191 });
        var hc0 = toS(0, -30), hc1 = toS(0, -20);
        var mal = ph2 < 0.12 ? 0 : -0.9 * G.clamp((ph2 - 0.12) / 0.28, 0, 1) * (ph2 > 0.4 ? 1 - G.clamp((ph2 - 0.4) / 0.55, 0, 1) : 1);
        c.translate(0, -60); c.rotate(mal); G.part(c, [[-12, -8], [10, -9], [11, 5], [-12, 6]], WOOD, { lw: 1.1, steps: 2, seed: 192 }); G.part(c, [[-2, 5], [2, 5], [3, 44], [-3, 44]], WOOD, { lw: 0.9, steps: 1, seed: 193, pits: false });
        var hm0 = toS(0, 14), hm1 = toS(0, 36);
        c.restore();
        masonArm(c, hc0, hc1, -0.5, 300, t);
        masonArm(c, hm0, hm1, -0.15, 300, t + 400);
        c.fillStyle = "rgba(255,248,226," + 0.7 * strike + ")"; c.beginPath(); c.arc(ax, ay, 2 + strike * 2, 0, 7); c.fill();
      }
      /* chips: eight, seeded, with gravity and spin and a fade, thrown from the pointer or from the circle edge */
      if (blk && pms >= 0 && pms < 800) {
        var p0 = tq ? [(tq[0] - F.ox) / F.s, (tq[1] - F.oy) / F.s] : [ax, ay], u = pms / 800, rc = G.rng(77);
        for (var k = 0; k < 8; k++) { var vx = (rc() - 0.5) * 140, vy = -40 - rc() * 110, sp = (rc() - 0.5) * 12, sz = 2 + rc() * 3; c.save(); c.globalAlpha = 1 - u * u; c.translate(p0[0] + vx * u * 0.8, p0[1] + vy * u * 0.8 + 260 * u * u); c.rotate(sp * u); c.fillStyle = k % 2 ? "#efe6cc" : "#cdbf9c"; c.strokeStyle = "rgba(60,48,32,.6)"; c.lineWidth = 0.6; c.beginPath(); c.moveTo(-sz, -sz * 0.6); c.lineTo(sz * 0.8, -sz); c.lineTo(sz, sz * 0.5); c.lineTo(-sz * 0.4, sz); c.closePath(); c.fill(); c.stroke(); c.restore(); }
      }
      c.restore();
    } };
})();
