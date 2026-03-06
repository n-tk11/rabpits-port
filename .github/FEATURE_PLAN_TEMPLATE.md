# Feature Plan: [Feature Name]

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

## 3. Data Model Changes

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

## 4. Business Logic

> Core rules and calculations this feature must implement. Pure functions that live in `src/lib/finance/` or `src/lib/`.

- **Rule 1:** ...
- **Rule 2:** ...

### Edge cases to handle
- ...
- ...

---

## 5. Server Actions / API

> List the Server Actions (or API routes if external consumption is needed).

| Action | File | Description |
|---|---|---|
| `createTransaction` | `src/lib/actions/transactions.ts` | Creates a buy/sell record |

### Input validation
> What needs to be validated server-side (quantity > 0, asset exists in portfolio, etc.)

---

## 6. UI

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

## 7. Implementation Order

Ordered steps to implement without breaking existing functionality:

1. Prisma schema change → `npx prisma migrate dev`
2. Business logic functions (pure, no DB)
3. Server Actions (DB writes)
4. Server Component (data fetching)
5. Client Components / forms
6. Wire up page

---

## 8. Out of Scope

> What explicitly will NOT be done in this feature to avoid scope creep.

- ...

---

## 9. Open Questions

> Decisions not yet made. Resolve before or during implementation.

- [ ] ...
