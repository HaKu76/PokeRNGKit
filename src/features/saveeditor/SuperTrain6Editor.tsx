import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { pokemonImage } from "./art";
import type { Br4Lang } from "./br4";
import {
  st6Record,
  st6BagChoices,
  st6Bags,
  st6Resave,
  st6Frozen,
  type St6Catalog,
  type St6Edit,
  type St6Preview,
} from "./superTrain6";
import { st6Words } from "./superTrain6Words";
import "./SuperTrain6Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<St6Catalog | undefined>;
  onPreview(e: St6Edit): Promise<St6Preview | undefined>;
  onApply(e: St6Edit): Promise<void>;
};
export function SuperTrain6Editor(props: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: St6Catalog }>(),
    [group, setGroup] = useState("records"),
    [stage, setStage] = useState(0),
    [lane, setLane] = useState(0);
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
    <section className="save-record-editor save-supertrain6-editor">
      <h3>{st6Words[props.lang].title}</h3>
      {loaded?.revision === props.revision ? (
        <Form
          key={props.revision}
          {...props}
          c={loaded.c}
          group={group}
          onGroup={setGroup}
          stage={stage}
          onStage={setStage}
          lane={lane}
          onLane={setLane}
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
          {st6Words[props.lang].read}
        </button>
      )}
    </section>
  );
}
function Form({
  c,
  group,
  onGroup,
  stage,
  onStage,
  lane,
  onLane,
  busy,
  lang,
  onPreview,
  onApply,
}: Props & {
  c: St6Catalog;
  group: string;
  onGroup(v: string): void;
  stage: number;
  onStage(v: number): void;
  lane: number;
  onLane(v: number): void;
}) {
  const w = st6Words[lang],
    row = c.stages[stage],
    holder = row.holders[lane],
    [species, setSpecies] = useState<number>(),
    [form, setForm] = useState<string>(),
    [gender, setGender] = useState<string>(),
    [time, setTime] = useState<string>(),
    [bags, setBags] = useState<Record<number, number>>({}),
    [preview, setPreview] = useState<St6Preview>(),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const dirty =
      species !== undefined ||
      form !== undefined ||
      gender !== undefined ||
      time !== undefined ||
      Object.keys(bags).length > 0,
    locked = busy || pending || !!preview,
    writable = c.canEdit && !locked;
  async function start(e: St6Edit) {
    setError("");
    setPending(true);
    try {
      const p = await onPreview(e);
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  function build(resave = false) {
    try {
      void start(
        resave
          ? st6Resave(c, lang)
          : group === "bags"
            ? st6Bags(
                c,
                lang,
                Object.entries(bags).map(([index, id]) => ({
                  index: Number(index),
                  id,
                })),
              )
            : st6Record(c, lang, stage, lane, {
                ...(species !== undefined ? { species } : {}),
                ...(form !== undefined ? { form } : {}),
                ...(gender !== undefined ? { gender } : {}),
                ...(time !== undefined ? { time } : {}),
              }),
      );
    } catch {
      setError(w.invalid);
    }
  }
  function discard() {
    setSpecies(undefined);
    setForm(undefined);
    setGender(undefined);
    setTime(undefined);
    setBags({});
    setPreview(undefined);
    setError("");
  }
  const changedStages =
      preview?.result.stages.filter((s, i) =>
        s.holders.some(
          (h, l) =>
            h.rawHex !== c.stages[i].holders[l].rawHex ||
            h.timeBits !== c.stages[i].holders[l].timeBits,
        ),
      ) ?? [],
    changedBags =
      preview?.result.bags.filter((b, i) => b.id !== c.bags[i].id) ?? [],
    choices = st6BagChoices(c, lang);
  return (
    <div className="save-supertrain6-body">
      <p>{w.note}</p>
      <label>
        <span>{w.group}</span>
        <Select
          value={group}
          disabled={locked || dirty}
          onChange={(e) => onGroup(e.target.value)}
        >
          <option value="records">{w.records}</option>
          <option value="bags">{w.bags}</option>
        </Select>
      </label>
      {group === "records" ? (
        <>
          <div className="save-supertrain6-grid">
            <label>
              <span>{w.stage}</span>
              <Select
                value={stage}
                disabled={locked || dirty}
                onChange={(e) => onStage(Number(e.target.value))}
              >
                {c.stages.map((s) => (
                  <option key={s.index} value={s.index}>
                    {s.index + 1}. {s.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{w.lane}</span>
              <Select
                value={lane}
                disabled={locked || dirty}
                onChange={(e) => onLane(Number(e.target.value))}
              >
                <option value="0">1</option>
                <option value="1">2</option>
              </Select>
            </label>
          </div>
          <div className="save-supertrain6-holders">
            {row.holders.map((h) => (
              <div key={h.lane}>
                <img src={pokemonImage(h)} alt="" width={68} height={56} />
                <span>
                  {h.lane + 1}. {h.name[lang]} ({h.species})
                </span>
                <small>
                  {w.time}: {h.time}
                </small>
              </div>
            ))}
          </div>
          <fieldset className="save-supertrain6-fields" disabled={!writable}>
            <label>
              <span>
                {w.species}: {holder.name[lang]} ({holder.species})
              </span>
              <Select
                value={species ?? holder.species}
                disabled={!writable}
                onChange={(e) => setSpecies(Number(e.target.value))}
              >
                {!c.species.some((s) => s.id === holder.species) && (
                  <option value={holder.species} disabled>
                    {holder.name[lang]}
                  </option>
                )}
                {c.species.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name[lang]} ({s.id})
                  </option>
                ))}
              </Select>
            </label>
            {(["Form", "Gender", "Time"] as const).map((id) => (
              <label key={id}>
                <span>
                  {id === "Form" ? w.form : id === "Gender" ? w.gender : w.time}
                  :{" "}
                  {id === "Form"
                    ? holder.form
                    : id === "Gender"
                      ? holder.gender
                      : holder.time}
                </span>
                <input
                  type="text"
                  maxLength={32767}
                  placeholder={w.keep}
                  value={
                    (id === "Form" ? form : id === "Gender" ? gender : time) ??
                    ""
                  }
                  onChange={(e) => {
                    (id === "Form"
                      ? setForm
                      : id === "Gender"
                        ? setGender
                        : setTime)(e.target.value);
                    setError("");
                  }}
                />
              </label>
            ))}
          </fieldset>
          <small>{w.recordNote}</small>
          <small>
            {w.symbols}: {c.numberSymbols.naN[lang]} /{" "}
            {c.numberSymbols.positiveInfinity[lang]} /{" "}
            {c.numberSymbols.negativeInfinity[lang]}
          </small>
          <small>
            {w.bits}: {holder.timeBits}
          </small>
        </>
      ) : (
        <>
          <fieldset className="save-supertrain6-fields" disabled={!writable}>
            {c.bags.map((b) => (
              <label key={b.index}>
                <span>
                  {w.slot} {b.index + 1} · {w.current}: {b.name[lang]} ({b.id})
                </span>
                <Select
                  value={bags[b.index] ?? b.id}
                  disabled={!writable}
                  onChange={(e) =>
                    setBags((old) => ({
                      ...old,
                      [b.index]: Number(e.target.value),
                    }))
                  }
                >
                  {!choices.some((v) => v.id === b.id) && (
                    <option value={b.id} disabled>
                      {b.name[lang]} ({b.id})
                    </option>
                  )}
                  {choices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name[lang]} ({v.id})
                    </option>
                  ))}
                </Select>
                {!b.sourceReadable && <small>{w.unknownBag}</small>}
              </label>
            ))}
          </fieldset>
          <small>{w.bagNote}</small>
        </>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={!writable || !dirty}
          onClick={() => build()}
        >
          {w.preview}
        </button>
        <button type="button" disabled={locked || !dirty} onClick={discard}>
          {w.discard}
        </button>
        <button
          type="button"
          disabled={!writable || dirty || c.bags.some((b) => !b.sourceReadable)}
          onClick={() => build(true)}
        >
          {w.resave}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <section className="save-supertrain6-preview" aria-label={w.changes}>
          <h4>{w.changes}</h4>
          <p>
            {w.changed}: {preview.changedOffsets.length}
          </p>
          {preview.ignoredFields.length > 0 && (
            <p>
              {w.ignored}:{" "}
              {preview.ignoredFields
                .map((f) =>
                  f === "Time" ? w.time : f === "Form" ? w.form : w.gender,
                )
                .join(" / ")}
            </p>
          )}
          {changedStages.map((s) => (
            <div key={s.index}>
              <h4>
                {s.index + 1}. {s.name[lang]}
              </h4>
              {s.holders.map((h, l) => {
                const old = c.stages[s.index].holders[l];
                if (h.rawHex === old.rawHex && h.timeBits === old.timeBits)
                  return null;
                return (
                  <div className="save-supertrain6-change" key={l}>
                    <img src={pokemonImage(h)} alt="" width={68} height={56} />
                    <p>
                      {w.lane} {l + 1} · {w.species}: {old.name[lang]} (
                      {old.species}) → {h.name[lang]} ({h.species})
                    </p>
                    <p>
                      {w.form}: {old.form} → {h.form} · {w.gender}: {old.gender}{" "}
                      → {h.gender}
                    </p>
                    <p>
                      {w.time}: {old.time} → {h.time}
                    </p>
                    <small>
                      {w.bits}: {old.timeBits} → {h.timeBits}
                    </small>
                  </div>
                );
              })}
            </div>
          ))}
          {(changedBags.length > 0 || preview.request.action !== "record") && (
            <div>
              <h4>{w.bags}</h4>
              <div className="save-supertrain6-grid">
                {preview.result.bags.map((b, i) => (
                  <p key={b.index}>
                    {w.slot} {b.index + 1}: {c.bags[i].name[lang]} (
                    {c.bags[i].id}) → {b.name[lang]} ({b.id})
                  </p>
                ))}
              </div>
            </div>
          )}
          {!preview.changedOffsets.length && <p>{w.noChanges}</p>}
          <details>
            <summary>{w.raw}</summary>
            <pre>{c.rawHex}</pre>
            <pre>{preview.result.rawHex}</pre>
          </details>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || pending}
              onClick={() => {
                try {
                  const e = st6Frozen(c, preview);
                  setPending(true);
                  void onApply(e).finally(() => setPending(false));
                } catch {
                  setError(w.stale);
                }
              }}
            >
              {w.apply}
            </button>
            <button
              type="button"
              disabled={busy || pending}
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
