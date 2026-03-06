import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/transactions", () => ({
  createTransaction: vi.fn(),
}));

import { TransactionForm } from "@/components/transactions/TransactionForm";
import { createTransaction } from "@/lib/actions/transactions";

const mockCreateTransaction = createTransaction as ReturnType<typeof vi.fn>;

const assets = [
  { id: "a1", name: "Apple Inc.", tickerSymbol: "AAPL", pricingCurrency: "USD" },
  { id: "a2", name: "Bitcoin", tickerSymbol: "BTC", pricingCurrency: "USD" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TransactionForm", () => {
  it("renders the 'Add Transaction' trigger button", () => {
    render(<TransactionForm portfolioId="p1" assets={assets} portfolioBaseCurrency="USD" />);
    expect(screen.getByRole("button", { name: /add transaction/i })).toBeDefined();
  });

  it("opens dialog when trigger button is clicked", async () => {
    const user = userEvent.setup();
    render(<TransactionForm portfolioId="p1" assets={assets} portfolioBaseCurrency="USD" />);
    await user.click(screen.getByRole("button", { name: /add transaction/i }));
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("shows form fields in the dialog", async () => {
    const user = userEvent.setup();
    render(<TransactionForm portfolioId="p1" assets={assets} portfolioBaseCurrency="USD" />);
    await user.click(screen.getByRole("button", { name: /add transaction/i }));
    expect(screen.getByLabelText(/quantity/i)).toBeDefined();
    expect(screen.getByLabelText(/unit price/i)).toBeDefined();
  });

  it("shows error message when action returns failure", async () => {
    mockCreateTransaction.mockResolvedValue({
      success: false,
      error: "Insufficient quantity available to sell",
    });
    const user = userEvent.setup();
    render(<TransactionForm portfolioId="p1" assets={assets} portfolioBaseCurrency="USD" />);
    await user.click(screen.getByRole("button", { name: /add transaction/i }));

    await user.type(screen.getByLabelText(/quantity/i), "10");
    await user.type(screen.getByLabelText(/unit price/i), "100");

    const dateInput = screen.getByLabelText(/date/i);
    await user.type(dateInput, "2024-06-01");

    const submitButton = screen.getByRole("button", { name: /add/i });
    await user.click(submitButton);

    expect(await screen.findByText(/insufficient quantity/i)).toBeDefined();
  });

  it("closes dialog when action returns success", async () => {
    mockCreateTransaction.mockResolvedValue({
      success: true,
      data: { id: "tx1" },
    });
    const user = userEvent.setup();
    render(<TransactionForm portfolioId="p1" assets={assets} portfolioBaseCurrency="USD" />);
    await user.click(screen.getByRole("button", { name: /add transaction/i }));

    await user.type(screen.getByLabelText(/quantity/i), "10");
    await user.type(screen.getByLabelText(/unit price/i), "100");

    const dateInput = screen.getByLabelText(/date/i);
    await user.type(dateInput, "2024-06-01");

    const submitButton = screen.getByRole("button", { name: /add/i });
    await user.click(submitButton);

    // Dialog should close on success
    expect(await screen.findByRole("button", { name: /add transaction/i })).toBeDefined();
  });
});
