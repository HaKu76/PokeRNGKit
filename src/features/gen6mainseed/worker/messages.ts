import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";
import type { Gen6MainSeedChunk, Gen6MainSeedRequest } from "../domain";

export type Gen6MainSeedWorkerRequest = RngWorkerRequest<
  Gen6MainSeedRequest,
  Gen6MainSeedChunk,
  "gen6mainseed"
>;

export type Gen6MainSeedWorkerResponse = RngWorkerResponse<"gen6mainseed">;

export type Gen6MainSeedWorkerBatch = Extract<
  Gen6MainSeedWorkerResponse,
  { type: "batch" }
>;
