import Link from "next/link";
import { LoginForm } from "./login-form";
import { googleSignIn } from "@/app/actions/auth";
import { findTenantForCallback } from "@/lib/tenant/resolve";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Número (formato internacional, solo dígitos, ej. "5491122334455") al que
// escribe un dueño de complejo que quiere su panel — no hay alta manual.
const contactWhatsappUrl = process.env.CONTACT_WHATSAPP_NUMBER
  ? `https://wa.me/${process.env.CONTACT_WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola! Quiero mi panel para mi complejo.")}`
  : null;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const tenant = await findTenantForCallback(callbackUrl ?? "");

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            {tenant ? `Ingresá para reservar en ${tenant.name}` : "Ingresar"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={googleSignIn}>
            <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
            <Button type="submit" variant="outline" className="w-full">
              Continuar con Google
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">o con tu email</span>
            <Separator className="flex-1" />
          </div>

          <LoginForm callbackUrl={callbackUrl ?? ""} />

          {contactWhatsappUrl && (
            <p className="text-center text-xs text-muted-foreground">
              ¿Sos dueño de un complejo y todavía no tenés panel?{" "}
              <Link href={contactWhatsappUrl} target="_blank" rel="noopener noreferrer" className="underline">
                Escribinos por WhatsApp
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
