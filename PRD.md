# PRD: Self-Hosted Personal Financial Portfolio Tracker

## 1. Overview

A self-hosted web application that allows an individual to track their personal financial portfolios across multiple asset types. The user can manually manage transactions (add assets, convert between asset types, adjust unit prices), view current holdings, and analyze portfolio performance over time — both historically and in real-time.

This is a **v1 product** focused on manual data entry. Future versions will integrate third-party price APIs for automatic price updates.

---

## 2. Goals

- Give an individual full ownership and privacy of their financial data (self-hosted).
- Support multiple portfolios with independent base currencies.
- Track a diverse set of asset types under a unified interface.
- Provide meaningful performance and growth metrics (simple return, TWR, MWR/XIRR).
- Enable easy manual management of transactions and price adjustments.

## 3. Non-Goals (v1)

- Automated price feeds from external APIs (planned for v2).
- Multi-user / multi-account support.
- Tax report generation.
- Mobile native app.
- Real estate / REIT asset type.
- Broker or exchange integration.
- Rebalancing recommendations.

---

## 4. Users

Single user — the owner of the self-hosted instance. No login/authentication is required in v1 (protected by network access control at the hosting level).

---

## 5. Asset Types

| Asset Type      | Identifier          | Unit           | Notes                              |
|-----------------|---------------------|----------------|------------------------------------|
| Stock / ETF     | Ticker symbol       | Shares         | e.g., AAPL, VOO                    |
| Cryptocurrency  | Symbol / Coin ID    | Coins/tokens   | e.g., BTC, ETH                     |
| Cash / Fiat     | Currency code (ISO) | Amount         | e.g., USD, EUR, THB                |
| Bond / Fixed Income | ISIN or name   | Units / Face   | Coupon rate, maturity date optional|
| Commodity       | Name / symbol       | Oz / grams / units | e.g., Gold (oz), Silver (oz)   |
| Mutual Fund     | Fund code / name    | Units/NAV      | e.g., local fund codes             |

Each asset has:
- Name
- Type (from above)
- Ticker / Symbol / Identifier
- Currency (the currency this asset is priced in)
- Current unit price (manually set)
- Notes (optional)

---

## 6. Portfolio

A **Portfolio** is a named collection of holdings.

**Portfolio attributes:**
- Name (e.g., "Retirement", "Crypto Bag", "Main Brokerage")
- Description (optional)
- Base currency (user-selected; e.g., USD, THB)
- Created date

A user can have **multiple portfolios**. Assets can be held in different portfolios independently (same asset in two portfolios is treated as separate positions).

---

## 7. Transactions

All changes to holdings are driven by transactions. The following transaction types are supported in v1:

| Type              | Description                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| **Buy / Add**     | Add units of an asset to a portfolio (e.g., buy 1 BTC, deposit 500 USD)    |
| **Sell / Remove** | Remove units of an asset from a portfolio (e.g., sell shares, withdraw cash)|
| **Convert**       | Sell one asset and use the proceeds to buy another within the same portfolio (e.g., sell BTC → USD → buy AAPL) |
| **Price Adjust**  | Manually update the current unit price of an asset (does not affect quantity) |
| **Fee**           | Record a fee or cost associated with a portfolio (reduces cash or NAV)      |

**Transaction fields (Buy/Sell/Convert):**
- Date & time
- Transaction type
- Asset(s) involved
- Quantity (units)
- Unit price at transaction time
- Fee (optional, in portfolio base currency)
- Notes (optional)

**Cost Basis Method:** FIFO (First In, First Out) applied globally.

### 7.1 Convert Transaction Detail

A Convert transaction is modeled as two linked sub-transactions:
1. **Sell leg**: Remove N units of Asset A at price P_a → produces cash value V
2. **Buy leg**: Purchase M units of Asset B at price P_b using value V

The two legs are stored together with a shared `conversion_id`. Fees may be applied to the conversion.

---

## 8. Holdings & Positions

A **Position** is the current state of an asset within a portfolio:

- Asset reference
- Total quantity held
- Average cost basis (derived from FIFO lots)
- Current unit price (manually set)
- Current market value = quantity × current unit price (converted to base currency)
- Unrealized gain/loss = current market value − total cost basis
- Unrealized return % = unrealized gain / total cost basis × 100

Positions are computed from the transaction ledger (not stored directly).

---

## 9. Price Management

In v1, all prices are **manually maintained** by the user.

- When a Buy/Sell transaction is entered, the user inputs the unit price at that time.
- The user can also perform a **Price Adjust** at any time to update the current market price of an asset without affecting quantity.
- All historical prices entered via transactions are stored and used for performance snapshots.
- A dedicated **"Update Prices"** screen lists all assets with their last known prices, allowing bulk updates.

---

## 10. Performance & Analytics

### 10.1 Portfolio Snapshot

A snapshot of portfolio NAV (Net Asset Value) is recorded whenever:
- A transaction is entered, or
- The user manually triggers a price update.

Snapshots store: date, total portfolio value in base currency, and value per asset.

### 10.2 Performance Metrics

The following metrics are computed per portfolio and also aggregated across all portfolios:

