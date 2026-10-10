import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { pokemonImage } from "./art";
import type { Br4Lang } from "./br4";
import type { OriginChoice } from "./domain";
import {
  sb6Choices,
  sb6Command,
  sb6File,
  sb6Frozen,
  sb6Patch,
  sb6Record,
  sb6Value,
  sb6Window,
  type Sb6Base,
  type Sb6Catalog,
  type Sb6Edit,
  type Sb6Field,
  type Sb6Preview,
} from "./secretBase6";
import { sb6Label, sb6Words, type Sb6Words } from "./secretBase6Words";
import "./SecretBase6Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Sb6Catalog | undefined>;
  onPreview(e: Sb6Edit): Promise<Sb6Preview | undefined>;
  onApply(e: Sb6Edit): Promise<void>;
  onExport(e: Sb6Edit, name: string): Promise<void>;
};
export function SecretBase6Editor(props: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Sb6Catalog }>(),
    [base, setBase] = useState(0),
    [group, setGroup] = useState("property"),
    [placement, setPlacement] = useState(0),
    [member, setMember] = useState(0);
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
    <section className="save-record-editor save-secret-base6-editor">
      <h3>{sb6Words[props.lang].title}</h3>
      {loaded?.revision === props.revision ? (
        <Form
          key={props.revision}
          {...props}
          c={loaded.c}
          baseIndex={base}
          onBase={setBase}
          group={group}
          onGroup={setGroup}
          placementIndex={placement}
          onPlacement={setPlacement}
          memberIndex={member}
          onMember={setMember}
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
          {sb6Words[props.lang].read}
        </button>
      )}
    </section>
  );
}
function Form({
  c,
  baseIndex,
  onBase,
  group,
  onGroup,
  placementIndex,
  onPlacement,
  memberIndex,
  onMember,
  busy,
  lang,
  onPreview,
  onApply,
  onExport,
}: Props & {
  c: Sb6Catalog;
  baseIndex: number;
  onBase(v: number): void;
  group: string;
  onGroup(v: string): void;
  placementIndex: number;
  onPlacement(v: number): void;
  memberIndex: number;
  onMember(v: number): void;
}) {
  const w = sb6Words[lang],
    base = c.bases[baseIndex],
    [property, setProperty] = useState("TrainerName"),
    [teamGroup, setTeamGroup] = useState("general"),
    [fields, setFields] = useState<Record<string, string>>({}),
    [record, setRecord] = useState<string>(),
    [preview, setPreview] = useState<Sb6Preview>(),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const dirty = Object.keys(fields).length > 0 || record !== undefined,
    locked = busy || pending || !!preview,
    writable = c.canEdit && !locked,
    p = base.pokemon[memberIndex],
    placement = base.placements[placementIndex],
    propertyField =
      base.properties.find((f) => f.id === property) ?? base.properties[0];
  const baseName = (b: Sb6Base) =>
    `${b.self ? w.self : `${w.base} ${b.index}`} · ${b.name.trim() || w.empty}`;
  async function start(e: Sb6Edit) {
    setError("");
    setPending(true);
    try {
      const result = await onPreview(e);
      if (result) setPreview(result);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  function run(make: () => Sb6Edit) {
    try {
      void start(make());
    } catch {
      setError(w.invalid);
    }
  }
  function discard() {
    setFields({});
    setRecord(undefined);
    setPreview(undefined);
    setError("");
  }
  function draft() {
    run(() =>
      group === "record"
        ? sb6Record(c, record ?? "")
        : sb6Patch(
            c,
            baseIndex,
            group as "property" | "placement" | "member",
            Object.entries(fields).map(([id, value]) => ({ id, value })),
            group === "placement"
              ? placementIndex
              : group === "member"
                ? memberIndex
                : undefined,
          ),
    );
  }
  function update(id: string, value: string) {
    setError("");
    setFields((old) => {
      const next = { ...old, [id]: value };
      if (group === "placement" && value.trim() === "") delete next[id];
      if (group === "member" && (id === "Species" || id === "Form")) {
        if (id === "Species") next.Form = "0";
        const info = c.speciesInfo.find(
            (x) => x.species === Number(next.Species ?? sb6Value(p, "Species")),
          ),
          form = Number(next.Form ?? sb6Value(p, "Form")),
          f = info?.formInfo.find((x) => x.index === form);
        if (info && f) {
          const fixed =
            f.fixedGender >= 0
              ? f.fixedGender
              : !info.dualGender
                ? info.fixedGender
                : -1;
          if (fixed >= 0) next.Gender = String(fixed);
          else if (Number(next.Gender ?? sb6Value(p, "Gender")) > 2)
            next.Gender = "0";
          const slot = Number(next.AbilitySlot ?? sb6Value(p, "AbilitySlot"));
          next.AbilitySlot = String(
            f.abilities.some((a) => a.id === slot) ? slot : 0,
          );
        }
      }
      return next;
    });
  }
  async function importFile(file: File) {
    setError("");
    setPending(true);
    try {
      if (![784, 992].includes(file.size))
        throw Error("Invalid SecretBase6 file.");
      const result = await onPreview(
        sb6File(c, baseIndex, new Uint8Array(await file.arrayBuffer())),
      );
      if (result) setPreview(result);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  function windowRequest(action: "resave" | "export") {
    return sb6Window(
      c,
      action,
      baseIndex,
      placementIndex,
      base.self ? undefined : memberIndex,
    );
  }
  const allowedWindow = (action: "resave" | "export") => {
    try {
      windowRequest(action);
      return true;
    } catch {
      return false;
    }
  };
  function exportFile() {
    try {
      const e = windowRequest("export"),
        location = Number(
          base.properties.find((f) => f.id === "BaseLocation")?.value ?? 0,
        ),
        number =
          (location < 0 ? "-" : "") +
          String(Math.abs(location)).padStart(2, "0"),
        name = Array.from(base.name.trim() || w.defaultTrainer, (char) =>
          char.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(char) ? "_" : char,
        ).join("");
      void onExport(e, `${number} - ${name}.sb6`);
    } catch {
      setError(w.invalid);
    }
  }
  const changedBases =
      preview?.result.bases.filter((b, i) => b.rawHex !== c.bases[i].rawHex) ??
      [],
    changedStock =
      preview?.result.stock.filter((s, i) => s.rawHex !== c.stock[i].rawHex) ??
      [];
  const scalar = (f: Sb6Field, choices?: OriginChoice[], disabled = false) => (
    <ValueField
      key={f.id}
      f={f}
      value={fields[f.id]}
      choices={choices}
      label={sb6Label(f.id, w)}
      lang={lang}
      w={w}
      disabled={!writable || disabled}
      onChange={(value) => update(f.id, value)}
    />
  );
  const selectedSpecies = p
      ? Number(fields.Species ?? sb6Value(p, "Species"))
      : 0,
    info = c.speciesInfo.find((x) => x.species === selectedSpecies),
    form = Number(
      fields.Form ??
        (fields.Species !== undefined ? "0" : p ? sb6Value(p, "Form") : 0),
    );
  return (
    <div className="save-secret-base6-body">
      <p>{w.note}</p>
      <div className="save-secret-base6-grid">
        <label>
          <span>{w.base}</span>
          <Select
            value={baseIndex}
            disabled={locked || dirty}
            onChange={(e) => {
              const i = Number(e.target.value);
              onBase(i);
              if (i === 0 && group === "member") onGroup("property");
              setProperty("TrainerName");
              setError("");
            }}
          >
            {c.bases.map((b) => (
              <option key={b.index} value={b.index}>
                {baseName(b)}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span>{w.group}</span>
          <Select
            value={group}
            disabled={locked || dirty}
            onChange={(e) => {
              onGroup(e.target.value);
              setError("");
            }}
          >
            <option value="property">{w.property}</option>
            <option value="placement">{w.placement}</option>
            {!base.self && <option value="member">{w.team}</option>}
            <option value="record">{w.record}</option>
          </Select>
        </label>
      </div>
      {group === "property" ? (
        <>
          <div className="save-secret-base6-grid">
            <label>
              <span>{w.field}</span>
              <Select
                value={propertyField.id}
                disabled={locked}
                onChange={(e) => setProperty(e.target.value)}
              >
                {base.properties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {sb6Label(f.id, w)}
                  </option>
                ))}
              </Select>
            </label>
            {scalar(
              propertyField,
              propertyField.kind === "boolean"
                ? undefined
                : (propertyField.choices ?? undefined),
            )}
          </div>
          <small>{w.textNote}</small>
          {propertyField.kind === "text" && (
            <small>
              {w.storedText}: {propertyField.storedTextMaximum}
            </small>
          )}
          <details>
            <summary>{w.current}</summary>
            <dl className="save-secret-base6-values">
              <div>
                <dt>{sb6Label("IsEmpty", w)}</dt>
                <dd>{base.isEmpty ? w.yes : w.no}</dd>
              </div>
              <div>
                <dt>{sb6Label("IsDummiedLocation", w)}</dt>
                <dd>{base.isDummiedLocation ? w.yes : w.no}</dd>
              </div>
              {base.properties.map((f) => (
                <div key={f.id}>
                  <dt>{sb6Label(f.id, w)}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        </>
      ) : group === "placement" ? (
        <>
          <label>
            <span>{w.slot}</span>
            <Select
              value={placementIndex}
              disabled={locked || dirty}
              onChange={(e) => onPlacement(Number(e.target.value))}
            >
              {base.placements.map((p) => (
                <option key={p.index} value={p.index}>
                  {p.index + 1}
                </option>
              ))}
            </Select>
          </label>
          <fieldset className="save-secret-base6-fields" disabled={!writable}>
            {(["Good", "X", "Y", "Rotation"] as const).map((id) =>
              scalar({
                id,
                kind: "number",
                value: String(
                  placement[
                    id.toLowerCase() as "good" | "x" | "y" | "rotation"
                  ],
                ),
                minimum: id === "Good" ? -1 : 0,
                maximum: id === "Rotation" ? 255 : 65535,
                textMaximum: id === "Good" ? 6 : id === "Rotation" ? 3 : 5,
                storedTextMaximum: 0,
                choices: null,
              }),
            )}
          </fieldset>
          <small>
            {w.param}: {placement.param1} / {placement.param2}
          </small>
          <small>{w.placementNote}</small>
        </>
      ) : group === "member" && p ? (
        <>
          <Team base={base} lang={lang} />
          <div className="save-secret-base6-grid">
            <label>
              <span>{w.slot}</span>
              <Select
                value={memberIndex}
                disabled={locked || dirty}
                onChange={(e) => onMember(Number(e.target.value))}
              >
                {base.pokemon.map((p) => (
                  <option key={p.index} value={p.index}>
                    {p.index + 1}. {p.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{w.group}</span>
              <Select
                value={teamGroup}
                disabled={locked}
                onChange={(e) => setTeamGroup(e.target.value)}
              >
                <option value="general">{w.general}</option>
                <option value="moves">{w.moves}</option>
                <option value="stats">{w.stats}</option>
              </Select>
            </label>
          </div>
          <fieldset className="save-secret-base6-fields" disabled={!writable}>
            {p.fields
              .filter((f) =>
                teamGroup === "moves"
                  ? /^(Move|PP)[1-4]$/.test(f.id)
                  : teamGroup === "stats"
                    ? /^(IV|EV)_/.test(f.id)
                    : !/^(Move|PP)[1-4]$|^(IV|EV)_/.test(f.id),
              )
              .map((f) => {
                const choices = sb6Choices(c, p, f.id, fields);
                let v = f;
                if (f.id === "Form" && fields.Species !== undefined)
                  v = { ...f, value: "0" };
                if (f.id === "Gender") {
                  const fix =
                    info?.formInfo.find((f) => f.index === form)?.fixedGender ??
                    -1;
                  if (fix >= 0) v = { ...f, value: String(fix) };
                  else if (info && !info.dualGender)
                    v = { ...f, value: String(info.fixedGender) };
                }
                return scalar(
                  v,
                  choices,
                  f.id === "Form" && !info?.formSelectable,
                );
              })}
          </fieldset>
          <small>
            {w.linkedEgg} · {w.current}: {p.isEgg ? w.yes : w.no}
          </small>
        </>
      ) : group === "record" ? (
        <>
          <p>
            {w.current}: {c.capturedRecord} · {w.rawCaptured}:{" "}
            {c.rawCapturedRecord}
          </p>
          <label>
            <span>{w.captured}</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder={w.keep}
              disabled={!writable}
              value={record ?? ""}
              onChange={(e) => {
                setRecord(e.target.value === "" ? undefined : e.target.value);
                setError("");
              }}
            />
          </label>
          <small>{w.recordNote}</small>
        </>
      ) : null}
      <div className="save-editor-toolbar">
        <button type="button" disabled={!writable || !dirty} onClick={draft}>
          {w.preview}
        </button>
        <button type="button" disabled={locked || !dirty} onClick={discard}>
          {w.discard}
        </button>
        <button
          type="button"
          disabled={!writable || dirty || !allowedWindow("resave")}
          onClick={() => run(() => windowRequest("resave"))}
        >
          {w.resave}
        </button>
      </div>
      <div className="save-editor-toolbar">
        <label className="save-secret-base6-import">
          <span>{w.import}</span>
          <input
            type="file"
            accept=".sb6"
            disabled={!writable || dirty}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void importFile(f);
            }}
          />
        </label>
        <button
          type="button"
          disabled={locked || dirty || !allowedWindow("export")}
          onClick={exportFile}
        >
          {w.export}
        </button>
        <button
          type="button"
          disabled={!writable || dirty || base.self}
          onClick={() => run(() => sb6Command(c, "delete", baseIndex))}
        >
          {w.delete}
        </button>
        <button
          type="button"
          disabled={!writable || dirty}
          onClick={() => run(() => sb6Command(c, "goods"))}
        >
          {w.goods}
        </button>
      </div>
      <small>{w.resaveNote}</small>
      <small>{w.fileNote}</small>
      <details>
        <summary>{w.stock}</summary>
        <div className="save-secret-base6-stock">
          {c.stock.map((s) => (
            <p key={s.index}>
              {s.index + 1}: {w.quantity} {s.count} · {w.newFlag}{" "}
              {s.isNew ? w.yes : w.no}
            </p>
          ))}
        </div>
      </details>
      <details>
        <summary>{w.raw}</summary>
        <pre>
          {group === "member" && p
            ? p.rawHex
            : group === "placement"
              ? placement.rawHex
              : base.rawHex}
        </pre>
      </details>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <section className="save-secret-base6-preview" aria-label={w.changes}>
          <h4>{w.changes}</h4>
          <p>
            {w.changed}: {preview.changedOffsets.length}
          </p>
          {preview.result.capturedRecord !== c.capturedRecord && (
            <p>
              {w.captured}: {c.capturedRecord} → {preview.result.capturedRecord}{" "}
              ({preview.result.rawCapturedRecord})
            </p>
          )}
          {changedBases.map((after) => {
            const before = c.bases[after.index];
            const properties = after.properties.filter(
                (f) =>
                  f.value !==
                  before.properties.find((p) => p.id === f.id)?.value,
              ),
              placements = after.placements.filter(
                (p, i) => p.rawHex !== before.placements[i].rawHex,
              ),
              members = after.pokemon.filter(
                (p, i) => p.rawHex !== before.pokemon[i].rawHex,
              );
            return (
              <div className="save-secret-base6-change" key={after.index}>
                <h4>{baseName(after)}</h4>
                {properties.map((f) => (
                  <p key={f.id}>
                    {sb6Label(f.id, w)}:{" "}
                    {before.properties.find((p) => p.id === f.id)?.value} →{" "}
                    {f.value}
                  </p>
                ))}
                {placements.map((p) => (
                  <p key={p.index}>
                    {w.placement} {p.index + 1}:{" "}
                    {before.placements[p.index].good}/
                    {before.placements[p.index].x}/
                    {before.placements[p.index].y}/
                    {before.placements[p.index].rotation} → {p.good}/{p.x}/{p.y}
                    /{p.rotation}
                  </p>
                ))}
                {members.length > 0 && <Team base={after} lang={lang} />}{" "}
                {members.map((p) => (
                  <div key={p.index}>
                    <strong>
                      {w.slot} {p.index + 1}
                    </strong>
                    {p.isEgg !== before.pokemon[p.index].isEgg && (
                      <p>
                        {w.linkedEgg}:{" "}
                        {before.pokemon[p.index].isEgg ? w.yes : w.no}
                        {" → "}
                        {p.isEgg ? w.yes : w.no}
                      </p>
                    )}
                    {p.fields
                      .filter(
                        (f) =>
                          f.value !==
                          before.pokemon[p.index].fields.find(
                            (v) => v.id === f.id,
                          )?.value,
                      )
                      .map((f) => (
                        <p key={f.id}>
                          {sb6Label(f.id, w)}:{" "}
                          {
                            before.pokemon[p.index].fields.find(
                              (v) => v.id === f.id,
                            )?.value
                          }{" "}
                          → {f.value}
                        </p>
                      ))}
                  </div>
                ))}
                <details>
                  <summary>{w.raw}</summary>
                  <pre>{before.rawHex}</pre>
                  <pre>{after.rawHex}</pre>
                </details>
              </div>
            );
          })}
          {changedStock.length > 0 && (
            <details>
              <summary>
                {w.stock}: {changedStock.length}
              </summary>
              <div className="save-secret-base6-stock">
                {changedStock.map((s) => (
                  <p key={s.index}>
                    {s.index + 1}: {c.stock[s.index].count}/
                    {c.stock[s.index].isNew ? w.yes : w.no} → {s.count}/
                    {s.isNew ? w.yes : w.no}
                    <small>
                      {c.stock[s.index].rawHex} → {s.rawHex}
                    </small>
                  </p>
                ))}
              </div>
            </details>
          )}
          {!preview.changedOffsets.length && <p>{w.noChanges}</p>}
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || pending}
              onClick={() => {
                try {
                  const e = sb6Frozen(c, preview);
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
function ValueField({
  f,
  value,
  choices,
  label,
  lang,
  w,
  disabled,
  onChange,
}: {
  f: Sb6Field;
  value?: string;
  choices?: OriginChoice[];
  label: string;
  lang: Br4Lang;
  w: Sb6Words;
  disabled: boolean;
  onChange(v: string): void;
}) {
  const [custom, setCustom] = useState(false),
    current = value ?? f.value;
  return (
    <label>
      <span>
        {label} · {w.current}: {f.value}
      </span>
      {f.kind === "boolean" ? (
        <Select
          value={current}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="0">{w.no}</option>
          <option value="1">{w.yes}</option>
        </Select>
      ) : choices && !custom ? (
        <Select
          value={current}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.value === "custom") {
              setCustom(true);
              return;
            }
            onChange(e.target.value);
          }}
        >
          {!choices.some((v) => String(v.id) === current) && (
            <option value={current} disabled>
              {w.original}: {current}
            </option>
          )}
          {choices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name[lang]} ({v.id})
            </option>
          ))}
          {f.kind === "enum" && <option value="custom">{w.custom}</option>}
        </Select>
      ) : (
        <input
          type="text"
          inputMode={
            f.kind === "number" && f.minimum >= 0 && f.textMaximum < 20
              ? "numeric"
              : undefined
          }
          maxLength={f.textMaximum}
          disabled={disabled}
          value={value ?? ""}
          placeholder={w.keep}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function Team({ base, lang }: { base: Sb6Base; lang: Br4Lang }) {
  return (
    <ul className="save-secret-base6-team" aria-label={sb6Words[lang].team}>
      {base.pokemon.map((p) => (
        <li key={p.index}>
          <img src={pokemonImage(p)} alt="" width={68} height={56} />
          <span>
            {p.index + 1}. {p.name[lang]} ({p.species})
            {sb6Value(p, "Shiny") === "1" && " ☆"}
          </span>
        </li>
      ))}
    </ul>
  );
}
