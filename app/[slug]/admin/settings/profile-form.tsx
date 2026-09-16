"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
import { updateTenantProfileAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Achica y recomprime la foto en el navegador antes de subirla: una foto de
 * celular sin tocar (5-15MB) supera el límite de 4.5MB que Vercel les pone a
 * las Server Actions. Bajándola a 1920px de lado más largo y recomprimiendo
 * a JPEG calidad 0.82 el resultado casi siempre queda debajo de 1MB.
 */
function resizeImage(file: File, maxDimension = 1920, quality = 0.82): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo procesar la imagen."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("No se pudo procesar la imagen."));
            return;
          }
          resolve(new File([blob], "cover.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

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
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const payload = new FormData();
      payload.set("address", String(formData.get("address") ?? ""));

      if (pendingFile) {
        try {
          const resized = await resizeImage(pendingFile);
          payload.set("photo", resized);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "No se pudo procesar la foto.");
          return;
        }
      }

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
