// Territorios del mapa. Posiciones en % del contenedor.
// Cada territorio tiene además un símbolo de carta: S (Soldado), P (Avión), T (Tanque). "W" es comodín.
export type ContinentId = "na" | "sa" | "eu" | "af" | "as" | "oc";
export type TerrSymbol = "S" | "P" | "T" | "W";

export interface Continent {
  id: ContinentId;
  name: string;
  bonus: number;
  color: string;
}

export const CONTINENTS: Record<ContinentId, Continent> = {
  na: { id: "na", name: "América del Norte", bonus: 5, color: "#c97a33" },
  sa: { id: "sa", name: "América del Sur", bonus: 2, color: "#5f8a4f" },
  eu: { id: "eu", name: "Europa", bonus: 5, color: "#3d6fa5" },
  af: { id: "af", name: "África", bonus: 3, color: "#d4b03a" },
  as: { id: "as", name: "Asia", bonus: 7, color: "#b5453a" },
  oc: { id: "oc", name: "Oceanía", bonus: 2, color: "#a64a85" },
};

export interface Territory {
  id: string;
  name: string;
  continent: ContinentId;
  x: number;
  y: number;
  adj: string[];
  symbol: TerrSymbol;
}

// Posiciones ajustadas para que los círculos caigan sobre tierra firme del mapa.
export const TERRITORIES: Territory[] = [
  // North America
  { id: "alaska", name: "Alaska", continent: "na", x: 6.1, y: 23.6, adj: ["canada", "columbia_na", "kamchatka"], symbol: "S" },
  { id: "canada", name: "Canadá", continent: "na", x: 15.6, y: 25.2, adj: ["alaska", "columbia_na", "ontario", "isla_baffin"], symbol: "P" },
  { id: "isla_baffin", name: "Isla Baffin", continent: "na", x: 29.0, y: 18.2, adj: ["canada", "groenlandia", "quebec", "ontario"], symbol: "T" },
  { id: "groenlandia", name: "Groenlandia", continent: "na", x: 39.0, y: 15.7, adj: ["isla_baffin", "quebec", "islandia"], symbol: "S" },
  { id: "columbia_na", name: "Columbia", continent: "na", x: 15.8, y: 34.7, adj: ["alaska", "canada", "ontario", "usa_oeste"], symbol: "P" },
  { id: "ontario", name: "Ontario", continent: "na", x: 23.1, y: 35.1, adj: ["canada", "columbia_na", "quebec", "usa_oeste", "usa_este", "isla_baffin"], symbol: "T" },
  { id: "quebec", name: "Quebec", continent: "na", x: 31.5, y: 34.8, adj: ["isla_baffin", "groenlandia", "ontario", "usa_este"], symbol: "S" },
  { id: "usa_oeste", name: "EEUU Oeste", continent: "na", x: 18.0, y: 42.6, adj: ["columbia_na", "ontario", "usa_este", "america_central"], symbol: "P" },
  { id: "usa_este", name: "EEUU Este", continent: "na", x: 25.5, y: 46.0, adj: ["ontario", "quebec", "usa_oeste", "america_central"], symbol: "T" },
  { id: "america_central", name: "América Central", continent: "na", x: 23.0, y: 55.5, adj: ["usa_oeste", "usa_este", "venezuela"], symbol: "S" },

  // South America
  { id: "venezuela", name: "Venezuela", continent: "sa", x: 30.9, y: 61.9, adj: ["america_central", "brasil", "peru"], symbol: "P" },
  { id: "brasil", name: "Brasil", continent: "sa", x: 37.5, y: 72.7, adj: ["venezuela", "peru", "argentina", "africa_occidental"], symbol: "T" },
  { id: "peru", name: "Perú", continent: "sa", x: 29.6, y: 70.5, adj: ["venezuela", "brasil", "argentina"], symbol: "S" },
  { id: "argentina", name: "Argentina", continent: "sa", x: 32.9, y: 85.2, adj: ["peru", "brasil"], symbol: "P" },

  // Europe
  { id: "islandia", name: "Islandia", continent: "eu", x: 45.0, y: 24.4, adj: ["groenlandia", "gran_bretana", "escandinavia"], symbol: "T" },
  { id: "escandinavia", name: "Escandinavia", continent: "eu", x: 54.6, y: 22.7, adj: ["islandia", "gran_bretana", "alemania", "ucrania"], symbol: "S" },
  { id: "gran_bretana", name: "Gran Bretaña", continent: "eu", x: 48.0, y: 31.8, adj: ["islandia", "escandinavia", "alemania", "espana"], symbol: "P" },
  { id: "alemania", name: "Alemania", continent: "eu", x: 53.0, y: 34.1, adj: ["gran_bretana", "escandinavia", "espana", "balcanes", "ucrania"], symbol: "T" },
  { id: "espana", name: "España", continent: "eu", x: 48.5, y: 40.0, adj: ["gran_bretana", "alemania", "balcanes", "africa_occidental", "canarias"], symbol: "S" },
  { id: "canarias", name: "Canarias", continent: "eu", x: 41.5, y: 50.0, adj: ["espana", "africa_occidental"], symbol: "T" },
  { id: "balcanes", name: "Los Balcanes", continent: "eu", x: 55.5, y: 41.5, adj: ["alemania", "espana", "ucrania", "egipto", "africa_occidental"], symbol: "P" },
  { id: "ucrania", name: "Ucrania", continent: "eu", x: 60.0, y: 29.5, adj: ["escandinavia", "alemania", "balcanes", "oriente_medio", "asia_central", "omsk"], symbol: "T" },

  // Africa
  { id: "africa_occidental", name: "África Occidental", continent: "af", x: 48.8, y: 56.8, adj: ["espana", "brasil", "egipto", "africa_oriental", "congo", "canarias", "balcanes"], symbol: "S" },
  { id: "egipto", name: "Egipto", continent: "af", x: 55.2, y: 50.9, adj: ["balcanes", "africa_occidental", "africa_oriental", "oriente_medio"], symbol: "P" },
  { id: "africa_oriental", name: "África Oriental", continent: "af", x: 59.5, y: 59.1, adj: ["egipto", "africa_occidental", "congo", "africa_sur", "madagascar", "oriente_medio"], symbol: "T" },
  { id: "congo", name: "Congo", continent: "af", x: 54.7, y: 66.7, adj: ["africa_occidental", "africa_oriental", "africa_sur"], symbol: "S" },
  { id: "africa_sur", name: "África Sur", continent: "af", x: 56.0, y: 75.0, adj: ["congo", "africa_oriental", "madagascar"], symbol: "P" },
  { id: "madagascar", name: "Madagascar", continent: "af", x: 65.1, y: 73.6, adj: ["africa_oriental", "africa_sur"], symbol: "T" },

  // Asia
  { id: "oriente_medio", name: "Oriente Medio", continent: "as", x: 63.1, y: 46.9, adj: ["ucrania", "egipto", "africa_oriental", "asia_central", "india"], symbol: "S" },
  { id: "asia_central", name: "Asia Central", continent: "as", x: 69.1, y: 39.0, adj: ["ucrania", "oriente_medio", "omsk", "india", "china"], symbol: "P" },
  { id: "omsk", name: "Omsk", continent: "as", x: 71.3, y: 28.4, adj: ["ucrania", "asia_central", "siberia_central", "china"], symbol: "T" },
  { id: "siberia_central", name: "Siberia Central", continent: "as", x: 77.3, y: 25.0, adj: ["omsk", "yakutia", "irkutsk", "mongolia", "china"], symbol: "S" },
  { id: "yakutia", name: "Yakutia", continent: "as", x: 87.4, y: 18.6, adj: ["siberia_central", "irkutsk", "kamchatka"], symbol: "P" },
  { id: "kamchatka", name: "Vladivostok", continent: "as", x: 94.7, y: 27.8, adj: ["yakutia", "irkutsk", "mongolia", "japon", "alaska"], symbol: "T" },
  { id: "irkutsk", name: "Irkutsk", continent: "as", x: 83.7, y: 30.2, adj: ["siberia_central", "yakutia", "mongolia", "kamchatka"], symbol: "S" },
  { id: "mongolia", name: "Mongolia", continent: "as", x: 84.4, y: 38.8, adj: ["irkutsk", "kamchatka", "china", "japon", "siberia_central"], symbol: "P" },
  { id: "china", name: "China", continent: "as", x: 80.5, y: 45.5, adj: ["asia_central", "omsk", "mongolia", "india", "sudeste_asiatico", "siberia_central"], symbol: "T" },
  { id: "japon", name: "Japón", continent: "as", x: 92.1, y: 47.0, adj: ["kamchatka", "mongolia"], symbol: "S" },
  { id: "india", name: "India", continent: "as", x: 72.2, y: 51.0, adj: ["oriente_medio", "asia_central", "china", "sudeste_asiatico"], symbol: "P" },
  { id: "sudeste_asiatico", name: "Sudeste Asiático", continent: "as", x: 80.1, y: 55.0, adj: ["china", "india", "indonesia"], symbol: "T" },

  // Oceania
  { id: "indonesia", name: "Indonesia", continent: "oc", x: 84.0, y: 66.5, adj: ["sudeste_asiatico", "nueva_guinea", "australia_oeste"], symbol: "S" },
  { id: "nueva_guinea", name: "Nueva Guinea", continent: "oc", x: 91.0, y: 71.0, adj: ["indonesia", "australia_este", "australia_oeste"], symbol: "P" },
  { id: "australia_oeste", name: "Australia Occ.", continent: "oc", x: 85.3, y: 77.8, adj: ["indonesia", "australia_este", "nueva_guinea"], symbol: "T" },
  { id: "australia_este", name: "Queensland", continent: "oc", x: 91.2, y: 83.3, adj: ["australia_oeste", "nueva_guinea"], symbol: "S" },
];

export const TERR_BY_ID: Record<string, Territory> = Object.fromEntries(
  TERRITORIES.map((t) => [t.id, t]),
);
