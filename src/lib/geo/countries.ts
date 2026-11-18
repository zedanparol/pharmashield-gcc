/**
 * Approximate map anchors (longitude, latitude) for manufacturing countries.
 * Geographic reference data only — used to place a manufacturer on the
 * supply-network map from the `manufacturing_country` field. A country that
 * is not listed is simply left off the map and reported beneath it.
 */
const ANCHORS: Record<string, [number, number]> = {
  argentina: [-64, -34],
  australia: [134, -25],
  austria: [14.3, 47.6],
  bahrain: [50.6, 26.1],
  bangladesh: [90.3, 23.7],
  belgium: [4.5, 50.6],
  brazil: [-51, -10],
  canada: [-79, 45],
  china: [112, 33],
  "czech republic": [15.5, 49.8],
  denmark: [10, 56],
  egypt: [30.8, 27],
  finland: [26, 62],
  france: [2.5, 46.6],
  germany: [10.4, 51.2],
  greece: [22, 39],
  hungary: [19.4, 47.2],
  india: [78.9, 21.5],
  indonesia: [113, -1],
  iran: [53.7, 32.4],
  ireland: [-8, 53.2],
  israel: [35, 31.4],
  italy: [12.5, 42.8],
  japan: [138, 36.5],
  jordan: [36.3, 31.2],
  kuwait: [47.6, 29.3],
  malaysia: [102, 4],
  mexico: [-102, 23.6],
  netherlands: [5.3, 52.2],
  norway: [9, 61],
  oman: [56, 21],
  pakistan: [69.3, 30.4],
  poland: [19.4, 52],
  portugal: [-8, 39.6],
  qatar: [51.2, 25.3],
  russia: [40, 56],
  "saudi arabia": [45, 24],
  singapore: [103.8, 1.35],
  slovenia: [14.8, 46.1],
  "south africa": [24, -29],
  "south korea": [127.8, 36.5],
  spain: [-3.7, 40.2],
  sweden: [15, 60],
  switzerland: [8.2, 46.8],
  taiwan: [121, 23.7],
  thailand: [101, 15],
  turkey: [35, 39],
  "united arab emirates": [54.4, 24.3],
  "united kingdom": [-2, 54],
  "united states": [-96, 38.5],
  vietnam: [106, 16],
};

const ALIASES: Record<string, string> = {
  ae: "united arab emirates",
  uae: "united arab emirates",
  us: "united states",
  usa: "united states",
  "united states of america": "united states",
  uk: "united kingdom",
  gb: "united kingdom",
  "great britain": "united kingdom",
  "korea, republic of": "south korea",
  "republic of korea": "south korea",
  kr: "south korea",
  de: "germany",
  in: "india",
  cn: "china",
  it: "italy",
  jo: "jordan",
  czechia: "czech republic",
  "türkiye": "turkey",
};

/** Map anchor for a country name or common code, or `null` when it is unknown. */
export function countryAnchor(country: string): { lon: number; lat: number } | null {
  const key = country.trim().toLowerCase();
  const anchor = ANCHORS[ALIASES[key] ?? key];
  return anchor ? { lon: anchor[0], lat: anchor[1] } : null;
}

/** Strait of Hormuz — the corridor stressed in Hormuz Crisis Mode. */
export const HORMUZ = { lon: 56.4, lat: 26.6 } as const;
