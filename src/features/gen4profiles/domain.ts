import type { Gen4GameVersion } from "../gen4static/domain";

export const GEN4_GAME_VERSIONS: Gen4GameVersion[] = [
  "diamond",
  "pearl",
  "platinum",
  "heartgold",
  "soulsilver",
];

export type Gen4UnownDiscovered = [
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
];

export type Gen4UnownPuzzles = [boolean, boolean, boolean, boolean];

export interface Gen4Profile {
  id: string;
  name: string;
  version: Gen4GameVersion;
  tid: number;
  sid: number;
  nationalDex: boolean;
  unownDiscovered: Gen4UnownDiscovered;
  unownPuzzles: Gen4UnownPuzzles;
  createdAt: number;
  updatedAt: number;
}

export type Gen4ProfileDraft = Pick<
  Gen4Profile,
  | "name"
  | "version"
  | "tid"
  | "sid"
  | "nationalDex"
  | "unownDiscovered"
  | "unownPuzzles"
>;

export interface Gen4ProfileState {
  schemaVersion: 1;
  profiles: Gen4Profile[];
  selectedProfileId: string | null;
}

export interface Gen4ProfileBackup extends Gen4ProfileState {
  format: "pokerngkit.gen4-profiles";
  exportedAt: string;
}

export const EMPTY_GEN4_UNOWN_DISCOVERED: Gen4UnownDiscovered = [
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
];

export const EMPTY_GEN4_UNOWN_PUZZLES: Gen4UnownPuzzles = [
  false,
  false,
  false,
  false,
];

export const DEFAULT_GEN4_PROFILE: Gen4Profile = {
  id: "gen4-default",
  name: "-",
  version: "diamond",
  tid: 12345,
  sid: 54321,
  nationalDex: false,
  unownDiscovered: [...EMPTY_GEN4_UNOWN_DISCOVERED],
  unownPuzzles: [...EMPTY_GEN4_UNOWN_PUZZLES],
  createdAt: 0,
  updatedAt: 0,
};

export const EMPTY_GEN4_PROFILE_STATE: Gen4ProfileState = {
  schemaVersion: 1,
  profiles: [],
  selectedProfileId: null,
};

export function isHgssVersion(version: Gen4GameVersion) {
  return version === "heartgold" || version === "soulsilver";
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `gen4-profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createGen4Profile(
  draft: Gen4ProfileDraft,
  original?: Gen4Profile,
): Gen4Profile {
  const now = Date.now();
  const includeUnown = isHgssVersion(draft.version);
  return {
    ...draft,
    id: original?.id ?? createId(),
    name: draft.name.trim(),
    unownDiscovered: includeUnown
      ? [...draft.unownDiscovered]
      : [...EMPTY_GEN4_UNOWN_DISCOVERED],
    unownPuzzles: includeUnown
      ? [...draft.unownPuzzles]
      : [...EMPTY_GEN4_UNOWN_PUZZLES],
    createdAt: original?.createdAt ?? now,
    updatedAt: now,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBooleanArray(value: unknown, length: number): value is boolean[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((entry) => typeof entry === "boolean")
  );
}

export function isGen4Profile(value: unknown): value is Gen4Profile {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 128 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    GEN4_GAME_VERSIONS.includes(value.version as Gen4GameVersion) &&
    Number.isInteger(value.tid) &&
    Number(value.tid) >= 0 &&
    Number(value.tid) <= 0xffff &&
    Number.isInteger(value.sid) &&
    Number(value.sid) >= 0 &&
    Number(value.sid) <= 0xffff &&
    typeof value.nationalDex === "boolean" &&
    isBooleanArray(value.unownDiscovered, 26) &&
    isBooleanArray(value.unownPuzzles, 4) &&
    typeof value.createdAt === "number" &&
    Number.isFinite(value.createdAt) &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt)
  );
}

export function parseGen4ProfileState(value: unknown): Gen4ProfileState {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new TypeError("Unsupported Gen IV profile schema.");
  }
  if (!Array.isArray(value.profiles) || !value.profiles.every(isGen4Profile)) {
    throw new TypeError("Invalid Gen IV profile list.");
  }
  const ids = new Set<string>();
  for (const profile of value.profiles) {
    if (ids.has(profile.id)) throw new TypeError("Duplicate profile id.");
    ids.add(profile.id);
  }
  if (
    value.selectedProfileId !== null &&
    (typeof value.selectedProfileId !== "string" ||
      !ids.has(value.selectedProfileId))
  ) {
    throw new TypeError("Invalid selected profile id.");
  }
  return {
    schemaVersion: 1,
    profiles: value.profiles.map((profile) => ({
      ...profile,
      unownDiscovered: [...profile.unownDiscovered],
      unownPuzzles: [...profile.unownPuzzles],
    })),
    selectedProfileId: value.selectedProfileId,
  };
}

export function parseGen4ProfileBackup(json: string): Gen4ProfileState {
  const value: unknown = JSON.parse(json);
  if (
    !isRecord(value) ||
    value.format !== "pokerngkit.gen4-profiles" ||
    typeof value.exportedAt !== "string"
  ) {
    throw new TypeError("Invalid PokeRNGKit Gen IV profile backup.");
  }
  return parseGen4ProfileState(value);
}

export function serializeGen4ProfileBackup(state: Gen4ProfileState) {
  const validated = parseGen4ProfileState(state);
  const backup: Gen4ProfileBackup = {
    format: "pokerngkit.gen4-profiles",
    exportedAt: new Date().toISOString(),
    ...validated,
  };
  return `${JSON.stringify(backup, null, 2)}\n`;
}
