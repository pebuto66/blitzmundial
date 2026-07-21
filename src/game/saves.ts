import { supabase } from "@/integrations/supabase/client";
import type { GameState } from "./reducer";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoids look-alikes (I,O,0,1)

export function generateSaveCode(): string {
  let out = "";
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 6; i++) out += ALPHABET[arr[i] % ALPHABET.length];
  return out;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export async function saveGame(state: GameState, label?: string): Promise<string> {
  const code = generateSaveCode();
  const { error } = await supabase
    .from("game_saves" as never)
    .insert({ code, state: state as unknown as Record<string, unknown>, label: label ?? null } as never);
  if (error) throw new Error(error.message);
  return code;
}

export async function overwriteSave(code: string, state: GameState, label?: string): Promise<void> {
  const { error } = await supabase
    .from("game_saves" as never)
    .upsert({ code, state: state as unknown as Record<string, unknown>, label: label ?? null } as never);
  if (error) throw new Error(error.message);
}

export async function loadGame(code: string): Promise<GameState | null> {
  const clean = normalizeCode(code);
  if (clean.length !== 6) throw new Error("El código debe tener 6 caracteres.");
  const { data, error } = await supabase
    .from("game_saves" as never)
    .select("state")
    .eq("code", clean)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return (data as { state: GameState }).state;
}
