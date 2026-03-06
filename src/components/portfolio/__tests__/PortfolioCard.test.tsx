import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock child client components to isolate PortfolioCard
vi.mock("@/components/portfolio/PortfolioForm", () => ({
  PortfolioForm: () => <button>Edit</button>,
}));
vi.mock("@/components/portfolio/DeletePortfolioButton", () => ({
  DeletePortfolioButton: () => <button>Delete</button>,
}));

import { PortfolioCard } from "@/components/portfolio/PortfolioCard";

const portfolio = {
  id: "p1",
  name: "Retirement Fund",
  description: "Long-term savings",
  baseCurrency: "USD",
  createdAt: new Date("2024-01-01"),
};

describe("PortfolioCard", () => {
  it("renders portfolio name", () => {
    render(<PortfolioCard portfolio={portfolio} />);
    expect(screen.getByText("Retirement Fund")).toBeDefined();
  });

  it("renders base currency badge", () => {
    render(<PortfolioCard portfolio={portfolio} />);
    expect(screen.getByText("USD")).toBeDefined();
  });

  it("renders description", () => {
    render(<PortfolioCard portfolio={portfolio} />);
    expect(screen.getByText("Long-term savings")).toBeDefined();
  });

  it("shows placeholder when no description", () => {
    render(<PortfolioCard portfolio={{ ...portfolio, description: null }} />);
    expect(screen.getByText("No description")).toBeDefined();
  });

  it("renders edit and delete actions", () => {
    render(<PortfolioCard portfolio={portfolio} />);
    expect(screen.getByText("Edit")).toBeDefined();
    expect(screen.getByText("Delete")).toBeDefined();
  });
});
