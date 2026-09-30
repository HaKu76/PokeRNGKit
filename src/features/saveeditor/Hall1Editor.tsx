import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { speciesImage } from "./art";
import {
  hall1Byte,
  hall1Draft,
  hall1Dirty,
  hall1MemberEdit,
  hall1Words,
  type Hall1Catalog,
  type Hall1Edit,
} from "./hall1";
import "./hall1.css";

type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<Hall1Catalog | undefined>;
  onApply(edit: Hall1Edit): Promise<void>;
};
export function Hall1Editor({ revision, busy, lang, onRead, onApply }: Props) {
  const reader = useRef(onRead);
  const [loaded, setLoaded] = useState<{
    revision: number;
    catalog: Hall1Catalog;
  }>();
  const [team, setTeam] = useState(0),
    [slot, setSlot] = useState(0);
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
  const w = hall1Words[lang];
  return (
    <section className="save-record-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === revision ? (
        <HallForm
          key={`${revision}:${team}:${slot}`}
          catalog={loaded.catalog}
          busy={busy}
          lang={lang}
          team={team}
          slot={slot}
          onTeam={setTeam}
          onSlot={setSlot}
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
function HallForm({
  catalog,
  busy,
  lang,
  team,
  slot,
  onTeam,
  onSlot,
  onApply,
}: {
  catalog: Hall1Catalog;
  busy: boolean;
  lang: Props["lang"];
  team: number;
  slot: number;
  onTeam(t: number): void;
  onSlot(s: number): void;
  onApply: Props["onApply"];
}) {
  const w = hall1Words[lang],
    m = catalog.teams[team].members[slot];
  const [draft, setDraft] = useState(() => hall1Draft(m)),
    [count, setCount] = useState(String(catalog.count)),
    [invalid, setInvalid] = useState(false);
  const memberDirty = hall1Dirty(m, draft),
    countDirty = count !== String(catalog.count),
    dirty = memberDirty || countDirty;
  const name = (species: number) =>
    catalog.speciesChoices.find((c) => c.id === species)?.name[lang] ??
    `${w.unknown} (${species})`;
  const apply = (kind: "member" | "count") => {
    try {
      const edit: Hall1Edit =
        kind === "member"
          ? hall1MemberEdit(catalog, team, slot, draft)
          : { action: "count", count: hall1Byte(count) };
      setInvalid(false);
      void onApply(edit);
    } catch {
      setInvalid(true);
    }
  };
  const action = (edit: Hall1Edit) => {
    setInvalid(false);
    void onApply(edit);
  };
  return (
    <fieldset className="save-food-fields" disabled={busy}>
      <legend className="visually-hidden">{w.title}</legend>
      <label className="field">
        <span>{w.team}</span>
        <Select
          value={team}
          disabled={dirty}
          onChange={(e) => onTeam(Number(e.target.value))}
        >
          {catalog.teams.map((t, i) => (
            <option key={i} value={i}>
              {w.team} {i + 1} · {t.count}/6
            </option>
          ))}
        </Select>
      </label>
      <div className="save-hall-team" role="group" aria-label={w.slot}>
        {catalog.teams[team].members.map((p, i) => (
          <button
            type="button"
            key={i}
            aria-pressed={slot === i}
            disabled={dirty}
            onClick={() => onSlot(i)}
          >
            {!p.empty && p.species > 0 && p.species <= 151 && (
              <img
                src={speciesImage(p.species)}
                width={40}
                height={40}
                alt=""
              />
            )}
            <span>
              {i + 1} · {p.empty ? w.empty : name(p.species)}
              <small>
                {p.empty ? "—" : `${p.nickname} · ${w.level} ${p.level}`}
              </small>
            </span>
          </button>
        ))}
      </div>
      <fieldset className="save-food-fields" disabled={!catalog.canEdit}>
        <legend>
          {w.slot} {slot + 1}
        </legend>
        <div className="save-editor-fields">
          <label className="field">
            <span>{w.species}</span>
            <Select
              disabled={countDirty}
              value={draft.species}
              onChange={(e) =>
                setDraft({ ...draft, species: Number(e.target.value) })
              }
            >
              <option value={0}>{w.clearChoice}</option>
              {draft.species > 151 && (
                <option value={draft.species} disabled>
                  {name(draft.species)}
                </option>
              )}
              {catalog.speciesChoices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name[lang]}
                </option>
              ))}
            </Select>
          </label>
          <label className="field">
            <span>{w.level} (0–255)</span>
            <input
              disabled={countDirty}
              inputMode="numeric"
              maxLength={3}
              value={draft.level}
              onChange={(e) => setDraft({ ...draft, level: e.target.value })}
            />
          </label>
          <label className="field">
            <span>{w.mode}</span>
            <Select
              disabled={countDirty}
              value={draft.mode}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  mode: e.target.value as typeof draft.mode,
                })
              }
            >
              {(["keep", "text", "bytes", "default"] as const).map((mode) => (
                <option key={mode} value={mode}>
                  {w[mode]}
                </option>
              ))}
            </Select>
          </label>
          {draft.mode === "text" && (
            <label className="field">
              <span>{w.nickname}</span>
              <input
                disabled={countDirty}
                value={draft.nickname}
                maxLength={catalog.nicknameLength}
                onChange={(e) =>
                  setDraft({ ...draft, nickname: e.target.value })
                }
              />
            </label>
          )}
          {draft.mode === "bytes" && (
            <label className="field">
              <span>{w.bytes}</span>
              <input
                disabled={countDirty}
                value={draft.nicknameHex}
                maxLength={(catalog.nicknameLength + 1) * 2}
                spellCheck={false}
                onChange={(e) =>
                  setDraft({ ...draft, nicknameHex: e.target.value })
                }
              />
            </label>
          )}
        </div>
        {!m.empty && m.species === 0 && (
          <button
            type="button"
            disabled={dirty}
            onClick={() =>
              action({ action: "member", team, slot, fields: { species: 0 } })
            }
          >
            {w.clearChoice}
          </button>
        )}
        {draft.mode === "bytes" && (
          <p className="save-editor-note">{w.rawNote}</p>
        )}
        <button
          type="button"
          className="primary"
          disabled={!memberDirty || countDirty}
          onClick={() => apply("member")}
        >
          {w.apply}
        </button>
        <label className="field">
          <span>{w.count} (0–255)</span>
          <input
            disabled={memberDirty}
            inputMode="numeric"
            maxLength={3}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!countDirty || memberDirty}
          onClick={() => apply("count")}
        >
          {w.applyCount}
        </button>
      </fieldset>
      {dirty && (
        <>
          <p className="save-editor-note">{w.draft}</p>
          <button
            type="button"
            onClick={() => {
              setDraft(hall1Draft(m));
              setCount(String(catalog.count));
              setInvalid(false);
            }}
          >
            {w.discard}
          </button>
        </>
      )}
      {invalid && (
        <p className="save-editor-error" role="alert">
          {w.invalid}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={!catalog.canEdit || dirty}
          onClick={() => action({ action: "registerParty" })}
        >
          {w.register}
        </button>
        <button
          type="button"
          disabled={!catalog.canEdit || dirty || slot === 0}
          onClick={() => action({ action: "clearSlot", team, slot })}
        >
          {w.clearSlot}
        </button>
        <button
          type="button"
          disabled={!catalog.canEdit || dirty || team === 0}
          onClick={() => action({ action: "deleteTeam", team })}
        >
          {w.delete}
        </button>
        <button
          type="button"
          disabled={!catalog.canEdit || dirty}
          onClick={() => action({ action: "clearAll" })}
        >
          {w.clearAll}
        </button>
      </div>
      <p className="save-editor-note">{w.note}</p>
    </fieldset>
  );
}
