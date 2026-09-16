"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
import { updateTenantProfileAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  tenantSlug,
  coverPhotoUrl,
  address,
}: {
  tenantSlug: string;
  coverPhotoUrl: string | null;
  address: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(coverPhotoUrl);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateTenantProfileAction(tenantSlug, formData);
      if (result.ok) {
        toast.success("Perfil actualizado.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Foto de portada</Label>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Foto de portada" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="size-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Input id="photo" name="photo" type="file" accept="image/*" onChange={handleFileChange} className="max-w-64" />
            <p className="text-xs text-muted-foreground">Se muestra arriba de todo en la página pública de reservas.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Dirección</Label>
        <Input id="address" name="address" placeholder="Av. Siempre Viva 742, La Plata" defaultValue={address ?? ""} />
        <p className="text-xs text-muted-foreground">
          Con esto se arma el botón &quot;Ver en el mapa&quot; que ven tus jugadores.
        </p>
      </div>

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
