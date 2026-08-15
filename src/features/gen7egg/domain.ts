export const GEN7_EGG_API_VERSION = 1;
export const GEN7_EGG_REQUEST_WORDS = 187;
export const GEN7_EGG_RESULT_WORDS = 20;
export const GEN7_EGG_MAX_FRAME = 1_000_000_000;
export const GEN7_EGG_MAX_SHORTEST_PATH_FRAME = 5_000_000;
export const GEN7_EGG_MAX_EGGS = 10_000;
export const GEN7_EGG_MAX_RESULTS = 100_000;
export const GEN7_EGG_STEP_SIZE = 16_384;
export const GEN7_EGG_OTHER_TSV_WORDS = 128;

export type Gen7EggMode = "frames" | "egg-list" | "shortest-path";
export type Gen7EggIvTuple = [number, number, number, number, number, number];
export type Gen7EggState = [number, number, number, number];
export type Gen7EggItem =
  | "none"
  | "everstone"
  | "destiny-knot"
  | "power-hp"
  | "power-attack"
  | "power-defense"
  | "power-special-attack"
  | "power-special-defense"
  | "power-speed";
export type Gen7EggGenderRatio =
  | "genderless"
  | "one-to-one"
  | "seven-to-one"
  | "three-to-one"
  | "one-to-three"
  | "one-to-seven"
  | "male-only"
  | "female-only";
export type Gen7EggShinyFilter = "any" | "shiny" | "square";
export type Gen7EggGenderFilter = "any" | "male" | "female";
export type Gen7EggAbilityFilter = "any" | "1" | "2" | "hidden";
export type Gen7EggParentFilter = "any" | "male" | "female";
export type Gen7EggAction = "none" | "accept" | "reject";

export interface Gen7EggParent {
  ivs: Gen7EggIvTuple;
  item: Gen7EggItem;
  ability: 0 | 1 | 2;
  ditto: boolean;
}

export interface Gen7EggFilters {
  disabled: boolean;
  shiny: Gen7EggShinyFilter;
  gender: Gen7EggGenderFilter;
  ability: Gen7EggAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: Gen7EggIvTuple;
  ivMax: Gen7EggIvTuple;
  perfectIvValue: number;
  perfectIvCount: number;
  ball: Gen7EggParentFilter;
  natureInheritance: Gen7EggParentFilter;
}

interface Gen7EggRequestBase {
  state: Gen7EggState;
  tsv: number;
  trv: number;
  male: Gen7EggParent;
  female: Gen7EggParent;
  genderRatio: Gen7EggGenderRatio;
  shinyCharm: boolean;
  masudaMethod: boolean;
  nidoType: boolean;
  homogeneous: boolean;
  considerOtherTsv: boolean;
  otherTsvs: readonly number[];
  shinyReminder: boolean;
  filters: Gen7EggFilters;
  resultLimit: number;
}

export interface Gen7EggFrameRequest extends Gen7EggRequestBase {
  mode: "frames";
  minFrame: number;
  maxFrame: number;
}

export interface Gen7EggListRequest extends Gen7EggRequestBase {
  mode: "egg-list";
  minEgg: number;
  maxEgg: number;
  targetFrame: number;
}

export interface Gen7EggShortestPathRequest extends Gen7EggRequestBase {
  mode: "shortest-path";
  targetFrame: number;
}

export type Gen7EggRequest =
  Gen7EggFrameRequest | Gen7EggListRequest | Gen7EggShortestPathRequest;

export interface Gen7EggResult {
  frame: number;
  eggNumber: number;
  state: Gen7EggState;
  afterState: Gen7EggState;
  random: number;
  ec: number;
  pid: number;
  ivs: Gen7EggIvTuple;
  nature: number;
  ability: number;
  gender: number;
  hiddenPower: number;
  shiny: boolean;
  squareShiny: boolean;
  ball: Gen7EggParentFilter;
  natureParent: Gen7EggParentFilter;
  action: Gen7EggAction;
  framesUsed: number;
  inheritedMaleMask: number;
  inheritedFemaleMask: number;
  psv: number;
  prv: number;
}

