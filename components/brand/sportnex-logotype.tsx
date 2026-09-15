import type { CSSProperties } from "react";

/**
 * Logotipo oficial de SportNex: "Sport" + "Ne" en Space Grotesk más un SVG
 * que hace de X tejida (ver design_handoff_sportnex_brand/README.md — Opción
 * A / turno 9). El SVG está calibrado en em respecto al font-size, así que
 * escala junto con el texto en vez de necesitar un tamaño fijo por contexto.
 */
export function SportNexLogotype({
  size = 22,
  onDark = false,
  className,
  style,
}: {
  size?: number;
  onDark?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const lime = onDark ? "#C8FF3D" : "#8FBF00";
  const weight = size <= 16 ? 13 : size <= 21 ? 12 : 11.5;

  return (
    <span
      className={className}
      style={{
        display: "flex",
        alignItems: "baseline",
        fontFamily: "var(--font-space-grotesk), sans-serif",
        fontSize: size,
        letterSpacing: "-0.035em",
        lineHeight: 1,
        color: onDark ? "#FFFFFF" : "#0B1220",
        ...style,
      }}
    >
      <span style={{ fontWeight: 500 }}>Sport</span>
      <span style={{ fontWeight: 700 }}>Ne</span>
      <svg
        viewBox="0 0 62 70"
        fill="none"
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.7)}
        aria-hidden="true"
        style={{ flex: "none", marginLeft: 1 }}
      >
        <path d="M6 0L56 70" stroke="currentColor" strokeWidth={weight} />
        <path d="M56 0L38 25" stroke={lime} strokeWidth={weight} />
        <path d="M24 44L6 70" stroke={lime} strokeWidth={weight} />
      </svg>
    </span>
  );
}
