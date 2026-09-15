import { redirect } from "next/navigation";
import { requireSuperAdmin, ForbiddenError, UnauthorizedError } from "@/lib/auth/guards";
import { SignOutButton } from "@/components/sign-out-button";
import { SportNexLogotype } from "@/components/brand/sportnex-logotype";

export default async function PlataformaLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireSuperAdmin();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect("/login?callbackUrl=/plataforma");
    if (err instanceof ForbiddenError) redirect("/");
    throw err;
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-8 sm:px-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2" aria-label="SportNex — Plataforma">
          <SportNexLogotype size={20} />
          <span className="text-sm font-medium text-muted-foreground">— Plataforma</span>
        </div>
        <SignOutButton />
      </div>
      {children}
    </div>
  );
}
