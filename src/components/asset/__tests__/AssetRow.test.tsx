import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/asset/AssetForm", () => ({
  AssetForm: () => <button>Edit</button>,
}));

import { AssetRow } from "@/components/asset/AssetRow";
import { AssetType } from "@/types";

const asset = {
  id: "a1",
  name: "Apple Inc.",
  type: AssetType.STOCK_ETF,
  tickerSymbol: "AAPL",
  pricingCurrency: "USD",
  notes: null,
};

describe("AssetRow", () => {
  it("renders asset name", () => {
    render(
      <table>
        <tbody>
          <AssetRow asset={asset} />
        </tbody>
      </table>
    );
    expect(screen.getByText("Apple Inc.")).toBeDefined();
  });

  it("renders asset type badge", () => {
    render(
      <table>
        <tbody>
          <AssetRow asset={asset} />
        </tbody>
      </table>
    );
    expect(screen.getByText("Stock/ETF")).toBeDefined();
  });

  it("renders ticker symbol", () => {
    render(
      <table>
        <tbody>
          <AssetRow asset={asset} />
        </tbody>
      </table>
    );
    expect(screen.getByText("AAPL")).toBeDefined();
  });

  it("renders pricing currency", () => {
    render(
      <table>
        <tbody>
          <AssetRow asset={asset} />
        </tbody>
      </table>
    );
    expect(screen.getByText("USD")).toBeDefined();
  });

  it("shows dash when no notes", () => {
    render(
      <table>
        <tbody>
          <AssetRow asset={asset} />
        </tbody>
      </table>
    );
    expect(screen.getByText("—")).toBeDefined();
  });

  it("renders edit action", () => {
    render(
      <table>
        <tbody>
          <AssetRow asset={asset} />
        </tbody>
      </table>
    );
    expect(screen.getByText("Edit")).toBeDefined();
  });
});
