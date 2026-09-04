import { withTenant } from "@/lib/db/tenant-context";

export class InsufficientStockError extends Error {
  constructor(productName: string) {
    super(`No hay stock suficiente de "${productName}".`);
  }
}

export async function listProducts(tenantId: string, includeInactive = false) {
  return withTenant(tenantId, (tx) =>
    tx.product.findMany({
      where: { tenantId, ...(includeInactive ? {} : { active: true }) },
      orderBy: { name: "asc" },
    }),
  );
}

export async function createProduct(params: {
  tenantId: string;
  name: string;
  priceCents: number;
  stock: number;
  category?: string;
}) {
  return withTenant(params.tenantId, (tx) =>
    tx.product.create({
      data: {
        tenantId: params.tenantId,
        name: params.name,
        priceCents: params.priceCents,
        stock: params.stock,
        category: params.category,
      },
    }),
  );
}

/**
 * Crea o actualiza productos en lote, matcheando por nombre (sin
 * mayúsculas/espacios) dentro del tenant. Pensado para el flujo
 * exportar-editar-en-Excel-reimportar: si el nombre ya existe se
 * actualiza precio/stock/categoría, si no, se crea.
 */
export async function bulkUpsertProducts(
  tenantId: string,
  products: { name: string; priceCents: number; stock: number; category?: string }[],
) {
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.product.findMany({ where: { tenantId }, select: { id: true, name: true } });
    const idByName = new Map(existing.map((p) => [p.name.trim().toLowerCase(), p.id]));

    let created = 0;
    let updated = 0;
    for (const p of products) {
      const key = p.name.trim().toLowerCase();
      const existingId = idByName.get(key);
      if (existingId) {
        await tx.product.update({
          where: { id: existingId },
          data: { priceCents: p.priceCents, stock: p.stock, category: p.category },
        });
        updated++;
      } else {
        const row = await tx.product.create({
          data: { tenantId, name: p.name, priceCents: p.priceCents, stock: p.stock, category: p.category },
        });
        idByName.set(key, row.id); // por si el mismo nombre aparece dos veces en el mismo archivo
        created++;
      }
    }
    return { created, updated };
  });
}

export async function updateProduct(
  tenantId: string,
  productId: string,
  data: Partial<{ name: string; priceCents: number; stock: number; category: string | null; active: boolean }>,
) {
  return withTenant(tenantId, (tx) => tx.product.update({ where: { id: productId }, data }));
}

/**
 * Registra una venta y descuenta stock en la misma transacción. El chequeo de
 * stock se hace con `updateMany` condicionado (`stock >= quantity`) para que
 * dos ventas concurrentes del mismo producto no dejen el stock en negativo:
 * si la condición no matchea ninguna fila, se aborta con InsufficientStockError.
 */
export async function createSale(params: {
  tenantId: string;
  createdByUserId: string;
  method: "CASH" | "TRANSFER" | "MERCADOPAGO";
  items: { productId: string; quantity: number }[];
}) {
  return withTenant(params.tenantId, async (tx) => {
    let totalCents = 0;
    const itemsData: {
      productId: string;
      productName: string;
      unitPriceCents: number;
      quantity: number;
      subtotalCents: number;
    }[] = [];

    for (const item of params.items) {
      const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });

      const decremented = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (decremented.count === 0) throw new InsufficientStockError(product.name);

      const subtotalCents = product.priceCents * item.quantity;
      totalCents += subtotalCents;
      itemsData.push({
        productId: product.id,
        productName: product.name,
        unitPriceCents: product.priceCents,
        quantity: item.quantity,
        subtotalCents,
      });
    }

    const sale = await tx.sale.create({
      data: {
        tenantId: params.tenantId,
        createdByUserId: params.createdByUserId,
        method: params.method,
        totalCents,
        items: { create: itemsData },
      },
      include: { items: true },
    });

    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorUserId: params.createdByUserId,
        action: "sale.created",
        entityType: "Sale",
        entityId: sale.id,
        metadata: { totalCents, items: itemsData.length },
      },
    });

    return sale;
  });
}

export async function getTodaySales(tenantId: string, date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  return withTenant(tenantId, (tx) =>
    tx.sale.findMany({
      where: { tenantId, createdAt: { gte: dayStart, lt: dayEnd } },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
  );
}
