# Sam Scenes — передача проекта (handoff для нового чата)

> Скопируй этот файл целиком в новый чат (или приложи его), чтобы агент сразу понимал
> проект, все ссылки, пути и что осталось доделать.
> Дата составления: 2026-05-23. Обновлено: 2026-06-01 (релиз **v339** — см. SAMSCENES-FIXES-TODO.md, раздел v339).

---

## 1. Что это за проект

**Sam Scenes** — PWA-приложение «Сценарий съёмки» (инструмент для съёмочного дня).
- Один файл `index.html` (~13 000 строк): чистый JavaScript (ES5), CSS заинлайнен, без сборки.
- Хранение данных — `localStorage` (в браузере телефона).
- PWA: есть `manifest.json` и service worker `sw.js`.
- Интерфейс на русском. Целевое устройство — **iPhone, Safari** (добавляется на домашний экран).

---

## 2. Ссылки и репозитории

| Что | Ссылка / путь |
|---|---|
| Боевой сайт (GitHub Pages) | https://sambruev.github.io/sam-scenes/ |
| Боевой репозиторий | https://github.com/SamBruev/sam-scenes |

### Локальная папка
| Назначение | Путь |
|---|---|
| Разработка + git + деплой (одна папка) | `/Users/apple/Documents/CURSOR/SamScenes/` |

> Деплой: `git commit` в `SamScenes` → post-commit hook `git push sam-scenes main` на `SamBruev/sam-scenes`.
> Репозиторий **`abakan-script` удалён** — не использовать.

---

## 3. Как деплоить (важно для агента)

1. Отредактировать `index.html` в `/Users/apple/Documents/CURSOR/SamScenes/`.
2. При выпуске релиза — **поднять версию кэша**: в `sw.js` строка `CACHE_NAME = 'samscenes-vXXX'`
   и в `build-info.json` поле `version`.
3. Закоммитить и запушить:
   ```
   cd /Users/apple/Documents/CURSOR/SamScenes && git add -A && git commit -m "..." && git push sam-scenes main
   ```
   (или положиться на post-commit hook после `git commit`.)
4. GitHub Pages пересобирается ~1 минуту. Проверить:
   ```
   curl -s https://sambruev.github.io/sam-scenes/build-info.json
   ```

> ⚠️ У агента (песочницы) **нет учётных данных GitHub** — сам `git push` он сделать не может.
> Push выполняет **пользователь в Терминале**, либо в remote-URL клона `~/Desktop/sam-scenes`
> прописан токен. Агент может сделать `git commit` локально, но не `git push`.

**Текущая версия:** `v330` (`build-info.json`, `CACHE_NAME = 'samscenes-v330'`,
а также `APP_VERSION` / `BUILD_TIME` в `index.html` — все четыре поля держать синхронными,
иначе сброс кэша вёрстки срабатывает на каждой загрузке).

Последние релизы (2026-05-31): **v327** телепrompter + свайп сценариев; **v329** анимация смены сценария + «Важно»; **v330** SAMSCENES-FIXES-TODO (синхрон имени, дата подготовки, pinch-zoom, float-layout текста, custom-селекты, тап закрывает шторку).

---

## 4. Архитектурные подводные камни (агент обязан знать)

1. **localStorage перезаписывает шаблон.** Приложение сохраняет в `localStorage` весь
   `wrap.innerHTML` каждого сценария. Поэтому если просто поправить HTML-шаблон в `index.html`,
   у существующих пользователей изменение **не появится** — при загрузке восстановится старый
   сохранённый HTML. Решение — паттерн «миграции»: пересобирать блок из канонического шаблона
   при каждой загрузке, сохраняя состояния галочек. Пример уже сделан для блока «Важно»
   (`prepImportantCanonicalInnerHtml()` + `migratePrepImportantBlock(root)`).

2. **`position: fixed` и containing-block.** Если у любого предка есть `transform` или
   `will-change: transform`, он становится containing-block, и `fixed` начинает позиционироваться
   относительно него, а не вьюпорта. Это ломало пиннинг блока «Важно».

3. **iOS Safari рендеринг.** `filter: blur()` даёт дрожание; fixed-элементы и композиция слоёв
   капризны. Анимации лучше делать через `transform`/`opacity`.

4. **Две независимые системы жестов:**
   - `wireAssistantDrawerOpenGestures()` — открытие меню ассистента, на Pointer Events.
   - `wirePullDownReload` — обновление страницы, на Touch Events.
   Их легко случайно «столкнуть» (двойное срабатывание).

5. **Делегирование событий.** Слушатели вешать на `document`, потому что `wrap.innerHTML`
   периодически целиком пересобирается и обычные слушатели слетают.

---

## 5. Ключевые места в коде `index.html`

