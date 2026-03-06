# Code Style & Conventions

This document defines the coding standards for this project. All code — human or AI-generated — must follow these rules so the codebase looks and behaves consistently.

---

## 1. Language & Typing

### Always use TypeScript strict mode
```ts
// tsconfig.json has strict: true — never disable it
```

### Prefer `type` over `interface`
```ts
// ✅
type Portfolio = {
  id: string
  name: string
  baseCurrency: string
}

// ❌ avoid interface unless extending third-party types
interface Portfolio { ... }
```

### No `any` — use `unknown` or a proper type
```ts
// ✅
function parseValue(input: unknown): number { ... }

// ❌
function parseValue(input: any): number { ... }
```

### Explicit return types on all functions except trivial one-liners
```ts
// ✅
async function getPortfolio(id: string): Promise<Portfolio | null> { ... }

// ✅ trivial one-liner — return type is obvious
const double = (n: number) => n * 2
```

### Use `Decimal` from Prisma/decimal.js for monetary values — never `float`
```ts
import { Decimal } from '@prisma/client/runtime/client'
```

---

## 2. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Variables | `camelCase` | `portfolioValue` |
| Functions | `camelCase` | `calculateTWR` |
| React components | `PascalCase` | `PortfolioCard` |
| Types / type aliases | `PascalCase` | `TransactionType` |
| Enums | `PascalCase` + `SCREAMING_SNAKE` values | `AssetType.STOCK_ETF` |
| Constants (module-level) | `SCREAMING_SNAKE_CASE` | `MAX_PORTFOLIOS` |
| Files (components) | `PascalCase` | `PortfolioCard.tsx` |
| Files (non-component) | `kebab-case` | `calculate-twr.ts` |
| Folders | `kebab-case` | `portfolio-detail/` |
| Prisma models | `PascalCase` | `Transaction` |
| Prisma fields | `camelCase` | `baseCurrency` |
| DB columns (via Prisma map) | `snake_case` | `@@map("base_currency")` |
| Server Actions | `camelCase` verb-noun | `createTransaction`, `updateAssetPrice` |
| Route segments | `kebab-case` | `/portfolios/[id]/transactions` |

### Boolean variables — always prefix with `is`, `has`, `can`, `should`
```ts
// ✅
const isLoading = true
const hasTransactions = list.length > 0

// ❌
const loading = true
const transactions = list.length > 0
```

### Avoid abbreviations except well-known finance terms
```ts
// ✅ well-known
const twr = calculateTWR(snapshots)
const xirr = calculateXIRR(cashFlows)
const nav = portfolio.totalValue

// ❌ cryptic
const p = getPortfolio(id)
const v = quantity * price
```

---

## 3. File & Folder Structure

```
src/
├── app/                        # Next.js App Router — pages only, minimal logic
│   └── portfolios/[id]/
│       ├── page.tsx            # Server Component — fetch + render
│       └── loading.tsx         # Skeleton/loading state
├── components/
│   ├── ui/                     # shadcn/ui primitives (auto-generated, don't edit)
│   ├── charts/                 # Recharts wrappers
│   ├── portfolio/              # Feature-specific components
│   └── shared/                 # Truly reusable components (not feature-specific)
├── lib/
│   ├── actions/                # Server Actions grouped by domain
│   ├── finance/                # Pure financial calculation functions
│   ├── db.ts                   # Prisma client singleton
│   └── utils.ts                # Generic helpers (cn, formatCurrency, etc.)
└── types/
    └── index.ts                # Shared app-level types
```

### One component per file — filename matches component name
```
PortfolioCard.tsx  →  export function PortfolioCard() { ... }
```

---

## 4. Component Conventions

### Server Component by default — opt into client only when needed
```tsx
// ✅ No directive = Server Component
export default async function PortfolioPage({ params }: { params: { id: string } }) {
  const portfolio = await getPortfolioById(params.id)
  return <PortfolioDetail portfolio={portfolio} />
}
```

```tsx
// ✅ Client Component — only when hooks/events/browser APIs required
'use client'

export function PriceInput({ onSave }: PriceInputProps) { ... }
```

### Props type defined inline with the component (not exported unless reused)
```tsx
// ✅
type PortfolioCardProps = {
  portfolio: Portfolio
  showActions?: boolean
}

export function PortfolioCard({ portfolio, showActions = false }: PortfolioCardProps) { ... }
```

