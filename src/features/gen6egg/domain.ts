export const GEN6_EGG_API_VERSION = 2;
export const GEN6_EGG_REQUEST_WORDS = 154;
export const GEN6_EGG_RESULT_WORDS = 20;
export const GEN6_EGG_MAX_FRAME = 100_000_000;
export const GEN6_EGG_BROWSER_MAX_FRAME = 5_000_000;
export const GEN6_EGG_MAX_RESULTS = 100_000;
export const GEN6_EGG_STEP_SIZE = 2_048;

export type Gen6EggIvTuple = [number, number, number, number, number, number];
export type Gen6EggGenderRatio =
  | "genderless"
  | "one-to-one"
  | "seven-to-one"
  | "three-to-one"
  | "one-to-three"
  | "one-to-seven"
  | "male-only"
  | "female-only";
export type Gen6EggItem =
  | "none"
  | "everstone"
  | "destiny-knot"
  | "power-hp"
  | "power-attack"
  | "power-defense"
  | "power-special-attack"
  | "power-special-defense"
  | "power-speed";
export type Gen6EggShinyFilter = "any" | "shiny" | "square";
export type Gen6EggGenderFilter = "any" | "male" | "female" | "genderless";
export type Gen6EggAbilityFilter = "any" | "1" | "2" | "hidden";
export type Gen6EggParentFilter = "any" | "male" | "female";

export interface Gen6EggFilters {
  disabled: boolean;
  shiny: Gen6EggShinyFilter;
  gender: Gen6EggGenderFilter;
  ability: Gen6EggAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: Gen6EggIvTuple;
  ivMax: Gen6EggIvTuple;
  natureInheritance: Gen6EggParentFilter;
}

export interface Gen6EggRequest {
  mainSeed: number;
  minFrame: number;
  maxFrame: number;
  key0: number;
  key1: number;
  tsv: number;
  trv: number;
  genderRatio: Gen6EggGenderRatio;
  maleIvs: Gen6EggIvTuple;
  femaleIvs: Gen6EggIvTuple;
  maleAbility: 0 | 1 | 2;
  femaleAbility: 0 | 1 | 2;
  maleDitto: boolean;
  femaleDitto: boolean;
  maleItem: Gen6EggItem;
  femaleItem: Gen6EggItem;
  nidoType: boolean;
  shinyCharm: boolean;
  masudaMethod: boolean;
  considerOtherTsv: boolean;
  acceptEgg: boolean;
  otherTsvs: readonly number[];
  filters: Gen6EggFilters;
  resultLimit: number;
}

export interface Gen6EggResult {
  frame: number;
  current: boolean;
  random: number;
  eggSeed: bigint;
  ec: number;
  pid: number;
  ivs: Gen6EggIvTuple;
  nature: number;
  ability: number;
  gender: number;
  hiddenPower: number;
  shiny: boolean;
  squareShiny: boolean;
  inheritedMaleMask: number;
  inheritedFemaleMask: number;
  natureParent: Gen6EggParentFilter;
  psv: number;
  prv: number;
}

const UINT32_MAX = 0xffff_ffff;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const ITEM_CODE: Record<Gen6EggItem, number> = {
  none: 0,
  everstone: 1,
  "destiny-knot": 2,
  "power-hp": 3,
  "power-attack": 4,
  "power-defense": 5,
  "power-special-attack": 6,
  "power-special-defense": 7,
  "power-speed": 8,
};
const GENDER_CODE: Record<Gen6EggGenderRatio, number> = {
  genderless: 0,
  "one-to-one": 126,
  "seven-to-one": 30,
  "three-to-one": 62,
  "one-to-three": 190,
  "one-to-seven": 224,
  "male-only": 1,
  "female-only": 2,
};
const GENDER_FILTER = { any: 0, male: 1, female: 2, genderless: 0 } as const;
const ABILITY_FILTER = { any: 0, "1": 1, "2": 2, hidden: 3 } as const;
const NATURE_PARENT_FILTER = { any: 0, male: 1, female: 2 } as const;
const STATES: readonly Gen6EggParentFilter[] = ["any", "male", "female"];

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

function validateIvs(values: readonly number[], label: string) {
  if (values.length !== 6 || !values.every((value) => integerIn(value, 0, 31)))
    throw new TypeError(`${label} must contain six IVs between 0 and 31.`);
}

function maskFromList(values: readonly number[]) {
  const mask = new Uint32Array(128);
  for (const value of values)
    if (integerIn(value, 0, 4095)) mask[value >>> 5] |= 1 << (value & 31);
  return mask;
}

export function gen6EggTaskCount(request: Gen6EggRequest) {
  return request.maxFrame - request.minFrame + 1;
}

