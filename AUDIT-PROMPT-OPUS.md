# Sam Scenes — промпт полного аудита для Claude Opus 4.8

**Как использовать:** новый чат → модель **Opus 4.8** → workspace `/Users/apple/Documents/CURSOR/SamScenes` → вставить блок «Промпт» ниже целиком. Дополнительно приложить `@index.html`, `@sw.js`, `@SAMSCENES-FIXES-TODO.md`, `@SAM_SCENES_HANDOFF.md`, `@AUDIT-SamScenes-v339.md` (как ориентир формата, не дублировать слепо).

**Целевая версия на момент составления:** v403+ · монолит `index.html` (~17k строк).  
**Точка входа для повторного аудита:** `OPUS_REVIEW/START_HERE.md`

---

## Промпт (копировать отсюда)

```
Ты — senior QA-инженер + iOS WebKit/PWA-специалист + code reviewer. Задача: **исчерпывающий аудит** PWA «Sam Scenes» (сценарий съёмки) — каждое меню, каждый пункт UI, каждая связанная логика, стабильность на **iPhone/iPad (Safari + standalone PWA «на рабочий стол»)**.

## Контекст проекта

- **Репозиторий:** `/Users/apple/Documents/CURSOR/SamScenes`
- **Приложение:** один файл `index.html` (HTML+CSS+JS), без сборки
- **Деплой:** GitHub Pages `SamBruev/sam-scenes` · `sw.js` + `manifest.json`
- **Версия:** проверь `<title>`, `APP_VERSION`, `build-info.json`, `CACHE_NAME` в `sw.js` — все 4 поля должны совпадать
- **Пользователь:** Sam, звукорежиссёр/продакшн; основной девайс — **iOS PWA**
- **Язык отчёта:** русский, технически точный, без воды

## Методология (обязательно выполнить все пункты)

1. **Статический разбор кода**
   - Прочитай `index.html` секциями: CSS (жесты, fixed, blur, z-index), HTML (DOM), JS (все `<script>` — `node --check` на каждый блок)
   - Составь карту: `id` / классы → обработчики (`wire*`, `ensure*`, `sync*`, `open*`) → localStorage-ключи → side effects
   - Найди дубли логики, мёртвый код, гонки touch/click/pointer, `preventDefault` на `<details>`, делегирование на `document`

2. **Трассировка данных**
   - Откуда берётся состояние, куда пишется, что переживает reload/PWA update
   - Ключи storage: `samscenes-scenarios-v2`, trash, teleprompter settings, prep, logo, bundle.activeId и т.д.
   - `persistToStorage` / `writeScenarioBundle` / `markDirty` / миграции — риск QuotaExceeded на iOS (~5 МБ)

3. **Runtime на iOS (если доступен browser MCP / CDP)**
   - Эмуляция iPhone viewport + **standalone** (`display-mode: standalone` или реальное устройство Sam)
   - Прогнать сценарии из раздела «Матрица проверок» ниже
   - Фиксировать: console errors, зависания, двойные срабатывания, scroll lock, SW reload

4. **Не выдумывать**
   - Баг = ссылка на файл/функцию/строку + шаги воспроизведения
   - Гипотеза = помечать «гипотеза», предложить A/B или измерение
   - Не приписывать поведение без чтения кода

5. **Идеи улучшений**
   - Отдельный раздел: UX, perf, iOS-стабильность, доступность, архитектура
   - Приоритет: 🔴 критично · 🟠 высокий · 🟡 средний · 🟢 низкий · 💡 идея

## Архитектурные ограничения (не ломать без веской причины)

- **Нельзя** `transform` на `.wrap` — ломает `position:fixed` у `#top-logo-block`
- **Избегать** живого `filter`/`backdrop-filter` на fixed-слоях при scroll (история вылетов WebKit) — только opacity crossfade заранее размытых слоёв
- Два жестовых стека: Touch (`wirePullDownReload`) + Pointer (`wireAssistantDrawerOpenGestures`) на `document` capture — зона риска конфликтов
- SW auto-update: `controllerchange` → reload (не при открытом `#teleprompter-overlay`)
- Intro/Outro не удаляются; минимум 1 body-сцена между ними

---

## МАТРИЦА: каждый блок UI → что проверить

### A. Шапка / брендинг
| Элемент | ID/класс | Проверить |
|---------|----------|-----------|
| Логотип SAM BRUEV | `#top-logo-block`, `.logo-bg`, drag scale | fixed при scroll, `--top-logo-reveal`, pull-stack `--pull-stack-y`, hit-test не блокирует hub |
| Слайдер масштаба | `#logo-scale` | сохранение в logo/prep, touch не блокирует scroll (`touch-action: pan-y`) |
| Фон liquid glass | `body::before/after`, `--app-bg-scroll-blur` | плавность наверх/вниз, нет jank на iOS, reduced-motion |

