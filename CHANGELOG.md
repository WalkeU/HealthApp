# Changelog

Formátum: [Keep a Changelog](https://keepachangelog.com/) + [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH).

## [Unreleased]

### Added

- App verziószám megjelenítve a desktop sidebar alján (`frontend/package.json`-ból)

### Changed

- Release-folyamat rövid `npm run release:patch/minor/major` scriptekre egyszerűsítve (gyökér `package.json`), `CLAUDE.md`/`docs/DEV.md` frissítve

### Fixed

- Elrontott UTF-8 (mojibake) karakterek javítva a Dashboard, RunsList, RunDetail, Import, Settings, AIChat oldalakon (kötőjelek, pontok, pipa/kereszt ikonok)

## [0.0.1] - 2026-08-20

### Added

- Backend: Express API, SQLite séma (activities, health_daily, notes, pain_log, config)
- Garmin, Strava, Apple Health szinkron/import — mindhárom implementálva
- Algoritmikus insights motor (`services/insights.js`): ACWR training load, HRV, resting HR, alvás, body battery, fájdalom flag-ek + score-ok
- Frontend: Dashboard, RunsList, RunDetail, Notes, PainLog, Import, Settings, AIChat, SleepHistory oldalak
- Docker dev/prod compose setup, sqlite-web admin UI
- `CLAUDE.md` és `docs/DEV.md` projekt-dokumentáció

### Known gaps

- `services/ai.js` LLM hívás (anthropic/openai/ollama) még stub, `/api/ai/chat` 503-at ad

[Unreleased]: https://github.com/WalkeU/HealthApp/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/WalkeU/HealthApp/releases/tag/v0.0.1
