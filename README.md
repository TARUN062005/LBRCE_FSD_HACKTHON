# RouteGuardian — Multi-Tenant EV Charging Optimizer

> **Single source of truth.** This is the only `README.md` in the repository. Update it whenever features, APIs, schemas, folders, components, env vars, or dependencies change.

---

# Project Overview

## Description

**RouteGuardian** is a full-stack, multi-tenant EV charging management platform built for the LBRCE FSD Hackathon. Platform admins configure sites, chargers, tenants, and grid capacity. Tenant managers register fleets (vehicles/drivers), simulate plug-ins, and watch charging sessions move live across a shared session board while a lightweight optimizer fairly allocates limited site power.

## Problem Statement

Depot and workplace charging sites have a hard electrical capacity limit. When many vehicles plug in at once, unmanaged charging can trip breakers or leave high-priority / soon-to-depart vehicles undercharged. Tenants need visibility into sessions, fair allocation, usage billing, and timely alerts when plans change — without a real OCPP stack in a hackathon timeframe.

## Solution Approach

1. **Role-based portals** — JWT auth with `admin` and `tenant_manager` roles; tenant data is scoped from the verified JWT (never from client-supplied `tenantId`).
2. **Charger simulator** — `setInterval`-driven state machine per session (Queued → Connected → Charging → Optimized → Throttled → Completed).
3. **Greedy optimizer** — explainable scoring (urgency × priority × tariff) that allocates power until site capacity is exhausted.
4. **Realtime board** — Socket.IO broadcasts `session:update` / `site:update` / `notification:new` to tenant and admin rooms.
5. **Metered billing + simulated push** — completed sessions append to open invoices; throttle/complete events create in-app notifications.

---

# Features

| Area | Capabilities |
|------|----------------|
| **Authentication** | Login, JWT (`userId`, `role`, `tenantId`), bcrypt passwords, admin-only register, protected routes |
| **Tenant management** | Admin onboards companies (`companyName`, `billingPlan`, `siteId`) |
| **Site & charger management** | Sites with `maxCapacityKw`; chargers with status `available` / `in_use` / `offline` |
| **Fleet (vehicles)** | Tenant-scoped CRUD: driver, battery kWh, `priorityTier`, `departureTime` |
| **Optimization engine** | Pure `allocatePower()` — urgency, SLA/High/Medium/Low weights, peak tariff factor, throttle threshold |
| **Session board** | Live kanban columns; Simulate Plug-In; stop session; connection-lost banner |
| **Billing** | Open monthly invoice per tenant; `kWh × tariffRate`; admin reports / tenant billing panel |
| **Notifications** | Persisted alerts on Throttled / Completed; bell unread count; toast (“simulated push/SMS”) |
| **Dashboards** | Admin + tenant aggregates, Recharts power area chart + tenant cost bars, dark/light theme |

---

# Tech Stack

### Frontend

| Package | Role |
|---------|------|
| React 19 | UI |
| Vite 8 | Dev server / build |
| Tailwind CSS 4 | Mobile-first styling (`xs:360`, `md:768`, `lg:1024`) |
| React Router 7 | Role-based routing |
| Axios | REST client (Bearer JWT) |
| Socket.IO Client | Live sessions, power samples, notifications |
| Recharts | Power usage & cost charts |

### Backend

| Package | Role |
|---------|------|
| Node.js | Runtime |
| Express 5 | HTTP API |
| Mongoose 9 | MongoDB ODM |
| Socket.IO 4 | Realtime rooms |
| jsonwebtoken / bcryptjs | Auth |
| dotenv / cors / nodemon | Config, CORS, dev reload |

### Infrastructure

- MongoDB (local or Atlas)
- Concurrently (root `npm run dev`)

---

# Folder Structure

