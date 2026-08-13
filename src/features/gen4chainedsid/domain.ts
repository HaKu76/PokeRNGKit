export const GEN4_CHAINED_SID_API_VERSION = 1;
export const GEN4_CHAINED_SID_MAX_ENTRIES = 1024;
export const GEN4_CHAINED_SID_INITIAL_RESULTS = 8192;
export const GEN4_CHAINED_SID_ENTRY_WORDS = 12;
export const GEN4_CHAINED_SID_STAT_MAXIMUMS = [
  651, 435, 545, 435, 545, 435,
] as const;

export type Gen4ChainedSidIvs = [
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface Gen4ChainedSidEntry {
  ivs: Gen4ChainedSidIvs;
  ability: number;
  gender: number;
  nature: number;
  ability0: number;
  ability1: number;
  genderRatio: number;
}

export interface Gen4ChainedSidRequest {
  tid: number;
  entries: Gen4ChainedSidEntry[];
}

export interface Gen4ChainedSidChunk {
  index: 0;
  stateCount: number;
}

function isIntegerBetween(value: number, minimum: number, maximum: number) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

export function validateGen4ChainedSidEntry(entry: Gen4ChainedSidEntry) {
  if (
    entry.ivs.length !== 6 ||
    entry.ivs.some(
      (value, index) =>
        !isIntegerBetween(value, 0, GEN4_CHAINED_SID_STAT_MAXIMUMS[index]),
    )
  )
    return false;
  if (
    !isIntegerBetween(entry.ability, 0, 0xffff) ||
    !isIntegerBetween(entry.ability0, 0, 0xffff) ||
    !isIntegerBetween(entry.ability1, 0, 0xffff) ||
    (entry.ability !== entry.ability0 && entry.ability !== entry.ability1)
  )
    return false;
  return (
    isIntegerBetween(entry.gender, 0, 2) &&
    isIntegerBetween(entry.nature, 0, 24) &&
    isIntegerBetween(entry.genderRatio, 0, 0xff)
  );
}

export function validateGen4ChainedSidRequest(request: Gen4ChainedSidRequest) {
  const errors: string[] = [];
  if (!isIntegerBetween(request.tid, 0, 0xffff)) errors.push("tid");
  if (
    request.entries.length > GEN4_CHAINED_SID_MAX_ENTRIES ||
    request.entries.some((entry) => !validateGen4ChainedSidEntry(entry))
  )
    errors.push("entries");
  return errors;
}

export function packGen4ChainedSidEntries(
  entries: readonly Gen4ChainedSidEntry[],
) {
  const words = new Uint32Array(entries.length * GEN4_CHAINED_SID_ENTRY_WORDS);
  entries.forEach((entry, row) => {
    const offset = row * GEN4_CHAINED_SID_ENTRY_WORDS;
    words.set(entry.ivs, offset);
    words[offset + 6] = entry.ability;
    words[offset + 7] = entry.gender;
    words[offset + 8] = entry.nature;
    words[offset + 9] = entry.ability0;
    words[offset + 10] = entry.ability1;
    words[offset + 11] = entry.genderRatio;
  });
  return words;
}

export function decodeGen4ChainedSidResults(buffer: ArrayBuffer) {
  if (buffer.byteLength % 4 !== 0)
    throw new RangeError("Invalid Gen4 chained SID result buffer length.");
  return Array.from(new Uint32Array(buffer));
}

export function gen4ChainedSidChunk(
  request: Gen4ChainedSidRequest,
): Gen4ChainedSidChunk {
  return { index: 0, stateCount: request.entries.length };
}
