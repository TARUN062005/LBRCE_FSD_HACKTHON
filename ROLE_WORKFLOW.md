# RouteGuardian Role System

> **Single file for roles, permissions, workflows, APIs, and scenarios.**  
> Update this document whenever authentication or role logic changes.  
> Do not create other role-related markdown files.

## Core rules

1. **Google OAuth ALWAYS creates `normal_user`.**  
2. **Google OAuth NEVER creates `tenant_manager` or `admin`.**  
3. **Only admins** can promote `normal_user` → `tenant_manager` (with a `tenantId`).  
4. **Admins are created separately** (seed / system owners) — not via Google login.

```text
Google OAuth  ──────────────►  normal_user  ──(admin approve)──►  tenant_manager
                                      │
Seed / system owners only  ───────────┴──────────────────────►  admin
```

| Role | Code value | Portal | How created |
|------|------------|--------|-------------|
| Normal User | `normal_user` | `/user` | Google OAuth (always) |
| Tenant Manager | `tenant_manager` | `/tenant` | Admin promote + seed demo |
| Site Admin | `admin` | `/admin` | Seed / system owners only |

---

# ROLE 1: NORMAL USER

## Definition

A **normal user** is anyone who signs in with Google OAuth. They are EV owners or drivers. They are **not** tenant managers and **not** admins.

## Permissions

| Allowed | Denied |
|---------|--------|
| Login with Google | Create sites |
| View landing page | Create chargers |
| View / search charging stations | Create tenants |
| Pre-book charging slots | Configure grid capacity |
| Cancel bookings | Access admin dashboard |
| View booking history | Manage fleets |
| View charging / booking status | Access tenant dashboard |
| Receive notifications | |
| Manage profile | |
| View estimated charging cost | |
| Select charging time slot | |

## Normal User Workflow

```text
Step 1  →  Open landing page (`/`)
     ↓
Step 2  →  Click "Continue with Google"
     ↓
Step 3  →  Backend verifies Google ID token
     ↓
Step 4  →  Create / update user with role: "normal_user"
     ↓
Step 5  →  Redirect to User Dashboard (`/user`)
     ↓
Step 6  →  User searches charging stations
     ↓
Step 7  →  User checks availability
     ↓
Step 8  →  User books a charging slot (status: pending)
     ↓
Step 9  →  User receives confirmation notification
     ↓
Step 10 →  Admin may approve → user arrives / charges → notifications + cost estimate
```

---

# ROLE 2: TENANT MANAGER

## Definition

Fleet manager responsible for a company EV fleet. Scoped by JWT `tenantId`.

## Permissions

| Allowed | Restrictions |
|---------|----------------|
| Add vehicles / drivers | Cannot create sites |
| Set priorities & departure times | Cannot create chargers |
| Start / stop charging sessions | Cannot configure grid capacity |
| View fleet analytics | Cannot manage other tenants |
| View billing | |
| View notifications | |
| Manage company fleet | |

## Workflow

```text
Admin promotes user → tenant_manager + tenantId
     ↓
Login → `/tenant`
     ↓
Add vehicles → Simulate Plug-In → Optimizer → Notifications → Billing
```

---

# ROLE 3: ADMIN

## Definition

Platform administrator. Owns infrastructure and approvals.

## Permissions

| Allowed |
|---------|
| Create sites / register chargers |
| Configure grid limits |
| Create tenants |
| Approve tenant managers (`PATCH /auth/promote`) |
| Approve / cancel driver bookings |
| Monitor all sessions |
| View analytics, reports, billing |
| Monitor system health |

## Workflow

```text
Seed admin login → Create site → Set capacity → Register chargers
     → Create tenants → Promote managers → Approve bookings
     → Monitor sessions / analytics
```

---

# Authentication Flow

```text
Landing Page
      ↓
Google OAuth (GIS credential)
      ↓
Backend verification (`POST /api/auth/google/callback`)
      ↓
Create user (if new)  OR  refresh profile (if existing)
      ↓
Assign / keep role — Google path never elevates
      ↓
role = "normal_user"   (for all Google-created accounts)
      ↓
User dashboard (`/user`)

Demo buttons (seed only):
  Demo Admin           → admin@example.com
  Demo Tenant Manager  → tenant1@example.com
```

**Promotion path (admin only):**

```text
normal_user  --PATCH /api/auth/promote-->  tenant_manager (+ tenantId)
```

Admins **cannot** be created via promote or Google.

---

# Database

## `users`

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

| Field | Notes |
|-------|--------|
| `role` | Authorization gate |
| `tenantId` | Required for `tenant_manager`; always `null` for `normal_user` and `admin` |
| `googleId` | Google `sub` |

Bookings are stored in the **`bookings`** collection (not embedded arrays) for query performance and overlap checks.

## `bookings`

```json
{
  "_id": "...",
  "userId": "...",
  "chargerId": "...",
  "siteId": "...",
  "bookingDate": "...",
  "startTime": "...",
  "endTime": "...",
  "status": "pending | approved | charging | completed | cancelled",
  "estimatedCost": 0,
  "siteName": "...",
  "chargerLabel": "..."
}
```

---

# API Documentation

Base: `/api`  
Header (unless public): `Authorization: Bearer <JWT>`

## Auth

### `GET /auth/google` — Public

Returns `{ clientId, configured, demoAuth }`.

### `POST /auth/google/callback` — Public

