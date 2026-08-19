import { GEN6_WILD_LOCATIONS } from "../gen6wild/data";
import type { Gen6WildLanguage } from "../gen6wild/domain";
import {
  GEN6_TINY_AMBUSH_AREAS,
  type Gen6TinyAmbushArea,
  type Gen6TinyAmbushVersion,
} from "./data";

export type { Gen6TinyAmbushVersion } from "./data";

export const GEN6_TINY_AMBUSH_API_VERSION = 1;
export const GEN6_TINY_AMBUSH_REQUEST_WORDS = 35;
export const GEN6_TINY_AMBUSH_RESULT_WORDS = 16;
export const GEN6_TINY_AMBUSH_MAX_INDEX = 10_000_000;
export const GEN6_TINY_AMBUSH_MAX_MIN_INDEX = 250_000;
export const GEN6_TINY_AMBUSH_MAX_RESULTS = 100_000;
export const GEN6_TINY_AMBUSH_MAX_TASKS = 5_000_000;
export const GEN6_TINY_AMBUSH_MAX_SLOTS = 12;

export type Gen6TinyAmbushInputMode = "seed" | "state";

export interface Gen6TinyAmbushFilters {
  disabled: boolean;
  synchronize: boolean;
  slotMask: number;
}

export interface Gen6TinyAmbushRequest {
  inputMode: Gen6TinyAmbushInputMode;
  seed: number;
  state: [number, number, number, number];
  minIndex: number;
  maxIndex: number;
  filters: Gen6TinyAmbushFilters;
  slots: readonly { species: number; level: number }[];
  resultLimit: number;
}

export interface Gen6TinyAmbushResult {
  index: number;
  rand100: number;
  state: [number, number, number, number];
  initialSeed: number;
  synchronize: boolean;
  slot: number;
  itemSlot: number;
  species: number;
  level: number;
}

const UINT32_MAX = 0xffff_ffff;

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

export function gen6TinyAmbushAreas(
  version: Gen6TinyAmbushVersion,
): readonly Gen6TinyAmbushArea[] {
  return GEN6_TINY_AMBUSH_AREAS.filter((area) => area.game === version);
}

export function gen6TinyAmbushLocationName(
  area: Pick<Gen6TinyAmbushArea, "map" | "name">,
  language: Gen6WildLanguage,
) {
  return GEN6_WILD_LOCATIONS[language][area.map] || area.name;
}

export function gen6TinyAmbushTaskCount(
  request: Pick<Gen6TinyAmbushRequest, "minIndex" | "maxIndex">,
) {
  return request.maxIndex - request.minIndex + 1;
}

export function validateGen6TinyAmbushRequest(request: Gen6TinyAmbushRequest) {
  if (!(request.inputMode === "seed" || request.inputMode === "state"))
    throw new TypeError("TinyFinder Ambush input mode is invalid.");
  if (!integerIn(request.seed, 0, UINT32_MAX))
    throw new TypeError("TinyMT seed must be a 32-bit word.");
  if (
    request.state.length !== 4 ||
    !request.state.every((value) => integerIn(value, 0, UINT32_MAX))
  )
    throw new TypeError("TinyMT state must contain four 32-bit words.");
  if (
    !integerIn(request.minIndex, 0, GEN6_TINY_AMBUSH_MAX_MIN_INDEX) ||
    !integerIn(request.maxIndex, request.minIndex, GEN6_TINY_AMBUSH_MAX_INDEX)
  )
    throw new TypeError("TinyFinder Ambush Index range is invalid.");
  if (!request.filters || typeof request.filters.disabled !== "boolean")
    throw new TypeError("TinyFinder Ambush filters are invalid.");
  if (
    typeof request.filters.synchronize !== "boolean" ||
    !integerIn(request.filters.slotMask, 0, 0xfff)
  )
    throw new TypeError("TinyFinder Ambush filters are invalid.");
  if (
    request.slots.length !== GEN6_TINY_AMBUSH_MAX_SLOTS ||
    request.slots.some(
      (slot) =>
        !integerIn(slot.species, 0, 721) || !integerIn(slot.level, 1, 100),
    )
  )
    throw new TypeError("TinyFinder Ambush slots are invalid.");
  if (
    !integerIn(request.resultLimit, 1, GEN6_TINY_AMBUSH_MAX_RESULTS) ||
    gen6TinyAmbushTaskCount(request) > GEN6_TINY_AMBUSH_MAX_TASKS
  )
    throw new TypeError("TinyFinder Ambush result budget is invalid.");
  return request;
}

export function encodeGen6TinyAmbushRequest(request: Gen6TinyAmbushRequest) {
  validateGen6TinyAmbushRequest(request);
  return Uint32Array.from([
    request.inputMode === "state" ? 1 : 0,
    request.seed >>> 0,
    ...request.state.map((value) => value >>> 0),
    request.minIndex,
    request.maxIndex,
    request.filters.synchronize ? 1 : 0,
    request.filters.slotMask,
    request.resultLimit,
    ...request.slots.map((slot) => slot.species),
    ...request.slots.map((slot) => slot.level),
  ]);
}

export function decodeGen6TinyAmbushResults(
  buffer: ArrayBuffer,
  limit = GEN6_TINY_AMBUSH_MAX_RESULTS,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_TINY_AMBUSH_RESULT_WORDS !== 0)
    throw new TypeError("TinyFinder Ambush result buffer is misaligned.");
  const count = Math.min(
    words.length / GEN6_TINY_AMBUSH_RESULT_WORDS,
    Math.max(0, Math.floor(limit)),
  );
  return Array.from({ length: count }, (_, index): Gen6TinyAmbushResult => {
    const offset = index * GEN6_TINY_AMBUSH_RESULT_WORDS;
    return {
      index: words[offset],
      rand100: words[offset + 1],
      state: [
        words[offset + 2],
        words[offset + 3],
        words[offset + 4],
        words[offset + 5],
      ],
      initialSeed: words[offset + 6],
      synchronize: (words[offset + 7] & 1) !== 0,
      slot: words[offset + 8],
      itemSlot: words[offset + 9],
      species: words[offset + 10],
      level: words[offset + 11],
    };
  });
}

export function formatGen6TinyAmbushHex(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}
