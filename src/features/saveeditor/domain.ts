import {
  appearanceDraft,
  rebaseAppearance,
  validateAppearance,
  type AppearanceDraft,
  type TrainerAppearance6State,
} from "./trainerAppearance6";
import {
  TRAINER_SPATIAL_KEYS,
  validateSpatialPosition,
  type TrainerSpatialKey,
  type TrainerSpatialField,
} from "./trainerSpatialPosition";
import { trainerDateValue, validateTrainerDates } from "./trainerDates";
export const MAX_SAVE_BYTES = 32 * 1024 * 1024;
export const TRAINER_CURRENCY_KEYS = [
  "bp",
  "pokeMiles",
  "festivalCoins",
  "watts",
] as const;
export type TrainerCurrencyKey = (typeof TRAINER_CURRENCY_KEYS)[number];
export const TRAINER_GAME_OPTION_KEYS = [
  "textSpeed",
  "battleStyle",
  "sound",
  "battleEffects",
] as const;
export type TrainerGameOptionKey = (typeof TRAINER_GAME_OPTION_KEYS)[number];
export const TRAINER_POSITION_KEYS = ["map", "x", "z", "y"] as const;
export type TrainerPositionKey = (typeof TRAINER_POSITION_KEYS)[number];
export const trainerPositionRange = (key: TrainerPositionKey) => ({
  min: key === "z" ? -65535 : 0,
  max: key === "map" ? 1000 : 65535,
});

export const TRAINER_DATE_KEYS = ["started", "fame", "saved"] as const;
export type TrainerDateKey = (typeof TRAINER_DATE_KEYS)[number];
export interface TrainerDateField {
  key: TrainerDateKey;
  value: string;
  kind: "date" | "minute" | "second" | "utc";
  min: string;
  max: string;
}

export interface SaveReport {
  pokedex: {
    kind:
      | "simple"
      | "gen4"
      | "gen5"
      | "gen6"
      | "gen7"
      | "bdsp"
      | "swsh"
      | "legends"
      | "sv"
      | "za";
    canEdit: boolean;
  } | null;
  apiVersion: 84;
  attributeChoices: {
    natures: LocalizedText[];
    items: LocalizedText[];
    species: SpeciesChoice[];
  };
  format: string;
  generation: number;
  version: string;
  ot: string;
  tid: number;
  sid: number;
  displayTid: number;
  displaySid: number;
  language: number;
  gender: number;
  money: number;
  maxMoney: number;
  maxNameLength: number;
  boxCount: number;
  partyCount: number;
  playTime: string;
  trainer: {
    appearance6: TrainerAppearance6State | null;
    gameVersion: { value: number; choices: OriginChoice[] };
    spatialPosition: TrainerSpatialField[];
    dates: TrainerDateField[];
    position: Record<TrainerPositionKey, number> | null;
    gameOptions: Record<TrainerGameOptionKey, number> | null;
    canRecords: boolean;
    currencies: { key: TrainerCurrencyKey; value: number; max: number }[];
    badges: { count: number; value: number } | null;
    geography: {
      value: { country: number; region: number; consoleRegion: number | null };
      keepRegionWhenCountryZero: boolean;
      countries: OriginChoice[];
      regions: { country: number; choices: OriginChoice[] }[];
      consoles: OriginChoice[];
    } | null;
    languages: OriginChoice[];
    canGender: boolean;
    canPlayTime: boolean;
    hours: number;
    minutes: number;
    seconds: number;
  };
  checksumsValid: boolean;
  canEdit: boolean;
  extension: string;
  nationalDex: boolean | null;
  pokemon: PokemonEntry[];
  moveChoices: MoveChoice[];
  boxSlotCount: number;
  boxOptions: {
    canName: boolean;
    nameLength: number;
    wallpapers: LocalizedText[];
    unlocked: number | null;
    flags: number[];
    flagMaximum: number;
    canSwap: boolean;
    batchActions: { id: string; group: number }[];
  };
  boxes: { index: number; name: string; wallpaper: number }[];
}

