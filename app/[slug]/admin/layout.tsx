import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, CalendarDays, LandPlot, Tags, Package, Settings } from "lucide-react";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { requireTenantRole, ForbiddenError, UnauthorizedError } from "@/lib/auth/guards";

const NAV_ITEMS = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/courts", label: "Canchas", icon: LandPlot },
  { href: "/pricing", label: "Precios", icon: Tags },
  { href: "/products", label: "Productos", icon: Package },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export default async function TenantAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);

  try {
    await requireTenantRole(tenant.id, ["ADMIN", "EMPLOYEE"]);
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect(`/login?callbackUrl=/${slug}/admin`);
    if (err instanceof ForbiddenError) redirect(`/${slug}`);
    throw err;
  }

  return (
    <div className="flex flex-1">
      <aside className="w-56 shrink-0 border-r px-4 py-6">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={`/${slug}/admin${item.href}`}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col px-6 py-6 sm:px-10">{children}</div>
    </div>
  );
}
