# Sam Scenes — структура проекта

**Версия в проде:** v404 · [sambruev.github.io/sam-scenes/](https://sambruev.github.io/sam-scenes/)

Одностраничное PWA «сценарий съёмки» — один `index.html` (HTML + CSS + JS), без сборки.

**Одна папка** — и разработка, и git-репозиторий [SamBruev/sam-scenes](https://github.com/SamBruev/sam-scenes) (GitHub Pages). Отдельного клона `../sam-scenes/` больше нет.

---

## Папки

| Путь | Назначение |
|------|------------|
| `index.html`, `sw.js`, `build-info.json`, `manifest.json`, `media/`, иконки | **Приложение** — правки здесь |
| `tools/` | Локальный сервер ссылок MD → Finder (порт `19847`) |
| `OPUS_REVIEW/` | Пакет для аудита Opus — [START_HERE](http://127.0.0.1:19847/reveal?p=/Users/apple/Documents/CURSOR/SamScenes/OPUS_REVIEW/START_HERE.md) |
| `scripts/` | `snapshot-index.sh`, кодирование медиа |
| `snapshots/` | Локальные снимки `index.html` по версиям (**в `.gitignore`**, не в git) |
| `portfolio-*` | Отдельные материалы портфолио, **не** часть деплоя Sam Scenes |

---

## Рабочий цикл

1. Редактировать **`index.html`** (и при необходимости `sw.js`, `build-info.json`, ассеты).
2. Бамп версии в **четырёх местах** (иначе PWA отдаст старый кэш):
   - `index.html` → `<title>` и `APP_VERSION` / `BUILD_TIME`
   - `build-info.json` → `version`, `build`
   - `sw.js` → `CACHE_NAME = 'samscenes-vNNN'`
3. **`git add`** → **`git commit`** → **`git push sam-scenes main`** (или полагаться на post-commit hook).

**Автопush** (один раз):

```bash
cd /Users/apple/Documents/CURSOR/SamScenes
git config core.hooksPath .githooks
```

После `git commit` на `main` hook сам пушит на GitHub Pages.

---

## Документация (MD)

| Файл | Содержание |
|------|------------|
| [PROJECT.md](http://127.0.0.1:19847/reveal?p=/Users/apple/Documents/CURSOR/SamScenes/PROJECT.md) | Этот файл — карта проекта |
| [SAMSCENES-FIXES-TODO.md](http://127.0.0.1:19847/reveal?p=/Users/apple/Documents/CURSOR/SamScenes/SAMSCENES-FIXES-TODO.md) | ТЗ и чеклисты правок |
| [SAM_SCENES_HANDOFF.md](http://127.0.0.1:19847/reveal?p=/Users/apple/Documents/CURSOR/SamScenes/SAM_SCENES_HANDOFF.md) | Handoff для нового чата / агента |
| [OPUS_REVIEW/START_HERE.md](http://127.0.0.1:19847/reveal?p=/Users/apple/Documents/CURSOR/SamScenes/OPUS_REVIEW/START_HERE.md) | Аудит Opus — точка входа |
| [AUDIT-PROMPT-OPUS.md](http://127.0.0.1:19847/reveal?p=/Users/apple/Documents/CURSOR/SamScenes/AUDIT-PROMPT-OPUS.md) | Полный промпт аудита (матрица A→L) |
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

- Открыть `index.html` или `LOCAL-OPEN.html`
- Проверка прода: `curl -s https://sambruev.github.io/sam-scenes/build-info.json`

---

## Что не коммитить

- `snapshots/` — локальный архив версий
- `.DS_Store`
