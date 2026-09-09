"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { registerTeamAction, registerParticipantAction } from "../actions";
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

/** AMERICANO inscribe jugadores sueltos; los otros dos formatos inscriben parejas fijas. */
export function RegisterDialog({
  tenantSlug,
  tournamentId,
  categoryId,
  isAmericano,
}: {
  tenantSlug: string;
  tournamentId: string;
  categoryId: string;
  isAmericano: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("categoryId", categoryId);
    startTransition(async () => {
      const result = isAmericano
        ? await registerParticipantAction(tenantSlug, tournamentId, formData)
        : await registerTeamAction(tenantSlug, tournamentId, formData);
      if (result.ok) {
        toast.success(isAmericano ? "Jugador inscripto." : "Pareja inscripta.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm">{isAmericano ? "Inscribir jugador" : "Inscribir pareja"}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isAmericano ? "Inscribir jugador" : "Inscribir pareja"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-3">
          {isAmericano ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input id="phone" name="phone" type="tel" placeholder="11 2345 6789" />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="player1Name">Jugador 1</Label>
                <Input id="player1Name" name="player1Name" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="player1Phone">Teléfono jugador 1 (opcional)</Label>
                <Input id="player1Phone" name="player1Phone" type="tel" placeholder="11 2345 6789" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="player2Name">Jugador 2</Label>
                <Input id="player2Name" name="player2Name" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="player2Phone">Teléfono jugador 2 (opcional)</Label>
                <Input id="player2Phone" name="player2Phone" type="tel" placeholder="11 2345 6789" />
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>{isPending ? "Inscribiendo..." : "Inscribir"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
