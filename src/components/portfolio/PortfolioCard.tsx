import { formatDistanceToNow } from "date-fns";

import { DeletePortfolioButton } from "@/components/portfolio/DeletePortfolioButton";
import { PortfolioForm } from "@/components/portfolio/PortfolioForm";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type PortfolioCardProps = {
  portfolio: {
    id: string;
    name: string;
    description: string | null;
    baseCurrency: string;
    createdAt: Date;
  };
};

export function PortfolioCard({ portfolio }: PortfolioCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{portfolio.name}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs font-normal text-muted-foreground">
            {portfolio.baseCurrency}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {portfolio.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{portfolio.description}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground">No description</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Created {formatDistanceToNow(portfolio.createdAt, { addSuffix: true })}
        </p>
      </CardContent>
      <CardFooter className="gap-2 pt-0">
        <PortfolioForm mode="edit" portfolio={portfolio} />
        <DeletePortfolioButton portfolioId={portfolio.id} portfolioName={portfolio.name} />
      </CardFooter>
    </Card>
  );
}
