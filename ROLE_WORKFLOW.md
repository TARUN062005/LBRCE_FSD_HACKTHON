# GridFleet Role System

> Roles, permissions, auth, booking, billing, and promotion workflows for **Grid-Aware Multi-Tenant EV Fleet Charging Orchestration Platform**.  
> Update with `README.md` whenever auth or role logic changes.

## Hard rules

1. **Google OAuth is the only authentication method.** No seed users, no demo buttons, no password login.
2. **New Google users are always `normal_user`** (except the configured super admin).
3. **`admin` is created only when Google email matches `SUPER_ADMIN_EMAIL`.** Role is re-evaluated on every login.
4. **`tenant_manager` is created only by an admin** via `PATCH /users/:id/promote` with a `tenantId`.
5. **Never trust role from the frontend.** JWT claims are signed from the database; middleware re-checks role.
6. Users cannot promote/demote themselves. Admins cannot be created from the UI. Tenant managers cannot create admins.

```text
Google OAuth
  ├─ email == SUPER_ADMIN_EMAIL → admin → /admin
  └─ otherwise
        ├─ existing tenant_manager (+ tenantId) → keep → /tenant
        └─ else → normal_user → /user

Admin → Users → Promote to Tenant Manager (+ choose tenant)
Admin → Users → Demote tenant_manager → normal_user
```

---

# Role hierarchy

| Role | How obtained | Portal | Scope |
|------|--------------|--------|-------|
| `admin` | Google email matches `SUPER_ADMIN_EMAIL` | `/admin` | Platform-wide |
| `tenant_manager` | Admin promote + `tenantId` | `/tenant` | One tenant company |
| `normal_user` | Default Google signup | `/user` | Own bookings / invoices |

---

# Production authentication flow

```text
Continue with Google
        │
        ▼
Verify Google ID token (backend)
        │
        ▼
Find user by email / googleId
        │
   ┌────┴────┐
   │ exists? │
   └────┬────┘
        │
   create or update profile
   (name, email, picture, googleId)
        │
        ▼
resolveGoogleRole(email, existing)
  · SUPER_ADMIN_EMAIL match → admin, tenantId=null
  · else if existing tenant_manager → keep role + tenantId
  · else → normal_user, tenantId=null
        │
        ▼
Persist role from DB → sign JWT → redirect by role
```

If `SUPER_ADMIN_EMAIL` changes, the previous owner becomes `normal_user` on next login; the new email becomes `admin`.

---

# Admin onboarding (empty database)

```text
Deploy backend + frontend
Set SUPER_ADMIN_EMAIL=owner@gmail.com
Set GOOGLE_CLIENT_ID / VITE_GOOGLE_CLIENT_ID
MongoDB empty
        │
        ▼
Owner signs in with Google (that email)
        │
        ▼
User created with role=admin
        │
        ▼
Admin creates sites → chargers → tenants
        │
        ▼
Drivers sign in with Google → normal_user
        │
        ▼
Admin promotes selected drivers → tenant_manager
```

No seed command. No hardcoded emails except `SUPER_ADMIN_EMAIL` in env.

---

# Tenant manager promotion flow

```text
Admin dashboard → Users
        │
        ▼
GET /users/pending  (role === normal_user)
        │
        ▼
Select tenant company
Click "Promote to Tenant Manager"
        │
        ▼
PATCH /users/:id/promote  { tenantId }
        │
        ▼
DB: role=tenant_manager, tenantId=<company>
```

Demote:

```text
PATCH /users/:id/demote  →  role=normal_user, tenantId=null
```

Only admins can call these APIs (`verifyToken` + `requireRole('admin')`).

---

# Marketplace workflows (EV charging discovery)

GridFleet also operates as a **charging marketplace**:

| Role | Meaning |
|------|---------|
| `normal_user` | EV owner — map discovery, book, pay |
| `tenant_manager` | Local charging company — host stations |
| `admin` | Platform owner — approve tenants/stations |

### User flow

```text
Google login → Allow location → /user/map
  → Nearby stations (≤10 km, GeoJSON $near)
  → Station detail → pick slot → book → mock pay → confirmed
  → Navigate (OpenStreetMap directions) → charge → invoice / rating
```

### Tenant flow

