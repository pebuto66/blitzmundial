import { TERRITORIES, TERR_BY_ID, CONTINENTS, type ContinentId, type TerrSymbol } from "./territories";

/* ═══════════════════════ Tipos ═══════════════════════ */

export type Phase = "SETUP" | "REINFORCE" | "ATTACK" | "FORTIFY";
export type UnitKind = "INFANTRY" | "TANK" | "PLANE";

/** Sub-fase de setup: qué está colocando el jugador actual */
export type SetupItem = "AIRPORT" | "SILO" | "TOWER" | "PLANE" | "TANK" | "ARMY";

export const OIL_PER_TOWER = 1000;
export const TANK_ATTACK_OIL = 25; // por territorio objetivo, una vez por turno
export const TANK_MOVE_OIL = 25;   // por territorio en fortify
export const PLANE_OIL_PER_STEP = 50; // por avión y territorio recorrido

/** Materiales iniciales según nº de jugadores (tabla oficial) */
export const STARTING: Record<number, {
  armies: number; towers: number; planes: number; tanks: number; airports: number; silos: number;
}> = {
  2: { armies: 55, towers: 10, planes: 5, tanks: 6, airports: 4, silos: 1 },
  3: { armies: 35, towers: 8, planes: 4, tanks: 5, airports: 3, silos: 1 },
  4: { armies: 30, towers: 6, planes: 3, tanks: 4, airports: 3, silos: 1 },
  5: { armies: 25, towers: 5, planes: 2, tanks: 3, airports: 2, silos: 1 },
  6: { armies: 20, towers: 3, planes: 1, tanks: 2, airports: 1, silos: 1 },
};

export interface Player {
  id: number;
  name: string;
  color: string;
  alive: boolean;
  /** Si es true, sus turnos los juega el motor de IA. */
  isBot?: boolean;
  cards: Card[];
  stockArmies: number;
  stockTanks: number;
  stockPlanes: number;
  stockAirports: number;
  stockSilos: number;
  stockTowers: number;
  stockNukes: number;
  oil: number;
  pendingBonusArmies: number;
}

/** Nombres de conquistadores famosos para los bots. */
export const CONQUEROR_NAMES = [
  "Alejandro", "Genghis", "César", "Napoleón", "Aníbal",
  "Solimán", "Atila", "Ciro", "Tamerlán", "Ramsés",
  "Boudica", "Escipión", "Carlomagno", "Cortés",
];

/** Una carta del mazo: símbolo + territorio (los comodines no tienen territorio). */
export interface Card {
  symbol: TerrSymbol;
  territoryId?: string;
}

export interface TerritoryState {
  owner: number;
  infantry: number;
  tanks: number;
  planes: number;
  towers: number;
  airport: boolean;
  silo: boolean;
}

export interface PlayerStats {
  /** Unidades propias perdidas en combate. */
  lost: number;
  /** Unidades enemigas destruidas por este jugador. */
  killed: number;
  /** Turnos completados. */
  turns: number;
  /** Territorios conquistados. */
  conquests: number;
  /** Torres de petróleo propias perdidas (capturadas o destruidas). */
  towersLost: number;
  /** Torres enemigas capturadas o destruidas por este jugador. */
  towersTaken: number;
}


export interface LogEntry {
  id: number;
  type: "info" | "reinforce" | "attack" | "conquest" | "fortify" | "turn" | "victory" | "oil" | "build" | "setup" | "card" | "nuke";
  text: string;
}

export interface GameState {
  players: Player[];
  current: number;
  phase: Phase;
  /** Qué está colocando el jugador actual durante SETUP */
  setupItem: SetupItem;
  /** Qué está colocando el jugador actual durante REINFORCE (ARMY|TANK|PLANE|TOWER) */
  reinforceItem: SetupItem;
  territories: Record<string, TerritoryState>;
  reinforcements: number;
  attackKind: UnitKind;
  attackSource: string | null;
  attackTarget: string | null;
  /** Objetivo bloqueado para todo el turno: solo se puede atacar a este territorio */
  turnAttackTarget: string | null;
  /** Territorios ya "cargados" con petróleo de tanque este turno: key = `${src}->${tgt}` */
  tankAttacksPaid: string[];
  lastBattle: { atk: number[]; def: number[]; atkLost: number; defLost: number; note?: string; atkOwner: number; defOwner: number; atkKind: UnitKind; terrId: string } | null;
  pendingOccupy: { from: string; to: string; maxInfantry: number; maxTanks: number; kind: UnitKind; candidates?: string[] } | null;
  fortifySource: string | null;
  fortifyDone: boolean;
  /** Último aviso de pérdida de torres de petróleo (para mostrar notificación temporal). */
  towerAlert: { pid: number; terrId: string; towers: number; oil: number; cause: "nuke" | "capture"; at: number } | null;
  conqueredThisTurn: boolean;
  /** Estadísticas por jugador (índice = id de jugador). */
  stats?: PlayerStats[];
  winner: number | null;
  log: LogEntry[];
  logCounter: number;
  /** Número total de canjes de cartas realizados (define el bono del próximo canje). */
  tradesMade: number;
  /** Mazo de robar y descarte de cartas. */
  deck: Card[];
  discard: Card[];
}

export const PLAYER_COLORS = ["#b5453a", "#3d6fa5", "#5f8a4f", "#8a5a9e", "#c97a33", "#3a9e90"];

function emptyStats(): PlayerStats {
  return { lost: 0, killed: 0, turns: 0, conquests: 0, towersLost: 0, towersTaken: 0 };
}

/** Devuelve las estadísticas de un jugador, creándolas si faltan (partidas guardadas antiguas). */
export function getStats(state: GameState, pid: number): PlayerStats {
  if (!state.stats) state.stats = state.players.map(() => emptyStats());
  if (!state.stats[pid]) state.stats[pid] = emptyStats();
  return state.stats[pid];
}

/** Suma a una estadística de un jugador. Mutates state. */
function bumpStat(state: GameState, pid: number, key: keyof PlayerStats, n: number) {
  if (n <= 0 || pid === undefined || pid === null || !state.players[pid]) return;
  const s = getStats(state, pid);
  s[key] += n;
}

export const DEFAULT_NAMES = ["Rojo", "Azul", "Verde", "Violeta", "Naranja", "Turquesa"];

/* ═══════════════════════ Utilidades ═══════════════════════ */

export function playerOil(state: GameState, pid: number): number {
  return Math.max(0, state.players[pid]?.oil ?? 0);
}

/** Cuenta las torres que un jugador tiene en el tablero. */
export function playerTowers(state: GameState, pid: number): number {
  let n = 0;
  for (const id in state.territories) {
    if (state.territories[id].owner === pid) n += state.territories[id].towers;
  }
  return n;
}

/** Gasta petróleo del jugador; si se agota, elimina todas sus torres del tablero. */
function spendOil(state: GameState, pid: number, amount: number) {
  if (amount <= 0) return;
  const p = state.players[pid];
  p.oil = Math.max(0, p.oil - amount);
  if (p.oil <= 0) removeAllTowersOf(state, pid);
}

function removeAllTowersOf(state: GameState, pid: number) {
  let removed = 0;
  for (const id in state.territories) {
    const t = state.territories[id];
    if (t.owner === pid && t.towers > 0) { removed += t.towers; t.towers = 0; }
  }
  if (removed > 0) {
    pushLog(state, "oil", `${state.players[pid].name} se queda sin petróleo: ${removed} torre(s) retiradas del tablero.`);
  }
}

