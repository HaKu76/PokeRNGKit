import type { OriginChoice } from "./domain";
export interface Hall6Member {
  index: number;
  editable: boolean;
  species: number;
  heldItem: number;
  moves: number[];
  ec: string;
  tid: number;
  sid: number;
  form: number;
  gender: number;
  level: number;
  shiny: boolean;
  nicknamed: boolean;
  nickname: string;
  trainerName: string;
  trainerGender: number;
  sprite: string;
  rawHex: string;
  trashHex: string;
  forms: OriginChoice[];
  dualGender: boolean;
}
export interface Hall6Team {
  index: number;
  hasData: boolean;
  clearIndex: number;
  date: string | null;
  dateEditable: boolean;
  year: number;
  month: number;
  day: number;
  rawIndex: number;
  visibleMembers: number;
  members: Hall6Member[];
  rawHex: string;
}
export interface Hall6Catalog {
  canEdit: boolean;
  sourceHash: string;
  teams: Hall6Team[];
  species: OriginChoice[];
  items: OriginChoice[];
  moves: OriginChoice[];
  trashSpecies: OriginChoice[];
  trashLanguages: OriginChoice[];
  specialChars: number[];
  rawHex: string;
  speciesInfo: {
    id: number;
    forms: OriginChoice[];
    dualGender: boolean;
    formSelectable: boolean;
  }[];
}
export interface Hall6Trash {
  action: "prepare" | "hex" | "text" | "clear" | "layer";
  text?: string;
  hex?: string;
  species?: number;
  language?: number;
  generation?: number;
  uiLanguage?: "zh" | "en" | "ja";
}
export interface Hall6Edit {
  action: "patch" | "resave" | "delete" | "trash";
  sourceHash: string;
  team: number;
  member?: number;
  fields?: { id: string; value: string }[];
  trash?: Hall6Trash;
  targetHash?: string;
}
export interface Hall6Preview {
  request: Hall6Edit;
  result: Hall6Catalog;
  changedOffsets: number[];
}
export const supportsHall6 = (format: string) =>
  ["SAV6XY", "SAV6AO"].includes(format);
