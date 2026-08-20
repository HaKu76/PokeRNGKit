import type { Gen4SwarmChunk, Gen4SwarmRequest } from "../domain";
import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";

export type Gen4SwarmWorkerRequest = RngWorkerRequest<
  Gen4SwarmRequest,
  Gen4SwarmChunk,
  "gen4swarm"
>;
export type Gen4SwarmWorkerResponse = RngWorkerResponse<"gen4swarm">;
