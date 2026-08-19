export const GEN6_TINYTIMELINE_API_VERSION = 1;
export const GEN6_TINYTIMELINE_REQUEST_WORDS = 22;
export const GEN6_TINYTIMELINE_RESULT_WORDS = 16;
export const GEN6_TINYTIMELINE_MAX_FRAME = 1_000_000_000;
export const GEN6_TINYTIMELINE_BROWSER_MAX_FRAME = 5_000_000;
export const GEN6_TINYTIMELINE_MAX_RESULTS = 100_000;

export const GEN6_TINYTIMELINE_METHODS = [
  "Instant Sync",
  "Cutscenes Sync",
  "Horde",
  "Friend Safari",
  "Poke Radar",
  "Fishing",
  "Rock Smash",
  "Cave Shadow",
  "Normal Wild",
  "XY ID RNG",
  "Groudon/Kyogre",
] as const;

export const GEN6_TINYTIMELINE_EVENT_TYPES = [
  "-",
  "Blink(+2)",
  "Blink(+1)",
  "Fidget",
  "Soaring",
  "XY ID",
  "Running NPC",
  "G/K",
] as const;

export type Gen6TinyTimelineMethod = number;
export type Gen6TinyTimelineEventType = 0 | 1 | 3 | 4 | 5 | 6 | 7;

const METHOD_EVENT_TYPES: Record<number, readonly Gen6TinyTimelineEventType[]> =
  {
    0: [0, 1, 3],
    1: [0, 1, 3, 4],
    2: [0, 1, 3],
    3: [0, 1, 3],
    4: [0, 1, 3],
    5: [0, 1],
    6: [0, 1],
    7: [0, 1, 3],
    8: [0, 1, 3, 6],
    9: [5],
    10: [0, 1, 7],
  };

export interface Gen6TinyTimelineEvent {
  frame: number;
  type: Gen6TinyTimelineEventType;
}

export interface Gen6TinyTimelineRequest {
  state: [number, number, number, number];
  startingFrame: number;
  targetFrame: number;
  method: Gen6TinyTimelineMethod;
  events: Gen6TinyTimelineEvent[];
  parameter1: number;
  parameter2: number;
  boost: boolean;
  isOras: boolean;
  delay: number;
  cryFrame: number;
  considerDelay: boolean;
  resultLimit: number;
}

export interface Gen6TinyTimelineResult {
  index: number;
  frameMin: number;
  frameMax: number;
  hitIndex: number;
  rand: number;
  state: [number, number, number, number];
  sync: boolean | undefined;
  encounter: number;
  slot: number;
  flute: number;
  item: number;
  music: string;
  hordeHa: number;
  method: number;
  radarOverview: string | undefined;
}

function integerIn(value: unknown, min: number, max: number) {
  return (
    Number.isInteger(value) && Number(value) >= min && Number(value) <= max
  );
}

export function parseGen6TinyTimelineHex(value: string) {
  const trimmed = value.trim().replace(/^0x/i, "");
  if (trimmed === "") return 0;
  if (!/^[\da-f]{1,8}$/i.test(trimmed)) return undefined;
  return Number.parseInt(trimmed, 16) >>> 0;
}

export function parseGen6TinyTimelineDecimal(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const number = Number(trimmed);
  return Number.isSafeInteger(number) ? number : undefined;
}

