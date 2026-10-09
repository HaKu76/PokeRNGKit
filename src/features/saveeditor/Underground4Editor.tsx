import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { Br4Lang } from "./br4";
import {
  ug4Frozen,
  ug4Resave,
  ug4Slot,
  ug4Stat,
  ug4Words,
  type Ug4Catalog,
  type Ug4Edit,
  type Ug4Preview,
} from "./underground4";
import "./Underground4Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Ug4Catalog | undefined>;
  onPreview(edit: Ug4Edit): Promise<Ug4Preview | undefined>;
  onApply(edit: Ug4Edit): Promise<void>;
};
export function Underground4Editor(props: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Ug4Catalog }>(),
    [section, setSection] = useState("stats"),
    [selected, setSelected] = useState(0);
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
    <section className="save-record-editor save-underground4-editor">
      <h3>{ug4Words[props.lang].title}</h3>
      {loaded?.revision === props.revision ? (
        <MainForm
          key={props.revision}
          {...props}
          c={loaded.c}
          section={section}
          setSection={setSection}
          selected={selected}
          setSelected={setSelected}
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
            {ug4Words[props.lang].read}
          </button>
        </div>
      )}
    </section>
  );
}
function MainForm({
  c,
  section,
  setSection,
  selected,
  setSelected,
  busy,
  lang,
  onPreview,
  onApply,
}: Props & {
  c: Ug4Catalog;
  section: string;
  setSection(s: string): void;
  selected: number;
  setSelected(i: number): void;
}) {
  const [statDraft, setStatDraft] = useState<{ id: number; text: string }>(),
    [item, setItem] = useState<number>(),
    [size, setSize] = useState<string>(),
    [preview, setPreview] = useState<Ug4Preview>(),
    [error, setError] = useState("");
  const w = ug4Words[lang],
    pouch = c.pouches.find((p) => p.kind === section),
    slot = pouch?.slots.find((s) => s.id === selected) ?? pouch?.slots[0],
    dirty = !!statDraft || item !== undefined || size !== undefined,
    locked = busy || dirty || !!preview;
  const start = async (build: () => Ug4Edit) => {
    try {
      setError("");
      const result = await onPreview(build());
      if (result) setPreview(result);
    } catch {
      setError(w.invalid);
    }
  };
  const valid =
    statDraft !== undefined &&
    /^\d+$/.test(statDraft.text) &&
    Number(statDraft.text) <= 999999;
  const itemName = (kind: string, id: number) => {
    const p = c.pouches.find((p) => p.kind === kind),
      name = p?.choices.find((v) => v.id === id)?.name[lang];
    return name || `${w.old}: ${id}`;
  };
  return (
    <>
      <label>
        <span>{w.section}</span>
        <Select
          value={section}
          disabled={locked}
          onChange={(e) => {
            setSection(e.target.value);
            setSelected(0);
          }}
        >
          <option value="stats">{w.stats}</option>
          {c.pouches.map((p) => (
            <option key={p.kind} value={p.kind}>
              {p.name[lang]}
            </option>
          ))}
        </Select>
      </label>
      <fieldset
        disabled={busy || !c.canEdit || !!preview}
        className="save-underground4-body"
      >
        {section === "stats" ? (
          <div className="save-underground4-grid">
            {c.stats.map((s) => (
              <label key={s.id}>
                <span>{s.name[lang]}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder={String(s.value)}
                  value={statDraft?.id === s.id ? statDraft.text : ""}
                  disabled={!!statDraft && statDraft.id !== s.id}
                  aria-invalid={statDraft?.id === s.id && !valid}
                  onChange={(e) =>
                    setStatDraft(
                      e.target.value === ""
                        ? undefined
                        : { id: s.id, text: e.target.value },
                    )
                  }
                />
                <small>
                  {w.current}: {s.value} · 0–999999
                </small>
              </label>
            ))}
          </div>
        ) : pouch && slot ? (
          <>
            <label>
              <span>{w.slot}</span>
              <Select
                value={slot.id}
                disabled={dirty}
                onChange={(e) => setSelected(Number(e.target.value))}
              >
                {pouch.slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id + 1} · {itemName(pouch.kind, s.item)}
                    {s.size !== null ? ` · ${s.size}` : ""}
                  </option>
                ))}
              </Select>
            </label>
            <div className="save-underground4-grid">
              <label>
                <span>{w.item}</span>
                <Select
                  value={item ?? slot.item}
                  onChange={(e) => setItem(Number(e.target.value))}
                >
                  {!pouch.choices.some(
                    (v) =>
                      v.id === slot.item &&
                      (slot.item === 0 ||
                        pouch.kind === "spheres" ||
                        v.name[lang] !== ""),
                  ) && (
                    <option value={slot.item} disabled>
                      {w.old}: {slot.item}
                    </option>
                  )}
                  {pouch.choices
                    .filter(
                      (v) =>
                        v.id === 0 ||
                        pouch.kind === "spheres" ||
                        v.name[lang] !== "",
                    )
                    .sort((a, b) =>
                      a.name[lang].localeCompare(b.name[lang], lang),
                    )
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name[lang] || `${w.old}: ${v.id}`}
                      </option>
                    ))}
                </Select>
              </label>
              {pouch.kind === "spheres" && (
                <label>
                  <span>{w.size}</span>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder={String(slot.size)}
                    value={size ?? ""}
                    onChange={(e) => setSize(e.target.value)}
                  />
                  <small>
                    {w.current}: {slot.size}
                  </small>
                </label>
              )}
            </div>
            {pouch.kind === "spheres" && <p>{w.sizeNote}</p>}
          </>
        ) : null}
        {dirty && (
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={!!statDraft && !valid}
              onClick={() =>
                void start(() =>
                  statDraft
                    ? ug4Stat(c, lang, statDraft.id, Number(statDraft.text))
                    : ug4Slot(c, lang, pouch!.kind, slot!.id, item, size),
                )
              }
            >
              {w.preview}
            </button>
            <button
              type="button"
              onClick={() => {
                setStatDraft(undefined);
                setItem(undefined);
                setSize(undefined);
                setError("");
              }}
            >
              {w.discard}
            </button>
          </div>
        )}
        {!dirty && (
          <div className="save-editor-toolbar">
            {pouch && (
              <button
                type="button"
                onClick={() => void start(() => ug4Resave(c, lang, pouch.kind))}
              >
                {w.resave}
              </button>
            )}
            <button
              type="button"
              onClick={() => void start(() => ug4Resave(c, lang))}
            >
              {w.resaveAll}
            </button>
          </div>
        )}
      </fieldset>
      {preview && (
        <section className="save-underground4-preview" aria-label={w.preview}>
          <h4>{w.changes}</h4>
          {!preview.changed.length && <p>{w.noChanges}</p>}
          {preview.stats
            .filter(
              (s) => c.stats.find((v) => v.id === s.id)?.value !== s.value,
            )
            .map((s) => (
              <p key={s.id}>
                {s.name[lang]}: {c.stats.find((v) => v.id === s.id)?.value} →{" "}
                {s.value}
              </p>
            ))}
          <div className="save-underground4-changes">
            {preview.pouches.map((p) => {
              const before = c.pouches.find((v) => v.kind === p.kind)!;
              const changed = p.slots.filter(
                (s) =>
                  before.slots[s.id].item !== s.item ||
                  before.slots[s.id].size !== s.size,
              );
              return changed.length ? (
                <div key={p.kind}>
                  <h4>{p.name[lang]}</h4>
                  {changed.map((s) => (
                    <p key={s.id}>
                      {w.slot} {s.id + 1}:{" "}
                      {itemName(p.kind, before.slots[s.id].item)}
                      {s.size !== null
                        ? ` (${before.slots[s.id].size})`
                        : ""} → {itemName(p.kind, s.item)}
                      {s.size !== null ? ` (${s.size})` : ""}
                    </p>
                  ))}
                </div>
              ) : null;
            })}
          </div>
          <details>
            <summary>
              {w.bytes} ({preview.changed.length})
            </summary>
            <div className="save-underground4-raw">
              <code>
                {preview.beforeHex} → {preview.afterHex}
              </code>
            </div>
          </details>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                try {
                  void onApply(ug4Frozen(c, preview));
                  setError("");
                } catch {
                  setError(w.invalid);
                }
              }}
            >
              {w.apply}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPreview(undefined)}
            >
              {w.cancel}
            </button>
          </div>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      <p>{w.note}</p>
      <p>{w.resaveNote}</p>
    </>
  );
}
