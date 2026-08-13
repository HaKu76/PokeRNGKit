export const GEN4_SEED_TO_TIME_API_VERSION = 1;
export const GEN4_SEED_TO_TIME_MIN_YEAR = 2000;
export const GEN4_SEED_TO_TIME_MAX_YEAR = 2099;
export const GEN4_SEED_TO_TIME_RESULT_WORDS = 7;
export const GEN4_SEED_TO_TIME_CALIBRATION_WORDS = 14;
export const GEN4_SEED_TO_TIME_MAX_CALIBRATION_RESULTS = 2_000_000;

export type Gen4SeedToTimeMode = "dppt" | "hgss";

export interface Gen4RoamerInput {
  enabled: boolean;
  route: number;
}

export interface Gen4SeedToTimeRequest {
  seed: number;
  year: number;
  forceSecond: boolean;
  second: number;
  mode: Gen4SeedToTimeMode;
  raikou: Gen4RoamerInput;
  entei: Gen4RoamerInput;
  lati: Gen4RoamerInput;
}

export interface Gen4SeedToTimeState {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  delay: number;
}

export interface Gen4SeedToTimeStatus {
  sequenceLow: number;
  sequenceHigh: number;
  raikouRoute: number;
  enteiRoute: number;
  latiRoute: number;
  skips: number;
}

export interface Gen4SeedToTimeCalibrationRequest {
  target: Gen4SeedToTimeState;
  delayCalibration: number;
  secondCalibration: number;
  mode: Gen4SeedToTimeMode;
  raikou: Gen4RoamerInput;
  entei: Gen4RoamerInput;
  lati: Gen4RoamerInput;
}

export interface Gen4SeedToTimeCalibrationState extends Gen4SeedToTimeState {
  seed: number;
  sequenceLow: number;
  sequenceHigh: number;
  raikouRoute: number;
  enteiRoute: number;
  latiRoute: number;
  skips: number;
}

const isUint32 = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;

const daysInMonth = (year: number, month: number) => {
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month === 2 && year % 4 === 0 ? 29 : monthDays[month - 1];
};

const validTime = (state: Gen4SeedToTimeState) =>
  Number.isInteger(state.year) &&
  state.year >= GEN4_SEED_TO_TIME_MIN_YEAR &&
  state.year <= GEN4_SEED_TO_TIME_MAX_YEAR &&
  Number.isInteger(state.month) &&
  state.month >= 1 &&
  state.month <= 12 &&
  Number.isInteger(state.day) &&
  state.day >= 1 &&
  state.day <= daysInMonth(state.year, state.month) &&
  Number.isInteger(state.hour) &&
  state.hour >= 0 &&
  state.hour <= 23 &&
  Number.isInteger(state.minute) &&
  state.minute >= 0 &&
  state.minute <= 59 &&
  Number.isInteger(state.second) &&
  state.second >= 0 &&
  state.second <= 59 &&
  isUint32(state.delay);

const validRoamer = (roamer: Gen4RoamerInput, maximum: number) =>
  typeof roamer.enabled === "boolean" &&
  Number.isInteger(roamer.route) &&
  roamer.route >= 0 &&
  roamer.route <= maximum;

export function gen4RoamerMask(
  request: Pick<Gen4SeedToTimeRequest, "raikou" | "entei" | "lati">,
) {
  return (
    (request.raikou.enabled ? 1 : 0) |
    (request.entei.enabled ? 2 : 0) |
    (request.lati.enabled ? 4 : 0)
  );
}

export function validateGen4SeedToTimeRequest(request: Gen4SeedToTimeRequest) {
  const errors: string[] = [];
  if (!isUint32(request.seed)) errors.push("seed");
  if (
    !Number.isInteger(request.year) ||
    request.year < GEN4_SEED_TO_TIME_MIN_YEAR ||
    request.year > GEN4_SEED_TO_TIME_MAX_YEAR
  )
    errors.push("year");
  if (
    !Number.isInteger(request.second) ||
    request.second < 0 ||
    request.second > 59
  )
    errors.push("second");
  if (request.mode !== "dppt" && request.mode !== "hgss") errors.push("mode");
  if (!validRoamer(request.raikou, 46)) errors.push("raikou");
  if (!validRoamer(request.entei, 46)) errors.push("entei");
  if (!validRoamer(request.lati, 28)) errors.push("lati");
  if (request.mode === "dppt" && gen4RoamerMask(request) !== 0)
    errors.push("roamers");
  return errors;
}

