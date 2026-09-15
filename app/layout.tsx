import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const headingFont = Plus_Jakarta_Sans({
  variable: "--font-heading-family",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

// Solo para el logotipo de marca (components/brand/sportnex-logotype.tsx):
// el glifo de la X está calibrado en em contra las métricas de Space Grotesk,
// así que necesita display: "block" en vez del "swap" default — un swap con
// una fuente de fallback más ancha/angosta corre el glifo un instante.
const brandFont = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "block",
});

export const metadata: Metadata = {
  title: "SportNex",
  description: "Plataforma de gestión y reservas para complejos deportivos",
};

export const viewport: Viewport = {
  themeColor: "#0B1220",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${bodyFont.variable} ${headingFont.variable} ${brandFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
