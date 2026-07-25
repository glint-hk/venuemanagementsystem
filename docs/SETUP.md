# Local Setup Guide

Get the venue-booking monorepo running on your laptop — Mac or Windows. Follow this top to bottom; don't skip steps. If something breaks, check [Troubleshooting](#troubleshooting) before asking in the group chat — your error is probably already answered there.

**Time to a working local setup: ~15 minutes.**

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install PostgreSQL](#2-install-postgresql)
3. [Clone and install the project](#3-clone-and-install-the-project)
4. [Configure environment files](#4-configure-environment-files)
5. [Set up the database](#5-set-up-the-database)
6. [Run the app](#6-run-the-app)
7. [Verify your setup](#7-verify-your-setup)
8. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites

Install these two things first, regardless of OS:

| Tool | Version | Get it |
|---|---|---|
| **Node.js** | 20 LTS or newer | [nodejs.org](https://nodejs.org) — download the **LTS** installer |
| **Git** | any recent version | **Windows:** [git-scm.com](https://git-scm.com/download/win) — installs **Git Bash**, which you need (see below). **Mac:** already installed, or `brew install git` |

> **Windows users:** the project's pre-commit hook is a bash script. Git for Windows ships with Git Bash and wires it up automatically for git hooks — a plain "GitHub Desktop only" setup won't work. Install Git for Windows itself, even if you also use a GUI client.

Check both are installed correctly:

```bash
node -v      # should print v20.x.x or higher
git --version
```

---

## 2. Install PostgreSQL

You need a **real local PostgreSQL server** — not SQLite, not a hosted database. The core guarantee of this system (no double-booking) is a PostgreSQL-specific feature and won't work on anything else.

### Mac (Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16
```

`brew services start` runs Postgres in the background permanently (survives reboots). Confirm it's running:

```bash
pg_isready
# expect: /tmp:5432 - accepting connections
```

Homebrew's Postgres has no password on the default `postgres` role — that's fine for local dev.

### Windows

Download and run the installer from **[postgresql.org/download/windows](https://www.postgresql.org/download/windows/)** (the EDB installer). During install:

- Keep the default port **5432**.
- Set a password for the `postgres` superuser — **write it down**, you'll need it below.
- You can uncheck Stack Builder at the end; not needed.

The installer sets Postgres up as a Windows service that starts automatically — nothing else to run. Confirm it's working by opening **SQL Shell (psql)** from the Start menu and connecting with the password you set.

### Either OS: create the project database

```bash
# Mac (no password needed):
createdb venue_booking_dev

# Windows (from a normal terminal, will prompt for the postgres password):
createdb -U postgres venue_booking_dev
```

If `createdb` isn't found on Windows, use the full path, typically:
`"C:\Program Files\PostgreSQL\16\bin\createdb.exe"`, or just add that `bin` folder to your PATH.

---

## 3. Clone and install the project

```bash
git clone https://github.com/glint-hk/venuemanagementsystem.git
cd venuemanagementsystem
npm run install:all
```

This installs all three workspaces (`client`, `server`, `shared`) **and** automatically wires up the pre-commit hook (`git config core.hooksPath .githooks` runs as part of `npm install` — you don't run this yourself).

Confirm the hook is wired up:

```bash
git config core.hooksPath
# expect: .githooks
```

---

## 4. Configure environment files

Copy the two example files — never edit `.env.example` itself, and never commit the real `.env` files (they're gitignored on purpose).

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

`client/.env` needs no changes for local dev — the default is already correct.

`server/.env` needs `DATABASE_URL` filled in **twice, in sequence** — once to run migrations, once for day-to-day dev. This two-step is deliberate: the server itself connects as a low-privilege role that is *not allowed* to create tables, so someone/something with more privilege has to run the migrations first.

**Step 4a — set it to your Postgres superuser, to run migrations:**

```bash
# Mac:
DATABASE_URL="postgresql://postgres@localhost:5432/venue_booking_dev"

# Windows (use the password you set during install):
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/venue_booking_dev"
```

Leave the other placeholder values (`JWT_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`, `SMTP_*`) as-is for now — nothing reads them yet.

---

## 5. Set up the database

From the `server/` folder, apply the existing migrations (do **not** use `prisma migrate dev` — that's for the Architect authoring *new* migrations; you're only applying the ones that already exist):

```bash
cd server
npx prisma migrate deploy
cd ..
```

This does three things in one step: creates every table, adds the PostgreSQL exclusion constraint that prevents double-booking, and creates a second, low-privilege database role called `app_user` (with `UPDATE`/`DELETE` on the audit log revoked at the database level).

**Step 4b (now) — switch `server/.env` to `app_user`:**

```bash
DATABASE_URL="postgresql://app_user:CHANGE_ME_LOCAL_DEV_ONLY@localhost:5432/venue_booking_dev"
```

`CHANGE_ME_LOCAL_DEV_ONLY` is a fixed, publicly-known **local-dev-only** placeholder created by the migration itself — not a real secret, don't treat it as one, don't reuse it anywhere real.

From now on, this is the `DATABASE_URL` you leave in place for `npm run dev`. You only switch back to the `postgres` superuser URL (step 4a) if you pull new migrations later and need to re-run `prisma migrate deploy`.

---

## 6. Run the app

From the repo root:

```bash
npm run dev
```

This runs the client (Vite) and server (Express) together. You should see two colored log streams (`client` / `server`) in one terminal.

- Client: http://localhost:5173
- Server: http://localhost:4000

To run just one side: `npm run dev:client` or `npm run dev:server`.

---

## 7. Verify your setup

Run these three checks. If all three pass, you're fully set up.

```bash
# 1. Server health check
curl http://localhost:4000/healthz
# expect: {"status":"ok"}

# 2. Lint passes
npm run lint

# 3. Tests pass
npm test
```

If you want to go one step further and prove the double-booking guarantee works on your machine (optional, but a good sanity check):

```bash
cd server
npm run stress-test
```

Expect to see `PASS` twice — one for the concurrency test, one for the audit-log immutability test.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `git commit` silently does nothing / hook not running | Run `git config core.hooksPath` — if it doesn't print `.githooks`, run `npm install` again from the repo root. |
| `password authentication failed for user "postgres"` | Windows: you're using the wrong password from install, or `DATABASE_URL` still has the placeholder in it. Mac (Homebrew): omit the password entirely — `postgresql://postgres@localhost:5432/...` with no `:password`. |
| `database "venue_booking_dev" does not exist` | You skipped `createdb` in step 2. Run it, then re-run `npx prisma migrate deploy`. |
| `extension "btree_gist" is not available` | Very rare on Mac/Windows installers (it ships by default). If it happens, reinstall Postgres via the methods above rather than a minimal/custom install. |
| `role "app_user" does not exist` when running the server | Migrations haven't been applied yet, or `DATABASE_URL` points at the wrong database. Go back to step 5. |
| `EADDRINUSE` on port 4000 or 5173 | Something else is already using that port. Stop it, or change `PORT` in `server/.env`. |
| `npx prisma migrate deploy` hangs or asks questions | You ran `prisma migrate dev` by mistake — that command is interactive and is not what you want here. Use `migrate deploy`. |
| Windows: `bash: command not found` type errors from the hook | Confirm Git for Windows (not just the GitHub Desktop app) is installed — see [Prerequisites](#1-prerequisites). |
| Still stuck | Post in the team channel with: your OS, the exact command you ran, and the full error text. "It doesn't work" isn't enough to debug. |

---

*This guide covers your local machine only. For what the project is, how it's structured, and who owns what, see [README.md](../README.md).*
