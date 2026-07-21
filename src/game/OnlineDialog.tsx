import { useEffect, useRef, useState } from "react";
import { initGame, PLAYER_COLORS, type GameState } from "./reducer";
import {
  generateRoomCode, joinRoom, normalizeRoomCode,
  type LobbyConfig, type RoomHandle, type SeatInfo,
} from "./online";

type Step = "menu" | "create-name" | "join-code" | "lobby";

export interface OnlineStartPayload {
  room: RoomHandle;
  mySeat: number;
  initialState: GameState;
}

export function OnlineDialog({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (payload: OnlineStartPayload) => void;
}) {
  const [step, setStep] = useState<Step>("menu");
  const [myName, setMyName] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [room, setRoom] = useState<RoomHandle | null>(null);
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [config, setConfig] = useState<LobbyConfig>({ count: 3, names: [] });
  const [hostId, setHostId] = useState<string | null>(null);
  const startedRef = useRef(false);

  // limpieza si se cierra sin iniciar
  useEffect(() => {
    return () => {
      if (room && !startedRef.current) void room.leave();
    };
  }, [room]);

  async function createRoom() {
    setError(null);
    setBusy(true);
    try {
      const code = generateRoomCode();
      const r = await joinRoom(code, {
        isHost: true,
        name: myName.trim() || "Anfitrión",
        seat: 0,
        handlers: {
          onSeats: setSeats,
          onHostConfig: (cfg, hid) => { setConfig(cfg); setHostId(hid); },
          onStart: (state) => {
            startedRef.current = true;
            if (roomRef.current) {
              const meSeat = (state as GameState).players.findIndex((p) => p.name === myName.trim() || p.name === "Anfitrión");
              onStart({ room: roomRef.current, mySeat: Math.max(0, meSeat), initialState: state });
            }
          },
        },
      });
      roomRef.current = r;
      setRoom(r);
      setHostId(r.clientId);
      const cfg: LobbyConfig = { count: 3, names: Array(6).fill("") };
      setConfig(cfg);
      r.sendHostConfig(cfg);
      setStep("lobby");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function joinExisting() {
    setError(null);
    const code = normalizeRoomCode(codeInput);
    if (code.length !== 6) { setError("El código debe tener 6 caracteres."); return; }
    setBusy(true);
    try {
      const r = await joinRoom(code, {
        isHost: false,
        name: myName.trim() || "Jugador",
        seat: null,
        handlers: {
          onSeats: setSeats,
          onHostConfig: (cfg, hid) => { setConfig(cfg); setHostId(hid); },
          onStart: (state) => {
            startedRef.current = true;
            if (roomRef.current) {
              const meSeat = (state as GameState).players.findIndex((p) => p.name === (myName.trim() || "Jugador"));
              onStart({ room: roomRef.current, mySeat: Math.max(0, meSeat), initialState: state });
            }
          },
        },
      });
      roomRef.current = r;
      setRoom(r);
      setStep("lobby");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const roomRef = useRef<RoomHandle | null>(null);

  const isHost = room?.isHost ?? false;
  const takenSeats = new Map<number, SeatInfo>();
  seats.forEach((s) => { if (s.seat !== null) takenSeats.set(s.seat, s); });
  const mySeatInfo = seats.find((s) => s.clientId === room?.clientId);
  const mySeat = mySeatInfo?.seat ?? null;
  const allSeatsFilled = Array.from({ length: config.count }).every((_, i) => takenSeats.has(i));

  async function claimSeat(seat: number) {
    if (!room) return;
    if (takenSeats.has(seat) && takenSeats.get(seat)!.clientId !== room.clientId) return;
    await room.updateMe({ seat });
  }

  function updateConfig(next: LobbyConfig) {
    if (!room || !room.isHost) return;
    setConfig(next);
    room.sendHostConfig(next);
  }

  function hostStart() {
    if (!room || !room.isHost) return;
    if (!allSeatsFilled) return;
    const orderedNames: { name: string; isBot?: boolean }[] = Array.from({ length: config.count }).map((_, i) => {
      const occ = takenSeats.get(i)!;
      return { name: occ.name || `Jugador ${i + 1}`, isBot: false };
    });
    const initialState = initGame(orderedNames);
    room.sendStart(initialState);
    startedRef.current = true;
    const meSeat = mySeat ?? 0;
    onStart({ room, mySeat: meSeat, initialState });
  }

  return (
    <div className="victory-overlay" onClick={onClose}>
      <div className="victory-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="title-font" style={{ fontSize: 18, color: "#c9a227" }}>🌐 Multijugador online</div>
          <button className="btn ghost sm" onClick={onClose}>✕</button>
        </div>

        {error && <div className="hint" style={{ color: "#e05d44", marginBottom: 10 }}>⚠ {error}</div>}

        {step === "menu" && (
          <div style={{ display: "grid", gap: 12 }}>
            <p className="hint">Juega con amigos en tiempo real. Crea una sala y comparte el código, o únete con un código.</p>
            <button className="btn" disabled={busy} onClick={() => setStep("create-name")}>Crear sala nueva</button>
            <button className="btn ghost" disabled={busy} onClick={() => setStep("join-code")}>Unirse con código</button>
          </div>
        )}

        {step === "create-name" && (
          <div style={{ display: "grid", gap: 12 }}>
            <label className="hint">Tu nombre</label>
            <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Anfitrión" />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => setStep("menu")}>Atrás</button>
              <button className="btn" disabled={busy} onClick={createRoom}>Crear sala</button>
            </div>
          </div>
        )}

        {step === "join-code" && (
          <div style={{ display: "grid", gap: 12 }}>
            <label className="hint">Tu nombre</label>
            <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Jugador" />
            <label className="hint">Código de sala</label>
            <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} style={{ fontFamily: "monospace", letterSpacing: 4, textAlign: "center", fontSize: 20 }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => setStep("menu")}>Atrás</button>
              <button className="btn" disabled={busy} onClick={joinExisting}>Unirse</button>
            </div>
          </div>
        )}

        {step === "lobby" && room && (
          <div style={{ display: "grid", gap: 12 }}>
            <div className="panel" style={{ padding: 12, textAlign: "center" }}>
              <div className="hint" style={{ fontSize: 11 }}>Código de la sala</div>
              <div className="title-font" style={{ fontSize: 30, letterSpacing: 6, color: "#c9a227" }}>{room.code}</div>
              <button className="btn ghost sm" onClick={() => navigator.clipboard.writeText(room.code)}>Copiar código</button>
            </div>

            {isHost && (
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div className="hint">Número de jugadores</div>
                <div className="counter">
                  <button onClick={() => updateConfig({ ...config, count: Math.max(2, config.count - 1) })}>−</button>
                  <div className="value">{config.count}</div>
                  <button onClick={() => updateConfig({ ...config, count: Math.min(6, config.count + 1) })}>+</button>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gap: 6 }}>
              {Array.from({ length: config.count }).map((_, i) => {
                const occ = takenSeats.get(i);
                const isMine = occ?.clientId === room.clientId;
                return (
                  <div key={i} className="player-row" style={{ opacity: occ ? 1 : 0.7 }}>
                    <div className="swatch" style={{ background: PLAYER_COLORS[i] }} />
                    <div style={{ flex: 1 }}>
                      {occ ? (
                        <span>{occ.name}{occ.isHost ? " 👑" : ""}{isMine ? " (tú)" : ""}</span>
                      ) : (
                        <span className="hint">Asiento libre</span>
                      )}
                    </div>
                    {!occ && (
                      <button className="btn sm" onClick={() => claimSeat(i)}>Ocupar</button>
                    )}
                    {isMine && (
                      <button className="btn ghost sm" onClick={() => room.updateMe({ seat: null })}>Liberar</button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hint">
              Conectados: {seats.length} · Anfitrión: {hostId === room.clientId ? "tú" : (seats.find((s) => s.clientId === hostId)?.name ?? "…")}
            </div>

            {isHost ? (
              <button className="btn" disabled={!allSeatsFilled} onClick={hostStart}>
                {allSeatsFilled ? "Iniciar partida" : "Esperando jugadores…"}
              </button>
            ) : (
              <div className="hint" style={{ textAlign: "center" }}>Esperando a que el anfitrión inicie la partida…</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
