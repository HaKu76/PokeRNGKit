import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";
import type {
  Gen5AdjacentPreviewRequest,
  Gen5AdjacentSeedsChunk,
  Gen5AdjacentSeedsRequest,
} from "../domain";

export type Gen5AdjacentWorkerPayload =
  | { kind: "generate"; value: Gen5AdjacentSeedsRequest }
  | { kind: "preview"; value: Gen5AdjacentPreviewRequest };

export type Gen5AdjacentWorkerChunk =
  | ({ kind: "generate" } & Gen5AdjacentSeedsChunk)
  | { kind: "preview"; index: 0 };

export type Gen5AdjacentSeedsWorkerRequest = RngWorkerRequest<
  Gen5AdjacentWorkerPayload,
  Gen5AdjacentWorkerChunk,
  "gen5adjacentseeds"
>;

export type Gen5AdjacentSeedsWorkerResponse =
  RngWorkerResponse<"gen5adjacentseeds">;
