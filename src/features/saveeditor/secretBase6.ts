import type { LocalizedText, OriginChoice } from "./domain";
export interface Sb6Field {
  id: string;
  kind: "number" | "text" | "boolean" | "enum" | "hex";
  value: string;
  minimum: number;
  maximum: number;
  textMaximum: number;
  storedTextMaximum: number;
  choices: OriginChoice[] | null;
}
export interface Sb6Placement {
  index: number;
  good: number;
  x: number;
  y: number;
  rotation: number;
  param1: number;
  param2: number;
  rawHex: string;
}
export interface Sb6Pokemon {
  index: number;
  species: number;
  name: LocalizedText;
  sprite: string;
  fields: Sb6Field[];
  isEgg: boolean;
  rawAbilityNumber: number;
  rawHex: string;
}
export interface Sb6Base {
  index: number;
  self: boolean;
  isEmpty: boolean;
  isDummiedLocation: boolean;
  name: string;
  properties: Sb6Field[];
  placements: Sb6Placement[];
  pokemon: Sb6Pokemon[];
  rawHex: string;
}
export interface Sb6SpeciesInfo {
  species: number;
  forms: OriginChoice[];
  formSelectable: boolean;
  dualGender: boolean;
  fixedGender: number;
  formInfo: { index: number; abilities: OriginChoice[]; fixedGender: number }[];
}
export interface Sb6Catalog {
  canEdit: boolean;
  sourceHash: string;
  capturedRecord: number;
  rawCapturedRecord: number;
  bases: Sb6Base[];
  stock: { index: number; count: number; isNew: boolean; rawHex: string }[];
  species: OriginChoice[];
  items: OriginChoice[];
  moves: OriginChoice[];
  balls: OriginChoice[];
  natures: OriginChoice[];
  speciesInfo: Sb6SpeciesInfo[];
  rawHex: string;
}
export interface Sb6Edit {
  action:
    | "property"
    | "placement"
    | "member"
    | "record"
    | "goods"
    | "delete"
    | "import"
    | "resave"
    | "export";
  sourceHash: string;
  base?: number;
  placement?: number;
  member?: number;
  fields?: { id: string; value: string }[];
  capturedRecord?: string;
  dataBase64?: string;
  targetHash?: string;
}
export interface Sb6Preview {
  request: Sb6Edit;
  result: Sb6Catalog;
  changedOffsets: number[];
}
export const supportsSecretBase6 = (format: string) => format === "SAV6AO";
export const sb6Value = (p: Sb6Pokemon, id: string) =>
  p.fields.find((f) => f.id === id)?.value ?? "";
