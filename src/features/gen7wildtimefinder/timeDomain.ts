export type Gen7WildTimeVersion = "sun" | "moon" | "ultra-sun" | "ultra-moon";
export type Gen7WildTimeEncounter = "grass" | "fish";
export type Gen7WildTimeIvTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface Gen7WildTimeFilters {
  disabled: boolean;
  shiny: "any" | "shiny" | "square";
  gender: "any" | "male" | "female";
  ability: "any" | "first" | "second" | "hidden";
  natureMask: number;
  hiddenPowerMask: number;
  slotMask: number;
  ivMin: Gen7WildTimeIvTuple;
  ivMax: Gen7WildTimeIvTuple;
}

export interface Gen7WildTimeRequest {
  version: Gen7WildTimeVersion;
  startEpoch: bigint;
  endEpoch: bigint;
  tick: number;
  offset: number;
  minFrame: number;
  maxFrame: number;
  encounter: Gen7WildTimeEncounter;
  synchronize: boolean;
  synchronizeNature: number;
  genderRatio: number;
  tid: number;
  sid: number;
  shinyCharm: boolean;
  filters: Gen7WildTimeFilters;
  resultLimit: number;
}

export interface Gen7WildTimeResult {
  epoch: bigint;
  initialSeed: number;
  frame: number;
  ec: number;
  pid: number;
  ivs: Gen7WildTimeIvTuple;
  nature: number;
  ability: number;
  gender: number;
  hiddenPower: number;
  shiny: number;
  slot: number;
}

export const GEN7_WILD_TIME_API_VERSION = 1;
export const GEN7_WILD_TIME_REQUEST_WORDS = 30;
export const GEN7_WILD_TIME_RESULT_WORDS = 9;
export const GEN7_WILD_TIME_STEP_SIZE = 2048;
export const GEN7_WILD_TIME_MAX_FRAME = 5_000_000;
export const GEN7_WILD_TIME_MAX_RESULTS = 100_000;
export const GEN7_WILD_TIME_MAX_STATES = 5_000_000;
const EPOCH_OFFSET = 946_684_800_000n;

export function epochFromInput(value: string, offset: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value,
  );
  if (!match) return Number.NaN;
  const parts = match.slice(1).map((part) => Number(part ?? 0));
  const milliseconds = Date.UTC(
    parts[0],
    parts[1] - 1,
    parts[2],
    parts[3],
    parts[4],
    parts[5],
  );
  const normalized = new Date(milliseconds);
  if (
    normalized.getUTCFullYear() !== parts[0] ||
    normalized.getUTCMonth() !== parts[1] - 1 ||
    normalized.getUTCDate() !== parts[2] ||
    normalized.getUTCHours() !== parts[3] ||
    normalized.getUTCMinutes() !== parts[4] ||
    normalized.getUTCSeconds() !== parts[5]
  )
    return Number.NaN;
  return BigInt(milliseconds) + BigInt(offset) - EPOCH_OFFSET;
}

