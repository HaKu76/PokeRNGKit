import { useVirtualizer } from "@tanstack/react-virtual";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  adjacentSeedsRequestFromProfile,
  formatGen5AdjacentPreview,
  formatGen5Buttons,
  normalizeAdvance,
  normalizeGen5AdjacentDateTime,
  validateGen5AdjacentSeedsRequest,
  type Gen5AdjacentPreviewMode,
  type Gen5AdjacentSeedResult,
  type Gen5AdjacentSeedsSummary,
} from "./domain";
import { Gen5AdjacentSeedsUiPreviewEngine } from "./preview/Gen5AdjacentSeedsUiPreviewEngine";
import type { Gen5AdjacentSeedsEngine } from "./search";
import { Gen5AdjacentSeedsWorkerPool } from "./worker/Gen5AdjacentSeedsWorkerPool";
import { useGen5Profiles } from "../gen5profiles/useGen5Profiles";
import type { Gen5Profile } from "../gen5profiles/domain";
import "./Gen5AdjacentSeedsPanel.css";

const SETTINGS_KEY = "pokerngkit-gen5-adjacent-seeds-v1";
const BUTTONS = [
  "R",
  "L",
  "X",
  "Y",
  "A",
  "B",
  "Select",
  "Start",
  "Right",
  "Left",
  "Up",
  "Down",
] as const;

interface StoredSettings {
  dateTime: string;
  seconds: number;
  buttonMask: number;
  encounter: "standard" | "roamer";
  initialIVAdvance: string;
  maxIVAdvances: string;
  previewMode: Gen5AdjacentPreviewMode;
}

const DEFAULT_SETTINGS: StoredSettings = {
  dateTime: "2000-01-01T00:00:00",
  seconds: 1,
  buttonMask: 0,
  encounter: "standard",
  initialIVAdvance: "0",
  maxIVAdvances: "0",
  previewMode: "chatot",
};

