import { useEffect, useState } from "react";
import { Select } from "../shared/Select";
import { foodWords, type SaveFoodEdit } from "./saveFood";
import {
  foodCaseWords,
  sortFoodCase,
  validateFoodCase,
  type FoodCaseCatalog,
  type FoodCaseEntry,
  type FoodCaseSort,
} from "./foodCases";

export function FoodCaseEditor({
  catalog,
  index,
  onIndex,
  lang,
  disabled,
  onApply,
  onDirty,
}: {
  catalog: FoodCaseCatalog;
  index: number;
  onIndex(index: number): void;
  lang: "zh" | "en" | "ja";
  disabled: boolean;
  onApply(edit: SaveFoodEdit): Promise<void>;
  onDirty(value: boolean): void;
}) {
  const words = foodCaseWords[lang];
  const [dirty, setDirty] = useState(false);
  const [sort, setSort] = useState<FoodCaseSort>("index");
  const [descending, setDescending] = useState(false);
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const entry =
    catalog.entries.find((e) => e.index === index) ?? catalog.entries[0];
  const labels: [FoodCaseSort, string][] = [
    ["index", words.slot],
    ["type", words.typeId],
    ["level", words.level],
    ...words.stats.map(
      (s, i) =>
        [
          `stat${i}` as FoodCaseSort,
          catalog.kind === "blocks3" && i === 5 ? words.feel : s,
        ] as [FoodCaseSort, string],
    ),
    ...(catalog.kind === "poffins8b"
      ? [["new", words.new] as [FoodCaseSort, string]]
      : []),
  ];
  const name = (type: number) =>
    catalog.types.find((t) => t.value === type)?.name[lang] ??
    `${words.unknown} ${type}`;
  return (
    <div className="save-record-editor">
      <div className="save-editor-fields">
        <label className="field">
          <span>{words.slot}</span>
          <Select
            value={entry.index}
            disabled={disabled || dirty}
            onChange={(e) => onIndex(Number(e.target.value))}
          >
            {sortFoodCase(catalog.entries, sort, descending).map((e) => (
              <option key={e.index} value={e.index}>
                {e.index + (catalog.kind === "poffins8b" ? 0 : 1)} ·{" "}
                {name(e.type)}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{words.sort}</span>
          <Select
            value={sort}
            disabled={disabled || dirty}
            onChange={(e) => setSort(e.target.value as FoodCaseSort)}
          >
            {labels.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <label className="save-food-toggle">
        <input
          type="checkbox"
          checked={descending}
          disabled={disabled || dirty}
          onChange={(e) => setDescending(e.target.checked)}
        />
        {words.descending}
      </label>
      <CaseEntryForm
        key={entry.index}
        catalog={catalog}
        entry={entry}
        lang={lang}
        disabled={disabled}
        onApply={onApply}
        onDirty={setDirty}
      />
    </div>
  );
}

function CaseEntryForm({
  catalog,
  entry,
  lang,
  disabled,
  onApply,
  onDirty,
}: {
  catalog: FoodCaseCatalog;
  entry: FoodCaseEntry;
  lang: "zh" | "en" | "ja";
  disabled: boolean;
  onApply(edit: SaveFoodEdit): Promise<void>;
  onDirty(value: boolean): void;
}) {
  const words = foodCaseWords[lang],
    common = foodWords[lang],
    bdsp = catalog.kind === "poffins8b";
  const [type, setType] = useState(String(entry.type)),
    [stats, setStats] = useState(entry.stats.map(String)),
    [level, setLevel] = useState(String(entry.level)),
    [isNew, setNew] = useState(entry.new ?? false),
    [invalid, setInvalid] = useState(false);
  const dirty =
    type !== String(entry.type) ||
    stats.some((s, i) => s !== String(entry.stats[i])) ||
    (bdsp && (level !== String(entry.level) || isNew !== entry.new));
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const apply = () => {
    setInvalid(false);
    let edit;
    try {
      edit = validateFoodCase(catalog, entry, type, stats, level, isNew);
    } catch {
      setInvalid(true);
      return;
    }
    void onApply({ action: "caseEdit", case: edit });
  };
  const derived = stats
    .slice(0, 5)
    .every((s) => /^\d{1,3}$/.test(s) && Number(s) <= 255)
    ? String(Math.max(...stats.slice(0, 5).map(Number)))
    : "—";
  const typeName = (value: number | null | undefined) =>
    catalog.types.find((t) => t.value === value)?.name[lang] ?? "—";
  return (
    <fieldset className="save-food-fields" disabled={disabled}>
      <legend>{words[catalog.kind]}</legend>
      <div className="save-editor-fields">
        <label className="field">
          <span>{catalog.kind === "blocks3" ? words.color : words.type}</span>
          <Select
            value={type}
            disabled={disabled}
            onChange={(e) => setType(e.target.value)}
          >
            {!catalog.types.some((t) => t.value === Number(type)) && (
              <option value={type}>
                {words.unknown} {type}
              </option>
            )}
            {catalog.types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.name[lang]}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>
            {words.level}
            {bdsp ? " · 0–255" : ""}
          </span>
          <input
            value={bdsp ? level : derived}
            readOnly={!bdsp}
            inputMode="numeric"
            maxLength={3}
            onChange={(e) => setLevel(e.target.value)}
          />
        </label>
        {words.stats.map((label, i) => (
          <label className="field" key={i}>
            <span>
              {catalog.kind === "blocks3" && i === 5 ? words.feel : label} ·
              0–255
            </span>
            <input
              inputMode="numeric"
              maxLength={3}
              value={stats[i]}
              onChange={(e) => {
                const value = e.target.value;
                setStats((old) => old.map((v, n) => (n === i ? value : v)));
              }}
            />
          </label>
        ))}
      </div>
      {bdsp ? (
        <label className="save-food-toggle">
          <input
            type="checkbox"
            checked={isNew}
            onChange={(e) => setNew(e.target.checked)}
          />
          {words.new}
        </label>
      ) : (
        <p className="save-editor-note">{words.derived}</p>
      )}
      {invalid && (
        <p className="save-editor-error" role="alert">
          {words.invalid}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          className="primary"
          disabled={disabled || !dirty}
          onClick={apply}
        >
          {common.apply}
        </button>
        <button
          type="button"
          disabled={disabled || !dirty}
          onClick={() => {
            setType(String(entry.type));
            setStats(entry.stats.map(String));
            setLevel(String(entry.level));
            setNew(entry.new ?? false);
            setInvalid(false);
          }}
        >
          {common.discard}
        </button>
        <button
          type="button"
          disabled={disabled || dirty}
          onClick={() => void onApply({ action: "caseFill" })}
        >
          {common.fill}
        </button>
        <button
          type="button"
          disabled={disabled || dirty}
          onClick={() => void onApply({ action: "caseClear" })}
        >
          {common.clear}
        </button>
        {bdsp && (
          <button
            type="button"
            disabled={disabled || dirty}
            onClick={() => void onApply({ action: "caseSort" })}
          >
            {words.organize}
          </button>
        )}
      </div>
      <p className="save-editor-note">{common.note}</p>
      {bdsp && (
        <>
          <p className="save-editor-note">{words.order}</p>
          <p className="save-editor-note">{words.fill8}</p>
        </>
      )}
      {catalog.kind === "poffins4" && (
        <details className="save-pokemon-editor">
          <summary>{words.saved}</summary>
          <dl className="save-editor-summary">
            <dt>{words.primary}</dt>
            <dd>{typeName(entry.primary)}</dd>
            <dt>{words.secondary}</dt>
            <dd>{typeName(entry.secondary)}</dd>
            <dt>{words.many}</dt>
            <dd>{entry.many ? words.yes : words.no}</dd>
          </dl>
        </details>
      )}
    </fieldset>
  );
}