function source(c: Sb6Catalog, write = true) {
  if ((write && !c.canEdit) || !/^[A-F0-9]{64}$/.test(c.sourceHash))
    throw Error("Invalid SecretBase6 catalog.");
}
function target(c: Sb6Catalog, b: number) {
  if (!Number.isInteger(b) || !c.bases.some((x) => x.index === b))
    throw Error("Invalid SecretBase6 base.");
  return c.bases.find((x) => x.index === b)!;
}
export function sb6PropertyValid(f: Sb6Field, v: string): boolean {
  if (v.length > f.textMaximum) return false;
  if (f.kind === "text" || f.kind === "hex") return true;
  if (f.kind === "boolean") return v === "0" || v === "1";
  if (f.kind === "enum") {
    const s = v.trim();
    if (/^[+-]?\d+$/.test(s)) {
      const n = Number(s);
      return Number.isInteger(n) && n >= f.minimum && n <= f.maximum;
    }
    return s
      .split(",")
      .every((x) =>
        ["default", "bronze", "silver", "gold", "platinum"].includes(
          x.trim().toLowerCase(),
        ),
      );
  }
  const text = v.trim();
  let n: number;
  if (/^(?:0x|#|&h)[a-f0-9]+$/i.test(text)) {
    n = parseInt(text.replace(/^(?:0x|#|&h)/i, ""), 16);
    if (f.minimum < 0) {
      if (n > 0xffffffff) return false;
      n = n | 0;
    }
  } else {
    if (!/^[+-]?\d+$/.test(text)) return false;
    n = Number(text);
  }
  return Number.isInteger(n) && n >= f.minimum && n <= f.maximum;
}
export function sb6Choices(
  c: Sb6Catalog,
  p: Sb6Pokemon,
  id: string,
  draft: Record<string, string> = {},
): OriginChoice[] | undefined {
  const species = Number(draft.Species ?? sb6Value(p, "Species")),
    info = c.speciesInfo.find((s) => s.species === species),
    form = Number(
      draft.Form ?? (draft.Species !== undefined ? "0" : sb6Value(p, "Form")),
    );
  if (id === "Species") return c.species;
  if (id === "HeldItem") return c.items;
  if (id === "Nature") return c.natures;
  if (id === "Ball") return c.balls;
  if (/^Move[1-4]$/.test(id)) return c.moves;
  if (id === "Form") return info?.forms ?? [];
  if (id === "AbilitySlot")
    return info?.formInfo.find((f) => f.index === form)?.abilities ?? [];
  if (/^PP[1-4]$/.test(id))
    return [0, 1, 2, 3].map((id) => ({
      id,
      name: { zh: String(id), en: String(id), ja: String(id) },
    }));
  if (id === "Gender") {
    const fixed =
        info?.formInfo.find((f) => f.index === form)?.fixedGender ?? -1,
      ids =
        fixed >= 0
          ? [fixed]
          : info?.dualGender
            ? [0, 1]
            : info
              ? [info.fixedGender]
              : [];
    return ids.map((id) => ({
      id,
      name: {
        zh: ["雄性", "雌性", "无性别"][id],
        en: ["Male", "Female", "Genderless"][id],
        ja: ["オス", "メス", "性別不明"][id],
      },
    }));
  }
  return undefined;
}
export function sb6Patch(
  c: Sb6Catalog,
  b: number,
  action: "property" | "placement" | "member",
  fields: { id: string; value: string }[],
  index?: number,
): Sb6Edit {
  source(c);
  const base = target(c, b);
  if (
    !fields.length ||
    fields.length > 40 ||
    new Set(fields.map((f) => f.id)).size !== fields.length
  )
    throw Error("Invalid SecretBase6 fields.");
  if (action === "property") {
    if (index !== undefined)
      throw Error("Invalid SecretBase6 property target.");
    for (const row of fields) {
      const f = base.properties.find((x) => x.id === row.id);
      if (!f || !sb6PropertyValid(f, row.value))
        throw Error("Invalid SecretBase6 property value.");
    }
  } else if (action === "placement") {
    if (!base.placements.some((p) => p.index === index))
      throw Error("Invalid SecretBase6 placement.");
    for (const f of fields) {
      const min = f.id === "Good" ? -1 : 0,
        max = f.id === "Rotation" ? 255 : 65535;
      if (
        !["Good", "X", "Y", "Rotation"].includes(f.id) ||
        f.value.length > 6 ||
        !/^[+-]?\d+$/.test(f.value.trim()) ||
        Number(f.value) < min ||
        Number(f.value) > max
      )
        throw Error("Invalid SecretBase6 placement value.");
    }
  } else {
    const p = base.pokemon.find((p) => p.index === index);
    if (!p) throw Error("Invalid SecretBase6 member.");
    const draft = Object.fromEntries(fields.map((f) => [f.id, f.value]));
    for (const row of fields) {
      const f = p.fields.find((f) => f.id === row.id);
      if (!f) throw Error("Invalid SecretBase6 member field.");
      if (f.kind === "hex") {
        if (row.value.length > 8) throw Error("Invalid SecretBase6 EC.");
        continue;
      }
      if (f.kind === "boolean") {
        if (!sb6PropertyValid(f, row.value))
          throw Error("Invalid SecretBase6 flag.");
        continue;
      }
      const choices = sb6Choices(c, p, row.id, draft);
      if (choices) {
        if (
          !/^\d+$/.test(row.value) ||
          !choices.some((v) => v.id === Number(row.value))
        )
          throw Error("Invalid SecretBase6 member choice.");
      } else {
        const s = row.value.replaceAll("_", " ").trim();
        if (
          row.value.length > f.textMaximum ||
          !/^[\d _]+$/.test(row.value) ||
          !/^\d+$/.test(s) ||
          Number(s) > f.maximum
        )
          throw Error("Invalid SecretBase6 masked number.");
      }
    }
  }
  return {
    action,
    sourceHash: c.sourceHash,
    base: b,
    ...(action === "placement"
      ? { placement: index }
      : action === "member"
        ? { member: index }
        : {}),
    fields,
  };
}
export function sb6Record(c: Sb6Catalog, text: string): Sb6Edit {
  source(c);
  if (!/^\d{1,10}$/.test(text) || Number(text) > 4294967295)
    throw Error("Invalid SecretBase6 captured record.");
  return { action: "record", sourceHash: c.sourceHash, capturedRecord: text };
}
export function sb6Command(
  c: Sb6Catalog,
  action: "goods" | "delete",
  b?: number,
): Sb6Edit {
  source(c);
  if (action === "goods") {
    if (b !== undefined) throw Error("Invalid SecretBase6 goods target.");
    return { action, sourceHash: c.sourceHash };
  }
  if (b === undefined || target(c, b).self)
    throw Error("Invalid SecretBase6 deletion.");
  return { action, sourceHash: c.sourceHash, base: b };
}
export function sb6File(c: Sb6Catalog, b: number, bytes: Uint8Array): Sb6Edit {
  source(c);
  target(c, b);
  if (![0x310, 0x3e0].includes(bytes.length))
    throw Error("Invalid SecretBase6 sb6 size.");
  return {
    action: "import",
    sourceHash: c.sourceHash,
    base: b,
    dataBase64: btoa(String.fromCharCode(...bytes)),
  };
}
export function sb6Window(
  c: Sb6Catalog,
  action: "resave" | "export",
  b: number,
  placement: number,
  member?: number,
): Sb6Edit {
  source(c, action === "resave");
  const base = target(c, b);
  if (
    !base.placements.some((p) => p.index === placement) ||
    (base.self
      ? member !== undefined
      : !base.pokemon.some((p) => p.index === member)) ||
    (action === "resave" && c.capturedRecord < 0)
  )
    throw Error("Invalid SecretBase6 window target.");
  if (!base.self) {
    const p = base.pokemon.find((p) => p.index === member)!,
      info = c.speciesInfo.find((s) => s.species === p.species);
    if (
      !info ||
      !info.forms.some((f) => f.id === Number(sb6Value(p, "Form"))) ||
      p.fields.some((f) => /^PP[1-4]$/.test(f.id) && Number(f.value) > 3)
    )
      throw Error("Invalid SecretBase6 stored member.");
  }
  return {
    action,
    sourceHash: c.sourceHash,
    base: b,
    placement,
    ...(!base.self ? { member } : {}),
  };
}
export function sb6Frozen(c: Sb6Catalog, p: Sb6Preview): Sb6Edit {
  source(c);
  if (
    p.request.action === "export" ||
    p.request.sourceHash !== c.sourceHash ||
    !/^[A-F0-9]{64}$/.test(p.request.targetHash ?? "") ||
    p.result.sourceHash !== p.request.targetHash ||
    !p.result.canEdit
  )
    throw Error("SecretBase6 preview is stale.");
  return p.request;
}
