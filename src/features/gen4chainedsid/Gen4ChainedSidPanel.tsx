import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput } from "../../input";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import {
  getGen4ChainedSidAbilities,
  getGen4ChainedSidAbilityIds,
  getGen4ChainedSidGenderRatio,
  getGen4ChainedSidGenders,
  getGen4ChainedSidSpecies,
} from "./data";
import {
  GEN4_CHAINED_SID_INITIAL_RESULTS,
  GEN4_CHAINED_SID_STAT_MAXIMUMS,
  validateGen4ChainedSidRequest,
  type Gen4ChainedSidEntry,
  type Gen4ChainedSidIvs,
} from "./domain";
import { Gen4ChainedSidUiPreviewEngine } from "./preview/Gen4ChainedSidUiPreviewEngine";
import type { Gen4ChainedSidSummary } from "./search";
import { Gen4ChainedSidWorker } from "./worker/Gen4ChainedSidWorker";
import "./Gen4ChainedSidPanel.css";

interface Gen4ChainedSidPanelProps {
  uiPreviewMode: boolean;
}

interface ObservationRow {
  entry: Gen4ChainedSidEntry;
  species: number;
}

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
const statLabels = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;
const chineseStatLabels = ["HP", "攻击", "防御", "特攻", "特防", "速度"];

function labels(language: string) {
  if (language.startsWith("zh"))
    return {
      title: "连锁异色查询SID",
      pokemon: "宝可梦",
      ability: "特性",
      gender: "性别",
      nature: "性格",
      tid: "TID",
      ivs: "个体",
      calculate: "推算",
      clear: "清空",
      possible: "可能的结果:",
      stats: chineseStatLabels,
    };
  return {
    title: "Chained Shiny to SID",
    pokemon: "Pokemon",
    ability: "Ability",
    gender: "Gender",
    nature: "Nature",
    tid: "TID",
    ivs: "IVs",
    calculate: "Calculate",
    clear: "Clear",
    possible: "Possible Results:",
    stats: statLabels,
  };
}

function parseDecimal(value: string) {
  return value === "" ? 0 : Number(value);
}

