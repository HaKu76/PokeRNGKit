import type { Gen4SeedFinderRequest } from "../domain";
import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";

export type Gen4SeedFinderChunk = { readonly index: 0; readonly stateCount: 1 };
export type Gen4SeedFinderWorkerRequest = RngWorkerRequest<
  Gen4SeedFinderRequest,
  Gen4SeedFinderChunk,
  "gen4seedfinder"
>;
export type Gen4SeedFinderWorkerResponse = RngWorkerResponse<"gen4seedfinder">;