export interface LocalizedText {
  zh: string;
  en: string;
  ja: string;
}
export interface MoveChoice {
  name: LocalizedText;
  maxPp: number[];
}
export interface SpeciesChoice {
  id: number;
  name: LocalizedText;
  forms: {
    name: LocalizedText;
    genders: number[];
    abilities: LocalizedText[];
  }[];
}
export interface OriginChoice {
  id: number;
  name: LocalizedText;
}
export interface OriginCatalog {
  version: number;
  games: OriginChoice[];
  balls: OriginChoice[];
  metLocations: OriginChoice[];
  eggLocations: OriginChoice[];
}
export interface PokemonEntry {
  relearnMoves: number[] | null;
  training: {
    contest: number[] | null;
    canEditContest: boolean;
    hyper: boolean[] | null;
  };
  eggInfo: { cycles: number; suggestedMinimum: number } | null;
  origin: {
    version: number;
    ball: number;
    metLocation: number;
    eggLocation: number;
    canEggLocation: boolean;
  };
  encounter: {
    metLevel: number;
    maxMetLevel: number;
    fateful: boolean;
    canDates: boolean;
    metDate: string;
    eggDate: string;
  };
  formArgument: {
    mode: "Raw" | "Named" | "Triple" | "TripleParty";
    value: number;
    max: number;
    remain: number;
    elapsed: number;
    maximum: number;
    canRemain: boolean;
    canElapsed: boolean;
    canMaximum: boolean;
    choices: LocalizedText[];
  } | null;
  canEditEncryptionConstant: boolean;
  isNicknamed: boolean;
  natureId: number;
  statAlignment: number;
  canStatAlignment: boolean;
  abilityIndex: number;
  abilityChoices: LocalizedText[];
  heldItem: number;
  movePpUps: number[];
  sprite: string;
  moveIds: number[];
  limits: {
    nickname: number;
    trainerName: number;
    iv: number;
    ev: number;
    move: number;
  };
  box: number;
  slot: number;
  species: number;
  form: number;
  nickname: string;
  level: number;
  gender: number;
  shiny: boolean;
  egg: boolean;
  valid: boolean;
  ot: string;
  tid: number;
  sid: number;
  pid: number;
  encryptionConstant: number;
  experience: number;
  friendship: number;
  speciesName: LocalizedText;
  nature: LocalizedText;
  ability: LocalizedText;
  item: LocalizedText;
  moves: LocalizedText[];
  movePp: number[];
  ivs: number[];
  evs: number[];
}

export interface TrainerDraft
  extends
    AppearanceDraft,
    Record<
      | TrainerCurrencyKey
      | TrainerGameOptionKey
      | TrainerSpatialKey
      | TrainerPositionKey
      | TrainerDateKey,
      string
    > {
  gameVersion: string;
  badges: string;
  country: string;
  region: string;
  consoleRegion: string;
  language: string;
  ot: string;
  tid: string;
  sid: string;
  money: string;
  gender: string;
  hours: string;
  minutes: string;
  seconds: string;
}

