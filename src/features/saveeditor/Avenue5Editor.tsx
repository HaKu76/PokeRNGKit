import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { speciesImage } from "./art";
import type { Br4Lang } from "./br4";
import { gl5Words } from "./globalLink5";
import {
  avenue5Action,
  avenue5Patch,
  avenue5Frozen,
  avenue5Import,
  avenue5Valid,
  avenue5Words,
  type Avenue5Catalog,
  type Avenue5Object,
  type Avenue5Edit,
  type Avenue5Preview,
  type Avenue5Field,
} from "./avenue5";
import "./Avenue5Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Avenue5Catalog | undefined>;
  onPreview(e: Avenue5Edit): Promise<Avenue5Preview | undefined>;
  onApply(e: Avenue5Edit): Promise<void>;
  onExport(e: Avenue5Edit, extension: string): Promise<void>;
};
export function Avenue5Editor(props: Props) {
  const [loaded, setLoaded] = useState<{
    revision: number;
    c: Avenue5Catalog;
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
    <section className="save-record-editor save-avenue5-editor">
      <h3>{avenue5Words[props.lang].title}</h3>
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
          {avenue5Words[props.lang].read}
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
  onExport,
}: Props & { c: Avenue5Catalog }) {
  const w = avenue5Words[lang],
    common = gl5Words[lang];
  const [group, setGroup] = useState("avenue"),
    [index, setIndex] = useState(0),
    [section, setSection] = useState("avenue"),
    [field, setField] = useState("ScriptFlag"),
    [draft, setDraft] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState<Avenue5Preview>(),
    [importing, setImporting] = useState(false),
    [error, setError] = useState("");
  const objects = c.objects.filter((o) => o.group === group),
    object = objects.find((o) => o.index === index) ?? objects[0],
    fields = object.fields.filter((f) => f.group === section),
    selected = fields.find((f) => f.id === field) ?? fields[0],
    dirty = Object.keys(draft).length > 0,
    locked = busy || importing || dirty || !!preview,
    writable = c.canEdit && !busy && !importing && !preview,
    valid = Object.entries(draft).every(([id, v]) => {
      const f = object.fields.find((f) => f.id === id);
      return !!f && avenue5Valid(f, v);
    });
  const choose = (o: Avenue5Object) => {
    setSection(o.fields[0].group);
    setField(o.fields[0].id);
  };
  const start = async (e: Avenue5Edit) => {
    setError("");
    try {
      const p = await onPreview(e);
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    }
  };
  const action = (a: "resave" | "export") => {
    try {
      const e = avenue5Action(c, object, a);
      if (a === "export") void onExport(e, object.extension!);
      else void start(e);
    } catch {
      setError(w.invalid);
    }
  };
  const discard = () => {
    setDraft({});
    setPreview(undefined);
    setError("");
  };
  const next = preview?.result.objects.find(
      (o) => o.group === object.group && o.index === object.index,
    ),
    changes =
      next?.fields.filter(
        (f) => f.value !== object.fields.find((old) => old.id === f.id)!.value,
      ) ?? [];
  const display = (f: Avenue5Field) =>
    f.choices && f.kind !== "shop"
      ? (f.choices.find((x) => String(x.id) === f.value)?.name[lang] ?? f.value)
      : f.value;
  return (
    <div className="save-avenue5-body">
      <div className="save-editor-toolbar" role="group" aria-label={w.title}>
        {Object.entries(w.groups).map(([g, label]) => (
          <button
            key={g}
            type="button"
            aria-pressed={group === g}
            disabled={locked}
            onClick={() => {
              setGroup(g);
              setIndex(0);
              choose(c.objects.find((o) => o.group === g)!);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="save-avenue5-grid">
        <label>
          <span>{w.object}</span>
          <Select
            value={object.index}
            disabled={locked}
            onChange={(e) => {
              setIndex(Number(e.target.value));
              choose(objects.find((o) => o.index === Number(e.target.value))!);
            }}
          >
            {objects.map((o) => (
              <option key={o.index} value={o.index}>
                {o.index + 1} ·{" "}
                {o.group === "settings" || o.group === "avenue"
                  ? w.groups[o.group]
                  : o.name.trim() || "—"}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span>{w.kind}</span>
          <Select
            value={section}
            disabled={locked}
            onChange={(e) => {
              setSection(e.target.value);
              setField(
                object.fields.find((f) => f.group === e.target.value)!.id,
              );
            }}
          >
            {[...new Set(object.fields.map((f) => f.group))].map((g) => (
              <option key={g} value={g}>
                {
                  w[
                    g as keyof Pick<
                      typeof w,
                      | "general"
                      | "specific"
                      | "database"
                      | "settings"
                      | "avenue"
                    >
                  ]
                }
              </option>
            ))}
          </Select>
        </label>
      </div>
      <label>
        <span>{w.field}</span>
        <Select
          value={selected.id}
          disabled={busy || importing || !!preview}
          onChange={(e) => setField(e.target.value)}
        >
          {fields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name[lang]}
              {draft[f.id] !== undefined ? " *" : ""}
            </option>
          ))}
        </Select>
      </label>
      <Field
        key={selected.id}
        field={selected}
        value={draft[selected.id] ?? selected.value}
        disabled={!writable}
        lang={lang}
        onChange={(v) => {
          setError("");
          setDraft((old) => ({ ...old, [selected.id]: v }));
        }}
      />
      <p>
        {common.current}: {display(selected)}
      </p>
      {selected.kind === "list" && <p>{w.listHelp}</p>}
      {selected.kind === "date" && <p>{w.dateHelp}</p>}
      {dirty && (
        <div className="save-avenue5-draft">
          {Object.keys(draft).map((id) => (
            <span key={id}>
              {object.fields.find((f) => f.id === id)!.name[lang]}
            </span>
          ))}
        </div>
      )}
      {!valid && (
        <p role="alert" className="save-editor-error">
          {w.invalid}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={!writable || !dirty || !valid}
          onClick={() => {
            try {
              void start(
                avenue5Patch(
                  c,
                  object,
                  Object.entries(draft).map(([id, value]) => ({ id, value })),
                ),
              );
            } catch {
              setError(w.invalid);
            }
          }}
        >
          {common.preview}
        </button>
        <button
          type="button"
          disabled={busy || importing || !dirty}
          onClick={discard}
        >
          {common.discard}
        </button>
        <button
          type="button"
          disabled={locked || !c.canEdit}
          onClick={() => action("resave")}
        >
          {w.resave}
        </button>
      </div>
      <p>{w.resaveNote}</p>
      {object.extension && (
        <div className="save-editor-toolbar">
          <label className="save-avenue5-file">
            <span>{w.import}</span>
            <input
              type="file"
              accept=".jav5,.jaa5,.jah5"
              disabled={locked || !c.canEdit}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setImporting(true);
                void (async () => {
                  try {
                    if (![88, 96, 196].includes(file.size)) throw Error();
                    const bytes = new Uint8Array(await file.arrayBuffer());
                    await start(avenue5Import(c, object, bytes));
                  } catch {
                    setError(w.invalid);
                  } finally {
                    setImporting(false);
                  }
                })();
              }}
            />
          </label>
          <button
            type="button"
            disabled={locked}
            onClick={() => action("export")}
          >
            {w.export} (.{object.extension})
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="save-editor-error">
          {error}
        </p>
      )}
      {preview && (
        <section className="save-avenue5-preview" aria-label={common.preview}>
          <h4>{common.changes}</h4>
          <p>
            {common.changed}: {preview.changedOffsets.length}
          </p>
          <div className="save-avenue5-changes">
            {changes.map((f) => (
              <p key={f.id}>
                {f.name[lang]}:{" "}
                {display(object.fields.find((old) => old.id === f.id)!)} →{" "}
                {display(f)}
              </p>
            ))}
            {!preview.changedOffsets.length && <p>{common.noChanges}</p>}
          </div>
          <details>
            <summary>{w.raw}</summary>
            <div className="save-avenue5-raw">
              <p>{object.rawHex}</p>
              <p>{next?.rawHex}</p>
            </div>
          </details>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                try {
                  void onApply(avenue5Frozen(c, preview));
                } catch {
                  setError(w.stale);
                }
              }}
            >
              {common.apply}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPreview(undefined)}
            >
              {common.cancel}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
function Field({
  field: f,
  value,
  disabled,
  lang,
  onChange,
}: {
  field: Avenue5Field;
  value: string;
  disabled: boolean;
  lang: Br4Lang;
  onChange(v: string): void;
}) {
  const w = avenue5Words[lang];
  if (f.kind === "shop") {
    const p = value.split(",").map((x) => x.trim());
    const change = (i: number, v: string) =>
      onChange(p.map((old, n) => (i === n ? v : old)).join(", "));
    return (
      <div className="save-avenue5-shop">
        <label>
          <span>{f.name[lang]}</span>
          <Select
            value={p[0]}
            disabled={disabled}
            onChange={(e) => change(0, e.target.value)}
          >
            {f.choices?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name[lang]}
              </option>
            ))}
          </Select>
        </label>
        {[w.shopRank, w.shopVersion].map((label, i) => (
          <label key={i}>
            <span>{label}</span>
            <input
              type="number"
              min={0}
              max={i === 0 ? 9 : 3}
              step={1}
              value={p[i + 1]}
              disabled={disabled}
              onChange={(e) => change(i + 1, e.target.value)}
            />
          </label>
        ))}
      </div>
    );
  }
  if (f.kind === "boolean")
    return (
      <label className="save-avenue5-check">
        <input
          type="checkbox"
          checked={value === "1"}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked ? "1" : "0")}
        />
        <span>{f.name[lang]}</span>
      </label>
    );
  if (f.choices)
    return (
      <label>
        <span>{f.name[lang]}</span>
        <Select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {!f.choices.some((c) => String(c.id) === value) && (
            <option value={value}>{value}</option>
          )}
          {f.choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name[lang]} · {c.id}
            </option>
          ))}
        </Select>
        {["Species", "FavoriteSpecies"].includes(f.id) && (
          <img
            className="save-avenue5-species"
            src={speciesImage(Number(value))}
            alt={
              f.choices.find((c) => String(c.id) === value)?.name[lang] ?? value
            }
          />
        )}
      </label>
    );
  if (f.kind === "list")
    return (
      <label>
        <span>{f.name[lang]}</span>
        <textarea
          value={value}
          maxLength={f.textMaximum}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  return (
    <label>
      <span>{f.name[lang]}</span>
      <input
        type={f.kind === "number" ? "number" : "text"}
        min={f.kind === "number" ? 0 : undefined}
        max={f.kind === "number" ? f.maximum : undefined}
        step={f.kind === "number" ? 1 : undefined}
        maxLength={f.kind !== "number" ? f.textMaximum : undefined}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (f.kind === "number" && !value) onChange(f.value);
        }}
      />
    </label>
  );
}
