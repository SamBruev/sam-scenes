# Sam Scenes — структура проекта

**Версия в проде:** v339 · [sambruev.github.io/sam-scenes/](https://sambruev.github.io/sam-scenes/)

Одностраничное PWA «сценарий съёмки» — один `index.html` (HTML + CSS + JS), без сборки.

---

## Папки

| Путь | Назначение |
|------|------------|
| `sam-scenes/` | **Исходник приложения** — правки здесь |
| `../sam-scenes/` | **GitHub Pages** — git-репо [SamBruev/sam-scenes](https://github.com/SamBruev/sam-scenes), push = деплой |
| `tools/` | Локальный сервер ссылок MD → Finder (порт `19847`) |
| `scripts/` | `snapshot-index.sh`, кодирование медиа |
| `snapshots/` | Локальные снимки `index.html` по версиям (**в `.gitignore`**, не в git) |
| `portfolio-*` | Отдельные материалы портфолио, **не** часть деплоя Sam Scenes |

---

## Рабочий цикл

1. Редактировать **`SamScenes/sam-scenes/index.html`** (и при необходимости `sw.js`, `build-info.json`, ассеты).
2. Бамп версии в **четырёх местах** (иначе PWA отдаст старый кэш):
   - `index.html` → `<title>` и `APP_VERSION` / `BUILD_TIME`
   - `build-info.json` → `version`, `build`
   - `sw.js` → `CACHE_NAME = 'samscenes-vNNN'`
3. Синхронизировать в деплой и отправить на GitHub:

```bash
rsync -a --delete --exclude '.git' sam-scenes/ ../sam-scenes/
cd ../sam-scenes && git add -A && git commit -m "Sam Scenes vNNN: …" && git push origin main
```

**Автопush из monorepo** (один раз):

```bash
cd /Users/apple/Documents/CURSOR/SamScenes
git config core.hooksPath .githooks
```

После `git commit` на `main` hook сам rsync + push в `../sam-scenes/`.

---

## Документация (MD)

| Файл | Содержание |
|------|------------|
| [PROJECT.md](http://127.0.0.1:19847/reveal?p=/Users/apple/Documents/CURSOR/SamScenes/PROJECT.md) | Этот файл — карта проекта |
| [SAMSCENES-FIXES-TODO.md](http://127.0.0.1:19847/reveal?p=/Users/apple/Documents/CURSOR/SamScenes/SAMSCENES-FIXES-TODO.md) | ТЗ и чеклисты правок |
| [SAM_SCENES_HANDOFF.md](http://127.0.0.1:19847/reveal?p=/Users/apple/Documents/CURSOR/SamScenes/SAM_SCENES_HANDOFF.md) | Handoff для нового чата / агента |
| [README.md](http://127.0.0.1:19847/reveal?p=/Users/apple/Documents/CURSOR/SamScenes/README.md) | Краткий вход в репозиторий |

### Ссылки MD → Finder (Cursor)

В чате Cursor **`file://` не открывает Finder**. Рабочий формат:

```text
http://127.0.0.1:19847/reveal?p=/Users/apple/Documents/CURSOR/SamScenes/ИМЯ.md
```

**Запуск сервера** (один раз за сессию macOS):

- двойной клик: `tools/start-md-finder-links.command`
- или: `python3 tools/md-finder-link-server.py`

Индекс: [http://127.0.0.1:19847/](http://127.0.0.1:19847/)

---

## Локальный просмотр

- Деплой-папка: открыть `../sam-scenes/index.html` или `LOCAL-OPEN.html`
- Проверка продa: `curl -s https://sambruev.github.io/sam-scenes/build-info.json`

---

## Что не коммитить

- `snapshots/` — только локально
- `.DS_Store`
- Дубликаты `sam-scenes/` внутри деплой-репо (источник один — monorepo или прямой push в deploy)
