#!/usr/bin/env bash
# Пережать символ лампы для pull-to-reload (из ProRes .mov → webm + mp4 в media/).
# Требуется ffmpeg в PATH. Исходник по умолчанию — путь из проекта Nuke (можно переопределить).
set -euo pipefail
SRC="${1:-$HOME/Downloads/Logo v003/animation_symbol_retime/animation_symbol.0001.mov}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
OUT_W="$HERE/media/pull-reload-lamp.webm"
OUT_M="$HERE/media/pull-reload-lamp.mp4"
command -v ffmpeg >/dev/null || { echo "Установите ffmpeg"; exit 1; }
test -f "$SRC" || { echo "Нет файла: $SRC"; exit 1; }
mkdir -p "$HERE/media"
ffmpeg -y -i "$SRC" -vf "scale=80:80:flags=lanczos,format=yuva420p" -an \
  -c:v libvpx-vp9 -crf 38 -b:v 0 -row-mt 1 "$OUT_W"
ffmpeg -y -i "$SRC" -vf "scale=80:80:flags=lanczos,format=yuva420p,format=yuv420p" -an \
  -c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p -movflags +faststart "$OUT_M"
ls -lh "$OUT_W" "$OUT_M"
