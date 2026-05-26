# Maestro Loyalty Program

Full-stack loyalty program system (spec v1.5) with **Oracle Database**, **Node.js API**, and **React portal** for members and administrators.

Originally exported from Figma; now wired to a real backend implementing status rules, points, rewards, ERP import, and monthly billing.

## Architecture

```
┌─────────────────┐     HTTPS/REST      ┌──────────────────┐
│  React Portal   │ ◄──────────────────► │  Express API     │
│  (Vite)         │                      │  (Node + TS)     │
└─────────────────┘                      └────────┬─────────┘
                                                  │
                                         ┌────────▼─────────┐
                                         │ Oracle Database  │
                                         │ (XEPDB1)         │
                                         └────────┬─────────┘
                                                  │
                                         ┌────────▼─────────┐
                                         │ ERP import (JSON)  │
                                         │ Monthly billing    │
                                         └──────────────────┘
```

## Prerequisites

- **Node.js** 20+
- **Docker Desktop** (for local Oracle XE)
- **Oracle Instant Client** (optional on Windows; `oracledb` thin mode works without it for XE)

## Quick start

### 1. Start Oracle

```bash
docker compose up -d
```

Wait until the container is healthy (~2 minutes). Schema and seed SQL run from `database/`.

### 2. API server

```bash
cd server
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

(`db:setup` = schema + seed + demo accounts. Or run `db:init-schema` then `db:init-demo` separately.)

If you see **ORA-00942**, the schema was never created — run `npm run db:init-schema` after Oracle is up.

```bash
# alternative step-by-step
npm run db:init-schema
npm run db:init-demo
npm run dev
```

API: http://localhost:3001

### 3. Frontend

```bash
npm install
npm run dev
```

Portal: http://localhost:5173

Or run both:

```bash
npm install
npm run dev:all
```

## Demo accounts

| Role   | Email                 | Password   |
|--------|-----------------------|------------|
| Admin  | admin@maestro.si      | admin123   |
| Member | ana.novak@maestro.si  | member123  |
| Member | marko.kovac@maestro.si| member123  |

New registrations require **email verification** (link printed in the API console in dev mode).

## Background jobs

**ERP purchase import** (FZ-12):

```bash
npm run job:import-erp -- data/erp-import-example.json
```

**Monthly status + points billing** (FZ-03, FZ-04):

```bash
npm run job:monthly -- 4 2026
```

Order: import purchases → run monthly job (status update, then points on new status).

## Implemented requirements (summary)

| ID | Feature |
|----|---------|
| FZ-01 | Registration + email verification (double opt-in) |
| FZ-02 | Loyalty card request on registration |
| FZ-03–04 | Monthly status recalculation + points (configurable rules) |
| FZ-05–06 | Member points, rewards, purchase history |
| FZ-07–09 | Admin customers, dashboard, SQL (SELECT only) |
| FZ-10–11 | Rewards catalog CRUD, configurable rules in DB |
| FZ-12 | ERP JSON import script |
| FZ-13–15 | JWT auth, roles, EN/SL UI |
| FZ-14 | Status history in `STATUS_CLANA` |
| NZ-03 | Oracle as primary database |
| NZ-12 | `REVIZIJSKI_DNEVNIK` audit trail |

## Project structure

```
database/          Oracle DDL + seed
server/            Express API + loyalty engine
src/               React member + admin portal
data/              Sample ERP import file
docker-compose.yml Oracle XE
```

## Production notes

- Change `JWT_SECRET` and Oracle credentials
- Configure real SMTP for email (replace `emailService` dev logger)
- Schedule `job:import-erp` and `job:monthly` via cron/Task Scheduler
- Use HTTPS reverse proxy (nginx) in front of API and static frontend

## Author

Mattia Lauzana — Razvoj informacijskih sistemov
