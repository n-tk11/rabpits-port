import { PortfolioCard } from "@/components/portfolio/PortfolioCard";
import { PortfolioForm } from "@/components/portfolio/PortfolioForm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PortfoliosPage() {
  const portfolios = await db.portfolio.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      baseCurrency: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolios</h1>
          <p className="text-sm text-muted-foreground">Manage your investment portfolios</p>
        </div>
        <PortfolioForm mode="create" />
      </div>

      {portfolios.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground">No portfolios yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((portfolio) => (
            <PortfolioCard key={portfolio.id} portfolio={portfolio} />
          ))}
        </div>
      )}
    </div>
  );
}
