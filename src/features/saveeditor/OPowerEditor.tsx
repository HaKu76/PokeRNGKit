import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import {
  opowerDraft,
  opowerWords,
  validateOPowers,
  type OPowerCatalog,
  type OPowerEdit,
  type OPowerDraft,
} from "./opowers";
import { opowerNames } from "./opowerNames";
export function OPowerEditor({
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
  onRead(): Promise<OPowerCatalog | undefined>;
  onApply(edit: OPowerEdit): Promise<void>;
}) {
  const reader = useRef(onRead);
  const [loaded, setLoaded] = useState<{
    revision: number;
    catalog: OPowerCatalog;
  }>();
  useEffect(() => {
    reader.current = onRead;
  }, [onRead]);
  useEffect(() => {
    let active = true;
    void reader.current().then((c) => {
      if (active && c) setLoaded({ revision, catalog: c });
    });
    return () => {
      active = false;
    };
  }, [revision]);
  return (
    <section className="save-record-editor">
      <h3>{opowerWords[lang].title}</h3>
      {loaded?.revision === revision ? (
        <OPowerForm
          key={revision}
          catalog={loaded.catalog}
          disabled={busy || !canEdit}
          lang={lang}
          onApply={onApply}
        />
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void onRead().then((c) => {
              if (c) setLoaded({ revision, catalog: c });
            })
          }
        >
          {opowerWords[lang].read}
        </button>
      )}
    </section>
  );
}
function OPowerForm({
  catalog,
  disabled,
  lang,
  onApply,
}: {
  catalog: OPowerCatalog;
  disabled: boolean;
  lang: "zh" | "en" | "ja";
  onApply(edit: OPowerEdit): Promise<void>;
}) {
  const words = opowerWords[lang];
  const [draft, setDraft] = useState(() => opowerDraft(catalog));
  const [invalid, setInvalid] = useState(false);
  const [state, setState] = useState(0),
    [field, setField] = useState(0),
    [battle, setBattle] = useState(0);
  const dirty = JSON.stringify(draft) !== JSON.stringify(opowerDraft(catalog));
  const label = (group: string, key: string) =>
    opowerNames[group + "." + key]?.[lang] ?? key;
  const apply = () => {
    let edit;
    try {
      edit = validateOPowers(draft);
    } catch {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void onApply(edit);
  };
  const change = (
    key: "field1" | "field2" | "battle1" | "battle2",
    index: number,
    value: string,
  ) =>
    setDraft((old) => ({
      ...old,
      [key]: old[key].map((v, i) => (i === index ? value : v)),
    }));
  return (
    <fieldset className="save-food-fields" disabled={disabled}>
      <legend>{words.title}</legend>
      <div className="save-editor-fields">
        <label className="field">
          <span>{words.points} · 0–255</span>
          <input
            inputMode="numeric"
            maxLength={3}
            value={draft.points}
            onChange={(e) => setDraft({ ...draft, points: e.target.value })}
          />
        </label>
        <label className="field">
          <span>{words.state}</span>
          <Select
            value={state}
            disabled={disabled}
            onChange={(e) => setState(Number(e.target.value))}
          >
            {catalog.stateKeys.map((key, i) => (
              <option key={key} value={i}>
                {label("OPower6Index", key)}
                {draft.states[i] ? " ✓" : ""}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <label className="save-food-toggle">
        <input
          type="checkbox"
          checked={draft.states[state]}
          onChange={(e) => {
            const value = e.target.checked;
            setDraft((old) => ({
              ...old,
              states: old.states.map((v, i) => (i === state ? value : v)),
            }));
          }}
        />
        {words.unlocked}
      </label>
      {catalog.states[state] > 1 && (
        <p className="save-editor-note">
          {words.unknown}: {catalog.states[state]} · {words.preserve}
        </p>
      )}
      {(["field", "battle"] as const).map((group) => {
        const index = group === "field" ? field : battle;
        const keys = group === "field" ? catalog.fieldKeys : catalog.battleKeys;
        const enumName =
          group === "field" ? "OPower6FieldType" : "OPower6BattleType";
        return (
          <div className="save-editor-fields" key={group}>
            <label className="field">
              <span>{words[group]}</span>
              <Select
                value={index}
                disabled={disabled}
                onChange={(e) =>
                  (group === "field" ? setField : setBattle)(
                    Number(e.target.value),
                  )
                }
              >
                {keys.map((key, i) => (
                  <option key={key} value={i}>
                    {label(enumName, key)}
                  </option>
                ))}
              </Select>
            </label>
            {([1, 2] as const).map((n) => {
              const key = (group + n) as keyof Pick<
                OPowerDraft,
                "field1" | "field2" | "battle1" | "battle2"
              >;
              return (
                <label className="field" key={n}>
                  <span>{n === 1 ? words.first : words.second} · 0–255</span>
                  <input
                    inputMode="numeric"
                    maxLength={3}
                    value={draft[key][index]}
                    onChange={(e) => change(key, index, e.target.value)}
                  />
                </label>
              );
            })}
          </div>
        );
      })}
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
            setDraft(opowerDraft(catalog));
            setInvalid(false);
          }}
        >
          {words.discard}
        </button>
        <button
          type="button"
          disabled={disabled || dirty}
          onClick={() => void onApply({ action: "unlock" })}
        >
          {words.unlock}
        </button>
        <button
          type="button"
          disabled={disabled || dirty}
          onClick={() => void onApply({ action: "clear" })}
        >
          {words.clear}
        </button>
      </div>
      <p className="save-editor-note">{words.note}</p>
    </fieldset>
  );
}
