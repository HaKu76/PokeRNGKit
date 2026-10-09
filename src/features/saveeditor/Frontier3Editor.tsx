import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import {
  frontier3GlobalDraft,
  frontier3RecordDraft,
  frontier3RecordEdit,
  frontier3GlobalEdit,
  frontier3Words,
  type Frontier3Catalog,
  type Frontier3Edit,
} from "./frontier3";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<Frontier3Catalog | undefined>;
  onApply(edit: Frontier3Edit): Promise<void>;
};
export function Frontier3Editor({
  revision,
  busy,
  lang,
  onRead,
  onApply,
}: Props) {
  const reader = useRef(onRead);
  const [loaded, setLoaded] = useState<{
    revision: number;
    catalog: Frontier3Catalog;
  }>();
  const [selection, setSelection] = useState({
    facility: 0,
    mode: 0,
    record: 0,
  });
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
  const w = frontier3Words[lang];
  return (
    <section className="save-record-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === revision ? (
        <FrontierForm
          key={`${revision}:${selection.facility}:${selection.mode}:${selection.record}`}
          catalog={loaded.catalog}
          busy={busy}
          lang={lang}
          selection={selection}
          onSelection={setSelection}
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
function FrontierForm({
  catalog: c,
  busy,
  lang,
  selection: s,
  onSelection,
  onApply,
}: {
  catalog: Frontier3Catalog;
  busy: boolean;
  lang: Props["lang"];
  selection: { facility: number; mode: number; record: number };
  onSelection(v: typeof s): void;
  onApply: Props["onApply"];
}) {
  const w = frontier3Words[lang],
    facility = c.facilities.find((f) => f.id === s.facility)!,
    r = facility.records.find(
      (r) => r.mode === s.mode && r.record === s.record,
    )!;
  const [draft, setDraft] = useState(() => frontier3RecordDraft(r)),
    [globals, setGlobals] = useState(() => frontier3GlobalDraft(c)),
    [invalid, setInvalid] = useState(false);
  const recordDirty =
    draft.continue !== r.continue ||
    draft.stats.some((v, i) => v !== String(r.stats[i].value));
  const globalDirty =
      globals.pass !== c.pass ||
      globals.bp !== String(c.bp) ||
      globals.earned !== String(c.earned) ||
      globals.symbols.some((v) => v !== "keep"),
    dirty = recordDirty || globalDirty;
  const apply = (kind: "record" | "global") => {
    try {
      const edit =
        kind === "record"
          ? frontier3RecordEdit(c, s.facility, s.mode, s.record, draft)
          : frontier3GlobalEdit(c, globals);
      setInvalid(false);
      void onApply(edit);
    } catch {
      setInvalid(true);
    }
  };
  return (
    <fieldset className="save-food-fields" disabled={busy}>
      <legend className="visually-hidden">{w.title}</legend>
      <div className="save-editor-fields">
        <label className="field">
          <span>{w.facility}</span>
          <Select
            value={s.facility}
            disabled={dirty}
            onChange={(e) =>
              onSelection({
                facility: Number(e.target.value),
                mode: 0,
                record: 0,
              })
            }
          >
            {c.facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {w.facilities[f.id]}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{w.mode}</span>
          <Select
            value={s.mode}
            disabled={dirty || facility.modeCount === 1}
            onChange={(e) =>
              onSelection({ ...s, mode: Number(e.target.value) })
            }
          >
            {Array.from({ length: facility.modeCount }, (_, i) => (
              <option key={i} value={i}>
                {w.modes[i]}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{w.record}</span>
          <Select
            value={s.record}
            disabled={dirty}
            onChange={(e) =>
              onSelection({ ...s, record: Number(e.target.value) })
            }
          >
            {w.records.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <fieldset
        className="save-food-fields"
        disabled={!c.canEdit || globalDirty}
      >
        <legend>
          {w.facilities[s.facility]} · {w.modes[s.mode]} · {w.records[s.record]}
        </legend>
        <div className="save-editor-fields">
          {r.stats.map((stat, i) => (
            <label className="field" key={stat.id}>
              <span>{w.stats[stat.id]} (0–9999)</span>
              <input
                inputMode="numeric"
                maxLength={4}
                value={draft.stats[i]}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    stats: draft.stats.map((v, j) =>
                      j === i ? e.target.value : v,
                    ),
                  })
                }
              />
            </label>
          ))}
        </div>
        {r.stats.some((v) => v.value > 9999) && (
          <p className="save-editor-note">{w.old}</p>
        )}
        <label className="save-food-toggle">
          <input
            type="checkbox"
            checked={draft.continue}
            onChange={(e) => setDraft({ ...draft, continue: e.target.checked })}
          />
          <span>{w.continue}</span>
        </label>
        <div className="save-editor-toolbar">
          <button
            type="button"
            className="primary"
            disabled={!recordDirty}
            onClick={() => apply("record")}
          >
            {w.applyRecord}
          </button>
        </div>
      </fieldset>
      <fieldset
        className="save-food-fields"
        disabled={!c.canEdit || recordDirty}
      >
        <legend>{w.global}</legend>
        <label className="save-food-toggle">
          <input
            type="checkbox"
            checked={globals.pass}
            onChange={(e) => setGlobals({ ...globals, pass: e.target.checked })}
          />
          <span>{w.pass}</span>
        </label>
        <div className="save-editor-fields">
          <label className="field">
            <span>{w.bp} (0–9999)</span>
            <input
              inputMode="numeric"
              maxLength={4}
              value={globals.bp}
              onChange={(e) => setGlobals({ ...globals, bp: e.target.value })}
            />
          </label>
          <label className="field">
            <span>{w.earned} (0–65535)</span>
            <input
              inputMode="numeric"
              maxLength={5}
              value={globals.earned}
              onChange={(e) =>
                setGlobals({ ...globals, earned: e.target.value })
              }
            />
          </label>
        </div>
        {c.bp > 9999 && <p className="save-editor-note">{w.old}</p>}
        <div className="save-editor-fields">
          {c.symbols.map((symbol, i) => {
            const original = symbol.silver
              ? w.levels[symbol.gold ? 2 : 1]
              : symbol.gold
                ? w.goldOnly
                : w.levels[0];
            return (
              <label className="field" key={symbol.facility}>
                <span>{w.facilities[symbol.facility]}</span>
                <Select
                  value={globals.symbols[i]}
                  onChange={(e) =>
                    setGlobals({
                      ...globals,
                      symbols: globals.symbols.map((v, j) =>
                        j === i ? e.target.value : v,
                      ),
                    })
                  }
                >
                  <option value="keep">
                    {w.keep} · {original}
                  </option>
                  {w.levels.map((label, level) => (
                    <option key={level} value={String(level)}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>
            );
          })}
        </div>
        <div className="save-editor-toolbar">
          <button
            type="button"
            className="primary"
            disabled={!globalDirty}
            onClick={() => apply("global")}
          >
            {w.applyGlobal}
          </button>
        </div>
      </fieldset>
      {dirty && (
        <>
          <p className="save-editor-note">{w.draft}</p>
          <div className="save-editor-toolbar">
            <button
              type="button"
              onClick={() => {
                setDraft(frontier3RecordDraft(r));
                setGlobals(frontier3GlobalDraft(c));
                setInvalid(false);
              }}
            >
              {w.discard}
            </button>
          </div>
        </>
      )}
      {invalid && (
        <p className="save-editor-error" role="alert">
          {w.invalid}
        </p>
      )}
      <p className="save-editor-note">{w.note}</p>
    </fieldset>
  );
}