function loadSettings(): StoredSettings {
  if (typeof localStorage === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) ?? "null",
    );
    if (!stored || typeof stored !== "object") return DEFAULT_SETTINGS;
    const value = stored as Partial<StoredSettings>;
    return {
      dateTime:
        typeof value.dateTime === "string"
          ? normalizeGen5AdjacentDateTime(value.dateTime)
          : DEFAULT_SETTINGS.dateTime,
      seconds:
        Number.isInteger(value.seconds) &&
        Number(value.seconds) >= 0 &&
        Number(value.seconds) <= 99
          ? Number(value.seconds)
          : DEFAULT_SETTINGS.seconds,
      buttonMask:
        Number.isInteger(value.buttonMask) &&
        Number(value.buttonMask) >= 0 &&
        Number(value.buttonMask) <= 0xfff
          ? Number(value.buttonMask)
          : 0,
      encounter: value.encounter === "roamer" ? "roamer" : "standard",
      initialIVAdvance:
        typeof value.initialIVAdvance === "string"
          ? normalizeAdvance(value.initialIVAdvance)
          : "0",
      maxIVAdvances:
        typeof value.maxIVAdvances === "string"
          ? normalizeAdvance(value.maxIVAdvances)
          : "0",
      previewMode: value.previewMode === "needles" ? "needles" : "chatot",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function gameLabel(profile: Gen5Profile) {
  return {
    black: "Black",
    white: "White",
    black2: "Black 2",
    white2: "White 2",
  }[profile.version];
}

function dsTypeLabel(profile: Gen5Profile) {
  return {
    ds: "DS Original/Lite",
    dsi: "DSi/DSi XL",
    "3ds": "3DS",
  }[profile.dsType];
}

function profileKeypresses(profile: Gen5Profile) {
  return (
    profile.keypresses
      .flatMap((enabled, index) => (enabled ? [String(index)] : []))
      .join(", ") || "-"
  );
}

export interface Gen5AdjacentSeedsPanelProps {
  uiPreviewMode: boolean;
  onOpenProfileManager(): void;
  onOpenIvCalculator(): void;
}

export function Gen5AdjacentSeedsPanel({
  uiPreviewMode,
  onOpenProfileManager,
  onOpenIvCalculator,
}: Gen5AdjacentSeedsPanelProps) {
  const { i18n, t } = useTranslation();
  const chinese = i18n.language.startsWith("zh");
  const profiles = useGen5Profiles();
  const engine = useMemo<Gen5AdjacentSeedsEngine>(
    () =>
      uiPreviewMode
        ? new Gen5AdjacentSeedsUiPreviewEngine()
        : new Gen5AdjacentSeedsWorkerPool(),
    [uiPreviewMode],
  );
  const initial = useMemo(loadSettings, []);
  const [dateTime, setDateTime] = useState(initial.dateTime);
  const [seconds, setSeconds] = useState(initial.seconds);
  const [buttonMask, setButtonMask] = useState(initial.buttonMask);
  const [encounter, setEncounter] = useState(initial.encounter);
  const [initialIVAdvance, setInitialIVAdvance] = useState(
    initial.initialIVAdvance,
  );
  const [maxIVAdvances, setMaxIVAdvances] = useState(initial.maxIVAdvances);
  const [previewMode, setPreviewMode] = useState(initial.previewMode);
  const [pendingProfileId, setPendingProfileId] = useState<
    string | null | undefined
  >();
  const [summary, setSummary] = useState<Gen5AdjacentSeedsSummary>();
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState<
    "ready" | "running" | "completed" | "cancelled" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [previewBusy, setPreviewBusy] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const runVersion = useRef(0);
  const previewVersion = useRef(0);
  const previewPending = useRef(false);
  const pendingScrollIndex = useRef<number | undefined>(undefined);
  const results = summary?.results ?? [];
  // TanStack Virtual exposes mutable functions that React Compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  useEffect(() => () => engine.dispose(), [engine]);
  useEffect(() => {
    const target = pendingScrollIndex.current;
    if (target === undefined || results.length === 0) return;
    pendingScrollIndex.current = undefined;
    rowVirtualizer.scrollToIndex(target, { align: "center" });
  }, [results.length, rowVirtualizer]);
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          dateTime,
          seconds,
          buttonMask,
          encounter,
          initialIVAdvance,
          maxIVAdvances,
          previewMode,
        } satisfies StoredSettings),
      );
    } catch {
      // QSettings-equivalent preferences are optional when storage is blocked.
    }
  }, [
    buttonMask,
    dateTime,
    encounter,
    initialIVAdvance,
    maxIVAdvances,
    previewMode,
    seconds,
  ]);

  const copy = {
    profile: "Profile",
    manager: "Manager",
    mac: "MAC Address",
    dsType: "DS Type",
    keypresses: "Keypresses",
    game: "Game",
    settings: "Settings",
    encounter: "Encounter",
    ivCalculator: "IV Calculator",
    dateTime: "Date/Time",
    generate: "Generate",
  };

  const updatePreview = async (
    row: Gen5AdjacentSeedResult,
    mode: Gen5AdjacentPreviewMode,
  ) => {
    const hadPendingPreview = previewPending.current;
    const version = ++previewVersion.current;
    if (hadPendingPreview) engine.cancel();
    previewPending.current = true;
    setPreviewBusy(true);
    setPreview("");
    try {
      const values = await engine.preview({
        seed: row.seed,
        pidAdvance: row.pidAdvance,
        mode,
      });
      if (version === previewVersion.current)
        setPreview(formatGen5AdjacentPreview(values, mode));
    } catch (cause) {
      if (version === previewVersion.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (version === previewVersion.current) {
        previewPending.current = false;
        setPreviewBusy(false);
      }
    }
  };

  const cancelPreview = () => {
    previewVersion.current += 1;
    if (previewPending.current) engine.cancel();
    previewPending.current = false;
    setPreviewBusy(false);
  };

  const selectRow = (index: number) => {
    const row = results[index];
    if (!row) return;
    setSelectedIndex(index);
    void updatePreview(row, previewMode);
  };

  const clearResults = () => {
    runVersion.current += 1;
    cancelPreview();
    pendingScrollIndex.current = undefined;
    setSummary(undefined);
    setSelectedIndex(undefined);
    setPreview("");
    setError("");
    setProgress(0);
    setStatus("ready");
  };

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "running") return;
    const profile = profiles.selectedProfile;
    if (!profile) {
      setError(chinese ? "没有可用的存档信息。" : "No profile is available.");
      setStatus("failed");
      return;
    }
    try {
      cancelPreview();
      const request = adjacentSeedsRequestFromProfile(profile, {
        dateTime: normalizeGen5AdjacentDateTime(dateTime),
        seconds,
        buttonMask,
        encounter,
        initialIVAdvance: Number(initialIVAdvance || "0"),
        maxIVAdvances: Number(maxIVAdvances || "0"),
      });
      validateGen5AdjacentSeedsRequest(request);
      setSummary(undefined);
      setSelectedIndex(undefined);
      setPreview("");
      setError("");
      setProgress(0);
      setStatus("running");
      const version = ++runVersion.current;
      const next = await engine.generate(request, {
        onProgress: (value) => {
          if (version === runVersion.current) setProgress(value.percent);
        },
      });
      if (version !== runVersion.current) return;
      setSummary(next);
      setProgress(next.cancelled ? 0 : 100);
      setStatus(next.cancelled ? "cancelled" : "completed");
      if (!next.cancelled && next.results.length > 0) {
        const target = Math.max(
          0,
          next.results.findIndex((row) => row.target),
        );
        setSelectedIndex(target);
        pendingScrollIndex.current = target;
        void updatePreview(next.results[target], previewMode);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const cancel = () => {
    runVersion.current += 1;
    previewVersion.current += 1;
    engine.cancel();
    setStatus("cancelled");
    setProgress(0);
  };

  const selectedProfile =
    pendingProfileId === undefined
      ? profiles.selectedProfile
      : profiles.profiles.find((profile) => profile.id === pendingProfileId);
  return (
    <div className="gen5adjacent-workspace">
      <section className="panel gen5adjacent-profile-panel">
        <div className="panel-heading compact gen5adjacent-heading">
          <h2>{copy.profile}</h2>
          <div className="gen5adjacent-profile-actions">
            <label className="field gen5adjacent-profile-select">
              <span>{copy.profile}</span>
              <select
                disabled={
                  profiles.loading || profiles.busy || status === "running"
                }
                onChange={(event) => {
                  const id = event.target.value || null;
                  setPendingProfileId(id);
                  clearResults();
                  void profiles
                    .selectProfile(id)
                    .catch(() => undefined)
                    .finally(() => setPendingProfileId(undefined));
                }}
                value={pendingProfileId ?? profiles.selectedProfileId ?? ""}
              >
                <option value="" />
                {profiles.profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary-action"
              disabled={status === "running"}
              onClick={onOpenProfileManager}
              type="button"
            >
              {copy.manager}
            </button>
          </div>
        </div>
        {selectedProfile && (
          <dl className="gen5adjacent-profile-summary">
            <div>
              <dt>TID</dt>
              <dd>{selectedProfile.tid}</dd>
            </div>
            <div>
              <dt>SID</dt>
              <dd>{selectedProfile.sid}</dd>
            </div>
            <div>
              <dt>{copy.mac}</dt>
              <dd>{selectedProfile.mac || "0"}</dd>
            </div>
            <div>
              <dt>{copy.dsType}</dt>
              <dd>{dsTypeLabel(selectedProfile)}</dd>
            </div>
            <div>
              <dt>VCount</dt>
              <dd>
                {selectedProfile.vcount
                  .toString(16)
                  .toUpperCase()
                  .padStart(2, "0")}
              </dd>
            </div>
            <div>
              <dt>Timer0</dt>
              <dd>
                {selectedProfile.timer0Min
                  .toString(16)
                  .toUpperCase()
                  .padStart(4, "0")}
                -
                {selectedProfile.timer0Max
                  .toString(16)
                  .toUpperCase()
                  .padStart(4, "0")}
              </dd>
            </div>
            <div>
              <dt>GxStat</dt>
              <dd>{selectedProfile.gxstat}</dd>
            </div>
            <div>
              <dt>VFrame</dt>
              <dd>{selectedProfile.vframe}</dd>
            </div>
            <div>
              <dt>{copy.keypresses}</dt>
              <dd>{profileKeypresses(selectedProfile)}</dd>
            </div>
            <div>
              <dt>{copy.game}</dt>
              <dd>{gameLabel(selectedProfile)}</dd>
            </div>
          </dl>
        )}
        {profiles.error && (
          <div className="alert error" role="alert">
            {profiles.error}
          </div>
        )}
      </section>

      <form className="panel gen5adjacent-settings-panel" onSubmit={generate}>
        <div className="panel-heading compact">
          <h2>{copy.settings}</h2>
        </div>
        <div className="gen5adjacent-settings-grid">
          <label className="field gen5adjacent-date-field">
            <span>{copy.dateTime}</span>
            <input
              disabled={status === "running"}
              max="2099-12-31T23:59:59"
              min="2000-01-01T00:00:00"
              onChange={(event) =>
                setDateTime(normalizeGen5AdjacentDateTime(event.target.value))
              }
              step="1"
              type="datetime-local"
              value={dateTime}
            />
          </label>
          <label className="field">
            <span>Seconds +/-</span>
            <input
              disabled={status === "running"}
              max={99}
              min={0}
              onChange={(event) =>
                setSeconds(
                  Number.isFinite(event.target.valueAsNumber)
                    ? Math.max(0, Math.min(99, event.target.valueAsNumber))
                    : 0,
                )
              }
              type="number"
              value={seconds}
            />
          </label>
          <label className="field">
            <span>{copy.encounter}</span>
            <select
              disabled={status === "running"}
              onChange={(event) =>
                setEncounter(
                  event.target.value === "roamer" ? "roamer" : "standard",
                )
              }
              value={encounter}
            >
              <option value="standard">Wild / Static / Grotto</option>
              <option value="roamer">Roamer</option>
            </select>
          </label>
          <label className="field">
            <span>Initial IV Advances</span>
            <input
              disabled={status === "running"}
              inputMode="numeric"
              maxLength={10}
              onChange={(event) =>
                setInitialIVAdvance(normalizeAdvance(event.target.value))
              }
              value={initialIVAdvance}
            />
          </label>
          <label className="field">
            <span>Max IV Advances</span>
            <input
              disabled={status === "running"}
              inputMode="numeric"
              maxLength={10}
              onChange={(event) =>
                setMaxIVAdvances(normalizeAdvance(event.target.value))
              }
              value={maxIVAdvances}
            />
          </label>
          <fieldset className="gen5adjacent-keypresses">
            <legend>{copy.keypresses}</legend>
            <div>
              {BUTTONS.map((button, index) => (
                <label key={button}>
                  <input
                    checked={(buttonMask & (1 << index)) !== 0}
                    disabled={status === "running"}
                    onChange={() =>
                      setButtonMask((current) => current ^ (1 << index))
                    }
                    type="checkbox"
                  />
                  <span>{button}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <output className="gen5adjacent-keypress-value">
          {formatGen5Buttons(buttonMask)}
        </output>
        <div className="panel-actions gen5adjacent-actions">
          <button
            className="secondary-action"
            disabled={status === "running"}
            onClick={onOpenIvCalculator}
            type="button"
          >
            {copy.ivCalculator}
          </button>
          {status === "running" ? (
            <button className="secondary-action" onClick={cancel} type="button">
              {t("cancel")}
            </button>
          ) : (
            <button
              className="primary-action"
              disabled={
                !selectedProfile ||
                profiles.loading ||
                profiles.busy ||
                previewBusy
              }
              type="submit"
            >
              {copy.generate}
            </button>
          )}
        </div>
      </form>

      <section className="panel results-panel gen5adjacent-results-panel">
        <div className="results-heading gen5adjacent-results-heading">
          <span
            aria-live="polite"
            className={`run-status ${status}`}
            role="status"
          >
            {t(status === "running" ? "calculating" : status)}
          </span>
          <span className="result-count">{results.length}</span>
        </div>
        <div
          aria-busy={status === "running" || previewBusy}
          aria-label="Adjacent Seeds"
          aria-rowcount={results.length === 0 ? 0 : results.length + 1}
          className="gen5adjacent-table-shell"
          ref={tableRef}
          role="grid"
        >
          {results.length === 0 ? (
            <div className="empty-state compact" />
          ) : (
            <div
              className="gen5adjacent-virtual-table"
              style={{ height: `${rowVirtualizer.getTotalSize() + 44}px` }}
            >
              <div
                aria-rowindex={1}
                className="gen5adjacent-table-header"
                role="row"
              >
                {[
                  "Seed",
                  copy.dateTime,
                  "Timer0",
                  "IV Advance",
                  "HP",
                  "Atk",
                  "Def",
                  "SpA",
                  "SpD",
                  "Spe",
                ].map((label) => (
                  <span key={label} role="columnheader">
                    {label}
                  </span>
                ))}
              </div>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = results[virtualRow.index];
                const selected = selectedIndex === virtualRow.index;
                return (
                  <div
                    aria-rowindex={virtualRow.index + 2}
                    aria-selected={selected}
                    className={`gen5adjacent-table-row${selected ? " selected" : ""}${row.target ? " target" : ""}`}
                    data-row-index={virtualRow.index}
                    key={`${row.seed}-${row.ivAdvance}-${virtualRow.index}`}
                    onClick={(event) => {
                      selectRow(virtualRow.index);
                      event.currentTarget.focus();
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "ArrowDown" && event.key !== "ArrowUp")
                        return;
                      event.preventDefault();
                      const next = Math.max(
                        0,
                        Math.min(
                          results.length - 1,
                          virtualRow.index +
                            (event.key === "ArrowDown" ? 1 : -1),
                        ),
                      );
                      selectRow(next);
                      rowVirtualizer.scrollToIndex(next, { align: "auto" });
                      globalThis.requestAnimationFrame?.(() =>
                        tableRef.current
                          ?.querySelector<HTMLElement>(
                            `[data-row-index="${next}"]`,
                          )
                          ?.focus(),
                      );
                    }}
                    role="row"
                    style={{
                      transform: `translateY(${virtualRow.start + 44}px)`,
                    }}
                    tabIndex={selected ? 0 : -1}
                  >
                    <span role="gridcell">{row.seed}</span>
                    <span role="gridcell">{row.dateTime}</span>
                    <span role="gridcell">
                      {row.timer0.toString(16).toUpperCase()}
                    </span>
                    <span role="gridcell">{row.ivAdvance}</span>
                    {row.ivs.map((iv, index) => (
                      <span key={index} role="gridcell">
                        {iv}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div
          aria-label="Progress"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(progress)}
          className="gen5adjacent-progress"
          role="progressbar"
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        {summary && (
          <div className="metrics-row">
            <span>
              {t("processed")} <strong>{summary.processedStates}</strong>
            </span>
            <span>
              {t("workers")} <strong>{summary.workerCount}</strong>
            </span>
            <span>
              {t("elapsed")} <strong>{summary.elapsedMs.toFixed(1)} ms</strong>
            </span>
          </div>
        )}
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div className="gen5adjacent-preview">
          <label className="field">
            <span className="sr-only">Preview Mode</span>
            <select
              disabled={selectedIndex === undefined || status === "running"}
              onChange={(event) => {
                const mode =
                  event.target.value === "needles" ? "needles" : "chatot";
                setPreviewMode(mode);
                const row =
                  selectedIndex === undefined
                    ? undefined
                    : results[selectedIndex];
                if (row) void updatePreview(row, mode);
              }}
              value={previewMode}
            >
              <option value="chatot">Chatot Pitches</option>
              <option value="needles">Save Needles</option>
            </select>
          </label>
          <input
            aria-label={
              previewMode === "chatot" ? "Chatot Pitches" : "Save Needles"
            }
            aria-busy={previewBusy}
            readOnly
            value={preview}
          />
        </div>
      </section>
    </div>
  );
}
