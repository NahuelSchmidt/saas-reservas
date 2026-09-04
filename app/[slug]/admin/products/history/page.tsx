import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { getTodaySales } from "@/lib/products/service";
import { formatCentsARS } from "@/lib/availability/engine";
import { toLocalISODate, parseLocalISODate, addLocalDays } from "@/lib/availability/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  MERCADOPAGO: "Online",
};

export default async function SalesHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { slug } = await params;
  const { date: dateParam } = await searchParams;
  const tenant = await resolveTenantBySlug(slug);

  const dateISO = dateParam ?? toLocalISODate(new Date());
  const date = parseLocalISODate(dateISO);

  const sales = await getTodaySales(tenant.id, date);
  const totalCents = sales.reduce((s, sale) => s + sale.totalCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/${slug}/admin/products`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Volver a Productos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Historial de ventas</h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`?date=${addLocalDays(dateISO, -1)}`}
            className="flex size-9 items-center justify-center rounded-full border bg-card transition-colors hover:bg-muted"
            aria-label="Día anterior"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="min-w-44 text-center font-heading font-semibold capitalize">
            {date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <Link
            href={`?date=${addLocalDays(dateISO, 1)}`}
            className="flex size-9 items-center justify-center rounded-full border bg-card transition-colors hover:bg-muted"
            aria-label="Día siguiente"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="text-right">
          <div className="font-heading text-xl font-bold">{formatCentsARS(totalCents)}</div>
          <div className="text-xs text-muted-foreground">{sales.length} venta(s)</div>
        </div>
      </div>

      {sales.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No hay ventas registradas este día.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {sales.map((sale) => (
            <Card key={sale.id} className="gap-3 border-border/60 py-4 shadow-sm">
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">
                      {new Date(sale.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <Badge variant="secondary">{METHOD_LABEL[sale.method] ?? sale.method}</Badge>
                    {sale.createdBy?.name && <span className="text-xs text-muted-foreground">por {sale.createdBy.name}</span>}
                  </div>
                  <span className="font-heading text-base font-bold">{formatCentsARS(sale.totalCents)}</span>
                </div>
                <div className="flex flex-col gap-1 border-t pt-2 text-sm text-muted-foreground">
                  {sale.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {item.quantity} × {item.productName}
                      </span>
                      <span>{formatCentsARS(item.subtotalCents)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
