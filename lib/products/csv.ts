export type ParsedProductRow = {
  lineNumber: number;
  name?: string;
  priceCents?: number;
  stock?: number;
  category?: string;
  error?: string;
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      result.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

/** Parsea un CSV con columnas nombre,precio,stock,categoria (encabezado obligatorio, orden de columnas libre). */
export function parseProductsCsv(text: string): ParsedProductRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("nombre");
  const priceIdx = header.indexOf("precio");
  const stockIdx = header.indexOf("stock");
  const categoryIdx = header.indexOf("categoria");

  return lines.slice(1).map((line, i) => {
    const cells = parseCsvLine(line);
    const row: ParsedProductRow = { lineNumber: i + 2 };

    const name = nameIdx >= 0 ? cells[nameIdx]?.trim() : undefined;
    const priceRaw = priceIdx >= 0 ? cells[priceIdx]?.trim() : undefined;
    const stockRaw = stockIdx >= 0 ? cells[stockIdx]?.trim() : undefined;
    const category = categoryIdx >= 0 ? cells[categoryIdx]?.trim() : undefined;

    if (!name) {
      row.error = "Falta el nombre";
      return row;
    }
    const price = Number((priceRaw ?? "").replace(",", "."));
    if (!priceRaw || Number.isNaN(price) || price < 0) {
      row.error = `Precio inválido: "${priceRaw ?? ""}"`;
      return row;
    }
    const stock = stockRaw ? Number(stockRaw) : 0;
    if (Number.isNaN(stock) || stock < 0) {
      row.error = `Stock inválido: "${stockRaw ?? ""}"`;
      return row;
    }

    row.name = name;
    row.priceCents = Math.round(price * 100);
    row.stock = Math.round(stock);
    row.category = category || undefined;
    return row;
  });
}

export const PRODUCTS_CSV_TEMPLATE = `nombre,precio,stock,categoria
Pelotas Head x3,10000,20,pelotas
Gatorade 500ml,4000,50,bebidas
Grip Head,6000,15,accesorios
`;
