# Sam Scenes — ТЗ на правки (для агента)

Все правки в одном файле: `sam-scenes/index.html` (HTML + CSS + JS в одном файле).
**Текущая версия в проде:** **v339** (2026-06-01). Все пункты ниже — ✅ сделаны.

**После изменений обязательно бампнуть версию во всех четырёх местах** (иначе PWA отдаст старый кэш):
- `index.html` → `<title>Sam Scenes (vNNN)</title>`
- `index.html` → `var APP_VERSION = 'vNNN';` и `var BUILD_TIME = '...';`
- `build-info.json` → `"version"` и `"build"`
- `sw.js` → `var CACHE_NAME = 'samscenes-vNNN';`

Проверка после правок: открыть в Safari/Chrome, прогнать сценарии ниже руками. JS — без сборки, чистый ES5-стиль (var, без стрелочных в обработчиках, где рядом так же).

---

## v339 — UX сцены, подготовка, ассистент (2026-06-01)

| # | Изменение |
|---|-----------|
| 1 | **Свой вариант** в селектах локация / план / кадр — in-app диалог вместо `prompt`, единый стиль с выпадающим списком |
| 2 | **Пунктир** у Sam / Примечание / Перебивка — только справа от подписи; тап по строке сразу фокус и скрытие бланка |
| 3 | **Подписи** — Sam крупнее (`1.2em`); локация / план / кадр / примечание / перебивка — один размер |
| 4 | **«Говорю» → Sam** — подпись поля + миграция старых сохранений (`migrateSayLabelToSam`) |
| 5 | **Перенос текста** — `display: contents` у `<div>` в contenteditable: 1-я строка до края, дальше с левого края |
| 6 | **Ассистент** — имя ближе к «Ассистент»; после заполнения «Важно» — **«Всё под контролем!»** (Pacifico) сразу после имени в подготовке и в шторке |

**Проверка v339:** отметить все пункты «Важно» → надпись Pacifico после имени; длинный текст в Sam — перенос с левого края; «Свой вариант…» в селекте — тёмный диалог, не системный prompt.

---

## 1. ✅ Имя сценария из «Настройки сценариев» не синхронизируется со строкой даты и со шторкой ассистента

**Симптом:** меняешь название в первом блоке (настройки сценариев) — не меняется ни в строке сценария с датой, ни в названии в блоке ассистента.

**Где:** инпут `#scenario-name`. Списки рисуют `renderScenarioList(bundle)` (строки с датой) и `renderAssistantDrawerList()` (шторка ассистента). Они берут имя из сохранённого `bundle.items[i].name`.

**Причина:** обработчик `input` у `#scenario-name` обновляет только `titleSubject` (заголовок H1) и `markDirty()`. Имя в `bundle` пишется лишь при сохранении (`persistToStorage` → `mergeScenarioNameFromTitleSubject`), а списки не перерисовываются → показывают старое имя до перезагрузки.

**Фикс:** в обработчике `input` у `#scenario-name` (и симметрично у `titleSubject`) дополнительно записать имя в активный элемент бандла и перерисовать списки. Сделать дебаунс ~150 мс, чтобы не дёргать рендер на каждую букву.

```js
var _scenNameSyncT = null;
function syncActiveScenarioNameToLists(name) {
  var bundle = readScenarioBundle();
  if (!bundle || !bundle.items || !bundle.activeId) return;
  var it = null;
  for (var i = 0; i < bundle.items.length; i++) {
    if (bundle.items[i] && bundle.items[i].id === bundle.activeId) { it = bundle.items[i]; break; }
  }
  if (!it) return;
  var clean = String(name || '').replace(/\s+/g, ' ').trim();
  it.name = clean || 'Без названия';
  writeScenarioBundle(bundle);
  try { renderScenarioList(bundle); } catch (e) {}
  try { renderDailyPlan(bundle); } catch (e) {}
  try { renderAssistantDrawerList(); } catch (e) {}
}
// внутри обработчика input у #scenario-name и у .title-subject:
if (_scenNameSyncT) clearTimeout(_scenNameSyncT);
_scenNameSyncT = setTimeout(function () {
  syncActiveScenarioNameToLists(scenarioName ? scenarioName.value : '');
}, 150);
```

