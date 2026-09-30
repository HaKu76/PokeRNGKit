import { useEffect, useRef, useState } from "react";
import {
  eventResetWords,
  validateEventReset,
  type EventResetCatalog,
  type EventResetEdit,
} from "./eventReset";
export function EventResetEditor({
  revision,
  busy,
  lang,
  onRead,
  onApply,
}: {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<EventResetCatalog | undefined>;
  onApply(edit: EventResetEdit): Promise<void>;
}) {
  const reader = useRef(onRead);
  const [loaded, setLoaded] = useState<{
    revision: number;
    catalog: EventResetCatalog;
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
  }, [revision, lang]);
  const w = eventResetWords[lang];
  return (
    <section className="save-record-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === revision ? (
        <ResetForm
          key={revision}
          catalog={loaded.catalog}
          busy={busy}
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
          {w.read}
        </button>
      )}
    </section>
  );
}
function ResetForm({
  catalog,
  busy,
  lang,
  onApply,
}: {
  catalog: EventResetCatalog;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onApply(edit: EventResetEdit): Promise<void>;
}) {
  const [ids, setIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [invalid, setInvalid] = useState(false);
  const w = eventResetWords[lang];
  const entries = catalog.entries.filter((e) =>
    e.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const apply = () => {
    let edit: EventResetEdit;
    try {
      edit = validateEventReset(catalog, ids);
    } catch {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void onApply(edit);
  };
  return (
    <fieldset className="save-food-fields" disabled={busy}>
      <legend className="visually-hidden">{w.title}</legend>
      <label className="field">
        <span>{w.search}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="save-editor-fields">
        {entries.map((entry) => (
          <label key={entry.id} className="save-food-toggle">
            <input
              type="checkbox"
              checked={ids.includes(entry.id)}
              disabled={!catalog.canEdit || !entry.hidden}
              onChange={(e) => {
                setIds(
                  e.target.checked
                    ? [...ids, entry.id]
                    : ids.filter((id) => id !== entry.id),
                );
                setInvalid(false);
              }}
            />
            <span>
              {entry.name} · {entry.hidden ? w.pending : w.clear}
            </span>
          </label>
        ))}
      </div>
      {!entries.length && <p className="save-editor-note">{w.empty}</p>}
      <p>
        {w.selected} · {ids.length}
      </p>
      {invalid && (
        <p className="save-editor-error" role="alert">
          {w.invalid}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          className="primary"
          disabled={!catalog.canEdit || !ids.length}
          onClick={apply}
        >
          {w.apply}
        </button>
        <button
          type="button"
          disabled={!ids.length}
          onClick={() => {
            setIds([]);
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
