import { describe, expect, it } from "vitest";
import {
  createGen4IdChunks,
  decodeGen4IdStates,
  gen4IdTotalStates,
  parseGen4IdFilters,
  validateGen4IdRequest,
  type Gen4IdGeneratorRequest,
  type Gen4IdSearcherRequest,
} from "./domain";

const generator: Gen4IdGeneratorRequest = {
  operation: "generator",
  year: 2000,
  month: 1,
  day: 1,
  hour: 0,
  minute: 0,
  minDelay: 5000,
  maxDelay: 7000,
  filters: { mode: "tid", values: [12345] },
};

describe("Gen4 ID domain", () => {
  it("validates the upstream date and decimal input limits", () => {
    expect(validateGen4IdRequest(generator)).toEqual([]);
    expect(validateGen4IdRequest({ ...generator, year: 1999 })).toContain(
      "year",
    );
    expect(
      validateGen4IdRequest({ ...generator, day: 30, month: 2 }),
    ).toContain("dateTime");
  });

  it("parses every upstream exact filter form", () => {
    expect(parseGen4IdFilters("tidSid", "12345/54321")).toEqual({
      mode: "tidSid",
      values: [12345, 54321],
    });
    expect(parseGen4IdFilters("pid", "0000475A")).toEqual({
      mode: "pid",
      values: [2283],
    });
    expect(parseGen4IdFilters("tidPid", "12345/0000475A")).toEqual({
      mode: "tidPid",
      values: [12345, 2283],
    });
  });

  it("partitions generator work by second and delay", () => {
    const chunks = createGen4IdChunks(generator);
    expect(chunks).toHaveLength(60);
    expect(chunks[0]).toMatchObject({ second: 0, stateCount: 2001 });
    expect(chunks.at(-1)).toMatchObject({ second: 59, stateCount: 2001 });
    expect(gen4IdTotalStates(generator)).toBe(120060);
  });

  it("uses bounded delay slices for the searcher", () => {
    const request: Gen4IdSearcherRequest = {
      operation: "searcher",
      year: 2000,
      minDelay: 5000,
      maxDelay: 6000,
      infinite: false,
      filters: { mode: "tid", values: [12345] },
    };
    const chunks = createGen4IdChunks(request);
    expect(chunks[0]).toMatchObject({
      minDelay: 5000,
      maxDelay: 5015,
      stateCount: 98304,
    });
    expect(chunks.at(-1)?.maxDelay).toBe(6000);
  });

  it("decodes the fixed six-word state record", () => {
    expect(
      decodeGen4IdStates(
        new Uint32Array([0x0a001ab7, 6839, 12345, 48356, 4507, 9]).buffer,
      ),
    ).toEqual([
      {
        seed: 0x0a001ab7,
        delay: 6839,
        tid: 12345,
        sid: 48356,
        tsv: 4507,
        seconds: 9,
      },
    ]);
  });
});
