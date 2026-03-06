# Development Plan: Rabbits Portfolio Tracker

Full product spec: [`PRD.md`](../PRD.md)  
Code conventions: [`.agent/CODE_STYLE.md`](CODE_STYLE.md)  
Feature plan template: [`.agent/FEATURE_PLAN_TEMPLATE.md`](FEATURE_PLAN_TEMPLATE.md)

---

## For AI Agents — Start Here

Before writing any code, read these files **in this order**:

1. [`PROGRESS.md`](PROGRESS.md) — **current task status and what to work on next** (read and update this every session)
2. [`PRD.md`](../PRD.md) — full product requirements and data model
3. [`.agent/AGENTS.md`](AGENTS.md) — stack, conventions, commit format, key rules
4. [`.agent/CODE_STYLE.md`](CODE_STYLE.md) — naming, typing, and component rules
5. [`.agent/FINANCE_TEST_SPECS.md`](FINANCE_TEST_SPECS.md) — pre-defined test cases (read-only — see below)
6. This file — phases, dependencies, and exit criteria

**`PROGRESS.md` is your memory between sessions.** Do not rely on `git log` to infer state — it is slow and ambiguous mid-feature. Instead:

- At session start: read `PROGRESS.md`, find your task, check the branch.
- Before coding: set the task to `in_progress` in `PROGRESS.md` and fill in the branch name.
- After merging: set the task to `done`, clear the branch, update "Current Focus" to the next `todo` task.

**Never modify `docs/FINANCE_TEST_SPECS.md`.** It is the source of truth for financial accuracy, verified against manual calculations and Excel. If an implementation cannot pass a spec test case, fix the implementation — not the spec. If you believe a spec value is genuinely wrong, stop and ask the user before proceeding.

**When a test fails:** Fix the implementation. Never change test expectations to make a test pass. The only exception is a demonstrably incorrect expected value in `FINANCE_TEST_SPECS.md` — in that case, do not edit the spec; flag it to the user.

---

## Development Workflow

Every feature — no matter how small — follows this loop. No exceptions.

```
┌─────────────────────────────────────────────────────────────────┐
│                     FEATURE DEVELOPMENT LOOP                    │
│                                                                 │
│  1. PLAN          Fill out FEATURE_PLAN_TEMPLATE.md             │
│       ↓           Define acceptance criteria before writing     │
│                   any code                                      │
│  2. TEST PLAN     Write test cases (what to test, not code yet) │
│       ↓           Cover: happy path, edge cases, error cases    │
│                                                                 │
│  3. BRANCH        git checkout -b feat/<scope>/<short-name>     │
│       ↓           Branch off main, never develop on main        │
│                                                                 │
│  4. TDD CYCLE  ┌─ Write failing test                           │
│       ↓        │  Implement minimum code to pass               │
│                │  Refactor                                      │
│                └─ Repeat until all acceptance criteria pass     │
│                                                                 │
│  5. VALIDATE      npx tsc --noEmit     (type check)            │
│       ↓           npm run lint         (ESLint)                 │
│                   npm run test         (Vitest)                 │
│                   docker-compose up    (manual smoke test)      │
│                   bash e2e/<name>.sh   (agent-browser UI test)  │
│                                                                 │
│  6. CODE REVIEW   Run code-review agent on branch diff          │
│       ↓           Fixes bugs, security issues, logic errors     │
│                   Style/formatting issues are NOT flagged        │
│                                                                 │
│  7. PR            Open PR → main via GitHub MCP                 │
│       ↓           PR description: what, why, screenshots        │
│                   CI must pass (lint + typecheck + tests)       │
│                                                                 │
│  8. MERGE         ⚠️  HUMAN ONLY — do not automate              │
│       ↓           Merge into main                               │
│                   Delete feature branch                         │
└─────────────────────────────────────────────────────────────────┘
```

### Branch naming

```
feat/<scope>/<short-name>     New feature
fix/<scope>/<short-name>      Bug fix
chore/<short-name>            Setup, tooling, config
refactor/<scope>/<short-name> Refactor without behaviour change
test/<scope>/<short-name>     Test-only changes
```

Examples: `feat/transactions/buy-sell-form`, `fix/finance/fifo-edge-case`, `chore/docker-compose`

### Commit convention

See [`.agent/AGENTS.md`](AGENTS.md). Format: `type(scope): summary`

