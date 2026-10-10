import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { Br4Lang } from "./br4";
import { gl5Number, gl5Words } from "./globalLink5";
import { medals5Labels } from "./medals5Labels";
import { medals5Words } from "./medals5Words";
import {
  medals5Action,
  medals5Frozen,
  medals5Import,
  medals5Patch,
  type Medal5Patch,
  type Habitat5Patch,
  type Medals5SettingsPatch,
  type Medals5Catalog,
  type Medals5Edit,
  type Medals5Preview,
} from "./medals5";
import "./Medals5Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Medals5Catalog | undefined>;
  onPreview(e: Medals5Edit): Promise<Medals5Preview | undefined>;
  onApply(e: Medals5Edit): Promise<void>;
  onExport(): Promise<void>;
};
export function Medals5Editor(props: Props) {
  const [loaded, setLoaded] = useState<{
      revision: number;
      c: Medals5Catalog;
    }>(),
    [group, setGroup] = useState("medals"),
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
    <section className="save-record-editor save-medals5-editor">
      <h3>{medals5Labels[props.lang].title}</h3>
      {loaded?.revision === props.revision ? (
        <Form
          key={props.revision}
          {...props}
          c={loaded.c}
          group={group}
          onGroup={(g) => {
            setGroup(g);
            setIndex(0);
          }}
          index={index}
          onIndex={setIndex}
        />
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
          {medals5Words[props.lang].read}
        </button>
      )}
    </section>
  );
}
function Form({
  c,
  group,
  onGroup,
  index,
  onIndex,
  busy,
  lang,
  onPreview,
  onApply,
  onExport,
}: Props & {
  c: Medals5Catalog;
  group: string;
  onGroup(g: string): void;
  index: number;
  onIndex(i: number): void;
}) {
  const w = medals5Labels[lang],
    t = medals5Words[lang],
    common = gl5Words[lang];
  const [medal, setMedal] = useState<Omit<Medal5Patch, "index">>({}),
    [habitat, setHabitat] = useState<Omit<Habitat5Patch, "index">>({}),
    [settings, setSettings] = useState<Medals5SettingsPatch>({}),
    [numbers, setNumbers] = useState<Record<string, string>>({}),
    [selected, setSelected] = useState<number[]>([]),
    [scope, setScope] = useState("selected"),
    [preview, setPreview] = useState<Medals5Preview>(),
    [error, setError] = useState(""),
    [reading, setReading] = useState(false);
  const dirty =
      Object.keys(medal).length +
        Object.keys(habitat).length +
        Object.keys(settings).length +
        Object.keys(numbers).length >
      0,
    locked = busy || reading || dirty || !!preview,
    writable = c.canEdit && !busy && !reading && !preview;
  const m = c.medals[index],
    h = c.habitats[index],
    s = c.settings;
  const state = medal.state ?? m?.state,
    dateEditable = state === 2 || state === 4 || (state === 3 && m?.hasDate);
  const discard = () => {
    setMedal({});
    setHabitat({});
    setSettings({});
    setNumbers({});
    setPreview(undefined);
    setError("");
  };
  const start = async (e: Medals5Edit) => {
    setError("");
    try {
      const p = await onPreview(e);
      if (p) setPreview(p);
    } catch {
      setError(t.invalid);
    }
  };
  const patch = () => {
    try {
      if (group === "medals")
        void start(medals5Patch(c, { medals: [{ index, ...medal }] }));
      else if (group === "habitats")
        void start(medals5Patch(c, { habitats: [{ index, ...habitat }] }));
      else {
        const values = { ...settings };
        if (numbers.unknown90 !== undefined)
          values.unknown90 = gl5Number(numbers.unknown90, 0, 65535);
        if (numbers.unknown92 !== undefined)
          values.unknown92 = gl5Number(numbers.unknown92, 0, 255);
        void start(medals5Patch(c, { settings: values }));
      }
    } catch {
      setError(t.invalid);
    }
  };
  const action = (name: "giveAll" | "calculateRank" | "complete" | "clear") => {
    try {
      void start(
        medals5Action(
          c,
          name,
          name === "complete" || name === "clear"
            ? scope === "all"
              ? c.habitats.map((h) => h.index)
              : selected
            : undefined,
        ),
      );
    } catch {
      setError(t.invalid);
    }
  };
  const options = (values: readonly string[], value: number) => (
    <>
      {(value < 0 || value >= values.length) && (
        <option value={value} disabled>
          {common.keep}: {value}
        </option>
      )}
      {values.map((name, i) => (
        <option key={i} value={i}>
          {name}
        </option>
      ))}
    </>
  );
  const boolLabel = (value: boolean) => (value ? t.yes : t.no);
  const settingNames: Record<string, string> = {
    pinned: w.pinned,
    rank: w.rank,
    calculatedRank: t.calculateRank,
    tutorial: w.tutorial,
    tutorialRaw: w.tutorial,
    unknown90: "0x90",
    unknown92: "0x92",
    lastEncounter: w.lastEncounter,
    viewed: w.viewed,
    viewedRaw: w.viewed,
    capture: w.capture,
    captureRaw: w.capture,
  };
  const changedMedals =
      preview?.result.medals.filter(
        (v) => v.rawHex !== c.medals[v.index].rawHex,
      ) ?? [],
    changedHabitats =
      preview?.result.habitats.filter(
        (v) => v.raw !== c.habitats[v.index].raw,
      ) ?? [];
  const labelState = (v: number) => w.states[v] ?? `${common.keep}: ${v}`;
  return (
    <div className="save-medals5-body">
      <label>
        <span>{common.group}</span>
        <Select
          value={group}
          disabled={locked}
          onChange={(e) => onGroup(e.target.value)}
        >
          <option value="medals">{w.medals}</option>
          <option value="habitats">{w.habitats}</option>
          <option value="settings">{t.settings}</option>
        </Select>
      </label>
      {group !== "settings" && (
        <label>
          <span>{w.index}</span>
          <Select
            value={index}
            disabled={locked}
            onChange={(e) => onIndex(Number(e.target.value))}
          >
            {(group === "medals" ? c.medals : c.habitats).map((v) => (
              <option key={v.index} value={v.index}>
                {v.index}
                {"name" in v ? ` · ${v.name[lang]}` : ""}
              </option>
            ))}
          </Select>
        </label>
      )}
      <fieldset className="save-medals5-fields" disabled={!writable}>
        {group === "medals" && m ? (
          <>
            <p>
              {m.name[lang]} · {m.type[lang]}
            </p>
            <div className="save-medals5-grid">
              <label>
                <span>
                  {w.state} · {common.current}: {labelState(m.state)}
                </span>
                <Select
                  value={medal.state ?? m.state}
                  disabled={!writable}
                  onChange={(e) =>
                    setMedal({ ...medal, state: Number(e.target.value) })
                  }
                >
                  {options(w.states, medal.state ?? m.state)}
                </Select>
              </label>
              <label className="save-medals5-check">
                <input
                  type="checkbox"
                  checked={medal.unread ?? m.unread}
                  onChange={(e) =>
                    setMedal({ ...medal, unread: e.target.checked })
                  }
                />
                <span>{w.unread}</span>
              </label>
              <label>
                <span>
                  {w.date} · {common.current}:{" "}
                  {m.date ?? (m.hasDate ? t.invalidDate : t.noDate)}
                </span>
                <input
                  type="date"
                  min="2000-01-01"
                  max="2099-12-31"
                  disabled={!dateEditable}
                  value={medal.date ?? (m.validDate ? (m.date ?? "") : "")}
                  onChange={(e) => setMedal({ ...medal, date: e.target.value })}
                />
              </label>
            </div>
            <small>{m.rawHex}</small>
            <p>{t.stateNote}</p>
            {!m.validDate && m.hasDate && <p>{t.invalidDate}</p>}
          </>
        ) : group === "habitats" && h ? (
          <>
            <div className="save-medals5-grid">
              {(["grass", "surf", "fish"] as const).map((key) => (
                <label key={key}>
                  <span>{w[key]}</span>
                  <Select
                    value={habitat[key] ?? h[key]}
                    disabled={!writable}
                    onChange={(e) =>
                      setHabitat({ ...habitat, [key]: Number(e.target.value) })
                    }
                  >
                    {options(w.completion, habitat[key] ?? h[key])}
                  </Select>
                </label>
              ))}
              <label className="save-medals5-check">
                <input
                  type="checkbox"
                  checked={habitat.complete ?? h.complete}
                  onChange={(e) =>
                    setHabitat({ ...habitat, complete: e.target.checked })
                  }
                />
                <span>{w.complete}</span>
              </label>
            </div>
            <small>0x{h.raw.toString(16).toUpperCase().padStart(2, "0")}</small>
          </>
        ) : (
          <div className="save-medals5-grid">
            <label>
              <span>{w.pinned}</span>
              <Select
                value={settings.pinned ?? s.pinned}
                disabled={!writable}
                onChange={(e) =>
                  setSettings({ ...settings, pinned: Number(e.target.value) })
                }
              >
                <option value={255}>{t.none}</option>
                {c.medals.map((m) => (
                  <option key={m.index} value={m.index}>
                    {m.index} · {m.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{w.rank}</span>
              <Select
                value={settings.rank ?? s.rank}
                disabled={!writable}
                onChange={(e) =>
                  setSettings({ ...settings, rank: Number(e.target.value) })
                }
              >
                {options(w.ranks, settings.rank ?? s.rank)}
              </Select>
            </label>
            <label>
              <span>{w.lastEncounter}</span>
              <Select
                value={settings.lastEncounter ?? s.lastEncounter}
                disabled={!writable}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lastEncounter: Number(e.target.value),
                  })
                }
              >
                {options(
                  w.encounters,
                  settings.lastEncounter ?? s.lastEncounter,
                )}
              </Select>
            </label>
            {(["unknown90", "unknown92"] as const).map((key) => (
              <label key={key}>
                <span>
                  {key === "unknown90" ? "0x90" : "0x92"} · {common.current}:{" "}
                  {s[key]}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={numbers[key] ?? ""}
                  placeholder={common.keep}
                  onChange={(e) =>
                    setNumbers({ ...numbers, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            {(["tutorial", "viewed", "capture"] as const).map((key) => (
              <label className="save-medals5-check" key={key}>
                <input
                  type="checkbox"
                  checked={settings[key] ?? s[key]}
                  onChange={(e) =>
                    setSettings({ ...settings, [key]: e.target.checked })
                  }
                />
                <span>
                  {w[key]} · 0x{s[`${key}Raw`].toString(16).toUpperCase()}
                </span>
              </label>
            ))}
            <p>
              {t.calculateRank}: {w.ranks[s.calculatedRank]}
            </p>
          </div>
        )}
      </fieldset>
      <div className="save-editor-toolbar">
        <button type="button" disabled={!writable || !dirty} onClick={patch}>
          {common.preview}
        </button>
        <button
          type="button"
          disabled={busy || reading || !dirty}
          onClick={discard}
        >
          {common.discard}
        </button>
      </div>
      {group === "medals" && (
        <>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked || !c.canEdit}
              onClick={() => action("giveAll")}
            >
              {w.giveAll}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => void onExport()}
            >
              {w.exportAll} (.ml5)
            </button>
          </div>
          <label>
            <span>{w.importAll} (.ml5 · 1020 bytes)</span>
            <input
              type="file"
              accept=".ml5"
              disabled={locked || !c.canEdit}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setError("");
                if (file.size !== 1020) {
                  setError(t.importSize);
                  return;
                }
                setReading(true);
                void file
                  .arrayBuffer()
                  .then((data) => start(medals5Import(c, new Uint8Array(data))))
                  .catch(() => setError(t.importSize))
                  .finally(() => setReading(false));
              }}
            />
          </label>
          <p>{t.giveNote}</p>
        </>
      )}
      {group === "settings" && (
        <button
          type="button"
          disabled={locked || !c.canEdit}
          onClick={() => action("calculateRank")}
        >
          {t.calculateRank}
        </button>
      )}
      {group === "habitats" && (
        <details className="save-medals5-batch">
          <summary>
            {t.batch} · {selected.length}
          </summary>
          <fieldset
            className="save-medals5-fields"
            disabled={locked || !c.canEdit}
          >
            <label>
              <span>{t.range}</span>
              <Select
                value={scope}
                disabled={locked || !c.canEdit}
                onChange={(e) => setScope(e.target.value)}
              >
                <option value="selected">{t.selected}</option>
                <option value="all">{t.all}</option>
              </Select>
            </label>
            {scope === "selected" && (
              <div className="save-medals5-selection">
                {c.habitats.map((h) => (
                  <label className="save-medals5-check" key={h.index}>
                    <input
                      type="checkbox"
                      checked={selected.includes(h.index)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, h.index]
                            : selected.filter((i) => i !== h.index),
                        )
                      }
                    />
                    <span>{h.index}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={scope === "selected" && !selected.length}
                onClick={() => action("complete")}
              >
                {w.complete}
              </button>
              <button
                type="button"
                disabled={scope === "selected" && !selected.length}
                onClick={() => action("clear")}
              >
                {w.clear}
              </button>
            </div>
          </fieldset>
          <p>{t.batchNote}</p>
        </details>
      )}
      {error && (
        <p className="save-editor-error" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <section className="save-medals5-preview" aria-label={common.preview}>
          <h4>{common.changes}</h4>
          <p>
            {common.changed}: {preview.changedOffsets.length}
          </p>
          {preview.request.today && (
            <p>
              {t.frozenDate}: {preview.request.today}
            </p>
          )}
          <div className="save-medals5-changes">
            {changedMedals.map((m) => (
              <div key={m.index}>
                <p>
                  {m.index} · {m.name[lang]}:{" "}
                  {labelState(c.medals[m.index].state)} → {labelState(m.state)}{" "}
                  · {w.unread}: {boolLabel(c.medals[m.index].unread)} →{" "}
                  {boolLabel(m.unread)} · {w.date}:{" "}
                  {c.medals[m.index].date ??
                    (c.medals[m.index].hasDate ? t.invalidDate : t.noDate)}{" "}
                  → {m.date ?? (m.hasDate ? t.invalidDate : t.noDate)}
                </p>
                <small>
                  {c.medals[m.index].rawHex} → {m.rawHex}
                </small>
              </div>
            ))}
            {changedHabitats.map((h) => (
              <p key={h.index}>
                {w.habitats} {h.index}: 0x
                {c.habitats[h.index].raw.toString(16).toUpperCase()} → 0x
                {h.raw.toString(16).toUpperCase()} · {w.grass}:{" "}
                {w.completion[h.grass]} · {w.surf}: {w.completion[h.surf]} ·{" "}
                {w.fish}: {w.completion[h.fish]} · {w.complete}:{" "}
                {boolLabel(h.complete)}
              </p>
            ))}
            {Object.entries(preview.result.settings)
              .filter(([key, value]) => value !== s[key as keyof typeof s])
              .map(([key, value]) => (
                <p key={key}>
                  {settingNames[key]}:{" "}
                  {typeof s[key as keyof typeof s] === "boolean"
                    ? boolLabel(s[key as keyof typeof s] as boolean)
                    : s[key as keyof typeof s]}{" "}
                  → {typeof value === "boolean" ? boolLabel(value) : value}
                </p>
              ))}
            {!preview.changedOffsets.length && <p>{common.noChanges}</p>}
          </div>
          <details>
            <summary>{common.raw}</summary>
            <div className="save-medals5-raw">
              <p>{c.rawHex}</p>
              <p>{preview.result.rawHex}</p>
            </div>
          </details>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || reading}
              onClick={() => {
                try {
                  void onApply(medals5Frozen(c, preview));
                } catch {
                  setError(t.stale);
                }
              }}
            >
              {common.apply}
            </button>
            <button
              type="button"
              disabled={busy || reading}
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
