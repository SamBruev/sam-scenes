# OPEN ITEMS — что ещё проверить / не закрыто

Сверка с [AUDIT-SamScenes-v401.md](../AUDIT-SamScenes-v401.md). **F1 и quick wins v402 — считать закрытыми в коде; нужен retest на iPhone.**

---

## 🔴 / 🟠 — приоритет проверки Opus

| ID | Тема | Статус к v403 | Действие Opus |
|----|------|---------------|---------------|
| F1 | Шотлист «№» после смены сценария | **fix в v402** (`refreshDomRefs` ~8247) | Retest iOS; если OK — закрыть |
| #1 | Autosave выключен | **by design** | Подтвердить с Sam: вернуть debounce или оставить только flushSave |
| #2 | Шрифты с Google Fonts CDN | открыто | Офлайн PWA; нужны локальные `.woff2` + CORE_FILES |
| #3 | Close-guard суфлёра | **900ms в v402** | Retest standalone PWA |
| #5 | Cache ассетов | **stale-while-revalidate в v402** | Проверить обновление картинок без bump CACHE_NAME |

---

## 🟡 — средний приоритет

| ID | Тема | Заметка |
|----|------|---------|
| — | Bundle JSON ~5 МБ iOS quota | recovery есть; при многих сценариях всё ещё tight |
| — | Dual gesture Touch + Pointer | pull off; scenario swipe + assistant pointer |
| — | `suppressNextSceneRemoveClick` без timeout | гипотеза гонки click после remove |
| — | Pinch zoom blocked | a11y tradeoff |
| — | Мёртвый код `openFromLeftEdge` в assistant gestures | ~16428, всегда false |

---

## ✅ Закрыто (не реоткрывать без регрессии)

- v339: дубль HTML в STORAGE_KEY
- v339: base64 lamp в body
- v339: diag heartbeat в prod (verbose flag)
- trash quota recovery (v401)
- undo перед delete scene (`flushUndoSnapshot`, v401)
- top-logo.png + build-info в SW CORE (v401–v402)
- persist перед delete соседнего сценария (v402)
- flushSave перед SW reload (v402)
- Дубль «Всё под контролем!» под ассистентом (v403)

---

## 💡 Идеи (не баги)

- IndexedDB для html сценариев
- Quota meter в hub
- Локальные шрифты в `fonts/`
- Единый GestureController
- Persist open/closed hub + plan day
