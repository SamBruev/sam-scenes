# CURRENT — Sam Scenes v403 (для Opus)

**Дата:** 2026-06-11  
**Прод:** v403 · commit `154e825` (main → sam-scenes)

---

## Версия (4 поля — держать синхронно)

| Место | Значение |
|-------|----------|
| `index.html` `<title>` + `APP_VERSION` | v403 |
| `build-info.json` | v403 |
| `sw.js` `CACHE_NAME` | samscenes-v403 |

---

## Недавно сделано (v395 → v403)

| Ver | Суть |
|-----|------|
| v394 | Hub + план дня свёрнуты по умолчанию |
| v395 | ~~«Всё под контролем!» под ассистентом~~ → **откат v403** |
| v396 | Телесуфлёр: «(Весь сценарий)» |
| v398 | Liquid glass фон + lerp logo reveal при scroll |
| v399 | Анимация delete: max-height + min-height:0 |
| v400 | Меньше хлопушка «Снято» |
| v401–v402 | Quick wins аудита + Opus: trash quota recovery, top-logo в SW, undo перед delete scene, **F1** re-wire шотлиста в `refreshDomRefs`, close-guard суфлёра 900ms, persist перед delete сценария, flushSave перед SW reload, stale-while-revalidate, build-info в CORE |
| v403 | **Одна** «Всё под контролем!» — только блок «Важно» (убраны prep + drawer) |

---

## Не трогать без причины

- **Нет `transform` на `.wrap`** — ломает fixed `#top-logo-block`
- **Живой `filter`/`backdrop-filter` на fixed при scroll** — вылеты WebKit
- **`PULL_DOWN_RELOAD_ENABLED = false`**
- **Autosave отключён** (`scheduleAutosave` — no-op) — по решению Sam
- **Свайп открытия ассистента выключен** — только тап по строке «Ассистент»

---

## Ключевые пути в коде

| Область | Якорь |
|---------|--------|
| Storage / quota | `setLocalStorageItemWithQuotaRecovery` ~8541, `persistToStorage` ~10835 |
| DOM rebuild | `refreshDomRefs` ~8183, шотлист re-wire ~8247 |
| Суфлёр close PWA | `closestTeleprompterCloseFromEvent` ~12594, guard 900ms ~15058 |
| «Важно» | `updatePrepImportantPin` ~14052, `#prep-important-done` |
| SW update | script ~17027, `trySwReload` + `flushSave` |

---

## Проверки перед отчётом

```bash
cd /Users/apple/Documents/CURSOR/SamScenes
python3 - <<'PY'
import re, subprocess
html=open('index.html',encoding='utf-8').read()
for i,s in enumerate(re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',html,re.S|re.I)):
    if not s.strip(): continue
    p=f'/tmp/sc-{i}.js'; open(p,'w').write(s)
    assert subprocess.run(['node','--check',p],capture_output=True).returncode==0
print('node --check: OK')
PY
```
