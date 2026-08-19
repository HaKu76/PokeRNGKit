import { GEN6_WILD_LOCATIONS } from "../gen6wild/data";
import type { Gen6WildLanguage } from "../gen6wild/domain";
import {
  GEN6_TINY_HONEY_AREAS,
  type Gen6TinyHoneyArea,
  type Gen6TinyHoneyGame,
} from "./data";

export type { Gen6TinyHoneyGame } from "./data";

export const GEN6_TINY_HONEY_API_VERSION = 1;
export const GEN6_TINY_HONEY_REQUEST_WORDS = 44;
export const GEN6_TINY_HONEY_RESULT_WORDS = 24;
export const GEN6_TINY_HONEY_MAX_INDEX = 10_000_000;
export const GEN6_TINY_HONEY_MAX_MIN_INDEX = 250_000;
export const GEN6_TINY_HONEY_MAX_RESULTS = 100_000;
export const GEN6_TINY_HONEY_MAX_TASKS = 5_000_000;
export const GEN6_TINY_HONEY_MAX_TIMING = 1_000;
export const GEN6_TINY_HONEY_MAX_PARTY = 6;
export const GEN6_TINY_HONEY_MAX_BAG_ADVANCES = 100;
export const GEN6_TINY_HONEY_MAX_SLOTS = 12;

