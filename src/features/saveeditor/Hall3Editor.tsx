import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { pokemonImage } from "./art";
import {
  hall3Draft,
  hall3Dirty,
  hall3Id,
  hall3Pid,
  hall3MemberEdit,
  hall3Words,
  type Hall3Catalog,
  type Hall3Edit,
} from "./hall3";
import "./hall1.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(version?: number): Promise<Hall3Catalog | undefined>;
  onApply(edit: Hall3Edit): Promise<void>;
};
export function Hall3Editor({ revision, busy, lang, onRead, onApply }: Props) {
  const reader = useRef(onRead);
  const [version, setVersion] = useState<number>();
  const [loaded, setLoaded] = useState<{
    revision: number;
    version: number | undefined;
    catalog: Hall3Catalog;
  }>();
  const [team, setTeam] = useState(0),
    [slot, setSlot] = useState(0);
  useEffect(() => {
    reader.current = onRead;
  }, [onRead]);
  useEffect(() => {
    let active = true;
    void reader.current(version).then((c) => {
      if (active && c) setLoaded({ revision, version, catalog: c });
    });
    return () => {
      active = false;
    };
  }, [revision, version]);
  const w = hall3Words[lang];
  return (
    <section className="save-record-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === revision && loaded.version === version ? (
        loaded.catalog.available ? (
          <HallForm
            key={`${revision}:${version}:${team}:${slot}`}
            catalog={loaded.catalog}
            busy={busy}
            lang={lang}
            team={team}
            slot={slot}
            onTeam={setTeam}
            onSlot={setSlot}
            onVersion={setVersion}
            onApply={onApply}
          />
        ) : (
          <p className="save-editor-note">{w.missing}</p>
        )
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void onRead(version).then((c) => {
              if (c) setLoaded({ revision, version, catalog: c });
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
  onVersion,
  onApply,
}: {
  catalog: Hall3Catalog;
  busy: boolean;
  lang: Props["lang"];
  team: number;
  slot: number;
  onTeam(n: number): void;
  onSlot(n: number): void;
  onVersion(n: number): void;
  onApply: Props["onApply"];
}) {
  const w = hall3Words[lang],
    m = catalog.teams[team][slot];
  const [draft, setDraft] = useState(() => hall3Draft(m)),
    [invalid, setInvalid] = useState(false),
    [all, setAll] = useState(false);
  const dirty = hall3Dirty(m, draft);
  const name = (species: number) =>
    catalog.speciesChoices.find((c) => c.id === species)?.name[lang] ??
    `${w.unknown} (${species})`;
  const action = (edit: Hall3Edit) => {
    setInvalid(false);
    void onApply(edit);
  };
  const apply = () => {
    try {
      action(hall3MemberEdit(catalog, team, slot, draft));
    } catch {
      setInvalid(true);
    }
  };
  return (
    <fieldset className="save-food-fields" disabled={busy}>
      <legend className="visually-hidden">{w.title}</legend>
      <div className="save-editor-fields">
        <label className="field">
          <span>{w.team}</span>
          <Select
            value={team}
            disabled={dirty}
            onChange={(e) => onTeam(Number(e.target.value))}
          >
            {catalog.teams.map((_, i) => (
              <option key={i} value={i}>
                {w.team} {i + 1}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{w.version}</span>
          <Select
            value={catalog.version}
            disabled={dirty || catalog.versions.length === 1}
            onChange={(e) => onVersion(Number(e.target.value))}
          >
            {catalog.versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name[lang]}
              </option>
            ))}
          </Select>
        </label>
      </div>
      {catalog.versions.length > 1 && (
        <p className="save-editor-note">{w.versionNote}</p>
      )}
      <div className="save-hall-team" role="group" aria-label={w.slot}>
        {catalog.teams[team].map((p, i) => (
          <button
            type="button"
            key={i}
            aria-pressed={slot === i}
            disabled={dirty}
            onClick={() => onSlot(i)}
          >
            {p.species > 0 && (
              <img src={pokemonImage(p)} width={40} height={40} alt="" />
            )}
            <span>
              {i + 1} · {p.species === 0 ? w.empty : name(p.species)}
              <small>
                {p.nickname} · {w.level} {p.level}
                {p.shiny ? ` · ${w.shiny}` : ""}
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
              value={draft.species}
              onChange={(e) =>
                setDraft({ ...draft, species: Number(e.target.value) })
              }
            >
              <option value={0}>{w.none}</option>
              {draft.species > 386 && (
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
              inputMode="numeric"
              maxLength={3}
              value={draft.level}
              onChange={(e) => setDraft({ ...draft, level: e.target.value })}
            />
          </label>
          {(["tid", "sid"] as const).map((k) => (
            <label className="field" key={k}>
              <span>{w[k]} (0–65535)</span>
              <input
                inputMode="numeric"
                maxLength={5}
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                onBlur={() =>
                  setDraft({ ...draft, [k]: String(hall3Id(draft[k])) })
                }
              />
            </label>
          ))}
          <label className="field">
            <span>{w.pid}</span>
            <input
              maxLength={8}
              spellCheck={false}
              value={draft.pid}
              onChange={(e) => setDraft({ ...draft, pid: e.target.value })}
              onBlur={() =>
                setDraft({
                  ...draft,
                  pid: hall3Pid(draft.pid)
                    .toString(16)
                    .toUpperCase()
                    .padStart(8, "0"),
                })
              }
            />
          </label>
          <label className="field">
            <span>{w.mode}</span>
            <Select
              value={draft.mode}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  mode: e.target.value as typeof draft.mode,
                })
              }
            >
              {(["keep", "text", "bytes"] as const).map((mode) => (
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
                maxLength={10}
                value={draft.nickname}
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
                maxLength={20}
                spellCheck={false}
                value={draft.nicknameHex}
                onChange={(e) =>
                  setDraft({ ...draft, nicknameHex: e.target.value })
                }
              />
            </label>
          )}
        </div>
        <p className="save-editor-note">{w.levelNote}</p>
        {draft.mode === "bytes" && (
          <p className="save-editor-note">{w.rawNote}</p>
        )}
        <button
          type="button"
          className="primary"
          disabled={!dirty}
          onClick={apply}
        >
          {w.apply}
        </button>
      </fieldset>
      {dirty && (
        <>
          <p className="save-editor-note">{w.draft}</p>
          <button
            type="button"
            onClick={() => {
              setDraft(hall3Draft(m));
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
      <label className="field">
        <span>{w.scope}</span>
        <Select
          value={all ? "all" : "current"}
          disabled={dirty || !catalog.canEdit}
          onChange={(e) => setAll(e.target.value === "all")}
        >
          <option value="current">{w.current}</option>
          <option value="all">{w.all}</option>
        </Select>
      </label>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={dirty || !catalog.canEdit}
          onClick={() => action({ action: "party", team, all })}
        >
          {w.import}
        </button>
        <button
          type="button"
          disabled={dirty || !catalog.canEdit}
          onClick={() => action({ action: "clearMember", team, slot })}
        >
          {w.clearSlot}
        </button>
      </div>
      <p className="save-editor-note">{w.note}</p>
    </fieldset>
  );
}
