export const GEN7_FESTIVAL_PLAZA_API_VERSION = 1;
export const GEN7_FESTIVAL_PLAZA_REQUEST_WORDS = 13;
export const GEN7_FESTIVAL_PLAZA_BASE_RESULT_WORDS = 10;
export const GEN7_FESTIVAL_PLAZA_STEP_SIZE = 16_384;
export const GEN7_FESTIVAL_PLAZA_MAX_RESULTS = 100_000;
export const GEN7_FESTIVAL_PLAZA_MAX_FRAME = 5_000_000;

export type Gen7FestivalPlazaVersion =
  "sun" | "moon" | "ultra-sun" | "ultra-moon";

export interface Gen7FestivalPlazaRequest {
  seed: number;
  minFrame: number;
  maxFrame: number;
  version: Gen7FestivalPlazaVersion;
  npc: number;
  delay: number;
  rank: number;
  starFilter: number;
  facilityFilter: number;
  npcTypeFilter: number;
  colorFilter: number;
  includeNpcStatus: boolean;
  resultLimit: number;
}

export interface Gen7FestivalPlazaResult {
  frame: number;
  actualFrame: number;
  realTimeFrames: number;
  random: bigint;
  star: number;
  facility: number;
  npcType: number;
  color: number;
  blink: number;
  clock: number;
  npcStatus: number[];
}

const VERSION_VALUES: Record<Gen7FestivalPlazaVersion, number> = {
  sun: 0,
  moon: 1,
  "ultra-sun": 2,
  "ultra-moon": 3,
};

export const GEN7_FESTIVAL_PLAZA_FACILITIES = [
  "Big Dream",
  "Gold Rush",
  "Treasure Hunt",
  "Ghosts Den",
  "Trick Room",
  "Confuse Ray",
  "Ball Shop",
  "General Shop",
  "Battle Shop",
  "Soft Drink",
  "Pharmacy",
  "Rare Kitchen",
  "Battle Table",
  "Friendship Cafe",
  "Friendship Parlor",
  "Thump-Bump",
  "Clink-Clunk",
  "Stomp-Stomp",
  "Kanto Tent",
  "Johto Tent",
  "Hoenn Tent",
  "Sinnoh Tent",
  "Unova Tent",
  "Kalos Tent",
  "Pokemon House",
  "Team Red",
  "Team Yellow",
  "Team Green",
  "Team Blue",
  "Team Orange",
  "Team NavyBlue",
  "Team Purple",
  "Team Pink",
  "Switcheroo",
] as const;

export const GEN7_FESTIVAL_PLAZA_NPC_TYPES = [
  "Ace Trainer F",
  "Ace Trainer M",
  "Veteran F",
  "Veteran M",
  "Office Worker M",
  "Office Worker F",
  "Punk Guy",
  "Punk Girl",
  "Breeder M",
  "Breeder F",
  "Youngster",
  "Lass",
] as const;

const FACILITY_POOLS = [
  [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 21, 23,
    24, 25, 27, 29, 31, 33,
  ],
  [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22,
    24, 26, 28, 30, 32, 33,
  ],
  [3, 4, 5, 7, 9, 10, 14, 16, 17, 33],
  [0, 1, 2, 6, 8, 11, 13, 15, 33],
  [0, 1, 2, 9, 10, 11, 12, 14, 16, 19, 21, 23, 25, 27, 29, 31, 33],
  [3, 4, 5, 6, 7, 8, 13, 15, 17, 18, 20, 22, 24, 26, 28, 30, 32, 33],
  [3, 4, 5, 7, 14, 16, 17],
  [0, 1, 2, 11, 13, 15],
  [0, 1, 2, 11, 14, 16, 19, 21, 23, 24, 25, 27, 29, 31],
  [3, 4, 5, 7, 13, 15, 17, 18, 20, 22, 24, 26, 28, 30, 32],
] as const;

function integer(
  value: number,
  name: string,
  minimum: number,
  maximum: number,
) {
  if (!Number.isInteger(value) || value < minimum || value > maximum)
    throw new RangeError(`${name} must be between ${minimum} and ${maximum}.`);
}

export function gen7FestivalPlazaFacilityPool(
  version: Gen7FestivalPlazaVersion,
  star: number,
) {
  if (!(version in VERSION_VALUES))
    throw new RangeError("Unsupported Gen 7 Festival Plaza version.");
  integer(star, "Stars", 1, 5);
  const moon = version === "moon" || version === "ultra-moon";
  const pool: number[] = [
    ...(FACILITY_POOLS[(star - 1) * 2 + (moon ? 1 : 0)] as readonly number[]),
  ];
  if ((version === "sun" || version === "moon") && star <= 3) pool.pop();
  return pool;
}

export function gen7FestivalPlazaFacilityOptions(
  version: Gen7FestivalPlazaVersion,
  starFilter: number,
) {
  integer(starFilter, "Stars", 0, 5);
  return gen7FestivalPlazaFacilityPool(version, starFilter || 1);
}

export function gen7FestivalPlazaResultWords(
  request: Gen7FestivalPlazaRequest,
) {
  return (
    GEN7_FESTIVAL_PLAZA_BASE_RESULT_WORDS +
    (request.includeNpcStatus ? request.npc + 1 : 0)
  );
}

