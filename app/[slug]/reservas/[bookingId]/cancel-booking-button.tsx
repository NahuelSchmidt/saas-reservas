"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelBookingAction } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";

export function CancelBookingButton({ tenantSlug, bookingId }: { tenantSlug: string; bookingId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    if (!confirm("¿Seguro que querés cancelar esta reserva?")) return;
    startTransition(async () => {
      const result = await cancelBookingAction(tenantSlug, { bookingId });
      if (result.ok) {
        toast.success("Reserva cancelada.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button variant="destructive" onClick={handleCancel} disabled={isPending} className="mt-2">
      {isPending ? "Cancelando..." : "Cancelar reserva"}
    </Button>
  );
}
