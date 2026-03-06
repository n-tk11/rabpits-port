# Finance Test Specifications

All functions in `src/lib/finance/` **must** have tests covering every case in this document before any UI or Server Action code is written. These are the ground truth for financial accuracy.

Test file location: `src/lib/finance/__tests__/`

---

## 1. FIFO Cost Basis (`fifo.ts`)

### Types
```ts
type Lot = { quantity: Decimal; unitPrice: Decimal; date: Date }
type FIFOResult = {
  remainingLots: Lot[]
  realizedGain: Decimal
  costBasisSold: Decimal
}
```

### Function signature
```ts
function applyFIFOSell(lots: Lot[], sellQuantity: Decimal, sellPrice: Decimal): FIFOResult
```

---

### Test cases

#### Case 1 — Simple sell, no gain
```
Buy:  10 units @ $100  (lot 1)
Sell:  3 units @ $100

Expected:
  remainingLots:   [{ qty: 7, price: $100 }]
  costBasisSold:   $300   (3 × $100)
  realizedGain:    $0     ($300 - $300)
```

#### Case 2 — Simple sell with gain
```
Buy:  10 units @ $100  (lot 1)
Sell:  5 units @ $150

Expected:
  remainingLots:   [{ qty: 5, price: $100 }]
  costBasisSold:   $500   (5 × $100)
  realizedGain:    $250   ($750 - $500)
```

#### Case 3 — FIFO across multiple lots
```
Buy:  5 units @ $100  (lot 1, oldest)
Buy:  5 units @ $200  (lot 2, newer)
Sell: 8 units @ $250

FIFO depletes lot 1 first (5 units), then 3 units from lot 2.
  costBasisSold:   (5 × $100) + (3 × $200) = $1,100
  realizedGain:    (8 × $250) - $1,100 = $2,000 - $1,100 = $900
  remainingLots:   [{ qty: 2, price: $200 }]
```

#### Case 4 — Sell exact total quantity (close position)
```
Buy:  3 units @ $100  (lot 1)
Buy:  3 units @ $150  (lot 2)
Sell: 6 units @ $200

  costBasisSold:   (3 × $100) + (3 × $150) = $750
  realizedGain:    (6 × $200) - $750 = $1,200 - $750 = $450
  remainingLots:   []
```

#### Case 5 — Sell more than available (error case)
```
Buy:  5 units @ $100
Sell: 10 units @ $150  ← exceeds holding

Expected: throws InsufficientQuantityError
```

#### Case 6 — Fractional quantities (crypto precision)
```
Buy:  1.00000000 BTC @ $50,000.00
Sell: 0.00000001 BTC @ $60,000.00  (1 satoshi)

  costBasisSold:   $0.00050000   (0.00000001 × $50,000)
  realizedGain:    $0.00010000   ($0.00060000 - $0.00050000)
  remainingLots:   [{ qty: 0.99999999, price: $50,000 }]
```
> Must use `Decimal` arithmetic — floating point would give wrong answer here.

#### Case 7 — Sell from many lots (performance / correctness)
```
20 lots of 1 unit each, prices $1 through $20
Sell: 15 units @ $25

FIFO depletes lots 1–15 (prices $1–$15)
  costBasisSold:   $1+$2+...+$15 = $120
  realizedGain:    (15 × $25) - $120 = $375 - $120 = $255
  remainingLots:   5 lots (prices $16–$20)
```

#### Case 8 — Empty lots (no position exists)
```
lots: []
Sell: 1 unit

Expected: throws InsufficientQuantityError
```

---

## 2. Position Computation (`positions.ts`)

### Function signature
```ts
function computePosition(transactions: Transaction[]): Position

type Position = {
  assetId: string
  quantity: Decimal
  averageCostBasis: Decimal   // FIFO weighted average of remaining lots
  totalCostBasis: Decimal     // sum of remaining lot costs
  realizedGain: Decimal       // cumulative from all sells
}
```

### Test cases

#### Case 1 — Single buy, no sell
```
Buy: 10 units @ $100

  quantity:         10
  totalCostBasis:   $1,000
  averageCostBasis: $100
  realizedGain:     $0
```

#### Case 2 — Buy then partial sell
```
Buy:  10 units @ $100
Sell:  4 units @ $150

  quantity:         6
  totalCostBasis:   $600    (6 × $100 remaining)
  averageCostBasis: $100
  realizedGain:     $200    (4×$150 - 4×$100)
```

#### Case 3 — Multiple buys at different prices, partial sell
```
Buy:  5 units @ $100
Buy:  5 units @ $300
Sell: 3 units @ $200

FIFO: sell from lot 1 ($100 each)
  quantity:         7
  totalCostBasis:   (2 × $100) + (5 × $300) = $1,700
  averageCostBasis: $1,700 / 7 ≈ $242.857...
  realizedGain:     (3 × $200) - (3 × $100) = $300
```

#### Case 4 — No transactions
```
transactions: []

  quantity:         0
  totalCostBasis:   $0
  averageCostBasis: $0
  realizedGain:     $0
```

---

## 3. TWR — Time-Weighted Return (`twr.ts`)

