"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
import { ImageIcon } from "lucide-react";
import { updateTenantProfileAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  tenantId,
  tenantSlug,
  coverPhotoUrl,
  address,
}: {
  tenantId: string;
  tenantSlug: string;
  coverPhotoUrl: string | null;
  address: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(coverPhotoUrl);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      let newCoverPhotoUrl: string | undefined;

      // Sube directo desde el navegador a Vercel Blob (no pasa por esta
      // Server Action, así no choca con el límite de 4.5MB de Vercel).
      if (pendingFile) {
        try {
          const ext = pendingFile.name.split(".").pop() || "jpg";
          const blob = await upload(`tenants/${tenantId}/cover-${Date.now()}.${ext}`, pendingFile, {
            access: "public",
            handleUploadUrl: "/api/blob/cover-photo",
            clientPayload: JSON.stringify({ tenantSlug }),
          });
          newCoverPhotoUrl = blob.url;
        } catch (err) {
          const message = err instanceof Error ? err.message : "No se pudo subir la foto.";
          toast.error(message);
          return;
        }
      }

      const payload = new FormData();
      payload.set("address", String(formData.get("address") ?? ""));
      if (newCoverPhotoUrl) payload.set("coverPhotoUrl", newCoverPhotoUrl);

      const result = await updateTenantProfileAction(tenantSlug, payload);
      if (result.ok) {
        toast.success("Perfil actualizado.");
        setPendingFile(null);
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
            <Input type="file" accept="image/*" onChange={handleFileChange} className="max-w-64" />
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
