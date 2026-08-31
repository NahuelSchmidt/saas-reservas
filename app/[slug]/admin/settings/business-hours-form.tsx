"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateBusinessHoursAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DAY_LABEL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type Hours = { dayOfWeek: number; openTime: string; closeTime: string }[];

export function BusinessHoursForm({ tenantSlug, hours }: { tenantSlug: string; hours: Hours }) {
  const [isPending, startTransition] = useTransition();
  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateBusinessHoursAction(tenantSlug, formData);
      if (result.ok) toast.success("Horarios guardados.");
      else toast.error(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-2">
      {DAY_LABEL.map((label, day) => (
        <div key={day} className="grid grid-cols-3 items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50">
          <span className="text-sm font-medium">{label}</span>
          <Input name={`openTime-${day}`} type="time" defaultValue={byDay.get(day)?.openTime ?? "08:00"} />
          <Input name={`closeTime-${day}`} type="time" defaultValue={byDay.get(day)?.closeTime ?? "23:00"} />
        </div>
      ))}
      <Button type="submit" disabled={isPending} className="mt-3 w-fit">
        {isPending ? "Guardando..." : "Guardar horarios"}
      </Button>
    </form>
  );
}
