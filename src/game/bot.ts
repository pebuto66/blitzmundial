import { TERRITORIES, TERR_BY_ID, type TerrSymbol } from "./territories";
import {
  classifyTrade, playerOil, playerHasAirport, playerHasSilo, reinforcePending,
  bfsDist, PLANE_OIL_PER_STEP, TANK_ATTACK_OIL,
  type GameState, type Action, type UnitKind, type TradeReward,
} from "./reducer";

/** Devuelve la siguiente acción que el bot quiere ejecutar, o null si debe esperar. */
export function nextBotAction(state: GameState): Action | null {
  if (state.winner !== null) return null;
  const p = state.players[state.current];
  if (!p.isBot || !p.alive) return null;

  switch (state.phase) {
    case "SETUP":    return botSetup(state);
    case "REINFORCE": return botReinforce(state);
    case "ATTACK":   return botAttack(state);
    case "FORTIFY":  return botFortify(state);
  }
}

/* ═════════ SETUP ═════════ */

function botSetup(state: GameState): Action | null {
  const p = state.players[state.current];
  const owned = TERRITORIES.filter((t) => state.territories[t.id].owner === p.id);
  if (owned.length === 0) return null;

  // Frontera: territorios propios con al menos un vecino enemigo. Puntúan por amenaza.
  const scoreBorder = (id: string): number => {
    let enemyPower = 0, enemyCount = 0;
    for (const nb of TERR_BY_ID[id].adj) {
      const nt = state.territories[nb];
      if (nt.owner !== p.id) {
        enemyCount++;
        enemyPower += nt.infantry + nt.tanks * 2 + nt.planes;
      }
    }
    return enemyCount > 0 ? enemyPower + enemyCount : -1;
  };
  const borders = owned.filter((t) => scoreBorder(t.id) >= 0)
    .sort((a, b) => scoreBorder(b.id) - scoreBorder(a.id));
  const anyOwned = owned;

  switch (state.setupItem) {
    case "AIRPORT": {
      // Prefiere borde con más enemigos, sin aeropuerto ya.
      const candidate = borders.find((t) => !state.territories[t.id].airport)
        ?? anyOwned.find((t) => !state.territories[t.id].airport);
      if (!candidate) return null;
      return { type: "SETUP_PLACE", territory: candidate.id };
    }
    case "SILO": {
      // Interior seguro: territorio propio con vecinos también propios.
      const safe = anyOwned
        .filter((t) => !state.territories[t.id].silo)
        .sort((a, b) => scoreBorder(a.id) - scoreBorder(b.id))[0];
      if (!safe) return null;
      return { type: "SETUP_PLACE", territory: safe.id };
    }
    case "TOWER": {
      // Interior seguro, distinto de silos si es posible.
      const safe = [...anyOwned].sort((a, b) => scoreBorder(a.id) - scoreBorder(b.id))[0];
      if (!safe) return null;
      return { type: "SETUP_PLACE", territory: safe.id };
    }
    case "PLANE": {
      const airport = anyOwned.find((t) => state.territories[t.id].airport);
      if (!airport) return { type: "SETUP_SKIP" as never } as Action; // no debería
      return { type: "SETUP_PLACE", territory: airport.id };
    }
    case "TANK": {
      const target = borders[0] ?? anyOwned[0];
      return { type: "SETUP_PLACE", territory: target.id };
    }
    case "ARMY": {
      // Reparte reforzando primero la frontera más débil vs enemigo más fuerte.
      const target = borders[0] ?? anyOwned[0];
      return { type: "SETUP_PLACE", territory: target.id };
    }
  }
}

/* ═════════ REINFORCE ═════════ */

