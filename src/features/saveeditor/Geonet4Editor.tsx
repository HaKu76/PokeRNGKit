import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import {
  geonet4Words,
  geonet4Point,
  geonet4Global,
  geonet4Batch,
  type Geo4Catalog,
  type Geo4Edit,
} from "./geonet4";
import type { Br4Lang } from "./br4";
import "./Geonet4Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Geo4Catalog | undefined>;
  onApply(edit: Geo4Edit): Promise<void>;
};
export function Geonet4Editor(props: Props) {
  const [selected, setSelected] = useState<number>(),
    [loaded, setLoaded] = useState<{ revision: number; c: Geo4Catalog }>();
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
  return (
    <section className="save-record-editor save-geonet4-editor">
      <h3>{geonet4Words[props.lang].title}</h3>
      {loaded?.revision === props.revision ? (
        <MapForm
          key={props.revision}
          {...props}
          c={loaded.c}
          selected={selected}
          onSelect={setSelected}
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
            {geonet4Words[props.lang].read}
          </button>
        </div>
      )}
    </section>
  );
}
function MapForm({
  c,
  busy,
  lang,
  onApply,
  selected,
  onSelect,
}: Props & { c: Geo4Catalog; selected?: number; onSelect(id: number): void }) {
  const w = geonet4Words[lang],
    [draft, setDraft] = useState<number>(),
    [flag, setFlag] = useState<boolean>(),
    [action, setAction] = useState<"all" | "legal" | "clear" | "save">("all"),
    [preview, setPreview] = useState(false),
    [error, setError] = useState("");
  const locked = busy || draft !== undefined || flag !== undefined || preview,
    row =
      c.rows.find((v) => v.id === selected) ??
      c.rows.find((v) => v.owned) ??
      c.rows[0],
    regions = c.rows
      .filter((v) => v.country === row.country)
      .sort((a, b) =>
        a.regionName[lang].localeCompare(b.regionName[lang], lang),
      ),
    countries = c.rows
      .filter(
        (v, i, rows) => rows.findIndex((x) => x.country === v.country) === i,
      )
      .sort((a, b) =>
        a.countryName[lang].localeCompare(b.countryName[lang], lang),
      ),
    plan = c.plans.find((v) => v.action === action);
  const apply = async (edit: Geo4Edit) => {
    setError("");
    await onApply(edit);
  };
  const counts = Array.from(
    { length: 4 },
    (_, p) => c.rows.filter((v) => v.point === p).length,
  );
  return (
    <>
      {!c.ownValid && <p role="alert">{w.ownInvalid}</p>}
      <div className="save-geonet4-selectors">
        <label>
          <span>{w.country}</span>
          <Select
            value={row.country}
            disabled={locked}
            onChange={(e) =>
              onSelect(
                c.rows.find((v) => v.country === Number(e.target.value))!.id,
              )
            }
          >
            {countries.map((v) => (
              <option key={v.country} value={v.country}>
                {v.countryName[lang]}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span>{w.region}</span>
          <Select
            value={row.id}
            disabled={locked}
            onChange={(e) => onSelect(Number(e.target.value))}
          >
            {regions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.regionName[lang]}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <fieldset disabled={busy || !c.canEdit} className="save-geonet4-body">
        <label>
          <span>{w.point}</span>
          <Select
            value={draft ?? row.point}
            disabled={flag !== undefined || preview}
            onChange={(e) => setDraft(Number(e.target.value))}
          >
            {w.points.map((point, i) => (
              <option key={i} value={i}>
                {point}
              </option>
            ))}
          </Select>
        </label>
        {row.owned && <p>{w.own}</p>}
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={draft === undefined}
            onClick={() => {
              try {
                void apply(geonet4Point(c, row.id, draft!));
              } catch {
                setError(w.invalid);
              }
            }}
          >
            {w.apply}
          </button>
          <button
            type="button"
            disabled={draft === undefined}
            onClick={() => setDraft(undefined)}
          >
            {w.discard}
          </button>
        </div>
        <label className="save-geonet4-check">
          <input
            type="checkbox"
            checked={flag ?? c.global}
            disabled={draft !== undefined || preview}
            onChange={(e) => setFlag(e.target.checked)}
          />
          <span>{w.global}</span>
        </label>
        <p>
          {w.rawFlag}: {c.rawGlobal}
        </p>
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={flag === undefined}
            onClick={() => {
              try {
                void apply(geonet4Global(c, flag!));
              } catch {
                setError(w.invalid);
              }
            }}
          >
            {w.apply}
          </button>
          <button
            type="button"
            disabled={flag === undefined}
            onClick={() => setFlag(undefined)}
          >
            {w.discard}
          </button>
        </div>
        <label>
          <span>{w.batch}</span>
          <Select
            value={action}
            disabled={locked}
            onChange={(e) => setAction(e.target.value as typeof action)}
          >
            {(["all", "legal", "clear", "save"] as const).map((key) => (
              <option key={key} value={key}>
                {w[key]}
              </option>
            ))}
          </Select>
        </label>
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={locked || !plan}
            onClick={() => {
              try {
                geonet4Batch(c, action);
                setPreview(true);
                setError("");
              } catch {
                setError(w.invalid);
              }
            }}
          >
            {w.preview}
          </button>
        </div>
        {preview && plan && (
          <section className="save-geonet4-preview" aria-label={w.preview}>
            <h4>{w[action]}</h4>
            <p>{w.batchNote}</p>
            <p>
              {w.changes}: {plan.changed.length} · {w.global}:{" "}
              {plan.global ? "✓" : "—"}
            </p>
            <div className="save-geonet4-counts">
              {w.points.map((point, i) => (
                <div key={i}>
                  <span>{point}</span>
                  <strong>
                    {counts[i]} → {plan.counts[i]}
                  </strong>
                </div>
              ))}
            </div>
            <details className="save-geonet4-details">
              <summary>{w.changes}</summary>
              <div className="save-geonet4-changes">
                <ul>
                  {plan.changed.map((id) => {
                    const item = c.rows.find((v) => v.id === id);
                    return (
                      <li key={id}>
                        {item
                          ? `${item.countryName[lang]} · ${item.regionName[lang]}`
                          : `${w.hidden} ${Math.floor(id / 64) + 1}/${id % 64}`}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </details>
            <div className="save-editor-toolbar">
              <button
                type="button"
                onClick={() => {
                  try {
                    void apply(geonet4Batch(c, action));
                  } catch {
                    setError(w.invalid);
                  }
                }}
              >
                {w.confirm}
              </button>
              <button type="button" onClick={() => setPreview(false)}>
                {w.cancel}
              </button>
            </div>
          </section>
        )}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <p>{w.note}</p>
    </>
  );
}
