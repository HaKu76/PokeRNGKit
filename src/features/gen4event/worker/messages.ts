import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";
import type {
  Gen4EventChunk,
  Gen4EventGeneratorRequest,
  Gen4EventSearcherChunk,
  Gen4EventSearcherRequest,
} from "../domain";

export type Gen4EventWorkerRequest = RngWorkerRequest<
  Gen4EventGeneratorRequest | Gen4EventSearcherRequest,
  Gen4EventChunk | Gen4EventSearcherChunk,
  "gen4event"
>;
export type Gen4EventWorkerResponse = RngWorkerResponse<"gen4event">;
