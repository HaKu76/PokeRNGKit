import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { Br4Lang } from "./br4";
import {
  honey4Edit,
  honey4Limits,
  honey4Trees,
  honey4Words,
  type Honey4Catalog,
  type Honey4Edit,
  type Honey4Field,
  type Honey4Row,
} from "./honeyTree4";
import "./HoneyTree4Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Honey4Catalog | undefined>;
  onApply(edit: Honey4Edit): Promise<void>;
};
export function HoneyTree4Editor(props: Props) {
  const [id, setId] = useState(0),
    [loaded, setLoaded] = useState<{ revision: number; c: Honey4Catalog }>();
  const reader = useRef(props.onRead);
  useEffect(() => {
    reader.current = props.onRead;
  }, [props.onRead]);
  useEffect(() => {
    let active = true;
    void reader.current().then((c) => {
      if (active && c) setLoaded({ revision: props.revision, c });
    });
    return () => {
      active = false;
    };
  }, [props.revision]);
  const w = honey4Words[props.lang];
  return (
    <section className="save-record-editor save-honey4-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === props.revision ? (
        <TreeForm
          key={props.revision}
          {...props}
          c={loaded.c}
          id={id}
          setId={setId}
        />
      ) : (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={props.busy}
            onClick={() =>
              void props.onRead().then((c) => {
                if (c) setLoaded({ revision: props.revision, c });
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
function TreeForm({
  c,
  id,
  setId,
  busy,
  lang,
  onApply,
}: Props & { c: Honey4Catalog; id: number; setId(id: number): void }) {
  const [draft, setDraft] = useState<Partial<Record<Honey4Field, string>>>({}),
    [preview, setPreview] = useState(false),
    [error, setError] = useState("");
  const w = honey4Words[lang],
    row = c.trees.find((t) => t.id === id)!;
  const keys = Object.keys(draft) as Honey4Field[],
    dirty = keys.length > 0;
  const values = (r: Honey4Row) =>
    `${w.fields.time}: ${r.time} · ${w.fields.shake}: ${r.shake} · ${w.fields.group}: ${r.group} · ${w.fields.slot}: ${r.slot}`;
  const group = preview
      ? row.saveValues[2]
      : draft.group === undefined
        ? row.group
        : Number(draft.group),
    slot = preview
      ? row.saveValues[3]
      : draft.slot === undefined
        ? row.slot
        : Number(draft.slot);
  const choice = c.choices.find((v) => v.group === group && v.slot === slot),
    warning = choice?.species === 446 && !row.rare;
  const valid = keys.every(
    (k) => /^[0-9]+$/.test(draft[k]!) && Number(draft[k]) <= honey4Limits[k],
  );
  const apply = (action: Honey4Edit["action"]) => {
    try {
      const fields =
        action === "patch"
          ? Object.fromEntries(keys.map((k) => [k, Number(draft[k])]))
          : {};
      void onApply(honey4Edit(c, id, action, fields));
      setError("");
    } catch {
      setError(w.invalid);
    }
  };
  return (
    <>
      <label className="save-honey4-tree">
        <span>{w.tree}</span>
        <Select
          value={id}
          disabled={busy || dirty || preview}
          onChange={(e) => setId(Number(e.target.value))}
        >
          {c.trees.map((t) => (
            <option key={t.id} value={t.id}>
              {honey4Trees[lang][t.id]}
            </option>
          ))}
        </Select>
      </label>
      <div>
        <p>{w.rare}</p>
        <ul className="save-honey4-rare">
          {c.munchlaxTrees.map((tree, i) => (
            <li key={i}>{honey4Trees[lang][tree]}</li>
          ))}
        </ul>
      </div>
      <p>{values(row)}</p>
      <fieldset disabled={busy || !c.canEdit} className="save-honey4-body">
        <div className="save-honey4-fields">
          {(Object.keys(honey4Limits) as Honey4Field[]).map((k) => (
            <label key={k}>
              <span>{w.fields[k]}</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={k === "time" ? 4 : 1}
                placeholder={String(row[k])}
                value={draft[k] ?? ""}
                disabled={preview}
                aria-invalid={
                  draft[k] !== undefined &&
                  (!/^[0-9]+$/.test(draft[k]!) ||
                    Number(draft[k]) > honey4Limits[k])
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setDraft((prev) => {
                    const next = { ...prev };
                    if (value === "") delete next[k];
                    else next[k] = value;
                    return next;
                  });
                }}
              />
            </label>
          ))}
        </div>
        <p>
          {w.species}:{" "}
          {choice ? (
            choice.alternateName ? (
              <>
                {choice.name[lang]} ({w.diamond}) / {choice.alternateName[lang]}{" "}
                ({w.pearl})
              </>
            ) : (
              choice.name[lang]
            )
          ) : (
            w.unknown
          )}
        </p>
        {warning && <p role="alert">{w.warning}</p>}
        <p>
          {w.subTable}:{" "}
          {draft.group !== undefined && valid
            ? Math.max(0, group - 1)
            : row.subTable}
        </p>
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={!dirty || !valid || preview}
            onClick={() => apply("patch")}
          >
            {w.apply}
          </button>
          <button
            type="button"
            disabled={!dirty || preview}
            onClick={() => setDraft({})}
          >
            {w.discard}
          </button>
          <button
            type="button"
            disabled={dirty || preview}
            onClick={() => apply("catchable")}
          >
            {w.catchable}
          </button>
          <button
            type="button"
            disabled={dirty || preview}
            onClick={() => setPreview(true)}
          >
            {w.preview}
          </button>
        </div>
        {preview && (
          <section className="save-honey4-preview" aria-label={w.preview}>
            <h4>{w.save}</h4>
            <p>{w.normalize}</p>
            <p>
              {values(row)} →{" "}
              {row.saveValues
                .map(
                  (v, i) =>
                    `${w.fields[(Object.keys(honey4Limits) as Honey4Field[])[i]]}: ${v}`,
                )
                .join(" · ")}
            </p>
            <p>
              {w.raw}: <code>{row.rawHex}</code> → <code>{row.saveHex}</code>
            </p>
            <div className="save-editor-toolbar">
              <button type="button" onClick={() => apply("save")}>
                {w.confirm}
              </button>
              <button type="button" onClick={() => setPreview(false)}>
                {w.cancel}
              </button>
            </div>
          </section>
        )}
      </fieldset>
      <p>
        {w.raw}: <code>{row.rawHex}</code>
      </p>
      <p>{w.preserve}</p>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
