import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput } from "../../input";
import "./Gen5IdPanel.css";
import {
  GEN5_ID_MAX_RESULTS,
  formatGen5IdButtons,
  gen5IdCandidateCount,
  gen5IdProfile,
  normalizeGen5IdHex,
  validateGen5IdRequest,
  type Gen5IdMode,
  type Gen5IdRequest,
  type Gen5IdResult,
} from "./domain";
import { Gen5IdUiPreviewEngine } from "./preview/Gen5IdUiPreviewEngine";
import type { Gen5IdEngine, Gen5IdProgress, Gen5IdSummary } from "./search";
import { Gen5IdWorkerPool } from "./worker/Gen5IdWorkerPool";
import { useGen5Profiles } from "../gen5profiles/useGen5Profiles";

interface Labels {
  profile: string;
  manager: string;
  game: string;
  searchBy: string;
  seedFinder: string;
  pid: string;
  staticWild: string;
  tid: string;
  sid: string;
  startEndDate: string;
  maxAdvances: string;
  search: string;
  cancel: string;
  date: string;
  hour: string;
  minute: string;
  secondRange: string;
  find: string;
  seed: string;
  initialAdvances: string;
  advances: string;
  tsv: string;
  dateTime: string;
  timer0: string;
  buttons: string;
  invalidDateRange: string;
  dateRangeOrder: string;
  noProfile: string;
  ready: string;
  searching: string;
  completed: string;
  cancelled: string;
  failed: string;
  limitReached: string;
}

function labels(chinese: boolean): Labels {
  if (!chinese) {
    return {
      profile: "Profile",
      manager: "Manager",
      game: "Game",
      searchBy: "Search By",
      seedFinder: "Seed Finder",
      pid: "PID",
      staticWild: "Static/Wild",
      tid: "TID",
      sid: "SID",
      startEndDate: "Start/End Date",
      maxAdvances: "Max Advances",
      search: "Search",
      cancel: "Cancel",
      date: "Date",
      hour: "Hour",
      minute: "Minute",
      secondRange: "Second Range",
      find: "Find",
      seed: "Seed",
      initialAdvances: "Initial Advances",
      advances: "Advances",
      tsv: "TSV",
      dateTime: "Date/Time",
      timer0: "Timer0",
      buttons: "Buttons",
      invalidDateRange: "Invalid date range",
      dateRangeOrder: "Start date is after end date",
      noProfile: "Please select a profile",
      ready: "Ready",
      searching: "Searching",
      completed: "Completed",
      cancelled: "Cancelled",
      failed: "Failed",
      limitReached: "Result limit reached",
    };
  }
  return {
    profile: "Profile",
    manager: "Manager",
    game: "游戏",
    searchBy: "通过..检索",
    seedFinder: "反查Seed",
    pid: "PID",
    staticWild: "定点/野生",
    tid: "TID",
    sid: "SID",
    startEndDate: "Start/End Date",
    maxAdvances: "最大帧数",
    search: "检索",
    cancel: "取消",
    date: "日期",
    hour: "小时",
    minute: "分钟",
    secondRange: "秒数范围",
    find: "查找",
    seed: "Seed",
    initialAdvances: "初始帧",
    advances: "帧数",
    tsv: "TSV",
    dateTime: "日期/时间",
    timer0: "Timer0",
    buttons: "Buttons",
    invalidDateRange: "请输入正确的日期范围",
    dateRangeOrder: "Start date is after end date",
    noProfile: "请选择一个存档信息",
    ready: "就绪",
    searching: "检索中",
    completed: "已完成",
    cancelled: "已取消",
    failed: "失败",
    limitReached: "已达到结果上限",
  };
}

const DATE_SETTINGS_KEY = "pokerngkit-gen5id-dates-v1";

function today() {
  const current = new Date();
  const year = Math.min(2099, Math.max(2000, current.getFullYear()));
  const part = (value: number) => String(value).padStart(2, "0");
  return `${year}-${part(current.getMonth() + 1)}-${part(current.getDate())}`;
}

function initialDates() {
  const fallback = today();
  try {
    const value = JSON.parse(
      localStorage.getItem(DATE_SETTINGS_KEY) || "null",
    ) as {
      startDate?: unknown;
      endDate?: unknown;
    } | null;
    if (
      value &&
      typeof value.startDate === "string" &&
      typeof value.endDate === "string"
    ) {
      return { startDate: value.startDate, endDate: value.endDate };
    }
  } catch {
    // A malformed optional setting falls back to the current date.
  }
  return { startDate: fallback, endDate: fallback };
}

