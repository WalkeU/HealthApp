# HealthApp — Project Plan

> Personal health & running dashboard. Single-user, no login required.

---

## 1. Goal

Aggregate data from **Garmin**, **Apple Health**, and **Strava** into one clean dashboard.  
Track runs, health metrics, and personal notes (pain, injuries, observations) to become a healthier, better runner.  
Later: integrate AI assistant (Claude / Codex / local LLM) for insights and coaching.

---

## 2. Stack

| Layer     | Technology                    |
| --------- | ----------------------------- |
| Frontend  | React (Vite) or plain HTML/JS |
| Backend   | Node.js + Express             |
| Database  | SQLite (via `better-sqlite3`) |
| Container | Docker + Docker Compose       |

> **Frontend note:** For polished UI generation, provide the AI with the `frontend-design` skill so it can produce production-grade, non-generic interfaces.

---

## 3. Data Sources & Integration

### 3.1 Garmin

- **Method:** Garmin Connect API (OAuth2) or export via [garminconnect](https://github.com/cyberjunky/python-garmin-connect) scraper / community API
- **Data pulled:** Activities (runs), sleep, HRV, resting HR, steps, VO2 max estimate
- **Sync:** Manual trigger or scheduled cron job (e.g., every 6h)

### 3.2 Apple Health

- **Method:** Export `export.xml` from iPhone → parse and import via backend endpoint
- **Data pulled:** Heart rate, steps, HRV, body weight, sleep (if tracked), workouts
- **Sync:** Manual import (drag-drop or upload button in UI)

### 3.3 Strava

- **Method:** Strava API (OAuth2, webhook optional)
- **Data pulled:** Run activities, distance, pace, elevation, HR, GPS route
- **Sync:** Manual trigger or webhook on new activity

---

## 4. Features — Phase 1 (MVP)

### Dashboard

- Summary cards: weekly km, avg pace, resting HR, sleep avg, HRV trend
- Recent runs list (date, distance, pace, HR)
- Charts: weekly mileage, HR trend, sleep quality, HRV over time

### Run Detail View

- Full stats for a single run (pace, HR zones, elevation, map if GPS available)

### Journal / Notes

- Free-text notes attached to a date or a specific run
- Tags: `pain`, `fatigue`, `great`, `injury`, `PR`, etc.
- Pain log: body part selector + severity (1–5) + description

### Manual Data Entry

- Log a run manually if not auto-synced
- Add a daily note / wellbeing rating (1–5)

### Data Import

- Apple Health XML import page
- Manual Garmin / Strava sync trigger button

---

## 5. Database Schema (SQLite)

```sql
-- Activities from all sources
activities (id, source, external_id, date, type, distance_m, duration_s, avg_hr, max_hr, elevation_m, avg_pace_s, raw_json)

-- Daily health snapshot
health_daily (id, date, source, resting_hr, hrv, sleep_duration_s, sleep_score, steps, weight_kg, raw_json)

-- User journal entries
notes (id, date, activity_id, content, tags, wellbeing_score, created_at)

-- Pain / injury log
pain_log (id, date, body_part, severity, description, created_at)

-- App config / API tokens
config (key, value, updated_at)
```

---

## 6. Backend API (Node.js / Express)

```
GET  /api/activities          — list activities (filters: date range, source)
GET  /api/activities/:id      — single activity detail
GET  /api/health/daily        — daily health metrics
GET  /api/dashboard/summary   — aggregated stats for dashboard cards

GET  /api/notes               — list notes
POST /api/notes               — create note
PUT  /api/notes/:id           — update note
DELETE /api/notes/:id         — delete note

GET  /api/pain-log            — list pain entries
POST /api/pain-log            — create pain entry

POST /api/sync/garmin         — trigger Garmin sync
POST /api/sync/strava         — trigger Strava sync
POST /api/import/apple-health — upload & parse Apple Health XML

GET  /api/config              — get config (tokens, preferences)
POST /api/config              — save config
```

---

## 7. UI Design Principles

- **Modern, minimal, brutal clarity** — no clutter, data-first
- Dark mode by default (runner-friendly, easy on eyes)
- Mobile-friendly (check stats after a run from phone)
- Fast: no heavy frameworks, instant local data
- Key interactions: one-click sync, quick note add, pain log in <10 seconds

---

## 8. Docker Setup

### Two environments

#### Development (`docker-compose.dev.yml`)

```yaml
services:
  backend:
    build: ./backend
    volumes:
      - ./backend:/app # hot-reload via nodemon
      - ./data:/data # SQLite file persisted
    ports: ["3001:3001"]
    environment:
      - NODE_ENV=development

  frontend:
    build: ./frontend
    volumes:
      - ./frontend:/app # Vite HMR
    ports: ["5173:5173"]
```

#### Production (`docker-compose.prod.yml`)

```yaml
services:
  backend:
    build: ./backend
    volumes:
      - healthapp_data:/data # named volume, persisted
    ports: ["3001:3001"]
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  frontend:
    build: ./frontend # Nginx serving built static files
    ports: ["80:80"]
    restart: unless-stopped

volumes:
  healthapp_data:
```

### Project structure

```
HealthApp/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/       # garmin, strava, apple-health parsers
│   │   ├── db/             # SQLite schema + queries
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── data/                   # SQLite db file (gitignored)
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── PLAN.md
└── .env.example
```

---

## 9. Phase 2 — AI Integration (Future)

- Chat interface in the dashboard sidebar
- Context: recent runs, health trends, notes, pain log
- Providers (switchable via config):
  - **Claude API** (Anthropic) — cloud
  - **Codex / OpenAI API** — cloud
  - **Local LLM** on Mac Mini (Ollama) — private, no data leaves network
- Use cases:
  - "Why am I tired this week?" (looks at HRV, sleep, mileage)
  - "Am I overtraining?"
  - Training plan suggestions
  - Injury risk warning based on pain log + load

---

## 10. CI/CD (Future / Nice to Have)

- GitHub Actions pipeline
- On push to `main`: build Docker images, push to registry, deploy to server via SSH
- On push to `dev`: deploy to dev environment
- Secrets managed via GitHub Secrets

---

## 11. Build Order (Implementation Phases)

| Phase | What                                                     |
| ----- | -------------------------------------------------------- |
| 1     | Project scaffold: Docker, Node.js backend, SQLite schema |
| 2     | Strava OAuth + sync (easiest API)                        |
| 3     | Apple Health XML import & parser                         |
| 4     | Garmin integration                                       |
| 5     | Frontend dashboard (cards, charts, run list)             |
| 6     | Notes & pain log UI                                      |
| 7     | Polish UI, mobile responsiveness                         |
| 8     | AI integration                                           |
| 9     | CI/CD pipeline                                           |
