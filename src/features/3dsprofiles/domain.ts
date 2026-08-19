export const THREE_DS_PROFILE_SCHEMA_VERSION = 1 as const;
export const THREE_DS_PROFILE_BACKUP_FORMAT =
  "pokerngkit.3dsrngtool-profiles" as const;

export type ThreeDsGameVersion =
  | "x"
  | "y"
  | "omega-ruby"
  | "alpha-sapphire"
  | "transporter"
  | "sun"
  | "moon"
  | "ultra-sun"
  | "ultra-moon";

export const THREE_DS_GAME_VERSIONS: readonly ThreeDsGameVersion[] = [
  "x",
  "y",
  "omega-ruby",
  "alpha-sapphire",
  "transporter",
  "sun",
  "moon",
  "ultra-sun",
  "ultra-moon",
];

export type ThreeDsProfileSeeds = [number, number, number, number];

export interface ThreeDsProfile {
  id: string;
  name: string;
  version: ThreeDsGameVersion;
  tsv: number;
  trv: number;
  shinyCharm: boolean;
  /** Gen VI Profile6 values used by the 3DSTimeFinder initial-seed formula. */
  saveVariable: number;
  timeVariable: number;
  seeds: ThreeDsProfileSeeds;
  createdAt: number;
  updatedAt: number;
}

export type ThreeDsGen7Profile = ThreeDsProfile & {
  version: "sun" | "moon" | "ultra-sun" | "ultra-moon";
};

export type ThreeDsProfileDraft = Omit<
  ThreeDsProfile,
  "id" | "createdAt" | "updatedAt"
>;

export interface ThreeDsProfileState {
  schemaVersion: typeof THREE_DS_PROFILE_SCHEMA_VERSION;
  profiles: ThreeDsProfile[];
  selectedProfileId: string | null;
}

export interface ThreeDsProfileBackup extends ThreeDsProfileState {
  format: typeof THREE_DS_PROFILE_BACKUP_FORMAT;
  exportedAt: string;
}

export interface ThreeDsProfileImport {
  state: ThreeDsProfileState;
  source: "json" | "legacy-xml";
}

export const EMPTY_THREE_DS_PROFILE_STATE: ThreeDsProfileState = {
  schemaVersion: THREE_DS_PROFILE_SCHEMA_VERSION,
  profiles: [],
  selectedProfileId: null,
};