```text
LBRCE_FSD_HACKTHON/
├── README.md                 ← ONLY markdown doc in the repo
├── package.json              ← root scripts (dev, seed, build)
├── .gitignore
├── backend/
│   ├── package.json
│   ├── nodemon.json
│   ├── .env                  ← local secrets (not committed)
│   ├── .env.example
│   ├── server.js             ← HTTP + Socket.IO bootstrap
│   ├── app.js                ← Express middleware & /api mount
│   ├── config/
│   │   ├── db.js
│   │   └── env.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── tenant.middleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Tenant.js
│   │   ├── Site.js
│   │   ├── Charger.js
│   │   ├── Vehicle.js
│   │   ├── Session.js
│   │   ├── Invoice.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── health.routes.js
│   │   ├── auth.routes.js
│   │   ├── sites.routes.js
│   │   ├── chargers.routes.js
│   │   ├── tenants.routes.js
│   │   ├── vehicles.routes.js
│   │   ├── sessions.routes.js
│   │   ├── billing.routes.js
│   │   ├── notifications.routes.js
│   │   └── dashboard.routes.js
│   ├── controllers/          ← one controller per resource
│   ├── services/
│   │   ├── chargerSimulator.service.js
│   │   ├── optimizer.service.js
│   │   ├── optimizer.service.test.js
│   │   ├── tariff.service.js
│   │   ├── billing.service.js
│   │   ├── notification.service.js
│   │   └── metrics.service.js
│   ├── sockets/
│   │   ├── index.js
│   │   └── session.socket.js
│   └── scripts/
│       └── seed.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── .env
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── context/
        │   ├── AuthContext.jsx
        │   ├── ThemeContext.jsx
        │   └── ToastContext.jsx
        ├── hooks/
        │   └── useNotifications.js
        ├── lib/
        │   ├── axios.js
        │   ├── socket.js
        │   ├── authToken.js
        │   └── money.js
        ├── layouts/
        │   └── AppLayout.jsx
        ├── routes/
        │   └── ProtectedRoute.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── admin/
        │   │   ├── AdminDashboard.jsx
        │   │   ├── SitesPanel.jsx
        │   │   ├── ChargersPanel.jsx
        │   │   ├── TenantsPanel.jsx
        │   │   └── ReportsPanel.jsx
        │   ├── tenant/
        │   │   ├── TenantDashboard.jsx
        │   │   ├── VehiclesPanel.jsx
        │   │   └── BillingPanel.jsx
        │   └── shared/
        │       └── SessionBoard.jsx
        └── components/
            ├── charts/
            │   ├── PowerUsageChart.jsx
            │   └── TenantCostChart.jsx
            ├── forms/
            │   ├── SiteForm.jsx
            │   ├── ChargerForm.jsx
            │   ├── TenantForm.jsx
            │   └── VehicleForm.jsx
            ├── Sidebar.jsx, Topbar.jsx, ThemeToggle.jsx
            ├── SessionCard.jsx, StateColumn.jsx, PlugInButton.jsx
            ├── NotificationBell.jsx, NotificationList.jsx, NotificationToast.jsx
            ├── InvoiceCard.jsx, UsageSummary.jsx, PriorityBadge.jsx
            ├── EntityTable.jsx, Modal.jsx, EmptyState.jsx
            ├── ErrorState.jsx, SkeletonCard.jsx, ConnectionStatusBanner.jsx
            └── …
```

---

# Architecture

```text
+----------------+      REST + JWT       +---------------------+
|  React (Vite)  | -------------------> |   Express API        |
| Admin / Tenant | <------------------- | (routes/controllers) |
|  Dashboards    |                       +----------+----------+
|                |        Socket.IO                  |
|                | <=======================>  Socket.IO Server
+----------------+                                   |
                                                     v
                                       +----------------------------+
                                       | Charger Simulator Service  |
                                       | (state machine / session)  |
                                       +-------------+--------------+
                                                     v
                                       +----------------------------+
                                       | Optimizer Service          |
                                       | (priority + tariff + cap)  |
                                       +-------------+--------------+
                                                     v
                                              +------------+
                                              |  MongoDB   |
                                              | (Mongoose) |
                                              +------------+
```

```mermaid
flowchart LR
  UI[React Admin / Tenant] -->|REST + JWT| API[Express API]
  UI <-->|Socket.IO| IO[Socket.IO Server]
  API --> SIM[Charger Simulator]
  SIM --> OPT[Optimizer]
  SIM --> DB[(MongoDB)]
  OPT --> DB
  IO --> SIM
```

### Frontend flow

1. Login → JWT stored in memory + `localStorage` (`AuthContext`).
2. Role redirect → `/admin` or `/tenant`.
3. Socket connects; admin joins `admin` room, tenant joins `tenantId` room.
4. Panels fetch initial REST data; socket events patch UI state (no full-page refresh).
5. Theme persisted via `ThemeContext` (`localStorage` key `theme`).

### Backend flow

1. Request → `verifyToken` → role / tenant guard → controller → Mongoose → JSON response.
2. Simulator ticks independently of HTTP, mutating sessions and emitting sockets.
3. On complete: billing append + notification; on throttle transition: notification.

### Socket flow

| Event | Direction | Rooms | Purpose |
|-------|-----------|-------|---------|
| `join:tenant` | Client → Server | — | Join tenant room |
| `join:admin` | Client → Server | — | Join `admin` room |
| `session:update` | Server → Client | tenant + admin | Full session object |
| `site:update` | Server → Client | admin + affected tenants | Power usage sample |
| `notification:new` | Server → Client | tenant + admin | Simulated push/SMS |