export function formatEpoch(epoch: bigint, offset: number) {
  return new Date(Number(epoch + EPOCH_OFFSET - BigInt(offset)))
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

export function validateGen7WildTimeRequest(request: Gen7WildTimeRequest) {
  if (
    !Number.isInteger(request.tick) ||
    request.tick < 0 ||
    request.tick > 0xffff_ffff
  )
    throw new RangeError("Tick is outside 32-bit range.");
  if (
    !Number.isInteger(request.offset) ||
    request.offset < 0 ||
    request.offset > 0xffff_ffff
  )
    throw new RangeError("Offset is outside 32-bit range.");
  if (
    request.startEpoch < 0n ||
    request.endEpoch < request.startEpoch ||
    (request.startEpoch - BigInt(request.offset)) % 1000n !== 0n
  )
    throw new RangeError("Invalid time range.");
  if (
    !Number.isInteger(request.minFrame) ||
    request.minFrame < 1 ||
    request.maxFrame < request.minFrame ||
    request.maxFrame > GEN7_WILD_TIME_MAX_FRAME
  )
    throw new RangeError("Invalid frame range.");
  if (!["sun", "moon", "ultra-sun", "ultra-moon"].includes(request.version))
    throw new RangeError("Invalid version.");
  if (!["grass", "fish"].includes(request.encounter))
    throw new RangeError("Invalid encounter type.");
  if (
    !Number.isInteger(request.genderRatio) ||
    ![0, 31, 63, 127, 191, 254, 255].includes(request.genderRatio)
  )
    throw new RangeError("Invalid gender ratio.");
  if (request.synchronizeNature < 0 || request.synchronizeNature > 24)
    throw new RangeError("Invalid synchronize nature.");
  if (
    request.tid < 0 ||
    request.tid > 65535 ||
    request.sid < 0 ||
    request.sid > 65535
  )
    throw new RangeError("TID/SID is outside range.");
  const seconds = (request.endEpoch - request.startEpoch) / 1000n + 1n;
  const stateCount = seconds * BigInt(request.maxFrame - request.minFrame + 1);
  if (stateCount > BigInt(GEN7_WILD_TIME_MAX_STATES))
    throw new RangeError(
      "Wild Time Finder range exceeds the browser task limit.",
    );
  const filters = request.filters;
  if (
    filters.natureMask < 0 ||
    filters.natureMask > 0x1ff_ffff ||
    filters.hiddenPowerMask < 0 ||
    filters.hiddenPowerMask > 0xffff ||
    filters.slotMask < 0 ||
    filters.slotMask > 0x3ff
  )
    throw new RangeError("Invalid filter mask.");
  for (let index = 0; index < 6; index++)
    if (
      filters.ivMin[index] < 0 ||
      filters.ivMax[index] > 31 ||
      filters.ivMin[index] > filters.ivMax[index]
    )
      throw new RangeError("Invalid IV range.");
  if (
    request.resultLimit < 1 ||
    request.resultLimit > GEN7_WILD_TIME_MAX_RESULTS
  )
    throw new RangeError("Invalid result limit.");
  return request;
}

export function encodeRequest(request: Gen7WildTimeRequest, seed: number) {
  validateGen7WildTimeRequest(request);
  const words = new Uint32Array(GEN7_WILD_TIME_REQUEST_WORDS);
  words.set([
    seed >>> 0,
    request.minFrame,
    request.maxFrame,
    request.encounter === "grass" ? 0 : 1,
    Number(request.synchronize),
    request.synchronizeNature,
    request.genderRatio,
    request.tid,
    request.sid,
    Number(request.shinyCharm),
    Number(request.filters.disabled),
    { any: 0, shiny: 1, square: 2 }[request.filters.shiny],
    { any: 0, male: 1, female: 2 }[request.filters.gender],
    { any: 0, first: 1, second: 2, hidden: 3 }[request.filters.ability],
    request.filters.natureMask,
    request.filters.hiddenPowerMask,
    request.filters.slotMask,
    ...request.filters.ivMin,
    ...request.filters.ivMax,
    request.resultLimit,
  ]);
  return words;
}

export function decodeResults(buffer: ArrayBuffer): Gen7WildTimeResult[] {
  const words = new Uint32Array(buffer);
  if (words.length % GEN7_WILD_TIME_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Wild Time Finder result buffer.");
  const results: Gen7WildTimeResult[] = [];
  for (let offset = 0; offset < words.length; offset += 9) {
    const metadata = words[offset + 4];
    const ivWord = words[offset + 3];
    results.push({
      epoch: (BigInt(words[offset + 8]) << 32n) | BigInt(words[offset + 7]),
      initialSeed: words[offset + 6],
      frame: words[offset],
      ec: words[offset + 1],
      pid: words[offset + 2],
      ivs: [0, 1, 2, 3, 4, 5].map(
        (index) => (ivWord >>> (index * 5)) & 31,
      ) as Gen7WildTimeIvTuple,
      nature: metadata & 31,
      ability: (metadata >>> 5) & 3,
      gender: (metadata >>> 7) & 3,
      hiddenPower: (metadata >>> 9) & 15,
      shiny: (metadata >>> 14) & 1 ? 2 : (metadata >>> 13) & 1,
      slot: words[offset + 5] >>> 0,
    });
  }
  return results;
}

export function resultPassesFilters(
  request: Gen7WildTimeRequest,
  result: Gen7WildTimeResult,
) {
  const filters = request.filters;
  if (filters.disabled) return true;
  if (
    (filters.shiny === "shiny" && result.shiny === 0) ||
    (filters.shiny === "square" && result.shiny !== 2)
  )
    return false;
  if (
    filters.gender !== "any" &&
    result.gender !== (filters.gender === "male" ? 1 : 2)
  )
    return false;
  if (
    filters.ability !== "any" &&
    result.ability !== { first: 1, second: 2, hidden: 3 }[filters.ability]
  )
    return false;
  if (filters.natureMask !== 0 && !(filters.natureMask & (1 << result.nature)))
    return false;
  if (
    filters.hiddenPowerMask !== 0 &&
    !(filters.hiddenPowerMask & (1 << result.hiddenPower))
  )
    return false;
  if (filters.slotMask !== 0 && !(filters.slotMask & (1 << (result.slot - 1))))
    return false;
  return result.ivs.every(
    (iv, index) => iv >= filters.ivMin[index] && iv <= filters.ivMax[index],
  );
}