### No default exports for components — always named exports
```tsx
// ✅
export function PortfolioCard() { ... }

// ❌
export default function PortfolioCard() { ... }
```
> Exception: Next.js `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` — these **must** use default exports (framework requirement).

---

## 5. Functions

### Prefer `async/await` over `.then()` chains
```ts
// ✅
const portfolio = await prisma.portfolio.findUnique({ where: { id } })

// ❌
prisma.portfolio.findUnique({ where: { id } }).then(p => ...)
```

### Early return over nested conditionals
```ts
// ✅
async function getPosition(portfolioId: string, assetId: string): Promise<Position | null> {
  if (!portfolioId) return null
  if (!assetId) return null
  return computePosition(portfolioId, assetId)
}

// ❌
async function getPosition(portfolioId: string, assetId: string) {
  if (portfolioId) {
    if (assetId) {
      return computePosition(portfolioId, assetId)
    }
  }
}
```

### Pure functions for all financial calculations
```ts
// ✅ — no DB calls, no side effects, easily testable
function calculateFIFOCostBasis(lots: Lot[], sellQuantity: number): Decimal { ... }
```

---

## 6. Imports

### Order (enforced by ESLint import plugin)
1. Node built-ins (`path`, `fs`)
2. External packages (`react`, `next`, `prisma`)
3. Internal aliases (`@/lib/...`, `@/components/...`)
4. Relative imports (`./PortfolioCard`)

```ts
// ✅
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { calculateTWR } from '@/lib/finance/twr'
import { PortfolioCard } from './PortfolioCard'
```

### Use `@/` path alias — never deep relative paths
```ts
// ✅
import { formatCurrency } from '@/lib/utils'

// ❌
import { formatCurrency } from '../../../lib/utils'
```

---

## 7. Error Handling

### Server Actions return a typed result object — never throw to the client
```ts
type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function createTransaction(input: TransactionInput): Promise<ActionResult<Transaction>> {
  try {
    const tx = await prisma.transaction.create({ data: input })
    return { success: true, data: tx }
  } catch (e) {
    console.error(e)
    return { success: false, error: 'Failed to create transaction' }
  }
}
```

### Never expose raw Prisma/DB errors to the UI
```ts
// ✅
return { success: false, error: 'Failed to save. Please try again.' }

// ❌
return { success: false, error: e.message }  // may expose internals
```

---

## 8. Tailwind & Styling

### Use `cn()` helper (from `@/lib/utils`) to merge conditional classes
```tsx
import { cn } from '@/lib/utils'

<div className={cn('text-sm font-medium', isNegative && 'text-red-600', isPositive && 'text-green-600')} />
```

### Financial value colours — always use these tokens
| Meaning | Class |
|---|---|
| Positive / gain | `text-green-600` |
| Negative / loss | `text-red-600` |
| Neutral / zero | `text-muted-foreground` |

### No inline `style={{}}` — Tailwind classes only
```tsx
// ✅
<div className="flex items-center gap-2 p-4" />

// ❌
<div style={{ display: 'flex', gap: '8px' }} />
```

---

## 9. Prisma Conventions

### Always use the singleton client
```ts
// src/lib/db.ts
import { PrismaClient } from '@prisma/client'
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Select only the fields you need
```ts
// ✅
await prisma.portfolio.findMany({ select: { id: true, name: true, baseCurrency: true } })

// ❌ — don't fetch everything if you only need 3 fields
await prisma.portfolio.findMany()
```

### Run `npx prisma generate` after every schema change before writing any code that uses new fields.

---

## 10. Constants & Enums

### Domain enums live in `src/types/index.ts`
```ts
export enum AssetType {
  STOCK_ETF = 'STOCK_ETF',
  CRYPTO = 'CRYPTO',
  CASH = 'CASH',
  BOND = 'BOND',
  COMMODITY = 'COMMODITY',
  MUTUAL_FUND = 'MUTUAL_FUND',
}

export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  CONVERT = 'CONVERT',
  FEE = 'FEE',
  PRICE_ADJUST = 'PRICE_ADJUST',
}
```

### Magic numbers go in named constants
```ts
// ✅
const CRYPTO_DECIMAL_PLACES = 8
const FIAT_DECIMAL_PLACES = 2

// ❌
value.toFixed(8)
```
