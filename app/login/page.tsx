import Link from "next/link";
import { LoginForm } from "./login-form";
import { googleSignIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">Ingresar</CardTitle>
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

          <p className="text-center text-xs text-muted-foreground">
            ¿Sos dueño de un complejo y todavía no tenés cuenta?{" "}
            <Link href="/" className="underline">
              Contactanos
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
