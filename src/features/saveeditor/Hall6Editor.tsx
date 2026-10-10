import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { pokemonImage } from "./art";
import type { Br4Lang } from "./br4";
import { gl5Words } from "./globalLink5";
import { hall6Words } from "./hall6Words";
import {
  hall6Action,
  hall6Frozen,
  hall6Ids,
  hall6Patch,
  hall6Trash,
  hall6Value,
  type Hall6Catalog,
  type Hall6Edit,
  type Hall6Id,
  type Hall6Preview,
} from "./hall6";
import "./Hall6Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Hall6Catalog | undefined>;
  onPreview(e: Hall6Edit): Promise<Hall6Preview | undefined>;
  onApply(e: Hall6Edit): Promise<void>;
};
export function Hall6Editor(props: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Hall6Catalog }>();
  const read = useRef(props.onRead);
  useEffect(() => {
    read.current = props.onRead;
  }, [props.onRead]);
  useEffect(() => {
    let active = true;
    void read.current().then((c) => {
      if (active && c) setLoaded({ revision: props.revision, c });
    });
    return () => {
      active = false;
    };
  }, [props.revision]);
  return (
    <section className="save-record-editor save-hall6-editor">
      <h3>{hall6Words[props.lang].title}</h3>
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
          {hall6Words[props.lang].read}
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
}: Props & { c: Hall6Catalog }) {
  const w = hall6Words[lang],
    common = gl5Words[lang];
  const [team, setTeam] = useState(0),
    [member, setMember] = useState(0),
    [field, setField] = useState<Hall6Id>("Species"),
    [draft, setDraft] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState<Hall6Preview>(),
    [error, setError] = useState(""),
    [trashHex, setTrashHex] = useState(""),
    [trashText, setTrashText] = useState(""),
    [trashSpecies, setTrashSpecies] = useState(25),
    [trashLanguage, setTrashLanguage] = useState(2),
    [trashGeneration, setTrashGeneration] = useState("6"),
    [special, setSpecial] = useState(c.specialChars[0]);
  const t = c.teams[team],
    p = t.members[member],
    dirty = Object.keys(draft).length > 0,
    locked = busy || dirty || !!preview,
    writable = c.canEdit && p.editable && !busy && !preview;
  const v = draft[field] ?? hall6Value(t, p, field),
    species = Number(draft.Species ?? p.species),
    info = c.speciesInfo.find((i) => i.id === species),
    custom = (draft.Nicknamed ?? (p.nicknamed ? "1" : "0")) === "1";
  const choices =
    field === "Species"
      ? c.species
      : field === "HeldItem"
        ? c.items
        : field === "Form"
          ? (info?.forms ?? [])
          : field.startsWith("Move")
            ? c.moves
            : null;
  const change = (value: string) => {
    setError("");
    setDraft((old) => ({ ...old, [field]: value }));
  };
  const start = async (e: Hall6Edit) => {
    setError("");
    try {
      const result = await onPreview(e);
      if (result) setPreview(result);
    } catch {
      setError(w.invalid);
    }
  };
  const action = (a: "resave" | "delete") => {
    try {
      void start(hall6Action(c, team, a, member));
    } catch {
      setError(w.invalid);
    }
  };
  const trash = (a: "prepare" | "hex" | "text" | "clear" | "layer") => {
    try {
      void start(
        hall6Trash(c, team, member, {
          action: a,
          ...(a === "hex"
            ? { hex: trashHex || p.trashHex }
            : a === "text"
              ? { text: trashText }
              : a === "layer"
                ? {
                    species: trashSpecies,
                    language: trashLanguage,
                    generation: Number(trashGeneration),
                    uiLanguage: lang,
                  }
                : {}),
        }),
      );
    } catch {
      setError(w.invalid);
    }
  };
  const target = preview?.result.teams[team],
    next = target?.members[member];
  const description = () =>
    [
      w.team + " " + (team + 1),
      w.clear + ": " + t.clearIndex,
      w.date + ": " + (t.date ?? `${t.year}/${t.month}/${t.day}`),
      ...t.members
        .filter((p) => p.species !== 0)
        .map((p) =>
          [
            c.species.find((v) => v.id === p.species)?.name[lang] ??
              String(p.species),
            p.nickname,
            w.fields.Gender + ": " + ["♂", "♀", "-"][Math.min(p.gender, 2)],
            w.level + ": " + p.level,
            w.shiny + ": " + (p.shiny ? "1" : "0"),
            w.item +
              ": " +
              (c.items.find((v) => v.id === p.heldItem)?.name[lang] ??
                p.heldItem),
            ...p.moves.map(
              (id, i) =>
                w.moves +
                " " +
                (i + 1) +
                ": " +
                (c.moves.find((v) => v.id === id)?.name[lang] ?? id),
            ),
            w.fields.TrainerGender + ": " + ["♂", "♀"][p.trainerGender],
            w.trainerName +
              ": " +
              p.trainerName +
              " (" +
              p.tid +
              "/" +
              p.sid +
              ")",
          ].join("\n"),
        ),
    ].join("\n\n");
  const display = (id: Hall6Id, value: string) => {
    const options =
      id === "Species"
        ? c.species
        : id === "HeldItem"
          ? c.items
          : id.startsWith("Move")
            ? c.moves
            : null;
    return options?.find((v) => String(v.id) === value)?.name[lang] ?? value;
  };
  return (
    <div className="save-hall6-body">
      <label>
        <span>{w.team}</span>
        <Select
          value={team}
          disabled={locked}
          onChange={(e) => {
            setTeam(Number(e.target.value));
            setMember(0);
            setTrashHex("");
            setTrashText("");
          }}
        >
          {c.teams.map((t) => (
            <option key={t.index} value={t.index}>
              {String(t.index + 1).padStart(2, "0")} ·{" "}
              {t.hasData ? t.clearIndex : w.empty}
            </option>
          ))}
        </Select>
      </label>
      <div className="save-hall6-roster" role="group" aria-label={w.member}>
        {t.members.map((m) => (
          <button
            key={m.index}
            type="button"
            aria-pressed={member === m.index}
            disabled={locked}
            onClick={() => {
              setMember(m.index);
              setTrashHex("");
              setTrashText("");
            }}
          >
            <img
              src={pokemonImage(m)}
              alt={
                c.species.find((v) => v.id === m.species)?.name[lang] ??
                String(m.species)
              }
            />
            <span>
              {m.index + 1} · {m.nickname || "—"}
            </span>
          </button>
        ))}
      </div>
      {!p.editable && <p>{w.notEditable}</p>}
      <p>
        {w.clear}: {t.clearIndex} · {w.date}:{" "}
        {t.date ?? `${t.year}/${t.month}/${t.day}`} · 0x
        {t.rawIndex.toString(16).toUpperCase()}
      </p>
      <label>
        <span>{w.field}</span>
        <Select
          value={field}
          disabled={busy || !!preview}
          onChange={(e) => setField(e.target.value as Hall6Id)}
        >
          {hall6Ids.map((id) => (
            <option key={id} value={id}>
              {w.fields[id]}
              {draft[id] !== undefined ? " *" : ""}
            </option>
          ))}
        </Select>
      </label>
      <label>
        <span>{w.fields[field]}</span>
        {choices ? (
          <Select
            value={v}
            disabled={!writable || (field === "Form" && !info?.formSelectable)}
            onChange={(e) => change(e.target.value)}
          >
            {!choices.some((c) => String(c.id) === v) && (
              <option value={v}>{v}</option>
            )}
            {choices.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name[lang] || String(c.id)} · {c.id}
              </option>
            ))}
          </Select>
        ) : ["Shiny", "Nicknamed"].includes(field) ? (
          <input
            type="checkbox"
            checked={v === "1"}
            disabled={!writable}
            onChange={(e) => change(e.target.checked ? "1" : "0")}
          />
        ) : field === "Gender" || field === "TrainerGender" ? (
          <button
            type="button"
            disabled={!writable || (field === "Gender" && !info?.dualGender)}
            onClick={() =>
              change(
                String(
                  field === "Gender"
                    ? (Math.min(Number(v), 2) ^ 1) & 1
                    : Number(v) ^ 1,
                ),
              )
            }
          >
            {["♂", "♀", "-"][Math.min(Number(v), 2)]}
          </button>
        ) : (
          <input
            type={field === "Date" ? "date" : "text"}
            value={v}
            maxLength={
              field === "Nickname" || field === "TrainerName"
                ? 12
                : field === "Ec"
                  ? 8
                  : field === "Tid" || field === "Sid"
                    ? 5
                    : field === "Level" || field === "ClearIndex"
                      ? 3
                      : undefined
            }
            inputMode={
              ["Tid", "Sid", "Level", "ClearIndex"].includes(field)
                ? "numeric"
                : undefined
            }
            min={field === "Date" ? "2000-01-01" : undefined}
            max={field === "Date" ? "2050-12-31" : undefined}
            disabled={!writable || (field === "Nickname" && !custom)}
            onChange={(e) => change(e.target.value)}
          />
        )}
      </label>
      <p>
        {common.current}: {display(field, hall6Value(t, p, field))}
      </p>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={!writable || !dirty}
          onClick={() => {
            try {
              void start(
                hall6Patch(
                  c,
                  team,
                  member,
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
          disabled={busy || !dirty}
          onClick={() => {
            setDraft({});
            setError("");
          }}
        >
          {common.discard}
        </button>
        <button
          type="button"
          disabled={locked || !c.canEdit || !p.editable || !t.dateEditable}
          onClick={() => action("resave")}
        >
          {w.resave}
        </button>
        <button
          type="button"
          disabled={locked || !c.canEdit || team === 0}
          onClick={() => action("delete")}
        >
          {w.delete}
        </button>
      </div>
      <p>{w.resaveNote}</p>
      <details>
        <summary>{w.special}</summary>
        <div className="save-hall6-grid">
          <label>
            <span>{w.special}</span>
            <Select
              value={special}
              disabled={!writable}
              onChange={(e) => setSpecial(Number(e.target.value))}
            >
              {c.specialChars.map((ch) => (
                <option key={ch} value={ch}>
                  {String.fromCharCode(ch)} · U+{ch.toString(16).toUpperCase()}
                </option>
              ))}
            </Select>
          </label>
          <button
            type="button"
            disabled={
              !writable ||
              !["Nickname", "TrainerName"].includes(field) ||
              (field === "Nickname" && !custom) ||
              v.length >= 12
            }
            onClick={() => change(v + String.fromCharCode(special))}
          >
            {w.insert}
          </button>
        </div>
      </details>
      <details>
        <summary>{w.trash}</summary>
        <div className="save-hall6-trash">
          <p>{w.trashNote}</p>
          <label>
            <span>{w.raw}</span>
            <input
              value={trashHex || p.trashHex}
              maxLength={52}
              disabled={locked || !writable}
              onChange={(e) => setTrashHex(e.target.value)}
            />
          </label>
          <label>
            <span>{w.fields.Nickname}</span>
            <input
              value={trashText}
              maxLength={12}
              disabled={locked || !writable}
              onChange={(e) => setTrashText(e.target.value)}
            />
          </label>
          <div className="save-hall6-grid">
            <label>
              <span>{w.fields.Species}</span>
              <Select
                value={trashSpecies}
                disabled={locked || !writable}
                onChange={(e) => setTrashSpecies(Number(e.target.value))}
              >
                {c.trashSpecies.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{w.language}</span>
              <Select
                value={trashLanguage}
                disabled={locked || !writable}
                onChange={(e) => setTrashLanguage(Number(e.target.value))}
              >
                {c.trashLanguages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{w.generation}</span>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={trashGeneration}
                disabled={locked || !writable}
                onChange={(e) => setTrashGeneration(e.target.value)}
              />
            </label>
          </div>
          <div className="save-editor-toolbar">
            {(["prepare", "hex", "text", "clear", "layer"] as const).map(
              (a) => (
                <button
                  key={a}
                  type="button"
                  disabled={locked || !writable}
                  onClick={() => trash(a)}
                >
                  {w.trashActions[a]}
                </button>
              ),
            )}
          </div>
        </div>
      </details>
      <details>
        <summary>{w.copy}</summary>
        <pre className="save-hall6-description">{description()}</pre>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void navigator.clipboard
              .writeText(description())
              .catch(() => setError(w.copyError))
          }
        >
          {w.copy}
        </button>
      </details>
      {error && (
        <p role="alert" className="save-editor-error">
          {error}
        </p>
      )}
      {preview && target && next && (
        <section className="save-hall6-preview" aria-label={common.preview}>
          <h4>{common.changes}</h4>
          <p>
            {common.changed}: {preview.changedOffsets.length}
          </p>
          {preview.request.action === "delete" && <p>{w.deleteNote}</p>}
          <div className="save-hall6-changes">
            {hall6Ids
              .filter(
                (id) => hall6Value(t, p, id) !== hall6Value(target, next, id),
              )
              .map((id) => (
                <p key={id}>
                  {w.fields[id]}: {display(id, hall6Value(t, p, id))} →{" "}
                  {display(id, hall6Value(target, next, id))}
                </p>
              ))}
            {!preview.changedOffsets.length && <p>{common.noChanges}</p>}
          </div>
          <details>
            <summary>{w.raw}</summary>
            <div className="save-hall6-raw">
              <p>{t.rawHex}</p>
              <p>{target.rawHex}</p>
            </div>
          </details>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                try {
                  void onApply(hall6Frozen(c, preview));
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