const MODE_CODE: Record<Gen7EggMode, number> = {
  frames: 0,
  "egg-list": 1,
  "shortest-path": 2,
};
const ITEM_CODE: Record<Gen7EggItem, number> = {
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
const GENDER_RATIO_CODE: Record<Gen7EggGenderRatio, number> = {
  genderless: 0,
  "one-to-one": 126,
  "seven-to-one": 30,
  "three-to-one": 62,
  "one-to-three": 190,
  "one-to-seven": 224,
  "male-only": 1,
  "female-only": 2,
};
const GENDER_FILTER_CODE: Record<Gen7EggGenderFilter, number> = {
  any: 0,
  male: 1,
  female: 2,
};
const ABILITY_FILTER_CODE: Record<Gen7EggAbilityFilter, number> = {
  any: 0,
  "1": 1,
  "2": 2,
  hidden: 3,
};
const PARENT_FILTER_CODE: Record<Gen7EggParentFilter, number> = {
  any: 0,
  male: 1,
  female: 2,
};
const ACTIONS: readonly Gen7EggAction[] = ["none", "accept", "reject"];
const PARENTS: readonly Gen7EggParentFilter[] = ["any", "male", "female"];

function assertInteger(
  value: number,
  label: string,
  minimum: number,
  maximum: number,
) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(
      `${label} must be an integer between ${minimum} and ${maximum}.`,
    );
  }
}

function assertBoolean(value: boolean, label: string) {
  if (typeof value !== "boolean")
    throw new TypeError(`${label} must be boolean.`);
}

function validateParent(parent: Gen7EggParent, label: string) {
  if (!(parent.item in ITEM_CODE))
    throw new RangeError(`Unsupported ${label} item.`);
  assertInteger(parent.ability, `${label} ability`, 0, 2);
  assertBoolean(parent.ditto, `${label} Ditto`);
  parent.ivs.forEach((value, index) =>
    assertInteger(value, `${label} IV ${index}`, 0, 31),
  );
}

