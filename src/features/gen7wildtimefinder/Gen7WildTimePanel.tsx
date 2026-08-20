import { useVirtualizer } from "@tanstack/react-virtual";
import { Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  isThreeDsGen7Profile,
  type ThreeDsProfile,
} from "../3dsprofiles/domain";
import {
  AutoCompleteComboBox,
  type AutoCompleteOption,
} from "../shared/AutoCompleteComboBox";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import {
  epochFromInput,
  formatEpoch,
  type Gen7WildTimeRequest,
  type Gen7WildTimeResult,
  type Gen7WildTimeVersion,
  validateGen7WildTimeRequest,
} from "./timeDomain";
import { Gen7WildTimeWorker } from "./worker/Gen7WildTimeWorker";
import type { Gen7WildTimeEngine } from "./timeSearch";
import "./Gen7WildTimePanel.css";

const NATURES = [
  "Hardy",
  "Lonely",
  "Brave",
  "Adamant",
  "Naughty",
  "Bold",
  "Docile",
  "Relaxed",
  "Impish",
  "Lax",
  "Timid",
  "Hasty",
  "Serious",
  "Jolly",
  "Naive",
  "Modest",
  "Mild",
  "Quiet",
  "Bashful",
  "Rash",
  "Calm",
  "Gentle",
  "Sassy",
  "Careful",
  "Quirky",
] as const;
const HIDDEN_POWERS = [
  "Fighting",
  "Flying",
  "Poison",
  "Ground",
  "Rock",
  "Bug",
  "Ghost",
  "Steel",
  "Fire",
  "Water",
  "Grass",
  "Electric",
  "Psychic",
  "Ice",
  "Dragon",
  "Dark",
] as const;
const IV_NAMES = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
type IvText = [string, string, string, string, string, string];

function CandidateSelect<T extends string | number>({
  disabled,
  label,
  onValueChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onValueChange(value: T): void;
  options: readonly AutoCompleteOption<T>[];
  value: T;
}) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? "";
  const [inputValue, setInputValue] = useState(selectedLabel);
  return (
    <AutoCompleteComboBox
      disabled={disabled}
      inputValue={inputValue}
      label={label}
      onInputChange={setInputValue}
      onValueChange={(nextValue) => {
        onValueChange(nextValue);
        setInputValue(
          options.find((option) => option.value === nextValue)?.label ?? "",
        );
      }}
      options={options}
      value={value}
    />
  );
}

