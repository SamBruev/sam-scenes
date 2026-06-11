# Sam Scenes — аудит v400 (Composer)

**Дата:** 2026-06-10  
**Версия:** v400 (синхронно: title, APP_VERSION, build-info.json, sw.js CACHE_NAME)  
**Метод:** статический разбор `index.html` (~17k строк, 676 КБ), `sw.js`, `manifest.json`; `node --check` — 5/5 script OK; runtime CDP/iPhone — не прогонялся в этой сессии  
**База сравнения:** [AUDIT-SamScenes-v339.md](AUDIT-SamScenes-v339.md)

---

## Executive summary

Приложение **зрелое и оборонительное**: autosave, quota recovery, ручной toggle `<details>` под iOS, отдельная обработка закрытия суфлёра в PWA, SW auto-update с отложенным reload. Критичные пункты аудита v339 (**дубль HTML в storage**, **base64-лампа**, **агрессивный diag**) — **исправлены**.

Остаются **системные риски iOS**: тяжёлый bundle JSON при многих сценариях, 47× `backdrop-filter` (диалоги/шторка), две параллельные жестовые машины (Touch + Pointer), блокировка pinch-zoom. Топ quick wins: добавить `top-logo.png` в SW precache; quota recovery для `writeScenarioTrash`; smoke-тест матрицы на реальном iPhone standalone.

---

## Инвентарь пройден (матрица A→L)

| Блок | Статус | Краткий вывод |
|------|--------|---------------|
| A. Шапка / логотип / glass-фон | ⚠️ | `--top-logo-reveal` + lerp OK в коде; fixed + pull-stack согласованы; glass через opacity-слои |
| B. Настройки сценариев | ✅ | hub свёрнут по умолчанию; pointerup toggle; persist без activeId race |
| C. План дня | ✅ | `renderDailyPlan` — агрегация по датам; свёрнут по умолчанию |
| D. Заголовок | ✅ | sync при swipe switch |
| E. Подготовка + Важно | ✅ | подпись «Всё под контролем!» под ассистентом; reminder badge; scroll-safe tap |
| F. Меню телесуфлёра | ✅ | `(Весь сценарий)`; re-inject через `ensureTeleprompterMenu` |
| G. Сцены | ⚠️ | delete anim восстановлена (max-height + min-height:0); undo не откатывает delete явно |
| H. Шотлист | ✅ | pieces/locations wired; progress sync |
| I. Оверлей суфлёра | ⚠️ | close via capture + hit-test; scroll lock без position:fixed — проверить на standalone |
| J. Шторка ассистента | ⚠️ | свайп открытия **отключён** (`openFromLeftEdge=false`); только тап по строке |
| K. Жесты / undo | ⚠️ | pull-reload OFF; scenario swipe ON; undo HTML-only, лимит стека |
| L. SW / PWA | ⚠️ | network-first HTML 2.5s; `top-lamp-bg` в CORE; **нет** `top-logo.png` |

---

## Находки по severity

### 🔴 Критично

*На момент v400 новых блокеров уровня «потеря данных без предупреждения» не найдено* — quota recovery (`setLocalStorageItemWithQuotaRecovery`, ~8541) подключён к `writeScenarioBundle`.

**Регрессионный риск (был, починен v399):** анимация удаления сцены ломалась из‑за `height` на flex-ребёнке — сейчас `max-height` + `min-height:0`. **Retest на iOS обязателен.**

---

### 🟠 Высокий

#### 1. Bundle всё ещё монолитный — квота при 5+ сценариях
**Симптом:** `writeScenarioBundle` сериализует **все** сценарии с полным `html` каждый autosave.  
**Код:** `persistToStorage` → `current.html = wrapEl.innerHTML` (~10867), `writeScenarioBundle` (~8575).  
**iOS:** Safari ~5 МБ localStorage; recovery чистит diag + trash, но не сжимает активные сценарии.  
**Fix:** IndexedDB для html; или lazy html только active + метаданные остальных; индикатор «заполнено X%».

