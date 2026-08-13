import type { Gen4IdChunk, Gen4IdRequest } from "../domain";
import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";

export type Gen4IdWorkerRequest = RngWorkerRequest<
  Gen4IdRequest,
  Gen4IdChunk,
  "gen4id"
>;
export type Gen4IdWorkerResponse = RngWorkerResponse<"gen4id">;
