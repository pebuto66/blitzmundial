import { useState } from "react";
import { saveGame, loadGame, normalizeCode } from "./saves";
import type { GameState } from "./reducer";
import "./game.css";

type Mode = "menu" | "save" | "load";

export function SaveLoadDialog({
  state, onClose, onLoad,
}: {
  state: GameState | null;
  onClose: () => void;
  onLoad: (s: GameState) => void;
}) {
  const [mode, setMode] = useState<Mode>("menu");
  const [busy, setBusy] = useState(false);
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!state) return;
    setBusy(true); setError(null);
    try {
      const code = await saveGame(state);
      setSavedCode(code);
    } catch (e) {
      setError((e as Error).message || "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  async function handleLoad() {
    setBusy(true); setError(null);
    try {
      const s = await loadGame(codeInput);
      if (!s) { setError("Código no encontrado."); return; }
      onLoad(s);
    } catch (e) {
      setError((e as Error).message || "Error al cargar");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!savedCode) return;
    try { await navigator.clipboard.writeText(savedCode); } catch { /* ignore */ }
  }

  return (
    <div className="victory-overlay" onClick={onClose}>
      <div className="victory-modal" style={{ maxWidth: 480, textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
        <div className="label" style={{ marginBottom: 4 }}>Partida en la nube</div>
        <div className="title" style={{ marginBottom: 16, color: "#c9a227" }}>Guardar / Cargar</div>

        {mode === "menu" && (
          <div style={{ display: "grid", gap: 10 }}>
            <button className="btn" disabled={!state} onClick={() => setMode("save")}>
              💾 Guardar esta partida
            </button>
            <button className="btn ghost" onClick={() => setMode("load")}>
              📂 Cargar con un código
            </button>
            {!state && (
              <div style={{ fontSize: 12, color: "#c8b78b", marginTop: 4 }}>
                Inicia una partida para poder guardarla.
              </div>
            )}
          </div>
        )}

        {mode === "save" && (
          <div style={{ display: "grid", gap: 12 }}>
            {!savedCode ? (
              <>
                <p style={{ color: "#f2ead9", margin: 0 }}>
                  Se generará un código único de 6 caracteres. Guárdalo o compártelo — cualquiera con ese código podrá continuar la partida.
                </p>
                <button className="btn" disabled={busy} onClick={handleSave}>
                  {busy ? "Guardando…" : "Generar código y guardar"}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: "#f2ead9", margin: 0 }}>
                  ✅ Partida guardada. Anota este código para continuar más tarde:
                </p>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 32, fontWeight: 700, letterSpacing: 6,
                    color: "#c9a227", textAlign: "center",
                    background: "rgba(0,0,0,0.35)", padding: "16px 8px", borderRadius: 8,
                  }}
                >
                  {savedCode}
                </div>
                <button className="btn ghost" onClick={copyCode}>📋 Copiar código</button>
              </>
            )}
            {error && <div style={{ color: "#e05d44" }}>{error}</div>}
            <button className="btn ghost" onClick={() => { setMode("menu"); setSavedCode(null); setError(null); }}>
              ← Volver
            </button>
          </div>
        )}

        {mode === "load" && (
          <div style={{ display: "grid", gap: 12 }}>
            <p style={{ color: "#f2ead9", margin: 0 }}>
              Introduce el código de 6 caracteres de la partida guardada.
            </p>
            <input
              autoFocus
              value={codeInput}
              onChange={(e) => setCodeInput(normalizeCode(e.target.value))}
              placeholder="ABC123"
              maxLength={6}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 24, fontWeight: 700, letterSpacing: 6,
                textAlign: "center", padding: "12px 8px",
                background: "rgba(0,0,0,0.35)", color: "#c9a227",
                border: "1px solid #6b5b2d", borderRadius: 8,
                textTransform: "uppercase",
              }}
            />
            <button className="btn" disabled={busy || codeInput.length !== 6} onClick={handleLoad}>
              {busy ? "Cargando…" : "Cargar partida"}
            </button>
            {error && <div style={{ color: "#e05d44" }}>{error}</div>}
            <button className="btn ghost" onClick={() => { setMode("menu"); setError(null); }}>
              ← Volver
            </button>
          </div>
        )}

        <div style={{ marginTop: 18, textAlign: "right" }}>
          <button className="btn ghost sm" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
