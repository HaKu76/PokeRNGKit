import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { itemImage } from "./art";
import type { Br4Lang } from "./br4";
import {
  gl5Words,
  gl5Number,
  gl5Patch,
  gl5Resave,
  gl5Frozen,
  type Gl5Catalog,
  type Gl5Edit,
  type Gl5Preview,
} from "./globalLink5";
import "./GlobalLink5Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Gl5Catalog | undefined>;
  onPreview(edit: Gl5Edit): Promise<Gl5Preview | undefined>;
  onApply(edit: Gl5Edit): Promise<void>;
};
export function GlobalLink5Editor(props: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Gl5Catalog }>(),
    [section, setSection] = useState("general"),
    [index, setIndex] = useState(0);
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
    <section className="save-record-editor save-global-link5-editor">
      <h3>{gl5Words[props.lang].title}</h3>
      {loaded?.revision === props.revision ? (
        <Form
          key={props.revision}
          {...props}
          c={loaded.c}
          section={section}
          onSection={setSection}
          index={index}
          onIndex={setIndex}
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
            {gl5Words[props.lang].read}
          </button>
        </div>
      )}
    </section>
  );
}
function Form({
  c,
  section,
  onSection,
  index,
  onIndex,
  busy,
  lang,
  onPreview,
  onApply,
}: Props & {
  c: Gl5Catalog;
  section: string;
  onSection(s: string): void;
  index: number;
  onIndex(i: number): void;
}) {
  const w = gl5Words[lang],
    [scalars, setScalars] = useState<Record<string, string>>({}),
    [flags, setFlags] = useState<Record<string, boolean>>({}),
    [dateSet, setDateSet] = useState<boolean>(),
    [date, setDate] = useState(""),
    [item, setItem] = useState<number>(),
    [quantity, setQuantity] = useState<string>(),
    [fValue, setFValue] = useState<string>(),
    [fName, setFName] = useState<string>(),
    [preview, setPreview] = useState<Gl5Preview>(),
    [error, setError] = useState("");
  const row = c.items[index],
    f = c.furniture[index],
    dirty =
      Object.keys(scalars).some((k) => scalars[k] !== "") ||
      Object.keys(flags).length > 0 ||
      dateSet !== undefined ||
      item !== undefined ||
      quantity !== undefined ||
      fValue !== undefined ||
      fName !== undefined,
    locked = busy || dirty || !!preview;
  const build = (): Gl5Edit => {
    if (section === "general") {
      const values = Object.entries(scalars)
        .filter(([, text]) => text !== "")
        .map(([id, text]) => {
          const s = c.scalars.find((v) => v.id === id)!;
          return { id, value: gl5Number(text, s.minimum, s.maximum) };
        });
      const bools = Object.entries(flags).map(([id, value]) => ({ id, value }));
      return gl5Patch(c, {
        ...(values.length ? { scalars: values } : {}),
        ...(bools.length ? { flags: bools } : {}),
        ...(dateSet !== undefined
          ? { dateSet, ...(dateSet ? { date } : {}) }
          : {}),
      });
    }
    if (section === "items")
      return gl5Patch(c, {
        items: [
          {
            index,
            ...(item !== undefined ? { id: item } : {}),
            ...(quantity !== undefined
              ? { count: gl5Number(quantity, 0, 255) }
              : {}),
          },
        ],
      });
    return gl5Patch(c, {
      furniture: [
        {
          index,
          ...(fValue !== undefined
            ? { value: gl5Number(fValue, 0, 65535) }
            : {}),
          ...(fName !== undefined ? { name: fName } : {}),
        },
      ],
    });
  };
  const start = async (resave = false) => {
    setError("");
    try {
      const p = await onPreview(resave ? gl5Resave(c) : build());
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    }
  };
  const discard = () => {
    setScalars({});
    setFlags({});
    setDateSet(undefined);
    setDate("");
    setItem(undefined);
    setQuantity(undefined);
    setFValue(undefined);
    setFName(undefined);
    setPreview(undefined);
    setError("");
  };
  const writable = !busy && !preview && c.canEdit;
  const label = (id: string) =>
    c.scalars.find((s) => s.id === id)?.name[lang] ??
    c.flags.find((f) => f.id === id)?.name[lang] ??
    id;
  const changedScalars =
      preview?.result.scalars.filter(
        (s, i) => s.value !== c.scalars[i].value,
      ) ?? [],
    changedFlags =
      preview?.result.flags.filter((s, i) => s.raw !== c.flags[i].raw) ?? [],
    changedItems =
      preview?.result.items.filter(
        (s, i) => s.id !== c.items[i].id || s.count !== c.items[i].count,
      ) ?? [],
    changedFurniture =
      preview?.result.furniture.filter(
        (s, i) => s.rawHex !== c.furniture[i].rawHex,
      ) ?? [];
  return (
    <div className="save-global-link5-body">
      <p>{w.note}</p>
      <div className="save-global-link5-grid">
        <label>
          <span>{w.group}</span>
          <Select
            value={section}
            disabled={locked}
            onChange={(e) => {
              onSection(e.target.value);
              onIndex(0);
              setError("");
            }}
          >
            <option value="general">{w.general}</option>
            <option value="items">{w.items}</option>
            <option value="furniture">{w.furniture}</option>
          </Select>
        </label>
        {section !== "general" && (
          <label>
            <span>{w.slot}</span>
            <Select
              value={index}
              disabled={locked}
              onChange={(e) => {
                onIndex(Number(e.target.value));
                setError("");
              }}
            >
              {(section === "items" ? c.items : c.furniture).map((v) => (
                <option key={v.index} value={v.index}>
                  {v.index + 1}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>
      <fieldset className="save-global-link5-fields" disabled={!writable}>
        {section === "general" ? (
          <>
            <div className="save-global-link5-grid">
              {c.scalars.map((s) => (
                <label key={s.id}>
                  <span>
                    {s.name[lang]} · {w.current}: {s.value}
                  </span>
                  <input
                    type="text"
                    inputMode={s.minimum < 0 ? "text" : "numeric"}
                    value={scalars[s.id] ?? ""}
                    placeholder={w.keep}
                    onChange={(e) =>
                      setScalars({ ...scalars, [s.id]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <p>{w.selectedNote}</p>
            <div className="save-global-link5-grid">
              {c.flags.map((flag) => (
                <label key={flag.id} className="save-global-link5-check">
                  <input
                    type="checkbox"
                    checked={flags[flag.id] ?? flag.value}
                    onChange={(e) =>
                      setFlags({ ...flags, [flag.id]: e.target.checked })
                    }
                  />
                  <span>
                    {flag.name[lang]} · 0x{flag.raw.toString(16).toUpperCase()}
                  </span>
                </label>
              ))}
            </div>
            <div className="save-global-link5-grid">
              <label>
                <span>
                  {w.date} ·{" "}
                  {c.date.value ?? (c.date.empty ? w.keep : w.invalidDate)}
                </span>
                <input
                  type="date"
                  min="2000-01-01"
                  max="2099-12-31"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setDateSet(true);
                  }}
                />
              </label>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  onClick={() => {
                    setDateSet(false);
                    setDate("");
                  }}
                >
                  {w.clearDate}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateSet(undefined);
                    setDate("");
                  }}
                >
                  {w.keep}
                </button>
              </div>
            </div>
            <small>{c.date.rawHex}</small>
          </>
        ) : section === "items" && row ? (
          <>
            <div className="save-global-link5-item">
              <img src={itemImage(row.sprite)} alt="" width="48" height="48" />
              <span>
                {row.name[lang] || `${w.keep}: ${row.id}`} · {w.quantity}:{" "}
                {row.count}
              </span>
            </div>
            <div className="save-global-link5-grid">
              <label>
                <span>{w.item}</span>
                <Select
                  value={item ?? row.id}
                  onChange={(e) => setItem(Number(e.target.value))}
                >
                  {!c.choices.some((v) => v.id === row.id) && (
                    <option value={row.id} disabled>
                      {w.keep}: {row.id}
                    </option>
                  )}
                  {[...c.choices]
                    .sort((a, b) => a.name[lang].localeCompare(b.name[lang]))
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name[lang]} · {v.id}
                      </option>
                    ))}
                </Select>
              </label>
              <label>
                <span>
                  {w.quantity} · {w.current}: {row.count}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  value={quantity ?? ""}
                  placeholder={w.keep}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </label>
            </div>
          </>
        ) : f ? (
          <>
            <div className="save-global-link5-grid">
              <label>
                <span>
                  {w.value} · {w.current}: {f.value}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={fValue ?? ""}
                  placeholder={w.keep}
                  onChange={(e) => setFValue(e.target.value)}
                />
              </label>
              <label>
                <span>
                  {w.name} · {w.current}: {f.name}
                </span>
                <input
                  type="text"
                  maxLength={32767}
                  value={fName ?? f.name}
                  onChange={(e) => setFName(e.target.value)}
                />
              </label>
            </div>
            <p>{w.nameNote}</p>
            <small>{f.rawHex}</small>
          </>
        ) : null}
      </fieldset>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={!writable || !dirty}
          onClick={() => void start()}
        >
          {w.preview}
        </button>
        <button type="button" disabled={busy || !dirty} onClick={discard}>
          {w.discard}
        </button>
        <button
          type="button"
          disabled={busy || dirty || !!preview || !c.canEdit}
          onClick={() => void start(true)}
        >
          {w.resave}
        </button>
      </div>
      <p>{w.resaveNote}</p>
      {error && (
        <p className="save-editor-error" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <section className="save-global-link5-preview" aria-label={w.preview}>
          <h4>{w.changes}</h4>
          <p>
            {w.changed}: {preview.changedOffsets.length}
          </p>
          <div className="save-global-link5-changes">
            {changedScalars.map((s) => (
              <p key={s.id}>
                {label(s.id)}: {c.scalars.find((v) => v.id === s.id)!.value} →{" "}
                {s.value}
              </p>
            ))}
            {changedFlags.map((s) => (
              <p key={s.id}>
                {label(s.id)}: 0x
                {c.flags
                  .find((v) => v.id === s.id)!
                  .raw.toString(16)
                  .toUpperCase()}{" "}
                → 0x{s.raw.toString(16).toUpperCase()}
              </p>
            ))}
            {preview.result.date.rawHex !== c.date.rawHex && (
              <p>
                {w.date}: {c.date.value ?? c.date.rawHex} →{" "}
                {preview.result.date.value ?? preview.result.date.rawHex}
              </p>
            )}
            {changedItems.map((s) => (
              <p key={s.index}>
                {w.items} {s.index + 1}: {c.items[s.index].id} /{" "}
                {c.items[s.index].count} → {s.name[lang] || s.id} / {s.count}
              </p>
            ))}
            {changedFurniture.map((s) => (
              <div key={s.index}>
                <p>
                  {w.furniture} {s.index + 1}: {c.furniture[s.index].value} →{" "}
                  {s.value}
                </p>
                <p>
                  {w.storedName}: {s.name}
                </p>
                <small>{s.rawHex}</small>
              </div>
            ))}
            {!preview.changedOffsets.length && <p>{w.noChanges}</p>}
          </div>
          <details>
            <summary>{w.raw}</summary>
            <div className="save-global-link5-raw">
              <p>{c.rawHex}</p>
              <p>{preview.result.rawHex}</p>
            </div>
          </details>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                try {
                  void onApply(gl5Frozen(c, preview));
                } catch {
                  setError(w.stale);
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
    </div>
  );
}
