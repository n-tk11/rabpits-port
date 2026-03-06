"use server";

import { Decimal } from "@prisma/client/runtime/client";
import { revalidatePath } from "next/cache";

import { triggerSnapshot } from "@/lib/actions/snapshot";
import { db } from "@/lib/db";
import { AssetType, PriceSource } from "@/types";
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

type PriceUpdate = {
  assetId: string;
  price: string;
  currency: string;
  recordedAt: string;
};

export async function updatePrices(updates: PriceUpdate[]): Promise<ActionResult<void>> {
  for (const u of updates) {
    const val = parseFloat(u.price);
    if (isNaN(val) || val <= 0)
      return { success: false, error: `Invalid price "${u.price}" for asset ${u.assetId}` };
    if (!u.currency || u.currency.trim().length === 0)
      return { success: false, error: `Currency is required for asset ${u.assetId}` };
  }

  try {
    await db.$transaction(
      updates.map((u) =>
        db.price.create({
          data: {
            assetId: u.assetId,
            price: new Decimal(u.price),
            currency: u.currency.trim().toUpperCase(),
            recordedAt: new Date(u.recordedAt),
            source: PriceSource.MANUAL,
          },
        })
      )
    );

    const portfolios = await db.portfolio.findMany({ select: { id: true } });
    await Promise.all(portfolios.map((p) => triggerSnapshot(p.id)));

    revalidatePath("/assets/prices");
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to save prices" };
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
