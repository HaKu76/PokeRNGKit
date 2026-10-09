import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { pokemonImage, speciesImage } from "./art";
import { ath4Labels } from "./pokeathlon4Labels";
import {
  ath4Words,
  ath4CourseNames,
  ath4EventNames,
  ath4Changed,
  ath4Batch,
  ath4PokemonPatch,
  ath4TrainerPatch,
  ath4PokemonDirty,
  ath4TrainerDirty,
  ath4Id,
  ath4Pid,
  type Pokeathlon4Catalog,
  type Pokeathlon4Edit,
  type Ath4Lang,
  type Ath4Pokemon,
  type Ath4Trainer,
} from "./pokeathlon4";
import "./Pokeathlon4Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Ath4Lang;
  onRead(): Promise<Pokeathlon4Catalog | undefined>;
  onApply(edit: Pokeathlon4Edit): Promise<void>;
};
type Common = {
  c: Pokeathlon4Catalog;
  busy: boolean;
  lang: Ath4Lang;
  onApply: Props["onApply"];
  onDirty(dirty: boolean): void;
};
const label = (lang: Ath4Lang, key: string) =>
  ath4Labels[lang][key] ??
  ath4Labels.en[key] ??
  key.split(".").at(-1)!.replaceAll("_", " ");
const baseLabel = (lang: Ath4Lang, key: string) =>
  label(lang, `SAV_Pokeathlon4.${key}`);
