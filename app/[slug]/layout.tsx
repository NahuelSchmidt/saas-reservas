import Link from "next/link";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { auth } from "@/lib/auth/config";
import { doSignOut } from "@/app/actions/auth";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  const session = await auth();
  const isStaff = session?.user?.memberships.some((m) => m.tenantId === tenant.id);

  return (
    <div
      className="flex flex-1 flex-col"
      style={
        {
          "--primary": tenant.primaryColor ?? undefined,
          "--secondary": tenant.secondaryColor ?? undefined,
        } as React.CSSProperties
      }
    >
      <header className="bg-gradient-to-r from-primary via-primary to-secondary px-6 py-4 text-white sm:px-10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Link href={`/${tenant.slug}`} className="flex items-center gap-2.5">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt={tenant.name} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm font-bold backdrop-blur-sm">
                {tenant.name.charAt(0)}
              </span>
            )}
            <span className="font-heading text-lg font-bold tracking-tight">{tenant.name}</span>
          </Link>
          <nav className="flex items-center gap-2">
            {isStaff && (
              <Link
                href={`/${tenant.slug}/admin`}
                className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                Panel del complejo
              </Link>
            )}
            {session?.user ? (
              <>
                <span className="hidden text-sm text-white/80 sm:inline">{session.user.email}</span>
                <form action={doSignOut}>
                  <button
                    type="submit"
                    className="rounded-full px-4 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Cerrar sesión
                  </button>
                </form>
              </>
            ) : (
              <Link
                href={`/login?callbackUrl=/${tenant.slug}`}
                className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-white/90"
              >
                Ingresar
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
