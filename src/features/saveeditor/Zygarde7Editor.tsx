import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { Br4Lang } from "./br4";
import {
  z7Action,
  z7Frozen,
  z7Patch,
  type Zygarde7Catalog,
  type Zygarde7Edit,
  type Zygarde7Preview,
} from "./zygarde7";
import { zygarde7Words } from "./zygarde7Words";
import "./Zygarde7Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Zygarde7Catalog | undefined>;
  onPreview(e: Zygarde7Edit): Promise<Zygarde7Preview | undefined>;
  onApply(e: Zygarde7Edit): Promise<void>;
};
export function Zygarde7Editor(props: Props) {
  const [loaded, setLoaded] = useState<{
    revision: number;
    c: Zygarde7Catalog;
  }>();
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
    <section className="save-record-editor save-collectibles7-editor">
      {loaded?.revision === props.revision ? (
        <Form key={props.revision} {...props} c={loaded.c} />
      ) : (
        <button
          type="button"
          disabled={props.busy}
          onClick={() =>
            void props.onRead().then((c) => {
              if (c) setLoaded({ revision: props.revision, c });
            })
          }
        >
          {zygarde7Words[props.lang].read}
        </button>
      )}
    </section>
  );
}
function Form({
  c,
  busy,
  lang,
  onPreview,
  onApply,
}: Props & { c: Zygarde7Catalog }) {
  const w = zygarde7Words[lang];
  const [rows, setRows] = useState<Record<number, number>>({});
  const [total, setTotal] = useState(String(c.total)),
    [collected, setCollected] = useState(String(c.collected));
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<Zygarde7Preview>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const dirty =
    Object.keys(rows).length > 0 ||
    total !== String(c.total) ||
    collected !== String(c.collected);
  const locked = busy || pending || !!preview;
  const writable = c.canEdit && !locked;
  function discard() {
    setRows({});
    setTotal(String(c.total));
    setCollected(String(c.collected));
    setPreview(undefined);
    setError("");
  }
  async function start(build: () => Zygarde7Edit) {
    setPending(true);
    setError("");
    try {
      const p = await onPreview(build());
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  function counter(value: string, old: number) {
    if (value === "") return old;
    if (!/^\d+$/.test(value)) throw Error("Invalid Collectibles7 counter.");
    return Number(value);
  }
  const filtered = c.entries.filter((v) =>
    `${v.index + 1} ${v.location[lang]} ${v.location.en}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <div className="save-collectibles7-body">
      <h3>{c.stickers ? w.stickers : w.cells}</h3>
      <p>{w.note}</p>
      <fieldset className="save-collectibles7-counts" disabled={!writable}>
        <label>
          <span>{w.total}</span>
          <input
            type="number"
            min={0}
            max={65535}
            step={1}
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            onBlur={() => {
              if (total === "") setTotal(String(c.total));
            }}
          />
        </label>
        <label>
          <span>{w.collected}</span>
          <input
            type="number"
            min={0}
            max={65535}
            step={1}
            value={collected}
            onChange={(e) => setCollected(e.target.value)}
            onBlur={() => {
              if (collected === "") setCollected(String(c.collected));
            }}
          />
        </label>
      </fieldset>
      <label>
        <span>{w.search}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div
        className="save-collectibles7-list"
        role="group"
        aria-label={w.location}
      >
        {filtered.map((v) => (
          <div className="save-collectibles7-row" key={v.index}>
            <span className="save-collectibles7-index">{v.index + 1}</span>
            <span>{v.location[lang]}</span>
            <Select
              value={rows[v.index] ?? v.state}
              disabled={!writable}
              aria-label={`${w.state}: ${v.index + 1} ${v.location[lang]}`}
              onChange={(e) => {
                const next = { ...rows };
                const value = Number(e.target.value);
                if (value === v.state) delete next[v.index];
                else next[v.index] = value;
                setRows(next);
              }}
            >
              {![0, 1, 2].includes(v.state) && (
                <option value={v.state} disabled>
                  {w.unknown}: {v.state}
                </option>
              )}
              {w.states.map((name, i) => (
                <option key={i} value={i}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={!writable || !dirty}
          onClick={() =>
            void start(() =>
              z7Patch(
                c,
                Object.keys(rows).length
                  ? Object.entries(rows).map(([index, state]) => ({
                      index: Number(index),
                      state,
                    }))
                  : undefined,
                total === String(c.total) ? undefined : counter(total, c.total),
                collected === String(c.collected)
                  ? undefined
                  : counter(collected, c.collected),
              ),
            )
          }
        >
          {w.preview}
        </button>
        <button type="button" disabled={locked || !dirty} onClick={discard}>
          {w.cancel}
        </button>
        <button
          type="button"
          disabled={!writable || dirty || c.entries.some((v) => v.state > 2)}
          onClick={() => void start(() => z7Action(c, "giveAll"))}
        >
          {w.giveAll}
        </button>
        <button
          type="button"
          disabled={!writable || dirty || c.entries.some((v) => v.state > 2)}
          onClick={() => void start(() => z7Action(c, "resave"))}
        >
          {w.resave}
        </button>
      </div>
      <p className="save-collectibles7-note">
        {dirty ? w.dirty : w.resaveNote}
      </p>
      {preview && (
        <div className="save-collectibles7-preview">
          <h4>{w.preview}</h4>
          <p>
            {w.changed}: {preview.changedOffsets.length}
          </p>
          <p>
            {w.total}: {c.total} → {preview.result.total} · {w.collected}:{" "}
            {c.collected} → {preview.result.collected}
          </p>
          <ul>
            {preview.result.entries
              .filter((v) => v.state !== c.entries[v.index].state)
              .map((v) => (
                <li key={v.index}>
                  {v.index + 1} · {v.location[lang]}:{" "}
                  {w.states[c.entries[v.index].state] ??
                    `${w.unknown} (${c.entries[v.index].state})`}{" "}
                  → {w.states[v.state] ?? v.state}
                </li>
              ))}
          </ul>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || pending}
              onClick={() => {
                setPending(true);
                void (async () => {
                  try {
                    await onApply(z7Frozen(c, preview));
                    discard();
                  } catch {
                    setError(w.invalid);
                  } finally {
                    setPending(false);
                  }
                })();
              }}
            >
              {w.apply}
            </button>
            <button type="button" disabled={busy || pending} onClick={discard}>
              {w.cancel}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="save-editor-error">
          {error}
        </p>
      )}
    </div>
  );
}
