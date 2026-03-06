# Project Progress

> **AI agents: Read this file BEFORE touching any code.**
> Update it when you start a task (`in_progress`) and when you finish (`done`).
> This is the single source of truth for project state — not git log, not memory.

---

## How to use this file

1. **On every session start:** Read the "Current Focus" section and the full status table.
2. **Before writing code:** Set the task status to `in_progress` and record the branch name.
3. **After completing a task:** Set status to `done`, clear the active branch, advance Current Focus to the next `todo` task.
4. **If blocked:** Set status to `blocked` and write the reason in the Notes column.
5. **Finding what's next:** Look for the first `todo` task whose dependencies are all `done` (see dependency graph in `docs/DEVELOPMENT_PLAN.md`).

---

## Current Focus

| Field              | Value                               |
| ------------------ | ----------------------------------- |
| **Active task ID** | p10-docker-prod                     |
| **Active branch**  | —                                   |
| **Status**         | Phase 9 complete — Phase 10 is next |
| **Last updated**   | 2026-03-06                          |

---

## Task Status

Legend: `todo` · `in_progress` · `done` · `blocked`

### Phase 0 — Project Scaffolding

| ID                 | Task                                                      | Status | Branch | Notes |
| ------------------ | --------------------------------------------------------- | ------ | ------ | ----- |
| p0-nextjs-init     | Initialize Next.js 14 + TypeScript + App Router           | done   | —      |       |
| p0-tailwind-shadcn | Setup Tailwind CSS + shadcn/ui + `cn()` utility           | done   | —      |       |
| p0-prisma-setup    | Install Prisma, connect PostgreSQL                        | done   | —      |       |
| p0-docker          | Docker Compose (app + db) + `.env.example`                | done   | —      |       |
| p0-eslint-prettier | ESLint + Prettier + import ordering + Husky pre-commit    | done   | —      |       |
| p0-vitest          | Vitest + Testing Library setup                            | done   | —      |       |
| p0-agent-browser   | Install agent-browser + Chromium + `e2e/` folder skeleton | done   | —      |       |
| p0-github-actions  | GitHub Actions CI: lint + typecheck + test on PR          | done   | —      |       |

### Phase 1 — Data Model

| ID        | Task                                                 | Status | Branch              | Notes |
| --------- | ---------------------------------------------------- | ------ | ------------------- | ----- |
| p1-schema | Full Prisma schema (all models, enums, relations)    | done   | chore/prisma-schema |       |
| p1-seed   | Dev seed script (portfolios + assets + transactions) | done   | chore/prisma-schema |       |

### Phase 2 — Portfolio Management

| ID                | Task                                                   | Status | Branch              | Notes |
| ----------------- | ------------------------------------------------------ | ------ | ------------------- | ----- |
| p2-portfolio-crud | Server Actions: create/update/delete portfolio         | done   | feat/portfolio/crud | PR #5 |
| p2-portfolio-list | Portfolio cards UI (name, base currency, created date) | done   | feat/portfolio/crud | PR #5 |

### Phase 3 — Asset Management

| ID            | Task                                         | Status | Branch          | Notes               |
| ------------- | -------------------------------------------- | ------ | --------------- | ------------------- |
| p3-asset-crud | Server Actions: create/update asset          | done   | feat/asset/crud | PR #5 (same branch) |
| p3-asset-list | Asset management screen + price history view | done   | feat/asset/crud | PR #5 (same branch) |

### Phase 4 — Transaction Engine

| ID             | Task                                                | Status | Branch                     | Notes                         |
| -------------- | --------------------------------------------------- | ------ | -------------------------- | ----------------------------- |
| p4-fifo        | Pure FIFO cost basis engine                         | done   | feat/finance/fifo          | PR #4 — all 8 spec cases pass |
| p4-buy-sell-tx | Buy + Sell transaction form + Server Actions        | done   | feat/transactions/buy-sell | Branch merged to main         |
| p4-convert-tx  | Convert transaction (two-leg) form + Server Actions | done   | feat/transactions/convert  | PR #11 — merged               |
| p4-fee-tx      | Fee transaction form + Server Actions               | done   | feat/transactions/fee      | PR #9 — merged                |
| p4-positions   | Position computation from ledger                    | done   | feat/finance/positions     | PR #8 — merged, 8 tests       |

