import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Square } from "lucide-react";
import { normalizeDecimalInput } from "../../input";
import {
  formatGen4SeedFinderDate,
  formatGen4SeedFinderSequence,
  sanitizeGen4SeedFinderFilter,
  validateGen4SeedFinderRequest,
  type Gen4SeedFinderGame,
  type Gen4SeedFinderRequest,
  type Gen4SeedFinderResult,
} from "./domain";
import { Gen4SeedFinderWorker } from "./worker/Gen4SeedFinderWorker";
import "./Gen4SeedFinderPanel.css";

type Status = "ready" | "calculating" | "completed" | "failed" | "cancelled";

function parse(value: string) {
  return value === "" ? Number.NaN : Number(value);
}

function initialDate() {
  return { year: "2005", month: "1", day: "1", hour: "17", minute: "0" };
}

export function Gen4SeedFinderPanel({
  uiPreviewMode = false,
}: {
  uiPreviewMode?: boolean;
}) {
  const { t } = useTranslation();
  const [game, setGame] = useState<Gen4SeedFinderGame>("dppt");
  const [date, setDate] = useState(initialDate);
  const [minSecond, setMinSecond] = useState("0");
  const [maxSecond, setMaxSecond] = useState("0");
  const [minDelay, setMinDelay] = useState("600");
  const [maxDelay, setMaxDelay] = useState("800");
  const [sequenceCount, setSequenceCount] = useState("20");
  const [filter, setFilter] = useState("");
  const [results, setResults] = useState<Gen4SeedFinderResult[]>([]);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const engine = useMemo(() => new Gen4SeedFinderWorker(), []);

  useEffect(() => () => engine.dispose(), [engine]);

  const normalizedFilter = sanitizeGen4SeedFinderFilter(filter, game);
  const request = (): Gen4SeedFinderRequest => ({
    game,
    year: parse(date.year),
    month: parse(date.month),
    day: parse(date.day),
    hour: parse(date.hour),
    minute: parse(date.minute),
    minSecond: parse(minSecond),
    maxSecond: parse(maxSecond),
    minDelay: parse(minDelay),
    maxDelay: parse(maxDelay),
    filter: normalizedFilter,
    sequenceCount: parse(sequenceCount),
  });

  const search = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const nextRequest = request();
    const validation = validateGen4SeedFinderRequest(nextRequest);
    if (validation.length) {
      setError(t("gen4SeedFinderInvalid"));
      setStatus("failed");
      return;
    }
    setStatus("calculating");
    setError("");
    setResults([]);
    try {
      const summary = await engine.search(nextRequest);
      setResults(summary.results);
      setElapsedMs(summary.elapsedMs);
      setStatus(summary.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const updateDate = (
    key: keyof ReturnType<typeof initialDate>,
    value: string,
  ) =>
    setDate((current) => ({
      ...current,
      [key]: normalizeDecimalInput(
        value,
        key === "year"
          ? 2099
          : key === "month"
            ? 12
            : key === "day"
              ? 31
              : key === "hour"
                ? 23
                : 59,
      ),
    }));

  const statusLabel = {
    ready: t("ready"),
    calculating: t("calculating"),
    completed: t("completed"),
    failed: t("failed"),
    cancelled: t("cancelled"),
  }[status];

  return (
    <div
      className={`gen4-seed-finder ${uiPreviewMode ? "ui-preview-mode" : ""}`}
    >
      <div
        className="operation-tabs gen4-seed-finder-tabs"
        role="tablist"
        aria-label={t("gen4SeedFinderGame")}
      >
        <button
          aria-selected={game === "dppt"}
          className={game === "dppt" ? "active" : ""}
          onClick={() => {
            setGame("dppt");
            setFilter("");
          }}
          role="tab"
          type="button"
        >
          {t("gen4SeedFinderDppT")}
        </button>
        <button
          aria-selected={game === "hgss"}
          className={game === "hgss" ? "active" : ""}
          onClick={() => {
            setGame("hgss");
            setFilter("");
          }}
          role="tab"
          type="button"
        >
          {t("gen4SeedFinderHgss")}
        </button>
      </div>
      <form className="gen4-seed-finder-form" onSubmit={search}>
        <section className="panel input-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen4SeedFinderDate")}</h2>
              <span className="panel-note">{t("gen4SeedFinderVersion")}</span>
            </div>
            <span className="status-badge">{statusLabel}</span>
          </div>
          <div className="gen4-seed-finder-date-grid">
            {(["year", "month", "day", "hour", "minute"] as const).map(
              (key) => (
                <label className="field" key={key}>
                  <span>{t(key)}</span>
                  <input
                    inputMode="numeric"
                    maxLength={key === "year" ? 4 : 2}
                    onChange={(event) => updateDate(key, event.target.value)}
                    value={date[key]}
                  />
                </label>
              ),
            )}
          </div>
          <div className="gen4-seed-finder-range-grid">
            <label className="field">
              <span>{t("gen4SeedFinderSeconds")}</span>
              <div className="range-fields">
                <input
                  aria-label={`${t("gen4SeedFinderSeconds")} ${t("minimum")}`}
                  inputMode="numeric"
                  onChange={(event) =>
                    setMinSecond(normalizeDecimalInput(event.target.value, 59))
                  }
                  value={minSecond}
                />
                <span>–</span>
                <input
                  aria-label={`${t("gen4SeedFinderSeconds")} ${t("maximum")}`}
                  inputMode="numeric"
                  onChange={(event) =>
                    setMaxSecond(normalizeDecimalInput(event.target.value, 60))
                  }
                  value={maxSecond}
                />
              </div>
            </label>
            <label className="field">
              <span>{t("gen4SeedFinderDelay")}</span>
              <div className="range-fields">
                <input
                  aria-label={`${t("gen4SeedFinderDelay")} ${t("minimum")}`}
                  inputMode="numeric"
                  onChange={(event) =>
                    setMinDelay(
                      normalizeDecimalInput(event.target.value, 1_000_000),
                    )
                  }
                  value={minDelay}
                />
                <span>–</span>
                <input
                  aria-label={`${t("gen4SeedFinderDelay")} ${t("maximum")}`}
                  inputMode="numeric"
                  onChange={(event) =>
                    setMaxDelay(
                      normalizeDecimalInput(event.target.value, 1_000_000),
                    )
                  }
                  value={maxDelay}
                />
              </div>
            </label>
          </div>
          <label className="field">
            <span>{t("gen4SeedFinderSequenceLength")}</span>
            <input
              inputMode="numeric"
              maxLength={2}
              onChange={(event) =>
                setSequenceCount(normalizeDecimalInput(event.target.value, 32))
              }
              value={sequenceCount}
            />
          </label>
          <label className="field">
            <span>{t("gen4SeedFinderFilter")}</span>
            <input
              autoCapitalize="characters"
              maxLength={32}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={game === "dppt" ? "HTHT" : "EKP"}
              value={filter}
            />
            <small>{normalizedFilter || "-"}</small>
          </label>
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              <Search aria-hidden="true" size={17} />
              {t("gen4SeedFinderSearch")}
            </button>
            <button
              className="secondary-action"
              disabled={status !== "calculating"}
              onClick={() => engine.cancel()}
              type="button"
            >
              <Square aria-hidden="true" size={15} />
              {t("cancel")}
            </button>
          </div>
        </section>
        <section className="panel filter-panel gen4-seed-finder-results-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen4SeedFinderModule")}</h2>
              <span className="panel-note">
                {results.length} · {elapsedMs.toFixed(1)} ms
              </span>
            </div>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div
            className="gen4-seed-finder-results"
            role="region"
            aria-live="polite"
          >
            {results.length === 0 ? (
              <p className="empty-state">{t("emptyGen4SeedFinder")}</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{t("seed")}</th>
                    <th>{t("dateTime")}</th>
                    <th>{t("delay")}</th>
                    <th>{t("gen4SeedFinderSequence")}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={`${result.seed}-${result.delay}-${result.second}`}>
                      <td className="mono">
                        {result.seed
                          .toString(16)
                          .toUpperCase()
                          .padStart(8, "0")}
                      </td>
                      <td>{formatGen4SeedFinderDate(result)}</td>
                      <td>{result.delay}</td>
                      <td className="mono">
                        {formatGen4SeedFinderSequence(
                          result,
                          game,
                          Number(sequenceCount),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </form>
    </div>
  );
}
