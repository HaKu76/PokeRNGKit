import type { Gen4ChainedSidChunk, Gen4ChainedSidRequest } from "../domain";
import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";

export type Gen4ChainedSidWorkerRequest = RngWorkerRequest<
  Gen4ChainedSidRequest,
  Gen4ChainedSidChunk,
  "gen4chainedsid"
>;
export type Gen4ChainedSidWorkerResponse = RngWorkerResponse<"gen4chainedsid">;
