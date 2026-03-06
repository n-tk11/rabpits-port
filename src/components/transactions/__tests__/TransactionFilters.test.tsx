import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TransactionFilters } from "@/components/transactions/TransactionFilters";

const portfolios = [
  { id: "p1", name: "Main Portfolio" },
  { id: "p2", name: "Crypto Portfolio" },
];

const assets = [
  { id: "a1", name: "Apple Inc.", tickerSymbol: "AAPL" },
  { id: "a2", name: "Bitcoin", tickerSymbol: "BTC" },
];

describe("TransactionFilters", () => {
  it("renders portfolio select", () => {
    render(<TransactionFilters portfolios={portfolios} assets={assets} currentFilters={{}} />);
    expect(screen.getByRole("combobox", { name: /portfolio/i })).toBeDefined();
  });

  it("renders asset select", () => {
    render(<TransactionFilters portfolios={portfolios} assets={assets} currentFilters={{}} />);
    expect(screen.getByRole("combobox", { name: /asset/i })).toBeDefined();
  });

  it("renders type select", () => {
    render(<TransactionFilters portfolios={portfolios} assets={assets} currentFilters={{}} />);
    expect(screen.getByRole("combobox", { name: /type/i })).toBeDefined();
  });

  it("renders date inputs", () => {
    render(<TransactionFilters portfolios={portfolios} assets={assets} currentFilters={{}} />);
    expect(screen.getByLabelText(/date from/i)).toBeDefined();
    expect(screen.getByLabelText(/date to/i)).toBeDefined();
  });

  it("renders apply button", () => {
    render(<TransactionFilters portfolios={portfolios} assets={assets} currentFilters={{}} />);
    expect(screen.getByRole("button", { name: /apply/i })).toBeDefined();
  });

  it("pre-selects values from props", () => {
    render(
      <TransactionFilters
        portfolios={portfolios}
        assets={assets}
        currentFilters={{
          portfolioId: "p1",
          assetId: "a2",
          type: "BUY",
          dateFrom: "2024-01-01",
          dateTo: "2024-12-31",
        }}
      />
    );

    const portfolioSelect = screen.getByRole("combobox", {
      name: /portfolio/i,
    }) as HTMLSelectElement;
    expect(portfolioSelect.value).toBe("p1");

    const assetSelect = screen.getByRole("combobox", { name: /asset/i }) as HTMLSelectElement;
    expect(assetSelect.value).toBe("a2");

    const typeSelect = screen.getByRole("combobox", { name: /type/i }) as HTMLSelectElement;
    expect(typeSelect.value).toBe("BUY");

    const dateFromInput = screen.getByLabelText(/date from/i) as HTMLInputElement;
    expect(dateFromInput.value).toBe("2024-01-01");

    const dateToInput = screen.getByLabelText(/date to/i) as HTMLInputElement;
    expect(dateToInput.value).toBe("2024-12-31");
  });
});
