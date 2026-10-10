import type { Br4Lang } from "./br4";
import type { LocalizedText, OriginChoice } from "./domain";
export interface St6Holder {
  lane: number;
  species: number;
  form: number;
  gender: number;
  name: LocalizedText;
  sprite: string;
  time: string;
  timeBits: string;
  rawHex: string;
}
export interface St6Catalog {
  canEdit: boolean;
  sourceHash: string;
  stages: { index: number; name: LocalizedText; holders: St6Holder[] }[];
  bags: {
    index: number;
    id: number;
    name: LocalizedText;
    sourceReadable: boolean;
  }[];
  bagChoices: OriginChoice[];
  species: OriginChoice[];
  numberSymbols: {
    naN: LocalizedText;
    positiveInfinity: LocalizedText;
    negativeInfinity: LocalizedText;
  };
  rawHex: string;
}
export interface St6Edit {
  action: "record" | "bags" | "resave";
  sourceHash: string;
  uiLanguage: Br4Lang;
  stage?: number;
  lane?: number;
  species?: number;
  form?: string;
  gender?: string;
  time?: string;
  bags?: { index: number; id: number }[];
  targetHash?: string;
}
export interface St6Preview {
  request: St6Edit;
  result: St6Catalog;
  changedOffsets: number[];
  ignoredFields: string[];
}
export const supportsSuperTrain6 = (f: string) =>
  ["SAV6XY", "SAV6AO"].includes(f);
function source(c: St6Catalog, lang: Br4Lang) {
  if (
    !c.canEdit ||
    !/^[A-F0-9]{64}$/.test(c.sourceHash) ||
    !["zh", "en", "ja"].includes(lang)
  )
    throw Error("Invalid SuperTrain6 catalog.");
}
export function st6Record(
  c: St6Catalog,
  lang: Br4Lang,
  stage: number,
  lane: number,
  fields: Pick<St6Edit, "species" | "form" | "gender" | "time">,
): St6Edit {
  source(c, lang);
  if (
    !c.stages.some(
      (s) => s.index === stage && s.holders.some((h) => h.lane === lane),
    )
  )
    throw Error("Invalid SuperTrain6 record target.");
  if (
    [fields.species, fields.form, fields.gender, fields.time].every(
      (v) => v === undefined,
    ) ||
    Object.keys(fields).some(
      (k) => !["species", "form", "gender", "time"].includes(k),
    ) ||
    (fields.species !== undefined &&
      !c.species.some((s) => s.id === fields.species)) ||
    [fields.form, fields.gender, fields.time].some(
      (s) => s !== undefined && (typeof s !== "string" || s.length > 32767),
    )
  )
    throw Error("Invalid SuperTrain6 record fields.");
  return {
    action: "record",
    sourceHash: c.sourceHash,
    uiLanguage: lang,
    stage,
    lane,
    ...fields,
  };
}
export function st6BagChoices(c: St6Catalog, lang: Br4Lang) {
  return c.bagChoices.filter((c) => c.name[lang].length !== 0);
}
export function st6Bags(
  c: St6Catalog,
  lang: Br4Lang,
  bags: { index: number; id: number }[],
): St6Edit {
  source(c, lang);
  const choices = st6BagChoices(c, lang);
  if (
    !bags.length ||
    bags.length > 12 ||
    new Set(bags.map((b) => b.index)).size !== bags.length ||
    bags.some(
      (b) =>
        !Number.isInteger(b.index) ||
        !c.bags.some((s) => s.index === b.index) ||
        !choices.some((v) => v.id === b.id),
    )
  )
    throw Error("Invalid SuperTrain6 bag fields.");
  return { action: "bags", sourceHash: c.sourceHash, uiLanguage: lang, bags };
}
export function st6Resave(c: St6Catalog, lang: Br4Lang): St6Edit {
  source(c, lang);
  if (c.bags.some((b) => !b.sourceReadable))
    throw Error("Invalid SuperTrain6 stored bag.");
  return { action: "resave", sourceHash: c.sourceHash, uiLanguage: lang };
}
export function st6Frozen(c: St6Catalog, p: St6Preview): St6Edit {
  source(c, p.request.uiLanguage);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[A-F0-9]{64}$/.test(p.request.targetHash ?? "") ||
    p.result.sourceHash !== p.request.targetHash ||
    !p.result.canEdit
  )
    throw Error("SuperTrain6 preview is stale.");
  return p.request;
}