### Optimization flow

1. Session enters power phase (`charging` / `optimized` / `throttled`).
2. Each tick, all active site sessions are scored and greedily allocated.
3. Results write `allocatedPowerKw` + state (`optimized` or `throttled`).
4. Broadcast via `session:update` + `site:update`.

---

# Database Schema

### Config / identity chain

`users` → `tenants` → `sites` → `chargers`

### Operational chain

`tenants` → `vehicles` → `sessions` → `invoices`

### Event chain

`sessions` → `notifications`

### Collections

#### `users`

| Field | Type | Notes |
|-------|------|-------|
| name | String | required |
| email | String | unique, lowercase |
| passwordHash | String | bcrypt; `select: false` |
| role | Enum | `admin` \| `tenant_manager` |
| tenantId | ObjectId \| null | required for tenant_manager |

#### `tenants`

| Field | Type | Notes |
|-------|------|-------|
| companyName | String | required |
| billingPlan | Enum | `basic` \| `standard` \| `premium` |
| siteId | ObjectId → Site | required |

#### `sites`

| Field | Type | Notes |
|-------|------|-------|
| name | String | required |
| location | String | required |
| maxCapacityKw | Number | grid limit (≥ 0) |

#### `chargers`

| Field | Type | Notes |
|-------|------|-------|
| siteId | ObjectId → Site | required |
| label | String | e.g. `A1` |
| maxPowerKw | Number | charger max |
| status | Enum | `available` \| `in_use` \| `offline` |

#### `vehicles`

| Field | Type | Notes |
|-------|------|-------|
| tenantId | ObjectId | JWT-scoped |
| driverName | String | |
| batteryCapacityKwh | Number | ≥ 1 |
| priorityTier | Enum | `low` \| `medium` \| `high` \| `sla` |
| departureTime | Date | optimizer input |

#### `sessions`

| Field | Type | Notes |
|-------|------|-------|
| chargerId, vehicleId, tenantId, siteId | ObjectId | |
| state | Enum | `queued` → `connected` → `charging` → `optimized` → `throttled` → `completed` |
| allocatedPowerKw | Number | from optimizer |
| startTime / endTime | Date | |
| kWhDelivered | Number | accumulated in power states |
| driverName, chargerLabel, priorityTier | String | denormalized for board |

#### `invoices`

| Field | Type | Notes |
|-------|------|-------|
| tenantId | ObjectId | |
| period | String | `YYYY-MM` |
| status | Enum | `open` \| `closed` |
| totalKwh / amount | Number | aggregates |
| sessionIds | ObjectId[] | |
| lineItems[] | embedded | sessionId, kWh, tariffRate, tariffBand, amount, driverName, … |
| companyName | String | denormalized |

#### `notifications`

| Field | Type | Notes |
|-------|------|-------|
| tenantId | ObjectId | |
| sessionId | ObjectId \| null | |
| message | String | includes `[Simulated push/SMS]` |
| type | Enum | `throttled` \| `completed` \| `info` |
| read | Boolean | default false |
| createdAt | Date | |

---

# API Documentation

Base URL: `http://localhost:5000/api`  
Auth header (unless noted): `Authorization: Bearer <JWT>`

### Health

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/health` | None | — | `{ status, message, timestamp }` |

### Auth

| Method | Endpoint | Auth | Request body | Response |
|--------|----------|------|--------------|----------|
| POST | `/auth/login` | None | `{ email, password }` | `{ status, token, user }` |
| POST | `/auth/register` | Admin | `{ name, email, password, role, tenantId? }` | `{ status, user }` |
| GET | `/auth/me` | Any logged-in | — | `{ status, user }` |

JWT payload: `{ userId, role, tenantId, iat, exp }`

### Sites (admin)

| Method | Endpoint | Body / query | Response |
|--------|----------|--------------|----------|
| GET | `/sites` | — | `{ data: Site[] }` |
| POST | `/sites` | `{ name, location, maxCapacityKw }` | `{ data: Site }` |
| GET | `/sites/:id` | — | `{ data: Site }` |
| PATCH | `/sites/:id` | partial fields | `{ data: Site }` |
| PATCH | `/sites/:id/limit` | `{ maxCapacityKw }` | `{ data: Site }` |
| GET | `/sites/:id/power-usage` | — | usage + tariff + active sessions |
| DELETE | `/sites/:id` | — | `{ message }` |

### Chargers (admin)

| Method | Endpoint | Body / query | Response |
|--------|----------|--------------|----------|
| GET | `/chargers` | `?siteId=` | `{ data: Charger[] }` |
| POST | `/chargers` | `{ siteId, label, maxPowerKw, status? }` | `{ data: Charger }` |
| GET / PATCH / DELETE | `/chargers/:id` | standard CRUD | — |

### Tenants (admin)

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/tenants` | — | `{ data: Tenant[] }` |
| POST | `/tenants` | `{ companyName, billingPlan, siteId }` | `{ data: Tenant }` |
| GET / PATCH / DELETE | `/tenants/:id` | — | — |

