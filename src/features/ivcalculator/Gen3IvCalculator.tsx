import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput } from "../../input";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { getGen3Personal } from "../shared/gen3Personal";
import { getGen3Species, getGen3SpeciesName } from "../shared/gen3Species";
import type { Gen3StatValues } from "../shared/gen3Stats";
import {
  calculateGen3IvRange,
  calculateGen3NextLevels,
  formatGen3IvCandidates,
  type Gen3IvCandidates,
  type Gen3StatObservation,
} from "./domain";

interface CalculatorRow {
  id: number;
  level: string;
  stats: [string, string, string, string, string, string];
}

interface CalculatorResult {
  ivs: Gen3IvCandidates;
  nextLevels: Gen3StatValues;
}

interface Gen3IvCalculatorProps {
  expanded: boolean;
  onExpandedChange(expanded: boolean): void;
}

const statKeys = [
  "ivHp",
  "ivAttack",
  "ivDefense",
  "ivSpecialAttack",
  "ivSpecialDefense",
  "ivSpeed",
] as const;
const statMaximums = [651, 437, 545, 435, 545, 479] as const;
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
const hiddenPowerKeys = [
  "powerFighting",
  "powerFlying",
  "powerPoison",
  "powerGround",
  "powerRock",
  "powerBug",
  "powerGhost",
  "powerSteel",
  "powerFire",
  "powerWater",
  "powerGrass",
  "powerElectric",
  "powerPsychic",
  "powerIce",
  "powerDragon",
  "powerDark",
] as const;

function createRow(id: number): CalculatorRow {
  return { id, level: "1", stats: ["1", "1", "1", "1", "1", "1"] };
}

