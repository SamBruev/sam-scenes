# Sam Scenes — проверка Opus (точка входа)

**Обновлено:** 2026-06-11 · прод **v403**

---

## Быстрый старт (New Agent → Opus 4.8)

1. Workspace: `/Users/apple/Documents/CURSOR/SamScenes`
2. Прочитать по порядку:
   - [CURRENT.md](CURRENT.md) — что в проде, что уже починено, что не трогать
   - [OPEN_ITEMS.md](OPEN_ITEMS.md) — открытые риски из прошлых аудитов
   - [IOS_CHECKLIST.md](IOS_CHECKLIST.md) — что retest на iPhone PWA
3. Полный промпт аудита: [../AUDIT-PROMPT-OPUS.md](../AUDIT-PROMPT-OPUS.md) (блок «Промпт» внутри)
4. Приложить в чат: `@index.html` `@sw.js` `@manifest.json` `@build-info.json`

---

## Прод и проверка версии

| | |
|---|---|
| Pages | https://sambruev.github.io/sam-scenes/ |
| build-info | https://sambruev.github.io/sam-scenes/build-info.json |
| Репо | https://github.com/SamBruev/sam-scenes |

```bash
curl -s https://sambruev.github.io/sam-scenes/build-info.json
```

Ожидается `"version": "v403"` (или новее после следующего деплоя).

---

## Куда писать результат

- Новый отчёт: `AUDIT-SamScenes-vNNN.md` в корне репо (формат — см. v400/v401)
- Критичные фиксы — отдельным коммитом + bump vNNN в **4 местах** (см. [CURRENT.md](CURRENT.md))

---

## Связанные файлы (корень репо)

| Файл | Зачем |
|------|--------|
| `AUDIT-PROMPT-OPUS.md` | Полная матрица A→L + методология |
| `AUDIT-SamScenes-v400.md` | Аудит Composer |
| `AUDIT-SamScenes-v401.md` | Аудит Opus (до v402) |
| `SAM_SCENES_HANDOFF.md` | Handoff по архитектуре |
| `SAMSCENES-FIXES-TODO.md` | История ТЗ |

---

## Пользователь

**Sam** — звукорежиссёр, основной девайс **iPhone PWA (standalone)**.  
Язык отчёта: **русский**. Код менять только по явному запросу Sam.