export const hall6Ids = [
  "Species",
  "HeldItem",
  "Move1",
  "Move2",
  "Move3",
  "Move4",
  "Ec",
  "Tid",
  "Sid",
  "Form",
  "Gender",
  "Level",
  "Shiny",
  "Nicknamed",
  "Nickname",
  "TrainerName",
  "TrainerGender",
  "ClearIndex",
  "Date",
] as const;
export type Hall6Id = (typeof hall6Ids)[number];
export function hall6Value(t: Hall6Team, p: Hall6Member, id: Hall6Id): string {
  if (id.startsWith("Move")) return String(p.moves[Number(id.slice(4)) - 1]);
  switch (id) {
    case "Species":
      return String(p.species);
    case "HeldItem":
      return String(p.heldItem);
    case "Ec":
      return p.ec;
    case "Tid":
      return String(p.tid);
    case "Sid":
      return String(p.sid);
    case "Form":
      return String(p.form);
    case "Gender":
      return String(p.gender);
    case "Level":
      return String(p.level);
    case "Shiny":
      return p.shiny ? "1" : "0";
    case "Nicknamed":
      return p.nicknamed ? "1" : "0";
    case "Nickname":
      return p.nickname;
    case "TrainerName":
      return p.trainerName;
    case "TrainerGender":
      return String(p.trainerGender);
    case "ClearIndex":
      return String(t.clearIndex);
    case "Date":
      return t.date ?? "";
    default:
      return "";
  }
}
function base(c: Hall6Catalog, team: number, member?: number) {
  if (
    !c.canEdit ||
    !/^[A-F0-9]{64}$/.test(c.sourceHash) ||
    !Number.isInteger(team) ||
    team < 0 ||
    team >= 16 ||
    !c.teams.some((t) => t.index === team) ||
    (member !== undefined &&
      (!Number.isInteger(member) ||
        member < 0 ||
        member >= 6 ||
        !c.teams[team].members[member]?.editable))
  )
    throw Error("Invalid Hall6 target.");
  return {
    sourceHash: c.sourceHash,
    team,
    ...(member !== undefined ? { member } : {}),
  };
}
export function hall6Patch(
  c: Hall6Catalog,
  team: number,
  member: number,
  fields: { id: string; value: string }[],
): Hall6Edit {
  const target = base(c, team, member);
  if (
    !fields.length ||
    fields.length > 19 ||
    new Set(fields.map((f) => f.id)).size !== fields.length ||
    fields.some((f) => !hall6Ids.includes(f.id as Hall6Id))
  )
    throw Error("Invalid Hall6 fields.");
  const p = c.teams[team].members[member],
    species = Number(
      fields.find((f) => f.id === "Species")?.value ?? p.species,
    ),
    info = c.speciesInfo.find((i) => i.id === species),
    nicknamed =
      fields.find((f) => f.id === "Nicknamed")?.value ??
      (p.nicknamed ? "1" : "0");
  for (const f of fields) {
    const id = f.id as Hall6Id,
      v = f.value;
    if (id === "Nickname" || id === "TrainerName") {
      if (v.length > 12 || (id === "Nickname" && nicknamed !== "1"))
        throw Error("Invalid Hall6 text.");
    } else if (["Tid", "Sid", "Level", "ClearIndex"].includes(id)) {
      const width = id === "Tid" || id === "Sid" ? 5 : 3;
      if (v.length > width || !/^[\d _]*$/.test(v))
        throw Error("Invalid Hall6 masked number.");
    } else if (id === "Ec") {
      if (v.length > 8) throw Error("Invalid Hall6 EC.");
    } else if (id === "Date") {
      if (!/^20(?:[0-4]\d|50)-\d\d-\d\d$/.test(v))
        throw Error("Invalid Hall6 date.");
      const date = new Date(v + "T00:00:00Z");
      if (
        !Number.isFinite(date.valueOf()) ||
        date.toISOString().slice(0, 10) !== v
      )
        throw Error("Invalid Hall6 date.");
    } else if (["Shiny", "Nicknamed", "TrainerGender"].includes(id)) {
      if (v !== "0" && v !== "1") throw Error("Invalid Hall6 flag.");
    } else if (id === "Gender") {
      if (!info?.dualGender || (v !== "0" && v !== "1"))
        throw Error("Invalid Hall6 gender.");
    } else {
      const choices =
        id === "Species"
          ? c.species
          : id === "HeldItem"
            ? c.items
            : id === "Form"
              ? (info?.forms ?? [])
              : c.moves;
      if (!/^\d+$/.test(v) || !choices.some((x) => x.id === Number(v)))
        throw Error("Invalid Hall6 choice.");
    }
  }
  return { ...target, action: "patch", fields };
}
export function hall6Action(
  c: Hall6Catalog,
  team: number,
  action: "resave" | "delete",
  member?: number,
): Hall6Edit {
  if (action === "delete" && team === 0)
    throw Error("Hall6 first entry is protected.");
  if (action === "resave" && member === undefined)
    throw Error("Missing Hall6 member.");
  return { ...base(c, team, action === "delete" ? undefined : member), action };
}
export function hall6Trash(
  c: Hall6Catalog,
  team: number,
  member: number,
  trash: Hall6Trash,
): Hall6Edit {
  const target = base(c, team, member);
  if (
    (trash.action === "hex" && !/^[A-Fa-f0-9]{52}$/.test(trash.hex ?? "")) ||
    (trash.action === "text" &&
      (trash.text === undefined || trash.text.length > 12)) ||
    (trash.action === "layer" &&
      (!c.trashSpecies.some((v) => v.id === trash.species) ||
        !c.trashLanguages.some((v) => v.id === trash.language) ||
        !Number.isInteger(trash.generation) ||
        trash.generation! < 0 ||
        trash.generation! > 100 ||
        !trash.uiLanguage))
  )
    throw Error("Invalid Hall6 trash fields.");
  return { ...target, action: "trash", trash };
}
export function hall6Frozen(c: Hall6Catalog, p: Hall6Preview) {
  if (
    !c.canEdit ||
    p.request.sourceHash !== c.sourceHash ||
    !/^[A-F0-9]{64}$/.test(p.request.targetHash ?? "") ||
    p.request.targetHash !== p.result.sourceHash ||
    !p.result.canEdit
  )
    throw Error("Hall6 preview is stale.");
  return p.request;
}