export function validateGen4SeedToTimeCalibrationRequest(
  request: Gen4SeedToTimeCalibrationRequest,
) {
  const errors: string[] = [];
  if (!validTime(request.target)) errors.push("target");
  if (!isUint32(request.delayCalibration)) errors.push("delayCalibration");
  if (
    !Number.isInteger(request.secondCalibration) ||
    request.secondCalibration < 0 ||
    request.secondCalibration > 500
  )
    errors.push("secondCalibration");
  if (!validRoamer(request.raikou, 46)) errors.push("raikou");
  if (!validRoamer(request.entei, 46)) errors.push("entei");
  if (!validRoamer(request.lati, 28)) errors.push("lati");
  const resultCount =
    (request.delayCalibration * 2 + 1) * (request.secondCalibration * 2 + 1);
  if (resultCount > GEN4_SEED_TO_TIME_MAX_CALIBRATION_RESULTS)
    errors.push("resultCount");
  return errors;
}

function assertPackedState(state: Gen4SeedToTimeState) {
  if (!validTime(state))
    throw new RangeError("Gen4 Seed to Time core returned an invalid time.");
}

export function decodeGen4SeedToTimeStates(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN4_SEED_TO_TIME_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen4 Seed to Time result buffer length.");
  const states: Gen4SeedToTimeState[] = [];
  for (let index = 0; index < words.length; index += 7) {
    const state = {
      year: words[index],
      month: words[index + 1],
      day: words[index + 2],
      hour: words[index + 3],
      minute: words[index + 4],
      second: words[index + 5],
      delay: words[index + 6],
    };
    assertPackedState(state);
    states.push(state);
  }
  return states;
}

export function decodeGen4SeedToTimeCalibrations(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN4_SEED_TO_TIME_CALIBRATION_WORDS !== 0)
    throw new RangeError(
      "Invalid Gen4 Seed to Time calibration buffer length.",
    );
  const states: Gen4SeedToTimeCalibrationState[] = [];
  for (let index = 0; index < words.length; index += 14) {
    const state = {
      seed: words[index],
      year: words[index + 1],
      month: words[index + 2],
      day: words[index + 3],
      hour: words[index + 4],
      minute: words[index + 5],
      second: words[index + 6],
      delay: words[index + 7],
      sequenceLow: words[index + 8],
      sequenceHigh: words[index + 9],
      raikouRoute: words[index + 10],
      enteiRoute: words[index + 11],
      latiRoute: words[index + 12],
      skips: words[index + 13],
    };
    assertPackedState(state);
    if (
      state.raikouRoute > 46 ||
      state.enteiRoute > 46 ||
      state.latiRoute > 28 ||
      state.skips > 255
    )
      throw new RangeError("Gen4 Seed to Time core returned invalid roamers.");
    states.push(state);
  }
  return states;
}

export function formatGen4SeedToTime(state: Gen4SeedToTimeState) {
  const two = (value: number) => String(value).padStart(2, "0");
  return `${state.year}-${two(state.month)}-${two(state.day)} ${two(state.hour)}:${two(state.minute)}:${two(state.second)}`;
}

export function formatGen4Sequence(
  low: number,
  high: number,
  length: number,
  mode: Gen4SeedToTimeMode,
  skips = 0,
) {
  const bits = (BigInt(high) << 32n) | BigInt(low);
  const values = Array.from({ length }, (_, index) => {
    const value = Number((bits >> BigInt(index * 2)) & 3n);
    return mode === "dppt" ? (value === 0 ? "T" : "H") : ["E", "K", "P"][value];
  });
  if (mode === "hgss" && skips > 0)
    return `(${values.slice(0, skips).join(", ")} skipped)  ${values.slice(skips).join(", ")}`;
  return values.join(", ");
}

export function normalizeGen4Sequence(value: string) {
  return value
    .toUpperCase()
    .replace(/[\s,()]/g, "")
    .replace(/SKIPPED/g, "");
}

export function formatGen4Roamers(
  status: Pick<
    Gen4SeedToTimeStatus,
    "raikouRoute" | "enteiRoute" | "latiRoute"
  >,
) {
  return [
    status.raikouRoute ? `R: ${status.raikouRoute}` : "",
    status.enteiRoute ? `E: ${status.enteiRoute}` : "",
    status.latiRoute ? `L: ${status.latiRoute}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