export function Gen7WildTimePanel({
  profile,
}: {
  profile?: ThreeDsProfile;
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen7WildTimeEngine>(
    () => new Gen7WildTimeWorker(),
    [],
  );
  const [version, setVersion] = useState<Gen7WildTimeVersion>(() =>
    isThreeDsGen7Profile(profile) ? profile.version : "ultra-sun",
  );
  const [start, setStart] = useState("2024-01-01T00:00:00");
  const [end, setEnd] = useState("2024-01-01T00:00:01");
  const [tick, setTick] = useState("041D9CB9");
  const [offset, setOffset] = useState("55");
  const [minFrame, setMinFrame] = useState("478");
  const [maxFrame, setMaxFrame] = useState("10000");
  const [encounter, setEncounter] = useState<"grass" | "fish">("grass");
  const [sync, setSync] = useState(false);
  const [syncNature, setSyncNature] = useState("0");
  const [ratio, setRatio] = useState("255");
  const [tid, setTid] = useState(() =>
    isThreeDsGen7Profile(profile)
      ? String((profile.tsv << 4) | profile.trv)
      : "0",
  );
  const [sid, setSid] = useState("0");
  const [charm, setCharm] = useState(false);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shinyFilter, setShinyFilter] = useState<"any" | "shiny" | "square">(
    "any",
  );
  const [genderFilter, setGenderFilter] = useState<"any" | "male" | "female">(
    "any",
  );
  const [abilityFilter, setAbilityFilter] = useState<
    "any" | "first" | "second" | "hidden"
  >("any");
  const [natureMask, setNatureMask] = useState(ALL_NATURES);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(ALL_HIDDEN_POWERS);
  const [slotMask, setSlotMask] = useState(0);
  const [ivMin, setIvMin] = useState<IvText>(["0", "0", "0", "0", "0", "0"]);
  const [ivMax, setIvMax] = useState<IvText>([
    "31",
    "31",
    "31",
    "31",
    "31",
    "31",
  ]);
  const [results, setResults] = useState<Gen7WildTimeResult[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | undefined>(undefined);
  const tableRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });
  useEffect(() => () => engine.dispose(), [engine]);
  useEffect(() => {
    if (!isThreeDsGen7Profile(profile)) return;
    setVersion(profile.version);
    setTick(
      (profile.timeTick ?? 0x041d_9cb9)
        .toString(16)
        .toUpperCase()
        .padStart(8, "0"),
    );
    setOffset(String(profile.timeOffset ?? 55));
    setTid(String((profile.tsv << 4) | profile.trv));
    setCharm(profile.shinyCharm);
  }, [engine, profile]);
  const setIv = (setter: typeof setIvMin, index: number, value: string) =>
    setter(
      (current) =>
        current.map((entry, itemIndex) =>
          itemIndex === index ? value : entry,
        ) as IvText,
    );
  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (running) return;
    const parsedOffset = Number(offset || 0);
    const startEpoch = epochFromInput(start, parsedOffset);
    const endEpoch = epochFromInput(end, parsedOffset);
    if (typeof startEpoch !== "bigint" || typeof endEpoch !== "bigint") {
      setError("Invalid date.");
      return;
    }
    const request: Gen7WildTimeRequest = {
      version: version as Gen7WildTimeRequest["version"],
      startEpoch,
      endEpoch,
      tick: Number.parseInt(tick || "0", 16),
      offset: parsedOffset,
      minFrame: Number(minFrame || 0),
      maxFrame: Number(maxFrame || 0),
      encounter,
      synchronize: sync,
      synchronizeNature: Number(syncNature || 0),
      genderRatio: Number(ratio),
      tid: Number(tid || 0),
      sid: Number(sid || 0),
      shinyCharm: charm,
      filters: {
        disabled: filtersDisabled,
        shiny: shinyFilter,
        gender: genderFilter,
        ability: abilityFilter,
        natureMask,
        hiddenPowerMask,
        slotMask,
        ivMin: ivMin.map(Number) as Gen7WildTimeRequest["filters"]["ivMin"],
        ivMax: ivMax.map(Number) as Gen7WildTimeRequest["filters"]["ivMax"],
      },
      resultLimit: 100_000,
    };
    try {
      validateGen7WildTimeRequest(request);
      setError("");
      setResults([]);
      setRunning(true);
      const controller = new AbortController();
      abortRef.current = controller;
      await engine.search(request, {
        signal: controller.signal,
        onBatch: (batch) => setResults((current) => current.concat(batch)),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRunning(false);
      abortRef.current = undefined;
    }
  };
  return (
    <section className="panel gen7-wild-time-panel">
      <form onSubmit={run}>
        <div className="form-grid">
          <label className="field">
            <span>{t("gen7GameVersion")}</span>
            <CandidateSelect
              disabled={running}
              label={t("gen7GameVersion")}
              onValueChange={(value) =>
                setVersion(value as Gen7WildTimeVersion)
              }
              options={[
                { value: "sun", label: "Sun" },
                { value: "moon", label: "Moon" },
                { value: "ultra-sun", label: "Ultra Sun" },
                { value: "ultra-moon", label: "Ultra Moon" },
              ]}
              value={version}
            />
          </label>
          <label className="field">
            <span>{t("gen7TimeStart")}</span>
            <input
              disabled={running}
              type="datetime-local"
              step="1"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("gen7TimeEnd")}</span>
            <input
              disabled={running}
              type="datetime-local"
              step="1"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("gen7TimeTick")}</span>
            <input
              disabled={running}
              value={tick}
              onChange={(event) =>
                setTick(normalizeHexInput(event.target.value, 8))
              }
            />
          </label>
          <label className="field">
            <span>{t("gen7TimeOffset")}</span>
            <input
              disabled={running}
              value={offset}
              onChange={(event) =>
                setOffset(
                  normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                )
              }
            />
          </label>
          <label className="field">
            <span>{t("gen7StationaryMinFrame")}</span>
            <input
              disabled={running}
              min="1"
              value={minFrame}
              onChange={(event) => setMinFrame(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("gen7StationaryMaxFrame")}</span>
            <input
              disabled={running}
              value={maxFrame}
              onChange={(event) => setMaxFrame(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Encounter</span>
            <CandidateSelect
              disabled={running}
              label={t("gen7WildEncounter")}
              onValueChange={(value) => setEncounter(value as "grass" | "fish")}
              options={[
                { value: "grass", label: "Grass" },
                { value: "fish", label: "Fish" },
              ]}
              value={encounter}
            />
          </label>
          <label className="field">
            <span>Gender Ratio</span>
            <CandidateSelect
              disabled={running}
              label={t("gen7WildGenderRatio")}
              onValueChange={(value) => setRatio(String(value))}
              options={[
                { value: 255, label: "Genderless" },
                { value: 127, label: "♂7 : ♀1" },
                { value: 191, label: "♂3 : ♀1" },
                { value: 63, label: "♂1 : ♀3" },
                { value: 31, label: "♂1 : ♀7" },
                { value: 0, label: "♂ Only" },
                { value: 254, label: "♀ Only" },
              ]}
              value={Number(ratio)}
            />
          </label>
          <label className="checkbox-field">
            <input
              checked={sync}
              disabled={running}
              type="checkbox"
              onChange={(event) => setSync(event.target.checked)}
            />
            <span>{t("gen7StationarySync")}</span>
          </label>
          <label className="field">
            <span>{t("gen7StationarySyncNature")}</span>
            <CandidateSelect
              disabled={running || !sync}
              label={t("gen7StationarySyncNature")}
              onValueChange={(value) => setSyncNature(String(value))}
              options={NATURES.map((label, value) => ({ label, value }))}
              value={Number(syncNature)}
            />
          </label>
          <label className="field">
            <span>TID</span>
            <input
              disabled={running}
              max={65535}
              value={tid}
              onChange={(event) =>
                setTid(normalizeDecimalInput(event.target.value, 65535, 5))
              }
            />
          </label>
          <label className="field">
            <span>SID</span>
            <input
              disabled={running}
              max={65535}
              value={sid}
              onChange={(event) =>
                setSid(normalizeDecimalInput(event.target.value, 65535, 5))
              }
            />
          </label>
          <label className="checkbox-field">
            <input
              checked={charm}
              disabled={running}
              type="checkbox"
              onChange={(event) => setCharm(event.target.checked)}
            />
            <span>{t("gen7StationaryShinyCharm")}</span>
          </label>
        </div>
        <fieldset
          className="wild-time-filters"
          disabled={running || filtersDisabled}
        >
          <legend>{t("filters")}</legend>
          <div className="form-grid">
            <label className="field">
              <span>{t("shiny")}</span>
              <CandidateSelect
                label={t("shiny")}
                onValueChange={(value) =>
                  setShinyFilter(value as "any" | "shiny" | "square")
                }
                options={[
                  { value: "any", label: t("any") },
                  { value: "shiny", label: t("shinyAny") },
                  { value: "square", label: t("shinySquare") },
                ]}
                value={shinyFilter}
              />
            </label>
            <label className="field">
              <span>{t("gender")}</span>
              <CandidateSelect
                label={t("gender")}
                onValueChange={(value) =>
                  setGenderFilter(value as "any" | "male" | "female")
                }
                options={[
                  { value: "any", label: t("any") },
                  { value: "male", label: t("male") },
                  { value: "female", label: t("female") },
                ]}
                value={genderFilter}
              />
            </label>
            <label className="field">
              <span>{t("ability")}</span>
              <CandidateSelect
                label={t("ability")}
                onValueChange={(value) =>
                  setAbilityFilter(
                    value as "any" | "first" | "second" | "hidden",
                  )
                }
                options={[
                  { value: "any", label: t("any") },
                  { value: "first", label: t("abilityFirst") },
                  { value: "second", label: t("abilitySecond") },
                  { value: "hidden", label: t("gen7StationaryHiddenAbility") },
                ]}
                value={abilityFilter}
              />
            </label>
            <MultiCheckSelect
              anyLabel={t("any")}
              label={t("nature")}
              mask={natureMask}
              onChange={setNatureMask}
              options={NATURES.map((label, value) => ({ label, value }))}
              resetHint={t("checkListResetHint")}
            />
            <MultiCheckSelect
              anyLabel={t("any")}
              label={t("hiddenPower")}
              mask={hiddenPowerMask}
              onChange={setHiddenPowerMask}
              options={HIDDEN_POWERS.map((label, value) => ({ label, value }))}
              resetHint={t("checkListResetHint")}
            />
            <MultiCheckSelect
              anyLabel={t("any")}
              label={t("gen7WildEncounterSlot")}
              mask={slotMask}
              onChange={setSlotMask}
              options={Array.from({ length: 10 }, (_, value) => ({
                label: String(value + 1),
                value,
              }))}
              resetHint={t("checkListResetHint")}
            />
          </div>
          <div className="wild-time-iv-grid">
            <div>
              <span>{t("ivs")}</span>
              <span>{t("minimum")}</span>
              <span>{t("maximum")}</span>
            </div>
            {IV_NAMES.map((name, index) => (
              <div key={name}>
                <span>{name}</span>
                <input
                  max={31}
                  value={ivMin[index]}
                  onChange={(event) =>
                    setIv(
                      setIvMin,
                      index,
                      normalizeDecimalInput(event.target.value, 31, 2),
                    )
                  }
                />
                <input
                  max={31}
                  value={ivMax[index]}
                  onChange={(event) =>
                    setIv(
                      setIvMax,
                      index,
                      normalizeDecimalInput(event.target.value, 31, 2),
                    )
                  }
                />
              </div>
            ))}
          </div>
        </fieldset>
        <label className="checkbox-field">
          <input
            checked={filtersDisabled}
            disabled={running}
            type="checkbox"
            onChange={(event) => setFiltersDisabled(event.target.checked)}
          />
          <span>{t("disableFilters")}</span>
        </label>
        <div className="button-row">
          <button className="primary-button" disabled={running} type="submit">
            <Play size={17} />
            {t("search")}
          </button>
          <button
            className="secondary-button"
            disabled={!running}
            type="button"
            onClick={() => abortRef.current?.abort()}
          >
            <Square size={16} />
            {t("cancel")}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setResults([])}
          >
            <Trash2 size={16} />
            {t("clear")}
          </button>
        </div>
      </form>
      {error && <p className="error-text">{error}</p>}
      <div className="results-table-wrap" ref={tableRef}>
        <table>
          <thead>
            <tr>
              <th>{t("gen7TimeDate")}</th>
              <th>{t("gen7TimeInitialSeed")}</th>
              <th>{t("gen7StationaryFrame")}</th>
              <th>Slot</th>
              <th>PID</th>
              <th>EC</th>
              <th>IVs</th>
              <th>{t("nature")}</th>
            </tr>
          </thead>
          <tbody
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const result = results[item.index];
              return (
                <tr
                  key={`${result.epoch}-${result.frame}`}
                  style={{
                    height: `${item.size}px`,
                    position: "absolute",
                    top: 0,
                    transform: `translateY(${item.start}px)`,
                    width: "100%",
                  }}
                >
                  <td>{formatEpoch(result.epoch, Number(offset || 0))}</td>
                  <td>
                    {result.initialSeed
                      .toString(16)
                      .toUpperCase()
                      .padStart(8, "0")}
                  </td>
                  <td>{result.frame}</td>
                  <td>{result.slot}</td>
                  <td>
                    {result.pid.toString(16).toUpperCase().padStart(8, "0")}
                  </td>
                  <td>
                    {result.ec.toString(16).toUpperCase().padStart(8, "0")}
                  </td>
                  <td>{result.ivs.join("/")}</td>
                  <td>{result.nature}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!results.length && !running && (
        <p className="empty-state">{t("emptyGen7Wild")}</p>
      )}
    </section>
  );
}
