import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { itemImage, pokemonImage } from "./art";
import type { Br4Lang } from "./br4";
import {
  LINK6_FILE_SIZE,
  link6Export,
  link6Frozen,
  link6Import,
  link6Number,
  link6Patch,
  link6Resave,
  type Link6Catalog,
  type Link6Edit,
  type Link6Preview,
} from "./link6";
import { link6Words } from "./link6Words";
import "./Link6Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Link6Catalog | undefined>;
  onPreview(edit: Link6Edit): Promise<Link6Preview | undefined>;
  onApply(edit: Link6Edit): Promise<void>;
  onExport(edit: Link6Edit): Promise<void>;
};
export function Link6Editor(props: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Link6Catalog }>(),
    [section, setSection] = useState("main");
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
    <section className="save-record-editor save-link6-editor">
      <h3>{link6Words[props.lang].title}</h3>
      {loaded?.revision === props.revision ? (
        <Form
          key={props.revision}
          {...props}
          c={loaded.c}
          section={section}
          onSection={setSection}
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
          {link6Words[props.lang].read}
        </button>
      )}
    </section>
  );
}
function Form({
  c,
  section,
  onSection,
  busy,
  lang,
  onPreview,
  onApply,
  onExport,
}: Props & {
  c: Link6Catalog;
  section: string;
  onSection(value: string): void;
}) {
  const w = link6Words[lang],
    [bp, setBP] = useState(""),
    [miles, setMiles] = useState(""),
    [preview, setPreview] = useState<Link6Preview>(),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const dirty = bp !== "" || miles !== "",
    locked = busy || pending || !!preview,
    writable = c.canEdit && !locked;
  async function start(edit: Link6Edit) {
    setError("");
    setPending(true);
    try {
      const p = await onPreview(edit);
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  function draft() {
    try {
      void start(
        link6Patch(c, {
          ...(bp !== "" ? { battlePoints: link6Number(bp, 9999) } : {}),
          ...(miles !== "" ? { pokemiles: link6Number(miles, 65535) } : {}),
        }),
      );
    } catch {
      setError(w.invalid);
    }
  }
  async function importFile(file: File) {
    setError("");
    setPending(true);
    try {
      if (file.size !== LINK6_FILE_SIZE) throw Error("Invalid Link6 pl6 size.");
      const p = await onPreview(
        link6Import(c, new Uint8Array(await file.arrayBuffer())),
      );
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  const flag = (v: Link6Catalog) => `${v.enabled ? w.yes : w.no} (${v.flags})`,
    checksum = (v: Link6Catalog) =>
      `${v.internalChecksumValid ? w.valid : w.invalidChecksum} (${v.storedChecksum.toString(16).toUpperCase().padStart(4, "0")} / ${v.calculatedChecksum.toString(16).toUpperCase().padStart(4, "0")})`;
  const after = preview?.result,
    changes: string[] = [];
  if (after) {
    for (const [label, before, value] of [
      [w.origin, c.origin, after.origin],
      [w.enabled, flag(c), flag(after)],
      [w.bp, c.battlePoints, after.battlePoints],
      [w.miles, c.pokemiles, after.pokemiles],
      [w.checksum, checksum(c), checksum(after)],
    ] as const)
      if (before !== value) changes.push(`${label}: ${before} → ${value}`);
    for (const item of after.items) {
      const old = c.items[item.index];
      if (item.item !== old.item || item.quantity !== old.quantity)
        changes.push(
          `${w.items} ${item.index + 1}: ${old.name[lang]} (${old.item}) × ${old.quantity} → ${item.name[lang]} (${item.item}) × ${item.quantity}`,
        );
    }
    for (const p of after.pokemon)
      if (p.rawHex !== c.pokemon[p.index].rawHex)
        changes.push(
          `${w.pokemon} ${p.index + 1}: ${c.pokemon[p.index].name[lang]} → ${p.name[lang]}`,
        );
  }
  return (
    <div className="save-link6-body">
      <p>{w.note}</p>
      <label>
        <span>{w.main}</span>
        <Select
          value={section}
          disabled={locked || dirty}
          onChange={(e) => onSection(e.target.value)}
        >
          <option value="main">{w.main}</option>
          <option value="items">{w.items}</option>
          <option value="pokemon">{w.pokemon}</option>
        </Select>
      </label>
      {section === "main" ? (
        <>
          <dl className="save-link6-summary">
            <div>
              <dt>{w.origin}</dt>
              <dd>{c.origin || "—"}</dd>
            </div>
            <div>
              <dt>{w.enabled}</dt>
              <dd>{flag(c)}</dd>
            </div>
            <div>
              <dt>{w.checksum}</dt>
              <dd>{checksum(c)}</dd>
            </div>
          </dl>
          <fieldset
            className="save-link6-fields"
            disabled={!writable || !c.enabled}
          >
            <label>
              <span>
                {w.bp}: {c.battlePoints}
              </span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={bp}
                placeholder={String(c.battlePoints)}
                onChange={(e) => {
                  setBP(e.target.value);
                  setError("");
                }}
              />
            </label>
            <label>
              <span>
                {w.miles}: {c.pokemiles}
              </span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={miles}
                placeholder={String(c.pokemiles)}
                onChange={(e) => {
                  setMiles(e.target.value);
                  setError("");
                }}
              />
            </label>
          </fieldset>
          {c.battlePoints > 9999 && <p>{w.excessiveBP}</p>}
        </>
      ) : section === "items" ? (
        <ItemRows c={c} lang={lang} />
      ) : (
        <PokemonRows c={c} lang={lang} />
      )}
      <div className="save-editor-toolbar">
        <button type="button" disabled={!writable || !dirty} onClick={draft}>
          {w.preview}
        </button>
        <button
          type="button"
          disabled={locked || !dirty}
          onClick={() => {
            setBP("");
            setMiles("");
            setError("");
          }}
        >
          {w.discard}
        </button>
        <button
          type="button"
          disabled={!writable || dirty || c.battlePoints > 9999}
          onClick={() => {
            try {
              void start(link6Resave(c));
            } catch {
              setError(w.invalid);
            }
          }}
        >
          {w.resave}
        </button>
        <label className="save-link6-import">
          <span>{w.import}</span>
          <input
            type="file"
            accept=".pl6"
            disabled={!writable || dirty}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void importFile(file);
            }}
          />
        </label>
        <button
          type="button"
          disabled={locked || dirty || !c.enabled}
          onClick={() => void onExport(link6Export(c))}
        >
          {w.export}
        </button>
      </div>
      <small>{w.resaveNote}</small>
      <small>{w.importNote}</small>
      {error && <p role="alert">{error}</p>}
      {preview && after && (
        <section className="save-link6-preview" aria-label={w.changes}>
          <h4>{w.changes}</h4>
          {changes.length ? (
            <ul>
              {changes.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
          ) : (
            <p>{w.noChanges}</p>
          )}
          <p>
            {w.changed}: {preview.changedOffsets.length}
          </p>
          {preview.request.action === "import" && (
            <>
              <ItemRows c={after} lang={lang} />
              <PokemonRows c={after} lang={lang} />
            </>
          )}
          <details>
            <summary>{w.raw}</summary>
            <pre>{c.rawHex}</pre>
            <pre>{after.rawHex}</pre>
          </details>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || pending}
              onClick={() => {
                try {
                  const edit = link6Frozen(c, preview);
                  setPending(true);
                  void onApply(edit).finally(() => setPending(false));
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
function ItemRows({ c, lang }: { c: Link6Catalog; lang: Br4Lang }) {
  const w = link6Words[lang];
  return (
    <ul className="save-link6-slots" aria-label={w.items}>
      {c.items.map((i) => (
        <li key={i.index}>
          <img src={itemImage(i.sprite)} alt="" width={32} height={32} />
          <span>
            {i.index + 1}. {i.name[lang]} ({i.item})
            <small>
              {w.quantity}: {i.quantity}
            </small>
          </span>
        </li>
      ))}
    </ul>
  );
}
function PokemonRows({ c, lang }: { c: Link6Catalog; lang: Br4Lang }) {
  const w = link6Words[lang];
  return (
    <ul className="save-link6-slots" aria-label={w.pokemon}>
      {c.pokemon.map((p) => (
        <li key={p.index}>
          <img src={pokemonImage(p)} alt="" width={68} height={56} />
          <span>
            {p.index + 1}. {p.name[lang]} ({p.species})
          </span>
        </li>
      ))}
    </ul>
  );
}
