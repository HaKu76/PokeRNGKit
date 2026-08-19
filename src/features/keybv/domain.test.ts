import { describe, expect, it } from "vitest";
import {
  KEYBV_PARTY_SIZE,
  KEYBV_VIDEO_SIZES,
  KeyBvError,
  encryptKeyBvPkx,
  formatKeyBvTrv,
  formatKeyBvTsv,
  inspectKeyBvFiles,
  parseKeyBv,
} from "./domain";

function putU16(data: Uint8Array, offset: number, value: number) {
  new DataView(data.buffer).setUint16(offset, value, true);
}

function putU32(data: Uint8Array, offset: number, value: number) {
  new DataView(data.buffer).setUint32(offset, value, true);
}

function makePkx(
  species: number,
  tid: number,
  sid: number,
  personality: number,
) {
  const data = new Uint8Array(KEYBV_PARTY_SIZE);
  putU32(data, 0, personality);
  putU16(data, 8, species);
  putU16(data, 0xc, tid);
  putU16(data, 0xe, sid);
  let checksum = 0;
  for (let offset = 8; offset < 0xe8; offset += 2)
    checksum =
      (checksum + new DataView(data.buffer).getUint16(offset, true)) & 0xffff;
  putU16(data, 6, checksum);
  return data;
}

function makeBattleVideos(
  size: number,
  records: readonly Uint8Array[],
  partyOffset: number,
) {
  const video1 = new Uint8Array(size);
  const video2 = new Uint8Array(size);
  const encrypted = records.map(encryptKeyBvPkx);
  const zeroes = encryptKeyBvPkx(new Uint8Array(KEYBV_PARTY_SIZE));
  for (let slot = 0; slot < 6; slot++) {
    const first = video1.subarray(
      partyOffset + slot * KEYBV_PARTY_SIZE,
      partyOffset + (slot + 1) * KEYBV_PARTY_SIZE,
    );
    const second = video2.subarray(
      partyOffset + slot * KEYBV_PARTY_SIZE,
      partyOffset + (slot + 1) * KEYBV_PARTY_SIZE,
    );
    const source = encrypted[slot] ?? new Uint8Array(KEYBV_PARTY_SIZE);
    for (let index = 0; index < KEYBV_PARTY_SIZE; index++) {
      first[index] = slot === 0 ? (encrypted[1]?.[index] ?? 0) : zeroes[index];
      second[index] = source[index];
    }
  }
  return [video1, video2] as const;
}

describe("KeyBV domain", () => {
  it("accepts only equal supported battle video sizes", () => {
    expect(
      inspectKeyBvFiles(KEYBV_VIDEO_SIZES[0], KEYBV_VIDEO_SIZES[0]),
    ).toMatchObject({
      valid: true,
      generation: 6,
    });
    expect(
      inspectKeyBvFiles(KEYBV_VIDEO_SIZES[1], KEYBV_VIDEO_SIZES[1]),
    ).toMatchObject({
      valid: true,
      generation: 7,
    });
    expect(
      inspectKeyBvFiles(KEYBV_VIDEO_SIZES[0], KEYBV_VIDEO_SIZES[1]).code,
    ).toBe("mismatched-size");
    expect(inspectKeyBvFiles(0, KEYBV_VIDEO_SIZES[0]).code).toBe(
      "invalid-size",
    );
  });

  it("recovers species, TSV, and TRV from a Generation VI battle video pair", () => {
    const records = [
      makePkx(25, 0x1234, 0x5678, 0x01020304),
      makePkx(133, 0xabcd, 0x1357, 0xdeadbeef),
    ];
    const [video1, video2] = makeBattleVideos(
      KEYBV_VIDEO_SIZES[0],
      records,
      0x4e18,
    );
    const result = parseKeyBv(video1, video2);
    expect(result.generation).toBe(6);
    expect(result.pokemon).toEqual([
      {
        slot: 0,
        species: 25,
        tsv: (0x1234 ^ 0x5678) >>> 4,
        trv: (0x1234 ^ 0x5678) & 0xf,
      },
      {
        slot: 1,
        species: 133,
        tsv: (0xabcd ^ 0x1357) >>> 4,
        trv: (0xabcd ^ 0x1357) & 0xf,
      },
    ]);
  });

  it("uses the Generation VII party offset and rejects an empty dump", () => {
    const records = [
      makePkx(1, 1, 2, 0x80000000),
      makePkx(6, 3, 4, 0x40000000),
    ];
    const [video1, video2] = makeBattleVideos(
      KEYBV_VIDEO_SIZES[1],
      records,
      0x4e41,
    );
    expect(parseKeyBv(video1, video2).generation).toBe(7);
    expect(() =>
      parseKeyBv(
        new Uint8Array(KEYBV_VIDEO_SIZES[0]),
        new Uint8Array(KEYBV_VIDEO_SIZES[0]),
      ),
    ).toThrow(KeyBvError);
  });

  it("formats the values exactly as the upstream dialog", () => {
    expect(formatKeyBvTsv(7)).toBe("0007");
    expect(formatKeyBvTsv(4095)).toBe("4095");
    expect(formatKeyBvTrv(0)).toBe("0");
    expect(formatKeyBvTrv(15)).toBe("F");
  });
});
