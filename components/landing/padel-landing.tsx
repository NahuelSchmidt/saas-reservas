"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Archivo, Manrope } from "next/font/google";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-landing-heading",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-landing-body",
});

/** Parses an inline CSS declaration string into a React style object, so the
 * landing markup below can carry its styles as plain CSS text (ported
 * verbatim from the source design) instead of hand-transcribed camelCase
 * objects. */
function css(decl: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const rule of decl.split(";")) {
    const idx = rule.indexOf(":");
    if (idx < 0) continue;
    const prop = rule.slice(0, idx).trim();
    const val = rule.slice(idx + 1).trim();
    if (!prop || !val) continue;
    const key = prop.startsWith("--")
      ? prop
      : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = val;
  }
  return out as unknown as CSSProperties;
}

const players = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--land-accent-ink)" strokeWidth={2} strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    ),
    chip: "var(--land-accent-soft)",
    title: "Reservá a cualquier hora",
    text: "Domingo a la noche o martes 7 AM: la agenda está siempre abierta y muestra disponibilidad real.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--land-green-ink)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
      </svg>
    ),
    chip: "var(--land-green-soft)",
    title: "Confirmación instantánea",
    text: "El turno queda tomado en el momento. No hay “te confirmo más tarde”.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--land-accent-ink)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
        <path d="M10.5 20a2 2 0 0 0 3 0" />
      </svg>
    ),
    chip: "var(--land-accent-soft)",
    title: "Recordatorios automáticos",
    text: "Un aviso al reservar y otro antes del partido. Nadie se olvida ni llega tarde.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--land-green-ink)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="5.5" width="19" height="13" rx="3" />
        <path d="M2.5 10h19" />
        <path d="M6 14.5h3" />
      </svg>
    ),
    chip: "var(--land-green-soft)",
    title: "Seña online",
    text: "Pagás una parte y la cancha queda asegurada a tu nombre. El resto, en el complejo.",
  },
];

const functions = [
  {
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--land-accent-ink)" strokeWidth={1.9} strokeLinecap="round">
        <rect x="6" y="2.5" width="12" height="19" rx="3" />
        <path d="M11 18.5h2" />
        <path d="M12 6.5v3l2 1.2" />
      </svg>
    ),
    title: "Reservas 24/7",
    text: "Desde el celular, la tablet o la compu. La agenda nunca cierra.",
  },
  {
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--land-green-ink)" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
        <path d="M10.5 20a2 2 0 0 0 3 0" />
      </svg>
    ),
    title: "Recordatorios automáticos",
    text: "Confirmación al reservar y aviso previo al turno. Menos plantones.",
  },
  {
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--land-accent-ink)" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="5" width="19" height="14" rx="3" />
        <path d="M2.5 10h19" />
        <path d="M6 14.5h4" />
      </svg>
    ),
    title: "Cobro de seña online",
    text: "El turno se garantiza con plata, no con una promesa por WhatsApp.",
  },
  {
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--land-green-ink)" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 20h18" />
        <rect x="4.5" y="12" width="3.6" height="6" rx="1" />
        <rect x="10.2" y="7" width="3.6" height="11" rx="1" />
        <rect x="15.9" y="3.5" width="3.6" height="14.5" rx="1" />
      </svg>
    ),
    title: "Dashboard en tiempo real",
    text: "Ocupación, ingresos y turnos del día, actualizados al segundo.",
  },
  {
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--land-accent-ink)" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 7h17l-1.4 12a2 2 0 0 1-2 1.8H6.9a2 2 0 0 1-2-1.8z" />
        <path d="M8.5 7V5a3.5 3.5 0 0 1 7 0v2" />
      </svg>
    ),
    title: "Stock y ventas del kiosco",
    text: "Bebidas, pelotas, alquiler de equipamiento: control de stock y caja en el mismo lugar.",
  },
  {
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--land-green-ink)" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
        <path d="M12 4.5v15" />
        <circle cx="12" cy="12" r="3.4" />
      </svg>
    ),
    title: "Multi-cancha",
    text: "Todas las canchas del complejo en una sola grilla, con sus precios y horarios.",
  },
];

const testimonials = [
  {
    quote: "“Antes perdía turnos porque no llegaba a contestar los mensajes. Ahora la agenda se llena sola y yo miro el panel.”",
    initials: "MG",
    avatarBg: "rgba(204, 255, 51, 0.18)",
    avatarColor: "var(--land-accent-ink)",
    name: "Martín G.",
    place: "Complejo Del Parque · Córdoba",
    accent: true,
  },
  {
    quote: "“La seña online nos cambió el fin de semana: bajamos las cancelaciones de último momento casi a cero.”",
    initials: "LF",
    avatarBg: "var(--land-green-soft)",
    avatarColor: "var(--land-green-ink)",
    name: "Luciana F.",
    place: "Match Point · Rosario",
    accent: false,
  },
  {
    quote: "“Tengo todas las canchas en la misma grilla, y el kiosco cargado ahí mismo. Cierro caja en cinco minutos.”",
    initials: "DR",
    avatarBg: "rgba(204, 255, 51, 0.18)",
    avatarColor: "var(--land-accent-ink)",
    name: "Diego R.",
    place: "Club Norte · Buenos Aires",
    accent: false,
  },
];

const clientNames = [
  "Complejo Del Parque",
  "La Bombonerita",
  "Club Norte",
  "Match Point",
  "Sporting Rosario",
  "Center Sur",
];

const bars = [32, 24, 46, 58, 72, 96, 88, 64, 40];