export function Gen4ChainedSidPanel({
  uiPreviewMode,
}: Gen4ChainedSidPanelProps) {
  const { t, i18n } = useTranslation();
  const copy = labels(i18n.language);
  const engine = useMemo(
    () =>
      uiPreviewMode
        ? new Gen4ChainedSidUiPreviewEngine()
        : new Gen4ChainedSidWorker(),
    [uiPreviewMode],
  );
  const speciesOptions = useMemo(
    () => getGen4ChainedSidSpecies(i18n.language),
    [i18n.language],
  );
  const [species, setSpecies] = useState(1);
  const [speciesInput, setSpeciesInput] = useState({
    language: i18n.language,
    species: 1,
    text: speciesOptions[0]?.name ?? "",
  });
  const [ability, setAbility] = useState(
    () => getGen4ChainedSidAbilityIds(1)[0] ?? 0,
  );
  const [gender, setGender] = useState(0);
  const [nature, setNature] = useState(0);
  const [tid, setTid] = useState("");
  const [ivs, setIvs] = useState<
    [string, string, string, string, string, string]
  >(["0", "0", "0", "0", "0", "0"]);
  const [rows, setRows] = useState<ObservationRow[]>([]);
  const [candidates, setCandidates] = useState<number[]>(
    Array.from(
      { length: GEN4_CHAINED_SID_INITIAL_RESULTS },
      (_, index) => index * 8,
    ),
  );
  const [summary, setSummary] = useState<Gen4ChainedSidSummary>();
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "cancelled" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const runVersion = useRef(0);

  const genderRatio = getGen4ChainedSidGenderRatio(species);
  const abilities = getGen4ChainedSidAbilities(i18n.language, species);
  const [ability0, ability1] = getGen4ChainedSidAbilityIds(species);
  const genders = getGen4ChainedSidGenders(genderRatio);
  const displayedSpecies =
    speciesInput.language === i18n.language && speciesInput.species === species
      ? speciesInput.text
      : (speciesOptions.find((entry) => entry.id === species)?.name ?? "");

  useEffect(() => () => engine.dispose(), [engine]);

  const updateSpecies = (nextSpecies: number) => {
    const nextAbilities = getGen4ChainedSidAbilities(
      i18n.language,
      nextSpecies,
    );
    const nextGenders = getGen4ChainedSidGenders(
      getGen4ChainedSidGenderRatio(nextSpecies),
    );
    setSpecies(nextSpecies);
    setAbility(nextAbilities[0]?.id ?? 0);
    setGender(nextGenders[0] ?? 0);
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const entry: Gen4ChainedSidEntry = {
      ivs: ivs.map(parseDecimal) as Gen4ChainedSidIvs,
      ability,
      gender,
      nature,
      ability0,
      ability1,
      genderRatio,
    };
    const nextRows = [...rows, { entry, species }];
    const nextEntries = nextRows.map((row) => row.entry);
    const request = { tid: parseDecimal(tid), entries: nextEntries };
    if (validateGen4ChainedSidRequest(request).length > 0) {
      setError(t("invalidGen4ChainedSidInput"));
      setStatus("failed");
      return;
    }
    setStatus("calculating");
    setError("");
    setSummary(undefined);
    const version = ++runVersion.current;
    try {
      const nextSummary = await engine.calculate(request);
      if (version !== runVersion.current) return;
      if (nextSummary.cancelled) {
        setStatus("cancelled");
        return;
      }
      setRows(nextRows);
      setCandidates(nextSummary.candidates);
      setSummary(nextSummary);
      setIvs(["0", "0", "0", "0", "0", "0"]);
      setNature(0);
      setAbility(abilities[0]?.id ?? 0);
      setGender(genders[0] ?? 0);
      setStatus("completed");
    } catch (cause) {
      if (version !== runVersion.current) return;
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const clear = () => {
    runVersion.current++;
    engine.cancel();
    setRows([]);
    setCandidates(
      Array.from(
        { length: GEN4_CHAINED_SID_INITIAL_RESULTS },
        (_, index) => index * 8,
      ),
    );
    setSummary(undefined);
    setStatus("ready");
    setError("");
  };

  return (
    <div className="gen4-chained-sid-workspace">
      <form className="panel gen4-chained-sid-panel" onSubmit={run}>
        <div className="panel-heading compact">
          <h2>{copy.title}</h2>
          <span className="panel-note">PokeFinder / ChainedSID</span>
        </div>
        <div className="gen4-chained-sid-settings">
          <label className="field">
            <span>{copy.pokemon}</span>
            <AutoCompleteComboBox
              inputValue={displayedSpecies}
              label={copy.pokemon}
              onInputChange={(text) =>
                setSpeciesInput({ language: i18n.language, species, text })
              }
              onValueChange={updateSpecies}
              options={speciesOptions.map((entry) => ({
                label: entry.name,
                value: entry.id,
              }))}
              value={species}
            />
          </label>
          <label className="field">
            <span>{copy.ability}</span>
            <select
              onChange={(event) => setAbility(Number(event.target.value))}
              value={ability}
            >
              {abilities.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{copy.gender}</span>
            <select
              onChange={(event) => setGender(Number(event.target.value))}
              value={gender}
            >
              {genders.map((value) => (
                <option key={value} value={value}>
                  {value === 0 ? "♂" : value === 1 ? "♀" : "-"}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{copy.nature}</span>
            <select
              onChange={(event) => setNature(Number(event.target.value))}
              value={nature}
            >
              {natureKeys.map((key, index) => (
                <option key={key} value={index}>
                  {t(key)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{copy.tid}</span>
            <input
              disabled={rows.length > 0}
              inputMode="numeric"
              maxLength={5}
              onChange={(event) =>
                setTid(normalizeDecimalInput(event.target.value, 0xffff, 5))
              }
              value={tid}
            />
          </label>
        </div>
        <div aria-label={copy.ivs} className="gen4-chained-sid-ivs">
          {ivs.map((value, index) => (
            <label className="field" key={statLabels[index]}>
              <span>{copy.stats[index]}</span>
              <input
                aria-label={String(copy.stats[index])}
                inputMode="numeric"
                max={GEN4_CHAINED_SID_STAT_MAXIMUMS[index]}
                min="0"
                onChange={(event) => {
                  const next = [...ivs] as typeof ivs;
                  next[index] = normalizeDecimalInput(
                    event.target.value,
                    GEN4_CHAINED_SID_STAT_MAXIMUMS[index],
                    3,
                  );
                  setIvs(next);
                }}
                type="number"
                value={value}
              />
            </label>
          ))}
        </div>
        <div className="panel-actions">
          <button
            className="primary-action"
            disabled={status === "calculating"}
            type="submit"
          >
            {copy.calculate}
          </button>
          <button className="secondary-action" onClick={clear} type="button">
            {copy.clear}
          </button>
        </div>
        <div aria-live="polite" className="gen4-chained-sid-result">
          <span>{candidates.length === 1 ? "SID Found:" : copy.possible}</span>
          <strong>
            {candidates.length === 1 ? candidates[0] : candidates.length}
          </strong>
        </div>
        {summary && (
          <div className="metrics-row">
            <span>
              {t("elapsed")} <strong>{summary.elapsedMs.toFixed(0)} ms</strong>
            </span>
          </div>
        )}
        {error && <div className="alert error">{error}</div>}
      </form>

      <section className="panel results-panel gen4-chained-sid-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <h2>{copy.ivs}</h2>
          </div>
          <span className="result-count">{rows.length}</span>
        </div>
        <div className="table-shell gen4-chained-sid-table-shell">
          {rows.length === 0 ? (
            <div className="empty-state compact" />
          ) : (
            <table className="gen4-chained-sid-table">
              <thead>
                <tr>
                  <th>{copy.ivs}</th>
                  <th>{copy.ability}</th>
                  <th>{copy.gender}</th>
                  <th>{copy.nature}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ entry, species: rowSpecies }, index) => (
                  <tr key={`${entry.ivs.join("-")}-${index}`}>
                    <td>{entry.ivs.join(".")}</td>
                    <td>
                      {getGen4ChainedSidAbilities(
                        i18n.language,
                        rowSpecies,
                      ).find((option) => option.id === entry.ability)?.name ??
                        entry.ability}
                    </td>
                    <td>
                      {entry.gender === 0
                        ? "♂"
                        : entry.gender === 1
                          ? "♀"
                          : "-"}
                    </td>
                    <td>{t(natureKeys[entry.nature])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