### Vehicles (tenant_manager — JWT `tenantId` only)

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/vehicles` | — | own fleet |
| POST | `/vehicles` | `{ driverName, batteryCapacityKwh, priorityTier, departureTime }` | created vehicle |
| GET / PATCH / DELETE | `/vehicles/:id` | scoped to tenant | — |

### Sessions

| Method | Endpoint | Auth | Body / query | Response |
|--------|----------|------|--------------|----------|
| GET | `/sessions` | Admin / Tenant | Admin: `?tenantId=&siteId=&active=true` | `{ data: Session[] }` |
| GET | `/sessions/options` | Tenant | — | `{ vehicles, chargers, siteId }` |
| POST | `/sessions/start` | Tenant | `{ vehicleId, chargerId }` | session (`queued`) + simulator starts |
| POST | `/sessions/stop` | Admin / Tenant | `{ sessionId }` | completed session |

### Billing

| Method | Endpoint | Auth | Query | Response |
|--------|----------|------|-------|----------|
| GET | `/billing` | Admin / Tenant | Admin: `?tenantId=` | `{ summary, invoices, byTenant? }` |
| GET | `/billing/:invoiceId` | Admin / Tenant | — | invoice detail (tenant-scoped) |

### Notifications

| Method | Endpoint | Auth | Response |
|--------|----------|------|----------|
| GET | `/notifications` | Admin / Tenant | `{ notifications, unreadCount }` |
| PATCH | `/notifications/:id/read` | Admin / Tenant | updated notification |
| PATCH | `/notifications/read-all` | Admin / Tenant | `{ message }` |

### Dashboard

| Method | Endpoint | Auth | Response highlights |
|--------|----------|------|---------------------|
| GET | `/dashboard` | Admin / Tenant | `summary`, `powerUsage[]`, `tenantCosts[]`, `tariff`, (tenant: `recentSessions`) |

---

# Real-Time Flow

```text
Tenant clicks "Simulate Plug-In"
        │
        ▼
POST /sessions/start  →  Session(queued)  →  Charger(in_use)
        │
        ▼
Simulator tick (~3s)
  queued → connected → charging
        │
        ▼
Optimizer allocatePower(site cohort, capacity, tariff)
  → allocatedPowerKw + state optimized|throttled
        │
        ▼
Socket.IO
  session:update  →  Session Board cards move
  site:update     →  PowerUsageChart appends point
  notification:new→  Bell + toast (on throttle / complete)
        │
        ▼
Completed → billing.service + charger available
```

**Charger → Backend → Optimizer → WebSocket → Dashboard** is fully simulated in-process (no physical OCPP charger).

---

# Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | HTTP port |
| `MONGO_URI` | Yes | `mongodb://127.0.0.1:27017/lbrce_fsd` or Atlas `mongodb+srv://…` | Mongo connection |
| `JWT_SECRET` | Yes | `dev-secret-change-me` | JWT signing key |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | CORS + Socket.IO origin |
| `NODE_ENV` | No | `development` | Environment |
| `JWT_EXPIRES_IN` | No | `7d` | Token TTL |
| `SIMULATOR_TICK_MS` | No | `3000` | Simulator tick interval |
| `SIMULATOR_POWER_TICKS` | No | `4` | Power-phase ticks before auto-complete |

Copy from `backend/.env.example` and adjust.

### Frontend (`frontend/.env`)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `/api` | Axios base (Vite proxies to `:5000`) |
| `VITE_SOCKET_URL` | No | unset | Same-origin socket via Vite proxy |

---

# Installation

### Prerequisites

- Node.js 20+
- MongoDB locally **or** MongoDB Atlas (IP allowlist + DB user)

### 1. Clone & install

```bash
cd LBRCE_FSD_HACKTHON
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 2. MongoDB

**Local:**

```env
MONGO_URI=mongodb://127.0.0.1:27017/lbrce_fsd
```

**Atlas:** paste `mongodb+srv://…` into `backend/.env` (URL-encode special password characters).

### 3. Configure env

