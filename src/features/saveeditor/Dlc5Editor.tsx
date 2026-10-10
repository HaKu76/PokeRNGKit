import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { Br4Lang } from "./br4";
import { pokemonImage, speciesImage } from "./art";
import { saveEditorResources } from "./locales";
import {
  dlc5Words,
  dlc5Titles,
  dlc5Import,
  dlc5Frozen,
  dlc5Export,
  type Dlc5Catalog,
  type Dlc5Slot,
  type Dlc5Edit,
  type Dlc5Preview,
  type Dlc5Export,
} from "./dlc5";
import "./Dlc5Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Dlc5Catalog | undefined>;
  onPreview(edit: Dlc5Edit): Promise<Dlc5Preview | undefined>;
  onApply(edit: Dlc5Edit): Promise<void>;
  onExport(query: Dlc5Export): Promise<void>;
  onCGear(): void;
};
export function Dlc5Editor(props: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Dlc5Catalog }>(),
    [selected, setSelected] = useState("video:0");
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
    <section className="save-record-editor save-dlc5-editor">
      <h3>{dlc5Words[props.lang].title}</h3>
      {loaded?.revision === props.revision ? (
        <DlcForm
          key={props.revision}
          {...props}
          c={loaded.c}
          selected={selected}
          onSelect={setSelected}
        />
      ) : (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={props.busy}
            onClick={() =>
              void props.onRead().then((c) => {
                if (c) setLoaded({ revision: props.revision, c });
              })
            }
          >
            {dlc5Words[props.lang].read}
          </button>
        </div>
      )}
    </section>
  );
}
function DlcDetails({ s, lang }: { s: Dlc5Slot; lang: Br4Lang }) {
  const w = dlc5Words[lang];
  return (
    <div className="save-dlc5-details">
      <dl className="save-dlc5-metadata">
        <div>
          <dt>{w.size}</dt>
          <dd>
            {s.importSizes.join(" / ")} · {s.extension}
          </dd>
        </div>
        {s.name && (
          <div>
            <dt>{w.name}</dt>
            <dd>{s.name}</dd>
          </div>
        )}
        {s.uninitialized && (
          <div>
            <dt>{w.empty}</dt>
            <dd>—</dd>
          </div>
        )}
        {s.valid !== null && !s.uninitialized && (
          <div>
            <dt>{s.valid ? w.valid : w.invalidChecksum}</dt>
            <dd>—</dd>
          </div>
        )}
        {s.magic !== null && (
          <div>
            <dt>{w.signature}</dt>
            <dd>0x{s.magic.toString(16).toUpperCase()}</dd>
          </div>
        )}
        {s.flags !== null && (
          <div>
            <dt>{w.flags}</dt>
            <dd>0x{s.flags.toString(16).toUpperCase()}</dd>
          </div>
        )}
        {s.downloadCount !== null && (
          <div>
            <dt>{w.count}</dt>
            <dd>{s.downloadCount}</dd>
          </div>
        )}
        {s.downloadState !== null && (
          <div>
            <dt>{w.state}</dt>
            <dd>0x{s.downloadState.toString(16).toUpperCase()}</dd>
          </div>
        )}
      </dl>
      {s.description && (
        <p>
          {w.description}：{s.description}
        </p>
      )}
      {s.about && (
        <p>
          {w.about}：{s.about}
        </p>
      )}
      {s.kind === "video" && <p>{w.videoNote}</p>}
      {s.kind === "dexSkin" && <p>{w.dexNote}</p>}
      {s.kind === "battleTest" && <p>{w.testNote}</p>}
      {s.kind === "musical" && <p>{w.musicalNote}</p>}
      {s.teams.length > 0 && (
        <div className="save-dlc5-teams">
          {s.teams.map((team) => (
            <section key={team.index} className="save-dlc5-team">
              <h4>
                {w.team} {team.index + 1} · {team.name || w.trainer}
              </h4>
              <small>
                {w.members}：{team.storedCount}
              </small>
              <div className="save-dlc5-members">
                {team.members.map((member) => {
                  const p = member.pokemon;
                  return (
                    <div key={member.slot} className="save-dlc5-member">
                      <img
                        src={p ? pokemonImage(p) : speciesImage(member.species)}
                        alt=""
                        width="48"
                        height="48"
                        loading="lazy"
                      />
                      <div>
                        <strong>
                          {member.slot + 1}.{" "}
                          {p?.nickname ||
                            p?.speciesName[lang] ||
                            `${w.unknown} #${member.species}`}
                        </strong>
                        {p && (
                          <small>
                            {p.speciesName[lang]} · {w.level} {p.level}
                            <br />
                            {w.trainer}：{p.ot}
                          </small>
                        )}
                        {p && (
                          <details>
                            <summary>{w.pokemonDetails}</summary>
                            <dl className="save-dlc5-metadata">
                              <div>
                                <dt>{saveEditorResources[lang].nature}</dt>
                                <dd>{p.nature[lang]}</dd>
                              </div>
                              <div>
                                <dt>{saveEditorResources[lang].ability}</dt>
                                <dd>{p.ability[lang]}</dd>
                              </div>
                              <div>
                                <dt>{saveEditorResources[lang].item}</dt>
                                <dd>{p.item[lang]}</dd>
                              </div>
                              <div>
                                <dt>{saveEditorResources[lang].tid}</dt>
                                <dd>{p.tid}</dd>
                              </div>
                              <div>
                                <dt>{saveEditorResources[lang].sid}</dt>
                                <dd>{p.sid}</dd>
                              </div>
                              <div>
                                <dt>PID</dt>
                                <dd>
                                  0x
                                  {p.pid
                                    .toString(16)
                                    .toUpperCase()
                                    .padStart(8, "0")}
                                </dd>
                              </div>
                              <div>
                                <dt>{saveEditorResources[lang].ivs}</dt>
                                <dd>{p.ivs.join(" / ")}</dd>
                              </div>
                              <div>
                                <dt>{saveEditorResources[lang].evs}</dt>
                                <dd>{p.evs.join(" / ")}</dd>
                              </div>
                              {p.moves.map((move, i) => (
                                <div key={i}>
                                  <dt>{move[lang]}</dt>
                                  <dd>PP {p.movePp[i]}</dd>
                                </div>
                              ))}
                            </dl>
                          </details>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
function DlcForm({
  c,
  selected,
  onSelect,
  busy,
  lang,
  onPreview,
  onApply,
  onExport,
  onCGear,
}: Props & {
  c: Dlc5Catalog;
  selected: string;
  onSelect(v: string): void;
}) {
  const w = dlc5Words[lang],
    s = c.slots.find((v) => `${v.kind}:${v.index}` === selected) ?? c.slots[0],
    [reading, setReading] = useState(false),
    [pending, setPending] = useState<{ name: string; preview: Dlc5Preview }>(),
    [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const locked = busy || reading || !!pending;
  if (!s) return null;
  const groups = [...new Set(c.slots.map((v) => v.kind))];
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setError("");
    try {
      if (!s.importSizes.includes(file.size)) throw Error(w.invalid);
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!alive.current) return;
      const preview = await onPreview(dlc5Import(c, s, bytes, file.name));
      if (!alive.current || !preview) return;
      dlc5Frozen(c, preview);
      setPending({ name: file.name, preview });
    } catch {
      if (alive.current) setError(w.invalid);
    } finally {
      if (alive.current) setReading(false);
    }
  };
  return (
    <div className="save-dlc5-body" aria-busy={busy || reading}>
      <p>{w.note}</p>
      <div className="save-dlc5-grid">
        <label>
          <span>{w.group}</span>
          <Select
            value={s.kind}
            disabled={locked}
            onChange={(e) => {
              onSelect(`${e.target.value}:0`);
              setError("");
            }}
          >
            {groups.map((kind) => (
              <option key={kind} value={kind}>
                {dlc5Titles[kind][lang]}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span>{w.slot}</span>
          <Select
            value={s.index}
            disabled={locked}
            onChange={(e) => {
              onSelect(`${s.kind}:${e.target.value}`);
              setError("");
            }}
          >
            {c.slots
              .filter((v) => v.kind === s.kind)
              .map((v) => (
                <option key={v.index} value={v.index}>
                  {v.index + 1} ·{" "}
                  {v.uninitialized
                    ? w.empty
                    : v.name || dlc5Titles[v.kind][lang]}
                </option>
              ))}
          </Select>
        </label>
      </div>
      <DlcDetails s={s} lang={lang} />
      <label>
        <span>
          {w.import} · {s.extension}
        </span>
        <input
          type="file"
          accept={`.${s.extension}`}
          disabled={locked || !c.canEdit}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            void upload(file);
          }}
        />
      </label>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={locked || !s.canExport}
          onClick={() => void onExport(dlc5Export(s, false))}
        >
          {w.export}
        </button>
        {s.kind === "video" && (
          <button
            type="button"
            disabled={locked || !s.canExport}
            onClick={() => void onExport(dlc5Export(s, true))}
          >
            {w.exportDecrypted}
          </button>
        )}
        <button type="button" disabled={locked} onClick={onCGear}>
          {w.cgear}
        </button>
      </div>
      {error && (
        <p className="save-editor-error" role="alert">
          {error}
        </p>
      )}
      {pending && (
        <section className="save-dlc5-preview" aria-label={w.preview}>
          <h4>
            {w.preview} · {pending.name}
          </h4>
          <dl className="save-dlc5-metadata">
            <div>
              <dt>{w.input}</dt>
              <dd>
                {pending.preview.inputSize} → {pending.preview.result.size}
              </dd>
            </div>
            <div>
              <dt>{w.changed}</dt>
              <dd>{pending.preview.changedOffsets.length}</dd>
            </div>
            {pending.preview.inputDecrypted !== null && (
              <div>
                <dt>{w.input}</dt>
                <dd>
                  {pending.preview.inputDecrypted ? w.decrypted : w.encrypted}
                </dd>
              </div>
            )}
          </dl>
          {pending.preview.inputSize !== pending.preview.result.size && (
            <p>{w.adjusted}</p>
          )}
          <DlcDetails s={pending.preview.result} lang={lang} />
          <details>
            <summary>{w.offsets}</summary>
            <p className="save-dlc5-offsets">
              {pending.preview.changedOffsets
                .map((v) => `0x${v.toString(16).toUpperCase()}`)
                .join(" · ")}
            </p>
          </details>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || reading}
              onClick={() => {
                try {
                  void onApply(dlc5Frozen(c, pending.preview));
                } catch {
                  setError(w.stale);
                }
              }}
            >
              {w.confirm}
            </button>
            <button
              type="button"
              disabled={busy || reading}
              onClick={() => {
                setPending(undefined);
                setError("");
              }}
            >
              {w.cancel}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