export function validateGen7EggRequest(request: Gen7EggRequest) {
  request.state.forEach((value, index) =>
    assertInteger(value, `TinyMT state ${index}`, 0, 0xffff_ffff),
  );
  assertInteger(request.tsv, "TSV", 0, 4095);
  assertInteger(request.trv, "TRV", 0, 15);
  validateParent(request.male, "Male parent");
  validateParent(request.female, "Female parent");
  if (!(request.genderRatio in GENDER_RATIO_CODE)) {
    throw new RangeError("Unsupported egg gender ratio.");
  }
  assertBoolean(request.shinyCharm, "Shiny Charm");
  assertBoolean(request.masudaMethod, "Masuda Method");
  assertBoolean(request.nidoType, "Nido Type");
  assertBoolean(request.homogeneous, "Homogeneity");
  assertBoolean(request.considerOtherTsv, "Consider Other TSV");
  assertBoolean(request.shinyReminder, "Shiny Reminder");
  if (request.male.ditto && request.female.ditto) {
    throw new RangeError("Both parents cannot be Ditto.");
  }
  if (
    (request.genderRatio === "genderless" ||
      request.genderRatio === "male-only") &&
    (!request.female.ditto || request.male.ditto)
  ) {
    throw new RangeError(
      "Genderless and male-only species require the female parent to be Ditto.",
    );
  }
  if (request.genderRatio === "female-only" && request.female.ditto) {
    throw new RangeError(
      "Female-only species cannot use Ditto as the female parent.",
    );
  }
  if (request.nidoType && request.genderRatio !== "one-to-one") {
    throw new RangeError("Nido Type requires the 1:1 gender ratio.");
  }
  if (
    request.homogeneous &&
    (request.nidoType ||
      request.male.ditto ||
      request.female.ditto ||
      request.genderRatio === "female-only")
  ) {
    throw new RangeError(
      "Homogeneity is unavailable for these parent settings.",
    );
  }
  request.otherTsvs.forEach((value, index) =>
    assertInteger(value, `Other TSV ${index + 1}`, 0, 4095),
  );
  const hasPidRerolls = request.shinyCharm || request.masudaMethod;
  if (request.considerOtherTsv && !hasPidRerolls) {
    throw new RangeError(
      "Other TSV shiny checks require Shiny Charm or Masuda Method.",
    );
  }
  assertInteger(request.resultLimit, "Result limit", 1, GEN7_EGG_MAX_RESULTS);

  if (request.mode === "frames") {
    assertInteger(request.minFrame, "Initial Frame", 0, GEN7_EGG_MAX_FRAME);
    assertInteger(
      request.maxFrame,
      "Max Frame",
      request.minFrame,
      GEN7_EGG_MAX_FRAME,
    );
  } else if (request.mode === "egg-list") {
    assertInteger(request.minEgg, "Minimum Egg", 1, GEN7_EGG_MAX_EGGS);
    assertInteger(
      request.maxEgg,
      "Maximum Egg",
      request.minEgg,
      GEN7_EGG_MAX_EGGS,
    );
    assertInteger(request.targetFrame, "Target Frame", 0, GEN7_EGG_MAX_FRAME);
  } else {
    assertInteger(request.targetFrame, "Target Frame", 0, GEN7_EGG_MAX_FRAME);
  }
  if (request.shinyReminder && (request.mode !== "frames" || !hasPidRerolls)) {
    throw new RangeError(
      "Shiny Reminder requires Frame Range with Shiny Charm or Masuda Method.",
    );
  }

  const filters = request.filters;
  assertBoolean(filters.disabled, "Ignore Filters");
  if (!(
    filters.shiny === "any" ||
    filters.shiny === "shiny" ||
    filters.shiny === "square"
  )) {
    throw new RangeError("Unsupported shiny filter.");
  }
  if (!(filters.gender in GENDER_FILTER_CODE)) {
    throw new RangeError("Unsupported gender filter.");
  }
  if (!(filters.ability in ABILITY_FILTER_CODE)) {
    throw new RangeError("Unsupported ability filter.");
  }
  if (!(filters.ball in PARENT_FILTER_CODE))
    throw new RangeError("Unsupported ball filter.");
  if (!(filters.natureInheritance in PARENT_FILTER_CODE)) {
    throw new RangeError("Unsupported nature inheritance filter.");
  }
  assertInteger(filters.natureMask, "Nature filter", 0, 0x1ff_ffff);
  assertInteger(filters.hiddenPowerMask, "Hidden Power filter", 0, 0xffff);
  filters.ivMin.forEach((value, index) =>
    assertInteger(value, `IV minimum ${index}`, 0, 31),
  );
  filters.ivMax.forEach((value, index) => {
    assertInteger(value, `IV maximum ${index}`, 0, 31);
    if (value < filters.ivMin[index]) {
      throw new RangeError(`IV range ${index} is reversed.`);
    }
  });
  assertInteger(filters.perfectIvValue, "Perfect IV Value", 0, 31);
  assertInteger(filters.perfectIvCount, "Perfect IV Count", 0, 6);
  if (request.considerOtherTsv && filters.shiny === "any") {
    throw new RangeError("Other TSV shiny checks require the shiny filter.");
  }
  const hasEverstone =
    request.male.item === "everstone" || request.female.item === "everstone";
  if (!hasEverstone && filters.natureInheritance !== "any") {
    throw new RangeError(
      "Nature inheritance filtering requires an Everstone parent.",
    );
  }
  if (
    hasEverstone &&
    filters.natureMask !== 0 &&
    filters.natureMask !== 0x1ff_ffff
  ) {
    throw new RangeError(
      "Nature filtering is replaced by parent inheritance when Everstone is held.",
    );
  }
  return request;
}

export function validateGen7EggExecutionRequest(request: Gen7EggRequest) {
  validateGen7EggRequest(request);
  if (
    request.mode === "shortest-path" &&
    request.targetFrame > GEN7_EGG_MAX_SHORTEST_PATH_FRAME
  ) {
    throw new RangeError(
      `Shortest Path target exceeds the browser limit of ${GEN7_EGG_MAX_SHORTEST_PATH_FRAME}.`,
    );
  }
  return request;
}

