import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { GameState } from "./reducer";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(): string {
  let s = "";
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 6; i++) s += ALPHABET[arr[i] % ALPHABET.length];
  return s;
}

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function newClientId(): string {
  return crypto.randomUUID();
}

export type SeatInfo = {
  clientId: string;
  name: string;
  seat: number | null;
  isHost: boolean;
};

export type LobbyConfig = { humanCount: number; botCount: number; names: string[] };

export interface ChatMessage {
  id: string;
  from: string;      // clientId
  name: string;
  text: string;
  at: number;        // epoch ms
}

type Msg =
  | { type: "hostConfig"; hostId: string; config: LobbyConfig }
  | { type: "start"; state: GameState }
  | { type: "state"; state: GameState; from: string }
  | { type: "chat"; message: ChatMessage };

export interface RoomHandlers {
  onSeats?: (seats: SeatInfo[]) => void;
  onHostConfig?: (cfg: LobbyConfig, hostId: string) => void;
  onStart?: (state: GameState) => void;
  onState?: (state: GameState) => void;
  onChat?: (message: ChatMessage) => void;
}

export interface RoomHandle {
  code: string;
  clientId: string;
  isHost: boolean;
  channel: RealtimeChannel;
  updateMe: (patch: { name?: string; seat?: number | null }) => Promise<void>;
  sendHostConfig: (cfg: LobbyConfig) => void;
  sendStart: (state: GameState) => void;
  sendState: (state: GameState) => void;
  sendChat: (text: string, name: string) => void;
  leave: () => Promise<void>;
}

export async function joinRoom(
  code: string,
  opts: { isHost: boolean; name: string; seat: number | null; handlers: RoomHandlers },
): Promise<RoomHandle> {
  const clientId = newClientId();
  const channel = supabase.channel(`blitz-room:${code}`, {
    config: { presence: { key: clientId } },
  });

  let me = { name: opts.name, seat: opts.seat, isHost: opts.isHost };

  channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState() as Record<string, Array<{ name: string; seat: number | null; isHost: boolean }>>;
    const seats: SeatInfo[] = [];
    for (const [key, arr] of Object.entries(state)) {
      const last = arr[arr.length - 1];
      if (!last) continue;
      seats.push({ clientId: key, name: last.name, seat: last.seat ?? null, isHost: !!last.isHost });
    }
    opts.handlers.onSeats?.(seats);
  });

  channel.on("broadcast", { event: "msg" }, ({ payload }: { payload: Msg }) => {
    if (payload.type === "hostConfig") opts.handlers.onHostConfig?.(payload.config, payload.hostId);
    else if (payload.type === "start") opts.handlers.onStart?.(payload.state);
    else if (payload.type === "state" && payload.from !== clientId) opts.handlers.onState?.(payload.state);
  });

  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(status));
    });
  });

  await channel.track(me);

  return {
    code,
    clientId,
    isHost: opts.isHost,
    channel,
    async updateMe(patch) {
      me = { ...me, ...patch };
      await channel.track(me);
    },
    sendHostConfig(config) {
      const msg: Msg = { type: "hostConfig", hostId: clientId, config };
      void channel.send({ type: "broadcast", event: "msg", payload: msg });
    },
    sendStart(state) {
      const msg: Msg = { type: "start", state };
      void channel.send({ type: "broadcast", event: "msg", payload: msg });
    },
    sendState(state) {
      const msg: Msg = { type: "state", state, from: clientId };
      void channel.send({ type: "broadcast", event: "msg", payload: msg });
    },
    async leave() {
      await channel.unsubscribe();
      await supabase.removeChannel(channel);
    },
  };
}