| Metric | Description |
|---|---|
| **Total Value** | Sum of all current position values in base currency |
| **Total Cost** | Sum of all cost bases in base currency |
| **Unrealized Gain/Loss** | Total Value − Total Cost |
| **Simple Total Return %** | Unrealized Gain / Total Cost × 100 |
| **Realized Gain/Loss** | Gains/losses from completed sell transactions (FIFO) |
| **TWR (Time-Weighted Return)** | Measures portfolio return independent of cash flow timing; suitable for comparing strategy performance |
| **MWR / XIRR** | Money-weighted return accounting for the timing and size of cash flows; reflects actual investor experience |
| **Annualized Return** | TWR or XIRR annualized for periods > 1 year |

### 10.3 Period Filters

All performance views support period filters:
- 1 Week, 1 Month, 3 Months, 6 Months, YTD, 1 Year, 3 Years, All Time
- Custom date range

### 10.4 Portfolio Growth Chart

A line chart showing portfolio NAV over time (from snapshots). Can be viewed per portfolio or as a combined total.

### 10.5 Asset Allocation

A pie/donut chart and table showing:
- Allocation by asset type (%)
- Allocation by individual asset (%)
- Value and % of total for each holding

---

## 11. Screens & Navigation

### 11.1 Dashboard

- Total portfolio value (all portfolios combined, in a selected display currency)
- Total unrealized gain/loss and return %
- Asset allocation donut chart (combined)
- Portfolio cards showing: name, value, return %, base currency
- Recent transactions (last 10)
- Portfolio growth chart (combined, last 30 days by default)

### 11.2 Portfolio Detail Page

- Portfolio name, base currency, total value
- Holdings table:
  - Asset name, type, quantity, avg cost, current price, current value, unrealized gain/loss, return %
- Performance metrics panel: Simple Return, TWR, MWR/XIRR, Annualized Return (with period selector)
- Portfolio growth chart (this portfolio only)
- Asset allocation chart (this portfolio only)
- Transaction history table with filters (by asset, by type, by date range)
- Action buttons: Add Transaction, Update Prices

### 11.3 Add / Edit Transaction

Form to enter a transaction:
- Select portfolio
- Select transaction type (Buy, Sell, Convert, Fee)
- Select or create asset
  - If new asset: enter name, type, ticker/symbol, pricing currency
- Enter quantity, unit price, date, fee, notes
- For **Convert**: pick source asset + quantity + sell price, then target asset + buy price
- Confirmation summary before saving

### 11.4 Update Prices Screen

- List of all assets across all portfolios
- Each row: asset name, type, last known price, last updated date, input field for new price
- Bulk save button

### 11.5 Asset Management

- List all defined assets
- Edit asset details (name, ticker, pricing currency)
- View price history for an asset (all manually entered prices over time)

### 11.6 Transaction History

- Global transaction log across all portfolios
- Filterable by: portfolio, asset, transaction type, date range
- Exportable to CSV

---

## 12. Data Model (Logical)

```
Portfolio
  id, name, description, base_currency, created_at

Asset
  id, name, type, ticker_symbol, pricing_currency, notes

Price
  id, asset_id, price, currency, recorded_at, source (manual | transaction)

Transaction
  id, portfolio_id, type (buy|sell|convert|fee|price_adjust),
  date, asset_id, quantity, unit_price, fee, notes,
  conversion_id (nullable, links convert legs)

Snapshot
  id, portfolio_id, date, total_value_base_currency, breakdown (JSON)
```

---

## 13. Tech Stack

| Layer | Choice |
|---|---|
| **Framework** | Next.js (fullstack — App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **UI Components** | shadcn/ui + Tailwind CSS |
| **Charts** | Recharts or Chart.js |
| **Deployment** | Docker Compose (Next.js app + PostgreSQL) |

---

## 14. Docker Compose Architecture

```
services:
  app:        # Next.js (port 3000)
  db:         # PostgreSQL (port 5432, internal only)
  
volumes:
  postgres_data:  # persistent DB storage
```

A single `docker-compose.yml` at project root. Configuration via `.env` file (DB credentials, optional app secret).

---

## 15. Future (v2+)

- **Price API integration**: Auto-fetch prices for stocks (Yahoo Finance / Alpha Vantage), crypto (CoinGecko), FX rates (Open Exchange Rates)
- **Dividend / income tracking**: Record distributions, impact on cost basis
- **Benchmark comparison**: Compare portfolio TWR against S&P 500, BTC, etc.
- **Tax report export**: Capital gains report (FIFO lots)
- **Multi-currency consolidated view**: Convert all portfolios to a single display currency using live FX
- **Import from CSV**: Bulk import transactions from broker exports
- **Alerts**: Notify when an asset crosses a price threshold

---

## 16. Success Criteria (v1)

- [ ] User can create multiple portfolios with different base currencies
- [ ] User can add Buy/Sell/Convert/Fee transactions manually
- [ ] User can update unit prices for any asset at any time
- [ ] Portfolio holdings, cost basis, and unrealized gain/loss are accurate
- [ ] Dashboard shows total value and allocation across all portfolios
- [ ] Performance metrics (Simple Return, TWR, XIRR) are computed correctly for any date range
- [ ] Portfolio NAV growth chart renders from historical snapshots
- [ ] Full transaction history is viewable and filterable
- [ ] App runs via `docker-compose up` with no additional setup
