import type { LocalizedText, OriginChoice } from "./domain";
export interface Misc5Field {
  id: string;
  group: string;
  name: LocalizedText;
  value: number;
  minimum: number;
  maximum: number;
  boolean: boolean;
  choices: OriginChoice[] | null;
  rawHex: string | null;
}
export interface Misc5Mission {
  index: number;
  name: LocalizedText;
  score: number;
  total: number;
  level: number;
  isNew: boolean;
  unlocked: boolean;
  raw: number;
}
export interface Misc5ForestSlot {
  index: number;
  area: number;
  species: number;
  move: number;
  gender: number;
  form: number;
  animation: number;
  raw: number;
  sprite: string;
  forms: OriginChoice[];
  genders: number[];
}
export interface Misc5ForestSpecies {
  species: number;
  forms: OriginChoice[];
  genders: number[];
}
export interface Misc5Catalog {
  canEdit: boolean;
  sourceHash: string;
  fields: Misc5Field[];
  missions: Misc5Mission[];
  forest: Misc5ForestSlot[];
  speciesChoices: OriginChoice[];
  moveChoices: OriginChoice[];
  randomCandidates: number;
  groups: string[];
  rawHex: string;
  forestChoices: Misc5ForestSpecies[];
  experienceLimits: number[];
  canExportFc: boolean;
}
export interface Misc5ForestEdit {
  index: number;
  species?: number;
  move?: number;
  gender?: number;
  form?: number;
  animation?: number;
}
export interface Misc5MissionEdit {
  index: number;
  score?: number;
  total?: number;
  level?: number;
  isNew?: boolean;
}
export interface Misc5Edit {
  action:
    | "patch"
    | "giveFly"
    | "giveKeys"
    | "giveProps"
    | "missionUnlockAll"
    | "forestRandom"
    | "importFc";
  sourceHash: string;
  targetHash?: string;
  fields?: { id: string; value: number }[];
  missions?: Misc5MissionEdit[];
  forest?: Misc5ForestEdit[];
  dataBase64?: string;
  frozenForest?: { sourceIndex: number; raw: number }[];
}
export interface Misc5Preview {
  request: Misc5Edit;
  result: Misc5Catalog;
  changedOffsets: number[];
}
export const supportsMisc5 = (format: string) =>
  ["SAV5BW", "SAV5B2W2"].includes(format);