export function validateGen6EggRequest(request: Gen6EggRequest) {
  if (!integerIn(request.mainSeed, 0, UINT32_MAX))
    throw new TypeError("Main Seed must be a 32-bit unsigned integer.");
  if (
    !integerIn(request.minFrame, 0, GEN6_EGG_MAX_FRAME) ||
    !integerIn(request.maxFrame, request.minFrame, GEN6_EGG_MAX_FRAME)
  )
    throw new TypeError("Frame range is invalid.");
  if (request.maxFrame > GEN6_EGG_BROWSER_MAX_FRAME)
    throw new TypeError("Gen VI Egg browser frames are limited to 5000000.");
  if (
    !integerIn(request.key0, 0, UINT32_MAX) ||
    !integerIn(request.key1, 0, UINT32_MAX)
  )
    throw new TypeError("Egg Seed words are invalid.");
  if (!integerIn(request.tsv, 0, 4095) || !integerIn(request.trv, 0, 15))
    throw new TypeError("TSV/TRV is invalid.");
  if (!(request.genderRatio in GENDER_CODE))
    throw new TypeError("Gender ratio is invalid.");
  validateIvs(request.maleIvs, "Male parent IVs");
  validateIvs(request.femaleIvs, "Female parent IVs");
  if (
    !integerIn(request.maleAbility, 0, 2) ||
    !integerIn(request.femaleAbility, 0, 2)
  )
    throw new TypeError("Parent ability is invalid.");
  if (
    typeof request.maleDitto !== "boolean" ||
    typeof request.femaleDitto !== "boolean"
  )
    throw new TypeError("Parent Ditto setting is invalid.");
  if (request.maleDitto && request.femaleDitto)
    throw new TypeError("Both parents cannot be Ditto.");
  if (
    (request.genderRatio === "genderless" ||
      request.genderRatio === "male-only") &&
    (!request.femaleDitto || request.maleDitto)
  )
    throw new TypeError(
      "Genderless and male-only species require the female parent to be Ditto.",
    );
  if (request.genderRatio === "female-only" && request.femaleDitto)
    throw new TypeError(
      "Female-only species cannot use Ditto as the female parent.",
    );
  if (!(request.maleItem in ITEM_CODE) || !(request.femaleItem in ITEM_CODE))
    throw new TypeError("Parent item is invalid.");
  for (const value of [
    request.nidoType,
    request.shinyCharm,
    request.masudaMethod,
    request.considerOtherTsv,
    request.acceptEgg,
  ])
    if (typeof value !== "boolean")
      throw new TypeError("Egg settings are invalid.");
  if (request.nidoType && request.genderRatio !== "one-to-one")
    throw new TypeError("Nido Type requires the 1:1 gender ratio.");
  if (!Array.isArray(request.otherTsvs))
    throw new TypeError("Other TSV list is invalid.");
  if (request.otherTsvs.length > 4096)
    throw new TypeError("Other TSV list is too large.");
  for (const value of request.otherTsvs)
    if (!integerIn(value, 0, 4095))
      throw new TypeError("Other TSV must be between 0 and 4095.");
  validateGen6EggFilters(request.filters);
  if (!integerIn(request.resultLimit, 1, GEN6_EGG_MAX_RESULTS))
    throw new TypeError("Result limit is outside 1..100000.");
  if (
    request.considerOtherTsv &&
    !request.acceptEgg &&
    !request.shinyCharm &&
    !request.masudaMethod
  )
    throw new TypeError(
      "Other TSV shiny checks require an accepted egg, Shiny Charm, or Masuda Method.",
    );
  return request;
}

export function validateGen6EggFilters(filters: Gen6EggFilters) {
  if (typeof filters.disabled !== "boolean")
    throw new TypeError("Egg filter state is invalid.");
  if (!(filters.shiny in { any: 1, shiny: 1, square: 1 }))
    throw new TypeError("Shiny filter is invalid.");
  if (!(filters.gender in GENDER_FILTER))
    throw new TypeError("Gender filter is invalid.");
  if (!(filters.ability in ABILITY_FILTER))
    throw new TypeError("Ability filter is invalid.");
  if (!(filters.natureInheritance in NATURE_PARENT_FILTER))
    throw new TypeError("Nature inheritance filter is invalid.");
  if (
    !integerIn(filters.natureMask, 0, ALL_NATURES) ||
    !integerIn(filters.hiddenPowerMask, 0, ALL_HIDDEN_POWERS)
  )
    throw new TypeError("Nature or Hidden Power filter is invalid.");
  validateIvs(filters.ivMin, "Minimum IV filter");
  validateIvs(filters.ivMax, "Maximum IV filter");
  for (let i = 0; i < 6; i++)
    if (filters.ivMin[i] > filters.ivMax[i])
      throw new TypeError("IV filter minimum exceeds maximum.");
  return filters;
}

