#!/usr/bin/env bash
# Bundle the game into a single self-contained HTML fragment for publishing
# as a claude.ai Artifact (no doctype/html/head/body — the host adds those).
# Usage: tools/build-artifact.sh <output-file>
set -euo pipefail
cd "$(dirname "$0")/.."
out="${1:?usage: tools/build-artifact.sh <output-file>}"

{
  echo '<title>Pigeon Slash</title>'
  echo '<style>'
  # Everything between <style> and </style> in index.html, adapted for embedding
  sed -n '/<style>/,/<\/style>/p' index.html | sed '1d;$d' \
    | sed 's/height: 100%;/height: 100vh;/'
  echo '</style>'
  # Everything between <div id="wrap"> and its closing tag
  sed -n '/<div id="wrap">/,/^  <\/div>/p' index.html
  echo '<script>'
  cat js/util.js js/haptics.js js/audio.js js/sprites.js js/data.js \
      js/background.js js/dog.js js/ui.js js/game.js
  echo '</script>'
} > "$out"

echo "Wrote $out ($(wc -c < "$out") bytes)"
