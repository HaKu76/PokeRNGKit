import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useGen5Profiles } from "../gen5profiles/useGen5Profiles";
import {
  GEN5_SHA1CACHE_IV_MAGIC,
  gen5Sha1CacheProfile,
  gen5Sha1CacheUnitCount,
  parseGen5IvCache,
  serializeGen5Sha1Cache,
  validateGen5Sha1CacheRequest,
  type Gen5Sha1CacheRequest,
} from "./domain";
import "./Gen5Sha1CachePanel.css";
import { Gen5Sha1CacheUiPreviewEngine } from "./preview/Gen5Sha1CacheUiPreviewEngine";
import type { Gen5Sha1CacheEngine, Gen5Sha1CacheProgress } from "./search";
import { Gen5Sha1CacheWorkerPool } from "./worker/Gen5Sha1CacheWorkerPool";

type RunStatus =
  "ready" | "searching" | "writing" | "completed" | "cancelled" | "failed";

interface Sha1CacheWritable {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
  abort?(reason?: unknown): Promise<void>;
}

interface Sha1CacheFileHandle {
  name: string;
  createWritable(): Promise<Sha1CacheWritable>;
}

interface Sha1CacheOutput {
  name: string;
  handle?: Sha1CacheFileHandle;
}

interface IvCacheInput {
  name: string;
  buffer: ArrayBuffer;
}

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: {
      description: string;
      accept: Record<string, string[]>;
    }[];
  }) => Promise<Sha1CacheFileHandle>;
};

const EMPTY_PROGRESS: Gen5Sha1CacheProgress = {
  processedUnits: 0,
  totalUnits: 0,
  resultCount: 0,
  percent: 0,
};

const COPY = {
  en: {
    profile: "Profile",
    manager: "Manager",
    game: "Game",
    timer0: "Timer0",
    search: "Search",
    startDate: "Start Date",
    endDate: "End Date",
    ivCache: "IV Cache",
    outputFile: "Output File",
    cancel: "Cancel",
    noProfile: "Please select a profile",
    missingOutput:
      "Missing output file\nPlease select a file to save the results to",
    invalidDateRange: "Invalid date range",
    dateOrder: "Start date is after end date",
    invalidIv: "Invalid IV Cache\nProfile does not have a valid IV Cache",
    fileError: "The cache file could not be written.",
  },
  zh: {
    profile: "Profile",
    manager: "Manager",
    game: "Game",
    timer0: "Timer0",
    search: "检索",
    startDate: "起始日期",
    endDate: "最后日期",
    ivCache: "IV Cache",
    outputFile: "导出文件",
    cancel: "取消",
    noProfile: "Please select a profile",
    missingOutput:
      "Missing output file\nPlease select a file to save the results to",
    invalidDateRange: "请输入正确的日期范围",
    dateOrder: "Start date is after end date",
    invalidIv: "Invalid IV Cache\nProfile does not have a valid IV Cache",
    fileError: "The cache file could not be written.",
  },
} as const;