export function PadelLanding() {
  const grassRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const cv = grassRef.current;
    if (!root) return;

    let raf = 0;
    let lastFrame = 0;
    let onResize: (() => void) | null = null;

    if (cv) {
      const ctx = cv.getContext("2d");
      if (ctx) {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let w = 0;
        let h = 0;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        type Blade = {
          x: number;
          y: number;
          len: number;
          lean: number;
          w: number;
          tone: number;
          phase: number;
          speed: number;
        };
        let blades: Blade[] = [];
        const palette = {
          base: ["#7FB967", "#74AF5E"],
          blade: [110, 168, 84] as [number, number, number],
          blade2: [156, 206, 118] as [number, number, number],
          band: 0.045,
          tip: 0.32,
        };

        const build = () => {
          w = cv.clientWidth;
          h = cv.clientHeight;
          cv.width = Math.round(w * dpr);
          cv.height = Math.round(h * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          const count = Math.min(11000, Math.round((w * h) / 210));
          blades = new Array(count);
          for (let i = 0; i < count; i++) {
            blades[i] = {
              x: Math.random() * w,
              y: Math.random() * h,
              len: 6 + Math.random() * 10,
              lean: (Math.random() - 0.5) * 2.4,
              w: 0.9 + Math.random() * 1.1,
              tone: Math.random(),
              phase: Math.random() * Math.PI * 2,
              speed: 0.7 + Math.random() * 0.9,
            };
          }
        };

        const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
          `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;

        const draw = (t: number) => {
          if (t - lastFrame < 32) {
            raf = requestAnimationFrame(draw);
            return;
          }
          lastFrame = t;
          const g = ctx.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, palette.base[0]);
          g.addColorStop(1, palette.base[1]);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);

          const band = 132;
          ctx.fillStyle = `rgba(255,255,255,${palette.band})`;
          for (let x = 0; x < w; x += band * 2) ctx.fillRect(x, 0, band, h);

          const time = t / 1000;
          const wind = Math.sin(time * 0.35) * 0.6 + 0.7;
          ctx.lineCap = "round";
          for (let i = 0; i < blades.length; i++) {
            const b = blades[i];
            const sway = reduced ? 0 : Math.sin(time * b.speed + b.phase + b.x * 0.012) * 2.6 * wind;
            const tipX = b.x + b.lean + sway;
            ctx.strokeStyle = mix(palette.blade, palette.blade2, b.tone);
            ctx.lineWidth = b.w;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.quadraticCurveTo(b.x + (b.lean + sway) * 0.35, b.y - b.len * 0.62, tipX, b.y - b.len);
            ctx.stroke();
          }

          const v = ctx.createRadialGradient(w * 0.5, -h * 0.15, 0, w * 0.5, -h * 0.15, h * 1.15);
          v.addColorStop(0, `rgba(255,255,255,${palette.tip})`);
          v.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = v;
          ctx.fillRect(0, 0, w, h);

          raf = requestAnimationFrame(draw);
        };

        build();
        onResize = () => build();
        window.addEventListener("resize", onResize);
        raf = requestAnimationFrame(draw);
      }
    }

    const lines = root.querySelectorAll<HTMLElement>("[data-draw]");
    lines.forEach((el) => {
      let len = 400;
      try {
        const svgEl = el as unknown as SVGGeometryElement;
        len = typeof svgEl.getTotalLength === "function" ? svgEl.getTotalLength() : 400;
      } catch {
        // ignore
      }
      if (el.tagName === "rect") len = 1400;
      el.style.strokeDasharray = String(len);
      el.style.strokeDashoffset = String(len);
      el.style.transition = "stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1)";
    });

    const rises = root.querySelectorAll<HTMLElement>("[data-rise]");
    rises.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(26px)";
      el.style.transition = "opacity 0.7s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)";
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const d = el.hasAttribute("data-draw") ? i * 90 : i * 70;
          setTimeout(() => {
            if (el.hasAttribute("data-draw")) el.style.strokeDashoffset = "0";
            else {
              el.style.opacity = "1";
              el.style.transform = "none";
            }
          }, d);
          io.unobserve(el);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    lines.forEach((el) => io.observe(el));
    rises.forEach((el) => io.observe(el));

    const counters = root.querySelectorAll<HTMLElement>("[data-count]");
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          cio.unobserve(el);
          const target = parseFloat(el.getAttribute("data-count") || "0") || 0;
          const pre = el.getAttribute("data-prefix") || "";
          const suf = el.getAttribute("data-suffix") || "";
          const dur = 1100;
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = pre + Math.round(target * eased) + suf;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.6 },
    );
    counters.forEach((el) => cio.observe(el));

    const barEls = root.querySelectorAll<HTMLElement>("[data-bar]");
    const bio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) {
            el.style.animation = "none";
            void el.offsetHeight;
            el.style.animation = "";
          }
        });
      },
      { threshold: 0.4 },
    );
    barEls.forEach((el) => bio.observe(el));

    const fallback = window.setTimeout(() => {
      rises.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      lines.forEach((el) => {
        el.style.strokeDashoffset = "0";
      });
    }, 4000);

    return () => {
      io.disconnect();
      cio.disconnect();
      bio.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (onResize) window.removeEventListener("resize", onResize);
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${archivo.variable} ${manrope.variable} sp-landing flex flex-1 flex-col`}>
      <style>{`
        .sp-landing {
          --land-bg: #98CB82; --land-bg2: rgba(247, 252, 243, 0.94); --land-panel: #FFFFFF;
          --land-field:
            radial-gradient(1200px 700px at 50% -8%, rgba(255, 255, 255, 0.34), transparent 74%),
            repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0 1px, transparent 1px 5px),
            repeating-linear-gradient(90deg, rgba(12, 58, 22, 0.07) 0 1px, transparent 1px 4px),
            repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0 2px, rgba(12, 58, 22, 0.05) 2px 4px),
            repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.06) 0 132px, rgba(12, 58, 22, 0.07) 132px 264px);
          --land-sideline: rgba(255, 255, 255, 0.82); --land-sideline-soft: rgba(255, 255, 255, 0.42);
          --land-panel-float: rgba(255, 255, 255, 0.96); --land-panel-soft: #FFFFFF;
          --land-nav-bg: rgba(247, 252, 243, 0.9);
          --land-text: #0E1A11; --land-text2: #2C3A2E; --land-muted: #1F3A21; --land-muted2: #223A26; --land-muted3: #33502F;
          --land-line: rgba(14, 60, 26, 0.12); --land-line2: rgba(14, 60, 26, 0.2);
          --land-surface: rgba(255, 255, 255, 0.62); --land-surface2: rgba(14, 60, 26, 0.08);
          --land-card-bg: linear-gradient(170deg, #FFFFFF, #F4FBEC);
          --land-card-accent-bg: linear-gradient(170deg, var(--land-accent-line), #FFFFFF);
          --land-card-price-bg: linear-gradient(170deg, rgba(204, 255, 51, 0.24), rgba(23, 201, 100, 0.07));
          --land-hero-bg: linear-gradient(165deg, rgba(14, 84, 38, 0.62), rgba(14, 84, 38, 0.44));
          --land-accent-ink: #1F3800; --land-green-ink: #05481F;
          --land-headline-accent: linear-gradient(100deg, #FFFFFF 10%, #EAFFB8 85%);
          --land-accent-soft: rgba(204, 255, 51, 0.3); --land-accent-line: rgba(151, 197, 22, 0.6);
          --land-accent-glow: rgba(151, 197, 22, 0.18);
          --land-green-soft: rgba(23, 201, 100, 0.16); --land-green-glow: rgba(23, 201, 100, 0.22);
          --land-slot-bg: var(--land-surface2); --land-slot-line: var(--land-line2);
          --land-court-line: rgba(255, 255, 255, 0.9); --land-court-line-soft: rgba(255, 255, 255, 0.6); --land-court-line-faint: rgba(16, 90, 45, 0.16);
          --land-court-accent: rgba(120, 165, 10, 0.35);
          --land-bar-idle: rgba(14, 60, 26, 0.14);
          --land-shadow-strong: rgba(22, 44, 26, 0.16);
          --land-marquee: #2F4A31; --land-dot: rgba(14, 60, 26, 0.18);
          color-scheme: light;
          color: var(--land-text);
          font-family: var(--font-landing-body), Manrope, system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .sp-landing h1, .sp-landing h2, .sp-landing h3, .sp-heading {
          font-family: var(--font-landing-heading), Archivo, sans-serif;
        }
        .sp-landing a { color: var(--land-accent-ink); text-decoration: none; }
        .sp-landing a:hover { color: var(--land-green-ink); }
        .sp-landing ::selection { background: #CCFF33; color: #070B08; }

        @keyframes sp-ball-bounce { 0% { transform: translateY(-170px) scale(1, 1); } 45% { transform: translateY(0px) scale(1.06, 0.94); } 50% { transform: translateY(4px) scale(1.16, 0.84); } 56% { transform: translateY(0px) scale(1.04, 0.96); } 100% { transform: translateY(-170px) scale(1, 1); } }
        @keyframes sp-ball-spin { to { transform: rotate(360deg); } }
        @keyframes sp-shadow-pulse { 0% { transform: scale(0.55); opacity: 0.18; } 50% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(0.55); opacity: 0.18; } }
        @keyframes sp-dash-run { to { stroke-dashoffset: -600; } }
        @keyframes sp-marquee { to { transform: translateX(-50%); } }
        @keyframes sp-floaty { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        @keyframes sp-ring-pulse { 0% { transform: scale(0.9); opacity: 0.7; } 100% { transform: scale(1.9); opacity: 0; } }
        @keyframes sp-bar-grow { from { transform: scaleY(0.15); } to { transform: scaleY(1); } }
        @keyframes sp-sweep { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }
        @keyframes sp-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        @keyframes sp-roll-across { 0% { transform: translateX(-8vw) rotate(0deg); } 100% { transform: translateX(104vw) rotate(1440deg); } }
        @keyframes sp-net-drift { to { background-position: 44px 44px; } }
        @keyframes sp-pop-in { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes sp-trail-fade { 0% { opacity: 0.45; transform: scaleY(1); } 100% { opacity: 0; transform: scaleY(0.3); } }
        @keyframes sp-glow-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(204, 255, 51, 0); } 50% { box-shadow: 0 0 0 10px rgba(204, 255, 51, 0.12); } }

        .sp-nav-link { color: var(--land-muted); transition: color 0.15s ease; }
        .sp-nav-link:hover { color: var(--land-text); }
        .sp-nav-cta { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .sp-nav-cta:hover { transform: translateY(-2px); box-shadow: 0 10px 26px var(--land-accent-line); color: #071008; }
        .sp-btn-primary-lg { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .sp-btn-primary-lg:hover { transform: translateY(-3px); box-shadow: 0 16px 38px rgba(204, 255, 51, 0.3); color: #071008; }
        .sp-btn-outline-lg { transition: border-color 0.18s ease, background 0.18s ease; }
        .sp-btn-outline-lg:hover { border-color: var(--land-accent-line); background: var(--land-accent-soft); color: var(--land-text); }
        .sp-card-rise { transition: transform 0.22s ease, border-color 0.22s ease; }
        .sp-card-rise:hover { transform: translateY(-6px); border-color: var(--land-accent-line); }
        .sp-icon-rotate-neg { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .sp-card-rise:hover .sp-icon-rotate-neg { transform: rotate(-8deg) scale(1.1); }
        .sp-icon-rotate-pos { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .sp-card-rise:hover .sp-icon-rotate-pos { transform: rotate(8deg) scale(1.1); }
        .sp-card-fn { transition: transform 0.22s ease, border-color 0.22s ease; }
        .sp-card-fn:hover { transform: translateY(-6px); border-color: rgba(23, 201, 100, 0.45); }
        .sp-icon-fn { display: inline-block; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .sp-card-fn:hover .sp-icon-fn-1 { transform: rotate(-12deg) scale(1.18); }
        .sp-card-fn:hover .sp-icon-fn-2 { transform: translateY(-5px) scale(1.12); }
        .sp-card-fn:hover .sp-icon-fn-3 { transform: rotate(8deg) scale(1.15); }
        .sp-card-fn:hover .sp-icon-fn-4 { transform: scale(1.18); }
        .sp-card-fn:hover .sp-icon-fn-5 { transform: rotate(-8deg) scale(1.15); }
        .sp-card-fn:hover .sp-icon-fn-6 { transform: rotate(14deg) scale(1.15); }
        .sp-step-card { transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
        .sp-step-card:hover { transform: translateY(-6px); border-color: var(--land-accent-line); box-shadow: 0 18px 40px var(--land-accent-glow); }
        .sp-link-pill { transition: background 0.2s ease; }
        .sp-link-pill:hover { background: var(--land-accent-soft); color: var(--land-accent-ink); }
        .sp-sidebar-item { transition: background 0.18s ease; }
        .sp-sidebar-item:hover { background: var(--land-surface2); }
        .sp-slot-row { transition: border-color 0.2s ease, background 0.2s ease; }
        .sp-slot-row:hover { border-color: var(--land-accent-line); background: rgba(204, 255, 51, 0.05); }
        .sp-social-icon { transition: border-color 0.2s ease, color 0.2s ease; }
        .sp-social-icon:hover { border-color: var(--land-accent-ink); color: var(--land-accent-ink); }
        .sp-footer-link { color: var(--land-muted2); transition: color 0.15s ease; }
        .sp-footer-link:hover { color: var(--land-accent-ink); }
        .sp-legal-link { color: var(--land-muted3); transition: color 0.15s ease; }
        .sp-legal-link:hover { color: var(--land-muted); }
        .sp-btn-outline-pill { transition: border-color 0.2s ease; }
        .sp-btn-outline-pill:hover { border-color: var(--land-accent-line); color: var(--land-text); }
        .sp-btn-primary-pill { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .sp-btn-primary-pill:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(204, 255, 51, 0.3); color: #071008; }
        .sp-btn-primary-xl { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .sp-btn-primary-xl:hover { transform: translateY(-3px); box-shadow: 0 18px 40px var(--land-accent-line); color: #071008; }
        .sp-btn-outline-xl { transition: background 0.2s ease; }
        .sp-btn-outline-xl:hover { background: var(--land-surface2); color: var(--land-text); }
      `}</style>

      <div style={css("background: var(--land-field), var(--land-bg); color: var(--land-text); overflow-x: hidden; position: relative;")}>
        <canvas ref={grassRef} aria-hidden="true" style={css("position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none;")} />
        <div aria-hidden="true" style={css("position: absolute; inset: 0; pointer-events: none; z-index: 1;")}>
          <div style={css("position: absolute; top: 0; bottom: 0; left: 3.2%; width: 2px; background: var(--land-sideline);")} />
          <div style={css("position: absolute; top: 0; bottom: 0; right: 3.2%; width: 2px; background: var(--land-sideline);")} />
          <div style={css("position: absolute; top: 0; bottom: 0; left: 12.5%; width: 1px; background: var(--land-sideline-soft);")} />
          <div style={css("position: absolute; top: 0; bottom: 0; right: 12.5%; width: 1px; background: var(--land-sideline-soft);")} />
          <div style={css("position: absolute; top: 0; bottom: 0; left: 50%; width: 1px; margin-left: -0.5px; background: repeating-linear-gradient(180deg, var(--land-sideline-soft) 0 16px, transparent 16px 32px);")} />
        </div>

        <nav style={css("position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: transparent;")}>
          <div style={css("max-width: 1240px; margin: 0 auto; padding: 16px 28px; display: flex; align-items: center; gap: 28px;")}>
            <div style={css("display: flex; align-items: center; gap: 10px; margin-right: auto;")}>
              <div style={css("width: 34px; height: 34px; border-radius: 11px; background: linear-gradient(140deg, #CCFF33, #17C964); display: grid; place-items: center; font-weight: 900; color: #071008; font-size: 17px;")} className="sp-heading">
                S
              </div>
              <span style={css("font-weight: 800; font-size: 19px; letter-spacing: -0.02em;")} className="sp-heading">
                Sistema Padel
              </span>
            </div>
            <div style={css("display: flex; align-items: center; gap: 26px; font-size: 14.5px; font-weight: 600;")}>
              <a href="#jugadores" className="sp-nav-link">Jugadores</a>
              <a href="#duenos" className="sp-nav-link">Complejos</a>
              <a href="#funciones" className="sp-nav-link">Funciones</a>
              <a href="#precios" className="sp-nav-link">Precios</a>
            </div>
            <Link
              href="/login"
              className="sp-nav-cta sp-heading"
              style={css("font-weight: 800; font-size: 14.5px; color: #071008; background: #CCFF33; padding: 11px 20px; border-radius: 999px; letter-spacing: -0.01em;")}
            >
              Probá gratis
            </Link>
          </div>
        </nav>
        <div aria-hidden="true" style={css("height: 66px;")} />

        <section data-screen-label="Hero" style={css("position: relative; z-index: 2; padding: 92px 28px 110px; overflow: hidden;")}>
          <div style={css("position: absolute; inset: 0; background: radial-gradient(900px 520px at 78% 8%, var(--land-green-soft), transparent 70%), radial-gradient(700px 460px at 8% 90%, var(--land-accent-soft), transparent 70%);")} />
          <div style={css("position: relative; max-width: 1240px; margin: 0 auto; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 56px; align-items: center;")}>
            <div>
              <div style={css("display: inline-flex; align-items: center; gap: 9px; padding: 7px 14px 7px 10px; border: 1px solid var(--land-accent-line); background: var(--land-surface); backdrop-filter: blur(6px); border-radius: 999px; font-size: 13px; font-weight: 700; color: var(--land-accent-ink); margin-bottom: 26px;")}>
                <span style={css("position: relative; display: inline-grid; place-items: center; width: 8px; height: 8px;")}>
                  <span style={css("position: absolute; width: 8px; height: 8px; border-radius: 999px; background: #CCFF33; animation: sp-blink 1.6s ease-in-out infinite;")} />
                </span>
                Todas tus canchas, una sola plataforma
              </div>
              <h1
                className="sp-heading"
                style={css("font-weight: 900; font-size: clamp(44px, 5.6vw, 78px); line-height: 0.94; letter-spacing: -0.035em; margin: 0 0 22px; text-wrap: balance;")}
              >
                Reservá tu cancha
                <br />
                en segundos, a
                <br />
                <span style={css("position: relative; display: inline-block;")}>
                  <span style={css("position: absolute; inset: 0; color: rgba(6, 26, 12, 0.55); filter: blur(6px); z-index: 0;")}>cualquier hora</span>
                  <span style={css("position: relative; z-index: 1; background: var(--land-headline-accent); -webkit-background-clip: text; background-clip: text; color: transparent;")}>cualquier hora</span>
                </span>
              </h1>
              <p style={css("font-size: 19.5px; line-height: 1.55; color: var(--land-muted); max-width: 520px; margin: 0 0 34px; text-wrap: pretty;")}>
                Disponibilidad real 24/7, confirmación al instante y la seña pagada online. Se acabaron los llamados, los WhatsApp perdidos y las canchas vacías por cancelaciones.
              </p>
              <div style={css("display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 34px;")}>
                <Link
                  href="/login"
                  className="sp-btn-primary-lg sp-heading"
                  style={css("position: relative; overflow: hidden; font-weight: 800; font-size: 16.5px; color: #071008; background: #CCFF33; padding: 17px 30px; border-radius: 999px;")}
                >
                  Reservá ahora →
                </Link>
                <a
                  href="#duenos"
                  className="sp-btn-outline-lg sp-heading"
                  style={css("font-weight: 800; font-size: 16.5px; color: var(--land-text); border: 1px solid var(--land-line2); padding: 17px 28px; border-radius: 999px;")}
                >
                  Tengo un complejo
                </a>
              </div>
              <div style={css("display: flex; gap: 34px; flex-wrap: wrap;")}>
                <div>
                  <div data-count="68" data-prefix="-" data-suffix="%" className="sp-heading" style={css("font-weight: 900; font-size: 27px; color: var(--land-text); letter-spacing: -0.03em;")}>-68%</div>
                  <div style={css("font-size: 13.5px; color: var(--land-muted2); font-weight: 600;")}>de ausentismo</div>
                </div>
                <div style={css("width: 1px; background: var(--land-line);")} />
                <div>
                  <div data-count="40" data-suffix=" seg" className="sp-heading" style={css("font-weight: 900; font-size: 27px; color: var(--land-text); letter-spacing: -0.03em;")}>40 seg</div>
                  <div style={css("font-size: 13.5px; color: var(--land-muted2); font-weight: 600;")}>para reservar</div>
                </div>
                <div style={css("width: 1px; background: var(--land-line);")} />
                <div>
                  <div className="sp-heading" style={css("font-weight: 900; font-size: 27px; color: var(--land-text); letter-spacing: -0.03em;")}>24/7</div>
                  <div style={css("font-size: 13.5px; color: var(--land-muted2); font-weight: 600;")}>sin atender el teléfono</div>
                </div>
              </div>
            </div>

            <div style={css("position: relative; aspect-ratio: 1 / 1.05;")}>
              <div style={css("position: absolute; inset: 0; border-radius: 26px; border: 1px solid var(--land-line); background: var(--land-hero-bg); overflow: hidden;")}>
                <svg viewBox="0 0 400 420" style={css("position: absolute; inset: 0; width: 100%; height: 100%;")}>
                  <rect x={46} y={34} width={308} height={352} rx={4} fill="rgba(23,201,100,0.07)" stroke="var(--land-court-line)" strokeWidth={2} data-draw="" />
                  <line x1={46} y1={210} x2={354} y2={210} stroke="var(--land-accent-ink)" strokeWidth={2.5} data-draw="" />
                  <line x1={46} y1={122} x2={354} y2={122} stroke="var(--land-court-line-soft)" strokeWidth={2} data-draw="" />
                  <line x1={46} y1={298} x2={354} y2={298} stroke="var(--land-court-line-soft)" strokeWidth={2} data-draw="" />
                  <line x1={200} y1={122} x2={200} y2={34} stroke="var(--land-court-line-soft)" strokeWidth={2} data-draw="" />
                  <line x1={200} y1={298} x2={200} y2={386} stroke="var(--land-court-line-soft)" strokeWidth={2} data-draw="" />
                  <g stroke="var(--land-court-line-faint)" strokeWidth={1}>
                    <line x1={46} y1={196} x2={354} y2={196} />
                    <line x1={46} y1={224} x2={354} y2={224} />
                  </g>
                  <line x1={46} y1={210} x2={354} y2={210} stroke="var(--land-accent-ink)" strokeWidth={1} strokeDasharray="10 14" style={css("animation: sp-dash-run 12s linear infinite; opacity: 0.7;")} />
                </svg>
                <div style={css("position: absolute; left: 50%; top: 46%; transform: translateX(-50%);")}>
                  <div style={css("animation: sp-ball-bounce 1.9s cubic-bezier(0.42, 0, 0.58, 1) infinite;")}>
                    <div style={css("width: 46px; height: 46px; border-radius: 999px; background: radial-gradient(circle at 32% 28%, #FFFFFF, #CCFF33 58%, #8FBF12); box-shadow: 0 0 0 2px rgba(7, 16, 8, 0.35), 0 12px 30px var(--land-accent-line); animation: sp-ball-spin 1.9s linear infinite; position: relative; overflow: hidden;")}>
                      <div style={css("position: absolute; inset: -6px; border-left: 2px solid rgba(7, 16, 8, 0.28); border-radius: 999px; transform: rotate(18deg);")} />
                    </div>
                  </div>
                  <div style={css("width: 46px; height: 10px; border-radius: 999px; background: rgba(7, 16, 8, 0.75); filter: blur(4px); margin-top: 4px; animation: sp-shadow-pulse 1.9s cubic-bezier(0.42, 0, 0.58, 1) infinite;")} />
                  <div style={css("position: absolute; left: 50%; top: -160px; width: 2px; height: 150px; margin-left: -1px; transform-origin: bottom; background: linear-gradient(180deg, transparent, rgba(204, 255, 51, 0.55)); animation: sp-trail-fade 1.9s cubic-bezier(0.42, 0, 0.58, 1) infinite;")} />
                </div>
              </div>

              <div style={css("position: absolute; left: -22px; bottom: 58px; width: 244px; padding: 15px 17px; border-radius: 16px; background: var(--land-panel-float); border: 1px solid var(--land-line2); box-shadow: 0 22px 50px var(--land-shadow-strong); backdrop-filter: blur(8px); animation: sp-floaty 5.5s ease-in-out infinite;")}>
                <div style={css("display: flex; align-items: center; gap: 10px; margin-bottom: 10px;")}>
                  <div style={css("width: 26px; height: 26px; border-radius: 8px; background: var(--land-green-soft); display: grid; place-items: center; color: var(--land-green-ink); font-size: 14px; font-weight: 800;")}>✓</div>
                  <div className="sp-heading" style={css("font-weight: 800; font-size: 14px;")}>Reserva confirmada</div>
                </div>
                <div style={css("font-size: 12.5px; color: var(--land-muted); line-height: 1.5;")}>Cancha 3 · Hoy 21:00<br />Seña $6.000 pagada</div>
              </div>

              <div style={css("position: absolute; right: -18px; top: 40px; padding: 12px 16px; border-radius: 14px; background: var(--land-accent-soft); border: 1px solid var(--land-accent-line); backdrop-filter: blur(8px); animation: sp-floaty 6.5s ease-in-out 0.8s infinite;")}>
                <div data-count="92" data-suffix="%" className="sp-heading" style={css("font-weight: 900; font-size: 20px; color: var(--land-accent-ink); letter-spacing: -0.02em;")}>92%</div>
                <div style={css("font-size: 12px; color: var(--land-accent-ink); font-weight: 600;")}>ocupación del finde</div>
              </div>
            </div>
          </div>
        </section>

        <div style={css("position: relative; z-index: 2; height: 46px; display: grid; align-items: center; overflow: hidden;")}>
          <div style={css("height: 3px; background: repeating-linear-gradient(90deg, var(--land-accent-line) 0 42px, transparent 42px 84px);")} />
          <div style={css("position: absolute; top: 50%; left: 0; margin-top: -13px; animation: sp-roll-across 9s linear infinite;")}>
            <div style={css("width: 26px; height: 26px; border-radius: 999px; background: radial-gradient(circle at 34% 30%, #FFFFFF, #CCFF33 60%, #8FBF12); box-shadow: 0 4px 12px rgba(120, 165, 10, 0.4); position: relative; overflow: hidden;")}>
              <div style={css("position: absolute; inset: -4px; border-left: 2px solid rgba(7, 16, 8, 0.3); border-radius: 999px; transform: rotate(20deg);")} />
            </div>
          </div>
        </div>

        <section id="jugadores" style={css("position: relative; z-index: 2; padding: 96px 28px; background: var(--land-bg2);")}>
          <div style={css("max-width: 1240px; margin: 0 auto;")}>
            <div data-rise="" style={css("max-width: 640px; margin-bottom: 52px;")}>
              <div style={css("font-size: 13px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--land-green-ink); margin-bottom: 14px;")}>Para jugadores</div>
              <h2 className="sp-heading" style={css("font-weight: 900; font-size: clamp(32px, 3.8vw, 50px); line-height: 1.02; letter-spacing: -0.03em; margin: 0 0 16px;")}>
                Elegís horario, pagás la seña y listo. Nada más.
              </h2>
              <p style={css("font-size: 17.5px; color: var(--land-muted); line-height: 1.6; margin: 0;")}>Sin llamar, sin esperar respuesta, sin quedarte afuera del turno de las 21.</p>
            </div>
            <div style={css("display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px;")}>
              {players.map((p, i) => (
                <div key={p.title} data-rise="" className="sp-card-rise" style={css("padding: 26px 24px 28px; border-radius: 20px; background: var(--land-card-bg); border: 1px solid var(--land-line);")}>
                  <div className={i % 2 === 0 ? "sp-icon-rotate-neg" : "sp-icon-rotate-pos"} style={{ ...css("width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; margin-bottom: 20px;"), background: p.chip }}>
                    {p.icon}
                  </div>
                  <h3 className="sp-heading" style={css("font-weight: 800; font-size: 19px; margin: 0 0 9px; letter-spacing: -0.02em;")}>{p.title}</h3>
                  <p style={css("font-size: 14.5px; color: var(--land-muted); line-height: 1.6; margin: 0;")}>{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="duenos" style={css("position: relative; z-index: 2; padding: 100px 28px; overflow: hidden;")}>
          <div style={css("position: absolute; inset: 0; background: radial-gradient(760px 480px at 88% 30%, var(--land-green-soft), transparent 72%);")} />
          <div style={css("position: relative; max-width: 1240px; margin: 0 auto; display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 60px; align-items: center;")}>
            <div data-rise="">
              <div style={css("font-size: 13px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--land-accent-ink); margin-bottom: 14px;")}>Para dueños de complejos</div>
              <h2 className="sp-heading" style={css("font-weight: 900; font-size: clamp(32px, 3.8vw, 50px); line-height: 1.02; letter-spacing: -0.03em; margin: 0 0 18px;")}>
                Todo tu complejo en una sola pantalla.
              </h2>
              <p style={css("font-size: 17.5px; color: var(--land-muted); line-height: 1.6; margin: 0 0 30px;")}>
                Ocupación, ingresos y turnos del día en tiempo real. Dejás de administrar el negocio desde el chat del celular.
              </p>
              <div style={css("display: grid; gap: 14px;")}>
                {[
                  { title: "Menos ausentismo.", text: "Con seña y recordatorios, las cancelaciones de último momento se desploman." },
                  { title: "Gestión centralizada.", text: "Todas tus canchas, todos los turnos, un solo calendario." },
                  { title: "Plata a la vista.", text: "Ingresos por cancha, por horario y por kiosco, sin planillas." },
                ].map((item) => (
                  <div key={item.title} style={css("display: flex; gap: 13px; align-items: flex-start;")}>
                    <div style={css("flex: none; width: 24px; height: 24px; border-radius: 8px; background: var(--land-accent-soft); color: var(--land-accent-ink); display: grid; place-items: center; font-size: 13px; font-weight: 900; margin-top: 2px;")}>✓</div>
                    <div>
                      <strong className="sp-heading" style={css("font-weight: 800; font-size: 16px;")}>{item.title}</strong>{" "}
                      <span style={css("color: var(--land-muted); font-size: 15.5px;")}>{item.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div data-rise="" style={css("border-radius: 22px; border: 1px solid var(--land-line2); background: var(--land-panel); box-shadow: 0 40px 90px var(--land-shadow-strong); overflow: hidden;")}>
              <div style={css("display: flex; align-items: center; gap: 8px; padding: 13px 18px; border-bottom: 1px solid var(--land-line); background: var(--land-surface);")}>
                <div style={css("width: 9px; height: 9px; border-radius: 999px; background: var(--land-dot);")} />
                <div style={css("width: 9px; height: 9px; border-radius: 999px; background: var(--land-dot);")} />
                <div style={css("width: 9px; height: 9px; border-radius: 999px; background: var(--land-dot);")} />
                <div style={css("margin-left: 12px; font-size: 12.5px; color: var(--land-muted2); font-weight: 600;")}>Panel · Complejo Del Parque · Hoy</div>
                <div style={css("margin-left: auto; display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: var(--land-green-ink);")}>
                  <span style={css("width: 7px; height: 7px; border-radius: 999px; background: #17C964; animation: sp-blink 1.8s ease-in-out infinite;")} />En vivo
                </div>
              </div>
              <div style={css("padding: 20px; display: grid; gap: 16px;")}>
                <div style={css("display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;")}>
                  <div style={css("padding: 15px 16px; border-radius: 14px; background: var(--land-accent-soft); border: 1px solid var(--land-accent-line);")}>
                    <div style={css("font-size: 11.5px; font-weight: 700; color: var(--land-muted); letter-spacing: 0.04em; text-transform: uppercase;")}>Ocupación hoy</div>
                    <div data-count="87" data-suffix="%" className="sp-heading" style={css("font-weight: 900; font-size: 30px; letter-spacing: -0.03em; color: var(--land-accent-ink);")}>87%</div>
                  </div>
                  <div style={css("padding: 15px 16px; border-radius: 14px; background: var(--land-surface); border: 1px solid var(--land-line);")}>
                    <div style={css("font-size: 11.5px; font-weight: 700; color: var(--land-muted2); letter-spacing: 0.04em; text-transform: uppercase;")}>Ingresos</div>
                    <div data-count="412" data-prefix="$" data-suffix="k" className="sp-heading" style={css("font-weight: 900; font-size: 30px; letter-spacing: -0.03em;")}>$412k</div>
                  </div>
                  <div style={css("padding: 15px 16px; border-radius: 14px; background: var(--land-surface); border: 1px solid var(--land-line);")}>
                    <div style={css("font-size: 11.5px; font-weight: 700; color: var(--land-muted2); letter-spacing: 0.04em; text-transform: uppercase;")}>Turnos</div>
                    <div className="sp-heading" style={css("font-weight: 900; font-size: 30px; letter-spacing: -0.03em;")}>
                      <span data-count="31">31</span>
                      <span style={css("font-size: 16px; color: var(--land-muted2);")}>/36</span>
                    </div>
                  </div>
                </div>
                <div style={css("padding: 16px; border-radius: 14px; background: var(--land-surface); border: 1px solid var(--land-line);")}>
                  <div style={css("display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px;")}>
                    <div className="sp-heading" style={css("font-weight: 800; font-size: 14.5px;")}>Ocupación por hora</div>
                    <div style={css("font-size: 12px; color: var(--land-muted2); font-weight: 600;")}>Últimos 7 días</div>
                  </div>
                  <div style={css("display: flex; align-items: flex-end; gap: 7px; height: 96px;")}>
                    {bars.map((height, i) => {
                      const bg =
                        i === 5 ? "#CCFF33" : i === 6 ? "#A9DB2B" : i === 4 ? "rgba(23, 201, 100, 0.65)" : i === 7 ? "rgba(23, 201, 100, 0.55)" : i === 3 ? "var(--land-slot-line)" : "var(--land-bar-idle)";
                      return (
                        <div
                          key={i}
                          data-bar=""
                          style={{
                            ...css("flex: 1; border-radius: 5px 5px 2px 2px; transform-origin: bottom;"),
                            height: `${height}%`,
                            background: bg,
                            animation: `sp-bar-grow 0.9s ${i * 0.05}s ease-out both`,
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={css("display: flex; justify-content: space-between; margin-top: 9px; font-size: 11px; color: var(--land-muted2); font-weight: 600;")}>
                    {[14, 15, 16, 17, 18, 19, 20, 21, 22].map((h) => (
                      <span key={h}>{h}</span>
                    ))}
                  </div>
                </div>
                <div style={css("display: grid; gap: 8px;")}>
                  {[
                    { time: "20:00", label: "Cancha 2 · Nico Ferreyra", status: "Seña ok", dashed: false },
                    { time: "21:00", label: "Cancha 5 · Los Pibes FC", status: "Seña ok", dashed: false },
                    { time: "22:00", label: "Cancha 5 · Libre", status: "Disponible", dashed: true },
                  ].map((row) => (
                    <div
                      key={row.time}
                      className={row.dashed ? undefined : "sp-slot-row"}
                      style={css(
                        row.dashed
                          ? "display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; background: var(--land-surface); border: 1px dashed var(--land-line2);"
                          : "display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; background: var(--land-surface); border: 1px solid var(--land-line);",
                      )}
                    >
                      <div className="sp-heading" style={css(`font-weight: 900; font-size: 14px; width: 44px; color: ${row.dashed ? "var(--land-muted2)" : "var(--land-accent-ink)"};`)}>{row.time}</div>
                      <div style={css(`flex: 1; font-size: 13.5px; font-weight: 600; color: ${row.dashed ? "var(--land-muted2)" : "inherit"};`)}>{row.label}</div>
                      <div
                        style={css(
                          row.dashed
                            ? "font-size: 11.5px; font-weight: 800; color: var(--land-muted); background: var(--land-line); padding: 4px 9px; border-radius: 999px;"
                            : "font-size: 11.5px; font-weight: 800; color: var(--land-green-ink); background: var(--land-green-soft); padding: 4px 9px; border-radius: 999px; animation: sp-pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;",
                        )}
                      >
                        {row.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="funciones" style={css("position: relative; z-index: 2; padding: 96px 28px; background: var(--land-bg2); overflow: hidden;")}>
          <div style={css("position: absolute; inset: 0; opacity: 0.35;")}>
            <svg viewBox="0 0 1200 700" preserveAspectRatio="none" style={css("width: 100%; height: 100%;")}>
              <rect x={60} y={60} width={1080} height={580} fill="none" stroke="var(--land-court-line-faint)" strokeWidth={2} />
              <line x1={600} y1={60} x2={600} y2={640} stroke="var(--land-court-line-faint)" strokeWidth={2} />
              <circle cx={600} cy={350} r={90} fill="none" stroke="var(--land-court-line-faint)" strokeWidth={2} />
              <circle cx={600} cy={350} r={5} fill="var(--land-court-accent)" />
            </svg>
          </div>
          <div style={css("position: relative; max-width: 1240px; margin: 0 auto;")}>
            <div data-rise="" style={css("text-align: center; max-width: 660px; margin: 0 auto 52px;")}>
              <div style={css("font-size: 13px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--land-green-ink); margin-bottom: 14px;")}>Funcionalidades</div>
              <h2 className="sp-heading" style={css("font-weight: 900; font-size: clamp(32px, 3.8vw, 50px); line-height: 1.02; letter-spacing: -0.03em; margin: 0;")}>
                Todo lo que necesita el complejo, sin vueltas
              </h2>
            </div>
            <div style={css("display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px;")}>
              {functions.map((f, i) => (
                <div key={f.title} data-rise="" className="sp-card-fn" style={css("padding: 28px; border-radius: 20px; background: var(--land-panel-soft); border: 1px solid var(--land-line);")}>
                  <div className={`sp-icon-fn sp-icon-fn-${i + 1}`} style={css("margin-bottom: 16px;")}>{f.icon}</div>
                  <h3 className="sp-heading" style={css("font-weight: 800; font-size: 19.5px; margin: 0 0 9px; letter-spacing: -0.02em;")}>{f.title}</h3>
                  <p style={css("font-size: 14.5px; color: var(--land-muted); line-height: 1.6; margin: 0;")}>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={css("position: relative; z-index: 2; padding: 90px 28px;")}>
          <div style={css("max-width: 1240px; margin: 0 auto;")}>
            <div data-rise="" style={css("max-width: 620px; margin-bottom: 54px;")}>
              <div style={css("font-size: 13px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--land-accent-ink); margin-bottom: 14px;")}>Cómo funciona</div>
              <h2 className="sp-heading" style={css("font-weight: 900; font-size: clamp(32px, 3.8vw, 50px); line-height: 1.02; letter-spacing: -0.03em; margin: 0;")}>Tres pasos y estás en la cancha</h2>
            </div>
            <div style={css("position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px;")}>
              <div style={css("position: absolute; left: 8%; right: 8%; top: 44px; height: 2px; background: repeating-linear-gradient(90deg, var(--land-accent-line) 0 12px, transparent 12px 26px);")} />

              <div data-rise="" className="sp-step-card" style={css("position: relative; padding: 30px 26px; border-radius: 20px; background: var(--land-card-bg); border: 1px solid var(--land-line);")}>
                <div className="sp-heading" style={css("position: relative; width: 54px; height: 54px; border-radius: 999px; background: #CCFF33; color: #071008; display: grid; place-items: center; font-weight: 900; font-size: 22px; margin-bottom: 22px;")}>
                  1
                  <span style={css("position: absolute; inset: 0; border-radius: 999px; border: 2px solid var(--land-accent-line); animation: sp-ring-pulse 2.4s ease-out infinite;")} />
                </div>
                <h3 className="sp-heading" style={css("font-weight: 800; font-size: 21px; margin: 0 0 10px; letter-spacing: -0.02em;")}>Elegí cancha y horario</h3>
                <p style={css("font-size: 15px; color: var(--land-muted); line-height: 1.6; margin: 0 0 18px;")}>Ves disponibilidad real por cancha y por hora. Sin preguntar nada.</p>
                <div style={css("display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;")}>
                  <div style={css("height: 30px; border-radius: 7px; background: var(--land-surface2); border: 1px solid var(--land-line);")} />
                  <div style={css("height: 30px; border-radius: 7px; background: var(--land-surface2); border: 1px solid var(--land-line);")} />
                  <div style={css("height: 30px; border-radius: 7px; background: rgba(204, 255, 51, 0.85); border: 1px solid #CCFF33;")} />
                  <div style={css("height: 30px; border-radius: 7px; background: var(--land-surface2); border: 1px solid var(--land-line);")} />
                </div>
              </div>

              <div data-rise="" className="sp-step-card" style={css("position: relative; padding: 30px 26px; border-radius: 20px; background: var(--land-card-bg); border: 1px solid var(--land-line);")}>
                <div className="sp-heading" style={css("width: 54px; height: 54px; border-radius: 999px; background: var(--land-accent-soft); border: 1px solid var(--land-accent-line); color: var(--land-accent-ink); display: grid; place-items: center; font-weight: 900; font-size: 22px; margin-bottom: 22px;")}>2</div>
                <h3 className="sp-heading" style={css("font-weight: 800; font-size: 21px; margin: 0 0 10px; letter-spacing: -0.02em;")}>Confirmá y pagá la seña</h3>
                <p style={css("font-size: 15px; color: var(--land-muted); line-height: 1.6; margin: 0 0 18px;")}>Tarjeta, transferencia o billetera virtual. La cancha queda a tu nombre.</p>
                <div style={css("padding: 12px 14px; border-radius: 12px; background: var(--land-green-soft); border: 1px solid rgba(23, 201, 100, 0.28); display: flex; justify-content: space-between; align-items: center;")}>
                  <span style={css("font-size: 13px; font-weight: 700; color: var(--land-green-ink);")}>Seña</span>
                  <span className="sp-heading" style={css("font-weight: 900; font-size: 17px; color: var(--land-green-ink);")}>$6.000</span>
                </div>
              </div>

              <div data-rise="" className="sp-step-card" style={css("position: relative; padding: 30px 26px; border-radius: 20px; background: var(--land-card-bg); border: 1px solid var(--land-line);")}>
                <div className="sp-heading" style={css("width: 54px; height: 54px; border-radius: 999px; background: var(--land-accent-soft); border: 1px solid var(--land-accent-line); color: var(--land-accent-ink); display: grid; place-items: center; font-weight: 900; font-size: 22px; margin-bottom: 22px;")}>3</div>
                <h3 className="sp-heading" style={css("font-weight: 800; font-size: 21px; margin: 0 0 10px; letter-spacing: -0.02em;")}>Recibí el aviso y jugá</h3>
                <p style={css("font-size: 15px; color: var(--land-muted); line-height: 1.6; margin: 0 0 18px;")}>Te avisamos al reservar y unas horas antes del partido. Vos solo llevá las pelotas.</p>
                <div style={css("display: grid; gap: 7px;")}>
                  <div style={css("padding: 9px 12px; border-radius: 10px; background: var(--land-surface2); font-size: 12.5px; color: var(--land-muted); font-weight: 600;")}>✅ Reserva confirmada · Cancha 3</div>
                  <div style={css("padding: 9px 12px; border-radius: 10px; background: var(--land-surface2); font-size: 12.5px; color: var(--land-muted); font-weight: 600;")}>⏰ Tu turno es hoy 21:00</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="panel" style={css("position: relative; z-index: 2; padding: 96px 28px; background: var(--land-bg2); border-top: 1px solid var(--land-line); border-bottom: 1px solid var(--land-line);")}>
          <div style={css("max-width: 1240px; margin: 0 auto;")}>
            <div data-rise="" style={css("display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-end; justify-content: space-between; margin-bottom: 44px;")}>
              <div style={css("max-width: 560px;")}>
                <div style={css("font-size: 13px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--land-green-ink); margin-bottom: 14px;")}>Panel de gestión</div>
                <h2 className="sp-heading" style={css("font-weight: 900; font-size: clamp(32px, 3.8vw, 50px); line-height: 1.02; letter-spacing: -0.03em; margin: 0 0 14px;")}>Calendario, kiosco y reportes en un solo panel</h2>
                <p style={css("font-size: 17px; color: var(--land-muted); line-height: 1.6; margin: 0;")}>Lo que antes eran tres planillas y un cuaderno.</p>
              </div>
              <Link href="/login" className="sp-link-pill sp-heading" style={css("font-weight: 800; font-size: 15px; color: var(--land-accent-ink); border: 1px solid var(--land-accent-line); padding: 14px 22px; border-radius: 999px;")}>
                Ver el panel en vivo
              </Link>
            </div>

            <div data-rise="" style={css("border-radius: 24px; border: 1px solid var(--land-line2); background: var(--land-panel); overflow: hidden; box-shadow: 0 50px 100px var(--land-shadow-strong);")}>
              <div style={css("display: grid; grid-template-columns: 210px 1fr;")}>
                <div style={css("padding: 22px 18px; border-right: 1px solid var(--land-line); background: var(--land-surface); display: grid; gap: 6px; align-content: start;")}>
                  <div style={css("display: flex; align-items: center; gap: 9px; margin-bottom: 18px;")}>
                    <div style={css("width: 26px; height: 26px; border-radius: 9px; background: linear-gradient(140deg, #CCFF33, #17C964);")} />
                    <span className="sp-heading" style={css("font-weight: 800; font-size: 15px;")}>Sistema Padel</span>
                  </div>
                  <div style={css("padding: 10px 12px; border-radius: 10px; background: var(--land-accent-soft); color: var(--land-accent-ink); font-size: 13.5px; font-weight: 700;")}>Calendario</div>
                  {["Reservas", "Kiosco y stock", "Reportes", "Canchas", "Clientes"].map((label) => (
                    <div key={label} className="sp-sidebar-item" style={css("padding: 10px 12px; border-radius: 10px; color: var(--land-muted); font-size: 13.5px; font-weight: 600;")}>{label}</div>
                  ))}
                </div>
                <div style={css("padding: 22px; display: grid; gap: 18px;")}>
                  <div style={css("display: grid; grid-template-columns: 62px repeat(4, 1fr); gap: 8px;")}>
                    <div />
                    {["Cancha 1", "Cancha 2", "Cancha 3", "Cancha 4"].map((c) => (
                      <div key={c} style={css("font-size: 12px; font-weight: 800; color: var(--land-muted); text-align: center;")}>{c}</div>
                    ))}

                    <div style={css("font-size: 12px; font-weight: 700; color: var(--land-muted2); display: grid; align-items: center;")}>19:00</div>
                    <div style={css("height: 40px; border-radius: 9px; background: var(--land-slot-bg); border: 1px solid var(--land-slot-line); font-size: 11.5px; font-weight: 700; color: var(--land-text); display: grid; place-items: center;")}>Reservado</div>
                    <div style={css("height: 40px; border-radius: 9px; background: var(--land-surface); border: 1px dashed var(--land-line2);")} />
                    <div style={css("height: 40px; border-radius: 9px; background: var(--land-slot-bg); border: 1px solid var(--land-slot-line); font-size: 11.5px; font-weight: 700; color: var(--land-text); display: grid; place-items: center;")}>Reservado</div>
                    <div style={css("height: 40px; border-radius: 9px; background: var(--land-surface); border: 1px dashed var(--land-line2);")} />

                    <div style={css("font-size: 12px; font-weight: 700; color: var(--land-muted2); display: grid; align-items: center;")}>20:00</div>
                    <div style={css("height: 40px; border-radius: 9px; background: rgba(204, 255, 51, 0.85); border: 1px solid #CCFF33; font-size: 11.5px; font-weight: 800; color: #071008; display: grid; place-items: center;")}>Seña ok</div>
                    <div style={css("height: 40px; border-radius: 9px; background: var(--land-slot-bg); border: 1px solid var(--land-slot-line); font-size: 11.5px; font-weight: 700; display: grid; place-items: center;")}>Reservado</div>
                    <div style={css("height: 40px; border-radius: 9px; background: rgba(204, 255, 51, 0.85); border: 1px solid #CCFF33; font-size: 11.5px; font-weight: 800; color: #071008; display: grid; place-items: center;")}>Seña ok</div>
                    <div style={css("height: 40px; border-radius: 9px; background: var(--land-slot-bg); border: 1px solid var(--land-slot-line); font-size: 11.5px; font-weight: 700; display: grid; place-items: center;")}>Reservado</div>

                    <div style={css("font-size: 12px; font-weight: 700; color: var(--land-muted2); display: grid; align-items: center;")}>21:00</div>
                    <div style={css("height: 40px; border-radius: 9px; background: rgba(204, 255, 51, 0.85); border: 1px solid #CCFF33; font-size: 11.5px; font-weight: 800; color: #071008; display: grid; place-items: center;")}>Seña ok</div>
                    <div style={css("height: 40px; border-radius: 9px; background: rgba(204, 255, 51, 0.85); border: 1px solid #CCFF33; font-size: 11.5px; font-weight: 800; color: #071008; display: grid; place-items: center;")}>Seña ok</div>
                    <div style={css("height: 40px; border-radius: 9px; background: var(--land-slot-bg); border: 1px solid var(--land-slot-line); font-size: 11.5px; font-weight: 700; display: grid; place-items: center;")}>Reservado</div>
                    <div style={css("position: relative; height: 40px; border-radius: 9px; background: var(--land-surface); border: 1px dashed var(--land-accent-line); overflow: hidden;")}>
                      <div style={css("position: absolute; inset: 0; background: linear-gradient(90deg, transparent, var(--land-accent-line), transparent); animation: sp-sweep 2.8s ease-in-out infinite;")} />
                    </div>

                    <div style={css("font-size: 12px; font-weight: 700; color: var(--land-muted2); display: grid; align-items: center;")}>22:00</div>
                    <div style={css("height: 40px; border-radius: 9px; background: var(--land-surface); border: 1px dashed var(--land-line2);")} />
                    <div style={css("height: 40px; border-radius: 9px; background: var(--land-slot-bg); border: 1px solid var(--land-slot-line); font-size: 11.5px; font-weight: 700; display: grid; place-items: center;")}>Reservado</div>
                    <div style={css("height: 40px; border-radius: 9px; background: var(--land-surface); border: 1px dashed var(--land-line2);")} />
                    <div style={css("height: 40px; border-radius: 9px; background: var(--land-surface); border: 1px dashed var(--land-line2);")} />
                  </div>

                  <div style={css("display: grid; grid-template-columns: 1fr 1fr; gap: 14px;")}>
                    <div style={css("padding: 18px; border-radius: 16px; background: var(--land-surface); border: 1px solid var(--land-line);")}>
                      <div className="sp-heading" style={css("font-weight: 800; font-size: 14.5px; margin-bottom: 14px;")}>Stock del kiosco</div>
                      <div style={css("display: grid; gap: 11px;")}>
                        {[
                          { label: "Gatorade", value: "24 u.", pct: "72%", color: "#17C964", muted: false },
                          { label: "Pelotas", value: "9 tubos", pct: "38%", color: "#CCFF33", muted: false },
                          { label: "Alquiler de equipamiento", value: "2 libres", pct: "14%", color: "#E8A34A", muted: true },
                        ].map((row) => (
                          <div key={row.label}>
                            <div style={css(`display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 600; margin-bottom: 5px; color: ${row.muted ? "#E8A34A" : "var(--land-muted)"};`)}>
                              <span>{row.label}</span>
                              <span>{row.value}</span>
                            </div>
                            <div style={css("height: 6px; border-radius: 999px; background: var(--land-surface2);")}>
                              <div style={{ ...css("height: 6px; border-radius: 999px;"), width: row.pct, background: row.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={css("padding: 18px; border-radius: 16px; background: var(--land-surface); border: 1px solid var(--land-line);")}>
                      <div className="sp-heading" style={css("font-weight: 800; font-size: 14.5px; margin-bottom: 14px;")}>Ventas de la semana</div>
                      <div style={css("display: grid; gap: 10px;")}>
                        {[
                          { label: "Turnos", value: "$1.840.000", accent: false },
                          { label: "Kiosco / bar", value: "$372.500", accent: false },
                          { label: "Señas cobradas", value: "$486.000", accent: true },
                        ].map((row, i, arr) => (
                          <div key={row.label}>
                            <div style={css("display: flex; justify-content: space-between; align-items: center; font-size: 13.5px;")}>
                              <span style={css("color: var(--land-muted); font-weight: 600;")}>{row.label}</span>
                              <span className="sp-heading" style={css(`font-weight: 900; color: ${row.accent ? "var(--land-accent-ink)" : "inherit"};`)}>{row.value}</span>
                            </div>
                            {i < arr.length - 1 && <div style={css("height: 1px; background: var(--land-line); margin-top: 10px;")} />}
                          </div>
                        ))}
                        <div style={css("margin-top: 4px; font-size: 12px; color: var(--land-green-ink); font-weight: 700;")}>▲ 18% vs. semana anterior</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={css("position: relative; z-index: 2; padding: 90px 28px;")}>
          <div style={css("max-width: 1240px; margin: 0 auto;")}>
            <div data-rise="" style={css("text-align: center; font-size: 13px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--land-muted2); margin-bottom: 28px;")}>
              Complejos que ya dejaron el cuaderno
            </div>
            <div style={css("overflow: hidden; mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); margin-bottom: 56px;")}>
              <div style={css("display: flex; gap: 56px; width: max-content; animation: sp-marquee 26s linear infinite;")}>
                {[...clientNames, ...clientNames].map((name, i) => (
                  <span key={i} className="sp-heading" style={css("font-weight: 800; font-size: 22px; color: var(--land-marquee); letter-spacing: -0.02em; white-space: nowrap;")}>{name}</span>
                ))}
              </div>
            </div>
            <div style={css("display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px;")}>
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  data-rise=""
                  style={css(
                    t.accent
                      ? "padding: 30px 28px; border-radius: 20px; background: var(--land-card-accent-bg); border: 1px solid var(--land-accent-line);"
                      : "padding: 30px 28px; border-radius: 20px; background: var(--land-surface); border: 1px solid var(--land-line);",
                  )}
                >
                  <p style={css("font-size: 17px; line-height: 1.55; margin: 0 0 22px; color: var(--land-text); text-wrap: pretty;")}>{t.quote}</p>
                  <div style={css("display: flex; align-items: center; gap: 12px;")}>
                    <div className="sp-heading" style={{ ...css("width: 38px; height: 38px; border-radius: 999px; display: grid; place-items: center; font-weight: 900; font-size: 14px;"), background: t.avatarBg, color: t.avatarColor }}>
                      {t.initials}
                    </div>
                    <div>
                      <div style={css("font-weight: 700; font-size: 14.5px;")}>{t.name}</div>
                      <div style={css("font-size: 12.5px; color: var(--land-muted2);")}>{t.place}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="precios" style={css("position: relative; z-index: 2; padding: 96px 28px; background: var(--land-bg2); border-top: 1px solid var(--land-line);")}>
          <div style={css("max-width: 1240px; margin: 0 auto;")}>
            <div data-rise="" style={css("text-align: center; max-width: 600px; margin: 0 auto 50px;")}>
              <div style={css("font-size: 13px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--land-accent-ink); margin-bottom: 14px;")}>Precios</div>
              <h2 className="sp-heading" style={css("font-weight: 900; font-size: clamp(32px, 3.8vw, 50px); line-height: 1.02; letter-spacing: -0.03em; margin: 0 0 14px;")}>Planes simples, sin letra chica</h2>
              <p style={css("font-size: 16.5px; color: var(--land-muted); line-height: 1.6; margin: 0;")}>Empezá gratis. Cambiás o cancelás cuando quieras.</p>
            </div>
            <div style={css("display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; align-items: start;")}>
              <div data-rise="" style={css("padding: 32px 28px; border-radius: 22px; background: var(--land-surface); border: 1px solid var(--land-line);")}>
                <div className="sp-heading" style={css("font-weight: 800; font-size: 17px; margin-bottom: 8px;")}>Free</div>
                <div style={css("display: flex; align-items: flex-end; gap: 6px; margin-bottom: 6px;")}>
                  <span className="sp-heading" style={css("font-weight: 900; font-size: 42px; letter-spacing: -0.04em;")}>$0</span>
                  <span style={css("color: var(--land-muted2); font-size: 14px; font-weight: 600; padding-bottom: 8px;")}>/ mes</span>
                </div>
                <p style={css("font-size: 14px; color: var(--land-muted); margin: 0 0 24px; line-height: 1.55;")}>Para probar con una cancha y ver cómo funciona.</p>
                <div style={css("display: grid; gap: 10px; margin-bottom: 26px; font-size: 14.5px; color: var(--land-text2);")}>
                  <div>1 cancha</div>
                  <div>Reservas online 24/7</div>
                  <div>Confirmación automática</div>
                </div>
                <Link href="/login" className="sp-btn-outline-pill sp-heading" style={css("display: block; text-align: center; font-weight: 800; font-size: 15px; color: var(--land-text); border: 1px solid var(--land-line2); padding: 14px; border-radius: 999px;")}>
                  Empezar gratis
                </Link>
              </div>

              <div data-rise="" style={css("position: relative; padding: 34px 30px; border-radius: 22px; background: var(--land-card-price-bg); border: 1px solid var(--land-accent-line); box-shadow: 0 28px 70px var(--land-accent-glow); animation: sp-glow-pulse 3.6s ease-in-out infinite;")}>
                <div className="sp-heading" style={css("position: absolute; top: -13px; left: 30px; padding: 5px 13px; border-radius: 999px; background: #CCFF33; color: #071008; font-weight: 900; font-size: 11.5px; letter-spacing: 0.06em; text-transform: uppercase;")}>
                  El más elegido
                </div>
                <div className="sp-heading" style={css("font-weight: 800; font-size: 17px; margin-bottom: 8px; color: var(--land-accent-ink);")}>Starter</div>
                <div style={css("display: flex; align-items: flex-end; gap: 6px; margin-bottom: 6px;")}>
                  <span className="sp-heading" style={css("font-weight: 900; font-size: 42px; letter-spacing: -0.04em;")}>$29.900</span>
                  <span style={css("color: var(--land-muted); font-size: 14px; font-weight: 600; padding-bottom: 8px;")}>/ mes</span>
                </div>
                <p style={css("font-size: 14px; color: var(--land-muted); margin: 0 0 24px; line-height: 1.55;")}>El complejo funcionando completo, con seña y recordatorios.</p>
                <div style={css("display: grid; gap: 10px; margin-bottom: 26px; font-size: 14.5px; color: var(--land-text);")}>
                  <div>Hasta 4 canchas</div>
                  <div>Cobro de seña online</div>
                  <div>Recordatorios automáticos</div>
                  <div>Dashboard en tiempo real</div>
                </div>
                <Link href="/login" className="sp-btn-primary-pill sp-heading" style={css("display: block; text-align: center; font-weight: 800; font-size: 15.5px; color: #071008; background: #CCFF33; padding: 15px; border-radius: 999px;")}>
                  Probar 14 días gratis
                </Link>
              </div>

              <div data-rise="" style={css("padding: 32px 28px; border-radius: 22px; background: var(--land-surface); border: 1px solid var(--land-line);")}>
                <div className="sp-heading" style={css("font-weight: 800; font-size: 17px; margin-bottom: 8px;")}>Pro</div>
                <div style={css("display: flex; align-items: flex-end; gap: 6px; margin-bottom: 6px;")}>
                  <span className="sp-heading" style={css("font-weight: 900; font-size: 42px; letter-spacing: -0.04em;")}>$54.900</span>
                  <span style={css("color: var(--land-muted2); font-size: 14px; font-weight: 600; padding-bottom: 8px;")}>/ mes</span>
                </div>
                <p style={css("font-size: 14px; color: var(--land-muted); margin: 0 0 24px; line-height: 1.55;")}>Para complejos grandes, con kiosco y reportes finos.</p>
                <div style={css("display: grid; gap: 10px; margin-bottom: 26px; font-size: 14.5px; color: var(--land-text2);")}>
                  <div>Canchas ilimitadas</div>
                  <div>Stock y ventas del kiosco</div>
                  <div>Reportes y exportación</div>
                  <div>Soporte prioritario</div>
                </div>
                <Link href="/login" className="sp-btn-outline-pill sp-heading" style={css("display: block; text-align: center; font-weight: 800; font-size: 15px; color: var(--land-text); border: 1px solid var(--land-line2); padding: 14px; border-radius: 999px;")}>
                  Hablar con ventas
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="cta" style={css("position: relative; z-index: 2; padding: 110px 28px; overflow: hidden;")}>
          <div style={css("position: absolute; inset: 0; background: radial-gradient(700px 420px at 50% 0%, var(--land-accent-soft), transparent 70%);")} />
          <div style={css("position: absolute; inset: 0; opacity: 0.5; background-image: linear-gradient(var(--land-court-line-faint) 1px, transparent 1px), linear-gradient(90deg, var(--land-court-line-faint) 1px, transparent 1px); background-size: 44px 44px; animation: sp-net-drift 12s linear infinite; mask-image: radial-gradient(600px 320px at 50% 50%, #000, transparent 75%);")} />
          <div style={css("position: absolute; inset: 0; opacity: 0.6;")}>
            <svg viewBox="0 0 1200 420" preserveAspectRatio="none" style={css("width: 100%; height: 100%;")}>
              <line x1={0} y1={210} x2={1200} y2={210} stroke="var(--land-court-accent)" strokeWidth={2} />
              <circle cx={600} cy={210} r={120} fill="none" stroke="var(--land-court-accent)" strokeWidth={2} />
              <line x1={600} y1={0} x2={600} y2={420} stroke="var(--land-court-accent)" strokeWidth={2} strokeDasharray="8 12" style={css("animation: sp-dash-run 14s linear infinite;")} />
            </svg>
          </div>
          <div data-rise="" style={css("position: relative; max-width: 820px; margin: 0 auto; text-align: center;")}>
            <h2 className="sp-heading" style={css("font-weight: 900; font-size: clamp(36px, 5vw, 66px); line-height: 0.98; letter-spacing: -0.035em; margin: 0 0 20px; text-wrap: balance;")}>
              Empezá a recibir reservas hoy mismo
            </h2>
            <p style={css("font-size: 19px; color: var(--land-muted); line-height: 1.55; margin: 0 auto 34px; max-width: 560px;")}>
              14 días gratis, sin tarjeta. Cargamos tus canchas y horarios con vos: en una tarde estás recibiendo turnos.
            </p>
            <div style={css("display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;")}>
              <Link href="/login" className="sp-btn-primary-xl sp-heading" style={css("font-weight: 800; font-size: 17px; color: #071008; background: #CCFF33; padding: 18px 34px; border-radius: 999px;")}>
                Probar gratis →
              </Link>
              <Link href="/login" className="sp-btn-outline-xl sp-heading" style={css("font-weight: 800; font-size: 17px; color: var(--land-text); border: 1px solid var(--land-line2); padding: 18px 30px; border-radius: 999px;")}>
                Agendar una demo
              </Link>
            </div>
          </div>
        </section>

        <footer style={css("position: relative; z-index: 2; border-top: 1px solid var(--land-line); background: var(--land-bg2); padding: 54px 28px 34px;")}>
          <div style={css("max-width: 1240px; margin: 0 auto; display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 40px;")}>
            <div>
              <div style={css("display: flex; align-items: center; gap: 10px; margin-bottom: 14px;")}>
                <div className="sp-heading" style={css("width: 30px; height: 30px; border-radius: 10px; background: linear-gradient(140deg, #CCFF33, #17C964); display: grid; place-items: center; font-weight: 900; color: #071008; font-size: 15px;")}>S</div>
                <span className="sp-heading" style={css("font-weight: 800; font-size: 17px;")}>Sistema Padel</span>
              </div>
              <p style={css("font-size: 14px; color: var(--land-muted2); line-height: 1.6; margin: 0 0 18px; max-width: 280px;")}>Reservas y gestión de canchas para complejos deportivos.</p>
              <div style={css("display: flex; gap: 9px;")}>
                {["IG", "WA", "IN"].map((s) => (
                  <a key={s} href="#" className="sp-social-icon" style={css("width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--land-line2); display: grid; place-items: center; color: var(--land-muted); font-size: 13px; font-weight: 700;")}>{s}</a>
                ))}
              </div>
            </div>
            <div style={css("display: grid; gap: 11px; align-content: start;")}>
              <div className="sp-heading" style={css("font-weight: 800; font-size: 13.5px; margin-bottom: 3px;")}>Producto</div>
              <a href="#funciones" className="sp-footer-link" style={css("font-size: 14px;")}>Funcionalidades</a>
              <a href="#precios" className="sp-footer-link" style={css("font-size: 14px;")}>Precios</a>
              <a href="#panel" className="sp-footer-link" style={css("font-size: 14px;")}>Panel de gestión</a>
            </div>
            <div style={css("display: grid; gap: 11px; align-content: start;")}>
              <div className="sp-heading" style={css("font-weight: 800; font-size: 13.5px; margin-bottom: 3px;")}>Complejos</div>
              <Link href="/login" className="sp-footer-link" style={css("font-size: 14px;")}>Sumá tu complejo</Link>
              <a href="#duenos" className="sp-footer-link" style={css("font-size: 14px;")}>Casos de éxito</a>
              <Link href="/login" className="sp-footer-link" style={css("font-size: 14px;")}>Agendar demo</Link>
            </div>
            <div style={css("display: grid; gap: 11px; align-content: start;")}>
              <div className="sp-heading" style={css("font-weight: 800; font-size: 13.5px; margin-bottom: 3px;")}>Contacto</div>
              <span className="sp-footer-link" style={css("font-size: 14px;")}>hola@sistemapadel.com</span>
              <span className="sp-footer-link" style={css("font-size: 14px;")}>+54 9 11 5555-5555</span>
              <span className="sp-footer-link" style={css("font-size: 14px;")}>Soporte</span>
            </div>
          </div>
          <div style={css("max-width: 1240px; margin: 34px auto 0; padding-top: 22px; border-top: 1px solid var(--land-line); display: flex; flex-wrap: wrap; gap: 14px; justify-content: space-between; font-size: 13px; color: var(--land-muted3);")}>
            <span>© 2026 Sistema Padel. Hecho en Argentina.</span>
            <div style={css("display: flex; gap: 20px;")}>
              <a href="#" className="sp-legal-link">Términos</a>
              <a href="#" className="sp-legal-link">Privacidad</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
