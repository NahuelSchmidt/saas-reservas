"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { formatCentsARS } from "@/lib/availability/engine";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StockInput } from "./stock-input";

type Product = {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
  category: string | null;
  active: boolean;
};

const NO_CATEGORY = "Sin categoría";

export function ProductsGrid({ tenantSlug, products }: { tenantSlug: string; products: Product[] }) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) set.add(p.category?.trim() || NO_CATEGORY);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? products.filter((p) => (p.category?.trim() || NO_CATEGORY) === activeCategory)
    : products;

  if (products.length === 0) {
    return (
      <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        Todavía no cargaste productos.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeCategory === null ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
            }`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
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
                <StockInput key={product.stock} tenantSlug={tenantSlug} productId={product.id} stock={product.stock} />
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

      {activeCategory && filtered.length === 0 && (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No hay productos en <Badge variant="secondary">{activeCategory}</Badge>.
        </p>
      )}
    </div>
  );
}
