# AGENTS.md — Self-Hosted Financial Portfolio Tracker

This file provides context and conventions for AI agents (Copilot, Claude, etc.) working in this repository.

> **Start here:** [`PROGRESS.md`](.agent/PROGRESS.md) tells you what has been built and what to work on next. Read it before anything else.

---

## Project Overview

A **self-hosted personal financial portfolio tracker** built for a single user to manage multiple portfolios across diverse asset types. All data entry is manual in v1. The full product spec is in [`PRD.md`](../PRD.md).

**Stack:** Next.js (App Router) · TypeScript · PostgreSQL · Prisma ORM · shadcn/ui · Tailwind CSS · Docker Compose

---

## Repository Structure

```
/
├── PRD.md                        # Full product requirements — read this first
├── docker-compose.yml            # App (port 3000) + PostgreSQL (internal)
├── .env                          # DB credentials and config (never commit secrets)
├── .agent/                       # All AI agent guidance lives here
│   ├── AGENTS.md                 # This file — conventions and key rules
│   ├── PROGRESS.md               # Task status tracker — agent memory between sessions
│   ├── DEVELOPMENT_PLAN.md       # Phases, workflow, testing strategy
│   ├── CODE_STYLE.md             # Naming, typing, and component conventions
│   ├── FINANCE_TEST_SPECS.md     # Pre-defined test cases for finance functions
│   └── FEATURE_PLAN_TEMPLATE.md  # Template to fill out before each feature
├── prisma/
│   └── schema.prisma             # Source of truth for the data model
├── src/
│   ├── app/                      # Next.js App Router pages and layouts
│   │   ├── (dashboard)/          # Dashboard route group
│   │   ├── portfolios/[id]/      # Portfolio detail pages
│   │   ├── transactions/         # Transaction management
│   │   ├── assets/               # Asset management & price updates
│   │   └── api/                  # API route handlers (server actions preferred)
│   ├── components/               # Shared UI components (shadcn/ui based)
│   ├── lib/
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── finance/              # Core financial calculations (TWR, XIRR, FIFO)
│   │   └── utils.ts              # General helpers
│   └── types/                    # Shared TypeScript types
└── .github/
    ├── skills/                   # Copilot CLI custom skills
    └── copilot-instructions.md   # Copilot custom instructions
```

---

## Data Model

Defined in `prisma/schema.prisma`. Core entities:

| Model | Purpose |
|---|---|
| `Portfolio` | Named collection of holdings; has a `base_currency` |
| `Asset` | A tradeable instrument (stock, crypto, cash, bond, commodity, fund) |
| `Transaction` | Immutable ledger entry: `buy`, `sell`, `convert`, `fee`, `price_adjust` |
| `Price` | Point-in-time price record for an asset (source: `manual` or `transaction`) |
| `Snapshot` | Portfolio NAV at a point in time; used for growth charts and performance metrics |

**Key rules:**
- Positions are **computed** from the transaction ledger — never stored directly.
- Cost basis uses **FIFO** globally.
- A `Convert` transaction has two linked `Transaction` rows sharing a `conversion_id`.
- A `Snapshot` is written on every transaction save and every manual price update.

---

## Commit Message Convention

All commits **must** follow this format exactly:

```
<type>(<scope>): <short summary in imperative mood>

[optional body — bullet points for multi-concern changes]

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

**Types:** `feat` · `fix` · `chore` · `refactor` · `docs` · `test` · `style`

**Scope:** the area of the codebase affected, e.g. `transactions`, `portfolio`, `prisma`, `docker`, `dashboard`

**Examples:**
```
feat(transactions): add convert transaction form with linked sell/buy legs
fix(finance): correct FIFO lot depletion when quantity exceeds oldest lot
chore(prisma): add Snapshot model and migration
docs(prd): update success criteria for v1
```

- Subject line ≤ 72 characters, imperative mood ("add" not "added")
- No period at the end of the subject line
- Always include the `Co-authored-by` trailer

---

## Development Workflow

Full plan in [`.agent/DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md). The loop for every feature:

