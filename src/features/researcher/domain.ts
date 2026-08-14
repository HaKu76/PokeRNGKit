export const RESEARCHER_API_VERSION = 1;
export const RESEARCHER_MAX_ADVANCES = 0xffff_ffff;
export const RESEARCHER_MAX_WEB_STATES = 250_000;
export const RESEARCHER_CHUNK_STATES = 10_000;
export const RESEARCHER_RESULT_WORDS = 23;

export type ResearcherRng =
  | "lcrng"
  | "lcrngReverse"
  | "xdrng"
  | "xdrngReverse"
  | "arng"
  | "arngReverse"
  | "mt"
  | "bwrng"
  | "bwrngReverse"
  | "sfmt"
  | "xoroshiro"
  | "xoroshiroBdsp"
  | "tinymt"
  | "xorshift";

export const researcherRng32: readonly ResearcherRng[] = [
  "lcrng",
  "lcrngReverse",
  "xdrng",
  "xdrngReverse",
  "arng",
  "arngReverse",
  "mt",
];

export const researcherRng64: readonly ResearcherRng[] = [
  "bwrng",
  "bwrngReverse",
  "sfmt",
  "xoroshiro",
  "xoroshiroBdsp",
];

export const researcherRngLabels: Record<ResearcherRng, string> = {
  lcrng: "LCRNG",
  lcrngReverse: "LCRNG[R]",
  xdrng: "XDRNG",
  xdrngReverse: "XDRNG[R]",
  arng: "ARNG",
  arngReverse: "ARNG[R]",
  mt: "Mersenne Twister",
  bwrng: "BWRNG",
  bwrngReverse: "BWRNG[R]",
  sfmt: "SFMT",
  xoroshiro: "Xoroshiro",
  xoroshiroBdsp: "Xoroshiro (BDSP)",
  tinymt: "TinyMT",
  xorshift: "Xorshift",
};

export const researcherRngGroups = [
  { key: "32", label: "32Bit", values: researcherRng32 },
  { key: "64", label: "64Bit", values: researcherRng64 },
  { key: "tiny", label: "TinyMT", values: ["tinymt"] as const },
  { key: "xorshift", label: "Xorshift", values: ["xorshift"] as const },
] as const;

export type ResearcherOperand = number;
export type ResearcherOperator =
  | "*"
  | "/"
  | "%"
  | "+"
  | "-"
  | "<<"
  | ">>"
  | "<"
  | "<="
  | ">"
  | ">="
  | "&"
  | "^"
  | "|";

export const researcherOperators: readonly ResearcherOperator[] = [
  "*",
  "/",
  "%",
  "+",
  "-",
  "<<",
  ">>",
  "<",
  "<=",
  ">",
  ">=",
  "&",
  "^",
  "|",
];

export const researcherOperandLabels: Record<
  number,
  { en: string; zh: string }
> = {
  0: { en: "None", zh: "无" },
  1: { en: "64Bit", zh: "64位" },
  2: { en: "32Bit", zh: "32位" },
  3: { en: "32Bit High", zh: "前32位" },
  4: { en: "32Bit Low", zh: "后32位" },
  5: { en: "16Bit High", zh: "前16位" },
  6: { en: "16Bit Low", zh: "后16位" },
  7: { en: "Previous 64Bit", zh: "Previous 64Bit" },
  8: { en: "Previous 32Bit", zh: "Previous 32Bit" },
  9: { en: "Previous 32Bit High", zh: "Previous 32Bit High" },
  10: { en: "Previous 32Bit Low", zh: "Previous 32Bit Low" },
  11: { en: "Previous 16Bit High", zh: "Previous 16Bit High" },
  12: { en: "Previous 16Bit Low", zh: "Previous 16Bit Low" },
};

for (let index = 1; index <= 10; index++) {
  researcherOperandLabels[12 + index] = {
    en: `Custom ${index}`,
    zh: `自定义${index}`,
  };
  researcherOperandLabels[22 + index] = {
    en: `Previous ${index}`,
    zh: index === 10 ? "Previous 10" : `前${index}`,
  };
}

export interface ResearcherCustomSpec {
  enabled: boolean;
  left: ResearcherOperand;
  operator: ResearcherOperator;
  right: ResearcherOperand | null;
  literal: bigint;
  literalText: string;
  hex: boolean;
}

export interface ResearcherRequest {
  rng: ResearcherRng;
  seedWords: number[];
  initialAdvances: number;
  maxAdvances: number;
  customs: ResearcherCustomSpec[];
}

export interface ResearcherRow {
  advances: number;
  prng: bigint;
  customs: bigint[];
}

