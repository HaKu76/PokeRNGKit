export const GEN3_IVTOPID_API_VERSION = 1;
export const GEN3_IVTOPID_MAX_RESULTS = 256;
export const GEN3_IVTOPID_RESULT_WORDS = 9;

export type Gen3IvToPidRequest = {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  nature: number;
  tid: number;
};

export type Gen3IvToPidMethod =
  | "method1"
  | "reverse-method1"
  | "method2"
  | "method4"
  | "xd-colo"
  | "channel"
  | "cute-charm-dppt"
  | "cute-charm-hgss";

export interface Gen3IvToPidState {
  seed: number;
  pid: number;
  sid: number;
  method: Gen3IvToPidMethod;
  ability: number;
  gender12_5: boolean;
  gender25: boolean;
  gender50: boolean;
  gender75: boolean;
}

const isUint16 = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 0xffff;
const isIv = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 31;

export function validateGen3IvToPidRequest(
  request: Gen3IvToPidRequest,
): string[] {
  const errors: string[] = [];
  for (const key of ["hp", "atk", "def", "spa", "spd", "spe"] as const) {
    if (!isIv(request[key])) errors.push(key);
  }
  if (
    !Number.isInteger(request.nature) ||
    request.nature < 0 ||
    request.nature > 24
  ) {
    errors.push("nature");
  }
  if (!isUint16(request.tid)) errors.push("tid");
  return errors;
}

export function decodeGen3IvToPidStates(
  buffer: ArrayBuffer,
): Gen3IvToPidState[] {
  const words = new Uint32Array(buffer);
  if (words.length % GEN3_IVTOPID_RESULT_WORDS !== 0) {
    throw new RangeError("Invalid Gen3 IVs to PID result buffer length.");
  }
  if (words.length / GEN3_IVTOPID_RESULT_WORDS > GEN3_IVTOPID_MAX_RESULTS) {
    throw new RangeError("Gen3 IVs to PID result buffer exceeds its limit.");
  }
  const states = new Array<Gen3IvToPidState>(
    words.length / GEN3_IVTOPID_RESULT_WORDS,
  );
  for (
    let source = 0, target = 0;
    source < words.length;
    source += GEN3_IVTOPID_RESULT_WORDS, target++
  ) {
    const method = [
      undefined,
      "method1",
      "reverse-method1",
      "method2",
      "method4",
      "xd-colo",
      "channel",
      "cute-charm-dppt",
      "cute-charm-hgss",
    ][words[source + 3]] as Gen3IvToPidMethod | undefined;
    if (!method) throw new RangeError("Unknown Gen3 IVs to PID method.");
    states[target] = {
      seed: words[source],
      pid: words[source + 1],
      sid: words[source + 2],
      method,
      ability: words[source + 4],
      gender12_5: words[source + 5] !== 0,
      gender25: words[source + 6] !== 0,
      gender50: words[source + 7] !== 0,
      gender75: words[source + 8] !== 0,
    };
  }
  return states;
}

export const gen3IvToPidMethodLabel = (method: Gen3IvToPidMethod) => {
  switch (method) {
    case "method1":
      return "Method 1";
    case "reverse-method1":
      return "Reverse Method 1";
    case "method2":
      return "Method 2";
    case "method4":
      return "Method 4";
    case "xd-colo":
      return "XD/Colo";
    case "channel":
      return "Channel";
    case "cute-charm-dppt":
      return "Cute Charm (DPPt)";
    case "cute-charm-hgss":
      return "Cute Charm (HGSS)";
  }
};