function initialDate() {
  const now = new Date();
  const year = Math.max(2000, Math.min(2099, now.getFullYear()));
  return `${String(year).padStart(4, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function emptyIvCache() {
  const buffer = new ArrayBuffer((3 + 9) * 4);
  new DataView(buffer).setUint32(0, GEN5_SHA1CACHE_IV_MAGIC, true);
  return buffer;
}

function downloadBuffer(buffer: ArrayBuffer, name: string) {
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/octet-stream" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function gameLabel(version: string) {
  return {
    black: "Black",
    white: "White",
    black2: "Black 2",
    white2: "White 2",
  }[version];
}

export function Gen5Sha1CachePanel({
  uiPreviewMode,
  onOpenProfileManager,
}: {
  uiPreviewMode: boolean;
  onOpenProfileManager(): void;
}) {
  const { i18n, t } = useTranslation();
  const copy = i18n.language.startsWith("zh") ? COPY.zh : COPY.en;
  const profiles = useGen5Profiles();
  const engine = useMemo<Gen5Sha1CacheEngine>(
    () =>
      uiPreviewMode
        ? new Gen5Sha1CacheUiPreviewEngine()
        : new Gen5Sha1CacheWorkerPool(),
    [uiPreviewMode],
  );
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);
  const [ivCache, setIvCache] = useState<IvCacheInput>();
  const [output, setOutput] = useState<Sha1CacheOutput>();
  const [status, setStatus] = useState<RunStatus>("ready");
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [error, setError] = useState("");
  const profile = profiles.selectedProfile;
  const busy = status === "searching" || status === "writing";
  const statusText = t(
    status === "searching"
      ? "calculating"
      : status === "writing"
        ? "writingFile"
        : status,
  );

  useEffect(() => () => engine.dispose(), [engine]);

  const selectIvCache = async (event: ChangeEvent<HTMLInputElement>) => {
    if (busy) return;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      parseGen5IvCache(buffer, profile?.version ?? "black");
      setIvCache({ name: file.name, buffer });
      setError("");
    } catch {
      setIvCache(undefined);
      setError(copy.invalidIv);
      setStatus("failed");
    }
  };

  const selectOutput = async () => {
    if (busy) return;
    const fallbackName = "pokerngkit-gen5.sha1cache";
    if (uiPreviewMode) {
      setOutput({ name: fallbackName });
      setError("");
      return;
    }
    const pickerWindow = window as SavePickerWindow;
    if (!pickerWindow.showSaveFilePicker) {
      setOutput({ name: fallbackName });
      setError("");
      return;
    }
    try {
      const handle = await pickerWindow.showSaveFilePicker({
        suggestedName: fallbackName,
        types: [
          {
            description: "sha1cache",
            accept: { "application/octet-stream": [".sha1cache"] },
          },
        ],
      });
      setOutput({ name: handle.name, handle });
      setError("");
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError"))
        setError(cause instanceof Error ? cause.message : copy.fileError);
    }
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!profile) {
      setError(copy.noProfile);
      setStatus("failed");
      return;
    }
    if (!output) {
      setError(copy.missingOutput);
      setStatus("failed");
      return;
    }
    if (!ivCache && !uiPreviewMode) {
      setError(copy.invalidIv);
      setStatus("failed");
      return;
    }
    try {
      const request: Gen5Sha1CacheRequest = {
        profile: gen5Sha1CacheProfile(profile),
        startDate,
        endDate,
        seeds: parseGen5IvCache(
          ivCache?.buffer ?? emptyIvCache(),
          profile.version,
        ),
      };
      validateGen5Sha1CacheRequest(request);
      setError("");
      setProgress({
        ...EMPTY_PROGRESS,
        totalUnits: gen5Sha1CacheUnitCount(request),
      });
      setStatus("searching");
      const summary = await engine.search(request, { onProgress: setProgress });
      if (summary.cancelled) {
        setStatus("cancelled");
        return;
      }
      setStatus("writing");
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const buffer = serializeGen5Sha1Cache(summary.cache);
      if (output.handle) {
        const writable = await output.handle.createWritable();
        try {
          await writable.write(
            new Blob([buffer], { type: "application/octet-stream" }),
          );
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
        downloadBuffer(buffer, output.name);
      }
      setStatus("completed");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(
        message === "Start date is after end date"
          ? `${copy.invalidDateRange}: ${copy.dateOrder}`
          : message,
      );
      setStatus("failed");
    }
  };

  return (
    <div className="gen5sha1cache-panel" aria-busy={busy}>
      <section className="gen5sha1cache-profile-bar" aria-label={copy.profile}>
        <div className="gen5sha1cache-profile-control">
          <label className="gen5sha1cache-field">
            <span>{copy.profile}</span>
            <select
              disabled={busy || profiles.loading || profiles.busy}
              onChange={(event) =>
                void profiles.selectProfile(event.target.value || null)
              }
              value={profiles.selectedProfileId ?? ""}
            >
              <option value="">-</option>
              {profiles.profiles.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary-action gen5sha1cache-manager"
            disabled={busy}
            onClick={onOpenProfileManager}
            type="button"
          >
            {copy.manager}
          </button>
        </div>
        {profile && (
          <dl className="gen5sha1cache-profile-values">
            <div>
              <dt>{copy.game}</dt>
              <dd>{gameLabel(profile.version)}</dd>
            </div>
            <div>
              <dt>{copy.timer0}</dt>
              <dd>
                {profile.timer0Min.toString(16).toUpperCase()}-
                {profile.timer0Max.toString(16).toUpperCase()}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <form className="gen5sha1cache-tool" onSubmit={run}>
        <h2>{copy.search}</h2>
        <div className="gen5sha1cache-form-grid">
          <label className="gen5sha1cache-field">
            <span>{copy.startDate}</span>
            <input
              disabled={busy}
              max="2099-12-31"
              min="2000-01-01"
              onChange={(event) => setStartDate(event.target.value)}
              required
              type="date"
              value={startDate}
            />
          </label>
          <label className="gen5sha1cache-field">
            <span>{copy.endDate}</span>
            <input
              disabled={busy}
              max="2099-12-31"
              min="2000-01-01"
              onChange={(event) => setEndDate(event.target.value)}
              required
              type="date"
              value={endDate}
            />
          </label>
        </div>

        <div className="gen5sha1cache-file-row">
          <label
            aria-disabled={busy}
            className="secondary-action gen5sha1cache-file-button"
          >
            {copy.ivCache}
            <input
              accept=".ivcache,application/octet-stream"
              disabled={busy}
              onChange={selectIvCache}
              type="file"
            />
          </label>
          <input
            aria-label={copy.ivCache}
            className="gen5sha1cache-file-name"
            readOnly
            value={ivCache?.name ?? profile?.ivCacheName ?? ""}
          />
        </div>

        <div className="gen5sha1cache-file-row">
          <button
            className="secondary-action gen5sha1cache-file-button"
            disabled={busy}
            onClick={selectOutput}
            type="button"
          >
            {copy.outputFile}
          </button>
          <input
            aria-label={copy.outputFile}
            className="gen5sha1cache-file-name"
            readOnly
            value={output?.name ?? ""}
          />
        </div>

        <div className="panel-actions gen5sha1cache-actions">
          <button className="primary-action" disabled={busy} type="submit">
            {copy.search}
          </button>
          <button
            className="secondary-action"
            disabled={status !== "searching"}
            onClick={() => engine.cancel()}
            type="button"
          >
            {copy.cancel}
          </button>
        </div>
      </form>

      <section className="gen5sha1cache-progress" aria-label={statusText}>
        <progress max={100} value={Math.min(100, progress.percent)} />
        <span aria-live="polite" role="status">
          {statusText}
        </span>
        <output>{progress.percent.toFixed(2)}%</output>
      </section>

      {(error || profiles.error) && (
        <div className="alert error gen5sha1cache-error" role="alert">
          {(error || profiles.error).split("\n").map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      )}
    </div>
  );
}
