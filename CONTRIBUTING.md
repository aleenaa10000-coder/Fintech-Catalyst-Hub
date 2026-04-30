# Contributing to FintechPressHub

Thanks for your interest in contributing! This guide gets you from a fresh clone to a merged PR. For an overview of the stack, see the [README](./README.md).

---

## Table of contents

1. [Local setup](#local-setup)
2. [Project layout](#project-layout)
3. [Branching strategy](#branching-strategy)
4. [Commit messages](#commit-messages)
5. [Before you open a PR](#before-you-open-a-pr)
6. [Pull request guidelines](#pull-request-guidelines)
7. [Code style](#code-style)
8. [Adding or changing API endpoints](#adding-or-changing-api-endpoints)
9. [Database changes](#database-changes)
10. [Reporting bugs](#reporting-bugs)

---

## Local setup

You need **Node 20+** and **pnpm 10+**.

```bash
# Clone and install
git clone https://github.com/aleenaa10000-coder/Fintech-Catalyst-Hub.git
cd Fintech-Catalyst-Hub
pnpm install

# Configure environment
cp .env.example .env
# At minimum, set DATABASE_URL. See .env.example for everything else.

# Push the schema and seed demo data
pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts run seed:auto

# Verify the install
pnpm bootstrap
```

Then in two terminals:

```bash
# Terminal 1 — API
PORT=8080 pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/fintechpresshub run dev
```

Working in Replit? Just import the repo and click **Run** — see the [README quick start](./README.md#quick-start-replit).

---

## Project layout

```
artifacts/
  api-server/         Express 5 API
  fintechpresshub/    React + Vite frontend
  mockup-sandbox/     Component preview sandbox
lib/
  api-spec/           OpenAPI spec (source of truth)
  api-client-react/   Generated typed React Query hooks
  api-zod/            Generated Zod schemas
  db/                 Drizzle ORM schemas + migrations
  replit-auth-web/    Replit Auth helpers
scripts/              Seed scripts, bootstrap, post-merge hooks
```

Most changes touch one of the `artifacts/` apps and possibly `lib/db` or `lib/api-spec`.

---

## Branching strategy

- `main` is always deployable. The CI workflow must be green before merging.
- Branch off `main` for every change. Use a descriptive prefix:
  - `feat/short-description` — new features
  - `fix/short-description` — bug fixes
  - `chore/short-description` — tooling, dependency bumps, refactors with no behavior change
  - `docs/short-description` — documentation only

Example: `feat/blog-rss-feed`, `fix/contact-form-validation`.

---

## Commit messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<optional scope>): <short summary>

<optional body>
```

Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`.

Examples:
- `feat(blog): add RSS feed at /rss.xml`
- `fix(api): return 404 instead of 500 for missing slug`
- `chore(deps): bump drizzle-orm to 0.46`

Keep the summary under ~72 characters and write in the imperative mood ("add" not "added").

---

## Before you open a PR

Run these locally — CI will run them too, but it's faster to catch issues here:

```bash
pnpm bootstrap        # toolchain + dependency sanity check
pnpm typecheck        # TypeScript across the whole monorepo
pnpm -r --if-present run build   # optional: full build
```

If you changed the OpenAPI spec, regenerate clients:

```bash
pnpm --filter @workspace/api-spec run codegen
```

If you changed the database schema, push it and update seed data if needed:

```bash
pnpm --filter @workspace/db run push
```

---

## Pull request guidelines

1. **One topic per PR.** Smaller PRs get reviewed and merged faster.
2. **Describe the change.** What and why — not just how. Link any related issue.
3. **Include before/after screenshots** for UI changes.
4. **Update docs** when behavior, env vars, or commands change.
5. **Wait for green CI** before requesting review.
6. **Keep `main` linear.** Rebase your branch on `main` instead of merging `main` into it.

A PR template will be filled in for you when you open one — please don't delete the sections.

---

## Code style

- **Formatting**: Prettier handles everything. Run `pnpm exec prettier --write .` if your editor doesn't auto-format.
- **TypeScript**: strict mode is on. Don't add `any` — use `unknown` and narrow, or fix the upstream type.
- **React**: function components only, prefer hooks over HOCs, colocate component-specific files.
- **Backend**: keep route handlers thin — push business logic into `services/` or `lib/`.
- **Imports**: use the workspace package names (`@workspace/db`, `@workspace/api-zod`, etc.) instead of relative paths across packages.

---

## Adding or changing API endpoints

The OpenAPI spec at `lib/api-spec/openapi.yaml` is the **source of truth**. Workflow:

1. Edit `openapi.yaml` to describe the new/changed endpoint.
2. Run `pnpm --filter @workspace/api-spec run codegen` to regenerate the React Query hooks (`@workspace/api-client-react`) and Zod schemas (`@workspace/api-zod`).
3. Implement the route in `artifacts/api-server/src/routes/`.
4. Use the generated hook from the frontend.

Don't hand-write fetch calls — always use the generated client so the contract stays in sync.

---

## Database changes

1. Edit the Drizzle schema in `lib/db/src/schema/`.
2. Run `pnpm --filter @workspace/db run push` to apply the change to your local database.
3. If your change adds a required column, also update `scripts/src/auto-seed.ts` so fresh imports keep working.

The post-merge hook (`scripts/post-merge.sh`) runs `db push` and `seed:auto` automatically after Replit task merges, so you don't need to write migration files.

---

## Reporting bugs

Open an issue with:
- What you did (steps to reproduce)
- What you expected to happen
- What actually happened (include logs / screenshots)
- Your environment (Replit or local, Node version from `node -v`)

Security issues: please email the address listed in `.env.example` under `CONTACT_NOTIFY_TO` instead of opening a public issue.

---

Thanks again — happy hacking!
