# CURRENT — Sam Scenes v411

**Дата:** 2026-08-02
**Прод:** v410 · commit `3c494ad` — локально готов **v411** (запушить после проверки)
**Папка проекта (новый Mac):** `/Users/SamBruev/Documents/Yandex.Disk.localized/CLAUDE/SamScenes`
Проект восстановлен 2026-08-02 из GitHub после потери компьютера.

> **Git:** папка пока без `.git` (песочница Cowork умерла до переноса истории).
> Запустить один раз **`bash restore-git.sh`** — подтянет полную историю с GitHub
> (386 коммитов), сделает один коммит v411 поверх, включит auto-push hook
> и прогонит `node --check`. Дальше — обычный цикл.

---

## Версия (4 поля — держать синхронно)

| Место | Значение |
|-------|----------|
| `index.html` `<title>` + `APP_VERSION` | v411 |
| `build-info.json` | v411 |
| `sw.js` `CACHE_NAME` | samscenes-v411 |

---

## Недавно сделано (v404 → v411)

| Ver | Суть |
|-----|------|
| v404 | Assistant drawer glass on slide + быстрый close на iOS PWA |
| v405–v407 | Assistant UX, анимация «Важно», плавный logo reveal |
| v408–v409 | «Важно» write LTR + logo scroll без рывка |
| v410 | Fix done-text mask sweep, logo scroll ghosting, writing-эффект «Всё под контролем» |
| **v411** | **Закрытие хвостов аудита v401 + идеи OPEN_ITEMS:** локальные шрифты `fonts/*.woff2` вместо Google Fonts CDN (#2) + прекэш в CORE_FILES (#6); мягкий debounce-autosave 5 с — включён по решению Sam (#1); quota-meter localStorage в хабе (💡); авто-сброс `suppressNextSceneRemoveClick` 700 мс (#10); ре-байнд `wireSceneStackTimelineContinuity` через `refreshDomRefs` (#11); без `backdrop-filter` на `.app-build-chip` (#7); иконки 512: `icon-512.png` (any) + `icon-512-maskable.png` (safe-zone 80%, чёрный фон) (#12); `min-height:100dvh` на body (#13; фоновые псевдоэлементы — fixed с инсетами, им min-height не даёт эффекта); удалён мёртвый код свайп-открытия ассистента (`openFromLeftEdge`, open-drag, Snap*OpenFromDrag) и `teleprompterLockScrollY`. **По независимому ревью (3 прохода):** autosave — touchmove/pointermove метят активность (живой жест не обрывается), «занятый UI» (шторка ассистента, drag логотипа, открытый суфлёр, SELECT-пикер) откладывает сейв максимум ~25 с (AUTOSAVE_MAX_UI_DEFERRALS), затем сохраняем — данные важнее косметики; quota-meter идемпотентен и обновляется при (авто)сейве только с открытым хабом (без «фантомных» undo-шагов); `clearTimeout` у suppress-флага удаления сцены (гонка двух удалений подряд); SW install: критичное ядро (`/` + index.html) строго, остальной прекэш поштучно с допуском отказа; открытая шторка при autosave перерисовывается только по реальному изменению digest'а — и в `invalidate…`, и в хвосте `renderScenarioList` (двойной перерисовки больше нет); digest учитывает состав корзины (по trashId, без JSON.parse); `restoreScenarioFromTrash` сообщает, если записи уже нет; quota-recovery при фоновом сейве сообщает статусом о подчистке корзины, уведомление переживает финальный setStatus и не «переигрывается» на чужом сейве; `#hub-quota` канонизируется в undo-снапшотах (нет фантомных шагов Undo); manifest: apple-touch-icon с честным размером 1024×1024 |

---

## Не трогать без причины

- **Нет `transform` на `.wrap`** — ломает fixed `#top-logo-block`
- **Живой `filter`/`backdrop-filter` на fixed при scroll** — вылеты WebKit (v411: снят последний — с `.app-build-chip`)
- **`PULL_DOWN_RELOAD_ENABLED = false`**
- **Autosave: мягкий debounce 5 с** (v411, решение Sam 2026-08-02) — тихий `persistToStorage(false)`, ждёт паузу ввода (`UI_QUIESCE_MS`), откладывается при открытом SELECT-пикере; `flushSave` — жёсткая гарантия
- **Свайп открытия ассистента выключен** — только тап по строке «Ассистент» (мёртвые ветки удалены в v411)

---

## Ключевые пути в коде (якоря по именам — номера строк дрейфуют)

| Область | Якорь |
|---------|--------|
| Storage / quota | `setLocalStorageItemWithQuotaRecovery`, `persistToStorage` |
| Quota-meter | `ensureHubQuotaMarkup`, `updateStorageQuotaMeter`, `wireHubQuotaMeter`, `#hub-quota` |
| Autosave | `scheduleAutosave` (AUTOSAVE_IDLE_MS = 5000), вызов из `markDirty` |
| DOM rebuild | `refreshDomRefs` → шотлист re-wire, `wireSceneStackTimelineContinuity`, `ensureHubQuotaMarkup` |
| Суфлёр close PWA | `closestTeleprompterCloseFromEvent`, guard 900ms |
| «Важно» | `updatePrepImportantPin`, `#prep-important-done` |
| SW update | script в конце index.html, `trySwReload` + `flushSave` |
| Шрифты | `@font-face` в `<head>` (fonts/*.woff2, latin+cyrillic), прекэш в `sw.js` CORE_FILES |

---

## Проверки перед отчётом

```bash
cd "/Users/SamBruev/Documents/Yandex.Disk.localized/CLAUDE/SamScenes"
python3 - <<'PY'
import re, subprocess
html=open('index.html',encoding='utf-8').read()
for i,s in enumerate(re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',html,re.S|re.I)):
    if not s.strip(): continue
    p=f'/tmp/sc-{i}.js'; open(p,'w').write(s)
    assert subprocess.run(['node','--check',p],capture_output=True).returncode==0
print('node --check: OK')
PY
```

## Retest на iPhone standalone (v411)

1. Холодный офлайн-старт: шрифты Pacifico / Roboto Slab / Bad Script на месте (без CDN).
2. Правка сцены → ничего не нажимать 5–10 с → убить PWA свайпом → открыть: правки на месте (autosave).
3. Хаб «Настройки сценариев»: открыть → внизу полоска «N,NN из ~5 МБ»; растёт при добавлении сцен.
4. Переключить сценарий → фокус в start-время сцены: подтяжка из end предыдущей работает (#11).
5. Удалить сцену → следующий тап по другой кнопке не «съедается» (#10).
6. Логотип: вертикальный drag с `.logo-bg` и горизонтальный свайп сценария — как раньше.
7. Шторка ассистента: тап-открытие, свайп-закрытие, тап-вне — как раньше.
8. Иконка на Android/новая установка: 512 без обрезки (maskable — отдельный файл с полями).
9. Правка текста → открыть шторку ассистента → LP-drag/свайп строки с паузой >5 с: жест не обрывается (autosave ждёт закрытия шторки).
10. Undo: серия правок → «Отменить» каждый раз даёт видимый откат (нет «пустых» шагов от quota-метра).
