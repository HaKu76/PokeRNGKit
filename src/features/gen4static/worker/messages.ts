import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";
import type {
  Gen4StaticChunk,
  Gen4StaticGeneratorRequest,
  Gen4StaticSearcherChunk,
  Gen4StaticSearcherRequest,
} from "../domain";

export type Gen4StaticWorkerRequest = RngWorkerRequest<
  Gen4StaticGeneratorRequest | Gen4StaticSearcherRequest,
  Gen4StaticChunk | Gen4StaticSearcherChunk,
  "gen4static"
>;
export type Gen4StaticWorkerResponse = RngWorkerResponse<"gen4static">;