function botReinforce(state: GameState): Action | null {
  const p = state.players[state.current];

  // 1) Canje: si tiene ≥3 cartas y hay combo válido.
  if (p.cards.length >= 3) {
    const combo = findBestTrade(p.cards.map((c) => c.symbol));
    if (combo) {
      const reward: TradeReward | undefined = combo.combo.fixed
        ? undefined
        : pickBestReward(state, combo.combo.rewards);
      return { type: "TRADE_CARDS", indices: combo.indices, reward };
    }
  }
  // Con 5+ cartas debe canjear obligatoriamente: si no hay combo válido no podrá pasar de fase,
  // pero solo puede pasar si baja de 5 — muy improbable. Continúa con lo que pueda.

  // 2) Colocar unidades pendientes. Determina el ítem actual disponible.
  const owned = TERRITORIES.filter((t) => state.territories[t.id].owner === p.id);
  const borders = owned
    .map((t) => ({ t, score: borderThreat(state, t.id) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score);
  const target = borders[0]?.t ?? owned[0];

  const item = state.reinforceItem;
  if (item === "ARMY" && state.reinforcements > 0) {
    return { type: "PLACE_REINFORCEMENT", territory: target.id, count: state.reinforcements };
  }
  if (item === "TANK" && p.stockTanks > 0) {
    return { type: "PLACE_REINFORCEMENT", territory: target.id, count: p.stockTanks };
  }
  if (item === "PLANE" && p.stockPlanes > 0) {
    const airport = owned.find((t) => state.territories[t.id].airport);
    if (airport) return { type: "PLACE_REINFORCEMENT", territory: airport.id, count: p.stockPlanes };
  }
  if (item === "TOWER" && p.stockTowers > 0) {
    const safe = [...owned].sort((a, b) => borderThreat(state, a.id) - borderThreat(state, b.id))[0];
    if (safe) return { type: "PLACE_REINFORCEMENT", territory: safe.id, count: p.stockTowers };
  }

  // Cambiar de ítem si el actual está agotado pero quedan otras cosas.
  if (state.reinforcements > 0) return { type: "SELECT_REINFORCE_ITEM", item: "ARMY" };
  if (p.stockTanks > 0)        return { type: "SELECT_REINFORCE_ITEM", item: "TANK" };
  if (p.stockPlanes > 0 && playerHasAirport(state, p.id))
    return { type: "SELECT_REINFORCE_ITEM", item: "PLANE" };
  if (p.stockTowers > 0)       return { type: "SELECT_REINFORCE_ITEM", item: "TOWER" };

  if (reinforcePending(state)) return null; // aviones sin aeropuerto: pasa a ataque igualmente
  return { type: "END_REINFORCE" };
}

function findBestTrade(symbols: TerrSymbol[]) {
  // Encuentra el primer triple con combo válido; prioriza triples de mismo símbolo (mejor bonus).
  const n = symbols.length;
  let best: { indices: number[]; combo: NonNullable<ReturnType<typeof classifyTrade>> } | null = null;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) {
        const s = [symbols[i], symbols[j], symbols[k]];
        const c = classifyTrade(s);
        if (!c) continue;
        if (!best || c.infantry > best.combo.infantry) {
          best = { indices: [i, j, k], combo: c };
        }
      }
  return best;
}

function pickBestReward(state: GameState, rewards: TradeReward[]): TradeReward {
  const p = state.players[state.current];
  // Prioridad: si no tiene misil, NUKE; si necesita tanques (pocos), TANKS; si tiene aeropuerto, PLANES; si no, TOWERS.
  const has = (kind: TradeReward["kind"]) => rewards.find((r) => r.kind === kind);
  if (p.stockNukes === 0 && has("NUKE")) return has("NUKE")!;
  if (p.stockTanks < 2 && has("TANKS")) return has("TANKS")!;
  if (playerHasAirport(state, p.id) && has("PLANES")) return has("PLANES")!;
  if (has("TOWERS")) return has("TOWERS")!;
  return rewards[0];
}

/* ═════════ ATTACK ═════════ */

function botAttack(state: GameState): Action | null {
  const p = state.players[state.current];

  // Si hay pendingOccupy: mover 0 (dejar automático).
  if (state.pendingOccupy) {
    if (state.pendingOccupy.candidates && !state.pendingOccupy.from) {
      // Elige el candidato con más infantería
      const best = [...state.pendingOccupy.candidates]
        .sort((a, b) => state.territories[b].infantry - state.territories[a].infantry)[0];
      return { type: "OCCUPY_PICK_SOURCE", territory: best };
    }
    // Mueve la mitad de la infantería adicional al territorio recién conquistado.
    const half = Math.floor(state.pendingOccupy.maxInfantry / 2);
    return { type: "OCCUPY", infantry: half };
  }

  // Lanzar misil si tiene silo + misil y hay objetivo con torres enemigas.
  if (p.stockNukes > 0 && playerHasSilo(state, p.id)) {
    let bestTgt: string | null = null; let bestTowers = 0;
    for (const id in state.territories) {
      const t = state.territories[id];
      if (t.owner !== p.id && t.towers > bestTowers) { bestTgt = id; bestTowers = t.towers; }
    }
    if (bestTgt) return { type: "LAUNCH_NUKE", target: bestTgt };
  }

  // Buscar el mejor ataque (par origen→destino con buena ventaja).
  const move = findBestAttack(state);
  if (!move) return { type: "END_ATTACK" };

  // Si aún no hay origen o kind seleccionado, seleccionarlo.
  if (state.attackKind !== move.kind) return { type: "SELECT_ATTACK_KIND", kind: move.kind };
  if (state.attackSource !== move.src) return { type: "SELECT_ATTACK_SOURCE", territory: move.src };
  if (state.attackTarget !== move.tgt) return { type: "SELECT_ATTACK_TARGET", territory: move.tgt };
  return { type: "RESOLVE_ATTACK", dice: move.dice };
}

interface AttackMove { kind: UnitKind; src: string; tgt: string; dice: number }

function findBestAttack(state: GameState): AttackMove | null {
  const p = state.players[state.current];
  const owned = TERRITORIES.filter((t) => state.territories[t.id].owner === p.id);

  // Si hay objetivo bloqueado del turno, seguir atacándolo si aún es rentable.
  // Si hay objetivo bloqueado del turno y sigue siendo enemigo, seguir atacándolo.
  const lockedTgt = state.turnAttackTarget && state.territories[state.turnAttackTarget].owner !== p.id
    ? state.turnAttackTarget
    : null;
  const tgtCandidates: string[] = lockedTgt
    ? [lockedTgt]
    : Array.from(new Set(owned.flatMap((t) => TERR_BY_ID[t.id].adj)))
        .filter((id) => state.territories[id].owner !== p.id);

  let best: (AttackMove & { score: number }) | null = null;

  for (const tgt of tgtCandidates) {
    const tgtSt = state.territories[tgt];
    const defPower = tgtSt.infantry + tgtSt.tanks * 2 + tgtSt.planes;
    // Origen terrestre adyacente propio con más infantería o tanque.
    for (const nb of TERR_BY_ID[tgt].adj) {
      const nSt = state.territories[nb];
      if (nSt.owner !== p.id) continue;
      // Infantería
      if (nSt.infantry >= 3 && nSt.infantry - 1 > defPower + 1) {
        const dice = Math.min(3, nSt.infantry - 1);
        const score = (nSt.infantry - 1) - defPower + (tgtSt.towers * 3) + (tgtSt.silo ? 4 : 0) + (tgtSt.airport ? 2 : 0);
        if (!best || score > best.score) best = { kind: "INFANTRY", src: nb, tgt, dice, score };
      }
      // Tanque: siempre acompañado (otro tanque o ≥2 infantería). Nunca solo con 1 inf.
      const canTank = nSt.tanks >= 2 || (nSt.tanks >= 1 && nSt.infantry >= 3);
      if (canTank && playerOil(state, p.id) >= TANK_ATTACK_OIL) {
        const attackPower = nSt.tanks * 2 + Math.max(0, nSt.infantry - 1);
        if (attackPower > defPower) {
          const dice = Math.min(3, nSt.tanks + Math.max(0, nSt.infantry - 1));
          const score = attackPower - defPower + 3 + tgtSt.towers * 3 + (tgtSt.silo ? 4 : 0);
          if (!best || score > best.score) best = { kind: "TANK", src: nb, tgt, dice, score };
        }
      }
    }
    // Avión: alcance global si tiene aeropuerto y avión + petróleo.
    for (const t of owned) {
      const s = state.territories[t.id];
      if (!s.airport || s.planes < 1) continue;
      const d = bfsDist(t.id, tgt);
      if (d <= 0) continue;
      const cost = d * 2 * PLANE_OIL_PER_STEP;
      if (playerOil(state, p.id) < cost) continue;
      // Debe existir vecino con ≥2 inf para ocupar
      const canOccupy = TERR_BY_ID[tgt].adj.some((id) =>
        state.territories[id].owner === p.id && state.territories[id].infantry >= 2);
      if (!canOccupy) continue;
      // Solo lanzarlo contra objetivos jugosos y sin muchos aviones defensores.
      if (tgtSt.planes >= 1) continue;
      if (tgtSt.silo || tgtSt.airport || tgtSt.towers >= 2) {
        const score = 5 + tgtSt.towers * 2 - d;
        if (!best || score > best.score) best = { kind: "PLANE", src: t.id, tgt, dice: 1, score };
      }
    }
  }

  if (!best) return null;
  return best;
}

/* ═════════ FORTIFY ═════════ */

function botFortify(state: GameState): Action | null {
  if (state.fortifyDone) return { type: "END_TURN" };
  const p = state.players[state.current];
  const owned = TERRITORIES.filter((t) => state.territories[t.id].owner === p.id);

  // Fortalecer: mueve tropas de un territorio interior (sin enemigos adyacentes)
  // al vecino propio con más amenaza.
  let bestFrom: string | null = null;
  let bestTo: string | null = null;
  let bestGain = 0;
  for (const t of owned) {
    const s = state.territories[t.id];
    if (s.infantry < 2) continue;
    const isInterior = TERR_BY_ID[t.id].adj.every((id) => state.territories[id].owner === p.id);
    if (!isInterior) continue;
    // Vecino propio con mayor threat
    for (const nb of TERR_BY_ID[t.id].adj) {
      const nSt = state.territories[nb];
      if (nSt.owner !== p.id) continue;
      const threat = borderThreat(state, nb);
      if (threat > bestGain) { bestGain = threat; bestFrom = t.id; bestTo = nb; }
    }
  }

  if (bestFrom && bestTo) {
    const from = state.territories[bestFrom];
    const inf = Math.max(0, from.infantry - 1);
    if (inf > 0) {
      if (state.fortifySource !== bestFrom) {
        return { type: "SELECT_FORTIFY_SOURCE", territory: bestFrom };
      }
      return { type: "FORTIFY_MOVE", target: bestTo, infantry: inf, tanks: 0, planes: 0 };
    }
  }
  return { type: "END_FORTIFY" };
}

/* ═════════ helpers ═════════ */

function borderThreat(state: GameState, id: string): number {
  const t = state.territories[id];
  const p = state.players[t.owner];
  let enemyPower = 0, enemyCount = 0;
  for (const nb of TERR_BY_ID[id].adj) {
    const nt = state.territories[nb];
    if (nt.owner !== p.id) {
      enemyCount++;
      enemyPower += nt.infantry + nt.tanks * 2 + nt.planes;
    }
  }
  if (enemyCount === 0) return -1;
  // Defensa propia negativa (más defensa = menos amenaza).
  const ownPower = t.infantry + t.tanks * 2 + t.planes;
  return enemyPower - ownPower + enemyCount;
}