/** BFS de distancia (nº de territorios recorridos) entre dos territorios. -1 si no hay ruta. */
export function bfsDist(from: string, to: string): number {
  if (from === to) return 0;
  const seen = new Set([from]);
  let frontier = [from];
  let dist = 0;
  while (frontier.length) {
    dist++;
    const next: string[] = [];
    for (const id of frontier) {
      for (const n of TERR_BY_ID[id].adj) {
        if (seen.has(n)) continue;
        if (n === to) return dist;
        seen.add(n);
        next.push(n);
      }
    }
    frontier = next;
  }
  return -1;
}

/** Distancia BFS pasando SOLO por territorios del mismo dueño (conexión por tierra/mar propia). -1 si no hay ruta. */
export function ownedPathDist(state: GameState, from: string, to: string, owner: number): number {
  if (from === to) return 0;
  const seen = new Set([from]);
  let frontier = [from];
  let dist = 0;
  while (frontier.length) {
    dist++;
    const next: string[] = [];
    for (const id of frontier) {
      for (const n of TERR_BY_ID[id].adj) {
        if (seen.has(n)) continue;
        if (n === to) return dist;
        seen.add(n);
        if (state.territories[n]?.owner === owner) next.push(n);
      }
    }
    frontier = next;
  }
  return -1;
}

/** Coste de oil ida y vuelta con `count` aviones desde `from` a `to`. */
export function planeOilCost(from: string, to: string, count: number): number {
  const d = bfsDist(from, to);
  if (d < 0) return Infinity;
  return d * 2 * count * PLANE_OIL_PER_STEP;
}

/** Recompensas posibles al canjear cartas. */
export type TradeReward =
  | { kind: "NUKE" }
  | { kind: "TOWERS"; n: number }
  | { kind: "PLANES"; n: number }
  | { kind: "TANKS"; n: number }
  | { kind: "TOWER_FIXED" };

export interface TradeCombo {
  infantry: number;
  rewards: TradeReward[];
  fixed?: TradeReward;
  label: string;
}

/** Clasifica una selección de 3 cartas. Devuelve null si la combinación no es canjeable. */
export function classifyTrade(symbols: TerrSymbol[]): TradeCombo | null {
  if (symbols.length !== 3) return null;
  const c = { S: 0, P: 0, T: 0, W: 0 } as Record<TerrSymbol, number>;
  for (const s of symbols) c[s]++;
  if (c.W >= 2) return null;
  if (c.W === 1) {
    const rest = symbols.filter((s) => s !== "W");
    if (rest[0] === rest[1]) {
      return {
        infantry: 12,
        label: "1 comodín + 2 iguales",
        rewards: [{ kind: "NUKE" }, { kind: "TOWERS", n: 5 }, { kind: "PLANES", n: 4 }, { kind: "TANKS", n: 5 }],
      };
    }
    return {
      infantry: 10,
      label: "1 comodín + 2 distintos",
      rewards: [{ kind: "NUKE" }, { kind: "TOWERS", n: 4 }, { kind: "PLANES", n: 3 }, { kind: "TANKS", n: 4 }],
    };
  }
  // Sin comodín
  if (c.S === 1 && c.P === 1 && c.T === 1) {
    return {
      infantry: 10,
      label: "1 de cada símbolo",
      rewards: [{ kind: "NUKE" }, { kind: "TOWERS", n: 4 }, { kind: "PLANES", n: 3 }, { kind: "TANKS", n: 4 }],
    };
  }
  if (c.P === 3) {
    return {
      infantry: 8,
      label: "3 aviones",
      rewards: [{ kind: "TOWERS", n: 3 }, { kind: "PLANES", n: 2 }, { kind: "TANKS", n: 3 }],
    };
  }
  if (c.T === 3) {
    return {
      infantry: 6,
      label: "3 tanques",
      rewards: [{ kind: "TOWERS", n: 2 }, { kind: "PLANES", n: 1 }, { kind: "TANKS", n: 2 }],
    };
  }
  if (c.S === 3) {
    return {
      infantry: 4,
      label: "3 soldados",
      rewards: [],
      fixed: { kind: "TOWER_FIXED" },
    };
  }
  return null;
}

/** Compatibilidad: aún se usa en la UI para saber si 3 cartas son canjeables. */
export function isValidTradeSet(symbols: TerrSymbol[]): boolean {
  return classifyTrade(symbols) !== null;
}

export function ownedCount(state: GameState, pid: number) {
  return Object.values(state.territories).filter((t) => t.owner === pid).length;
}

/** ¿Tiene el jugador algún aeropuerto propio en el tablero? */
export function playerHasAirport(state: GameState, pid: number): boolean {
  for (const id in state.territories) {
    const t = state.territories[id];
    if (t.owner === pid && t.airport) return true;
  }
  return false;
}

/** ¿Tiene el jugador algún silo propio en el tablero? */
export function playerHasSilo(state: GameState, pid: number): boolean {
  for (const id in state.territories) {
    const t = state.territories[id];
    if (t.owner === pid && t.silo) return true;
  }
  return false;
}

/** Nº total de aeropuertos que un jugador tiene en el tablero. */
export function playerAirports(state: GameState, pid: number): number {
  let n = 0;
  for (const id in state.territories) {
    const t = state.territories[id];
    if (t.owner === pid && t.airport) n++;
  }
  return n;
}

/** Nº total de silos que un jugador tiene en el tablero. */
export function playerSilos(state: GameState, pid: number): number {
  let n = 0;
  for (const id in state.territories) {
    const t = state.territories[id];
    if (t.owner === pid && t.silo) n++;
  }
  return n;
}

/** Total de unidades (inf+tanques+aviones) del jugador en el tablero. */
export function playerTroops(state: GameState, pid: number): { infantry: number; tanks: number; planes: number; total: number } {
  let infantry = 0, tanks = 0, planes = 0;
  for (const id in state.territories) {
    const t = state.territories[id];
    if (t.owner !== pid) continue;
    infantry += t.infantry; tanks += t.tanks; planes += t.planes;
  }
  return { infantry, tanks, planes, total: infantry + tanks + planes };
}

/** Si un jugador no tiene torres, no puede tener petróleo. */
function syncOilInvariant(state: GameState) {
  for (const p of state.players) {
    if (p.oil > 0 && playerTowers(state, p.id) === 0) p.oil = 0;
  }
}

/** ¿Quedan unidades por colocar en refuerzo? Los aviones no bloquean si no hay aeropuerto propio. */
export function reinforcePending(state: GameState): boolean {
  const p = state.players[state.current];
  if (state.reinforcements > 0) return true;
  if (p.stockTanks > 0) return true;
  if (p.stockTowers > 0) return true;
  if (p.stockPlanes > 0 && playerHasAirport(state, p.id)) return true;
  return false;
}

export function territoryArmyCount(t: TerritoryState) {
  return t.infantry + t.tanks + t.planes;
}

export function computeReinforcements(
  territories: Record<string, TerritoryState>,
  playerId: number,
): number {
  const ownIds = Object.keys(territories).filter((id) => territories[id].owner === playerId);
  // Mínimo 3 + floor(N/3) + bonos por continentes completos.
  let total = 3 + Math.floor(ownIds.length / 3);
  const conts = new Set<ContinentId>();
  TERRITORIES.forEach((t) => conts.add(t.continent));
  for (const cont of conts) {
    const all = TERRITORIES.filter((t) => t.continent === cont);
    if (all.every((t) => territories[t.id].owner === playerId)) {
      total += CONTINENTS[cont].bonus;
    }
  }
  return total;
}

function pushLog(state: GameState, type: LogEntry["type"], text: string) {
  state.log = [{ id: state.logCounter++, type, text }, ...state.log].slice(0, 150);
}

