import { useEffect, useRef, useState } from "react";
import { canEnableGsBall2, gsBall2Words, type GsBall2Catalog } from "./gsBall2";
export function GsBall2Editor({
  revision,
  busy,
  lang,
  onRead,
  onEnable,
}: {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<GsBall2Catalog | undefined>;
  onEnable(): Promise<void>;
}) {
  const reader = useRef(onRead);
  const [loaded, setLoaded] = useState<{
    revision: number;
    catalog: GsBall2Catalog;
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
  const w = gsBall2Words[lang],
    catalog = loaded?.revision === revision ? loaded.catalog : undefined;
  return (
    <section className="save-record-editor">
      <h3>{w.title}</h3>
      {catalog ? (
        <>
          <p role="status">
            {!catalog.available
              ? w.unavailable
              : catalog.enabled
                ? w.enabled
                : w.pending}
          </p>
          {catalog.available && !catalog.canEdit && (
            <p className="save-editor-note">{w.readonly}</p>
          )}
          <button
            type="button"
            className="primary"
            disabled={busy || !canEnableGsBall2(catalog)}
            onClick={() => void onEnable()}
          >
            {w.enable}
          </button>
          <p className="save-editor-note">{w.note}</p>
        </>
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
