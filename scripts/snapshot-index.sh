#!/usr/bin/env bash
# Локальные снимки Sam Scenes: один файл = полная копия index.html на момент сборки.
# Откат: ./scripts/snapshot-index.sh restore snapshots/SamScenes-v246-....html
# (иконки и media/ берутся из корня SamScenes — открывать снимок напрямую из snapshots/ не нужно,
#  только хранить и при необходимости восстановить в index.html.)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/index.html"
OUT="$ROOT/snapshots"

snapshot() {
  mkdir -p "$OUT"
  local version="unknown"
  if [[ -f "$ROOT/build-info.json" ]] && command -v python3 >/dev/null 2>&1; then
    version="$(python3 -c "import json; print(json.load(open('$ROOT/build-info.json')).get('version','unknown'))" 2>/dev/null || echo unknown)"
  fi
  if [[ "$version" == "unknown" ]] || [[ -z "$version" ]]; then
    version="$(grep -o "APP_VERSION = '[^']*'" "$SRC" | head -1 | sed "s/.*'\([^']*\)'.*/\1/" || echo unknown)"
  fi
  local ts
  ts="$(TZ=Europe/Moscow date +%Y%m%d-%H%M%S)"
  local dest="$OUT/SamScenes-${version}-${ts}.html"
  cp "$SRC" "$dest"
  echo "$dest"
}

list_snapshots() {
  local n="${1:-40}"
  shopt -s nullglob
  local files=("$OUT"/SamScenes-*.html)
  if (( ${#files[@]} == 0 )); then
    echo "(нет снимков в $OUT — выполните: $0 snapshot)"
    return 0
  fi
  printf '%s\n' "${files[@]}" | sort -r | head -n "$n"
}

restore_snapshot() {
  local f="${1:?укажите путь к файлу, например snapshots/SamScenes-v246-20260503-183000.html}"
  [[ "$f" != /* ]] && f="$ROOT/$f"
  if [[ ! -f "$f" ]]; then
    echo "Файл не найден: $f" >&2
    exit 1
  fi
  cp "$f" "$SRC"
  echo "Восстановлено: $SRC"
  echo "Источник: $f"
}

case "${1:-snapshot}" in
  snapshot) snapshot ;;
  list) list_snapshots "${2:-40}" ;;
  restore) restore_snapshot "${2:-}" ;;
  -h|--help|help)
    echo "Использование:"
    echo "  $0 snapshot              — сохранить копию index.html в snapshots/"
    echo "  $0 list [N]              — последние N снимков (новые сверху)"
    echo "  $0 restore <файл.html>   — записать снимок поверх index.html"
    ;;
  *)
    echo "Неизвестная команда: ${1:-}. См. $0 --help" >&2
    exit 1
    ;;
esac