**Проверка:** открыть настройки сценариев, поменять имя → строка с датой и плашка в шторке ассистента обновляются без перезагрузки.

---

## 2. ✅ В «Подготовке» не меняется (не отображается) дата съёмки

**Где:** видимую дату показывает `#prep-date-display` (span), а сам `<input id="prep-date" type="date">` — прозрачный слой сверху. Обновляет подпись `syncPrepDateDisplayRow()`, привязка — в `wirePrepDateUiHint()` к конкретному элементу инпута.

**Причина:** слушатели вешаются на конкретный `#prep-date`. При смене сценария блок подготовки пересобирается (`wrap.innerHTML`), создаётся новый `#prep-date` без слушателей → выбор даты не обновляет видимую подпись (выглядит как «дата не меняется»).

**Фикс:** делегировать на `document`:

```js
document.addEventListener('input', function (e) {
  var t = e.target;
  if (t && t.id === 'prep-date') { syncPrepDateDisplayRow(); markDirty(); }
}, true);
document.addEventListener('change', function (e) {
  var t = e.target;
  if (t && t.id === 'prep-date') { syncPrepDateDisplayRow(); markDirty(); }
}, true);
```

**Дополнительно (на усмотрение):** `wireShootDateToCalendar()` на каждое изменение даты авто-скачивает `.ics`-файл — это навязчиво и может сбивать. Лучше убрать авто-скачивание или повесить его на отдельную кнопку «Добавить в календарь».

**Проверка:** выбрать дату → подпись сразу меняется; переключить сценарий и обратно → дата сохранилась.

---

## 3. ✅ Надпись «Формат кадра» наезжает на селекты

**Где:** `.field-prep-format` → `.prep-format-field-head` (`<b>Формат кадра</b>`) + `.prep-format-wrap.format-row` (3 селекта). `.field` = `display:flex; flex-direction:column`.

**Причина:** в текущем коде вёрстка выглядит корректной (подпись сверху, отступ снизу 2px + `margin-top:8px` у wrap). Возможно, наложение видно на старой задеплоенной версии, где было правило `.field:has(> .format-row){flex-direction:row}` (подпись слева — наезжала). Проверить, что такого правила нет.

**Фикс (гарантированный вертикальный стек с чётким зазором):**

```css
.field-prep-format { display: flex; flex-direction: column; gap: 8px; }
.field-prep-format .prep-format-field-head { margin: 0; }
.field-prep-format .prep-format-wrap { margin-top: 0; }
```

**Проверка:** подпись «Формат кадра» отдельной строкой над тремя селектами, без наложения.

---

## 4. ✅ Отключить увеличение двумя пальцами (pinch-zoom)

**Где:** meta viewport (строка ~6): `width=device-width, initial-scale=1.0, viewport-fit=cover`. Есть `wireViewportPinchZoomReset()` — он лишь возвращает масштаб к 100% после жеста.

**Фикс:**
1. В meta добавить `maximum-scale=1, user-scalable=no` (работает в standalone-PWA с домашнего экрана):
   `content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"`
2. В JS подавить жесты масштабирования (в Safari-вкладке `user-scalable=no` игнорируется ради доступности, поэтому нужно гасить события жестов):

```js
['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) {
  document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false });
});
document.addEventListener('touchmove', function (e) {
  if (e.touches && e.touches.length > 1) { e.preventDefault(); } // два пальца = зум
}, { passive: false });
// двойной тап для зума:
var _lastTouchEnd = 0;
document.addEventListener('touchend', function (e) {
  var now = Date.now();
  if (now - _lastTouchEnd < 300) e.preventDefault();
  _lastTouchEnd = now;
}, { passive: false });
```

**Внимание:** проверить, что двух-пальцевый `touchmove` preventDefault не ломает существующие жесты (в приложении используются одно-пальцевые свайпы/pull — их не затронет).

**Проверка:** на iPhone жест «щипок» не масштабирует страницу; двойной тап не зумит.

