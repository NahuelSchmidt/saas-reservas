import Link from "next/link";
import { CalendarCheck, CreditCard, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: CalendarCheck,
    title: "Calendario en tiempo real",
    description: "Disponibilidad por cancha y franja horaria, sin dobles reservas.",
  },
  {
    icon: CreditCard,
    title: "Cobro de seña online",
    description: "Integración con Mercado Pago para confirmar turnos al instante.",
  },
  {
    icon: Building2,
    title: "Multi-complejo",
    description: "Cada club tiene su propia URL, colores y administración aislada.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-6 py-4 text-white sm:px-10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <span className="font-heading text-lg font-bold tracking-tight">Sistema Padel</span>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-white/90"
            >
              Ingresar
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-24 sm:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,color-mix(in_oklch,var(--color-primary)_18%,transparent),transparent)]"
        />

        <div className="mx-auto flex w-full max-w-6xl flex-col items-center">
          <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Hecho para complejos de pádel
            </span>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Gestioná las reservas de tu complejo de pádel
            </h1>
            <p className="text-lg text-muted-foreground">
              Calendario, precios, cobro de seña y reportes en un solo lugar. Cada complejo con
              su propia página de reservas, lista en minutos.
            </p>
            <Button size="lg" className="mt-2 gap-2" nativeButton={false} render={<Link href="/login">Empezar ahora <ArrowRight className="size-4" /></Link>} />
          </div>

          <div className="mt-20 grid w-full gap-6 sm:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="border-border/60 py-8 shadow-sm">
                <CardHeader>
                  <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{f.description}</CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-16 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
            <p>¿Ya tenés un complejo con nosotros? Entrá a su página de reservas directamente:</p>
            <p className="font-mono text-foreground/80">sistema-padel.com/tu-complejo</p>
          </div>
        </div>
      </main>
    </div>
  );
}
