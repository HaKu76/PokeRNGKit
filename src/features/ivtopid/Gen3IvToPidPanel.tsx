import { Select } from "../shared/Select";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput } from "../../input";
import {
  gen3IvToPidMethodLabel,
  validateGen3IvToPidRequest,
  type Gen3IvToPidRequest,
  type Gen3IvToPidState,
} from "./domain";
import { Gen3IvToPidUiPreviewEngine } from "./preview/Gen3IvToPidUiPreviewEngine";
import type {
  Gen3IvToPidSearchEngine,
  Gen3IvToPidSearchProgress,
  Gen3IvToPidSearchSummary,
} from "./search";
import { Gen3IvToPidWorkerPool } from "./worker/Gen3IvToPidWorkerPool";

interface Gen3IvToPidPanelProps {
  uiPreviewMode: boolean;
}

const statFields = [
  ["hp", "ivToPidHp"],
  ["atk", "ivToPidAtk"],
  ["def", "ivToPidDef"],
  ["spa", "ivToPidSpa"],
  ["spd", "ivToPidSpd"],
  ["spe", "ivToPidSpe"],
] as const;
const natureKeys = [
  "natureHardy",
  "natureLonely",
  "natureBrave",
  "natureAdamant",
  "natureNaughty",
  "natureBold",
  "natureDocile",
  "natureRelaxed",
  "natureImpish",
  "natureLax",
  "natureTimid",
  "natureHasty",
  "natureSerious",
  "natureJolly",
  "natureNaive",
  "natureModest",
  "natureMild",
  "natureQuiet",
  "natureBashful",
  "natureRash",
  "natureCalm",
  "natureGentle",
  "natureSassy",
  "natureCareful",
  "natureQuirky",
] as const;
type SortKey = "seed" | "pid" | "method" | "ability" | "sid";

const emptyProgress: Gen3IvToPidSearchProgress = {
  processed: 0,
  resultCount: 0,
  percent: 0,
};
const hex = (value: number) =>
  value.toString(16).toUpperCase().padStart(8, "0");
const gender = (male: boolean) => (male ? "♂" : "♀");

