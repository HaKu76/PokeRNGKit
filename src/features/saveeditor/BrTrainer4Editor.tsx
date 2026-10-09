import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import {
  brTrainer4Words,
  brTrainerNumber,
  brTrainerText,
  brTrainerTime,
  brTrainerFlag,
  type BrTrainer4Catalog,
  type BrTrainer4Edit,
} from "./brTrainer4";
import { brTrainer4Labels } from "./brTrainer4Labels";
import type { Br4Lang } from "./br4";
import "./BrTrainer4Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<BrTrainer4Catalog | undefined>;
  onApply(edit: BrTrainer4Edit): Promise<void>;
};
const groups = ["GB_Profile", "GB_Records", "GB_Colosseums", "time"];
const label = (lang: Br4Lang, key: string) =>
  brTrainer4Labels[lang][key] ??
  brTrainer4Labels.en[key] ??
  key.split(".").at(-1)!;
const fieldLabel = (lang: Br4Lang, source: string) =>
  source === "OTName"
    ? lang === "zh"
      ? "训练家姓名"
      : lang === "ja"
        ? "トレーナー名"
        : "Trainer name"
    : source === "Money"
      ? label(lang, "SAV_Trainer4BR.L_Coupons")
      : source === "TID" || source === "SID"
        ? lang === "zh"
          ? source === "TID"
            ? "训练家 ID"
            : "秘密 ID"
          : source
        : label(lang, "SAV_Trainer4BR.L_" + source);
