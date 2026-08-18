import {
  GEN6_STATIONARY_API_VERSION,
  GEN6_STATIONARY_BROWSER_MAX_FRAME,
  GEN6_STATIONARY_MAX_FRAME,
  GEN6_STATIONARY_MAX_RESULTS,
  GEN6_STATIONARY_REQUEST_WORDS,
  GEN6_STATIONARY_RESULT_WORDS,
  encodeGen6StationaryRequest,
  gen6StationaryProfile,
  gen6StationaryTaskCount,
  validateGen6StationaryRequest,
  type Gen6StationaryRequest,
} from "../gen6stationary/domain";

export {
  GEN6_STATIONARY_API_VERSION as GEN6_BANK_API_VERSION,
  GEN6_STATIONARY_BROWSER_MAX_FRAME as GEN6_BANK_BROWSER_MAX_FRAME,
  GEN6_STATIONARY_MAX_FRAME as GEN6_BANK_MAX_FRAME,
  GEN6_STATIONARY_MAX_RESULTS as GEN6_BANK_MAX_RESULTS,
  GEN6_STATIONARY_REQUEST_WORDS as GEN6_BANK_REQUEST_WORDS,
  GEN6_STATIONARY_RESULT_WORDS as GEN6_BANK_RESULT_WORDS,
  gen6StationaryProfile as gen6BankProfile,
  gen6StationaryTaskCount as gen6BankTaskCount,
};
export type {
  Gen6StationaryFilters as Gen6BankFilters,
  Gen6StationaryIvTuple as Gen6BankIvTuple,
  Gen6StationaryRequest as Gen6BankRequest,
  Gen6StationaryResult as Gen6BankResult,
} from "../gen6stationary/domain";

export function validateGen6BankRequest(request: Gen6StationaryRequest) {
  if (!request.template.bank)
    throw new TypeError(
      "Pokemon Link / Transporter templates must be Bank targets.",
    );
  return validateGen6StationaryRequest(request);
}

export function encodeGen6BankRequest(request: Gen6StationaryRequest) {
  validateGen6BankRequest(request);
  return encodeGen6StationaryRequest(request);
}
