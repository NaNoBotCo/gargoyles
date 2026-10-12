/* beasts.js — the gargoyles, grotesques and their cousins, drawn in a 200 × 200 box.
   Each one faces right with its wall on the left. s = { t, poke (ms since a tap, or -1),
   rain 0..1, look [x,y], variant }. A beast with a mouth spout says where the water leaves. */
(function () {
  "use strict";
  var G = window.GARG, S = G.STONES, B = G.BEASTS = {};
  var sin = Math.sin, cos = Math.cos, PI = Math.PI, lerp = G.lerp, mix = G.mix, rgba = G.rgba, clamp = G.clamp;

  /* a tap's envelope: rises fast, settles slowly, 0 when idle */
  function pk(s, len) { len = len || 1400; if (s.poke == null || s.poke < 0 || s.poke > len) return 0; var u = s.poke / len; return sin(PI * Math.min(1, u * 2.2)) * (1 - u * 0.3) * (u < 0.45 ? 1 : 1 - (u - 0.45) / 0.55); }
  /* blink every few seconds, staggered by a seed */
  function blink(t, seed) { var p = ((t + seed * 977) % 4300) / 4300; return p > 0.955 ? sin((p - 0.955) / 0.045 * PI) : 0; }
  /* the eye wanders a little */
  function wander(t, seed) { return [sin(t * 0.0007 + seed) * 0.8, sin(t * 0.0011 + seed * 2) * 0.4]; }
  function rot(c, x, y, a, fn) { c.save(); c.translate(x, y); c.rotate(a); c.translate(-x, -y); fn(); c.restore(); }
  G.pk = pk; G.blink = blink; G.wander = wander; G.rot = rot;
  /* a lobed leaf, for foliage, the Green Man and vine scrolls */
  G.leaf = function (c, x, y, ang, len, wid, lobes, st, o) {
    o = o || {};
    var L = [], R = [], n = lobes || 3;
    for (var i = 0; i <= 12; i++) {
      var u = i / 12, w = sin(PI * Math.pow(u, 0.8)) * wid * (1 + 0.28 * sin(u * PI * n * 2) * (u > 0.15 ? 1 : 0));
      var px = x + cos(ang) * len * u, py = y + sin(ang) * len * u;
      L.push([px - sin(ang) * w, py + cos(ang) * w, 1]); R.unshift([px + sin(ang) * w * 0.9, py - cos(ang) * w * 0.9, 1]);
    }
    G.part(c, L.concat(R), st, { lw: o.lw || 0.9, steps: 1, pits: false, hatchGap: 2.4 });
    G.cut(c, [[x, y], [x + cos(ang) * len * 0.5 + sin(ang) * wid * 0.08, y + sin(ang) * len * 0.5], [x + cos(ang) * len * 0.92, y + sin(ang) * len * 0.92]], st, 0.6);
  };

  /* ---- local carving helpers: the kit stays as it is, these age and ground what it draws ---- */
  /* stone weathered toward grey: Paris limestone is not cream */
  function aged(st, k) { return { base: mix(st.base, S.grey.base, k), light: mix(st.light, S.grey.light, k), dark: mix(st.dark, S.grey.dark, k), ink: st.ink, pit: mix(st.pit, S.grey.pit, k) }; }
  /* a contact shadow: the same shape pushed down and right, clipped to the form it stands on */
  function under(c, pts, st, dx, dy, a, clip) {
    if (G.sil) return;
    c.save();
    if (clip) { G.trace(c, G.sp(clip, true, 5), true); c.clip(); }
    c.translate(dx == null ? 3 : dx, dy == null ? 4 : dy);
    G.trace(c, G.sp(pts, true, 5), true); c.fillStyle = rgba(st.ink, a == null ? 0.25 : a); c.fill();
    c.restore();
  }
  /* a tapered water stain running down stone, wider at the top */
  function streak(c, x, y, len, w, st, a, clip) {
    if (G.sil) return;
    c.save();
    if (clip) { G.trace(c, G.sp(clip, true, 5), true); c.clip(); }
    var g = c.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, rgba(st.ink, a || 0.2)); g.addColorStop(1, rgba(st.ink, 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x + w / 2, y);
    c.quadraticCurveTo(x + w * 0.35, y + len * 0.45, x + w * 0.22, y + len); c.lineTo(x - w * 0.18, y + len); c.quadraticCurveTo(x - w * 0.3, y + len * 0.55, x - w / 2, y); c.fill();
    c.restore();
  }
  /* a small flat-cut notch where a tip has broken off: a pale cut face over a dark underside */
  function chip(c, x, y, r, st, ang) {
    if (G.sil) return;
    c.save(); c.translate(x, y); c.rotate(ang || 0);
    c.fillStyle = rgba(st.light, 0.95); c.beginPath(); c.moveTo(-r, r * 0.1); c.lineTo(-r * 0.1, -r * 0.8); c.lineTo(r, -r * 0.1); c.lineTo(r * 0.3, r * 0.8); c.closePath(); c.fill();
    c.strokeStyle = rgba(st.ink, 0.85); c.lineWidth = 0.6; c.stroke();
    c.restore();
  }
  /* lichen: olive and grey flecks in clusters */
  function lichen(c, x, y, n, seed, spread) {
    if (G.sil) return;
    var r = G.rng(seed), cols = ["rgba(122,128,78,.7)", "rgba(150,152,108,.65)", "rgba(96,102,66,.7)"];
    for (var i = 0; i < n; i++) { c.fillStyle = cols[i % 3]; var rr = 0.5 + r() * 1.1; c.beginPath(); c.arc(x + (r() - 0.5) * spread * 2, y + (r() - 0.5) * spread, rr, 0, 7); c.fill(); }
  }
  /* a tapered limb, tail or tendril along hand-placed points: widths at the start and the end, round-capped */
  function tube(c, pts, w0, w1, st, o) {
    o = o || {};
    var poly = G.sp(pts, false, 5), n = poly.length, L = [], R = [], i;
    for (i = 0; i < n; i++) {
      var a = poly[Math.max(i - 1, 0)], b = poly[Math.min(i + 1, n - 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, u = i / (n - 1);
      var w = lerp(w0, w1, u) * (1 + (o.bulge || 0) * sin(PI * u)) / 2;
      L.push([poly[i][0] - dy / d * w, poly[i][1] + dx / d * w, 1]); R.unshift([poly[i][0] + dy / d * w, poly[i][1] - dx / d * w, 1]);
    }
    if (o.caps !== false) {
      var pe = poly[n - 1], ps = poly[0], ae = Math.atan2(pe[1] - poly[n - 2][1], pe[0] - poly[n - 2][0]), as = Math.atan2(poly[1][1] - ps[1], poly[1][0] - ps[0]), we = w1 / 2 * (1 + 0), ws = w0 / 2, cap = [];
      for (i = 1; i < 4; i++) cap.push([pe[0] + cos(ae + PI / 2 - i * PI / 4) * we, pe[1] + sin(ae + PI / 2 - i * PI / 4) * we]);
      L = L.concat(cap);
      var cap2 = [];
      for (i = 1; i < 4; i++) cap2.push([ps[0] + cos(as - PI / 2 - i * PI / 4) * ws, ps[1] + sin(as - PI / 2 - i * PI / 4) * ws]);
      R = R.concat(cap2);
    }
    return G.part(c, L.concat(R), st, { lw: o.lw || 1, steps: 3, hatch: o.hatch, pits: false, base: o.base, lift: o.lift, hatchAng: o.hatchAng, hatchGap: o.hatchGap, round: o.round });
  }
  /* a point and heading u (0..1) of the way along a polyline */
  function pathAt(poly, u) {
    var tot = 0, i, seg = [];
    for (i = 1; i < poly.length; i++) { var d = Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]); seg.push(d); tot += d; }
    var at = u * tot, acc = 0; i = 0;
    while (i < seg.length - 1 && acc + seg[i] < at) { acc += seg[i]; i++; }
    var f = clamp((at - acc) / (seg[i] || 1), 0, 1), a = poly[i], b = poly[i + 1] || a;
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), Math.atan2(b[1] - a[1], b[0] - a[0])];
  }
  /* a pool of shadow: opaque ink first, then the carved hollow's rim over it, so nothing shows through a mouth */
  function pool(c, pts, st, o) {
    if (G.sil) return;
    c.save(); G.trace(c, G.sp(pts, true, 6), true); c.fillStyle = rgba(st.ink, 0.94); c.fill(); c.restore();
    G.hollow(c, pts, st, o);
  }
  /* a drop that swells on a lip, lets go and falls; fall = how far it drops, period in ms */
  function drip(c, x, y, t, period, off, fall, r0) {
    if (G.sil) return;
    var u = ((t + off) % period) / period, sw = 0.62, r = r0 || 2.2;
    c.save(); c.fillStyle = "rgba(176,210,240,.92)"; c.strokeStyle = "rgba(60,90,130,.6)"; c.lineWidth = 0.5;
    if (u < sw) {
      var k = G.ease(u / sw), rr = r * (0.25 + 0.75 * k), ty = y + rr * 1.4;
      c.beginPath(); c.moveTo(x, y - 0.5); c.quadraticCurveTo(x - rr, ty - rr * 0.4, x, ty + rr * 0.6); c.quadraticCurveTo(x + rr, ty - rr * 0.4, x, y - 0.5); c.fill(); c.stroke();
      c.fillStyle = "rgba(255,255,255,.9)"; c.beginPath(); c.arc(x - rr * 0.35, ty - rr * 0.1, rr * 0.22, 0, 7); c.fill();
    } else {
      var v = (u - sw) / (1 - sw), dy = y + r * 2 + v * v * fall;
      c.globalAlpha = 1 - v * v * 0.8;
      c.beginPath(); c.moveTo(x, dy - r * 1.3); c.quadraticCurveTo(x - r * 0.8, dy, x, dy + r * 0.7); c.quadraticCurveTo(x + r * 0.8, dy, x, dy - r * 1.3); c.fill(); c.stroke();
    }
    c.restore();
  }
  /* a gecko crosses a ledge now and then, in bursts and pauses; none in sight the rest of the time */
  function gecko(c, x0, x1, y, t, period, off, sc, hue) {
    if (G.sil) return;
    var u = ((t + off) % period) / period, win = 0.55;
    if (u > win) return;
    var v = u / win, x = lerp(x0, x1, clamp(v + 0.03 * sin(v * 50), 0, 1)), ph = v * 50, dir = x1 >= x0 ? 1 : -1;
    var col = hue || "#7a8456";
    c.save(); c.translate(x, y); c.scale(sc * dir, sc);
    c.strokeStyle = "#2a2a1c"; c.lineWidth = 0.9; c.lineCap = "round";
    [[3, 1.4, 0], [3, -1.4, 1], [-3, 1.4, 1], [-3, -1.4, 0]].forEach(function (l) {
      var sw = sin(ph + l[2] * PI) * 1.4; c.beginPath(); c.moveTo(l[0], l[1] * 0.4); c.lineTo(l[0] + sw, l[1] * 1.6); c.lineTo(l[0] + sw + 1.4, l[1] * 1.7); c.stroke();
    });
    c.fillStyle = col; c.beginPath(); c.moveTo(8, 0); c.lineTo(5.5, -1.7); c.lineTo(2, -1.5); c.lineTo(-3, -2); c.lineTo(-8, -0.8); c.quadraticCurveTo(-13, 0.4 + sin(ph * 0.5) * 1.2, -15, 1.4 + sin(ph * 0.5) * 2);
    c.quadraticCurveTo(-12, 1.6, -8, 1); c.lineTo(-3, 2.1); c.lineTo(2, 1.7); c.lineTo(5.5, 1.5); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = "#1a1a10"; c.beginPath(); c.arc(5.2, -0.7, 0.55, 0, 7); c.fill();
    c.restore();
  }
  /* a flame lock: an S-curved strand, wide near the root and ending in a hooked point, with two grooves cut along it.
     Where it grows, how long, how it curls and how it wobbles are the caller's. */
  function flame(c, x, y, ang, len, wid, curl, wob, st, o) {
    o = o || {};
    var grooves = o.grooves === 1 ? [0] : [-1, 1];
    var n = 10, mid = [], L = [], R = [], i;
    for (i = 0; i <= n; i++) {
      var u = i / n, a = ang + curl * u * u, sway = sin(u * PI * 1.5 + wob) * wid * 0.5 * u;
      mid.push([x + cos(ang) * len * u * 0.65 + cos(a) * len * u * 0.35 - sin(ang) * sway, y + sin(ang) * len * u * 0.65 + sin(a) * len * u * 0.35 + cos(ang) * sway]);
    }
    for (i = 0; i <= n; i++) {
      var q = mid[i], q0 = mid[Math.max(i - 1, 0)], q1 = mid[Math.min(i + 1, n)], dx = q1[0] - q0[0], dy = q1[1] - q0[1], d = Math.hypot(dx, dy) || 1, uu = i / n;
      var w = wid * (0.35 + 0.65 * sin(PI * Math.pow(uu, 0.55))) * (1 - uu * 0.55) * (i === n ? 0 : 1);
      L.push([q[0] - dy / d * w, q[1] + dx / d * w, 1]); R.unshift([q[0] + dy / d * w, q[1] - dx / d * w, 1]);
    }
    G.part(c, L.concat(R), st, { lw: o.lw || 1, steps: 1, pits: false, hatch: o.hatch, hatchGap: 4.6, hatchAng: ang + 1.57 });
    grooves.forEach(function (sd) {
      var pts = [0.2, 0.45, 0.7].map(function (u) { var k = Math.round(u * n), q = mid[k], q0 = mid[Math.max(k - 1, 0)], q1 = mid[Math.min(k + 1, n)], dx = q1[0] - q0[0], dy = q1[1] - q0[1], d = Math.hypot(dx, dy) || 1, w = wid * (0.35 + 0.65 * sin(PI * Math.pow(u, 0.55))) * (1 - u * 0.55) * 0.42 * sd; return [q[0] - dy / d * w, q[1] + dx / d * w]; });
      G.cut(c, pts, st, 0.55);
    });
  }
  var PARIS = aged(S.lime, 0.42);

  /* a tuft of red valerian rooted in a crack: stems sway, each ends in a head of tiny pink flowers */
  function valerian(c, x, y, t, seed) {
    if (G.sil) return;
    var r = G.rng(seed);
    c.save(); c.lineCap = "round";
    for (var i = 0; i < 6; i++) {
      var a = -PI / 2 + (i - 2.5) * 0.3 + sin(t * 0.0016 + i * 1.3) * 0.07, L = 9 + r() * 8, ox = (i - 2.5) * 0.9;
      var mx = x + ox + cos(a) * L * 0.5, my = y + sin(a) * L * 0.5, tx = x + ox + cos(a) * L, ty = y + sin(a) * L;
      c.strokeStyle = "#4f6a3a"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x + ox, y); c.quadraticCurveTo(mx + 0.5, my, tx, ty); c.stroke();
      c.fillStyle = "#6b8a4a"; c.beginPath(); c.moveTo(mx, my); c.quadraticCurveTo(mx - 4, my - 1.5, mx - 5.5, my + 1.2); c.quadraticCurveTo(mx - 2, my + 1, mx, my); c.fill();
      for (var f = 0; f < 4; f++) { c.fillStyle = f % 2 ? "#d9648c" : "#bf4a74"; c.beginPath(); c.arc(tx + (r() - 0.5) * 3.4, ty + (r() - 0.5) * 3 - 1, 0.95, 0, 7); c.fill(); }
    }
    c.restore();
  }

  /* ---------------------------------------------------------------- Notre-Dame */
  var N_BEAM = [[0, 108, 1], [123, 108, 1], [125, 112, 1], [123, 116, 1], [112, 117, 1], [111, 121], [115, 125], [118, 129], [113, 133], [102, 137, 1], [94, 150, 1], [0, 152, 1]];
  var N_BODY = [[14, 80], [20, 70], [32, 62], [50, 59], [66, 64], [84, 72], [98, 70], [110, 66], [124, 67], [138, 73], [148, 82], [152, 92], [152, 100], [148, 108], [138, 111], [124, 109], [110, 108], [94, 107.5], [78, 108], [58, 108], [40, 107.5], [26, 101], [16, 92]];
  var N_TROUGH = [[24, 76], [34, 68], [50, 65], [66, 70], [84, 78], [98, 76], [110, 72], [124, 73], [138, 79], [147, 87]];
  var N_FORE = [[98, 76], [110, 74], [120, 82], [124, 94], [126, 104], [130, 110], [130, 118, 1], [124, 119, 1], [119, 115], [114, 110], [108, 104], [102, 96], [98, 86]];
  var N_HIND = [[22, 86], [28, 72], [42, 66], [54, 72], [60, 86], [60, 98], [66, 104], [72, 108, 1], [44, 108, 1], [38, 104], [32, 100], [24, 95]];
  /* the folded wing's four points, folded and opened: wrist, three finger tips */
  var N_WING_F = [[50, 22], [22, 40], [30, 58], [44, 64]], N_WING_O = [[56, 8], [18, 10], [6, 36], [18, 58]];
  /* the neck, in page units: the back runs down into the nape, the throat under the jaw */
  var N_NECK = [[112, 69], [128, 71.5], [142, 77], [153, 83], [160, 94], [158, 106], [150, 112], [134, 111], [118, 108]];

  B.notre = { stone: "lime", spout: true, mouth: [190, 114, 0.8, 0.4],
    draw: function (c, s) {
      var st = PARIS, p = pk(s), t = s.t, rain = s.rain || 0, look = wander(t, 1), br = sin(t * 0.0013) * 0.5;
      /* the stepped corbel it lies along, built into the wall: abacus, cavetto, torus */
      G.part(c, N_BEAM, st, { lw: 1.2, seed: 3, hatchAng: 0.15, hatchGap: 4 });
      /* soot under the overhang of the beam's end, where rain never reaches to wash it */
      under(c, [[88, 140, 1], [132, 142, 1], [132, 162, 1], [88, 162, 1]], st, 0, -9, 0.36, N_BEAM);
      G.cut(c, [[2, 117], [110, 117.5]], st, 0.8, { glint: 1 });
      G.cut(c, [[2, 126], [108, 127]], st, 0.8, { glint: 1 });
      streak(c, 44, 118, 34, 9, st, 0.2, N_BEAM); streak(c, 51, 118, 20, 4, st, 0.14, N_BEAM); streak(c, 78, 118, 26, 6, st, 0.16, N_BEAM); streak(c, 100, 124, 22, 5, st, 0.2, N_BEAM);
      lichen(c, 20, 140, 7, 21, 14);
      valerian(c, 28, 108.5, t, 8);
      /* tail, looping up the wall and ending in a spade */
      tube(c, [[20, 92], [10, 98], [3, 88], [3, 74], [8, 62]], 8, 2.4, st, { lw: 1.1, hatchAng: 1.4 });
      rot(c, 8, 62, sin(t * 0.0011) * 0.05 + p * 0.2, function () {
        G.part(c, [[8, 62], [2, 56], [1, 50], [8, 40, 1], [15, 50], [14, 56]], st, { lw: 1, pits: false, hatch: false });
        G.cut(c, [[8, 60], [8, 44]], st, 0.6);
      });
      c.save(); c.translate(0, br);
      /* the body lies on the beam, drawn a little shorter so the neck can run long; where they meet the beam is dark */
      c.save(); c.scale(0.94, 1);
      under(c, N_BODY, st, 0, 5, 0.36, N_BEAM);
      G.part(c, N_BODY, st, { lw: 1.2, round: 0.6, seed: 1, hatchAng: 0.4 });
      /* soot along the belly line and in the crook behind the wing root, and old grey-black mottling on the shaded flank */
      under(c, [[10, 108, 1], [154, 110, 1], [154, 130, 1], [10, 130, 1]], st, 0, -7, 0.3, N_BODY);
      under(c, [[62, 58], [82, 60], [90, 74], [76, 86], [60, 76]], st, 2, 6, 0.32, N_BODY);
      mottle(c, N_BODY, 86, 98, 8, 12, 0.3); mottle(c, N_BODY, 112, 96, 6, 13, 0.26); mottle(c, N_BODY, 50, 98, 7, 14, 0.28);
      /* the neck is the body running on, one smooth part under the head, so the back flows down into a small head with its snout tilted to the street; drawn in page units, so undo the shortening */
      c.save(); c.scale(1 / 0.94, 1);
      G.part(c, N_NECK, st, { round: 0.3, lift: 0.3, seed: 16, hatchAng: 0.5, line: false });
      G.outline(c, G.sp([[112, 69], [128, 71.5], [142, 77], [153, 83], [160, 94], [158, 106]], false, 6), false, st.ink, 1.2, { taper: 1 });
      G.outline(c, G.sp([[118, 108], [134, 111], [150, 112], [158, 106]], false, 6), false, st.ink, 1.3, { taper: 1 });
      under(c, [[118, 106, 1], [140, 112, 1], [156, 110, 1], [150, 118, 1], [124, 118, 1]], st, 0, 4, 0.3, N_NECK);
      G.cut(c, [[134, 76], [141, 90], [138, 106]], st, 0.8, { glint: 1 }); G.cut(c, [[145, 79], [151, 92], [148, 107]], st, 0.7);
      lichen(c, 132, 72, 5, 17, 5);
      c.restore();
      /* chisel facets on the flank, ribs under the wing */
      G.cut(c, [[102, 84], [114, 90], [128, 92]], st, 0.9, { glint: 1 }); G.cut(c, [[130, 84], [140, 92]], st, 0.8, { glint: 1 }); G.cut(c, [[16, 84], [24, 93]], st, 0.8, { glint: 1 });
      [[70, 86, 73, 94, 71, 102], [80, 87, 85, 95, 82, 103], [90, 86, 95, 95, 93, 102]].forEach(function (r) { G.cut(c, [[r[0], r[1]], [r[2], r[3]], [r[4], r[5]]], st, 0.6); });
      /* the water channel cut along the spine, lipped, with the vertebrae showing in it */
      tube(c, N_TROUGH, 5.4, 4.2, st, { base: mix(st.dark, st.ink, 0.3), hatch: false, lw: 0.8, lift: 0 });
      var tp = G.sp(N_TROUGH, false, 5);
      G.cut(c, N_TROUGH.map(function (q) { return [q[0], q[1] - 2.8]; }), st, 0.9, { glint: 1 });
      for (var v = 1; v < 9; v++) { var q = pathAt(tp, v / 9.5); G.cut(c, [[q[0] - sin(q[2]) * 2.4, q[1] + cos(q[2]) * 2.4], [q[0] + sin(q[2]) * 2.4, q[1] - cos(q[2]) * 2.4]], st, 0.7); }
      /* in rain the channel runs full: a wet sheen along it and bright glints sliding toward the throat */
      if (rain > 0.02 && !G.sil) {
        c.save(); c.lineCap = "round"; c.lineJoin = "round";
        c.strokeStyle = "rgba(190,222,248," + (0.5 * rain) + ")"; c.lineWidth = 2.6; c.beginPath(); tp.forEach(function (q, k) { if (k) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); c.stroke();
        c.strokeStyle = "rgba(255,255,255," + (0.5 * rain) + ")"; c.lineWidth = 0.9; c.beginPath(); tp.forEach(function (q, k) { if (k) c.lineTo(q[0], q[1] - 0.8); else c.moveTo(q[0], q[1] - 0.8); }); c.stroke();
        for (var d = 0; d < 6; d++) {
          var u = (t * 0.00055 + d / 6 + sin(d * 2.3) * 0.05) % 1, a0 = pathAt(tp, u * 0.97), a1 = pathAt(tp, Math.min(1, u * 0.97 + 0.025));
          c.strokeStyle = "rgba(255,255,255," + (0.95 * rain) + ")"; c.lineWidth = 1.3; c.beginPath(); c.moveTo(a0[0], a0[1]); c.lineTo(a1[0], a1[1]); c.stroke();
        }
        c.restore();
      }
      /* the folded wing: arm bone, three fingers, scalloped skin */
      var fl = clamp(p * 0.95 + 0.04 + sin(t * 0.0017) * 0.03, 0, 1), W = N_WING_F.map(function (q, i) { return [lerp(q[0], N_WING_O[i][0], fl), lerp(q[1], N_WING_O[i][1], fl)]; });
      var R0 = [68, 64];
      function scallop(a, b, k) { var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = W[0][0] - mx, dy = W[0][1] - my, d = Math.hypot(dx, dy) || 1; return [mx + dx / d * k, my + dy / d * k]; }
      var s1 = scallop(W[1], W[2], 9), s2 = scallop(W[2], W[3], 9), s3 = scallop(W[3], R0, 6);
      var WING = [[R0[0], R0[1], 1], [lerp(R0[0], W[0][0], 0.5) + 3, lerp(R0[1], W[0][1], 0.5)], [W[0][0], W[0][1], 1], [W[1][0], W[1][1], 1], s1, [W[2][0], W[2][1], 1], s2, [W[3][0], W[3][1], 1], s3];
      under(c, WING, st, 3, 4, 0.28, N_BODY);
      G.part(c, WING, st, { lw: 1, seed: 9, base: mix(st.base, st.light, 0.32), hatchGap: 4.5, hatchAng: 1.2 });
      G.cut(c, [[R0[0], R0[1]], [lerp(R0[0], W[0][0], 0.5) + 2, lerp(R0[1], W[0][1], 0.5)], [W[0][0], W[0][1]]], st, 2);
      for (var f = 1; f < 4; f++) G.cut(c, [[W[0][0], W[0][1]], [lerp(W[0][0], W[f][0], 0.55) - 1, lerp(W[0][1], W[f][1], 0.55)], [W[f][0], W[f][1]]], st, 1.2);
      G.part(c, [[W[0][0] - 1, W[0][1] + 2], [W[0][0] + 3, W[0][1] - 5], [W[0][0] + 4, W[0][1] + 2]], st, { lw: 0.7, pits: false, hatch: false, base: st.dark });
      streak(c, 60, 66, 14, 5, st, 0.2, N_BODY);
      /* hind leg, the foot flat on the beam */
      under(c, N_HIND, st, 3, 3, 0.26, N_BODY);
      G.part(c, N_HIND, st, { lw: 1.1, round: 0.6, seed: 4, hatchAng: 1.0 });
      G.cut(c, [[27, 86], [40, 76], [54, 82]], st, 0.8, { glint: 1 });
      [[58, 104, 60, 108], [63, 104.5, 66, 108], [68, 105, 70, 108]].forEach(function (r) { G.cut(c, [[r[0], r[1]], [r[2], r[3]]], st, 0.6); });
      lichen(c, 44, 66, 9, 5, 9); lichen(c, 112, 69, 6, 6, 6);
      /* foreleg gripping the end of the beam */
      under(c, N_FORE, st, 3, 3, 0.28, N_BODY); under(c, N_FORE, st, 2, 3, 0.3, N_BEAM);
      G.part(c, N_FORE, st, { lw: 1.1, round: 0.5, seed: 6, hatchAng: 1.3 });
      G.cut(c, [[104, 84], [112, 94], [114, 104]], st, 0.8, { glint: 1 });
      [[122, 108, 124, 118], [127, 108, 129, 117]].forEach(function (r) { G.cut(c, [[r[0], r[1]], [r[2], r[3]]], st, 0.7); });
      [[124, 112], [129, 111]].forEach(function (q) { G.part(c, [[q[0] - 1, q[1]], [q[0] + 3, q[1] + 3], [q[0] + 1, q[1] + 8], [q[0] - 1, q[1] + 3]], st, { lw: 0.7, pits: false, hatch: false, base: st.dark }); });
      c.restore();
      /* the head turns a little to look */
      var nod = 0.14 + p * 0.1 + sin(t * 0.0009) * 0.02, jaw = 0.18 + p * 0.5 + rain * 0.08;
      var fk = ((t + 800) % 3000) / 240, flick = fk < 1 ? sin(PI * fk) * 0.16 : 0;
      rot(c, 146, 96, nod, function () {
        c.save(); c.translate(146, 96); c.scale(0.86, 0.86); c.translate(-146, -96);
        /* the ear flicks; it lies flat on a tap */
        rot(c, 146, 90, flick - p * 0.18, function () {
          G.part(c, [[152, 90], [145, 78], [137, 64, 1], [132, 76], [133, 88], [140, 95], [148, 96]], st, { lw: 1.1, seed: 11, hatchAng: 1.7, hatchGap: 3 });
          G.hollow(c, [[143, 82], [139, 72], [138, 82], [141, 90]], st, { deep: 0.7, lw: 0.6 });
        });
        /* horn swept back, its tip broken */
        G.part(c, [[173, 81], [168, 70], [162, 61], [157, 55, 1], [155, 58, 1], [153.5, 54.5, 1], [151.5, 58, 1], [157, 67], [162, 78], [166, 85]], st, { lw: 1.1, seed: 12, hatchAng: 2.0 });
        [[170, 73, 163, 75], [166, 66, 159, 68], [161, 60, 156, 63]].forEach(function (r) { G.cut(c, [[r[0], r[1]], [r[2], r[3]]], st, 0.55); });
        
        /* the mouth cavity, then the deep jaw on its hinge, then the skull over both */
        var j2 = [164 + (197 - 164) * cos(jaw) - (110 - 104) * sin(jaw), 104 + (197 - 164) * sin(jaw) + (110 - 104) * cos(jaw)], j1 = [164 + 8 * cos(jaw) - 2 * sin(jaw), 104 + 8 * sin(jaw) + 2 * cos(jaw)];
        var cav = [[164, 103], [200, 103], [Math.min(201, j2[0] + 2), j2[1]], [j1[0] + 4, j1[1] + 2]];
        G.part(c, cav, st, { base: mix(st.ink, st.dark, 0.3), hatch: false, pits: false, lift: 0, lw: 0.8 });
        rot(c, 164, 104, jaw, function () {
          /* a ragged chin beard, behind the jaw */
          var bw = sin(t * 0.0011) * 1.2;
          G.part(c, [[168, 118], [175 + bw * 0.5, 131, 1], [181, 121], [188 + bw * 0.8, 130, 1], [193, 116]], st, { lw: 0.9, pits: false, hatch: false, base: mix(st.base, st.dark, 0.2) });
          G.cut(c, [[176, 123], [175.5, 128]], st, 0.5); G.cut(c, [[188, 121], [188, 126]], st, 0.5);
          G.part(c, [[156, 104], [172, 106], [186, 108], [197, 110], [195, 115], [185, 119], [172, 123], [160, 124], [152, 118]], st, { lw: 1.1, seed: 14, hatchAng: 0.2 });
          if (p > 0.12) G.part(c, [[168, 108], [182, 108], [195, 111], [201, 117], [198, 124], [190, 120], [181, 115], [170, 113]], st, { lw: 0.9, pits: false, hatch: false, base: mix(st.base, "#a8706a", 0.42) });
          G.teeth(c, [[176, 107.5], [188, 109], [195, 110]], 2, 3.4, -1, st, {});
          G.cut(c, [[158, 116], [172, 118], [188, 116]], st, 0.7);
          if (rain > 0.02 && !G.sil) { c.save(); c.strokeStyle = "rgba(235,246,255," + (0.8 * rain) + ")"; c.lineWidth = 1.3; c.lineCap = "round"; c.beginPath(); c.moveTo(168, 106.5); c.lineTo(196, 109.5); c.stroke(); c.restore(); }
          drip(c, 194, 115, t, 1600, 300, 24, 2.1);
        });
        G.part(c, [[140, 96], [144, 86], [152, 79], [162, 76], [172, 78], [181, 84], [191, 91], [199, 97], [200, 104, 1], [186, 105], [172, 104], [160, 108], [148, 110]], st, { lw: 1.2, round: 0.8, seed: 15, hatchAng: 0.5 });
        G.teeth(c, [[176, 104], [188, 104.5], [198, 104.5]], 3, 3.4, 1, st, {});
        /* nostril with its flare, muzzle wrinkles, the heavy brow over a sunk eye */
        G.hollow(c, [[191, 96], [195, 95.5], [195.5, 98.5], [192, 99]], st, { lw: 0.6 });
        G.cut(c, [[188, 93], [193, 92], [197, 95]], st, 0.6);
        G.cut(c, [[176, 92], [183, 96], [188, 101]], st, 0.6); G.cut(c, [[178, 89], [186, 93]], st, 0.5);
        G.part(c, [[159, 85], [163, 79.5], [172, 78], [182, 84], [181, 88], [173, 85.5], [165, 87]], st, { lw: 1, pits: false, hatch: false });
        G.cut(c, [[160, 85], [169, 85.5], [179, 88.5]], st, 1.2, { glint: 1 });
        G.eye(c, 170, 92.5, 3.7, st, { blink: Math.max(blink(t, 1), p > 0.5 ? 0.95 : 0), look: look, squint: 0.75 });
        G.cut(c, [[152, 92], [156, 99], [154, 106]], st, 0.7); G.cut(c, [[146, 90], [150, 96]], st, 0.6, { glint: 1 });
        streak(c, 168, 106, 12, 5, st, 0.18);
        c.restore();
      });
      c.restore();
    } };

  /* a vertebra: a small cone on a silhouette edge, pointing out along ang */
  function nub(c, x, y, ang, sz, st) {
    if (G.sil) return;
    c.save(); c.translate(x, y); c.rotate(ang);
    c.beginPath(); c.moveTo(-sz * 0.5, -sz * 0.6); c.quadraticCurveTo(sz * 0.2, -sz * 0.5, sz, 0); c.quadraticCurveTo(sz * 0.2, sz * 0.5, -sz * 0.5, sz * 0.6); c.closePath();
    var g = c.createLinearGradient(0, -sz * 0.6, 0, sz * 0.6); g.addColorStop(0, st.light); g.addColorStop(1, st.dark);
    c.fillStyle = g; c.fill(); c.strokeStyle = st.ink; c.lineWidth = 0.8; c.stroke(); c.restore();
  }

  /* ---------------------------------------------------------------- Le Stryge */
  var Y_TORSO = [[46, 100], [52, 78], [66, 64], [84, 62], [98, 70], [104, 86], [96, 104], [84, 124], [70, 138], [52, 136, 1], [44, 122]];
  var Y_WING_F = [[40, 12], [14, 30], [16, 52], [28, 66]], Y_WING_O = [[46, 2], [6, 8], [0, 38], [12, 64]];
  /* the arm is two carved parts: an upper arm with a deltoid swelling at the shoulder and a pointed elbow on the rail, and a forearm that tapers to the wrist */
  var Y_UARM = [[88, 88], [96, 82], [106, 84], [110, 94], [112, 108], [116, 124], [119, 138], [118, 146], [112, 152, 1], [107, 146], [104, 134], [99, 120], [93, 108], [88, 98]];
  var Y_FARM = [[108.2, 143.1], [111.2, 135.6], [117.5, 124.7], [122, 120], [130, 124], [127.3, 129.7], [124, 142], [119.8, 148.9]];
  var Y_THUMB = [[130, 124], [138, 126], [146, 127.5], [150, 130], [146, 133], [138, 132], [131, 129.5]];
  var Y_CHIN = [[140, 112], [158, 115], [158, 128], [152, 138], [146, 124]];
  /* a haunch and a foot can be told apart from the rest of the figure by this: the mottled grey-black of old Paris limestone, in blots that stay inside the form they stain */
  function mottle(c, clip, x, y, r, seed, a) {
    if (G.sil) return;
    var rg = G.rng(seed), ag = aged(S.lime, 0.6);
    c.save(); G.trace(c, G.sp(clip, true, 5), true); c.clip();
    for (var k = 0; k < 2; k++) {
      var pts = []; for (var i = 0; i < 8; i++) { var an = i / 8 * PI * 2, rr = r * (k ? 0.45 : 1) * (0.6 + rg() * 0.6); pts.push([x + cos(an) * rr * 1.25 + (k ? 2 : 0), y + sin(an) * rr * 0.8]); }
      G.trace(c, G.sp(pts, true, 4), true); c.fillStyle = rgba(k ? S.lime.ink : ag.dark, (k ? 0.5 : 1) * a); c.fill();
    }
    c.restore();
  }
  /* a Haussmann roofline behind the Gallery of Chimeras, with the Eiffel Tower peeking over it at the right: zinc mansards, dormers, chimney pots.
     Faint, fixed, with a few dormer windows that light and go out. The hero draws its own Paris, so none of this is drawn there (its parts filter marks it). */
  var PART0 = G.part;
  function haussmann(c, t) {
    if (G.sil || G.part !== PART0) return;
    var r = G.rng(91), i, k;
    c.save(); c.globalAlpha = 0.3;
    /* the tower, far off: two splayed legs under a platform, the shaft narrowing to a spike */
    c.fillStyle = "#6d5f55";
    c.beginPath(); c.moveTo(179, 151); c.lineTo(183.5, 140); c.lineTo(185.5, 138.5); c.lineTo(187, 127); c.lineTo(188.2, 118); c.lineTo(189.4, 127); c.lineTo(191, 138.5); c.lineTo(193, 140); c.lineTo(197.5, 151); c.lineTo(194.5, 151); c.lineTo(188.2, 143); c.lineTo(182, 151); c.closePath(); c.fill();
    c.fillRect(183.4, 138, 9.6, 1.8); c.fillRect(185.6, 127, 5.2, 1.2);
    /* the roofs: [left, width, height], each standing on the line of the coping at y = 150 */
    var R = [[-4, 30, 17], [24, 24, 23], [46, 26, 15], [124, 26, 17], [148, 22, 25], [168, 20, 14], [186, 18, 19]];
    R.forEach(function (b, n) {
      var x0 = b[0], w = b[1], h = b[2], y = 150;
      c.fillStyle = n % 2 ? "#667589" : "#738297";
      c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + 1.6, y - h * 0.72); c.lineTo(x0 + w * 0.2, y - h); c.lineTo(x0 + w * 0.8, y - h); c.lineTo(x0 + w - 1.6, y - h * 0.72); c.lineTo(x0 + w, y); c.closePath(); c.fill();
      c.fillStyle = "rgba(255,255,255,.2)"; c.fillRect(x0 + w * 0.2, y - h, w * 0.6, 1.1);
      /* dormers, a few lit */
      for (var dx = x0 + 5; dx < x0 + w - 4; dx += 7.5) {
        var lit = sin(t * 0.0005 + r() * 6.28) > 0.3;
        c.fillStyle = lit ? "#ffe3a0" : "#46536a"; c.beginPath(); c.moveTo(dx, y - h * 0.18); c.lineTo(dx, y - h * 0.46); c.quadraticCurveTo(dx + 1.6, y - h * 0.58, dx + 3.2, y - h * 0.46); c.lineTo(dx + 3.2, y - h * 0.18); c.closePath(); c.fill();
      }
      /* a chimney stack with its pots */
      var cx = x0 + w * (0.25 + 0.5 * r());
      c.fillStyle = "#8a7d72"; c.fillRect(cx, y - h - 8, 5.4, 9);
      c.fillStyle = "#9a5f48"; for (k = 0; k < 3; k++) c.fillRect(cx + 0.3 + k * 1.8, y - h - 12, 1.3, 4);
    });
    c.restore();
  }
  /* a finger: tapered, a knuckle swelling, rounded at the tip; ang is the way it points */
  function finger(c, x, y, ang, len, w, st) {
    var ca = cos(ang), sa = sin(ang), hw = w / 2;
    function at(u, v) { return [x + ca * len * u - sa * hw * v, y + sa * len * u + ca * hw * v]; }
    G.part(c, [at(0, -1), at(0.38, -1.12), at(0.86, -0.78), at(1.02, 0), at(0.86, 0.78), at(0.38, 1.12), at(0, 1)], st, { lw: 0.8, pits: false, hatch: false, steps: 5 });
    G.cut(c, [at(0.34, -0.8), at(0.36, 0), at(0.34, 0.8)], st, 0.5); G.cut(c, [at(0.68, -0.6), at(0.7, 0), at(0.68, 0.6)], st, 0.45);
  }
  B.stryge = { stone: "lime", spout: false, perch: [144, 35], drip: [173, 125],
    draw: function (c, s) {
      var st = PARIS, p = pk(s), t = s.t, b = blink(t, 3), far = mix(st.base, st.dark, 0.4);
      var farSt = { base: far, light: mix(st.light, st.dark, 0.35), dark: mix(st.dark, st.ink, 0.25), ink: st.ink, pit: st.pit };
      haussmann(c, t);
      /* the balustrade he leans on; the coping throws soot-dark shade on the face below it */
      G.part(c, [[0, 150, 1], [200, 150, 1], [200, 162, 1], [0, 162, 1]], st, { lw: 1.4, seed: 2, hatchAng: 0.1 });
      G.part(c, [[0, 162, 1], [200, 162, 1], [200, 200, 1], [0, 200, 1]], st, { lw: 1.2, seed: 22, lift: 0.6, hatchAng: 1.5 });
      under(c, [[0, 150, 1], [200, 150, 1], [200, 162, 1], [0, 162, 1]], st, 0, 6, 0.35, [[0, 162, 1], [200, 162, 1], [200, 200, 1], [0, 200, 1]]);
      for (var i = 0; i < 5; i++) G.cut(c, [[12 + i * 44, 166], [12 + i * 44, 200]], st, 0.8);
      streak(c, 104, 162, 38, 8, st, 0.2); streak(c, 148, 162, 26, 5, st, 0.16);
      /* wings folded up his back: arm bone, three fingers, scalloped skin; they quiver now and then, and ruffle on a tap */
      var qv = (t % 5000) / 520, quiver = qv < 1 ? sin(PI * qv) * 0.05 * (0.65 + 0.35 * sin(t * 0.06)) : 0;
      var fl = clamp(p * 0.85 + 0.03 + sin(t * 0.0013) * 0.025 + quiver + p * 0.14 * sin(t * 0.03), 0, 1), W = Y_WING_F.map(function (q, k) { return [lerp(q[0], Y_WING_O[k][0], fl), lerp(q[1], Y_WING_O[k][1], fl)]; });
      var R0 = [62, 74];
      function scallop(a, bb, k) { var mx = (a[0] + bb[0]) / 2, my = (a[1] + bb[1]) / 2, dx = W[0][0] - mx, dy = W[0][1] - my, d = Math.hypot(dx, dy) || 1; return [mx + dx / d * k, my + dy / d * k]; }
      var s1 = scallop(W[1], W[2], 9), s2 = scallop(W[2], W[3], 9), s3 = scallop(W[3], R0, 7);
      var WING = [[R0[0], R0[1], 1], [lerp(R0[0], W[0][0], 0.5) + 3, lerp(R0[1], W[0][1], 0.5)], [W[0][0], W[0][1], 1], [W[1][0], W[1][1], 1], s1, [W[2][0], W[2][1], 1], s2, [W[3][0], W[3][1], 1], s3];
      G.part(c, WING, st, { lw: 1.1, seed: 31, base: mix(st.base, st.light, 0.3), hatchGap: 4.5, hatchAng: 1.2 });
      G.cut(c, [[R0[0], R0[1]], [lerp(R0[0], W[0][0], 0.5) + 2, lerp(R0[1], W[0][1], 0.5)], [W[0][0], W[0][1]]], st, 2);
      for (var f = 1; f < 4; f++) G.cut(c, [[W[0][0], W[0][1]], [lerp(W[0][0], W[f][0], 0.55) - 1, lerp(W[0][1], W[f][1], 0.55)], [W[f][0], W[f][1]]], st, 1.1);
      G.part(c, [[W[0][0] - 1, W[0][1] + 2], [W[0][0] + 3, W[0][1] - 6], [W[0][0] + 4, W[0][1] + 2]], st, { lw: 0.7, pits: false, hatch: false, base: st.dark });
      /* haunch, and the foot clutching the front of the coping */
      G.part(c, [[40, 118], [62, 112], [80, 122], [84, 140], [82, 150, 1], [54, 150, 1], [42, 140]], st, { lw: 1.1, round: 0.5, seed: 33, hatchAng: 1.0 });
      G.cut(c, [[46, 124], [60, 118], [74, 126]], st, 0.8, { glint: 1 });
      G.part(c, [[52, 146], [86, 144], [90, 152], [88, 156, 1], [50, 156, 1]], st, { lw: 1.1, pits: false, hatch: false });
      [58, 68, 78].forEach(function (x, k) { G.part(c, [[x - 3, 150], [x + 3, 150], [x + 4, 158], [x + 1, 162, 1], [x - 2, 157]], st, { lw: 0.8, pits: false, hatch: false, base: st.dark }); G.cut(c, [[x, 150], [x + 0.5, 156]], st, 0.5); });
      /* torso: gaunt, hunched forward; scapula, ribs on the shadow flank, a spine ridge of vertebrae. It breathes: the chest swells a hair and the shoulder rides up with it */
      var sh = sin(t * 0.0008) * 0.9, br = sin(t * 0.0009) * 0.012;
      c.save(); c.translate(70, 136); c.scale(1, 1 + br); c.translate(-70, -136);
      under(c, Y_TORSO, st, 4, 3, 0.2, [[40, 112], [90, 106], [90, 150], [40, 150]]);
      G.part(c, Y_TORSO, st, { lw: 1.2, round: 0.5, seed: 34, hatchAng: 0.6 });
      /* soot where the haunch and the wing root crowd the torso, and old grey-black blotches on the shaded flank */
      under(c, [[40, 118], [62, 112], [80, 122], [84, 134], [54, 134]], st, 3, 6, 0.27, Y_TORSO);
      under(c, [[54, 66], [64, 64], [70, 76], [64, 90], [56, 84]], st, 3, 3, 0.3, Y_TORSO);
      mottle(c, Y_TORSO, 88, 106, 7, 5, 0.34); mottle(c, Y_TORSO, 74, 96, 5, 6, 0.3); mottle(c, Y_TORSO, 62, 126, 6, 7, 0.28);
      [[74, 104, 82, 110, 86, 120], [68, 110, 78, 118, 80, 129], [62, 116, 72, 124, 72, 134]].forEach(function (r) { G.cut(c, [[r[0], r[1]], [r[2], r[3]], [r[4], r[5]]], st, 0.8); });
      G.cut(c, [[56, 100], [64, 112], [62, 124]], st, 0.7, { glint: 1 });
      G.cut(c, [[62, 72], [55, 86], [51, 103], [50, 121]], st, 1.1);
      [[60, 68, 3.8], [54, 80, 3.8], [50, 92, 3.8], [48, 105, 3.6], [47, 118, 3.4]].forEach(function (n, k) { nub(c, n[0], n[1], PI + 0.9 - k * 0.12, n[2], st); });
      streak(c, 58, 78, 30, 7, st, 0.26, Y_TORSO);
      /* the shoulder mass over the torso, drifting a little as he breathes */
      c.save(); c.translate(sh * 0.4, sh);
      G.part(c, [[56, 82], [68, 66], [84, 62], [98, 70], [102, 80], [92, 84], [78, 80], [64, 90]], st, { lw: 1.1, round: 0.7, seed: 41, hatchAng: 0.4 });
      G.cut(c, [[66, 72], [78, 76], [92, 84]], st, 0.9, { glint: 1 }); G.cut(c, [[88, 82], [84, 94]], st, 0.7);
      c.restore();
      c.restore();
      /* the gaunt neck, tendons standing */
      G.part(c, [[90, 72], [104, 74], [116, 82], [120, 96], [114, 108], [100, 104], [92, 90]], st, { lw: 1.1, round: 0.4, seed: 46, hatchAng: 1.0 });
      G.cut(c, [[100, 80], [106, 92], [108, 104]], st, 0.8, { glint: 1 }); G.cut(c, [[108, 80], [112, 92]], st, 0.7);
      /* far arm, darker, behind: the same two parts a little back, the elbow planted on the rail */
      var fa = function (q) { return [q[0] - 5, q[1] + 1, q[2]]; };
      G.part(c, Y_UARM.map(fa), farSt, { lw: 1, hatchAng: 1.4, round: 0.4, seed: 47 });
      G.part(c, Y_FARM.map(function (q) { return [q[0] - 5, q[1] - 1]; }), farSt, { lw: 1, hatchAng: 1.2, pits: false });
      G.part(c, [[109, 124], [111, 115], [117, 112], [125, 113], [127, 120], [121, 128]], farSt, { lw: 1, pits: false, hatch: false });
      G.cut(c, [[117, 114], [119, 122]], farSt, 0.6);
      /* the head, long and bony, on its hands: it rocks a little, and on a tap it jerks up off the hand */
      var tilt = sin(t * 0.0006) * 0.02 - p * 0.15, lift = p * 9;
      /* a horn: a stout cone with its tip worn flat, three rings cut round it, leaning forward */
      function horn(x, y, lean, st2, seed) {
        c.save(); c.translate(x, y); c.rotate(lean);
        G.part(c, [[-4.5, 4, 1], [-4.1, -6], [-2.8, -16], [-1.3, -25, 1], [1.5, -25.6, 1], [2.9, -16], [4.1, -6], [4.5, 4, 1]], st2, { lw: 1, seed: seed, hatchAng: 2.0, steps: 4 });
        [[-6, 4.1], [-13, 3.4], [-20, 2.5]].forEach(function (rg) { G.cut(c, [[-rg[1], rg[0]], [0, rg[0] + 1.3], [rg[1], rg[0]]], st2, 0.6); });
        c.restore();
      }
      rot(c, 136, 114, tilt, function () {
        c.save(); c.translate(0, -lift);
        /* the far horn peeks past the skull */
        horn(128, 62, 0.15, farSt, 42);
        streak(c, 108, 84, 22, 6, st, 0.3);
        /* the skull: a broad flat face, the brow standing out over the eye, a short upturned nose, a heavy lip, a goat-beard chin */
        G.part(c, [[112, 86], [118, 68], [132, 58], [148, 58], [158, 64], [162, 74], [160, 82], [163, 89], [163, 95, 1], [159, 99], [163, 103], [166, 108], [166, 114, 1], [158, 115], [158, 128], [152, 138, 1], [146, 124], [136, 118], [122, 108]], st, { lw: 1.2, round: 0.5, seed: 38, hatchAng: 0.5 });
        /* the comb of small ridges along the crown of the brow, running forward from the horns */
        for (var k = 0; k < 5; k++) nub(c, 137 + k * 4.2, 59.4 + (k > 2 ? (k - 2) * 1.4 : 0), -PI / 2 + 0.5 + (k % 2) * 0.12, 3, st);
        /* the near horn, beside the far one */
        horn(140, 61, 0.15, st, 39);
        /* the heavy brow, the eye in a dark socket looking sidelong, a hollow cheek */
        G.hollow(c, [[145, 82], [152, 81], [157, 85.5], [152, 89], [146, 88]], st, { deep: 0.5, lw: 0.6 });
        G.part(c, [[134, 73, 1], [146, 69], [156, 70.5], [162, 76, 1], [162.5, 84, 1], [153, 80.5], [141, 79.5], [135, 76]], st, { lw: 1.1, pits: false, hatch: false });
        G.cut(c, [[137, 75.5], [147, 73], [157, 74.5], [160.5, 79]], st, 0.9, { glint: 1 });
        G.cut(c, [[138, 65.5], [146, 64], [155, 66.5]], st, 0.6);
        var eyeLook = s.look || (p > 0.1 ? [0.4 + p * 0.1, 0.2 + p * 0.8] : [0.7, 0.3]);
        G.eye(c, 150.5, 85, 3.3, st, { blink: b, look: eyeLook, squint: s.look ? 0.55 : 0.8 - p * 0.6, tilt: 0.14 });
        G.cut(c, [[143, 93], [150, 94.5], [157, 97.5]], st, 0.8, { glint: 1 }); G.cut(c, [[147, 101], [152, 99.5], [155, 104]], st, 0.8);
        G.cut(c, [[158, 87], [162, 91], [163, 94.5]], st, 0.8);               /* the nose */
        G.hollow(c, [[158, 92.5], [162, 92], [163, 95.5], [159.5, 96.5]], st, { deep: 0.9, lw: 0.5 });
        G.cut(c, [[134, 81], [138, 91]], st, 0.6);
        /* the round human ear, a half-ellipse with its rim, flicking every couple of seconds */
        var ef = ((t + 1500) % 2400) / 240, flick = ef < 1 ? sin(PI * ef) * 0.2 : 0;
        rot(c, 125, 90, flick - p * 0.12, function () {
          G.part(c, [[126, 85, 1], [120, 85.5], [115.5, 91], [116.5, 97], [121, 100.5], [126, 99, 1]], st, { lw: 1, seed: 43, hatchAng: 1.5, hatchGap: 3, round: 0.5 });
          G.hollow(c, [[122.5, 88.5], [119.5, 92], [120.5, 96.5], [124, 96.8]], st, { deep: 0.7, lw: 0.6 });
          G.cut(c, [[118, 95], [120.5, 99.5]], st, 0.5);
        });
        /* the long grin, one corner turned up, four teeth */
        G.hollow(c, [[140, 100], [148, 104.5], [156, 107], [165, 108], [164, 112], [154, 112], [146, 109]], st, { deep: 0.95, lw: 0.7 });
        G.cut(c, [[165, 108], [154, 107.5], [146, 105], [140.5, 99.5]], st, 1.2);
        G.teeth(c, [[146, 105], [154, 107.5], [163, 108]], 4, 4, 1, st, { fangs: [3] });
        /* the thick lower lip, pushed out like a pad, with the fold under it */
        G.part(c, [[154, 110.5], [162, 109.5], [168, 111.5], [168.5, 115.5], [162, 118], [154, 116.5]], st, { lw: 0.9, round: 0.5, pits: false, hatch: false });
        G.cut(c, [[156, 119.5], [163, 120]], st, 0.6); G.cut(c, [[159, 113], [164, 112.8]], st, 0.5, { glint: 1 });
        G.cut(c, [[157, 124], [154, 133]], st, 0.6); G.cut(c, [[153, 122], [150, 130]], st, 0.5);
        /* the tongue: thick, pointed, curling at the tip; it wags, and on a tap it flicks out long and wide */
        var wag = sin(t * 0.0042 + p * s.poke * 0.012) * (3 + p * 11), ext = 1 + p * 0.85;
        var tp = [[161, 109.5], [169, 111.5], [173 + wag * 0.4, 110 + 7 * ext], [173 + wag, 110 + 15 * ext]];
        tube(c, [tp[0], tp[1], tp[2], tp[3], [tp[3][0] - 3 - wag * 0.2, tp[3][1] + 3.5 * ext]], 7, 2, st, { lw: 0.9, base: mix(st.base, "#b0786f", 0.38), hatch: false, lift: 0.5 });
        G.cut(c, [[tp[0][0] + 4, tp[0][1] + 1.5], [tp[2][0], tp[2][1]], [tp[3][0] - 0.5, tp[3][1] - 1]], st, 0.5);
        c.restore();
      });
      /* near arm, last: the elbow on the rail, the forearm rising to an open hand laid on the cheek */
      under(c, [[104, 100], [112, 100], [126, 146], [112, 150]], st, 3, 2, 0.2, Y_TORSO);
      G.part(c, Y_UARM, st, { lw: 1.1, hatchAng: 1.4, round: 0.5, seed: 48 });
      G.cut(c, [[98, 96], [104, 108], [108, 124], [112, 140]], st, 0.8, { glint: 1 });
      G.cut(c, [[103, 90], [108, 100]], st, 0.6); G.cut(c, [[108, 147], [113, 148.5], [117, 145]], st, 0.7);
      under(c, [[104, 100], [112, 100], [118, 130], [108, 130]], st, 3, 2, 0.28, Y_UARM);
      G.part(c, Y_FARM, st, { lw: 1.1, hatchAng: 1.2, round: 0.4, seed: 49 });
      G.cut(c, [[112.5, 141], [118, 134.5], [124, 128]], st, 0.7); G.cut(c, [[119, 146], [124.5, 139], [129.5, 131.5]], st, 0.7, { glint: 1 });
      /* the open hand: four separate fingers laid up the cheekbone, the thumb under the chin, the palm on the jaw */
      [[144.5, 107.5, -0.95, 12.5], [140, 105.5, -1.1, 13], [135.5, 105.5, -1.25, 13], [131.5, 107, -1.42, 12]].forEach(function (fg) { finger(c, fg[0], fg[1], fg[2], fg[3], 3.5, st); });
      G.part(c, [[122, 121], [124, 112], [131, 106.5], [140, 105], [146, 109], [146.5, 117], [142, 124.5], [134, 129], [126, 128]], st, { lw: 1.1, round: 0.6, seed: 45, hatchAng: 1.1 });
      G.cut(c, [[130, 108.5], [136, 107], [142, 107.5]], st, 0.6); G.cut(c, [[128, 118], [134, 120], [140, 118]], st, 0.7);
      G.part(c, Y_THUMB, st, { lw: 0.9, round: 0.5, pits: false, hatch: false });
      G.cut(c, [[136, 128], [141, 128.5]], st, 0.5);
      under(c, Y_CHIN.map(function (q) { return [q[0], q[1] - lift]; }), st, 1, 5, 0.32, Y_THUMB);
    } };

  /* a palmette: seven petals fanned from a base, each with its midrib */
  function palmette(c, x, y, r, st) {
    if (G.sil) return;
    c.save(); c.translate(x, y); c.lineJoin = "round";
    for (var i = 0; i < 7; i++) {
      var a = -PI / 2 + (i - 3) * 0.4, L = r * (1 - 0.1 * Math.abs(i - 3)), w = r * 0.16, ca = cos(a), sa = sin(a);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(ca * L * 0.5 - sa * w, sa * L * 0.5 + ca * w, ca * L, sa * L); c.quadraticCurveTo(ca * L * 0.5 + sa * w, sa * L * 0.5 - ca * w, 0, 0); c.closePath();
      c.fillStyle = i % 2 ? st.light : mix(st.light, st.base, 0.5); c.fill(); c.strokeStyle = rgba(st.ink, 0.75); c.lineWidth = 0.8; c.stroke();
      c.strokeStyle = rgba(st.ink, 0.4); c.lineWidth = 0.5; c.beginPath(); c.moveTo(ca * L * 0.15, sa * L * 0.15); c.lineTo(ca * L * 0.8, sa * L * 0.8); c.stroke();
    }
    c.fillStyle = st.base; c.beginPath(); c.moveTo(-r * 0.2, 1); c.quadraticCurveTo(0, -r * 0.3, r * 0.2, 1); c.closePath(); c.fill(); c.strokeStyle = rgba(st.ink, 0.8); c.lineWidth = 0.8; c.stroke();
    c.restore();
  }
  /* a lotus bud: a tall centre petal, two side petals, sepals */
  function lotus(c, x, y, h, st) {
    if (G.sil) return;
    c.save(); c.translate(x, y); c.lineJoin = "round";
    [[0, 1, 0.2], [-0.5, 0.74, 0.17], [0.5, 0.74, 0.17], [-1.05, 0.4, 0.13], [1.05, 0.4, 0.13]].forEach(function (pt, k) {
      var a = -PI / 2 + pt[0], L = h * pt[1], w = h * pt[2], ca = cos(a), sa = sin(a);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(ca * L * 0.45 - sa * w, sa * L * 0.45 + ca * w, ca * L, sa * L); c.quadraticCurveTo(ca * L * 0.45 + sa * w, sa * L * 0.45 - ca * w, 0, 0); c.closePath();
      c.fillStyle = k === 0 ? st.light : mix(st.light, st.base, 0.55); c.fill(); c.strokeStyle = rgba(st.ink, 0.75); c.lineWidth = 0.8; c.stroke();
    });
    c.restore();
  }
  /* a scroll tendril: a long S that ends in a curl at each end */
  function tendril(c, x0, x1, y, st) {
    if (G.sil) return;
    var mid = (x0 + x1) / 2, d = x1 > x0 ? 1 : -1;
    c.save(); c.strokeStyle = rgba(st.ink, 0.7); c.lineWidth = 0.8; c.lineCap = "round";
    c.beginPath(); c.moveTo(x0, y - 3); c.bezierCurveTo(x0 + d * 8, y - 14, mid - d * 2, y + 2, mid, y - 7); c.bezierCurveTo(mid + d * 4, y - 15, x1 - d * 8, y - 2, x1, y - 6); c.stroke();
    [[x0 + d * 5, y - 10, d], [x1 - d * 5, y - 8, -d]].forEach(function (q) { c.beginPath(); for (var i = 0; i < 14; i++) { var r = 3.4 * (1 - i / 16), a = i * 0.55 * q[2] + 1; c.lineTo(q[0] + cos(a) * r * q[2], q[1] + sin(a) * r); } c.stroke(); });
    c.restore();
  }
  /* a row of egg-and-dart along a moulding */
  function eggdart(c, y, h, st) {
    if (G.sil) return;
    c.save(); c.lineJoin = "round";
    var n = 12, step = 200 / n;
    for (var i = 0; i < n; i++) {
      var x = i * step + step / 2;
      c.beginPath(); c.moveTo(x, y + h); c.bezierCurveTo(x - step * 0.42, y + h * 0.7, x - step * 0.34, y, x, y); c.bezierCurveTo(x + step * 0.34, y, x + step * 0.42, y + h * 0.7, x, y + h); c.closePath();
      var g = c.createLinearGradient(x - step * 0.3, y, x + step * 0.3, y + h); g.addColorStop(0, st.light); g.addColorStop(1, mix(st.base, st.dark, 0.3));
      c.fillStyle = g; c.fill(); c.strokeStyle = rgba(st.ink, 0.75); c.lineWidth = 0.7; c.stroke();
      c.fillStyle = rgba(st.ink, 0.6); c.beginPath(); c.moveTo(x + step / 2 - 2, y + 2); c.lineTo(x + step / 2, y + h * 0.9); c.lineTo(x + step / 2 + 2, y + 2); c.closePath(); c.fill();
    }
    c.restore();
  }

  /* a rounded comma curl of a mane, rooted at x,y and growing out along ang, turning by curl radians: the carved lock with two incised lines along it and a small spiral cut at its tip */
  function curl(c, x, y, ang, len, wid, cu, st) {
    var m = 9, mid = [], i, u, a, w;
    for (i = 0; i <= m; i++) { u = i / m; a = ang + cu * u * u; mid.push([x + cos(ang) * len * u * 0.65 + cos(a) * len * u * 0.35, y + sin(ang) * len * u * 0.65 + sin(a) * len * u * 0.35, a]); }
    G.lock(c, x, y, ang, len, wid, cu, st, { lw: 0.9 });
    if (G.sil) return;
    [-0.38, 0.38].forEach(function (sd) {
      var pts = [0.14, 0.38, 0.62].map(function (uu) {
        var k = Math.round(uu * m), q = mid[k], q0 = mid[Math.max(k - 1, 0)], q1 = mid[Math.min(k + 1, m)], dx = q1[0] - q0[0], dy = q1[1] - q0[1], d = Math.hypot(dx, dy) || 1;
        w = sin(PI * Math.pow(uu, 0.7)) * wid * (1 - uu * 0.6) * sd;
        return [q[0] - dy / d * w, q[1] + dx / d * w];
      });
      G.cut(c, pts, st, 0.5);
    });
    var e = mid[m], f = mid[m - 1], dx2 = e[0] - f[0], dy2 = e[1] - f[1], d2 = Math.hypot(dx2, dy2) || 1, sg = cu > 0 ? 1 : -1, cx = e[0] - dx2 / d2 * wid * 0.25 - dy2 / d2 * sg * wid * 0.3, cy = e[1] - dy2 / d2 * wid * 0.25 + dx2 / d2 * sg * wid * 0.3;
    G.cut(c, [0, 1, 2, 3, 4].map(function (k) { var an = a0(k); return [cx + cos(an) * wid * 0.34 * (1 - k * 0.16), cy + sin(an) * wid * 0.34 * (1 - k * 0.16)]; }), st, 0.45);
    function a0(k) { return Math.atan2(dy2, dx2) + sg * (k * 1.3 - 1.2); }
  }

  /* ---------------------------------------------------------------- Greek lion-head spout (front view) */
  var GL_PANEL = [[0, 14], [200, 14], [200, 178], [0, 178]];
  B.lionGreek = { stone: "marble", spout: true, front: true, mouth: [100, 140, 0, 0.35],
    draw: function (c, s) {
      var st = S.marble, p = pk(s), t = s.t, rain = s.rain || 0, dj = p * 10, ink = st.ink;
      /* the sima: a gutter rim along the roof edge: a cymatium of egg-and-dart above, a recessed band of palmettes and lotus buds below */
      G.part(c, [[0, 14, 1], [200, 14, 1], [200, 178, 1], [0, 178, 1]], st, { lw: 1.3, seed: 41, lift: 0.7, hatch: false });
      G.part(c, [[0, 8, 1], [200, 8, 1], [200, 18, 1], [0, 18, 1]], st, { lw: 1.2, seed: 42, hatch: false });
      G.part(c, [[0, 18, 1], [200, 18, 1], [200, 46, 1], [0, 46, 1]], st, { lw: 1.1, seed: 47, lift: 0.9, hatchGap: 4 });
      eggdart(c, 22, 18, st);
      G.cut(c, [[1, 47], [199, 47]], st, 1, { glint: 1 });
      G.hollow(c, [[5, 140, 1], [195, 140, 1], [195, 172, 1], [5, 172, 1]], st, { deep: 0.07, lw: 0.6 });
      G.cut(c, [[2, 175], [198, 175]], st, 1, { glint: 1 });
      /* the pattern runs the whole width and the lion sits in front of it */
      palmette(c, 18, 170, 26, st); lotus(c, 42, 170, 22, st); palmette(c, 66, 170, 24, st);
      palmette(c, 182, 170, 26, st); lotus(c, 158, 170, 22, st); palmette(c, 134, 170, 24, st);
      tendril(c, 26, 38, 168, st); tendril(c, 46, 62, 168, st); tendril(c, 174, 162, 168, st); tendril(c, 154, 138, 168, st);
      /* marble veins, an iron stain, the long grey stain under the mouth */
      G.cut(c, [[8, 60], [30, 70], [44, 66], [60, 82]], st, 0.6, { col: rgba(st.dark, 0.45) }); G.cut(c, [[196, 90], [176, 100], [182, 118], [166, 130]], st, 0.6, { col: rgba(st.dark, 0.4) }); G.cut(c, [[150, 52], [168, 60], [186, 56]], st, 0.5, { col: rgba(st.dark, 0.35) });
      streak(c, 152, 100, 60, 7, { ink: "#9a5a30" }, 0.2, GL_PANEL); streak(c, 100, 140, 36, 16, st, 0.26, GL_PANEL);
      /* mane: two rings of rounded comma curls, each ending in a spiral, the rings curling opposite ways; each its own length and curl, swaying out of step; a tap ruffles them */
      var r1 = G.rng(77), sw = function (i, k) { return sin(t * 0.0033 + i * 1.7 + k) * 0.08 + p * 0.2 * sin(t * 0.011 + i * 0.9 + k); };
      var i, a;
      /* the mass of the mane under the curls, scalloped at its edge, so the gaps between them are shadow and not bare marble */
      var mass = []; for (i = 0; i < 28; i++) { a = i / 28 * PI * 2; var mr = 44 + (i % 2 ? 4.5 : 0); mass.push([100 + cos(a) * mr * 0.98, 98 + sin(a) * mr * 1.04]); }
      G.part(c, mass, st, { lw: 1, base: mix(st.base, st.dark, 0.28), lift: 0.5, pits: false, hatch: false, seed: 91 });
      /* outer ring: fourteen big curls rooted behind the face's edge, reaching out to about radius 60 to 66, curling one way */
      for (i = 0; i < 14; i++) {
        a = -PI / 2 + (i + (r1() - 0.5) * 0.2) / 14 * PI * 2;
        curl(c, 100 + cos(a) * 31 * 0.96, 98 + sin(a) * 31 * 1.04, a + 0.05 + sw(i, 0), 31 + r1() * 4, 9, (2 + (r1() - 0.5) * 0.4) * (1 + p * 0.12 * sin(t * 0.011 + i)), st);
      }
      /* inner ring: ten smaller curls between the outer ones and the face, curling the other way */
      for (i = 0; i < 10; i++) {
        a = -PI / 2 + (i + 0.5 + (r1() - 0.5) * 0.2) / 10 * PI * 2;
        curl(c, 100 + cos(a) * 24 * 0.96, 98 + sin(a) * 24 * 1.04, a - 0.05 + sw(i, 2), 24 + r1() * 3, 7.5, -(2 + (r1() - 0.5) * 0.4) * (1 + p * 0.12 * sin(t * 0.011 + i)), st);
      }
      /* ears, rounded */
      [[-1, 0], [1, 0]].forEach(function (d) {
        var x = 100 + d[0] * 30;
        G.part(c, [[x - d[0] * 2, 76], [x + d[0] * 6, 66], [x + d[0] * 4, 55], [x - d[0] * 6, 55], [x - d[0] * 12, 63]], st, { lw: 1.1, seed: 48 + d[0], hatch: false });
        G.hollow(c, [[x - d[0] * 2, 68], [x + d[0] * 1, 63], [x - d[0] * 5, 61]], st, { deep: 0.5, lw: 0.5 });
      });
      /* face: broad, with cheekbones; muzzle and chin below */
      G.part(c, [[100, 62], [118, 66], [131, 80], [134, 100], [129, 118], [118, 128], [100, 130], [82, 128], [71, 118], [66, 100], [69, 80], [82, 66]], st, { lw: 1.6, round: 0.9, seed: 43, hatch: false });
      G.cut(c, [[72, 94], [76, 108], [84, 118]], st, 0.8, { glint: 1 }); G.cut(c, [[128, 94], [124, 108], [116, 118]], st, 0.8);
      /* heavy W brow, furrows between the eyes, sunk eyes */
      var bd = p * 3, U = [[69, 89 + bd], [84, 77 + bd], [96, 85 + bd], [100, 80 + bd], [104, 85 + bd], [116, 77 + bd], [131, 89 + bd]];
      G.part(c, U.map(function (q, k) { return [q[0], q[1], k === 0 || k === 6 ? 1 : 0]; }).concat(U.slice().reverse().map(function (q, k) { return [q[0] + (k === 0 ? -2 : k === 6 ? 2 : 0), q[1] + 5, k === 0 || k === 6 ? 1 : 0]; })), st, { lw: 1.2, pits: false, hatch: false, round: 0.3 });
      G.cut(c, U.map(function (q) { return [q[0], q[1] + 1]; }), st, 1.3, { glint: 1 });
      G.cut(c, [[97, 68], [98.5, 76], [97, 83]], st, 0.8); G.cut(c, [[103, 68], [101.5, 76], [103, 83]], st, 0.8);
      G.hollow(c, [[78, 93 + bd], [86, 90 + bd], [94, 93 + bd], [86, 99 + bd]], st, { deep: 0.5, lw: 0.5 }); G.hollow(c, [[122, 93 + bd], [114, 90 + bd], [106, 93 + bd], [114, 99 + bd]], st, { deep: 0.5, lw: 0.5 });
      var b = Math.max(blink(t, 5), p * 0.6);
      G.eye(c, 86, 95 + bd, 3.5, st, { blink: b, look: [0.2, 0.2], squint: 0.6 }); G.eye(c, 114, 95 + bd, 3.5, st, { blink: b, look: [-0.2, 0.2], squint: 0.6, tilt: PI });
      /* a broad flat nose bridge, wide comma nostrils, the nasolabial folds that make the snarl */
      G.part(c, [[93, 88], [107, 88], [111, 102], [106, 108], [100, 110], [94, 108], [89, 102]], st, { lw: 1.1, round: 0.8, seed: 44, hatch: false });
      G.hollow(c, [[91, 103], [96, 104], [96, 108], [93, 108.5]], st, {}); G.hollow(c, [[109, 103], [104, 104], [104, 108], [107, 108.5]], st, {});
      G.cut(c, [[89, 104], [82, 112], [80, 124]], st, 2, { glint: 1 }); G.cut(c, [[111, 104], [118, 112], [120, 124]], st, 2);
      /* the upper lip: two pads split by a philtrum */
      G.part(c, [[82, 116], [92, 109], [100, 115], [100, 124], [88, 124]], st, { lw: 1.1, round: 0.6, seed: 45, hatch: false }); G.part(c, [[118, 116], [108, 109], [100, 115], [100, 124], [112, 124]], st, { lw: 1.1, round: 0.6, seed: 46, hatch: false });
      G.cut(c, [[100, 110], [100, 122]], st, 0.8);
      for (var w = 0; w < 3; w++) { G.dot(c, 86 + w * 3, 117 + w, 0.8, st.dark); G.dot(c, 114 - w * 3, 117 + w, 0.8, st.dark); }
      /* the open mouth is the spout: the jaw drops on a tap, the lower points move down and nothing else */
      pool(c, [[84, 124], [100, 120], [116, 124], [114, 134 + dj], [100, 139 + dj], [86, 134 + dj]], st, { deep: 1 });
      G.part(c, [[92, 131 + dj * 0.7], [100, 129 + dj * 0.7], [108, 131 + dj * 0.7], [106, 137 + dj * 0.9], [100, 139 + dj * 0.9], [94, 137 + dj * 0.9]], st, { lw: 0.8, pits: false, hatch: false, base: mix(st.base, "#c58a82", 0.45) });
      G.cut(c, [[100, 131 + dj * 0.7], [100, 138 + dj * 0.9]], st, 0.5);
      G.teeth(c, [[90, 125], [100, 122.5], [110, 125]], 4, 3, 1, st, { fangs: [0, 3] });
      G.teeth(c, [[91, 134.5 + dj], [100, 136.5 + dj], [109, 134.5 + dj]], 2, 3.4, -1, st, { fangs: [0, 1] });
      G.part(c, [[86, 133 + dj], [100, 137 + dj], [114, 133 + dj], [110, 146 + dj], [100, 150 + dj], [90, 146 + dj]], st, { lw: 1.1, round: 0.5, seed: 49, hatch: false });
      G.cut(c, [[93, 144 + dj], [100, 146 + dj], [107, 144 + dj]], st, 0.6);
      /* the water: a thin string leaves the lip even at rest, with beads running down it, ending in the drip; it thickens and lengthens in rain */
      var tl = 8 + rain * 20 + sin(t * 0.004) * 1.5, ty0 = 148 + dj, tw = 1.5 + rain * 1.6;
      if (!G.sil) {
        c.save(); c.lineCap = "round";
        c.strokeStyle = "rgba(124,172,226,.82)"; c.lineWidth = tw; c.beginPath(); c.moveTo(100, ty0 - 1); c.quadraticCurveTo(100 + sin(t * 0.006) * 0.8, ty0 + tl * 0.5, 100 + sin(t * 0.008) * 0.6, ty0 + tl); c.stroke();
        c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = tw * 0.32; c.beginPath(); c.moveTo(99.5 - tw * 0.15, ty0); c.lineTo(99.5 - tw * 0.15, ty0 + tl * 0.9); c.stroke();
        c.fillStyle = "rgba(220,238,255,.9)";
        for (var bd = 0; bd < 3; bd++) { var bu = ((t * 0.0016 + bd / 3) % 1); c.beginPath(); c.arc(100 + sin(bu * 6 + bd) * 0.3, ty0 + bu * tl, tw * 0.42, 0, 7); c.fill(); }
        c.restore();
      }
      drip(c, 100, ty0 + tl, t, 2200, 500, 22, 2.2);
      gecko(c, 12, 188, 8.5, t, 11000, 3000, 0.75, "#7e8a5c");
    } };

  /* sunk hieroglyphs: a dark incised line with the lit lower lip beside it */
  function sunk(c, st, fn) {
    if (G.sil) return;
    c.save(); c.lineCap = "round"; c.lineJoin = "round";
    c.translate(0.8, 0.9); c.strokeStyle = rgba(st.light, 0.85); c.lineWidth = 1.1; fn(); c.translate(-0.8, -0.9);
    c.strokeStyle = rgba(st.ink, 0.85); c.lineWidth = 1.1; fn(); c.restore();
  }
  /* the four signs on the plinth under the mouth: ankh, was sceptre, eye, water */
  function glyphs(c, st, x, y) {
    sunk(c, st, function () {
      c.beginPath(); c.moveTo(x, y + 2); c.bezierCurveTo(x - 5, y + 2, x - 5, y - 8, x, y - 8); c.bezierCurveTo(x + 5, y - 8, x + 5, y + 2, x, y + 2); c.moveTo(x, y + 2); c.lineTo(x, y + 14); c.moveTo(x - 5, y + 6); c.lineTo(x + 5, y + 6); c.stroke();
      var u = x + 24;
      c.beginPath(); c.moveTo(u, y + 14); c.lineTo(u, y - 6); c.moveTo(u - 3, y + 14); c.lineTo(u, y + 10); c.lineTo(u + 3, y + 14); c.moveTo(u, y - 6); c.lineTo(u + 5, y - 9); c.lineTo(u + 4, y - 4); c.closePath(); c.stroke();
      var e = x + 48;
      c.beginPath(); c.moveTo(e - 8, y + 3); c.quadraticCurveTo(e, y - 6, e + 8, y + 3); c.quadraticCurveTo(e, y + 9, e - 8, y + 3); c.moveTo(e + 1.4, y + 2); c.arc(e, y + 2, 1.4, 0, 7); c.moveTo(e - 3, y + 8); c.lineTo(e - 5, y + 13); c.moveTo(e + 4, y + 8); c.quadraticCurveTo(e + 9, y + 12, e + 6, y + 15); c.stroke();
      var w = x + 72;
      for (var k = 0; k < 3; k++) { c.beginPath(); c.moveTo(w - 8, y - 4 + k * 6); c.lineTo(w - 4, y - 7 + k * 6); c.lineTo(w, y - 4 + k * 6); c.lineTo(w + 4, y - 7 + k * 6); c.lineTo(w + 8, y - 4 + k * 6); c.stroke(); }
    });
  }
  /* soft pale salt bloom on sandstone */
  function bloom(c, x, y, r, a) {
    if (G.sil) return;
    var g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(255,250,235," + a + ")"); g.addColorStop(1, "rgba(255,250,235,0)");
    c.save(); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  }
  /* claws peeking past the toes */
  function claws(c, xs, y, st, sc) {
    if (G.sil) return;
    xs.forEach(function (x) { c.beginPath(); c.moveTo(x - 1.8 * sc, y); c.quadraticCurveTo(x + 0.5 * sc, y + 1.2 * sc, x + 2.4 * sc, y + 5.5 * sc); c.quadraticCurveTo(x + 2.8 * sc, y + 1.4 * sc, x + 2 * sc, y - 0.6 * sc); c.closePath(); c.fillStyle = st.dark; c.fill(); c.strokeStyle = st.ink; c.lineWidth = 0.6; c.stroke(); });
  }

  /* ---------------------------------------------------------------- Dendera lion spout */
  /* the skull in profile, clockwise from the nape: a round crown, a brow bump, the stop, a near-flat bridge, the nose pad, the upper lip drooping over the jaw into a jowl */
  var E_UP = [[99, 62], [102, 52], [108, 50], [120, 44], [134, 47], [145, 57], [152, 66], [166, 68], [180, 69], [190, 71, 1], [192, 79], [191, 87], [188, 93], [182, 99], [166, 101], [150, 103], [140, 103], [130, 102], [124, 110], [112, 113], [102, 105], [98, 84]];
  var E_PLINTH = [[44, 150, 1], [172, 150, 1], [172, 178, 1], [44, 178, 1]];
  B.lionEgypt = { stone: "sand", spout: true, mouth: [169, 108, 1, 0.12],
    draw: function (c, s) {
      var st = S.sand, p = pk(s), t = s.t, yaw = p * 0.46, r2 = G.rng(5);
      var sw = function (k, amp) { return sin(t * 0.0021 + k * 1.9) * amp + p * 0.15 * sin(t * 0.012 + k * 1.1); };
      /* the wall, and the cornice above it: a cavetto flaring out to the roof edge, over a torus roll */
      G.ashlar(c, 0, 0, 46, 200, st, { course: 26, seed: 11 });
      G.cut(c, [[45, 46], [45, 200]], st, 1.4, { glint: 1 });
      G.part(c, [[0, 0, 1], [74, 0, 1], [70, 7], [62, 16], [54, 23], [52, 27], [55, 31], [50, 34, 1], [46, 37, 1], [0, 37, 1]], st, { lw: 1.5, seed: 50, hatch: false });
      G.cut(c, [[4, 5], [70, 5], [64, 13], [55, 21]], st, 0.9, { glint: 1 });
      G.cut(c, [[48, 28], [56, 31], [49, 35]], st, 0.9); G.cut(c, [[48, 36], [6, 36.5]], st, 0.7);
      /* the plinth the forepaws lie on, with the sunk signs the water runs over */
      G.part(c, E_PLINTH, st, { lw: 1.4, seed: 51, hatchAng: 0.1, hatchGap: 4 });
      G.cut(c, [[46, 157], [172, 157]], st, 0.8, { glint: 1 });
      glyphs(c, st, 70, 164);
      streak(c, 164, 150, 28, 22, st, 0.3, E_PLINTH); streak(c, 148, 150, 28, 8, st, 0.18, E_PLINTH);
      bloom(c, 100, 168, 20, 0.35); bloom(c, 56, 160, 14, 0.3);
      /* the shoulders, rising out of the wall; sandstone bedding runs level across them */
      var BODY = [[44, 34], [90, 36], [98, 70], [98, 108], [112, 130], [124, 148], [124, 150, 1], [44, 150, 1]];
      G.part(c, BODY, st, { lw: 1.4, seed: 52, hatchAng: 0.2, hatchGap: 3.6 });
      [[46, 78, 94, 76], [46, 104, 98, 102], [48, 128, 112, 127]].forEach(function (r) { G.cut(c, [[r[0], r[1]], [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2 + 0.8], [r[2], r[3]]], st, 0.6, { col: rgba(st.ink, 0.45) }); });
      bloom(c, 70, 90, 16, 0.3);
      /* the mane behind the face sits a shade deeper than the face: two stepped tiers of incised flame locks over neck, shoulders and chest */
      var i, mn = { base: mix(st.base, st.dark, 0.2), light: mix(st.light, st.dark, 0.12), dark: st.dark, ink: st.ink, pit: st.pit };
      /* tier one: six locks high on the nape, fewer and uneven; tier two: seven long locks across the neck */
      for (i = 0; i < 6; i++) flame(c, 56 + i * 8.4, 48 + (i % 2) * 5, PI / 2 + 0.08 + sw(i, 0.05), 28 + r2() * 10, 9, (i % 3 === 1 ? -1 : 1) * (0.35 + r2() * 0.3), i * 0.9, mn, { grooves: 1 });
      for (i = 0; i < 7; i++) flame(c, 52 + i * 7.6, 74 + (i % 2) * 3, PI / 2 + 0.12 + sw(i + 7, 0.05), 50 + r2() * 6, 9.4, (i % 2 ? 1 : -1) * 0.55, i * 1.3 + 1, mn, { grooves: 1 });
      /* tier three: five short chest locks behind the paws, the last ending in the collar's point */
      for (i = 0; i < 5; i++) flame(c, 100 + i * 5.5, 108 + i * 3, PI / 2 + 0.1 + sw(i + 14, 0.05), 24 + (i === 3 ? 12 : 0) - (i % 2) * 4, 7.6, (i % 2 ? -1 : 1) * 0.5, i * 1.1, mn, { grooves: 1 });
      /* the forepaws stretched forward under the chin like a sphinx's: the far one behind, the near one in front */
      [[7, -4, 1], [0, 0, 0]].forEach(function (o, k) {
        var pst = k ? st : { base: mix(st.base, st.dark, 0.3), light: mix(st.light, st.dark, 0.2), dark: st.dark, ink: st.ink, pit: st.pit };
        G.part(c, [[100 + o[0], 136 + o[1]], [120 + o[0], 130 + o[1]], [146 + o[0], 133 + o[1]], [160 + o[0], 135 + o[1]], [166 + o[0], 136 + o[1]], [169 + o[0], 139 + o[1]], [173 + o[0], 138.5 + o[1]], [177 + o[0], 141.5 + o[1]], [179 + o[0], 145 + o[1]], [183 + o[0], 146 + o[1]], [184 + o[0], 150 + o[1], 1], [104 + o[0], 150 + o[1], 1], [98 + o[0], 144 + o[1]]], pst, { lw: 1.4, round: 0.5, seed: 53 + k, hatchAng: 0.2 });
        if (k) {
          [[167, 139, 165, 150], [175, 141, 173, 150], [181, 146, 180, 150]].forEach(function (q) { G.cut(c, [[q[0], q[1]], [q[0] - 0.5, (q[1] + q[3]) / 2], [q[2], q[3]]], pst, 0.9); });
          G.cut(c, [[150, 134], [158, 140], [160, 150]], pst, 0.7, { glint: 1 });
          claws(c, [166, 173, 179, 184], 148, pst, 0.7);
        }
      });
      /* the head: a big round skull, a short deep muzzle with a stop, a flat bridge; the jaw drops in a yawn */
      var lift = p * 0.03;
      rot(c, 100, 90, -lift, function () {
        /* the slit that carries the water, dark behind both lips, ending in the jowl */
        var jf = [122 + 49 * cos(yaw), 108 + 49 * sin(yaw)], jm = [122 + 18 * cos(yaw), 108 + 18 * sin(yaw)];
        pool(c, [[129, 104], [150, 103.5], [166, 102], [183, 99], [Math.min(184, jf[0] + 8), jf[1] - 1], [jm[0], jm[1] + 1]], st, { deep: 1, lw: 0.7 });
        rot(c, 122, 108, yaw, function () {
          /* the lower jaw is short: its lip ends well behind the upper lip */
          G.part(c, [[124, 106], [140, 108], [156, 107], [166, 106.5], [170, 108.5, 1], [168, 115], [160, 120], [148, 124], [134, 127], [122, 122], [116, 114]], st, { lw: 1.5, round: 0.5, seed: 56, hatchAng: 0.2 });
          G.part(c, [[132, 107], [148, 106], [162, 105.5], [170, 107.5, 1], [162, 110], [146, 111]], st, { lw: 0.8, pits: false, hatch: false, base: mix(st.base, st.light, 0.3) });   /* the flat tongue lip the water runs over */
          G.cut(c, [[136, 118], [150, 120.5], [164, 116.5]], st, 0.7); G.cut(c, [[118, 118], [124, 124]], st, 0.6);
          drip(c, 167, 114, t, 2200, 400, 36, 2.4);
        });
        /* the ear is cupped like a bowl, set on the crown and opening forward; the skull's crown covers its root */
        var ef = ((t + 900) % 2800) / 220, twitch = ef < 1 ? sin(PI * ef) * 0.12 : 0;
        rot(c, 124, 44, twitch - p * 0.1, function () {
          G.part(c, [[114, 47, 1], [111.5, 37], [114, 27], [121, 21.5], [129, 23.5], [133, 32], [133.5, 42], [131, 48, 1]], st, { lw: 1.1, seed: 57, hatch: false, round: 0.5 });
          G.hollow(c, [[120, 43], [118.5, 34], [122, 27.5], [128, 28.5], [130.5, 36], [129, 43.5]], st, { deep: 0.9, lw: 0.7 });
          G.cut(c, [[116, 42], [114, 32], [118, 25]], st, 0.8, { glint: 1 });
        });
        G.part(c, E_UP, st, { lw: 1.7, round: 0.5, seed: 55, hatchAng: 0.6, hatchGap: 3.6 });
        /* the short muzzle: whisker pad swelling under the stop, nose pad with two comma nostrils, folds, the heavy drooping upper lip */
        G.part(c, [[152, 75], [164, 72], [178, 73], [187, 77], [190, 86], [186, 95], [180, 99.5], [166, 100.5], [154, 98], [149, 86]], st, { lw: 1.1, round: 0.7, seed: 58, hatch: false });
        G.part(c, [[174, 70, 1], [190, 71.5, 1], [192, 79], [191, 88], [184, 90.5], [177, 82]], st, { lw: 1.1, pits: false, round: 0.5, hatch: false });
        G.cut(c, [[160, 69], [170, 74], [175, 80]], st, 0.8, { glint: 1 }); G.cut(c, [[166, 66.5], [174, 66], [182, 67]], st, 0.6, { col: rgba(st.ink, 0.4) });
        G.cut(c, [[158, 66], [163, 73], [165, 85]], st, 1.3, { glint: 1 });
        G.hollow(c, [[183, 77.5], [188, 76.5], [191, 79.5], [190, 84], [187, 85.5], [188, 81.5], [185, 80.5]], st, { deep: 0.9, lw: 0.5 });
        G.hollow(c, [[177.5, 74], [181, 73.5], [181.5, 76.5], [178.5, 77.5]], st, { deep: 0.9, lw: 0.4 });
        G.cut(c, [[179, 91], [184, 95]], st, 0.6);
        for (var w = 0; w < 6; w++) G.dot(c, 160 + (w % 3) * 5, 84 + Math.floor(w / 3) * 5, 0.8, st.dark);
        G.cut(c, [[150, 92], [162, 94], [174, 95.5]], st, 0.8); G.cut(c, [[154, 78], [164, 83], [172, 86]], st, 0.7);
        /* the mouth is a curve that follows the lip and drops into the jowl fold */
        G.cut(c, [[188, 92], [183, 99], [167, 102], [150, 104], [138, 104], [131, 106], [128, 109], [130, 113]], st, 1.5, { glint: 1 });
        G.cut(c, [[124, 100], [127, 105], [126, 111]], st, 0.6);
        /* the brow bump over a sunk almond eye, the incised line sweeping from its corner to the cheek */
        G.hollow(c, [[133, 72], [141, 68], [150, 71], [148, 78], [139, 79]], st, { deep: 0.5, lw: 0.6 });
        G.part(c, [[128, 66, 1], [137, 59], [147, 57.5], [155, 64, 1], [150, 69], [141, 66.5], [133, 70]], st, { lw: 1, pits: false, hatch: false, round: 0.4 });
        G.cut(c, [[130, 66], [138, 61], [148, 60], [154, 65]], st, 1.1, { glint: 1 });
        G.eye(c, 141.5, 74.5, 4 + p * 1.1, st, { blink: Math.max(blink(t, 2) * (1 - p), 0), look: [0.8, 0.1], squint: 0.55 * (1 - p), tilt: 0.36 });
        G.cut(c, [[135, 79], [123, 82], [112, 91], [105, 103]], st, 0.9);
        G.cut(c, [[146, 79], [153, 85]], st, 0.7);
        G.cut(c, [[102, 56], [120, 56]], st, 0.6, { col: rgba(st.ink, 0.35) }); G.cut(c, [[98, 76], [126, 80]], st, 0.6, { col: rgba(st.ink, 0.3) });
        bloom(c, 122, 66, 12, 0.25);
      });
      /* the ruff: ten parallel locks laid back from the hairline, over the crown, behind the eye and down the cheek to under the chin, so the face sits inside the mane; each its own length and curl */
      var rp = G.sp([[148, 54], [141, 62], [136, 73], [133, 88], [131, 103]], false, 8), rr = G.rng(29);
      for (i = 0; i < 10; i++) {
        var u = 0.1 + i * 0.097, q = pathAt(rp, u), ra = PI + 0.95 - 1.7 * u, rl = 21 + rr() * 6, rc = (i % 2 ? -1 : 1) * (0.4 + (rr() - 0.5) * 0.14);
        flame(c, q[0], q[1], ra + sw(i + 20, 0.05), rl, 5.2, rc, i * 1.4, st, { grooves: 1 });
      }
      gecko(c, 60, 166, 148.8, t, 9000, 2400, 0.8, "#6f7a48");
    } };

  /* a four-point star glint */
  function star(c, x, y, r, a) {
    if (G.sil || a <= 0.01) return;
    c.save(); c.translate(x, y); c.globalAlpha = clamp(a, 0, 1); c.fillStyle = "#fff"; c.beginPath();
    c.moveTo(0, -r); c.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0); c.quadraticCurveTo(r * 0.12, r * 0.12, 0, r); c.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0); c.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r); c.fill(); c.restore();
  }

  /* Midtown behind the eagle, seen from the 61st floor: a pale strip of the East River and stepped towers, faint and fixed,
     with a few windows that light and go out on their own slow phases */
  function midtown(c, t) {
    if (G.sil) return;
    var r = G.rng(63), i, k;
    c.save(); c.globalAlpha = 0.3;
    /* the river is cooler than the sky and tilts a little, with a few glints */
    c.fillStyle = "#8da6c2"; c.beginPath(); c.moveTo(0, 168); c.lineTo(200, 156); c.lineTo(200, 170); c.lineTo(0, 182); c.closePath(); c.fill();
    c.fillStyle = "#ffffff"; for (k = 0; k < 7; k++) { var gx = r() * 200, gy = 170 - gx * 0.06 + r() * 8; c.globalAlpha = 0.3 * (0.4 + 0.6 * sin(t * 0.0007 + k * 1.9) * sin(t * 0.0007 + k * 1.9)); c.fillRect(gx, gy, 5 + r() * 6, 0.9); }
    c.globalAlpha = 0.3;
    /* [left, width, the setbacks as [width fraction, height]], all standing on y = 190 */
    var T = [[58, 32, [[1, 20], [0.74, 12], [0.46, 8]]], [92, 28, [[1, 26], [0.7, 14], [0.4, 8]]], [128, 26, [[1, 28], [0.76, 15], [0.5, 10], [0.22, 8]]], [160, 24, [[1, 24], [0.74, 12], [0.44, 10]]], [182, 22, [[1, 18], [0.7, 10]]]];
    T.forEach(function (tw, n) {
      var y = 190, cx = tw[0] + tw[1] / 2;
      tw[2].forEach(function (tier) {
        var w = tw[1] * tier[0], x0 = cx - w / 2;
        c.fillStyle = n % 2 ? "#4f5d7a" : "#5a6684"; c.fillRect(x0, y - tier[1], w, tier[1]);
        c.fillStyle = "rgba(255,255,255,.22)"; c.fillRect(x0, y - tier[1], 1.6, tier[1]);
        for (var wy = y - tier[1] + 3; wy < y - 2; wy += 4.2) for (var wx = x0 + 3.5; wx < x0 + w - 2.5; wx += 4.2) {
          var ph = r() * 6.28, on = sin(t * 0.0005 + ph) > 0.35;
          if (on) { c.fillStyle = "#ffe9a6"; c.fillRect(wx, wy, 1.5, 1.9); }
        }
        y -= tier[1];
      });
    });
    c.restore();
  }

  /* ---------------------------------------------------------------- Chrysler eagle */
  var ST = { base: "#c3cad3", light: "#ffffff", dark: "#56606d", ink: "#1f252d", pit: null };
  /* one slanted band of sky, then the city's dark behind it, clipped to the metal; toLocal maps a point of the page frame into the frame the polys were drawn in */
  function sweep(c, polys, t, toLocal, y0, y1) {
    if (G.sil || !polys.length) return;
    c.save(); c.beginPath();
    polys.forEach(function (pl) { c.moveTo(pl[0][0], pl[0][1]); for (var k = 1; k < pl.length; k++) c.lineTo(pl[k][0], pl[k][1]); c.closePath(); });
    c.clip();
    var a = toLocal([0, y0]), b = toLocal([0, y1]), yg = c.createLinearGradient(a[0], a[1], b[0], b[1]);
    yg.addColorStop(0, "rgba(200,228,250,.30)"); yg.addColorStop(0.5, "rgba(170,196,222,.08)"); yg.addColorStop(0.55, "rgba(46,62,90,.32)"); yg.addColorStop(1, "rgba(30,44,70,.38)");
    c.fillStyle = yg; c.fillRect(0, 0, 210, 210);
    var th = 0.42, ax = cos(th), ay = sin(th), ph = ((t % 6000) / 6000) * 1.5 - 0.25, pmin = 40 * ax + 62 * ay, pmax = 200 * ax + 172 * ay, sc = lerp(pmin, pmax, ph);
    var e0 = toLocal([ax * (sc - 30), ay * (sc - 30)]), e1 = toLocal([ax * (sc + 30), ay * (sc + 30)]), bg = c.createLinearGradient(e0[0], e0[1], e1[0], e1[1]);
    bg.addColorStop(0, "rgba(255,255,255,0)"); bg.addColorStop(0.3, "rgba(255,255,255,.78)"); bg.addColorStop(0.46, "rgba(255,255,255,.2)"); bg.addColorStop(0.6, "rgba(30,44,70,.34)"); bg.addColorStop(1, "rgba(30,44,70,0)");
    c.fillStyle = bg; c.fillRect(0, 0, 210, 210);
    c.restore();
  }
  B.eagle = { stone: "steel", spout: false,
    draw: function (c, s) {
      var st = ST, p = pk(s), t = s.t, polys = [], hp = [], i;
      /* the city far below the 61st floor */
      midtown(c, t);
      /* the neck: a steel wedge under five rows of welded plates, small at the head, large at the wall, upper rows over lower */
      var xw = 36, xh = 120, ROWS = 5;
      function topAt(xx) { return lerp(68, 82, (xx - xw) / (xh - xw)); }
      function botAt(xx) { return lerp(172, 130, (xx - xw) / (xh - xw)); }
      polys.push(G.part(c, [[xw, 68, 1], [xh, 82, 1], [xh, 130, 1], [xw, 172, 1]], st, { lw: 1.2, hatch: false, steps: 1, base: mix(st.base, st.dark, 0.35) }));
      /* each row runs from the wall to the head, every plate a little shorter than the last; a plate's free end points at the wall and the head-side plate laps over it */
      var feathers = [];
      for (var r = ROWS - 1; r >= 0; r--) {
        var rr = G.rng(70 + r), xx = xw - 8 + (r % 2) * 7;
        while (xx < xh - 3) { var L0 = lerp(24, 12, clamp((xx - xw) / (xh - xw), 0, 1)); feathers.push({ x: xx, L: L0, r: r, v: rr() }); xx += L0 * 0.82; }
      }
      var wind = sin(t * 0.0021) * 0.6 + sin(t * 0.031) * 0.25;
      /* the plate: free tip at the wall end, a stepped shoulder, a notched root toward the head; fractions of length and of half the band */
      var PF = [[0, -0.3], [0.22, -0.6], [0.5, -0.6], [0.5, -1], [0.8, -1], [0.8, -0.78], [1, -0.78], [1, 0.78], [0.8, 0.78], [0.8, 1], [0.5, 1], [0.5, 0.6], [0.22, 0.6], [0, 0.3]];
      feathers.forEach(function (f) {
        var L = f.L, xm = f.x + L * 0.5, u = clamp((xm - xw) / (xh - xw), 0, 1), hh = (botAt(xm) - topAt(xm)) / ROWS, yc = topAt(xm) + (f.r + 0.5) * hh;
        var h = hh * 0.475, ox = f.x, oy = yc + wind * u * 0.8;
        var P = PF.map(function (q) { return [ox + q[0] * L, oy + q[1] * h, 1]; });
        var poly = G.part(c, P, st, { lw: 0.8, hatch: false, steps: 1, shineAt: 0.2 + 0.3 * f.v });
        polys.push(poly);
        /* the weld: a lit seam along the plate's top edge and a short upright one at its shoulder */
        G.cut(c, [[ox + 0.5 * L, oy + 0.9 * h, 1], [ox + 0.5 * L, oy - 0.94 * h, 1], [ox + 0.8 * L, oy - 0.94 * h, 1], [ox + L, oy - 0.72 * h, 1]], st, 0.8, { glint: 1 });
        /* the tap's ring of light travelling down the rows from the head */
        if (s.poke != null && s.poke >= 0 && s.poke < 1500 && !G.sil) {
          var ring = s.poke / 650, d = 1 - u, iv = Math.exp(-Math.pow((d - ring) / 0.13, 2)) * (1 - s.poke / 1500);
          if (iv > 0.03) { c.save(); G.trace(c, poly, true); c.fillStyle = "rgba(255,255,255," + (0.75 * iv) + ")"; c.fill(); c.restore(); }
        }
      });
      sweep(c, polys, t, function (q) { return q; }, 62, 172);
      /* the white-brick setback corner with its steel coping, in front of the neck's root */
      G.ashlar(c, 0, 50, 38, 150, S.white, { course: 9, seed: 61 });
      c.save(); c.fillStyle = "rgba(60,64,80,.16)"; c.fillRect(30, 50, 8, 150); c.restore();
      G.part(c, [[-2, 43, 1], [42, 43, 1], [42, 50, 1], [-2, 50, 1]], st, { lw: 1.1, hatch: false, shineAt: 0.4 });
      G.cut(c, [[0, 52], [40, 52]], S.white, 0.8, { col: rgba("#3a3c48", 0.5) });
      streak(c, 10, 52, 40, 6, S.white, 0.16); streak(c, 26, 52, 30, 4, S.white, 0.12);
      G.cut(c, [[38, 56], [38, 190]], S.white, 1.4, { col: rgba("#3a3c48", 0.55) });
      /* the head, tilted down to the street; it shudders in the wind and swings to face you on a tap */
      var tilt = 0.2 - p * 0.3 + sin(t * 0.0006) * 0.018 + sin(t * 0.027) * 0.004, beak = p * 0.42;
      var inv = function (q) { var dx = q[0] - 118, dy = q[1] - 102, ca = cos(-tilt), sa = sin(-tilt); return [118 + dx * ca - dy * sa, 102 + dx * sa + dy * ca]; };
      rot(c, 118, 102, tilt, function () {
        c.save(); c.translate(118, 0); c.scale(1 - p * 0.07, 1); c.translate(-118, 0);
        /* behind the skull, three stout upright plates, each lower than the one nearer the wall, each welded at its edge */
        [[104, 20], [116, 16], [128, 12]].forEach(function (q, k) {
          var x = q[0], top = 80 - q[1];
          hp.push(G.part(c, [[x - 5.5, 104, 1], [x - 5.5, top + 4], [x - 3, top + 0.4], [x + 3, top + 0.4], [x + 5.5, top + 4], [x + 5.5, 104, 1]], st, { lw: 1, hatch: false, steps: 3, shineAt: 0.25 + k * 0.12 }));
          G.cut(c, [[x - 4, top + 5], [x - 4, top + 2.4], [x + 3, top + 2.2]], st, 0.8, { glint: 1 });
          G.cut(c, [[x - 5, top + 13], [x + 5, top + 13]], st, 0.6);
        });
        /* the lean wedge of the head */
        hp.push(G.part(c, [[116, 84], [126, 76], [142, 72], [158, 73], [170, 78], [176, 86], [176, 96], [170, 104], [156, 112], [138, 120], [122, 124], [114, 108]], st, { lw: 1.5, hatch: false, steps: 5 }));
        G.cut(c, [[124, 94], [138, 99], [154, 100]], st, 0.8, { glint: 1 }); G.cut(c, [[130, 108], [146, 107], [162, 102]], st, 0.8, { glint: 1 }); G.cut(c, [[118, 96], [124, 112]], st, 0.7);
        /* the eye is a plain round recess with a star of light in it; the heavy brow plate overhangs it by three pixels */
        G.hollow(c, [[152, 90], [154, 86.2], [158, 84.8], [161.8, 87.6], [162.2, 92], [159, 95.2], [155, 95], [152.6, 93]], st, { deep: 0.95, lw: 0.7 });
        hp.push(G.part(c, [[130, 76, 1], [158, 72, 1], [171, 78, 1], [168, 86, 1], [160, 88.5, 1], [148, 88, 1], [136, 83, 1]], st, { lw: 1, hatch: false, steps: 1 }));
        G.cut(c, [[135, 78.5], [158, 75]], st, 0.7, { glint: 1 });
        star(c, 158, 90, 3.4 + p * 3, (((t + 1200) % 3000) < 420 ? sin(((t + 1200) % 3000) / 420 * PI) : 0) + p * 0.9);
        /* the lower mandible, a thin blade that drops open */
        rot(c, 164, 104, beak, function () {
          hp.push(G.part(c, [[162, 102], [177, 103.5], [190, 106], [197, 109, 1], [188, 113.5], [175, 112.5], [162, 108]], st, { lw: 1.1, hatch: false, steps: 2 }));
          G.cut(c, [[168, 108], [183, 110], [192, 109.5]], st, 0.6, { glint: 1 });
        });
        /* the hooked beak with its cere, nostril slot, culmen facet and cutting edge */
        rot(c, 164, 98, -p * 0.07, function () {
          hp.push(G.part(c, [[162, 79], [175, 80], [188, 87], [196, 98], [199, 111, 1], [192, 106], [185, 100], [177, 98.5], [168, 99], [162, 92]], st, { lw: 1.4, hatch: false, steps: 4 }));
          G.cut(c, [[168, 80], [182, 83], [193, 91], [198, 104]], st, 1, { glint: 1 });
          G.cut(c, [[163, 84], [171, 85], [178, 90]], st, 0.8); G.hollow(c, [[172, 87], [176, 88.5], [175, 91.5], [171, 90]], st, { deep: 1, lw: 0.5 });
          G.cut(c, [[164, 98.5], [176, 99.5], [187, 102], [195, 108]], st, 0.9);
        });
        star(c, 199, 110, 4 + p * 6, p > 0.12 ? p * 1.1 : 0);
        sweep(c, hp, t, inv, 62, 172);
        c.restore();
      });
    } };

  /* an acanthus leaf: a spine with pointed lobes each side, the two sides out of step, a vein to every tip */
  function acanthus(c, x, y, ang, len, st, o) {
    o = o || {};
    var n = o.lobes || 4, ca = cos(ang), sa = sin(ang), W = len * (o.wide || 0.3), L = [[x, y, 1]], R = [[x, y, 1]], i, veins = [];
    for (var side = 0; side < 2; side++) {
      var pts = side ? R : L, sg = side ? 1 : -1, off = side ? 0.1 : 0;
      for (i = 0; i < n; i++) {
        var ut = (i + 0.7 + off) / (n + 0.4), uv = (i + 1.0 + off * 0.5) / (n + 0.4), wt = W * sin(PI * Math.pow(clamp(ut, 0, 1), 0.7)) * (1 + (o.vary || 0) * sin(i * 2 + side)), wv = wt * 0.4;
        pts.push([x + ca * len * ut - sa * wt * sg, y + sa * len * ut + ca * wt * sg, 1]); veins.push([ut, wt * sg]);
        pts.push([x + ca * len * uv - sa * wv * sg, y + sa * len * uv + ca * wv * sg]);
      }
    }
    L.push([x + ca * len, y + sa * len, 1]);
    G.part(c, L.concat(R.reverse()), st, { lw: o.lw || 0.9, steps: 3, pits: false, hatchGap: 2.6, hatchAng: ang + 1.2 });
    G.cut(c, [[x + ca * len * 0.04, y + sa * len * 0.04], [x + ca * len * 0.5, y + sa * len * 0.5], [x + ca * len * 0.96, y + sa * len * 0.96]], st, 0.8);
    veins.forEach(function (v) { G.cut(c, [[x + ca * len * (v[0] - 0.2), y + sa * len * (v[0] - 0.2)], [x + ca * len * v[0] - sa * v[1] * 0.9, y + sa * len * v[0] + ca * v[1] * 0.9]], st, 0.45); });
    /* ridges: parallel diagonal grooves run from the spine to the edge on each side, as the carver's chisel left them; a lit lip beside each */
    if (o.grooves && !G.sil) {
      c.save(); c.lineCap = "round";
      for (var pass = 0; pass < 2; pass++) {
        c.strokeStyle = pass ? rgba(st.light, 0.55) : rgba(st.ink, 0.5); c.lineWidth = pass ? 0.5 : 0.65; c.beginPath();
        for (var sd = -1; sd <= 1; sd += 2) for (i = 0; i < o.grooves; i++) {
          var u0 = 0.16 + i * (0.62 / o.grooves), u1 = u0 + 0.2, w1 = W * sin(PI * Math.pow(clamp(u1, 0, 1), 0.7)) * 0.72, off = pass ? 0.7 : 0;
          c.moveTo(x + ca * len * u0 - sa * sd * 0.8 + off, y + sa * len * u0 + ca * sd * 0.8 + off); c.lineTo(x + ca * len * u1 - sa * w1 * sd + off, y + sa * len * u1 + ca * w1 * sd + off);
        }
        c.stroke();
      }
      c.restore();
    }
  }
  /* a serrated leaf: an oval with fine teeth round the edge */
  function serrated(c, x, y, ang, len, st) {
    var ca = cos(ang), sa = sin(ang), W = len * 0.3, pts = [], n = 8, i;
    for (i = 0; i <= n; i++) { var u = i / n, w = W * sin(PI * Math.pow(u, 0.8)); pts.push([x + ca * len * u - sa * w * (i % 2 ? 1 : 1.25), y + sa * len * u + ca * w * (i % 2 ? 1 : 1.25), 1]); }
    for (i = n; i >= 0; i--) { var u2 = i / n, w2 = W * sin(PI * Math.pow(u2, 0.8)); pts.push([x + ca * len * u2 + sa * w2 * (i % 2 ? 1.25 : 1), y + sa * len * u2 - ca * w2 * (i % 2 ? 1.25 : 1), 1]); }
    G.part(c, pts, st, { lw: 0.8, steps: 1, pits: false, hatchGap: 2.4 });
    G.cut(c, [[x + ca * len * 0.05, y + sa * len * 0.05], [x + ca * len * 0.9, y + sa * len * 0.9]], st, 0.6);
  }

  /* ---------------------------------------------------------------- Salamanca astronaut */
  /* a tapered limb between two points: it swells a little along its length and is round at both ends; w0 and w1 are the widths at the ends */
  function limb(c, x0, y0, x1, y1, w0, w1, st, o) {
    o = o || {};
    var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    function at(u, v) { var w = lerp(w0, w1, u) / 2 * (1 + 0.1 * sin(PI * u)); return [x0 + dx * u + nx * w * v, y0 + dy * u + ny * w * v]; }
    return G.part(c, [at(0, -1), at(0.4, -1), at(0.85, -1), at(1, -1), [x1 + ux * w1 * 0.42, y1 + uy * w1 * 0.42], at(1, 1), at(0.85, 1), at(0.4, 1), at(0, 1), [x0 - ux * w0 * 0.42, y0 - uy * w0 * 0.42]], st, { lw: o.lw || 1.3, steps: 4, hatchAng: Math.atan2(dy, dx) + 1.4, round: 0.4, pits: false });
  }
  /* a seam ring round a limb at u of the way along it */
  function seam(c, x0, y0, x1, y1, u, w, st) {
    var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, x = x0 + dx * u, y = y0 + dy * u;
    G.cut(c, [[x - nx * w / 2, y - ny * w / 2], [x + dx / L * 1.4, y + dy / L * 1.4], [x + nx * w / 2, y + ny * w / 2]], st, 0.9);
  }
  /* a wrist cuff: a short stiff band, a little wider than the limb */
  function cuff(c, x0, y0, x1, y1, w, st) {
    var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, h = w / 2 + 1.2;
    G.part(c, [[x1 - ux * 6 - nx * h, y1 - uy * 6 - ny * h, 1], [x1 - ux * 2.4 - nx * h, y1 - uy * 2.4 - ny * h, 1], [x1 - ux * 2.4 + nx * h, y1 - uy * 2.4 + ny * h, 1], [x1 - ux * 6 + nx * h, y1 - uy * 6 + ny * h, 1]], st, { lw: 1, steps: 1, pits: false, hatch: false });
  }
  /* four finger cuts across a gloved hand, along its length */
  function fingers(c, x, y, ang, len, w, st) {
    var ca = cos(ang), sa = sin(ang);
    for (var k = 0; k < 4; k++) { var v = (k - 1.5) / 3 * w * 0.8; G.cut(c, [[x + ca * len * 0.35 - sa * v, y + sa * len * 0.35 + ca * v], [x + ca * len * 0.95 - sa * v * 1.1, y + sa * len * 0.95 + ca * v * 1.1]], st, 0.55); }
  }
  /* a scoop of ice cream: a rounded dome with a ruffled skirt, its own tint */
  function scoop(c, x, y, r, tint, st) {
    var pts = [[x - r, y + 1.5, 1], [x - r * 1.02, y - r * 0.4], [x - r * 0.6, y - r * 0.92], [x, y - r * 1.05], [x + r * 0.6, y - r * 0.92], [x + r * 1.02, y - r * 0.4], [x + r, y + 1.5, 1], [x + r * 0.55, y + 3], [x + r * 0.2, y + 1.6], [x - r * 0.2, y + 3.2], [x - r * 0.6, y + 1.8]];
    G.part(c, pts, st, { lw: 0.9, round: 0.8, pits: false, hatch: false, base: mix(st.base, tint, 0.45) });
    G.cut(c, [[x - r * 0.7, y + 0.2], [x - r * 0.3, y + 1.6], [x + r * 0.1, y + 0.4], [x + r * 0.6, y + 1.6]], st, 0.5);
    G.cut(c, [[x - r * 0.5, y - r * 0.55], [x - r * 0.1, y - r * 0.85]], st, 0.5, { glint: 1 });
  }
  var A_STALK = [[16, 182], [28, 160], [50, 143], [78, 135], [108, 131], [134, 126], [152, 120], [164, 109], [165, 97], [157, 91], [149, 97], [153, 105]];
  /* the leaves of the field: [layer, x, y, angle, length, lobes]; the back layer is darker, the front layer laps over the edges */
  var A_LEAVES = [
    [0, 22, 176, -1.15, 36, 5], [0, 170, 56, 2.6, 32, 5], [0, 120, 22, 1.25, 30, 4], [0, 22, 104, 0.15, 32, 5], [0, 182, 124, 3.0, 30, 4],
    [1, 44, 28, 0.65, 30, 5], [1, 174, 30, 2.05, 28, 4], [1, 16, 146, -0.55, 28, 4], [1, 98, 182, -1.45, 28, 5], [1, 188, 90, 2.9, 26, 4],
    [2, 14, 188, -0.85, 34, 5], [2, 76, 188, -2.05, 24, 4], [2, 188, 64, 2.85, 26, 4]
  ];
  B.astronaut = { stone: "villa", spout: false,
    draw: function (c, s) {
      var st = S.villa, p = pk(s), t = s.t, bob = sin(t * 0.0012) * 2 - p * 2, dk = { base: mix(st.base, st.dark, 0.32), light: mix(st.light, st.dark, 0.18), dark: st.dark, ink: st.ink, pit: st.pit };
      /* a leaf of the field: each rustles on its own phase */
      var lfx = function (L, i, sty) { acanthus(c, L[1], L[2], L[3] + sin(t * 0.0016 + i * 1.7) * 0.05, L[4], sty, { lobes: L[5], vary: 0.2, grooves: 4 }); };
      /* a moulded frame: the slab, a lit lip, and the carved field set back inside it so nothing spills past the edge */
      G.part(c, [[0, 0, 1], [200, 0, 1], [200, 200, 1], [0, 200, 1]], st, { lw: 1.4, seed: 71, lift: 0.5, hatchAng: 0.2 });
      G.hollow(c, [[13, 13, 1], [187, 13, 1], [187, 187, 1], [13, 187, 1]], st, { deep: 0.22 });
      G.cut(c, [[10, 10], [190, 10]], st, 1.3, { glint: 1 }); G.cut(c, [[10, 10], [10, 190]], st, 1.3, { glint: 1 }); G.cut(c, [[190, 14], [190, 190]], st, 0.9); G.cut(c, [[188, 190], [14, 190]], st, 0.9);
      bloom(c, 36, 32, 22, 0.28);
      /* the field is full of ridged foliage, three layers deep: the back layer in the darker stone, then the stalk's own scroll, then the middle layer */
      A_LEAVES.forEach(function (L, i) { if (L[0] === 0) lfx(L, i, dk); });
      acanthus(c, 40, 150, -2.45 + sin(t * 0.0016) * 0.05, 36, st, { lobes: 4, vary: 0.2, grooves: 4 });
      acanthus(c, 160, 104, -0.9 + sin(t * 0.0016 + 1.3) * 0.05, 32, st, { lobes: 4, wide: 0.28, grooves: 4 });
      serrated(c, 138, 124, -0.2 + sin(t * 0.0016 + 2.6) * 0.05, 22, st);
      acanthus(c, 122, 130, 1.15 + sin(t * 0.0016 + 3.9) * 0.05, 24, st, { lobes: 3, grooves: 4 });
      G.leaf(c, 54, 144, -1.9 + sin(t * 0.0016 + 5.2) * 0.05, 26, 8, 3, st);
      serrated(c, 28, 80, -1.2 + sin(t * 0.0016 + 6.5) * 0.05, 24, st);
      A_LEAVES.forEach(function (L, i) { if (L[0] === 1) lfx(L, i, st); });
      var stalk = tube(c, A_STALK, 14, 3, st, { lw: 1.3, hatchAng: 0.3, round: 0.4, bulge: 0.1 });
      G.cut(c, [[30, 160], [52, 146], [80, 138], [110, 134]], st, 0.8, { glint: 1 });
      G.part(c, [[150, 94], [156, 89], [161, 93], [158, 99]], st, { lw: 0.8, pits: false, hatch: false });
      /* the tendril he holds, branching off the stalk and rising past his hand to a leaf above; the top of it sways */
      var tsw = sin(t * 0.0013) * 1.5;
      tube(c, [[54, 140], [47, 118], [45, 100], [46 + tsw * 0.3, 82], [44 + tsw * 0.7, 66], [40 + tsw, 52]], 4.5, 2.4, st, { lw: 0.9, hatch: false });
      G.leaf(c, 40 + tsw, 54, -2.05 + sin(t * 0.0016 + 0.7) * 0.05, 28, 8, 3, st); acanthus(c, 53, 106, -2.7 + sin(t * 0.0016 + 4.4) * 0.05, 16, st, { lobes: 3, grooves: 4 });
      streak(c, 26, 150, 40, 6, st, 0.2, stalk);
      /* the dragon carved in the same 1992 restoration, smiling, licking a three-scoop cone: the top scoop drops on a tap */
      var lk = ((t % 2000) / 2000), licking = lk > 0.55 && lk < 0.8 ? sin((lk - 0.55) / 0.25 * PI) : 0, drop = p > 0.05 ? clamp((s.poke - 80) / 900, 0, 1) : 0;
      c.save(); c.translate(-6, 0);
      /* tail curling out behind him, ending in a small spade; back spines; the sitting body with its belly plates */
      tube(c, [[149, 185], [139, 187], [131, 181], [132, 171], [138, 166]], 6, 2.2, dk, { lw: 0.8, hatch: false });
      G.part(c, [[138, 166], [132, 163], [133, 158], [139, 155, 1], [144, 160], [142, 165]], dk, { lw: 0.8, pits: false, hatch: false });
      G.part(c, [[148, 186], [147, 174], [153, 165], [162, 163], [169, 169], [171, 180], [168, 187, 1]], st, { lw: 1.1, seed: 79, hatchAng: 1.0 });
      [[150, 172], [152, 177], [154, 182]].forEach(function (q) { G.cut(c, [[q[0], q[1]], [q[0] + 9, q[1] + 1.4], [q[0] + 14, q[1] - 0.6]], st, 0.55); });
      [[149, 170, 2.7], [150, 177, 2.9], [151, 183, 3.1]].forEach(function (n) { nub(c, n[0], n[1], PI + 0.5, 2.6, st); });
      /* the raised arm holding the cone, a small hand wrapped round it */
      limb(c, 165, 172, 174, 160, 6, 4.4, st, { lw: 0.9 });
      /* the cone, point down, with its waffle grid; the scoops stack on it, the top one falls on a tap */
      G.part(c, [[174, 152, 1], [187, 152, 1], [180.5, 174, 1]], st, { lw: 0.9, pits: false, hatch: false, base: mix(st.base, "#b9824a", 0.4), steps: 1 });
      [[176, 154, 183, 168], [179, 153, 185, 163], [182, 153, 186, 158]].forEach(function (q) { G.cut(c, [[q[0], q[1]], [q[2], q[3]]], st, 0.45); });
      [[185, 154, 178, 168], [182, 153, 177, 162], [179, 153, 176, 158]].forEach(function (q) { G.cut(c, [[q[0], q[1]], [q[2], q[3]]], st, 0.45); });
      G.part(c, [[172, 160], [176, 157], [180, 159], [179, 164], [174, 165]], st, { lw: 0.8, round: 0.6, pits: false, hatch: false });
      G.cut(c, [[174.5, 159], [176, 163.5]], st, 0.45); G.cut(c, [[177, 158.5], [177.5, 163]], st, 0.45);
      scoop(c, 180.5, 151, 6.8, "#a9857a", st);
      scoop(c, 180.5, 143, 6, "#c9a35e", st);
      if (drop < 1) {
        c.save(); c.globalAlpha = 1 - drop * drop; c.translate(0, drop * drop * 30);
        scoop(c, 180.5, 135.4, 5.2, "#e8cfa0", st);
        c.restore();
      }
      /* the short neck and the small horned head, a frill behind it; the head tips up as he licks */
      G.part(c, [[155, 168], [157, 156], [165, 154], [169, 164]], st, { lw: 1, round: 0.5, seed: 80, pits: false });
      rot(c, 162, 156, -licking * 0.12, function () {
        G.part(c, [[155, 150], [149, 146, 1], [151, 152], [148, 158, 1], [155, 156]], st, { lw: 0.9, pits: false, hatch: false, base: st.dark });
        G.part(c, [[157, 144], [155, 138, 1], [160, 141], [161, 145]], st, { lw: 0.8, pits: false, hatch: false });
        G.part(c, [[164, 143], [165, 136.5, 1], [169, 141], [168, 145]], st, { lw: 0.8, pits: false, hatch: false });
        G.part(c, [[155, 152], [156, 145], [162, 141.5], [169, 143.5], [175, 148], [177, 153], [174, 157], [166, 159], [158, 158]], st, { lw: 1.1, seed: 81, round: 0.6 });
        G.cut(c, [[158, 150], [161, 148.4]], st, 0.6); G.dot(c, 164.5, 149.5, 1.2, st.ink); G.dot(c, 164.9, 149, 0.4, "#fff8e6");
        G.dot(c, 174.2, 150, 0.7, st.ink);
        /* the smile: a curve turned up at the corner, a dimple at the cheek, a hint of tooth */
        G.cut(c, [[162, 155], [168, 157.4], [174, 154.6], [175.6, 152.6]], st, 0.8);
        G.cut(c, [[173.6, 154.3], [175.2, 156]], st, 0.5); G.part(c, [[168, 157.2], [170, 157], [169.2, 159.4]], st, { lw: 0.5, pits: false, hatch: false, base: st.light });
        if (licking > 0.05) G.part(c, [[171, 156.4], [174 + licking * 4, 152.4], [177.6, 149.6], [176.5, 153.4], [173, 157.4]], st, { lw: 0.6, pits: false, hatch: false, base: mix(st.base, "#b4655e", 0.5) });
      });
      c.restore();
      /* the figure floats, tilted, head up and left, legs kicking down and right; the upper body breathes */
      c.save(); c.translate(-8, -5); c.translate(100, 105); c.rotate(-0.3); c.translate(-100, -105);
      var swing = sin(t * 0.0014) * 0.14, sw2 = sin(t * 0.0014 + 1.6) * 0.14;
      /* far leg, darker, then near leg: thigh forward, shin hanging, a ring seam at the knee */
      tube(c, [[94, 119], [106, 124], [116, 128]], 15, 12, dk, { lw: 1.2, hatchAng: 0.3 });
      rot(c, 116, 128, sw2, function () {
        tube(c, [[116, 128], [117, 140], [116, 152]], 12, 10, dk, { lw: 1.2, hatchAng: 1.5 });
        G.part(c, [[110, 149], [121, 148], [130, 154], [130, 161, 1], [110, 161, 1]], dk, { lw: 1.1, pits: false, hatch: false });
        G.cut(c, [[110, 157.5], [130, 157.5]], dk, 0.6);
        for (var k = 0; k < 5; k++) G.cut(c, [[112.5 + k * 3.8, 157.5], [112.5 + k * 3.8, 160.6]], dk, 0.7);
      });
      tube(c, [[100, 120], [114, 124], [126, 128]], 16, 13, st, { lw: 1.4, hatchAng: 0.3, round: 0.4 });
      G.cut(c, [[121, 121], [123, 134]], st, 1.2); G.cut(c, [[104, 117], [112, 123]], st, 0.7, { glint: 1 });
      rot(c, 126, 128, swing, function () {
        tube(c, [[126, 128], [128, 140], [128, 152]], 13, 11, st, { lw: 1.4, hatchAng: 1.5, round: 0.4 });
        G.cut(c, [[121, 134], [135, 134.5]], st, 1);
        G.part(c, [[121, 150], [133, 149], [142, 156], [142, 163, 1], [121, 163, 1]], st, { lw: 1.2, round: 0.5, pits: false });
        G.cut(c, [[121, 159.4], [142, 159.4]], st, 0.8); G.cut(c, [[134, 152], [138, 157]], st, 0.5);
        for (var k2 = 0; k2 < 5; k2++) G.cut(c, [[123.5 + k2 * 4, 159.4], [123.5 + k2 * 4, 162.6]], st, 0.8);
      });
      /* the upper body breathes and floats a little over the seat */
      c.save(); c.translate(0, bob);
      /* backpack and its hose */
      G.part(c, [[68, 92], [74, 84], [86, 82], [91, 88], [91, 116], [82, 123], [70, 119]], st, { lw: 1.3, seed: 72, hatchAng: 1.4 });
      G.cut(c, [[70, 100], [90, 100]], st, 0.8); G.cut(c, [[74, 88], [86, 88]], st, 0.6, { glint: 1 });
      tube(c, [[91, 96], [86, 92], [82, 96], [85, 104], [91, 108]], 3.6, 3.6, st, { lw: 0.8, hatch: false });
      /* torso, chest control box, waist seam */
      G.part(c, [[84, 86], [106, 82], [118, 90], [120, 114], [113, 124], [90, 125], [82, 114], [80, 96]], st, { lw: 1.6, round: 0.7, seed: 75, hatchAng: 0.8 });
      G.cut(c, [[82, 116], [100, 121], [119, 116]], st, 1.3);
      G.part(c, [[95, 93, 1], [111, 93, 1], [111, 107, 1], [95, 107, 1]], st, { lw: 1, pits: false, hatch: false });
      G.dot(c, 100, 98, 1.5, st.dark); G.dot(c, 106, 98, 1.5, st.dark); G.cut(c, [[98, 103], [109, 103]], st, 0.9);
      /* the belt hose: a thick tube from the chest box looping round the waist, six rings cut round it */
      var hose = [[97, 106.5], [88, 112], [90, 121.5], [103, 124.5], [117, 120]], hp = G.sp(hose, false, 6);
      tube(c, hose, 5, 5, st, { lw: 1, hatch: false, round: 0.5 });
      for (var h = 1; h <= 6; h++) { var q = pathAt(hp, h / 7); G.cut(c, [[q[0] - sin(q[2]) * 2.7, q[1] + cos(q[2]) * 2.7], [q[0] + sin(q[2]) * 2.7, q[1] - cos(q[2]) * 2.7]], st, 0.7); }
      /* the arm up, gripping the tendril: a deltoid-to-wrist taper, a ring seam at the elbow, a cuff at the wrist, a gloved hand */
      limb(c, 88, 94, 70, 97, 14, 12, st); seam(c, 88, 94, 70, 97, 1, 12, st);
      limb(c, 70, 97, 62, 77, 12, 10, st); cuff(c, 70, 97, 62, 77, 10, st);
      G.part(c, [[57, 76], [57, 68], [62, 64], [68, 66], [69, 74], [64, 80]], st, { lw: 1.2, round: 0.6, pits: false });
      fingers(c, 57.5, 76, -1.35, 10, 8, st);
      /* the free arm waves on a tap */
      var wv = p > 0.02 ? sin(s.poke * 0.0155) * 0.56 * clamp(s.poke / 120, 0, 1) * (1 - clamp((s.poke - 900) / 500, 0, 1)) : 0;
      limb(c, 115, 94, 132, 103, 14, 12, st); seam(c, 115, 94, 132, 103, 1, 12, st);
      rot(c, 132, 103, wv + sin(t * 0.0017) * 0.04, function () {
        limb(c, 132, 103, 138, 82, 12, 10, st); cuff(c, 132, 103, 138, 82, 10, st);
        G.part(c, [[133, 78], [135, 70], [141, 68], [146, 72], [145, 80], [138, 84]], st, { lw: 1.2, round: 0.6, pits: false });
        fingers(c, 134, 78, -1.3, 10, 8, st);
        G.cut(c, [[128, 99], [137, 99]], st, 1.1);
      });
      /* neck ring, the helmet about a third of his height, the visor an opening with a bewildered little face inside */
      G.part(c, [[90, 80, 1], [118, 80, 1], [121, 88], [87, 88]], st, { lw: 1.2, pits: false, hatch: false });
      G.part(c, [[86, 68], [88, 54], [98, 45], [112, 46], [121, 56], [123, 70], [116, 81], [102, 86], [90, 80]], st, { lw: 1.7, round: 1, seed: 78, hatchAng: 0.8 });
      pool(c, [[93, 57], [110, 54], [119, 62], [117, 76], [104, 80], [94, 72]], st, { deep: 0.6, lw: 0.8 });
      G.part(c, [[97, 60], [108, 58], [114, 64], [113, 73], [104, 77], [97, 70]], st, { lw: 0.7, pits: false, hatch: false, base: mix(st.base, st.light, 0.55), lift: 0.3 });
      var bl = blink(t, 6), lk2 = wander(t, 3), ey = 2.3 * (1 - bl * 0.85), pu = 1.05;
      [[102, 66], [110, 65]].forEach(function (q) {
        c.save(); c.fillStyle = "#f7f1e4"; c.beginPath(); c.ellipse(q[0], q[1], 2.3, ey, 0, 0, 7); c.fill(); c.strokeStyle = st.ink; c.lineWidth = 0.5; c.stroke();
        c.fillStyle = st.ink; c.beginPath(); c.arc(q[0] + lk2[0] * 0.9, q[1] + lk2[1] * 0.7, pu * (1 - bl * 0.6), 0, 7); c.fill(); c.restore();
      });
      G.cut(c, [[99, 61.5], [102, 59.5], [105, 61]], st, 0.7); G.cut(c, [[107.5, 60.5], [111, 59.5], [113, 62]], st, 0.7);
      G.hollow(c, [[105, 70.5], [108.5, 70.5], [109.5, 73.2], [106.8, 75], [104, 73.2]], st, { deep: 0.9, lw: 0.5 });
      /* the glint travelling across the glass, pinging on a tap */
      var gx = 84 + (t * 0.012) % 40;
      if (!G.sil) { c.save(); c.beginPath(); c.moveTo(93, 57); c.lineTo(110, 54); c.lineTo(119, 62); c.lineTo(117, 76); c.lineTo(104, 80); c.lineTo(94, 72); c.closePath(); c.clip(); c.strokeStyle = "rgba(255,255,255," + (0.35 + p * 0.5) + ")"; c.lineWidth = 2.4 + p * 3; c.lineCap = "round"; c.beginPath(); c.moveTo(gx, 84); c.lineTo(gx + 12, 52); c.stroke(); c.restore(); }
      star(c, 112, 58, 3 + p * 5, p > 0.1 ? p : 0);
      G.cut(c, [[89, 79], [103, 86], [119, 79]], st, 0.9);
      c.restore();
      c.restore();
      /* the front layer of foliage laps over the edges, in front of the figure */
      A_LEAVES.forEach(function (L, i) { if (L[0] === 2) lfx(L, i, st); });
    } };
  /* three leaves for the Green Man: oak (rounded lobes), hawthorn (five points), ivy (three points). kind 0, 1, 2 */
  function foliage(c, kind, x, y, ang, len, st, o) {
    o = o || {};
    var ca = cos(ang), sa = sin(ang), pts = [], veins = [], i;
    function at(u, v, flag) { return [x + ca * len * u - sa * len * v, y + sa * len * u + ca * len * v, flag ? 1 : 0]; }
    if (kind === 0) {
      /* oak: three big rounded lobes a side, the two sides out of step, cusps between them */
      var N = 22, W0 = 0.34;
      function oakW(u, ph) { return W0 * sin(PI * Math.pow(u, 0.72)) * (0.6 + 0.4 * Math.abs(sin(PI * (3 * u + ph)))); }
      for (i = 0; i <= N; i++) pts.push(at(i / N, -oakW(i / N, 0.55), i === 0));
      for (i = N; i >= 0; i--) pts.push(at(i / N, oakW(i / N, 0.95), i === N));
      veins.push([0.04, 0, 0.9, 0]);
      for (i = 0; i < 3; i++) { var lu = (i + 0.9) / 3.5; veins.push([lu - 0.14, 0, lu + 0.02, -oakW(lu + 0.04, 0.55) * 0.78], [lu - 0.12, 0, lu + 0.04, oakW(lu + 0.04, 0.95) * 0.78]); }
    } else if (kind === 1) {
      var an = [-1.2, -0.62, 0, 0.62, 1.2], ln = [0.62, 0.86, 1, 0.86, 0.62];
      pts.push(at(0, 0, 1));
      for (i = 0; i < 5; i++) {
        var a = an[i];
        if (i > 0) { var am = (an[i - 1] + a) / 2; pts.push([x + cos(ang + am) * len * 0.34, y + sin(ang + am) * len * 0.34, 1]); }
        pts.push([x + cos(ang + a) * len * ln[i], y + sin(ang + a) * len * ln[i], 1]);
        veins.push([0.04, 0, cos(a) * ln[i] * 0.9, sin(a) * ln[i] * 0.9]);
      }
    } else {
      pts = [at(0, 0, 1), at(0.18, -0.2, 1), at(0.4, -0.38, 1), at(0.55, -0.16, 1), at(1, 0, 1), at(0.55, 0.16, 1), at(0.4, 0.38, 1), at(0.18, 0.2, 1)];
      veins.push([0.04, 0, 0.92, 0], [0.2, 0, 0.4, -0.34], [0.2, 0, 0.4, 0.34]);
    }
    /* four grooves along every leaf, two each side of the midrib */
    veins.push([0.12, -0.06, 0.5, -0.09], [0.12, 0.06, 0.5, 0.09], [0.3, -0.13, 0.72, -0.12], [0.3, 0.13, 0.72, 0.12]);
    G.part(c, pts, st, { lw: o.lw || 0.9, steps: 1, pits: false, hatchGap: 2.6, hatchAng: ang + 1.2, base: o.base });
    if (!G.sil) { c.save(); c.strokeStyle = rgba(st.ink, 0.55); c.lineWidth = 0.45; c.lineCap = "round"; c.beginPath(); veins.forEach(function (v) { c.moveTo(x + ca * len * v[0] - sa * len * v[1], y + sa * len * v[0] + ca * len * v[1]); c.lineTo(x + ca * len * v[2] - sa * len * v[3], y + sa * len * v[2] + ca * len * v[3]); }); c.stroke(); c.restore(); }
  }
  /* an acorn: a stalk, a capped nut; ang is the way it hangs */
  function acorn(c, x, y, ang, sz, st) {
    if (G.sil) return;
    c.save(); c.translate(x, y); c.rotate(ang - PI / 2);
    c.strokeStyle = st.ink; c.lineWidth = 0.7; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, sz * 0.5); c.stroke();
    var g = c.createLinearGradient(-sz * 0.4, 0, sz * 0.4, 0); g.addColorStop(0, st.light); g.addColorStop(1, st.dark);
    c.fillStyle = g; c.beginPath(); c.moveTo(-sz * 0.38, sz * 0.7); c.quadraticCurveTo(-sz * 0.42, sz * 1.5, 0, sz * 1.9); c.quadraticCurveTo(sz * 0.42, sz * 1.5, sz * 0.38, sz * 0.7); c.closePath(); c.fill(); c.lineWidth = 0.7; c.stroke();
    c.fillStyle = mix(st.base, st.dark, 0.45); c.beginPath(); c.moveTo(-sz * 0.5, sz * 0.9); c.quadraticCurveTo(-sz * 0.45, sz * 0.4, 0, sz * 0.4); c.quadraticCurveTo(sz * 0.45, sz * 0.4, sz * 0.5, sz * 0.9); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = rgba(st.ink, 0.5); c.lineWidth = 0.4; for (var k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(k * sz * 0.2, sz * 0.5); c.lineTo(k * sz * 0.28, sz * 0.88); c.stroke(); }
    c.restore();
  }
  /* a ladybird: red shell split down the middle, black head, spots, legs that move as it walks */
  function ladybird(c, x, y, ang, sc, t) {
    if (G.sil) return;
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(sc, sc);
    c.strokeStyle = "#1a1412"; c.lineWidth = 0.7; c.lineCap = "round";
    for (var k = 0; k < 3; k++) { var sw = sin(t * 0.02 + k * 2.1) * 1.1; c.beginPath(); c.moveTo(-1.5 + k * 2, 2); c.lineTo(-2.2 + k * 2 + sw, 4.6); c.moveTo(-1.5 + k * 2, -2); c.lineTo(-2.2 + k * 2 - sw, -4.6); c.stroke(); }
    c.fillStyle = "#c9351f"; c.beginPath(); c.moveTo(3.4, 0); c.bezierCurveTo(3.4, -3.1, -4.2, -3.5, -4.2, 0); c.bezierCurveTo(-4.2, 3.5, 3.4, 3.1, 3.4, 0); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(3.4, 0); c.lineTo(-4.2, 0); c.stroke();
    c.fillStyle = "#1a1412"; [[-0.6, -1.5], [-2.4, -1.4], [-0.6, 1.5], [-2.4, 1.4]].forEach(function (d) { c.beginPath(); c.arc(d[0], d[1], 0.65, 0, 7); c.fill(); });
    c.beginPath(); c.arc(4, 0, 1.5, 0, 7); c.fill();
    c.restore();
  }

  /* ---------------------------------------------------------------- the Green Man */
  var GM_VINES = [
    { src: [92, 109], pts: [[80, 106], [68, 94], [63, 76], [68, 60], [78, 54], [82, 61]], w: 5.4, leaf: [0, 3], acorn: 2 },
    { src: [85, 121], pts: [[72, 125], [56, 118], [44, 104], [40, 88], [47, 75], [55, 80]], w: 6, leaf: [1, 4], acorn: 3 },
    { src: [89, 126], pts: [[78, 137], [63, 145], [49, 141], [43, 131], [49, 125]], w: 5, leaf: [2, 3], acorn: 1 },
    { src: [108, 109], pts: [[120, 104], [133, 96], [141, 80], [138, 64], [128, 57], [122, 63]], w: 5.4, leaf: [1, 4], acorn: 3 },
    { src: [115, 121], pts: [[129, 128], [146, 123], [156, 108], [158, 92], [153, 80], [145, 85]], w: 6, leaf: [0, 3], acorn: 2 },
    { src: [111, 126], pts: [[121, 140], [136, 148], [152, 145], [160, 135], [155, 127]], w: 5, leaf: [2, 4], acorn: 1 }
  ];
  B.greenman = { stone: "grey", spout: false, front: true,
    draw: function (c, s) {
      var st = S.grey, p = pk(s), t = s.t, i, r = G.rng(81), CX = 100, CY = 98, web = { base: mix(st.base, st.dark, 0.22), light: st.light, dark: st.dark, ink: st.ink, pit: st.pit };
      /* the leaves carry a moss-verdigris patina and sit a clear step darker than the warm, pale face */
      var lv = { base: mix(st.base, "#7d8a55", 0.4), light: mix(st.light, "#b9c78a", 0.3), dark: mix(st.dark, "#1f2b16", 0.55), ink: "#141c0f", pit: st.pit };
      var vn = { base: mix(lv.base, lv.light, 0.18), light: lv.light, dark: lv.dark, ink: lv.ink, pit: st.pit };
      var fc = { base: mix(st.base, "#e8d9bd", 0.5), light: mix(st.light, "#fff3dc", 0.4), dark: mix(st.dark, "#6b5a46", 0.25), ink: st.ink, pit: st.pit };
      c.save(); c.beginPath(); c.rect(0, 0, 200, 200); c.clip();
      /* the vault: the web between the ribs, then eight tapered ribs, each a roll between two fillets, running in from past the edge to the boss */
      G.part(c, [[0, 0, 1], [200, 0, 1], [200, 200, 1], [0, 200, 1]], web, { lw: 1.3, seed: 82, lift: 0.4, hatchAng: 0.3, hatchGap: 4 });
      var ribA = [];
      for (i = 0; i < 8; i++) {
        var th = i * PI / 4 + PI / 8, ct = cos(th), sn = sin(th), nx = -sn, ny = ct, r0 = 70, r1 = 150, w0 = 5, w1 = 11;
        G.part(c, [[CX + ct * r0 + nx * w0, CY + sn * r0 + ny * w0, 1], [CX + ct * r1 + nx * w1, CY + sn * r1 + ny * w1, 1], [CX + ct * r1 - nx * w1, CY + sn * r1 - ny * w1, 1], [CX + ct * r0 - nx * w0, CY + sn * r0 - ny * w0, 1]], st, { lw: 1.1, steps: 1, hatch: false, pits: false, lift: 0.9 });
        G.cut(c, [[CX + ct * 84, CY + sn * 84], [CX + ct * 112, CY + sn * 112], [CX + ct * 140, CY + sn * 140]], st, 1, { glint: 1 });
        ribA.push(th);
      }
      /* the boss, a raised disc with a rolled rim */
      var bossP = []; for (i = 0; i < 18; i++) { var ba = i / 18 * PI * 2, br = 86 + (r() - 0.5) * 3; bossP.push([CX + cos(ba) * br, CY + sin(ba) * br * 0.98]); }
      G.part(c, bossP, st, { lw: 1.5, seed: 83, lift: 0.7, round: 0.5, hatchAng: 0.4, hatchGap: 4 });
      var ring = []; for (i = 0; i <= 18; i++) { var ra = i / 18 * PI * 2; ring.push([CX + cos(ra) * 80, CY + sin(ra) * 79]); }
      G.cut(c, ring, st, 1, { glint: 1 });
      /* an outer row of big oak leaves behind the face, hash-seeded in size and angle; each rustles on its own phase */
      var lf = function (k, kind, x, y, a, len, ph) { foliage(c, kind, x, y, a + sin(t * 0.0017 + ph) * 0.08 + p * 0.22 * sin(t * 0.012 + ph), len, lv); };
      for (i = 0; i < 12; i++) {
        var a0 = i / 12 * PI * 2 + (r() - 0.5) * 0.3, len0 = 28 + r() * 12, ph0 = r() * 6.28, kd = (r(), 0);
        lf(i, kd, CX + cos(a0) * 44, CY + sin(a0) * 50, a0 + 0.35 + (r() - 0.5) * 0.5, len0, ph0);
      }
      /* three pairs of acorns tucked among them */
      [[-2.55, 0], [-0.55, 1], [1.2, 2]].forEach(function (q, k) { var ax = CX + cos(q[0]) * 66, ay = CY + sin(q[0]) * 70; acorn(c, ax, ay, 1.7 + k * 0.2, 6, st); acorn(c, ax + 6, ay + 2, 1.35 + k * 0.2, 5.4, st); });
      /* the face: mature, heavy-browed, creased; face and vines are drawn a tenth larger than their coordinates */
      c.save(); c.translate(CX, CY); c.scale(1.1, 1.1); c.translate(-CX, -CY);
      G.part(c, [[100, 52], [122, 58], [135, 78], [136, 104], [125, 128], [100, 137], [75, 128], [64, 104], [65, 78], [78, 58]], fc, { lw: 1.6, round: 0.9, seed: 83 + 1, hatchAng: 0.6, hatchGap: 3.6, lift: 0.6 });
      G.cut(c, [[78, 66], [100, 61], [122, 66]], st, 0.7); G.cut(c, [[74, 73], [100, 67.5], [126, 73]], st, 0.7); G.cut(c, [[82, 79], [100, 75], [118, 79]], st, 0.6);
      /* cheekbones, crow's feet, strong folds from nose to mouth */
      G.cut(c, [[68, 100], [74, 108], [84, 112]], st, 0.8, { glint: 1 }); G.cut(c, [[132, 100], [126, 108], [116, 112]], st, 0.8);
      [[-1, 0], [1, 0]].forEach(function (d) { var ex = 100 + d[0] * 24; for (var k = 0; k < 3; k++) G.cut(c, [[ex + d[0] * 6, 92 + k * 3], [ex + d[0] * 12, 90 + k * 5]], st, 0.5); });
      G.cut(c, [[88, 112], [80, 120], [80, 130]], st, 1.6, { glint: 1 }); G.cut(c, [[112, 112], [120, 120], [120, 130]], st, 1.6);
      /* deep-set eyes under heavy carved brows */
      var b = blink(t, 7), lk = wander(t, 4);
      G.eye(c, 85, 92, 4.4, st, { blink: b, look: lk, squint: 0.4 }); G.eye(c, 115, 92, 4.4, st, { blink: b, look: lk, squint: 0.4, tilt: PI });
      [[-1, 0], [1, 0]].forEach(function (d) {
        var m = d[0], X = function (x) { return 100 + m * (100 - x); };
        G.part(c, [[X(71), 90.5, 1], [X(76), 83], [X(86), 80.5], [X(97), 85.5], [X(97), 89.5], [X(88), 87.5], [X(78), 91]], fc, { lw: 1.1, pits: false, hatch: false, lift: 0.6 });
        G.cut(c, [[X(74), 85.5], [X(84), 82], [X(95), 86]], st, 0.9, { glint: 1 });
        G.cut(c, [[X(78), 91.5], [X(88), 88.5], [X(96), 90.5]], st, 0.7);
      });
      /* a broad nose with a real bridge and flared nostrils */
      G.part(c, [[95, 84], [105, 84], [107, 98], [113, 106], [111, 111], [104, 110.5], [100, 112], [96, 110.5], [89, 111], [87, 106], [93, 98]], fc, { lw: 1.2, round: 0.8, seed: 84, hatch: false, lift: 0.6 });
      G.hollow(c, [[90, 106.5], [95.5, 106], [96, 110], [91, 110.5]], st, { deep: 0.9, lw: 0.5 }); G.hollow(c, [[110, 106.5], [104.5, 106], [104, 110], [109, 110.5]], st, { deep: 0.9, lw: 0.5 });
      G.cut(c, [[97, 86], [95.5, 96]], st, 0.6); G.cut(c, [[103, 86], [104.5, 96]], st, 0.6); G.cut(c, [[88, 102], [86, 107]], st, 0.6); G.cut(c, [[112, 102], [114, 107]], st, 0.6);
      /* the mouth wide open, with the base of the tongue showing; the vines come out of its corners */
      pool(c, [[88, 122], [100, 119.5], [112, 122], [110, 131], [100, 134], [90, 131]], st, { deep: 1, lw: 0.8 });
      G.part(c, [[94, 130.5], [100, 128.5], [106, 130.5], [104, 133.5], [96, 133.5]], st, { lw: 0.7, pits: false, hatch: false, base: mix(st.base, st.light, 0.25), lift: 0.3 });
      G.part(c, [[85, 122], [92, 116.5], [100, 118.5], [108, 116.5], [115, 122], [112, 124.5], [100, 121.5], [88, 124.5]], fc, { lw: 1, pits: false, hatch: false, round: 0.5, lift: 0.6 });
      G.teeth(c, [[90, 121.5], [100, 120.5], [110, 121.5]], 6, 3.4, 1, st, {});
      G.part(c, [[86, 129.5], [100, 134], [114, 129.5], [112, 136], [100, 140.5], [88, 136]], fc, { lw: 1, pits: false, hatch: false, round: 0.5, lift: 0.6 });
      G.cut(c, [[92, 138], [100, 140], [108, 138]], st, 0.5);
      /* three vines from each side: mouth corners and nostrils, tapered, arching past the cheeks; a tap grows them and pops the acorns */
      var grow = 0.8 + p * 0.2 + sin(t * 0.0008) * 0.03;
      GM_VINES.forEach(function (v, k) {
        var pts = [v.src].concat(v.pts.map(function (q, j) { var u = (j + 1) / v.pts.length, sway = sin(t * 0.0014 + k * 1.7 + j) * 1.4 * u; return [v.src[0] + (q[0] - v.src[0]) * grow + sway, v.src[1] + (q[1] - v.src[1]) * grow - sway * 0.5]; }));
        tube(c, pts, v.w, 1.4, vn, { lw: 0.9, hatch: false, round: 0.5 });
        G.cut(c, pts.slice(0, -2), vn, 0.5, { glint: 1 });
        v.leaf.forEach(function (j, q) {
          var P = pts[Math.min(j, pts.length - 1)], P0 = pts[Math.max(j - 1, 0)], ang = Math.atan2(P[1] - P0[1], P[0] - P0[0]) + (q ? -0.8 : 0.8) + sin(t * 0.0017 + k + q) * 0.08;
          if (q === 0 || k % 2) foliage(c, 0, P[0], P[1], ang, (18 + (k + q) % 3) * grow, lv);
        });
        /* the acorn hangs from the vine; on a tap it pops off, flies, falls and grows back */
        var A = pts[Math.min(v.acorn, pts.length - 1)], ps = s.poke != null && s.poke >= 0 && s.poke < 1400 ? s.poke : -1, side = k < 3 ? -1 : 1;
        if (ps < 0) acorn(c, A[0], A[1], PI / 2 + side * 0.3, 5, st);
        else if (ps < 1000) { var ux = side * ps * 0.045, uy = -ps * 0.07 + ps * ps * 0.00011; c.save(); c.globalAlpha = 1 - ps / 1100; acorn(c, A[0] + ux, A[1] + uy, PI / 2 + side * 0.3 + ps * 0.006, 5, st); c.restore(); }
        else if (ps > 1150) { c.save(); c.translate(A[0], A[1]); c.scale((ps - 1150) / 250, (ps - 1150) / 250); acorn(c, 0, 0, PI / 2 + side * 0.3, 5, st); c.restore(); }
      });
      c.restore();
      /* a few leaves in front, at the temples and the corners of the brow, nothing before the eyes or cheeks; two under the chin */
      var rr = G.rng(97);
      [-2.7, -2.1, -1.0, -0.45].forEach(function (a1, k) { lf(k, 0, CX + cos(a1) * 37, CY + sin(a1) * 46, a1 + 0.75 + (rr() - 0.5) * 0.4, 17 + rr() * 6, rr() * 6.28); });
      [-1, 1].forEach(function (sd, k) { var a2 = PI / 2 + sd * 0.26; lf(k, 0, CX + cos(a2) * 20, 140, a2 + sd * 0.5 + (rr() - 0.5) * 0.3, 16 + rr() * 5, rr() * 6.28); });
      /* the ladybird walks in along one rib */
      var lu = (t % 16000) / 16000, tri = lu < 0.5 ? lu * 2 : 2 - lu * 2, lr = 104 - tri * 14, la = ribA[5], lx = CX + cos(la) * lr, ly = CY + sin(la) * lr;
      ladybird(c, lx, ly, la + (lu < 0.5 ? PI : 0), 1.0, t);
      /* a shaft of light slides across the boss every seven seconds */
      if (!G.sil) {
        var sx = lerp(-60, 260, (t % 7000) / 7000), sg = c.createLinearGradient(sx - 22, 0, sx + 22, 0);
        sg.addColorStop(0, "rgba(255,248,220,0)"); sg.addColorStop(0.5, "rgba(255,248,220,.24)"); sg.addColorStop(1, "rgba(255,248,220,0)");
        c.save(); c.translate(100, 100); c.rotate(0.45); c.translate(-100, -100); c.fillStyle = sg; c.fillRect(sx - 22 - 80, -60, 44 + 160, 320); c.restore();
      }
      c.restore();
    } };

  /* names for the page, and the spec order sheets use */
  G.BEAST_ORDER = ["notre", "stryge", "lionGreek", "lionEgypt", "chishou", "chiwen", "onigawara", "shachi", "makara", "kala", "yaksha", "singha", "chaac", "eagle", "astronaut", "greenman"];

  /* draw one beast at x,y (top-left), size px square. Returns the mouth in canvas units if it spouts. */
  G.beast = function (c, id, x, y, size, s) {
    var b = B[id]; if (!b) return null;
    s = s || {}; s.t = s.t || 0;
    c.save(); c.translate(x, y);
    var k = size / 200;
    if (s.flip) { c.translate(size, 0); c.scale(-k, k); G.light(true); } else c.scale(k, k);
    try { b.draw(c, s); } finally { c.restore(); G.light(false); }
    if (!b.spout || !b.mouth) return null;
    var m = b.mouth, mx = s.flip ? x + size - m[0] * k : x + m[0] * k;
    return { x: mx, y: y + m[1] * k, dx: (s.flip ? -1 : 1) * m[2], dy: m[3], k: k };
  };
})();
