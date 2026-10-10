import type { LocalizedText } from "./domain";
export interface Medal5Entry {
  index: number;
  name: LocalizedText;
  type: LocalizedText;
  state: number;
  unread: boolean;
  canHaveDate: boolean;
  hasDate: boolean;
  validDate: boolean;
  date: string | null;
  rawHex: string;
}
export interface Habitat5Entry {
  index: number;
  grass: number;
  surf: number;
  fish: number;
  complete: boolean;
  raw: number;
}
export interface Medals5Settings {
  pinned: number;
  rank: number;
  calculatedRank: number;
  tutorial: boolean;
  tutorialRaw: number;
  unknown90: number;
  unknown92: number;
  lastEncounter: number;
  viewed: boolean;
  viewedRaw: number;
  capture: boolean;
  captureRaw: number;
}
export interface Medals5Catalog {
  canEdit: boolean;
  sourceHash: string;
  medals: Medal5Entry[];
  habitats: Habitat5Entry[];
  settings: Medals5Settings;
  rawHex: string;
}
export interface Medal5Patch {
  index: number;
  state?: number;
  unread?: boolean;
  date?: string;
}
export interface Habitat5Patch {
  index: number;
  grass?: number;
  surf?: number;
  fish?: number;
  complete?: boolean;
}
export type Medals5SettingsPatch = Partial<
  Pick<
    Medals5Settings,
    | "pinned"
    | "rank"
    | "tutorial"
    | "unknown90"
    | "unknown92"
    | "lastEncounter"
    | "viewed"
    | "capture"
  >
>;
export interface Medals5Edit {
  action:
    "patch" | "giveAll" | "calculateRank" | "import" | "complete" | "clear";
  sourceHash: string;
  targetHash?: string;
  medals?: Medal5Patch[];
  habitats?: Habitat5Patch[];
  settings?: Medals5SettingsPatch;
  indices?: number[];
  dataBase64?: string;
  today?: string;
}
export interface Medals5Preview {
  request: Medals5Edit;
  result: Medals5Catalog;
  changedOffsets: number[];
}
export const supportsMedals5 = (format: string) => format === "SAV5B2W2";
export function medals5Date(text: string) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(text)) throw Error("Invalid Medals5 date.");
  const [y, m, d] = text.split("-").map(Number),
    date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  )
    throw Error("Invalid Medals5 date.");
  return text;
}
function catalog(c: Medals5Catalog) {
  if (!c.canEdit || !/^[A-F0-9]{64}$/.test(c.sourceHash))
    throw Error("Invalid Medals5 catalog.");
}
function integer(value: number, maximum: number) {
  if (!Number.isInteger(value) || value < 0 || value > maximum)
    throw Error("Invalid Medals5 number.");
}
function unique(indices: number[], maximum: number) {
  if (
    !indices.length ||
    indices.length > maximum + 1 ||
    new Set(indices).size !== indices.length
  )
    throw Error("Invalid Medals5 range.");
  indices.forEach((i) => integer(i, maximum));
}
export function medals5Patch(
  c: Medals5Catalog,
  fields: Pick<Medals5Edit, "medals" | "habitats" | "settings">,
): Medals5Edit {
  catalog(c);
  if (
    !fields.medals?.length &&
    !fields.habitats?.length &&
    !Object.keys(fields.settings ?? {}).length
  )
    throw Error("Empty Medals5 patch.");
  if (fields.medals) {
    unique(
      fields.medals.map((m) => m.index),
      254,
    );
    for (const m of fields.medals) {
      if (
        m.state === undefined &&
        m.unread === undefined &&
        m.date === undefined
      )
        throw Error("Empty Medals5 medal.");
      if (m.state !== undefined) integer(m.state, 4);
      if (m.unread !== undefined && typeof m.unread !== "boolean")
        throw Error("Invalid Medals5 unread flag.");
      if (m.date !== undefined) {
        const stored = c.medals.find((v) => v.index === m.index);
        const state = m.state ?? stored?.state;
        if (state !== 2 && state !== 4 && !(state === 3 && stored?.hasDate))
          throw Error("Medals5 date is not editable in this state.");
        medals5Date(m.date);
      }
    }
  }
  if (fields.habitats) {
    unique(
      fields.habitats.map((h) => h.index),
      89,
    );
    for (const h of fields.habitats) {
      if (
        h.grass === undefined &&
        h.surf === undefined &&
        h.fish === undefined &&
        h.complete === undefined
      )
        throw Error("Empty Medals5 habitat.");
      for (const value of [h.grass, h.surf, h.fish])
        if (value !== undefined) integer(value, 3);
      if (h.complete !== undefined && typeof h.complete !== "boolean")
        throw Error("Invalid Medals5 completion flag.");
    }
  }
  if (fields.settings) {
    const limits = {
      pinned: 255,
      rank: 4,
      unknown90: 65535,
      unknown92: 255,
      lastEncounter: 2,
    };
    for (const [key, value] of Object.entries(fields.settings)) {
      if (key in limits)
        integer(value as number, limits[key as keyof typeof limits]);
      else if (
        !["tutorial", "viewed", "capture"].includes(key) ||
        typeof value !== "boolean"
      )
        throw Error("Invalid Medals5 settings.");
    }
  }
  return { action: "patch", sourceHash: c.sourceHash, ...fields };
}
export function medals5Action(
  c: Medals5Catalog,
  action: "giveAll" | "calculateRank" | "complete" | "clear",
  indices?: number[],
): Medals5Edit {
  catalog(c);
  if (action === "complete" || action === "clear") {
    if (!indices) throw Error("Missing Medals5 range.");
    unique(indices, 89);
  } else if (indices) throw Error("Unexpected Medals5 range.");
  return {
    action,
    sourceHash: c.sourceHash,
    ...(indices ? { indices: [...indices] } : {}),
  };
}
export function medals5Import(
  c: Medals5Catalog,
  data: Uint8Array,
): Medals5Edit {
  catalog(c);
  if (data.length !== 1020) throw Error("Invalid Medals5 import size.");
  return {
    action: "import",
    sourceHash: c.sourceHash,
    dataBase64: btoa(String.fromCharCode(...data)),
  };
}
export function medals5Frozen(
  c: Medals5Catalog,
  p: Medals5Preview,
): Medals5Edit {
  catalog(c);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[A-F0-9]{64}$/.test(p.request.targetHash ?? "") ||
    p.result.sourceHash !== p.request.targetHash ||
    !p.result.canEdit
  )
    throw Error("Medals5 preview is stale.");
  if (
    p.request.action === "giveAll" ||
    p.request.medals?.some((m) => m.state !== undefined)
  )
    medals5Date(p.request.today ?? "");
  return p.request;
}
