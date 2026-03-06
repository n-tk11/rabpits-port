"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { AssetType } from "@/types";
import type { ActionResult } from "@/types";

type AssetInput = {
  name: string;
  type: AssetType;
  tickerSymbol: string;
  pricingCurrency: string;
  notes?: string;
};

type Asset = {
  id: string;
  name: string;
  type: AssetType;
  tickerSymbol: string;
  pricingCurrency: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const VALID_ASSET_TYPES = Object.values(AssetType) as string[];

function validateInput(input: AssetInput): string | null {
  if (!input.name || input.name.trim().length === 0) return "Name is required";
  if (!input.type) return "Asset type is required";
  if (!VALID_ASSET_TYPES.includes(input.type)) return "Invalid asset type";
  if (!input.tickerSymbol || input.tickerSymbol.trim().length === 0)
    return "Ticker symbol is required";
  if (!input.pricingCurrency || input.pricingCurrency.trim().length === 0)
    return "Pricing currency is required";
  return null;
}

export async function createAsset(input: AssetInput): Promise<ActionResult<Asset>> {
  const error = validateInput(input);
  if (error) return { success: false, error };

  try {
    const asset = await db.asset.create({
      data: {
        name: input.name.trim(),
        type: input.type,
        tickerSymbol: input.tickerSymbol.trim().toUpperCase(),
        pricingCurrency: input.pricingCurrency.trim().toUpperCase(),
        notes: input.notes?.trim() ?? null,
      },
    });
    revalidatePath("/assets");
    return { success: true, data: asset as Asset };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to create asset" };
  }
}

export async function updateAsset(id: string, input: AssetInput): Promise<ActionResult<Asset>> {
  if (!id) return { success: false, error: "Asset ID is required" };

  const error = validateInput(input);
  if (error) return { success: false, error };

  try {
    const asset = await db.asset.update({
      where: { id },
      data: {
        name: input.name.trim(),
        type: input.type,
        tickerSymbol: input.tickerSymbol.trim().toUpperCase(),
        pricingCurrency: input.pricingCurrency.trim().toUpperCase(),
        notes: input.notes?.trim() ?? null,
      },
    });
    revalidatePath("/assets");
    return { success: true, data: asset as Asset };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to update asset" };
  }
}