export function trainerDraft(report: SaveReport): TrainerDraft {
  return {
    ...appearanceDraft(report.trainer.appearance6),
    started: trainerDateValue(
      report.trainer.dates.find((f) => f.key === "started"),
    ),
    fame: trainerDateValue(report.trainer.dates.find((f) => f.key === "fame")),
    rotation:
      report.trainer.spatialPosition.find((f) => f.key === "rotation")?.value ??
      "",
    scaleX:
      report.trainer.spatialPosition.find((f) => f.key === "scaleX")?.value ??
      "",
    scaleZ:
      report.trainer.spatialPosition.find((f) => f.key === "scaleZ")?.value ??
      "",
    scaleY:
      report.trainer.spatialPosition.find((f) => f.key === "scaleY")?.value ??
      "",
    saved: trainerDateValue(
      report.trainer.dates.find((f) => f.key === "saved"),
    ),
    ...(Object.fromEntries(
      TRAINER_POSITION_KEYS.map((key) => [
        key,
        report.trainer.spatialPosition.find((f) => f.key === key)?.value ??
          String(report.trainer.position?.[key] ?? ""),
      ]),
    ) as Record<TrainerPositionKey, string>),
    ...(Object.fromEntries(
      TRAINER_GAME_OPTION_KEYS.map((key) => [
        key,
        String(report.trainer.gameOptions?.[key] ?? ""),
      ]),
    ) as Record<TrainerGameOptionKey, string>),
    ...(Object.fromEntries(
      TRAINER_CURRENCY_KEYS.map((key) => [
        key,
        String(
          report.trainer.currencies.find((f) => f.key === key)?.value ?? "",
        ),
      ]),
    ) as Record<TrainerCurrencyKey, string>),
    gameVersion: String(report.trainer.gameVersion.value),
    badges: String(report.trainer.badges?.value ?? ""),
    country: String(report.trainer.geography?.value.country ?? ""),
    region: String(report.trainer.geography?.value.region ?? ""),
    consoleRegion: String(report.trainer.geography?.value.consoleRegion ?? ""),
    language: String(report.language),
    ot: report.ot,
    tid: String(report.tid),
    sid: String(report.sid),
    money: String(report.money),
    gender: String(report.gender),
    hours: String(report.trainer.hours),
    minutes: String(report.trainer.minutes),
    seconds: String(report.trainer.seconds),
  };
}

export function trainerDraftMatches(
  draft: TrainerDraft,
  report: SaveReport,
): boolean {
  const baseline = trainerDraft(report);
  const keys = Object.keys(baseline) as (keyof TrainerDraft)[];
  return (
    Object.keys(draft).length === keys.length &&
    keys.every((key) => draft[key] === baseline[key])
  );
}

// Rebase applied values on undo without discarding a separate, unapplied draft.
export function rebaseTrainerDraft(
  draft: TrainerDraft,
  before: SaveReport,
  after: SaveReport,
): TrainerDraft {
  const old = trainerDraft(before),
    next = trainerDraft(after);
  const result = { ...draft };
  for (const key of Object.keys(next) as (keyof TrainerDraft)[])
    if (draft[key] === old[key]) result[key] = next[key];
  if (draft.country !== old.country || draft.region !== old.region) {
    result.country = draft.country;
    result.region = draft.region;
  }
  if (TRAINER_SPATIAL_KEYS.some((key) => draft[key] !== old[key]))
    for (const key of TRAINER_SPATIAL_KEYS) result[key] = draft[key];
  return rebaseAppearance(
    draft,
    before.trainer.appearance6,
    after.trainer.appearance6,
    result,
  );
}