```text
Admin promotes user to tenant_manager
  → Create station (map pin + address + price + chargers)
  → Station status approved (or pending if company pending)
  → Receive bookings + earnings
```

### Key APIs

| Method | Path | Notes |
|--------|------|-------|
| GET | `/stations/nearby?lat&lng&radiusKm&sort` | Geospatial discovery |
| POST | `/marketplace/stations` | Tenant create + pin |
| PATCH | `/marketplace/stations/:id/status` | Admin approve/suspend |
| POST | `/payments/checkout` | Mock payment → `confirmed` + `paid` |
| POST | `/stations/:id/ratings` | 1–5 star ratings |

Optional demo stations (Mylavaram + Vijayawada). Seeds **stations + Tenant companies only** — never users:

```bash
npm run seed:stations --prefix backend
```

---

# ROLE 1: User (EV owner) — `normal_user`

**Portal:** `/user`

```text
Google → Allow location → Map (20 km)
  → Station details → Book Now → pending
  → Host approves/rejects → travel → host starts/completes charge
  → Invoice (+ GST) → Pay → PDF
```

### Must not

Approve bookings, manage stations, open `/admin` or `/tenant`.

---

# ROLE 2: Tenant (charging company) — `tenant_manager`

**Portal:** `/tenant`

```text
Promote by admin → Host home
  → Create stations (map pin, price, hours)
  → Booking requests: Approve / Reject
  → Mark Charging started / completed
  → Earnings + invoices
```

### Must not

Access other tenants, admin analytics, or manage platform users.

---

# ROLE 3: Admin (platform owner)

**Portal:** `/admin`

```text
SUPER_ADMIN_EMAIL → Analytics · Stations · Companies · Managers · Reports
```

### Must never

Receive booking requests, approve bookings, open driver invoices, or run charging sessions.

---

# User document

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

---

# Auth & users APIs

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/auth/google` | Public | `{ clientId, configured, superAdminConfigured }` |
| POST | `/api/auth/google/callback` | Public | `{ credential }` only → JWT + user |
| GET | `/api/auth/me` | JWT | Profile from DB |
| POST | `/api/auth/logout` | JWT | Client clears session |
| GET | `/api/users` | Admin | All users |
| GET | `/api/users/pending` | Admin | `normal_user` candidates |
| PATCH | `/api/users/:id/promote` | Admin | `{ tenantId }` → tenant_manager |
| PATCH | `/api/users/:id/demote` | Admin | → normal_user |

---

# Booking system

```text
Book Now → pending → notify tenant only (+ user "request sent")
Tenant Approve → approved → user notified
Tenant Reject → rejected → user notified
Tenant Start → charging → user notified
Tenant Complete → completed + invoice (GST) → user + tenant notified
User Pay → paymentStatus paid
```

Admin is **not** on any booking route.

| Method | Path | Role | Action |
|--------|------|------|--------|
| POST | `/api/bookings/create` | normal_user | Create pending |
| GET | `/api/bookings` | normal_user | Own list |
| PATCH | `/api/bookings/:id/cancel` | owner, tenant | Cancel |
| PATCH | `/api/bookings/:id/approve` | tenant_manager | Approve |
| PATCH | `/api/bookings/:id/reject` | tenant_manager | Reject |
| POST | `/api/bookings/:id/start` | tenant_manager | Charging started |
| POST | `/api/bookings/:id/complete` | tenant_manager | Complete + invoice |

---

# Permission matrix

| Feature | User | Tenant | Admin |
|---------|:----:|:------:|:-----:|
| Google signup | default | via promote | `SUPER_ADMIN_EMAIL` |
| Map / book slots | Yes | — | — |
| Approve / reject bookings | — | Yes | **Never** |
| Start / complete charging | — | Yes | **Never** |
| Driver invoices | Own | Host earnings | **Never** |
| Stations (own) | — | Yes | Moderate all |
| Promote managers | — | — | Yes |

---

# Security

- Role always loaded/updated from MongoDB on Google login.
- `verifyToken` + `requireRole` on protected routes.
- Tenant isolation via JWT `tenantId` from DB.
- Self-promote / self-demote rejected.
- Admins cannot be demoted via promote/demote APIs (only via `SUPER_ADMIN_EMAIL` change on next login).
- No seed scripts, no demo accounts, no `ADMIN_EMAILS`, no local auth shortcuts.