#### 2. `writeScenarioTrash` без quota recovery
**Симптом:** при переполнении удаление в корзину может не сохраниться, хотя bundle recovery сработал.  
**Код:** `writeScenarioTrash` (~8615) — прямой `setItem`, не `setLocalStorageItemWithQuotaRecovery`.  
**Fix:** обернуть в тот же recovery helper.

#### 3. Две жестовые системы на `document`
**Симптом:** гонки при будущих правках — двойной swipe / pull.  
**Код:** `wirePullDownReload` Touch (~15730), `wireAssistantDrawerOpenGestures` Pointer (~16401), `wireScenarioSwitchSwipe` внутри pull (~16310).  
**Статус:** pull **disabled** (`PULL_DOWN_RELOAD_ENABLED = false`, ~8004) — снижает риск.  
**Fix:** единая pointer state machine.

#### 4. Standalone PWA — суфлёр × и SW reload
**Симптом:** исторически × не работал в установленном PWA.  
**Код:** `closestTeleprompterCloseFromEvent` (~12594), document capture touchend/pointerup (~15022); SW reload откладывается если overlay open (~17038).  
**Retest:** iPhone standalone после v400 — не автоматизировано здесь.

---

### 🟡 Средний

#### 5. `backdrop-filter` ×47, `will-change` ×18
Диалоги времени/селектов, шторка ассистента, build chip. Шторка снимает blur на anim (`html.assistant-drawer-anim`) — хорошо. Диалоги открываются редко — приемлемо.  
**Fix:** не добавлять blur на fixed-слои при scroll (уже соблюдается для фона).

#### 6. Pinch-zoom заблокирован
`<meta maximum-scale=1>` + `wireViewportPinchZoomReset` (~16657). WCAG 1.4.4 — осознанный tradeoff для съёмочного UI.

#### 7. Undo не покрывает все операции
**Код:** `rememberUndoState` / `undoLastChange` (~8980) — снимки `wrap.innerHTML`, лимит `UNDO_LIMIT`, debounce. Кнопка `#btn-undo`.  
**Gap:** удаление сцены после confirm не вызывает undo snapshot до remove (markDirty есть, но стек может не содержать «до delete» если debounce не успел).  
**Fix:** `rememberUndoState()` синхронно перед `playSceneRemoveAnimation`.

#### 8. Открытие ассистента только тапом
`openFromLeftEdge = false` (~16464) — свайп от левого края отключён по v355. UX: пользователь может ожидать swipe. Документировать или вернуть с guard.

#### 9. `STORAGE_KEY` lite save без recovery
`localStorage.setItem(STORAGE_KEY, ...)` (~10876) в try/catch без recovery — только logo/prep, низкий риск.

#### 10. `top-logo.png` не в SW precache
**sw.js** CORE_FILES: lamp, icons, manifest — **нет** `top-logo.png`. Офлайн-first open: логотип может мигнуть.  
**Fix:** добавить в CORE_FILES.

---

### 🟢 Низкий

- `index.html` 676 КБ (было ~1.36 МБ) — lamp вынесен в файл ✅  
- `console.warn` в prod (~8578, 8588) — косметика  
- `100vh` + `-webkit-fill-available` на фонах — возможный jump URL bar  
- Hub/plan `<details>` — нет persist open state (by design v394)  
- `PROJECT.md` указывает v365 — документация отстаёт  

---

## v339 → v400: статус пунктов

| # | v339 | v400 |
|---|------|------|
| 1 | Дубль HTML в storage | ✅ Fixed — html только в bundle |
| 1b | Quota recovery | ✅ `setLocalStorageItemWithQuotaRecovery` |
| 2 | base64 lamp ×2 | ✅ `url("top-lamp-bg.png")` |
| 3 | Diag heartbeat | ✅ Verbose только `#diag-log` / flag; MAX_LOGS=50 |
| 4 | blur/will-change | ⚠️ 47/18 — без ухудшения |
| 5 | pinch block | ⚠️ as designed |
| 6 | dual gestures | ⚠️ pull off, risk остаётся |
| 10 | SW precache logo | 🟡 lamp да, top-logo.png нет |