export function validateTrainer(draft: TrainerDraft, report: SaveReport) {
  if (!report.canEdit || !report.checksumsValid)
    throw new Error("This save is read-only.");
  if (
    !draft.ot ||
    draft.ot.length > report.maxNameLength ||
    [...draft.ot].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  ) {
    throw new Error(`OT: 1–${report.maxNameLength} characters.`);
  }
  const integer = (text: string, max: number, label: string) => {
    if (!/^\d+$/.test(text) || Number(text) > max)
      throw new Error(`${label}: 0–${max}.`);
    return Number(text);
  };
  const gameVersion =
    draft.gameVersion === String(report.trainer.gameVersion.value)
      ? undefined
      : Number(draft.gameVersion);
  if (
    gameVersion !== undefined &&
    (!/^\d+$/.test(draft.gameVersion) ||
      !report.trainer.gameVersion.choices.some((c) => c.id === gameVersion))
  )
    throw new Error("Trainer game version is unsupported for this save.");
  const language =
    draft.language !== String(report.language)
      ? Number(draft.language)
      : undefined;
  if (
    language !== undefined &&
    (!/^\d+$/.test(draft.language) ||
      !report.trainer.languages.some((choice) => choice.id === language))
  )
    throw new Error("Trainer language is unsupported for this save.");
  const badges =
    draft.badges !== String(report.trainer.badges?.value ?? "")
      ? Number(draft.badges)
      : undefined;
  if (
    badges !== undefined &&
    (!report.trainer.badges ||
      !/^\d+$/.test(draft.badges) ||
      badges >= 2 ** report.trainer.badges.count)
  )
    throw new Error("Trainer badges are unsupported or out of range.");
  const currencies: Partial<Record<TrainerCurrencyKey, number>> = {};
  for (const key of TRAINER_CURRENCY_KEYS) {
    const field = report.trainer.currencies.find((f) => f.key === key);
    if (draft[key] === String(field?.value ?? "")) continue;
    if (!field || !/^\d+$/.test(draft[key]) || Number(draft[key]) > field.max)
      throw new Error("Trainer currency is unsupported or out of range.");
    currencies[key] = Number(draft[key]);
  }
  const gameOptions: Partial<Record<TrainerGameOptionKey, number>> = {};
  for (const key of TRAINER_GAME_OPTION_KEYS) {
    const original = report.trainer.gameOptions?.[key];
    if (draft[key] === String(original ?? "")) continue;
    if (
      original === undefined ||
      !/^\d+$/.test(draft[key]) ||
      Number(draft[key]) > (key === "textSpeed" ? 7 : 1)
    )
      throw new Error("Trainer game options are unsupported or out of range.");
    if (key === "textSpeed" && Number(draft[key]) > 3)
      throw new Error(
        "Trainer text speed cannot be preserved by this core version.",
      );
    gameOptions[key] = Number(draft[key]);
  }
  const position: Partial<Record<TrainerPositionKey, number>> = {};
  for (const key of report.trainer.spatialPosition.length
    ? []
    : TRAINER_POSITION_KEYS) {
    const original = report.trainer.position?.[key];
    if (draft[key] === String(original ?? "")) continue;
    const { min, max } = trainerPositionRange(key),
      value = Number(draft[key]);
    if (
      original === undefined ||
      !(key === "z" ? /^-?\d+$/ : /^\d+$/).test(draft[key]) ||
      !Number.isSafeInteger(value) ||
      value < min ||
      value > max
    )
      throw new Error("Trainer position is unsupported or out of range.");
    position[key] = value;
  }
  return {
    appearance6: validateAppearance(draft, report.trainer.appearance6),
    spatialPosition: validateSpatialPosition(
      draft,
      report.trainer.spatialPosition,
    ),
    dates: validateTrainerDates(draft, report.trainer.dates),
    position: Object.keys(position).length ? position : undefined,
    gameOptions: Object.keys(gameOptions).length ? gameOptions : undefined,
    currencies: Object.keys(currencies).length ? currencies : undefined,
    gameVersion,
    language,
    badges,
    ...validateTrainerGeography(draft, report),
    ot: draft.ot,
    tid: integer(draft.tid, 65535, "TID16"),
    sid: integer(draft.sid, 65535, "SID16"),
    money: integer(draft.money, report.maxMoney, "Money"),
    gender:
      report.trainer.canGender && draft.gender !== String(report.gender)
        ? integer(draft.gender, 1, "Gender")
        : undefined,
    hours:
      report.trainer.canPlayTime && draft.hours !== String(report.trainer.hours)
        ? integer(draft.hours, 65535, "Hours")
        : undefined,
    minutes:
      report.trainer.canPlayTime &&
      draft.minutes !== String(report.trainer.minutes)
        ? integer(draft.minutes, 99, "Minutes")
        : undefined,
    seconds:
      report.trainer.canPlayTime &&
      draft.seconds !== String(report.trainer.seconds)
        ? integer(draft.seconds, 99, "Seconds")
        : undefined,
  };
}

function validateTrainerGeography(draft: TrainerDraft, report: SaveReport) {
  const old = trainerDraft(report),
    geo = report.trainer.geography;
  const changed = draft.country !== old.country || draft.region !== old.region;
  const consoleChanged = draft.consoleRegion !== old.consoleRegion;
  if (!changed && !consoleChanged) return {};
  const fail = () => {
    throw new Error("Trainer geography is outside the supported catalog.");
  };
  if (!geo) return fail();
  const byte = (text: string) => /^\d+$/.test(text) && Number(text) <= 255;
  const country = Number(draft.country),
    region = Number(draft.region),
    consoleRegion = Number(draft.consoleRegion);
  if (
    changed &&
    (!byte(draft.country) ||
      !byte(draft.region) ||
      !geo.countries.some((c) => c.id === country) ||
      ((country !== 0 || !geo.keepRegionWhenCountryZero) &&
        !geo.regions.some(
          (r) =>
            r.country === country && r.choices.some((c) => c.id === region),
        )))
  )
    return fail();
  if (
    consoleChanged &&
    (!byte(draft.consoleRegion) ||
      !geo.consoles.some((c) => c.id === consoleRegion))
  )
    return fail();
  return {
    country: changed ? country : undefined,
    region: changed ? region : undefined,
    consoleRegion: consoleChanged ? consoleRegion : undefined,
  };
}

