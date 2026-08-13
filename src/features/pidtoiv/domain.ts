export const GEN3_PID_TO_IV_API_VERSION = 1;
export const GEN3_PID_TO_IV_RESULT_WORDS = 8;

export type Gen3PidToIvMethod =
  "method-1" | "method-2" | "method-4" | "xd-colo" | "channel";

export interface Gen3PidToIvRequest {
  pid: number;
}

export interface Gen3PidToIvState {
  seed: number;
  method: Gen3PidToIvMethod;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

const methodByValue: Record<number, Gen3PidToIvMethod> = {
  1: "method-1",
  3: "method-2",
  4: "method-4",
  5: "xd-colo",
  6: "channel",
};

export function validateGen3PidToIvRequest(
  request: Gen3PidToIvRequest,
): string[] {
  return Number.isInteger(request.pid) &&
    request.pid >= 0 &&
    request.pid <= 0xffff_ffff
    ? []
    : ["pid"];
}

export function decodeGen3PidToIvStates(
  buffer: ArrayBuffer,
): Gen3PidToIvState[] {
  const words = new Uint32Array(buffer);
  if (words.length % GEN3_PID_TO_IV_RESULT_WORDS !== 0) {
    throw new RangeError("Invalid Gen3 PID to IVs result buffer length.");
  }
  const states: Gen3PidToIvState[] = [];
  for (
    let index = 0;
    index < words.length;
    index += GEN3_PID_TO_IV_RESULT_WORDS
  ) {
    const method = methodByValue[words[index + 1]];
    const ivs = words.slice(index + 2, index + 8);
    if (!method || ivs.some((value) => value > 31)) {
      throw new RangeError("Gen3 PID to IVs core returned an invalid state.");
    }
    states.push({
      seed: words[index],
      method,
      hp: ivs[0],
      atk: ivs[1],
      def: ivs[2],
      spa: ivs[3],
      spd: ivs[4],
      spe: ivs[5],
    });
  }
  return states;
}
