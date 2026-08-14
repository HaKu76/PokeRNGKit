import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";
import type { Gen5IvCacheChunk, Gen5IvCacheRequest } from "../domain";

export type Gen5IvCacheWorkerRequest = RngWorkerRequest<
  Gen5IvCacheRequest,
  Gen5IvCacheChunk,
  "gen5ivcache"
>;

export type Gen5IvCacheWorkerResponse = RngWorkerResponse<"gen5ivcache">;
