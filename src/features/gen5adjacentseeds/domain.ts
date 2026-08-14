import type {
  Gen5DsType,
  Gen5GameVersion,
  Gen5Language,
  Gen5Profile,
} from "../gen5profiles/domain";

export const GEN5_ADJACENT_SEEDS_API_VERSION = 1 as const;
export const GEN5_ADJACENT_SEEDS_RESULT_LIMIT = 100_000;
export const GEN5_ADJACENT_SEEDS_PREVIEW_COUNT = 25;

export type Gen5AdjacentEncounter = "standard" | "roamer";
export type Gen5AdjacentPreviewMode = "chatot" | "needles";

export interface Gen5AdjacentSeedsRequest {
  version: Gen5GameVersion;
  language: Gen5Language;
  dsType: Gen5DsType;
  mac: string;
  vcount: number;
  timer0Min: number;
  timer0Max: number;
  gxstat: number;
  vframe: number;
  memoryLink: boolean;
  dateTime: string;
  seconds: number;
  buttonMask: number;
  encounter: Gen5AdjacentEncounter;
  initialIVAdvance: number;
  maxIVAdvances: number;
}

export interface Gen5AdjacentSeedsInitialContext {
  requestId: number;
  dateTime: string;
  buttonMask: number;
  encounter: Gen5AdjacentEncounter;
}

export interface Gen5AdjacentSeedsChunk {
  index: number;
  minSecondOffset: number;
  maxSecondOffset: number;
}

export interface Gen5AdjacentSeedResult {
  seed: string;
  dateTime: string;
  timer0: number;
  ivAdvance: number;
  ivs: [number, number, number, number, number, number];
  pidAdvance: number;
  target: boolean;
}

export interface Gen5AdjacentPreviewRequest {
  seed: string;
  pidAdvance: number;
  mode: Gen5AdjacentPreviewMode;
}

export interface Gen5AdjacentProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen5AdjacentSeedsSummary {
  results: Gen5AdjacentSeedResult[];
  processedStates: number;
  totalStates: number;
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
}

const HEX_12 = /^[0-9a-fA-F]{0,12}$/;
const HEX_16 = /^[0-9a-fA-F]{1,16}$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;
const DATE_TIME_MINUTES = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const UINT32_MAX = 0xffff_ffff;

function isIntegerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

function validateDateTime(value: string) {
  const match = DATE_TIME.exec(value);
  if (!match) throw new TypeError("Date/Time must use YYYY-MM-DD HH:mm:ss.");
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 2000 ||
    year > 2099 ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw new TypeError(
      "Date/Time must be valid and between 2000-01-01 and 2099-12-31.",
    );
  }
}

export function adjacentSeedsRequestFromProfile(
  profile: Gen5Profile,
  input: Pick<
    Gen5AdjacentSeedsRequest,
    | "dateTime"
    | "seconds"
    | "buttonMask"
    | "encounter"
    | "initialIVAdvance"
    | "maxIVAdvances"
  >,
): Gen5AdjacentSeedsRequest {
  return {
    version: profile.version,
    language: profile.language,
    dsType: profile.dsType,
    mac: profile.mac,
    vcount: profile.vcount,
    timer0Min: profile.timer0Min,
    timer0Max: profile.timer0Max,
    gxstat: profile.gxstat,
    vframe: profile.vframe,
    memoryLink: profile.memoryLink,
    ...input,
  };
}

export function totalGen5AdjacentStates(request: Gen5AdjacentSeedsRequest) {
  return (
    (request.seconds * 2 + 1) *
    (request.timer0Max - request.timer0Min + 1) *
    (request.maxIVAdvances + 1)
  );
}

