import { useEffect, useRef, useState } from "react";
import type { ChatMessage, RoomHandle } from "./online";

export function Chat({
  room, myName, messages, onSend, compact = false,
}: {
  room: RoomHandle;
  myName: string;
  messages: ChatMessage[];
  onSend?: (m: ChatMessage) => void;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function submit() {
    const t = text.trim();
    if (!t) return;
    room.sendChat(t, myName || "Jugador");
    setText("");
    // onSend is optional; sendChat already echoes to onChat locally.
    onSend?.({ id: "", from: room.clientId, name: myName, text: t, at: Date.now() });
  }

  return (
    <div className="chat">
      <div className="chat-log" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="hint" style={{ fontSize: 11, opacity: 0.7 }}>
            💬 Sin mensajes todavía. Escribe algo para chatear con los demás humanos.
          </div>
        )}
        {messages.map((m) => {
          const mine = m.from === room.clientId;
          return (
            <div key={m.id} className={`chat-msg ${mine ? "mine" : ""}`}>
              <span className="chat-name">{mine ? "Tú" : m.name}:</span>
              <span className="chat-text">{m.text}</span>
            </div>
          );
        })}
      </div>
      <div className="chat-input">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Escribe un mensaje…"
          maxLength={300}
          style={compact ? { fontSize: 12 } : undefined}
        />
        <button className="btn sm" onClick={submit} disabled={!text.trim()}>Enviar</button>
      </div>
    </div>
  );
}
