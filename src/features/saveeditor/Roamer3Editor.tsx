import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { pokemonImage } from "./art";
import { hall3Pid } from "./hall3";
import {
  roamer3Draft,
  roamer3Dirty,
  roamer3Edit,
  roamer3Words,
  type Roamer3Catalog,
  type Roamer3Edit,
} from "./roamer3";
// Display matches the Pokémon editor; the Core array stores Speed at index 3.
const statOrder = [0, 1, 2, 4, 5, 3] as const;
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<Roamer3Catalog | undefined>;
  onApply(edit: Roamer3Edit): Promise<void>;
};
export function Roamer3Editor({
  revision,
  busy,
  lang,
  onRead,
  onApply,
}: Props) {
  const reader = useRef(onRead);
  const [loaded, setLoaded] = useState<{
    revision: number;
    catalog: Roamer3Catalog;
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
  const w = roamer3Words[lang];
  return (
    <section className="save-record-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === revision ? (
        <RoamerForm
          key={revision}
          catalog={loaded.catalog}
          disabled={busy || !loaded.catalog.canEdit}
          lang={lang}
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
function RoamerForm({
  catalog: c,
  disabled,
  lang,
  onApply,
}: {
  catalog: Roamer3Catalog;
  disabled: boolean;
  lang: Props["lang"];
  onApply: Props["onApply"];
}) {
  const w = roamer3Words[lang];
  const [draft, setDraft] = useState(() => roamer3Draft(c)),
    [invalid, setInvalid] = useState(false);
  const dirty = roamer3Dirty(c, draft);
  const name = (species: number) =>
    c.speciesChoices.find((v) => v.id === species)?.name[lang] ??
    `${w.unknown} (${species})`;
  return (
    <fieldset className="save-food-fields" disabled={disabled}>
      <legend className="visually-hidden">{w.title}</legend>
      <div className="save-editor-toolbar">
        <img src={pokemonImage(c)} width={40} height={40} alt="" />
        <span>
          {c.species === 0 ? w.none : name(c.species)} ·{" "}
          {c.shiny ? w.shiny : w.regular}
        </span>
      </div>
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
            {c.speciesChoices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name[lang]}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{w.pid}</span>
          <input
            value={draft.pid}
            maxLength={8}
            spellCheck={false}
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
          <span>{w.level} (0–100)</span>
          <input
            inputMode="numeric"
            maxLength={3}
            value={draft.level}
            onChange={(e) => setDraft({ ...draft, level: e.target.value })}
          />
        </label>
        <label className="field">
          <span>{w.hp} (0–65535)</span>
          <input
            inputMode="numeric"
            maxLength={5}
            value={draft.hp}
            onChange={(e) => setDraft({ ...draft, hp: e.target.value })}
          />
        </label>
      </div>
      {c.level > 100 && <p className="save-editor-note">{w.originalLevel}</p>}
      <fieldset className="save-food-fields">
        <legend>{w.ivTitle}</legend>
        <div className="save-editor-fields">
          {statOrder.map((i) => (
            <label className="field" key={i}>
              <span>{w.ivs[i]}</span>
              <input
                inputMode="numeric"
                maxLength={2}
                value={draft.ivs[i]}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    ivs: draft.ivs.map((v, j) =>
                      j === i ? e.target.value : v,
                    ),
                  })
                }
              />
            </label>
          ))}
        </div>
      </fieldset>
      <p className="save-editor-note">{w.ivNote}</p>
      {c.glitched && (
        <>
          <p className="save-editor-note">{w.glitch}</p>
          <p>
            {w.encounter}:{" "}
            {statOrder
              .map((i) => `${w.ivs[i]} ${c.encounterIvs[i]}`)
              .join(" / ")}
          </p>
        </>
      )}
      <label className="save-food-toggle">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
        />
        <span>{w.active}</span>
      </label>
      {invalid && (
        <p className="save-editor-error" role="alert">
          {w.invalid}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          className="primary"
          disabled={!dirty}
          onClick={() => {
            try {
              const edit = roamer3Edit(c, draft);
              setInvalid(false);
              void onApply(edit);
            } catch {
              setInvalid(true);
            }
          }}
        >
          {w.apply}
        </button>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => {
            setDraft(roamer3Draft(c));
            setInvalid(false);
          }}
        >
          {w.discard}
        </button>
      </div>
      <p className="save-editor-note">{w.note}</p>
    </fieldset>
  );
}