| Body | Result |
|------|--------|
| `{ "credential": "<google-id-token>" }` | Always `normal_user` (create or refresh) |
| `{ "demoRole": "admin" \| "tenant_manager" }` | Seeded elevated account only (if `ALLOW_DEMO_AUTH`) |

**Example response**

```json
{
  "status": "ok",
  "token": "<jwt>",
  "user": {
    "userId": "...",
    "email": "driver@gmail.com",
    "role": "normal_user",
    "tenantId": null
  }
}
```

### `GET /auth/me` — Any JWT

Current user profile.

### `POST /auth/logout` — Any JWT

Logout acknowledgement.

### `GET /auth/users` — Admin

List users for promotion UI.

### `PATCH /auth/promote` — Admin

```json
{ "userId": "...", "role": "tenant_manager", "tenantId": "..." }
```

or demote:

```json
{ "userId": "...", "role": "normal_user" }
```

Cannot create or modify `admin` via this endpoint.

---

## Stations & availability

### `GET /stations` — Public

Query: `?q=downtown`  
Lists sites + chargers + availability counts + current tariff.

### `GET /stations/:id` — Public

Station detail.

### `GET /availability` — Public  
### `GET /stations/availability` — Public

Query: `?siteId=&chargerId=&date=YYYY-MM-DD`  
Returns `busy` windows and `freeSlots` (hourly 08:00–20:00).

---

## Bookings

### `POST /bookings/create` — `normal_user` only

```json
{
  "siteId": "...",
  "chargerId": "...",
  "startTime": "2026-08-06T10:00:00.000Z",
  "endTime": "2026-08-06T11:00:00.000Z"
}
```

Creates `pending` booking + notification. Rejects overlapping slots (409).

**Who cannot:** `admin`, `tenant_manager`, anonymous.

### `GET /bookings` — `normal_user` | `admin`

- User: own bookings  
- Admin: all bookings  

### `PATCH /bookings/cancel` or `PATCH /bookings/:id/cancel` — owner or admin

Sets status `cancelled`.

### `PATCH /bookings/:id/approve` — Admin

`pending` → `approved`.

---

## Existing role-gated APIs (unchanged intent)

| API | Roles |
|-----|--------|
| `POST /sites`, `POST /chargers`, `POST /tenants` | `admin` |
| `POST /vehicles`, `POST /sessions/start` | `tenant_manager` |
| `GET /billing`, `GET /sessions` | `admin`, `tenant_manager` |
| `GET /dashboard` | `admin`, `tenant_manager` |
| `GET /notifications` | `admin`, `tenant_manager`, `normal_user` |

---

# UI Dashboards

## 1. User Dashboard (`/user`)

| Route | Purpose |
|-------|---------|
| `/user` | Home, search, stats |
| `/user/stations` | Search stations, pre-book slots |
| `/user/bookings` | History, cancel, status, estimated cost |
| `/user/profile` | Google profile |

## 2. Tenant Dashboard (`/tenant`)

Fleet management, vehicles, live sessions, billing.

## 3. Admin Dashboard (`/admin`)

Sites, chargers, tenants, **Users** (promote), **Bookings** (approve), analytics, reports, live board.

---

# Permission Matrix

| Feature | Normal User | Tenant Manager | Admin |
|---------|:-----------:|:--------------:|:-----:|
| Google login → role | normal_user | (existing only) | (existing only) |
| Landing page | Yes | Yes | Yes |
| Search stations / book | Yes | No | Approve only |
| Cancel own booking | Yes | No | Yes |
| Create sites / chargers | No | No | Yes |
| Configure grid | No | No | Yes |
| Create tenants | No | No | Yes |
| Promote to tenant_manager | No | No | Yes |
| Add vehicles / start sessions | No | Yes | No |
| View fleet billing | No | Yes | Yes (reports) |
| Judge analytics | No | Tenant stats | Yes |

---

# Full System Workflow

```text
Landing
  → Google Login → normal_user → User Dashboard
  → Search stations → Check availability → Book slot (pending)
  → Admin approves booking
  → (Fleet path) Admin creates site/chargers/tenants
  → Admin promotes manager
  → Tenant adds vehicles → Plug-In → Optimizer → Socket.IO
  → Notifications → Billing
```

---

# Judge Demo Scenario (5 minutes)

### Minute 1 — Landing + Google path

Show `/`. Explain Google → **always** `normal_user`. Open `/login`.

### Minute 2 — Driver booking

Sign in with Google (or note seeded `driver@example.com` is normal_user).  
`/user/stations` → Pre-book → show pending booking + notification.

### Minute 3 — Admin infrastructure

**Demo Admin** → Sites / Chargers / Tenants → **Users** (promote) → **Bookings** (approve).

### Minute 4 — Tenant fleet

**Demo Tenant Manager** → Vehicles → Live Board → Simulate Plug-In.

### Minute 5 — Optimizer

Show Optimized / Throttled under 40 kW, notifications, billing / analytics.

---

# Seed accounts (elevated — not Google)

| Email | Role | Access |
|-------|------|--------|
| `admin@example.com` | admin | Demo Admin button |
| `tenant1@example.com` | tenant_manager | Demo Tenant Manager button |
| `tenant2@example.com` | tenant_manager | Seed only |
| `driver@example.com` | normal_user | Example driver |

```bash
npm run seed
```

---

## Maintenance

When auth or roles change: update **ROLE_WORKFLOW.md** and **README.md** together. Never add other markdown docs for roles.
