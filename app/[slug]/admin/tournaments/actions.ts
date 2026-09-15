"use server";

import { revalidatePath } from "next/cache";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { requireTenantRole } from "@/lib/auth/guards";
import {
  createTournament,
  updateTournamentStatus,
  createCategory,
  registerTeam,
  registerParticipant,
  generateSingleEliminationFixture,
  generateGroupStage,
  generateKnockoutFromGroups,
  generateAmericanoRound,
  recordMatchResult,
  updateMatchSchedule,
} from "@/lib/tournaments/service";
import {
  tournamentSchema,
  tournamentCategorySchema,
  tournamentTeamSchema,
  tournamentParticipantSchema,
  tournamentMatchResultSchema,
} from "@/lib/validation/schemas";
import type { ActionResult } from "@/app/actions/booking";

// ---------------------------------------------------------------------------
// Torneos
// ---------------------------------------------------------------------------

export async function createTournamentAction(
  tenantSlug: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  const actor = await requireTenantRole(tenant.id, ["ADMIN"]);

  const feeARS = formData.get("registrationFeeARS");
  const maxTeams = formData.get("maxTeamsPerCategory");
  const parsed = tournamentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    format: formData.get("format"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    registrationFeeCents: feeARS ? Number(feeARS) * 100 : 0,
    maxTeamsPerCategory: maxTeams || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const tournament = await createTournament(tenant.id, parsed.data, actor.id);
  revalidatePath(`/${tenantSlug}/admin/tournaments`);
  return { ok: true, data: { id: tournament.id } };
}

export async function updateTournamentStatusAction(
  tenantSlug: string,
  tournamentId: string,
  status: "DRAFT" | "REGISTRATION_OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  await updateTournamentStatus(tenant.id, tournamentId, status);
  revalidatePath(`/${tenantSlug}/admin/tournaments`);
  revalidatePath(`/${tenantSlug}/admin/tournaments/${tournamentId}`);
  return { ok: true, data: { id: tournamentId } };
}

export async function createCategoryAction(
  tenantSlug: string,
  tournamentId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  const parsed = tournamentCategorySchema.safeParse({
    tournamentId,
    name: formData.get("name"),
    maxTeams: formData.get("maxTeams") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const category = await createCategory(tenant.id, parsed.data);
  revalidatePath(`/${tenantSlug}/admin/tournaments/${tournamentId}`);
  return { ok: true, data: { id: category.id } };
}

// ---------------------------------------------------------------------------
// Inscripciones
// ---------------------------------------------------------------------------

export async function registerTeamAction(
  tenantSlug: string,
  tournamentId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  const parsed = tournamentTeamSchema.safeParse({
    categoryId: formData.get("categoryId"),
    player1Name: formData.get("player1Name"),
    player1Phone: formData.get("player1Phone") || undefined,
    player2Name: formData.get("player2Name"),
    player2Phone: formData.get("player2Phone") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const team = await registerTeam(tenant.id, parsed.data);
  revalidatePath(`/${tenantSlug}/admin/tournaments/${tournamentId}`);
  return { ok: true, data: { id: team.id } };
}

export async function registerParticipantAction(
  tenantSlug: string,
  tournamentId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  const parsed = tournamentParticipantSchema.safeParse({
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const participant = await registerParticipant(tenant.id, parsed.data);
  revalidatePath(`/${tenantSlug}/admin/tournaments/${tournamentId}`);
  return { ok: true, data: { id: participant.id } };
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

export async function generateSingleEliminationFixtureAction(
  tenantSlug: string,
  tournamentId: string,
  categoryId: string,
): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  try {
    await generateSingleEliminationFixture(tenant.id, categoryId);
    revalidatePath(`/${tenantSlug}/admin/tournaments/${tournamentId}`);
    return { ok: true, data: { ok: true } };
  } catch (err) {
    console.error(err);
    return { ok: false, error: err instanceof Error ? err.message : "No pudimos generar el cuadro." };
  }
}

export async function generateGroupStageAction(
  tenantSlug: string,
  tournamentId: string,
  categoryId: string,
  numGroups?: number,
): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  try {
    await generateGroupStage(tenant.id, categoryId, numGroups);
    revalidatePath(`/${tenantSlug}/admin/tournaments/${tournamentId}`);
    return { ok: true, data: { ok: true } };
  } catch (err) {
    console.error(err);
    return { ok: false, error: err instanceof Error ? err.message : "No pudimos armar los grupos." };
  }
}

export async function generateKnockoutFromGroupsAction(
  tenantSlug: string,
  tournamentId: string,
  categoryId: string,
  qualifiersPerGroup?: number,
): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  try {
    await generateKnockoutFromGroups(tenant.id, categoryId, qualifiersPerGroup);
    revalidatePath(`/${tenantSlug}/admin/tournaments/${tournamentId}`);
    return { ok: true, data: { ok: true } };
  } catch (err) {
    console.error(err);
    return { ok: false, error: err instanceof Error ? err.message : "No pudimos generar el cuadro de eliminación." };
  }
}

export async function generateAmericanoRoundAction(
  tenantSlug: string,
  tournamentId: string,
  categoryId: string,
): Promise<ActionResult<{ ok: true }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN"]);

  try {
    await generateAmericanoRound(tenant.id, categoryId);
    revalidatePath(`/${tenantSlug}/admin/tournaments/${tournamentId}`);
    return { ok: true, data: { ok: true } };
  } catch (err) {
    console.error(err);
    return { ok: false, error: err instanceof Error ? err.message : "No pudimos generar la ronda." };
  }
}

export async function updateMatchScheduleAction(
  tenantSlug: string,
  tournamentId: string,
  matchId: string,
  data: { scheduledAtLocal?: string; courtId?: string | null },
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  await updateMatchSchedule(tenant.id, matchId, {
    ...(data.scheduledAtLocal !== undefined
      ? { scheduledAt: data.scheduledAtLocal ? new Date(data.scheduledAtLocal) : null }
      : {}),
    ...(data.courtId !== undefined ? { courtId: data.courtId } : {}),
  });
  revalidatePath(`/${tenantSlug}/admin/tournaments/${tournamentId}`);
  revalidatePath(`/${tenantSlug}/torneos/${tournamentId}`);
  return { ok: true, data: { id: matchId } };
}

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------

export async function recordMatchResultAction(
  tenantSlug: string,
  tournamentId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const tenant = await resolveTenantBySlug(tenantSlug);
  await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);

  const parsed = tournamentMatchResultSchema.safeParse({
    matchId: formData.get("matchId"),
    scoreA: JSON.parse(String(formData.get("scoreA") || "[]")),
    scoreB: JSON.parse(String(formData.get("scoreB") || "[]")),
    winnerTeamId: formData.get("winnerTeamId"),
    walkover: formData.get("walkover") === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const match = await recordMatchResult(tenant.id, parsed.data);
  revalidatePath(`/${tenantSlug}/admin/tournaments/${tournamentId}`);
  return { ok: true, data: { id: match.id } };
}
