import { useEffect, useState } from "react";
import type { GameState } from "./reducer";
import { TERR_BY_ID } from "./territories";
import { IconSoldier, IconTank, IconPlane } from "./icons";

/** Overlay épico que aparece brevemente cuando se resuelve una batalla. */
export function BattleOverlay({ state }: { state: GameState }) {
  const [shown, setShown] = useState<GameState["lastBattle"] | null>(null);
  const [meta, setMeta] = useState<{
    atkName: string; defName: string; atkColor: string; defColor: string;
    atkKind: "INFANTRY" | "TANK" | "PLANE"; terrName: string;
  } | null>(null);
  const [phase, setPhase] = useState<"in" | "clash" | "out">("in");

  useEffect(() => {
    if (!state.lastBattle) return;
    const src = state.attackSource;
    const tgt = state.attackTarget;
    if (!src || !tgt) return;
    const atkOwner = state.territories[src].owner;
    const defOwner = state.territories[tgt].owner;
    setMeta({
      atkName: state.players[atkOwner]?.name ?? "Atacante",
      defName: state.players[defOwner]?.name ?? "Defensor",
      atkColor: state.players[atkOwner]?.color ?? "#b5453a",
      defColor: state.players[defOwner]?.color ?? "#3d6fa5",
      atkKind: state.attackKind,
      terrName: TERR_BY_ID[tgt]?.name ?? tgt,
    });
    setShown(state.lastBattle);
    setPhase("in");
    const t1 = window.setTimeout(() => setPhase("clash"), 350);
    const t2 = window.setTimeout(() => setPhase("out"), 1550);
    const t3 = window.setTimeout(() => setShown(null), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [state.lastBattle]);

  if (!shown || !meta) return null;

  const AtkIcon = meta.atkKind === "TANK" ? IconTank : meta.atkKind === "PLANE" ? IconPlane : IconSoldier;

  return (
    <div className={`battle-overlay ${phase}`} aria-hidden="true">
      <div className="bo-flash" />
      <div className="bo-stage">
        <div className="bo-side bo-atk" style={{ color: meta.atkColor }}>
          <div className="bo-label">⚔ Ataque</div>
          <div className="bo-name">{meta.atkName}</div>
          <div className="bo-unit"><AtkIcon size={32} color={meta.atkColor} /></div>
          <div className="bo-dice">
            {shown.atk.map((d, i) => (
              <div key={i} className={`bo-die bo-die-atk ${i < shown.atkLost ? "lost" : ""}`} style={{ animationDelay: `${400 + i * 90}ms`, background: meta.atkColor }}>{d}</div>
            ))}
          </div>
          <div className="bo-losses">{shown.atkLost > 0 ? `−${shown.atkLost}` : "·"}</div>
        </div>

        <div className="bo-vs">
          <div className="bo-vs-text">VS</div>
          <div className="bo-terr">{meta.terrName}</div>
        </div>

        <div className="bo-side bo-def" style={{ color: meta.defColor }}>
          <div className="bo-label">🛡 Defensa</div>
          <div className="bo-name">{meta.defName}</div>
          <div className="bo-unit"><IconSoldier size={72} color={meta.defColor} /></div>
          <div className="bo-dice">
            {shown.def.map((d, i) => (
              <div key={i} className={`bo-die bo-die-def ${i < shown.defLost ? "lost" : ""}`} style={{ animationDelay: `${400 + i * 90}ms`, background: meta.defColor }}>{d}</div>
            ))}
          </div>
          <div className="bo-losses">{shown.defLost > 0 ? `−${shown.defLost}` : "·"}</div>
        </div>
      </div>
      {shown.note && <div className="bo-note">{shown.note}</div>}
    </div>
  );
}
