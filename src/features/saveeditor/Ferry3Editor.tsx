import { useEffect, useRef, useState } from "react";
import {
  ferry3FlagEdit,
  ferry3TicketEdit,
  ferry3Plan,
  ferry3Words,
  type Ferry3Catalog,
  type Ferry3Edit,
} from "./ferry3";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<Ferry3Catalog | undefined>;
  onApply(edit: Ferry3Edit): Promise<void>;
};
export function Ferry3Editor({ revision, busy, lang, onRead, onApply }: Props) {
  const reader = useRef(onRead);
  const [loaded, setLoaded] = useState<{
    revision: number;
    catalog: Ferry3Catalog;
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
  const w = ferry3Words[lang];
  return (
    <section className="save-record-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === revision ? (
        <FerryForm
          key={revision}
          catalog={loaded.catalog}
          busy={busy}
          lang={lang}
          onApply={onApply}
        />
      ) : (
        <div className="save-editor-toolbar">
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
        </div>
      )}
    </section>
  );
}
function FerryForm({
  catalog: c,
  busy,
  lang,
  onApply,
}: {
  catalog: Ferry3Catalog;
  busy: boolean;
  lang: Props["lang"];
  onApply: Props["onApply"];
}) {
  const w = ferry3Words[lang];
  const [values, setValues] = useState(() => c.flags.map((f) => f.value));
  const mapPresent = c.tickets.some((t) => t.id === 376 && t.present);
  const [include, setInclude] = useState(c.japanese || mapPresent);
  const [review, setReview] = useState(false),
    [invalid, setInvalid] = useState(false);
  const [view, setView] = useState<"flags" | "tickets">("flags");
  const dirty = values.some((v, i) => v !== c.flags[i].value),
    plan = ferry3Plan(c, include);
  const name = (id: number) =>
    c.tickets.find((t) => t.id === id)?.name[lang] ?? `#${id}`;
  const apply = (action: "flags" | "tickets") => {
    try {
      const edit =
        action === "flags"
          ? ferry3FlagEdit(c, values)
          : ferry3TicketEdit(c, include);
      setInvalid(false);
      void onApply(edit);
    } catch {
      setInvalid(true);
    }
  };
  return (
    <div className="save-food-fields">
      <div className="save-editor-toolbar" role="group" aria-label={w.title}>
        {(["flags", "tickets"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={view === mode}
            disabled={busy || (view !== mode && (dirty || review))}
            onClick={() => {
              setView(mode);
              setInvalid(false);
            }}
          >
            {w[mode]}
          </button>
        ))}
      </div>
      {view === "flags" ? (
        <fieldset
          className="save-food-fields"
          disabled={busy || !c.canEdit || review}
        >
          <legend>{w.flags}</legend>
          <div className="save-editor-fields">
            {c.flags.map((f, i) => (
              <label className="save-food-toggle" key={f.index}>
                <input
                  type="checkbox"
                  checked={values[i]}
                  onChange={(e) =>
                    setValues(
                      values.map((v, j) => (i === j ? e.target.checked : v)),
                    )
                  }
                />
                {w.labels[i]}
              </label>
            ))}
          </div>
          <div className="save-editor-toolbar">
            <button
              type="button"
              className="primary"
              disabled={!dirty}
              onClick={() => apply("flags")}
            >
              {w.applyFlags}
            </button>
            <button
              type="button"
              disabled={!dirty}
              onClick={() => {
                setValues(c.flags.map((f) => f.value));
                setInvalid(false);
              }}
            >
              {w.discard}
            </button>
          </div>
        </fieldset>
      ) : (
        <>
          <h4>{w.tickets}</h4>
          <ul>
            {c.tickets.map((t) => (
              <li key={t.id}>
                {t.name[lang]} · {t.present ? w.present : w.absent}
              </li>
            ))}
          </ul>
          <fieldset className="save-food-fields" disabled={busy || dirty}>
            <label className="save-food-toggle">
              <input
                type="checkbox"
                checked={include}
                disabled={c.japanese || mapPresent || review}
                onChange={(e) => {
                  setInclude(e.target.checked);
                  setReview(false);
                  setInvalid(false);
                }}
              />
              {w.include}
            </label>
            {!c.japanese && !mapPresent && <p>{w.unreleased}</p>}
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={review}
                onClick={() => {
                  setReview(true);
                  setInvalid(false);
                }}
              >
                {w.preview}
              </button>
            </div>
          </fieldset>
          {review && (
            <section aria-label={w.preview}>
              <p role="status">{w.statuses[plan.status]}</p>
              <p>
                {w.have}:{" "}
                {plan.have.length
                  ? plan.have.map(name).join(lang === "en" ? ", " : "、")
                  : w.none}
              </p>
              <p>
                {w.missing}:{" "}
                {plan.missing.length
                  ? plan.missing.map(name).join(lang === "en" ? ", " : "、")
                  : w.none}
              </p>
              {plan.additions.length > 0 && (
                <>
                  <h4>{w.destinations}</h4>
                  <ul>
                    {plan.additions.map((a) => (
                      <li key={a.slot}>
                        {w.slot} {a.slot + 1}: {name(a.id)} × 1
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  className="primary"
                  disabled={
                    busy || !c.canEdit || dirty || plan.status !== "ready"
                  }
                  onClick={() => apply("tickets")}
                >
                  {w.applyTickets}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setReview(false);
                    setInvalid(false);
                  }}
                >
                  {w.cancel}
                </button>
              </div>
            </section>
          )}
        </>
      )}
      {dirty && <p role="status">{w.draft}</p>}
      {invalid && (
        <p className="save-editor-error" role="alert">
          {w.invalid}
        </p>
      )}
      <p>{w.note}</p>
    </div>
  );
}