### B. «Настройки сценариев» (`#scenario-hub`, `<details>`)
| Поле/кнопка | ID | Проверить |
|-------------|-----|-----------|
| Селект сценария | `#scenario-select` | switch DOM, `refreshDomRefs`, title sync, dirty save |
| Фильтр даты | `#scenario-filter` | today/week/all |
| Фильтр блока | `#scenario-block-filter` | опции из shoot blocks |
| Название | `#scenario-name` | → title row, bundle |
| Блок/папка | `#scenario-shoot-block` | фильтры, assistant drawer |
| Дата | `#scenario-date`, `#scenario-hub-date-display` | iOS date picker, placeholder «—» |
| Кол-во роликов | `#scenario-count` | |
| Статус | `#scenario-status` | draft/… |
| + Новый шаблон | `#btn-scenario-new` | `createNewScenarioTemplate`, prep copy |
| Удалить | `#btn-scenario-delete` | confirm, min 1 scenario |
| Summary toggle | `wireDetailsSummaryRowToggle` | iOS WebKit pointerup vs click, без двойного toggle |

**Default:** hub свёрнут (нет `open` на load)

### C. «План дня» (`#daily-plan`)
| Элемент | ID | Проверить |
|---------|-----|-----------|
| Summary | `#plan-summary` | генерация из сценариев/дат |
| Список | `#plan-list` | клики, фильтрация |
| Default collapsed | | как hub |

### D. Заголовок сценария
| Элемент | | |
|---------|--|--|
| `.title-row`, `.title-subject` | | sync при swipe switch, fade animation |

### E. «Подготовка» (`.card-prep`)
| Поле | ID | Проверить |
|------|-----|-----------|
| Локация хука | `#prep-hook-location` | select options |
| Локация основного | `#prep-main-location` | |
| Дата съёмки | `#prep-date`, `#prep-date-wrap` | tap → calendar, hint, delegation |
| Формат: aspect/quality/fps | `#prep-format-*` | default «—», sync prep object |
| Ассистent | `#prep-assistant-open` | opens drawer; readonly name |
| Подпись «Всё под контролем!» | `#prep-assistant-all-clear` | после полного «Важно», Pacifico под именем |
| **Важно** | `#prep-important-block` | 11 чекбоксов, pin/collapse, pulse, reminder badge `#prep-important-reminder`, scroll-safe tap |

### F. Телесуфлёр — меню перед INTRO
| Элемент | ID | Проверить |
|---------|-----|-----------|
| Блок меню | `#teleprompter-menu`, `ensureTeleprompterMenu()` | re-inject после refreshDomRefs |
| Запуск | `#teleprompter-menu-open` | `(Весь сценарий)`, `readAllScenesSayText()` |
| Per-scene кнопки | `.scene-play-btn` | `openTeleprompterForScene` |

### G. Сцены (`#scene-stack`, `#scene-outro-stack`, template)
| Элемент | | Проверить |
|---------|--|-----------|
| INTRO / OUTRO | `data-scene-role` | no delete, toolbar hidden remove/add |
| Body scenes | time pickers, `.say-editable`, note, intercut | contenteditable, has-text underline, replace btn |
| Toolbar | `.scene-remove`, `.scene-add`, `.scene-done-label` | order [корзина|СНЯТО|+], clapper center, delete anim `scene-remove-anim`, insert anim |
| Снято | `.scene-shot-checkbox`, clapper SVG | checked state, scene dim `scene-shot-complete`, haptic |
| Телесуфлёр на сцене | `.scene-play-btn` | |
| Renumber | `renumberScenes` | после add/remove |
| Timeline | `wireSceneStackTimelineContinuity` | end time → next start |
| Time dialog | `openSceneTimeCenterDialog`, iOS wheels | |

### H. Шотлист (`.shotlist-section`)
| Элемент | | Проверить |
|---------|--|-----------|
| Pieces row | `.shotlist-pieces-*` | pickers, manual input, remove, progress |
| Locations | `.shotlist-loc` | headings, rows, scroll-into-view |
| Связь со сценами | | next undone scene navigation |

### I. Оверлей телесуфлёра (`#teleprompter-overlay`)
| Элемент | | Проверить |
|---------|--|-----------|
| Закрытие × | `#teleprompter-close`, `closestTeleprompterCloseFromEvent` | **критично в standalone PWA** — touchend/pointerup capture |
| Scroll lock | `lockMainScrollForTeleprompter` | без `body position:fixed` (perf) |
| Play/pause, speed, font | settings `#teleprompter-settings` | localStorage `samscenes-teleprompter-settings-v1` |
| Key bindings | play/stop/hold, pickers | capture phase, no conflict with scene UI |
| Enter hold scroll | | зажал — едет, отпустил — стоп |
| SW reload defer | | не reload пока overlay open |