export type Gen6TinyHoneyInputMode = "seed" | "state";
export interface Gen6TinyHoneySlot {
  readonly species: number;
  readonly level: number;
}
export interface Gen6TinyHoneyFilters {
  disabled: boolean;
  synchronize: boolean;
  safeOnly: boolean;
  flute: number;
  slotMask: number;
}
export interface Gen6TinyHoneyRequest {
  inputMode: Gen6TinyHoneyInputMode;
  seed: number;
  state: [number, number, number, number];
  minIndex: number;
  maxIndex: number;
  longBlinkRand: number;
  honeyDelay: number;
  party: number;
  bagAdvances: number;
  oras: boolean;
  emulator: boolean;
  slotType: 0 | 4;
  filters: Gen6TinyHoneyFilters;
  slots: readonly Gen6TinyHoneySlot[];
  resultLimit: number;
}
export interface Gen6TinyHoneyResult {
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

const UINT32_MAX = 0xffff_ffff;
function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}
export function gen6TinyHoneyAreas(
  game: Gen6TinyHoneyGame,
): readonly Gen6TinyHoneyArea[] {
  return GEN6_TINY_HONEY_AREAS.filter((area) => area.game === game);
}
export function gen6TinyHoneyLocationName(
  area: Pick<Gen6TinyHoneyArea, "map" | "name" | "mode">,
  language: Gen6WildLanguage,
) {
  const localized = GEN6_WILD_LOCATIONS[language][area.map];
  return localized
    ? `${localized} (${area.mode})`
    : `${area.name} (${area.mode})`;
}
export function gen6TinyHoneyTaskCount(
  request: Pick<Gen6TinyHoneyRequest, "minIndex" | "maxIndex">,
) {
  return request.maxIndex - request.minIndex + 1;
}
export function validateGen6TinyHoneyRequest(request: Gen6TinyHoneyRequest) {
  if (!(request.inputMode === "seed" || request.inputMode === "state"))
    throw new TypeError("TinyFinder Honey Wild input mode is invalid.");
  if (!integerIn(request.seed, 0, UINT32_MAX))
    throw new TypeError("TinyMT seed must be a 32-bit word.");
  if (
    request.state.length !== 4 ||
    !request.state.every((value) => integerIn(value, 0, UINT32_MAX))
  )
    throw new TypeError("TinyMT state must contain four 32-bit words.");
  if (
    !integerIn(request.minIndex, 0, GEN6_TINY_HONEY_MAX_MIN_INDEX) ||
    !integerIn(request.maxIndex, request.minIndex, GEN6_TINY_HONEY_MAX_INDEX)
  )
    throw new TypeError("TinyFinder Honey Wild Index range is invalid.");
  if (
    !integerIn(request.longBlinkRand, 0, GEN6_TINY_HONEY_MAX_TIMING) ||
    !integerIn(request.honeyDelay, 0, GEN6_TINY_HONEY_MAX_TIMING) ||
    !integerIn(request.party, 1, GEN6_TINY_HONEY_MAX_PARTY) ||
    !integerIn(request.bagAdvances, 0, GEN6_TINY_HONEY_MAX_BAG_ADVANCES)
  )
    throw new TypeError("TinyFinder Honey Wild timing input is invalid.");
  if (
    typeof request.emulator !== "boolean" ||
    typeof request.oras !== "boolean"
  )
    throw new TypeError("TinyFinder Honey Wild version flags are invalid.");
  if (request.slotType !== 0 && request.slotType !== 4)
    throw new TypeError("TinyFinder Honey Wild slot type is invalid.");
  if (!request.filters || typeof request.filters.disabled !== "boolean")
    throw new TypeError("TinyFinder Honey Wild filters are invalid.");
  if (
    typeof request.filters.synchronize !== "boolean" ||
    typeof request.filters.safeOnly !== "boolean" ||
    !integerIn(request.filters.flute, 0, 4) ||
    !integerIn(request.filters.slotMask, 0, 0x0fff)
  )
    throw new TypeError("TinyFinder Honey Wild filters are invalid.");
  const expectedSlots = request.slotType === 4 ? 5 : 12;
  if (
    request.slots.length !== expectedSlots ||
    request.slots.some(
      (slot) =>
        !integerIn(slot.species, 0, 721) || !integerIn(slot.level, 1, 100),
    )
  )
    throw new TypeError("TinyFinder Honey Wild slots are invalid.");
  if (
    !integerIn(request.resultLimit, 1, GEN6_TINY_HONEY_MAX_RESULTS) ||
    gen6TinyHoneyTaskCount(request) > GEN6_TINY_HONEY_MAX_TASKS
  )
    throw new TypeError("TinyFinder Honey Wild result budget is invalid.");
  return request;
}
export function encodeGen6TinyHoneyRequest(request: Gen6TinyHoneyRequest) {
  validateGen6TinyHoneyRequest(request);
  const species = Array.from(
    { length: GEN6_TINY_HONEY_MAX_SLOTS },
    (_, index) => request.slots[index]?.species ?? 0,
  );
  const levels = Array.from(
    { length: GEN6_TINY_HONEY_MAX_SLOTS },
    (_, index) => request.slots[index]?.level ?? 1,
  );
  return Uint32Array.from([
    request.inputMode === "state" ? 1 : 0,
    request.seed >>> 0,
    ...request.state.map((value) => value >>> 0),
    request.minIndex,
    request.maxIndex,
    request.longBlinkRand,
    request.honeyDelay,
    request.party,
    request.bagAdvances,
    request.oras ? 1 : 0,
    request.emulator ? 1 : 0,
    request.slotType,
    request.filters.synchronize ? 1 : 0,
    request.filters.safeOnly ? 1 : 0,
    request.filters.flute,
    request.filters.slotMask,
    request.resultLimit,
    ...species,
    ...levels,
  ]);
}
export function decodeGen6TinyHoneyResults(
  buffer: ArrayBuffer,
  limit = GEN6_TINY_HONEY_MAX_RESULTS,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_TINY_HONEY_RESULT_WORDS !== 0)
    throw new TypeError("TinyFinder Honey Wild result buffer is misaligned.");
  const count = Math.min(
    words.length / GEN6_TINY_HONEY_RESULT_WORDS,
    Math.max(0, Math.floor(limit)),
  );
  return Array.from({ length: count }, (_, index): Gen6TinyHoneyResult => {
    const offset = index * GEN6_TINY_HONEY_RESULT_WORDS;
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
export function formatGen6TinyHoneyHex(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}
