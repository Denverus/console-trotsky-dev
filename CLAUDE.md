# CLAUDE.md

This file provides guidance for Claude Code when working in this app.

Part of `console-trotsky-dev`. For cross-app context (other sub-repos, shared conventions, integration points), read `../CLAUDE.md` and `../.ai/`.

## App

`console-trotsky-dev-platform-service` — Core platform service. Owns user accounts, company management, roles (Super Admin), service assignment per company, API key issuance, and JWT auth. Every other service depends on this one.

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Fastify 4.x
- **Database:** MongoDB Atlas (users, companies, service assignments, API keys)
- **Auth:** JWT (access + refresh tokens) via `@fastify/jwt`. bcrypt for passwords.
- **Testing:** Vitest + supertest (or Fastify inject)

## Project Setup

```bash
npm install
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET
npm run seed           # seeds SuperAdmin user on first run
```

## Commands

```bash
# Dev server (with hot reload)
npm run dev       # :3000

# Build
npm run build

# Run all tests
npm test

# Seed SuperAdmin (first-time setup)
npm run seed

# Lint / format
npm run lint
```

## Architecture

### Folder structure

```
console-trotsky-dev-platform-service/
├── src/
│   ├── routes/
│   │   ├── auth/         # register, login, refresh, password reset
│   │   ├── companies/    # CRUD, service assignment (SuperAdmin only)
│   │   └── api-keys/     # list, revoke, regenerate per company per service
│   ├── services/         # Business logic (auth, company mgmt, key generation)
│   ├── plugins/          # Fastify plugins (mongo, jwt, cors, rate-limit)
│   ├── schemas/          # JSON Schema for request/response validation
│   ├── middleware/        # Role guards (requireSuperAdmin, requireAuth)
│   └── index.ts          # Entry point
├── test/
├── seed/                 # SuperAdmin seed script
└── .env.example
```

### Key patterns

- Route → Service → MongoDB (no ORM — native driver or Mongoose, TBD at bootstrap)
- Role guard middleware applied at route level: `requireSuperAdmin` for company/service management endpoints
- JWT: short-lived access token (15min) + long-lived refresh token (7d) in httpOnly cookie
- API keys: random 32-byte hex, stored hashed in Mongo, returned in plaintext only on creation

### Data model (high level)

```
User       { _id, email, passwordHash, role: 'superadmin' | 'admin', companyId?, createdAt }
Company    { _id, name, slug, planTier, services: [{ serviceId, apiKeyHash, createdAt }] }
ApiKey     { _id, companyId, serviceId, keyHash, createdAt, revokedAt? }
```

### Configuration

- `.env` for all secrets — never committed
- `MONGODB_URI` — Atlas connection string
- `JWT_SECRET` — for access token signing
- `JWT_REFRESH_SECRET` — for refresh token signing
- `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` — used by seed script only
- `PORT` — default 3000

## Code Conventions

- TypeScript throughout
- Fastify schemas on all routes (reject malformed input at the boundary)
- Passwords: bcrypt with cost factor 12+
- API keys: never stored in plaintext — hash on write, return plaintext only once on creation
- Tests cover: registration, login, token refresh, SuperAdmin guards (non-admin gets 403)

## Common Tasks

### Add a new service type
1. Add the service identifier to the services enum/constant
2. SuperAdmin can then assign it to a company via `POST /api/companies/:id/services`
3. An API key is auto-generated on assignment — analytics-service (and future services) validate against this key

### Revoke a company's service access
`DELETE /api/companies/:id/services/:serviceId` — marks the API key as revoked; analytics-service will reject it on next validation.

## Important Notes

- This is the trust anchor for the entire platform. A bug here affects every service.
- JWT issued here is for console-ui users only. The JS snippet on client sites uses API keys, not JWTs — keep these two auth paths completely separate.
- SuperAdmin is seeded, not self-registered. There is no public route to create a SuperAdmin.
- Check `../.ai/TECH_DEBT.md` before flagging issues.