| Что | Где / детали |
|---|---|
| `updatePrepImportantPin()` | Нейтрализована — пиннинг отключён, просто снимает класс `prep-important-pinned`. |
| `prepImportantCanonicalInnerHtml()` + `migratePrepImportantBlock(root)` | Пересобирают блок «Важно» (11 чекбоксов), сохраняя отметки. Вызывается в `loadFromStorage`, `undoLastChange`, `wirePrepImportantPin`. |
| `wirePrepImportantPin()` | Слушатель `change` делегирован на `document`. |
| `onShotCheckboxToggle` (~строка 11686) | Обработчик «СНЯТО». Тайминги: `SHOT_TAKE_ICON_MS = 220`, `SHOT_AFTER_DIM_MS = 60`. |
| `wireAssistantDrawerOpenGestures()` (~строка 12794) | Открытие шторки ассистента (Pointer Events). `OPEN_EDGE_ZONE = 64`. |
| `wirePullDownReload` | Обработчик свайпов (Touch Events): обновление и переключение сценариев. |
| `goToAdjacentScenario(dir)` | Переключение на соседний сценарий. |
| `AUTO_PAGE_RELOAD_ENABLED = false` (стр. 6385) | Авто-перезагрузка страницы отключена. |
| `PULL_DOWN_RELOAD_ENABLED = false` (стр. 6388) | Pull-to-reload отключён. |
| CSS `.assistant-drawer` | `background: rgba(10, 9, 8, 0.6)` + `backdrop-filter: blur(22px)`. |
| CSS `.scene-main > .line-say > b` | `font-size: 1.2em` (слово «Говорю» крупнее). |

После каждой правки JS — проверять `node --check index.html`.

---

## 6. Что уже сделано (фидбек, раунд 2 — закоммичено)

Коммит `c69cb0d` в `~/Desktop/sam-scenes/` (нужно проверить, запушен ли он):

- ✅ #1 — уменьшены задержки перехода после «СНЯТО».
- ✅ #2 — исправлена регрессия: блок «Важно» снова в карточке «Подготовка».
- ✅ #3 — расширена краевая зона открытия ассистента (`OPEN_EDGE_ZONE = 64`).
- ✅ #5 — фону меню ассистента возвращена полупрозрачность.
- ✅ #7 — слово «Говорю» сделано крупнее.
- ✅ #10 — подтверждено: авто-обновление раз в несколько минут отключено.

---

## 7. Фидбек раунда 2 + видео 05-24 — сделано (v309)

Все 8 пунктов реализованы в `v309` (правки в рабочей папке, не запушено агентом —
push делает пользователь). Что и как:

- ✅ **#4** — фикс-скролл основного экрана (`position:fixed` на `body`) снимается
  в начале закрытия шторки (`closeAssistantDrawer`, `assistantDrawerSnapShutFromDrag`),
  пока панель ещё перекрывает экран, — кадр-рывок со `scrollY=0` больше не виден.
- ✅ **#6** — пунктир «Примечание»/«Перебивка» перенесён на строку метки
  (`.line-note > b::after`, `.intercut > b::after`); нижний `::after` под полем убран.
- ✅ **#8** — добавлен такой же пунктир к «Говорю» (`.line-say::after`, грид-колонка 2).
- ✅ **#9** — анимация обновления переделана: новый элемент `#reload-camera` (SVG-фотоаппарат)
  выдвигается из центра правого края + вспышка `pull-reload-flash--from-edge --fire`.
  `FIRE_MS` для свайп-обновления = 470 мс.
- ✅ **#11** — `openAssistantDrawerCoreAfterSnap` рендерит список ДО показа панели
  (пока она за краем, `translateX(-102%)`), класс открытия добавляется уже с готовым DOM.
- ✅ **#12** — в `goToAdjacentScenario` добавлена плавная прокрутка наверх
  (`window.scrollTo({top:0, behavior:'smooth'})`). Сам свайп уже был подключён ранее
  (`didSwipeLeftMid` / `didSwipeRightMid` в `wirePullDownReload`).
- ✅ **#13** — в `sw.js`: network-first для `index.html` теперь с тайм-аутом
  `HTML_NETWORK_TIMEOUT_MS = 2500` — на медленной сети сразу отдаётся кэш, не «висит».
- ✅ **Голубая подсветка шторки** — `user-select:none`, `-webkit-touch-callout:none`,
  `-webkit-tap-highlight-color:transparent` на `.assistant-open-strip`,
  `.assistant-drawer-dismiss-chevron` и на всё (`html.assistant-drawer-tracking *`)
  на время жеста.

