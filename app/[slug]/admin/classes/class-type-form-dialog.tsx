"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { createClassTypeAction, updateClassTypeAction } from "./actions";
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

const LEVEL_LABEL: Record<string, string> = {
  ANY: "Cualquier nivel",
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
};
const MODALITY_LABEL: Record<string, string> = { GROUP: "Grupal", INDIVIDUAL: "Individual" };

type ExistingClassType = {
  id: string;
  name: string;
  level: string;
  modality: string;
  defaultDurationMinutes: number;
  defaultCapacity: number;
  defaultPriceCents: number;
};

export function ClassTypeFormDialog({
  tenantSlug,
  classType,
}: {
  tenantSlug: string;
  /** Si se pasa, el diálogo edita este tipo de clase en vez de crear uno nuevo. */
  classType?: ExistingClassType;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(classType);

  const [level, setLevel] = useState(classType?.level ?? "ANY");
  const [modality, setModality] = useState(classType?.modality ?? "GROUP");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateClassTypeAction(tenantSlug, classType!.id, formData)
        : await createClassTypeAction(tenantSlug, formData);
      if (result.ok) {
        toast.success(isEdit ? "Tipo de clase actualizado." : "Tipo de clase creado.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="ghost" size="icon-sm" aria-label="Editar tipo de clase" className="text-muted-foreground hover:text-foreground">
              <Pencil className="size-4" />
            </Button>
          ) : (
            <Button>Nuevo tipo de clase</Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar tipo de clase" : "Nuevo tipo de clase"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required defaultValue={classType?.name} placeholder="Grupal nivel 3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="level">Nivel</Label>
              <Select name="level" value={level} onValueChange={(v) => v && setLevel(v)}>
                <SelectTrigger id="level"><SelectValue>{LEVEL_LABEL[level]}</SelectValue></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="modality">Modalidad</Label>
              <Select name="modality" value={modality} onValueChange={(v) => v && setModality(v)}>
                <SelectTrigger id="modality"><SelectValue>{MODALITY_LABEL[modality]}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GROUP">Grupal</SelectItem>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="defaultDurationMinutes">Duración (min)</Label>
              <Input
                id="defaultDurationMinutes"
                name="defaultDurationMinutes"
                type="number"
                min={15}
                max={240}
                step={15}
                required
                defaultValue={classType?.defaultDurationMinutes ?? 60}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="defaultCapacity">Cupo</Label>
              <Input
                id="defaultCapacity"
                name="defaultCapacity"
                type="number"
                min={1}
                max={30}
                required
                defaultValue={classType?.defaultCapacity ?? 4}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultPriceARS">Precio por alumno (ARS)</Label>
            <Input
              id="defaultPriceARS"
              name="defaultPriceARS"
              type="number"
              min={0}
              step={100}
              required
              defaultValue={classType ? classType.defaultPriceCents / 100 : undefined}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear tipo de clase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
