# HealthApp

Személyes futás/egészség dashboard (single-user, nincs login). Garmin, Apple Health és Strava adatokat gyűjt egy SQLite-ba, megjeleníti a frontenden, és van egy algoritmikus insights motor + LLM chat placeholder edzés/regenerációs elemzéshez.

Teljes eredeti terv: [PLAN.md](PLAN.md). Garmin mezők jelentése: [docs/garmin-data-reference.md](docs/garmin-data-reference.md). Verzió-előzmények: [CHANGELOG.md](CHANGELOG.md).

## Verziókövetés / Release folyamat — KÖTELEZŐ szabály minden session-ben

A user kizárólag LLM-mel fejleszt, éles szerverre `git pull`-lal deployol. Ezért ez a workflow áll fenn, külön kérés nélkül is:

- **Minden alkalommal, amikor commitolsz** (a usernek erre külön rá kell kérnie, mint minden commitra — ez nem változik): vegyél fel a commit tartalmának megfelelő bullet(oka)t a `CHANGELOG.md` `[Unreleased]` szekciójába, a Keep a Changelog kategóriák alatt (`Added`/`Changed`/`Fixed`/`Removed`). Ezt automatikusan tedd, a commit részeként, ne kérdezz rá.
- **NE bumpolj verziószámot, NE hozz létre git tag-et, NE mozgasd át az Unreleased bejegyzéseket** — amíg a user nem mondja kifejezetten, hogy release-elni akar (pl. "release-eljünk", "verziózzuk", "csináljunk egy release-t").
- **Amikor a user release-t kér**, ezt csináld végig:
  1. Nézd át a `[Unreleased]` alatti bejegyzéseket, döntsd el a semver bump típusát (PATCH = fix, MINOR = új funkció, MAJOR = breaking change / DB migráció) és mondd meg a usernek, mire jutottál.
  2. Mozgasd a `[Unreleased]` bullet-eket egy új `## [X.Y.Z] - ÉÉÉÉ-HH-NN` szekció alá (mai dátummal), az `[Unreleased]` fejléc maradjon üresen a tetején.
  3. Frissítsd a verziószámot **mindkét** `package.json`-ban (`backend/`, `frontend/`) ugyanarra az értékre.
  4. Commitold ezt a release commitot.
  5. Hozz létre annotated git tag-et: `git tag -a vX.Y.Z -m "rövid összefoglaló"`.
- **Push (remote-ra, origin-re) SOSE automatikus** — se sima commit, se release után. Csak akkor push-olj (commitot és/vagy tag-et), ha a user ezt külön, kifejezetten kéri.

## Stack

- **Backend:** Node.js + Express (ESM), `better-sqlite3`, port `BACKEND_PORT` (`.env`, default 3001)
- **Frontend:** React 18 + Vite + Tailwind v4 + Recharts + react-router, port `FRONTEND_PORT` (default 5173)
- **DB:** SQLite fájl `data/healthapp.db` (gitignored), séma: `backend/src/db/schema.js`
- **Docker:** dev = hot-reload (nodemon + Vite polling), prod = named volume + nginx

## Architektúra

```
backend/src/
  index.js          — Express app, route mountolás
  db/schema.js       — SQLite séma + migrációk (addColumnIfMissing minta)
  db/queries.js       — prepared statement query réteg
  routes/             — activities, health, dashboard, notes, painLog, sync, config, ai
  services/
    garmin.js          — Garmin Connect szinkron (garmin-connect npm csomag)
    strava.js           — Strava OAuth + szinkron
    appleHealth.js       — export.xml import/parse (xml2js)
    insights.js          — algoritmikus elemző motor (ACWR, HRV, alvás, fájdalom → flag-ek, score-ok, LLM prompt)
    ai.js                 — LLM provider stubok (anthropic/openai/ollama) — NINCS implementálva még

frontend/src/
  pages/              — Dashboard, RunsList, RunDetail, Notes, PainLog, Import, Settings, AIChat, SleepHistory
  components/ui/       — Card, Badge, Button, StatCard, Spinner, EmptyState (saját design system, Tailwind)
  hooks/                — useFetch, useDashboard, useActivities, useHealth
  api/client.js          — fetch wrapper, `/api` proxyzva a Vite dev szerverben a backendre
```

## Adatmodell (SQLite)

- `activities` — futások, rengeteg mező (pace, HR zónák, cadence, power, training effect, VO2max…)
- `health_daily` — napi egészség snapshot (resting HR, HRV, alvás fázisok, SpO2, stressz, body battery)
- `notes` — napló bejegyzések, tag-ekkel, wellbeing score-ral
- `pain_log` — testrész + súlyosság (1-5) + leírás
- `config` — key/value store (pl. `ai_provider`)

Új oszlopot a séma bővítésekor: vedd fel a `CREATE TABLE`-be ÉS a `migrateColumns()`-ba is (backend/src/db/schema.js), különben meglévő adatbázisokon nem jön létre.

## AI / Insights állapot (fontos, hogy ne generálj duplikált munkát)

- `services/insights.js` — **kész, működik**. Tisztán algoritmikus (nincs LLM hívás): training load (ACWR), HRV, resting HR, alvás, body battery, fájdalom → RED/YELLOW flag-ek + 0-100 score-ok + human-readable LLM prompt (`buildLLMContext`).
- `routes/ai.js` — `/api/ai/analyze` (algoritmikus elemzés), `/api/ai/context` (LLM prompt generálás), `/api/ai/chat` (**placeholder, 503-at ad**), `/api/ai/status`.
- `services/ai.js` — a három provider (`anthropic`/`openai`/`ollama`) hívása **még nincs implementálva**, csak stubok. Ez a Phase 2 nyitott munkája — ha ide nyúlsz, ide illesztendő be az Anthropic SDK hívás is.
- `frontend/pages/AIChat.jsx` létezik, de a backend chat endpoint még nem működik éles LLM-mel.

## Fejlesztői parancsok

Lásd [docs/DEV.md](docs/DEV.md) — minden indítási/build/leállítási parancs külön, egy helyen.

## Konvenciók / megjegyzések

- Nincs auth réteg — szándékosan single-user app, ne adj hozzá login/session logikát felkérés nélkül.
- Backend ESM modulokat használ (`"type": "module"`), `import`/`export` szintaxis mindenhol.
- Frontend design system: dark mode alapértelmezett, saját minimál Tailwind komponensek `components/ui/` alatt — új UI elemnél ezeket használd/bővítsd, ne hozz be új komponens libet.
- A `raw_json` mezők (activities, health_daily) a nyers Garmin/Strava/Apple válasz teljes JSON-ját tárolják — ha egy mező hiányzik a sémából, előbb nézd meg, nincs-e már bent a `raw_json`-ban.
