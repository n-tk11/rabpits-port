# Development Plan: Rabbits Portfolio Tracker

Full product spec: [`PRD.md`](../PRD.md)  
Code conventions: [`docs/CODE_STYLE.md`](CODE_STYLE.md)  
Feature plan template: [`.github/FEATURE_PLAN_TEMPLATE.md`](../.github/FEATURE_PLAN_TEMPLATE.md)

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
│                                                                 │
│  6. PR            Open PR → main                                │
│       ↓           PR description: what, why, screenshots        │
│                   CI must pass (lint + typecheck + tests)       │
│                                                                 │
│  7. MERGE         Squash merge into main                        │
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
See [`AGENTS.md`](../AGENTS.md). Format: `type(scope): summary`

### PR rules
- Title matches the commit convention format
- Body includes: what changed, why, acceptance criteria checklist
- CI (lint + typecheck + tests) must be green before merge
- Squash merge — one commit per feature on main

---

## Testing Strategy

### What to test

| Layer | Tool | What |
|---|---|---|
| Finance logic | Vitest (unit) | FIFO, TWR, XIRR, position calc — pure functions, high coverage |
| Server Actions | Vitest + Prisma mock | Happy path + validation errors + DB errors |
| Components | Vitest + Testing Library | Rendering, user interactions, form submission |
| Integration | Vitest + test DB | Transaction flow end-to-end (buy → position → snapshot) |

### What NOT to test
- Prisma-generated types
- shadcn/ui internal behaviour
- Next.js routing

### Test file location
```
src/lib/finance/__tests__/fifo.test.ts
src/lib/finance/__tests__/twr.test.ts
src/lib/actions/__tests__/transactions.test.ts
src/components/portfolio/__tests__/PortfolioCard.test.tsx
```

### Finance calculation test requirements
Every finance function **must** have tests covering:
1. Known numerical result (manually verified)
2. Zero / empty input
3. Single transaction
4. Edge: sell more than available (should error)
5. Edge: fractional quantities (crypto precision)

---

## Phases & Features

### Phase 0 — Project Scaffolding
> Goal: A running Next.js app in Docker with all tooling configured. Zero features yet.

| ID | Task | Branch |
|---|---|---|
| p0-nextjs-init | Initialize Next.js 14 + TypeScript + App Router | `chore/project-init` |
| p0-tailwind-shadcn | Setup Tailwind CSS + shadcn/ui + `cn()` utility | `chore/project-init` |
| p0-prisma-setup | Install Prisma, connect PostgreSQL | `chore/project-init` |
| p0-docker | Docker Compose (app + db) + `.env.example` | `chore/project-init` |
| p0-eslint-prettier | ESLint + Prettier + import ordering + Husky pre-commit | `chore/project-init` |
| p0-vitest | Vitest + Testing Library setup | `chore/project-init` |
| p0-github-actions | GitHub Actions CI: lint + typecheck + test on PR | `chore/ci` |

**Exit criteria:** `docker-compose up` starts the app on port 3000 with a blank page. CI passes on an empty test suite.

---

### Phase 1 — Data Model
> Goal: Full Prisma schema, migrations, and seed data. No UI yet.

| ID | Task | Branch |
|---|---|---|
| p1-schema | Full Prisma schema (all models, enums, relations) | `chore/prisma-schema` |
| p1-seed | Dev seed script (portfolios + assets + transactions) | `chore/prisma-schema` |

**Schema models:** `Portfolio`, `Asset` (`AssetType` enum), `Transaction` (`TransactionType` enum), `Price`, `Snapshot`

**Exit criteria:** `npx prisma migrate dev` runs clean. `npx prisma studio` shows populated tables from seed.

---

### Phase 2 — Portfolio Management
> Goal: User can create, edit, delete portfolios and see them listed.

| ID | Task | Branch |
|---|---|---|
| p2-portfolio-crud | Server Actions: create/update/delete portfolio | `feat/portfolio/crud` |
| p2-portfolio-list | Portfolio cards UI (name, base currency, created date) | `feat/portfolio/list` |

**Tests:** CRUD actions (happy path + validation), empty state rendering, card rendering.

**Exit criteria:** User can create a portfolio named "My Stocks" with base currency "USD" and see it on the page.

---

### Phase 3 — Asset Management
> Goal: User can define assets and view/edit them.

| ID | Task | Branch |
|---|---|---|
| p3-asset-crud | Server Actions: create/update asset | `feat/assets/crud` |
| p3-asset-list | Asset management screen + price history view | `feat/assets/list` |

**Tests:** Asset creation validation (type required, ticker format), price history rendering.

**Exit criteria:** User can create a "BTC" crypto asset and an "AAPL" stock asset. Both appear in asset list with last known price "—".

---

### Phase 4 — Transaction Engine ⚠️ Most critical phase
> Goal: The core ledger. All financial accuracy lives here.