export function validateGen5AdjacentSeedsRequest(
  request: Gen5AdjacentSeedsRequest,
) {
  if (
    !(["black", "white", "black2", "white2"] as const).includes(
      request.version,
    ) ||
    !(
      [
        "english",
        "spanish",
        "french",
        "italian",
        "german",
        "japanese",
        "korean",
      ] as const
    ).includes(request.language) ||
    !(["ds", "dsi", "3ds"] as const).includes(request.dsType)
  ) {
    throw new TypeError("Invalid Gen 5 profile platform.");
  }
  if (!HEX_12.test(request.mac))
    throw new TypeError(
      "MAC Address must contain at most 12 hexadecimal digits.",
    );
  if (!isIntegerIn(request.vcount, 0, 0xff))
    throw new TypeError("VCount must be between 00 and FF.");
  if (
    !isIntegerIn(request.timer0Min, 0, 0xffff) ||
    !isIntegerIn(request.timer0Max, 0, 0xffff) ||
    request.timer0Min > request.timer0Max
  ) {
    throw new TypeError("Timer0 Min must not exceed Timer0 Max.");
  }
  if (
    !isIntegerIn(request.gxstat, 0, 99) ||
    !isIntegerIn(request.vframe, 0, 99)
  ) {
    throw new TypeError("GxStat and VFrame must be between 00 and 63.");
  }
  if (typeof request.memoryLink !== "boolean")
    throw new TypeError("Memory Link must be a boolean.");
  validateDateTime(request.dateTime);
  if (!isIntegerIn(request.seconds, 0, 99))
    throw new TypeError("Seconds +/- must be between 0 and 99.");
  if (!isIntegerIn(request.buttonMask, 0, 0xfff))
    throw new TypeError("Keypresses must use a 12-bit mask.");
  if (request.encounter !== "standard" && request.encounter !== "roamer")
    throw new TypeError("Invalid encounter type.");
  if (
    !isIntegerIn(request.initialIVAdvance, 0, UINT32_MAX) ||
    !isIntegerIn(request.maxIVAdvances, 0, UINT32_MAX)
  ) {
    throw new TypeError("IV Advances must be 32-bit unsigned integers.");
  }
  const mtOffset =
    (request.version === "black2" || request.version === "white2" ? 2 : 0) +
    (request.encounter === "roamer" ? 1 : 0);
  if (
    request.initialIVAdvance + request.maxIVAdvances + mtOffset >
    UINT32_MAX
  ) {
    throw new TypeError("IV Advances exceed the 32-bit upstream range.");
  }
  const work = totalGen5AdjacentStates(request);
  if (
    !Number.isSafeInteger(work) ||
    work < 1 ||
    work > GEN5_ADJACENT_SEEDS_RESULT_LIMIT
  ) {
    throw new TypeError(
      `Adjacent Seed range exceeds the browser limit of ${GEN5_ADJACENT_SEEDS_RESULT_LIMIT} rows.`,
    );
  }
  return request;
}

export function validateGen5AdjacentPreviewRequest(
  request: Gen5AdjacentPreviewRequest,
) {
  if (!HEX_16.test(request.seed))
    throw new TypeError("Seed must contain 1 to 16 hexadecimal digits.");
  if (!isIntegerIn(request.pidAdvance, 0, UINT32_MAX))
    throw new TypeError("PID Advance must be a 32-bit unsigned integer.");
  if (request.mode !== "chatot" && request.mode !== "needles")
    throw new TypeError("Invalid preview mode.");
  return request;
}

export function splitGen5AdjacentSeedsRequest(
  request: Gen5AdjacentSeedsRequest,
  workers: number,
): Gen5AdjacentSeedsChunk[] {
  validateGen5AdjacentSeedsRequest(request);
  if (!Number.isInteger(workers) || workers < 1)
    throw new TypeError("Worker count must be a positive integer.");
  const offsetCount = request.seconds * 2 + 1;
  const chunkCount = Math.min(offsetCount, Math.floor(workers));
  const base = Math.floor(offsetCount / chunkCount);
  const remainder = offsetCount % chunkCount;
  const chunks: Gen5AdjacentSeedsChunk[] = [];
  let start = -request.seconds;
  for (let index = 0; index < chunkCount; index += 1) {
    const size = base + (index < remainder ? 1 : 0);
    chunks.push({
      index,
      minSecondOffset: start,
      maxSecondOffset: start + size - 1,
    });
    start += size;
  }
  return chunks;
}

export function normalizeAdvance(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function normalizeGen5AdjacentDateTime(value: string) {
  return DATE_TIME_MINUTES.test(value) ? `${value}:00` : value;
}

export function formatGen5Buttons(mask: number) {
  const labels = [
    "R",
    "L",
    "X",
    "Y",
    "A",
    "B",
    "Select",
    "Start",
    "Right",
    "Left",
    "Up",
    "Down",
  ];
  const selected = labels.filter((_, index) => (mask & (1 << index)) !== 0);
  return selected.length === 0 ? "None" : selected.join(" + ");
}

export function formatGen5AdjacentPreview(
  values: readonly number[],
  mode: Gen5AdjacentPreviewMode,
) {
  if (mode === "needles") {
    const needles = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
    return values.map((value) => needles[value & 7]).join(", ");
  }
  return values
    .map((value) => {
      const pitch =
        value < 20
          ? "L"
          : value < 40
            ? "ML"
            : value < 60
              ? "M"
              : value < 80
                ? "MH"
                : "H";
      return `${pitch} ${value}`;
    })
    .join(", ");
}