export function researcherRngToWasm(rng: ResearcherRng) {
  return [
    "lcrng",
    "lcrngReverse",
    "xdrng",
    "xdrngReverse",
    "arng",
    "arngReverse",
    "mt",
    "bwrng",
    "bwrngReverse",
    "sfmt",
    "xoroshiro",
    "xoroshiroBdsp",
    "tinymt",
    "xorshift",
  ].indexOf(rng);
}

export function isResearcher64Bit(rng: ResearcherRng) {
  return researcherRng64.includes(rng);
}

export function researcherCurrentOperands(rng: ResearcherRng) {
  return isResearcher64Bit(rng) ? [1, 3, 4, 5, 6] : [2, 5, 6];
}

export function researcherBaseOperands(rng: ResearcherRng) {
  return isResearcher64Bit(rng)
    ? [1, 3, 4, 5, 6, 7, 9, 10, 11, 12]
    : [2, 5, 6, 8, 11, 12];
}

export function researcherOperands(
  rng: ResearcherRng,
  index: number,
  includeNone = false,
) {
  const result = [...researcherBaseOperands(rng)];
  for (let value = 1; value <= index; value++) result.push(12 + value);
  for (let value = 1; value <= index; value++) result.push(22 + value);
  if (includeNone) result.unshift(0);
  return result;
}

export function researcherDefaultCustom(
  rng: ResearcherRng,
): ResearcherCustomSpec {
  return {
    enabled: false,
    left: researcherCurrentOperands(rng)[0],
    operator: "+",
    right: null,
    literal: 0n,
    literalText: "",
    hex: false,
  };
}

function validU32(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function normalizeNumericText(text: string) {
  return text.trim().replace(/^0x/i, "");
}

export function parseResearcherSeed32(text: string) {
  const normalized = normalizeNumericText(text);
  if (normalized === "") return 0;
  if (!/^[0-9a-f]{1,8}$/i.test(normalized)) return undefined;
  const value = Number.parseInt(normalized, 16);
  return validU32(value) ? value : undefined;
}

export function parseResearcherSeed64(text: string) {
  const normalized = normalizeNumericText(text);
  if (normalized === "") return 0n;
  if (!/^[0-9a-f]{1,16}$/i.test(normalized)) return undefined;
  const value = BigInt(`0x${normalized}`);
  return value <= 0xffff_ffff_ffff_ffffn ? value : undefined;
}

export function parseResearcherLiteral(text: string, hex: boolean) {
  const normalized = text.trim().replace(/^0x/i, "");
  if (normalized === "") return 0n;
  if (!/^[0-9a-f]{1,10}$/i.test(normalized)) return undefined;
  const controlValue = BigInt(`0x${normalized}`);
  if (controlValue < 1n || controlValue > 0xffff_ffffn) return undefined;
  if (!hex && !/^\d{1,10}$/.test(normalized)) return undefined;
  const value = hex ? controlValue : BigInt(normalized);
  return value <= 0xffff_ffffn ? value : undefined;
}

export function normalizeResearcherLiteralInput(text: string) {
  const normalized = text
    .replace(/^0x/i, "")
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 10)
    .replace(/^0+(?=.)/, "")
    .toUpperCase();
  if (normalized === "") return text === "" ? "" : "1";
  const value = BigInt(`0x${normalized}`);
  if (value < 1n) return "1";
  if (value > 0xffff_ffffn) return "FFFFFFFF";
  return normalized;
}

export function createResearcherSeedWords(
  rng: ResearcherRng,
  values: string[],
) {
  const words = new Uint32Array(8);
  if (rng === "tinymt") {
    for (let index = 0; index < 4; index++) {
      const value = parseResearcherSeed32(values[index] ?? "");
      if (value === undefined) return undefined;
      words[index * 2] = value;
    }
    return Array.from(words);
  }
  if (rng === "xorshift") {
    for (let index = 0; index < 2; index++) {
      const value = parseResearcherSeed64(values[index] ?? "");
      if (value === undefined) return undefined;
      words[index * 2] = Number(value & 0xffff_ffffn);
      words[index * 2 + 1] = Number(value >> 32n);
    }
    return Array.from(words);
  }
  if (isResearcher64Bit(rng)) {
    const value = parseResearcherSeed64(values[0] ?? "");
    if (value === undefined) return undefined;
    words[0] = Number(value & 0xffff_ffffn);
    words[1] = Number(value >> 32n);
    return Array.from(words);
  }
  const value = parseResearcherSeed32(values[0] ?? "");
  if (value === undefined) return undefined;
  words[0] = value;
  return Array.from(words);
}