### J. Шторка ассистента (`#assistant-drawer`)
| Элемент | ID | Проверить |
|---------|-----|-----------|
| Open | `#prep-assistant-open`, edge swipe | `wireAssistantDrawerOpenGestures`, openFromLeftEdge |
| Close | `#assistant-drawer-close`, backdrop, swipe | `wireAssistantDrawerCloseSwipe`, no fingerprint icon |
| Host block | `#assistant-drawer-host-name`, `#assistant-drawer-host-clear` | sync с prep |
| Новый план | `#assistant-new-*`, `#btn-assistant-new-scenario` | create + switch |
| Список планов | `#assistant-drawer-list` | select, reorder?, duplicate |
| Корзина | `#assistant-drawer-trash`, trash list | restore, purge 30d |
| Scroll thumb | `#assistant-drawer-axis-thumb` | hidden chevron |
| Glass + blur main | `--assistant-main-bg-blur` | anim tracking classes, iOS jitter |
| Tap outside | `wireTapOutsideToCloseDrawer` | |

### K. Глобальные жесты и система
| Функция | | Проверить |
|---------|--|-----------|
| Pull-to-reload | `wirePullDownReload`, `PULL_DOWN_RELOAD_ENABLED` | pull-stack lerp, rubber band |
| Swipe switch scenario | `wireScenarioSwitchSwipe` | mid-screen L/R, fade, title anim |
| Pinch zoom reset | `wireViewportPinchZoomReset` | a11y tradeoff |
| Details toggles | hub, daily-plan | |
| Haptics | `triggerHaptic` | danger on delete |
| Undo | `rememberUndoState` | |
| Autosave / dirty | `markDirty`, debounce | |
| Crash diag | `setupCrashDiagnostics` | quota impact |
| Build chip | `.app-build-chip` | |
| Bottom logo | `#bottom-logo` | |

### L. Service Worker & PWA
| | Проверить |
|--|-----------|
| `sw.js` CACHE_NAME vs version | |
| network-first HTML, cache-first assets | |
| `controllerchange` reload logic | old PWA instances |
| `manifest.json` standalone | icons, theme |
| Offline first open | |

---

## iOS / PWA — углублённый чеклист

- [ ] **Standalone vs Safari:** одно и то же поведение для суфлёра ×, details toggle, assistant drawer
- [ ] **Safe area:** `env(safe-area-inset-*)` на fixed элементах
- [ ] **100vh / dvh:** фон, wrap min-height — прыжки при hide URL bar
- [ ] **Visual viewport:** keyboard, teleprompter, note focus (`wireNoteFocusViewportCenter`)
- [ ] **Touch 300ms / synthetic click:** делегирование touchend+click с антидублем (700ms) на add scene, teleprompter close
- [ ] **Overscroll rubber-band** at top vs pull-stack vs logo reveal
- [ ] **Memory:** большой innerHTML в localStorage, diag log heartbeat
- [ ] **GPU layers:** will-change, filter, backdrop-filter count — tab crash on long scroll
- [ ] **Rotation / resize:** layout reflow
- [ ] **Background → foreground:** SW update, pending reload
- [ ] **prefers-reduced-motion:** anim insert/remove, clapper, logo

---

## Формат итогового отчёта

```markdown
# Sam Scenes — аудит vNNN (Opus)
Дата · версия · метод (static / browser / device)

## Executive summary
3–5 предложений: общее здоровье, топ-3 риска, топ-3 quick wins

## Инвентарь пройден
Таблица: Блок → статус (✅ / ⚠️ / 🔴) → краткий вывод

## Находки по severity
### 🔴 Критично
### 🟠 Высокий
### 🟡 Средний
### 🟢 Низкий

Для каждой: **Симптом · Шаги · Код (file:line) · iOS контекст · Fix (конкретный diff-уровень, не абстракция)**

## Связанные логические цепочки (trace diagrams)
Минимум 5 end-to-end:
1. Создать сценарий → правка сцены → autosave → reload
2. Полный «Важно» → подпись ассистента → collapse
3. Телесуфлёр весь сценарий → keys → close → return main
4. Delete scene → renumber → undo?
5. PWA update после deploy

## 💡 Идеи и предложения (не только баги)
| Идея | Зачем | Effort | Risk iOS |
|------|-------|--------|----------|

## Regression watchlist
Что retest после любых правок

## Что подтверждено исправным
Список с доказательством (код/тест/скрин)

## Recommended action plan
Упорядоченный backlog на 1–2 спринта Sam
```

## Ограничения ответа

- **Не вносить правки в код** в этом задании — только аудит и рекомендации (если Sam не попросит fix отдельно)
- Не раздувать отчёт пересказом UI — фокус на **логика, edge cases, iOS**
- Учитывать предыдущий аудит `AUDIT-SamScenes-v339.md` — **перепроверить** пункты 1–6, отметить fixed/open/regressed
- В конце: **3 уточняющих вопроса Sam** (устройство iOS версии, standalone или Safari, типичный сценарий использования на съёмке)

Начни с чтения `index.html` (grep карта `wire*` / storage keys), затем `sw.js`, затем пройди матрицу A→L по порядку. Работай до полного покрытия — не останавливайся на поверхностном обзоре.
```

---

## После аудита

Sam может попросить:
- fix по приоритету 🔴→🟠
- `/handoff` → `CURSOR/REVIEW_PACK/CURRENT.md`
- деплoy: bump vNNN в 4 местах → commit → push
