import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { pokemonImage } from "./art";
import { hall3Id } from "./hall3";
import {
  painting3Draft,
  painting3Dirty,
  painting3Edit,
  painting3Pid,
  paintings3Words,
  type Painting3Catalog,
  type Painting3Edit,
} from "./paintings3";
import "./hall1.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<Painting3Catalog | undefined>;
  onApply(edit: Painting3Edit): Promise<void>;
};
export function Paintings3Editor({
  revision,
  busy,
  lang,
  onRead,
  onApply,
}: Props) {
  const reader = useRef(onRead);
  const [loaded, setLoaded] = useState<{
    revision: number;
    catalog: Painting3Catalog;
  }>();
  const [index, setIndex] = useState(0);
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
  const w = paintings3Words[lang];
  return (
    <section className="save-record-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === revision ? (
        <PaintingForm
          key={`${revision}:${index}`}
          catalog={loaded.catalog}
          index={index}
          busy={busy}
          lang={lang}
          onIndex={setIndex}
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
function PaintingForm({
  catalog,
  index,
  busy,
  lang,
  onIndex,
  onApply,
}: {
  catalog: Painting3Catalog;
  index: number;
  busy: boolean;
  lang: Props["lang"];
  onIndex(n: number): void;
  onApply: Props["onApply"];
}) {
  const w = paintings3Words[lang],
    p = catalog.entries[index];
  const [draft, setDraft] = useState(() => painting3Draft(p)),
    [invalid, setInvalid] = useState(false);
  const dirty = painting3Dirty(p, draft);
  const name = (species: number) =>
    catalog.speciesChoices.find((v) => v.id === species)?.name[lang] ??
    `${w.unknown} (${species})`;
  const apply = () => {
    try {
      const edit = painting3Edit(catalog, index, draft);
      setInvalid(false);
      void onApply(edit);
    } catch {
      setInvalid(true);
    }
  };
  return (
    <fieldset className="save-food-fields" disabled={busy}>
      <legend className="visually-hidden">{w.title}</legend>
      <div className="save-hall-team" role="group" aria-label={w.painting}>
        {catalog.entries.map((entry, i) => (
          <button
            type="button"
            key={i}
            aria-pressed={i === index}
            disabled={dirty}
            onClick={() => onIndex(i)}
          >
            {entry.enabled && entry.species > 0 && (
              <img src={pokemonImage(entry)} width={40} height={40} alt="" />
            )}
            <span>
              {w.categories[i]}
              <small>
                {entry.enabled ? entry.nickname || name(entry.species) : "—"}
                {entry.enabled && entry.shiny ? ` · ${w.shiny}` : ""}
              </small>
            </span>
          </button>
        ))}
      </div>
      <fieldset className="save-food-fields" disabled={!catalog.canEdit}>
        <legend>{w.categories[index]}</legend>
        <label className="save-food-toggle">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
          />
          <span>{w.enabled}</span>
        </label>
        <fieldset className="save-food-fields" disabled={!draft.enabled}>
          <legend className="visually-hidden">{w.painting}</legend>
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
                {catalog.speciesChoices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>{w.caption}</span>
              <Select
                value={draft.caption}
                onChange={(e) =>
                  setDraft({ ...draft, caption: e.target.value })
                }
              >
                <option value="keep">
                  {w.keepCaption} · {p.caption}
                </option>
                {[0, 1, 2].map((v) => (
                  <option key={v} value={v}>
                    {w.caption} {v}
                  </option>
                ))}
              </Select>
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
                spellCheck={false}
                maxLength={32767}
                value={draft.pid}
                onChange={(e) => setDraft({ ...draft, pid: e.target.value })}
                onBlur={() =>
                  setDraft({
                    ...draft,
                    pid: painting3Pid(draft.pid)
                      .toString(16)
                      .toUpperCase()
                      .padStart(8, "0"),
                  })
                }
              />
            </label>
            {(["nickname", "trainer"] as const).map((k) => (
              <label className="field" key={k}>
                <span>{w[k]}</span>
                <Select
                  value={draft[`${k}Mode`]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      [`${k}Mode`]: e.target.value as "keep" | "text" | "bytes",
                    })
                  }
                >
                  {(["keep", "text", "bytes"] as const).map((mode) => (
                    <option key={mode} value={mode}>
                      {w[mode]}
                    </option>
                  ))}
                </Select>
                {draft[`${k}Mode`] === "keep" && (
                  <input aria-label={w[k]} readOnly value={p[k]} />
                )}
                {draft[`${k}Mode`] === "text" && (
                  <input
                    aria-label={w[k]}
                    maxLength={k === "nickname" ? 10 : 7}
                    value={draft[k]}
                    onChange={(e) =>
                      setDraft({ ...draft, [k]: e.target.value })
                    }
                  />
                )}{" "}
                {draft[`${k}Mode`] === "bytes" && (
                  <input
                    aria-label={`${w[k]} · ${w.bytes}`}
                    spellCheck={false}
                    maxLength={k === "nickname" ? 20 : 14}
                    value={draft[`${k}Hex`]}
                    onChange={(e) =>
                      setDraft({ ...draft, [`${k}Hex`]: e.target.value })
                    }
                  />
                )}
              </label>
            ))}
          </div>
        </fieldset>
      </fieldset>
      {dirty && <p className="save-editor-note">{w.draft}</p>}
      {invalid && (
        <p className="save-editor-error" role="alert">
          {w.invalid}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          className="primary"
          disabled={!catalog.canEdit || !dirty}
          onClick={apply}
        >
          {w.apply}
        </button>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => {
            setDraft(painting3Draft(p));
            setInvalid(false);
          }}
        >
          {w.discard}
        </button>
        <button
          type="button"
          disabled={!catalog.canEdit || dirty}
          onClick={() => {
            setInvalid(false);
            void onApply({ index, fields: { enabled: false } });
          }}
        >
          {w.clear}
        </button>
      </div>
      <p className="save-editor-note">{w.note}</p>
    </fieldset>
  );
}
