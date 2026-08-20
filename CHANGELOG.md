# Changelog

Formátum: [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH). Soronként, csoportosítás nélkül — minden sor jelzi mi történt (Added/Changed/Fixed/Removed).

## [Unreleased]

- Changed: Garmin sync mostantól 0-t ír a `nap_duration_s`/`nap_count` mezőkbe, ha volt alvás-adat a napra de nem volt szundi (korábban `null`-t írt, ami megkülönböztethetetlen volt attól, hogy nincs is adat a napra)
- Fixed: törött placeholder karakterek (`"”` szó szerint idézőjelek `—` helyett) javítva a `SleepHistory.jsx` (4 hely) és `PainLog.jsx` (1 hely) oldalakon

## [0.1.0] - 2026-08-20

- Added: Garmin sync-nél kiválasztható, hány visszamenő edzést húzzon le (50/100/200/500/1000) az Import oldalon
- Fixed: láthatatlan vezérlőkarakter (U+009D) eltávolítva 18 helyről az `AIChat.jsx`-ben — ez okozta a foltos "—" megjelenést az Insights oldal kis betűméretű értékeinél
- Fixed: mojibake emoji-korrupció javítva a `Notes.jsx`-ben (wellbeing hangulatjelek: 😞 😕 😐 🙂 😄)
- Fixed: a `health_daily` (napi egészség/alvás) mentés minden Garmin sync-nél elhasalt egy SQL oszlop/érték-szám eltérés miatt ("35 values for 33 columns") — a `nap_duration_s` és `nap_count` mezők hiányoztak az INSERT oszloplistájából; sleep, HRV, resting HR, body battery adatok emiatt sosem mentődtek

## [0.0.3] - 2026-08-20

- Fixed: megmaradt mojibake karakterek kijavítva `AIChat.jsx`, `Import.jsx`, `RunsList.jsx`-ben (a korábbi javítás nem volt teljes) — köztük az Apple Health import instrukció nyilai és a Garmin jelszó placeholder pöttyei
- Changed: világosabb, kontrasztosabb szövegszínek az egész UI-ban (`--color-ink`, `--color-ink-2`, `--color-ink-3`) — a régi `ink-3` alig 2:1 kontrasztarányban volt a háttérrel, most minden szint legalább ~4.5:1 fölött van

## [0.0.2] - 2026-08-20

- Added: app verziószám megjelenítve a desktop sidebar alján (`frontend/package.json`-ból)
- Changed: release-folyamat rövid `npm run release:patch/minor/major` scriptekre egyszerűsítve (gyökér `package.json`), `CLAUDE.md`/`docs/DEV.md` frissítve
- Fixed: elrontott UTF-8 (mojibake) karakterek javítva a Dashboard, RunsList, RunDetail, Import, Settings, AIChat oldalakon (kötőjelek, pontok, pipa/kereszt ikonok)

## [0.0.1] - 2026-08-20

- Added: backend Express API, SQLite séma (activities, health_daily, notes, pain_log, config)
- Added: Garmin, Strava, Apple Health szinkron/import — mindhárom implementálva
- Added: algoritmikus insights motor (`services/insights.js`) — ACWR training load, HRV, resting HR, alvás, body battery, fájdalom flag-ek + score-ok
- Added: frontend Dashboard, RunsList, RunDetail, Notes, PainLog, Import, Settings, AIChat, SleepHistory oldalak
- Added: Docker dev/prod compose setup, sqlite-web admin UI
- Added: `CLAUDE.md` és `docs/DEV.md` projekt-dokumentáció
- Known gap: `services/ai.js` LLM hívás (anthropic/openai/ollama) még stub, `/api/ai/chat` 503-at ad

[Unreleased]: https://github.com/WalkeU/HealthApp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/WalkeU/HealthApp/compare/v0.0.3...v0.1.0
[0.0.3]: https://github.com/WalkeU/HealthApp/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/WalkeU/HealthApp/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/WalkeU/HealthApp/releases/tag/v0.0.1