export function Gen3IvToPidPanel({ uiPreviewMode }: Gen3IvToPidPanelProps) {
  const { t } = useTranslation();
  const engine = useMemo<Gen3IvToPidSearchEngine>(
    () =>
      uiPreviewMode
        ? new Gen3IvToPidUiPreviewEngine()
        : new Gen3IvToPidWorkerPool(),
    [uiPreviewMode],
  );
  const [values, setValues] = useState<
    Record<(typeof statFields)[number][0], string>
  >({ hp: "0", atk: "0", def: "0", spa: "0", spd: "0", spe: "0" });
  const [nature, setNature] = useState("0");
  const [tid, setTid] = useState("");
  const [results, setResults] = useState<Gen3IvToPidState[]>([]);
  const [progress, setProgress] = useState(emptyProgress);
  const [summary, setSummary] = useState<Gen3IvToPidSearchSummary>();
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "cancelled" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    { key: "seed", direction: "asc" },
  );

  useEffect(() => () => engine.dispose(), [engine]);

  const sortedResults = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...results].sort((left, right) => {
      if (sort.key === "method")
        return (
          gen3IvToPidMethodLabel(left.method).localeCompare(
            gen3IvToPidMethodLabel(right.method),
          ) * direction
        );
      const value = (state: Gen3IvToPidState) => {
        switch (sort.key) {
          case "seed":
            return state.seed;
          case "pid":
            return state.pid;
          case "ability":
            return state.ability;
          case "sid":
            return state.sid;
          default:
            return 0;
        }
      };
      return (value(left) - value(right)) * direction;
    });
  }, [results, sort]);

  const readRequest = (): Gen3IvToPidRequest | undefined => {
    const request = {
      hp: Number(values.hp),
      atk: Number(values.atk),
      def: Number(values.def),
      spa: Number(values.spa),
      spd: Number(values.spd),
      spe: Number(values.spe),
      nature: Number(nature),
      tid: tid.trim() === "" ? 0 : Number(tid),
    };
    return validateGen3IvToPidRequest(request).length === 0
      ? request
      : undefined;
  };

  const find = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request = readRequest();
    if (!request) {
      setError(t("invalidIvToPidInput"));
      setStatus("failed");
      return;
    }
    setResults([]);
    setProgress(emptyProgress);
    setSummary(undefined);
    setError("");
    setStatus("calculating");
    try {
      const nextSummary = await engine.search(request, {
        onBatch: setResults,
        onProgress: setProgress,
      });
      setSummary(nextSummary);
      setStatus(nextSummary.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  const sortMark = (key: SortKey) =>
    sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : "";
  const methodLabel = (state: Gen3IvToPidState) =>
    state.method === "xd-colo"
      ? t("ivToPidXdColo")
      : state.method === "channel"
        ? t("ivToPidChannel")
        : gen3IvToPidMethodLabel(state.method);

  const exportCsv = () => {
    if (sortedResults.length === 0) return;
    const rows = [
      [
        t("seed"),
        "PID",
        t("ivToPidMethod"),
        t("ivToPidAbility"),
        "12.5%",
        "25%",
        "50%",
        "75%",
        "SID",
      ],
      ...sortedResults.map((state) => [
        hex(state.seed),
        hex(state.pid),
        methodLabel(state),
        state.ability,
        gender(state.gender12_5),
        gender(state.gender25),
        gender(state.gender50),
        gender(state.gender75),
        state.sid,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${rows.map((row) => row.join(",")).join("\n")}`], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen3ivtopid.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const statusLabel = {
    ready: t("ready"),
    calculating: t("calculating"),
    completed: t("completed"),
    cancelled: t("cancelled"),
    failed: t("failed"),
  }[status];

  return (
    <>
      <form className="ivtopid-control-grid" onSubmit={find}>
        <section className="panel compact-module-panel">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("ivToPidInput")}</h2>
            </div>
          </div>
          <div className="ivtopid-iv-grid">
            {statFields.map(([key, label]) => (
              <label className="field" key={key}>
                <span>{t(label)}</span>
                <input
                  inputMode="numeric"
                  max={31}
                  min={0}
                  maxLength={2}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [key]: normalizeDecimalInput(event.target.value, 31, 2),
                    }))
                  }
                  value={values[key]}
                />
              </label>
            ))}
          </div>
          <div className="ivtopid-meta-grid">
            <label className="field">
              <span>{t("ivToPidNature")}</span>
              <Select
                onChange={(event) => setNature(event.target.value)}
                value={nature}
              >
                {natureKeys.map((key, index) => (
                  <option key={key} value={index}>
                    {t(key)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>TID</span>
              <input
                inputMode="numeric"
                max={65535}
                min={0}
                maxLength={5}
                onChange={(event) =>
                  setTid(normalizeDecimalInput(event.target.value, 0xffff, 5))
                }
                value={tid}
              />
            </label>
            <div className="panel-actions ivtopid-actions">
              <button
                className="primary-action"
                disabled={status === "calculating"}
                type="submit"
              >
                {t("ivToPidFind")}
              </button>
              {status === "calculating" && (
                <button
                  className="secondary-action"
                  onClick={() => engine.cancel()}
                  type="button"
                >
                  {t("cancel")}
                </button>
              )}
            </div>
          </div>
        </section>
      </form>

      <section className="panel results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("results")}</h2>
            </div>
            <span className={`run-status ${status}`}>{statusLabel}</span>
          </div>
          <div className="result-actions">
            <span className="result-count">{String(results.length)}</span>
            <button
              className="secondary-action"
              disabled={results.length === 0}
              onClick={exportCsv}
              type="button"
            >
              {t("exportCsv")}
            </button>
            <button
              className="icon-action"
              disabled={results.length === 0}
              onClick={() => setResults([])}
              title={t("clear")}
              type="button"
            >
              ×
            </button>
          </div>
        </div>
        <div
          className="progress-track"
          aria-label={`${progress.percent.toFixed(1)}%`}
        >
          <span style={{ width: `${progress.percent}%` }} />
        </div>
        <div className="metrics-row">
          <span>
            {t("results")} <strong>{String(progress.resultCount)}</strong>
          </span>
          <span>
            {t("workers")} <strong>{summary?.workerCount ?? "-"}</strong>
          </span>
          <span>
            {t("elapsed")}{" "}
            <strong>
              {summary ? `${summary.elapsedMs.toFixed(0)} ms` : "-"}
            </strong>
          </span>
        </div>
        {error && (
          <div className="alert error">
            {error.includes("Wasm") ? t("ivToPidWasmMissing") : error}
          </div>
        )}
        <div className="table-shell ivtopid-table-shell">
          {sortedResults.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">＋</span>
              <span>{t("emptyIvToPid")}</span>
            </div>
          ) : (
            <table className="ivtopid-table">
              <thead>
                <tr>
                  {(
                    [
                      "seed",
                      "pid",
                      "method",
                      "ability",
                      "12.5%",
                      "25%",
                      "50%",
                      "75%",
                      "sid",
                    ] as const
                  ).map((key) => (
                    <th key={key}>
                      {key === "12.5%" ||
                      key === "25%" ||
                      key === "50%" ||
                      key === "75%" ? (
                        key
                      ) : (
                        <button
                          onClick={() => toggleSort(key as SortKey)}
                          type="button"
                        >
                          {key === "seed"
                            ? t("seed")
                            : key === "pid"
                              ? "PID"
                              : key === "method"
                                ? t("ivToPidMethod")
                                : key === "ability"
                                  ? t("ivToPidAbility")
                                  : "SID"}
                          {sortMark(key as SortKey)}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((state, index) => (
                  <tr
                    key={`${state.seed}-${state.pid}-${state.method}-${index}`}
                  >
                    <td>{hex(state.seed)}</td>
                    <td>{hex(state.pid)}</td>
                    <td>{methodLabel(state)}</td>
                    <td>{state.ability}</td>
                    <td>{gender(state.gender12_5)}</td>
                    <td>{gender(state.gender25)}</td>
                    <td>{gender(state.gender50)}</td>
                    <td>{gender(state.gender75)}</td>
                    <td>{state.sid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
