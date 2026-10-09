import { describe, it, expect } from "vitest";
import {
  painting3Draft,
  painting3Dirty,
  painting3Edit,
  painting3Pid,
  supportsPaintings3,
  paintings3Words,
  type Painting3Catalog,
} from "./paintings3";
const p = {
  index: 0,
  enabled: true,
  species: 25,
  speciesInternal: 25,
  caption: 2,
  captionRaw: 200,
  tid: 123,
  sid: 456,
  pid: "FFFFFFFF",
  nickname: "PIKA",
  trainer: "RED",
  nicknameHex: "010203040506070809FF",
  trainerHex: "010203040506FF",
  shiny: false,
  sprite: "b_25",
};
const c: Painting3Catalog = { canEdit: true, entries: [p], speciesChoices: [] };
describe("Gen3 painting editing", () => {
  it("preserves raw captions and text unless explicitly edited", () => {
    const d = painting3Draft(p);
    expect(painting3Dirty(p, d)).toBe(false);
    expect(painting3Edit(c, 0, { ...d, tid: "" }).fields).toEqual({ tid: 0 });
    expect(painting3Edit(c, 0, { ...d, caption: "2" }).fields).toEqual({
      caption: 2,
    });
    expect(
      painting3Dirty(p, {
        ...d,
        nicknameMode: "bytes",
        nicknameHex: d.nicknameHex.toLowerCase(),
      }),
    ).toBe(false);
  });
  it("uses UInt32 wrapping and canonical hex values without decimal reinterpretation", () => {
    expect(painting3Pid("")).toBe(0);
    expect(painting3Pid("az10")).toBe(0xa10);
    expect(painting3Pid("FFFFFFFFF")).toBe(0xffffffff);
    expect(painting3Pid("100000000")).toBe(0);
    expect(painting3Pid("A".repeat(32767))).toBe(0xaaaaaaaa);
    const d = painting3Draft(p);
    expect(painting3Edit(c, 0, { ...d, pid: "100000000" }).fields).toEqual({
      pid: 0,
    });
    expect(() =>
      painting3Edit(c, 0, { ...d, pid: "0".repeat(32768) }),
    ).toThrow();
  });
  it("isolates disabling from other drafts and enables through an explicit patch", () => {
    const d = painting3Draft(p);
    expect(
      painting3Edit(c, 0, {
        ...d,
        enabled: false,
        nickname: "invalid",
        caption: "9",
      }),
    ).toEqual({ index: 0, fields: { enabled: false } });
    const disabled = { ...p, enabled: false };
    expect(
      painting3Dirty(disabled, { ...d, enabled: false, nickname: "changed" }),
    ).toBe(false);
    expect(painting3Edit({ ...c, entries: [disabled] }, 0, d).fields).toEqual({
      enabled: true,
    });
  });
  it("requires bounded name regions, valid captions and editable supported formats", () => {
    const d = painting3Draft(p);
    expect(
      painting3Edit(c, 0, {
        ...d,
        trainerMode: "bytes",
        trainerHex: "aa".repeat(7),
      }).fields,
    ).toEqual({ trainerHex: "AA".repeat(7) });
    for (const fields of [
      { caption: "3" },
      { species: 387 },
      { nicknameMode: "text" as const, nickname: "A".repeat(11) },
      { trainerMode: "text" as const, trainer: "A".repeat(8) },
      { trainerMode: "bytes" as const, trainerHex: "FF" },
    ])
      expect(() => painting3Edit(c, 0, { ...d, ...fields })).toThrow();
    expect(() =>
      painting3Edit({ ...c, canEdit: false }, 0, { ...d, enabled: false }),
    ).toThrow();
    expect(() => painting3Edit(c, 5, d)).toThrow();
    expect(supportsPaintings3("SAV3E")).toBe(true);
    expect(supportsPaintings3("SAV3RS")).toBe(true);
    expect(supportsPaintings3("SAV3FRLG")).toBe(false);
    for (const w of Object.values(paintings3Words))
      expect(w.categories).toHaveLength(5);
  });
});
