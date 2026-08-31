type PaymentLike = { amountCents: number; status: string; type: string };

/** Total efectivamente cobrado de una reserva (seña + pagos posteriores), excluyendo reembolsos. */
export function sumPaidCents(payments: PaymentLike[]): number {
  return payments
    .filter((p) => p.status === "APPROVED" && p.type !== "REFUND")
    .reduce((sum, p) => sum + p.amountCents, 0);
}

/** Saldo pendiente de una reserva: lo que falta cobrar además de la seña. */
export function balanceDueCents(totalPriceCents: number, payments: PaymentLike[]): number {
  return Math.max(0, totalPriceCents - sumPaidCents(payments));
}
