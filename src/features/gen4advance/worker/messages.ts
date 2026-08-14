import type { Gen4AdvanceChunk, Gen4AdvanceRequest } from "../domain";
import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";

export type Gen4AdvanceWorkerRequest = RngWorkerRequest<
  Gen4AdvanceRequest,
  Gen4AdvanceChunk,
  "gen4advance"
>;
export type Gen4AdvanceWorkerResponse = RngWorkerResponse<"gen4advance">;