export function BrTrainer4Editor(props: Props) {
  const [view, setView] = useState({ group: 0, field: "t0" }),
    [loaded, setLoaded] = useState<{
      revision: number;
      c: BrTrainer4Catalog;
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
    <section className="save-record-editor save-brtrainer4-editor">
      <h3>{brTrainer4Words[props.lang].title}</h3>
      {loaded?.revision === props.revision ? (
        <TrainerForm
          key={props.revision}
          {...props}
          c={loaded.c}
          view={view}
          onView={setView}
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
            {brTrainer4Words[props.lang].read}
          </button>
        </div>
      )}
    </section>
  );
}
function TrainerForm({
  c,
  busy,
  lang,
  onApply,
  view,
  onView,
}: Props & {
  c: BrTrainer4Catalog;
  view: { group: number; field: string };
  onView(v: { group: number; field: string }): void;
}) {
  const w = brTrainer4Words[lang],
    [draft, setDraft] = useState<string>(),
    [raw, setRaw] = useState(false),
    [error, setError] = useState(""),
    [time, setTime] = useState<{
      hours: string;
      minutes: string;
      seconds: string;
    }>();
  const locked = busy || draft !== undefined || !!time;
  const numbers = c.numbers.filter((v) =>
      view.group === 0 ? v.id <= 5 : view.group === 1 ? v.id >= 6 : false,
    ),
    texts = view.group === 0 ? c.text : [],
    fields = [
      ...texts.map((v) => ({ key: `t${v.id}`, source: v.source })),
      ...numbers.map((v) => ({ key: `n${v.id}`, source: v.source })),
    ],
    selected = fields.find((v) => v.key === view.field) ?? fields[0],
    id = Number(selected?.key.slice(1)),
    number = selected?.key.startsWith("n")
      ? c.numbers.find((v) => v.id === id)
      : undefined,
    text = selected?.key.startsWith("t")
      ? c.text.find((v) => v.id === id)
      : undefined,
    value =
      draft ??
      (number
        ? id === 1 || id === 2
          ? String(number.value).padStart(5, "0")
          : String(number.value)
        : raw
          ? text?.hex
          : text?.value) ??
      "";
  const playerIdPreview =
    text?.id === 4 && !raw && draft !== undefined
      ? (() => {
          try {
            return brTrainerText(c, 4, value).values?.[0].value;
          } catch {
            return w.invalid;
          }
        })()
      : undefined;
  const apply = async (edit: BrTrainer4Edit) => {
      setError("");
      await onApply(edit);
    },
    submit = () => {
      try {
        if (!selected) return;
        void apply(
          number
            ? brTrainerNumber(c, id, value)
            : brTrainerText(c, id, value, raw),
        );
      } catch {
        setError(w.invalid);
      }
    };
  return (
    <>
      <label>
        <span>{w.field}</span>
        <Select
          value={view.group}
          disabled={locked}
          onChange={(e) => {
            setRaw(false);
            onView({ ...view, group: Number(e.target.value) });
          }}
        >
          {groups.map((key, i) => (
            <option key={key} value={i}>
              {key === "time" ? w.time : label(lang, "SAV_Trainer4BR." + key)}
            </option>
          ))}
        </Select>
      </label>
      <fieldset disabled={busy || !c.canEdit} className="save-brtrainer4-body">
        {view.group < 2 && selected && (
          <>
            <label>
              <span>{w.field}</span>
              <Select
                value={selected.key}
                disabled={locked}
                onChange={(e) => {
                  setRaw(false);
                  onView({ ...view, field: e.target.value });
                }}
              >
                {fields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {fieldLabel(lang, f.source)}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{fieldLabel(lang, selected.source)}</span>
              {number?.choices ? (
                <Select
                  value={value}
                  onChange={(e) => setDraft(e.target.value)}
                >
                  {!number.choices.some((v) => String(v.id) === value) && (
                    <option value={value}>
                      {w.unknown} · {value}
                    </option>
                  )}
                  {number.choices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name[lang]}
                    </option>
                  ))}
                </Select>
              ) : text?.multiline && !raw ? (
                <textarea
                  rows={3}
                  maxLength={text.maximum}
                  value={value}
                  onChange={(e) => setDraft(e.target.value)}
                />
              ) : (
                <input
                  type={number && id > 2 ? "number" : "text"}
                  min={number?.minimum}
                  max={number?.maximum}
                  step={number ? 1 : undefined}
                  inputMode={number ? "numeric" : undefined}
                  maxLength={
                    text
                      ? raw
                        ? text.bytes * 2
                        : text.maximum
                      : id <= 2
                        ? id === 0
                          ? 6
                          : 5
                        : undefined
                  }
                  value={value}
                  onChange={(e) => setDraft(e.target.value)}
                />
              )}
            </label>
            {number && !number.choices && (
              <p>
                {number.minimum} – {number.maximum}
                {(id === 1 || id === 2) && draft !== undefined
                  ? ` → ${Math.min(65535, Number(draft) || 0)}`
                  : ""}
              </p>
            )}
            {number?.id === 5 && <p>{w.languageNote}</p>}
            {playerIdPreview && (
              <p>
                {w.after}: {playerIdPreview}
              </p>
            )}
            {text && (
              <>
                <label className="save-brtrainer4-check">
                  <input
                    type="checkbox"
                    disabled={draft !== undefined}
                    checked={raw}
                    onChange={(e) => setRaw(e.target.checked)}
                  />
                  <span>{w.raw}</span>
                </label>
                <p>{w.textNote}</p>
              </>
            )}
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={draft === undefined}
                onClick={submit}
              >
                {w.apply}
              </button>
              <button
                type="button"
                disabled={draft === undefined}
                onClick={() => {
                  setDraft(undefined);
                  setError("");
                }}
              >
                {w.discard}
              </button>
              {number?.id === 0 && (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => setDraft("999999")}
                >
                  {w.maximum}
                </button>
              )}
            </div>
            <details className="save-brtrainer4-details">
              <summary>{w.before}</summary>
              <dl>
                {texts.map((v) => (
                  <div key={`t${v.id}`}>
                    <dt>{fieldLabel(lang, v.source)}</dt>
                    <dd>{v.value || "—"}</dd>
                  </div>
                ))}
                {numbers.map((v) => (
                  <div key={`n${v.id}`}>
                    <dt>{fieldLabel(lang, v.source)}</dt>
                    <dd>
                      {v.choices?.find((item) => item.id === v.value)?.name[
                        lang
                      ] ?? v.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </>
        )}
        {view.group === 2 && (
          <div className="save-brtrainer4-flags">
            {c.flags.map((enabled, i) => (
              <label key={i} className="save-brtrainer4-check">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) =>
                    void apply(brTrainerFlag(c, i, e.target.checked))
                  }
                />
                <span>
                  {i === 10
                    ? label(lang, "SAV_Trainer4BR.CHK_PostGame")
                    : fieldLabel(lang, c.numbers[10 + i].source)}
                </span>
              </label>
            ))}
          </div>
        )}
        {view.group === 3 && (
          <>
            <div className="save-brtrainer4-time">
              {(["hours", "minutes", "seconds"] as const).map((key) => (
                <label key={key}>
                  <span>
                    {label(
                      lang,
                      `SAV_Trainer4BR.L_${key[0].toUpperCase() + key.slice(1)}`,
                    )}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={key === "hours" ? 5 : 2}
                    min={0}
                    max={key === "hours" ? 65535 : 99}
                    step={1}
                    value={time?.[key] ?? c.time[key] ?? ""}
                    onChange={(e) =>
                      setTime((prev) => ({
                        ...(prev ?? {
                          hours: String(c.time.hours ?? 0),
                          minutes: String(c.time.minutes ?? 0),
                          seconds: String(c.time.seconds ?? 0),
                        }),
                        [key]: e.target.value,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            {time && (
              <p>
                {w.after}: {time.hours}:
                {String(Number(time.minutes) % 60).padStart(2, "0")}:
                {String(Number(time.seconds) % 60).padStart(2, "0")}
              </p>
            )}
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={!time}
                onClick={() => {
                  if (!time) return;
                  try {
                    void apply(
                      brTrainerTime(c, time.hours, time.minutes, time.seconds),
                    );
                  } catch {
                    setError(w.invalid);
                  }
                }}
              >
                {w.apply}
              </button>
              <button
                type="button"
                disabled={!time}
                onClick={() => setTime(undefined)}
              >
                {w.discard}
              </button>
            </div>
          </>
        )}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <p>{w.note}</p>
    </>
  );
}
