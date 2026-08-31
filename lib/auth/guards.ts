import { auth } from "@/lib/auth/config";

export class UnauthorizedError extends Error {
  constructor(message = "No autenticado") {
    super(message);
  }
}

export class ForbiddenError extends Error {
  constructor(message = "No autorizado") {
    super(message);
  }
}

/** Requiere sesión activa. Lanza UnauthorizedError si no hay usuario logueado. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session.user;
}

/** Requiere que el usuario sea Super Admin de la plataforma. */
export async function requireSuperAdmin() {
  const user = await requireUser();
  if (user.globalRole !== "SUPER_ADMIN") throw new ForbiddenError();
  return user;
}

/**
 * Requiere que el usuario tenga uno de los roles indicados dentro del
 * tenant dado. Super Admin siempre pasa (puede operar cualquier complejo).
 */
export async function requireTenantRole(
  tenantId: string,
  roles: Array<"ADMIN" | "EMPLOYEE">,
) {
  const user = await requireUser();
  if (user.globalRole === "SUPER_ADMIN") return user;

  const membership = user.memberships.find((m) => m.tenantId === tenantId);
  if (!membership || !roles.includes(membership.role as "ADMIN" | "EMPLOYEE")) {
    throw new ForbiddenError();
  }
  return user;
}
