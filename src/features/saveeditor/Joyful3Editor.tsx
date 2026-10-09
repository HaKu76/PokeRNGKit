import { useEffect, useRef, useState } from "react";
import {
  joyful3Draft,
  joyful3Edit,
  joyful3Words,
  type Joyful3Catalog,
  type Joyful3Edit,
} from "./joyful3";
import "./Joyful3Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<Joyful3Catalog | undefined>;
  onApply(edit: Joyful3Edit): Promise<void>;
};
export function Joyful3Editor({
  revision,
  busy,
  lang,
  onRead,
  onApply,
}: Props) {
  const reader = useRef(onRead),
    [loaded, setLoaded] = useState<{
      revision: number;
      catalog: Joyful3Catalog;
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
  const w = joyful3Words[lang];
  return (
    <section className="save-record-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === revision ? (
        <JoyfulForm
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
function JoyfulForm({
  catalog: c,
  busy,
  lang,
  onApply,
}: {
  catalog: Joyful3Catalog;
  busy: boolean;
  lang: Props["lang"];
  onApply: Props["onApply"];
}) {
  const w = joyful3Words[lang],
    [draft, setDraft] = useState(() => joyful3Draft(c)),
    [rewrite, setRewrite] = useState(() => c.fields.map(() => false)),
    [invalid, setInvalid] = useState(false);
  const dirty =
    draft.some((v, i) => v !== String(c.fields[i].value)) ||
    rewrite.some(Boolean);
  const old = c.fields.some((f) => f.value > f.max);
  const scores = c.fields.filter((f) => f.stored !== null);
  return (
    <div className="save-food-fields">
      <fieldset className="save-food-fields" disabled={busy || !c.canEdit}>
        <div className="save-joyful-groups">
          {[
            [0, 1, 2, 3],
            [4, 5, 6, 7],
          ].map((ids, group) => (
            <fieldset className="save-food-fields" key={group}>
              <legend>{group === 0 ? w.jump : w.berries}</legend>
              {ids.map((id) => {
                const f = c.fields.find((f) => f.id === id)!;
                const i = c.fields.indexOf(f);
                return (
                  <label className="field" key={id}>
                    <span>{w.labels[id]}</span>
                    <input
                      inputMode="numeric"
                      maxLength={f.width}
                      value={draft[i]}
                      onChange={(e) =>
                        setDraft(
                          draft.map((v, j) => (i === j ? e.target.value : v)),
                        )
                      }
                    />
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>
        <div className="save-editor-toolbar">
          <button
            type="button"
            className="primary"
            disabled={!dirty}
            onClick={() => {
              try {
                const edit = joyful3Edit(c, draft, rewrite);
                setInvalid(false);
                void onApply(edit);
              } catch {
                setInvalid(true);
              }
            }}
          >
            {w.apply}
          </button>
          <button
            type="button"
            disabled={!dirty}
            onClick={() => {
              setDraft(joyful3Draft(c));
              setRewrite(c.fields.map(() => false));
              setInvalid(false);
            }}
          >
            {w.discard}
          </button>
        </div>
      </fieldset>
      {old && <p role="status">{w.old}</p>}
      <details className="save-joyful-details">
        <summary>{w.raw}</summary>
        <div className="save-joyful-storage">
          {scores.map((f) => {
            const i = c.fields.indexOf(f);
            return (
              <section key={f.id}>
                <h4>
                  {f.id === 1 ? w.jump : w.berries} · {w.labels[f.id]}
                </h4>
                <p>
                  {w.value}: {f.value} · {w.stored}: {f.stored} (0x
                  {f.stored!.toString(16).toUpperCase().padStart(8, "0")})
                </p>
                <label className="save-food-toggle">
                  <input
                    type="checkbox"
                    checked={rewrite[i]}
                    disabled={busy || !c.canEdit}
                    onChange={(e) =>
                      setRewrite(
                        rewrite.map((v, j) => (i === j ? e.target.checked : v)),
                      )
                    }
                  />
                  {w.rewrite}
                </label>
              </section>
            );
          })}
          <p>{w.rewriteNote}</p>
        </div>
      </details>
      {invalid && (
        <p role="alert" className="save-editor-error">
          {w.invalid}
        </p>
      )}
      <p>{w.note}</p>
    </div>
  );
}
