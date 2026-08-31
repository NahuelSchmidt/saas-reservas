import { Package, AlertTriangle } from "lucide-react";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { listProducts, getTodaySales } from "@/lib/products/service";
import { formatCentsARS } from "@/lib/availability/engine";
import { Card, CardContent } from "@/components/ui/card";
import { ProductFormDialog } from "./product-form-dialog";
import { NewSaleDialog } from "./new-sale-dialog";
import { StockInput } from "./stock-input";

export default async function ProductsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);

  const [products, todaySales] = await Promise.all([
    listProducts(tenant.id, true),
    getTodaySales(tenant.id, new Date()),
  ]);

  const todayTotalCents = todaySales.reduce((s, sale) => s + sale.totalCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
          <p className="text-sm text-muted-foreground">Stock de pelotas, bebidas y demás para vender en el mostrador.</p>
        </div>
        <div className="flex gap-2">
          <NewSaleDialog tenantSlug={tenant.slug} products={products.filter((p) => p.active)} />
          <ProductFormDialog tenantSlug={tenant.slug} />
        </div>
      </div>

      <Card className="gap-2 border-border/60 py-5 shadow-sm sm:max-w-xs">
        <CardContent className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Package className="size-5" />
          </div>
          <div>
            <div className="font-heading text-xl font-bold">{formatCentsARS(todayTotalCents)}</div>
            <div className="text-xs text-muted-foreground">Vendido hoy ({todaySales.length} ventas)</div>
          </div>
        </CardContent>
      </Card>

      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Todavía no cargaste productos.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className={`gap-3 border-border/60 py-6 shadow-sm ${!product.active ? "opacity-50" : ""}`}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-heading text-lg font-bold">{product.name}</span>
                    {product.category && <p className="text-xs text-muted-foreground">{product.category}</p>}
                  </div>
                  <span className="font-heading text-lg font-bold">{formatCentsARS(product.priceCents)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <StockInput key={product.stock} tenantSlug={tenant.slug} productId={product.id} stock={product.stock} />
                  {product.stock === 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-orange-600">
                      <AlertTriangle className="size-3.5" /> Sin stock
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
