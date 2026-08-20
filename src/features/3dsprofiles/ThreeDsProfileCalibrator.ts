import { RNG_MODULE_CONTRACT_VERSION } from "../shared/rngModuleContract";
import {
  decodeThreeDsProfileCalibratorResults,
  THREE_DS_PROFILE_CALIBRATOR_API_VERSION,
  THREE_DS_PROFILE_CALIBRATOR_MAX_RESULTS,
  THREE_DS_PROFILE_CALIBRATOR_RESULT_WORDS,
  profileCalibratorTaskCount,
  validateThreeDsProfileCalibratorRequest,
  validateThreeDsProfileCalibratorResult,
  type ThreeDsProfileCalibratorProgress,
  type ThreeDsProfileCalibratorRequest,
  type ThreeDsProfileCalibratorResult,
  type ThreeDsProfileCalibratorSummary,
} from "./calibratorDomain";
import type {
  ThreeDsProfileCalibratorRequestMessage,
  ThreeDsProfileCalibratorResponse,
} from "./calibratorMessages";

export interface ThreeDsProfileCalibratorSearchOptions {
  signal?: AbortSignal;
  stepSize?: number;
  onBatch?(results: ThreeDsProfileCalibratorResult[]): void;
  onProgress?(progress: ThreeDsProfileCalibratorProgress): void;
}

export class ThreeDsProfileCalibrator {
  private worker?: Worker;
  private taskId?: string;
  private ready?: Promise<void>;
  private readyResolve?: () => void;
  private readyReject?: (error: Error) => void;
  private active?: {
    request: ThreeDsProfileCalibratorRequest;
    options: ThreeDsProfileCalibratorSearchOptions;
    startedAt: number;
    totalStates: number;
    nextBatchIndex: number;
    processedStates: number;
    resultCount: number;
    resultLimitReached: boolean;
    resolve(summary: ThreeDsProfileCalibratorSummary): void;
    reject(error: Error): void;
    abort(): void;
  };

