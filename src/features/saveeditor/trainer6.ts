import type { Br4Lang } from "./br4";
import type { LocalizedText, OriginChoice, SaveReport } from "./domain";
import type { Hall6Trash } from "./hall6";
export interface Tr6Field {
  key: string;
  group: string;
  name: LocalizedText;
  value: string;
  kind: "text" | "number" | "choice" | "property";
  maxLength: number;
  min: number;
  max: number;
  choices: OriginChoice[];
}
export interface Tr6Catalog {
  canEdit: boolean;
  sourceHash: string;
  fields: Tr6Field[];
  sprite: string;
  playerModel: number;
  nameTrash: string;
  characters: number[];
  trashSpecies: OriginChoice[];
  trashLanguages: OriginChoice[];
  existing: SaveReport["trainer"];
  basics: {
    name: string;
    tid: number;
    sid: number;
    money: number;
    gender: number;
  };
  position: {
    canEdit: boolean;
    fields: {
      key: string;
      value: string;
      display: string;
      min: string;
      max: string;
      places: number;
    }[];
  };
}
export interface Tr6Edit {
  action: "patch" | "resave" | "accessories" | "trash" | "position";
  sourceHash: string;
  fields?: { key: string; value: string }[];
  trash?: Hall6Trash;
  targetHash?: string;
  uiLanguage?: Br4Lang;
}
export interface Tr6Preview {
  request: Tr6Edit;
  result: Tr6Catalog;
  changedOffsets: number[];
  ignoredFields: string[];
}
export const supportsTrainer6 = (format: string) =>
  ["SAV6XY", "SAV6AO", "SAV6AODemo"].includes(format);
// SAV_Trainer MT_TID/MT_SID TextChanged -> ChangeFFFF; keep leading zeroes.
export function tr6IdInput(text: string): string {
  if (!/^\d{0,5}$/.test(text)) return text;
  if (!text) return "0";
  return Number(text) > 65535 ? "65535" : text;
}
export function tr6Tsv(tid: string, sid: string): string {
  const value = (text: string) => (/^\d{1,5}$/.test(text) ? Number(text) : 0);
  return String((value(tid) ^ value(sid)) >>> 4).padStart(4, "0");
}
function source(c: Tr6Catalog) {
  if (!c.canEdit || !/^[A-F0-9]{64}$/.test(c.sourceHash))
    throw Error("Invalid Trainer6 catalog.");
}
export function tr6Patch(c: Tr6Catalog, fields: Tr6Edit["fields"]): Tr6Edit {
  source(c);
  if (
    !fields?.length ||
    fields.length > c.fields.length ||
    new Set(fields.map((f) => f.key)).size !== fields.length ||
    fields.some(({ key, value }) => {
      const f = c.fields.find((v) => v.key === key);
      if (!f || typeof value !== "string" || value.length > f.maxLength)
        return true;
      if (f.kind === "text") return false;
      if (f.kind === "property") return !value.trim();
      if (!/^\d*$/.test(value)) return true;
      const n = key === "Style" ? Math.min(Number(value), 255) : Number(value);
      return (
        n < f.min ||
        n > f.max ||
        (f.kind === "choice" && (!value || !f.choices.some((v) => v.id === n)))
      );
    })
  )
    throw Error("Invalid Trainer6 fields.");
  return { action: "patch", sourceHash: c.sourceHash, fields };
}
export function tr6Position(
  c: Tr6Catalog,
  lang: Br4Lang,
  fields: Tr6Edit["fields"],
): Tr6Edit {
  source(c);
  if (
    !c.position.canEdit ||
    !["zh", "en", "ja"].includes(lang) ||
    !fields?.length ||
    fields.length > 5 ||
    new Set(fields.map((v) => v.key)).size !== fields.length ||
    fields.some(
      (v) =>
        !c.position.fields.some((f) => f.key === v.key) ||
        typeof v.value !== "string" ||
        v.value.length > 32767,
    )
  )
    throw Error("Invalid Trainer6 position fields.");
  return {
    action: "position",
    sourceHash: c.sourceHash,
    uiLanguage: lang,
    fields,
  };
}
export function tr6Action(
  c: Tr6Catalog,
  action: "resave" | "accessories",
): Tr6Edit {
  source(c);
  if (action === "accessories" && !c.fields.some((f) => f.key === "Style"))
    throw Error("Trainer6 accessories require X/Y.");
  return { action, sourceHash: c.sourceHash };
}
export function tr6Trash(c: Tr6Catalog, trash: Hall6Trash): Tr6Edit {
  source(c);
  if (
    !["prepare", "text", "hex", "clear", "layer"].includes(trash.action) ||
    (trash.action === "hex" && !/^[\dA-Fa-f]{52}$/.test(trash.hex ?? "")) ||
    (trash.action === "text" &&
      (typeof trash.text !== "string" || trash.text.length > 12)) ||
    (trash.action === "layer" &&
      (!c.trashSpecies.some((v) => v.id === trash.species) ||
        !c.trashLanguages.some((v) => v.id === trash.language) ||
        !Number.isInteger(trash.generation) ||
        trash.generation! < 0 ||
        trash.generation! > 100 ||
        !["zh", "en", "ja"].includes(trash.uiLanguage as Br4Lang)))
  )
    throw Error("Invalid Trainer6 name trash.");
  const allowed =
    trash.action === "text"
      ? ["action", "text"]
      : trash.action === "hex"
        ? ["action", "hex"]
        : trash.action === "layer"
          ? ["action", "species", "language", "generation", "uiLanguage"]
          : ["action"];
  if (Object.keys(trash).some((k) => !allowed.includes(k)))
    throw Error("Invalid Trainer6 trash fields.");
  return { action: "trash", sourceHash: c.sourceHash, trash };
}
export function tr6Frozen(c: Tr6Catalog, p: Tr6Preview): Tr6Edit {
  source(c);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[A-F0-9]{64}$/.test(p.request.targetHash ?? "") ||
    p.result.sourceHash !== p.request.targetHash ||
    !p.result.canEdit
  )
    throw Error("Trainer6 preview is stale.");
  return p.request;
}
