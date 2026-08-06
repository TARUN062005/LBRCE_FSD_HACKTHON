# GridFleet — Grid-Aware Multi-Tenant EV Fleet Charging Orchestration Platform

> **Project source of truth** for setup, APIs, and architecture. Role/permission workflows live in [`ROLE_WORKFLOW.md`](./ROLE_WORKFLOW.md). Update both when auth or roles change.

**Product name:** Grid-Aware Multi-Tenant EV Fleet Charging Orchestration Platform  
**UI short name:** GridFleet

---

# Project Overview

## Description

**GridFleet** is a full-stack, multi-tenant EV charging management platform. Platform admins configure sites, chargers, tenants, and grid capacity. Tenant managers register fleets, simulate plug-ins, and watch charging sessions move live across a shared session board while a lightweight optimizer fairly allocates limited site power. Drivers book stations, charge, and download invoices.

## Problem Statement

Depot and workplace charging sites have a hard electrical capacity limit. When many vehicles plug in at once, unmanaged charging can trip breakers or leave high-priority / soon-to-depart vehicles undercharged. Tenants need visibility into sessions, fair allocation, usage billing, and timely alerts — without a real OCPP stack.

## Solution Approach

1. **Production Google OAuth only** — empty database works; first admin is created when Google email matches `SUPER_ADMIN_EMAIL`. See [`ROLE_WORKFLOW.md`](./ROLE_WORKFLOW.md).
2. **Charger simulator** — `setInterval`-driven state machine per session (Queued → Connected → Charging → Optimized → Throttled → Completed).
3. **Greedy optimizer** — explainable scoring (urgency × priority × tariff) that allocates power until site capacity is exhausted.
4. **Realtime board** — Socket.IO broadcasts `session:update` / `site:update` / `notification:new`.
5. **Metered billing** — completed sessions and bookings append to invoices; PDF download for drivers.

**No seed scripts for users.** Optional `npm run seed:stations --prefix backend` only adds demo map pins (no accounts).

---

# Marketplace (map + bookings + pay)

| Capability | Detail |
|------------|--------|
| Map | OpenStreetMap + React Leaflet; browser geolocation |
| Nearby | `GET /api/stations/nearby` — 10 km GeoJSON `$near` |
| Book + pay | Create booking → `POST /api/payments/checkout` (simulated) |
| Tenant stations | `POST /api/marketplace/stations` with lat/lng pin |
| Admin | Approve/suspend stations via Admin → Stations |

After Google login, drivers land on **`/user/map`**.

---

# Features

| Area | Capabilities |
|------|----------------|
| **Public landing** | Brand-first `/` page: hero, features, how-it-works, optimizer, preview, pricing |
| **Roles** | `normal_user` (Google default) · `tenant_manager` (admin promote) · `admin` (`SUPER_ADMIN_EMAIL`) |
| **Authentication** | Google ID token only → JWT from DB role; redirect `/admin` \| `/tenant` \| `/user` |
| **Admin users** | List, pending drivers, promote to tenant manager, demote |
| **Driver bookings** | Map discovery → book slot → mock pay → charge → invoice + PDF |
| **Marketplace map** | Leaflet/OSM nearby search, filters, navigate, ratings |
| **Tenant hosts** | Create station with map pin, pricing, earnings, booking inbox |
| **Fleet** | Vehicles, live sessions, billing |
| **Sites & chargers** | Capacity caps, charger CRUD |
| **Optimizer** | `allocatePower()` with throttle visibility |
| **UI** | Mobile-first, dark/light, Framer Motion, Socket.IO live board |

---

# Tech Stack

### Frontend

React 19 · Vite 8 · Tailwind CSS 4 · React Router 7 · Axios · Socket.IO Client · Recharts · Framer Motion · `@react-oauth/google` · Syne + Manrope

### Backend

Node.js · Express 5 · Mongoose 9 · Socket.IO 4 · jsonwebtoken · google-auth-library · dotenv / cors

### Infrastructure

MongoDB (local or Atlas) · Concurrently (`npm run dev`) · Render Web Service · optional Vercel frontend

---

# Folder Structure

