// Iconos SVG inline para las unidades y estructuras de Rapid-Risk.
// Todos aceptan `size` y `color` (currentColor por defecto).

type P = { size?: number; color?: string; title?: string };

const wrap = (children: React.ReactNode, size = 16, title?: string) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-label={title}
  >
    {children}
  </svg>
);

/** Soldado (infantería) */
export const IconSoldier = ({ size, color, title }: P) => (
  <span style={{ color: color ?? "currentColor", display: "inline-flex" }}>
    {wrap(
      <>
        <circle cx="12" cy="6" r="2.4" />
        <path d="M6 20v-3.5c0-2.5 2.7-4.5 6-4.5s6 2 6 4.5V20" />
        <path d="M9 12l-1 8M15 12l1 8" />
      </>,
      size,
      title ?? "Infantería",
    )}
  </span>
);

/** Tanque */
export const IconTank = ({ size, color, title }: P) => (
  <span style={{ color: color ?? "currentColor", display: "inline-flex" }}>
    {wrap(
      <>
        <rect x="3" y="12" width="18" height="6" rx="1" />
        <circle cx="7" cy="19.5" r="1.5" />
        <circle cx="12" cy="19.5" r="1.5" />
        <circle cx="17" cy="19.5" r="1.5" />
        <rect x="8" y="8" width="8" height="4" rx="0.5" />
        <path d="M16 10h6" />
      </>,
      size,
      title ?? "Tanque",
    )}
  </span>
);

/** Avión de combate - vista cenital con alas en delta, cola y cabina */
export const IconPlane = ({ size, color, title }: P) => (
  <span style={{ color: color ?? "currentColor", display: "inline-flex" }}>
    {wrap(
      <>
        {/* punta/nariz */}
        <path d="M12 2l1.2 3.6h-2.4z" />
        {/* fuselaje */}
        <path d="M10.8 5.6h2.4v10.4h-2.4z" />
        {/* alas en delta */}
        <path d="M10.8 8.4L4 13v2l6.8-3.6z" />
        <path d="M13.2 8.4L20 13v2l-6.8-3.6z" />
        {/* cola */}
        <path d="M10.8 16h-3l-1.2 3h4.2z" />
        <path d="M13.2 16h3l1.2 3h-4.2z" />
        {/* cabina */}
        <path d="M11.4 6.8h1.2v2h-1.2z" />
      </>,
      size,
      title ?? "Avión",
    )}
  </span>
);

/** Torre de petróleo — torre de perforación realista con celosía, base y pozo */
export const IconTower = ({ size, color, title }: P) => (
  <span style={{ color: color ?? "currentColor", display: "inline-flex" }}>
    {wrap(
      <>
        {/* base de la torre */}
        <rect x="7" y="17" width="10" height="3" rx="0.5" />
        {/* estructura de celosía */}
        <path d="M8 17l4-14M16 17l-4-14" />
        <line x1="9" y1="14" x2="15" y2="14" />
        <line x1="10" y1="10" x2="14" y2="10" />
        <line x1="11" y1="6" x2="13" y2="6" />
        {/* diagonales de celosía */}
        <line x1="8" y1="17" x2="12" y2="13" />
        <line x1="16" y1="17" x2="12" y2="13" />
        <line x1="9" y1="13" x2="12" y2="10" />
        <line x1="15" y1="13" x2="12" y2="10" />
        {/* cabezal/bomba en la cima */}
        <rect x="10" y="2" width="4" height="2" rx="0.3" />
        {/* pozo/tubería */}
        <line x1="12" y1="20" x2="12" y2="23" />
      </>,
      size,
      title ?? "Torre de petróleo",
    )}
  </span>
);

/** Aeropuerto — torre de control con pista (SVG inline, se ve en cualquier fondo) */
export const IconAirport = ({ size = 20, color, title, badge }: P & { badge?: boolean }) => (
  <span
    className={badge ? "airport-badge" : undefined}
    style={{ color: color ?? "#e8e2cf", display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}
    aria-label={title ?? "Aeropuerto"}
    title={title ?? "Aeropuerto"}
  >
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* torre de control */}
      <path d="M9 21V10l3-7 3 7v11" />
      <path d="M9.4 11.5h5.2" />
      {/* antena */}
      <path d="M12 3V1.4" />
      {/* pista */}
      <path d="M3 21h18" />
      <path d="M5.5 17.5h2M16.5 17.5h2" />
    </svg>
  </span>
);


/** Silo de misiles — señal de peligro amarilla y negra (estilo portada) */
export const IconSilo = ({ size = 16, title }: P) => (
  <span style={{ display: "inline-flex" }} aria-label={title ?? "Silo de misiles"}>
    <svg width={size} height={size} viewBox="0 0 24 24">
      {/* Triángulo amarillo con borde negro */}
      <path
        d="M12 2.2 L22.2 20.5 H1.8 Z"
        fill="#f4c518"
        stroke="#111"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Misil/silo negro central */}
      <g fill="#111">
        <path d="M12 7.4c1.05 0 1.9 1 1.9 2.3v5.2h-3.8V9.7c0-1.3.85-2.3 1.9-2.3z" />
        <path d="M10.2 15.6h3.6v1.5h-3.6z" />
        <circle cx="12" cy="9.4" r="0.55" fill="#f4c518" />
      </g>
    </svg>
  </span>
);

/** Misil nuclear */
export const IconNuke = ({ size, color, title }: P) => (
  <span style={{ color: color ?? "currentColor", display: "inline-flex" }}>
    {wrap(
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <path d="M12 3a4 4 0 014 4M12 21a4 4 0 01-4-4M21 12a4 4 0 01-4 4M3 12a4 4 0 014-4" />
      </>,
      size,
      title ?? "Misil nuclear",
    )}
  </span>
);

/** Símbolos de carta (alias para uso en cartas) */
export const IconCardSoldier = ({ size, color }: P) => <IconSoldier size={size} color={color} title="Soldado" />;
export const IconCardPlane = ({ size, color }: P) => <IconPlane size={size} color={color} title="Avión" />;
export const IconCardTank = ({ size, color }: P) => <IconTank size={size} color={color} title="Tanque" />;
export const IconWild = ({ size, color }: P) => (
  <span style={{ color: color ?? "currentColor", display: "inline-flex" }}>
    {wrap(
      <>
        <path d="M12 2l2.5 5 5.5.5-4 4 1 5.5L12 14l-5 3 1-5.5-4-4 5.5-.5z" />
      </>,
      size,
      "Comodín",
    )}
  </span>
);

/** Petróleo (gota) — para KPI/log */
export const IconOil = ({ size, color, title }: P) => (
  <span style={{ color: color ?? "currentColor", display: "inline-flex" }}>
    {wrap(
      <>
        <path d="M12 2c4 6 7 9 7 13a7 7 0 11-14 0c0-4 3-7 7-13z" />
      </>,
      size,
      title ?? "Petróleo",
    )}
  </span>
);