### PR rules

- **Agent must open PRs using the GitHub MCP `create_pull_request` tool** — not `gh pr create` or any CLI fallback
- Title matches the commit convention format
- Body includes: what changed, why, acceptance criteria checklist
- CI (lint + typecheck + tests) must be green before merge
- Merge into main once CI passes — **must be done manually by a human, never automated**

---

## Testing Strategy

### What to test

| Layer          | Tool                     | What                                                                               |
| -------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| Finance logic  | Vitest (unit)            | FIFO, TWR, XIRR, position calc — pure functions, **100% branch coverage required** |
| Server Actions | Vitest + Prisma mock     | Happy path + validation errors + DB errors                                         |
| Components     | Vitest + Testing Library | Rendering, user interactions, form submission                                      |
| Integration    | Vitest + test DB         | Transaction flow end-to-end (buy → position → snapshot)                            |
| UI / E2E       | agent-browser            | Full user flows in the running Docker app (see below)                              |

### UI / E2E Tests — agent-browser

[`agent-browser`](https://github.com/vercel-labs/agent-browser) is a headless browser CLI from Vercel Labs designed for AI agents. It drives Chromium and exposes an accessibility-tree snapshot command (`agent-browser snapshot`) that is ideal for AI-authored assertions — no fragile CSS selectors.

**Setup (Phase 0):**

```bash
npm install --save-dev agent-browser
npx agent-browser install   # downloads Chromium
```

**Idiom for writing a UI test script** (`e2e/<name>.sh`):

```bash
#!/usr/bin/env bash
set -e

agent-browser open http://localhost:3000

# Use accessibility-tree refs for resilient assertions
SNAP=$(agent-browser snapshot)
echo "$SNAP" | grep -q "Portfolio" || (echo "FAIL: Portfolio heading not found" && exit 1)

agent-browser find role button click --name "Add Portfolio"
agent-browser find label "Name" fill "My Stocks"
agent-browser find label "Base Currency" fill "USD"
agent-browser find role button click --name "Save"

agent-browser wait --text "My Stocks"  # assert result visible
agent-browser screenshot e2e/screenshots/portfolio-created.png
agent-browser close
```

**E2E test file location:**

```
e2e/
  portfolio-create.sh
  transaction-buy-sell.sh
  transaction-convert.sh
  price-update.sh
  dashboard-overview.sh
```

**E2E tests are run against the live Docker stack.** The app must be up before running them:

```bash
docker-compose up -d
npx agent-browser install          # no-op if already installed
bash e2e/portfolio-create.sh
bash e2e/transaction-buy-sell.sh
# ...
```

**What each E2E script must verify (at minimum):**

| Script                    | Covers                                                                          |
| ------------------------- | ------------------------------------------------------------------------------- |
| `portfolio-create.sh`     | Create portfolio → appears in list → correct name + currency                    |
| `transaction-buy-sell.sh` | Buy 1 BTC → position shows quantity; Sell 0.5 BTC → position updates            |
| `transaction-convert.sh`  | Convert BTC → AAPL → both legs appear in transaction history                    |
| `price-update.sh`         | Update BTC price → portfolio value changes in header                            |
| `dashboard-overview.sh`   | Dashboard renders: total value, allocation donut, growth chart, portfolio cards |

**agent-browser tips for AI agents:**

- Always call `agent-browser snapshot` after a navigation or action to get current page refs — refs change on re-render.
- Use `agent-browser wait --text "..."` instead of arbitrary `sleep` delays.
- Use `agent-browser errors` after each flow to assert no uncaught JS exceptions.
- Prefer `find role` and `find label` over CSS selectors — they survive UI refactors.
- Save a screenshot at the end of every script for CI artifact upload.

### Finance test specifications

**All numerical test cases for finance functions are pre-defined in [`.agent/FINANCE_TEST_SPECS.md`](FINANCE_TEST_SPECS.md).**  
These must be implemented as tests **before** writing the finance functions (strict TDD).  
Tests include exact expected values verified against manual calculation and Excel.

### What NOT to test

- Prisma-generated types
- shadcn/ui internal behaviour
- Next.js routing

### Test file location

```
src/lib/finance/__tests__/fifo.test.ts
src/lib/finance/__tests__/twr.test.ts
src/lib/finance/__tests__/xirr.test.ts
src/lib/finance/__tests__/positions.test.ts
src/lib/finance/__tests__/annualized.test.ts
src/lib/actions/__tests__/transactions.test.ts
src/components/portfolio/__tests__/PortfolioCard.test.tsx
```

### Finance function TDD rule

For every function in `src/lib/finance/`:

1. Open `docs/FINANCE_TEST_SPECS.md` and find the relevant section
2. Write ALL test cases from the spec as failing tests
3. Only then write the implementation
4. Do not consider the function done until every spec case passes

To run a single test file during TDD (faster feedback loop):

```bash
npm run test -- src/lib/finance/__tests__/fifo.test.ts
```

---

## Phases & Features

### Phase 0 — Project Scaffolding

> Goal: A running Next.js app in Docker with all tooling configured. Zero features yet.

| ID                 | Task                                                      | Branch               |
| ------------------ | --------------------------------------------------------- | -------------------- |
| p0-nextjs-init     | Initialize Next.js 14 + TypeScript + App Router           | `chore/project-init` |
| p0-tailwind-shadcn | Setup Tailwind CSS + shadcn/ui + `cn()` utility           | `chore/project-init` |
| p0-prisma-setup    | Install Prisma, connect PostgreSQL                        | `chore/project-init` |
| p0-docker          | Docker Compose (app + db) + `.env.example`                | `chore/project-init` |
| p0-eslint-prettier | ESLint + Prettier + import ordering + Husky pre-commit    | `chore/project-init` |
| p0-vitest          | Vitest + Testing Library setup                            | `chore/project-init` |
| p0-agent-browser   | Install agent-browser + Chromium + `e2e/` folder skeleton | `chore/project-init` |
| p0-github-actions  | GitHub Actions CI: lint + typecheck + test on PR          | `chore/ci`           |

**Exit criteria:** `docker-compose up` starts the app on port 3000 with a blank page. CI passes on an empty test suite. `agent-browser open http://localhost:3000` loads the page without error.

---

### Phase 1 — Data Model

> Goal: Full Prisma schema, migrations, and seed data. No UI yet.

| ID        | Task                                                 | Branch                |
| --------- | ---------------------------------------------------- | --------------------- |
| p1-schema | Full Prisma schema (all models, enums, relations)    | `chore/prisma-schema` |
| p1-seed   | Dev seed script (portfolios + assets + transactions) | `chore/prisma-schema` |

**Schema models:** `Portfolio`, `Asset` (`AssetType` enum), `Transaction` (`TransactionType` enum), `Price`, `Snapshot`

**Exit criteria:** `npx prisma migrate dev` runs clean. `npx prisma studio` shows populated tables from seed.

---

### Phase 2 — Portfolio Management

> Goal: User can create, edit, delete portfolios and see them listed.

| ID                | Task                                                   | Branch                |
| ----------------- | ------------------------------------------------------ | --------------------- |
| p2-portfolio-crud | Server Actions: create/update/delete portfolio         | `feat/portfolio/crud` |
| p2-portfolio-list | Portfolio cards UI (name, base currency, created date) | `feat/portfolio/list` |

**Tests:** CRUD actions (happy path + validation), empty state rendering, card rendering.

**Exit criteria:** User can create a portfolio named "My Stocks" with base currency "USD" and see it on the page.

---

### Phase 3 — Asset Management

> Goal: User can define assets and view/edit them.

| ID            | Task                                         | Branch             |
| ------------- | -------------------------------------------- | ------------------ |
| p3-asset-crud | Server Actions: create/update asset          | `feat/assets/crud` |
| p3-asset-list | Asset management screen + price history view | `feat/assets/list` |

**Tests:** Asset creation validation (type required, ticker format), price history rendering.

**Exit criteria:** User can create a "BTC" crypto asset and an "AAPL" stock asset. Both appear in asset list with last known price "—".

---

### Phase 4 — Transaction Engine ⚠️ Most critical phase

> Goal: The core ledger. All financial accuracy lives here.

| ID             | Task                                                | Branch                       |
| -------------- | --------------------------------------------------- | ---------------------------- |
| p4-fifo        | Pure FIFO cost basis engine                         | `feat/finance/fifo`          |
| p4-buy-sell-tx | Buy + Sell transaction form + Server Actions        | `feat/transactions/buy-sell` |
| p4-convert-tx  | Convert transaction (two-leg) form + Server Actions | `feat/transactions/convert`  |
| p4-fee-tx      | Fee transaction form + Server Actions               | `feat/transactions/fee`      |
| p4-positions   | Position computation from ledger                    | `feat/finance/positions`     |

**FIFO engine tests (mandatory before any UI work):**

- Buy 10 @ $100, sell 3 → remaining 7, cost basis $100, realized gain $0 at $100
- Buy 5 @ $100, buy 5 @ $200, sell 8 → FIFO depletes oldest first, correct realized gain
- Sell more than available → throws `InsufficientQuantityError`
- Fractional quantities (0.00000001 BTC precision)
- Multiple assets in same portfolio don't cross-contaminate

**Position tests:**

- Position with no sells = total qty × avg buy price
- Position after partial sell = correct remaining qty + FIFO cost
- Multiple buys at different prices = correct FIFO basis

**Exit criteria:** User can buy 1 BTC @ $50,000, then sell 0.5 BTC @ $60,000. Position shows 0.5 BTC held, $5,000 realized gain displayed.

---

### Phase 5 — Price Management & Snapshots

> Goal: Prices can be updated manually. Portfolio NAV is recorded over time.

| ID              | Task                                                | Branch                      |
| --------------- | --------------------------------------------------- | --------------------------- |
| p5-snapshot     | Snapshot engine (auto-trigger on tx + price update) | `feat/snapshots/engine`     |
| p5-price-update | Update Prices screen (bulk inline update)           | `feat/prices/update-screen` |

**Snapshot tests:**

- Snapshot created on buy transaction
- Snapshot created on price update
- Snapshot value = sum of (qty × current price) for all positions, in base currency
- Two snapshots on same day with price update → both stored (timestamp-level precision)

**Exit criteria:** After updating BTC price from $50,000 to $55,000, a new snapshot is recorded and the portfolio value reflects the new price.

---

### Phase 6 — Performance Metrics

> Goal: Simple Return, TWR, XIRR, Annualized Return — all correct and tested.

| ID                | Task                                        | Branch                           |
| ----------------- | ------------------------------------------- | -------------------------------- |
| p6-simple-return  | Simple return % calculation                 | `feat/finance/simple-return`     |
| p6-twr            | TWR pure function                           | `feat/finance/twr`               |
| p6-xirr           | XIRR / MWR pure function (Newton-Raphson)   | `feat/finance/xirr`              |
| p6-annualized     | Annualized return from TWR/XIRR             | `feat/finance/annualized`        |
| p6-performance-ui | Performance metrics panel + period selector | `feat/performance/metrics-panel` |

**TWR tests:**

- No cash flows → simple period return
- Known 2-period example: r1=10%, r2=-5% → TWR = (1.1)(0.95) - 1 = 4.5%
- Single snapshot → TWR = 0%

**XIRR tests:**

- Single invest + exit: invest $1000, get back $1100 after 1 year → XIRR ≈ 10%
- Multiple cash flows with known XIRR (verify against Excel XIRR)
- All cash flows same sign → should throw or return null

**Exit criteria:** A portfolio with: buy $1000 on Jan 1, price grows to $1100 on Dec 31 shows Simple Return = 10%, TWR ≈ 10%, XIRR ≈ 10%.

---

### Phase 7 — Charts & Dashboard

> Goal: Visual overview of portfolio health.

| ID                  | Task                                      | Branch                    |
| ------------------- | ----------------------------------------- | ------------------------- |
| p7-growth-chart     | NAV growth line chart (Recharts)          | `feat/charts/growth`      |
| p7-allocation-chart | Asset allocation donut chart + table      | `feat/charts/allocation`  |
| p7-dashboard        | Dashboard assembly (all widgets combined) | `feat/dashboard/assembly` |

**Tests:** Chart components render without crashing with empty data, with single data point, with full data.

**Exit criteria:** Dashboard shows combined portfolio value, allocation donut, growth chart with period selector, and portfolio cards.

---

### Phase 8 — Transaction History

> Goal: Full auditable transaction log.

| ID            | Task                                             | Branch                         |
| ------------- | ------------------------------------------------ | ------------------------------ |
| p8-tx-history | Global transaction log with filters + pagination | `feat/history/transaction-log` |
| p8-csv-export | CSV download of filtered transactions            | `feat/history/csv-export`      |

**Exit criteria:** User can filter by portfolio + asset + type + date range and export results as CSV.

---

### Phase 9 — Portfolio Detail Page

> Goal: Deep-dive view for a single portfolio — all data in one place.

| ID                  | Task                                                          | Branch                       |
| ------------------- | ------------------------------------------------------------- | ---------------------------- |
| p9-portfolio-detail | Portfolio detail page (holdings + metrics + charts + history) | `feat/portfolio/detail-page` |

**Exit criteria:** Portfolio detail shows holdings table with FIFO cost basis, all 4 performance metrics, growth chart, allocation chart, and transaction history — all scoped to that portfolio.

---

### Phase 10 — Production Readiness

> Goal: One-command self-hosted deployment.

| ID              | Task                                                                   | Branch              |
| --------------- | ---------------------------------------------------------------------- | ------------------- |
| p10-docker-prod | Finalize Docker Compose (health checks, migration entrypoint, restart) | `chore/docker-prod` |
| p10-readme      | README with setup + first-run instructions                             | `docs/readme`       |

**Exit criteria:** Fresh `git clone` → `cp .env.example .env` → `docker-compose up` → working app at localhost:3000.

---

## Dependency Graph (simplified)

```
Phase 0 (Scaffolding)
    └── Phase 1 (Schema)
            ├── Phase 2 (Portfolio CRUD)   ─┐
            ├── Phase 3 (Asset CRUD)        ├─ PARALLEL: all three can run simultaneously
            └── Phase 4a (FIFO engine)     ─┘
                    │
                    ├── Phase 4b (Buy/Sell tx)  depends on Phase 3 + 4a
                    │       ├── Phase 4c (Convert tx)   ─┐ PARALLEL after 4b
                    │       └── Phase 4d (Fee tx)        ┘
                    │
                    ├── Phase 4e (Positions)    depends on 4a + 4b
                    │       └── Phase 5 (Prices + Snapshots)
                    │               └── Phase 6 (Performance Metrics)
                    │                       └── Phase 7 (Charts + Dashboard)
                    │
                    └── Phase 8 (Transaction History)  ─┐ PARALLEL with Phase 5–7
                                                         │
                    Phase 9 (Portfolio Detail) ──────────┘ needs 7 + 8
                            └── Phase 10 (Production)
```

### Explicit parallel work opportunities

**After Phase 1 (schema) is done — start all three in parallel:**

- `feat/portfolio/crud` (Phase 2)
- `feat/assets/crud` (Phase 3)
- `feat/finance/fifo` (Phase 4a — pure function, no DB needed)

**After Phase 4b (buy/sell) is done — start both in parallel:**

- `feat/transactions/convert` (Phase 4c)
- `feat/transactions/fee` (Phase 4d)

**After Phase 4e (positions) is done — start both in parallel:**

- `feat/snapshots/engine` (Phase 5) → leads to performance + charts
- `feat/history/transaction-log` (Phase 8) → leads to CSV export

**Phase 6 metrics can be split across parallel branches:**

- `feat/finance/twr` and `feat/finance/xirr` are fully independent of each other

---

## Definition of Done (per feature)

A feature is **done** when all of the following are true:

- [ ] All acceptance criteria in the feature plan are met
- [ ] All tests written and passing (`npm run test`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No lint errors (`npm run lint`)
- [ ] Manual smoke test in Docker passes
- [ ] E2E script in `e2e/` passes against the running Docker stack (`bash e2e/<name>.sh`)
- [ ] Code review agent run on branch diff — all flagged issues addressed
- [ ] PR is open with passing CI
- [ ] Code reviewed (self-review: run `git diff main...HEAD` and read every changed line before committing)
- [ ] Merged to main
- [ ] Feature branch deleted

---

## Quality Gates

These run automatically on every PR via GitHub Actions (`.github/workflows/ci.yml`).  
**No PR can be merged to `main` unless all jobs pass.**

```yaml
jobs:
  quality: # lint + typecheck + all tests (with test DB)
  finance-unit-tests: # finance logic tests run separately as a hard gate
  e2e: # docker-compose up → run all e2e/*.sh scripts → upload screenshots as artifacts
```

Configure branch protection on `main`:

> Settings → Branches → Add rule for `main`:
>
> - ✅ Require status checks to pass before merging
> - ✅ Require branches to be up to date before merging
> - Status checks required: `Lint, Typecheck & Test` + `Finance Logic Unit Tests (must pass)`
