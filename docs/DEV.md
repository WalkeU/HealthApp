# Dev parancsok

## Előfeltétel

```
cp .env.example .env
```

Töltsd ki a portokat / API kulcsokat. `.env` sosem kerül git-be.

## Docker Compose (ajánlott — hot-reload)

```
docker compose -f docker-compose.dev.yml up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- SQLite web UI: http://localhost:8080

Leállítás:

```
docker compose -f docker-compose.dev.yml down
```

## Natívan, Docker nélkül (két terminál)

```
cd backend
npm install
npm run dev
```

```
cd frontend
npm install
npm run dev
```

## Build

```
cd frontend
npm run build
```

## Prod indítás

```
docker compose -f docker-compose.prod.yml up --build -d
```

Leállítás:

```
docker compose -f docker-compose.prod.yml down
```

## Egyéb

```
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
docker compose -f docker-compose.dev.yml exec backend sh
```
