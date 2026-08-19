import { GEN6_WILD_AREAS, GEN6_WILD_LOCATIONS } from "../gen6wild/data";
import type { Gen6WildLanguage } from "../gen6wild/domain";

export const GEN6_TINY_ROCKSMASH_API_VERSION = 1;
export const GEN6_TINY_ROCKSMASH_REQUEST_WORDS = 27;
export const GEN6_TINY_ROCKSMASH_RESULT_WORDS = 24;
export const GEN6_TINY_ROCKSMASH_MAX_INDEX = 10_000_000;
export const GEN6_TINY_ROCKSMASH_MAX_MIN_INDEX = 250_000;
export const GEN6_TINY_ROCKSMASH_MAX_RESULTS = 100_000;
export const GEN6_TINY_ROCKSMASH_MAX_TASKS = 5_000_000;
export const GEN6_TINY_ROCKSMASH_MAX_BLINK_RAND = 1_000;
export const GEN6_TINY_ROCKSMASH_MAX_INTERACT_FRAME = 1_000;
export const GEN6_TINY_ROCKSMASH_SLOT_COUNT = 5;

export type Gen6TinyRockSmashVersion =
  "x" | "y" | "omega-ruby" | "alpha-sapphire";
export type Gen6TinyRockSmashInputMode = "seed" | "state";

export interface Gen6TinyRockSmashSlot {
  readonly species: number;
  readonly level: number;
}

export interface Gen6TinyRockSmashFilters {
  disabled: boolean;
  triggerOnly: boolean;
  synchronize: boolean;
  safeOnly: boolean;
  flute: number;
  slotMask: number;
}

export interface Gen6TinyRockSmashRequest {
  inputMode: Gen6TinyRockSmashInputMode;
  seed: number;
  state: [number, number, number, number];
  minIndex: number;
  maxIndex: number;
  longBlinkRand: number;
  interactFrame: number;
  oras: boolean;
  filters: Gen6TinyRockSmashFilters;
  slots: readonly Gen6TinyRockSmashSlot[];
  resultLimit: number;
}

export interface Gen6TinyRockSmashResult {
  index: number;
  random: number;
  state: [number, number, number, number];
  initialSeed: number;
  encounter: number;
  trigger: boolean;
  synchronize: boolean;
  slot: number;
  itemSlot: number;
  flute: number;
  actualDelay: number;
  risky: boolean;
  timeline: number[];
  species: number;
  level: number;
}

export interface Gen6TinyRockSmashArea {
  readonly id: string;
  readonly version: Gen6WildVersionForArea;
  readonly location: number;
  readonly index: number;
  readonly species: readonly number[];
  readonly levels: readonly number[];
}

type Gen6WildVersionForArea = "x" | "omega-ruby";

const UINT32_MAX = 0xffff_ffff;

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

export function gen6TinyRockSmashAreas(
  version: Gen6TinyRockSmashVersion,
): readonly Gen6TinyRockSmashArea[] {
  const family = version === "x" || version === "y" ? "x" : "omega-ruby";
  return GEN6_WILD_AREAS.filter(
    (area) => area.version === family && area.type === "rock-smash",
  );
}

export function gen6TinyRockSmashLocationName(
  area: Pick<Gen6TinyRockSmashArea, "location" | "index">,
  language: Gen6WildLanguage,
) {
  const base =
    GEN6_WILD_LOCATIONS[language][area.location] || `Location ${area.location}`;
  return area.index ? `${base} (${area.index})` : base;
}

export function gen6TinyRockSmashTaskCount(
  request: Pick<Gen6TinyRockSmashRequest, "minIndex" | "maxIndex">,
) {
  return request.maxIndex - request.minIndex + 1;
}