---

## Trace-цепочки (5 E2E)

### 1. Создать сценарий → правка → autosave → reload
`btn-scenario-new` / assistant create → `createNewScenarioTemplate` → edit DOM → `markDirty` → debounce → `persistToStorage` → `writeScenarioBundle` → reload → `loadFromStorage` reads bundle first, STORAGE_KEY fallback for prep/logo.

### 2. «Важно» полностью → подпись ассистента
checkbox change → `wirePrepImportantPin` → `updatePrepImportantPin` → `syncAssistantAllClearLabel` → `#prep-assistant-all-clear.is-visible` + collapse `#prep-important-done`.

### 3. Суфлёр весь сценарий → keys → close
`#teleprompter-menu-open` → `openTeleprompterAllScenes` → `readAllScenesSayText` → overlay open → keys via `teleprompterKeyBindings` → close capture → `unlockMainScrollForTeleprompter` → no immediate SW reload.

### 4. Delete scene
confirm → `playSceneRemoveAnimation` (max-height) → `scene.remove` → `renumberScenes` → `markDirty` → autosave. Undo — **не гарантирован**.

### 5. PWA update
new SW → `controllerchange` → if teleprompter open → `pendingSwReload` → `visibilitychange visible` → `location.reload`.

---

## 💡 Идеи и предложения

| Идея | Зачем | Effort | Risk iOS |
|------|-------|--------|----------|
| IndexedDB для scenario html | снять потолок 5 МБ | высокий | низкий |
| Quota meter в hub | Sam видит заполнение | средний | низкий |
| Undo перед delete sync | откат удалённой сцены | низкий | низкий |
| `top-logo.png` в SW | офлайн-first logo | низкий | низкий |
| Persist hub/plan open | UX память | низкий | низкий |
| Единый GestureController | меньше гонок | высокий | средний |
| Optional pinch для prep text | a11y | средний | средний |
| Smoke test checklist в `#diag-log` | self-test на set | средний | низкий |
| Split index → modules (build step) | maintainability | очень высокий | средний |

---

## Regression watchlist

После любых правок retest на **iPhone standalone**:

1. `#teleprompter-close` (tap, без synthetic click)
2. `#scenario-hub` / `#daily-plan` toggle (single tap)
3. Delete scene animation (fade + collapse)
4. Scroll top → logo reveal без jank
5. Assistant drawer open/close
6. Scenario swipe L/R mid-screen
7. SW update после deploy (close app → reopen online)

---

## Что подтверждено исправным

- JS syntax 5/5 scripts  
- Version sync v400 ×4  
- Нет дубля html в STORAGE_KEY (коммент + код ~10868)  
- Lamp не base64 в body  
- Diag verbose off by default  
- Intro/outro delete guard  
- Teleprompter menu re-inject on scenario switch  
- `prefers-reduced-motion` на insert/remove/logo  
- aria-labels на ключевых контролах  

---

## Recommended action plan

1. **Retest matrix на iPhone PWA** (1 сессия Sam, 30 мин)  
2. `writeScenarioTrash` → quota recovery  
3. `top-logo.png` → SW CORE_FILES  
4. `rememberUndoState()` before scene delete  
5. Quota indicator / IndexedDB spike (если >3 сценариев с длинным html)  

---

## Вопросы к Sam

1. Основной режим: **standalone PWA** или Safari? (приоритет retest)  
2. Сколько сценариев обычно в bundle и типичный размер (короткий хук vs 20+ сцен)?  
3. Нужен ли **свайп** открытия ассистента или только тап по строке — финальное решение?
