"use server";

import { revalidatePath } from "next/cache";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { requireTenantRole } from "@/lib/auth/guards";
import { createProduct, updateProduct, createSale, InsufficientStockError } from "@/lib/products/service";
import { productSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/app/actions/booking";

export async function createProductAction(tenantSlug: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    priceCents: Number(formData.get("priceARS")) * 100,
    stock: formData.get("stock"),
    category: formData.get("category") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const product = await createProduct({ tenantId: tenant.id, ...parsed.data });
  revalidatePath(`/${tenantSlug}/admin/products`);
  return { ok: true, data: { id: product.id } };
}

export async function updateStockAction(
  tenantSlug: string,
  productId: string,
  stock: number,
): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  await updateProduct(tenant.id, productId, { stock });
  revalidatePath(`/${tenantSlug}/admin/products`);
  return { ok: true, data: { ok: true } };
}

export async function toggleProductActiveAction(
  tenantSlug: string,
  productId: string,
  active: boolean,
): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  await updateProduct(tenant.id, productId, { active });
  revalidatePath(`/${tenantSlug}/admin/products`);
  return { ok: true, data: { ok: true } };
}

export async function createSaleAction(
  tenantSlug: string,
  items: { productId: string; quantity: number }[],
  method: "CASH" | "TRANSFER",
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  const actor = await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  if (items.length === 0) return { ok: false, error: "Agregá al menos un producto." };

  try {
    const sale = await createSale({ tenantId: tenant.id, createdByUserId: actor.id, method, items });
    revalidatePath(`/${tenantSlug}/admin/products`);
    revalidatePath(`/${tenantSlug}/admin/calendar`);
    return { ok: true, data: { id: sale.id } };
  } catch (err) {
    if (err instanceof InsufficientStockError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "No pudimos registrar la venta." };
  }
}
