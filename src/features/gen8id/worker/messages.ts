import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";
import type { Gen8IdChunk, Gen8IdRequest } from "../domain";

export type Gen8IdWorkerRequest = RngWorkerRequest<
  Gen8IdRequest,
  Gen8IdChunk,
  "gen8id"
>;

export type Gen8IdWorkerResponse = RngWorkerResponse<"gen8id">;
