export const GEN5_PROFILE_SCHEMA_VERSION = 1 as const;
export const GEN5_PROFILE_BACKUP_FORMAT = "pokerngkit.gen5-profiles" as const;

export type Gen5GameVersion = "black" | "white" | "black2" | "white2";
export type Gen5Language =
  | "english"
  | "spanish"
  | "french"
  | "italian"
  | "german"
  | "japanese"
  | "korean";
export type Gen5DsType = "ds" | "dsi" | "3ds";

export const GEN5_GAME_VERSIONS: readonly Gen5GameVersion[] = [
  "black",
  "white",
  "black2",
  "white2",
];
export const GEN5_LANGUAGES: readonly Gen5Language[] = [
  "english",
  "spanish",
  "french",
  "italian",
  "german",
  "japanese",
  "korean",
];
export const GEN5_DS_TYPES: readonly Gen5DsType[] = ["ds", "dsi", "3ds"];
export const GEN5_NEEDLE_DIRECTIONS = [
  ["↑", 0],
  ["↗", 1],
  ["→", 2],
  ["↘", 3],
  ["↓", 4],
  ["↙", 5],
  ["←", 6],
  ["↖", 7],
] as const;

export interface Gen5Profile {
  id: string;
  name: string;
  version: Gen5GameVersion;
  language: Gen5Language;
  dsType: Gen5DsType;
  tid: number;
  sid: number;
  mac: string;
  vcount: number;
  timer0Min: number;
  timer0Max: number;
  gxstat: number;
  vframe: number;
  keypresses: [
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
  skipLR: boolean;
  memoryLink: boolean;
  nsPokemonReleased: boolean;
  shinyCharm: boolean;
  ivCacheName: string;
  shaCacheName: string;
  createdAt: number;
  updatedAt: number;
}

export type Gen5ProfileDraft = Omit<
  Gen5Profile,
  "id" | "createdAt" | "updatedAt"
>;

export interface Gen5ProfileState {
  schemaVersion: typeof GEN5_PROFILE_SCHEMA_VERSION;
  profiles: Gen5Profile[];
  selectedProfileId: string | null;
}

export interface Gen5ProfileBackup extends Gen5ProfileState {
  format: typeof GEN5_PROFILE_BACKUP_FORMAT;
  exportedAt: string;
}

export const EMPTY_GEN5_PROFILE_STATE: Gen5ProfileState = {
  schemaVersion: GEN5_PROFILE_SCHEMA_VERSION,
  profiles: [],
  selectedProfileId: null,
};

export const DEFAULT_GEN5_PROFILE_DRAFT: Gen5ProfileDraft = {
  name: "",
  version: "black",
  language: "english",
  dsType: "ds",
  tid: 0,
  sid: 0,
  mac: "",
  vcount: 0,
  timer0Min: 0,
  timer0Max: 0,
  gxstat: 0,
  vframe: 0,
  keypresses: [true, true, true, true, true, true, true, true, true],
  skipLR: false,
  memoryLink: false,
  nsPokemonReleased: false,
  shinyCharm: false,
  ivCacheName: "",
  shaCacheName: "",
};

export type Gen5CalibrationMode = "ivs" | "needles" | "seed";
export type Gen5NeedleType = "unova-link" | "saving";

export interface Gen5CalibrationRequest {
  mode: Gen5CalibrationMode;
  version: Gen5GameVersion;
  language: Gen5Language;
  dsType: Gen5DsType;
  mac: string;
  buttonMask: number;
  date: string;
  hour: number;
  minute: number;
  minSeconds: number;
  maxSeconds: number;
  minVCount: number;
  maxVCount: number;
  minTimer0: number;
  maxTimer0: number;
  minGxStat: number;
  maxGxStat: number;
  minVFrame: number;
  maxVFrame: number;
  minIVs: [number, number, number, number, number, number];
  maxIVs: [number, number, number, number, number, number];
  needles: number[];
  needleType: Gen5NeedleType;
  memoryLink: boolean;
  seed: string;
  resultLimit: number;
}

export interface Gen5CalibrationChunk {
  index: number;
  minVFrame: number;
  maxVFrame: number;
}

export interface Gen5CalibrationResult {
  seed: string;
  seconds: number;
  vcount: number;
  timer0: number;
  gxstat: number;
  vframe: number;
}

const HEX_12 = /^[0-9a-fA-F]{0,12}$/;
const HEX_16 = /^[0-9a-fA-F]{0,16}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

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

function isBooleanArray9(value: unknown): value is Gen5Profile["keypresses"] {
  return (
    Array.isArray(value) &&
    value.length === 9 &&
    value.every((entry) => typeof entry === "boolean")
  );
}

export function isBw2Version(version: Gen5GameVersion) {
  return version === "black2" || version === "white2";
}

export function createGen5Profile(
  draft: Gen5ProfileDraft,
  original?: Gen5Profile,
): Gen5Profile {
  validateGen5ProfileDraft(draft);
  const now = Date.now();
  const memoryLink = isBw2Version(draft.version) && draft.memoryLink;
  return {
    ...draft,
    id: original?.id ?? createId(),
    name: draft.name.trim(),
    mac: (draft.mac || "0").toUpperCase(),
    memoryLink,
    nsPokemonReleased: memoryLink && draft.nsPokemonReleased,
    shinyCharm: isBw2Version(draft.version) && draft.shinyCharm,
    createdAt: original?.createdAt ?? now,
    updatedAt: now,
  };
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `gen5-profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function validateGen5ProfileDraft(draft: Gen5ProfileDraft) {
  if (!draft.name.trim()) throw new TypeError("Enter a profile name.");
  if (!GEN5_GAME_VERSIONS.includes(draft.version))
    throw new TypeError("Invalid Gen 5 version.");
  if (!GEN5_LANGUAGES.includes(draft.language))
    throw new TypeError("Invalid Gen 5 language.");
  if (!GEN5_DS_TYPES.includes(draft.dsType))
    throw new TypeError("Invalid DS type.");
  if (
    !isIntegerIn(draft.tid, 0, 0xffff) ||
    !isIntegerIn(draft.sid, 0, 0xffff)
  ) {
    throw new TypeError("TID and SID must be between 0 and 65535.");
  }
  if (!HEX_12.test(draft.mac))
    throw new TypeError("MAC must contain at most 12 hexadecimal digits.");
  if (!isIntegerIn(draft.vcount, 0, 0xff))
    throw new TypeError("VCount must be between 00 and FF.");
  if (
    !isIntegerIn(draft.timer0Min, 0, 0xffff) ||
    !isIntegerIn(draft.timer0Max, 0, 0xffff)
  ) {
    throw new TypeError("Timer0 must be between 0000 and FFFF.");
  }
  if (!isIntegerIn(draft.gxstat, 0, 99) || !isIntegerIn(draft.vframe, 0, 99)) {
    throw new TypeError(
      "GxStat and VFrame must be hexadecimal values between 00 and 63.",
    );
  }
  if (!isBooleanArray9(draft.keypresses))
    throw new TypeError("Keypresses must contain nine choices.");
  for (const value of [
    draft.skipLR,
    draft.memoryLink,
    draft.nsPokemonReleased,
    draft.shinyCharm,
  ]) {
    if (typeof value !== "boolean")
      throw new TypeError("Invalid profile option.");
  }
  if (
    typeof draft.ivCacheName !== "string" ||
    typeof draft.shaCacheName !== "string"
  ) {
    throw new TypeError("Invalid cache file name.");
  }
}

export function isGen5Profile(value: unknown): value is Gen5Profile {
  if (!isRecord(value)) return false;
  try {
    validateGen5ProfileDraft(value as unknown as Gen5ProfileDraft);
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

export function parseGen5ProfileState(value: unknown): Gen5ProfileState {
  if (!isRecord(value) || value.schemaVersion !== GEN5_PROFILE_SCHEMA_VERSION) {
    throw new TypeError("Unsupported Gen 5 profile schema.");
  }
  if (!Array.isArray(value.profiles) || !value.profiles.every(isGen5Profile)) {
    throw new TypeError("Invalid Gen 5 profile list.");
  }
  const ids = new Set<string>();
  for (const profile of value.profiles) {
    if (ids.has(profile.id)) throw new TypeError("Duplicate Gen 5 profile id.");
    ids.add(profile.id);
  }
  const selectedProfileId = value.selectedProfileId;
  if (
    selectedProfileId !== null &&
    (typeof selectedProfileId !== "string" || !ids.has(selectedProfileId))
  ) {
    throw new TypeError("Invalid selected Gen 5 profile id.");
  }
  return {
    schemaVersion: GEN5_PROFILE_SCHEMA_VERSION,
    profiles: value.profiles.map((profile) => ({
      ...profile,
      keypresses: [...profile.keypresses] as Gen5Profile["keypresses"],
    })),
    selectedProfileId,
  };
}

export function parseGen5ProfileBackup(json: string): Gen5ProfileState {
  const value: unknown = JSON.parse(json);
  if (
    !isRecord(value) ||
    value.format !== GEN5_PROFILE_BACKUP_FORMAT ||
    typeof value.exportedAt !== "string"
  ) {
    throw new TypeError("Invalid PokeRNGKit Gen 5 profile backup.");
  }
  return parseGen5ProfileState(value);
}

export function serializeGen5ProfileBackup(state: Gen5ProfileState) {
  const validated = parseGen5ProfileState(state);
  const backup: Gen5ProfileBackup = {
    format: GEN5_PROFILE_BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    ...validated,
  };
  return `${JSON.stringify(backup, null, 2)}\n`;
}

function validateRange(
  name: string,
  minimum: number,
  maximum: number,
  limit: number,
) {
  if (
    !isIntegerIn(minimum, 0, limit) ||
    !isIntegerIn(maximum, 0, limit) ||
    minimum > maximum
  ) {
    throw new TypeError(`${name} Min must not exceed ${name} Max.`);
  }
}

export function validateGen5CalibrationRequest(
  request: Gen5CalibrationRequest,
) {
  if (!(["ivs", "needles", "seed"] as const).includes(request.mode))
    throw new TypeError("Invalid calibration mode.");
  if (
    !GEN5_GAME_VERSIONS.includes(request.version) ||
    !GEN5_LANGUAGES.includes(request.language) ||
    !GEN5_DS_TYPES.includes(request.dsType)
  ) {
    throw new TypeError("Invalid calibration platform.");
  }
  if (!HEX_12.test(request.mac))
    throw new TypeError(
      "MAC Address must contain at most 12 hexadecimal digits.",
    );
  if (!isIntegerIn(request.buttonMask, 0, 0xfff))
    throw new TypeError("Keypresses must use a 12-bit mask.");
  const dateMatch = ISO_DATE.exec(request.date);
  if (!dateMatch) throw new TypeError("Date must use YYYY-MM-DD.");
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 2000 ||
    year > 2099 ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new TypeError(
      "Date must be valid and between 2000-01-01 and 2099-12-31.",
    );
  }
  if (!isIntegerIn(request.hour, 0, 23) || !isIntegerIn(request.minute, 0, 59))
    throw new TypeError("Time is outside the DS clock range.");
  validateRange("Seconds", request.minSeconds, request.maxSeconds, 59);
  validateRange("VCount", request.minVCount, request.maxVCount, 0xff);
  validateRange("Timer0", request.minTimer0, request.maxTimer0, 0xffff);
  validateRange("GxStat", request.minGxStat, request.maxGxStat, 99);
  validateRange("VFrame", request.minVFrame, request.maxVFrame, 99);
  if (request.minIVs.length !== 6 || request.maxIVs.length !== 6)
    throw new TypeError("IV filters must contain six values.");
  request.minIVs.forEach((value, index) =>
    validateRange(`IV ${index + 1}`, value, request.maxIVs[index], 31),
  );
  if (
    !request.needles.every((needle) => isIntegerIn(needle, 0, 7)) ||
    request.needles.length > 100
  ) {
    throw new TypeError(
      "Needle sequence must contain at most 100 directions from 0 to 7.",
    );
  }
  if (request.needleType !== "unova-link" && request.needleType !== "saving")
    throw new TypeError("Invalid needle type.");
  if (typeof request.memoryLink !== "boolean")
    throw new TypeError("Memory Link must be a boolean.");
  if (request.mode === "needles" && request.needles.length === 0)
    throw new TypeError("Enter at least one needle direction.");
  if (request.mode === "seed" && !HEX_16.test(request.seed))
    throw new TypeError("Seed must contain at most 16 hexadecimal digits.");
  if (!isIntegerIn(request.resultLimit, 1, 100_000))
    throw new TypeError("Result limit must be between 1 and 100000.");

  const work =
    (request.maxSeconds - request.minSeconds + 1) *
    (request.maxVCount - request.minVCount + 1) *
    (request.maxTimer0 - request.minTimer0 + 1) *
    (request.maxGxStat - request.minGxStat + 1) *
    (request.maxVFrame - request.minVFrame + 1);
  if (!Number.isSafeInteger(work) || work > 250_000_000) {
    throw new TypeError("Calibration range exceeds the browser task limit.");
  }
  return request;
}

export function splitGen5CalibrationRequest(
  request: Gen5CalibrationRequest,
  workers: number,
): Gen5CalibrationChunk[] {
  validateGen5CalibrationRequest(request);
  if (!Number.isInteger(workers) || workers < 1)
    throw new TypeError("Worker count must be a positive integer.");
  const count = request.maxVFrame - request.minVFrame + 1;
  const chunkCount = Math.max(1, Math.min(count, Math.floor(workers)));
  const base = Math.floor(count / chunkCount);
  const remainder = count % chunkCount;
  const chunks: Gen5CalibrationChunk[] = [];
  let start = request.minVFrame;
  for (let index = 0; index < chunkCount; index += 1) {
    const size = base + (index < remainder ? 1 : 0);
    chunks.push({ index, minVFrame: start, maxVFrame: start + size - 1 });
    start += size;
  }
  return chunks;
}

export function gen5CalibrationDefaults(
  version: Gen5GameVersion,
  dsType: Gen5DsType,
) {
  const bw2 = isBw2Version(version);
  if (dsType === "ds") {
    return bw2
      ? {
          minVCount: 0x70,
          maxVCount: 0x90,
          minTimer0: 0x10e0,
          maxTimer0: 0x1130,
        }
      : {
          minVCount: 0x50,
          maxVCount: 0x70,
          minTimer0: 0x0c60,
          maxTimer0: 0x0ca0,
        };
  }
  return bw2
    ? { minVCount: 0xa0, maxVCount: 0xc0, minTimer0: 0x1400, maxTimer0: 0x1900 }
    : {
        minVCount: 0x80,
        maxVCount: 0x92,
        minTimer0: 0x1140,
        maxTimer0: 0x12d0,
      };
}

export function parseHex(value: string) {
  return Number.parseInt(value || "0", 16);
}

export function normalizeHex(value: string, length: number) {
  return value
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, length)
    .toUpperCase();
}
