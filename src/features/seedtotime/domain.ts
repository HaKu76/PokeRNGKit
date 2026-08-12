export const GEN3_SEED_TO_TIME_API_VERSION = 1;
export const GEN3_SEED_TO_TIME_MIN_YEAR = 2000;
export const GEN3_SEED_TO_TIME_MAX_YEAR = 2037;
export const GEN3_SEED_TO_TIME_RESULT_WORDS = 5;

export interface Gen3SeedToTimeRequest {
  seed: number;
  year: number;
}

export interface Gen3SeedToTimeState {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface Gen3SeedToTimeResult {
  originSeed: number;
  advances: number;
  states: Gen3SeedToTimeState[];
}

const isUint32 = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
const daysInMonth = (year: number, month: number) => {
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month === 2 && year % 4 === 0 ? 29 : monthDays[month - 1];
};

export function validateGen3SeedToTimeRequest(
  request: Gen3SeedToTimeRequest,
): string[] {
  const errors: string[] = [];
  if (!isUint32(request.seed)) errors.push("seed");
  if (
    !Number.isInteger(request.year) ||
    request.year < GEN3_SEED_TO_TIME_MIN_YEAR ||
    request.year > GEN3_SEED_TO_TIME_MAX_YEAR
  ) {
    errors.push("year");
  }
  return errors;
}

export function decodeGen3SeedToTimeStates(
  buffer: ArrayBuffer,
): Gen3SeedToTimeState[] {
  const words = new Uint32Array(buffer);
  if (words.length % GEN3_SEED_TO_TIME_RESULT_WORDS !== 0) {
    throw new RangeError("Invalid Gen3 Seed to Time result buffer length.");
  }
  const states = new Array<Gen3SeedToTimeState>(
    words.length / GEN3_SEED_TO_TIME_RESULT_WORDS,
  );
  for (
    let source = 0, target = 0;
    source < words.length;
    source += GEN3_SEED_TO_TIME_RESULT_WORDS, target++
  ) {
    const state = {
      year: words[source],
      month: words[source + 1],
      day: words[source + 2],
      hour: words[source + 3],
      minute: words[source + 4],
    };
    if (
      state.year < GEN3_SEED_TO_TIME_MIN_YEAR ||
      state.year > GEN3_SEED_TO_TIME_MAX_YEAR ||
      state.month < 1 ||
      state.month > 12 ||
      state.day < 1 ||
      state.day > daysInMonth(state.year, state.month) ||
      state.hour > 23 ||
      state.minute > 59
    ) {
      throw new RangeError("Gen3 Seed to Time core returned an invalid time.");
    }
    states[target] = state;
  }
  return states;
}

export function formatGen3SeedToTime(state: Gen3SeedToTimeState): string {
  const twoDigits = (value: number) => String(value).padStart(2, "0");
  return `${String(state.year).padStart(4, "0")}-${twoDigits(state.month)}-${twoDigits(state.day)} ${twoDigits(state.hour)}:${twoDigits(state.minute)}:00`;
}
