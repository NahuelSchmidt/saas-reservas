"use client";

import { useState, type ReactNode } from "react";

/**
 * El "fixture" (pestaña Cuadro) muestra TODOS los partidos de punta a punta —
 * fase de grupos y eliminación directa — para que se vea de corrido quién
 * jugó contra quién. La tabla de posiciones por grupo (que es lo que antes
 * ensuciaba esa vista) queda aparte, en la pestaña Posiciones.
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
          Posiciones
        </button>
      </div>
      {tab === "bracket" ? bracket : groups}
    </div>
  );
}
