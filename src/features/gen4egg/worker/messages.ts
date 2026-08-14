import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";
import type {
  Gen4EggGeneratorChunk,
  Gen4EggGeneratorRequest,
  Gen4EggSearcherChunk,
  Gen4EggSearcherRequest,
} from "../domain";

export type Gen4EggWorkerRequest = RngWorkerRequest<
  Gen4EggGeneratorRequest | Gen4EggSearcherRequest,
  Gen4EggGeneratorChunk | Gen4EggSearcherChunk,
  "gen4egg"
>;

export type Gen4EggWorkerResponse = RngWorkerResponse<"gen4egg">;
