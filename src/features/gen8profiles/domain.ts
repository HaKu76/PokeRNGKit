export const GEN8_PROFILE_SCHEMA_VERSION = 1 as const;
export const GEN8_PROFILE_BACKUP_FORMAT = "pokerngkit.gen8-profiles" as const;

export type Gen8GameVersion =
  "sword" | "shield" | "brilliantdiamond" | "shiningpearl";

export const GEN8_GAME_VERSIONS: readonly Gen8GameVersion[] = [
  "sword",
  "shield",
  "brilliantdiamond",
  "shiningpearl",
];

export interface Gen8Profile {
  id: string;
  name: string;
  version: Gen8GameVersion;
  tid: number;
  sid: number;
  nationalDex: boolean;
  shinyCharm: boolean;
  ovalCharm: boolean;
  createdAt: number;
  updatedAt: number;
}

export type Gen8ProfileDraft = Omit<
  Gen8Profile,
  "id" | "createdAt" | "updatedAt"
>;

export interface Gen8ProfileState {
  schemaVersion: typeof GEN8_PROFILE_SCHEMA_VERSION;
  profiles: Gen8Profile[];
  selectedProfileId: string | null;
}

export interface Gen8ProfileBackup extends Gen8ProfileState {
  format: typeof GEN8_PROFILE_BACKUP_FORMAT;
  exportedAt: string;
}

export const EMPTY_GEN8_PROFILE_STATE: Gen8ProfileState = {
  schemaVersion: GEN8_PROFILE_SCHEMA_VERSION,
  profiles: [],
  selectedProfileId: null,
};

export const DEFAULT_GEN8_PROFILE_DRAFT: Gen8ProfileDraft = {
  name: "",
  version: "sword",
  tid: 0,
  sid: 0,
  nationalDex: false,
  shinyCharm: false,
  ovalCharm: false,
};

export const DEFAULT_GEN8_SWSH_PROFILE: Gen8Profile = {
  ...DEFAULT_GEN8_PROFILE_DRAFT,
  id: "gen8-default-swsh",
  name: "-",
  version: "sword",
  tid: 12345,
  sid: 54321,
  createdAt: 0,
  updatedAt: 0,
};

export const DEFAULT_GEN8_BDSP_PROFILE: Gen8Profile = {
  ...DEFAULT_GEN8_SWSH_PROFILE,
  id: "gen8-default-bdsp",
  version: "brilliantdiamond",
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `gen8-profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUint16(value: unknown) {
  return (
    Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xffff
  );
}

export function validateGen8ProfileDraft(draft: Gen8ProfileDraft) {
  if (typeof draft.name !== "string" || !draft.name.trim()) {
    throw new TypeError("Enter a profile name");
  }
  if (!GEN8_GAME_VERSIONS.includes(draft.version)) {
    throw new TypeError("Invalid Gen 8 version.");
  }
  if (!isUint16(draft.tid) || !isUint16(draft.sid)) {
    throw new TypeError("TID and SID must be between 0 and 65535.");
  }
  if (
    typeof draft.nationalDex !== "boolean" ||
    typeof draft.shinyCharm !== "boolean" ||
    typeof draft.ovalCharm !== "boolean"
  ) {
    throw new TypeError("Invalid Gen 8 profile option.");
  }
}

export function createGen8Profile(
  draft: Gen8ProfileDraft,
  original?: Gen8Profile,
): Gen8Profile {
  validateGen8ProfileDraft(draft);
  const now = Date.now();
  return {
    ...draft,
    id: original?.id ?? createId(),
    createdAt: original?.createdAt ?? now,
    updatedAt: now,
  };
}

export function isGen8Profile(value: unknown): value is Gen8Profile {
  if (!isRecord(value)) return false;
  try {
    validateGen8ProfileDraft(value as unknown as Gen8ProfileDraft);
  } catch {
    return false;
  }
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 128 &&
    typeof value.createdAt === "number" &&
    Number.isFinite(value.createdAt) &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt)
  );
}

export function parseGen8ProfileState(value: unknown): Gen8ProfileState {
  if (!isRecord(value) || value.schemaVersion !== GEN8_PROFILE_SCHEMA_VERSION) {
    throw new TypeError("Unsupported Gen 8 profile schema.");
  }
  if (!Array.isArray(value.profiles) || !value.profiles.every(isGen8Profile)) {
    throw new TypeError("Invalid Gen 8 profile list.");
  }
  const ids = new Set<string>();
  for (const profile of value.profiles) {
    if (ids.has(profile.id)) {
      throw new TypeError("Duplicate Gen 8 profile id.");
    }
    ids.add(profile.id);
  }
  const selectedProfileId = value.selectedProfileId;
  if (
    selectedProfileId !== null &&
    (typeof selectedProfileId !== "string" || !ids.has(selectedProfileId))
  ) {
    throw new TypeError("Invalid selected Gen 8 profile id.");
  }
  return {
    schemaVersion: GEN8_PROFILE_SCHEMA_VERSION,
    profiles: value.profiles.map((profile) => ({ ...profile })),
    selectedProfileId,
  };
}

export function parseGen8ProfileBackup(json: string): Gen8ProfileState {
  const value: unknown = JSON.parse(json);
  if (
    !isRecord(value) ||
    value.format !== GEN8_PROFILE_BACKUP_FORMAT ||
    typeof value.exportedAt !== "string"
  ) {
    throw new TypeError("Invalid PokeRNGKit Gen 8 profile backup.");
  }
  return parseGen8ProfileState(value);
}

export function serializeGen8ProfileBackup(state: Gen8ProfileState) {
  const validated = parseGen8ProfileState(state);
  const backup: Gen8ProfileBackup = {
    format: GEN8_PROFILE_BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    ...validated,
  };
  return `${JSON.stringify(backup, null, 2)}\n`;
}