  async search(
    request: ThreeDsProfileCalibratorRequest,
    options: ThreeDsProfileCalibratorSearchOptions = {},
  ) {
    if (this.active)
      throw new Error("A Profile Calibrator search is already running.");
    validateThreeDsProfileCalibratorRequest(request);
    const stepSize = options.stepSize ?? 512;
    if (!Number.isInteger(stepSize) || stepSize < 1 || stepSize > 65_536)
      throw new RangeError(
        "Profile Calibrator step size must be between 1 and 65536.",
      );
    const totalStates = profileCalibratorTaskCount(request);
    if (options.signal?.aborted)
      return this.summary(0, totalStates, 0, false, true, 0);
    this.ensureWorker();
    const completion = new Promise<ThreeDsProfileCalibratorSummary>(
      (resolve, reject) => {
        const taskId = crypto.randomUUID();
        const abort = () => this.cancel();
        this.taskId = taskId;
        this.active = {
          request,
          options,
          startedAt: performance.now(),
          totalStates,
          nextBatchIndex: 0,
          processedStates: 0,
          resultCount: 0,
          resultLimitReached: false,
          resolve,
          reject,
          abort,
        };
        options.signal?.addEventListener("abort", abort, { once: true });
      },
    );
    try {
      await this.ready;
      if (!this.active || !this.worker || !this.taskId) return completion;
      const message: ThreeDsProfileCalibratorRequestMessage = {
        type: "task",
        moduleId: "3ds-profile-calibrator",
        apiVersion: THREE_DS_PROFILE_CALIBRATOR_API_VERSION,
        taskId: this.taskId,
        operation: "profile-calibration",
        request,
        stepSize,
      };
      this.worker.postMessage(message);
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error(String(error)));
    }
    return completion;
  }

  cancel() {
    const active = this.active;
    if (!active) return;
    this.clearActive();
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = undefined;
    this.taskId = undefined;
    active.resolve(
      this.summary(
        active.processedStates,
        active.totalStates,
        active.resultCount,
        active.resultLimitReached,
        true,
        performance.now() - active.startedAt,
      ),
    );
  }

  dispose() {
    if (this.active) {
      const active = this.active;
      this.clearActive();
      active.reject(new Error("Profile Calibrator Worker was disposed."));
    }
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = undefined;
    this.taskId = undefined;
  }

  private ensureWorker() {
    if (this.worker) return;
    let resolveReady!: () => void;
    let rejectReady!: (error: Error) => void;
    this.ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    this.readyResolve = resolveReady;
    this.readyReject = rejectReady;
    const worker = new Worker(
      new URL("./calibrator.worker.ts", import.meta.url),
      {
        type: "module",
        name: "pokerngkit-3ds-profile-calibrator",
      },
    );
    worker.onmessage = ({
      data,
    }: MessageEvent<ThreeDsProfileCalibratorResponse>) => this.handle(data);
    worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "Profile Calibrator Worker crashed."),
      );
    worker.postMessage({
      type: "init",
      moduleId: "3ds-profile-calibrator",
      apiVersion: THREE_DS_PROFILE_CALIBRATOR_API_VERSION,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      moduleUrl: new URL(
        `${import.meta.env.BASE_URL}wasm/gen7timefinder.mjs`,
        globalThis.location.href,
      ).href,
    } satisfies ThreeDsProfileCalibratorRequestMessage);
    this.worker = worker;
  }

  private handle(message: ThreeDsProfileCalibratorResponse) {
    if (
      message.moduleId !== "3ds-profile-calibrator" ||
      message.apiVersion !== THREE_DS_PROFILE_CALIBRATOR_API_VERSION
    ) {
      this.fail(new Error("Profile Calibrator Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("profile-calibration")
      ) {
        this.fail(new Error("Profile Calibrator Worker capability mismatch."));
        return;
      }
      this.readyResolve?.();
      return;
    }
    if (message.type === "error") {
      this.fail(new Error(message.message));
      return;
    }
    const active = this.active;
    if (
      !active ||
      message.taskId !== this.taskId ||
      message.operation !== "profile-calibration" ||
      message.batchIndex !== active.nextBatchIndex++ ||
      message.buffer.byteLength !==
        message.resultCount * THREE_DS_PROFILE_CALIBRATOR_RESULT_WORDS * 4 ||
      message.totalProcessed < active.processedStates ||
      message.totalProcessed > active.totalStates ||
      message.totalResultCount < active.resultCount ||
      message.totalResultCount > active.request.resultLimit
    ) {
      this.fail(
        new Error("Profile Calibrator Worker returned an invalid batch."),
      );
      return;
    }
    const decoded = decodeThreeDsProfileCalibratorResults(message.buffer).map(
      (result) =>
        validateThreeDsProfileCalibratorResult(active.request, result),
    );
    active.processedStates = message.totalProcessed;
    active.resultCount = message.totalResultCount;
    active.resultLimitReached ||= message.limitReached;
    active.options.onBatch?.(decoded);
    const progress: ThreeDsProfileCalibratorProgress = {
      processedStates: active.processedStates,
      totalStates: active.totalStates,
      resultCount: active.resultCount,
      percent: active.totalStates
        ? (active.processedStates / active.totalStates) * 100
        : 100,
    };
    active.options.onProgress?.(progress);
    if (!message.done) return;
    this.clearActive();
    active.resolve({
      ...progress,
      elapsedMs: performance.now() - active.startedAt,
      cancelled: false,
      resultLimitReached: active.resultLimitReached,
    });
  }

  private summary(
    processedStates: number,
    totalStates: number,
    resultCount: number,
    resultLimitReached: boolean,
    cancelled: boolean,
    elapsedMs: number,
  ): ThreeDsProfileCalibratorSummary {
    return {
      processedStates,
      totalStates,
      resultCount,
      percent: totalStates ? (processedStates / totalStates) * 100 : 100,
      elapsedMs,
      cancelled,
      resultLimitReached,
    };
  }

  private clearActive() {
    const active = this.active;
    if (active)
      active.options.signal?.removeEventListener("abort", active.abort);
    this.active = undefined;
  }

  private fail(error: Error) {
    this.readyReject?.(error);
    const active = this.active;
    if (active) {
      this.clearActive();
      active.reject(error);
    }
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = undefined;
    this.taskId = undefined;
  }
}

export { THREE_DS_PROFILE_CALIBRATOR_MAX_RESULTS };
