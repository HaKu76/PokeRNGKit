import { describe, expect, it } from "vitest";
import { GEN5_EVENT_PGF_BYTES, parseGen5EventPgf } from "./pgf";

describe("Gen 5 Event PGF parser", () => {
  it("reads PokeFinder fields and remaps the IV byte order", () => {
    const buffer = new ArrayBuffer(GEN5_EVENT_PGF_BYTES);
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    view.setUint16(0x00, 3013, true);
    view.setUint16(0x02, 9, true);
    view.setUint16(0x1a, 648, true);
    bytes[0x34] = 255;
    bytes[0x35] = 2;
    bytes[0x36] = 0;
    bytes[0x37] = 1;
    bytes[0x43] = 31;
    bytes[0x44] = 30;
    bytes[0x45] = 29;
    bytes[0x46] = 28;
    bytes[0x47] = 27;
    bytes[0x48] = 255;
    bytes[0x5b] = 50;
    bytes[0x5c] = 1;
    expect(parseGen5EventPgf(buffer)).toEqual({
      tid: 3013,
      sid: 9,
      species: 648,
      nature: 255,
      gender: 2,
      ability: 0,
      shiny: 1,
      level: 50,
      egg: true,
      ivs: [31, 30, 29, 27, null, 28],
    });
  });

  it("requires the exact 204-byte wondercard size", () => {
    expect(() => parseGen5EventPgf(new ArrayBuffer(203))).toThrow(
      "Wondercard is not the correct size",
    );
  });

  it("rejects invalid field values", () => {
    const buffer = new ArrayBuffer(GEN5_EVENT_PGF_BYTES);
    const bytes = new Uint8Array(buffer);
    new DataView(buffer).setUint16(0x1a, 1, true);
    bytes[0x34] = 25;
    bytes[0x5b] = 1;
    expect(() => parseGen5EventPgf(buffer)).toThrow("Invalid format");
  });
});