const groups = [
  "General",
  "Medals",
  "Counters",
  "Best",
  "Courses",
  "SelfEvent",
  "Connection",
] as const;
type Selection = {
  group: (typeof groups)[number];
  index: number;
  object: string;
  slot: number;
  member: number;
};
export function Pokeathlon4Editor({
  revision,
  busy,
  lang,
  onRead,
  onApply,
}: Props) {
  const reader = useRef(onRead),
    [loaded, setLoaded] = useState<{
      revision: number;
      c: Pokeathlon4Catalog;
    }>(),
    [selection, setSelection] = useState<Selection>({
      group: "General",
      index: 0,
      object: "points",
      slot: 0,
      member: 0,
    });
  useEffect(() => {
    reader.current = onRead;
  }, [onRead]);
  useEffect(() => {
    let active = true;
    void reader.current().then((c) => {
      if (active && c) setLoaded({ revision, c });
    });
    return () => {
      active = false;
    };
  }, [revision]);
  return (
    <section className="save-record-editor">
      <h3>{label(lang, "SAV_Pokeathlon4")}</h3>
      {loaded?.revision === revision ? (
        <Workspace
          key={revision}
          c={loaded.c}
          busy={busy}
          lang={lang}
          onApply={onApply}
          selection={selection}
          onSelection={(patch) =>
            setSelection((previous) => ({ ...previous, ...patch }))
          }
        />
      ) : (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void onRead().then((c) => {
                if (c) setLoaded({ revision, c });
              })
            }
          >
            {ath4Words[lang].read}
          </button>
        </div>
      )}
    </section>
  );
}
function Workspace({
  c,
  busy,
  lang,
  onApply,
  selection,
  onSelection,
}: Omit<Common, "onDirty"> & {
  selection: Selection;
  onSelection(patch: Partial<Selection>): void;
}) {
  const w = ath4Words[lang],
    [locked, setLocked] = useState(false);
  const { group, index, object, slot, member } = selection;
  const setGroup = (group: Selection["group"]) => onSelection({ group }),
    setIndex = (index: number) => onSelection({ index }),
    setObject = (object: string) => onSelection({ object }),
    setSlot = (slot: number) => onSelection({ slot }),
    setMember = (member: number) => onSelection({ member });
  const common = { c, busy, lang, onApply, onDirty: setLocked };
  const modes =
    group === "General"
      ? [
          { id: "points", name: baseLabel(lang, "L_Points") },
          { id: "shop", name: baseLabel(lang, "L_DailyShopFlags") },
          { id: "cards", name: baseLabel(lang, "L_DataCards") },
        ]
      : group === "Medals"
        ? [
            { id: "species", name: baseLabel(lang, "DGV_Species") },
            { id: "batch", name: w.preview },
          ]
        : group === "Courses"
          ? [
              { id: "scores", name: w.score },
              { id: "participant", name: w.participant },
            ]
          : group === "SelfEvent" || group === "Connection"
            ? [
                { id: "attempts", name: w.attempts },
                { id: "record", name: w.score },
                { id: "entry", name: w.participant },
                ...(group === "Connection"
                  ? [{ id: "trainer", name: w.trainer }]
                  : []),
              ]
            : [];
  const indexChoices =
    group === "Medals" && object === "species"
      ? c.speciesChoices
          .filter((v) => v.id > 0)
          .map((v) => ({ id: v.id - 1, name: v.name[lang] }))
      : group === "Courses"
        ? ath4CourseNames.map((v, id) => ({
            id,
            name: label(lang, `PokeathlonStat4.${v}`),
          }))
        : group === "Best" || group === "SelfEvent" || group === "Connection"
          ? ath4EventNames.map((v, id) => ({
              id,
              name: label(lang, `PokeathlonEvent4.${v}`),
            }))
          : group === "Counters"
            ? c.counters.map((v, id) => ({
                id,
                name: baseLabel(lang, `L_${v.source}`),
              }))
            : group === "General" && object === "shop"
              ? Array.from({ length: 12 }, (_, id) => ({
                  id,
                  name: `${w.shop} ${id + 1}`,
                }))
              : group === "General" && object === "cards"
                ? c.cardChoices.map((v) => ({ id: v.id, name: v.name[lang] }))
                : [];
  const connection = group === "Connection",
    event = (connection ? c.connections : c.personal)[index],
    key = `${group}-${object}-${index}-${slot}-${member}`;
  let body;
  if (group === "General") {
    const original =
        object === "points"
          ? [c.points]
          : object === "shop"
            ? [(c.dailyFlags >> index) & 1]
            : [(c.cardFlags >>> index) & 1],
      id = object === "points" ? 0 : object === "shop" ? index + 1 : index + 13;
    body = (
      <>
        <NumberForm
          key={key}
          {...common}
          original={original}
          names={[
            object === "points"
              ? baseLabel(lang, "L_Points")
              : indexChoices[index].name,
          ]}
          maximum={() => (object === "points" ? 99999 : 1)}
          toggle={object !== "points"}
          build={(values) => ({
            action: "general",
            values: values.map((v) => ({ ...v, id })),
          })}
        />
        {object === "cards" && (
          <>
            <p>{w.cardNote}</p>
            <p>
              {w.source}: {c.cardStats[index]}
            </p>
          </>
        )}
      </>
    );
  } else if (group === "Medals")
    body =
      object === "batch" ? (
        <MedalBatch key={key} {...common} />
      ) : (
        <>
          <div className="save-ath4-sprite">
            <img src={speciesImage(index + 1)} alt="" />
            <span>{indexChoices[index].name}</span>
          </div>
          <NumberForm
            key={key}
            {...common}
            original={ath4CourseNames.map((_, i) => (c.medals[index] >> i) & 1)}
            names={ath4CourseNames.map((v) =>
              label(lang, `PokeathlonStat4.${v}`),
            )}
            maximum={() => 1}
            toggle
            build={(values) => ({ action: "medal", index: index + 1, values })}
          />
          <p>
            {w.source}: {c.medals[index]}
          </p>
        </>
      );
  else if (group === "Counters")
    body = (
      <>
        <NumberForm
          key={key}
          {...common}
          original={[c.counters[index].value]}
          names={[
            indexChoices[index].name + (index === 0 ? ` (${w.minutes})` : ""),
          ]}
          maximum={() => c.counters[index].maximum}
          build={(values) => ({
            action: "counters",
            values: values.map((v) => ({ ...v, id: index })),
          })}
        />
        <p>
          {w.total}: {c.totalFirst}
        </p>
      </>
    );
  else if (group === "Best")
    body = (
      <NumberForm
        key={key}
        {...common}
        original={[c.best[index]]}
        names={[indexChoices[index].name]}
        maximum={() => 65535}
        build={(values) => ({
          action: "best",
          values: values.map((v) => ({ ...v, id: index })),
        })}
      />
    );
  else if (group === "Courses")
    body =
      object === "scores" ? (
        <NumberForm
          key={key}
          {...common}
          original={c.courses[index].scores}
          names={[0, 1, 2, "Max"].map((v) =>
            baseLabel(lang, `L_CourseScore${v}`),
          )}
          maximum={() => 65535}
          build={(values) => ({ action: "course", index, values })}
        />
      ) : (
        <>
          <Roster
            {...common}
            members={c.courses[index].members}
            selected={member}
            locked={locked}
            onSelect={setMember}
          />
          <PokemonForm
            key={key}
            {...common}
            p={c.courses[index].members[member]}
            participant
            build={(pokemon) => ({
              action: "participant",
              index,
              slot: member,
              pokemon,
            })}
          />
        </>
      );
  else if (object === "attempts")
    body = (
      <NumberForm
        key={key}
        {...common}
        original={[event.attempts]}
        names={[w.attempts]}
        maximum={() => 9999999}
        build={(values) => ({ action: "attempts", index, connection, values })}
      />
    );
  else if (object === "record")
    body = (
      <>
        <NumberForm
          key={key}
          {...common}
          original={[event.records[slot].value]}
          names={[w.score]}
          maximum={() => 65535}
          build={(values) => ({
            action: "record",
            index,
            slot,
            connection,
            values,
          })}
        />
        {index === 0 && <p>{w.hurdle}</p>}
      </>
    );
  else if (object === "trainer")
    body = (
      <TrainerForm
        key={key}
        {...common}
        t={event.trainers![slot]}
        index={index}
        slot={slot}
      />
    );
  else
    body = (
      <>
        <Roster
          {...common}
          members={event.records[slot].members}
          selected={member}
          locked={locked}
          onSelect={setMember}
        />
        <PokemonForm
          key={key}
          {...common}
          p={event.records[slot].members[member]}
          participant={false}
          build={(pokemon) => ({
            action: "entry",
            index,
            slot,
            member,
            connection,
            pokemon,
          })}
        />
      </>
    );
  return (
    <div className="save-food-fields">
      <div className="save-editor-fields">
        <label className="field">
          <span>{w.section}</span>
          <Select
            value={group}
            disabled={busy || locked}
            onChange={(e) => {
              const g = e.target.value as typeof group;
              setGroup(g);
              setIndex(0);
              setSlot(0);
              setMember(0);
              setObject(
                g === "General"
                  ? "points"
                  : g === "Medals"
                    ? "species"
                    : g === "Courses"
                      ? "scores"
                      : "attempts",
              );
            }}
          >
            {groups.map((g) => (
              <option key={g} value={g}>
                {baseLabel(lang, `Tab_${g}`)}
              </option>
            ))}
          </Select>
        </label>
        {modes.length > 0 && (
          <label className="field">
            <span>{w.object}</span>
            <Select
              value={object}
              disabled={busy || locked}
              onChange={(e) => {
                setObject(e.target.value);
                if (group === "General") setIndex(0);
              }}
            >
              {modes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </label>
        )}
        {indexChoices.length > 0 && (
          <label className="field">
            <span>
              {baseLabel(
                lang,
                group === "Courses"
                  ? "L_CourseIndex"
                  : group === "Connection"
                    ? "L_ConnectionIndex"
                    : "L_SelfEventIndex",
              )}
            </span>
            <Select
              value={index}
              disabled={busy || locked}
              onChange={(e) => {
                setIndex(Number(e.target.value));
                setSlot(0);
                setMember(0);
              }}
            >
              {indexChoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id + 1} · {v.name}
                </option>
              ))}
            </Select>
          </label>
        )}
        {(group === "SelfEvent" || group === "Connection") &&
          object !== "attempts" && (
            <label className="field">
              <span>{object === "trainer" ? w.trainer : w.record}</span>
              <Select
                value={slot}
                disabled={busy || locked}
                onChange={(e) => {
                  setSlot(Number(e.target.value));
                  setMember(0);
                }}
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </Select>
            </label>
          )}
      </div>
      {body}
      {locked && <p role="status">{w.draft}</p>}
      <details className="save-ath4-details">
        <summary>{w.summary}</summary>
        <dl className="save-editor-summary">
          {[
            [w.global, c.globalScore],
            [w.trophies, c.trophies],
            [w.fame, c.fameLevel],
          ].map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </details>
      <p>{w.note}</p>
    </div>
  );
}
function ActionBar({
  dirty,
  invalid,
  onApply,
  onDiscard,
  lang,
}: {
  dirty: boolean;
  invalid: boolean;
  onApply(): void;
  onDiscard(): void;
  lang: Ath4Lang;
}) {
  const w = ath4Words[lang];
  return (
    <>
      <div className="save-editor-toolbar">
        <button
          type="button"
          className="primary"
          disabled={!dirty}
          onClick={onApply}
        >
          {w.apply}
        </button>
        <button type="button" disabled={!dirty} onClick={onDiscard}>
          {w.discard}
        </button>
      </div>
      {invalid && (
        <p role="alert" className="save-editor-error">
          {w.invalid}
        </p>
      )}
    </>
  );
}
function NumberForm({
  c,
  busy,
  lang,
  onApply,
  onDirty,
  original,
  names,
  maximum,
  toggle,
  build,
}: Common & {
  original: number[];
  names: string[];
  maximum(id: number): number;
  toggle?: boolean;
  build(values: { id: number; value: number }[]): Pokeathlon4Edit;
}) {
  const [draft, setDraft] = useState(original.map(String)),
    [invalid, setInvalid] = useState(false),
    dirty = draft.some((v, i) => v !== String(original[i]));
  const update = (i: number, value: string) => {
    const next = draft.map((v, k) => (i === k ? value : v));
    setDraft(next);
    onDirty(next.some((v, k) => v !== String(original[k])));
    setInvalid(false);
  };
  return (
    <fieldset className="save-food-fields" disabled={busy || !c.canEdit}>
      <div className="save-editor-fields">
        {draft.map((v, i) =>
          toggle ? (
            <label key={i} className="save-food-toggle">
              <input
                type="checkbox"
                checked={v === "1"}
                onChange={(e) => update(i, e.target.checked ? "1" : "0")}
              />
              <span>{names[i]}</span>
            </label>
          ) : (
            <label key={i} className="field">
              <span>{names[i]}</span>
              <input
                inputMode="numeric"
                value={v}
                onChange={(e) => update(i, e.target.value)}
                onBlur={() => {
                  if (v === "") update(i, String(original[i]));
                }}
              />
              <small>
                {ath4Words[lang].maximum}: {maximum(i)}
              </small>
            </label>
          ),
        )}
      </div>
      <ActionBar
        lang={lang}
        dirty={dirty}
        invalid={invalid}
        onDiscard={() => {
          setDraft(original.map(String));
          onDirty(false);
          setInvalid(false);
        }}
        onApply={() => {
          try {
            const edit = build(ath4Changed(original, draft, maximum));
            setInvalid(false);
            void onApply(edit);
          } catch {
            setInvalid(true);
          }
        }}
      />
    </fieldset>
  );
}
function Roster({
  c,
  busy,
  lang,
  members,
  selected,
  locked,
  onSelect,
}: Pick<Common, "c" | "busy" | "lang"> & {
  members: Ath4Pokemon[];
  selected: number;
  locked: boolean;
  onSelect(index: number): void;
}) {
  return (
    <div
      className="save-ath4-roster save-editor-toolbar"
      role="group"
      aria-label={ath4Words[lang].member}
    >
      {members.map((p, i) => (
        <button
          type="button"
          key={i}
          disabled={busy || locked}
          aria-pressed={selected === i}
          onClick={() => onSelect(i)}
        >
          <img src={pokemonImage(p)} alt="" />
          <span>
            {i + 1} ·{" "}
            {c.speciesChoices.find((v) => v.id === p.species)?.name[lang] ??
              `${ath4Words[lang].unknown} (${p.species})`}
          </span>
          {p.shiny && <span>{ath4Words[lang].shiny}</span>}
        </button>
      ))}
    </div>
  );
}
function PokemonForm({
  c,
  busy,
  lang,
  onApply,
  onDirty,
  p,
  participant,
  build,
}: Common & {
  p: Ath4Pokemon;
  participant: boolean;
  build(pokemon: ReturnType<typeof ath4PokemonPatch>): Pokeathlon4Edit;
}) {
  const original = Object.fromEntries(
      Object.entries(p).map(([k, v]) => [
        k,
        k === "tid" || k === "sid" ? String(v).padStart(5, "0") : String(v),
      ]),
    ),
    [draft, setDraft] = useState(original),
    [invalid, setInvalid] = useState(false),
    dirty = ath4PokemonDirty(p, draft, participant),
    w = ath4Words[lang];
  const update = (key: string, value: string) => {
    const next = { ...draft, [key]: value };
    if (key === "species") next.form = "0";
    setDraft(next);
    setInvalid(false);
    onDirty(ath4PokemonDirty(p, next, participant));
  };
  const choices = c.speciesChoices.find((v) => v.id === Number(draft.species)),
    form = choices?.forms.find((v) => v.id === Number(draft.form));
  return (
    <fieldset className="save-food-fields" disabled={busy || !c.canEdit}>
      <div className="save-ath4-sprite">
        <img
          src={pokemonImage({
            species: Number(draft.species),
            sprite:
              (participant && draft.gender === "1"
                ? form?.femaleSprite
                : form?.sprite) ?? p.sprite,
          })}
          alt=""
        />
        <span>
          {choices?.name[lang] ?? w.unknown} ·{" "}
          {form?.name[lang] ?? `${w.unknown} (${draft.form})`}
        </span>
      </div>
      <div className="save-editor-fields">
        <label className="field">
          <span>{baseLabel(lang, "DGV_Species")}</span>
          <Select
            value={draft.species}
            onChange={(e) => update("species", e.target.value)}
          >
            {!choices && (
              <option value={draft.species}>
                {w.keep} · {w.unknown} ({draft.species})
              </option>
            )}
            {c.speciesChoices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name[lang]}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{w.form}</span>
          <Select
            value={draft.form}
            onChange={(e) => update("form", e.target.value)}
          >
            {!form && (
              <option value={draft.form}>
                {w.keep} · {draft.form}
              </option>
            )}
            {choices?.forms.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name[lang]}
              </option>
            ))}
          </Select>
        </label>
        {participant && (
          <>
            <label className="field">
              <span>{w.gender}</span>
              <Select
                value={draft.gender}
                disabled={p.gender > 1}
                onChange={(e) => update("gender", e.target.value)}
              >
                {p.gender > 1 && (
                  <option value={p.gender}>
                    {w.keep} ·{" "}
                    {p.gender === 2
                      ? w.genderless
                      : `${w.unknown} (${p.gender})`}
                  </option>
                )}
                <option value="0">{w.male}</option>
                <option value="1">{w.female}</option>
              </Select>
            </label>
            {(["pid", "tid", "sid"] as const).map((k) => (
              <label key={k} className="field">
                <span>{w[k]}</span>
                <input
                  inputMode={k === "pid" ? "text" : "numeric"}
                  maxLength={k === "pid" ? 8 : undefined}
                  value={draft[k]}
                  onChange={(e) => update(k, e.target.value)}
                />
                <small>
                  {w.parsed}:{" "}
                  {k === "pid"
                    ? ath4Pid(draft[k])
                        .toString(16)
                        .toUpperCase()
                        .padStart(8, "0")
                    : ath4Id(draft[k])}
                </small>
              </label>
            ))}
            <label className="save-food-toggle">
              <input
                type="checkbox"
                checked={draft.shiny === "true"}
                onChange={(e) => update("shiny", String(e.target.checked))}
              />
              <span>{w.shiny}</span>
            </label>
          </>
        )}
      </div>
      <ActionBar
        lang={lang}
        dirty={dirty}
        invalid={invalid}
        onDiscard={() => {
          setDraft(original);
          setInvalid(false);
          onDirty(false);
        }}
        onApply={() => {
          try {
            const edit = build(ath4PokemonPatch(c, p, draft, participant));
            setInvalid(false);
            void onApply(edit);
          } catch {
            setInvalid(true);
          }
        }}
      />
      {participant && (
        <>
          <p>{w.shinyNote}</p>
          <p>{w.genderNote}</p>
          <p>{w.idNote}</p>
        </>
      )}
    </fieldset>
  );
}
function TrainerForm({
  c,
  busy,
  lang,
  onApply,
  onDirty,
  t,
  index,
  slot,
}: Common & { t: Ath4Trainer; index: number; slot: number }) {
  const original = Object.fromEntries(
      Object.entries(t).map(([k, v]) => [
        k,
        k === "tid" || k === "sid" ? String(v).padStart(5, "0") : String(v),
      ]),
    ),
    [draft, setDraft] = useState(original),
    [raw, setRaw] = useState(false),
    [invalid, setInvalid] = useState(false),
    w = ath4Words[lang],
    dirty = ath4TrainerDirty(t, draft, raw);
  const update = (key: string, value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    setInvalid(false);
    onDirty(ath4TrainerDirty(t, next, raw));
  };
  return (
    <>
      <label className="field save-ath4-select">
        <span>{w.nameMode}</span>
        <Select
          value={String(raw)}
          disabled={busy || dirty}
          onChange={(e) => setRaw(e.target.value === "true")}
        >
          <option value="false">{w.text}</option>
          <option value="true">{w.raw}</option>
        </Select>
      </label>
      <fieldset className="save-food-fields" disabled={busy || !c.canEdit}>
        <div className="save-editor-fields">
          <label className="field">
            <span>{raw ? w.rawName : w.name}</span>
            <input
              value={draft[raw ? "nameHex" : "name"]}
              maxLength={raw ? 32 : 7}
              onChange={(e) => update(raw ? "nameHex" : "name", e.target.value)}
            />
          </label>
          {(["tid", "sid"] as const).map((k) => (
            <label key={k} className="field">
              <span>{w[k]}</span>
              <input
                inputMode="numeric"
                value={draft[k]}
                onChange={(e) => update(k, e.target.value)}
              />
              <small>
                {w.parsed}: {ath4Id(draft[k])}
              </small>
            </label>
          ))}
          <label className="field">
            <span>{baseLabel(lang, "L_Language")}</span>
            <Select
              value={draft.language}
              onChange={(e) => update("language", e.target.value)}
            >
              {!c.languageChoices.some(
                (v) => v.id === Number(draft.language),
              ) && (
                <option value={draft.language}>
                  {w.keep} · {draft.language}
                </option>
              )}
              {c.languageChoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name[lang]}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <ActionBar
          lang={lang}
          dirty={dirty}
          invalid={invalid}
          onDiscard={() => {
            setDraft(original);
            setInvalid(false);
            onDirty(false);
          }}
          onApply={() => {
            try {
              const edit = ath4TrainerPatch(c, t, draft, raw);
              setInvalid(false);
              void onApply({ action: "trainer", index, slot, trainer: edit });
            } catch {
              setInvalid(true);
            }
          }}
        />
        <p>{w.nameNote}</p>
        <p>{w.idNote}</p>
      </fieldset>
    </>
  );
}
const medalCount = (values: number[]) =>
  values.reduce(
    (sum, v) =>
      sum +
      Array.from({ length: 5 }, (_, i) => (v >> i) & 1).reduce(
        (s, n) => s + n,
        0,
      ),
    0,
  );