```text
LBRCE_FSD_HACKTHON/
├── README.md
├── ROLE_WORKFLOW.md
├── package.json              ← dev, build, start (no seed)
├── render.yaml
├── backend/
│   ├── .env.example          ← includes SUPER_ADMIN_EMAIL
│   ├── server.js / app.js
│   ├── config/ db.js, env.js
│   ├── middleware/ auth, tenant
│   ├── models/ User, Booking, Tenant, Site, Charger, Vehicle, Session, Invoice, Notification
│   ├── routes/ … users.routes.js (promote / demote / pending)
│   ├── controllers/
│   ├── services/ simulator, optimizer, tariff, billing, pdf, googleAuth, …
│   └── sockets/
└── frontend/
    └── src/ pages (Landing, Login, user/, admin/, tenant/), components/GoogleSignIn.jsx, …
```

---

# Architecture

```text
React (Vite)  --REST+JWT-->  Express API
     ^                          |
     | Socket.IO                v
     +----------------  Simulator → Optimizer → MongoDB
```

### Frontend flow

1. Continue with Google → `POST /auth/google/callback` → JWT + user in memory/`localStorage`.
2. Redirect by DB role: `/admin` · `/tenant` · `/user`.
3. Socket joins `admin` / tenant room / `user:<id>`.

### Backend flow

1. Verify Google token → upsert user → `resolveGoogleRole` → persist → sign JWT from DB.
2. Protected routes: `verifyToken` + `requireRole`.
3. Simulator ticks independently; billing + notifications on complete/throttle.

---

# Production authentication

