import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import {
  roamerDraft,
  roamerWords,
  validateRoamer,
  type RoamerCatalog,
  type RoamerEdit,
} from "./roamer";
export function RoamerEditor({
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
  onRead(): Promise<RoamerCatalog | undefined>;
  onApply(edit: RoamerEdit): Promise<void>;
}) {
  const reader = useRef(onRead);
  const [loaded, setLoaded] = useState<{
    revision: number;
    catalog: RoamerCatalog;
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
      <h3>{roamerWords[lang].title}</h3>
      {loaded?.revision === revision ? (
        <RoamerForm
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
          {roamerWords[lang].read}
        </button>
      )}
    </section>
  );
}

function RoamerForm({
  catalog,
  disabled,
  lang,
  onApply,
}: {
  catalog: RoamerCatalog;
  disabled: boolean;
  lang: "zh" | "en" | "ja";
  onApply(edit: RoamerEdit): Promise<void>;
}) {
  const w = roamerWords[lang];
  const [draft, setDraft] = useState(() => roamerDraft(catalog));
  const [invalid, setInvalid] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(roamerDraft(catalog));
  const apply = () => {
    let edit;
    try {
      edit = validateRoamer(catalog, draft);
    } catch {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void onApply(edit);
  };
  return (
    <fieldset className="save-food-fields" disabled={disabled}>
      <legend>{w.title}</legend>
      <div className="save-editor-fields">
        <label className="field">
          <span>{w.species}</span>
          <Select
            value={draft.species}
            disabled={disabled}
            onChange={(e) =>
              setDraft({ ...draft, species: Number(e.target.value) })
            }
          >
            {![144, 145, 146].includes(catalog.species) && (
              <option value={catalog.species}>
                {catalog.species === 0
                  ? w.unset
                  : `${w.unknown}: ${catalog.species}`}
              </option>
            )}
            {w.names.map((name, i) => (
              <option key={i} value={144 + i}>
                {name}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{w.state}</span>
          <Select
            value={draft.state}
            disabled={disabled}
            onChange={(e) =>
              setDraft({ ...draft, state: Number(e.target.value) })
            }
          >
            {catalog.state > 4 && (
              <option value={catalog.state}>
                {w.unknown}: {catalog.state}
              </option>
            )}
            {w.states.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{w.count} · 0–11</span>
          <input
            inputMode="numeric"
            maxLength={10}
            value={draft.encounters}
            onChange={(e) => setDraft({ ...draft, encounters: e.target.value })}
          />
        </label>
      </div>
      {catalog.suggestedSpecies !== null && (
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            setDraft({ ...draft, species: catalog.suggestedSpecies! })
          }
        >
          {w.suggest} · {w.names[catalog.suggestedSpecies - 144]}
        </button>
      )}
      {invalid && (
        <p className="save-editor-error" role="alert">
          {w.invalid}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          className="primary"
          disabled={disabled || !dirty}
          onClick={apply}
        >
          {w.apply}
        </button>
        <button
          type="button"
          disabled={disabled || !dirty}
          onClick={() => {
            setDraft(roamerDraft(catalog));
            setInvalid(false);
          }}
        >
          {w.discard}
        </button>
      </div>
      <p className="save-editor-note">{w.note}</p>
    </fieldset>
  );
}