export function Gen3IvCalculator({
  expanded,
  onExpandedChange,
}: Gen3IvCalculatorProps) {
  const { t, i18n } = useTranslation();
  const panelRef = useRef<HTMLElement>(null);
  const nextRowId = useRef(2);
  const [species, setSpecies] = useState(1);
  const [speciesInput, setSpeciesInput] = useState({
    language: i18n.language,
    species: 1,
    text: getGen3Species(i18n.language)[0]?.name ?? "",
  });
  const [form, setForm] = useState(0);
  const [nature, setNature] = useState(-1);
  const [hiddenPower, setHiddenPower] = useState(-1);
  const [rows, setRows] = useState<CalculatorRow[]>([createRow(1)]);
  const [result, setResult] = useState<CalculatorResult>();
  const [error, setError] = useState("");
  const speciesOptions = useMemo(
    () => getGen3Species(i18n.language),
    [i18n.language],
  );
  const formCount = species === 386 ? 4 : 1;
  const personal = getGen3Personal(species, form);

  const displayedSpecies =
    speciesInput.language === i18n.language && speciesInput.species === species
      ? speciesInput.text
      : (speciesOptions.find((entry) => entry.id === species)?.name ?? "");

  useEffect(() => {
    if (!expanded) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        onExpandedChange(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [expanded, onExpandedChange]);

  const updateRow = (rowId: number, field: "level" | number, value: string) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        if (field === "level") return { ...row, level: value };
        const stats = [...row.stats] as CalculatorRow["stats"];
        stats[field] = value;
        return { ...row, stats };
      }),
    );
  };

  const calculate = () => {
    const observations: Gen3StatObservation[] = [];
    for (const row of rows) {
      const level = Number(row.level);
      const stats = row.stats.map(Number) as Gen3StatValues;
      if (
        !Number.isInteger(level) ||
        level < 1 ||
        level > 100 ||
        stats.some(
          (stat, index) =>
            !Number.isInteger(stat) || stat < 1 || stat > statMaximums[index],
        )
      ) {
        setError(t("invalidIvCalculatorInput"));
        return;
      }
      observations.push({ level, stats });
    }
    const selectedNature = nature < 0 ? undefined : nature;
    const selectedHiddenPower = hiddenPower < 0 ? undefined : hiddenPower;
    const ivs = calculateGen3IvRange(
      personal.stats,
      observations,
      selectedNature,
      selectedHiddenPower,
    );
    setResult({
      ivs,
      nextLevels: calculateGen3NextLevels(
        personal.stats,
        ivs,
        observations.at(-1)!.level,
        selectedNature,
      ),
    });
    setError("");
  };

  return (
    <aside
      aria-label={t("ivCalculator")}
      className={`iv-calculator-display${expanded ? "" : " collapsed"}`}
      ref={panelRef}
    >
      <button
        aria-controls="gen3-iv-calculator-body"
        aria-expanded={expanded}
        aria-label={t(expanded ? "collapse" : "ivCalculator")}
        className="floating-tool-heading"
        onClick={() => onExpandedChange(!expanded)}
        title={t(expanded ? "collapse" : "ivCalculator")}
        type="button"
      >
        <strong>{expanded ? t("ivCalculator") : "IV"}</strong>
        <span aria-hidden="true" className="floating-tool-trigger-icon">
          {expanded ? "×" : "+"}
        </span>
      </button>
      {expanded && (
        <div className="iv-calculator-body" id="gen3-iv-calculator-body">
          <div className="calculator-settings-grid">
            <label className="field">
              <span>{t("game")}</span>
              <select disabled value="gen3">
                <option value="gen3">Emerald/RS/FRLG</option>
              </select>
            </label>
            <label className="field calculator-pokemon-field">
              <span>{t("pokemon")}</span>
              <AutoCompleteComboBox
                inputValue={displayedSpecies}
                label={t("pokemon")}
                onInputChange={(text) =>
                  setSpeciesInput({
                    language: i18n.language,
                    species,
                    text,
                  })
                }
                onValueChange={(value) => {
                  setSpecies(value);
                  setForm(0);
                }}
                options={speciesOptions.map((entry) => ({
                  label: entry.name,
                  value: entry.id,
                }))}
                value={species}
              />
            </label>
            {formCount > 1 && (
              <label className="field">
                <span>{t("altForm")}</span>
                <select
                  onChange={(event) => setForm(Number(event.target.value))}
                  value={form}
                >
                  {Array.from({ length: formCount }, (_, index) => (
                    <option key={index} value={index}>
                      {getGen3SpeciesName(i18n.language, species, index)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              <span>{t("hiddenPower")}</span>
              <select
                onChange={(event) => setHiddenPower(Number(event.target.value))}
                value={hiddenPower}
              >
                <option value={-1}>{t("none")}</option>
                {hiddenPowerKeys.map((key, index) => (
                  <option key={key} value={index}>
                    {t(key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("nature")}</span>
              <select
                onChange={(event) => setNature(Number(event.target.value))}
                value={nature}
              >
                <option value={-1}>{t("none")}</option>
                {natureKeys.map((key, index) => (
                  <option key={key} value={index}>
                    {t(key)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="calculator-observations">
            <div className="calculator-row calculator-row-header">
              <span>{t("level")}</span>
              {statKeys.map((key) => (
                <span key={key}>{t(key)}</span>
              ))}
            </div>
            {rows.map((row) => (
              <div className="calculator-row" key={row.id}>
                <input
                  aria-label={t("level")}
                  inputMode="numeric"
                  max="100"
                  min="1"
                  onChange={(event) =>
                    updateRow(
                      row.id,
                      "level",
                      normalizeDecimalInput(event.target.value, 100, 3),
                    )
                  }
                  type="number"
                  value={row.level}
                />
                {row.stats.map((stat, index) => (
                  <input
                    aria-label={t(statKeys[index])}
                    inputMode="numeric"
                    key={statKeys[index]}
                    max={statMaximums[index]}
                    min="1"
                    onChange={(event) =>
                      updateRow(
                        row.id,
                        index,
                        normalizeDecimalInput(
                          event.target.value,
                          statMaximums[index],
                          3,
                        ),
                      )
                    }
                    type="number"
                    value={stat}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="calculator-actions">
            <button
              onClick={() => {
                setRows((current) => [
                  ...current,
                  createRow(nextRowId.current++),
                ]);
              }}
              type="button"
            >
              {t("addRow")}
            </button>
            <button
              disabled={rows.length === 1}
              onClick={() => setRows((current) => current.slice(0, -1))}
              type="button"
            >
              {t("removeRow")}
            </button>
            <button
              className="primary-action"
              onClick={calculate}
              type="button"
            >
              {t("findIvs")}
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}

          <div className="calculator-output-grid">
            <section>
              <h3>{t("information")}</h3>
              <dl>
                {statKeys.map((key, index) => (
                  <div key={key}>
                    <dt>{t(key)}</dt>
                    <dd>{personal.stats[index]}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section>
              <h3>{t("calculatorResults")}</h3>
              <dl>
                {statKeys.map((key, index) => (
                  <div key={key}>
                    <dt>{t(key)}</dt>
                    <dd>
                      {result
                        ? (formatGen3IvCandidates(result.ivs[index]) ??
                          t("invalid"))
                        : "-"}
                    </dd>
                  </div>
                ))}
                <div className="calculator-next-level">
                  <dt title={t("nextLevelNotice")}>{t("nextLevel")}</dt>
                  <dd>{result ? result.nextLevels.join(", ") : "-"}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      )}
    </aside>
  );
}
