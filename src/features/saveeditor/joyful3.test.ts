import { describe, it, expect } from "vitest";
import {
  supportsJoyful3,
  joyful3Draft,
  joyful3Edit,
  joyful3Words,
  type Joyful3Catalog,
} from "./joyful3";
const catalog = (): Joyful3Catalog => ({
  canEdit: true,
  fields: Array.from({ length: 8 }, (_, id) => ({
    id,
    value: id === 7 ? 4294967295 : 65535,
    max: id === 7 ? 99999 : 9999,
    width: id === 7 ? 5 : 4,
    stored: id === 1 || id === 5 ? 0xabcdffff : null,
  })),
});
describe("Gen3 minigames", () => {
  it("exposes E/FRLG, eight localized controls and the actual GUI limits", () => {
    expect(supportsJoyful3("SAV3E")).toBe(true);
    expect(supportsJoyful3("SAV3FRLG")).toBe(true);
    expect(supportsJoyful3("SAV3RS")).toBe(false);
    expect(supportsJoyful3("SAV4DP")).toBe(false);
    for (const w of Object.values(joyful3Words)) {
      expect(w.labels).toHaveLength(8);
      expect(w.rewriteNote).toBeTruthy();
    }
  });
  it("preserves all unedited old values and sends only a partial patch", () => {
    const c = catalog(),
      d = joyful3Draft(c),
      r = Array<boolean>(8).fill(false);
    d[7] = "99999";
    expect(joyful3Edit(c, d, r)).toEqual({ fields: [{ id: 7, value: 99999 }] });
    d[7] = "";
    expect(joyful3Edit(c, d, r)).toEqual({ fields: [{ id: 7, value: 0 }] });
  });
  it("allows an explicit score rewrite with the same read value", () => {
    const c = catalog();
    c.fields[1].value = 7;
    c.fields[1].stored = 0xabcd0007;
    const d = joyful3Draft(c),
      r = Array<boolean>(8).fill(false);
    expect(() => joyful3Edit(c, d, r)).toThrow();
    r[1] = true;
    expect(joyful3Edit(c, d, r)).toEqual({ fields: [{ id: 1, value: 7 }] });
    r[0] = true;
    expect(() => joyful3Edit(c, d, r)).toThrow();
  });
  it("rejects bounds, radix, oversized drafts and readonly writes", () => {
    const c = catalog(),
      r = Array<boolean>(8).fill(false);
    for (const [id, value] of [
      [0, "10000"],
      [1, "99990"],
      [7, "100000"],
      [7, "-1"],
      [0, "1.5"],
      [0, "0x10"],
      [0, " 1"],
    ] as const) {
      const d = joyful3Draft(c);
      d[id] = value;
      expect(() => joyful3Edit(c, d, r)).toThrow();
    }
    expect(() => joyful3Edit(c, [], r)).toThrow();
    expect(() =>
      joyful3Edit({ ...c, canEdit: false }, joyful3Draft(c), r),
    ).toThrow();
  });
});
