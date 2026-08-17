import { TERR_BY_ID } from "./territories";
import type { GameState, Notice, OilReport } from "./reducer";

/** Panel flotante estilo "parte de guerra": no bloquea el resto de la interfaz. */
function NoticePanel({
  tone, label, title, children, onClose, footer,
}: {
  tone: "oil" | "scorched" | "history";
  label: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <div className={`war-notice ${tone}`} role="dialog" aria-label={title}>
      <div className="wn-head">
        <div>
          <div className="wn-label">{label}</div>
          <div className="wn-title">{title}</div>
        </div>
        <button className="wn-x" onClick={onClose} title="Cerrar aviso" aria-label="Cerrar">✕</button>
      </div>
      <div className="wn-body">{children}</div>
      <div className="wn-foot">
        {footer}
        <button className="btn sm" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

function OilLines({ report }: { report: OilReport }) {
  return (
    <>
      <div className="wn-row total">
        <span>Petróleo al inicio del turno</span>
        <span className="mono">{report.from} L</span>
      </div>
      {report.lines.map((l, i) => (
        <div className="wn-row" key={i}>
          <span>{l.reason}</span>
          <span className={`mono ${l.delta > 0 ? "pos" : l.delta < 0 ? "neg" : ""}`}>
            {l.delta === 0 ? "—" : `${l.delta > 0 ? "+" : "−"}${Math.abs(l.delta)} L`}
          </span>
        </div>
      ))}
      <div className="wn-row total">
        <span>Petróleo al final del turno</span>
        <span className="mono">{report.to} L</span>
      </div>
      <div className="wn-summary">
        Tu petróleo {report.to >= report.from ? "subió" : "bajó"} de {report.from} L a {report.to} L.
      </div>
    </>
  );
}

export function OilReportNotice({ report, onClose }: { report: OilReport; onClose: () => void }) {
  return (
    <NoticePanel
      tone="oil"
      label="Informe de logística"
      title="Resumen de petróleo del turno"
      onClose={onClose}
    >
      <OilLines report={report} />
    </NoticePanel>
  );
}

export function ScorchedNotice({
  terrId, prevOwner, onClose,
}: { terrId: string; prevOwner: string; onClose: () => void }) {
  return (
    <NoticePanel tone="scorched" label="Parte de guerra" title="Tierra quemada" onClose={onClose}>
      <p style={{ margin: 0 }}>
        Territorio <b>{TERR_BY_ID[terrId]?.name ?? terrId}</b> conquistado, pero tu rival{" "}
        <b>{prevOwner}</b> se replegó a tiempo: el territorio estaba en <b>tierra quemada</b>.
        No se cobra carta por esta conquista.
      </p>
      <p style={{ margin: "8px 0 0", opacity: 0.85 }}>
        Fue una jugada táctica del rival (repliegue estratégico), no un error del juego.
      </p>
    </NoticePanel>
  );
}

/** Historial consultable de avisos ya cerrados. */
export function NoticeHistory({
  state, pid, onClose,
}: { state: GameState; pid: number; onClose: () => void }) {
  const mine: Notice[] = (state.notices ?? []).filter((n) => n.pid === pid).slice().reverse();
  return (
    <NoticePanel tone="history" label="Archivo" title="Historial de avisos" onClose={onClose}>
      {mine.length === 0 && <div style={{ opacity: 0.8 }}>Todavía no hay avisos registrados.</div>}
      {mine.map((n, i) => (
        <div className="wn-hist" key={i}>
          {n.kind === "oil" ? (
            <>
              <div className="wn-hist-title">Resumen de petróleo · {n.report.from} L → {n.report.to} L</div>
              <OilLines report={n.report} />
            </>
          ) : (
            <div className="wn-hist-title">
              Tierra quemada en {TERR_BY_ID[n.terrId]?.name ?? n.terrId} (rival: {n.prevOwner}) · sin carta
            </div>
          )}
        </div>
      ))}
    </NoticePanel>
  );
}