function catalog(c: Misc5Catalog) {
  if (!c.canEdit || !/^[A-F0-9]{64}$/.test(c.sourceHash))
    throw Error("Invalid Misc5 catalog.");
}
function integer(value: number, min: number, max: number) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw Error("Invalid Misc5 number.");
}
function unique(indices: number[], max: number) {
  if (
    !indices.length ||
    indices.length > max + 1 ||
    new Set(indices).size !== indices.length
  )
    throw Error("Invalid Misc5 range.");
  indices.forEach((i) => integer(i, 0, max));
}
export function misc5Maximum(
  c: Misc5Catalog,
  field: Misc5Field,
  fields: { id: string; value: number }[],
) {
  if (
    c.experienceLimits.length &&
    fields.some((v) => v.id === "whiteLevel") &&
    (field.id === "whiteExp" || field.id === "blackExp")
  ) {
    const id = field.id === "whiteExp" ? "whiteLevel" : "blackLevel",
      level = fields.find((v) => v.id === id)?.value;
    if (level === undefined && field.id === "blackExp") return field.maximum;
    if (level === undefined) throw Error("Invalid Misc5 level.");
    integer(level, 0, 999);
    return c.experienceLimits[level];
  }
  return field.maximum;
}
export function misc5Patch(
  c: Misc5Catalog,
  parts: Pick<Misc5Edit, "fields" | "missions" | "forest">,
): Misc5Edit {
  catalog(c);
  if (!parts.fields?.length && !parts.missions?.length && !parts.forest?.length)
    throw Error("Empty Misc5 patch.");
  if (parts.fields) {
    if (
      !parts.fields.length ||
      parts.fields.length > c.fields.length ||
      new Set(parts.fields.map((v) => v.id)).size !== parts.fields.length
    )
      throw Error("Invalid Misc5 fields.");
    for (const v of parts.fields) {
      const f = c.fields.find((f) => f.id === v.id);
      if (!f) throw Error("Invalid Misc5 field.");
      integer(v.value, f.minimum, misc5Maximum(c, f, parts.fields));
      if (f.choices && !f.choices.some((choice) => choice.id === v.value))
        throw Error("Invalid Misc5 choice.");
    }
  }
  if (parts.missions) {
    if (!c.missions.length) throw Error("Misc5 missions require B2W2.");
    unique(
      parts.missions.map((v) => v.index),
      44,
    );
    for (const m of parts.missions) {
      if (
        m.score === undefined &&
        m.total === undefined &&
        m.level === undefined &&
        m.isNew === undefined
      )
        throw Error("Empty Misc5 mission.");
      for (const value of [m.score, m.total])
        if (value !== undefined) integer(value, 0, 9999);
      if (m.level !== undefined && ![0, 1, 2, 3, 7].includes(m.level))
        throw Error("Invalid Misc5 mission level.");
      if (m.isNew !== undefined && typeof m.isNew !== "boolean")
        throw Error("Invalid Misc5 NEW flag.");
    }
  }
  if (parts.forest) {
    unique(
      parts.forest.map((v) => v.index),
      529,
    );
    for (const f of parts.forest) {
      const original = c.forest[f.index];
      if (
        f.species === undefined &&
        f.move === undefined &&
        f.form === undefined &&
        f.gender === undefined &&
        f.animation === undefined
      )
        throw Error("Empty Misc5 forest entry.");
      if (
        (f.species !== undefined &&
          !c.speciesChoices.some((v) => v.id === f.species)) ||
        (f.move !== undefined && !c.moveChoices.some((v) => v.id === f.move))
      )
        throw Error("Invalid Misc5 forest choice.");
      const species = f.species ?? original.species,
        choices = c.forestChoices.find((v) => v.species === species);
      if (
        (f.form !== undefined &&
          !choices?.forms.some((v) => v.id === f.form)) ||
        (f.gender !== undefined && !choices?.genders.includes(f.gender))
      )
        throw Error("Invalid Misc5 forest form or gender.");
      if (f.animation !== undefined) integer(f.animation, 0, 7);
    }
  }
  return { action: "patch", sourceHash: c.sourceHash, ...parts };
}
export function misc5Action(
  c: Misc5Catalog,
  action: Exclude<Misc5Edit["action"], "patch" | "importFc">,
): Misc5Edit {
  catalog(c);
  if ((action === "giveKeys" || action === "missionUnlockAll") && c.canExportFc)
    throw Error("Misc5 action requires B2W2.");
  if (action === "forestRandom" && c.randomCandidates < c.forest.length)
    throw Error("Misc5 random source is too small.");
  return { action, sourceHash: c.sourceHash };
}
export function misc5Import(c: Misc5Catalog, data: Uint8Array): Misc5Edit {
  catalog(c);
  if (!c.canExportFc || data.length !== 488)
    throw Error("Invalid Misc5 fc5 size or format.");
  return {
    action: "importFc",
    sourceHash: c.sourceHash,
    dataBase64: btoa(String.fromCharCode(...data)),
  };
}
export function misc5Frozen(c: Misc5Catalog, p: Misc5Preview): Misc5Edit {
  catalog(c);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[A-F0-9]{64}$/.test(p.request.targetHash ?? "") ||
    p.result.sourceHash !== p.request.targetHash ||
    !p.result.canEdit
  )
    throw Error("Misc5 preview is stale.");
  if (p.request.action === "forestRandom") {
    const rows = p.request.frozenForest;
    if (
      !rows ||
      rows.length !== 530 ||
      new Set(rows.map((v) => v.sourceIndex)).size !== 530
    )
      throw Error("Missing Misc5 frozen draws.");
    for (const row of rows) {
      integer(row.sourceIndex, 0, c.randomCandidates - 1);
      integer(row.raw, 0, 0xffffffff);
    }
  }
  return p.request;
}
