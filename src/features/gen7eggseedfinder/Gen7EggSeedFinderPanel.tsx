import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  normalizeBinaryInput,
  normalizeSeedInput,
  formatGen7EggSeedState,
  type Gen7EggSeedState,
} from "./domain";
import { Gen7EggSeedFinderUiPreviewEngine } from "./preview/Gen7EggSeedFinderUiPreviewEngine";
import type { Gen7EggSeedEngine } from "./search";
import { Gen7EggSeedFinderWorkerPool } from "./worker/Gen7EggSeedFinderWorkerPool";
import "./Gen7EggSeedFinderPanel.css";

const NATURE_KEYS = [
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

export function Gen7EggSeedFinderPanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen7EggSeedEngine>(
    () =>
      uiPreviewMode
        ? new Gen7EggSeedFinderUiPreviewEngine()
        : new Gen7EggSeedFinderWorkerPool(),
    [uiPreviewMode],
  );
  const [tab, setTab] = useState<"magikarp" | "nature">("nature");
  const [bits, setBits] = useState("");
  const [magikarpState, setMagikarpState] = useState<Gen7EggSeedState>();
  const [natures, setNatures] = useState([0, 1, 2, 3, 4, 5, 6, 7]);
  const [startSeed, setStartSeed] = useState("00000000");
  const [endSeed, setEndSeed] = useState("FFFFFFFF");
  const [shinyCharm, setShinyCharm] = useState(false);
  const [results, setResults] = useState<Gen7EggSeedState[]>([]);
  const [progress, setProgress] = useState({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const normalizedBits = normalizeBinaryInput(bits);
  useEffect(() => () => engine.dispose(), [engine]);

  const runMagikarp = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const state = await engine.magikarp({ bits: normalizedBits });
      setMagikarpState(state);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const runSearch = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setResults([]);
    const start = Number.parseInt(startSeed || "0", 16);
    const end = Number.parseInt(endSeed || "0", 16);
    const request = {
      startSeed: start,
      endSeed: end,
      natureList: natures as [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
      ],
      shinyCharm,
    };
    setStatus("calculating");
    try {
      const summary = await engine.search(request, {
        onBatch: (batch) => setResults((current) => [...current, ...batch]),
        onProgress: setProgress,
      });
      setProgress(summary);
      setStatus(summary.cancelled ? "ready" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };
  const exportCsv = () => {
    const csv = [
      "Tiny State",
      ...results.map((state) => formatGen7EggSeedState(state)),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen7-egg-seeds.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="gen7eggseedfinder-panel">
      <div className="gen7eggseedfinder-workspace">
        <section className="panel gen7eggseedfinder-controls">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("gen7EggSeedFinderModule")}</h2>
            </div>
            <span className="panel-note">TinyMT / Gen VII</span>
          </div>
          <div className="gen7eggseedfinder-tabs" role="tablist">
            <button
              aria-controls="gen7eggseedfinder-nature-panel"
              aria-selected={tab === "nature"}
              className={tab === "nature" ? "active" : ""}
              id="gen7eggseedfinder-nature-tab"
              onClick={() => setTab("nature")}
              role="tab"
              type="button"
            >
              {t("gen7EggSeedFinderNatureSearch")}
            </button>
            <button
              aria-controls="gen7eggseedfinder-magikarp-panel"
              aria-selected={tab === "magikarp"}
              className={tab === "magikarp" ? "active" : ""}
              id="gen7eggseedfinder-magikarp-tab"
              onClick={() => setTab("magikarp")}
              role="tab"
              type="button"
            >
              {t("gen7EggSeedFinderMagikarp")}
            </button>
          </div>
          {tab === "magikarp" ? (
            <form
              aria-labelledby="gen7eggseedfinder-magikarp-tab"
              className="gen7eggseedfinder-form"
              id="gen7eggseedfinder-magikarp-panel"
              onSubmit={runMagikarp}
              role="tabpanel"
            >
              <label className="field">
                <span>{t("gen7EggSeedFinderGenderSequence")}</span>
                <textarea
                  onChange={(event) => setBits(event.target.value)}
                  rows={7}
                  spellCheck={false}
                  value={bits}
                />
              </label>
              <small>{normalizedBits.length} / 127</small>
              <button className="primary-action" type="submit">
                {t("calculate")}
              </button>
            </form>
          ) : (
            <form
              aria-labelledby="gen7eggseedfinder-nature-tab"
              className="gen7eggseedfinder-form"
              id="gen7eggseedfinder-nature-panel"
              onSubmit={runSearch}
              role="tabpanel"
            >
              <div className="compact-field-row">
                <label className="field">
                  <span>{t("gen7EggSeedFinderMinimumSeed")}</span>
                  <div className="prefixed-input">
                    <span>0x</span>
                    <input
                      inputMode="text"
                      maxLength={8}
                      onChange={(event) =>
                        setStartSeed(normalizeSeedInput(event.target.value))
                      }
                      value={startSeed}
                    />
                  </div>
                </label>
                <label className="field">
                  <span>{t("gen7EggSeedFinderMaximumSeed")}</span>
                  <div className="prefixed-input">
                    <span>0x</span>
                    <input
                      inputMode="text"
                      maxLength={8}
                      onChange={(event) =>
                        setEndSeed(normalizeSeedInput(event.target.value))
                      }
                      value={endSeed}
                    />
                  </div>
                </label>
              </div>
              <div className="gen7eggseedfinder-natures">
                {natures.map((nature, index) => (
                  <label className="field" key={index}>
                    <span>
                      {t("gen7EggSeedFinderEgg")} {index + 1}
                    </span>
                    <select
                      onChange={(event) =>
                        setNatures((current) =>
                          current.map((value, item) =>
                            item === index ? Number(event.target.value) : value,
                          ),
                        )
                      }
                      value={nature}
                    >
                      {NATURE_KEYS.map((key, value) => (
                        <option key={key} value={value}>
                          {value.toString().padStart(2, "0")} - {t(key)}
                        </option>
                      ))}
                      <option value={25}>25</option>
                    </select>
                  </label>
                ))}
              </div>
              <label className="checkbox-field">
                <input
                  checked={shinyCharm}
                  onChange={(event) => setShinyCharm(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen7EggSeedFinderShinyCharm")}</span>
              </label>
              <div className="panel-actions">
                <button
                  className="primary-action"
                  disabled={status === "calculating"}
                  type="submit"
                >
                  {t("search")}
                </button>
                <button
                  className="secondary-action"
                  disabled={status !== "calculating"}
                  onClick={() => engine.cancel()}
                  type="button"
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          )}
          {magikarpState && (
            <output className="gen7eggseedfinder-output">
              {formatGen7EggSeedState(magikarpState)}
            </output>
          )}
          {error && <div className="alert error">{error}</div>}
        </section>
        <section className="panel results-panel gen7eggseedfinder-results">
          <div className="results-heading">
            <div className="panel-heading compact">
              <div>
                <span className="panel-index">02</span>
                <h2>{t("results")}</h2>
              </div>
              <span className={`run-status ${status}`}>{t(status)}</span>
            </div>
            <div className="result-actions">
              <span className="result-count">{results.length}</span>
              <button
                className="secondary-action"
                disabled={!results.length}
                onClick={exportCsv}
                type="button"
              >
                {t("exportCsv")}
              </button>
            </div>
          </div>
          <div
            className="progress-track"
            aria-label={`${progress.percent.toFixed(2)}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress.percent}
            role="progressbar"
          >
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="metrics-row">
            <span>
              {t("processed")} <strong>{progress.processedStates}</strong> /{" "}
              {progress.totalStates}
            </span>
            <span>
              {t("matches")} <strong>{results.length}</strong>
            </span>
          </div>
          <div className="gen7eggseedfinder-table">
            {results.length === 0 ? (
              <div className="empty-state compact">
                {t("emptyGen7EggSeedFinder")}
              </div>
            ) : (
              results.map((state, index) => (
                <div
                  className="gen7eggseedfinder-row"
                  key={`${formatGen7EggSeedState(state)}-${index}`}
                >
                  <span>{index + 1}</span>
                  <code>{formatGen7EggSeedState(state)}</code>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
