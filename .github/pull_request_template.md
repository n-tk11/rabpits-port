## Summary

> What does this PR do? Why is it needed? (1–3 sentences)

**PRD reference:** Section X.X  
**Feature plan:** link to the filled-out `.agent/FEATURE_PLAN_TEMPLATE.md`

---

## Type of change

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `chore` — tooling / config / dependencies
- [ ] `refactor` — code change with no behaviour change
- [ ] `docs` — documentation only
- [ ] `test` — tests only

---

## Acceptance Criteria

> Copy from the feature plan. Check each one off.

- [ ] ...
- [ ] ...
- [ ] ...

---

## Test Evidence

> Paste relevant test output. All tests must be green before merging.

```
✓ src/lib/finance/__tests__/fifo.test.ts (8 tests)
✓ src/lib/actions/__tests__/transactions.test.ts (5 tests)
```

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] Manual smoke test in Docker passes

---

## Screenshots / recordings

> For any UI change, include a before/after screenshot or short screen recording.

---

## Reviewer notes

> Anything the reviewer should pay special attention to. Known trade-offs. Deferred decisions.

---

## Merge checklist (author completes before requesting review)

- [ ] Tests written **before** implementation (TDD)
- [ ] Code review agent run — all flagged issues resolved
- [ ] No `any` types introduced
- [ ] No magic numbers — named constants used
- [ ] Financial calculations are pure functions in `src/lib/finance/`
- [ ] Server Actions return `ActionResult<T>` — no raw throws
- [ ] No secrets or credentials in code
- [ ] Branch is up to date with `main`