function saveDates(startDate: string, endDate: string) {
  try {
    localStorage.setItem(
      DATE_SETTINGS_KEY,
      JSON.stringify({ startDate, endDate }),
    );
  } catch {
    // Date persistence is optional and must not block the local tool.
  }
}

function gameLabel(version: string, chinese: boolean) {
  if (version === "black") return chinese ? "黑" : "Black";
  if (version === "white") return chinese ? "白" : "White";
  if (version === "black2") return chinese ? "黑2" : "Black 2";
  return chinese ? "白2" : "White 2";
}

type RunStatus = "ready" | "searching" | "completed" | "cancelled" | "failed";

export function Gen5IdPanel({
  onOpenProfileManager,
  uiPreviewMode,
}: {
  onOpenProfileManager(): void;
  uiPreviewMode: boolean;
}) {
  const { i18n } = useTranslation();
  const chinese = i18n.language.startsWith("zh");
  const text = labels(chinese);
  const profiles = useGen5Profiles();
  const engine = useMemo<Gen5IdEngine>(
    () =>
      uiPreviewMode ? new Gen5IdUiPreviewEngine() : new Gen5IdWorkerPool(),
    [uiPreviewMode],
  );
  const storedDates = useMemo(initialDates, []);
  const [startDate, setStartDate] = useState(storedDates.startDate);
  const [endDate, setEndDate] = useState(storedDates.endDate);
  const [finderDate, setFinderDate] = useState(today);
  const [pid, setPid] = useState("");
  const [usePID, setUsePID] = useState(false);
  const [useXOR, setUseXOR] = useState(false);
  const [tid, setTid] = useState("");
  const [useTID, setUseTID] = useState(false);
  const [sid, setSid] = useState("");
  const [useSID, setUseSID] = useState(false);
  const [maxAdvances, setMaxAdvances] = useState("100");
  const [finderTid, setFinderTid] = useState("");
  const [hour, setHour] = useState("0");
  const [minute, setMinute] = useState("0");
  const [minSecond, setMinSecond] = useState("0");
  const [maxSecond, setMaxSecond] = useState("0");
  const [finderMaxAdvances, setFinderMaxAdvances] = useState("100");
  const [mode, setMode] = useState<Gen5IdMode>("search");
  const [results, setResults] = useState<Gen5IdResult[]>([]);
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Gen5IdProgress>({
    processedSeeds: 0,
    totalSeeds: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen5IdSummary>();
  const tableRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  useEffect(() => () => engine.dispose(), [engine]);

  const profile = profiles.selectedProfile;
  const busy = status === "searching";

  const run = async (request: Gen5IdRequest) => {
    if (busy) return;
    try {
      validateGen5IdRequest(request);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(
        message === "Start date is after end date"
          ? `${text.invalidDateRange}: ${text.dateRangeOrder}`
          : message,
      );
      setStatus("failed");
      return;
    }
    setMode(request.mode);
    setResults([]);
    setError("");
    setSummary(undefined);
    setProgress({
      processedSeeds: 0,
      totalSeeds: gen5IdCandidateCount(request),
      resultCount: 0,
      percent: 0,
    });
    setStatus("searching");
    try {
      const next = await engine.search(request, {
        onBatch: setResults,
        onProgress: setProgress,
      });
      setSummary(next);
      setStatus(next.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    if (!profile) {
      setError(text.noProfile);
      setStatus("failed");
      return;
    }
    void run({
      mode: "search",
      profile: gen5IdProfile(profile),
      startDate,
      endDate,
      pid: Number.parseInt(pid || "0", 16),
      usePID,
      useXOR,
      tid: Number(tid || "0"),
      useTID,
      sid: Number(sid || "0"),
      useSID,
      maxAdvances: Number(maxAdvances || "0"),
      resultLimit: GEN5_ID_MAX_RESULTS,
    });
  };

  const submitFinder = (event: FormEvent) => {
    event.preventDefault();
    if (!profile) {
      setError(text.noProfile);
      setStatus("failed");
      return;
    }
    void run({
      mode: "seedFinder",
      profile: gen5IdProfile(profile),
      date: finderDate,
      hour: Number(hour || "0"),
      minute: Number(minute || "0"),
      minSecond: Number(minSecond || "0"),
      maxSecond: Number(maxSecond || "0"),
      tid: Number(finderTid || "0"),
      maxAdvances: Number(finderMaxAdvances || "0"),
      resultLimit: GEN5_ID_MAX_RESULTS,
    });
  };

  const statusText = summary?.resultLimitReached
    ? text.limitReached
    : text[status];
  const columns = [
    text.seed,
    text.initialAdvances,
    text.advances,
    text.tid,
    text.sid,
    text.tsv,
    text.dateTime,
    text.timer0,
    text.buttons,
  ];

  return (
    <div className="gen5id-panel">
      <section className="gen5id-profile-bar" aria-label={text.profile}>
        <div className="gen5id-profile-control">
          <label className="gen5id-profile-select">
            <span>{text.profile}</span>
            <Select
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
            </Select>
          </label>
          <button
            className="secondary-action gen5id-profile-manager"
            disabled={busy}
            onClick={onOpenProfileManager}
            type="button"
          >
            {text.manager}
          </button>
        </div>
        {profile && (
          <dl className="gen5id-profile-values">
            <div>
              <dt>{text.game}</dt>
              <dd>{gameLabel(profile.version, chinese)}</dd>
            </div>
            <div>
              <dt>{text.tid}</dt>
              <dd>{profile.tid}</dd>
            </div>
            <div>
              <dt>{text.sid}</dt>
              <dd>{profile.sid}</dd>
            </div>
            <div>
              <dt>{text.timer0}</dt>
              <dd>
                {profile.timer0Min.toString(16).toUpperCase()}-
                {profile.timer0Max.toString(16).toUpperCase()}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <div className="gen5id-tools">
        <form
          aria-labelledby="gen5id-search-title"
          className="gen5id-tool"
          onSubmit={submitSearch}
        >
          <h2 id="gen5id-search-title">{text.searchBy}</h2>
          <div className="gen5id-form-grid">
            <div className="gen5id-check-input">
              <label className="gen5id-check">
                <input
                  checked={usePID}
                  disabled={busy}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setUsePID(checked);
                    if (!checked) setUseXOR(false);
                  }}
                  type="checkbox"
                />
                <span>{text.pid}</span>
              </label>
              <input
                aria-label={text.pid}
                disabled={busy}
                inputMode="text"
                maxLength={8}
                onChange={(event) =>
                  setPid(normalizeGen5IdHex(event.target.value, 8))
                }
                spellCheck={false}
                value={pid}
              />
              <label className="gen5id-check gen5id-xor">
                <input
                  checked={useXOR}
                  disabled={busy || !usePID}
                  onChange={(event) => setUseXOR(event.target.checked)}
                  type="checkbox"
                />
                <span>{text.staticWild}</span>
              </label>
            </div>
            <div className="gen5id-check-input compact">
              <label className="gen5id-check">
                <input
                  checked={useTID}
                  disabled={busy}
                  onChange={(event) => setUseTID(event.target.checked)}
                  type="checkbox"
                />
                <span>{text.tid}</span>
              </label>
              <input
                aria-label={text.tid}
                disabled={busy}
                inputMode="numeric"
                maxLength={5}
                onChange={(event) =>
                  setTid(normalizeDecimalInput(event.target.value, 0xffff, 5))
                }
                value={tid}
              />
            </div>
            <div className="gen5id-check-input compact">
              <label className="gen5id-check">
                <input
                  checked={useSID}
                  disabled={busy}
                  onChange={(event) => setUseSID(event.target.checked)}
                  type="checkbox"
                />
                <span>{text.sid}</span>
              </label>
              <input
                aria-label={text.sid}
                disabled={busy}
                inputMode="numeric"
                maxLength={5}
                onChange={(event) =>
                  setSid(normalizeDecimalInput(event.target.value, 0xffff, 5))
                }
                value={sid}
              />
            </div>
            <fieldset className="gen5id-range-field">
              <legend>{text.startEndDate}</legend>
              <input
                aria-label="Start Date"
                disabled={busy}
                max="2099-12-31"
                min="2000-01-01"
                onChange={(event) => {
                  setStartDate(event.target.value);
                  saveDates(event.target.value, endDate);
                }}
                type="date"
                value={startDate}
              />
              <input
                aria-label="End Date"
                disabled={busy}
                max="2099-12-31"
                min="2000-01-01"
                onChange={(event) => {
                  setEndDate(event.target.value);
                  saveDates(startDate, event.target.value);
                }}
                type="date"
                value={endDate}
              />
            </fieldset>
            <label className="gen5id-field">
              <span>{text.maxAdvances}</span>
              <input
                disabled={busy}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setMaxAdvances(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={maxAdvances}
              />
            </label>
          </div>
          <div className="gen5id-actions">
            <button className="gen5id-primary" disabled={busy} type="submit">
              {text.search}
            </button>
            <button
              className="gen5id-secondary"
              disabled={!busy}
              onClick={() => engine.cancel()}
              type="button"
            >
              {text.cancel}
            </button>
          </div>
        </form>

        <form
          aria-labelledby="gen5id-finder-title"
          className="gen5id-tool"
          onSubmit={submitFinder}
        >
          <h2 id="gen5id-finder-title">{text.seedFinder}</h2>
          <div className="gen5id-form-grid">
            <label className="gen5id-field">
              <span>{text.tid}</span>
              <input
                disabled={busy}
                inputMode="numeric"
                maxLength={5}
                onChange={(event) =>
                  setFinderTid(
                    normalizeDecimalInput(event.target.value, 0xffff, 5),
                  )
                }
                value={finderTid}
              />
            </label>
            <label className="gen5id-field">
              <span>{text.date}</span>
              <input
                disabled={busy}
                max="2099-12-31"
                min="2000-01-01"
                onChange={(event) => setFinderDate(event.target.value)}
                type="date"
                value={finderDate}
              />
            </label>
            <div className="gen5id-pair">
              <label className="gen5id-field">
                <span>{text.hour}</span>
                <input
                  disabled={busy}
                  max={23}
                  min={0}
                  onChange={(event) =>
                    setHour(normalizeDecimalInput(event.target.value, 23, 2))
                  }
                  type="number"
                  value={hour}
                />
              </label>
              <label className="gen5id-field">
                <span>{text.minute}</span>
                <input
                  disabled={busy}
                  max={59}
                  min={0}
                  onChange={(event) =>
                    setMinute(normalizeDecimalInput(event.target.value, 59, 2))
                  }
                  type="number"
                  value={minute}
                />
              </label>
            </div>
            <fieldset className="gen5id-range-field">
              <legend>{text.secondRange}</legend>
              <input
                aria-label={`${text.secondRange} Min`}
                disabled={busy}
                max={59}
                min={0}
                onChange={(event) =>
                  setMinSecond(normalizeDecimalInput(event.target.value, 59, 2))
                }
                type="number"
                value={minSecond}
              />
              <input
                aria-label={`${text.secondRange} Max`}
                disabled={busy}
                max={59}
                min={0}
                onChange={(event) =>
                  setMaxSecond(normalizeDecimalInput(event.target.value, 59, 2))
                }
                type="number"
                value={maxSecond}
              />
            </fieldset>
            <label className="gen5id-field">
              <span>{text.maxAdvances}</span>
              <input
                disabled={busy}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setFinderMaxAdvances(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={finderMaxAdvances}
              />
            </label>
          </div>
          <div className="gen5id-actions">
            <button className="gen5id-primary" disabled={busy} type="submit">
              {text.find}
            </button>
          </div>
        </form>
      </div>

      <section
        aria-busy={busy}
        aria-label={text.seed}
        className="gen5id-results"
      >
        <div className="gen5id-result-status">
          <progress
            aria-label={statusText}
            max={100}
            value={Math.min(100, progress.percent)}
          />
          <output aria-label={`${results.length}`}>
            {results.length.toLocaleString()}
          </output>
          <span aria-live="polite" className="sr-only" role="status">
            {statusText}
          </span>
        </div>
        {(error || profiles.error) && (
          <div className="gen5id-alert" role="alert">
            {error || profiles.error}
          </div>
        )}
        {summary?.resultLimitReached && (
          <div className="gen5id-alert warning" role="status">
            {text.limitReached}
          </div>
        )}
        <div className="gen5id-table-shell" ref={tableRef}>
          <div
            className="gen5id-virtual-table"
            data-mode={mode}
            role="table"
            aria-rowcount={results.length + 1}
            style={{ height: `${rowVirtualizer.getTotalSize() + 44}px` }}
          >
            <div className="gen5id-table-header" role="row">
              {columns.map((column) => (
                <span key={column} role="columnheader">
                  {column}
                </span>
              ))}
            </div>
            {rowVirtualizer.getVirtualItems().map((row) => {
              const item = results[row.index];
              return (
                <div
                  className="gen5id-table-row"
                  key={`${item.seed}-${item.advances}-${row.index}`}
                  role="row"
                  style={{ transform: `translateY(${row.start + 44}px)` }}
                >
                  <span role="cell">{item.seed}</span>
                  <span role="cell">{item.initialAdvances}</span>
                  <span role="cell">{item.advances}</span>
                  <span role="cell">{item.tid}</span>
                  <span role="cell">{item.sid}</span>
                  <span role="cell">{item.tsv}</span>
                  <span role="cell">{item.dateTime}</span>
                  <span role="cell">
                    {item.timer0.toString(16).toUpperCase()}
                  </span>
                  <span role="cell">
                    {formatGen5IdButtons(item.buttonMask)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
