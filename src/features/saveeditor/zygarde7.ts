import type { LocalizedText } from "./domain";
export interface Zygarde7Catalog {
  canEdit: boolean;
  sourceHash: string;
  stickers: boolean;
  total: number;
  collected: number;
  entries: { index: number; location: LocalizedText; state: number }[];
}
export interface Zygarde7Edit {
  action: "patch" | "giveAll" | "resave";
  sourceHash: string;
  entries?: { index: number; state: number }[];
  total?: number;
  collected?: number;
  targetHash?: string;
}
export interface Zygarde7Preview {
  request: Zygarde7Edit;
  result: Zygarde7Catalog;
  changedOffsets: number[];
}
export const supportsZygarde7 = (format: string) =>
  ["SAV7SM", "SAV7USUM"].includes(format);
function source(c: Zygarde7Catalog) {
  if (!c.canEdit || !/^[0-9A-F]{64}$/.test(c.sourceHash))
    throw Error("Collectibles7 is read-only.");
}
export function z7Patch(
  c: Zygarde7Catalog,
  entries: Zygarde7Edit["entries"],
  total?: number,
  collected?: number,
): Zygarde7Edit {
  source(c);
  if (entries === undefined && total === undefined && collected === undefined)
    throw Error("Missing Collectibles7 changes.");
  for (const value of [total, collected])
    if (
      value !== undefined &&
      (!Number.isInteger(value) || value < 0 || value > 65535)
    )
      throw Error("Invalid Collectibles7 counter.");
  if (
    entries &&
    (!entries.length ||
      entries.length > c.entries.length ||
      new Set(entries.map((v) => v.index)).size !== entries.length ||
      entries.some(
        (v) =>
          !Number.isInteger(v.index) ||
          !c.entries.some((f) => f.index === v.index) ||
          ![0, 1, 2].includes(v.state),
      ))
  )
    throw Error("Invalid Collectibles7 entries.");
  return {
    action: "patch",
    sourceHash: c.sourceHash,
    entries,
    total,
    collected,
  };
}
export function z7Action(
  c: Zygarde7Catalog,
  action: "giveAll" | "resave",
): Zygarde7Edit {
  source(c);
  if (c.entries.some((v) => ![0, 1, 2].includes(v.state)))
    throw Error("Collectibles7 requires recognized states.");
  if (action === "giveAll") {
    const added = c.entries.filter((v) => v.state !== 2).length;
    if (c.collected + added > 65535 || (!c.stickers && c.total + added > 65535))
      throw Error("Collectibles7 give-all counter overflow.");
  }
  return { action, sourceHash: c.sourceHash };
}
export function z7Frozen(c: Zygarde7Catalog, p: Zygarde7Preview): Zygarde7Edit {
  source(c);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[0-9A-F]{64}$/.test(p.request.targetHash ?? "") ||
    p.result.sourceHash !== p.request.targetHash
  )
    throw Error("Collectibles7 preview is stale.");
  return p.request;
}