---

## 5. ✅ Свёрнутый блок «Всё готово к съёмке» нельзя раскрыть обратно  ← v329

**Где:** `wirePrepImportantPin()`. Кнопки `#prep-important-done` (раскрыть) и `#prep-important-collapse-btn` (свернуть) получают `click`-слушатели напрямую на элементы в момент инициализации.

**Причина:** эти кнопки **пересоздаются** при пересборке блока (`migratePrepImportantBlock` / смена сценария), и прямые слушатели теряются → тап по плашке «Всё готово к съёмке» ничего не делает.

**Фикс:** заменить прямые слушатели на делегирование к `document`. Найти в `wirePrepImportantPin()` этот блок:

```js
var doneOpenBtn = document.getElementById('prep-important-done');
if (doneOpenBtn) {
  doneOpenBtn.addEventListener('click', function () {
    expandPrepImportantChecklist();
    try { triggerHaptic('light'); } catch (eH) {}
  });
}
var collapseBtn = document.getElementById('prep-important-collapse-btn');
if (collapseBtn) {
  collapseBtn.addEventListener('click', function () {
    collapsePrepImportantChecklist();
    try { triggerHaptic('micro'); } catch (eH2) {}
  });
}
```

и заменить на:

```js
document.addEventListener('click', function (e) {
  var t = e.target;
  if (!t || !t.closest) return;
  if (t.closest('#prep-important-done')) {
    e.preventDefault();
    expandPrepImportantChecklist();
    try { triggerHaptic('light'); } catch (eH) {}
    return;
  }
  if (t.closest('#prep-important-collapse-btn')) {
    e.preventDefault();
    collapsePrepImportantChecklist();
    try { triggerHaptic('micro'); } catch (eH2) {}
  }
}, false);
```

**Проверка:** отметить все пункты → блок сворачивается в плашку «Всё готово к съёмке» → тап по плашке снова раскрывает чеклист; в т.ч. после переключения сценария туда-обратно.

---

## 6. ✅ Текст в сценариях должен начинаться с места подчёркивания (в одну строку с подписью), а не прыгать под подпись

**Где:** строки `.line-say` (Говорю), `.line-note` (Примечание), `.intercut` (Перебивка) внутри `.scene-main`. Поля ввода — `.say-editable`, `.note-editable`, `.intercut-text` (contenteditable).

**Сейчас (v321):** текст переносится **под** подпись (grid-строки).

**Нужно:** текст начинается сразу после подписи на той же строке (на месте пунктира-«бланка»), заменяя подчёркивание; при переносе следующие строки идут во всю ширину слева, **без отступа** под подпись.

**Рекомендуемый подход — float подписи** (первая строка текста обтекает подпись справа, перенос — на всю ширину слева):

```css
.scene-main > .line-say,
.scene-main > .line-note,
.scene-main > .intercut {
  display: flow-root;            /* содержит float без клиппинга */
  margin-top: 8px;
  padding: 0 0 2px;
}
.scene-main > .line-say > b,
.scene-main > .line-note > b,
.scene-main > .intercut > b {
  float: left;
  margin-right: 0.5em;
  white-space: nowrap;
  font-size: 1.2em;
  line-height: 1.4;
}
.scene-main > .line-say .say-editable,
.scene-main > .line-note .note-editable,
.scene-main > .intercut .intercut-text {
  display: block;                /* обтекает float: 1-я строка после подписи, перенос — во всю ширину */
  min-height: 1.4em;
  line-height: 1.4;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  outline: none;
  border-bottom: 1px dashed rgba(200, 198, 195, 0.38);  /* «бланк»; текст ложится поверх */
  padding: 0 0 2px;
}
```

**Важно:** в `.line-say` динамически добавляется кнопка `.say-replace-btn` («Заменить») — сделать ей `float: right` (или вынести), чтобы не ломала обтекание:

```css
.scene-main > .line-say .say-replace-btn { float: right; margin-left: 0.5em; }
```

