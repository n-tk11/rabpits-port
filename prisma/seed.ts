import "dotenv/config";

import { randomUUID } from "crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log("🌱 Seeding database…");

  // ─── Clean existing data ──────────────────────────────────────────────────
  await prisma.snapshot.deleteMany();
  await prisma.price.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.asset.deleteMany();

  // ─── Assets ───────────────────────────────────────────────────────────────
  const [aapl, btc, eth, usd, voo] = await Promise.all([
    prisma.asset.create({
      data: {
        name: "Apple Inc.",
        type: "STOCK_ETF",
        tickerSymbol: "AAPL",
        pricingCurrency: "USD",
      },
    }),
    prisma.asset.create({
      data: {
        name: "Bitcoin",
        type: "CRYPTO",
        tickerSymbol: "BTC",
        pricingCurrency: "USD",
        notes: "Largest cryptocurrency by market cap",
      },
    }),
    prisma.asset.create({
      data: {
        name: "Ethereum",
        type: "CRYPTO",
        tickerSymbol: "ETH",
        pricingCurrency: "USD",
      },
    }),
    prisma.asset.create({
      data: {
        name: "US Dollar",
        type: "CASH",
        tickerSymbol: "USD",
        pricingCurrency: "USD",
      },
    }),
    prisma.asset.create({
      data: {
        name: "Vanguard S&P 500 ETF",
        type: "STOCK_ETF",
        tickerSymbol: "VOO",
        pricingCurrency: "USD",
      },
    }),
  ]);

  console.log("✅ Assets created");

  // ─── Portfolios ───────────────────────────────────────────────────────────
  const [mainBrokerage, cryptoBag] = await Promise.all([
    prisma.portfolio.create({
      data: { name: "Main Brokerage", description: "US equities and ETFs", baseCurrency: "USD" },
    }),
    prisma.portfolio.create({
      data: { name: "Crypto Bag", description: "Cryptocurrency holdings", baseCurrency: "USD" },
    }),
  ]);

  console.log("✅ Portfolios created");

  // ─── Helper: create tx + price + snapshot ─────────────────────────────────
  type TxInput = {
    portfolioId: string;
    assetId: string;
    type: "BUY" | "SELL" | "CONVERT" | "FEE" | "PRICE_ADJUST";
    date: Date;
    quantity: number;
    unitPrice: number;
    fee?: number;
    notes?: string;
    conversionId?: string;
  };

  type SnapshotBreakdownEntry = {
    assetId: string;
    quantity: number;
    unitPrice: number;
    value: number;
  };

  async function createTxWithPriceAndSnapshot(
    input: TxInput,
    snapshotTotal: number,
    breakdown: SnapshotBreakdownEntry[]
  ): Promise<void> {
    await prisma.transaction.create({
      data: {
        portfolioId: input.portfolioId,
        assetId: input.assetId,
        type: input.type,
        date: input.date,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        fee: input.fee ?? 0,
        notes: input.notes,
        conversionId: input.conversionId,
      },
    });

    if (input.type !== "FEE") {
      await prisma.price.create({
        data: {
          assetId: input.assetId,
          price: input.unitPrice,
          currency: "USD",
          recordedAt: input.date,
          source: "TRANSACTION",
        },
      });
    }

    await prisma.snapshot.create({
      data: {
        portfolioId: input.portfolioId,
        date: input.date,
        totalValueBaseCurrency: snapshotTotal,
        breakdown,
      },
    });
  }

  // ─── Main Brokerage transactions ──────────────────────────────────────────
  // Day 1: Buy 100 AAPL @ $150
  await createTxWithPriceAndSnapshot(
    {
      portfolioId: mainBrokerage.id,
      assetId: aapl.id,
      type: "BUY",
      date: new Date("2024-01-15"),
      quantity: 100,
      unitPrice: 150,
      fee: 1,
      notes: "Initial AAPL position",
    },
    15000,
    [{ assetId: aapl.id, quantity: 100, unitPrice: 150, value: 15000 }]
  );

  // Day 2: Buy 50 more AAPL @ $180 (second FIFO lot)
  await createTxWithPriceAndSnapshot(
    {
      portfolioId: mainBrokerage.id,
      assetId: aapl.id,
      type: "BUY",
      date: new Date("2024-03-01"),
      quantity: 50,
      unitPrice: 180,
      fee: 0.5,
      notes: "Adding to AAPL position",
    },
    // 150 AAPL @ latest price $180 = $27,000
    27000,
    [{ assetId: aapl.id, quantity: 150, unitPrice: 180, value: 27000 }]
  );

  // Day 3: Sell 30 AAPL @ $200 (triggers FIFO: 30 from lot 1 @ $150)
  await createTxWithPriceAndSnapshot(
    {
      portfolioId: mainBrokerage.id,
      assetId: aapl.id,
      type: "SELL",
      date: new Date("2024-05-10"),
      quantity: 30,
      unitPrice: 200,
      fee: 0.5,
      notes: "Partial sell — realized gain $1,500",
    },
    // 120 AAPL @ $200 = $24,000
    24000,
    [{ assetId: aapl.id, quantity: 120, unitPrice: 200, value: 24000 }]
  );

  // Day 4: Buy 10 VOO @ $400
  await createTxWithPriceAndSnapshot(
    {
      portfolioId: mainBrokerage.id,
      assetId: voo.id,
      type: "BUY",
      date: new Date("2024-06-01"),
      quantity: 10,
      unitPrice: 400,
      fee: 1,
      notes: "Adding S&P 500 exposure",
    },
    // 120 AAPL @ $200 + 10 VOO @ $400 = $24,000 + $4,000
    28000,
    [
      { assetId: aapl.id, quantity: 120, unitPrice: 200, value: 24000 },
      { assetId: voo.id, quantity: 10, unitPrice: 400, value: 4000 },
    ]
  );

  // Day 5: Fee transaction
  await createTxWithPriceAndSnapshot(
    {
      portfolioId: mainBrokerage.id,
      assetId: usd.id,
      type: "FEE",
      date: new Date("2024-07-01"),
      quantity: 10,
      unitPrice: 1,
      fee: 0,
      notes: "Annual management fee",
    },
    // NAV stays approximately same; fee reduces cash/NAV
    27990,
    [
      { assetId: aapl.id, quantity: 120, unitPrice: 200, value: 24000 },
      { assetId: voo.id, quantity: 10, unitPrice: 400, value: 4000 },
    ]
  );

  // Manual price update for AAPL
  await prisma.price.create({
    data: {
      assetId: aapl.id,
      price: 210,
      currency: "USD",
      recordedAt: new Date("2024-08-01"),
      source: "MANUAL",
    },
  });

  console.log("✅ Main Brokerage transactions created");

  // ─── Crypto Bag transactions ───────────────────────────────────────────────
  // Day 1: Buy 0.5 BTC @ $40,000
  await createTxWithPriceAndSnapshot(
    {
      portfolioId: cryptoBag.id,
      assetId: btc.id,
      type: "BUY",
      date: new Date("2024-02-01"),
      quantity: 0.5,
      unitPrice: 40000,
      fee: 20,
      notes: "First BTC purchase",
    },
    20000,
    [{ assetId: btc.id, quantity: 0.5, unitPrice: 40000, value: 20000 }]
  );

  // Day 2: Buy 0.3 more BTC @ $50,000 (second FIFO lot)
  await createTxWithPriceAndSnapshot(
    {
      portfolioId: cryptoBag.id,
      assetId: btc.id,
      type: "BUY",
      date: new Date("2024-04-01"),
      quantity: 0.3,
      unitPrice: 50000,
      fee: 15,
      notes: "Adding to BTC position",
    },
    // 0.8 BTC @ $50,000 = $40,000
    40000,
    [{ assetId: btc.id, quantity: 0.8, unitPrice: 50000, value: 40000 }]
  );

  // Day 3: Convert 0.2 BTC → 2 ETH
  // Two-leg convert: sell 0.2 BTC @ $52,000, buy 2 ETH @ $5,200
  const conversionId = randomUUID();
  const convertDate = new Date("2024-05-15");

  // Sell leg
  await prisma.transaction.create({
    data: {
      portfolioId: cryptoBag.id,
      assetId: btc.id,
      type: "CONVERT",
      date: convertDate,
      quantity: 0.2,
      unitPrice: 52000,
      fee: 10,
      notes: "Convert BTC → ETH (sell leg)",
      conversionId,
    },
  });
  await prisma.price.create({
    data: {
      assetId: btc.id,
      price: 52000,
      currency: "USD",
      recordedAt: convertDate,
      source: "TRANSACTION",
    },
  });

  // Buy leg
  await prisma.transaction.create({
    data: {
      portfolioId: cryptoBag.id,
      assetId: eth.id,
      type: "CONVERT",
      date: convertDate,
      quantity: 2,
      unitPrice: 5200,
      fee: 0,
      notes: "Convert BTC → ETH (buy leg)",
      conversionId,
    },
  });
  await prisma.price.create({
    data: {
      assetId: eth.id,
      price: 5200,
      currency: "USD",
      recordedAt: convertDate,
      source: "TRANSACTION",
    },
  });

  // Snapshot after convert: 0.6 BTC @ $52,000 + 2 ETH @ $5,200 = $31,200 + $10,400
  await prisma.snapshot.create({
    data: {
      portfolioId: cryptoBag.id,
      date: convertDate,
      totalValueBaseCurrency: 41600,
      breakdown: [
        { assetId: btc.id, quantity: 0.6, unitPrice: 52000, value: 31200 },
        { assetId: eth.id, quantity: 2, unitPrice: 5200, value: 10400 },
      ],
    },
  });

  // Day 4: Deposit USD cash
  await createTxWithPriceAndSnapshot(
    {
      portfolioId: cryptoBag.id,
      assetId: usd.id,
      type: "BUY",
      date: new Date("2024-06-10"),
      quantity: 5000,
      unitPrice: 1,
      fee: 0,
      notes: "USD deposit for future purchases",
    },
    // 0.6 BTC @ $52,000 + 2 ETH @ $5,200 + $5,000 USD
    46600,
    [
      { assetId: btc.id, quantity: 0.6, unitPrice: 52000, value: 31200 },
      { assetId: eth.id, quantity: 2, unitPrice: 5200, value: 10400 },
      { assetId: usd.id, quantity: 5000, unitPrice: 1, value: 5000 },
    ]
  );

  // Manual price updates
  await Promise.all([
    prisma.price.create({
      data: {
        assetId: btc.id,
        price: 60000,
        currency: "USD",
        recordedAt: new Date("2024-08-01"),
        source: "MANUAL",
      },
    }),
    prisma.price.create({
      data: {
        assetId: eth.id,
        price: 3200,
        currency: "USD",
        recordedAt: new Date("2024-08-01"),
        source: "MANUAL",
      },
    }),
  ]);

  console.log("✅ Crypto Bag transactions created");

  // ─── Summary ──────────────────────────────────────────────────────────────
  const [portfolioCount, assetCount, txCount, priceCount, snapshotCount] = await Promise.all([
    prisma.portfolio.count(),
    prisma.asset.count(),
    prisma.transaction.count(),
    prisma.price.count(),
    prisma.snapshot.count(),
  ]);

  console.log("\n📊 Seed summary:");
  console.log(`   Portfolios: ${portfolioCount}`);
  console.log(`   Assets:     ${assetCount}`);
  console.log(`   Transactions: ${txCount}`);
  console.log(`   Prices:     ${priceCount}`);
  console.log(`   Snapshots:  ${snapshotCount}`);
  console.log("\n🎉 Done!");
}

main()
  .catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