```bash
# backend/.env — see Environment Variables
# frontend/.env — VITE_API_URL=/api is enough for local Vite proxy
```

### 4. Seed demo data

```bash
npm run seed
```

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `Admin@123` |
| Tenant Alpha | `tenant1@example.com` | `Tenant@123` |
| Tenant Beta | `tenant2@example.com` | `Tenant@123` |

Seed creates site **Downtown Hub** (40 kW), chargers A1/A2/B1, two tenants, and sample vehicles.

### 5. Run

```bash
# both apps
npm run dev

# or separately
npm run dev:backend    # http://localhost:5000
npm run dev:frontend   # http://localhost:5173
```

### 6. Tests (optimizer)

```bash
npm test --prefix backend
```

### Port already in use (`EADDRINUSE`)

Stop the process on port 5000 (Windows PowerShell):

```powershell
Get-NetTCPConnection -LocalPort 5000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Then restart `npm run dev:backend`.

---

# Screens

| Screen | Route | Role | What you see |
|--------|-------|------|----------------|
| Login | `/login` | Public | Email/password; redirects by role |
| Admin Dashboard | `/admin` | Admin | Stat cards, live power chart, tenant cost chart |
| Sites & Grid | `/admin/sites` | Admin | Site CRUD; inline capacity slider |
| Chargers | `/admin/chargers` | Admin | Register / filter by site |
| Tenants | `/admin/tenants` | Admin | Onboard companies |
| Live Board | `/admin/sessions` | Admin | All tenants’ sessions kanban |
| Reports | `/admin/reports` | Admin | Cost table + charts + invoices |
| Tenant Dashboard | `/tenant` | Tenant | Fleet stats, site draw, power chart |
| Vehicles | `/tenant/vehicles` | Tenant | Card grid; priority + departure |
| Live Board | `/tenant/sessions` | Tenant | Own sessions + **Simulate Plug-In** |
| Billing | `/tenant/billing` | Tenant | Usage summary + itemized invoices |
| Notifications | Topbar bell | Both | Unread badge, list, toast |

UI includes empty states, skeletons, error retry, dark/light theme, and a connection-lost banner when the socket drops.

---

# Optimization Logic

Implemented in `backend/services/optimizer.service.js` as a **pure, synchronous** function `allocatePower(activeSessions, siteCapacityKw, tariff)`.

### Scoring formula

```text
socFraction   = clamp(kWhDelivered / batteryCapacityKwh, 0, 1)
energyNeed    = 1 - socFraction
hoursToDepart = max(0.25, (departureTime - now) / 1 hour)
urgency       = energyNeed / hoursToDepart

priorityWeight:
  sla=4, high=3, medium=2, low=1

tariffFactor:
  off-peak=1.0, normal=1.1, peak=1.25

score = urgency × priorityWeight × tariffFactor
```

### Allocation

1. Sort sessions by `score` descending.
2. Greedily grant up to each charger’s `maxPowerKw` from remaining site capacity.
3. Subtract grants until capacity is exhausted.

### Throttling rules

A session is marked **`throttled`** (instead of **`optimized`**) when:

```text
allocatedPowerKw < max(3 kW, 15% of charger maxPowerKw)
```

Tariff bands (`tariff.service.js`): off-peak `00–05`, peak `17–20`, otherwise normal. Prices: $0.08 / $0.14 / $0.28 per kWh (simulated).

---

# Future Improvements

- Real OCPP 1.6/2.0.1 charger integration
- True MILP / OR-Tools optimizer with SOC targets and TOU constraints
- Stripe (or similar) payment capture on invoices
- Real SMS/push (Twilio / FCM) behind the same notification model
- Historical power metrics persisted in MongoDB (not only in-memory ring buffer)
- Tenant self-serve manager invites and password reset
- Audit log for admin grid-limit changes
- E2E Playwright suite for login → plug-in → invoice

---

# Known Limitations

| Area | Reality in this project |
|------|-------------------------|
| Chargers | **Simulated** state machine — not OCPP / hardware |
| Optimizer | Greedy heuristic — **not** MILP / OR-Tools |
| Notifications | **In-app only** — framed as simulated push/SMS |
| Billing | Usage ledger only — **no payment processing** |
| Power history | In-memory metrics buffer (lost on server restart) |
| Auth | Demo JWT; no refresh tokens / SSO |
| Multi-site tenants | A tenant is assigned one `siteId` |
| Seed site capacity | 40 kW by design so concurrent sessions visibly throttle |

---

## Maintenance rule

Whenever you change code that affects features, APIs, schemas, folders, components, env vars, or dependencies: **update this README in the same change**. Do not create other `.md` documentation files.
