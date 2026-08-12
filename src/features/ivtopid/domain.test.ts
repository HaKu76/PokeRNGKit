import { describe, expect, it } from "vitest";
import { decodeGen3IvToPidStates, validateGen3IvToPidRequest } from "./domain";

describe("Gen3 IVs to PID domain", () => {
  it("accepts the exact upstream input ranges", () => {
    expect(
      validateGen3IvToPidRequest({
        hp: 31,
        atk: 31,
        def: 31,
        spa: 31,
        spd: 31,
        spe: 31,
        nature: 24,
        tid: 65535,
      }),
    ).toEqual([]);
    expect(
      validateGen3IvToPidRequest({
        hp: 32,
        atk: 0,
        def: 0,
        spa: 0,
        spd: 0,
        spe: 0,
        nature: 25,
        tid: 65536,
      }),
    ).toEqual(["hp", "nature", "tid"]);
  });

  it("decodes the fixed nine-word result record", () => {
    const buffer = new Uint32Array([
      1449478200, 3693978225, 48333, 6, 1, 1, 1, 1, 1,
    ]).buffer;
    expect(decodeGen3IvToPidStates(buffer)).toEqual([
      {
        seed: 1449478200,
        pid: 3693978225,
        sid: 48333,
        method: "channel",
        ability: 1,
        gender12_5: true,
        gender25: true,
        gender50: true,
        gender75: true,
      },
    ]);
  });
});
