"use client";

import { useState, type ReactNode } from "react";

/**
 * El "fixture" que la gente quiere ver de un vistazo es el cuadro de
 * eliminación (quién avanza a quién) — la fase de grupos es información de
 * soporte (tabla de posiciones + partidos de esa zona) que antes se
 * intercalaba arriba del cuadro y lo tapaba. Acá quedan como dos pestañas.
 */
export function CategoryViewTabs({
  defaultTab,
  bracket,
  groups,
}: {
  defaultTab: "bracket" | "groups";
  bracket: ReactNode;
  groups: ReactNode;
}) {
  const [tab, setTab] = useState<"bracket" | "groups">(defaultTab);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-fit gap-1 rounded-lg border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setTab("bracket")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "bracket" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Cuadro
        </button>
        <button
          type="button"
          onClick={() => setTab("groups")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "groups" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Ver grupos
        </button>
      </div>
      {tab === "bracket" ? bracket : groups}
    </div>
  );
}