### Function signature
```ts
function calculateTWR(snapshots: { date: Date; value: Decimal }[], cashFlows: { date: Date; amount: Decimal }[]): Decimal
```

> TWR = ∏(1 + r_i) - 1 across all sub-periods between cash flows.

### Test cases

#### Case 1 — No cash flows, simple growth
```
Snapshot 1: Jan 1  → $1,000
Snapshot 2: Dec 31 → $1,100
Cash flows: none

Sub-period return: ($1,100 - $1,000) / $1,000 = 10%
TWR = 10%
```

#### Case 2 — Two periods, known result
```
Period 1: start $1,000 → end $1,100  (r1 = 10%)
Cash flow: +$500 deposited
Period 2: start $1,600 → end $1,520  (r2 = -5%)

TWR = (1.10)(0.95) - 1 = 1.045 - 1 = 4.5%
```

#### Case 3 — Cash flow timing does NOT affect TWR
```
Scenario A: invest $1,000 on Jan 1, +$9,000 on Dec 30, end value $10,100
Scenario B: invest $1,000 on Jan 1, end value $1,100 (no additional deposit)

Both should produce TWR = 10% (cash flow timing is eliminated)
```

#### Case 4 — Single snapshot (no period)
```
snapshots: [{ date: Jan 1, value: $1,000 }]
cashFlows: []

TWR = 0%
```

#### Case 5 — Flat portfolio (no growth)
```
Snapshot 1: $1,000
Snapshot 2: $1,000

TWR = 0%
```

#### Case 6 — Negative return
```
Snapshot 1: $1,000
Snapshot 2: $800

TWR = -20%
```

---

## 4. XIRR — Money-Weighted Return (`xirr.ts`)

### Function signature
```ts
type CashFlow = { date: Date; amount: Decimal }
// Convention: investments (outflows) are NEGATIVE, terminal value is POSITIVE

function calculateXIRR(cashFlows: CashFlow[]): Decimal  // returns annualized rate
```

> XIRR solves: ∑ CF_i / (1 + r)^(t_i/365) = 0

### Test cases

#### Case 1 — Simple 1-year investment, 10% return
```
Cash flows:
  Jan 1  Year 0: -$1,000   (invest)
  Jan 1  Year 1: +$1,100   (terminal value)

Expected XIRR ≈ 10.00%
Tolerance: ±0.01%
```

#### Case 2 — Simple 1-year investment, verified against Excel
```
Cash flows:
  2020-01-01: -$10,000
  2020-07-01: -$5,000
  2021-01-01: +$16,000

Excel XIRR result: ≈ 9.08%
Expected: within ±0.01% of 9.08%
```

#### Case 3 — Short holding period (< 1 year)
```
Cash flows:
  Jan 1:  -$1,000
  Jul 1:  +$1,050   (6-month hold, ~10% annualized)

Expected XIRR ≈ 10.25% (annualized from 5% in 6 months)
Tolerance: ±0.1%
```

#### Case 4 — Loss scenario
```
Cash flows:
  Jan 1 Year 0: -$1,000
  Jan 1 Year 1: +$900

Expected XIRR ≈ -10.00%
```

#### Case 5 — Multiple buys, single exit
```
Cash flows:
  2020-01-01: -$1,000
  2020-04-01: -$1,000
  2020-07-01: -$1,000
  2021-01-01: +$3,600

Expected XIRR: positive (total returned > invested)
Verify: within ±0.1% of Excel result
```

#### Case 6 — No positive cash flow (convergence guard)
```
Cash flows: [-$1,000, -$500]   (all outflows, no terminal value)

Expected: throws XirrConvergenceError or returns null
```

#### Case 7 — Newton-Raphson convergence (max iterations)
```
If algorithm does not converge within 100 iterations, throw XirrConvergenceError
rather than returning a garbage value.
```

---

## 5. Annualized Return (`annualized.ts`)

### Function signature
```ts
function annualizeReturn(totalReturn: Decimal, years: Decimal): Decimal
```

> Formula: (1 + r)^(1/years) - 1

### Test cases

#### Case 1 — Exactly 1 year
```
totalReturn: 10%, years: 1
Expected: 10%
```

#### Case 2 — 2 years
```
totalReturn: 21%, years: 2
Expected: (1.21)^(0.5) - 1 = 10%
```

#### Case 3 — Less than 1 year
```
totalReturn: 5%, years: 0.5
Expected: (1.05)^(1/0.5) - 1 = (1.05)^2 - 1 = 10.25%
```

#### Case 4 — Negative return
```
totalReturn: -19%, years: 2
Expected: (0.81)^(0.5) - 1 = -10%
```

#### Case 5 — Zero years (guard)
```
years: 0
Expected: throws DivisionByZeroError
```

---

## Running finance tests only

```bash
# Run just the finance logic suite (fast, no DB needed)
npm run test src/lib/finance

# Run a single test file
npm run test src/lib/finance/__tests__/fifo.test.ts

# Run with coverage
npm run test -- --coverage src/lib/finance
```

All finance tests must achieve **100% branch coverage** — no exceptions.