| ID | Task | Branch |
|---|---|---|
| p4-fifo | Pure FIFO cost basis engine | `feat/finance/fifo` |
| p4-buy-sell-tx | Buy + Sell transaction form + Server Actions | `feat/transactions/buy-sell` |
| p4-convert-tx | Convert transaction (two-leg) form + Server Actions | `feat/transactions/convert` |
| p4-fee-tx | Fee transaction form + Server Actions | `feat/transactions/fee` |
| p4-positions | Position computation from ledger | `feat/finance/positions` |

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

| ID | Task | Branch |
|---|---|---|
| p5-snapshot | Snapshot engine (auto-trigger on tx + price update) | `feat/snapshots/engine` |
| p5-price-update | Update Prices screen (bulk inline update) | `feat/prices/update-screen` |

**Snapshot tests:**
- Snapshot created on buy transaction
- Snapshot created on price update
- Snapshot value = sum of (qty × current price) for all positions, in base currency
- Two snapshots on same day with price update → both stored (timestamp-level precision)

**Exit criteria:** After updating BTC price from $50,000 to $55,000, a new snapshot is recorded and the portfolio value reflects the new price.

---

### Phase 6 — Performance Metrics
> Goal: Simple Return, TWR, XIRR, Annualized Return — all correct and tested.

| ID | Task | Branch |
|---|---|---|
| p6-simple-return | Simple return % calculation | `feat/finance/simple-return` |
| p6-twr | TWR pure function | `feat/finance/twr` |
| p6-xirr | XIRR / MWR pure function (Newton-Raphson) | `feat/finance/xirr` |
| p6-annualized | Annualized return from TWR/XIRR | `feat/finance/annualized` |
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

| ID | Task | Branch |
|---|---|---|
| p7-growth-chart | NAV growth line chart (Recharts) | `feat/charts/growth` |
| p7-allocation-chart | Asset allocation donut chart + table | `feat/charts/allocation` |
| p7-dashboard | Dashboard assembly (all widgets combined) | `feat/dashboard/assembly` |

**Tests:** Chart components render without crashing with empty data, with single data point, with full data.

**Exit criteria:** Dashboard shows combined portfolio value, allocation donut, growth chart with period selector, and portfolio cards.

---

### Phase 8 — Transaction History
> Goal: Full auditable transaction log.

| ID | Task | Branch |
|---|---|---|
| p8-tx-history | Global transaction log with filters + pagination | `feat/history/transaction-log` |
| p8-csv-export | CSV download of filtered transactions | `feat/history/csv-export` |

**Exit criteria:** User can filter by portfolio + asset + type + date range and export results as CSV.

---

### Phase 9 — Portfolio Detail Page
> Goal: Deep-dive view for a single portfolio — all data in one place.

| ID | Task | Branch |
|---|---|---|
| p9-portfolio-detail | Portfolio detail page (holdings + metrics + charts + history) | `feat/portfolio/detail-page` |

**Exit criteria:** Portfolio detail shows holdings table with FIFO cost basis, all 4 performance metrics, growth chart, allocation chart, and transaction history — all scoped to that portfolio.

---

### Phase 10 — Production Readiness
> Goal: One-command self-hosted deployment.

| ID | Task | Branch |
|---|---|---|
| p10-docker-prod | Finalize Docker Compose (health checks, migration entrypoint, restart) | `chore/docker-prod` |
| p10-readme | README with setup + first-run instructions | `docs/readme` |

**Exit criteria:** Fresh `git clone` → `cp .env.example .env` → `docker-compose up` → working app at localhost:3000.

---

## Dependency Graph (simplified)

```
Phase 0 (Scaffolding)
    └── Phase 1 (Schema)
            ├── Phase 2 (Portfolio CRUD)
            ├── Phase 3 (Asset CRUD)
            └── Phase 4 (Transaction Engine)  ← most critical
                    ├── Phase 5 (Prices + Snapshots)
                    │       └── Phase 6 (Performance Metrics)
                    │               └── Phase 7 (Charts + Dashboard)
                    └── Phase 8 (Transaction History)
                            └── Phase 9 (Portfolio Detail)
                                    └── Phase 10 (Production)
```

Phases 2, 3, and 4 can be developed in parallel once Phase 1 is complete.

---

## Definition of Done (per feature)

A feature is **done** when all of the following are true:

- [ ] All acceptance criteria in the feature plan are met
- [ ] All tests written and passing (`npm run test`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No lint errors (`npm run lint`)
- [ ] Manual smoke test in Docker passes
- [ ] PR is open with passing CI
- [ ] Code reviewed (self-review at minimum: read the diff fresh)
- [ ] Squash-merged to main
- [ ] Feature branch deleted

---

## Quality Gates

These run automatically on every PR via GitHub Actions:

```yaml
jobs:
  quality:
    steps:
      - npm run lint          # ESLint
      - npx tsc --noEmit      # Type check
      - npm run test          # Vitest
```

No PR merges to main unless all three pass.