function clone(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, cards: [...p.cards] })),
    territories: Object.fromEntries(
      Object.entries(state.territories).map(([k, v]) => [k, { ...v }]),
    ),
    tankAttacksPaid: [...state.tankAttacksPaid],
    log: [...state.log],
    deck: [...state.deck],
    discard: [...state.discard],
  };
}

function rollDice(n: number): number[] {
  return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => b - a);
}

/* ═══════════════════════ Init ═══════════════════════ */

export function initGame(playerInputs: { name: string; isBot?: boolean }[]): GameState {
  const n = playerInputs.length;
  const kit = STARTING[n] ?? STARTING[3];

  const players: Player[] = playerInputs.map((p, i) => ({
    id: i,
    name: p.name.trim() || DEFAULT_NAMES[i],
    color: PLAYER_COLORS[i],
    alive: true,
    isBot: !!p.isBot,
    cards: [],
    stockArmies: kit.armies,
    stockTanks: kit.tanks,
    stockPlanes: kit.planes,
    stockAirports: kit.airports,
    stockSilos: kit.silos,
    stockTowers: kit.towers,
    stockNukes: 0,
    oil: 0,
    pendingBonusArmies: 0,
  }));

  const ids = TERRITORIES.map((t) => t.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const territories: Record<string, TerritoryState> = {};
  ids.forEach((id, idx) => {
    territories[id] = { owner: idx % n, infantry: 1, tanks: 0, planes: 0, towers: 0, airport: false, silo: false };
  });
  for (const p of players) {
    const used = ids.filter((id) => territories[id].owner === p.id).length;
    p.stockArmies = Math.max(0, p.stockArmies - used);
  }

  // Construir mazo: 1 carta por territorio (con su símbolo) + 2 comodines, barajado.
  const deck: Card[] = TERRITORIES.map((t) => ({ symbol: t.symbol, territoryId: t.id }));
  deck.push({ symbol: "W" });
  deck.push({ symbol: "W" });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const setupStart = setupOrder(players)[0] ?? 0;
  const log: LogEntry[] = [
    { id: 0, type: "info", text: `Partida iniciada con ${n} jugadores.` },
    { id: 1, type: "setup", text: `Setup: ${players[setupStart].name} coloca su primer aeropuerto.` },
  ];

  return {
    players,
    current: setupStart,
    phase: "SETUP",
    setupItem: firstSetupItem(players[setupStart]),
    reinforceItem: "ARMY",
    territories,
    reinforcements: 0,
    attackKind: "INFANTRY",
    attackSource: null,
    attackTarget: null,
    turnAttackTarget: null,
    tankAttacksPaid: [],
    lastBattle: null,
    pendingOccupy: null,
    fortifySource: null,
    fortifyDone: false,
    towerAlert: null,
    conqueredThisTurn: false,
    stats: players.map(() => emptyStats()),
    winner: null,
    log,
    logCounter: 2,
    tradesMade: 0,
    deck,
    discard: [],
  };
}

/** Roba una carta del mazo, reciclando el descarte si es necesario. Mutates state. */
function drawCard(state: GameState): Card | null {
  if (state.deck.length === 0) {
    if (state.discard.length === 0) return null;
    state.deck = [...state.discard];
    state.discard = [];
    for (let i = state.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
    }
  }
  return state.deck.shift() ?? null;
}

function firstSetupItem(p: Player): SetupItem {
  return nextSetupItem(p) ?? "ARMY";
}

function nextSetupItem(p: Player): SetupItem | null {
  if (p.stockAirports > 0) return "AIRPORT";
  if (p.stockSilos > 0) return "SILO";
  if (p.stockTowers > 0) return "TOWER";
  if (p.stockPlanes > 0) return "PLANE";
  if (p.stockTanks > 0) return "TANK";
  if (p.stockArmies > 0) return "ARMY";
  return null;
}

function allSetupDone(state: GameState): boolean {
  return state.players.every((p) => nextSetupItem(p) === null);
}

function setupOrder(players: Player[]): number[] {
  const bots = players.filter((p) => p.isBot).map((p) => p.id);
  const humans = players.filter((p) => !p.isBot).map((p) => p.id);
  return [...bots, ...humans];
}

function advanceSetup(state: GameState) {
  // El jugador conserva el tipo que estaba colocando si aún le quedan unidades.
  const cur = state.players[state.current];
  if (hasStockFor(cur, state.setupItem)) return;
  const curNext = nextSetupItem(cur);
  if (curNext !== null) {
    state.setupItem = curNext;
    return;
  }
  pushLog(state, "setup", `${cur.name} ha terminado su despliegue.`);
  // Pasa al siguiente jugador vivo con algo por colocar (bots primero, humanos después)
  const order = setupOrder(state.players);
  const pos = order.indexOf(state.current);
  for (let step = 1; step <= order.length; step++) {
    const idx = order[(pos + step) % order.length];
    const p = state.players[idx];
    const it = nextSetupItem(p);
    if (it !== null) {
      state.current = idx;
      state.setupItem = it;
      pushLog(state, "setup", `Turno de despliegue de ${p.name}.`);
      return;
    }
  }
  if (allSetupDone(state)) {
    state.phase = "REINFORCE";
    state.current = 0;
    state.reinforcements = computeReinforcements(state.territories, state.players[0].id);
    pushLog(state, "turn", `Comienza la partida. Turno de ${state.players[0].name}.`);
  }
}

export function hasStockFor(p: Player, it: SetupItem): boolean {
  switch (it) {
    case "AIRPORT": return p.stockAirports > 0;
    case "SILO": return p.stockSilos > 0;
    case "TOWER": return p.stockTowers > 0;
    case "PLANE": return p.stockPlanes > 0;
    case "TANK": return p.stockTanks > 0;
    case "ARMY": return p.stockArmies > 0;
  }
}

function setupLabel(it: SetupItem): string {
  switch (it) {
    case "AIRPORT": return "un aeropuerto";
    case "SILO": return "su silo";
    case "TOWER": return "una torre de petróleo";
    case "PLANE": return "un avión";
    case "TANK": return "un tanque";
    case "ARMY": return "un ejército";
  }
}

/* ═══════════════════════ Reducer ═══════════════════════ */

export type Action =
  | { type: "RESET" }
  | { type: "HYDRATE"; state: GameState }
  | { type: "SETUP_SELECT_ITEM"; item: SetupItem }
  | { type: "SETUP_PLACE"; territory: string }
  | { type: "SETUP_SKIP" }
  | { type: "SELECT_REINFORCE_ITEM"; item: SetupItem }
  | { type: "PLACE_REINFORCEMENT"; territory: string; count?: number }
  | { type: "END_REINFORCE" }
  | { type: "SELECT_ATTACK_KIND"; kind: UnitKind }
  | { type: "SELECT_ATTACK_SOURCE"; territory: string | null }
  | { type: "SELECT_ATTACK_TARGET"; territory: string }
  | { type: "RESOLVE_ATTACK"; dice: number }
  | { type: "OCCUPY"; infantry: number }
  | { type: "END_ATTACK" }
  | { type: "SELECT_FORTIFY_SOURCE"; territory: string | null }
  | { type: "FORTIFY_MOVE"; target: string; infantry: number; tanks: number; planes: number }
  | { type: "END_FORTIFY" }
  | { type: "END_TURN" }
  | { type: "LAUNCH_NUKE"; target: string }
  | { type: "OCCUPY_PICK_SOURCE"; territory: string }
  | { type: "TRADE_CARDS"; indices: number[]; reward?: TradeReward };

function nextAlivePlayer(state: GameState): number {
  let idx = state.current;
  for (let i = 0; i < state.players.length; i++) {
    idx = (idx + 1) % state.players.length;
    if (state.players[idx].alive) return idx;
  }
  return state.current;
}

function checkEliminations(state: GameState, attackerId?: number, transferCards: boolean = true) {
  for (const p of state.players) {
    if (!p.alive) continue;
    if (ownedCount(state, p.id) === 0) {
      p.alive = false;
      if (attackerId !== undefined && transferCards && p.cards.length > 0) {
        state.players[attackerId].cards.push(...p.cards);
        pushLog(state, "card", `${state.players[attackerId].name} captura ${p.cards.length} cartas de ${p.name}.`);
        p.cards = [];
      } else if (attackerId !== undefined && !transferCards && p.cards.length > 0) {
        // Tierra quemada: el jugador eliminado sin combate no cede sus cartas.
        state.discard.push(...p.cards);
        pushLog(state, "card", `${p.name} eliminado por tierra quemada: sus ${p.cards.length} cartas van al descarte.`);
        p.cards = [];
      }
      pushLog(state, "info", `${p.name} ha sido eliminado.`);
    }
  }
  const alive = state.players.filter((p) => p.alive);
  if (alive.length === 1) {
    state.winner = alive[0].id;
    pushLog(state, "victory", `¡${alive[0].name} ha conquistado el mundo!`);
  }
}

export function reducer(state: GameState, action: Action): GameState {
  if (action.type === "HYDRATE") return action.state;
  if (state.winner !== null && action.type !== "RESET") return state;
  switch (action.type) {
    case "RESET":
      return initGame(state.players.map((p) => ({ name: p.name, isBot: p.isBot })));


    /* ─────── SETUP ─────── */
    case "SETUP_SELECT_ITEM": {
      if (state.phase !== "SETUP") return state;
      const p = state.players[state.current];
      if (!hasStockFor(p, action.item)) return state;
      const s = clone(state);
      s.setupItem = action.item;
      return s;
    }
    case "SETUP_PLACE": {
      if (state.phase !== "SETUP") return state;
      const p = state.players[state.current];
      const terr = state.territories[action.territory];
      if (!terr || terr.owner !== p.id) return state;
      const s = clone(state);
      const P = s.players[s.current];
      const T = s.territories[action.territory];
      switch (s.setupItem) {
        case "AIRPORT":
          if (P.stockAirports <= 0 || T.airport) return state;
          T.airport = true; P.stockAirports -= 1;
          pushLog(s, "build", `${P.name} sitúa un aeropuerto en ${TERR_BY_ID[action.territory].name}.`);
          break;
        case "SILO":
          if (P.stockSilos <= 0 || T.silo) return state;
          T.silo = true; P.stockSilos -= 1;
          pushLog(s, "build", `${P.name} sitúa su silo en ${TERR_BY_ID[action.territory].name}.`);
          break;
        case "TOWER":
          if (P.stockTowers <= 0) return state;
          T.towers += 1; P.stockTowers -= 1; P.oil += OIL_PER_TOWER;
          pushLog(s, "build", `${P.name} levanta una torre en ${TERR_BY_ID[action.territory].name}.`);
          break;
        case "PLANE":
          if (P.stockPlanes <= 0) return state;
          if (!T.airport) return state;
          T.planes += 1; P.stockPlanes -= 1;
          pushLog(s, "build", `${P.name} estaciona un avión en ${TERR_BY_ID[action.territory].name}.`);
          break;
        case "TANK":
          if (P.stockTanks <= 0) return state;
          T.tanks += 1; P.stockTanks -= 1;
          pushLog(s, "build", `${P.name} despliega un tanque en ${TERR_BY_ID[action.territory].name}.`);
          break;
        case "ARMY":
          if (P.stockArmies <= 0) return state;
          T.infantry += 1; P.stockArmies -= 1;
          break;
      }
      // Avanza al siguiente jugador con cosas por colocar
      advanceSetup(s);
      return s;
    }

    /* ─────── REINFORCE ─────── */
    case "SELECT_REINFORCE_ITEM": {
      if (state.phase !== "REINFORCE") return state;
      const p = state.players[state.current];
      // Solo ARMY/TANK/PLANE/TOWER en refuerzo
      if (action.item === "AIRPORT" || action.item === "SILO") return state;
      // Debe tener stock (o refuerzos para ARMY)
      if (action.item === "ARMY") { if (state.reinforcements <= 0) return state; }
      else if (action.item === "TANK" && p.stockTanks <= 0) return state;
      else if (action.item === "PLANE" && p.stockPlanes <= 0) return state;
      else if (action.item === "TOWER" && p.stockTowers <= 0) return state;
      const s = clone(state);
      s.reinforceItem = action.item;
      return s;
    }
    case "PLACE_REINFORCEMENT": {
      if (state.phase !== "REINFORCE") return state;
      const t = state.territories[action.territory];
      if (!t || t.owner !== state.players[state.current].id) return state;
      const item = state.reinforceItem;
      const s = clone(state);
      const P = s.players[s.current];
      const T = s.territories[action.territory];
      const req = Math.max(1, action.count ?? 1);
      let placed = 0;
      switch (item) {
        case "ARMY": {
          placed = Math.min(req, s.reinforcements);
          if (placed <= 0) return state;
          T.infantry += placed;
          s.reinforcements -= placed;
          break;
        }
        case "TANK": {
          placed = Math.min(req, P.stockTanks);
          if (placed <= 0) return state;
          T.tanks += placed;
          P.stockTanks -= placed;
          pushLog(s, "reinforce", `${P.name} despliega ${placed} tanque(s) en ${TERR_BY_ID[action.territory].name}.`);
          break;
        }
        case "PLANE": {
          if (!T.airport) return state;
          placed = Math.min(req, P.stockPlanes);
          if (placed <= 0) return state;
          T.planes += placed;
          P.stockPlanes -= placed;
          pushLog(s, "reinforce", `${P.name} estaciona ${placed} avión(es) en ${TERR_BY_ID[action.territory].name}.`);
          break;
        }
        case "TOWER": {
          placed = Math.min(req, P.stockTowers);
          if (placed <= 0) return state;
          T.towers += placed;
          P.stockTowers -= placed;
          P.oil += placed * OIL_PER_TOWER;
          pushLog(s, "build", `${P.name} levanta ${placed} torre(s) en ${TERR_BY_ID[action.territory].name}.`);
          break;
        }
        default: return state;
      }
      // Si terminó la infantería, cambia a lo siguiente disponible automáticamente
      if (item === "ARMY" && s.reinforcements <= 0) {
        if (P.stockTanks > 0) s.reinforceItem = "TANK";
        else if (P.stockPlanes > 0) s.reinforceItem = "PLANE";
        else if (P.stockTowers > 0) s.reinforceItem = "TOWER";
      } else if (item === "TANK" && P.stockTanks <= 0) {
        if (P.stockPlanes > 0) s.reinforceItem = "PLANE";
        else if (P.stockTowers > 0) s.reinforceItem = "TOWER";
        else if (s.reinforcements > 0) s.reinforceItem = "ARMY";
      } else if (item === "PLANE" && P.stockPlanes <= 0) {
        if (P.stockTanks > 0) s.reinforceItem = "TANK";
        else if (P.stockTowers > 0) s.reinforceItem = "TOWER";
        else if (s.reinforcements > 0) s.reinforceItem = "ARMY";
      } else if (item === "TOWER" && P.stockTowers <= 0) {
        if (s.reinforcements > 0) s.reinforceItem = "ARMY";
        else if (P.stockTanks > 0) s.reinforceItem = "TANK";
        else if (P.stockPlanes > 0) s.reinforceItem = "PLANE";
      }
      return s;
    }
    case "END_REINFORCE": {
      if (state.phase !== "REINFORCE") return state;
      // Canje obligatorio con 5+ cartas: bloquea el final de refuerzos
      if (state.players[state.current].cards.length >= 5) return state;
      // No se puede pasar a Ataque con unidades pendientes de colocar.
      // Excepción: aviones cuando el jugador no tiene aeropuertos donde ponerlos.
      if (reinforcePending(state)) return state;
      const s = clone(state);
      s.phase = "ATTACK";
      return s;
    }
    case "TRADE_CARDS": {
      if (state.phase !== "REINFORCE") return state;
      const p = state.players[state.current];
      const idxs = [...new Set(action.indices)];
      if (idxs.length !== 3) return state;
      if (idxs.some((i) => i < 0 || i >= p.cards.length)) return state;
      const chosen = idxs.map((i) => p.cards[i]);
      const combo = classifyTrade(chosen.map((c) => c.symbol));
      if (!combo) return state;
      // Validar recompensa elegida
      let reward: TradeReward | null = null;
      if (combo.fixed) reward = combo.fixed;
      else {
        const chosenReward = action.reward;
        if (!chosenReward) return state;
        reward = combo.rewards.find(
          (r) => r.kind === chosenReward.kind &&
            (r.kind === "NUKE" || r.kind === "TOWER_FIXED" || ("n" in r && "n" in chosenReward && r.n === chosenReward.n)),
        ) ?? null;
        if (!reward) return state;
      }
      const s = clone(state);
      const P = s.players[s.current];
      // Retirar las cartas canjeadas y llevarlas al descarte
      const removed: Card[] = [];
      for (const i of [...idxs].sort((a, b) => b - a)) {
        removed.push(P.cards.splice(i, 1)[0]);
      }
      s.discard.push(...removed);
      s.tradesMade += 1;
      s.reinforcements += combo.infantry;
      // Aplicar recompensa
      let rewardText = "";
      switch (reward.kind) {
        case "NUKE": P.stockNukes += 1; rewardText = "+1 misil nuclear"; break;
        case "TOWERS": P.stockTowers += reward.n; rewardText = `+${reward.n} torres`; break;
        case "PLANES": P.stockPlanes += reward.n; rewardText = `+${reward.n} aviones`; break;
        case "TANKS": P.stockTanks += reward.n; rewardText = `+${reward.n} tanques`; break;
        case "TOWER_FIXED": P.stockTowers += 1; rewardText = "+1 torre"; break;
      }
      pushLog(
        s, "card",
        `${P.name} canjea ${combo.label} → +${combo.infantry} infantería y ${rewardText}.`,
      );
      return s;
    }

    /* ─────── ATTACK ─────── */
    case "SELECT_ATTACK_KIND": {
      if (state.phase !== "ATTACK") return state;
      const s = clone(state);
      s.attackKind = action.kind;
      s.attackSource = null;
      // Si hay objetivo bloqueado, mantenerlo visible. Si no, limpiar.
      if (!s.turnAttackTarget) s.attackTarget = null;
      else s.attackTarget = s.turnAttackTarget;
      s.lastBattle = null;
      return s;
    }
    case "SELECT_ATTACK_SOURCE": {
      if (state.phase !== "ATTACK") return state;
      const s = clone(state);
      s.attackSource = action.territory;
      // Mantener el objetivo del turno si ya estaba bloqueado
      if (s.turnAttackTarget) s.attackTarget = s.turnAttackTarget;
      else s.attackTarget = null;
      s.lastBattle = null;
      return s;
    }
    case "SELECT_ATTACK_TARGET": {
      if (state.phase !== "ATTACK") return state;
      const src = state.attackSource;
      if (!src) return state;
      const srcT = state.territories[src];
      const tgtT = state.territories[action.territory];
      if (!tgtT || tgtT.owner === srcT.owner) return state;
      // Objetivo bloqueado para el turno: solo permite el mismo territorio
      if (state.turnAttackTarget && state.turnAttackTarget !== action.territory) return state;
      // Adyacencia obligatoria para infantería/tanque; los aviones tienen alcance global
      if (state.attackKind !== "PLANE" && !TERR_BY_ID[src].adj.includes(action.territory)) return state;
      // Aviones: el objetivo debe tener frontera con un territorio propio con
      // ≥2 infantería para poder trasladar 1 tropa en caso de conquista.
      if (state.attackKind === "PLANE") {
        const hasBorder = TERR_BY_ID[action.territory].adj.some((id) => {
          const nb = state.territories[id];
          return nb.owner === srcT.owner && nb.infantry >= 2;
        });
        if (!hasBorder) return state;
      }
      const s = clone(state);
      s.attackTarget = action.territory;
      s.lastBattle = null;
      return s;
    }

    case "RESOLVE_ATTACK": {
      if (state.phase !== "ATTACK") return state;
      const src = state.attackSource, tgt = state.attackTarget;
      if (!src || !tgt) return state;
      const srcT0 = state.territories[src], tgtT0 = state.territories[tgt];
      if (!srcT0 || !tgtT0) return state;
      if (srcT0.owner !== state.players[state.current].id) return state;
      if (tgtT0.owner === srcT0.owner) return state;
      const s = clone(state);
      const srcT = s.territories[src], tgtT = s.territories[tgt];
      const attacker = s.players[srcT.owner];
      const kind = s.attackKind;

      let atkLost = 0, defLost = 0;
      let atkRaw: number[] = [];
      let defRaw: number[] = [];
      let note: string | undefined;
      let effKind: UnitKind = kind;
      /** Petróleo del defensor al inicio del combate — determina degradación defensiva. */
      const defOilBefore = playerOil(s, tgtT.owner);
      const defDegraded = defOilBefore === 0;
      // Recuentos defensivos efectivos: si el defensor no tiene petróleo, los aviones
      // se comportan como tanques y los tanques como soldados de infantería.
      const effDefPlanes = defDegraded ? 0 : tgtT.planes;
      const effDefTanks  = defDegraded ? tgtT.planes : tgtT.tanks;
      const effDefInf    = defDegraded ? tgtT.infantry + tgtT.tanks : tgtT.infantry;
      const effTotalDef  = effDefPlanes + effDefTanks + effDefInf;
      /** El combate no ocurrió porque el objetivo estaba vacío. Auto-conquista sin carta. */
      let noDefenders = effTotalDef === 0;
      /** Aplica una baja al defensor teniendo en cuenta degradación por falta de petróleo. */
      const takeDef = (layer: 'plane' | 'tank' | 'inf') => {
        if (layer === 'plane') { tgtT.planes -= 1; return; }
        if (layer === 'tank') {
          if (defDegraded && tgtT.planes > 0) tgtT.planes -= 1;
          else tgtT.tanks -= 1;
          return;
        }
        if (defDegraded) {
          if (tgtT.tanks > 0) tgtT.tanks -= 1;
          else if (tgtT.infantry > 0) tgtT.infantry -= 1;
          else if (tgtT.planes > 0) tgtT.planes -= 1;
        } else {
          tgtT.infantry -= 1;
        }
      };

      if (kind === "PLANE") {
        /* ─── Ataque con avión ─── */
        if (!srcT.airport || srcT.planes < 1) return state;
        // Coste de petróleo ida y vuelta (por 1 avión)
        const cost = planeOilCost(src, tgt, 1);
        if (!isFinite(cost) || playerOil(s, attacker.id) < cost) {
          pushLog(s, "oil", `${attacker.name}: petróleo insuficiente para el ataque aéreo (${isFinite(cost) ? cost : "∞"} L).`);
          return s;
        }
        spendOil(s, attacker.id, cost);
        pushLog(s, "oil", `${attacker.name} gasta ${cost} L en un ataque aéreo a ${TERR_BY_ID[tgt].name}.`);

        // Prioridad de defensa: aviones → tanques → infantería (con degradación si no hay petróleo)
        if (noDefenders) {
          note = "Territorio sin defensores";
        } else if (effDefPlanes > 0) {
          note = "Avión vs avión (empate → defensor pierde)";
          const a = rollDice(1)[0]; const d = rollDice(1)[0];
          atkRaw = [a]; defRaw = [d];
          if (a >= d) { takeDef('plane'); defLost = 1; }
          else { srcT.planes -= 1; atkLost = 1; }
        } else if (effDefTanks > 0) {
          note = "Avión vs tanque (tanque tira 3 dados: triple → avión abatido)";
          const rolls = rollDice(3);
          defRaw = rolls;
          atkRaw = [];
          const triple = rolls[0] === rolls[1] && rolls[1] === rolls[2];
          if (triple) { srcT.planes -= 1; atkLost = 1; }
          else { takeDef('tank'); defLost = 1; }

        } else if (effDefInf > 0) {
          note = "Avión vs infantería (dobles → nulo; doble 6 → avión abatido)";
          const rolls = rollDice(2);
          defRaw = rolls;
          atkRaw = [];
          const isDouble = rolls[0] === rolls[1];
          const isDoubleSix = isDouble && rolls[0] === 6;
          if (isDoubleSix) { srcT.planes -= 1; atkLost = 1; }
          else if (isDouble) { /* nulo */ }
          else { takeDef('inf'); defLost = 1; }
        }
        effKind = "PLANE";
      } else {
        // Determinar tipo efectivo del atacante (tanque puede degradarse por falta de petróleo)
        if (kind === "TANK") {
          if (srcT.tanks < 1) return state;
          const oil = playerOil(s, attacker.id);
          if (oil < TANK_ATTACK_OIL) {
            // Sin petróleo un tanque no puede atacar. Ataque bloqueado.
            pushLog(s, "oil", `${attacker.name}: petróleo insuficiente (${TANK_ATTACK_OIL} L). El tanque no puede atacar.`);
            return s;
          }
          spendOil(s, attacker.id, TANK_ATTACK_OIL);
          pushLog(s, "oil", `${attacker.name} gasta ${TANK_ATTACK_OIL} L en un ataque con tanque a ${TERR_BY_ID[tgt].name}.`);
        } else {
          // Tierra quemada: permitido atacar con 1 infantería (arriesga perderla)
          if (srcT.infantry < 1) return state;
        }

        // Prioridad de defensa: aviones → tanques → infantería (con degradación).
        if (noDefenders) {
          note = "Territorio sin defensores";
        } else if (effDefPlanes > 0) {
          if (effKind === "TANK") {
            note = "Tanque vs avión (tanque tira 3 dados: triple → avión abatido)";
            const rolls = rollDice(3);
            atkRaw = rolls; defRaw = [];
            const triple = rolls[0] === rolls[1] && rolls[1] === rolls[2];
            if (triple) { takeDef('plane'); defLost = 1; }
            else { srcT.tanks -= 1; atkLost = 1; }

          } else {
            note = "Infantería vs avión (2 dados; doble → nulo; doble 6 → avión abatido)";
            const rolls = rollDice(2);
            defRaw = rolls; atkRaw = [];
            const isDouble = rolls[0] === rolls[1];
            const isDoubleSix = isDouble && rolls[0] === 6;
            if (isDoubleSix) { takeDef('plane'); defLost = 1; }
            else if (isDouble) { /* ataque nulo */ }
            else { srcT.infantry -= 1; atkLost = 1; }
          }
        } else {
          const scorched = effKind !== "TANK" && srcT.infantry === 1;
          // Tanque atacando: siempre debe ir acompañado (otro tanque o ≥2 infantería
          // de apoyo). Un tanque con solo 1 infantería no puede atacar.
          if (effKind === "TANK") {
            if (srcT.tanks < 1) return state;
            const supportInf = Math.max(0, srcT.infantry - 1);
            if (srcT.tanks < 2 && supportInf < 2) return state;
          }
          const atkTotalGround = effKind === "TANK"
            ? srcT.tanks + Math.max(0, srcT.infantry - 1)
            : (scorched ? 1 : srcT.infantry - 1);
          const maxAtk = Math.min(action.dice, atkTotalGround, 3);
          if (maxAtk < 1) return state;
          const defTankFirst = effDefTanks > 0;
          const totalDefGround = effDefTanks + effDefInf;
          // El defensor puede tirar 3 dados si tiene ≥1 tanque; si no, 2.
          // Excepción: 3+ tanques atacantes vs 3+ tanques defensores → como infantería (3 vs 2).
          const bothHeavyTanks = effKind === "TANK" && srcT.tanks >= 3 && effDefTanks >= 3;
          const maxDef = Math.min(defTankFirst && !bothHeavyTanks ? 3 : 2, totalDefGround);
          if (maxDef < 1) return state;

          atkRaw = rollDice(maxAtk);
          defRaw = rollDice(maxDef);
          const compare = Math.min(atkRaw.length, defRaw.length);

          // Asignación de dados por unidad: los dados más altos son para los tanques.
          const atkTankDice = effKind === "TANK" ? Math.min(srcT.tanks, maxAtk) : 0;
          const defTankDice = Math.min(effDefTanks, maxDef);
          const isAtkTank = (i: number) => i < atkTankDice;
          const isDefTank = (i: number) => i < defTankDice;

          let atkTankLost = 0, atkInfLost = 0, defTankLost = 0, defInfLost = 0;
          for (let i = 0; i < compare; i++) {
            // Bonus +2 solo cuando un tanque enfrenta a una unidad no-tanque.
            const aBonus = isAtkTank(i) && !isDefTank(i) ? 2 : 0;
            const dBonus = !isAtkTank(i) && isDefTank(i) ? 2 : 0;
            const a = atkRaw[i] + aBonus;
            const d = defRaw[i] + dBonus;
            if (a > d) {
              if (isDefTank(i)) defTankLost++; else defInfLost++;
            } else {
              if (isAtkTank(i)) atkTankLost++; else atkInfLost++;
            }
          }
          atkLost = atkTankLost + atkInfLost;
          defLost = defTankLost + defInfLost;

          if (effKind === "TANK" && defTankFirst) {
            note = bothHeavyTanks ? "Tanque vs tanque (3 vs 2)" : "Tanque vs tanque (con apoyo)";
          } else if (effKind === "TANK") {
            note = "Tanque + apoyo vs infantería (+2 al tanque)";
          } else {
            note = defTankFirst ? "Infantería vs tanque defensor (+2 al tanque)" : "Infantería vs infantería";
          }

          // Aplicar pérdidas del atacante por tipo
          srcT.tanks -= atkTankLost;
          srcT.infantry -= atkInfLost;
          // Aplicar pérdidas del defensor: primero tanques asignados, luego infantería
          for (let i = 0; i < defTankLost; i++) takeDef('tank');
          for (let i = 0; i < defInfLost; i++) takeDef('inf');
          if (tgtT.infantry < 0) tgtT.infantry = 0;
          if (tgtT.tanks < 0) tgtT.tanks = 0;
          if (tgtT.planes < 0) tgtT.planes = 0;
        }
      }


      s.lastBattle = { atk: atkRaw, def: defRaw, atkLost, defLost, note, atkOwner: srcT.owner, defOwner: tgtT.owner, atkKind: effKind, terrId: tgt };

      // Estadísticas de bajas
      bumpStat(s, srcT.owner, "lost", atkLost);
      bumpStat(s, tgtT.owner, "killed", atkLost);
      bumpStat(s, tgtT.owner, "lost", defLost);
      bumpStat(s, srcT.owner, "killed", defLost);

      // Bloquear objetivo del turno tras el primer ataque
      if (!s.turnAttackTarget) s.turnAttackTarget = tgt;

      const label = effKind === "TANK" ? "TQ" : effKind === "PLANE" ? "AV" : "INF";
      pushLog(
        s, "attack",
        `${TERR_BY_ID[src].name} → ${TERR_BY_ID[tgt].name} [${label}]: atk [${atkRaw.join(",") || "-"}] def [${defRaw.join(",") || "-"}] · -${atkLost}/${defLost}`,
      );

      // Conquista
      if (territoryArmyCount(tgtT) <= 0) {
        // Tierra quemada / conquista fallida: si el atacante no puede trasladar 1 infantería,
        // el territorio enemigo queda vacío pero no cambia de dueño y no se cobra carta.
        if (effKind !== "PLANE" && srcT.infantry <= 1) {
          pushLog(s, "info",
            `${TERR_BY_ID[tgt].name} queda vacío pero ${attacker.name} no tiene tropas para ocupar: no se cobra carta.`);
          s.attackTarget = null; s.attackSource = null; s.lastBattle = null;
          return s;
        }
        const prevOwner = tgtT.owner;
        const prevOwnerId = prevOwner;
        // Transferencia de petróleo por torres capturadas (antes de cambiar dueño).
        const capturedTowers = tgtT.towers;
        if (capturedTowers > 0) {
          const loser = s.players[prevOwnerId];
          // Petróleo capturado proporcional: floor(oil / total_torres) × torres_capturadas.
          const totalTowersLoser = playerTowers(s, prevOwnerId);
          const perTower = totalTowersLoser > 0 ? Math.floor(loser.oil / totalTowersLoser) : 0;
          const take = Math.min(loser.oil, perTower * capturedTowers);
          loser.oil -= take;
          attacker.oil += take;
          // El territorio (y sus torres) pasa YA al atacante: las torres capturadas
          // no deben retirarse aunque el defensor se quede sin petróleo.
          tgtT.owner = attacker.id;
          if (loser.oil <= 0) removeAllTowersOf(s, prevOwnerId);
          syncOilInvariant(s);
          s.towerAlert = { pid: prevOwnerId, terrId: tgt, towers: capturedTowers, oil: take, cause: "capture", at: Date.now() };
          bumpStat(s, prevOwnerId, "towersLost", capturedTowers);
          bumpStat(s, attacker.id, "towersTaken", capturedTowers);
          pushLog(s, "oil", `${attacker.name} captura ${capturedTowers} torre(s) y ${take} L de petróleo de ${loser.name}.`);
        }
        if (tgtT.airport) {
          attacker.stockTowers += 1;
          pushLog(s, "build", `${attacker.name} recibe +1 torre por tomar un aeropuerto.`);
        }
        if (tgtT.silo) {
          attacker.stockNukes += 1;
          pushLog(s, "build", `${attacker.name} recibe +1 misil nuclear por tomar un silo.`);
        }
        tgtT.owner = attacker.id;

        // Movimiento automático de 1 infantería al territorio conquistado.
        // Ataques terrestres: desde srcT. Aéreos: el jugador elige territorio adyacente propio con ≥2 infantería.
        let occFrom = src;
        if (effKind === "PLANE") {
          // Auto-elegir el territorio adyacente del atacante con más infantería (≥2 para poder ceder 1)
          const candidates = TERR_BY_ID[tgt].adj
            .filter((id) => s.territories[id].owner === attacker.id && s.territories[id].infantry >= 2)
            .sort((a, b) => s.territories[b].infantry - s.territories[a].infantry);
          if (candidates.length === 0) {
            // No hay tropas adyacentes para ocupar: el ataque aéreo destruye pero no conquista.
            // Revertimos los bonos de aeropuerto/silo aplicados antes.
            if (tgtT.airport) attacker.stockTowers -= 1;
            if (tgtT.silo) attacker.stockNukes -= 1;
            tgtT.owner = prevOwner;
            pushLog(s, "info",
              `${TERR_BY_ID[tgt].name} queda vacío pero ${attacker.name} no tiene infantería adyacente para ocupar: no se cobra carta.`);
            s.attackTarget = null; s.attackSource = null; s.lastBattle = null;
            return s;
          }
          occFrom = candidates[0];
          s.territories[occFrom].infantry -= 1;
          tgtT.infantry += 1;
          pushLog(s, "conquest", `Se traslada 1 infantería desde ${TERR_BY_ID[occFrom].name} a ${TERR_BY_ID[tgt].name}.`);
        } else {
          const moveMax = srcT.infantry - 1;
          const auto = Math.max(0, Math.min(1, moveMax));
          srcT.infantry -= auto;
          tgtT.infantry += auto;
        }

        const occSrc = s.territories[occFrom];
        const movable = Math.max(0, occSrc.infantry - 1);
        s.pendingOccupy = {
          from: occFrom,
          to: tgt,
          maxInfantry: movable,
          maxTanks: 0,
          kind: effKind,
        };
        // Solo se cobra carta si hubo combate real. Auto-conquista sin defensores no da carta.
        if (!noDefenders) s.conqueredThisTurn = true;
        pushLog(s, "conquest", `${attacker.name} conquistó ${TERR_BY_ID[tgt].name} (antes de ${s.players[prevOwner].name}).`);
        if (noDefenders) pushLog(s, "info", `Sin combate: ${attacker.name} no cobra carta por esta conquista.`);
        if (s.pendingOccupy.maxInfantry <= 0) s.pendingOccupy = null;
        checkEliminations(s, attacker.id, !noDefenders);
        if (s.winner !== null) return s;
        s.attackTarget = null;
        s.attackSource = null;
        s.lastBattle = null;
        // Solo se puede atacar un territorio por turno: el objetivo queda bloqueado aunque se conquiste.
      }
      return s;
    }

    case "OCCUPY_PICK_SOURCE": {
      if (!state.pendingOccupy || !state.pendingOccupy.candidates) return state;
      if (!state.pendingOccupy.candidates.includes(action.territory)) return state;
      const s = clone(state);
      const from = action.territory;
      const to = s.pendingOccupy!.to;
      // Mueve automáticamente 1 infantería (obligatorio en la conquista)
      s.territories[from].infantry -= 1;
      s.territories[to].infantry += 1;
      const movable = Math.max(0, s.territories[from].infantry - 1);
      s.pendingOccupy = {
        from,
        to,
        maxInfantry: movable,
        maxTanks: 0,
        kind: "PLANE",
      };
      if (movable <= 0) s.pendingOccupy = null;
      return s;
    }

    case "OCCUPY": {
      if (!state.pendingOccupy) return state;
      if (!state.pendingOccupy.from) return state; // aún hay que elegir origen (avión)
      const s = clone(state);
      const { from, to, maxInfantry } = s.pendingOccupy!;
      const srcT = s.territories[from];
      let inf = Math.max(0, Math.min(action.infantry, maxInfantry));
      if (srcT.infantry - inf < 1) inf = Math.max(0, srcT.infantry - 1);
      s.territories[from].infantry -= inf;
      s.territories[to].infantry += inf;
      s.pendingOccupy = null;
      return s;
    }

    case "END_ATTACK": {
      if (state.phase !== "ATTACK") return state;
      const s = clone(state);
      s.phase = "FORTIFY";
      s.attackSource = null; s.attackTarget = null; s.lastBattle = null;
      return s;
    }

    case "LAUNCH_NUKE": {
      // El misil se puede lanzar en REINFORCE o al inicio de ATTACK: no cuenta como ataque
      if (state.phase !== "ATTACK" && state.phase !== "REINFORCE") return state;
      const attacker = state.players[state.current];
      if (attacker.stockNukes < 1) return state;
      // Un jugador sin silo nuclear no puede lanzar misiles.
      if (!playerHasSilo(state, attacker.id)) return state;
      const tgt = state.territories[action.target];
      if (!tgt || tgt.owner === attacker.id) return state;
      const s = clone(state);
      const P = s.players[s.current];
      P.stockNukes -= 1;

      // Destruye las torres del territorio y elimina petróleo proporcional del defensor.
      // El atacante NO recibe petróleo del misil.
      const t = s.territories[action.target];
      const defender = s.players[t.owner];
      const towersDestroyed = t.towers;
      const totalTowers = playerTowers(s, defender.id);
      let oilLoss = 0;
      if (towersDestroyed > 0 && totalTowers > 0) {
        const perTower = Math.floor(defender.oil / totalTowers);
        oilLoss = perTower * towersDestroyed;
        defender.oil = Math.max(0, defender.oil - oilLoss);
      }
      t.towers = 0;
      if (towersDestroyed > 0) {
        s.towerAlert = { pid: defender.id, terrId: action.target, towers: towersDestroyed, oil: oilLoss, cause: "nuke", at: Date.now() };
      }
      if (defender.oil <= 0) removeAllTowersOf(s, defender.id);
      syncOilInvariant(s);


      pushLog(
        s, "nuke",
        `☢ ${P.name} lanza un misil nuclear sobre ${TERR_BY_ID[action.target].name}: ${towersDestroyed} torre(s) destruidas · −${oilLoss} L a ${defender.name}.`,
      );
      return s;
    }

    /* ─────── FORTIFY ─────── */
    case "SELECT_FORTIFY_SOURCE": {
      if (state.phase !== "FORTIFY") return state;
      const s = clone(state);
      s.fortifySource = action.territory;
      return s;
    }
    case "FORTIFY_MOVE": {
      if (state.phase !== "FORTIFY") return state;
      const src = state.fortifySource;
      if (!src) return state;
      const srcT = state.territories[src];
      const tgtT = state.territories[action.target];
      if (!tgtT || srcT.owner !== tgtT.owner) return state;

      // Infantería y tanques se mueven a cualquier territorio propio conectado por tierra o mar
      const groundDist = ownedPathDist(state, src, action.target, srcT.owner);
      let inf = Math.max(0, Math.min(action.infantry, srcT.infantry));
      let tk = Math.max(0, Math.min(action.tanks, srcT.tanks));
      let pl = Math.max(0, Math.min(action.planes, srcT.planes));

      if (groundDist < 0) { inf = 0; tk = 0; }

      // Los aviones necesitan aeropuerto en origen y destino, y pueden volar a cualquier distancia
      let planeDist = 0;
      if (pl > 0) {
        if (!srcT.airport || !tgtT.airport) { pl = 0; }
        else {
          planeDist = bfsDist(src, action.target);
          if (planeDist < 0) pl = 0;
        }
      }

      // El origen debe conservar ≥1 infantería
      if (srcT.infantry - inf < 1) inf = Math.max(0, srcT.infantry - 1);
      if (inf + tk + pl <= 0) return state;

      // Coste de petróleo: tanque = TANK_MOVE_OIL * count (1 paso adyacente); avión = PLANE_OIL_PER_STEP * dist * count
      const attackerOil = playerOil(state, srcT.owner);
      const tankOil = tk * Math.max(1, groundDist) * TANK_MOVE_OIL;
      const planeOil = pl * planeDist * PLANE_OIL_PER_STEP;
      const totalOil = tankOil + planeOil;
      if (totalOil > attackerOil) return state;

      const s = clone(state);
      spendOil(s, srcT.owner, totalOil);
      s.territories[src].infantry -= inf;
      s.territories[src].tanks -= tk;
      s.territories[src].planes -= pl;
      s.territories[action.target].infantry += inf;
      s.territories[action.target].tanks += tk;
      s.territories[action.target].planes += pl;
      s.fortifySource = null;
      pushLog(
        s, "fortify",
        `${s.players[s.current].name} movió ${inf}i+${tk}t+${pl}a de ${TERR_BY_ID[src].name} a ${TERR_BY_ID[action.target].name}${totalOil > 0 ? ` (−${totalOil} L)` : ""}.`,
      );
      return s;
    }
    case "END_FORTIFY": {
      if (state.phase !== "FORTIFY") return state;
      const s = clone(state);
      s.fortifyDone = true;
      s.fortifySource = null;
      return s;
    }



    /* ─────── END TURN ─────── */
    case "END_TURN": {
      const s = clone(state);
      if (s.conqueredThisTurn) {
        const card = drawCard(s);
        if (card) {
          const P = s.players[s.current];
          P.cards.push(card);
          const label = card.territoryId ? TERR_BY_ID[card.territoryId].name : "comodín";
          pushLog(s, "card", `${P.name} roba una carta [${card.symbol}] (${label}).`);
          // Bonos si el territorio de la carta es propio
          if (card.territoryId) {
            const T = s.territories[card.territoryId];
            if (T.owner === P.id) {
              P.pendingBonusArmies += 2;
              pushLog(s, "card", `${P.name} controla ${TERR_BY_ID[card.territoryId].name}: +2 infantería en su próximo refuerzo.`);
              if (T.airport) {
                P.stockTowers += 1;
                pushLog(s, "card", `${P.name}: aeropuerto en la carta → +1 torre de petróleo.`);
              }
              if (T.silo) {
                P.stockNukes += 1;
                pushLog(s, "nuke", `${P.name}: silo en la carta → +1 misil nuclear.`);
              }
            }
          }
        }
      }
      checkEliminations(s, s.current);
      if (s.winner !== null) return s;
      s.current = nextAlivePlayer(s);
      s.phase = "REINFORCE";
      s.reinforcements = computeReinforcements(s.territories, s.players[s.current].id);
      // Aplicar bonus pendiente por cartas de territorio propio robadas en turnos anteriores
      const nextP = s.players[s.current];
      if (nextP.pendingBonusArmies > 0) {
        s.reinforcements += nextP.pendingBonusArmies;
        pushLog(s, "reinforce", `${nextP.name} recibe +${nextP.pendingBonusArmies} infantería de bono por cartas de territorios propios.`);
        nextP.pendingBonusArmies = 0;
      }
      s.attackSource = null; s.attackTarget = null; s.turnAttackTarget = null; s.lastBattle = null;
      s.pendingOccupy = null; s.fortifySource = null; s.fortifyDone = false;
      s.conqueredThisTurn = false;
      s.tankAttacksPaid = [];
      s.attackKind = "INFANTRY";
      s.reinforceItem = "ARMY";
      // (Sin reset: el petróleo es persistente y solo cambia por gasto/ganancia.)
      pushLog(s, "turn", `Turno de ${s.players[s.current].name}.`);
      return s;
    }
  }
  return state;
}