export function validateGen6TinyRockSmashRequest(
  request: Gen6TinyRockSmashRequest,
) {
  if (!(request.inputMode === "seed" || request.inputMode === "state"))
    throw new TypeError("TinyFinder Rock Smash input mode is invalid.");
  if (!integerIn(request.seed, 0, UINT32_MAX))
    throw new TypeError("TinyMT seed must be a 32-bit word.");
  if (
    request.state.length !== 4 ||
    !request.state.every((value) => integerIn(value, 0, UINT32_MAX))
  )
    throw new TypeError("TinyMT state must contain four 32-bit words.");
  if (
    !integerIn(request.minIndex, 0, GEN6_TINY_ROCKSMASH_MAX_MIN_INDEX) ||
    !integerIn(
      request.maxIndex,
      request.minIndex,
      GEN6_TINY_ROCKSMASH_MAX_INDEX,
    )
  )
    throw new TypeError("TinyFinder Rock Smash Index range is invalid.");
  if (
    !integerIn(request.longBlinkRand, 0, GEN6_TINY_ROCKSMASH_MAX_BLINK_RAND) ||
    !integerIn(request.interactFrame, 0, GEN6_TINY_ROCKSMASH_MAX_INTERACT_FRAME)
  )
    throw new TypeError("TinyFinder Rock Smash timing input is invalid.");
  if (!request.filters || typeof request.filters.disabled !== "boolean")
    throw new TypeError("TinyFinder Rock Smash filters are invalid.");
  if (
    typeof request.filters.triggerOnly !== "boolean" ||
    typeof request.filters.synchronize !== "boolean" ||
    typeof request.filters.safeOnly !== "boolean" ||
    !integerIn(request.filters.flute, 0, 4) ||
    !integerIn(request.filters.slotMask, 0, 0x1f)
  )
    throw new TypeError("TinyFinder Rock Smash filters are invalid.");
  if (
    request.slots.length !== GEN6_TINY_ROCKSMASH_SLOT_COUNT ||
    request.slots.some(
      (slot) =>
        !integerIn(slot.species, 0, 721) || !integerIn(slot.level, 1, 100),
    )
  )
    throw new TypeError("TinyFinder Rock Smash slots are invalid.");
  if (
    !integerIn(request.resultLimit, 1, GEN6_TINY_ROCKSMASH_MAX_RESULTS) ||
    gen6TinyRockSmashTaskCount(request) > GEN6_TINY_ROCKSMASH_MAX_TASKS
  )
    throw new TypeError("TinyFinder Rock Smash result budget is invalid.");
  return request;
}

export function encodeGen6TinyRockSmashRequest(
  request: Gen6TinyRockSmashRequest,
) {
  validateGen6TinyRockSmashRequest(request);
  return Uint32Array.from([
    request.inputMode === "state" ? 1 : 0,
    request.seed >>> 0,
    ...request.state.map((value) => value >>> 0),
    request.minIndex,
    request.maxIndex,
    request.longBlinkRand,
    request.interactFrame,
    request.oras ? 1 : 0,
    request.filters.triggerOnly ? 1 : 0,
    request.filters.synchronize ? 1 : 0,
    request.filters.flute,
    request.filters.safeOnly ? 1 : 0,
    request.filters.slotMask,
    request.resultLimit,
    ...request.slots.map((slot) => slot.species),
    ...request.slots.map((slot) => slot.level),
  ]);
}

export function decodeGen6TinyRockSmashResults(
  buffer: ArrayBuffer,
  limit = GEN6_TINY_ROCKSMASH_MAX_RESULTS,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_TINY_ROCKSMASH_RESULT_WORDS !== 0)
    throw new TypeError("TinyFinder Rock Smash result buffer is misaligned.");
  const count = Math.min(
    words.length / GEN6_TINY_ROCKSMASH_RESULT_WORDS,
    Math.max(0, Math.floor(limit)),
  );
  return Array.from({ length: count }, (_, index): Gen6TinyRockSmashResult => {
    const offset = index * GEN6_TINY_ROCKSMASH_RESULT_WORDS;
    const flags = words[offset + 8];
    const timelineCount = Math.min(words[offset + 13], 8);
    return {
      index: words[offset],
      random: words[offset + 1],
      state: [
        words[offset + 2],
        words[offset + 3],
        words[offset + 4],
        words[offset + 5],
      ],
      initialSeed: words[offset + 6],
      encounter: words[offset + 7],
      trigger: (flags & 1) !== 0,
      synchronize: (flags & 2) !== 0,
      risky: (flags & 4) !== 0,
      slot: words[offset + 9],
      itemSlot: words[offset + 10],
      flute: words[offset + 11],
      actualDelay: words[offset + 12],
      timeline: Array.from(
        { length: timelineCount },
        (_, timelineIndex) => words[offset + 14 + timelineIndex],
      ),
      species: words[offset + 22],
      level: words[offset + 23],
    };
  });
}

export function formatGen6TinyRockSmashHex(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}