Подчёркивания у всех трёх должны выглядеть одинаково. Проверить пустое состояние (пунктир виден справа от подписи) и многострочный ввод (перенос влево без отступа).

---

## 7. ✅ Возможность добавить свой вариант в селекты «Локация», «План», «Кадр»

**Где:** селекты сцены `.scene-loc-select`, `.scene-plan-select`, `.scene-framing-select` (опции захардкожены в шаблоне сцены, ищи по `<option value="..."`). Сцены сохраняются как `innerHTML`, поэтому добавленная `<option selected>` сохранится со сценой.

**Фикс:**
1. В каждый из трёх селектов добавить последним пунктом: `<option value="__custom__">Свой вариант…</option>`.
2. Делегированный обработчик `change` на контейнере сцен: если выбран `__custom__` — `prompt()` имя, вставить новую `<option>` перед `__custom__`, выбрать её, и `markDirty()`.

```js
function handleCustomSceneSelect(sel) {
  if (!sel || sel.value !== '__custom__') return;
  var label = window.prompt('Свой вариант', '');
  label = label == null ? '' : String(label).trim();
  if (!label) { sel.selectedIndex = 0; return; }      // отмена → вернуть к «— выберите —»
  var opt = document.createElement('option');
  opt.value = 'custom:' + label;
  opt.textContent = label;
  var customItem = sel.querySelector('option[value="__custom__"]');
  sel.insertBefore(opt, customItem);
  opt.selected = true;
  try { markDirty(); } catch (e) {}
}
// в делегированном change-обработчике сцен (там же, где select.scene-select):
if (t.matches('select.scene-loc-select, select.scene-plan-select, select.scene-framing-select')) {
  handleCustomSceneSelect(t);
}
```

**Проверка:** выбрать «Свой вариант…», ввести текст → опция добавляется и выбирается; сохраняется и восстанавливается после перезагрузки/переключения сцены.

---

## 8. ✅ Тап по основному меню закрывает шторку ассистента

**Где:** шторка `#assistant-drawer`, бэкдроп `#assistant-drawer-backdrop` (перекрывает только область справа от шторки; основной контент намеренно остаётся интерактивным). Закрытие: `closeAssistantDrawer()`.

**Нужно:** когда шторка открыта, **тап** (не свайп) по основному контенту тоже закрывает её.

**Фикс:** документ-уровневый обработчик «тап вне панели» — фиксируем pointerdown, и если на pointerup палец почти не сдвинулся и цель вне `.assistant-drawer` и вне `.assistant-open-strip`, закрываем. (Свайп-закрытие уже есть отдельно — не конфликтует, т.к. реагируем только на «чистый» тап.)

```js
(function wireTapOutsideToCloseDrawer() {
  var dn = null;
  document.addEventListener('pointerdown', function (e) {
    if (!document.body.classList.contains('assistant-drawer-open')) { dn = null; return; }
    dn = { x: e.clientX, y: e.clientY, id: e.pointerId, t: Date.now() };
  }, true);
  document.addEventListener('pointerup', function (e) {
    if (!dn || e.pointerId !== dn.id) { dn = null; return; }
    var moved = Math.hypot(e.clientX - dn.x, e.clientY - dn.y);
    var quick = Date.now() - dn.t < 500;
    dn = null;
    if (!document.body.classList.contains('assistant-drawer-open')) return;
    if (moved > 10 || !quick) return;                 // это свайп/долгое — не трогаем
    var el = e.target;
    if (el && el.closest && (el.closest('.assistant-drawer') || el.closest('.assistant-open-strip'))) return;
    closeAssistantDrawer();
  }, true);
})();
```

**Проверка:** открыть шторку, тапнуть по основному контенту слева/справа → закрывается; свайпы и тап внутри панели работают как раньше.

---

## Порядок проверки после всех правок
1. Бампнуть версию (4 места) и `CACHE_NAME`.
2. Прогнать сценарии проверки из каждого пункта.
3. Закоммитить; задеплоить через деплой-папку `~/Documents/CURSOR/sam-scenes` (push на github.com/SamBruev/sam-scenes → https://sambruev.github.io/sam-scenes/).
