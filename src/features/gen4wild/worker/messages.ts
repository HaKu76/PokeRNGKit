import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";
import type {
  Gen4WildChunk,
  Gen4WildGeneratorRequest,
  Gen4WildSearcherChunk,
  Gen4WildSearcherRequest,
} from "../domain";
export type Gen4WildWorkerRequest = RngWorkerRequest<
  Gen4WildGeneratorRequest | Gen4WildSearcherRequest,
  Gen4WildChunk | Gen4WildSearcherChunk,
  "gen4wild"
>;
export type Gen4WildWorkerResponse = RngWorkerResponse<"gen4wild">;
