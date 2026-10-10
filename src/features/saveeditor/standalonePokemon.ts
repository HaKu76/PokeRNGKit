import type {
  MoveChoice,
  PokemonEntry,
  SaveReport,
  PokemonLegalityReport,
  PokemonRawEdit,
  RibbonCatalog,
  HistoryCatalog,
  MemoryCatalog,
  CareField,
  OriginCatalog,
  OriginChoice,
} from "./domain";
import type { PokemonEdit } from "./PokemonEditor";

export const MAX_ENTITY_BYTES = 1024 * 1024;
export interface StandalonePokemonReport {
  apiVersion: 115;
  format: string;
  extension: string;
  party: boolean;
  canEdit: boolean;
  generation: number;
  canMemories: boolean;
  care: CareField[];
  pokemon: PokemonEntry;
  attributeChoices: SaveReport["attributeChoices"];
  moveChoices: MoveChoice[];
  gb?: GbSpecialInfo | null;
}
export interface StandalonePokemonRequest {
  gb?: GbPokemonEdit;
  gbSpecial?: GbSpecialEdit;
  fileName: string;
  inputEncrypted: boolean;
  party?: boolean;
  encrypted?: boolean;
  edit?: PokemonEdit;
  raw?: PokemonRawEdit;
  readKind?: keyof StandaloneAdvancedData;
  handler?: number;
  memory?: number;
  version?: number;
  useFileFormat?: boolean;
  eggTrainer?: StandaloneEggTrainer;
}
export interface StandaloneEggTrainer {
  version: number;
  name: string;
  tid: number;
  sid: number;
}
export interface StandaloneEggCatalog {
  games: OriginChoice[];
  trainer: StandaloneEggTrainer;
  maximumName: number;
}
export interface StandaloneAdvancedData {
  eggContext?: StandaloneEggCatalog | null;
  origin?: OriginCatalog | null;
  ribbons?: RibbonCatalog | null;
  history?: HistoryCatalog | null;
  memory?: MemoryCatalog | null;
  relearn?: number[] | null;
}
export type StandalonePokemonOperation =
  | "entityGb"
  | "entityRaw"
  | "entityDetails"
  | "entityLegality"
  | "entityInspect"
  | "entityEdit"
  | "entityExport";
export interface GbPokemonEdit {
  species: number;
  nickname: string;
  ot: string;
  tid: number;
  level: number;
  dvs: number[];
  statExperience: number[];
  moves: number[];
  movePp: number[];
  movePpUps: number[];
  friendship: number | null;
  heldItem: number | null;
}
export interface StandalonePokemonResult {
  details?: StandaloneAdvancedData;
  legality?: PokemonLegalityReport;
  entity: StandalonePokemonReport;
  output?: Uint8Array<ArrayBuffer>;
  entityFile?: Uint8Array<ArrayBuffer>;
}

export interface GbSpecialFields {
  catchRate?: number | null;
  type1?: number | null;
  type2?: number | null;
  metLevel?: number | null;
  metLocation?: number | null;
  metTimeOfDay?: number | null;
  trainerGender?: number | null;
  pokerusStrain?: number | null;
  pokerusDays?: number | null;
}
export interface GbSpecialInfo {
  fields: GbSpecialFields;
  types: OriginChoice[];
  locations: OriginChoice[];
  languages: OriginChoice[];
  language: number;
  pokerusDurations: number[];
}
export interface GbSpecialEdit {
  action: "fields" | "speciesName" | "egg";
  fields?: GbSpecialFields;
  egg?: { action: "makeEgg" | "hatch" | "cycles"; cycles?: number };
  language?: number;
}

// History must restore encoding metadata together with the original byte sequence.
export interface StandalonePokemonSnapshot {
  gbLanguage?: number;
  bytes: Uint8Array<ArrayBuffer>;
  fileName: string;
  inputEncrypted: boolean;
  useFileFormat?: boolean;
  eggTrainer?: StandaloneEggTrainer;
}
