import type { LocalizedText } from "./domain";
export interface Link6Item {
  index: number;
  item: number;
  quantity: number;
  name: LocalizedText;
  sprite: string;
}
export interface Link6Pokemon {
  index: number;
  species: number;
  form: number;
  gender: number;
  name: LocalizedText;
  sprite: string;
  rawHex: string;
}
export interface Link6Catalog {
  canEdit: boolean;
  sourceHash: string;
  enabled: boolean;
  flags: number;
  origin: string;
  battlePoints: number;
  pokemiles: number;
  internalChecksumValid: boolean;
  storedChecksum: number;
  calculatedChecksum: number;
  items: Link6Item[];
  pokemon: Link6Pokemon[];
  rawHex: string;
  blockHex: string;
}
export interface Link6Edit {
  action: "patch" | "resave" | "import" | "export";
  sourceHash: string;
  battlePoints?: number;
  pokemiles?: number;
  dataBase64?: string;
  targetHash?: string;
}
export interface Link6Preview {
  request: Link6Edit;
  result: Link6Catalog;
  changedOffsets: number[];
}
export const LINK6_FILE_SIZE = 0xa47;
export const supportsLink6 = (format: string) =>
  ["SAV6XY", "SAV6AO"].includes(format);
const hash = (value: string) => /^[A-F0-9]{64}$/.test(value);
function editable(c: Link6Catalog) {
  if (!c.canEdit || !hash(c.sourceHash)) throw Error("Invalid Link6 catalog.");
}
export function link6Number(text: string, maximum: number) {
  if (!/^\d+$/.test(text.trim())) throw Error("Invalid Link6 number.");
  const n = Number(text);
  if (!Number.isInteger(n) || n < 0 || n > maximum)
    throw Error("Invalid Link6 number.");
  return n;
}
export function link6Patch(
  c: Link6Catalog,
  fields: Pick<Link6Edit, "battlePoints" | "pokemiles">,
): Link6Edit {
  editable(c);
  if (
    !c.enabled ||
    (fields.battlePoints === undefined && fields.pokemiles === undefined)
  )
    throw Error("Invalid Link6 editable fields.");
  for (const [key, value] of Object.entries(fields))
    if (
      !["battlePoints", "pokemiles"].includes(key) ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > (key === "battlePoints" ? 9999 : 65535)
    )
      throw Error("Invalid Link6 editable fields.");
  return { action: "patch", sourceHash: c.sourceHash, ...fields };
}
export function link6Resave(c: Link6Catalog): Link6Edit {
  editable(c);
  if (c.battlePoints > 9999) throw Error("Invalid Link6 stored BP.");
  return { action: "resave", sourceHash: c.sourceHash };
}
export function link6Import(c: Link6Catalog, bytes: Uint8Array): Link6Edit {
  editable(c);
  if (bytes.length !== LINK6_FILE_SIZE) throw Error("Invalid Link6 pl6 size.");
  return {
    action: "import",
    sourceHash: c.sourceHash,
    dataBase64: btoa(String.fromCharCode(...bytes)),
  };
}
export function link6Export(c: Link6Catalog): Link6Edit {
  if (!c.enabled || !hash(c.sourceHash)) throw Error("Invalid Link6 export.");
  return { action: "export", sourceHash: c.sourceHash };
}
export function link6Frozen(c: Link6Catalog, p: Link6Preview): Link6Edit {
  editable(c);
  if (
    p.request.action === "export" ||
    p.request.sourceHash !== c.sourceHash ||
    !hash(p.request.targetHash ?? "") ||
    p.result.sourceHash !== p.request.targetHash ||
    !p.result.canEdit
  )
    throw Error("Link6 preview is stale.");
  return p.request;
}
