# -*- coding: utf-8 -*-
"""build.py: write docs/index.html (English) and docs/th/index.html (Thai) from one source.

All the words live here, in pairs. The drawings and toys are docs/pen.js, beasts.js,
beasts-east.js, scenes.js, hero.js and app.js; the page hands app.js its strings as GARG.T.
    python3 tools/build.py
"""
import html
import ogcards
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DOCS = os.path.join(ROOT, "docs")
sys.path.insert(0, HERE)
from bands import band  # noqa: E402
from copy_text import (SITE, TITLE, SUB, DESC, NAV, SLAB, BEASTS, SORT_WHY, STORIES, WORDS,  # noqa: E402
                       BANDS, PHOTOS, STORY_PHOTOS, FIGS, SOURCES, MADE, T_JS, P)

CREDITS = {c["file"]: c for c in json.load(open(os.path.join(ROOT, "research", "img", "credits.json"), encoding="utf-8"))}

L = "en"


def fact_sources():
    """Every page the research opened, from research/facts.json, labelled by site and title."""
    from urllib.parse import urlparse, unquote
    path = os.path.join(ROOT, "research", "facts.json")
    if not os.path.exists(path):
        return []
    seen, out = set(), []
    for f in json.load(open(path, encoding="utf-8")):
        u = (f.get("url") or "").strip()
        if not u or u in seen or f.get("claim", "").startswith("NOT FOUND"):
            continue
        seen.add(u)
        h = urlparse(u)
        host = h.netloc.replace("www.", "")
        if host.endswith("wikipedia.org"):
            label = f"Wikipedia ({host.split('.')[0]}): " + unquote(h.path.rsplit('/', 1)[-1]).replace("_", " ")
        elif host.endswith("wikisource.org"):
            label = "Viollet-le-Duc, Dictionnaire raisonné (Wikisource)"
        else:
            tail = unquote(h.path.strip("/").rsplit("/", 1)[-1]).replace("-", " ").replace("_", " ")
            label = host + (": " + tail[:60] if tail and not tail.isdigit() and "." not in tail[-5:] else "")
        out.append((label, u))
    return sorted(out, key=lambda x: x[0].lower())


def e(x):
    return html.escape("" if x is None else str(x))


def t(pair):
    """pair = (english, thai)"""
    if isinstance(pair, str):
        return pair
    return pair[1] if L == "th" else pair[0]


def cred(who, lic, url=""):
    w = f'<a href="{e(url)}">{e(who)}</a>' if url else e(who)
    return f"{w} · {e(lic)}"


def credit_of(img):
    c = CREDITS[img]
    return cred(c["author"], c["license"], c["source_url"])


def b(key, r):
    if key not in BANDS:
        return ""
    img, kick, head, line, cls = BANDS[key]
    if not os.path.exists(os.path.join(DOCS, "img", img)):
        return ""
    return band(r + "img/" + img, kicker=t(kick), head=t(head), line=t(line), credit=credit_of(img), cls=cls)


def fig(key, r):
    """a photograph inside a section, small, with its credit"""
    if key not in FIGS:
        return ""
    img, cap = FIGS[key]
    return (f'<figure class="photo"><img loading="lazy" src="{r}img/t/{img}" alt="{e(t(cap))}">'
            f'<figcaption>{e(t(cap))} <span class="lic">{credit_of(img)}</span></figcaption></figure>')


def rng(i, lab, lo, hi, val, step=1):
    return (f'<label class="rng"><span>{e(lab)} <output id="{i}-l"></output></span>'
            f'<input type="range" id="{i}" min="{lo}" max="{hi}" value="{val}" step="{step}"></label>')


def toy(id_, head, lede, body):
    return f'<section id="{id_}" class="toy"><h2>{e(t(head))}</h2><p class="lede">{e(t(lede))}</p>{body}</section>'


