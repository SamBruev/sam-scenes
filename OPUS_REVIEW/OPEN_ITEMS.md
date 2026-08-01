# OPEN ITEMS — что ещё проверить / не закрыто

Сверка с [AUDIT-SamScenes-v401.md](../AUDIT-SamScenes-v401.md). **Все кодовые пункты аудита v401 закрыты к v411; остались retest на iPhone и крупные идеи.**

---

## 🟠 — retest на iPhone (код готов, нужна проверка руками)

| ID | Тема | Статус |
|----|------|--------|
| F1 | Шотлист «№» после смены сценария | fix v402 (`refreshDomRefs`) — retest |
| #1 | Autosave | **мягкий debounce 5 с включён в v411** (решение Sam 2026-08-02) — retest сценарий «правка → 10 с → OOM-kill» |
| #2 | Шрифты | **локальные `fonts/*.woff2` + CORE_FILES в v411** — retest холодный офлайн-старт |
| #3 | Close-guard суфлёра 900ms | v402 — retest standalone |
| #5 | SWR-кэш ассетов | v402 — проверить обновление картинок без bump CACHE_NAME |
| #10 | `suppressNextSceneRemoveClick` авто-сброс 700 мс | **v411** — retest «удалил сцену → сразу тап рядом» |
| #11 | Таймлайн-подтяжка после смены сценария | **v411** (ре-байнд в `refreshDomRefs`) — retest |
| 💡 | Quota-meter в хабе | **v411** — retest отображение и рост |

---

## 🟡 — средний приоритет (осознанно открыто)

| ID | Тема | Заметка |
|----|------|---------|
| — | Bundle JSON ~5 МБ iOS quota | recovery есть + теперь виден quota-meter; при десятках сценариев всё ещё tight |
| — | Dual gesture Touch + Pointer | pull off; scenario swipe (touch) + assistant close (pointer); в v411 меньше веток (open-drag удалён) |
| — | Pinch zoom blocked | осознанный a11y tradeoff (WCAG 1.4.4) — просьба Sam |
| — | `wireSceneUI` биндится один раз на init-овый `#scenes-block` (pre-existing) | после in-place смены сценария его прямые root-слушатели живут на отсоединённом узле; UI держится на document-делегатах. Кандидат на ре-байнд тем же паттерном, что #11/F1 (ревью v411, проход №11) |
| — | `restoreScenarioFromTrash`: корзина персистится до записи bundle (pre-existing) | при отказе bundle-записи после исчерпанного recovery запись теряется из обоих хранилищ; переставить порядок |
| — | ~80 строк CSS `.assistant-open-strip` (pre-existing) | элемент удалён из DOM; JS-guard'ы оставлены с честным комментарием, CSS — на следующую уборку |

---

## ✅ Закрыто (не реоткрывать без регрессии)

- v339: дубль HTML в STORAGE_KEY · base64 lamp · diag heartbeat
- v401: trash quota recovery · undo перед delete scene · top-logo в SW CORE
- v402: F1 re-wire шотлиста · close-guard 900ms · persist перед delete сценария · flushSave перед SW reload · stale-while-revalidate · build-info в CORE
- v403: одна «Всё под контролем!»
- **v411: шрифты локально (#2 + #6) · autosave debounce (#1) · suppress-флаг timeout (#10) · таймлайн ре-байнд (#11) · chip без backdrop-filter (#7) · manifest 512 any+maskable (#12) · 100dvh на фонах (#13) · мёртвый код open-drag/openFromLeftEdge/teleprompterLockScrollY удалён · quota-meter (💡)**

---

## 💡 Идеи (не баги)

- IndexedDB для html сценариев (снимает потолок 5 МБ; effort высокий)
- Единый GestureController (pointer-only; effort высокий, risk средний)
- Persist open/closed hub + plan day
- Smoke-self-test в `#diag-log` на деплое
