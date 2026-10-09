import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { pokemonImage } from "./art";
import {
  base3TrainerDraft,
  base3MemberDraft,
  base3TrainerEdit,
  base3MemberEdit,
  base3FormQuery,
  base3Digits,
  base3Pid,
  base3Letters,
  secretBase3Words,
  type SecretBase3Catalog,
  type SecretBase3Edit,
  type Base3Entry,
  type Base3FormQuery,
  type Base3FormSuggestion,
} from "./secretBase3";
import "./SecretBase3Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<SecretBase3Catalog | undefined>;
  onApply(edit: SecretBase3Edit): Promise<void>;
  onSuggest(query: Base3FormQuery): Promise<Base3FormSuggestion | undefined>;
};
export function SecretBase3Editor({
  revision,
  busy,
  lang,
  onRead,
  onApply,
  onSuggest,
}: Props) {
  const reader = useRef(onRead),
    [loaded, setLoaded] = useState<{
      revision: number;
      catalog: SecretBase3Catalog;
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
  }, [revision]);
  const w = secretBase3Words[lang];
  return (
    <section className="save-record-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === revision ? (
        <Workspace
          key={revision}
          catalog={loaded.catalog}
          busy={busy}
          lang={lang}
          onApply={onApply}
          onSuggest={onSuggest}
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
function Workspace({
  catalog: c,
  busy,
  lang,
  onApply,
  onSuggest,
}: {
  catalog: SecretBase3Catalog;
  busy: boolean;
  lang: Props["lang"];
  onApply: Props["onApply"];
  onSuggest: Props["onSuggest"];
}) {
  const [slot, setSlot] = useState(c.bases[0]?.slot ?? 0),
    [dirty, setDirty] = useState(false);
  const w = secretBase3Words[lang],
    b = c.bases.find((b) => b.slot === slot);
  if (!b) return <p>{w.empty}</p>;
  return (
    <div className="save-food-fields">
      <label className="field save-base3-select">
        <span>{w.base}</span>
        <Select
          value={slot}
          disabled={busy || dirty}
          onChange={(e) => setSlot(Number(e.target.value))}
        >
          {c.bases.map((b) => (
            <option key={b.slot} value={b.slot}>
              {b.slot + 1} · {b.name}
            </option>
          ))}
        </Select>
      </label>
      <EntryForm
        key={slot}
        catalog={c}
        base={b}
        busy={busy}
        lang={lang}
        onApply={onApply}
        onSuggest={onSuggest}
        onDirty={setDirty}
      />
    </div>
  );
}
function EntryForm({
  catalog: c,
  base: b,
  busy,
  lang,
  onApply,
  onSuggest,
  onDirty,
}: {
  catalog: SecretBase3Catalog;
  base: Base3Entry;
  busy: boolean;
  lang: Props["lang"];
  onApply: Props["onApply"];
  onSuggest: Props["onSuggest"];
  onDirty(v: boolean): void;
}) {
  const w = secretBase3Words[lang],
    [view, setView] = useState<"trainer" | "team">("trainer"),
    [mode, setMode] = useState<"text" | "hex">("text"),
    [trainer, setTrainer] = useState(() => base3TrainerDraft(b)),
    [member, setMember] = useState(0),
    [draft, setDraft] = useState(() => base3MemberDraft(b.members[0])),
    [wantedForm, setWantedForm] = useState(b.members[0].form),
    [preview, setPreview] = useState<Base3FormSuggestion>(),
    [invalid, setInvalid] = useState(false);
  const p = b.members[member],
    tDirty = JSON.stringify(trainer) !== JSON.stringify(base3TrainerDraft(b)),
    pDirty = JSON.stringify(draft) !== JSON.stringify(base3MemberDraft(p)),
    dirty = tDirty || pDirty,
    species = draft.species === "keep" ? p.species : Number(draft.species);
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  const chooseMember = (slot: number) => {
    setMember(slot);
    setDraft(base3MemberDraft(b.members[slot]));
    setWantedForm(b.members[slot].form);
    setPreview(undefined);
    setInvalid(false);
  };
  const apply = (kind: "trainer" | "team") => {
    try {
      const edit =
        kind === "trainer"
          ? base3TrainerEdit(c, b, trainer, mode)
          : base3MemberEdit(c, b, p, draft);
      setInvalid(false);
      void onApply(edit);
    } catch {
      setInvalid(true);
    }
  };
  const suggest = async () => {
    try {
      const query = base3FormQuery(c, b, p, draft.pid, wantedForm);
      setInvalid(false);
      const result = await onSuggest(query);
      if (result) {
        setDraft({ ...draft, pid: result.pid });
        setPreview(result);
      }
    } catch {
      setInvalid(true);
    }
  };
  return (
    <div className="save-food-fields">
      <div className="save-editor-toolbar" role="group" aria-label={w.title}>
        {(["trainer", "team"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            disabled={busy || (view !== v && dirty)}
            onClick={() => {
              setView(v);
              setInvalid(false);
            }}
          >
            {w[v]}
          </button>
        ))}
      </div>
      {view === "trainer" ? (
        <>
          <p className="save-base3-meta">
            {w.location}: {b.location} · {w.language}: {b.language} ·{" "}
            {w.classes[b.class]}
          </p>
          <label className="field save-base3-select">
            <span>{w.name}</span>
            <Select
              value={mode}
              disabled={busy || dirty}
              onChange={(e) => setMode(e.target.value as "text" | "hex")}
            >
              <option value="text">{w.text}</option>
              <option value="hex">{w.hex}</option>
            </Select>
          </label>
          <fieldset className="save-food-fields" disabled={busy || !c.canEdit}>
            <div className="save-editor-fields">
              <label className="field">
                <span>{mode === "text" ? w.name : w.hex}</span>
                <input
                  maxLength={mode === "text" ? 7 : 14}
                  value={mode === "text" ? trainer.name : trainer.hex}
                  onChange={(e) =>
                    setTrainer({
                      ...trainer,
                      ...(mode === "text"
                        ? { name: e.target.value }
                        : { hex: e.target.value }),
                    })
                  }
                />
              </label>
              {(["tid", "sid", "times"] as const).map((k) => (
                <label className="field" key={k}>
                  <span>{w[k]}</span>
                  <input
                    inputMode="numeric"
                    maxLength={k === "times" ? 3 : 5}
                    value={trainer[k]}
                    onChange={(e) =>
                      setTrainer({
                        ...trainer,
                        [k]: base3Digits(
                          e.target.value,
                          k === "times" ? 255 : 65535,
                          k === "times" ? 3 : 5,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <label className="field">
                <span>{w.gender}</span>
                <Select
                  value={trainer.gender}
                  onChange={(e) =>
                    setTrainer({ ...trainer, gender: e.target.value })
                  }
                >
                  {w.genders.map((g, i) => (
                    <option key={i} value={i}>
                      {g}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>{w.registry}</span>
                <Select
                  value={trainer.registry}
                  onChange={(e) =>
                    setTrainer({ ...trainer, registry: e.target.value })
                  }
                >
                  <option value="keep">
                    {w.keepRegistry} ({b.registry})
                  </option>
                  {w.registryStates.map((r, i) => (
                    <option key={i} value={i}>
                      {r}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <label className="save-food-toggle">
              <input
                type="checkbox"
                checked={trainer.battled}
                onChange={(e) =>
                  setTrainer({ ...trainer, battled: e.target.checked })
                }
              />
              {w.battled}
            </label>
            <div className="save-editor-toolbar">
              <button
                type="button"
                className="primary"
                disabled={!tDirty}
                onClick={() => apply("trainer")}
              >
                {w.applyTrainer}
              </button>
            </div>
          </fieldset>
          {((mode === "text" && trainer.name === "") ||
            (mode === "hex" && trainer.hex.toUpperCase().startsWith("FF"))) && (
            <p>{w.hide}</p>
          )}
        </>
      ) : (
        <>
          <div className="save-editor-toolbar save-base3-roster">
            {b.members.map((m) => (
              <button
                key={m.slot}
                type="button"
                aria-pressed={member === m.slot}
                disabled={busy || dirty}
                onClick={() => chooseMember(m.slot)}
              >
                {m.species > 0 ? <img src={pokemonImage(m)} alt="" /> : null}
                {m.slot + 1} ·{" "}
                {m.species === 0 && m.rawSpecies !== 0
                  ? w.unknown
                  : (c.speciesChoices.find((s) => s.id === m.species)?.name[
                      lang
                    ] ?? `#${m.species}`)}
              </button>
            ))}
          </div>
          <fieldset className="save-food-fields" disabled={busy || !c.canEdit}>
            <div className="save-editor-fields">
              <label className="field">
                <span>{w.species}</span>
                <Select
                  value={draft.species}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDraft({
                      ...draft,
                      species: value,
                      ...(value !== "keep" &&
                      Number(value) > 0 &&
                      p.species === 0 &&
                      Number(draft.level) < 2
                        ? { level: "2" }
                        : {}),
                    });
                    setPreview(undefined);
                  }}
                >
                  <option value="keep">
                    {w.keep} ({p.rawSpecies})
                  </option>
                  {c.speciesChoices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} · {s.name[lang]}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>{w.pid}</span>
                <input
                  maxLength={8}
                  disabled={species === 0}
                  value={draft.pid}
                  onChange={(e) => {
                    setDraft({ ...draft, pid: base3Pid(e.target.value) });
                    setPreview(undefined);
                  }}
                />
              </label>
              <label className="field">
                <span>{w.item}</span>
                <Select
                  disabled={species === 0}
                  value={draft.item}
                  onChange={(e) => setDraft({ ...draft, item: e.target.value })}
                >
                  <option value="keep">
                    {w.keep} ({p.heldItem})
                  </option>
                  {c.itemChoices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} · {s.name[lang]}
                    </option>
                  ))}
                </Select>
              </label>
              {draft.moves.map((m, i) => (
                <label className="field" key={i}>
                  <span>
                    {w.move} {i + 1}
                  </span>
                  <Select
                    disabled={species === 0}
                    value={m}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        moves: draft.moves.map((v, j) =>
                          i === j ? e.target.value : v,
                        ),
                      })
                    }
                  >
                    <option value="keep">
                      {w.keep} ({p.moves[i]})
                    </option>
                    {c.moveChoices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id} · {s.name[lang]}
                      </option>
                    ))}
                  </Select>
                </label>
              ))}
              <label className="field">
                <span>{w.level}</span>
                <input
                  inputMode="numeric"
                  maxLength={3}
                  disabled={species === 0}
                  value={draft.level}
                  onChange={(e) =>
                    setDraft({ ...draft, level: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>{w.ev}</span>
                <input
                  inputMode="numeric"
                  maxLength={2}
                  disabled={species === 0}
                  value={draft.ev}
                  onChange={(e) => setDraft({ ...draft, ev: e.target.value })}
                />
              </label>
            </div>
            {species === 201 && (
              <>
                <label className="field save-base3-select">
                  <span>
                    {w.form} · {w.originalForm}:{" "}
                    {p.species === 201 ? base3Letters[p.form] : "—"}
                  </span>
                  <Select
                    value={wantedForm}
                    onChange={(e) => setWantedForm(Number(e.target.value))}
                  >
                    {base3Letters.map((f, i) => (
                      <option key={i} value={i}>
                        {f}
                      </option>
                    ))}
                  </Select>
                </label>
                <div className="save-editor-toolbar">
                  <button type="button" onClick={() => void suggest()}>
                    {w.preview}
                  </button>
                </div>
                <p>{w.previewNote}</p>
                {preview && (
                  <div className="save-base3-preview">
                    <img
                      src={pokemonImage({
                        species: 201,
                        sprite: preview.sprite,
                      })}
                      alt=""
                    />
                    <span>
                      {w.previewed}: {preview.pid} ·{" "}
                      {base3Letters[preview.form]}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="save-editor-toolbar">
              <button
                type="button"
                className="primary"
                disabled={!pDirty}
                onClick={() => apply("team")}
              >
                {w.applyMember}
              </button>
            </div>
          </fieldset>
          {draft.species === "0" && <p>{w.clear}</p>}
          {(p.level > 100 || (p.species > 0 && p.level < 2) || p.ev > 85) && (
            <p>{w.old}</p>
          )}
        </>
      )}
      {dirty && (
        <>
          <p role="status">{w.draft}</p>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setTrainer(base3TrainerDraft(b));
                setDraft(base3MemberDraft(p));
                setPreview(undefined);
                setInvalid(false);
              }}
            >
              {w.discard}
            </button>
          </div>
        </>
      )}
      {invalid && (
        <p role="alert" className="save-editor-error">
          {w.invalid}
        </p>
      )}
      <p>{w.note}</p>
    </div>
  );
}
