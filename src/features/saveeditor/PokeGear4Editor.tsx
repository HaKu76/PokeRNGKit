import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import {
  gear4SlotEdit,
  gear4BatchEdit,
  gear4Contact,
  gear4SourceName,
  pokegear4Words,
  type PokeGear4Catalog,
  type PokeGear4Edit,
  type Gear4Batch,
} from "./pokegear4";
import "./PokeGear4Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<PokeGear4Catalog | undefined>;
  onApply(edit: PokeGear4Edit): Promise<void>;
};
export function PokeGear4Editor({
  revision,
  busy,
  lang,
  onRead,
  onApply,
}: Props) {
  const reader = useRef(onRead),
    [loaded, setLoaded] = useState<{
      revision: number;
      catalog: PokeGear4Catalog;
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
  const w = pokegear4Words[lang];
  return (
    <section className="save-record-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === revision ? (
        <GearForm
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
function GearForm({
  catalog: c,
  busy,
  lang,
  onApply,
}: {
  catalog: PokeGear4Catalog;
  busy: boolean;
  lang: Props["lang"];
  onApply: Props["onApply"];
}) {
  const w = pokegear4Words[lang],
    [view, setView] = useState<"single" | "batch">("single"),
    [slot, setSlot] = useState(0),
    [mode, setMode] = useState<"choice" | "raw">("choice"),
    [value, setValue] = useState("keep"),
    [raw, setRaw] = useState(String(c.slots[0])),
    [action, setAction] = useState<Gear4Batch>("all"),
    [review, setReview] = useState(false),
    [invalid, setInvalid] = useState(false);
  const dirty =
      mode === "choice" ? value !== "keep" : raw !== String(c.slots[slot]),
    plan = c.plans.find((p) => p.action === action)!;
  const apply = (batch: boolean) => {
    try {
      const edit = batch
        ? gear4BatchEdit(c, action)
        : gear4SlotEdit(c, slot, mode, mode === "choice" ? value : raw);
      setInvalid(false);
      void onApply(edit);
    } catch {
      setInvalid(true);
    }
  };
  const list = (slots: number[]) => (
    <div className="save-gear4-list">
      <table>
        <thead>
          <tr>
            <th scope="col">{w.slot}</th>
            <th scope="col">{w.value}</th>
            <th scope="col">{w.raw}</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((id, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{gear4Contact(c, id, lang)}</td>
              <td>{id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div className="save-food-fields">
      <div className="save-editor-toolbar" role="group" aria-label={w.title}>
        {(["single", "batch"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            disabled={busy || (view !== v && (dirty || review))}
            onClick={() => {
              setView(v);
              setInvalid(false);
            }}
          >
            {w[v]}
          </button>
        ))}
      </div>
      {view === "single" ? (
        <>
          <div className="save-editor-fields">
            <label className="field">
              <span>{w.slot}</span>
              <Select
                disabled={busy || dirty}
                value={slot}
                onChange={(e) => {
                  const i = Number(e.target.value);
                  setSlot(i);
                  setRaw(String(c.slots[i]));
                  setValue("keep");
                  setInvalid(false);
                }}
              >
                {c.slots.map((id, i) => (
                  <option key={i} value={i}>
                    {i + 1} · {gear4Contact(c, id, lang)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>{w.mode}</span>
              <Select
                value={mode}
                disabled={busy || dirty}
                onChange={(e) => {
                  setMode(e.target.value as "choice" | "raw");
                  setInvalid(false);
                }}
              >
                <option value="choice">{w.choice}</option>
                <option value="raw">{w.raw}</option>
              </Select>
            </label>
          </div>
          <fieldset className="save-food-fields" disabled={busy || !c.canEdit}>
            <label className="field save-gear4-select">
              <span>{w.value}</span>
              {mode === "choice" ? (
                <Select
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                >
                  <option value="keep">
                    {w.keep} · {gear4Contact(c, c.slots[slot], lang)}
                  </option>
                  {c.choices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.id} · {gear4Contact(c, v.id, lang)}
                    </option>
                  ))}
                </Select>
              ) : (
                <input
                  inputMode="text"
                  maxLength={4}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                />
              )}
            </label>
            {mode === "raw" && <p>{w.rawNote}</p>}
            <div className="save-editor-toolbar">
              <button
                type="button"
                className="primary"
                disabled={!dirty}
                onClick={() => apply(false)}
              >
                {w.apply}
              </button>
              <button
                type="button"
                disabled={!dirty}
                onClick={() => {
                  setValue("keep");
                  setRaw(String(c.slots[slot]));
                  setInvalid(false);
                }}
              >
                {w.discard}
              </button>
            </div>
          </fieldset>
          <details className="save-gear4-details">
            <summary>{w.list}</summary>
            {list(c.slots)}
          </details>
          <details className="save-gear4-details">
            <summary>{w.source}</summary>
            {gear4SourceName(
              c.choices.find((v) => v.id === c.slots[slot])?.source ??
                String(c.slots[slot]),
            )}
          </details>
        </>
      ) : (
        <>
          <label className="field save-gear4-select">
            <span>{w.batch}</span>
            <Select
              value={action}
              disabled={busy || review}
              onChange={(e) => {
                setAction(e.target.value as Gear4Batch);
                setInvalid(false);
              }}
            >
              {(["all", "nonTrainers", "clear"] as const).map((a) => (
                <option key={a} value={a}>
                  {w.actions[a]}
                </option>
              ))}
            </Select>
          </label>
          <p>{w.replace}</p>
          {action === "all" && <p>{w.excludeAll}</p>}
          {action === "nonTrainers" && <p>{w.excludeNon}</p>}
          <p>
            {w.player}: {gear4Contact(c, c.player, lang)}
          </p>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || review}
              onClick={() => setReview(true)}
            >
              {w.preview}
            </button>
          </div>
          {review && (
            <>
              <dl className="save-editor-summary">
                <div>
                  <dt>{w.before}</dt>
                  <dd>{c.slots.filter((v) => v !== -1).length}</dd>
                </div>
                <div>
                  <dt>{w.after}</dt>
                  <dd>{plan.slots.filter((v) => v !== -1).length}</dd>
                </div>
                <div>
                  <dt>{w.empty}</dt>
                  <dd>{plan.slots.filter((v) => v === -1).length}</dd>
                </div>
                <div>
                  <dt>{w.changed}</dt>
                  <dd>
                    {plan.slots.filter((v, i) => v !== c.slots[i]).length}
                  </dd>
                </div>
              </dl>
              {list(plan.slots)}
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  className="primary"
                  disabled={busy || !c.canEdit}
                  onClick={() => apply(true)}
                >
                  {w.commit}
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
            </>
          )}
        </>
      )}
      {dirty && <p role="status">{w.draft}</p>}
      {invalid && (
        <p role="alert" className="save-editor-error">
          {w.invalid}
        </p>
      )}
      <p>{w.note}</p>
    </div>
  );
}
