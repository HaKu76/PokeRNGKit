import type {
  RngWorkerRequest,
  RngWorkerResponse,
} from "../../shared/rngModuleContract";
import type { Gen5Sha1CacheProfile, Gen5Sha1CacheUnit } from "../domain";

export interface Gen5Sha1CacheWorkerValue {
  profile: Gen5Sha1CacheProfile;
  resultLimit: number;
}

export interface Gen5Sha1CachePrepareMessage {
  type: "prepare";
  moduleId: "gen5sha1cache";
  apiVersion: number;
  entralink: ArrayBuffer;
  normal: ArrayBuffer;
  roamer: ArrayBuffer;
}

export type Gen5Sha1CacheWorkerRequest =
  | RngWorkerRequest<
      Gen5Sha1CacheWorkerValue,
      Gen5Sha1CacheUnit,
      "gen5sha1cache"
    >
  | Gen5Sha1CachePrepareMessage;

type BaseResponse = RngWorkerResponse<"gen5sha1cache">;
type BaseBatch = Extract<BaseResponse, { type: "batch" }>;

export type Gen5Sha1CacheWorkerResponse =
  | Exclude<BaseResponse, { type: "batch" }>
  | (BaseBatch & { limitReached: boolean })
  | {
      type: "prepared";
      moduleId: "gen5sha1cache";
      apiVersion: number;
    };