def page():
    r = "../" if L == "th" else ""
    here = SITE + ("th/" if L == "th" else "")
    title = t(TITLE)
    navh = "".join(f'<a href="#{a}">{e(t(lab))}</a>' for a, lab in NAV)
    langsw = (f'<a href="{r}" hreflang="en" lang="en"{" aria-current=page" if L == "en" else ""}>EN</a> '
              f'<a href="{r}th/" hreflang="th" lang="th"{" aria-current=page" if L == "th" else ""}>ไทย</a>')
    slab = "".join(f'<div class="wiggle"><b>{e(n)}</b><span>{e(t(lab))}</span><i>{e(t(m))}</i></div>' for n, lab, m in SLAB)

    # the bestiary, grouped by region; each card is a live canvas that answers a tap
    regions = []
    for reg, items in BEASTS:
        cards = []
        for bz in items:
            vid = bz["id"] + ("-" + bz["variant"] if bz.get("variant") else "")
            tag = t(P["spouts"]) if bz["spout"] else t(P["dry"])
            ph = PHOTOS.get(vid)
            phh = ""
            if ph:
                c = CREDITS[ph]
                phh = (f'<figure class="ph" hidden><img loading="lazy" src="{r}img/t/{ph}" alt="{e(c["what"])}">'
                       f'<figcaption>{credit_of(ph)}</figcaption></figure>'
                       f'<button type="button" class="flip" data-flip aria-pressed="false">{e(t(T_JS["photo"]))}</button>')
            cards.append(
                f'<article class="beast" id="b-{vid}"><div class="pic"><canvas data-beast="{bz["id"]}"'
                + (f' data-variant="{bz["variant"]}"' if bz.get("variant") else "")
                + f' role="img" aria-label="{e(t(bz["name"]))}"></canvas>{phh}</div>'
                f'<div class="bt"><span class="tag{" wet" if bz["spout"] else ""}">{e(tag)}</span>'
                f'<h3>{e(t(bz["name"]))}</h3><p class="where">{e(t(bz["place"]))}</p><p>{e(t(bz["line"]))}</p></div></article>')
        regions.append(f'<h3 class="region">{e(t(reg))}</h3><div class="grid">{"".join(cards)}</div>')
    bestiary = "".join(regions)

    def story(w, h, p):
        ph = STORY_PHOTOS.get(h[0])
        img = (f'<img class="sph" loading="lazy" src="{r}img/t/{ph}" alt="{e(CREDITS[ph]["what"])}"><span class="lic">{credit_of(ph)}</span>') if ph else ""
        return f'<article class="story">{img}<span class="when">{e(t(w))}</span><h3>{e(t(h))}</h3><p>{e(t(p))}</p></article>'
    stories = "".join(story(w, h, p) for w, h, p in STORIES)
    words = "".join(f'<li><b lang="{lg}">{e(wd)}</b> <span class="mute">{e(t(lang_))}</span> {e(t(gl))}</li>' for wd, lg, lang_, gl in WORDS)
    rouen_btns = "".join(f'<button type="button" class="btn ghost" data-rouen="{i}" aria-pressed="{"true" if i == 0 else "false"}">{i + 1}</button>' for i in range(5))
    carve_btns = "".join(f'<button type="button" class="btn coat" data-carve="{k}" aria-pressed="false">{e(t(lab))}</button>' for k, lab in P["carve_pick"])
    srcs = "".join(f'<li><a href="{e(u)}">{e(n)}</a></li>' for n, u in SOURCES + fact_sources())
    made = "".join(f'<li><b>{e(n)}</b> <span class="lic">{e(lic)}</span><br>{e(t(what))}</li>' for n, lic, what in MADE)

    # what app.js needs: strings, the sorter deck, the map pins
    pins, sortdeck = [], []
    for reg, items in BEASTS:
        for bz in items:
            if bz.get("lat") is not None:
                pins.append({"id": bz["id"], "variant": bz.get("variant"), "lat": bz["lat"], "lon": bz["lon"],
                             "name": t(bz["name"]), "place": t(bz["short"]), "line": t(bz["line"])})
            sortdeck.append({"id": bz["id"], "variant": bz.get("variant"), "spout": bz["spout"],
                             "name": t(bz["name"]), "where": t(bz["place"]), "why": t(SORT_WHY[bz["id"] + ("-" + bz["variant"] if bz.get("variant") else "")])})
    js = ("window.GARG=window.GARG||{};GARG.T=" + json.dumps({k: t(v) for k, v in T_JS.items()}, ensure_ascii=False)
          + ";GARG.PINS=" + json.dumps(pins, ensure_ascii=False) + ";GARG.SORT=" + json.dumps(sortdeck, ensure_ascii=False) + ";")
    js = js.replace("</", "<\\/")
    css = open(os.path.join(HERE, "bands.css"), encoding="utf-8").read() + open(os.path.join(HERE, "site.css"), encoding="utf-8").read()
    desc = t(DESC)
    ld = {"@context": "https://schema.org", "@type": "WebPage", "name": title, "description": desc, "url": here, "inLanguage": L,
          "image": SITE + "card.jpg", "license": "https://creativecommons.org/licenses/by/4.0/"}

    return f"""<!doctype html><html lang="{L}" data-root="{r}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="google" content="notranslate">
<title>{e(title)} · {e(t(SUB))}</title>
<meta name="description" content="{e(desc)}">
<meta name="theme-color" content="#1f2433">
<link rel="canonical" href="{here}">
<link rel="alternate" hreflang="en" href="{SITE}"><link rel="alternate" hreflang="th" href="{SITE}th/"><link rel="alternate" hreflang="x-default" href="{SITE}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Gargoyles, Drawn · การ์กอยล์ วาดด้วยคณิต">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{here}">
<meta property="og:image" content="{SITE}card.jpg"><meta property="og:image:secure_url" content="{SITE}card.jpg"><meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{e(t(P["card_alt"]))}">
<meta property="og:locale" content="{t(("en_US", "th_TH"))}"><meta property="og:locale:alternate" content="{t(("th_TH", "en_US"))}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{SITE}card.jpg">
<link rel="icon" href="{r}icon.svg" type="image/svg+xml">
<link rel="alternate" type="text/plain" href="{SITE}llms.txt" title="llms.txt">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<style>{css}</style>
</head><body>
<header class="top"><div class="in">
<a class="brand" href="{r}{"th/" if L == "th" else ""}"><svg viewBox="0 0 40 28" aria-hidden="true"><path d="M2 8h12l4 4h10l6 3-6 3 3 2-7-1-4 2H4z" fill="currentColor"/><circle cx="27" cy="13.5" r="1.4" fill="#fff"/><path d="M33 18q2 5 1 9" stroke="#3b82d6" stroke-width="2" fill="none" stroke-linecap="round"/></svg> {e(t(("Gargoyles", "การ์กอยล์")))} <span class="th">{e(t(("การ์กอยล์", "Gargoyles")))}</span></a>
<nav aria-label="{e(t(P["sections"]))}">{navh}</nav>
<span class="langsw">{langsw}</span>
</div></header>
<section class="hero" aria-label="{e(t(P["hero_label"]))}">
<canvas id="hero" role="img" aria-label="{e(t(P["hero_alt"]))}"></canvas>
<div class="hero-t">
<span class="kicker">{e(t(P["kicker"]))}</span>
<h1>{e(title)}</h1>
<p class="lede">{e(t(P["lede"]))}</p>
<p class="hint">{e(t(P["hint"]))}</p>
</div>
</section>
<div class="deck"><div class="ctl">
<label class="rng"><span>{e(t(P["paris_time"]))} <output id="hero-time-l"></output></span><input type="range" id="hero-time" min="-12" max="12" value="0" step="0.25"></label>
<div class="btns"><button type="button" id="hero-live" class="btn">{e(t(P["now"]))}</button>
<button type="button" id="hero-rain" class="btn ghost" aria-pressed="false">{e(t(P["rain"]))}</button>
<button type="button" class="btn ghost" data-sound aria-pressed="false">{e(t(P["sound"]))}</button></div>
</div><p class="now" id="hero-now" aria-live="polite"></p></div>
<main>
<div class="slab">{slab}</div>

{toy("sort", P["sort_h"], P["sort_lede"], f'''<div class="pair"><div class="stage"><canvas id="cv-sort" role="img" aria-label="{e(t(P["sort_alt"]))}"></canvas></div>
<div class="side"><p class="kick" id="sort-where"></p><h3 id="sort-name"></h3>
<div class="btns"><button type="button" class="btn" data-sort="spout">{e(t(P["sort_spout"]))}</button><button type="button" class="btn ghost" data-sort="grotesque">{e(t(P["sort_dry"]))}</button></div>
<p class="out" id="sort-out" aria-live="polite"></p><p class="mute small" id="sort-score"></p>
<button type="button" class="btn coat" id="sort-next" hidden>{e(t(P["next"]))}</button></div></div>
<div class="defs">{"".join(f'<div class="def"><b>{e(t(a))}</b><p>{e(t(bb))}</p></div>' for a, bb in P["defs"])}</div>''')}

{toy("throw", P["throw_h"], P["throw_lede"], f'''<div class="stage"><canvas id="cv-throw" role="img" aria-label="{e(t(P["throw_alt"]))}"></canvas></div>
<div class="ctl">{rng("throw-L", t(P["throw_len"]), 0, 2, 0.9, 0.05)}{rng("throw-rain", t(P["throw_rain"]), 0, 100, 40, 1)}</div>
<p class="out" id="throw-out" aria-live="polite"></p>
<div class="eqs">{"".join(f'<div class="eq"><span class="k">{e(t(k))}</span><code>{e(c)}</code><p>{e(t(p))}</p></div>' for k, c, p in P["throw_eqs"])}</div>
<p>{e(t(P["throw_after"]))}</p>{fig("throw", r)}''')}

{b("notre-dame", r)}

{toy("rouen", P["rouen_h"], P["rouen_lede"], f'''<div class="stage"><canvas id="cv-rouen" role="img" aria-label="{e(t(P["rouen_alt"]))}"></canvas></div>
<div class="ctl"><div class="btns">{rouen_btns}</div></div><p class="out" id="rouen-out" aria-live="polite"></p>
<p class="mute small">{e(t(P["rouen_after"]))}</p>{fig("rouen", r)}''')}

<section id="world" class="toy"><h2>{e(t(P["world_h"]))}</h2><p class="lede">{e(t(P["world_lede"]))}</p>
<div class="stage map"><canvas id="cv-map" role="img" aria-label="{e(t(P["map_alt"]))}"></canvas></div>
<p class="out" id="map-rain" aria-live="polite"></p><div class="mapcard" id="map-card"><p class="mute">{e(t(P["map_pick"]))}</p></div>
<div id="beasts">{bestiary}</div></section>

{b("forbidden", r)}

{toy("dragons", P["forbidden_h"], P["forbidden_lede"], f'''<div class="stage"><canvas id="cv-forbidden" role="img" aria-label="{e(t(P["forbidden_alt"]))}"></canvas></div>
<div class="ctl">{rng("forbidden-rain", t(P["rain"]), 0, 100, 80, 1)}</div><p class="out" id="forbidden-out" aria-live="polite">{e(t(P["forbidden_wet_static"]))}</p>
<p>{e(t(P["forbidden_after"]))}</p>''')}

{toy("kirti", P["kirti_h"], P["kirti_lede"], f'''<div class="stage dark"><canvas id="cv-kirti" role="img" aria-label="{e(t(P["kirti_alt"]))}"></canvas></div>
<div class="ctl">{rng("kirti-eat", t(P["kirti_eat"]), 0, 100, 0, 1)}<div class="btns"><button type="button" class="btn" id="kirti-play">{e(t(P["kirti_play"]))}</button></div></div>
<p class="out" id="kirti-out" aria-live="polite"></p><p>{e(t(P["kirti_after"]))}</p>''')}

{b("hiti", r)}

{toy("hiti", P["hiti_h"], P["hiti_lede"], f'''<div class="stage"><canvas id="cv-hiti" role="img" aria-label="{e(t(P["hiti_alt"]))}"></canvas></div>
<p class="out" id="hiti-out" aria-live="polite">{e(t(P["hiti_start"]))}</p><p>{e(t(P["hiti_after"]))}</p>''')}

{toy("carve", P["carve_h"], P["carve_lede"], f'''<div class="ctl"><div class="btns">{carve_btns}</div><div class="btns"><button type="button" class="btn ghost" data-sound aria-pressed="false">{e(t(P["sound"]))}</button></div></div>
<div class="stage dark"><canvas id="cv-carve" role="img" aria-label="{e(t(P["carve_alt"]))}"></canvas></div>
<p class="out" id="carve-out" aria-live="polite"></p><p>{e(t(P["carve_after"]))}</p>''')}

{toy("hunt", P["hunt_h"], P["hunt_lede"], f'''<div class="stage dark"><canvas id="cv-hunt" role="img" aria-label="{e(t(P["hunt_alt"]))}"></canvas></div>
<p class="out" id="hunt-out" aria-live="polite">{e(t(P["hunt_start"]))}</p>''')}

{b("stryge", r)}

<section id="stories"><h2>{e(t(P["stories_h"]))}</h2><div class="stories">{stories}</div></section>

<section id="words"><h2>{e(t(P["words_h"]))}</h2><p class="lede">{e(t(P["words_lede"]))}</p><div class="wordsplit"><ul class="words">{words}</ul>{fig("words", r)}</div></section>

<section id="sources"><h2>{e(t(P["sources_h"]))}</h2>
<ul class="srcs">{srcs}</ul>
<h3>{e(t(P["made_h"]))}</h3><ul class="made">{made}</ul>
<p class="mute small">{e(t(P["licence"]))}</p></section>
</main>
<footer><p>{e(t(P["footer"]))} · <a href="https://nanobotco.github.io/">nanobotco.github.io</a></p></footer>
<script>{js}</script>
<script src="{r}top.js"></script>
<script src="{r}pen.js"></script><script src="{r}beasts.js"></script><script src="{r}beasts-east.js"></script><script src="{r}scenes.js"></script><script src="{r}hero.js"></script><script src="{r}app.js"></script>
</body></html>
"""


