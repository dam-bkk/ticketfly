# Shareable walkthrough

Builds a single self-contained HTML file (screens as embedded AVIF, clickable hotspots, notes per screen) from the live demo.

```sh
cd tools/walkthrough
mkdir -p shots avif
node ~/.claude/skills/browser-automation/browser.mjs https://ticketfly.damien.asia/login --script ./capture.mjs \
  | sed -n '/^script/,/^console/p' | sed '1s/^script *//' | sed '$d' > meta.json
for f in shots/*.png; do avifenc -s 6 -q 58 "$f" "avif/$(basename "$f" .png).avif"; done
python3 build.py   # writes ~/Desktop/Service-Desk-walkthrough.html
```

Persona ids (tf_persona cookie) and copy live at the top of `capture.mjs` / `build.py`. Update the stats block on the cover after re-seeding.
