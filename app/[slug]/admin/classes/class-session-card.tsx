"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { cancelClassSessionAction, cancelEnrollmentAction, registerClassPaymentAction } from "./actions";
import { formatCentsARS } from "@/lib/availability/engine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EnrollStudentDialog } from "./enroll-student-dialog";

const LEVEL_LABEL: Record<string, string> = {
  ANY: "Cualquier nivel",
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
};

export type ClassSessionCardData = {
  id: string;
  startTime: Date;
  endTime: Date;
  capacity: number;
  priceCents: number;
  status: string;
  notes: string | null;
  classType: { name: string; level: string };
  instructor: { name: string };
  court: { name: string } | null;
  enrollments: {
    id: string;
    studentName: string;
    studentPhone: string | null;
    priceCents: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string | null;
    collectedBy: string | null;
  }[];
};

export function ClassSessionCard({ tenantSlug, session }: { tenantSlug: string; session: ClassSessionCardData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const spotsLeft = Math.max(0, session.capacity - session.enrollments.length);
  const timeLabel = `${session.startTime.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" })} · ${session.startTime.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}–${session.endTime.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;

  function cancelSession() {
    if (!confirm("¿Cancelar esta sesión? Se cancelan también las inscripciones.")) return;
    startTransition(async () => {
      const result = await cancelClassSessionAction(tenantSlug, session.id);
      if (result.ok) {
        toast.success("Sesión cancelada.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function cancelEnrollment(enrollmentId: string) {
    if (!confirm("¿Cancelar la inscripción de este alumno?")) return;
    startTransition(async () => {
      const result = await cancelEnrollmentAction(tenantSlug, enrollmentId);
      if (result.ok) {
        toast.success("Inscripción cancelada.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function registerPayment(enrollmentId: string, combined: unknown) {
    if (typeof combined !== "string" || !combined) return;
    const [method, collectedBy] = combined.split(":");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("enrollmentId", enrollmentId);
      formData.set("method", method);
      formData.set("collectedBy", collectedBy);
      const result = await registerClassPaymentAction(tenantSlug, formData);
      if (result.ok) {
        toast.success("Pago registrado.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="gap-4 border-border/60 py-6 shadow-sm">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-heading text-lg font-bold capitalize">{timeLabel}</span>
            <p className="text-xs text-muted-foreground">
              {session.classType.name} · {LEVEL_LABEL[session.classType.level]} · Profe {session.instructor.name}
              {session.court && ` · ${session.court.name}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={spotsLeft === 0 ? "destructive" : "secondary"}>
              {session.enrollments.length}/{session.capacity} cupo
            </Badge>
            <Button variant="ghost" size="icon-sm" aria-label="Cancelar sesión" disabled={isPending} onClick={cancelSession}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatCentsARS(session.priceCents)} por alumno{session.notes && ` · ${session.notes}`}</span>
          <EnrollStudentDialog tenantSlug={tenantSlug} classSessionId={session.id} disabled={spotsLeft === 0} />
        </div>

        {session.enrollments.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t pt-3">
            {session.enrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <div>
                  <span className="font-medium">{e.studentName}</span>
                  {e.studentPhone && <span className="ml-1.5 text-xs text-muted-foreground">{e.studentPhone}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  {e.paymentStatus === "PAID" ? (
                    <Badge variant="default">
                      Pagó{e.paymentMethod ? ` (${e.paymentMethod === "CASH" ? "efectivo" : e.paymentMethod === "TRANSFER" ? "transferencia" : "MP"}${e.collectedBy === "INSTRUCTOR" ? " · al profe" : ""})` : ""}
                    </Badge>
                  ) : (
                    <Select onValueChange={(v) => registerPayment(e.id, v)} disabled={isPending}>
                      <SelectTrigger size="sm" className="w-40"><SelectValue placeholder="Registrar pago" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Cobrado en el club</SelectLabel>
                          <SelectItem value="CASH:CLUB">Efectivo</SelectItem>
                          <SelectItem value="TRANSFER:CLUB">Transferencia</SelectItem>
                          <SelectItem value="MERCADOPAGO:CLUB">Mercado Pago</SelectItem>
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Pagó directo al profe</SelectLabel>
                          <SelectItem value="CASH:INSTRUCTOR">Efectivo</SelectItem>
                          <SelectItem value="TRANSFER:INSTRUCTOR">Transferencia</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Cancelar inscripción"
                    disabled={isPending}
                    onClick={() => cancelEnrollment(e.id)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
