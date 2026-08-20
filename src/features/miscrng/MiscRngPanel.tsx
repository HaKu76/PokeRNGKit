import { Select } from "../shared/Select";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, Dices, FlaskConical, RotateCcw } from "lucide-react";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";
import {
  calculateCaptureOdds,
  compareRandom,
  parseMiscHex,
  pokerusStrain,
  randomN,
  simulateCapture,
  type CaptureOdds,
  type MiscGeneration,
  type RandomCompare,
} from "./domain";
import "./MiscRngPanel.css";

interface MiscRngPanelProps {
  readonly expanded: boolean;
  readonly onExpandedChange: (expanded: boolean) => void;
}

type MiscTab = "capture" | "random" | "pokerus";

const STATUS_OPTIONS = [
  ["0x1000", "None"],
  ["0x1800", "Poisoned / Paralyzed / Burned"],
  ["0x2800", "Asleep / Frozen"],
] as const;
const BALL_OPTIONS = [
  ["0x1000", "x1.0"],
  ["0x1800", "x1.5"],
  ["0x2000", "x2.0"],
  ["0x3000", "x3.0"],
  ["0x3800", "x3.5"],
  ["0x4000", "x4.0"],
  ["0x5000", "x5.0"],
  ["0x8000", "x8.0"],
  ["0x019A", "x0.1 (Ultra Beast)"],
] as const;
const DEX_OPTIONS = [
  ["0x2800", ">600"],
  ["0x2000", "451-600"],
  ["0x1800", "301-450"],
  ["0x1000", "151-300"],
  ["0x0800", "031-150"],
  ["0x0000", "<=30"],
] as const;

function parseRandomList(value: string) {
  return value
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseMiscHex);
}

function percentage(value: number) {
  return `${(value * 100).toFixed(3)}%`;
}

