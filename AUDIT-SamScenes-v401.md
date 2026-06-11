# Sam Scenes — аудит v401 (Opus)

**Дата:** 2026-06-11
**Версия:** v401 — синхронно во всех 4 источниках (`<title>` index.html:21, `APP_VERSION` index.html:7965, `build-info.json:2`, `sw.js:5` CACHE_NAME).
**Метод:** статический разбор `index.html` (~17k строк, 676 КБ), `sw.js`, `manifest.json`. Глубокий трейс по 4 направлениям (хранилище · жесты · UI сцен/подготовки/суфлёра · SW/CSS/iOS) с верификацией ключевых находок по точным строкам. Runtime на реальном iPhone/CDP в этой сессии **не прогонялся** (песочница Linux была недоступна; `node --check` не запускался — синтаксических ошибок при чтении всех `<script>` не выявлено, но машинно не подтверждено).
**База сравнения:** [AUDIT-SamScenes-v339.md](AUDIT-SamScenes-v339.md), [AUDIT-SamScenes-v400.md](AUDIT-SamScenes-v400.md).

---

## Executive summary

Приложение по-прежнему **зрелое и оборонительное**: квота-рекавери на оба растущих хранилища, идемпотентные миграции, синхронный undo-снапшот перед удалением сцены, делегирование на `document` для переживающих пересборку блоков (`prep-date`, «Важно», меню суфлёра), корректный network-first SW с таймаутом. Критичные пункты v339 (дубль HTML, base64-лампа, агрессивный diag) — **закрыты и держатся**.

