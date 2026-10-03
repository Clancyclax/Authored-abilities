#!/usr/bin/env bash
# Copy the fusion work from this repo into the main game repo.
# Usage:  bash tools/fusions/bring_back.sh /path/to/sparkstone-phaser
# Only per-chunk files are copied (fusion JSON, the authored/reviewed markers, the generated game data),
# so nothing in the game's own code is touched and nothing can conflict.
set -e
DEST="$1"
[ -n "$DEST" ] && [ -d "$DEST/tools/fusions" ] || { echo "usage: bring_back.sh <main game repo>"; exit 1; }
for d in tools/fusions/out tools/fusions/done src/data/fusions; do
  mkdir -p "$DEST/$d"
  cp -r "$d/." "$DEST/$d/"
done
cp tools/fusions/PROGRESS.md "$DEST/tools/fusions/PROGRESS.md"
echo "copied. In the main repo run: node tools/fusions/assemble.mjs && node tools/fusions/status.mjs"
