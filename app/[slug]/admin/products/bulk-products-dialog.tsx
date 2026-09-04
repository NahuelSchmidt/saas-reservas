"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Download, AlertTriangle } from "lucide-react";
import { bulkUpsertProductsAction } from "./actions";
import { parseProductsCsv, productsToCsv, PRODUCTS_CSV_TEMPLATE, type ParsedProductRow } from "@/lib/products/csv";
import { formatCentsARS } from "@/lib/availability/engine";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Product = { name: string; priceCents: number; stock: number; category: string | null };

function downloadCsv(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkProductsDialog({ tenantSlug, products }: { tenantSlug: string; products: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedProductRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const errorRows = rows.filter((r) => r.error);
  const validRows = rows.filter((r) => !r.error);

  function handleDownload() {
    if (products.length > 0) {
      downloadCsv(productsToCsv(products), "mis-productos.csv");
    } else {
      downloadCsv(PRODUCTS_CSV_TEMPLATE, "plantilla-productos.csv");
    }
  }

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setRows(parseProductsCsv(text));
    };
    reader.readAsText(file, "utf-8");
  }

  function handleImport() {
    if (errorRows.length > 0) {
      toast.error("Corregí las filas con error antes de importar.");
      return;
    }
    startTransition(async () => {
      const result = await bulkUpsertProductsAction(
        tenantSlug,
        validRows.map((r) => ({ name: r.name!, priceCents: r.priceCents!, stock: r.stock!, category: r.category })),
      );
      if (result.ok) {
        const { created, updated } = result.data;
        toast.success(
          [created > 0 ? `${created} nuevo(s)` : null, updated > 0 ? `${updated} actualizado(s)` : null]
            .filter(Boolean)
            .join(" · ") || "Listo.",
        );
        setOpen(false);
        setRows([]);
        setFileName("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function reset() {
    setRows([]);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-1.5">
            <Upload className="size-3.5" /> Carga masiva
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Carga masiva de productos</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3">
            <button
              type="button"
              onClick={handleDownload}
              className="flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-2"
            >
              <Download className="size-3.5" />
              {products.length > 0 ? "Descargar mi lista actual" : "Descargar plantilla CSV"}
            </button>
            <p className="text-xs text-muted-foreground">
              {products.length > 0
                ? "Editala en Excel/Sheets (precios, stock, agregá filas nuevas) y volvé a subirla acá abajo."
                : "Todavía no tenés productos cargados — bajate el ejemplo, completalo y subilo."}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Columnas: <code>nombre,precio,stock,categoria</code> — precio en pesos (sin $). Un producto con el mismo{" "}
              <strong>nombre</strong> que ya tenés se actualiza; si es nuevo, se crea.
            </p>
          </div>

          {rows.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{fileName}</span>
                <span className={errorRows.length > 0 ? "font-medium text-destructive" : "font-medium text-emerald-600"}>
                  {validRows.length} válida(s){errorRows.length > 0 ? ` · ${errorRows.length} con error` : ""}
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="p-2 text-left">Fila</th>
                      <th className="p-2 text-left">Nombre</th>
                      <th className="p-2 text-left">Precio</th>
                      <th className="p-2 text-left">Stock</th>
                      <th className="p-2 text-left">Categoría</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.lineNumber} className={`border-t ${r.error ? "bg-destructive/5" : ""}`}>
                        <td className="p-2 text-muted-foreground">{r.lineNumber}</td>
                        {r.error ? (
                          <td colSpan={4} className="flex items-center gap-1.5 p-2 text-destructive">
                            <AlertTriangle className="size-3.5 shrink-0" /> {r.error}
                          </td>
                        ) : (
                          <>
                            <td className="p-2">{r.name}</td>
                            <td className="p-2">{formatCentsARS(r.priceCents!)}</td>
                            <td className="p-2">{r.stock}</td>
                            <td className="p-2 text-muted-foreground">{r.category ?? "—"}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleImport} disabled={isPending || rows.length === 0 || errorRows.length > 0}>
            {isPending ? "Guardando..." : `Guardar ${validRows.length} producto(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
