import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { PokeBlocks6Editor } from "./PokeBlocks6Editor";
import { FoodCaseEditor } from "./FoodCaseEditor";
import {
  foodWords,
  pokeBlockWords,
  validateFood,
  type SaveFoodCatalog,
  type SaveFoodEdit,
  type FoodAction,
} from "./saveFood";

export function SaveFoodEditor({
  revision,
  busy,
  canEdit,
  lang,
  onRead,
  onApply,
}: {
  revision: number;
  busy: boolean;
  canEdit: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<SaveFoodCatalog | undefined>;
  onApply(edit: SaveFoodEdit): Promise<void>;
}) {
  const reader = useRef(onRead);
  const [mode, setMode] = useState<"food" | "blocks">("food");
  const [caseIndex, setCaseIndex] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [loaded, setLoaded] = useState<{
    revision: number;
    catalog: SaveFoodCatalog;
  }>();
  useEffect(() => {
    reader.current = onRead;
  }, [onRead]);
  useEffect(() => {
    let active = true;
    void reader.current().then((catalog) => {
      if (active && catalog) setLoaded({ revision, catalog });
    });
    return () => {
      active = false;
    };
  }, [revision]);
  const words = foodWords[lang];
  return (
    <section className="save-record-editor">
      <h3>{words.title}</h3>
      {loaded?.revision === revision ? (
        <>
          {loaded.catalog.blocks && (
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={busy || hasDraft}
                aria-pressed={mode === "food"}
                onClick={() => setMode("food")}
              >
                {words[loaded.catalog.kind]}
              </button>
              <button
                type="button"
                disabled={busy || hasDraft}
                aria-pressed={mode === "blocks"}
                onClick={() => setMode("blocks")}
              >
                {pokeBlockWords[lang].title}
              </button>
            </div>
          )}
          {loaded.catalog.case ? (
            <FoodCaseEditor
              key={revision}
              catalog={loaded.catalog.case}
              index={caseIndex}
              onIndex={setCaseIndex}
              disabled={busy || !canEdit}
              lang={lang}
              onApply={onApply}
              onDirty={setHasDraft}
            />
          ) : mode === "blocks" && loaded.catalog.blocks ? (
            <PokeBlocks6Editor
              key={revision}
              catalog={loaded.catalog.blocks}
              disabled={busy || !canEdit}
              lang={lang}
              onApply={onApply}
              onDirty={setHasDraft}
            />
          ) : (
            <FoodForm
              key={revision}
              catalog={loaded.catalog}
              disabled={busy || !canEdit}
              lang={lang}
              onApply={onApply}
              onDirty={setHasDraft}
            />
          )}
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void onRead().then((catalog) => {
              if (catalog) setLoaded({ revision, catalog });
            })
          }
        >
          {words.read}
        </button>
      )}
    </section>
  );
}

function FoodForm({
  catalog,
  disabled,
  lang,
  onApply,
  onDirty,
}: {
  catalog: SaveFoodCatalog;
  disabled: boolean;
  lang: "zh" | "en" | "ja";
  onApply(edit: SaveFoodEdit): Promise<void>;
  onDirty(value: boolean): void;
}) {
  const words = foodWords[lang];
  const [values, setValues] = useState(catalog.values.map(String));
  const [count, setCount] = useState(String(catalog.count ?? 0));
  const [slot, setSlot] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const puffs = catalog.kind === "puffs";
  const dirty =
    values.some((v, i) => v !== String(catalog.values[i])) ||
    (puffs && count !== String(catalog.count));
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const change = (index: number, value: string) =>
    setValues((old) => old.map((v, i) => (i === index ? value : v)));
  const apply = () => {
    setInvalid(false);
    let edit: SaveFoodEdit;
    try {
      edit = validateFood(catalog, values, count);
    } catch {
      setInvalid(true);
      return;
    }
    void onApply(edit);
  };
  const actions: Exclude<FoodAction, "edit">[] = puffs
    ? ["fill", "best", "reset", "sort", "reverse"]
    : ["fill", "clear"];
  return (
    <fieldset className="save-food-fields" disabled={disabled}>
      <legend>{words[catalog.kind]}</legend>
      {puffs ? (
        <div className="save-editor-fields">
          <label className="field">
            <span>{words.slot}</span>
            <Select
              value={slot}
              disabled={disabled}
              onChange={(e) => setSlot(Number(e.target.value))}
            >
              {values.map((v, i) => (
                <option key={i} value={i}>
                  {i + 1} ·{" "}
                  {catalog.names[Number(v)]?.[lang] ?? `${words.unknown} ${v}`}
                </option>
              ))}
            </Select>
          </label>
          <label className="field">
            <span>{words.value}</span>
            <Select
              value={values[slot]}
              disabled={disabled}
              onChange={(e) => change(slot, e.target.value)}
            >
              {!catalog.names[Number(values[slot])] && (
                <option value={values[slot]}>
                  {words.unknown} {values[slot]}
                </option>
              )}
              {catalog.names.map((n, i) => (
                <option key={i} value={i}>
                  {n[lang]}
                </option>
              ))}
            </Select>
          </label>
          <label className="field">
            <span>{words.count} · 0–100</span>
            <input
              value={count}
              inputMode="numeric"
              maxLength={11}
              onChange={(e) => setCount(e.target.value)}
            />
          </label>
        </div>
      ) : (
        <div className="save-editor-fields">
          {catalog.names.map((n, i) => (
            <label className="field" key={i}>
              <span>{n[lang]} · 0–255</span>
              <input
                value={values[i]}
                inputMode="numeric"
                maxLength={3}
                onChange={(e) => change(i, e.target.value)}
              />
            </label>
          ))}
        </div>
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
          {words.apply}
        </button>
        <button
          type="button"
          disabled={disabled || !dirty}
          onClick={() => {
            setValues(catalog.values.map(String));
            setCount(String(catalog.count ?? 0));
            setInvalid(false);
          }}
        >
          {words.discard}
        </button>
      </div>
      <div className="save-editor-toolbar">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            disabled={disabled || dirty}
            onClick={() => void onApply({ action })}
          >
            {words[action]}
          </button>
        ))}
      </div>
      <p className="save-editor-note">{words.note}</p>
      {puffs && <p className="save-editor-note">{words.puffNote}</p>}
    </fieldset>
  );
}
