import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput } from "../../input";
import {
  GEN5_IVCACHE_MAX_BROWSER_ADVANCES,
  GEN5_IVCACHE_MAX_BROWSER_INITIAL_ADVANCES,
  GEN5_IVCACHE_TOTAL_SEEDS,
  parseGen5IvCacheAdvance,
  serializeGen5IvCache,
  validateGen5IvCacheExecution,
  type Gen5IvCacheRequest,
} from "./domain";
import "./Gen5IvCachePanel.css";
import { Gen5IvCacheUiPreviewEngine } from "./preview/Gen5IvCacheUiPreviewEngine";
import type { Gen5IvCacheEngine, Gen5IvCacheProgress } from "./search";
import { Gen5IvCacheWorkerPool } from "./worker/Gen5IvCacheWorkerPool";

type RunStatus =
  "ready" | "calculating" | "writing" | "completed" | "cancelled" | "failed";

interface IvCacheWritable {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
  abort?(reason?: unknown): Promise<void>;
}

interface IvCacheFileHandle {
  name: string;
  createWritable(): Promise<IvCacheWritable>;
}

interface IvCacheOutput {
  name: string;
  handle?: IvCacheFileHandle;
}

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: {
      description: string;
      accept: Record<string, string[]>;
    }[];
  }) => Promise<IvCacheFileHandle>;
};

const EMPTY_PROGRESS: Gen5IvCacheProgress = {
  processedSeeds: 0,
  totalSeeds: GEN5_IVCACHE_TOTAL_SEEDS,
  resultCount: 0,
  percent: 0,
};