export const DEFAULT_THREE_DS_PROFILE_DRAFT: ThreeDsProfileDraft = {
  name: "",
  version: "x",
  tsv: 0,
  trv: 0,
  shinyCharm: false,
  saveVariable: 0,
  timeVariable: 0,
  seeds: [0, 0, 0, 0],
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `3dsrngtool-profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIntegerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

function directChild(element: Element, name: string) {
  return Array.from(element.children).find(
    (child) => child.localName === name || child.tagName === name,
  );
}

function childText(element: Element, name: string) {
  return directChild(element, name)?.textContent ?? "";
}

export function threeDsProfileUsesFourSeeds(version: ThreeDsGameVersion) {
  return THREE_DS_GAME_VERSIONS.indexOf(version) > 4;
}

export function isThreeDsGen7Profile(
  profile: ThreeDsProfile | undefined,
): profile is ThreeDsGen7Profile {
  return (
    profile?.version === "sun" ||
    profile?.version === "moon" ||
    profile?.version === "ultra-sun" ||
    profile?.version === "ultra-moon"
  );
}

export function formatThreeDsProfileSeed(seed: number) {
  return seed.toString(16).toUpperCase().padStart(8, "0");
}

export function formatThreeDsProfileSeeds(profile: ThreeDsProfileDraft) {
  const indexes = threeDsProfileUsesFourSeeds(profile.version)
    ? [3, 2, 1, 0]
    : [1, 0];
  return indexes
    .map((index) => formatThreeDsProfileSeed(profile.seeds[index]))
    .join(",");
}

export function validateThreeDsProfileDraft(draft: ThreeDsProfileDraft) {
  if (
    typeof draft.name !== "string" ||
    !draft.name.trim() ||
    draft.name.length > 32767
  ) {
    throw new TypeError("Description must contain 1 to 32767 characters.");
  }
  if (!THREE_DS_GAME_VERSIONS.includes(draft.version)) {
    throw new TypeError("Invalid 3DSRNGTool game version.");
  }
  if (!isIntegerIn(draft.tsv, 0, 4095)) {
    throw new TypeError("TSV must be between 0 and 4095.");
  }
  if (!isIntegerIn(draft.trv, 0, 15)) {
    throw new TypeError("TRV must be between 0 and F.");
  }
  if (typeof draft.shinyCharm !== "boolean") {
    throw new TypeError("Invalid Shiny Charm value.");
  }
  if (!isIntegerIn(draft.saveVariable, 0, 0xffff_ffff)) {
    throw new TypeError("Save Variable must be a 32-bit unsigned integer.");
  }
  if (!isIntegerIn(draft.timeVariable, 0, 0xffff_ffff)) {
    throw new TypeError("Time Variable must be a 32-bit unsigned integer.");
  }
  if (
    !Array.isArray(draft.seeds) ||
    draft.seeds.length !== 4 ||
    !draft.seeds.every((seed) => isIntegerIn(seed, 0, 0xffff_ffff))
  ) {
    throw new TypeError("Each Egg Seed word must be between 0 and FFFFFFFF.");
  }
}

export function createThreeDsProfile(
  draft: ThreeDsProfileDraft,
  original?: ThreeDsProfile,
): ThreeDsProfile {
  validateThreeDsProfileDraft(draft);
  const now = Date.now();
  return {
    ...draft,
    seeds: [...draft.seeds] as ThreeDsProfileSeeds,
    id: original?.id ?? createId(),
    createdAt: original?.createdAt ?? now,
    updatedAt: now,
  };
}

export function isThreeDsProfile(value: unknown): value is ThreeDsProfile {
  if (!isRecord(value)) return false;
  try {
    validateThreeDsProfileDraft({
      ...(value as unknown as ThreeDsProfileDraft),
      saveVariable: Number(
        (value as Record<string, unknown>).saveVariable ?? 0,
      ),
      timeVariable: Number(
        (value as Record<string, unknown>).timeVariable ?? 0,
      ),
    });
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

function normalizeProfile(value: ThreeDsProfile): ThreeDsProfile {
  return {
    ...value,
    saveVariable: value.saveVariable ?? 0,
    timeVariable: value.timeVariable ?? 0,
    seeds: [...value.seeds] as ThreeDsProfileSeeds,
  };
}

export function parseThreeDsProfileState(value: unknown): ThreeDsProfileState {
  if (
    !isRecord(value) ||
    value.schemaVersion !== THREE_DS_PROFILE_SCHEMA_VERSION
  ) {
    throw new TypeError("Unsupported 3DSRNGTool profile schema.");
  }
  if (
    !Array.isArray(value.profiles) ||
    !value.profiles.every(isThreeDsProfile)
  ) {
    throw new TypeError("Invalid 3DSRNGTool profile list.");
  }
  const ids = new Set<string>();
  for (const profile of value.profiles) {
    if (ids.has(profile.id)) {
      throw new TypeError("Duplicate 3DSRNGTool profile id.");
    }
    ids.add(profile.id);
  }
  const selectedProfileId = value.selectedProfileId;
  if (
    selectedProfileId !== null &&
    (typeof selectedProfileId !== "string" || !ids.has(selectedProfileId))
  ) {
    throw new TypeError("Invalid selected 3DSRNGTool profile id.");
  }
  return {
    schemaVersion: THREE_DS_PROFILE_SCHEMA_VERSION,
    profiles: value.profiles.map((profile) => normalizeProfile(profile)),
    selectedProfileId,
  };
}

export function parseThreeDsProfileBackup(json: string): ThreeDsProfileState {
  const value: unknown = JSON.parse(json);
  if (
    !isRecord(value) ||
    value.format !== THREE_DS_PROFILE_BACKUP_FORMAT ||
    typeof value.exportedAt !== "string"
  ) {
    throw new TypeError("Invalid PokeRNGKit 3DSRNGTool profile backup.");
  }
  return parseThreeDsProfileState(value);
}

export function serializeThreeDsProfileBackup(state: ThreeDsProfileState) {
  const validated = parseThreeDsProfileState(state);
  const backup: ThreeDsProfileBackup = {
    format: THREE_DS_PROFILE_BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    ...validated,
  };
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function parseLegacyThreeDsProfiles(xml: string): ThreeDsProfileState {
  if (typeof DOMParser === "undefined") {
    throw new TypeError(
      "Legacy XML import is unavailable in this environment.",
    );
  }
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new TypeError("Invalid 3DSRNGTool profile XML.");
  }
  const profileElements = Array.from(document.getElementsByTagName("*")).filter(
    (element) =>
      element.localName === "Profile" || element.tagName === "Profile",
  );
  const profiles = profileElements.map((element) => {
    const versionIndex = Number(childText(element, "GameVersion"));
    const seedsElement = directChild(element, "Seeds");
    const importedSeeds = seedsElement
      ? Array.from(seedsElement.children).map((seed) =>
          Number(seed.textContent),
        )
      : [];
    const seeds: ThreeDsProfileSeeds = [0, 0, 0, 0];
    importedSeeds.slice(0, 4).forEach((seed, index) => {
      seeds[index] = seed;
    });
    const draft: ThreeDsProfileDraft = {
      name: childText(element, "Description"),
      version: THREE_DS_GAME_VERSIONS[versionIndex] as ThreeDsGameVersion,
      tsv: Number(childText(element, "TSV")),
      trv: Number(childText(element, "TRV")),
      shinyCharm:
        childText(element, "ShinyCharm").trim().toLowerCase() === "true",
      saveVariable: Number.parseInt(
        childText(element, "SaveVariable") || "0",
        16,
      ),
      timeVariable: Number.parseInt(
        childText(element, "TimeVariable") || "0",
        16,
      ),
      seeds,
    };
    return createThreeDsProfile(draft);
  });
  return {
    schemaVersion: THREE_DS_PROFILE_SCHEMA_VERSION,
    profiles,
    selectedProfileId: profiles[0]?.id ?? null,
  };
}

export function parseThreeDsProfileImport(text: string): ThreeDsProfileImport {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<")) {
    return { state: parseLegacyThreeDsProfiles(text), source: "legacy-xml" };
  }
  return { state: parseThreeDsProfileBackup(text), source: "json" };
}
