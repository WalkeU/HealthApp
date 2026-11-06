# HealthApp

A personal running and health dashboard that brings data from **Garmin**, **Apple Health** and **Strava** into one place, with an insights engine and an AI chat on top of your own data. Single user, self-hosted.

**Stack:** React · Vite · Recharts · Node.js · Express · SQLite (better-sqlite3) · Docker

## Features

- **Garmin sync:** activities, sleep, HRV, resting heart rate and VO2max, with a saved OAuth session and automatic background sync every 12 hours.
- **Apple Health import:** upload the `export.xml` from your iPhone; it is parsed on the server.
- **Strava:** OAuth connection for run activities.
- **Dashboard:** key metrics, VO2max, sleep duration and phase timeline, sleep history.
- **Runs:** list and detail view per activity.
- **Pain log and notes:** track injuries, pain and wellbeing next to the training data.
- **Insights and AI chat:** an insights service plus a chat that can use Anthropic, OpenAI or a local Ollama model.

## Architecture

- `backend/src/services`: one module per data source (`garmin`, `strava`, `appleHealth`) plus `insights` and `ai`.
- `backend/src/routes`: REST endpoints for activities, health metrics, notes, pain log, sync and AI.
- `frontend/src/pages`: Dashboard, Runs, Run detail, Sleep, Pain log, Notes, AI chat, Import, Settings.
- Separate dev and prod Docker Compose files; in production the frontend is served by nginx.

## Quick start

```bash
cp .env.example .env    # add Garmin / Strava credentials and optional AI keys
docker compose -f docker-compose.dev.yml up --build
```

Frontend on `FRONTEND_PORT` (default 5173), API on `BACKEND_PORT` (default 3001). More in [docs/DEV.md](docs/DEV.md).

## Status

Personal project, versioned in [CHANGELOG.md](CHANGELOG.md). The original plan is in [PLAN.md](PLAN.md).
