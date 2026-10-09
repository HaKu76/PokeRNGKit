import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { pokemonImage, speciesImage } from "./art";
import {
  video4Words,
  video4Import,
  video4Confirmation,
  type Video4Catalog,
  type Video4Info,
  type Video4Import,
  type Video4Preview,
} from "./battleVideo4";
import type { Br4Lang } from "./br4";
import "./BattleVideo4Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(index: number): Promise<Video4Catalog | undefined>;
  onPreview(edit: Video4Import): Promise<Video4Preview | undefined>;
  onApply(edit: Video4Import): Promise<void>;
  onExport(index: number, decrypted: boolean): Promise<void>;
};
export function BattleVideo4Editor(props: Props) {
  const [index, setIndex] = useState(0),
    [loaded, setLoaded] = useState<{ revision: number; c: Video4Catalog }>();
  const reader = useRef(props.onRead);
  useEffect(() => {
    reader.current = props.onRead;
  }, [props.onRead]);
  useEffect(() => {
    let active = true;
    void reader.current(index).then((c) => {
      if (active && c) setLoaded({ revision: props.revision, c });
    });
    return () => {
      active = false;
    };
  }, [props.revision, index]);
  return (
    <section className="save-record-editor save-video4-editor">
      <h3>{video4Words[props.lang].title}</h3>
      {loaded?.revision === props.revision && loaded.c.index === index ? (
        <VideoForm
          key={`${props.revision}-${index}`}
          {...props}
          c={loaded.c}
          onIndex={setIndex}
        />
      ) : (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={props.busy}
            onClick={() =>
              void props.onRead(index).then((c) => {
                if (c) setLoaded({ revision: props.revision, c });
              })
            }
          >
            {video4Words[props.lang].read}
          </button>
        </div>
      )}
    </section>
  );
}
function VideoForm({
  c,
  busy,
  lang,
  onPreview,
  onApply,
  onExport,
  onIndex,
}: Props & { c: Video4Catalog; onIndex(index: number): void }) {
  const w = video4Words[lang],
    [decrypted, setDecrypted] = useState(false),
    [reading, setReading] = useState(false),
    [pending, setPending] = useState<{
      edit: Video4Import;
      preview: Video4Preview;
      name: string;
    }>(),
    [error, setError] = useState("");
  const video = c.slots.find((v) => v.index === c.index)!,
    locked = busy || reading || !!pending;
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setError("");
    try {
      if (file.size !== 7520) {
        setError(w.fileError);
        return;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const edit = video4Import(c, btoa(binary)),
        preview = await onPreview(edit);
      if (!preview) return;
      video4Confirmation(c, edit, preview);
      setPending({ edit, preview, name: file.name });
    } catch {
      setError(w.invalid);
    } finally {
      setReading(false);
    }
  };
  return (
    <>
      <label>
        <span>{w.slot}</span>
        <Select
          value={c.index}
          disabled={locked}
          onChange={(e) => onIndex(Number(e.target.value))}
        >
          {c.slots.map((v) => (
            <option key={v.index} value={v.index}>
              {v.index + 1} · {v.index === 0 ? w.own : `${w.other} ${v.index}`}{" "}
              ·{" "}
              {v.available
                ? v.teams
                    .map((t) => t.name)
                    .filter(Boolean)
                    .join(" / ") || w.empty
                : w.uninitialized}
            </option>
          ))}
        </Select>
      </label>
      <p>
        {video.available
          ? video.valid
            ? w.valid
            : w.invalidVideo
          : w.uninitialized}
      </p>
      <p>{w.partial}</p>
      <Teams video={video} lang={lang} />
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={locked || !video.available}
          onClick={() => void onExport(c.index, decrypted)}
        >
          {w.export}
        </button>
      </div>
      <label className="save-video4-check">
        <input
          type="checkbox"
          checked={decrypted}
          disabled={locked || !video.available}
          onChange={(e) => setDecrypted(e.target.checked)}
        />
        <span>{w.decrypted}</span>
      </label>
      <label>
        <span>{w.import}</span>
        <input
          type="file"
          accept=".bv4"
          disabled={locked || !c.canEdit || !video.available}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            void upload(file);
          }}
        />
      </label>
      {pending && (
        <section className="save-video4-preview" aria-label={w.preview}>
          <h4>{w.preview}</h4>
          <p>
            {pending.name} ·{" "}
            {pending.preview.inputDecrypted ? w.decrypted : w.encrypted}
          </p>
          <p>{w.replacing}</p>
          <Teams video={pending.preview.video} lang={lang} />
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || reading || !c.canEdit}
              onClick={() => {
                try {
                  const edit = video4Confirmation(
                    c,
                    pending.edit,
                    pending.preview,
                  );
                  setError("");
                  void onApply(edit);
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
              onClick={() => setPending(undefined)}
            >
              {w.cancel}
            </button>
          </div>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      <p>{w.note}</p>
    </>
  );
}
function Teams({ video, lang }: { video: Video4Info; lang: Br4Lang }) {
  const w = video4Words[lang];
  return (
    <div className="save-video4-teams">
      {video.teams.map((team) => (
        <section key={team.index} className="save-video4-team">
          <h4>
            {w.player} {team.index + 1} · {team.name || "—"}
          </h4>
          {team.storedCount > 6 && (
            <p>
              {w.count}: {team.storedCount}
            </p>
          )}
          {team.members.length ? (
            <ul>
              {team.members.map((member) => (
                <li key={member.slot}>
                  <img
                    src={
                      member.pokemon
                        ? pokemonImage(member.pokemon)
                        : speciesImage(member.species)
                    }
                    alt=""
                  />
                  <div>
                    <strong>
                      {member.pokemon?.speciesName[lang] ??
                        `${w.unknown} ${member.species}`}
                    </strong>
                    <span>{member.pokemon?.nickname || "—"}</span>
                  </div>
                  <span>
                    {member.pokemon
                      ? `${w.level} ${member.pokemon.level}`
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>{w.empty}</p>
          )}
        </section>
      ))}
    </div>
  );
}