export function changeTrainerCountry(
  draft: TrainerDraft,
  report: SaveReport,
  country: string,
): TrainerDraft {
  const geo = report.trainer.geography;
  if (!geo || country === draft.country) return draft;
  // Upstream keeps the previous selected index when rebuilding a positive country's list.
  // 3DS country zero preserves the region; NDS rebuilds its default list instead.
  if (country === "0" && geo.keepRegionWhenCountryZero)
    return { ...draft, country };
  const old =
    geo.regions.find((r) => String(r.country) === draft.country)?.choices ?? [];
  const next =
    geo.regions.find((r) => String(r.country) === country)?.choices ?? [];
  const index = old.findIndex((c) => String(c.id) === draft.region);
  return {
    ...draft,
    country,
    region: String(next[index > 0 && index < next.length ? index : 0]?.id ?? 0),
  };
}

// Grouped game IDs are deliberately not resolved to one arbitrary game.
export const SAVE_GAME_CHOICES: Readonly<Record<string, readonly string[]>> = {
  R: ["ruby"],
  S: ["sapphire"],
  RS: ["ruby", "sapphire"],
  E: ["emerald"],
  FR: ["firered"],
  LG: ["leafgreen"],
  FRLG: ["firered", "leafgreen"],
  COLO: ["colosseum"],
  XD: ["xd"],
  D: ["diamond"],
  P: ["pearl"],
  DP: ["diamond", "pearl"],
  Pt: ["platinum"],
  HG: ["heartgold"],
  SS: ["soulsilver"],
  HGSS: ["heartgold", "soulsilver"],
  B: ["black"],
  W: ["white"],
  BW: ["black", "white"],
  B2: ["black2"],
  W2: ["white2"],
  B2W2: ["black2", "white2"],
  X: ["x"],
  Y: ["y"],
  OR: ["omega-ruby"],
  AS: ["alpha-sapphire"],
  SN: ["sun"],
  MN: ["moon"],
  US: ["ultra-sun"],
  UM: ["ultra-moon"],
  SW: ["sword"],
  SH: ["shield"],
  BD: ["brilliantdiamond"],
  SP: ["shiningpearl"],
};

export function saveGameChoices(report: SaveReport): readonly string[] {
  if (report.format === "SAV3Colosseum") return ["colosseum"];
  if (report.format === "SAV3XD") return ["xd"];
  if (
    (report.format === "SAV7SM" && !["SN", "MN"].includes(report.version)) ||
    (report.format === "SAV7USUM" && !["US", "UM"].includes(report.version))
  )
    return [];
  return SAVE_GAME_CHOICES[report.version] ?? [];
}

export function reconcileSaveGame(current: string, report: SaveReport): string {
  const choices = saveGameChoices(report);
  return choices.includes(current)
    ? current
    : choices.length === 1
      ? choices[0]
      : "";
}

