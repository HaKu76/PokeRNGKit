import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import {
  eventDraft,
  eventIndex,
  eventWords,
  eventDiffText,
  validateEvents,
  validateEventFiles,
  type EventCatalog,
  type EventEdit,
  type EventDiff,
} from "./events";

type Lang = keyof typeof eventWords;
export function EventEditor({
  revision,
  busy,
  lang,
  onRead,
  onApply,
  onCompare,
}: {
  revision: number;
  busy: boolean;
  lang: Lang;
  onRead(): Promise<EventCatalog | undefined>;
  onApply(edit: EventEdit): Promise<void>;
  onCompare(old: File, newer: File): Promise<EventDiff | undefined>;
}) {
  const reader = useRef(onRead);
  const [loaded, setLoaded] = useState<{
    revision: number;
    catalog: EventCatalog;
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
  const w = eventWords[lang];
  return (
    <section className="save-record-editor save-event-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === revision ? (
        <EventForm
          key={revision}
          catalog={loaded.catalog}
          disabled={busy}
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
      <EventComparison busy={busy} lang={lang} onCompare={onCompare} />
    </section>
  );
}
function EventForm({
  catalog,
  disabled,
  lang,
  onApply,
}: {
  catalog: EventCatalog;
  disabled: boolean;
  lang: Lang;
  onApply(edit: EventEdit): Promise<void>;
}) {
  const w = eventWords[lang];
  const [draft, setDraft] = useState(() => eventDraft(catalog));
  const [mode, setMode] = useState<"flags" | "values">("flags");
  const [selected, setSelected] = useState({ flags: 0, values: 0 });
  const [category, setCategory] = useState(-1);
  const [known, setKnown] = useState(true);
  const [query, setQuery] = useState("");
  const [jump, setJump] = useState("0");
  const [invalid, setInvalid] = useState(false);
  const labels = mode === "flags" ? catalog.flagLabels : catalog.workLabels;
  const count = draft[mode].length;
  const index = selected[mode];
  const label = labels.find((l) => l.index === index);
  const names = new Map(labels.map((l) => [l.index, l]));
  const candidates = Array.from({ length: count }, (_, i) => i).filter((i) => {
    const l = names.get(i);
    return (
      (!known || l) &&
      (category === -1 || l?.category === category) &&
      `${i} ${l?.name ?? w.unknown}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase())
    );
  });
  const changes = [
    ...draft.flags.flatMap((v, i) =>
      v === catalog.flags[i]
        ? []
        : [`${w.flags} #${i}: ${catalog.flags[i] ? 1 : 0} → ${v ? 1 : 0}`],
    ),
    ...draft.values.flatMap((v, i) =>
      v === String(catalog.values[i])
        ? []
        : [`${w.values} #${i}: ${catalog.values[i]} → ${v}`],
    ),
  ];
  const select = (i: number) => {
    setSelected({ ...selected, [mode]: i });
    setJump(String(i));
    setInvalid(false);
  };
  const updateValue = (value: string) =>
    setDraft({
      ...draft,
      values: draft.values.map((v, i) => (i === index ? value : v)),
    });
  const apply = () => {
    let edit: EventEdit;
    try {
      edit = validateEvents(catalog, draft);
    } catch {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void onApply(edit);
  };
  return (
    <fieldset className="save-food-fields" disabled={disabled}>
      <legend className="visually-hidden">{w.title}</legend>
      <div className="save-editor-toolbar" role="group" aria-label={w.title}>
        {(["flags", "values"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setCategory(-1);
              setQuery("");
              setJump(String(selected[m]));
              setInvalid(false);
            }}
          >
            {w[m]}
          </button>
        ))}
      </div>
      <div className="save-editor-fields">
        <label className="field">
          <span>{w.search}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="field">
          <span>{w.category}</span>
          <Select
            value={category}
            disabled={disabled}
            onChange={(e) => setCategory(Number(e.target.value))}
          >
            <option value={-1}>{w.all}</option>
            {[...new Set(labels.map((l) => l.category))]
              .sort((a, b) => a - b)
              .map((c) => (
                <option key={c} value={c}>
                  {c === 100 ? w.rebattle : (w.categories[c] ?? `#${c}`)}
                </option>
              ))}
          </Select>
        </label>
        <label className="save-food-toggle">
          <input
            type="checkbox"
            checked={known}
            onChange={(e) => setKnown(e.target.checked)}
          />
          {w.known}
        </label>
        <label className="field">
          <span>{w.select}</span>
          <Select
            disabled={disabled || !candidates.length}
            value={candidates.includes(index) ? index : ""}
            onChange={(e) => select(Number(e.target.value))}
          >
            <option value="" disabled>
              {w.select}
            </option>
            {candidates.map((i) => (
              <option key={i} value={i}>
                #{i} · {names.get(i)?.name ?? w.unknown}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>
            {w.index} · 0–{count - 1}
          </span>
          <input
            inputMode="numeric"
            maxLength={5}
            value={jump}
            onChange={(e) => setJump(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            try {
              select(eventIndex(jump, count));
            } catch {
              setInvalid(true);
            }
          }}
        >
          {w.go}
        </button>
      </div>
      {!candidates.length && <p className="save-editor-note">{w.empty}</p>}
      <h4>
        #{index} · {label?.name ?? w.unknown}
      </h4>
      {mode === "flags" ? (
        <label className="save-food-toggle">
          <input
            type="checkbox"
            checked={draft.flags[index]}
            disabled={!catalog.canEdit}
            onChange={(e) =>
              setDraft({
                ...draft,
                flags: draft.flags.map((v, i) =>
                  i === index ? e.target.checked : v,
                ),
              })
            }
          />
          {w.enabled}
        </label>
      ) : (
        <div className="save-editor-fields">
          {!!label?.presets.length && (
            <label className="field">
              <span>{w.preset}</span>
              <Select
                disabled={disabled || !catalog.canEdit}
                value={
                  label.presets.some(
                    (p) => String(p.value) === draft.values[index],
                  )
                    ? draft.values[index]
                    : ""
                }
                onChange={(e) => {
                  if (e.target.value !== "") updateValue(e.target.value);
                }}
              >
                <option value="">{w.custom}</option>
                {label.presets.map((p, i) => (
                  <option key={i} value={p.value}>
                    {p.name} · {p.value}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <label className="field">
            <span>
              {w.value} · 0–{catalog.maximumValue}
            </span>
            <input
              inputMode="numeric"
              maxLength={5}
              value={draft.values[index]}
              readOnly={!catalog.canEdit}
              onChange={(e) => updateValue(e.target.value)}
            />
          </label>
        </div>
      )}
      {invalid && (
        <p className="save-editor-error" role="alert">
          {w.invalid}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          className="primary"
          disabled={disabled || !catalog.canEdit || !changes.length}
          onClick={apply}
        >
          {w.apply}
        </button>
        <button
          type="button"
          disabled={disabled || !changes.length}
          onClick={() => {
            setDraft(eventDraft(catalog));
            setInvalid(false);
          }}
        >
          {w.discard}
        </button>
      </div>
      {!!changes.length && (
        <details className="save-pokemon-editor">
          <summary>
            {w.changes} · {changes.length}
          </summary>
          <textarea
            aria-label={w.changes}
            readOnly
            rows={6}
            value={changes.join("\n")}
          />
        </details>
      )}
      <p className="save-editor-note">{w.note}</p>
      {catalog.updatesQr && <p className="save-editor-note">{w.qr}</p>}
    </fieldset>
  );
}
function EventComparison({
  busy,
  lang,
  onCompare,
}: {
  busy: boolean;
  lang: Lang;
  onCompare(old: File, newer: File): Promise<EventDiff | undefined>;
}) {
  const w = eventWords[lang];
  const [old, setOld] = useState<File>();
  const [newer, setNewer] = useState<File>();
  const [result, setResult] = useState<EventDiff>();
  const [invalid, setInvalid] = useState(false);
  const compare = async () => {
    try {
      validateEventFiles([old!, newer!].filter(Boolean));
    } catch {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setResult(undefined);
    const diff = await onCompare(old!, newer!);
    if (diff) setResult(diff);
  };
  const text = result
    ? `${w.old}: ${old?.name}\n${w.newer}: ${newer?.name}\n\n${eventDiffText(result, lang)}`
    : "";
  return (
    <details className="save-pokemon-editor">
      <summary>{w.compare}</summary>
      <p className="save-editor-note">{w.compareNote}</p>
      <div className="save-editor-fields">
        <label className="field">
          <span>{w.old}</span>
          <input
            type="file"
            disabled={busy}
            onChange={(e) => {
              setOld(e.target.files?.[0]);
              setResult(undefined);
            }}
          />
        </label>
        <label className="field">
          <span>{w.newer}</span>
          <input
            type="file"
            disabled={busy}
            onChange={(e) => {
              setNewer(e.target.files?.[0]);
              setResult(undefined);
            }}
          />
        </label>
      </div>
      <button
        type="button"
        disabled={busy || !old || !newer}
        onClick={() => void compare()}
      >
        {w.compare}
      </button>
      {invalid && (
        <p className="save-editor-error" role="alert">
          {w.compareInvalid}
        </p>
      )}
      {result && (
        <>
          <textarea aria-label={w.result} readOnly rows={8} value={text} />
          <button
            type="button"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([text], { type: "text/plain;charset=utf-8" }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "event-diff.txt";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            {w.download}
          </button>
        </>
      )}
    </details>
  );
}