export function gen7EggTaskCount(request: Gen7EggRequest) {
  if (request.mode === "frames") return request.maxFrame - request.minFrame + 1;
  if (request.mode === "egg-list") return request.maxEgg;
  return request.targetFrame + 1;
}

export function encodeGen7EggRequest(request: Gen7EggRequest) {
  validateGen7EggRequest(request);
  const otherTsvMask = Array<number>(GEN7_EGG_OTHER_TSV_WORDS).fill(0);
  request.otherTsvs.forEach((tsv) => {
    otherTsvMask[tsv >>> 5] |= 1 << (tsv & 31);
  });
  const filters = request.filters;
  const rangeStart =
    request.mode === "frames"
      ? request.minFrame
      : request.mode === "egg-list"
        ? request.minEgg
        : 0;
  const rangeEnd =
    request.mode === "frames"
      ? request.maxFrame
      : request.mode === "egg-list"
        ? request.maxEgg
        : 0;
  const targetFrame = request.mode === "frames" ? 0 : request.targetFrame;
  return Uint32Array.from([
    MODE_CODE[request.mode],
    ...request.state,
    rangeStart,
    rangeEnd,
    targetFrame,
    request.resultLimit,
    request.tsv,
    request.trv,
    ...request.male.ivs,
    ...request.female.ivs,
    ITEM_CODE[request.male.item],
    ITEM_CODE[request.female.item],
    request.male.ability,
    request.female.ability,
    GENDER_RATIO_CODE[request.genderRatio],
    Number(request.shinyCharm),
    Number(request.masudaMethod),
    Number(request.nidoType),
    Number(request.homogeneous),
    Number(request.male.ditto),
    Number(request.female.ditto),
    Number(request.considerOtherTsv),
    Number(request.shinyReminder),
    ...otherTsvMask,
    Number(filters.disabled),
    Number(filters.shiny !== "any"),
    Number(filters.shiny === "square"),
    GENDER_FILTER_CODE[filters.gender],
    ABILITY_FILTER_CODE[filters.ability],
    filters.natureMask,
    filters.hiddenPowerMask,
    ...filters.ivMin,
    ...filters.ivMax,
    filters.perfectIvValue,
    filters.perfectIvCount,
    PARENT_FILTER_CODE[filters.ball],
    PARENT_FILTER_CODE[filters.natureInheritance],
  ]);
}

function decodeIvs(value: number) {
  return [0, 1, 2, 3, 4, 5].map(
    (index) => (value >>> (index * 5)) & 0x1f,
  ) as Gen7EggIvTuple;
}

export function decodeGen7EggResults(buffer: ArrayBuffer) {
  if (
    buffer.byteLength %
      (GEN7_EGG_RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT) !==
    0
  ) {
    throw new RangeError("Gen 7 Egg result buffer has an invalid length.");
  }
  const words = new Uint32Array(buffer);
  const results: Gen7EggResult[] = [];
  for (let offset = 0; offset < words.length; offset += GEN7_EGG_RESULT_WORDS) {
    const metadata = words[offset + 14];
    results.push({
      frame: words[offset],
      eggNumber: words[offset + 1],
      state: [
        words[offset + 2],
        words[offset + 3],
        words[offset + 4],
        words[offset + 5],
      ],
      afterState: [
        words[offset + 6],
        words[offset + 7],
        words[offset + 8],
        words[offset + 9],
      ],
      random: words[offset + 10],
      ec: words[offset + 11],
      pid: words[offset + 12],
      ivs: decodeIvs(words[offset + 13]),
      nature: metadata & 0x1f,
      ability: (metadata >>> 5) & 0x3,
      gender: (metadata >>> 7) & 0x3,
      hiddenPower: (metadata >>> 9) & 0xf,
      shiny: ((metadata >>> 13) & 1) === 1,
      squareShiny: ((metadata >>> 14) & 1) === 1,
      ball: PARENTS[(metadata >>> 15) & 0x3] ?? "any",
      natureParent: PARENTS[(metadata >>> 17) & 0x3] ?? "any",
      action: ACTIONS[(metadata >>> 19) & 0x3] ?? "none",
      framesUsed: words[offset + 15],
      inheritedMaleMask: words[offset + 16],
      inheritedFemaleMask: words[offset + 17],
      psv: words[offset + 18],
      prv: words[offset + 19],
    });
  }
  return results;
}

