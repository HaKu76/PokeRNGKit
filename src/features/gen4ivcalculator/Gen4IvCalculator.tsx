import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput } from "../../input";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";
import {
  calculateGen4IvRange,
  calculateGen4NextLevels,
  formatGen4IvCandidates,
  type Gen4IvCandidates,
  type Gen4StatObservation,
  type Gen4StatValues,
} from "./domain";
import {
  getGen4BaseStats,
  getGen4Characteristics,
  getGen4FormCount,
  getGen4Species,
  getGen4SpeciesName,
  type Gen4PersonalDataSet,
} from "./gen4IvData";

interface CalculatorRow {
  id: number;
  level: string;
  stats: [string, string, string, string, string, string];
}

interface CalculatorResult {
  ivs: Gen4IvCandidates;
  nextLevels: Gen4StatValues;
}

interface Gen4IvCalculatorProps {
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

export function Gen4IvCalculator({
  expanded,
  onExpandedChange,
}: Gen4IvCalculatorProps) {
  const { t, i18n } = useTranslation();
  const nextRowId = useRef(2);
  const [game, setGame] = useState<Gen4PersonalDataSet>("platinum");
  const [species, setSpecies] = useState(1);
  const [speciesInput, setSpeciesInput] = useState({
    language: i18n.language,
    species: 1,
    text: getGen4Species(i18n.language)[0]?.name ?? "",
  });
  const [form, setForm] = useState(0);
  const [nature, setNature] = useState(-1);
  const [characteristic, setCharacteristic] = useState(-1);
  const [hiddenPower, setHiddenPower] = useState(-1);
  const [rows, setRows] = useState<CalculatorRow[]>([createRow(1)]);
  const [result, setResult] = useState<CalculatorResult>();
  const [error, setError] = useState("");
  const speciesOptions = useMemo(
    () => getGen4Species(i18n.language),
    [i18n.language],
  );
  const characteristics = useMemo(
    () => getGen4Characteristics(i18n.language),
    [i18n.language],
  );
  const formCount = getGen4FormCount(species);
  const baseStats = getGen4BaseStats(game, species, form);
  const displayedSpecies =
    speciesInput.language === i18n.language && speciesInput.species === species
      ? speciesInput.text
      : (speciesOptions.find((entry) => entry.id === species)?.name ?? "");

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
    const observations: Gen4StatObservation[] = [];
    for (const row of rows) {
      const level = Number(row.level);
      const stats = row.stats.map(Number) as Gen4StatValues;
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
    const ivs = calculateGen4IvRange(
      baseStats,
      observations,
      selectedNature,
      characteristic < 0 ? undefined : characteristic,
      hiddenPower < 0 ? undefined : hiddenPower,
    );
    setResult({
      ivs,
      nextLevels: calculateGen4NextLevels(
        baseStats,
        ivs,
        observations.at(-1)!.level,
        selectedNature,
      ),
    });
    setError("");
  };

  return (
    <FloatingToolPanel
      className="iv-calculator-display gen4-iv-calculator-display"
      closeLabel={t("collapse")}
      expanded={expanded}
      id="gen4-iv-calculator-panel"
      label={t("ivCalculator")}
      onExpandedChange={onExpandedChange}
      tone="teal"
      triggerId="gen4-iv-calculator-trigger"
    >
      {expanded && (
        <div className="iv-calculator-body">
          <div className="calculator-settings-grid">
            <label className="field">
              <span>{t("game")}</span>
              <select
                onChange={(event) => {
                  setGame(event.target.value as Gen4PersonalDataSet);
                  setResult(undefined);
                }}
                value={game}
              >
                <option value="platinum">Platinum</option>
                <option value="hgss">HeartGold / SoulSilver</option>
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
                  setResult(undefined);
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
                  onChange={(event) => {
                    setForm(Number(event.target.value));
                    setResult(undefined);
                  }}
                  value={form}
                >
                  {Array.from({ length: formCount }, (_, index) => (
                    <option key={index} value={index}>
                      {getGen4SpeciesName(i18n.language, species, index)}
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
            <label className="field">
              <span>{t("characteristic")}</span>
              <select
                onChange={(event) =>
                  setCharacteristic(Number(event.target.value))
                }
                value={characteristic}
              >
                <option value={-1}>{t("none")}</option>
                {characteristics.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
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
              onClick={() =>
                setRows((current) => [
                  ...current,
                  createRow(nextRowId.current++),
                ])
              }
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
                    <dd>{baseStats[index]}</dd>
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
                        ? (formatGen4IvCandidates(result.ivs[index]) ??
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
    </FloatingToolPanel>
  );
}