Главные новые/уточнённые риски этой ревизии:
1. **🔴 Регрессия шотлиста:** после переключения сценария (основной жест Sam'а) пикер «№» и кнопки удаления номеров в шотлисте **перестают работать** до перезагрузки — слушатели не переустанавливаются (`wireShotlistPiece*` зовутся только при первичном init).
2. **🟠 Автосохранение отключено целиком** (`scheduleAutosave` — пустышка, index.html:11015). Правки переживают только явное сохранение и lifecycle-`flushSave`. На обычном фоне/закрытии данные спасает `pagehide`/`visibilitychange`, но при OOM-kill iOS правки между сохранениями теряются. Прежний трейс v400 («markDirty → debounce → persist») **устарел** — фонового сейва нет.
3. **🟠 Шрифты (Pacifico / Roboto Slab / Bad Script) с внешнего CDN**, не локальные, не в прекэше — холодный офлайн-старт ломает фирменный вид.

Топ quick wins: переустановить `wireShotlistPiece*` внутри `refreshDomRefs` (1 правка чинит всю ветку); вернуть мягкий debounce-autosave; локализовать шрифты + добавить в `CORE_FILES`.

---

## Инвентарь пройден (матрица A→L)

| Блок | Статус | Краткий вывод |
|------|--------|---------------|
| A. Шапка / логотип / glass-фон | ✅ | `.wrap` без transform соблюдён (index.html:438); scroll-blur только через opacity (index.html:374, 15478 — живой blur намеренно вырезан) |
| B. Настройки сценариев | ✅ | hub свёрнут по умолчанию; pointerup-toggle; persist без race по activeId |
| C. План дня | ✅ | агрегация по датам; свёрнут по умолчанию |
| D. Заголовок | ✅ | sync имени при swipe-switch |
| E. Подготовка + «Важно» | ✅ | `prep-date` и «Важно» на document-делегировании — переживают пересборку (index.html:14322, 14558); подпись «Всё под контролем!» |
| F. Меню суфлёра | ✅ | `ensureTeleprompterMenu` re-inject через `refreshDomRefs` (index.html:8246) |
| G. Сцены | ✅ | renumber, INTRO/OUTRO guard, delete-anim `min-height:0` — без регрессии; undo-снапшот синхронно до remove (index.html:13238) |
| H. Шотлист | 🔴 | пикер «№» и remove **мертвеют после смены сценария** — не переустанавливаются |
| I. Оверлей суфлёра | 🟠 | close-guard 500 мс короче лага синтетического iOS-click (~700 мс) |
| J. Шторка ассистента | ✅/🟡 | tap-open + tap-outside-close корректны; свайп-открытие выкл.; конфликт свайпа с `.logo-bg` |
| K. Жесты / undo | 🟡 | pull off; двойной свайп гасит лок 760 мс; `suppressNextSceneRemoveClick` без таймаута |
| L. SW / PWA | 🟠 | reload корректно отложен при суфлёре; cache-first ассетов без версионирования; CORE_FILES неполный; шрифты внешние |

---

## Находки по severity

### 🔴 Критично

#### F1. Шотлист: пикер «№» и удаление номеров мертвеют после переключения сценария
**Симптом:** сменил активный сценарий (свайп / селект / «Новый» / Undo) → выпадающий список «№» в строке «Куски» больше не добавляет номера, кнопка удаления номера не реагирует. Лечится только перезагрузкой страницы.
**Шаги:** открыть приложение → шотлист, проверить что пикер работает → свайпнуть на соседний сценарий и обратно → попытаться добавить номер куска. Не работает.
**Код:** `wireShotlistPiecePickers` вешает `change` на сам элемент `.shotlist-section` (index.html:13476-13484), `wireShotlistPiecesRemove` — `wireIntentActionOnSelector(section, …)` (index.html:13520-13524). `loadFromStorage` делает `wrap.innerHTML = sc.html` (index.html:12293) — старая секция со слушателями уничтожается. `refreshDomRefs` снимает `data-shotlist-picker-bound`/`-remove-bound` (index.html:8234-8235), но **сами `wireShotlistPiece*()` повторно не зовутся** ни в `loadFromStorage` (12291-12324), ни в undo-пути (≈9031). Подтверждено grep: единственные вызовы — первичный init (index.html:17027-17029).
**iOS-контекст:** переключение свайпом — основной способ навигации Sam'а на съёмке, т.е. баг срабатывает в типичном рабочем потоке. На первой загрузке всё ок (init зовёт wire после loadFromStorage) — поэтому при беглой проверке незаметно.
**Fix (1 место чинит всё):** добавить в конец `refreshDomRefs()` (после index.html:8236), там же где снимаются `*-bound`:
```js
try {
  ensureShotlistPieceSelectOptions(wrap || document);
  wireShotlistPiecePickers();
  wireShotlistPiecesManualInput();
  wireShotlistPiecesRemove();
} catch (eShot) {}
```
Так как `refreshDomRefs` уже сбросил атрибуты-гварды, guard'ы `data-*-bound` (index.html:13477, 13522) пропустят перепривязку.

---

### 🟠 Высокий

#### 1. Автосохранение отключено — правки держатся только на lifecycle-flush
**Симптом:** ввод в сцены/заметки/«Sam» не пишется в localStorage до явного «Сохранить», смены сценария, или чистого `pagehide`/`visibilitychange:hidden`/`beforeunload`/`freeze`. При OOM-kill / форс-свайпе / краше PWA без lifecycle-события правки с момента последнего сохранения теряются.
**Код:** `scheduleAutosave` выпотрошен в no-op (index.html:11015-11018, коммент «#4 — фоновое автосохранение отключено»); `markDirty` ставит только undo-снапшот (index.html:11034-11038); запись идёт лишь через `saveToStorage`/`persistToStorage` и `flushSave` (wired на lifecycle, index.html:15338-15344).
**iOS-контекст:** в standalone `visibilitychange:hidden` при уходе в фон срабатывает достаточно надёжно, но именно iOS чаще всего убивает фоновый PWA по памяти **без** доставки события. У приложения есть crash-диагностика — значит краши случаются.
**Важно:** это осознанный выбор («по просьбе пользователя»). Но он снимает страховочную сетку ровно там, где lifecycle-события наименее надёжны. Прежний v400-трейс «markDirty → debounce → persistToStorage» теперь неверен.
**Fix:** вернуть лёгкий debounce-autosave, уважающий `UI_QUIESCE_MS`, не воюющий с пользователем:
```js
function scheduleAutosave() {
  clearTimeout(autosaveTO);
  autosaveTO = setTimeout(function () {
    var ae = document.activeElement;
    var busy = ae && (ae.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName));
    if (Date.now() - _lastUiInteractionTs < UI_QUIESCE_MS || busy) { scheduleAutosave(); return; }
    try { persistToStorage(null); } catch (e) {}   // тихо, без статуса
  }, 5000);
}
```
и вызвать `scheduleAutosave()` из `markDirty` (index.html:11037). `flushSave` оставить как жёсткую гарантию.

#### 2. Шрифты с внешнего CDN — офлайн-first ломается
**Симптом:** Pacifico / Roboto Slab / Bad Script грузятся с Google Fonts (index.html:130-132), не локальные, не в `CORE_FILES`. На первой офлайн-установке (или при блокировке CDN) — откат на системный `cursive`/`serif`, бренд ломается.
**Код:** `<link href="https://fonts.googleapis.com/css2?...">` (index.html:132); `sw.js` CORE_FILES (sw.js:6-14) их не содержит. Cache-first закэширует CDN только после онлайн-визита, и «заморозит» (см. #5).
**Fix:** скачать woff2 локально, `@font-face` в index.html, файлы в `CORE_FILES`, убрать `<link>` на Google Fonts.

#### 3. Закрытие суфлёра: guard 500 мс < лага синтетического iOS-click (~700 мс)
**Симптом:** при закрытии «×» в standalone синтетический click может прийти на 500-700 мс позже touchend — guard уже истёк → лишний `preventDefault` + повторный haptic; в редком стечении «съедает» следующий тап по месту кнопки.
**Код:** общий guard `lastTeleprompterCloseAt` = 500 мс (index.html:15046) для трёх обработчиков (`click` 15059, `touchend` capture 15060, `pointerup` capture 15061). `closeTeleprompter` идемпотентна, так что двойного закрытия нет, но лишний preventDefault/haptic есть.
**Fix:** поднять окно до 800-900 мс, синхронно с анти-дублём добавления сцены (700 мс):
```js
- if (now - lastTeleprompterCloseAt < 500) {
+ if (now - lastTeleprompterCloseAt < 900) {
```

#### 4. `removeScenarioById` не флашит несохранённый DOM активного сценария
**Симптом:** удаление *неактивного* сценария из шторки, пока в активном есть несохранённые правки, не сохраняет активный заранее; `loadFromStorage` перезапускается только если удалён сам активный (index.html:≈8844). В связке с #1 (нет autosave) правки активного могут потеряться / перетереться старым `html` при следующем переключении.
**Код:** `removeScenarioById` (index.html:≈8804-8852) splice+`writeScenarioBundle` без предварительного `persistToStorage()` — в отличие от `createNewScenarioTemplate`/`restoreScenarioFromTrash`, которые флашат.
**Fix:** в начало `removeScenarioById` добавить `try { persistToStorage('Сохранено'); } catch (e) {}`.

#### 5. SW cache-first ассетов без версионирования URL — устаревание после деплоя
**Симптом:** новый ассет с тем же именем (`top-lamp-bg.png` и т.п.) после деплоя не подтянется — держится только ручным бампом `CACHE_NAME`.
**Код:** `sw.js:90-100` чистый cache-first; URL без `?v=` / хэшей. Спасает только `activate`-очистка при смене `CACHE_NAME` (sw.js:28-37) — ручная дисциплина.
**Fix:** stale-while-revalidate для картинок/шрифтов (отдать кэш, в фоне `fetch`+`cache.put`), либо версионировать URL ассетов.

#### 6. `CORE_FILES` неполный
**Симптом:** холодная офлайн-установка без прогрева не имеет `build-info.json` (его тянет плашка) и шрифтов.
**Код:** sw.js:6-14.
**Fix:** добавить `/sam-scenes/build-info.json` и (после локализации) файлы шрифтов.

---

### 🟡 Средний

#### 7. `.app-build-chip` — постоянный fixed-слой с живым `backdrop-filter`
Единственный всегда-видимый fixed-элемент с активным `backdrop-filter: blur(10px)` (index.html:≈1949, 1968) — нарушает собственное правило проекта (живой blur на fixed при скролле ронял WebKit, см. index.html:15478). Фон чипа и так почти непрозрачный `rgba(4,4,4,0.94)`. **Fix:** убрать backdrop-filter, поднять плотность фона до `rgba(4,4,4,0.97)`.

#### 8. SW-reload посреди правки на главном экране
`trySwReload` зовёт `location.reload()` (index.html:17067) без явного `flushSave`. Отсрочка завязана только на `#teleprompter-overlay` (17061). **Смягчено:** `location.reload()` запускает unload → срабатывают `pagehide`/`beforeunload` → `flushSave`, так что данные обычно спасены. Остаточный риск — связка с #1 при отсутствии lifecycle. **Fix (по желанию):** в `trySwReload` перед reload вызвать `flushSave()`; или откладывать reload, если `activeElement` — поле ввода.

#### 9. Горизонтальный свайп с `.logo-bg` конфликтует с переключением сценария / drag логотипа
Свайп, начатый на области логотипа, может одновременно запустить logo-drag (pointer-машина, index.html:≈16504) и `didSwipeLeftMid`→`goToAdjacentScenario` (touch-машина). Двойную **смену** гасит лок 760 мс (index.html:14484), но визуальный конфликт drag↔switch не защищён. **Fix:** в `skipScenarioSwipe` (index.html:≈16358) и `skipHorizontalSwipe` (≈15813) добавить `if (el.closest('.logo-bg')) return true;`.

#### 10. `suppressNextSceneRemoveClick` без таймаута
Если pointer-машина по какой-то причине не сгенерировала `click` после удаления сцены, флаг подавления остаётся `true` и проглотит следующий легитимный click. **Fix:** ставить флаг с авто-сбросом `setTimeout(…, 700)` (index.html:≈14803).

#### 11. `wireSceneStackTimelineContinuity` не переустанавливается при обычной смене сценария
Слушатель «подтяжки start из end предыдущей сцены» висит на `sceneStack` (index.html:11276), переустанавливается в undo-пути (≈9037), но не в `loadFromStorage`. После смены сценария «подтяжка при фокусе» не работает до первой правки (каскад через `change` селектов всё ещё работает). **Fix:** добавить вызов в `loadFromStorage` рядом с index.html:12301.

#### 12. manifest без `maskable` / 512×512 иконки
`manifest.json`: только 192 и 180. На Android — обрезка адаптивной иконки, нет качественного сплеша. **Fix:** добавить `favicon-512.png` с `"purpose": "any maskable"`.

#### 13. Смешение `100vh` (фон) и `100dvh` (.wrap)
Фоновые `body::before/after` — `100vh`+`-webkit-fill-available` (index.html:214, 336, 384); `.wrap` — `100vh`→`100dvh` (452-453). Теоретический рассинхрон высот при скрытии URL-бара; смягчён `inset:-48px` запасом фонов. **Fix (опц.):** привести фоны к `100dvh` с fallback.

#### 14. `backdrop-filter` ×47, `filter: blur` ×24, `will-change` ×18, `position: fixed` ×24
Перенос из v339/v400 — без ухудшения, кроме #7. Диалоги/шторка появляются по требованию и снимают blur на анимации. Pinch-zoom заблокирован (`maximum-scale=1` + `wireViewportPinchZoomReset`, index.html:16677) — осознанный tradeoff a11y (WCAG 1.4.4).

---

### 🟢 Низкий

- Устаревший HTML-комментарий `v220` в index.html:2 — вводит в заблуждение, безвреден.
- `teleprompterLockScrollY` — мёртвая переменная (пишется index.html:12740, не читается; scroll-lock через `overflow:hidden` восстановления не требует).
- `console.warn` в проде (≈8578, 8588) — косметика.
- `100vh` jump URL-бара на фонах — некритично.
- `snapshots/` — десятки старых версий раздувают git (в деплой не попадают).
- `PROJECT.md` отстаёт по версии — документация.

---

## v339 → v401: статус пунктов

| # (v339) | Проблема | v401 |
|---|---|---|
| 1 | Дубль HTML в storage | ✅ Fixed — `html` только в bundle; split-ключи `samscenes-html-<id>` лишь читаются+удаляются миграцией (index.html:7905-7938), `setItem` на них нет |
| 1b | Quota recovery | ✅ `setLocalStorageItemWithQuotaRecovery` (index.html:8541) на bundle (8577) и trash (8627) |
| 2 | base64-лампа ×2 | ✅ `url("top-lamp-bg.png")` |
| 3 | Diag heartbeat | ✅ verbose за флагом, `MAX_LOGS=50` |
| 4 | blur/will-change | ⚠️ 47/24/18 — без ухудшения, **кроме** живого backdrop на `.app-build-chip` (#7 — лёгкая регрессия принципа) |
| 5 | pinch block | ⚠️ as designed |
| 6 | dual gestures | ⚠️ pull off; двойную смену гасит лок 760 мс; **новый** конфликт свайпа с `.logo-bg` (#9) |
| 10 | SW precache logo | 🟡 `top-logo.png` теперь в CORE; **шрифты и `build-info.json` — нет** (#6) |
| — | Автосейв (v400 считал включённым) | 🟠 **отключён целиком** (#1) — уточнение |
| — | Шотлист-пикер | 🔴 **новая регрессия** (F1) |

---

## Связанные логические цепочки (trace)

1. **Создать → правка → reload.** `createNewScenarioTemplate`→edit DOM→`markDirty` (только undo-снапшот, **без autosave**)→ сохранение лишь при явном save / смене сценария / lifecycle `flushSave`. Reload без предшествующего lifecycle-события = потеря правок с последнего сейва (#1).
2. **Полный «Важно» → подпись.** checkbox `change` (document-делегат index.html:14322)→`updatePrepImportantReminder`/`syncAssistantAllClearLabel` (14042)→`#prep-assistant-all-clear` + collapse. Переживает смену сценария (делегирование). ✅
3. **Суфлёр весь сценарий → keys → close.** `#teleprompter-menu-open`→`readAllScenesSayText` (12651)→overlay open→`lockMainScrollForTeleprompter` (overflow, без position:fixed)→keys→close через capture touchend/pointerup (guard 500 мс, #3)→`unlockMainScroll`→reload отложен пока overlay open. ✅ с оговоркой #3.
4. **Delete scene → undo → renumber.** confirm→`flushUndoSnapshot()` синхронно снимает `wrap.innerHTML` ДО мутации (index.html:13238)→анимация (`max-height`+`min-height:0`)→`scene.remove`→`renumberScenes` (по `[data-scene-role="body"]`, без дыр). Undo восстанавливает. ✅
5. **PWA update.** новый SW (`skipWaiting`)→`controllerchange`→`trySwReload`: если суфлёр открыт→`pendingSwReload`, иначе `location.reload()` (pagehide→flushSave спасает данные). ✅ с оговоркой #8.
6. **Switch scenario → шотлист (БАГ).** свайп→`goToAdjacentScenario`→`loadFromStorage`→`wrap.innerHTML=sc.html`→`refreshDomRefs` снимает `*-bound`, но `wireShotlistPiece*()` не зовутся→пикер «№» и remove без слушателей (F1). 🔴

---

## 💡 Идеи и предложения

| Идея | Зачем | Effort | Risk iOS |
|------|-------|--------|----------|
| Переустановка `wireShotlistPiece*` в `refreshDomRefs` | чинит F1 | низкий | низкий |
| Вернуть debounce-autosave с UI-quiesce | страховка от OOM-kill | низкий | низкий |
| Локализовать шрифты + в CORE_FILES | офлайн-бренд | средний | низкий |
| stale-while-revalidate для ассетов | свежие картинки без бампа CACHE_NAME | средний | низкий |
| `flushSave()` перед SW-reload | явная гарантия | низкий | низкий |
| Quota-meter в hub | Sam видит заполнение 5 МБ | средний | низкий |
| IndexedDB для тел сценариев | снять потолок 5 МБ | высокий | низкий |
| Единый GestureController (pointer-only) | меньше гонок touch↔pointer | высокий | средний |
| maskable/512 иконка | качество установки | низкий | низкий |
| Smoke-self-test в `#diag-log` | ловить регрессии вроде F1 на деплое | средний | низкий |

---

## Regression watchlist (retest на iPhone standalone после любых правок)

1. **Шотлист: добавить/удалить «№» ПОСЛЕ переключения сценария** (новый обязательный пункт — F1).
2. `#teleprompter-close` (одиночный тап, без лишнего haptic) — #3.
3. Правка сцены → уход в фон → возврат → правки на месте (#1).
4. Удаление неактивного сценария при несохранённых правках активного (#4).
5. `#scenario-hub` / `#daily-plan` toggle одиночным тапом.
6. Delete scene — fade + collapse (`min-height:0`).
7. Scroll вверх → reveal логотипа без jank.
8. Свайп L/R по середине и **по области логотипа** (#9).
9. SW update после деплоя (закрыть → открыть онлайн).

---

## Что подтверждено исправным (с доказательством)

- Версии синхронны v401 ×6 (index.html:21, 7965, 7966; build-info.json:2-3; sw.js:5).
- HTML сценария — только в bundle, без дублирования; split-ключи лишь читаются+удаляются (index.html:7905-7938; нет `setItem('samscenes-html-…')`).
- Квота-рекавери обёрнута на оба растущих хранилища (bundle 8577, trash 8627); raw-`setItem` только на ограниченных данных.
- Миграции (`abakan-*`→`samscenes-*` 7740; say-bundle версионирован 12080; split-html) идемпотентны.
- Undo-снапшот синхронно ДО удаления сцены (`flushUndoSnapshot` index.html:13238); `UNDO_LIMIT=40`, dedup.
- `renumberScenes` без дыр; INTRO/OUTRO guard + минимум 1 body (index.html:13220-13232); delete-anim `min-height:0` — регрессии нет.
- `prep-date`, «Важно», `say-replace`, paste-хендлеры — document-делегирование / ре-байнд в `loadFromStorage` (index.html:12302-12309), переживают пересборку.
- Меню суфлёра re-inject через `refreshDomRefs` (index.html:8246).
- Pull-down выключен на всех уровнях; двойную смену сценария гасит лок 760 мс; scroll-lock через `overflow` (без position:fixed); pinch-reset только при ≥2 пальцах — одно-пальцевые свайпы целы.
- SW network-first с таймаутом 2500 мс корректен (sw.js:44-88); `controllerchange`-reload отложен при открытом суфлёре (index.html:17061).
- `env(safe-area-inset-*)` на всех fixed-элементах; `.wrap` без transform (index.html:438), scroll-blur только opacity (15478).
- `prefers-reduced-motion` на insert/remove/clapper/logo; aria-метки на ключевых контролах.

---

## Recommended action plan (1-2 спринта)

1. **F1** — переустановить `wireShotlistPiece*` в `refreshDomRefs` (🔴, 1 правка).
2. **#1** — вернуть мягкий debounce-autosave (🟠).
3. **#3** — поднять окно close-guard суфлёра до 900 мс (🟠).
4. **#4** — `persistToStorage` в начало `removeScenarioById` (🟠).
5. **#2 + #6** — локализовать шрифты, дополнить CORE_FILES (`build-info.json`, шрифты) (🟠).
6. **#5** — stale-while-revalidate для ассетов (🟠).
7. **#7, #9, #10, #11** — мелкие правки backdrop-чипа, `.logo-bg`-свайпа, флага-подавления, таймлайн-ребайнда (🟡).
8. Бамп **v402** в 4 местах (title, APP_VERSION+BUILD_TIME, build-info.json, CACHE_NAME) → commit → push.

---

## 3 уточняющих вопроса Sam

1. **Основной режим — standalone PWA «на рабочий стол» или Safari-вкладка?** От этого зависит приоритет retest #1/#3/F1 и важность офлайн-шрифтов (#2).
2. **Сколько сценариев обычно в работе и насколько длинные** (короткий хук vs 20+ сцен с заметками)? Это определяет, нужен ли IndexedDB/quota-meter или хватит debounce-autosave.
3. **Когда на съёмке ты обычно переключаешь сценарии** — между дублями, на ходу? И пользуешься ли шотлист-пикером «№» после переключения (чтобы оценить реальную остроту F1)?
