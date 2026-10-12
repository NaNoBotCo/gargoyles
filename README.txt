Gargoyles, Drawn · การ์กอยล์ วาดด้วยคณิต

Her ask 2026-10-12: "Create a minisite about gargoyles, grotesques, and their counterparts around the world. Use the awesome-doodle process to make it stunningly interactive."

Live: https://nanobotco.github.io/gargoyles/ (English) and /th/ (Thai).

Change the words: tools/copy_text.py (English and Thai side by side), then python3 tools/build.py.
Change a drawing: docs/beasts.js (Europe, Egypt, New York), docs/beasts-east.js (Asia, the Maya), docs/hero.js (Notre-Dame under the Paris sky), docs/scenes.js (the toys). docs/pen.js is the carving kit they share. docs/app.js wires the page.
Look at drawings: node tools/sheet.mjs beast:notre beast:singha+poke=500 hero:rain@21 scene:rouen:2 --png out.png
Film them: node tools/film.mjs hero:rain@21 --out out.mp4 --secs 6
Check the page: node tools/check.mjs [--path th/] [--w 390 --h 844] --png out.png
Share card: node tools/card.mjs (docs/card.html → docs/card.jpg)
Publish: ~/.claude/bin/pr-push "<this folder>" "<title>"

Facts and their sources: research/facts.json. Photographs and their licences: research/img/credits.json, the chosen ones copied to docs/img/.
The drawings went through the doodle-awesome process (critics with real reference, builders, re-score, film); its sheets are in research/sheets/wf, films in research/film.
Live data: Open-Meteo, the current weather in Paris (hero) and at every map pin.
