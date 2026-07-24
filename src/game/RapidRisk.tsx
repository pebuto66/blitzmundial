import { useReducer, useState, useEffect, useRef, type ReactNode } from "react";
import worldMap from "@/assets/world-map.jpg.asset.json";
import "./game.css";
import { TERRITORIES, TERR_BY_ID, CONTINENTS, type TerrSymbol } from "./territories";
import {
  reducer, initGame, ownedCount, playerOil, territoryArmyCount,
  PLAYER_COLORS, DEFAULT_NAMES, STARTING, PLANE_OIL_PER_STEP, bfsDist, classifyTrade,
  playerHasAirport, playerHasSilo, reinforcePending, CONQUEROR_NAMES,
  playerAirports, playerSilos, playerTroops,
  type GameState, type UnitKind, type SetupItem, type Action, type TradeReward, type Card,
} from "./reducer";
import { nextBotAction } from "./bot";
import {
  IconSoldier, IconTank, IconPlane, IconTower, IconAirport, IconSilo, IconNuke, IconOil,
  IconCardSoldier, IconCardPlane, IconCardTank, IconWild,
} from "./icons";
import { playDice, playAttack, playConquest, playMissile, setMuted, isMuted } from "./sounds";
import { Manual } from "./Manual";
import { SaveLoadDialog } from "./SaveLoadDialog";
import { BattleOverlay } from "./BattleOverlay";
import { OnlineDialog } from "./OnlineDialog";
import type { ChatMessage, RoomHandle } from "./online";
import { Chat } from "./Chat";
import { CreditsLink, InfoButton, Splash, CreditsFooter } from "./Credits";

function CardIcon({ sym, size }: { sym: TerrSymbol; size?: number }) {
  if (sym === "S") return <IconCardSoldier size={size} />;
  if (sym === "P") return <IconCardPlane size={size} />;
  if (sym === "T") return <IconCardTank size={size} />;
  return <IconWild size={size} />;
}

function cardTitle(c: Card): string {
  const symName = c.symbol === "S" ? "Soldado" : c.symbol === "P" ? "Avión" : c.symbol === "T" ? "Tanque" : "Comodín";
  if (!c.territoryId) return symName;
  return `${TERR_BY_ID[c.territoryId].name} · ${symName}`;
}

export function RapidRisk() {
  const [setupCount, setSetupCount] = useState(3);
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES.slice());
  const [bots, setBots] = useState<boolean[]>(() => [false, false, true, true, true, true]);
  const [initial, setInitial] = useState<GameState | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);
  const [saveDlgOpen, setSaveDlgOpen] = useState(false);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [liveState, setLiveState] = useState<GameState | null>(null);
  const [online, setOnline] = useState<{ room: RoomHandle; mySeat: number } | null>(null);
  const [remoteState, setRemoteState] = useState<GameState | null>(null);

  function loadIntoGame(s: GameState) {
    setInitial(s);
    setGameKey((k) => k + 1);
    setSaveDlgOpen(false);
  }

  function exitGame() {
    if (online) {
      void online.room.leave();
      setOnline(null);
      setRemoteState(null);
    }
    setInitial(null);
  }

  const content = !initial ? (
      <>

        <Setup
          count={setupCount} setCount={setSetupCount}
          names={names} setNames={setNames}
          bots={bots} setBots={setBots}
          onStart={() => {
            const inputs = Array.from({ length: setupCount }).map((_, i) => ({
              name: bots[i]
                ? (names[i]?.trim() || CONQUEROR_NAMES[i % CONQUEROR_NAMES.length])
                : (names[i]?.trim() || DEFAULT_NAMES[i]),
              isBot: bots[i],
            }));
            setInitial(initGame(inputs));
            setGameKey((k) => k + 1);
          }}
          onOpenManual={() => setManualOpen(true)}
          onOpenSaveLoad={() => setSaveDlgOpen(true)}
          onOpenOnline={() => setOnlineOpen(true)}
        />
        {manualOpen && <Manual onClose={() => setManualOpen(false)} />}
        {saveDlgOpen && (
          <SaveLoadDialog state={null} onClose={() => setSaveDlgOpen(false)} onLoad={loadIntoGame} />
        )}
        {onlineOpen && (
          <OnlineDialog
            onClose={() => setOnlineOpen(false)}
            onRemoteState={(s) => setRemoteState(s)}
            onStart={({ room, mySeat, initialState }) => {
              setOnline({ room, mySeat });
              setOnlineOpen(false);
              setInitial(initialState);
              setGameKey((k) => k + 1);
            }}
          />
        )}
      </>
    ) : (
    <>
      <GameRoot key={gameKey} initial={initial} onExit={exitGame}
        onOpenManual={() => setManualOpen(true)}
        onOpenSaveLoad={() => setSaveDlgOpen(true)}
        onStateChange={setLiveState}
        online={online ? {
          mySeat: online.mySeat,
          code: online.room.code,
          room: online.room,
          remoteState,
          sendState: (s) => online.room.sendState(s),
        } : null}
      />
      {manualOpen && <Manual onClose={() => setManualOpen(false)} />}
      {saveDlgOpen && (
        <SaveLoadDialog state={liveState} onClose={() => setSaveDlgOpen(false)} onLoad={loadIntoGame} />
      )}
    </>
  );

  return (
    <>
      <Splash />
      {content}
      <CreditsLink />
      <InfoButton />
    </>
  );
}



