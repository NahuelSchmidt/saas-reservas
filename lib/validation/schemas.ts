import { z } from "zod";

export const courtSchema = z.object({
  name: z.string().min(1, "Requerido").max(60),
  type: z.enum(["SINGLES", "DOUBLES"]),
  surface: z.string().max(60).optional(),
  location: z.enum(["INDOOR", "OUTDOOR", "PANORAMIC", "COVERED"]),
  hasLighting: z.boolean().default(false),
  capacity: z.coerce.number().int().min(1).max(8),
  photos: z.array(z.string().url()).default([]),
  status: z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"]).default("ACTIVE"),
});
export type CourtInput = z.infer<typeof courtSchema>;

export const productSchema = z.object({
  name: z.string().min(1, "Requerido").max(80),
  priceCents: z.coerce.number().int().nonnegative(),
  stock: z.coerce.number().int().min(0),
  category: z.string().max(60).optional(),
});
export type ProductInput = z.infer<typeof productSchema>;

export const businessHoursSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
});
export type BusinessHoursInput = z.infer<typeof businessHoursSchema>;

export const pricingRuleSchema = z
  .object({
    courtId: z.string().nullable(),
    dayOfWeek: z.coerce.number().int().min(0).max(6).nullable(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    clientType: z.enum(["MEMBER", "NON_MEMBER", "ANY"]).default("ANY"),
    priceCents: z.coerce.number().int().positive(),
  })
  .refine((r) => r.startTime < r.endTime, {
    message: "El horario de inicio debe ser anterior al de fin",
    path: ["endTime"],
  });
export type PricingRuleInput = z.infer<typeof pricingRuleSchema>;

export const createBookingSchema = z.object({
  courtId: z.string().min(1),
  startTime: z.coerce.date(),
  notes: z.string().max(500).optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// Reserva pública sin cuenta: solo nombre y teléfono, sin login.
export const guestBookingSchema = createBookingSchema.extend({
  playerName: z.string().min(1, "Requerido").max(80),
  playerPhone: z.string().min(6, "Ingresá un teléfono válido").max(30),
});
export type GuestBookingInput = z.infer<typeof guestBookingSchema>;

export const manualBookingSchema = createBookingSchema.extend({
  endTime: z.coerce.date(),
  playerEmail: z.string().email(),
  playerName: z.string().min(1),
  totalPriceCents: z.coerce.number().int().nonnegative(),
  markDepositPaid: z.boolean().default(false),
  depositMethod: z.enum(["CASH", "TRANSFER"]).default("CASH"),
});
export type ManualBookingInput = z.infer<typeof manualBookingSchema>;

export const recurringBookingSchema = z.object({
  courtId: z.string().min(1),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  playerEmail: z.string().email(),
  playerName: z.string().min(1),
  priceCents: z.coerce.number().int().nonnegative(),
});
export type RecurringBookingInput = z.infer<typeof recurringBookingSchema>;

export const closeCashRegisterSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  countedCashCents: z.coerce.number().int().nonnegative(),
  notes: z.string().max(500).optional(),
});
export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterSchema>;

export const registerPaymentSchema = z.object({
  bookingId: z.string().min(1),
  amountCents: z.coerce.number().int().positive(),
  method: z.enum(["CASH", "TRANSFER"]),
  note: z.string().max(200).optional(),
});
export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;

export const registerSchema = z.object({
  name: z.string().min(1, "Requerido").max(80),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const cancelBookingSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().max(500).optional(),
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

export const tenantOnboardingSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  adminEmail: z.string().email(),
  adminName: z.string().min(1),
  adminPassword: z.string().min(6, "Mínimo 6 caracteres"),
});
export type TenantOnboardingInput = z.infer<typeof tenantOnboardingSchema>;

export const cancellationPolicySchema = z.object({
  hoursBeforeFullRefund: z.coerce.number().int().min(0).max(168),
  hoursBeforePartialRefund: z.coerce.number().int().min(0).max(168),
  partialRefundPct: z.coerce.number().int().min(0).max(100),
});
export type CancellationPolicyInput = z.infer<typeof cancellationPolicySchema>;

export const bookingConfigSchema = z.object({
  slotDurationMinutes: z.coerce.number().int().refine((v) => [60, 90, 120].includes(v), {
    message: "Debe ser 60, 90 o 120 minutos",
  }),
  minAdvanceMinutes: z.coerce.number().int().min(0),
  maxAdvanceDays: z.coerce.number().int().min(1).max(90),
  depositRequired: z.boolean(),
  depositIsPercentage: z.boolean(),
  depositValue: z.coerce.number().int().positive(),
});
export type BookingConfigInput = z.infer<typeof bookingConfigSchema>;
