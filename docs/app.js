/* app.js — the page: the live Paris hero, the toys, the bestiary and the map.
   Words come from GARG.T (written into the page by tools/build.py in English or Thai). */
(function () {
  "use strict";
  var G = window.GARG, T = G.T || {}, LANG = document.documentElement.lang || "en";
  var $ = function (id) { return document.getElementById(id); };
  var now = function () { return Date.now(); };
  var t0 = now();
  function tr(key, vars) { var s = T[key] || key; if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); }); return s; }
  function num(n, d) { return Number(n).toLocaleString(LANG === "th" ? "th-TH" : "en-US", { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d }); }

  /* ---------------------------------------------------------------- sound: a stone throat gurgling */
  var AC = null, soundOn = false;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } return AC; }
  G.gurgle = function (strength) {
    if (!soundOn || !ac()) return;
    var a = AC, t = a.currentTime, n = 5 + Math.round((strength || 1) * 6);
    for (var i = 0; i < n; i++) {
      var o = a.createOscillator(), g = a.createGain(), st = t + i * 0.07 + (i % 3) * 0.02, f = 180 + (i * 53) % 240;
      o.type = "sine"; o.frequency.setValueAtTime(f, st); o.frequency.exponentialRampToValueAtTime(f * 2.6, st + 0.06);
      g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.18, st + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.08);
      o.connect(g); g.connect(a.destination); o.start(st); o.stop(st + 0.1);
    }
  };
  G.tok = function () {
    if (!soundOn || !ac()) return;
    var a = AC, t = a.currentTime, b = a.createBuffer(1, a.sampleRate * 0.06, a.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (((i * 7919) % 2000) / 1000 - 1) * Math.pow(1 - i / d.length, 4);
    var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = b; f.type = "bandpass"; f.frequency.value = 1800 + ((t * 1000) % 600); g.gain.value = 0.5;
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t);
  };
  document.querySelectorAll("[data-sound]").forEach(function (b) {
    b.addEventListener("click", function () { soundOn = !soundOn; ac(); document.querySelectorAll("[data-sound]").forEach(function (x) { x.setAttribute("aria-pressed", soundOn); }); if (soundOn) G.gurgle(1); });
  });

  /* ---------------------------------------------------------------- the frame loop: draw only what is on screen */
  var toys = [];
  function toy(cv, hFn, draw, every) {
    if (!cv) return null;
    var o = { cv: cv, hFn: hFn, draw: draw, on: false, every: every || 1, idx: toys.length };
    toys.push(o);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { es.forEach(function (e) { o.on = e.isIntersecting; }); }, { rootMargin: "120px" }).observe(cv);
    else o.on = true;
    return o;
  }
  var fno = 0;
  function frame() {
    var t = now() - t0; fno++;
    toys.forEach(function (o) {
      if (!o.on) return;
      /* small cards share the frames: each redraws every few frames unless it was just tapped */
      if (o.every > 1 && !o.hot && (fno + o.idx) % o.every) return;
      var f = G.fit(o.cv, o.hFn);
      o.draw(f.c, f.w, f.h, G.reduced ? 4200 : t);
    });
    requestAnimationFrame(frame);
  }
  function pt(cv, e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

  /* ---------------------------------------------------------------- live weather: Paris first, then every pin */
  var PINS = G.PINS || [];
  var wx = { paris: null };
  function weather() {
    var places = [[48.853, 2.35]].concat(PINS.map(function (p) { return [p.lat, p.lon]; }));
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + places.map(function (p) { return p[0]; }).join(",") + "&longitude=" + places.map(function (p) { return p[1]; }).join(",") +
      "&current=precipitation,rain,showers,cloud_cover,wind_speed_10m,is_day,temperature_2m&timezone=auto";
    fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      var arr = Array.isArray(d) ? d : [d];
      wx.paris = arr[0] && arr[0].current;
      PINS.forEach(function (p, i) { var cur = arr[i + 1] && arr[i + 1].current; p.rain = cur ? (cur.precipitation || 0) + (cur.showers || 0) : 0; p.temp = cur && cur.temperature_2m; p.tz = arr[i + 1] && arr[i + 1].timezone; });
      heroNow(); mapRain();
    }).catch(function () { heroNow(); });
  }

  /* ---------------------------------------------------------------- hero */
  var hero = { offset: 0, rainOverride: null, burstUntil: 0, poke: -1, pokeAt: 0, who: "notre" };
  function parisClock(ms) { try { return new Intl.DateTimeFormat(LANG === "th" ? "th-TH" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(ms)); } catch (e) { return ""; } }
  function heroRain(t) {
    var live = wx.paris ? G.clamp(((wx.paris.precipitation || 0) + (wx.paris.showers || 0)) / 2.5, 0, 1) : 0;
    if (live > 0 && live < 0.25) live = 0.25;
    var r = hero.rainOverride == null ? live : hero.rainOverride;
    if (now() < hero.burstUntil) r = Math.max(r, G.clamp((hero.burstUntil - now()) / 1200, 0, 1));
    return r;
  }
  function heroNow() {
    var out = $("hero-now"); if (!out) return;
    var ms = now() + hero.offset * 3600000, raining = heroRain() > 0.05, live = hero.offset === 0 && hero.rainOverride == null;
    var key = raining ? (live ? "now_rain" : "now_rain_set") : (live ? "now_dry" : "now_dry_set");
    out.textContent = tr(key, { time: parisClock(ms), temp: wx.paris && hero.offset === 0 ? num(wx.paris.temperature_2m) + "°C" : "" });
  }
  toy($("hero"), function (w) { return Math.max(420, Math.min(window.innerHeight * 0.86, w * (w < 700 ? 1.7 : 0.58))); }, function (c, w, h, t) {
    var ms = now() + hero.offset * 3600000, rain = heroRain(t);
    var poke = hero.poke >= 0 ? now() - hero.pokeAt : -1; if (poke > 2200) { hero.poke = -1; poke = -1; }
    G.HERO.draw(c, w, h, { t: t, alt: G.sunAlt(48.853, 2.35, ms), moon: G.moonPhase(ms), rain: rain, wind: wx.paris ? (wx.paris.wind_speed_10m || 0) / 40 : 0.1,
      cloud: wx.paris ? (wx.paris.cloud_cover || 0) / 100 : 0.35, poke: poke, pokeWho: hero.who });
  });
  if ($("hero")) {
    $("hero").addEventListener("pointerdown", function (e) {
      var p = pt(this, e), who = G.HERO.hit(p[0], p[1]);
      if (who === "sky") { hero.burstUntil = now() + 3500; G.gurgle(1.2); }
      else { hero.who = who; hero.poke = 0; hero.pokeAt = now(); if (who === "notre") G.gurgle(1); }
      heroNow();
    });
  }
  var rainBtn = $("hero-rain");
  if (rainBtn) rainBtn.addEventListener("click", function () {
    var on = rainBtn.getAttribute("aria-pressed") !== "true";
    rainBtn.setAttribute("aria-pressed", on); hero.rainOverride = on ? 1 : null; if (on) G.gurgle(1.4); heroNow();
  });
  var tSlide = $("hero-time");
  if (tSlide) tSlide.addEventListener("input", function () { hero.offset = +tSlide.value; $("hero-time-l").textContent = parisClock(now() + hero.offset * 3600000); heroNow(); });
  if ($("hero-live")) $("hero-live").addEventListener("click", function () { hero.offset = 0; hero.rainOverride = null; if (tSlide) tSlide.value = 0; if (rainBtn) rainBtn.setAttribute("aria-pressed", "false"); $("hero-time-l").textContent = parisClock(now()); heroNow(); });
  if ($("hero-time-l")) $("hero-time-l").textContent = parisClock(now());
  setInterval(heroNow, 30000);

  /* ---------------------------------------------------------------- gargoyle or grotesque? */
  var SORT = G.SORT || [], sort = { i: 0, score: 0, done: 0, answered: null, at: 0, order: [] };
  (function () { var r = G.rng(Math.floor(now() / 86400000)); sort.order = SORT.map(function (_, i) { return i; }); for (var i = sort.order.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), x = sort.order[i]; sort.order[i] = sort.order[j]; sort.order[j] = x; } })();
  function sortCard() { return SORT[sort.order[sort.i % SORT.length]]; }
  toy($("cv-sort"), function (w) { return Math.min(420, w * 0.82); }, function (c, w, h, t) {
    var card = sortCard(); if (!card) return;
    var shown = sort.answered != null, rain = shown && card.spout ? 1 : 0;
    var sky = G.skyCols(30, rain * 0.6), g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = "#5f6e52"; c.fillRect(0, h * 0.93, w, h * 0.07);
    var s = Math.min(w * 0.8, h * 0.9), x = (w - s) / 2, y = h * 0.02, since = now() - sort.at;
    if (!shown && since < 400) { var u = G.ease(since / 400); x += (1 - u) * w * 0.6 * (sort.dir || 1); }
    var m = G.beast(c, card.id, x, y, s, { t: t, variant: card.variant, rain: rain, poke: shown ? Math.min(since, 1500) : -1 });
    if (m && rain) G.jet(c, m.x, m.y, m.dx * 0.3, m.dy * 0.3, 1, t, h * 0.94, { w: s / 40 });
    if (rain) G.rain(c, w, h, t, 0.7, 0.08, 4);
    if (shown) {
      var ok = sort.answered === card.spout;
      c.save(); c.globalAlpha = Math.min(1, since / 250); c.fillStyle = ok ? "#15803d" : "#b91c1c";
      c.beginPath(); c.arc(w - 34, 34, 22, 0, 7); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 4; c.lineCap = "round"; c.beginPath();
      if (ok) { c.moveTo(w - 44, 34); c.lineTo(w - 37, 42); c.lineTo(w - 24, 26); } else { c.moveTo(w - 42, 26); c.lineTo(w - 26, 42); c.moveTo(w - 26, 26); c.lineTo(w - 42, 42); }
      c.stroke(); c.restore();
    }
  });
  function sortShow() {
    var card = sortCard(); if (!card) return;
    $("sort-name").textContent = card.name; $("sort-where").textContent = card.where;
    $("sort-out").textContent = sort.answered == null ? tr("sort_ask") : (sort.answered === card.spout ? tr("sort_right") : tr("sort_wrong")) + " " + card.why;
    $("sort-score").textContent = tr("sort_score", { n: num(sort.score), of: num(sort.done) });
    $("sort-next").hidden = sort.answered == null;
    document.querySelectorAll("[data-sort]").forEach(function (b) { b.disabled = sort.answered != null; });
  }
  document.querySelectorAll("[data-sort]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (sort.answered != null) return;
      var card = sortCard(); sort.answered = b.getAttribute("data-sort") === "spout"; sort.done++; if (sort.answered === card.spout) sort.score++;
      sort.at = now(); if (card.spout) G.gurgle(1); sortShow();
    });
  });
  if ($("sort-next")) $("sort-next").addEventListener("click", function () { sort.i++; sort.answered = null; sort.at = now(); sort.dir = 1; sortShow(); });
  if ($("cv-sort")) {
    var sx0 = null;
    $("cv-sort").addEventListener("pointerdown", function (e) { sx0 = e.clientX; });
    $("cv-sort").addEventListener("pointerup", function (e) {
      if (sx0 == null) return; var dx = e.clientX - sx0; sx0 = null;
      if (sort.answered == null && Math.abs(dx) > 50) { var b = document.querySelector('[data-sort="' + (dx < 0 ? "spout" : "grotesque") + '"]'); if (b) b.click(); }
      else if (sort.answered != null) $("sort-next").click();
      else { sort.at = now() - 1600; }
    });
    sortShow();
  }

  /* ---------------------------------------------------------------- throw it clear */
  var th = { L: 0.9, rain: 40 };
  toy($("cv-throw"), function (w) { return Math.max(320, Math.min(460, w * 0.64)); }, function (c, w, h, t) { G.SCENE.throw.draw(c, w, h, { t: t, L: th.L, rain: th.rain }); });
  function throwOut() {
    var m = G.throwCalc({ rain: th.rain, L: th.L, height: 10, area: 40 });
    $("throw-L-l").textContent = num(th.L, 2) + " m"; $("throw-rain-l").textContent = num(th.rain) + " mm/h";
    $("throw-out").textContent = th.rain < 0.5 ? tr("throw_dry") : m.wet ? tr("throw_wet", { l: num(m.litres, 2) }) : tr("throw_out", { l: num(m.litres, 2), v: num(m.v, 2), d: num(m.d * 100, 1), x: num(m.x, 2), land: num(m.land, 2) });
  }
  ["throw-L", "throw-rain"].forEach(function (id) { var el = $(id); if (el) el.addEventListener("input", function () { th.L = +$("throw-L").value; th.rain = +$("throw-rain").value; throwOut(); }); });
  if ($("throw-out")) throwOut();

  /* ---------------------------------------------------------------- the dragon of Rouen */
  var ro = { step: 0, at: 0 };
  toy($("cv-rouen"), function (w) { return Math.max(260, Math.min(420, w * 0.56)); }, function (c, w, h, t) { G.SCENE.rouen.draw(c, w, h, { t: t, step: ro.step, u: G.ease((now() - ro.at) / 1400) }); });
  function rouenShow() {
    $("rouen-out").textContent = tr("rouen_" + ro.step);
    document.querySelectorAll("[data-rouen]").forEach(function (b) { b.setAttribute("aria-pressed", +b.getAttribute("data-rouen") === ro.step); });
  }
  document.querySelectorAll("[data-rouen]").forEach(function (b) { b.addEventListener("click", function () { ro.step = +b.getAttribute("data-rouen"); ro.at = now(); rouenShow(); if (ro.step === 4 || ro.step === 0) G.gurgle(1); }); });
  if ($("cv-rouen")) { $("cv-rouen").addEventListener("click", function () { ro.step = (ro.step + 1) % 5; ro.at = now(); rouenShow(); }); rouenShow(); }

  /* ---------------------------------------------------------------- the face that ate itself */
  var ki = { eat: 0, play: false };
  toy($("cv-kirti"), function (w) { return Math.max(280, Math.min(420, w * 0.58)); }, function (c, w, h, t) {
    if (ki.play) { ki.eat = Math.min(1, ki.eat + 0.004); $("kirti-eat").value = ki.eat * 100; if (ki.eat >= 1) { ki.play = false; kiOut(); } }
    G.SCENE.kirti.draw(c, w, h, { t: t, eat: ki.eat });
  });
  function kiOut() { $("kirti-out").textContent = ki.eat >= 0.98 ? tr("kirti_done") : ki.eat > 0.02 ? tr("kirti_mid") : tr("kirti_start"); }
  if ($("kirti-eat")) $("kirti-eat").addEventListener("input", function () { ki.eat = +this.value / 100; ki.play = false; kiOut(); });
  if ($("kirti-play")) $("kirti-play").addEventListener("click", function () { if (ki.eat >= 1) ki.eat = 0; ki.play = true; kiOut(); });
  if ($("kirti-out")) kiOut();

  /* ---------------------------------------------------------------- a thousand dragons */
  var fb = { rain: 0.8 };
  toy($("cv-forbidden"), function (w) { return Math.max(280, Math.min(460, w * 0.58)); }, function (c, w, h, t) { G.SCENE.forbidden.draw(c, w, h, { t: t, rain: fb.rain }); });
  if ($("forbidden-rain")) $("forbidden-rain").addEventListener("input", function () { fb.rain = +this.value / 100; $("forbidden-out").textContent = fb.rain > 0.05 ? tr("forbidden_wet") : tr("forbidden_dry"); });

  /* ---------------------------------------------------------------- hiti: fill a pot */
  var hi = { fill: 0, pots: 0, holding: false };
  toy($("cv-hiti"), function (w) { return Math.max(280, Math.min(440, w * 0.6)); }, function (c, w, h, t) {
    if (hi.holding || hi.fill > 0) { hi.fill += hi.holding ? 0.006 : 0; if (hi.fill >= 1) { hi.fill = 0; hi.pots++; $("hiti-out").textContent = tr("hiti_full", { n: num(hi.pots) }); G.gurgle(0.6); } }
    G.SCENE.hiti.draw(c, w, h, { t: t, fill: hi.fill });
  });
  if ($("cv-hiti")) {
    var hv = $("cv-hiti");
    hv.addEventListener("pointerdown", function () { hi.holding = true; });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { hv.addEventListener(ev, function () { hi.holding = false; }); });
  }

  /* ---------------------------------------------------------------- carve one */
  var cv = { id: "notre", block: null, mask: null, px: 0, cleared: 0, done: false, at: 0, chips: [] };
  function carveReset(id) {
    cv.id = id || cv.id; cv.px = 600; cv.block = G.makeBlock(cv.px); cv.done = false; cv.cleared = 0; cv.chips = [];
    document.querySelectorAll("[data-carve]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-carve") === cv.id); });
    $("carve-out").textContent = tr("carve_start");
  }
  toy($("cv-carve"), function (w) { return Math.max(300, Math.min(440, w * 0.84)); }, function (c, w, h, t) {
    var st = { t: t, id: cv.id, block: cv.block, poke: cv.done ? (now() - cv.at) % 2400 : -1 };
    G.SCENE.carve.draw(c, w, h, st); cv.box = st.box;
    cv.chips = cv.chips.filter(function (k) { return now() - k.at < 700; });
    cv.chips.forEach(function (k) { var u = (now() - k.at) / 700; c.fillStyle = "rgba(230,220,200," + (1 - u) + ")"; c.fillRect(k.x + k.vx * u * 60, k.y + k.vy * u * 60 + u * u * 80, 3, 3); });
  });
  function chip(e) {
    if (!cv.box || !cv.block || cv.done) return;
    var p = pt($("cv-carve"), e), b = cv.box, u = (p[0] - b[0]) / b[2], v = (p[1] - b[1]) / b[2];
    if (u < -0.05 || u > 1.05 || v < -0.05 || v > 1.05) return;
    var c = cv.block.getContext("2d"); c.globalCompositeOperation = "destination-out";
    var r = cv.px * 0.06; c.beginPath(); for (var k = 0; k < 7; k++) { var a = k / 7 * Math.PI * 2, rr = r * (0.7 + ((k * 37) % 10) / 22); c.lineTo(u * cv.px + Math.cos(a) * rr, v * cv.px + Math.sin(a) * rr); } c.fill();
    c.globalCompositeOperation = "source-over";
    for (var i = 0; i < 4; i++) cv.chips.push({ x: p[0], y: p[1], vx: Math.cos(i * 1.7 + p[0]) , vy: -Math.abs(Math.sin(i * 2.3 + p[1])), at: now() });
    if ((cv.n = (cv.n || 0) + 1) % 3 === 0) G.tok();
    if (cv.n % 10 === 0) {
      var d = c.getImageData(0, 0, cv.px, cv.px).data, clear = 0; for (var j = 3; j < d.length; j += 4 * 37) if (d[j] < 20) clear++;
      cv.cleared = clear / (d.length / 4 / 37);
      $("carve-out").textContent = cv.cleared > 0.8 ? tr("carve_done") : tr("carve_mid", { p: num(cv.cleared * 100) });
      if (cv.cleared > 0.8) { cv.done = true; cv.at = now(); cv.block = null; G.gurgle(1); }
    }
  }
  if ($("cv-carve")) {
    var down = false, cc = $("cv-carve");
    cc.addEventListener("pointerdown", function (e) { down = true; cc.setPointerCapture && cc.setPointerCapture(e.pointerId); chip(e); });
    cc.addEventListener("pointermove", function (e) { if (down) chip(e); });
    ["pointerup", "pointercancel"].forEach(function (ev) { cc.addEventListener(ev, function () { down = false; }); });
    document.querySelectorAll("[data-carve]").forEach(function (b) { b.addEventListener("click", function () { carveReset(b.getAttribute("data-carve")); }); });
    carveReset("notre");
  }

  /* ---------------------------------------------------------------- find the astronaut */
  var hu = { found: {} };
  toy($("cv-hunt"), function (w) { return Math.max(300, Math.min(520, w * 0.72)); }, function (c, w, h, t) { G.SCENE.hunt.draw(c, w, h, { t: t, found: hu.found }); });
  if ($("cv-hunt")) $("cv-hunt").addEventListener("click", function (e) {
    var p = pt(this, e), id = G.huntHit(p[0], p[1]);
    if (id && !hu.found[id]) { hu.found[id] = true; G.gurgle(0.5); }
    var n = Object.keys(hu.found).length;
    $("hunt-out").textContent = id ? tr("hunt_" + id) + (n === 2 ? " " + tr("hunt_both") : "") : tr("hunt_miss", { n: num(n) });
  });

  /* ---------------------------------------------------------------- the map */
  var mp = { sel: -1, hits: [] };
  toy($("cv-map"), function (w) { return Math.max(260, w * 0.52); }, function (c, w, h, t) {
    var st = { t: t, land: G.LAND, pins: PINS, sel: mp.sel }; G.SCENE.map.draw(c, w, h, st); mp.hits = st.hits || [];
  });
  function mapRain() {
    var wet = PINS.filter(function (p) { return p.rain > 0; }).map(function (p) { return p.place; });
    var el = $("map-rain"); if (el) el.textContent = wet.length ? tr("map_wet", { list: wet.join(LANG === "th" ? " · " : ", ") }) : tr("map_dry");
    if (mp.sel >= 0) mapCard();
  }
  function mapCard() {
    var p = PINS[mp.sel], el = $("map-card"); if (!p || !el) return;
    var local = "";
    try { if (p.tz) local = new Intl.DateTimeFormat(LANG === "th" ? "th-TH" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: p.tz }).format(new Date()); } catch (e) { }
    el.innerHTML = "";
    var h = document.createElement("h3"); h.textContent = p.name; el.appendChild(h);
    var w = document.createElement("p"); w.className = "mute small"; w.textContent = p.place + (local ? " · " + local : "") + (p.temp != null ? " · " + num(p.temp) + "°C" : "") + (p.rain > 0 ? " · " + tr("raining") : ""); el.appendChild(w);
    var q = document.createElement("p"); q.textContent = p.line; el.appendChild(q);
    var a = document.createElement("a"); a.href = "#b-" + p.id + (p.variant ? "-" + p.variant : ""); a.textContent = tr("map_more"); el.appendChild(a);
  }
  if ($("cv-map")) $("cv-map").addEventListener("click", function (e) {
    var p = pt(this, e), best = -1, bd = 1e9;
    mp.hits.forEach(function (h) { var d = Math.hypot(p[0] - h[0], p[1] - h[1]); if (d < h[2] * 1.4 && d < bd) { bd = d; best = h[3]; } });
    if (best >= 0) { mp.sel = best; mapCard(); G.gurgle(0.4); }
  });

  /* ---------------------------------------------------------------- the bestiary: every card answers a tap */
  document.querySelectorAll("canvas[data-beast]").forEach(function (el) {
    var id = el.getAttribute("data-beast"), variant = el.getAttribute("data-variant") || undefined, b = G.BEASTS[id], o = { poke: -1, at: 0 };
    var card = toy(el, function (w) { return w; }, function (c, w, h, t) {
      var poke = o.poke >= 0 ? now() - o.at : -1; if (poke > 2200) { o.poke = -1; poke = -1; card.hot = false; }
      var wet = poke >= 0 && b && b.spout ? 1 : 0;
      var sky = G.skyCols(28, wet * 0.5), g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]); c.fillStyle = g; c.fillRect(0, 0, w, h);
      var m = G.beast(c, id, w * 0.04, h * 0.02, w * 0.92, { t: t, poke: poke, rain: wet, variant: variant });
      if (m && wet) G.jet(c, m.x, m.y, m.dx * 0.25, m.dy * 0.25, 1 - poke / 2400, t, h, { w: w / 45 });
    }, 4);
    el.addEventListener("click", function () { o.poke = 0; o.at = now(); card.hot = true; if (b && b.spout) G.gurgle(0.8); });
  });

  /* Drawn | Photo on each card */
  document.querySelectorAll("[data-flip]").forEach(function (bt) {
    bt.addEventListener("click", function () {
      var pic = bt.parentNode, on = bt.getAttribute("aria-pressed") !== "true", fig = pic.querySelector(".ph"), cv = pic.querySelector("canvas");
      bt.setAttribute("aria-pressed", on); bt.textContent = on ? tr("drawn") : tr("photo");
      if (fig) fig.hidden = !on; if (cv) cv.hidden = on;
    });
  });

  /* every other drawing on the page answers a tap too */
  document.querySelectorAll(".brand svg, .wiggle").forEach(function (el) {
    el.addEventListener("click", function () { el.classList.remove("boing"); void el.offsetWidth; el.classList.add("boing"); });
  });

  fetch((document.documentElement.getAttribute("data-root") || "") + "land.json").then(function (r) { return r.json(); }).then(function (l) { G.LAND = l; }).catch(function () { });
  weather(); setInterval(weather, 10 * 60000);
  requestAnimationFrame(frame);
})();
