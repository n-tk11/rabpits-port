import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/convert-transaction", () => ({
  createConvertTransaction: vi.fn(),
}));

import { ConvertTransactionForm } from "@/components/transactions/ConvertTransactionForm";
import { createConvertTransaction } from "@/lib/actions/convert-transaction";

const mockCreateConvertTransaction = createConvertTransaction as ReturnType<typeof vi.fn>;

const assets = [
  { id: "a1", name: "US Dollar", tickerSymbol: "USD", pricingCurrency: "USD" },
  { id: "a2", name: "Euro", tickerSymbol: "EUR", pricingCurrency: "EUR" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ConvertTransactionForm", () => {
  it("renders the 'Convert' trigger button", () => {
    render(<ConvertTransactionForm portfolioId="p1" assets={assets} />);
    expect(screen.getByRole("button", { name: /convert/i })).toBeDefined();
  });

  it("opens dialog when Convert button is clicked", async () => {
    const user = userEvent.setup();
    render(<ConvertTransactionForm portfolioId="p1" assets={assets} />);
    await user.click(screen.getByRole("button", { name: /convert/i }));
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("shows From Asset and To Asset selects in the dialog", async () => {
    const user = userEvent.setup();
    render(<ConvertTransactionForm portfolioId="p1" assets={assets} />);
    await user.click(screen.getByRole("button", { name: /convert/i }));
    expect(screen.getByText(/from asset/i)).toBeDefined();
    expect(screen.getByText(/to asset/i)).toBeDefined();
  });

  it("shows error message when action returns failure", async () => {
    mockCreateConvertTransaction.mockResolvedValue({
      success: false,
      error: "Insufficient quantity available to sell",
    });

    const user = userEvent.setup();
    render(<ConvertTransactionForm portfolioId="p1" assets={assets} />);
    await user.click(screen.getByRole("button", { name: /convert/i }));

    await user.type(screen.getByLabelText(/from quantity/i), "100");
    await user.type(screen.getByLabelText(/to quantity/i), "90");

    const dateInput = screen.getByLabelText(/date/i);
    await user.type(dateInput, "2024-06-01");

    const submitButton = screen.getByRole("button", { name: /convert$/i });
    await user.click(submitButton);

    expect(await screen.findByText(/insufficient quantity/i)).toBeDefined();
  });
});