### Phase 5 — Price Management & Snapshots

| ID              | Task                                                | Status | Branch                   | Notes                     |
| --------------- | --------------------------------------------------- | ------ | ------------------------ | ------------------------- |
| p5-snapshot     | Snapshot engine (auto-trigger on tx + price update) | done   | feat/finance/snapshot    | Merged to main 2026-03-06 |
| p5-price-update | Update Prices screen (bulk inline update)           | done   | feat/assets/price-update | Merged to main 2026-03-06 |

### Phase 6 — Performance Metrics

| ID                | Task                                        | Status | Branch                            | Notes                     |
| ----------------- | ------------------------------------------- | ------ | --------------------------------- | ------------------------- |
| p6-simple-return  | Simple return % calculation                 | done   | feat/finance/returns              | Merged to main 2026-03-06 |
| p6-twr            | TWR pure function                           | done   | feat/finance/twr (returns branch) | Merged to main 2026-03-06 |
| p6-xirr           | XIRR / MWR pure function (Newton-Raphson)   | done   | feat/finance/snapshot             | Merged to main 2026-03-06 |
| p6-annualized     | Annualized return from TWR/XIRR             | done   | feat/transactions/csv-export      | Merged to main 2026-03-06 |
| p6-performance-ui | Performance metrics panel + period selector | done   | feat/portfolio/performance-panel  | Merged to main 2026-03-06 |

### Phase 7 — Charts & Dashboard

| ID                  | Task                                      | Status | Branch                           | Notes                     |
| ------------------- | ----------------------------------------- | ------ | -------------------------------- | ------------------------- |
| p7-growth-chart     | NAV growth line chart (Recharts)          | done   | feat/portfolio/performance-panel | Merged to main 2026-03-06 |
| p7-allocation-chart | Asset allocation donut chart + table      | done   | feat/finance/snapshot            | Merged to main 2026-03-06 |
| p7-dashboard        | Dashboard assembly (all widgets combined) | done   | feat/dashboard/assembly          | Merged to main 2026-03-06 |

### Phase 8 — Transaction History

| ID            | Task                                             | Status | Branch                       | Notes                     |
| ------------- | ------------------------------------------------ | ------ | ---------------------------- | ------------------------- |
| p8-tx-history | Global transaction log with filters + pagination | done   | feat/transactions/history    | PR #10 — merged           |
| p8-csv-export | CSV download of filtered transactions            | done   | feat/transactions/csv-export | Merged to main 2026-03-06 |

### Phase 9 — UI & FX Improvements

| ID                    | Task                                                          | Status | Branch | Notes      |
| --------------------- | ------------------------------------------------------------- | ------ | ------ | ---------- |
| p9-nav-fix            | Logo → home `/`, add Dashboard nav link                       | done   | —      | 2026-03-06 |
| p9-portfolio-detail   | Portfolio detail page (dashboard + charts + tx table)         | done   | —      | 2026-03-06 |
| p9-fx-conversion      | FX rate field in transaction forms + auto CASH asset upsert   | done   | —      | 2026-03-06 |
| p9-tx-currency-labels | Currency abbreviation on Unit Price + Fee columns in tx table | done   | —      | 2026-03-06 |
| p9-dark-mode          | Dark mode toggle (next-themes, ThemeProvider, ThemeToggle)    | done   | —      | 2026-03-06 |

### Phase 10 — Production Readiness

| ID              | Task                                                                   | Status | Branch | Notes                       |
| --------------- | ---------------------------------------------------------------------- | ------ | ------ | --------------------------- |
| p10-docker-prod | Finalize Docker Compose (health checks, migration entrypoint, restart) | todo   | —      | Depends on: Phase 9         |
| p10-readme      | README with setup + first-run instructions                             | todo   | —      | Depends on: p10-docker-prod |

---

## Parallel work opportunities

Tasks that can run simultaneously (no dependency on each other):

- **After Phase 1:** `p2-portfolio-crud` + `p3-asset-crud` + `p4-fifo` — start all three at once
- **After p4-buy-sell-tx:** `p4-convert-tx` + `p4-fee-tx`
- **After p4-positions:** `p5-snapshot` + `p8-tx-history`
- **After p5-snapshot:** `p6-twr` + `p6-xirr` — fully independent of each other