1. **Plan** — fill out `.agent/FEATURE_PLAN_TEMPLATE.md` including the **Test Plan section** before any code
2. **Branch** — `feat/<scope>/<name>` off `main`
3. **TDD** — write ALL failing tests first (from plan + `.agent/FINANCE_TEST_SPECS.md` for finance functions), then implement until green
4. **Validate** — `npx tsc --noEmit` → `npm run lint` → `npm run test` → manual smoke in Docker
5. **Code Review** — run the `code-review` agent against the branch diff; address any flagged issues
6. **PR** — open PR using `.github/pull_request_template.md`, CI must pass (`.github/workflows/ci.yml`)
7. **Merge** — squash merge to `main`, delete branch

Never develop on `main`. Never merge a failing CI. Tests are written before implementation — always.

Finance function test cases are pre-specified in [`.agent/FINANCE_TEST_SPECS.md`](FINANCE_TEST_SPECS.md) with exact numerical values.

---

## Code Style

Full conventions are in [`.agent/CODE_STYLE.md`](CODE_STYLE.md). Key rules at a glance:

- **Types over interfaces**, no `any`, explicit return types on all non-trivial functions
- **Naming:** `camelCase` variables/functions, `PascalCase` components/types, `SCREAMING_SNAKE_CASE` constants, `kebab-case` files and folders
- **Booleans** prefixed with `is`, `has`, `can`, `should`
- **Named exports** for all components (except Next.js required default exports: `page.tsx`, `layout.tsx`, etc.)
- **`@/` path alias** always — never deep relative imports
- **Server Actions return `{ success, data/error }`** — never throw raw errors to the client
- **Tailwind only** — no inline `style={{}}`, use `cn()` for conditional classes
- **Positive values** → `text-green-600`, **negative** → `text-red-600`

---

## Key Conventions

### Next.js App Router
- Prefer **Server Components** by default; use `"use client"` only when browser APIs or interactivity is required.
- Data fetching happens in Server Components via Prisma directly — no REST API layer needed for internal reads.
- Mutations use **Server Actions** (not API routes) wherever possible.

### Financial Calculations
- All financial math lives in `src/lib/finance/`. Never inline calculations in components or API handlers.
- Monetary values are stored as `Decimal` (Prisma) / `number` in TypeScript. Use `toFixed(8)` precision for crypto, `toFixed(2)` for fiat.
- Currency conversion for display uses exchange rates stored as `Price` records with `asset.type = 'cash'`.
- TWR, XIRR, and FIFO functions must be pure (no side effects, no DB calls).

### Database
- All DB access goes through the Prisma client singleton at `src/lib/db.ts`.
- Never run raw SQL unless a Prisma query is genuinely insufficient.
- Always run `npx prisma generate` after modifying `schema.prisma`.
- Migrations live in `prisma/migrations/` — never edit them manually after they are applied.

### UI Components
- Use **shadcn/ui** components as the base. Customise via `className` and Tailwind — do not override component internals.
- Charts use **Recharts**. All chart components live in `src/components/charts/`.
- Positive financial values (gains) use `text-green-600`, negative (losses) use `text-red-600`.

### Environment & Secrets
- All secrets (DB credentials, etc.) go in `.env` only — never hardcoded.
- `.env.example` documents required variables without values.

---

## Development Commands

```bash
# Start full stack (app + db)
docker-compose up

# Run Next.js dev server only (requires local DB or tunnel)
npm run dev

# Prisma
npx prisma generate          # Regenerate client after schema change
npx prisma migrate dev       # Apply migrations in development
npx prisma studio            # Visual DB browser

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Finance Logic Reference

### FIFO Cost Basis
When a `sell` transaction is processed, deplete the oldest `buy` lots first. Track remaining quantity per lot. Realized gain = sell price − FIFO cost per unit.

### TWR (Time-Weighted Return)
```
TWR = (1 + r1) × (1 + r2) × ... × (1 + rn) − 1
```
Where each `r_i` is the sub-period return between cash flow events (transactions). Use `Snapshot` records as sub-period boundaries.

### MWR / XIRR
Treat all cash inflows (buys, fees) as negative cash flows and the terminal value as a positive cash flow. Solve for the IRR using Newton–Raphson iteration.

---

## Out of Scope for v1

Do not implement or suggest these — they are planned for v2:
- Automated price fetching from any external API
- Multi-user authentication
- Tax report generation
- Broker/exchange integrations
- Real estate / REIT asset type