export function formatGen6TinyTimelineHex(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function formatGen6TinyTimelineState(state: readonly number[]) {
  return [...state].reverse().map(formatGen6TinyTimelineHex).join(",");
}

function formatSeconds(seconds: number) {
  if (seconds < 60) return `${seconds.toFixed(3)}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;
  if (minutes < 60)
    return `${minutes}m ${remaining.toFixed(3).padStart(6, "0")}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${(minutes - hours * 60).toString().padStart(2, "0")}m ${remaining.toFixed(1).padStart(4, "0")}s`;
}

export function formatGen6TinyTimelineRealTime(
  result: Pick<Gen6TinyTimelineResult, "frameMin" | "frameMax">,
  startingFrame: number,
) {
  if (result.frameMin === result.frameMax) return "-";
  return `${formatSeconds((result.frameMin + 2 - startingFrame) / 60)} ~ ${formatSeconds((result.frameMax - startingFrame) / 60)}`;
}

export function formatGen6TinyTimelinePacked(
  value: number,
  count: number,
  width: number,
) {
  const mask = (1 << width) - 1;
  return Array.from(
    { length: count },
    (_, index) => (value >>> (index * width)) & mask,
  ).join(",");
}

function decodeRadarOverview(words: Uint32Array, offset: number) {
  const grid = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => "#"),
  );
  grid[4][4] = "C";
  const stateChars = "BGSX";
  const packedPatches =
    BigInt(words[offset + 14]) | (BigInt(words[offset + 15]) << 32n);
  for (let index = 0; index < 5; index += 1) {
    const packed = Number((packedPatches >> BigInt(index * 10)) & 0x3ffn);
    const ring = packed & 3;
    const direction = (packed >>> 2) & 3;
    const location = (packed >>> 4) & 15;
    const state = (packed >>> 8) & 3;
    const x =
      direction < 2
        ? 3 - ring + location
        : direction === 2
          ? 3 - ring
          : 5 + ring;
    const y =
      direction === 0
        ? 3 - ring
        : direction === 1
          ? 5 + ring
          : 3 - ring + location;
    if (grid[y]?.[x] === "#") grid[y][x] = stateChars[state] ?? "#";
  }
  return grid.map((row) => row.join("")).join("\n");
}

export function validateGen6TinyTimelineRequest(
  request: Gen6TinyTimelineRequest,
) {
  if (
    request.state.length !== 4 ||
    !request.state.every((value) => integerIn(value, 0, 0xffff_ffff))
  )
    throw new TypeError("TinyMT state must contain four 32-bit words.");
  if (
    !integerIn(request.startingFrame, 0, GEN6_TINYTIMELINE_MAX_FRAME) ||
    !integerIn(
      request.targetFrame,
      request.startingFrame,
      GEN6_TINYTIMELINE_MAX_FRAME,
    )
  )
    throw new TypeError("Tiny Timeline frame range is invalid.");
  if (request.targetFrame > GEN6_TINYTIMELINE_BROWSER_MAX_FRAME)
    throw new TypeError("Tiny Timeline browser frames are limited to 5000000.");
  if (!integerIn(request.method, 0, 10))
    throw new TypeError("Tiny Timeline method is invalid.");
  if (
    !Array.isArray(request.events) ||
    request.events.length < 1 ||
    request.events.length > 4
  )
    throw new TypeError("Tiny Timeline requires one to four events.");
  let previous = -1;
  for (const event of request.events) {
    if (
      !integerIn(event.frame, 0, GEN6_TINYTIMELINE_MAX_FRAME) ||
      event.frame < previous
    )
      throw new TypeError("Tiny Timeline event frames must be increasing.");
    if (![0, 1, 3, 4, 5, 6, 7].includes(event.type))
      throw new TypeError("Tiny Timeline event type is invalid.");
    if (!METHOD_EVENT_TYPES[request.method]?.includes(event.type))
      throw new TypeError(
        "Tiny Timeline event type is unavailable for the selected method.",
      );
    previous = event.frame;
  }
  const eventCount = request.events.length;
  const requiredCount =
    request.method === 7
      ? 2
      : request.method === 9
        ? 4
        : request.method === 10
          ? 3
          : 1;
  if (eventCount !== requiredCount)
    throw new TypeError(
      "Tiny Timeline event count does not match the selected method.",
    );
  if (
    !integerIn(
      request.parameter1,
      request.method === 3 ? 2 : 1,
      request.method === 3 ? 3 : 6,
    )
  )
    throw new TypeError(
      "Tiny Timeline parameter 1 is outside its method range.",
    );
  if (!integerIn(request.parameter2, 0, request.method === 4 ? 255 : 99))
    throw new TypeError(
      "Tiny Timeline parameter 2 is outside its method range.",
    );
  if (!integerIn(request.delay, 0, GEN6_TINYTIMELINE_MAX_FRAME))
    throw new TypeError("Tiny Timeline delay is invalid.");
  if (!integerIn(request.cryFrame, -1, GEN6_TINYTIMELINE_MAX_FRAME))
    throw new TypeError("Tiny Timeline cry frame is invalid.");
  if (!integerIn(request.resultLimit, 1, GEN6_TINYTIMELINE_MAX_RESULTS))
    throw new TypeError("Tiny Timeline result limit is invalid.");
  return request;
}

export function encodeGen6TinyTimelineRequest(
  request: Gen6TinyTimelineRequest,
) {
  validateGen6TinyTimelineRequest(request);
  const words = new Uint32Array(GEN6_TINYTIMELINE_REQUEST_WORDS);
  words.set(
    request.state.map((value) => value >>> 0),
    0,
  );
  words[4] = request.startingFrame;
  words[5] = request.targetFrame;
  words[6] = request.method;
  words[7] = request.events.length;
  request.events.forEach((event, index) => {
    words[8 + index * 2] = event.frame;
    words[9 + index * 2] = event.type;
  });
  words[16] = request.parameter1;
  words[17] = request.parameter2;
  words[18] =
    (request.boost ? 1 : 0) |
    (request.isOras ? 2 : 0) |
    (request.considerDelay ? 4 : 0);
  words[19] = request.delay;
  words[20] = request.cryFrame < 0 ? 0xffff_ffff : request.cryFrame;
  words[21] = request.resultLimit;
  return words;
}

export function decodeGen6TinyTimelineResults(
  buffer: ArrayBuffer,
  limit = GEN6_TINYTIMELINE_MAX_RESULTS,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_TINYTIMELINE_RESULT_WORDS !== 0)
    throw new TypeError("Tiny Timeline result buffer is not aligned.");
  return Array.from(
    { length: Math.min(words.length / GEN6_TINYTIMELINE_RESULT_WORDS, limit) },
    (_, index): Gen6TinyTimelineResult => {
      const offset = index * GEN6_TINYTIMELINE_RESULT_WORDS;
      const flags = words[offset + 9];
      const method = flags >>> 8;
      const frameMin = words[offset + 1] | 0;
      const frameMax = words[offset + 2] | 0;
      return {
        index: words[offset],
        frameMin,
        frameMax,
        hitIndex: words[offset + 3],
        rand: words[offset + 4],
        state: [
          words[offset + 5],
          words[offset + 6],
          words[offset + 7],
          words[offset + 8],
        ],
        sync: (flags & 0xff) === 2 ? undefined : (flags & 0xff) === 1,
        encounter: words[offset + 10],
        slot: words[offset + 11],
        flute: words[offset + 12],
        item: words[offset + 13],
        music: flags >>> 16 === 1 ? "A" : flags >>> 16 === 2 ? "M" : "-",
        hordeHa: method === 2 ? words[offset + 15] : 0,
        method,
        radarOverview:
          method === 4 ? decodeRadarOverview(words, offset) : undefined,
      };
    },
  );
}
