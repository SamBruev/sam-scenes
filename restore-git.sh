#!/bin/bash
# Sam Scenes — восстановление git-репозитория (после потери компьютера, 2026-08-02).
#
# Что делает:
#   1. node --check всех <script> из index.html + sw.js (если установлен node)
#   2. Свежий штамп BUILD_TIME / build-info.json (v411 остаётся)
#   3. Подтягивает полную историю с GitHub (386 коммитов) и делает ОДИН коммит v411
#      поверх origin/main — рабочая копия в этой папке уже финальная
#   4. Включает auto-push hook (.githooks) — как раньше
#
# Запуск:  bash restore-git.sh        (из этой папки или откуда угодно)
# Пуш:     git push -u sam-scenes main   (после проверки; дальше hook пушит сам)

set -euo pipefail
cd "$(dirname "$0")"

if [ -d .git ]; then
  echo "✋ .git уже существует — выходим, чтобы ничего не затереть."
  echo "   Если восстановление нужно заново: удалите папку .git и перезапустите."
  exit 1
fi

# --- 1. Синтакс-проверка -----------------------------------------------------
if command -v node >/dev/null 2>&1; then
  python3 - <<'PY'
import re, subprocess, sys, tempfile, os
html = open('index.html', encoding='utf-8').read()
n = 0
for i, s in enumerate(re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>', html, re.S | re.I)):
    if not s.strip():
        continue
    p = os.path.join(tempfile.gettempdir(), 'samscenes-chk-%d.js' % i)
    open(p, 'w', encoding='utf-8').write(s)
    r = subprocess.run(['node', '--check', p], capture_output=True, text=True)
    if r.returncode != 0:
        print('SCRIPT %d FAIL:\n%s' % (i, r.stderr)); sys.exit(1)
    n += 1
r = subprocess.run(['node', '--check', 'sw.js'], capture_output=True, text=True)
if r.returncode != 0:
    print('sw.js FAIL:\n' + r.stderr); sys.exit(1)
print('node --check: %d inline-скриптов + sw.js — OK' % n)
PY
else
  echo "⚠️  node не найден — синтакс-проверка пропущена (brew install node)."
fi

# --- 2. Свежий штамп сборки --------------------------------------------------
TS="$(TZ=Europe/Moscow date '+%Y-%m-%d %H:%M MSK')"
/usr/bin/sed -i '' "s/var BUILD_TIME = '[^']*';/var BUILD_TIME = '$TS';/" index.html
python3 - "$TS" <<'PY'
import json, sys
bi = json.load(open('build-info.json'))
bi['build'] = sys.argv[1]
open('build-info.json', 'w', encoding='utf-8').write(
    json.dumps(bi, ensure_ascii=False, indent=2) + '\n')
PY
echo "BUILD_TIME → $TS"

# --- 3. История с GitHub + коммит v411 --------------------------------------
git init -q -b main
git remote add sam-scenes https://github.com/SamBruev/sam-scenes.git
echo "Тяну историю с GitHub…"
git fetch -q sam-scenes main
git reset -q --soft FETCH_HEAD
git add -A
git commit -q -m "v411: восстановление после потери компьютера + закрытие аудита v401

Аудит v401 (все кодовые пункты) + идеи OPEN_ITEMS:
- #2+#6: шрифты локально (fonts/*.woff2, latin+cyrillic, Roboto Slab variable) +
  прекэш в CORE_FILES; Google Fonts CDN удалён — офлайн-first честный
- #1: мягкий debounce-autosave 5с (решение Sam): quiesce по касаниям/движениям,
  отсрочка «занятого UI» (шторка/суфлёр/dialog/SELECT/drag) с лимитом ~25с,
  гашение висящего таймера в loadFromStorage/undo/createNewScenarioTemplate
- quota-meter в хабе: все ключи origin, идемпотентный, канонизация в undo-снапшотах
- quota-recovery сообщает статусом о подчистке корзины (окно 30с, переживает setStatus)
- шторка ассистента: только digest-aware перерисовка (digest включает состав корзины),
  restoreScenarioFromTrash сообщает об исчезнувшей записи
- #10: suppress-флаг удаления сцены — clearTimeout + взвод в finally после confirm
- #11: ре-байнд wireSceneStackTimelineContinuity через refreshDomRefs (guard — JS-свойство)
- #7: .app-build-chip без backdrop-filter; #12: icon-512 any + icon-512-maskable +
  честный apple-touch 1024; #13: min-height:100dvh на body
- SW: install — критичное ядро строго, остальной прекэш поштучно; HTML-ветка
  кэширует только status 200; window.flushSave экспортирован для SW-скрипта
- Удалён мёртвый код: openFromLeftEdge/open-drag/Snap*OpenFromDrag,
  teleprompterLockScrollY; pointermove ассистента — passive:true
- Доки: PROJECT/CURRENT/OPEN_ITEMS → v411, новые пути после восстановления

Прогнано 11 итераций независимого код-ревью (subagent, clean context);
все находки закрыты. Изменения выполнены в Cowork (Claude)."
git config core.hooksPath .githooks
echo ""
echo "✅ Готово: $(git log --oneline -1)"
echo "   История: $(git rev-list --count HEAD) коммитов."
echo ""
echo "Проверь и пушни:  git push -u sam-scenes main"
echo "(дальше post-commit hook будет пушить сам, как раньше)"