export function encodeGen6EggRequest(request: Gen6EggRequest) {
  validateGen6EggRequest(request);
  const words = new Uint32Array(GEN6_EGG_REQUEST_WORDS);
  words[0] = request.mainSeed >>> 0;
  words[1] = request.minFrame;
  words[2] = gen6EggTaskCount(request);
  words[3] = request.key0 >>> 0;
  words[4] = request.key1 >>> 0;
  words[5] = request.tsv;
  words[6] = request.trv;
  words[7] = GENDER_CODE[request.genderRatio];
  words[8] = ITEM_CODE[request.maleItem];
  words[9] = ITEM_CODE[request.femaleItem];
  words[10] = request.femaleDitto ? request.maleAbility : request.femaleAbility;
  words[11] =
    Number(request.nidoType) |
    (Number(request.shinyCharm) << 1) |
    (Number(request.masudaMethod) << 2) |
    (Number(request.considerOtherTsv) << 3) |
    (Number(
      request.acceptEgg && !request.shinyCharm && !request.masudaMethod,
    ) <<
      4) |
    (Number(request.acceptEgg) << 5);
  request.maleIvs.forEach((value, index) => (words[12 + index] = value));
  request.femaleIvs.forEach((value, index) => (words[18 + index] = value));
  words[24] = request.resultLimit;
  words[25] = request.otherTsvs.length;
  words.set(maskFromList(request.otherTsvs), 26);
  return words;
}

export function decodeGen6EggResults(
  buffer: ArrayBuffer,
  limit = GEN6_EGG_MAX_RESULTS,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_EGG_RESULT_WORDS !== 0)
    throw new TypeError("Gen VI Egg result buffer is not aligned.");
  return Array.from(
    { length: Math.min(words.length / GEN6_EGG_RESULT_WORDS, limit) },
    (_, index): Gen6EggResult => {
      const offset = index * GEN6_EGG_RESULT_WORDS;
      const metadata = words[offset + 12];
      const xorValue =
        (words[offset + 5] >>> 16) ^ (words[offset + 5] & 0xffff);
      const ivs = [
        words[offset + 6],
        words[offset + 7],
        words[offset + 8],
        words[offset + 9],
        words[offset + 10],
        words[offset + 11],
      ] as Gen6EggIvTuple;
      return {
        frame: (metadata & (1 << 12)) !== 0 ? -1 : words[offset],
        current: (metadata & (1 << 12)) !== 0,
        random: words[offset + 1],
        eggSeed: (BigInt(words[offset + 3]) << 32n) | BigInt(words[offset + 2]),
        ec: words[offset + 4],
        pid: words[offset + 5],
        ivs,
        nature: metadata & 31,
        ability: (metadata >>> 5) & 3,
        gender: (metadata >>> 8) & 3,
        hiddenPower: words[offset + 16],
        shiny: (metadata & (1 << 10)) !== 0,
        squareShiny: (metadata & (1 << 11)) !== 0,
        inheritedMaleMask: words[offset + 13] & 63,
        inheritedFemaleMask: words[offset + 18] & 63,
        natureParent: STATES[(words[offset + 13] >>> 8) & 3] ?? "any",
        psv: xorValue >>> 4,
        prv: xorValue & 15,
      };
    },
  );
}

export function gen6EggHiddenPower(ivs: Gen6EggIvTuple) {
  const bits = ivs.reduce(
    (sum, value, index) => sum + (value & 1) * (1 << index),
    0,
  );
  const powerBits = ivs.reduce(
    (sum, value, index) => sum + ((value >> 1) & 1) * (1 << index),
    0,
  );
  return {
    type: Math.floor((bits * 15) / 63),
    power: Math.floor((powerBits * 40) / 63) + 30,
  };
}

export function gen6EggResultPassesFilters(
  request: Gen6EggRequest,
  result: Gen6EggResult,
) {
  if (result.current) return true;
  const filters = request.filters;
  if (filters.disabled) return true;
  if (filters.shiny === "shiny" && !result.shiny) return false;
  if (filters.shiny === "square" && !result.squareShiny) return false;
  if (
    filters.gender !== "any" &&
    GENDER_FILTER[filters.gender] !== result.gender
  )
    return false;
  if (
    filters.ability !== "any" &&
    ABILITY_FILTER[filters.ability] !== result.ability
  )
    return false;
  if ((filters.natureMask & (1 << result.nature)) === 0) return false;
  if (
    (filters.hiddenPowerMask & (1 << gen6EggHiddenPower(result.ivs).type)) ===
    0
  )
    return false;
  if (
    filters.natureInheritance !== "any" &&
    NATURE_PARENT_FILTER[filters.natureInheritance] !==
      NATURE_PARENT_FILTER[result.natureParent]
  )
    return false;
  for (let i = 0; i < 6; i++)
    if (result.ivs[i] < filters.ivMin[i] || result.ivs[i] > filters.ivMax[i])
      return false;
  return true;
}

export function formatGen6EggHex(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}
