import { useEffect, useRef, useState } from "react";
import type { GameState } from "./reducer";
import { TERR_BY_ID } from "./territories";
import { IconSoldier, IconTank, IconPlane } from "./icons";

/** Overlay compacto que aparece brevemente cuando se resuelve una batalla. */
export function BattleOverlay({ state }: { state: GameState }) {
  const [shown, setShown] = useState<GameState["lastBattle"] | null>(null);
  const [meta, setMeta] = useState<{
    atkName: string; defName: string; atkColor: string; defColor: string;
    atkKind: "INFANTRY" | "TANK" | "PLANE"; terrName: string;
  } | null>(null);
  const [phase, setPhase] = useState<"in" | "clash" | "out">("in");
  const seenRef = useRef<GameState["lastBattle"] | null>(null);

  useEffect(() => {
    const lb = state.lastBattle;
    // Si el reducer limpió lastBattle (fin de ataque/turno), esconder de inmediato.
    if (!lb) {
      setShown(null);
      seenRef.current = null;
      return;
    }
    // Evitar re-disparo si ya lo estamos mostrando (misma referencia)
    if (seenRef.current === lb) return;
    seenRef.current = lb;

    // Tomamos propietarios del snapshot en lastBattle: reflejan el estado
    // JUSTO antes de que la conquista cambiara el dueño del territorio.
    setMeta({
      atkName: state.players[lb.atkOwner]?.name ?? "Atacante",
      defName: state.players[lb.defOwner]?.name ?? "Defensor",
      atkColor: state.players[lb.atkOwner]?.color ?? "#b5453a",
      defColor: state.players[lb.defOwner]?.color ?? "#3d6fa5",
      atkKind: lb.atkKind,
      terrName: TERR_BY_ID[lb.terrId]?.name ?? lb.terrId,
    });
    setShown(lb);
    setPhase("in");
    const t1 = window.setTimeout(() => setPhase("clash"), 220);
    const t2 = window.setTimeout(() => setPhase("out"), 1000);
    const t3 = window.setTimeout(() => { setShown(null); seenRef.current = null; }, 1250);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [state.lastBattle, state.players]);

  if (!shown || !meta) return null;

  const AtkIcon = meta.atkKind === "TANK" ? IconTank : meta.atkKind === "PLANE" ? IconPlane : IconSoldier;

  return (
    <div className={`battle-overlay ${phase}`} aria-hidden="true">
      <div className="bo-flash" />
      <div className="bo-stage">
        <div className="bo-side bo-atk" style={{ color: meta.atkColor }}>
          <div className="bo-label">⚔ {meta.atkName}</div>
          <div className="bo-unit"><AtkIcon size={22} color={meta.atkColor} /></div>
          <div className="bo-dice">
            {shown.atk.map((d, i) => (
              <div key={i} className={`bo-die bo-die-atk ${i < shown.atkLost ? "lost" : ""}`} style={{ animationDelay: `${180 + i * 60}ms`, background: meta.atkColor }}>{d}</div>
            ))}
          </div>
          <div className="bo-losses">{shown.atkLost > 0 ? `−${shown.atkLost}` : "·"}</div>
        </div>

        <div className="bo-vs">
          <div className="bo-vs-text">VS</div>
          <div className="bo-terr">{meta.terrName}</div>
        </div>

        <div className="bo-side bo-def" style={{ color: meta.defColor }}>
          <div className="bo-label">🛡 {meta.defName}</div>
          <div className="bo-unit"><IconSoldier size={22} color={meta.defColor} /></div>
          <div className="bo-dice">
            {shown.def.map((d, i) => (
              <div key={i} className={`bo-die bo-die-def ${i < shown.defLost ? "lost" : ""}`} style={{ animationDelay: `${180 + i * 60}ms`, background: meta.defColor }}>{d}</div>
            ))}
          </div>
          <div className="bo-losses">{shown.defLost > 0 ? `−${shown.defLost}` : "·"}</div>
        </div>
      </div>
      {shown.note && <div className="bo-note">{shown.note}</div>}
    </div>
  );
}