export function validateGen7EggResult(result: Gen7EggResult) {
  assertInteger(result.frame, "Result frame", 0, GEN7_EGG_MAX_FRAME);
  assertInteger(result.eggNumber, "Result egg number", 0, GEN7_EGG_MAX_EGGS);
  result.state.forEach((value, index) =>
    assertInteger(value, `Result state ${index}`, 0, 0xffff_ffff),
  );
  result.afterState.forEach((value, index) =>
    assertInteger(value, `Result after state ${index}`, 0, 0xffff_ffff),
  );
  result.ivs.forEach((value, index) =>
    assertInteger(value, `Result IV ${index}`, 0, 31),
  );
  assertInteger(result.nature, "Result nature", 0, 24);
  assertInteger(result.ability, "Result ability", 1, 3);
  assertInteger(result.gender, "Result gender", 0, 2);
  assertInteger(result.hiddenPower, "Result Hidden Power", 0, 15);
  assertInteger(result.framesUsed, "Result advances", 2, 0xffff_ffff);
  assertInteger(result.inheritedMaleMask, "Male inheritance mask", 0, 0x3f);
  assertInteger(result.inheritedFemaleMask, "Female inheritance mask", 0, 0x3f);
  assertInteger(result.psv, "Result PSV", 0, 4095);
  assertInteger(result.prv, "Result PRV", 0, 15);
  return result;
}

export function gen7EggResultPassesFilters(
  request: Gen7EggRequest,
  result: Gen7EggResult,
) {
  if (request.mode === "shortest-path" || request.filters.disabled) return true;
  const filters = request.filters;
  if (filters.shiny !== "any" && !result.shiny) return false;
  if (filters.shiny === "square" && !result.squareShiny) return false;
  if (
    filters.gender !== "any" &&
    result.gender !== GENDER_FILTER_CODE[filters.gender]
  )
    return false;
  if (
    filters.ability !== "any" &&
    result.ability !== ABILITY_FILTER_CODE[filters.ability]
  )
    return false;
  if (filters.ball !== "any" && result.ball !== filters.ball) return false;
  if (
    filters.natureInheritance !== "any" &&
    result.natureParent !== filters.natureInheritance
  ) {
    return false;
  }
  if (
    filters.natureMask !== 0 &&
    (filters.natureMask & (1 << result.nature)) === 0
  )
    return false;
  if (
    filters.hiddenPowerMask !== 0 &&
    (filters.hiddenPowerMask & (1 << result.hiddenPower)) === 0
  ) {
    return false;
  }
  if (
    result.ivs.some(
      (iv, index) => iv < filters.ivMin[index] || iv > filters.ivMax[index],
    )
  ) {
    return false;
  }
  return (
    result.ivs.filter((iv) => iv >= filters.perfectIvValue).length >=
    filters.perfectIvCount
  );
}

export function parseGen7EggHex(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? 0 : Number.parseInt(trimmed, 16);
}

export function parseGen7EggDecimal(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? 0 : Number.parseInt(trimmed, 10);
}

export function parseGen7EggTsvList(value: string) {
  return value
    .split(/[\s,]+/)
    .filter((token) => /^\d+$/.test(token))
    .map(Number)
    .filter((tsv) => tsv >= 0 && tsv <= 4095);
}

export function getGen7EggResultStateUpdate(
  result: Gen7EggResult,
  targetFrame: number,
  after: boolean,
) {
  assertInteger(targetFrame, "Target Frame", 0, GEN7_EGG_MAX_FRAME);
  const consumed = result.frame + (after ? result.framesUsed : 0);
  const remaining = targetFrame - consumed;
  return {
    state: [...(after ? result.afterState : result.state)] as Gen7EggState,
    targetFrame: remaining > 0 ? remaining : targetFrame,
  };
}

export function formatGen7EggHex32(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function formatGen7EggState(state: Gen7EggState) {
  return [...state].reverse().map(formatGen7EggHex32).join(",");
}