export function MiscRngPanel({
  expanded,
  onExpandedChange,
}: MiscRngPanelProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<MiscTab>("capture");
  const [generation, setGeneration] = useState<MiscGeneration>(7);
  const [hpCurrent, setHpCurrent] = useState("1");
  const [hpMax, setHpMax] = useState("208");
  const [catchRate, setCatchRate] = useState("3");
  const [statusBonus, setStatusBonus] = useState("0x1000");
  const [ballBonus, setBallBonus] = useState("0x1000");
  const [dexBonus, setDexBonus] = useState("0x2800");
  const [oPowerBonus, setOPowerBonus] = useState("1");
  const [captureRandoms, setCaptureRandoms] = useState("00000000, 00000000");
  const [captureOdds, setCaptureOdds] = useState<CaptureOdds>();
  const [captureAttempt, setCaptureAttempt] =
    useState<ReturnType<typeof simulateCapture>>();
  const [randomValue, setRandomValue] = useState("0000000000000000");
  const [randomRange, setRandomRange] = useState("100");
  const [randomCompare, setRandomCompare] =
    useState<RandomCompare>("less-than");
  const [randomTarget, setRandomTarget] = useState("50");
  const [randomResult, setRandomResult] = useState<number>();
  const [randomMatches, setRandomMatches] = useState<boolean>();
  const [pokerusRandoms, setPokerusRandoms] = useState(
    "0000000000004000, 0000000000000007",
  );
  const [pokerusResult, setPokerusResult] =
    useState<ReturnType<typeof pokerusStrain>>();
  const [error, setError] = useState("");

  const captureRequest = useMemo(
    () => ({
      generation,
      hpCurrent: Number(hpCurrent || 0),
      hpMax: Number(hpMax || 0),
      catchRate: Number(catchRate || 0),
      statusBonus: Number.parseInt(statusBonus, 16),
      ballBonus: Number.parseInt(ballBonus, 16),
      dexBonus: Number.parseInt(dexBonus, 16),
      oPowerBonus: Number(oPowerBonus),
    }),
    [
      ballBonus,
      catchRate,
      dexBonus,
      generation,
      hpCurrent,
      hpMax,
      oPowerBonus,
      statusBonus,
    ],
  );

  const runCapture = () => {
    try {
      const odds = calculateCaptureOdds(captureRequest);
      setCaptureOdds(odds);
      setCaptureAttempt(
        simulateCapture(odds, generation, parseRandomList(captureRandoms)),
      );
      setError("");
    } catch (cause) {
      setCaptureOdds(undefined);
      setCaptureAttempt(undefined);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const runRandom = () => {
    try {
      const value = Number(randomRange || 0);
      const result = randomN(parseMiscHex(randomValue), value);
      setRandomResult(result);
      setRandomMatches(
        compareRandom(result, randomCompare, Number(randomTarget || 0)),
      );
      setError("");
    } catch (cause) {
      setRandomResult(undefined);
      setRandomMatches(undefined);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const runPokerus = () => {
    try {
      setPokerusResult(pokerusStrain(parseRandomList(pokerusRandoms)));
      setError("");
    } catch (cause) {
      setPokerusResult(undefined);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const clear = () => {
    setCaptureOdds(undefined);
    setCaptureAttempt(undefined);
    setRandomResult(undefined);
    setRandomMatches(undefined);
    setPokerusResult(undefined);
    setError("");
  };

  return (
    <FloatingToolPanel
      className="misc-rng-display"
      closeLabel={t("collapse")}
      expanded={expanded}
      id="misc-rng-panel"
      label={t("miscRngModule")}
      onExpandedChange={onExpandedChange}
      subtitle={t("miscRngEngine")}
      tone="teal"
      triggerId="misc-rng-trigger"
    >
      <div className="misc-rng-body">
        <div className="misc-rng-tabs" role="tablist">
          <button
            aria-selected={tab === "capture"}
            className={tab === "capture" ? "active" : undefined}
            onClick={() => setTab("capture")}
            role="tab"
            type="button"
          >
            <Calculator aria-hidden="true" size={16} />
            {t("miscRngCapture")}
          </button>
          <button
            aria-selected={tab === "random"}
            className={tab === "random" ? "active" : undefined}
            onClick={() => setTab("random")}
            role="tab"
            type="button"
          >
            <Dices aria-hidden="true" size={16} />
            {t("miscRngRandom")}
          </button>
          <button
            aria-selected={tab === "pokerus"}
            className={tab === "pokerus" ? "active" : undefined}
            onClick={() => setTab("pokerus")}
            role="tab"
            type="button"
          >
            <FlaskConical aria-hidden="true" size={16} />
            {t("miscRngPokerus")}
          </button>
        </div>

        {tab === "capture" && (
          <div className="misc-rng-section" role="tabpanel">
            <div className="misc-rng-grid">
              <label>
                <span>{t("miscRngGeneration")}</span>
                <Select
                  value={generation}
                  onChange={(event) =>
                    setGeneration(Number(event.target.value) as MiscGeneration)
                  }
                >
                  <option value="6">Gen VI / MT</option>
                  <option value="7">Gen VII / SFMT</option>
                </Select>
              </label>
              <label>
                <span>{t("miscRngCurrentHp")}</span>
                <input
                  inputMode="numeric"
                  max="1000"
                  min="0"
                  onChange={(event) =>
                    setHpCurrent(
                      normalizeDecimalInput(event.target.value, 1000),
                    )
                  }
                  value={hpCurrent}
                />
              </label>
              <label>
                <span>{t("miscRngMaximumHp")}</span>
                <input
                  inputMode="numeric"
                  max="1000"
                  min="1"
                  onChange={(event) =>
                    setHpMax(normalizeDecimalInput(event.target.value, 1000))
                  }
                  value={hpMax}
                />
              </label>
              <label>
                <span>{t("miscRngCatchRate")}</span>
                <input
                  inputMode="numeric"
                  max="255"
                  min="0"
                  onChange={(event) =>
                    setCatchRate(normalizeDecimalInput(event.target.value, 255))
                  }
                  value={catchRate}
                />
              </label>
              <label>
                <span>{t("miscRngStatus")}</span>
                <Select
                  value={statusBonus}
                  onChange={(event) => setStatusBonus(event.target.value)}
                >
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                <span>{t("miscRngBall")}</span>
                <Select
                  value={ballBonus}
                  onChange={(event) => setBallBonus(event.target.value)}
                >
                  {BALL_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                <span>{t("miscRngDexCaught")}</span>
                <Select
                  value={dexBonus}
                  onChange={(event) => setDexBonus(event.target.value)}
                >
                  {DEX_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                <span>{t("miscRngOPower")}</span>
                <Select
                  value={oPowerBonus}
                  onChange={(event) => setOPowerBonus(event.target.value)}
                >
                  {["1", "1.5", "2", "2.5"].map((value) => (
                    <option key={value} value={value}>
                      x{value}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <label className="misc-rng-wide-field">
              <span>{t("miscRngRandomValues")}</span>
              <input
                onChange={(event) =>
                  setCaptureRandoms(normalizeHexInput(event.target.value, 16))
                }
                value={captureRandoms}
              />
            </label>
            {captureOdds && (
              <div className="misc-rng-results">
                <div>
                  <span>{t("miscRngCriticalChance")}</span>
                  <strong>{percentage(captureOdds.criticalChance)}</strong>
                </div>
                <div>
                  <span>{t("miscRngShakeChance")}</span>
                  <strong>{percentage(captureOdds.shakeChance)}</strong>
                </div>
                <div>
                  <span>{t("miscRngSuccessChance")}</span>
                  <strong>{percentage(captureOdds.successChance)}</strong>
                </div>
                {captureAttempt && (
                  <div>
                    <span>{t("miscRngShakeResult")}</span>
                    <strong>
                      {captureAttempt.shakeCount} / {captureAttempt.totalShakes}
                    </strong>
                  </div>
                )}
              </div>
            )}
            <button
              className="primary-action"
              onClick={runCapture}
              type="button"
            >
              <Calculator aria-hidden="true" size={17} />
              {t("miscRngCalculate")}
            </button>
          </div>
        )}

        {tab === "random" && (
          <div className="misc-rng-section" role="tabpanel">
            <div className="misc-rng-grid">
              <label className="misc-rng-wide-field">
                <span>{t("miscRngRandomValue")}</span>
                <input
                  onChange={(event) =>
                    setRandomValue(normalizeHexInput(event.target.value, 16))
                  }
                  value={randomValue}
                />
              </label>
              <label>
                <span>{t("miscRngRange")}</span>
                <input
                  inputMode="numeric"
                  min="1"
                  onChange={(event) =>
                    setRandomRange(
                      normalizeDecimalInput(event.target.value, 0xffff_ffff),
                    )
                  }
                  value={randomRange}
                />
              </label>
              <label>
                <span>{t("miscRngCompare")}</span>
                <Select
                  value={randomCompare}
                  onChange={(event) =>
                    setRandomCompare(event.target.value as RandomCompare)
                  }
                >
                  <option value="less-than">&lt;</option>
                  <option value="greater-than">≥</option>
                  <option value="equal">=</option>
                </Select>
              </label>
              <label>
                <span>{t("miscRngTarget")}</span>
                <input
                  inputMode="numeric"
                  min="0"
                  onChange={(event) =>
                    setRandomTarget(
                      normalizeDecimalInput(event.target.value, 0xffff_ffff),
                    )
                  }
                  value={randomTarget}
                />
              </label>
            </div>
            {randomResult !== undefined && (
              <div className="misc-rng-result-line">
                <span>{t("miscRngResult")}</span>
                <strong>{randomResult}</strong>
                <span className={randomMatches ? "is-success" : ""}>
                  {randomMatches ? t("miscRngMatch") : t("miscRngNoMatch")}
                </span>
              </div>
            )}
            <button
              className="primary-action"
              onClick={runRandom}
              type="button"
            >
              <Dices aria-hidden="true" size={17} />
              {t("miscRngCalculate")}
            </button>
          </div>
        )}

        {tab === "pokerus" && (
          <div className="misc-rng-section" role="tabpanel">
            <label className="misc-rng-wide-field">
              <span>{t("miscRngRandomValues")}</span>
              <textarea
                onChange={(event) => setPokerusRandoms(event.target.value)}
                rows={4}
                value={pokerusRandoms}
              />
            </label>
            {pokerusResult && (
              <div className="misc-rng-result-line">
                <span>{t("miscRngPokerusStrain")}</span>
                <strong>{pokerusResult.strain || t("miscRngNoResult")}</strong>
                <span>
                  {t("miscRngConsumed", {
                    count: pokerusResult.consumedRandoms,
                  })}
                </span>
              </div>
            )}
            <button
              className="primary-action"
              onClick={runPokerus}
              type="button"
            >
              <FlaskConical aria-hidden="true" size={17} />
              {t("miscRngCalculate")}
            </button>
          </div>
        )}

        {error && <div className="alert error misc-rng-error">{error}</div>}
        <button
          className="secondary-action misc-rng-clear"
          onClick={clear}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={16} />
          {t("miscRngClear")}
        </button>
      </div>
    </FloatingToolPanel>
  );
}
