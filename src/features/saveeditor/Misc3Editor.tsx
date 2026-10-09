import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { pokemonImage } from "./art";
import {
  misc3CoinEdit,
  misc3RivalEdit,
  misc3IconEdit,
  misc3MirageEdit,
  misc3Words,
  type Misc3Catalog,
  type Misc3Edit,
} from "./misc3";
import "./Misc3Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<Misc3Catalog | undefined>;
  onApply(edit: Misc3Edit): Promise<void>;
};
export function Misc3Editor({ revision, busy, lang, onRead, onApply }: Props) {
  const reader = useRef(onRead),
    [loaded, setLoaded] = useState<{
      revision: number;
      catalog: Misc3Catalog;
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
  const w = misc3Words[lang];
  return (
    <section className="save-record-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === revision ? (
        <MainForm
          key={revision}
          catalog={loaded.catalog}
          busy={busy}
          lang={lang}
          onApply={onApply}
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
function MainForm({
  catalog: c,
  busy,
  lang,
  onApply,
}: {
  catalog: Misc3Catalog;
  busy: boolean;
  lang: Props["lang"];
  onApply: Props["onApply"];
}) {
  const w = misc3Words[lang],
    [coins, setCoins] = useState(String(c.coins)),
    [mode, setMode] = useState<"text" | "hex">("text"),
    [name, setName] = useState(c.rival?.name ?? ""),
    [hex, setHex] = useState(c.rival?.hex ?? ""),
    [icons, setIcons] = useState(() => c.icons?.map(() => "keep") ?? []),
    [invalid, setInvalid] = useState(false);
  const coinDirty = coins !== String(c.coins),
    rivalDirty =
      c.rival !== null &&
      (mode === "text" ? name !== c.rival.name : hex !== c.rival.hex),
    iconDirty = icons.some((v) => v !== "keep"),
    dirty = coinDirty || rivalDirty || iconDirty;
  const apply = (kind: "coins" | "rival" | "icons" | "mirage") => {
    try {
      const edit =
        kind === "coins"
          ? misc3CoinEdit(c, coins)
          : kind === "rival"
            ? misc3RivalEdit(c, mode, mode === "text" ? name : hex)
            : kind === "icons"
              ? misc3IconEdit(c, icons)
              : misc3MirageEdit(c);
      setInvalid(false);
      void onApply(edit);
    } catch {
      setInvalid(true);
    }
  };
  const reset = () => {
    setCoins(String(c.coins));
    setName(c.rival?.name ?? "");
    setHex(c.rival?.hex ?? "");
    setIcons(c.icons?.map(() => "keep") ?? []);
    setInvalid(false);
  };
  return (
    <div className="save-food-fields save-misc-main">
      <fieldset
        className="save-food-fields save-misc-coins"
        disabled={busy || !c.canEdit || rivalDirty || iconDirty}
      >
        <label className="field">
          <span>{w.coins}</span>
          <input
            inputMode="numeric"
            maxLength={4}
            value={coins}
            onChange={(e) => setCoins(e.target.value)}
          />
        </label>
        <div className="save-editor-toolbar">
          <button
            type="button"
            className="primary"
            disabled={!coinDirty}
            onClick={() => apply("coins")}
          >
            {w.coinApply}
          </button>
        </div>
      </fieldset>
      {c.coins > 9999 && <p>{w.oldCoins}</p>}
      {c.rival && (
        <>
          <h4>{w.rival}</h4>
          <label className="field save-misc-field">
            <span>{w.mode}</span>
            <Select
              value={mode}
              disabled={busy || dirty}
              onChange={(e) => {
                setMode(e.target.value as "text" | "hex");
                setInvalid(false);
              }}
            >
              <option value="text">{w.text}</option>
              <option value="hex">{w.hex}</option>
            </Select>
          </label>
          <fieldset
            className="save-food-fields"
            disabled={busy || !c.canEdit || coinDirty || iconDirty}
          >
            <label className="field save-misc-field">
              <span>{mode === "text" ? w.rival : w.hex}</span>
              <input
                maxLength={mode === "text" ? c.rival.maxLength : 16}
                value={mode === "text" ? name : hex}
                onChange={(e) =>
                  mode === "text"
                    ? setName(e.target.value)
                    : setHex(e.target.value)
                }
              />
            </label>
            <div className="save-editor-toolbar">
              <button
                type="button"
                className="primary"
                disabled={!rivalDirty}
                onClick={() => apply("rival")}
              >
                {w.rivalApply}
              </button>
            </div>
          </fieldset>
        </>
      )}
      {c.icons && (
        <fieldset
          className="save-food-fields"
          disabled={busy || !c.canEdit || coinDirty || rivalDirty}
        >
          <legend>{w.icons}</legend>
          <div className="save-misc-icons">
            {c.icons.map((i, pos) => {
              const species =
                icons[pos] === "keep" ? i.species : Number(icons[pos]);
              const unknown =
                icons[pos] === "keep" && i.species === 0 && i.raw !== 0;
              return (
                <label className="field" key={i.slot}>
                  <span className="save-misc-icon-heading">
                    {(species > 0 || unknown) && (
                      <img
                        src={pokemonImage({
                          species,
                          sprite: unknown
                            ? "b_unknown"
                            : icons[pos] === "keep"
                              ? i.sprite
                              : "",
                        })}
                        alt=""
                      />
                    )}
                    {w.slot} {i.slot + 1}
                  </span>
                  <Select
                    value={icons[pos]}
                    onChange={(e) =>
                      setIcons(
                        icons.map((v, j) => (j === pos ? e.target.value : v)),
                      )
                    }
                  >
                    <option value="keep">
                      {w.keep} ·{" "}
                      {i.species === 0 && i.raw !== 0
                        ? w.unknown
                        : (c.speciesChoices.find((s) => s.id === i.species)
                            ?.name[lang] ?? w.none)}
                    </option>
                    {c.speciesChoices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id} · {s.name[lang]}
                      </option>
                    ))}
                  </Select>
                </label>
              );
            })}
          </div>
          <p>
            {w.raw}:{" "}
            {c.icons.map((i) => i.raw).join(lang === "en" ? ", " : "、")}
          </p>
          <p>{w.iconNote}</p>
          <div className="save-editor-toolbar">
            <button
              type="button"
              className="primary"
              disabled={!iconDirty}
              onClick={() => apply("icons")}
            >
              {w.iconApply}
            </button>
          </div>
        </fieldset>
      )}
      {c.mirage && (
        <section className="save-food-fields">
          <h4>{w.mirage}</h4>
          <dl className="save-editor-summary">
            <div>
              <dt>{w.pid}</dt>
              <dd>{c.mirage.pid}</dd>
            </div>
            <div>
              <dt>{w.count}</dt>
              <dd>{c.mirage.partyCount}</dd>
            </div>
            <div>
              <dt>{w.current}</dt>
              <dd>{c.mirage.current}</dd>
            </div>
            <div>
              <dt>{w.target}</dt>
              <dd>{c.mirage.target}</dd>
            </div>
          </dl>
          {c.mirage.partyCount === 0 && <p>{w.empty}</p>}
          {c.mirage.current === c.mirage.target && <p>{w.matched}</p>}
          <div className="save-editor-toolbar">
            <button
              type="button"
              className="primary"
              disabled={
                busy ||
                !c.canEdit ||
                dirty ||
                c.mirage.current === c.mirage.target
              }
              onClick={() => apply("mirage")}
            >
              {w.match}
            </button>
          </div>
        </section>
      )}
      {dirty && (
        <>
          <p role="status">{w.draft}</p>
          <div className="save-editor-toolbar">
            <button type="button" disabled={busy} onClick={reset}>
              {w.discard}
            </button>
          </div>
        </>
      )}
      {invalid && (
        <p className="save-editor-error" role="alert">
          {w.invalid}
        </p>
      )}
      <p>{w.note}</p>
    </div>
  );
}
