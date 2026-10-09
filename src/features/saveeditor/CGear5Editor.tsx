import { useEffect, useRef, useState } from "react";
import type { Br4Lang } from "./br4";
import {
  CGEAR5_RAW_BYTES,
  cgear5Base64,
  cgear5Frozen,
  cgear5Import,
  cgear5Words,
  type CGear5Catalog,
  type CGear5Edit,
  type CGear5Preview,
} from "./cgear5";
import { cgear5PngBlob, decodeCGear5Png, drawCGear5 } from "./cgear5Image";
import "./CGear5Editor.css";

type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<CGear5Catalog | undefined>;
  onPreview(edit: CGear5Edit): Promise<CGear5Preview | undefined>;
  onApply(edit: CGear5Edit): Promise<void>;
  onExport(extension: string): Promise<void>;
};
export function CGear5Editor(props: Props) {
  const [loaded, setLoaded] = useState<{
    revision: number;
    c: CGear5Catalog;
  }>();
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
    <section className="save-record-editor save-cgear5-editor">
      <h3>{cgear5Words[props.lang].title}</h3>
      {loaded?.revision === props.revision ? (
        <CGearForm key={props.revision} {...props} c={loaded.c} />
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
            {cgear5Words[props.lang].read}
          </button>
        </div>
      )}
    </section>
  );
}
function CGearImage({
  c,
  title,
  lang,
}: {
  c: CGear5Catalog;
  title: string;
  lang: Br4Lang;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setFailed(false);
      if (c.pixels && ref.current) {
        try {
          drawCGear5(ref.current, c.pixels);
        } catch {
          setFailed(true);
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [c.pixels]);
  const w = cgear5Words[lang];
  return (
    <figure className="save-cgear5-image">
      <figcaption>{title}</figcaption>
      {c.pixels ? (
        <canvas ref={ref} aria-label={title} role="img" />
      ) : (
        <p className="save-cgear5-empty">
          {c.uninitialized ? w.empty : w.renderError}
        </p>
      )}
      {failed && <p role="alert">{w.renderError}</p>}
    </figure>
  );
}
function CGearForm({
  c,
  busy,
  lang,
  onPreview,
  onApply,
  onExport,
}: Props & { c: CGear5Catalog }) {
  const w = cgear5Words[lang],
    [pending, setPending] = useState<{
      name: string;
      preview: CGear5Preview;
    }>(),
    [reading, setReading] = useState(false),
    [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const locked = busy || reading || !!pending;
  const upload = async (
    file: File | undefined,
    action: CGear5Edit["action"],
  ) => {
    if (!file) return;
    setError("");
    setReading(true);
    try {
      if (action === "raw" && file.size !== CGEAR5_RAW_BYTES)
        throw Error(w.invalid);
      const bytes =
        action === "image"
          ? await decodeCGear5Png(file)
          : new Uint8Array(await file.arrayBuffer());
      if (!alive.current) return;
      const edit = cgear5Import(c, action, cgear5Base64(bytes)),
        preview = await onPreview(edit);
      if (!alive.current || !preview) return;
      cgear5Frozen(c, preview);
      setPending({ name: file.name, preview });
    } catch {
      if (alive.current)
        setError(action === "image" ? w.imageError : w.invalid);
    } finally {
      if (alive.current) setReading(false);
    }
  };
  const exportPng = async () => {
    if (!c.pixels) return;
    setReading(true);
    setError("");
    try {
      const blob = await cgear5PngBlob(c.pixels);
      if (!alive.current) return;
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = "C-Gear.png";
        a.click();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    } catch {
      if (alive.current) setError(w.invalid);
    } finally {
      if (alive.current) setReading(false);
    }
  };
  return (
    <div className="save-cgear5-body" aria-busy={busy || reading}>
      <p>{w.note}</p>
      <div className="save-cgear5-grid">
        <CGearImage c={c} title={w.current} lang={lang} />
        <div className="save-cgear5-actions">
          <dl className="save-cgear5-metadata">
            <div>
              <dt>{c.hasSkin ? w.present : w.absent}</dt>
              <dd>{c.extension}</dd>
            </div>
            <div>
              <dt>{w.checksum}</dt>
              <dd>{c.checksum.toString(16).toUpperCase().padStart(4, "0")}</dd>
            </div>
            <div>
              <dt>{w.count}</dt>
              <dd>{c.downloadCount}</dd>
            </div>
            <div>
              <dt>{w.state}</dt>
              <dd>
                {c.downloadState.toString(16).toUpperCase().padStart(4, "0")}
              </dd>
            </div>
          </dl>
          <label>
            <span>{w.rawImport} · psk / cgb</span>
            <input
              type="file"
              accept=".psk,.cgb"
              disabled={locked || !c.canEdit}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void upload(file, "raw");
              }}
            />
          </label>
          <label>
            <span>{w.imageImport}</span>
            <input
              type="file"
              accept="image/png,.png"
              disabled={locked || !c.canEdit}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void upload(file, "image");
              }}
            />
          </label>
          <p>{w.imageNote}</p>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked || c.uninitialized}
              onClick={() => void onExport(c.extension)}
            >
              {w.rawExport}
            </button>
            <button
              type="button"
              disabled={locked || !c.renderable}
              onClick={() => void exportPng()}
            >
              {w.imageExport}
            </button>
          </div>
        </div>
      </div>
      {error && (
        <p className="save-editor-error" role="alert">
          {error}
        </p>
      )}
      {pending && (
        <section className="save-cgear5-preview" aria-label={w.preview}>
          <h4>
            {w.preview} · {pending.name}
          </h4>
          <div className="save-cgear5-grid">
            <CGearImage
              c={pending.preview.result}
              title={w.result}
              lang={lang}
            />
            <div className="save-cgear5-actions">
              <dl className="save-cgear5-metadata">
                {pending.preview.colors !== null && (
                  <div>
                    <dt>{w.colors}</dt>
                    <dd>{pending.preview.colors} / 16</dd>
                  </div>
                )}
                {pending.preview.tiles !== null && (
                  <div>
                    <dt>{w.tiles}</dt>
                    <dd>{pending.preview.tiles} / 255</dd>
                  </div>
                )}
                {pending.preview.pixelChanges !== null && (
                  <div>
                    <dt>{w.pixels}</dt>
                    <dd>{pending.preview.pixelChanges}</dd>
                  </div>
                )}
                <div>
                  <dt>{w.changed}</dt>
                  <dd>{pending.preview.changedOffsets.length}</dd>
                </div>
                <div>
                  <dt>{w.checksum}</dt>
                  <dd>
                    {pending.preview.result.checksum
                      .toString(16)
                      .toUpperCase()
                      .padStart(4, "0")}
                  </dd>
                </div>
                <div>
                  <dt>{w.count}</dt>
                  <dd>{pending.preview.result.downloadCount}</dd>
                </div>
              </dl>
              {((pending.preview.colors ?? 0) > 16 ||
                (pending.preview.tiles ?? 0) > 255) && (
                <p className="save-cgear5-warning" role="status">
                  {w.overflow}
                </p>
              )}
              <details>
                <summary>{w.offsets}</summary>
                <p className="save-cgear5-offsets">
                  {pending.preview.changedOffsets
                    .map((v) => v.toString(16).toUpperCase())
                    .join(" · ")}
                </p>
              </details>
            </div>
          </div>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || reading}
              onClick={() => {
                try {
                  void onApply(cgear5Frozen(c, pending.preview));
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
