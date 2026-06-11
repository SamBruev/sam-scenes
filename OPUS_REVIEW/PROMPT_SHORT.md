# Короткий промпт для Opus (вставить в чат)

```
Workspace: /Users/apple/Documents/CURSOR/SamScenes
Прочитай OPUS_REVIEW/START_HERE.md → CURRENT.md → OPEN_ITEMS.md → IOS_CHECKLIST.md
Полная матрица: AUDIT-PROMPT-OPUS.md (блок «Промпт»)

Задача: аудит v403+ для iPhone standalone PWA. Статический разбор index.html + sw.js;
node --check всех script; отчёт AUDIT-SamScenes-vNNN.md на русском (🔴🟠🟡🟢 + 💡 идеи).

Приоритет retest:
1) F1 шотлист после смены сценария (fix v402 — подтвердить или регрессия)
2) Суфлёр × в standalone
3) «Важно» — одна «Всё под контролем!», без дубля у ассистента (v403)
4) autosave off (#1) — осознанный риск или рекомендация Sam

Код не менять без явного запроса. В конце — 3 вопроса Sam.
```

Приложить: `@index.html` `@sw.js` `@manifest.json` `@build-info.json`