> ⚠️ **#4 и #11 требуют проверки на реальном iPhone Safari** — это тонкий рендеринг iOS,
> чинилось по логике причины, без устройства не верифицировано. Если дёрганье/мигание
> осталось — следующий кандидат: убрать тяжёлый `backdrop-filter: blur(22px)` с
> `.assistant-drawer` на время анимации (через класс на `<html>`, снимать по `transitionend`).

## 7a. Раунд 3 — сделано (v310)

Фидбек по видео + новые правки. Все в проде (`v310`):

- ✅ **Дёрганье шторки (#1/#4/#11)** — на время анимации/перетаскивания снимается
  `backdrop-filter: blur()` с `.assistant-drawer`: класс `html.assistant-drawer-anim`
  (помощник `beginAssistantDrawerAnim()`, таймер 380мс) + существующий
  `html.assistant-drawer-tracking`. CSS-правило заменяет стекло на почти непрозрачный фон
  `rgba(13,11,10,0.95)` на это время. Вызовы в `openAssistantDrawerCoreAfterSnap` и
  `closeAssistantDrawer`. Драг-пути покрыты классом `tracking`.
- ✅ **Обводка кнопки-шторки (#5)** — `#assistant-open-strip` это `<button>`, при тапе
  оставался фокус-ринг. Добавлены `outline:none` + `appearance:none` на
  `.assistant-open-strip` и `.assistant-drawer-dismiss-chevron`.
- ✅ **«Всё под контролем?»** — добавлен «?». Правка в статическом HTML И в
  `prepImportantCanonicalInnerHtml()` (иначе миграция перезатрёт).
- ✅ **Значок-напоминание «Важно»** — плавающая плашка внизу по центру
  (`#prep-important-reminder`, прямой ребёнок `<body>`), видна пока чеклист не отмечен весь;
  счётчик невыполненных; тап → `scrollIntoView` к блоку. Логика — `updatePrepImportantReminder()`,
  вызывается из `updatePrepImportantPin()`. Прячется при открытой шторке ассистента.
- ⏭️ Центрирование «ВАЖНО» — по решению пользователя НЕ делать.

## 7b. Раунд v338–v339 — сделано (2026-06-01)

- ✅ **Свой вариант** в селектах сцены — диалог `.scene-custom-select-dialog` вместо `window.prompt`.
- ✅ **Sam / Примечание / Перебивка** — пунктир не под подписью; тап по бланку → фокус; перенос текста с левого края (`display: contents`).
- ✅ **Sam** вместо «Говорю» + миграция `migrateSayLabelToSam`.
- ✅ **Типографика** — Sam крупнее; локация / план / кадр / примечание / перебивка — один размер.
- ✅ **«Всё под контролем!»** — Pacifico после имени ассистента (подготовка + шторка) при полном чеклисте «Важно».

> ⚠️ Если дёрганье шторки всё ещё осталось после v310 — `backdrop-filter` уже снят,
> следующий кандидат — сам scroll-lock (`lockAssistantDrawerMainScroll`: body `position:fixed`
> даёт перерисовку при открытии). На закрытии lock снимается рано (скрыто за панелью);
> при открытии — попробовать отложить `lockAssistantDrawerMainScroll()` до конца слайда.

### Песочница и деплой — важно для агента

`git` из песочницы умеет `commit`, но **не умеет `push`** (нет учётных данных GitHub) и
**не умеет удалять файлы** в смонтированной папке (`unlink` → «Operation not permitted»).
Поэтому после `git commit` из песочницы остаются пустые `.git/*.lock` и `.git/objects/*/tmp_obj_*`.
Перед push пользователь должен почистить:
`rm -f ~/Desktop/sam-scenes/.git/*.lock ~/Desktop/sam-scenes/.git/objects/*/tmp_obj_* && cd ~/Desktop/sam-scenes && git push`

---

## 8. Рекомендации по работе

- Файл `index.html` огромный (~13 000 строк). Не делать большие «слепые» правки пачкой —
  это уже приводило к регрессиям. Лучше маленькими порциями, каждую проверять и деплоить.
- После каждой пачки JS-правок: `node --check index.html`.
- После деплоя — проверять боевой сайт через `curl` (`build-info.json` и/или искать по тексту).
- Поднимать `CACHE_NAME` в `sw.js` и `version` в `build-info.json` на каждом релизе,
  иначе у пользователя останется старый кэш.
- Всё тестировать с расчётом на iPhone Safari.
- Помнить: правки HTML-шаблона не дойдут до пользователя без миграции (см. п. 4.1).

---

## 9. Ограничения безопасности

- Деплой: `git push sam-scenes main` из `/Users/apple/Documents/CURSOR/SamScenes/`.
- `abakan-script` на GitHub нужно удалить вручную, если `gh repo delete` не прошёл (нужен scope `delete_repo`).