/* ═════════ SETUP INICIAL ═════════ */
function Setup({ count, setCount, names, setNames, bots, setBots, onStart, onOpenManual, onOpenSaveLoad, onOpenOnline }: {
  count: number; setCount: (n: number) => void;
  names: string[]; setNames: (n: string[]) => void;
  bots: boolean[]; setBots: (b: boolean[]) => void;
  onStart: () => void;
  onOpenManual: () => void;
  onOpenSaveLoad: () => void;
  onOpenOnline: () => void;
}) {
  const kit = STARTING[count];

  function toggleBot(i: number) {
    const next = bots.slice();
    next[i] = !next[i];
    setBots(next);
    // Sugerir nombre de conquistador si el usuario aún no puso uno personalizado
    const cur = names[i]?.trim() ?? "";
    if (next[i] && (cur === "" || cur === DEFAULT_NAMES[i])) {
      const nn = names.slice();
      nn[i] = CONQUEROR_NAMES[i % CONQUEROR_NAMES.length];
      setNames(nn);
    } else if (!next[i] && CONQUEROR_NAMES.includes(cur)) {
      const nn = names.slice();
      nn[i] = DEFAULT_NAMES[i];
      setNames(nn);
    }
  }

  return (
    <div className="app">
      <div className="setup">
        <div className="subtitle">// Comando Estratégico Global</div>
        <h1>Blitz <span className="brass">Mundial</span></h1>
        <div className="subtitle" style={{ marginBottom: 32 }}>Dominio Mundial · v3 — Reglas Oficiales</div>

        <div className="panel">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="title-font" style={{ fontSize: 14, color: "#c9a227" }}>Número de Jugadores</div>
            <div className="counter">
              <button onClick={() => setCount(Math.max(2, count - 1))}>−</button>
              <div className="value">{count}</div>
              <button onClick={() => setCount(Math.min(6, count + 1))}>+</button>
            </div>
          </div>

          <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="player-row">
                <div className="swatch" style={{ background: PLAYER_COLORS[i] }} />
                <input
                  value={names[i] ?? ""}
                  onChange={(e) => { const next = names.slice(); next[i] = e.target.value; setNames(next); }}
                  placeholder={bots[i] ? CONQUEROR_NAMES[i % CONQUEROR_NAMES.length] : DEFAULT_NAMES[i]}
                />
                <button
                  className={`btn sm ${bots[i] ? "" : "ghost"}`}
                  onClick={() => toggleBot(i)}
                  title={bots[i] ? "Este jugador lo controla la IA" : "Este jugador es humano"}
                  style={{ minWidth: 74 }}
                >
                  {bots[i] ? "🤖 Bot" : "👤 Humano"}
                </button>
              </div>
            ))}
          </div>
        </div>


        <div className="panel" style={{ marginTop: 16 }}>
          <div className="title-font" style={{ fontSize: 13, color: "#c9a227", marginBottom: 8 }}>Materiales para cada jugador</div>
          <div className="materials">
            <span><IconSoldier size={14} /> {kit.armies} ejércitos</span>
            <span><IconTower size={14} /> {kit.towers} torres</span>
            <span><IconPlane size={14} /> {kit.planes} aviones</span>
            <span><IconTank size={14} /> {kit.tanks} tanques</span>
            <span><IconAirport size={14} /> {kit.airports} aeropuertos</span>
            <span><IconSilo size={14} /> {kit.silos} silo</span>
          </div>
          <ul className="hint" style={{ margin: "10px 0 0", paddingLeft: 18 }}>
            <li>🎯 <b>Un objetivo de ataque por turno</b> — solo puedes atacar varias veces al mismo territorio.</li>
            <li>✈️ <b>Aviones</b>: cuestan <b>50 L</b> por territorio recorrido, ida y vuelta (solo se usan 1 vez).</li>
            <li>🛡 <b>Tanques</b>: <b>25 L</b> por territorio atacado y suman <b>+2</b> en combate.</li>
            <li>☢️ <b>Silo de misiles</b> → permite lanzar un <b>misil nuclear</b>.</li>
            <li>🛫 <b>Aeropuerto</b> → <b>+1 avión</b> de reserva por turno y da <b>alcance global</b> a los aviones.</li>
            <li>🛡️ <b>Aeropuerto</b> → actúa como <b>escudo antiaéreo</b> contra aviones enemigos.</li>
            <li>💥 Un <b>misil</b> destruye las torres en su zona de impacto.</li>
          </ul>
        </div>

        <div style={{ marginTop: 24, textAlign: "right" }}>
          <button className="btn ghost" style={{ marginRight: 8 }} onClick={onOpenManual}>📖 Manual del jugador</button>
          <button className="btn ghost" style={{ marginRight: 8 }} onClick={onOpenSaveLoad}>📂 Cargar partida</button>
          <button className="btn ghost" style={{ marginRight: 8 }} onClick={onOpenOnline}>🌐 Multijugador online</button>
          <button className="btn" onClick={onStart}>Iniciar Partida</button>
        </div>
      </div>
    </div>
  );
}