def llms():
    lines = [f"# {TITLE[0]} · {TITLE[1]}", "", DESC[0], "", f"English: {SITE}", f"ไทย: {SITE}th/", "", "## The beasts", ""]
    for reg, items in BEASTS:
        lines.append(f"### {reg[0]}")
        for bz in items:
            lines.append(f"- {bz['name'][0]} ({bz['place'][0]}): {bz['line'][0]}" + (" Spouts water." if bz["spout"] else " Does not spout water."))
        lines.append("")
    lines += ["## Sources", ""] + [f"- {n}: {u}" for n, u in SOURCES + fact_sources()]
    lines += ["", "Text and drawings: CC BY 4.0, credit NaNoBotCo. Code: MIT. Photographs keep their own licences, listed on the page."]
    return "\n".join(lines) + "\n"


def main():
    global L
    os.makedirs(os.path.join(DOCS, "th"), exist_ok=True)
    for lang, path in (("en", "index.html"), ("th", "th/index.html")):
        L = lang
        open(os.path.join(DOCS, path), "w", encoding="utf-8").write(page())
    open(os.path.join(DOCS, "llms.txt"), "w", encoding="utf-8").write(llms())
    open(os.path.join(DOCS, "robots.txt"), "w", encoding="utf-8").write(f"User-agent: *\nAllow: /\nDisallow: /sheet.html\nSitemap: {SITE}sitemap.xml\n")
    open(os.path.join(DOCS, "sitemap.xml"), "w", encoding="utf-8").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"<url><loc>{SITE}</loc></url>\n<url><loc>{SITE}th/</loc></url>\n</urlset>\n")
    open(os.path.join(DOCS, "icon.svg"), "w", encoding="utf-8").write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="9" fill="#1f2433"/>'
        '<path d="M3 14h12l4 4h10l7 3-7 3 3 2-7-1-4 2H5z" fill="#d6cab1"/><circle cx="28" cy="19.5" r="1.5" fill="#1f2433"/>'
        '<path d="M35 24q2 6 1 12" stroke="#5ea7ff" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>\n')
    print("wrote docs/index.html, docs/th/index.html, llms.txt, robots.txt, sitemap.xml, icon.svg")
    ogcards.copy(ROOT, DOCS)
    ogcards.apply_tree(DOCS, SITE)


if __name__ == "__main__":
    main()