export function exportSaveName(name: string) {
  const clean = [...name.replace(/[<>:"/\\|?*]/gu, "_")]
    .map((char) => (char.charCodeAt(0) < 32 ? "_" : char))
    .join("");
  return `edited-${clean || "main"}`;
}

export interface PokemonPosition {
  box: number;
  slot: number;
}
export interface PokemonRawEdit extends PokemonPosition {
  action:
    | "values"
    | "rerollPid"
    | "rerollEc"
    | "formArgument"
    | "encounter"
    | "origin"
    | "egg"
    | "shiny"
    | "relearn"
    | "ribbons"
    | "training"
    | "history"
    | "care"
    | "memory";
  relearn?: { moves: number[] };
  memory?: MemoryEdit;
  history?: HistoryEdit;
  training?: { contest?: number[]; hyper?: boolean[] };
  care?: { values: { key: CareField["key"]; value: number }[] };
  ribbons?: {
    mode?: "values" | "suggest" | "minimal";
    values: { key: string; value: number }[];
    affixed?: number;
  };
  shiny?: { method: "pid" | "sid"; type: "any" | "star" | "square" | "off" };
  egg?: { action: "cycles" | "hatch" | "makeEgg"; cycles?: number };
  origin?: {
    version?: number;
    ball?: number;
    metLocation?: number;
    eggLocation?: number;
  };
  encounter?: {
    metLevel?: number;
    fateful?: boolean;
    metDate?: string;
    eggDate?: string;
  };
  formArgument?: {
    value?: number;
    remain?: number;
    elapsed?: number;
    maximum?: number;
  };
  pid?: number;
  encryptionConstant?: number;
}

export function parsePokemonHex(value: string): number {
  if (!/^[0-9a-f]{1,8}$/i.test(value))
    throw new Error("Pokemon value must contain 1–8 hexadecimal digits.");
  return Number.parseInt(value, 16);
}
export interface PokemonLegalityReport extends PokemonPosition {
  parsed: boolean;
  valid: boolean;
  summary: LocalizedText;
  details: LocalizedText;
}
export interface MemoryEdit {
  handler: 0 | 1;
  memory: number;
  variable: number;
  intensity: number;
  feeling: number;
}
export interface MemoryQuery extends PokemonPosition {
  handler: 0 | 1;
  memory?: number;
}
export interface GeoValue {
  index: number;
  country: number;
  region: number;
}
export interface HistoryEdit {
  handler?: number;
  locations?: GeoValue[];
}
export interface HistoryCatalog {
  holder: { current: number; original: string; handling: string };
  geo: {
    entries: (GeoValue & { canEdit: boolean })[];
    countries: OriginChoice[];
    regions: { country: number; choices: OriginChoice[] }[];
  } | null;
}

export interface CareField {
  key:
    | "originalFriendship"
    | "handlingFriendship"
    | "originalAffection"
    | "handlingAffection"
    | "fullness"
    | "enjoyment"
    | "sociability";
  value: number;
  max: number;
  canEdit: boolean;
}

export interface MemoryCatalog {
  care: CareField[];
  isEgg: boolean;
  current: MemoryEdit;
  canEdit: boolean;
  nickname: string;
  trainer: string;
  memories: OriginChoice[];
  variables: OriginChoice[];
  intensities: OriginChoice[];
  feelings: OriginChoice[];
  argumentType: string;
}
export interface RibbonCatalog {
  entries: {
    key: string;
    name: LocalizedText;
    value: number;
    max: number;
    status:
      "unchecked" | "missing" | "invalid" | "possible" | "mark" | "unmarked";
  }[];
  analysisComplete: boolean;
  affixed: number | null;
  affixedChoices: { id: number; name: LocalizedText }[];
}
export interface SaveEditorResult {
  boxImportPreview?: import("./boxImport").BoxImportTicket;
  boxBinaryPreview?: import("./boxBinary").BoxBinaryTicket;
  boxBinary?: Uint8Array<ArrayBuffer>;
  filePreview?: import("./fileBatch").FileBatchTicket;
  fileCatalog?: import("./propertyBatch").PropertyBatchCatalog[];
  archive?: Uint8Array<ArrayBuffer>;
  propertyCatalog?: import("./propertyBatch").PropertyBatchCatalog;
  propertyPreview?: import("./propertyBatch").PropertyBatchTicket;
  pokedex9a?: import("./zaPokedex").Dex9aCatalog;
  pokedex9?: import("./svPokedex").Dex9Catalog;
  pokedex8a?: import("./legendsPokedex").Dex8aCatalog;
  pokedex8?: import("./swshPokedex").Dex8Catalog;
  pokedex8b?: import("./bdspPokedex").Dex8bCatalog;
  pokedex7?: import("./gen7Pokedex").Dex7Catalog;
  pokedex6?: import("./gen5Pokedex").Dex5Catalog;
  pokedex5?: import("./gen5Pokedex").Dex5Catalog;
  pokedex4?: import("./gen4Pokedex").Dex4Catalog;
  pokedex?: import("./simplePokedex").SimpleDexCatalog;
  events?: import("./events").EventCatalog;
  eventDiff?: import("./events").EventDiff;
  eventReset?: import("./eventReset").EventResetCatalog;
  roamer?: import("./roamer").RoamerCatalog;
  rtc?: import("./rtc").RtcCatalog;
  opowers?: import("./opowers").OPowerCatalog;
  food?: import("./saveFood").SaveFoodCatalog;
  records?: SaveRecordCatalog;
  inventory?: BagReport;
  memoryCatalog?: MemoryCatalog;
  historyCatalog?: HistoryCatalog;
  ribbons?: RibbonCatalog;
  relearnSuggestion?: number[];
  originCatalog?: OriginCatalog;
  report: SaveReport;
  output?: Uint8Array;
  legality?: PokemonLegalityReport;
  pokemonFile?: { fileName: string; data: string };
}

export interface SaveRecordEntry {
  index: number;
  name: string;
  value: number;
  max: number;
  normalMax: number;
  offset: number;
  timeHint: string | null;
}
export interface SaveRecordCatalog {
  entries: SaveRecordEntry[];
}
export interface SaveRecordEdit {
  index: number;
  value: number;
}
export function validateSaveRecord(
  entry: SaveRecordEntry,
  text: string,
): SaveRecordEdit {
  if (
    !/^\d+$/.test(text) ||
    !Number.isSafeInteger(Number(text)) ||
    Number(text) > entry.max
  )
    throw new Error("Game record value is out of range.");
  return { index: entry.index, value: Number(text) };
}

export interface BagItem {
  slot: number;
  id: number;
  sprite: string;
  name: LocalizedText;
  count: number;
  maxCount: number;
  allowed: boolean;
  favorite: boolean | null;
  isNew: boolean | null;
  freeSpace: boolean | null;
  freeSpaceIndex: number | null;
  newShop: boolean | null;
  held: boolean | null;
}
export interface BagReport {
  apricorns?:
    | {
        index: number;
        id: number;
        name: LocalizedText;
        count: number;
        sprite: string;
      }[]
    | null;
  advancedChoices: {
    id: number;
    name: LocalizedText;
    maxCount: number;
    sprite: string;
  }[];
  pouches: {
    index: number;
    type: string;
    maxCount: number;
    items: BagItem[];
    choices: {
      id: number;
      name: LocalizedText;
      maxCount: number;
      sprite: string;
    }[];
    canGive: boolean;
    isCramped: boolean;
  }[];
}

export interface BagEdit {
  advanced?: boolean;
  pouch: number;
  slot: number;
  id: number;
  count: number;
  favorite?: boolean | null;
  isNew?: boolean | null;
  freeSpace?: boolean | null;
  freeSpaceIndex?: number | null;
  newShop?: boolean | null;
  held?: boolean | null;
}
export interface BagOperation {
  apricornValues?: number[];
  advanced?: boolean;
  pouch: number;
  action:
    | "apricornEdit"
    | "apricornFill"
    | "apricornClear"
    | "sortName"
    | "sortNameReverse"
    | "sortCount"
    | "sortCountReverse"
    | "sortId"
    | "sortIdReverse"
    | "giveAll"
    | "setCount"
    | "clear";
  count?: number;
  language: "zh-Hans" | "en" | "ja";
  shuffle: boolean;
}

export interface BoxEdit {
  box: number;
  name: string | null;
  wallpaper: number | null;
  unlocked?: number;
  flags?: number[];
  swapWith?: number;
  batch?: string;
  all?: boolean;
  reverse?: boolean;
  language?: "zh" | "en" | "ja";
}

export interface StorageEdit {
  action: "move" | "swap" | "copy" | "delete";
  source: PokemonPosition;
  target: PokemonPosition | null;
}

export interface PokemonImport extends PokemonPosition {
  fileName: string;
  data: string;
}
