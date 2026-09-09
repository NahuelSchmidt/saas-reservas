"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { enrollStudentAction } from "./actions";
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

export function EnrollStudentDialog({
  tenantSlug,
  classSessionId,
  disabled,
}: {
  tenantSlug: string;
  classSessionId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("classSessionId", classSessionId);
    startTransition(async () => {
      const result = await enrollStudentAction(tenantSlug, formData);
      if (result.ok) {
        toast.success("Alumno anotado.");
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
          <Button variant="outline" size="sm" disabled={disabled}>
            <UserPlus className="size-3.5" /> Anotar alumno
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anotar alumno</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="studentName">Nombre</Label>
            <Input id="studentName" name="studentName" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="studentPhone">Teléfono</Label>
            <Input id="studentPhone" name="studentPhone" type="tel" required placeholder="11 2345 6789" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>{isPending ? "Anotando..." : "Anotar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
