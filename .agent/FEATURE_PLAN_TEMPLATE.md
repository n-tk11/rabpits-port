# Feature Plan: [Feature Name]

> ⚠️ **TDD Requirement:** Sections 1–5 (through Test Plan) must be completed and reviewed **before writing any implementation code**. Tests are written first. Code is written to make tests pass.

## 1. Overview

> One paragraph describing what this feature does and why it exists. Reference the relevant section in PRD.md if applicable.

**PRD reference:** Section X.X  
**Goal:** [What problem does this solve for the user?]

---

## 2. Acceptance Criteria

The feature is complete when:

- [ ] ...
- [ ] ...
- [ ] ...

---

## 3. Test Plan

> Write this before any code. For each function/action/component, list the test cases. See `docs/FINANCE_TEST_SPECS.md` for required cases on finance functions.

### Unit tests (pure functions)

| Function | File | Cases to test |
|---|---|---|
| `calculateFIFO` | `src/lib/finance/__tests__/fifo.test.ts` | happy path, edge: zero qty, edge: oversell |

### Server Action tests

| Action | Cases to test |
|---|---|
| `createTransaction` | valid input, quantity ≤ 0 rejected, asset not in portfolio rejected, DB error returns `{ success: false }` |

### Component tests

| Component | Cases to test |
|---|---|
| `TransactionForm` | renders, submits valid data, shows error on invalid input, disabled while submitting |

### Manual smoke test checklist

- [ ] ...
- [ ] ...

---

## 4. Data Model Changes

> List any new or modified Prisma models, fields, or relations. If no DB changes, write "None."

### New models
```prisma
// paste schema here
```

### Modified models
| Model | Field | Change |
|---|---|---|
| `Transaction` | `conversion_id` | Add nullable UUID |

## 4. Data Model Changes

> List any new or modified Prisma models, fields, or relations. If no DB changes, write "None."

### New models
```prisma
// paste schema here
```

### Modified models
| Model | Field | Change |
|---|---|---|
| `Transaction` | `conversion_id` | Add nullable UUID |

### Migration notes
> Any data migration concerns, index needs, or seeding required.

---

## 5. Business Logic

> Core rules and calculations this feature must implement. Pure functions that live in `src/lib/finance/` or `src/lib/`.

- **Rule 1:** ...
- **Rule 2:** ...

### Edge cases to handle
- ...
- ...

---

## 6. Server Actions / API

> List the Server Actions (or API routes if external consumption is needed).

| Action | File | Description |
|---|---|---|
| `createTransaction` | `src/lib/actions/transactions.ts` | Creates a buy/sell record |

### Input validation
> What needs to be validated server-side (quantity > 0, asset exists in portfolio, etc.)

---

## 7. UI

### Pages / Routes affected
| Route | Change |
|---|---|
| `/portfolios/[id]` | Add transaction table |

### New components needed
| Component | Location | Description |
|---|---|---|
| `TransactionForm` | `src/components/transactions/` | Modal form for buy/sell/convert |

### UX notes
> Loading states, optimistic updates, error messages, empty states.

---

## 8. Implementation Order

> Follow TDD: write the test first, then write the minimum code to make it pass, then refactor.

1. ✍️ **Write all tests** from Section 3 (they will all fail — that's expected)
2. Prisma schema change → `npx prisma generate && npx prisma migrate dev`
3. Implement pure business logic functions → run tests until passing
4. Implement Server Actions → run tests until passing
5. Implement Server Components (data fetching)
6. Implement Client Components / forms → run component tests until passing
7. Wire up page end-to-end
8. Run full suite: `npx tsc --noEmit && npm run lint && npm run test`
9. Manual smoke test in Docker (checklist from Section 3)

---

## 9. Out of Scope

> What explicitly will NOT be done in this feature to avoid scope creep.

- ...

---

## 10. Open Questions

> Decisions not yet made. Resolve before or during implementation.

- [ ] ...
