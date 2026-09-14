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

// FormData manda "" o no manda la clave cuando un campo numérico opcional
// queda vacío; z.coerce.number() convertiría eso en 0 (y rompería
// .positive()), así que primero lo normalizamos a undefined.
const optionalPositiveCents = z.preprocess(
  (v) => (v === null || v === "" || v === undefined ? undefined : v),
  z.coerce.number().int().positive().optional(),
);

export const pricingRuleSchema = z
  .object({
    courtId: z.string().nullable(),
    dayOfWeek: z.coerce.number().int().min(0).max(6).nullable(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    clientType: z.enum(["MEMBER", "NON_MEMBER", "ANY"]).default("ANY"),
    priceCents: z.coerce.number().int().positive(),
    cashQuarterPriceCents: optionalPositiveCents,
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
  playerPhone: z.string().min(6, "Ingresá un teléfono válido").max(30),
  playerName: z.string().min(1),
  totalPriceCents: z.coerce.number().int().nonnegative(),
  markDepositPaid: z.boolean().default(false),
  depositMethod: z.enum(["CASH", "TRANSFER"]).default("CASH"),
  cashQuarterPriceCents: optionalPositiveCents,
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

export const staffInviteSchema = z.object({
  name: z.string().min(1, "Requerido").max(80),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  role: z.enum(["ADMIN", "EMPLOYEE", "INSTRUCTOR"]),
});
export type StaffInviteInput = z.infer<typeof staffInviteSchema>;

export const staffUpdateSchema = z.object({
  name: z.string().min(1, "Requerido").max(80),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres").optional(),
});
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;

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

// ---------------------------------------------------------------------------
// Clases
// ---------------------------------------------------------------------------

export const instructorSchema = z.object({
  name: z.string().min(1, "Requerido").max(80),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  bio: z.string().max(500).optional(),
  commissionPct: z.preprocess(
    (v) => (v === null || v === "" || v === undefined ? undefined : v),
    z.coerce.number().int().min(0).max(100).optional(),
  ),
  userId: z.string().optional().or(z.literal("")), // set = instructor es staff interno
  active: z.boolean().default(true),
});
export type InstructorInput = z.infer<typeof instructorSchema>;

export const classTypeSchema = z.object({
  name: z.string().min(1, "Requerido").max(80),
  level: z.enum(["ANY", "BEGINNER", "INTERMEDIATE", "ADVANCED"]).default("ANY"),
  modality: z.enum(["GROUP", "INDIVIDUAL"]).default("GROUP"),
  defaultDurationMinutes: z.coerce.number().int().min(15).max(240),
  defaultCapacity: z.coerce.number().int().min(1).max(30),
  defaultPriceCents: z.coerce.number().int().positive(),
  active: z.boolean().default(true),
});
export type ClassTypeInput = z.infer<typeof classTypeSchema>;

export const classSessionSchema = z
  .object({
    classTypeId: z.string().min(1),
    instructorId: z.string().min(1),
    courtId: z.string().optional().or(z.literal("")),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    capacity: z.coerce.number().int().min(1).max(30),
    priceCents: z.coerce.number().int().positive(),
    notes: z.string().max(500).optional(),
  })
  .refine((s) => s.startTime < s.endTime, {
    message: "El horario de inicio debe ser anterior al de fin",
    path: ["endTime"],
  });
export type ClassSessionInput = z.infer<typeof classSessionSchema>;

// Inscripción a una clase suelta: se cobra por sesión, no hay cuenta previa
// necesaria (mismo criterio que guestBookingSchema).
export const classEnrollmentSchema = z.object({
  classSessionId: z.string().min(1),
  studentName: z.string().min(1, "Requerido").max(80),
  studentPhone: z.string().min(6, "Ingresá un teléfono válido").max(30),
});
export type ClassEnrollmentInput = z.infer<typeof classEnrollmentSchema>;

export const registerClassPaymentSchema = z.object({
  enrollmentId: z.string().min(1),
  method: z.enum(["CASH", "TRANSFER", "MERCADOPAGO"]),
  collectedBy: z.enum(["CLUB", "INSTRUCTOR"]),
});
export type RegisterClassPaymentInput = z.infer<typeof registerClassPaymentSchema>;

// ---------------------------------------------------------------------------
// Torneos
// ---------------------------------------------------------------------------

export const tournamentSchema = z
  .object({
    name: z.string().min(1, "Requerido").max(120),
    description: z.string().max(1000).optional(),
    format: z.enum(["SINGLE_ELIMINATION", "GROUPS_KNOCKOUT", "AMERICANO"]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    registrationFeeCents: z.coerce.number().int().nonnegative().default(0),
    maxTeamsPerCategory: z.preprocess(
      (v) => (v === null || v === "" || v === undefined ? undefined : v),
      z.coerce.number().int().positive().optional(),
    ),
  })
  .refine((t) => !t.endDate || t.startDate <= t.endDate, {
    message: "La fecha de fin debe ser posterior a la de inicio",
    path: ["endDate"],
  });
export type TournamentInput = z.infer<typeof tournamentSchema>;

export const tournamentCategorySchema = z.object({
  tournamentId: z.string().min(1),
  name: z.string().min(1, "Requerido").max(80),
  maxTeams: z.preprocess(
    (v) => (v === null || v === "" || v === undefined ? undefined : v),
    z.coerce.number().int().positive().optional(),
  ),
});
export type TournamentCategoryInput = z.infer<typeof tournamentCategorySchema>;

// Inscripción de una pareja fija (SINGLE_ELIMINATION / GROUPS_KNOCKOUT). Para
// AMERICANO se usa tournamentParticipantSchema (jugador suelto, sin pareja).
export const tournamentTeamSchema = z.object({
  categoryId: z.string().min(1),
  player1Name: z.string().min(1, "Requerido").max(80),
  player1Phone: z.string().max(30).optional(),
  player2Name: z.string().min(1, "Requerido").max(80),
  player2Phone: z.string().max(30).optional(),
});
export type TournamentTeamInput = z.infer<typeof tournamentTeamSchema>;

export const tournamentParticipantSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1, "Requerido").max(80),
  phone: z.string().max(30).optional(),
});
export type TournamentParticipantInput = z.infer<typeof tournamentParticipantSchema>;

// Resultado de un partido en sets: [[6,4],[3,6],[10,7]] (el tercer set puede
// ser un súper tie-break). Se manda como JSON desde el form.
const setScoreArray = z.array(z.coerce.number().int().min(0).max(99)).min(1).max(5);

export const tournamentMatchResultSchema = z.object({
  matchId: z.string().min(1),
  scoreA: setScoreArray,
  scoreB: setScoreArray,
  winnerTeamId: z.string().min(1),
  walkover: z.boolean().default(false),
});
export type TournamentMatchResultInput = z.infer<typeof tournamentMatchResultSchema>;
