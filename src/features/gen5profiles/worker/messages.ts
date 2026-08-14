import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";
import type { Gen5CalibrationChunk, Gen5CalibrationRequest } from "../domain";

export type Gen5ProfilesWorkerRequest = RngWorkerRequest<
  Gen5CalibrationRequest,
  Gen5CalibrationChunk,
  "gen5profiles"
>;

type BaseResponse = RngWorkerResponse<"gen5profiles">;
type BaseBatch = Extract<BaseResponse, { type: "batch" }>;

export type Gen5ProfilesWorkerResponse =
  | Exclude<BaseResponse, { type: "batch" }>
  | (BaseBatch & { limitReached: boolean });
