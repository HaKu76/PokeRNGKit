import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { saveRecordName } from "./recordNames";
import {
  gameRecord3Draft,
  gameRecord3Edit,
  packFameTime3,
  gameRecords3Words,
  type GameRecord3Catalog,
  type GameRecord3Edit,
} from "./gameRecords3";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<GameRecord3Catalog | undefined>;
  onApply(edit: GameRecord3Edit): Promise<void>;
};
export function GameRecords3Editor({
  revision,
  busy,
  lang,
  onRead,
  onApply,
}: Props) {
  const reader = useRef(onRead);
  const [loaded, setLoaded] = useState<{
    revision: number;
    catalog: GameRecord3Catalog;
  }>();
  const [index, setIndex] = useState(0);
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
  const w = gameRecords3Words[lang];
  return (
    <section className="save-record-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === revision ? (
        <RecordForm
          key={`${revision}:${index}`}
          catalog={loaded.catalog}
          index={index}
          busy={busy}
          lang={lang}
          onIndex={setIndex}
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
    </section>
  );
}
function RecordForm({
  catalog,
  index,
  busy,
  lang,
  onIndex,
  onApply,
}: {
  catalog: GameRecord3Catalog;
  index: number;
  busy: boolean;
  lang: Props["lang"];
  onIndex(n: number): void;
  onApply: Props["onApply"];
}) {
  const w = gameRecords3Words[lang],
    entry = catalog.entries.find((e) => e.index === index)!;
  const [mode, setMode] = useState<"value" | "time">("value"),
    [draft, setDraft] = useState(() => gameRecord3Draft(catalog, index)),
    [invalid, setInvalid] = useState(false);
  const initial = gameRecord3Draft(catalog, index),
    dirty =
      mode === "value"
        ? draft.value !== initial.value
        : (["hours", "minutes", "seconds"] as const).some(
            (k) => draft[k] !== initial[k],
          );
  const originalTimeIsOutside =
    catalog.time.rawHours > 9999 ||
    catalog.time.rawMinutes > 59 ||
    catalog.time.rawSeconds > 59;
  const canApply =
    dirty ||
    (mode === "time" &&
      packFameTime3(
        Number(draft.hours),
        Number(draft.minutes),
        Number(draft.seconds),
      ) !== entry.value);
  const apply = () => {
    try {
      const edit = gameRecord3Edit(catalog, index, mode, draft);
      setInvalid(false);
      void onApply(edit);
    } catch {
      setInvalid(true);
    }
  };
  return (
    <fieldset className="save-food-fields" disabled={busy}>
      <legend className="visually-hidden">{w.title}</legend>
      <label className="field">
        <span>{w.record}</span>
        <Select
          value={index}
          disabled={dirty}
          onChange={(e) => onIndex(Number(e.target.value))}
        >
          {catalog.entries.map((e) => (
            <option key={e.index} value={e.index}>
              {e.index} · {saveRecordName(e.name, lang)}
            </option>
          ))}
        </Select>
      </label>
      {index === 1 && (
        <label className="field">
          <span>{w.mode}</span>
          <Select
            value={mode}
            disabled={dirty}
            onChange={(e) => {
              setMode(e.target.value as "value" | "time");
              setInvalid(false);
            }}
          >
            <option value="value">{w.raw}</option>
            <option value="time">{w.time}</option>
          </Select>
        </label>
      )}
      <fieldset className="save-food-fields" disabled={!catalog.canEdit}>
        <legend>{saveRecordName(entry.name, lang)}</legend>
        {mode === "value" ? (
          <label className="field">
            <span>{w.value} (0–4294967295)</span>
            <input
              inputMode="numeric"
              maxLength={10}
              value={draft.value}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
            />
          </label>
        ) : (
          <>
            <div className="save-editor-fields">
              {(["hours", "minutes", "seconds"] as const).map((k) => (
                <label className="field" key={k}>
                  <span>
                    {w[k]} (0–{k === "hours" ? 9999 : 59})
                  </span>
                  <input
                    inputMode="numeric"
                    maxLength={k === "hours" ? 4 : 2}
                    value={draft[k]}
                    onChange={(e) =>
                      setDraft({ ...draft, [k]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            {originalTimeIsOutside && (
              <p className="save-editor-note">{w.oldTime}</p>
            )}
          </>
        )}
      </fieldset>
      {dirty && <p className="save-editor-note">{w.draft}</p>}
      {invalid && (
        <p className="save-editor-error" role="alert">
          {w.invalid}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          className="primary"
          disabled={!catalog.canEdit || !canApply}
          onClick={apply}
        >
          {w.apply}
        </button>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => {
            setDraft(initial);
            setInvalid(false);
          }}
        >
          {w.discard}
        </button>
      </div>
      <details>
        <summary>{w.source}</summary>
        <p>{entry.name}</p>
      </details>
      <p className="save-editor-note">{w.note}</p>
    </fieldset>
  );
}
