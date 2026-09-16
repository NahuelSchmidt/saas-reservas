import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default es 1MB. La foto de portada llega recomprimida desde el
    // navegador (ver app/[slug]/admin/settings/profile-form.tsx) pero le
    // dejamos margen; Vercel igual pone un tope duro de 4.5MB más arriba.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
