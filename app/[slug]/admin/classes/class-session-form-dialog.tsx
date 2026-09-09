"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClassSessionAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClassTypeOption = {
  id: string;
  name: string;
  defaultDurationMinutes: number;
  defaultCapacity: number;
  defaultPriceCents: number;
};

export function ClassSessionFormDialog({
  tenantSlug,
  classTypes,
  instructors,
  courts,
}: {
  tenantSlug: string;
  classTypes: ClassTypeOption[];
  instructors: { id: string; name: string }[];
  courts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [classTypeId, setClassTypeId] = useState(classTypes[0]?.id ?? "");
  const [instructorId, setInstructorId] = useState(instructors[0]?.id ?? "");
  const [courtId, setCourtId] = useState("NONE");
  const [durationMinutes, setDurationMinutes] = useState(classTypes[0]?.defaultDurationMinutes ?? 60);
  const [capacity, setCapacity] = useState(classTypes[0]?.defaultCapacity ?? 4);
  const [priceARS, setPriceARS] = useState(classTypes[0] ? String(classTypes[0].defaultPriceCents / 100) : "");

  const selectedClassType = classTypes.find((c) => c.id === classTypeId);
  const instructorLabel = instructors.find((i) => i.id === instructorId)?.name ?? "Elegí un instructor";
  const courtLabel = courtId === "NONE" ? "Sin cancha asignada" : courts.find((c) => c.id === courtId)?.name ?? "Sin cancha asignada";

  function handleClassTypeChange(value: string | null) {
    if (!value) return;
    setClassTypeId(value);
    const ct = classTypes.find((c) => c.id === value);
    if (ct) {
      setDurationMinutes(ct.defaultDurationMinutes);
      setCapacity(ct.defaultCapacity);
      setPriceARS(String(ct.defaultPriceCents / 100));
    }
  }

  function handleSubmit(formData: FormData) {
    const startLocal = String(formData.get("startTimeLocal") || "");
    if (!startLocal) {
      toast.error("Elegí día y hora de inicio.");
      return;
    }
    const startDate = new Date(startLocal);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);

    formData.set("classTypeId", classTypeId);
    formData.set("instructorId", instructorId);
    formData.set("courtId", courtId);
    formData.set("capacity", String(capacity));
    formData.set("priceARS", priceARS);
    formData.set("startTime", startDate.toISOString());
    formData.set("endTime", endDate.toISOString());

    startTransition(async () => {
      const result = await createClassSessionAction(tenantSlug, formData);
      if (result.ok) {
        toast.success("Sesión creada.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={classTypes.length === 0 || instructors.length === 0}>Nueva sesión</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva sesión de clase</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="classTypeId">Tipo de clase</Label>
            <Select name="classTypeId" value={classTypeId} onValueChange={handleClassTypeChange}>
              <SelectTrigger id="classTypeId"><SelectValue>{selectedClassType?.name ?? "Elegí un tipo de clase"}</SelectValue></SelectTrigger>
              <SelectContent>
                {classTypes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instructorId">Instructor</Label>
            <Select name="instructorId" value={instructorId} onValueChange={(v) => v && setInstructorId(v)}>
              <SelectTrigger id="instructorId"><SelectValue>{instructorLabel}</SelectValue></SelectTrigger>
              <SelectContent>
                {instructors.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="courtId">Cancha (opcional)</Label>
            <Select name="courtId" value={courtId} onValueChange={(v) => v && setCourtId(v)}>
              <SelectTrigger id="courtId"><SelectValue>{courtLabel}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Sin cancha asignada</SelectItem>
                {courts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startTimeLocal">Día y hora de inicio</Label>
            <Input id="startTimeLocal" name="startTimeLocal" type="datetime-local" required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="durationMinutes">Duración (min)</Label>
              <Input
                id="durationMinutes"
                type="number"
                min={15}
                max={240}
                step={15}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="capacity">Cupo</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={30}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priceARS">Precio (ARS)</Label>
              <Input
                id="priceARS"
                type="number"
                min={0}
                step={100}
                value={priceARS}
                onChange={(e) => setPriceARS(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input id="notes" name="notes" placeholder="Traer paletas, clase de prueba, etc." />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Crear sesión"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
