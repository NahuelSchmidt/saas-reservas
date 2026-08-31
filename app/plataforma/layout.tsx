import { redirect } from "next/navigation";
import { requireSuperAdmin, ForbiddenError, UnauthorizedError } from "@/lib/auth/guards";
import { SignOutButton } from "@/components/sign-out-button";

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
        <span className="text-lg font-semibold tracking-tight">Sistema Padel — Plataforma</span>
        <SignOutButton />
      </div>
      {children}
    </div>
  );
}