export function validateGen7FestivalPlazaRequest(
  request: Gen7FestivalPlazaRequest,
) {
  if (!(request.version in VERSION_VALUES))
    throw new RangeError("Unsupported Gen 7 Festival Plaza version.");
  integer(request.seed, "Seed", 0, 0xffff_ffff);
  integer(request.minFrame, "Starting frame", 0, 1_000_000_000);
  integer(request.maxFrame, "Maximum frame", 0, GEN7_FESTIVAL_PLAZA_MAX_FRAME);
  if (request.minFrame > request.maxFrame)
    throw new RangeError("Starting frame must not exceed maximum frame.");
  integer(request.npc, "NPC count", 0, 100);
  integer(request.delay, "Delay", 0, 10_000);
  integer(request.rank, "Rank", 0, 18);
  integer(request.starFilter, "Stars", 0, 5);
  integer(request.facilityFilter, "Facility", -1, 33);
  integer(request.npcTypeFilter, "NPC type", -1, 11);
  integer(request.colorFilter, "Color", -1, 3);
  if (typeof request.includeNpcStatus !== "boolean")
    throw new TypeError("NPC status setting must be a boolean.");
  integer(
    request.resultLimit,
    "Result limit",
    1,
    GEN7_FESTIVAL_PLAZA_MAX_RESULTS,
  );
  if (
    request.facilityFilter !== -1 &&
    !gen7FestivalPlazaFacilityOptions(
      request.version,
      request.starFilter,
    ).includes(request.facilityFilter)
  ) {
    throw new RangeError("Facility is unavailable for the selected pool.");
  }
  return request;
}

export function gen7FestivalPlazaTaskCount(request: Gen7FestivalPlazaRequest) {
  validateGen7FestivalPlazaRequest(request);
  return request.maxFrame - request.minFrame + 1;
}

export function encodeGen7FestivalPlazaRequest(
  request: Gen7FestivalPlazaRequest,
) {
  validateGen7FestivalPlazaRequest(request);
  return new Uint32Array([
    request.seed,
    request.minFrame,
    request.maxFrame,
    VERSION_VALUES[request.version],
    request.npc,
    request.delay,
    request.rank,
    request.starFilter,
    request.facilityFilter,
    request.npcTypeFilter,
    request.colorFilter,
    request.includeNpcStatus ? 1 : 0,
    request.resultLimit,
  ]);
}

export function decodeGen7FestivalPlazaResults(
  request: Gen7FestivalPlazaRequest,
  buffer: ArrayBuffer,
) {
  const resultWords = gen7FestivalPlazaResultWords(request);
  if (buffer.byteLength % (resultWords * Uint32Array.BYTES_PER_ELEMENT) !== 0)
    throw new RangeError("Gen 7 Festival Plaza result buffer is misaligned.");
  const words = new Uint32Array(buffer);
  const signedWords = new Int32Array(buffer);
  const results: Gen7FestivalPlazaResult[] = [];
  for (let offset = 0; offset < words.length; offset += resultWords) {
    const random =
      (BigInt(words[offset + 4]) << 32n) | BigInt(words[offset + 3]);
    const npcStatus = request.includeNpcStatus
      ? Array.from(
          signedWords.subarray(
            offset + GEN7_FESTIVAL_PLAZA_BASE_RESULT_WORDS,
            offset + resultWords,
          ),
        )
      : [];
    results.push({
      frame: words[offset],
      actualFrame: words[offset + 1],
      realTimeFrames: words[offset + 2],
      random,
      star: words[offset + 5],
      facility: words[offset + 6],
      npcType: words[offset + 7],
      color: words[offset + 8],
      blink: words[offset + 9],
      clock: Number(random % 17n),
      npcStatus,
    });
  }
  return results;
}

export function validateGen7FestivalPlazaResult(
  request: Gen7FestivalPlazaRequest,
  result: Gen7FestivalPlazaResult,
) {
  integer(result.frame, "Result frame", request.minFrame, request.maxFrame);
  integer(result.actualFrame, "Actual frame", result.frame, 0xffff_ffff);
  integer(result.realTimeFrames, "Real time", 0, 0xffff_ffff);
  if (result.random < 0n || result.random > 0xffff_ffff_ffff_ffffn)
    throw new RangeError("Random Number is outside the 64-bit range.");
  integer(result.star, "Result stars", 1, 5);
  integer(result.facility, "Result facility", 0, 33);
  integer(result.npcType, "Result NPC type", 0, 11);
  integer(result.color, "Result color", 0, 3);
  integer(result.blink, "Blink", 0, 255);
  integer(result.clock, "Clock", 0, 16);
  if (
    !gen7FestivalPlazaFacilityPool(request.version, result.star).includes(
      result.facility,
    )
  ) {
    throw new Error(
      "Gen 7 Festival Plaza result uses an invalid facility pool.",
    );
  }
  if (request.starFilter !== 0 && result.star !== request.starFilter)
    throw new Error("Gen 7 Festival Plaza result does not match Stars.");
  if (
    request.facilityFilter !== -1 &&
    result.facility !== request.facilityFilter
  )
    throw new Error("Gen 7 Festival Plaza result does not match Facility.");
  if (request.npcTypeFilter !== -1 && result.npcType !== request.npcTypeFilter)
    throw new Error("Gen 7 Festival Plaza result does not match NPC.");
  if (request.colorFilter !== -1 && result.color !== request.colorFilter)
    throw new Error("Gen 7 Festival Plaza result does not match Color.");
  if (
    result.npcStatus.length !== (request.includeNpcStatus ? request.npc + 1 : 0)
  )
    throw new Error("Gen 7 Festival Plaza NPC status length is invalid.");
  for (const status of result.npcStatus) integer(status, "NPC status", -5, 36);
  return result;
}

export function formatGen7FestivalPlazaHex64(value: bigint) {
  return value.toString(16).toUpperCase().padStart(16, "0");
}

export function formatGen7FestivalPlazaNpcStatus(values: number[]) {
  return values
    .map((value) => String(value > 0 ? value - 1 : value).padStart(2, " "))
    .join(",");
}

export function formatGen7FestivalPlazaBlinkMark(value: number) {
  return ["-", "★", "?", "? ★", "E"][value] ?? String(value);
}
