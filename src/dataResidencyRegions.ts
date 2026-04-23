/** Map coordinates use the intrinsic image space (1024×418) for overlay alignment with `preserveAspectRatio="xMidYMin slice"`. */
export const DATA_RESIDENCY_MAP_VIEW_WIDTH = 1024;
export const DATA_RESIDENCY_MAP_VIEW_HEIGHT = 418;

/** Macro geography for map pegs, legend, and region card accents (see design reference). */
export type DataResidencyMacro =
  | "americas"
  /** South America peg (red); legend still groups under Americas. */
  | "americas-south"
  | "europe"
  | "asia-pacific"
  | "mea";

export type DataResidencyRegion = {
  id: string;
  shortTitle: string;
  detail: string;
  macro: DataResidencyMacro;
  /** Center X in map viewBox units */
  mapX: number;
  /** Center Y in map viewBox units */
  mapY: number;
  /** Hit radius for map tap targets */
  mapHitR: number;
};

/** Legend rows (map footer); `americas-south` shares the Americas swatch in the legend. */
export const DATA_RESIDENCY_MACRO_LEGEND: readonly {
  macro: Exclude<DataResidencyMacro, "americas-south">;
  label: string;
}[] = [
  { macro: "americas", label: "Americas" },
  { macro: "europe", label: "Europe" },
  { macro: "asia-pacific", label: "Asia Pacific" },
  { macro: "mea", label: "Middle East & Africa" },
];

export const DATA_RESIDENCY_REGIONS: readonly DataResidencyRegion[] = [
  {
    id: "us-east",
    shortTitle: "US East",
    detail: "United States (East Coast)",
    macro: "americas",
    mapX: 268,
    mapY: 168,
    mapHitR: 42,
  },
  {
    id: "us-west",
    shortTitle: "US West",
    detail: "United States (West Coast)",
    macro: "americas",
    mapX: 148,
    mapY: 162,
    mapHitR: 42,
  },
  {
    id: "canada",
    shortTitle: "Canada",
    detail: "Canada (Toronto, Montreal)",
    macro: "americas",
    mapX: 218,
    mapY: 108,
    mapHitR: 44,
  },
  {
    id: "eu-west",
    shortTitle: "EU West",
    detail: "Western Europe (UK, Ireland, France)",
    macro: "europe",
    mapX: 472,
    mapY: 142,
    mapHitR: 40,
  },
  {
    id: "eu-central",
    shortTitle: "EU Central",
    detail: "Central Europe (Germany, Netherlands)",
    macro: "europe",
    mapX: 502,
    mapY: 128,
    mapHitR: 38,
  },
  {
    id: "eu-north",
    shortTitle: "EU North",
    detail: "Northern Europe (Sweden, Finland)",
    macro: "europe",
    mapX: 528,
    mapY: 88,
    mapHitR: 40,
  },
  {
    id: "middle-east",
    shortTitle: "Middle East",
    detail: "UAE, Bahrain",
    macro: "mea",
    mapX: 602,
    mapY: 178,
    mapHitR: 40,
  },
  {
    id: "asia-pacific",
    shortTitle: "Asia Pacific",
    detail: "Singapore, Hong Kong",
    macro: "asia-pacific",
    mapX: 792,
    mapY: 212,
    mapHitR: 44,
  },
  {
    id: "japan",
    shortTitle: "Japan",
    detail: "Tokyo, Osaka",
    macro: "asia-pacific",
    mapX: 882,
    mapY: 152,
    mapHitR: 36,
  },
  {
    id: "australia",
    shortTitle: "Australia",
    detail: "Sydney, Melbourne",
    macro: "asia-pacific",
    mapX: 888,
    mapY: 288,
    mapHitR: 40,
  },
  {
    id: "south-america",
    shortTitle: "South America",
    detail: "Brazil (São Paulo)",
    macro: "americas-south",
    mapX: 312,
    mapY: 278,
    mapHitR: 44,
  },
  {
    id: "africa",
    shortTitle: "Africa",
    detail: "South Africa (Cape Town)",
    macro: "mea",
    mapX: 538,
    mapY: 318,
    mapHitR: 42,
  },
] as const;
