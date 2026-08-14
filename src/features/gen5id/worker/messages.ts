import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";
import type { Gen5IdChunk, Gen5IdRequest } from "../domain";

export type Gen5IdWorkerRequest = RngWorkerRequest<
  Gen5IdRequest,
  Gen5IdChunk,
  "gen5id"
>;

type BaseResponse = RngWorkerResponse<"gen5id">;
type BaseBatch = Extract<BaseResponse, { type: "batch" }>;

export type Gen5IdWorkerResponse =
  | Exclude<BaseResponse, { type: "batch" }>
  | (BaseBatch & { limitReached: boolean });
