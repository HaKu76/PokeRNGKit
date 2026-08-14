export const RNG_MODULE_CONTRACT_VERSION = 1 as const;

export type RngModuleOperation = "generator" | "searcher";
export type GlobalRngModuleId = "researcher";
export type RngModuleId = `gen${number}${string}` | GlobalRngModuleId;

export interface RngModuleArtifacts {
  loader: `${string}.mjs`;
  wasm: `${string}.wasm`;
}

export interface RngModuleManifest<
  TModuleId extends RngModuleId = RngModuleId,
> {
  id: TModuleId;
  generation: number;
  contractVersion: typeof RNG_MODULE_CONTRACT_VERSION;
  apiVersion: number;
  target: string;
  operations: readonly RngModuleOperation[];
  artifacts: RngModuleArtifacts;
  source: string;
}

export interface RngModuleReservation<
  TModuleId extends RngModuleId = RngModuleId,
> {
  id: TModuleId;
  generation: number;
  operations: readonly RngModuleOperation[];
  status: "reserved";
}

export const GEN4_MODULE_RESERVATIONS = [
  {
    id: "gen4id",
    generation: 4,
    operations: ["generator", "searcher"],
    status: "reserved",
  },
  {
    id: "gen4static",
    generation: 4,
    operations: ["generator", "searcher"],
    status: "reserved",
  },
  {
    id: "gen4wild",
    generation: 4,
    operations: ["generator", "searcher"],
    status: "reserved",
  },
  {
    id: "gen4egg",
    generation: 4,
    operations: ["generator", "searcher"],
    status: "reserved",
  },
  {
    id: "gen4event",
    generation: 4,
    operations: ["generator", "searcher"],
    status: "reserved",
  },
  {
    id: "gen4chainedsid",
    generation: 4,
    operations: ["searcher"],
    status: "reserved",
  },
  {
    id: "gen4advance",
    generation: 4,
    operations: ["searcher"],
    status: "reserved",
  },
] as const satisfies readonly RngModuleReservation[];

export type Gen4ModuleId = (typeof GEN4_MODULE_RESERVATIONS)[number]["id"];

export const GEN5_MODULE_RESERVATIONS = [
  {
    id: "gen5profiles",
    generation: 5,
    operations: ["searcher"],
    status: "reserved",
  },
  {
    id: "gen5id",
    generation: 5,
    operations: ["generator", "searcher"],
    status: "reserved",
  },
  {
    id: "gen5adjacentseeds",
    generation: 5,
    operations: ["generator"],
    status: "reserved",
  },
  {
    id: "gen5ivcache",
    generation: 5,
    operations: ["searcher"],
    status: "reserved",
  },
  {
    id: "gen5sha1cache",
    generation: 5,
    operations: ["searcher"],
    status: "reserved",
  },
  {
    id: "gen5dreamradar",
    generation: 5,
    operations: ["generator", "searcher"],
    status: "reserved",
  },
  {
    id: "gen5static",
    generation: 5,
    operations: ["generator", "searcher"],
    status: "reserved",
  },
] as const satisfies readonly RngModuleReservation[];

export type Gen5ModuleId = (typeof GEN5_MODULE_RESERVATIONS)[number]["id"];

export const GLOBAL_RNG_MODULE_RESERVATIONS = [
  {
    id: "researcher",
    generation: 0,
    operations: ["generator"],
    status: "reserved",
  },
] as const satisfies readonly RngModuleReservation[];

export interface RngWorkerInitMessage<
  TModuleId extends RngModuleId = RngModuleId,
> {
  type: "init";
  moduleId: TModuleId;
  moduleUrl: string;
  contractVersion: typeof RNG_MODULE_CONTRACT_VERSION;
  apiVersion: number;
}

export interface RngWorkerTaskMessage<
  TRequest,
  TChunk,
  TModuleId extends RngModuleId = RngModuleId,
> {
  type: "task";
  moduleId: TModuleId;
  apiVersion: number;
  taskId: string;
  operation: RngModuleOperation;
  chunkIndex: number;
  request: TRequest;
  chunk: TChunk;
}

export type RngWorkerRequest<
  TRequest,
  TChunk,
  TModuleId extends RngModuleId = RngModuleId,
> =
  | RngWorkerInitMessage<TModuleId>
  | RngWorkerTaskMessage<TRequest, TChunk, TModuleId>;

export interface RngWorkerReadyMessage<
  TModuleId extends RngModuleId = RngModuleId,
> {
  type: "ready";
  moduleId: TModuleId;
  contractVersion: typeof RNG_MODULE_CONTRACT_VERSION;
  apiVersion: number;
  operations: readonly RngModuleOperation[];
}

export interface RngWorkerBatchMessage<
  TModuleId extends RngModuleId = RngModuleId,
> {
  type: "batch";
  moduleId: TModuleId;
  apiVersion: number;
  taskId: string;
  operation: RngModuleOperation;
  chunkIndex: number;
  processedCount: number;
  resultCount: number;
  elapsedMs: number;
  buffer: ArrayBuffer;
}

export interface RngWorkerErrorMessage<
  TModuleId extends RngModuleId = RngModuleId,
> {
  type: "error";
  moduleId: TModuleId;
  apiVersion: number;
  taskId?: string;
  chunkIndex?: number;
  code: string;
  message: string;
}

export type RngWorkerResponse<TModuleId extends RngModuleId = RngModuleId> =
  | RngWorkerReadyMessage<TModuleId>
  | RngWorkerBatchMessage<TModuleId>
  | RngWorkerErrorMessage<TModuleId>;
