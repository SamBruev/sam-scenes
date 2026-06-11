# CODE MAP — шпаргалка для Opus (v403)

Монолит: **`index.html`** (~17k строк, ~660 КБ) + **`sw.js`** + **`manifest.json`**.

---

## localStorage (основное)

| Ключ | Назначение |
|------|------------|
| `samscenes-scenarios-v2` | Bundle всех сценариев + html |
| `samscenes-scenarios-trash-v1` | Корзина 30 дней |
| `samscenes-main-layout-v15` | Lite: logo + prep (без html) |
| `samscenes-teleprompter-settings-v1` | Настройки суфлёра + keys |
| `samscenes-app-build` | Сброс UI-кэша при новой сборке |
| `samscenes-diag-log-v1` | Диаг (verbose off по умолчанию) |
| `samscenes-restore-scroll-y` | Scroll restore session |

---

## wire* (31) — инициализация

`wireAppBackgroundScrollBlur`, `wireAssistantDrawer`, `wireAssistantDrawerCloseSwipe`, `wireAssistantDrawerOpenGestures`, `wireControls`, `wireCustomSceneSelectHandlers`, `wireDetailsSummaryRowToggle`, `wireIntercutUnderscoreStrip`, `wireNoteFocusViewportCenter`, `wireNoteIntercutHasTextUnderline`, `wireNoteIntercutTapToFocus`, `wirePeriodicPageReload`, `wirePrepDateDocumentDelegation`, `wirePrepDateUiHint`, `wirePrepImportantPin`, `wirePrepImportantScrollSafeTap`, `wirePullDownReload`, `wireScenarioSwitchSwipe`, `wireSceneLineHeadingRules`, `wireSceneStackTimelineContinuity`, `wireSceneUI`, `wireShootDateToCalendar`, `wireShotlistPiecePickers`, `wireShotlistPiecesManualInput`, `wireShotlistPiecesRemove`, `wireTapOutsideToCloseDrawer`, `wireTeleprompterSettings`, `wireTopLogoScrollBlur`, `wireViewportPinchZoomReset`, …

**Критично после смены сценария:** `refreshDomRefs` → `ensureTeleprompterMenu`, `wireShotlistPiece*` (~8247).

---

## UI blocks → id

| Блок | id / класс |
|------|------------|
| Hub | `#scenario-hub` |
| План дня | `#daily-plan` |
| Подготовка | `.card-prep` |
| Важно | `#prep-important-block` |
| Ассистент tap | `#prep-assistant-open` |
| Drawer | `#assistant-drawer` |
| Меню суфлёра | `#teleprompter-menu` |
| Overlay | `#teleprompter-overlay` |
| Сцены | `#scene-stack`, `#scene-outro-stack` |
| Шотлист | `.shotlist-section` |
| Логотип | `#top-logo-block` |

---

## SW (`sw.js`)

- HTML: network-first, timeout 2.5s
- Assets: stale-while-revalidate (v402)
- CORE: index, manifest, icons, top-lamp-bg, top-logo, build-info

---

## Команды

```bash
# Syntax
python3 - <<'PY'
import re, subprocess
html=open('index.html',encoding='utf-8').read()
for i,s in enumerate(re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',html,re.S|re.I)):
    if not s.strip(): continue
    p=f'/tmp/sc-{i}.js'; open(p,'w').write(s)
    subprocess.run(['node','--check',p],check=True)
print('OK')
PY

# Grep якоря
rg -n "function wire|refreshDomRefs|persistToStorage" index.html
```