/* ═════════ GAME ROOT ═════════ */
function GameRoot({ initial, onExit, onOpenManual, onOpenSaveLoad, onStateChange, online }: {
  initial: GameState; onExit: () => void; onOpenManual: () => void;
  onOpenSaveLoad: () => void; onStateChange: (s: GameState) => void;
  online: { mySeat: number; code: string; room: RoomHandle; remoteState: GameState | null; sendState: (s: GameState) => void } | null;
}) {
  const [state, rawDispatch] = useReducer(reducer, initial);
  const skipBroadcastRef = useRef(true); // no reenviar el estado inicial
  const onlineMySeat = online?.mySeat ?? null;
  const onlineRemote = online?.remoteState ?? null;
  const sendStateRef = useRef<((s: GameState) => void) | null>(null);
  sendStateRef.current = online?.sendState ?? null;
  const isOnline = !!online;
  const canPlay = !isOnline || state.current === onlineMySeat || state.winner !== null;
  const dispatch = ((action: Action) => {
    if (!canPlay) return;
    rawDispatch(action);
  }) as React.Dispatch<Action>;

  // Aplica estado remoto: hidratar sin re-broadcast
  useEffect(() => {
    if (!onlineRemote) return;
    skipBroadcastRef.current = true;
    rawDispatch({ type: "HYDRATE", state: onlineRemote });
  }, [onlineRemote]);

  // Notifica al padre + retransmite al canal cuando corresponde
  useEffect(() => {
    onStateChange(state);
    if (isOnline) {
      if (skipBroadcastRef.current) skipBroadcastRef.current = false;
      else sendStateRef.current?.(state);
    }
  }, [state, onStateChange, isOnline]);

  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [fortifyInf, setFortifyInf] = useState(1);
  const [fortifyTk, setFortifyTk] = useState(0);
  const [fortifyPl, setFortifyPl] = useState(0);
  const [occupyInf, setOccupyInf] = useState(0);
  const [nukeMode, setNukeMode] = useState(false);
  const [reinforceCount, setReinforceCount] = useState(1);
  const [captured, setCaptured] = useState<Set<string>>(new Set());
  const [muted, setMutedState] = useState(isMuted());
  const [botPaused, setBotPaused] = useState(false);
  const ownersRef = useRef<Record<string, number>>(
    Object.fromEntries(Object.entries(initial.territories).map(([k, v]) => [k, v.owner])),
  );

  // Motor de bots: cuando el jugador actual es una IA, ejecuta acciones con un pequeño delay.
  // En modo online, sólo el anfitrión (mySeat === 0) dispara acciones de bot para evitar
  // que múltiples clientes ejecuten el mismo turno.
  const botStuckRef = useRef<{ key: string; count: number }>({ key: "", count: 0 });
  useEffect(() => {
    if (isOnline && onlineMySeat !== 0) return;
    if (state.winner !== null) return;
    if (botPaused) return;
    const cur = state.players[state.current];
    if (!cur.isBot || !cur.alive) return;
    const delay = state.lastBattle ? 900 : state.pendingOccupy ? 500 : 350;
    const handle = window.setTimeout(() => {
      const action = nextBotAction(state);
      const key = `${state.phase}:${state.current}:${JSON.stringify(action)}`;
      const stuck = botStuckRef.current;
      if (stuck.key === key) stuck.count += 1;
      else { stuck.key = key; stuck.count = 1; }
      if (stuck.count >= 3) {
        stuck.key = ""; stuck.count = 0;
        if (state.phase === "ATTACK") { rawDispatch({ type: "END_ATTACK" }); return; }
        if (state.phase === "FORTIFY") { rawDispatch({ type: "END_TURN" }); return; }
        if (state.phase === "REINFORCE") { rawDispatch({ type: "END_REINFORCE" }); return; }
      }
      if (action) rawDispatch(action);
      else if (state.phase === "ATTACK") rawDispatch({ type: "END_ATTACK" });
      else if (state.phase === "FORTIFY") rawDispatch({ type: "END_TURN" });
    }, delay);
    return () => window.clearTimeout(handle);
  }, [state, botPaused, isOnline, onlineMySeat]);

  // Chat online: nos suscribimos con setHandlers para preservar los mismos callbacks de estado
  // que ya usa el lobby, y recuperamos los mensajes acumulados.
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const onlineRoom = online?.room ?? null;
  useEffect(() => {
    if (!onlineRoom) return;
    const prior = onlineRoom.setHandlers({
      onState: (s) => { skipBroadcastRef.current = true; rawDispatch({ type: "HYDRATE", state: s }); },
      onChat: (m) => setChatMessages((prev) => [...prev, m]),
    });
    if (prior.length) setChatMessages(prior);
  }, [onlineRoom]);





  // Battle SFX + shake on each resolved battle
  useEffect(() => {
    if (!state.lastBattle) return;
    playDice(state.lastBattle.atk.length);
    window.setTimeout(() => playAttack(), 350);
  }, [state.lastBattle]);

  // Conquest SFX + capture flash on ownership change
  useEffect(() => {
    const flashed: string[] = [];
    for (const id in state.territories) {
      const o = state.territories[id].owner;
      if (ownersRef.current[id] !== undefined && ownersRef.current[id] !== o) flashed.push(id);
      ownersRef.current[id] = o;
    }
    if (flashed.length === 0) return;
    playConquest();
    setCaptured((prev) => {
      const next = new Set(prev);
      flashed.forEach((id) => next.add(id));
      return next;
    });
    const t = window.setTimeout(() => {
      setCaptured((prev) => {
        const next = new Set(prev);
        flashed.forEach((id) => next.delete(id));
        return next;
      });
    }, 900);
    return () => window.clearTimeout(t);
  }, [state.territories]);

  const current = state.players[state.current];

  function onTerritoryClick(id: string) {
    const t = state.territories[id];
    if (nukeMode) {
      if (t.owner !== current.id) {
        playMissile();
        dispatch({ type: "LAUNCH_NUKE", target: id });
      }
      setNukeMode(false);
      return;
    }
    if (state.phase === "SETUP") {
      if (t.owner === current.id) dispatch({ type: "SETUP_PLACE", territory: id });
      return;
    }
    if (state.phase === "REINFORCE") {
      if (t.owner === current.id) dispatch({ type: "PLACE_REINFORCEMENT", territory: id, count: reinforceCount });
      return;
    }
    if (state.phase === "ATTACK") {
      if (state.pendingOccupy) return;
      if (t.owner === current.id) {
        // permitir cambiar de origen incluso con objetivo fijado (mismo target por turno)
        const hasUnit = state.attackKind === "TANK" ? t.tanks >= 1
          : state.attackKind === "PLANE" ? (t.planes >= 1 && t.airport)
          : t.infantry >= 1; // permite tierra quemada con 1 infantería
        if (!hasUnit) return;
        // Si hay objetivo bloqueado y no es plane, el origen debe ser adyacente al objetivo
        if (state.turnAttackTarget && state.attackKind !== "PLANE") {
          if (!TERR_BY_ID[id].adj.includes(state.turnAttackTarget)) return;
        }
        dispatch({ type: "SELECT_ATTACK_SOURCE", territory: id });
        return;
      }
      if (state.attackSource) dispatch({ type: "SELECT_ATTACK_TARGET", territory: id });
      return;
    }
    if (state.phase === "FORTIFY") {
      if (state.fortifyDone) return;
      if (!state.fortifySource) {
        if (t.owner === current.id && territoryArmyCount(t) > 1) {
          dispatch({ type: "SELECT_FORTIFY_SOURCE", territory: id });
        }
      } else {
        if (id === state.fortifySource) {
          dispatch({ type: "SELECT_FORTIFY_SOURCE", territory: null });
        } else if (t.owner === current.id) {
          dispatch({ type: "FORTIFY_MOVE", target: id, infantry: fortifyInf, tanks: fortifyTk, planes: fortifyPl });
        }
      }
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">Blitz <span className="brass">Mundial</span></div>
        {online && (
          <div className="mono" title="Sala online" style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(201,162,39,0.15)", color: "#c9a227", fontWeight: 700, letterSpacing: 2 }}>
            🌐 {online.code} · {canPlay ? "tu turno" : `turno de ${state.players[state.current].name}`}
          </div>
        )}
        <div className="chips">
          {state.players.map((p, i) => {
            const troops = playerTroops(state, p.id);
            const aps = playerAirports(state, p.id);
            const sils = playerSilos(state, p.id);
            const twrs = state.players.length > 0 ? (function () {
              let n = 0;
              for (const id in state.territories) {
                const t = state.territories[id];
                if (t.owner === p.id && t.towers > 0) n++;
              }
              return n;
            })() : 0;
            return (
              <div key={p.id} className={`chip ${i === state.current ? "active" : ""} ${!p.alive ? "dead" : ""}`}>
                <div className="swatch" style={{ width: 16, height: 16, background: p.color }} />
                <span>{p.isBot ? "🤖 " : ""}{p.name}</span>
                <span className="mono" title="Territorios">{ownedCount(state, p.id)}t</span>
                <span className="mono" title="Tropas totales (infantería + tanques + aviones)">⚔{troops.total}</span>
                {aps > 0 && <span className="mono" title="Aeropuertos">✈{aps}</span>}
                {sils > 0 && <span className="mono" title="Silos nucleares">☢{sils}</span>}
                {twrs > 0 && <span className="mono" title="Torres de petróleo">🛢{twrs}</span>}
                <span className="mono" style={{ color: "#7fb069", display: "inline-flex", alignItems: "center", gap: 2 }} title="Petróleo (litros)">
                  <IconOil size={11} />{playerOil(state, p.id)}
                </span>
                <span className="mono" title="Cartas">✦{p.cards.length}</span>
                {p.stockNukes > 0 && (
                  <span className="mono" style={{ color: "#e05d44", display: "inline-flex", alignItems: "center", gap: 2 }} title="Misiles nucleares">
                    <IconNuke size={11} />{p.stockNukes}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {state.players.some((p) => p.isBot) && (
          <button
            className="btn ghost sm"
            title={botPaused ? "Reanudar bots" : "Pausar bots"}
            onClick={() => setBotPaused((v) => !v)}
          >{botPaused ? "▶️" : "⏸"}</button>
        )}
        <button
          className="btn ghost sm"
          title={muted ? "Activar sonido" : "Silenciar"}
          onClick={() => { const n = !muted; setMuted(n); setMutedState(n); }}
        >{muted ? "🔇" : "🔊"}</button>
        <button className="btn ghost sm" title="Manual del jugador" onClick={onOpenManual}>📖</button>
        <button className="btn ghost sm" title="Guardar / Cargar partida" onClick={onOpenSaveLoad}>💾</button>
        <button className="btn ghost sm" onClick={onExit}>Reiniciar</button>
      </div>


      {nukeMode && (
        <div className="hint" style={{ padding: "6px 16px", color: "#e05d44", fontWeight: 700 }}>
          ☢ Modo misil activo — selecciona un territorio enemigo para el impacto (o pulsa el botón de nuevo para cancelar).
        </div>
      )}

      <div className="game-body">
        <div className="map-wrap">
          <div className="map-inner">
            <img src={worldMap.url} alt="Mapa mundial" className="map-bg" />
            <svg className="adj-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              {TERRITORIES.flatMap((t) => t.adj
                .filter((a) => a > t.id)
                .map((a) => {
                  const o = TERR_BY_ID[a]; if (!o) return null;
                  if (Math.abs(t.x - o.x) > 50) return null;
                  return <line key={`${t.id}-${a}`} x1={t.x} y1={t.y} x2={o.x} y2={o.y} />;
                }))}
            </svg>

            {TERRITORIES.map((t) => {
              const st = state.territories[t.id];
              const owner = state.players[st.owner];
              const isSrc = state.attackSource === t.id || state.fortifySource === t.id;
              const isTgt = state.attackTarget === t.id;
              const isCap = captured.has(t.id);
              return (
                <div
                  key={t.id}
                  className={`terr ${isSrc ? "src" : ""} ${isTgt ? "tgt" : ""} ${isCap ? "captured" : ""}`}
                  style={{ left: `${t.x}%`, top: `${t.y}%`, background: owner.color }}
                  onClick={() => onTerritoryClick(t.id)}
                  onMouseEnter={(e) => setHover({ id: t.id, x: e.clientX, y: e.clientY })}
                  onMouseMove={(e) => setHover({ id: t.id, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHover(null)}
                >
                  <div className="terr-units">
                    {st.infantry > 0 && <span className="u" style={{ color: owner.color }}><IconSoldier size={20} color={owner.color} />{st.infantry}</span>}
                    {st.tanks > 0 && <span className="u" style={{ color: owner.color }}><IconTank size={20} color={owner.color} />{st.tanks}</span>}
                    {st.planes > 0 && <span className="u" style={{ color: owner.color }}><IconPlane size={20} color={owner.color} />{st.planes}</span>}
                  </div>
                  <div className="terr-structs">
                    {st.airport && <span className="s" title="Aeropuerto" style={{ color: owner.color }}><IconAirport size={19} color={owner.color} /></span>}
                    {st.silo && <span className="s" title="Silo" style={{ color: owner.color }}><IconSilo size={19} color={owner.color} /></span>}
                    {st.towers > 0 && <span className="s" title="Torres" style={{ color: owner.color }}><IconTower size={19} color={owner.color} />{st.towers}</span>}
                  </div>
                  <div className="terr-label">{t.name}</div>
                </div>
              );
            })}
          </div>

          {hover && (
            <div className="tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
              <div className="name">{TERR_BY_ID[hover.id].name}</div>
              <div className="meta">
                {CONTINENTS[TERR_BY_ID[hover.id].continent].name} · símbolo {TERR_BY_ID[hover.id].symbol}
              </div>
              <div style={{ marginTop: 6 }}>
                Dueño: <b style={{ color: state.players[state.territories[hover.id].owner].color }}>
                  {state.players[state.territories[hover.id].owner].name}
                </b>
              </div>
              <div className="mono">
                Inf: {state.territories[hover.id].infantry} · Tanques: {state.territories[hover.id].tanks} · Torres: {state.territories[hover.id].towers}
              </div>
              {state.territories[hover.id].airport && <div className="mono">Aeropuerto ✈</div>}
              {state.territories[hover.id].silo && <div className="mono">Silo ☢</div>}
            </div>
          )}
        </div>

        <SidePanel
          state={state} dispatch={dispatch}
          fortifyInf={fortifyInf} setFortifyInf={setFortifyInf}
          fortifyTk={fortifyTk} setFortifyTk={setFortifyTk}
          fortifyPl={fortifyPl} setFortifyPl={setFortifyPl}
          occupyInf={occupyInf} setOccupyInf={setOccupyInf}
          nukeMode={nukeMode} setNukeMode={setNukeMode}
          reinforceCount={reinforceCount} setReinforceCount={setReinforceCount}
        />
      </div>

      {state.winner !== null && (
        <div className="victory-overlay">
          <div className="victory-modal">
            <div className="label">Comando Estratégico</div>
            <div className="winner-name" style={{ color: state.players[state.winner].color }}>
              {state.players[state.winner].name}
            </div>
            <div className="title">Victoria</div>
            <button className="btn" onClick={onExit}>Nueva Partida</button>
          </div>
        </div>
      )}
      <BattleOverlay state={state} />
      {online && (
        <div className={`game-chat ${chatOpen ? "open" : ""}`}>
          <button className="game-chat-toggle btn ghost sm" onClick={() => setChatOpen((v) => !v)} title="Chat de jugadores">
            💬 {chatOpen ? "Cerrar" : "Chat"}{!chatOpen && chatMessages.length > 0 ? ` (${chatMessages.length})` : ""}
          </button>
          {chatOpen && (
            <Chat
              room={online.room}
              myName={state.players[online.mySeat]?.name || "Jugador"}
              messages={chatMessages}
              compact
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ═════════ SIDE PANEL ═════════ */
function SidePanel({
  state, dispatch, fortifyInf, setFortifyInf, fortifyTk, setFortifyTk, fortifyPl, setFortifyPl, occupyInf, setOccupyInf,
  nukeMode, setNukeMode, reinforceCount, setReinforceCount,
}: {
  state: GameState; dispatch: React.Dispatch<Action>;
  fortifyInf: number; setFortifyInf: (n: number) => void;
  fortifyTk: number; setFortifyTk: (n: number) => void;
  fortifyPl: number; setFortifyPl: (n: number) => void;
  occupyInf: number; setOccupyInf: (n: number) => void;
  nukeMode: boolean; setNukeMode: (v: boolean) => void;
  reinforceCount: number; setReinforceCount: (n: number) => void;
}) {
  const current = state.players[state.current];
  const owned = ownedCount(state, current.id);
  const oil = playerOil(state, current.id);
  const totalReinforce = state.phase === "REINFORCE" ? state.reinforcements : 0;

  return (
    <aside className="side">
      <div className="side-section">
        <div className="player-banner">
          <div className="swatch" style={{ background: current.color }} />
          <div className="name">{current.name}</div>
        </div>
        <div className="stepper">
          {(["SETUP", "REINFORCE", "ATTACK", "FORTIFY"] as const).map((p) => (
            <div key={p} className={`step ${state.phase === p ? "active" : ""}`}>
              {p === "SETUP" ? "Setup" : p === "REINFORCE" ? "Refuerzo" : p === "ATTACK" ? "Ataque" : "Fortalecer"}
            </div>
          ))}
        </div>
        <div className="kpi-grid">
          <div className="kpi"><div className="lbl">Territorios</div><div className="val">{owned}</div></div>
          <div className="kpi"><div className="lbl">Refuerzos</div><div className="val">{state.phase === "SETUP" ? "—" : state.phase === "REINFORCE" ? totalReinforce : 0}</div></div>
          <div className="kpi"><div className="lbl">Petróleo</div><div className="val" style={{ color: "#7fb069" }}>{oil}<span style={{ fontSize: 10, color: "#9aa088" }}> L</span></div></div>
          <div className="kpi"><div className="lbl">Cartas</div><div className="val" style={{ fontSize: 14 }}>
            {current.cards.length === 0 ? "—" : current.cards.map((c, i) => (
              <span key={i} style={{ marginRight: 4 }} title={cardTitle(c)}>
                <CardIcon sym={c.symbol} size={14} />
              </span>
            ))}
          </div></div>
        </div>
      </div>

      {/* Stock de unidades (siempre visible) */}
      <div className="side-section">
        <div className="title-font" style={{ fontSize: 11, color: "#c9a227", marginBottom: 8 }}>Reservas de {current.name}</div>
        <div className="stock-grid">
          <span><IconSoldier size={13} /> {current.stockArmies}</span>
          <span><IconTank size={13} /> {current.stockTanks}</span>
          <span><IconPlane size={13} /> {current.stockPlanes}</span>
          <span><IconTower size={13} /> {current.stockTowers}</span>
          <span><IconAirport size={13} /> {current.stockAirports}</span>
          <span><IconSilo size={13} /> {current.stockSilos}</span>
          <span><IconNuke size={13} /> {current.stockNukes}</span>
        </div>
      </div>

      <div className="side-section">
        {state.phase === "SETUP" && <SetupPanel state={state} dispatch={dispatch} />}
        {state.phase === "REINFORCE" && (
          <ReinforcePanel state={state} dispatch={dispatch}
            nukeMode={nukeMode} setNukeMode={setNukeMode}
            reinforceCount={reinforceCount} setReinforceCount={setReinforceCount} />
        )}
        {state.phase === "ATTACK" && (
          <AttackPanel state={state} dispatch={dispatch}
            occupyInf={occupyInf} setOccupyInf={setOccupyInf}
            nukeMode={nukeMode} setNukeMode={setNukeMode} />
        )}
        {state.phase === "FORTIFY" && (
          <FortifyPanel state={state} dispatch={dispatch}
            fortifyInf={fortifyInf} setFortifyInf={setFortifyInf}
            fortifyTk={fortifyTk} setFortifyTk={setFortifyTk}
            fortifyPl={fortifyPl} setFortifyPl={setFortifyPl} />
        )}
      </div>

      <div className="log">
        {state.log.map((e) => (<div key={e.id} className={`entry ${e.type}`}>{e.text}</div>))}
      </div>
    </aside>
  );
}

const SETUP_LABELS: Record<SetupItem, string> = {
  AIRPORT: "un AEROPUERTO",
  SILO: "el SILO",
  TOWER: "una TORRE",
  PLANE: "un AVIÓN (en un aeropuerto)",
  TANK: "un TANQUE",
  ARMY: "un EJÉRCITO",
};

function SetupPanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const p = state.players[state.current];
  const options: { key: SetupItem; label: string; stock: number; icon: ReactNode }[] = [
    { key: "AIRPORT", label: "Aeropuerto", stock: p.stockAirports, icon: <IconAirport size={14} /> },
    { key: "SILO",    label: "Silo",       stock: p.stockSilos,    icon: <IconSilo size={14} /> },
    { key: "TOWER",   label: "Torre",      stock: p.stockTowers,   icon: <IconTower size={14} /> },
    { key: "PLANE",   label: "Avión",      stock: p.stockPlanes,   icon: <IconPlane size={14} /> },
    { key: "TANK",    label: "Tanque",     stock: p.stockTanks,    icon: <IconTank size={14} /> },
    { key: "ARMY",    label: "Ejército",   stock: p.stockArmies,   icon: <IconSoldier size={14} /> },
  ];
  return (
    <div className="actions">
      <div className="hint">
        <b style={{ color: "#c9a227" }}>{p.name}</b>: elige qué colocar y pulsa un territorio propio.
      </div>
      <div className="setup-picker">
        {options.map((o) => (
          <button
            key={o.key}
            disabled={o.stock <= 0}
            className={`btn sm ${state.setupItem === o.key ? "" : "ghost"}`}
            onClick={() => dispatch({ type: "SETUP_SELECT_ITEM", item: o.key })}
            title={o.key === "PLANE" ? "Requiere un aeropuerto propio" : undefined}
          >
            {o.icon} {o.label} <span className="mono" style={{ opacity: 0.75, marginLeft: 4 }}>×{o.stock}</span>
          </button>
        ))}
      </div>
      <div className="hint" style={{ fontSize: 11 }}>
        Colocando ahora: <b style={{ color: "#c9a227" }}>{SETUP_LABELS[state.setupItem]}</b>.
      </div>
    </div>
  );
}

function rewardLabel(r: TradeReward): string {
  switch (r.kind) {
    case "NUKE": return "1 misil nuclear";
    case "TOWERS": return `${r.n} torre${r.n > 1 ? "s" : ""}`;
    case "PLANES": return `${r.n} avion${r.n > 1 ? "es" : ""}`;
    case "TANKS": return `${r.n} tanque${r.n > 1 ? "s" : ""}`;
    case "PLANE_FIXED": return "1 avión";
  }
}

function ReinforcePanel({ state, dispatch, nukeMode, setNukeMode, reinforceCount, setReinforceCount }: {
  state: GameState; dispatch: React.Dispatch<Action>;
  nukeMode: boolean; setNukeMode: (v: boolean) => void;
  reinforceCount: number; setReinforceCount: (n: number) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const p = state.players[state.current];
  const mandatory = p.cards.length >= 5;
  const pending = reinforcePending(state);
  const nothingLeft = !pending;
  const planesStuck = p.stockPlanes > 0 && !playerHasAirport(state, p.id);

  function toggleCard(i: number) {
    setSelected((s) => {
      if (s.includes(i)) return s.filter((x) => x !== i);
      if (s.length >= 3) return s;
      return [...s, i];
    });
  }

  const chosenSymbols = selected.map((i) => p.cards[i].symbol);
  const combo = selected.length === 3 ? classifyTrade(chosenSymbols) : null;

  const items: { key: SetupItem; label: string; stock: number; icon: ReactNode }[] = [
    { key: "ARMY",  label: "Infantería", stock: state.reinforcements, icon: <IconSoldier size={13} /> },
    { key: "TANK",  label: "Tanque",     stock: p.stockTanks,          icon: <IconTank size={13} /> },
    { key: "PLANE", label: "Avión",      stock: p.stockPlanes,         icon: <IconPlane size={13} /> },
    { key: "TOWER", label: "Torre",      stock: p.stockTowers,         icon: <IconTower size={13} /> },
  ];
  const currentStock = items.find((i) => i.key === state.reinforceItem)?.stock ?? 0;

  return (
    <div className="actions">
      {p.stockNukes > 0 && playerHasSilo(state, p.id) && (
        <button
          className={`btn sm ${nukeMode ? "" : "ghost"}`}
          style={{ borderColor: "#e05d44", color: nukeMode ? undefined : "#e05d44" }}
          onClick={() => setNukeMode(!nukeMode)}
        >
          <IconNuke size={12} /> {nukeMode ? "Cancelar misil" : `Lanzar misil (${p.stockNukes})`}
        </button>
      )}
      <div className="hint">
        Elige qué colocar, la cantidad y pulsa un territorio propio.
        {!mandatory && !nothingLeft && " Termina refuerzos con el botón antes de atacar."}
      </div>
      {mandatory && (
        <div className="hint" style={{ color: "#e05d44", fontWeight: 700 }}>
          ⚠ Tienes {p.cards.length} cartas — el canje es <b>obligatorio</b> antes de poder atacar.
        </div>
      )}
      {pending && !mandatory && (
        <div className="hint" style={{ color: "#e05d44", fontWeight: 700 }}>
          ⚠ Debes colocar todas las unidades antes de pasar a Ataque.
        </div>
      )}
      {planesStuck && (
        <div className="hint" style={{ color: "#c9a227" }}>
          ✈ Tienes {p.stockPlanes} avión(es) en reserva sin aeropuerto donde estacionarlos —
          se quedarán en reserva hasta que construyas o conquistes uno.
        </div>
      )}

      <div className="setup-picker">
        {items.map((o) => (
          <button
            key={o.key}
            disabled={o.stock <= 0}
            className={`btn sm ${state.reinforceItem === o.key ? "" : "ghost"}`}
            onClick={() => dispatch({ type: "SELECT_REINFORCE_ITEM", item: o.key })}
            title={o.key === "PLANE" ? "Requiere un aeropuerto propio" : undefined}
          >
            {o.icon} {o.label} <span className="mono" style={{ opacity: 0.75, marginLeft: 4 }}>×{o.stock}</span>
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span className="hint">Cantidad por clic:</span>
        <input
          type="number" className="input-num" min={1} max={Math.max(1, currentStock)}
          value={reinforceCount}
          onChange={(e) => setReinforceCount(Math.max(1, parseInt(e.target.value || "1")))}
        />
        <button className="btn ghost sm" onClick={() => setReinforceCount(Math.max(1, currentStock))}>
          Todos ({currentStock})
        </button>
      </div>
      {nothingLeft && !mandatory && (
        <button className="btn sm" onClick={() => dispatch({ type: "END_REINFORCE" })}>
          Pasar a Ataque
        </button>
      )}
      <ContinentBreakdown state={state} />


      {p.cards.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="title-font" style={{ fontSize: 11, color: "#c9a227", marginBottom: 6 }}>
            Cartas ({p.cards.length}) — selecciona 3 para canjear
          </div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {p.cards.map((c, i) => (
              <button
                key={i}
                className={`btn sm ${selected.includes(i) ? "" : "ghost"}`}
                onClick={() => toggleCard(i)}
                title={cardTitle(c)}
              >
                <CardIcon sym={c.symbol} size={14} />
              </button>
            ))}
          </div>
          {selected.length === 3 && !combo && (
            <div className="hint" style={{ color: "#c86a6a", marginTop: 6 }}>
              Combinación no válida.
            </div>
          )}
          {combo && (
            <div style={{ marginTop: 8 }}>
              <div className="hint">
                <b style={{ color: "#c9a227" }}>{combo.label}</b> → +{combo.infantry} infantería
              </div>
              {combo.fixed ? (
                <button
                  className="btn sm"
                  style={{ marginTop: 6 }}
                  onClick={() => {
                    dispatch({ type: "TRADE_CARDS", indices: selected });
                    setSelected([]);
                  }}
                >
                  Canjear (+{combo.infantry} inf. y {rewardLabel(combo.fixed)})
                </button>
              ) : (
                <>
                  <div className="hint" style={{ marginTop: 4 }}>Elige recompensa:</div>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    {combo.rewards.map((r, k) => (
                      <button
                        key={k}
                        className="btn sm ghost"
                        onClick={() => {
                          dispatch({ type: "TRADE_CARDS", indices: selected, reward: r });
                          setSelected([]);
                        }}
                      >
                        {rewardLabel(r)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function AttackPanel({ state, dispatch, occupyInf, setOccupyInf, nukeMode, setNukeMode }: {
  state: GameState; dispatch: React.Dispatch<Action>;
  occupyInf: number; setOccupyInf: (n: number) => void;
  nukeMode: boolean; setNukeMode: (v: boolean) => void;
}) {
  const src = state.attackSource ? state.territories[state.attackSource] : null;
  const tgt = state.attackTarget ? state.territories[state.attackTarget] : null;
  const planeCost = state.attackSource && state.attackTarget
    ? bfsDist(state.attackSource, state.attackTarget) * 2 * PLANE_OIL_PER_STEP
    : 0;
  const current = state.players[state.current];

  return (
    <div className="actions">
      {current.stockNukes > 0 && playerHasSilo(state, current.id) && (
        <button
          className={`btn sm ${nukeMode ? "" : "ghost"}`}
          style={{ borderColor: "#e05d44", color: nukeMode ? undefined : "#e05d44" }}
          onClick={() => setNukeMode(!nukeMode)}
        >
          <IconNuke size={12} /> {nukeMode ? "Cancelar misil" : `Lanzar misil (${current.stockNukes})`}
        </button>
      )}
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        <span className="hint">Ataca con:</span>
        {(["INFANTRY", "TANK", "PLANE"] as UnitKind[]).map((k) => (
          <button key={k}
            className={`btn sm ${state.attackKind === k ? "" : "ghost"}`}
            onClick={() => dispatch({ type: "SELECT_ATTACK_KIND", kind: k })}
          >
            {k === "INFANTRY" ? <IconSoldier size={12} /> : k === "TANK" ? <IconTank size={12} /> : <IconPlane size={12} />} {k === "INFANTRY" ? "Infantería" : k === "TANK" ? "Tanque (25 L)" : "Avión (50 L/terr)"}
          </button>
        ))}
      </div>

      {state.turnAttackTarget && (
        <div className="hint" style={{ color: "#c9a227" }}>
          🎯 Objetivo del turno bloqueado: <b>{TERR_BY_ID[state.turnAttackTarget].name}</b>
        </div>
      )}

      {!src && <div className="hint">Selecciona un territorio propio con {state.attackKind === "TANK" ? "un tanque" : state.attackKind === "PLANE" ? "un aeropuerto y ≥1 avión" : "≥2 infantería"}.</div>}
      {src && !tgt && <div className="hint">Selecciona un territorio enemigo {state.attackKind === "PLANE" ? "(alcance global)" : "adyacente"}.</div>}
      {src && tgt && !state.pendingOccupy && (
        <>
          <div className="hint">
            {TERR_BY_ID[state.attackSource!].name} → {TERR_BY_ID[state.attackTarget!].name}
            {state.attackKind === "PLANE" && <> · coste: <b>{planeCost} L</b></>}
          </div>
          <div className="row" style={{ gap: 6 }}>
            {state.attackKind === "PLANE" ? (
              <button className="btn sm" disabled={src.planes < 1 || planeCost > playerOil(state, src.owner)} onClick={() => dispatch({ type: "RESOLVE_ATTACK", dice: 1 })}>
                Lanzar avión
              </button>
            ) : (
              [1, 2, 3].map((d) => {
                // Tierra quemada: si solo hay 1 infantería, se permite 1 dado y se arriesga esa unidad.
                const scorched = state.attackKind !== "TANK" && src.infantry === 1;
                let maxUnits: number;
                if (state.attackKind === "TANK") {
                  const supportInf = Math.max(0, src.infantry - 1);
                  // Tanque necesita compañía: otro tanque o ≥2 infantería.
                  const canTankAttack = src.tanks >= 2 || (src.tanks >= 1 && supportInf >= 2);
                  maxUnits = canTankAttack ? src.tanks + supportInf : 0;
                } else {
                  maxUnits = scorched ? 1 : src.infantry - 1;
                }
                const disabled = d > Math.min(3, maxUnits);
                return (
                  <button key={d} disabled={disabled} className="btn sm" onClick={() => dispatch({ type: "RESOLVE_ATTACK", dice: d })}>
                    {d}d
                  </button>
                );
              })
            )}
            <button className="btn ghost sm" onClick={() => dispatch({ type: "SELECT_ATTACK_SOURCE", territory: null })}>Cambiar origen</button>
          </div>
          {state.lastBattle && (
            <div className="battle" key={`${state.lastBattle.atk.join(",")}|${state.lastBattle.def.join(",")}|${state.lastBattle.atkLost}-${state.lastBattle.defLost}`}>
              {state.lastBattle.note && <div className="hint" style={{ fontSize: 10 }}>{state.lastBattle.note}</div>}
              <div className="dice-row">
                {state.lastBattle.atk.map((d, i) => (
                  <div key={`a${i}`} className={`die atk rolling ${i < state.lastBattle!.atkLost ? "lost" : ""}`} style={{ animationDelay: `${i * 60}ms`, background: state.players[state.lastBattle!.atkOwner]?.color }}>{d}</div>
                ))}
                <div style={{ width: 12 }} />
                {state.lastBattle.def.map((d, i) => (
                  <div key={`d${i}`} className={`die def rolling ${i < state.lastBattle!.defLost ? "lost" : ""}`} style={{ animationDelay: `${i * 60 + 40}ms`, background: state.players[state.lastBattle!.defOwner]?.color }}>{d}</div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {state.pendingOccupy && state.pendingOccupy.candidates && !state.pendingOccupy.from && (
        <div>
          <div className="hint">
            El avión conquistó <b>{TERR_BY_ID[state.pendingOccupy.to].name}</b>. Elige el territorio adyacente desde el que enviar infantería:
          </div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {state.pendingOccupy.candidates.map((c) => (
              <button key={c} className="btn sm ghost"
                onClick={() => dispatch({ type: "OCCUPY_PICK_SOURCE", territory: c })}>
                {TERR_BY_ID[c].name} (inf {state.territories[c].infantry})
              </button>
            ))}
          </div>
        </div>
      )}
      {state.pendingOccupy && state.pendingOccupy.from && (
        <div>
          <div className="hint">
            Mueve infantería adicional al territorio conquistado desde {TERR_BY_ID[state.pendingOccupy.from].name} (siempre debe quedar ≥1 en el origen):
          </div>
          <div className="row" style={{ gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <label className="hint" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <IconSoldier size={12} />
              <input type="number" className="input-num" min={0} max={state.pendingOccupy.maxInfantry}
                value={occupyInf}
                onChange={(e) => setOccupyInf(Math.max(0, Math.min(state.pendingOccupy!.maxInfantry, parseInt(e.target.value || "0"))))} />
              <span className="mono">/{state.pendingOccupy.maxInfantry}</span>
            </label>
            <button className="btn sm" onClick={() => {
              dispatch({ type: "OCCUPY", infantry: occupyInf });
              setOccupyInf(0);
            }}>
              Ocupar
            </button>
          </div>
        </div>
      )}
      <button className="btn ghost sm" onClick={() => dispatch({ type: "END_ATTACK" })}>Terminar Ataque</button>
    </div>
  );
}

function FortifyPanel({ state, dispatch, fortifyInf, setFortifyInf, fortifyTk, setFortifyTk, fortifyPl, setFortifyPl }: {
  state: GameState; dispatch: React.Dispatch<Action>;
  fortifyInf: number; setFortifyInf: (n: number) => void;
  fortifyTk: number; setFortifyTk: (n: number) => void;
  fortifyPl: number; setFortifyPl: (n: number) => void;
}) {
  const src = state.fortifySource ? state.territories[state.fortifySource] : null;
  return (
    <div className="actions">
      {state.fortifyDone ? (
        <div className="hint">Movimientos terminados. Pulsa "Fin de Turno" para pasar al siguiente jugador.</div>
      ) : !src ? (
        <div className="hint">
          Movimientos ilimitados: selecciona un territorio propio con ≥2 unidades y su destino.
          Infantería y tanques solo a territorios adyacentes; los aviones pueden volar aeropuerto→aeropuerto a cualquier distancia.
          Coste: tanques 25 L, aviones 50 L por territorio recorrido.
        </div>
      ) : (
        <div>
          <div className="hint">Desde {TERR_BY_ID[state.fortifySource!].name} (inf {src.infantry} / tq {src.tanks} / av {src.planes}). Elige destino propio.</div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <label className="hint">Inf:
              <input type="number" className="input-num" min={0} max={Math.max(0, src.infantry - 1)}
                value={fortifyInf} onChange={(e) => setFortifyInf(parseInt(e.target.value || "0"))} />
            </label>
            <label className="hint">Tanq:
              <input type="number" className="input-num" min={0} max={src.tanks}
                value={fortifyTk} onChange={(e) => setFortifyTk(parseInt(e.target.value || "0"))} />
            </label>
            <label className="hint">Av:
              <input type="number" className="input-num" min={0} max={src.planes}
                value={fortifyPl} onChange={(e) => setFortifyPl(parseInt(e.target.value || "0"))} />
            </label>
          </div>
        </div>
      )}
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        {!state.fortifyDone && (
          <button className="btn ghost sm" onClick={() => dispatch({ type: "END_FORTIFY" })}>Terminar fortalecer</button>
        )}
        <button className="btn" onClick={() => dispatch({ type: "END_TURN" })}>Fin de Turno</button>
      </div>
    </div>
  );
}

function ContinentBreakdown({ state }: { state: GameState }) {
  const cur = state.players[state.current];
  return (
    <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
      {Object.values(CONTINENTS).map((c) => {
        const all = TERRITORIES.filter((t) => t.continent === c.id);
        const own = all.filter((t) => state.territories[t.id].owner === cur.id).length;
        const full = own === all.length;
        return (
          <div key={c.id} className="hint" style={{ fontSize: 11, display: "flex", justifyContent: "space-between" }}>
            <span>{c.name}</span>
            <span className="mono" style={{ color: full ? "#c9a227" : "#9aa088" }}>{own}/{all.length}{full ? ` +${c.bonus}` : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

