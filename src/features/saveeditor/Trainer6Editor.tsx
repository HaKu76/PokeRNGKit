import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { trainerImage } from "./art";
import type { Br4Lang } from "./br4";
import {
  tr6Action,
  tr6Frozen,
  tr6Patch,
  tr6Position,
  tr6Trash,
  type Tr6Catalog,
  type Tr6Edit,
  type Tr6Preview,
} from "./trainer6";
import { trainer6Words } from "./trainer6Words";
import { saveEditorResources } from "./locales";
import {
  appearanceFieldName,
  appearanceOptionName,
} from "./trainerAppearance6Labels";
import "./Trainer6Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Tr6Catalog | undefined>;
  onPreview(e: Tr6Edit): Promise<Tr6Preview | undefined>;
  onApply(e: Tr6Edit): Promise<void>;
  onDirtyChange?(value: boolean): void;
};
export function Trainer6Editor(props: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Tr6Catalog }>();
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
    <section className="save-record-editor save-trainer6-editor">
      <h3>{trainer6Words[props.lang].title}</h3>
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
          {trainer6Words[props.lang].read}
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
  onDirtyChange,
}: Props & { c: Tr6Catalog }) {
  const w = trainer6Words[lang];
  const [group, setGroup] = useState(
      c.fields.some((f) => f.group === "sayings") ? "sayings" : "multiplayer",
    ),
    [mode, setMode] = useState(0),
    [property, setProperty] = useState("Appearance.Version"),
    [draft, setDraft] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState<Tr6Preview>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const [hex, setHex] = useState(c.nameTrash),
    [text, setText] = useState(c.basics.name),
    [species, setSpecies] = useState(25),
    [language, setLanguage] = useState(2),
    [generation, setGeneration] = useState("6");
  const dirty =
    Object.keys(draft).length > 0 ||
    hex !== c.nameTrash ||
    text !== c.basics.name;
  const locked = busy || pending || !!preview,
    writable = c.canEdit && !locked;
  useEffect(() => {
    onDirtyChange?.(dirty || pending || !!preview);
  }, [dirty, pending, preview, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const groups = [
    ...(c.fields.some((f) => f.group === "sayings")
      ? ["sayings" as const]
      : []),
    ...(c.fields.some((f) => f.group === "maison") ? ["maison" as const] : []),
    "multiplayer",
    "position",
    ...(c.fields.some((f) => f.group === "chateau")
      ? ["chateau" as const]
      : []),
    ...(c.fields.some((f) => f.group === "appearance")
      ? ["appearance" as const]
      : []),
    ...(c.fields.some((f) => f.group === "flags") ? ["flags" as const] : []),
    "trash",
  ] as const;
  const rows = c.fields.filter(
    (f) =>
      f.group === group &&
      (group !== "appearance" || f.key === property) &&
      (group !== "maison" || Math.floor(Number(f.key.slice(6)) / 4) === mode),
  );
  const changed =
    preview?.result.fields.filter(
      (f) => f.value !== c.fields.find((v) => v.key === f.key)?.value,
    ) ?? [];
  const streaks = [w.currentNormal, w.currentSuper, w.bestNormal, w.bestSuper];
  async function start(build: () => Tr6Edit) {
    setError("");
    setPending(true);
    try {
      const result = await onPreview(build());
      if (result) setPreview(result);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  function discard() {
    setDraft({});
    setHex(c.nameTrash);
    setText(c.basics.name);
    setPreview(undefined);
    setError("");
  }
  const geo = (catalog: Tr6Catalog) => {
    const g = catalog.existing.geography?.value;
    return g ? `${g.country} / ${g.region} / ${g.consoleRegion}` : "";
  };
  const playTime = (catalog: Tr6Catalog) =>
    `${catalog.existing.hours}:${catalog.existing.minutes}:${catalog.existing.seconds}`;
  return (
    <div className="save-trainer6-body">
      <p>{w.note}</p>
      <label>
        <span>{w.group}</span>
        <Select
          value={group}
          disabled={locked || dirty}
          onChange={(e) => setGroup(e.target.value)}
        >
          {groups.map((g) => (
            <option key={g} value={g}>
              {g === "multiplayer" && !c.fields.some((f) => f.key === "Sprite")
                ? (c.fields.find((f) => f.key === "Vivillon")?.name[lang] ??
                  w[g])
                : w[g]}
            </option>
          ))}
        </Select>
      </label>
      {group === "multiplayer" && c.fields.some((f) => f.key === "Sprite") && (
        <div className="save-trainer6-image">
          <img src={trainerImage(c.sprite)} alt="" width={68} height={68} />
          <span>
            {c.fields
              .find((f) => f.key === "Sprite")
              ?.choices.find(
                (v) =>
                  String(v.id) ===
                  c.fields.find((f) => f.key === "Sprite")?.value,
              )?.name[lang] ?? w.ignored}
          </span>
        </div>
      )}
      {group === "maison" && (
        <label>
          <span>{w.maison}</span>
          <Select
            value={mode}
            disabled={locked || dirty}
            onChange={(e) => setMode(Number(e.target.value))}
          >
            {Array.from({ length: 5 }, (_, i) => (
              <option key={i} value={i}>
                {c.fields.find((f) => f.key === `Maison${i * 4}`)?.name[lang]}
              </option>
            ))}
          </Select>
        </label>
      )}
      {group === "appearance" && (
        <label>
          <span>{w.appearance}</span>
          <Select
            value={property}
            disabled={locked || dirty}
            onChange={(e) => setProperty(e.target.value)}
          >
            {c.fields
              .filter((f) => f.group === "appearance")
              .map((f) => (
                <option key={f.key} value={f.key}>
                  {appearanceFieldName(f.key.slice(11), lang)}
                </option>
              ))}
          </Select>
        </label>
      )}
      {group === "position" ? (
        <>
          <p className="save-trainer6-note">
            {c.position.canEdit ? w.positionNote : w.positionUnavailable}
          </p>
          <fieldset
            className="save-trainer6-grid"
            disabled={!writable || !c.position.canEdit}
          >
            {c.position.fields.map((f) => (
              <label key={f.key}>
                <span>
                  {
                    saveEditorResources[lang].trainerSpatialNames[
                      f.key as "map" | "x" | "z" | "y" | "rotation"
                    ]
                  }
                </span>
                <input
                  value={draft[f.key] ?? f.display}
                  maxLength={32767}
                  inputMode={f.min.startsWith("-") ? "text" : "decimal"}
                  onChange={(e) =>
                    setDraft({ ...draft, [f.key]: e.target.value })
                  }
                />
                <small>
                  {f.min}–{f.max}
                </small>
              </label>
            ))}
          </fieldset>
        </>
      ) : group !== "trash" ? (
        <fieldset className="save-trainer6-grid" disabled={!writable}>
          {rows.map((f) => (
            <label key={f.key}>
              <span>
                {f.key.startsWith("Appearance.")
                  ? appearanceFieldName(f.key.slice(11), lang)
                  : f.name[lang]}
                {group === "maison"
                  ? ` ${streaks[Number(f.key.slice(6)) % 4]}`
                  : ""}
              </span>
              {f.kind === "choice" ? (
                <Select
                  value={draft[f.key] ?? f.value}
                  disabled={!writable}
                  onChange={(e) =>
                    setDraft({ ...draft, [f.key]: e.target.value })
                  }
                >
                  {!f.choices.some((v) => String(v.id) === f.value) && (
                    <option value={f.value} disabled>
                      {w.ignored}: {f.value}
                    </option>
                  )}
                  {f.choices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {f.key.startsWith("Appearance.")
                        ? appearanceOptionName(v.name.en, lang)
                        : v.name[lang]}
                    </option>
                  ))}
                </Select>
              ) : (
                <input
                  maxLength={f.maxLength}
                  inputMode={
                    f.kind === "text" || f.kind === "property"
                      ? "text"
                      : "numeric"
                  }
                  value={draft[f.key] ?? f.value}
                  onChange={(e) =>
                    setDraft({ ...draft, [f.key]: e.target.value })
                  }
                />
              )}
              {f.kind === "property" && f.choices.length > 0 && (
                <Select
                  value={draft[f.key] ?? f.value}
                  disabled={!writable}
                  onChange={(e) =>
                    setDraft({ ...draft, [f.key]: e.target.value })
                  }
                >
                  {!f.choices.some(
                    (v) => String(v.id) === (draft[f.key] ?? f.value),
                  ) && (
                    <option value={draft[f.key] ?? f.value} disabled>
                      {draft[f.key] ?? f.value}
                    </option>
                  )}
                  {f.choices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {appearanceOptionName(v.name.en, lang)}
                    </option>
                  ))}
                </Select>
              )}
            </label>
          ))}
        </fieldset>
      ) : (
        <>
          <fieldset className="save-trainer6-grid" disabled={!writable}>
            <label>
              <span>{w.text}</span>
              <input
                value={text}
                maxLength={12}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <label>
              <span>{w.hex}</span>
              <input
                value={hex}
                maxLength={52}
                spellCheck={false}
                onChange={(e) => setHex(e.target.value)}
              />
            </label>
          </fieldset>
          <div className="save-trainer6-characters">
            {c.characters.map((n) => (
              <button
                key={n}
                type="button"
                disabled={!writable || text.length >= 12}
                onClick={() => setText(text + String.fromCharCode(n))}
                aria-label={`${w.text}: ${String.fromCharCode(n)}`}
              >
                {String.fromCharCode(n)}
              </button>
            ))}
          </div>
          <fieldset className="save-trainer6-grid" disabled={!writable}>
            <label>
              <span>{w.species}</span>
              <Select
                value={species}
                disabled={!writable}
                onChange={(e) => setSpecies(Number(e.target.value))}
              >
                {c.trashSpecies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{w.language}</span>
              <Select
                value={language}
                disabled={!writable}
                onChange={(e) => setLanguage(Number(e.target.value))}
              >
                {c.trashLanguages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{w.generation}</span>
              <input
                value={generation}
                maxLength={3}
                inputMode="numeric"
                onChange={(e) => setGeneration(e.target.value)}
              />
            </label>
          </fieldset>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={!writable || hex !== c.nameTrash}
              onClick={() =>
                void start(() => tr6Trash(c, { action: "text", text }))
              }
            >
              {w.textAction}
            </button>
            <button
              type="button"
              disabled={!writable || text !== c.basics.name}
              onClick={() =>
                void start(() => tr6Trash(c, { action: "hex", hex }))
              }
            >
              {w.hexAction}
            </button>
            <button
              type="button"
              disabled={!writable || dirty}
              onClick={() =>
                void start(() => tr6Trash(c, { action: "prepare" }))
              }
            >
              {w.prepare}
            </button>
            <button
              type="button"
              disabled={!writable || dirty}
              onClick={() => void start(() => tr6Trash(c, { action: "clear" }))}
            >
              {w.clear}
            </button>
            <button
              type="button"
              disabled={!writable || dirty}
              onClick={() =>
                void start(() => {
                  if (!/^\d{1,3}$/.test(generation)) throw Error(w.invalid);
                  return tr6Trash(c, {
                    action: "layer",
                    species,
                    language,
                    generation: Number(generation),
                    uiLanguage: lang,
                  });
                })
              }
            >
              {w.layer}
            </button>
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="save-editor-toolbar">
        {group !== "trash" && (
          <button
            type="button"
            disabled={!writable || !Object.keys(draft).length}
            onClick={() =>
              void start(() =>
                (group === "position"
                  ? (fields: Tr6Edit["fields"]) => tr6Position(c, lang, fields)
                  : (fields: Tr6Edit["fields"]) => tr6Patch(c, fields))(
                  Object.entries(draft).map(([key, value]) => ({ key, value })),
                ),
              )
            }
          >
            {w.preview}
          </button>
        )}
        <button type="button" disabled={locked || !dirty} onClick={discard}>
          {w.discard}
        </button>
        <button
          type="button"
          disabled={!writable || dirty}
          onClick={() => void start(() => tr6Action(c, "resave"))}
        >
          {w.resave}
        </button>
        {c.fields.some((f) => f.key === "Style") && (
          <button
            type="button"
            disabled={!writable || dirty}
            onClick={() => void start(() => tr6Action(c, "accessories"))}
          >
            {w.accessories}
          </button>
        )}
      </div>
      <p className="save-trainer6-note">{dirty ? w.draftNote : w.resaveNote}</p>
      {preview && (
        <div className="save-trainer6-preview">
          <h4>{w.changes}</h4>
          {preview.request.action === "accessories" && <p>{w.accessories}</p>}
          <p>
            {w.changedBytes}: {preview.changedOffsets.length}
          </p>
          {preview.request.action === "position" &&
            preview.result.position.fields.map((f) => (
              <p key={f.key}>
                {
                  saveEditorResources[lang].trainerSpatialNames[
                    f.key as "map" | "x" | "z" | "y" | "rotation"
                  ]
                }
                : {c.position.fields.find((v) => v.key === f.key)?.display} →{" "}
                {f.display}
              </p>
            ))}
          {preview.ignoredFields.length > 0 && (
            <p>
              {w.ignoredInput}:{" "}
              {preview.ignoredFields
                .map(
                  (key) =>
                    saveEditorResources[lang].trainerSpatialNames[
                      key as "map" | "x" | "z" | "y" | "rotation"
                    ],
                )
                .join(" / ")}
            </p>
          )}
          {changed.map((f) => (
            <p key={f.key}>
              {f.key.startsWith("Appearance.")
                ? appearanceFieldName(f.key.slice(11), lang)
                : f.name[lang]}{" "}
              {c.fields.find((v) => v.key === f.key)?.value} →{" "}
              {f.kind === "choice"
                ? (f.choices.find((v) => String(v.id) === f.value)?.name[
                    lang
                  ] ?? f.value)
                : f.value}
            </p>
          ))}
          {preview.result.sprite !== c.sprite && (
            <img
              src={trainerImage(preview.result.sprite)}
              alt=""
              width={68}
              height={68}
            />
          )}
          {preview.result.basics.name !== c.basics.name && (
            <p>
              {w.name}: {c.basics.name} → {preview.result.basics.name}
            </p>
          )}
          {preview.result.basics.money !== c.basics.money && (
            <p>
              {w.money}: {c.basics.money} → {preview.result.basics.money}
            </p>
          )}
          {preview.result.playerModel !== c.playerModel && (
            <p>
              {w.model}: {c.playerModel} → {preview.result.playerModel}
            </p>
          )}
          {playTime(preview.result) !== playTime(c) && (
            <p>
              {w.playTime}: {playTime(c)} → {playTime(preview.result)}
            </p>
          )}
          {geo(preview.result) !== geo(c) && (
            <p>
              {w.location}: {geo(c)} → {geo(preview.result)}
            </p>
          )}
          {preview.result.existing.currencies.map((f) => (
            <p key={f.key}>
              {f.key === "bp" ? w.bp : w.pokeMiles}:{" "}
              {c.existing.currencies.find((v) => v.key === f.key)?.value} →{" "}
              {f.value}
            </p>
          ))}
          {preview.result.existing.dates.map((f) => (
            <p key={f.key}>
              {w[f.key as "started" | "fame" | "saved"]}:{" "}
              {c.existing.dates.find((v) => v.key === f.key)?.value} → {f.value}
            </p>
          ))}
          {preview.result.nameTrash !== c.nameTrash && (
            <>
              <p>{w.hex}</p>
              <code>{c.nameTrash}</code>
              <code>{preview.result.nameTrash}</code>
            </>
          )}
          {!preview.changedOffsets.length && <p>{w.noChanges}</p>}
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || pending}
              onClick={() => setPreview(undefined)}
            >
              {w.cancel}
            </button>
            <button
              type="button"
              disabled={busy || pending || !preview.changedOffsets.length}
              onClick={async () => {
                setPending(true);
                try {
                  await onApply(tr6Frozen(c, preview));
                } catch {
                  setError(w.stale);
                } finally {
                  setPending(false);
                }
              }}
            >
              {w.apply}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
