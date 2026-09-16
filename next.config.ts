import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default es 1MB — muy poco para subir la foto de portada del club
    // (app/[slug]/admin/settings/cover-photo-form.tsx) desde el celular.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
