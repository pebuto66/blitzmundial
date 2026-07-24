import { useEffect, useState } from "react";

const AUTHOR = "Pep Busquets";
const URL = "https://pepbusquets.com/";
const VERSION = "1.0";

/** Enlace fijo abajo-izquierda */
export function CreditsLink() {
  return (
    <a
      className="credits-link"
      href={URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Made by ${AUTHOR}`}
    >
      Made by {AUTHOR} ↗
    </a>
  );
}

/** Botón ⓘ arriba-derecha + modal */
export function InfoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="credits-info-btn"
        aria-label="Información"
        title="Información"
        onClick={() => setOpen(true)}
      >
        ⓘ
      </button>
      {open && (
        <div className="credits-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="credits-modal" onClick={(e) => e.stopPropagation()}>
            <div className="credits-modal-title">Blitz Mundial</div>
            <div className="credits-modal-version">Versión {VERSION}</div>
            <div className="credits-modal-by">Creado por</div>
            <div className="credits-modal-author">{AUTHOR}</div>
            <a
              className="credits-modal-link"
              href={URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {URL}
            </a>
            <div className="credits-modal-actions">
              <button className="btn" onClick={() => setOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Pequeña sección "Creado por" para el menú de configuración / setup */
export function CreditsFooter() {
  return (
    <div className="credits-footer">
      <span>Creado por {AUTHOR}</span>
      <a className="btn ghost sm" href={URL} target="_blank" rel="noopener noreferrer">
        Visitar web
      </a>
    </div>
  );
}

/** Splash inicial (~2s con fade-out) */
export function Splash() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), 1700);
    const t2 = setTimeout(() => setPhase("gone"), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (phase === "gone") return null;
  return (
    <div className={`credits-splash ${phase === "out" ? "fade-out" : ""}`} aria-hidden="true">
      <div className="credits-splash-title">BLITZ MUNDIAL</div>
      <div className="credits-splash-by">by {AUTHOR}</div>
    </div>
  );
}