const COPY = {
  en: {
    search: "Search",
    initialAdvances: "Initial Advances",
    maxAdvances: "Max Advances",
    outputFile: "Output File",
    cancel: "Cancel",
    invalid: "Invalid advances.",
    tooLarge:
      "Initial Advances must be 0 and Max Advances must not exceed 20 in the browser.",
    missing: "Missing output file\nPlease select a file to save the results to",
    fileError: "The cache file could not be written.",
  },
  zh: {
    search: "检索",
    initialAdvances: "初始帧",
    maxAdvances: "最大帧数",
    outputFile: "导出文件",
    cancel: "取消",
    invalid: "Invalid advances.",
    tooLarge: "浏览器执行要求初始帧为 0，且最大帧数不能超过 20。",
    missing: "Missing output file\nPlease select a file to save the results to",
    fileError: "The cache file could not be written.",
  },
} as const;

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function Gen5IvCachePanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { i18n, t } = useTranslation();
  const copy = i18n.language.startsWith("zh") ? COPY.zh : COPY.en;
  const engine = useMemo<Gen5IvCacheEngine>(
    () =>
      uiPreviewMode
        ? new Gen5IvCacheUiPreviewEngine()
        : new Gen5IvCacheWorkerPool(),
    [uiPreviewMode],
  );
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("5");
  const [output, setOutput] = useState<IvCacheOutput>();
  const [status, setStatus] = useState<RunStatus>("ready");
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [error, setError] = useState("");
  const busy = status === "calculating" || status === "writing";
  const statusText = t(status === "writing" ? "writingFile" : status);

  useEffect(() => () => engine.dispose(), [engine]);

  const selectOutput = async () => {
    if (busy) return;
    const fallbackName = "pokerngkit-gen5.ivcache";
    if (uiPreviewMode) {
      setError("");
      setOutput({ name: fallbackName });
      return;
    }
    const pickerWindow = window as SavePickerWindow;
    if (!pickerWindow.showSaveFilePicker) {
      setError("");
      setOutput({ name: fallbackName });
      return;
    }
    try {
      const handle = await pickerWindow.showSaveFilePicker({
        suggestedName: fallbackName,
        types: [
          {
            description: "ivcache",
            accept: { "application/octet-stream": [".ivcache"] },
          },
        ],
      });
      setError("");
      setOutput({ name: handle.name, handle });
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError"))
        setError(cause instanceof Error ? cause.message : copy.fileError);
    }
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const request: Gen5IvCacheRequest = {
      initialAdvances: parseGen5IvCacheAdvance(initialAdvances) ?? Number.NaN,
      maxAdvances: parseGen5IvCacheAdvance(maxAdvances) ?? Number.NaN,
    };
    const invalid = validateGen5IvCacheExecution(request);
    if (invalid.length > 0) {
      setError(
        (invalid.includes("initialAdvances") &&
          request.initialAdvances >
            GEN5_IVCACHE_MAX_BROWSER_INITIAL_ADVANCES) ||
          (invalid.includes("maxAdvances") &&
            request.maxAdvances > GEN5_IVCACHE_MAX_BROWSER_ADVANCES)
          ? copy.tooLarge
          : copy.invalid,
      );
      setStatus("failed");
      return;
    }
    if (!output) {
      setError(copy.missing);
      setStatus("failed");
      return;
    }

    setError("");
    setProgress(EMPTY_PROGRESS);
    setStatus("calculating");
    try {
      const next = await engine.search(request, { onProgress: setProgress });
      if (next.cancelled) {
        setStatus("cancelled");
        return;
      }
      setStatus("writing");
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const blob = serializeGen5IvCache(next.cache);
      if (output.handle) {
        const writable = await output.handle.createWritable();
        try {
          await writable.write(blob);
          await writable.close();
        } catch (cause) {
          try {
            await writable.abort?.(cause);
          } catch {
            // Preserve the original write error.
          }
          throw cause;
        }
      } else if (!uiPreviewMode) {
        downloadBlob(blob, output.name);
      }
      setStatus("completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.fileError);
      setStatus("failed");
    }
  };

  return (
    <section
      aria-busy={busy}
      aria-label={copy.search}
      className="gen5ivcache-panel"
    >
      <div className="gen5ivcache-heading">
        <h2>{copy.search}</h2>
      </div>
      <form onSubmit={run}>
        <div className="gen5ivcache-advance-grid">
          <label className="field">
            <span>{copy.initialAdvances}</span>
            <input
              aria-invalid={
                parseGen5IvCacheAdvance(initialAdvances) === undefined ||
                Number(initialAdvances || "0") >
                  GEN5_IVCACHE_MAX_BROWSER_INITIAL_ADVANCES
              }
              disabled={busy}
              inputMode="numeric"
              maxLength={10}
              onChange={(event) => {
                setError("");
                setInitialAdvances(
                  normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                );
              }}
              value={initialAdvances}
            />
          </label>
          <label className="field">
            <span>{copy.maxAdvances}</span>
            <input
              aria-invalid={
                parseGen5IvCacheAdvance(maxAdvances) === undefined ||
                Number(maxAdvances || "0") > GEN5_IVCACHE_MAX_BROWSER_ADVANCES
              }
              disabled={busy}
              inputMode="numeric"
              maxLength={10}
              onChange={(event) => {
                setError("");
                setMaxAdvances(
                  normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                );
              }}
              value={maxAdvances}
            />
          </label>
        </div>
        <div className="gen5ivcache-output-row">
          <button
            className="secondary-action"
            disabled={busy}
            onClick={selectOutput}
            type="button"
          >
            {copy.outputFile}
          </button>
          <input
            aria-label={copy.outputFile}
            className="gen5ivcache-output-name"
            readOnly
            value={output?.name ?? ""}
          />
        </div>
        <div className="panel-actions gen5ivcache-actions">
          <button className="primary-action" disabled={busy} type="submit">
            {copy.search}
          </button>
          <button
            className="secondary-action"
            disabled={status !== "calculating"}
            onClick={() => engine.cancel()}
            type="button"
          >
            {copy.cancel}
          </button>
        </div>
      </form>

      <div className="gen5ivcache-progress-section">
        <div className="gen5ivcache-status">
          <progress
            aria-label={statusText}
            max={100}
            value={Math.min(100, progress.percent)}
          />
          <span aria-live="polite" role="status">
            {statusText}
          </span>
          <output>{progress.percent.toFixed(2)}%</output>
        </div>
        {error && (
          <div className="alert error gen5ivcache-error" role="alert">
            {error.split("\n").map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