function MedalBatch({ c, busy, lang, onApply, onDirty }: Common) {
  const [enabled, setEnabled] = useState(true),
    [review, setReview] = useState(false),
    [invalid, setInvalid] = useState(false),
    w = ath4Words[lang];
  return (
    <>
      <label className="field save-ath4-select">
        <span>{w.preview}</span>
        <Select
          value={String(enabled)}
          disabled={busy || review}
          onChange={(e) => setEnabled(e.target.value === "true")}
        >
          <option value="true">{baseLabel(lang, "B_MedalsGiveAll")}</option>
          <option value="false">{baseLabel(lang, "B_MedalsClearAll")}</option>
        </Select>
      </label>
      <p>{w.batchNote}</p>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={busy || review}
          onClick={() => {
            setReview(true);
            onDirty(true);
          }}
        >
          {w.preview}
        </button>
      </div>
      {review && (
        <>
          <dl className="save-editor-summary">
            <div>
              <dt>{w.before}</dt>
              <dd>{medalCount(c.medals)}</dd>
            </div>
            <div>
              <dt>{w.after}</dt>
              <dd>{enabled ? 2465 : 0}</dd>
            </div>
          </dl>
          <details className="save-ath4-details">
            <summary>{baseLabel(lang, "Tab_Medals")}</summary>
            <div className="save-ath4-list">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{baseLabel(lang, "DGV_Species")}</th>
                    <th scope="col">{w.source}</th>
                    <th scope="col">{w.parsed}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.medals.map((v, i) => (
                    <tr key={i}>
                      <th scope="row">
                        {
                          c.speciesChoices.find((s) => s.id === i + 1)?.name[
                            lang
                          ]
                        }
                      </th>
                      <td>{v}</td>
                      <td>{enabled ? 31 : 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <div className="save-editor-toolbar">
            <button
              type="button"
              className="primary"
              disabled={busy || !c.canEdit}
              onClick={() => {
                try {
                  const edit = ath4Batch(c, enabled);
                  setInvalid(false);
                  void onApply(edit);
                } catch {
                  setInvalid(true);
                }
              }}
            >
              {w.confirm}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setReview(false);
                setInvalid(false);
                onDirty(false);
              }}
            >
              {w.cancel}
            </button>
          </div>
        </>
      )}
      {invalid && (
        <p role="alert" className="save-editor-error">
          {w.invalid}
        </p>
      )}
    </>
  );
}