function validateOperand(
  operand: number,
  index: number,
  rng: ResearcherRng,
  allowNone: boolean,
) {
  if (allowNone && operand === 0) return true;
  return researcherOperands(rng, index).includes(operand);
}

export function validateResearcherRequest(request: ResearcherRequest) {
  const errors: string[] = [];
  if (researcherRngToWasm(request.rng) < 0) errors.push("rng");
  if (
    !Array.isArray(request.seedWords) ||
    request.seedWords.length !== 8 ||
    request.seedWords.some((word) => !validU32(word))
  )
    errors.push("seedWords");
  if (!validU32(request.initialAdvances)) errors.push("initialAdvances");
  if (
    !validU32(request.maxAdvances) ||
    request.maxAdvances > RESEARCHER_MAX_WEB_STATES
  )
    errors.push("maxAdvances");
  if (
    request.maxAdvances > 0 &&
    request.initialAdvances + request.maxAdvances - 1 > RESEARCHER_MAX_ADVANCES
  )
    errors.push("advanceRange");
  if (!Array.isArray(request.customs) || request.customs.length !== 10)
    errors.push("customs");
  request.customs?.forEach((spec, index) => {
    if (
      typeof spec !== "object" ||
      spec === null ||
      typeof spec.enabled !== "boolean" ||
      !validateOperand(spec.left, index, request.rng, false) ||
      !researcherOperators.includes(spec.operator) ||
      !validateOperand(spec.right ?? 0, index, request.rng, true) ||
      typeof spec.literal !== "bigint" ||
      spec.literal < 0n ||
      spec.literal > 0xffff_ffffn
    )
      errors.push(`custom${index + 1}`);
  });
  return errors;
}

export function packResearcherSeeds(words: number[]) {
  return Uint32Array.from(words);
}

export function packResearcherCustoms(customs: ResearcherCustomSpec[]) {
  const words = new Uint32Array(customs.length * 6);
  customs.forEach((spec, index) => {
    const offset = index * 6;
    words[offset] = spec.enabled ? 1 : 0;
    words[offset + 1] = spec.left;
    words[offset + 2] = researcherOperators.indexOf(spec.operator);
    words[offset + 3] = spec.right ?? 0;
    words[offset + 4] = Number(spec.literal & 0xffff_ffffn);
    words[offset + 5] = Number(spec.literal >> 32n);
  });
  return words;
}

export function decodeResearcherRows(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % RESEARCHER_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Researcher result buffer length.");
  return Array.from(
    { length: words.length / RESEARCHER_RESULT_WORDS },
    (_, index) => {
      const offset = index * RESEARCHER_RESULT_WORDS;
      const customs = Array.from({ length: 10 }, (_, custom) => {
        const customOffset = offset + 3 + custom * 2;
        return (
          BigInt(words[customOffset]) | (BigInt(words[customOffset + 1]) << 32n)
        );
      });
      return {
        advances: words[offset],
        prng: BigInt(words[offset + 1]) | (BigInt(words[offset + 2]) << 32n),
        customs,
      } satisfies ResearcherRow;
    },
  );
}

export function researcherOperandValue(
  row: ResearcherRow,
  operand: number,
  rng: ResearcherRng,
  previous?: ResearcherRow,
) {
  const source = operand >= 7 && operand <= 12 ? previous : row;
  if (!source) return 0n;
  switch (operand) {
    case 1:
    case 2:
    case 7:
    case 8:
      return source.prng;
    case 3:
    case 9:
      return source.prng >> 32n;
    case 4:
    case 10:
      return source.prng & 0xffff_ffffn;
    case 5:
    case 11:
      return isResearcher64Bit(rng) ? source.prng >> 48n : source.prng >> 16n;
    case 6:
    case 12:
      return isResearcher64Bit(rng)
        ? (source.prng >> 32n) & 0xffffn
        : source.prng & 0xffffn;
    default:
      if (operand >= 13 && operand <= 22)
        return row.customs[operand - 13] ?? 0n;
      if (operand >= 23 && operand <= 32)
        return previous?.customs[operand - 23] ?? 0n;
      return 0n;
  }
}

export function researcherSearchValue(
  row: ResearcherRow,
  operand: number,
  rng: ResearcherRng,
) {
  return researcherOperandValue(row, operand, rng);
}

export function formatResearcherValue(value: bigint, hex: boolean, width = 0) {
  if (!hex) return value.toString(10);
  return value.toString(16).toUpperCase().padStart(width, "0");
}

export function researcherRngSeedCount(rng: ResearcherRng) {
  if (rng === "tinymt") return 4;
  if (rng === "xorshift") return 2;
  return 1;
}
