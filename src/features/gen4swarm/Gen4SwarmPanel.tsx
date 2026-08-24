import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Crosshair, RotateCcw } from "lucide-react";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  gen4SwarmEncounters,
  validateGen4SwarmRequest,
  type Gen4SwarmGame,
  type Gen4SwarmRequest,
} from "./domain";
import type { Gen4SwarmEngine, Gen4SwarmSummary } from "./search";
import { Gen4SwarmWorker } from "./worker/Gen4SwarmWorker";
import "./Gen4SwarmPanel.css";

type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";

function formatSeed(seed: number) {
  return seed.toString(16).toUpperCase().padStart(8, "0");
}

function gameLabel(game: Gen4SwarmGame) {
  return game === "dp"
    ? "Diamond / Pearl"
    : game === "pt"
      ? "Platinum"
      : game === "hg"
        ? "HeartGold"
        : "SoulSilver";
}

export function Gen4SwarmPanel() {
  const { t } = useTranslation();
  const [game, setGame] = useState<Gen4SwarmGame>("dp");
  const [mode, setMode] = useState<"advances" | "seed">("advances");
  const [targetIndex, setTargetIndex] = useState(0);
  const [gameInput, setGameInput] = useState(gameLabel("dp"));
  const [targetInput, setTargetInput] = useState("1. Doduo - Route 201");
  const [seed, setSeed] = useState("");
  const [minAdvance, setMinAdvance] = useState("0");
  const [maxAdvance, setMaxAdvance] = useState("100");
  const [minDelay, setMinDelay] = useState("600");
  const [minHour, setMinHour] = useState("0");
  const [mtAdvances, setMtAdvances] = useState("0");
  const [status, setStatus] = useState<Status>("ready");
  const [summary, setSummary] = useState<Gen4SwarmSummary>();
  const [error, setError] = useState("");
  const [targetAdvance, setTargetAdvance] = useState<number>();
  const [currentAdvance, setCurrentAdvance] = useState(0);
  const [advanceHistory, setAdvanceHistory] = useState<number[]>([]);
  const engine = useMemo<Gen4SwarmEngine>(() => new Gen4SwarmWorker(), []);

  useEffect(() => () => engine.dispose(), [engine]);

  const encounters = gen4SwarmEncounters[game];
  const numeric = (value: string) =>
    value === "" ? Number.NaN : Number(value);
  const request = (): Gen4SwarmRequest =>
    mode === "advances"
      ? {
          mode,
          game,
          seed: Number.parseInt(seed || "0", 16),
          targetIndex,
          minAdvance: numeric(minAdvance),
          maxAdvance: numeric(maxAdvance),
        }
      : {
          mode,
          game,
          targetIndex,
          minDelay: numeric(minDelay),
          minHour: numeric(minHour),
          mtAdvances: numeric(mtAdvances),
        };

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const nextRequest = request();
    if (validateGen4SwarmRequest(nextRequest).length > 0) {
      setError(t("invalidGen4SwarmInput"));
      setStatus("failed");
      return;
    }
    setError("");
    setSummary(undefined);
    setStatus("calculating");
    try {
      const next = await engine.search(nextRequest);
      setSummary(next);
      setStatus(next.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const cancel = () => {
    engine.cancel();
    setStatus("cancelled");
  };

  const selectGame = (next: Gen4SwarmGame) => {
    setGame(next);
    setGameInput(gameLabel(next));
    setTargetIndex(0);
    setTargetInput(
      `1. ${gen4SwarmEncounters[next][0].pokemon} - ${gen4SwarmEncounters[next][0].route}`,
    );
    setTargetAdvance(undefined);
    setCurrentAdvance(0);
    setAdvanceHistory([]);
    setSummary(undefined);
    setError("");
    setStatus("ready");
  };

  const selectTarget = (next: number) => {
    const encounter = encounters[next];
    setTargetIndex(next);
    setTargetInput(`${next + 1}. ${encounter.pokemon} - ${encounter.route}`);
    setTargetAdvance(undefined);
    setCurrentAdvance(0);
    setAdvanceHistory([]);
    setSummary(undefined);
    setError("");
    setStatus("ready");
  };

  const addAdvance = (amount: number) => {
    setAdvanceHistory((current) => current.concat(amount));
    setCurrentAdvance((current) => current + amount);
  };

  const undoAdvance = () => {
    const last = advanceHistory.at(-1);
    if (last === undefined) return;
    setAdvanceHistory((current) => current.slice(0, -1));
    setCurrentAdvance((current) => Math.max(0, current - last));
  };

  const chooseAdvance = (advance: number) => {
    setTargetAdvance(advance);
    setCurrentAdvance(0);
    setAdvanceHistory([]);
  };

  const remaining =
    targetAdvance === undefined ? undefined : targetAdvance - currentAdvance;

  return (
    <section className="panel compact-module-panel gen4swarm-display">
      <div className="panel-heading">
        <div>
          <h2>{t("gen4SwarmModule")}</h2>
        </div>
      </div>
      <form className="gen4swarm-body" onSubmit={generate}>
        <div
          className="gen4swarm-tabs"
          role="tablist"
          aria-label={t("gen4SwarmMode")}
        >
          <button
            aria-selected={mode === "advances"}
            className={mode === "advances" ? "active" : ""}
            onClick={() => {
              setMode("advances");
              setSummary(undefined);
            }}
            role="tab"
            type="button"
          >
            {t("gen4SwarmAdvances")}
          </button>
          <button
            aria-selected={mode === "seed"}
            className={mode === "seed" ? "active" : ""}
            onClick={() => {
              setMode("seed");
              setSummary(undefined);
            }}
            role="tab"
            type="button"
          >
            {t("gen4SwarmSeedSearch")}
          </button>
        </div>

        <div className="gen4swarm-grid">
          <label className="field">
            <span>{t("game")}</span>
            <AutoCompleteComboBox
              inputValue={gameInput}
              label={t("game")}
              onInputChange={setGameInput}
              onValueChange={selectGame}
              options={(["dp", "pt", "hg", "ss"] as const).map((entry) => ({
                label: gameLabel(entry),
                value: entry,
              }))}
              value={game}
            />
          </label>
          <label className="field">
            <span>{t("gen4SwarmTarget")}</span>
            <AutoCompleteComboBox
              inputValue={targetInput}
              label={t("gen4SwarmTarget")}
              onInputChange={setTargetInput}
              onValueChange={selectTarget}
              options={encounters.map((encounter, index) => ({
                label: `${index + 1}. ${encounter.pokemon} - ${encounter.route}`,
                value: index,
              }))}
              value={targetIndex}
            />
          </label>
          {mode === "advances" ? (
            <>
              <label className="field">
                <span>{t("seed")}</span>
                <input
                  inputMode="text"
                  maxLength={8}
                  onChange={(event) =>
                    setSeed(normalizeHexInput(event.target.value, 8))
                  }
                  placeholder="00000000"
                  value={seed}
                />
              </label>
              <label className="field">
                <span>{t("minAdvance")}</span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    setMinAdvance(
                      normalizeDecimalInput(event.target.value, 0xffff_ffff),
                    )
                  }
                  value={minAdvance}
                />
              </label>
              <label className="field">
                <span>{t("maxAdvance")}</span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    setMaxAdvance(
                      normalizeDecimalInput(event.target.value, 0xffff_ffff),
                    )
                  }
                  value={maxAdvance}
                />
              </label>
            </>
          ) : (
            <>
              <label className="field">
                <span>{t("minDelay")}</span>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(event) =>
                    setMinDelay(normalizeDecimalInput(event.target.value, 9999))
                  }
                  value={minDelay}
                />
              </label>
              <label className="field">
                <span>{t("hour")}</span>
                <input
                  inputMode="numeric"
                  maxLength={2}
                  onChange={(event) =>
                    setMinHour(normalizeDecimalInput(event.target.value, 23))
                  }
                  value={minHour}
                />
              </label>
              <label className="field">
                <span>{t("gen4SwarmMtAdvances")}</span>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(event) =>
                    setMtAdvances(
                      normalizeDecimalInput(event.target.value, 9999),
                    )
                  }
                  value={mtAdvances}
                />
              </label>
            </>
          )}
        </div>

        <div className="panel-actions gen4swarm-actions">
          <button
            className="primary-action"
            disabled={status === "calculating"}
            type="submit"
          >
            {t("generate")}
          </button>
          {status === "calculating" && (
            <button className="secondary-action" onClick={cancel} type="button">
              {t("cancel")}
            </button>
          )}
          <button
            className="secondary-action"
            disabled={!summary && !error}
            onClick={() => {
              setSummary(undefined);
              setError("");
              setStatus("ready");
            }}
            type="button"
          >
            {t("clear")}
          </button>
        </div>

        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <section aria-live="polite" className="gen4swarm-results">
          <div className="gen4swarm-result-heading">
            <strong>{t("results")}</strong>
            <span>
              {status === "calculating"
                ? t("calculating")
                : summary
                  ? mode === "advances"
                    ? summary.advances.length
                    : summary.seeds.length
                  : 0}
            </span>
          </div>
          {mode === "advances" && summary?.advances.length ? (
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>{t("advance")}</th>
                    <th>{t("gen4SwarmEncounter")}</th>
                    <th aria-label={t("gen4SwarmTarget")} />
                  </tr>
                </thead>
                <tbody>
                  {summary.advances.map((result) => (
                    <tr
                      className={
                        result.advance === targetAdvance
                          ? "selected"
                          : undefined
                      }
                      key={result.advance}
                      onClick={() => chooseAdvance(result.advance)}
                    >
                      <td>{result.advance}</td>
                      <td>{encounters[result.encounterIndex]?.pokemon}</td>
                      <td>
                        <button
                          aria-label={t("gen4SwarmTarget")}
                          className="icon-action"
                          onClick={(event) => {
                            event.stopPropagation();
                            chooseAdvance(result.advance);
                          }}
                          title={t("gen4SwarmTarget")}
                          type="button"
                        >
                          <Crosshair aria-hidden="true" size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {mode === "seed" && summary?.seeds.length ? (
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>{t("seed")}</th>
                    <th>{t("hour")}</th>
                    <th>{t("delay")}</th>
                    <th>{t("gen4SwarmMtAdvances")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.seeds.map((result) => (
                    <tr key={result.seed}>
                      <td className="mono">{formatSeed(result.seed)}</td>
                      <td>{result.hour}</td>
                      <td>{result.delay}</td>
                      <td>{result.mtAdvances}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {status !== "calculating" &&
            summary &&
            ((mode === "advances" && summary.advances.length === 0) ||
              (mode === "seed" && summary.seeds.length === 0)) && (
              <div className="empty-state compact">{t("emptyGen4Swarm")}</div>
            )}
          {mode === "advances" && targetAdvance !== undefined && (
            <div className="gen4swarm-tracker">
              <div>
                <span>{t("gen4SwarmTargetAdvance")}</span>
                <strong>{targetAdvance}</strong>
              </div>
              <div>
                <span>{t("gen4SwarmCurrentAdvance")}</span>
                <strong>{currentAdvance}</strong>
              </div>
              <div>
                <span>{t("gen4SwarmRemaining")}</span>
                <strong>{remaining}</strong>
              </div>
              <div className="gen4swarm-tracker-actions">
                <button
                  className="secondary-action"
                  disabled={remaining !== undefined && remaining <= 0}
                  onClick={() => addAdvance(1)}
                  type="button"
                >
                  +1
                </button>
                {(game === "hg" || game === "ss") && (
                  <button
                    className="secondary-action"
                    disabled={remaining !== undefined && remaining <= 0}
                    onClick={() => addAdvance(2)}
                    type="button"
                  >
                    Youngster Joey +2
                  </button>
                )}
                <button
                  aria-label={t("undo")}
                  className="icon-action"
                  disabled={advanceHistory.length === 0}
                  onClick={undoAdvance}
                  title={t("undo")}
                  type="button"
                >
                  <RotateCcw aria-hidden="true" size={17} />
                </button>
              </div>
            </div>
          )}
        </section>
      </form>
    </section>
  );
}
