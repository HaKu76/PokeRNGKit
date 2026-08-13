export type Gen3GameVersion =
  | "ruby"
  | "sapphire"
  | "firered"
  | "leafgreen"
  | "emerald"
  | "xd"
  | "colosseum";

export interface Gen3Profile {
  id: string;
  name: string;
  version: Gen3GameVersion;
  tid: number;
  sid: number;
  deadBattery: boolean;
  createdAt: number;
  updatedAt: number;
}

export type Gen3ProfileDraft = Pick<
  Gen3Profile,
  "name" | "version" | "tid" | "sid" | "deadBattery"
>;

export interface Gen3ProfileState {
  schemaVersion: 1;
  profiles: Gen3Profile[];
  selectedProfileId: string | null;
}

export interface Gen3ProfileBackup extends Gen3ProfileState {
  format: "pokerngkit.gen3-profiles";
  exportedAt: string;
}

export const GEN3_GAME_VERSIONS: Gen3GameVersion[] = [
  "ruby",
  "sapphire",
  "firered",
  "leafgreen",
  "emerald",
  "xd",
  "colosseum",
];

export const DEFAULT_GEN3_PROFILE: Gen3Profile = {
  id: "default",
  name: "-",
  version: "emerald",
  tid: 12345,
  sid: 54321,
  deadBattery: false,
  createdAt: 0,
  updatedAt: 0,
};

export const DEFAULT_GEN3_GAMECUBE_PROFILE: Gen3Profile = {
  ...DEFAULT_GEN3_PROFILE,
  version: "xd",
};

export const EMPTY_GEN3_PROFILE_STATE: Gen3ProfileState = {
  schemaVersion: 1,
  profiles: [],
  selectedProfileId: null,
};

export function isRsVersion(version: Gen3GameVersion) {
  return version === "ruby" || version === "sapphire";
}

export function isGen3StaticVersion(version: Gen3GameVersion) {
  return version !== "xd" && version !== "colosseum";
}

export function gen3StaticProfileOrDefault(profile?: Gen3Profile) {
  return profile && isGen3StaticVersion(profile.version)
    ? profile
    : DEFAULT_GEN3_PROFILE;
}

export function isGen3EggVersion(version: Gen3GameVersion) {
  return (
    version === "ruby" ||
    version === "sapphire" ||
    version === "firered" ||
    version === "leafgreen" ||
    version === "emerald"
  );
}

export function gen3EggProfileOrDefault(profile?: Gen3Profile) {
  return profile && isGen3EggVersion(profile.version)
    ? profile
    : DEFAULT_GEN3_PROFILE;
}

export function isGen3GameCubeVersion(version: Gen3GameVersion) {
  return version === "xd" || version === "colosseum";
}

export function gen3GameCubeProfileOrDefault(profile?: Gen3Profile) {
  return profile && isGen3GameCubeVersion(profile.version)
    ? profile
    : DEFAULT_GEN3_GAMECUBE_PROFILE;
}

export function gen3PokeSpotProfileOrDefault(profile?: Gen3Profile) {
  return profile?.version === "xd" ? profile : DEFAULT_GEN3_GAMECUBE_PROFILE;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createGen3Profile(
  draft: Gen3ProfileDraft,
  original?: Gen3Profile,
): Gen3Profile {
  const now = Date.now();
  return {
    ...draft,
    id: original?.id ?? createId(),
    name: draft.name.trim(),
    deadBattery: isRsVersion(draft.version) && draft.deadBattery,
    createdAt: original?.createdAt ?? now,
    updatedAt: now,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isGen3Profile(value: unknown): value is Gen3Profile {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 128 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    GEN3_GAME_VERSIONS.includes(value.version as Gen3GameVersion) &&
    Number.isInteger(value.tid) &&
    Number(value.tid) >= 0 &&
    Number(value.tid) <= 0xffff &&
    Number.isInteger(value.sid) &&
    Number(value.sid) >= 0 &&
    Number(value.sid) <= 0xffff &&
    typeof value.deadBattery === "boolean" &&
    typeof value.createdAt === "number" &&
    Number.isFinite(value.createdAt) &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt)
  );
}

export function parseGen3ProfileState(value: unknown): Gen3ProfileState {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new TypeError("Unsupported Gen III profile schema.");
  }
  if (!Array.isArray(value.profiles) || !value.profiles.every(isGen3Profile)) {
    throw new TypeError("Invalid Gen III profile list.");
  }
  const ids = new Set<string>();
  for (const profile of value.profiles) {
    if (ids.has(profile.id)) throw new TypeError("Duplicate profile id.");
    ids.add(profile.id);
  }
  const selectedProfileId = value.selectedProfileId;
  if (
    selectedProfileId !== null &&
    (typeof selectedProfileId !== "string" || !ids.has(selectedProfileId))
  ) {
    throw new TypeError("Invalid selected profile id.");
  }
  return {
    schemaVersion: 1,
    profiles: value.profiles.map((profile) => ({ ...profile })),
    selectedProfileId,
  };
}

export function parseGen3ProfileBackup(json: string): Gen3ProfileState {
  const value: unknown = JSON.parse(json);
  if (
    !isRecord(value) ||
    value.format !== "pokerngkit.gen3-profiles" ||
    typeof value.exportedAt !== "string"
  ) {
    throw new TypeError("Invalid PokeRNGKit Gen III profile backup.");
  }
  return parseGen3ProfileState(value);
}

export function serializeGen3ProfileBackup(state: Gen3ProfileState) {
  const validated = parseGen3ProfileState(state);
  const backup: Gen3ProfileBackup = {
    format: "pokerngkit.gen3-profiles",
    exportedAt: new Date().toISOString(),
    ...validated,
  };
  return `${JSON.stringify(backup, null, 2)}\n`;
}
