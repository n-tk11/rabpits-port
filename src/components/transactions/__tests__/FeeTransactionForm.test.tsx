import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/fee-transaction", () => ({
  createFeeTransaction: vi.fn(),
}));

import { FeeTransactionForm } from "@/components/transactions/FeeTransactionForm";
import { createFeeTransaction } from "@/lib/actions/fee-transaction";

const mockCreateFeeTransaction = createFeeTransaction as ReturnType<typeof vi.fn>;

const assets = [
  { id: "a1", name: "US Dollar", tickerSymbol: "USD", pricingCurrency: "USD" },
  { id: "a2", name: "Euro", tickerSymbol: "EUR", pricingCurrency: "EUR" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FeeTransactionForm", () => {
  it("renders the 'Fee' trigger button", () => {
    render(<FeeTransactionForm portfolioId="p1" assets={assets} portfolioBaseCurrency="USD" />);
    expect(screen.getByRole("button", { name: /fee/i })).toBeDefined();
  });

  it("opens dialog when Fee button is clicked", async () => {
    const user = userEvent.setup();
    render(<FeeTransactionForm portfolioId="p1" assets={assets} portfolioBaseCurrency="USD" />);
    await user.click(screen.getByRole("button", { name: /fee/i }));
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("shows amount input in dialog", async () => {
    const user = userEvent.setup();
    render(<FeeTransactionForm portfolioId="p1" assets={assets} portfolioBaseCurrency="USD" />);
    await user.click(screen.getByRole("button", { name: /fee/i }));
    expect(screen.getByLabelText(/amount/i)).toBeDefined();
  });

  it("shows error message on failed action", async () => {
    mockCreateFeeTransaction.mockResolvedValue({
      success: false,
      error: "Amount must be positive",
    });
    const user = userEvent.setup();
    render(<FeeTransactionForm portfolioId="p1" assets={assets} portfolioBaseCurrency="USD" />);
    await user.click(screen.getByRole("button", { name: /fee/i }));

    await user.type(screen.getByLabelText(/amount/i), "0");
    const dateInput = screen.getByLabelText(/date/i);
    await user.type(dateInput, "2024-06-01");

    const submitBtn = screen.getByRole("button", { name: /add/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/amount must be positive/i)).toBeDefined();
  });
});
