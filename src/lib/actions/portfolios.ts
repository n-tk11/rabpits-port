"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import type { ActionResult } from "@/types";

type PortfolioInput = {
  name: string;
  description?: string;
  baseCurrency: string;
};

type Portfolio = {
  id: string;
  name: string;
  description: string | null;
  baseCurrency: string;
  createdAt: Date;
  updatedAt: Date;
};

function validateInput(input: PortfolioInput): string | null {
  if (!input.name || input.name.trim().length === 0) return "Name is required";
  if (!input.baseCurrency || input.baseCurrency.trim().length === 0)
    return "Base currency is required";
  if (input.baseCurrency.trim().length !== 3)
    return "Base currency must be a 3-character currency code";
  return null;
}

export async function createPortfolio(input: PortfolioInput): Promise<ActionResult<Portfolio>> {
  const error = validateInput(input);
  if (error) return { success: false, error };

  try {
    const portfolio = await db.portfolio.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        baseCurrency: input.baseCurrency.trim().toUpperCase(),
      },
    });
    revalidatePath("/portfolios");
    return { success: true, data: portfolio };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to create portfolio" };
  }
}

export async function updatePortfolio(
  id: string,
  input: PortfolioInput
): Promise<ActionResult<Portfolio>> {
  if (!id) return { success: false, error: "Portfolio ID is required" };

  const error = validateInput(input);
  if (error) return { success: false, error };

  try {
    const portfolio = await db.portfolio.update({
      where: { id },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        baseCurrency: input.baseCurrency.trim().toUpperCase(),
      },
    });
    revalidatePath("/portfolios");
    return { success: true, data: portfolio };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to update portfolio" };
  }
}

export async function deletePortfolio(id: string): Promise<ActionResult<void>> {
  if (!id) return { success: false, error: "Portfolio ID is required" };

  try {
    const txCount = await db.transaction.count({ where: { portfolioId: id } });
    if (txCount > 0) {
      return {
        success: false,
        error: "Cannot delete a portfolio that has transactions. Remove all transactions first.",
      };
    }

    await db.portfolio.delete({ where: { id } });
    revalidatePath("/portfolios");
    return { success: true, data: undefined };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to delete portfolio" };
  }
}