```text
Google login
  → email == SUPER_ADMIN_EMAIL ? admin : (keep tenant_manager if already promoted) : normal_user
  → JWT from database role
  → redirect by role
```

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/auth/google` | None | — | `{ clientId, configured, superAdminConfigured }` |
| POST | `/auth/google/callback` | None | `{ credential }` | `{ token, user }` |
| GET | `/auth/me` | JWT | — | `{ user }` |
| POST | `/auth/logout` | JWT | — | ok |
| GET | `/users` | Admin | — | all users |
| GET | `/users/pending` | Admin | — | `normal_user` list |
| PATCH | `/users/:id/promote` | Admin | `{ tenantId }` | tenant_manager |
| PATCH | `/users/:id/demote` | Admin | — | normal_user |

**Hard rules:** Google never auto-assigns `tenant_manager`. Admins are not created from the frontend. Role is never trusted from the client.

Full narrative: [`ROLE_WORKFLOW.md`](./ROLE_WORKFLOW.md).

---

# First deployment (empty database)

```text
1. Deploy backend + frontend
2. Set SUPER_ADMIN_EMAIL to the owner’s Google email
3. Set GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_ID
4. Owner logs in with Google → admin account created
5. Admin creates sites, chargers, tenants
6. Drivers log in → normal_user
7. Admin promotes drivers → tenant_manager
```

No `npm run seed`. The app works with a completely empty MongoDB.

---

# Database Schema (users)

```json
{
  "_id": "...",
  "name": "...",
  "email": "...",
  "picture": "...",
  "googleId": "...",
  "role": "normal_user | tenant_manager | admin",
  "tenantId": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

Other collections (sites, chargers, tenants, vehicles, sessions, bookings, invoices, notifications) are unchanged in purpose — see models under `backend/models/`.

Booking status `approved` is a **booking** state, not a user-approval flag.

---

# API Documentation

Base URL: `http://localhost:5000/api`  
Auth: `Authorization: Bearer <JWT>`

### Health

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/health` | None |

### Sites / chargers / tenants / vehicles / sessions / billing / notifications / dashboard

Same resource routes as before (admin/tenant scoped). See controllers under `backend/routes/`.

### Stations & bookings

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/stations` | Public | `?q=` |
| GET | `/availability` | Public | `?siteId=&date=` |
| POST | `/bookings/create` | normal_user | pending booking |
| GET | `/bookings` | normal_user, admin | list |
| PATCH | `/bookings/:id/approve` | admin | pending → approved |
| POST | `/bookings/:id/start` | owner, admin | → charging |
| POST | `/bookings/:id/complete` | owner, admin | → completed + invoice |
| GET | `/billing/:id/pdf` | owner scope | PDF |

---

# Real-Time Flow

```text
POST /sessions/start → Session(queued) → simulator tick (~3s)
  → allocatePower() → session:update / site:update / notification:new
  → Completed → billing + charger available
```

---

# Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Default `5000` |
| `MONGO_URI` | Yes | Mongo connection |
| `JWT_SECRET` | Yes | JWT signing key |
| `CLIENT_ORIGIN` | Yes (prod) | Comma-separated CORS / Socket origins |
| `GOOGLE_CLIENT_ID` | Yes | Google Web client ID |
| `SUPER_ADMIN_EMAIL` | Yes (prod) | Google email that becomes `admin` on login |
| `NODE_ENV` | No | `development` / `production` |
| `JWT_EXPIRES_IN` | No | Default `7d` |

Copy `backend/.env.example`. There is **no** `ALLOW_DEMO_AUTH`, **no** `ADMIN_EMAILS`.

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | `/api` locally (Vite proxy) |
| `VITE_SOCKET_URL` | No | unset locally |
| `VITE_GOOGLE_CLIENT_ID` | Yes | Same as `GOOGLE_CLIENT_ID` |

---

# Installation

### Prerequisites

- Node.js 20+
- MongoDB local or Atlas

### Setup

```bash
cd LBRCE_FSD_HACKTHON
npm install
npm install --prefix backend
npm install --prefix frontend
```

Configure `backend/.env` and `frontend/.env` (set `SUPER_ADMIN_EMAIL` to your Gmail).

```bash
npm run dev                 # API :5000 + Vite :5173
npm test --prefix backend   # optimizer unit tests
```

Sign in with **Continue with Google** only. First matching `SUPER_ADMIN_EMAIL` login creates the admin.

---

# Hosted URLs

| Surface | URL | Notes |
|---------|-----|-------|
| **Render (API + SPA)** | https://lbrce-fsd-hackthon-1jkv.onrender.com | Web Service |
| **Vercel (frontend)** | https://lbrce-fsd-hackthon-one.vercel.app | Point `VITE_*` at Render |

### Vercel → Render

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | `https://lbrce-fsd-hackthon-1jkv.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://lbrce-fsd-hackthon-1jkv.onrender.com` |
| `VITE_GOOGLE_CLIENT_ID` | same as backend |

`CLIENT_ORIGIN` on Render must include both hosted origins. Add the same origins in Google Cloud Console → Authorized JavaScript origins.

---

# Deploy on Render

Use a **Web Service** (Node), not Static Site.

| Field | Value |
|-------|--------|
| Build | `npm run build` |
| Start | `npm start` |
| Health | `/api/health` |

Env: `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID`, **`SUPER_ADMIN_EMAIL`**, `VITE_API_URL=/api`, `NODE_ENV=production`.

Blueprint: `render.yaml`. After deploy, owner Google-login creates admin — **do not run seed**.

---

# Screens

| Screen | Route | Role |
|--------|-------|------|
| Landing | `/` | Public |
| Login | `/login` | Continue with Google only |
| Driver | `/user/*` | normal_user |
| Admin | `/admin/*` | admin |
| Tenant | `/tenant/*` | tenant_manager |

---

# Optimization Logic

`allocatePower(activeSessions, siteCapacityKw, tariff)` in `backend/services/optimizer.service.js`:

```text
score = urgency × priorityWeight × tariffFactor
sort desc → greedy allocate under site capacity
throttled if allocatedPowerKw < max(3 kW, 15% of charger max)
```

---

# Future Improvements

- Real OCPP charger integration
- MILP / OR-Tools optimizer
- Stripe payments, real SMS/push
- Persisted power metrics
- Audit log for admin changes

---

# Known Limitations

| Area | Reality |
|------|---------|
| Chargers | Simulated — not OCPP hardware |
| Optimizer | Greedy heuristic |
| Notifications | In-app (simulated push framing) |
| Billing | Usage ledger — no payment capture |
| Auth | Google only; admin via `SUPER_ADMIN_EMAIL`; managers via promote |
| Multi-site tenants | One `siteId` per tenant |

---

# License

Hackathon / academic project — see repository owner for reuse terms.
