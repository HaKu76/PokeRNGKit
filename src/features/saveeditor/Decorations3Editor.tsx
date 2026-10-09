import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import {
  decoration3Edit,
  packDecorations3,
  decorations3Words,
  type Decoration3Catalog,
  type Decoration3Edit,
} from "./decorations3";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<Decoration3Catalog | undefined>;
  onApply(edit: Decoration3Edit): Promise<void>;
};
export function Decorations3Editor({
  revision,
  busy,
  lang,
  onRead,
  onApply,
}: Props) {
  const reader = useRef(onRead);
  const [loaded, setLoaded] = useState<{
    revision: number;
    catalog: Decoration3Catalog;
  }>();
  const [category, setCategory] = useState(0);
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
  const w = decorations3Words[lang];
  return (
    <section className="save-record-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === revision ? (
        <DecorationForm
          key={`${revision}:${category}`}
          catalog={loaded.catalog}
          category={category}
          busy={busy}
          lang={lang}
          onCategory={setCategory}
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
          {w.read}
        </button>
      )}
    </section>
  );
}
function DecorationForm({
  catalog,
  category,
  busy,
  lang,
  onCategory,
  onApply,
}: {
  catalog: Decoration3Catalog;
  category: number;
  busy: boolean;
  lang: Props["lang"];
  onCategory(n: number): void;
  onApply: Props["onApply"];
}) {
  const w = decorations3Words[lang],
    entry = catalog.categories[category];
  const [slots, setSlots] = useState(() => [...entry.slots]),
    [invalid, setInvalid] = useState(false);
  const dirty = slots.some((v, i) => v !== entry.slots[i]);
  const canOrganize = packDecorations3(slots).some((v, i) => v !== slots[i]);
  const apply = (values: number[]) => {
    try {
      const edit = decoration3Edit(catalog, category, values);
      setInvalid(false);
      void onApply(edit);
    } catch {
      setInvalid(true);
    }
  };
  return (
    <fieldset className="save-food-fields" disabled={busy}>
      <legend className="visually-hidden">{w.title}</legend>
      <label className="field">
        <span>{w.category}</span>
        <Select
          value={category}
          disabled={dirty}
          onChange={(e) => onCategory(Number(e.target.value))}
        >
          {catalog.categories.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name[lang]} · {v.slots.filter((x) => x !== 0).length}/
              {v.slots.length}
            </option>
          ))}
        </Select>
      </label>
      <fieldset className="save-food-fields" disabled={!catalog.canEdit}>
        <legend>{entry.name[lang]}</legend>
        <div className="save-editor-fields">
          {slots.map((value, i) => (
            <label className="field" key={i}>
              <span>
                {w.slot} {i + 1}
              </span>
              <Select
                value={value}
                onChange={(e) =>
                  setSlots(
                    slots.map((v, j) => (j === i ? Number(e.target.value) : v)),
                  )
                }
              >
                {!entry.choices.some((c) => c.id === value) && (
                  <option value={value} disabled>
                    {w.unknown} ({value})
                  </option>
                )}
                {entry.choices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id === 0 ? w.empty : c.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
          ))}
        </div>
      </fieldset>
      {dirty && <p className="save-editor-note">{w.dirty}</p>}
      {invalid && (
        <p className="save-editor-error" role="alert">
          {w.invalid}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          className="primary"
          disabled={!dirty || !catalog.canEdit}
          onClick={() => apply(slots)}
        >
          {w.apply}
        </button>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => {
            setSlots([...entry.slots]);
            setInvalid(false);
          }}
        >
          {w.discard}
        </button>
        <button
          type="button"
          disabled={dirty || !canOrganize || !catalog.canEdit}
          onClick={() => apply(slots)}
        >
          {w.organize}
        </button>
        <button
          type="button"
          disabled={dirty || !slots.some((v) => v !== 0) || !catalog.canEdit}
          onClick={() => apply(slots.map(() => 0))}
        >
          {w.clear}
        </button>
      </div>
      <p className="save-editor-note">{w.note}</p>
    </fieldset>
  );
}
