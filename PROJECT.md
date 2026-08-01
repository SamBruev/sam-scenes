# Sam Scenes — структура проекта

**Версия:** v411 (локально; прод обновится после `git push`) · [sambruev.github.io/sam-scenes/](https://sambruev.github.io/sam-scenes/)

Одностраничное PWA «сценарий съёмки» — один `index.html` (HTML + CSS + JS), без сборки.

**Одна папка** — и разработка, и git-репозиторий [SamBruev/sam-scenes](https://github.com/SamBruev/sam-scenes) (GitHub Pages).

> **Новый Mac (2026-08-02):** проект восстановлен из GitHub после потери компьютера.
> Папка: `/Users/SamBruev/Documents/Yandex.Disk.localized/CLAUDE/SamScenes`
> Старый путь `/Users/apple/Documents/CURSOR/SamScenes` больше не существует.
>
> **Первый шаг на новом Mac:** `bash restore-git.sh` — подтянет git-историю с GitHub,
> закоммитит v411, включит auto-push hook и прогонит `node --check`.

---

## Папки

| Путь | Назначение |
|------|------------|
| `index.html`, `sw.js`, `build-info.json`, `manifest.json`, `media/`, иконки | **Приложение** — правки здесь |
| `fonts/` | Локальные шрифты `.woff2` (Roboto Slab variable, Pacifico, Bad Script — latin+cyrillic), v411 |
| `tools/` | Локальный сервер ссылок MD → Finder (порт `19847`) |
| `OPUS_REVIEW/` | Пакет для аудита — `OPUS_REVIEW/START_HERE.md` |
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
3. **`git add`** → **`git commit`** → **`git push origin main`** (или полагаться на post-commit hook).

**Автопush** (один раз на новом Mac):

```bash
cd "/Users/SamBruev/Documents/Yandex.Disk.localized/CLAUDE/SamScenes"
git config core.hooksPath .githooks
```

После `git commit` на `main` hook сам пушит на GitHub Pages.

---

## Документация (MD)

| Файл | Содержание |
|------|------------|
| `PROJECT.md` | Этот файл — карта проекта |
| `SAMSCENES-FIXES-TODO.md` | ТЗ и чеклисты правок (история) |
| `SAM_SCENES_HANDOFF.md` | Handoff для нового чата / агента |
| `OPUS_REVIEW/START_HERE.md` | Аудит — точка входа |
| `OPUS_REVIEW/CURRENT.md` | Актуальное состояние (v411) |
| `AUDIT-PROMPT-OPUS.md` | Полный промпт аудита (матрица A→L) |
| `README.md` | Краткий вход в репозиторий |

### Ссылки MD → Finder (Cursor)

В чате Cursor **`file://` не открывает Finder**. Рабочий формат:

```text
http://127.0.0.1:19847/reveal?p=/Users/SamBruev/Documents/Yandex.Disk.localized/CLAUDE/SamScenes/ИМЯ.md
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
