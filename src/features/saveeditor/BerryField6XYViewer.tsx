import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { Br4Lang } from "./br4";
import {
  berry6xyPlot,
  berry6xyWords,
  type Berry6XYCatalog,
} from "./berryField6xy";
import "./BerryField6XYViewer.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Berry6XYCatalog | undefined>;
};
export function BerryField6XYViewer(props: Props) {
  const [loaded, setLoaded] = useState<{
      revision: number;
      c: Berry6XYCatalog;
    }>(),
    [index, setIndex] = useState(0);
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
  const w = berry6xyWords[props.lang];
  let plot: ReturnType<typeof berry6xyPlot> | undefined,
    error = false;
  const c = loaded?.revision === props.revision ? loaded.c : undefined;
  if (c) {
    try {
      plot = berry6xyPlot(c, index);
    } catch {
      error = true;
    }
  }
  return (
    <section className="save-record-editor save-berry6xy-viewer">
      <h3>{w.title}</h3>
      <p>{w.unfinished}</p>
      <p>{w.note}</p>
      {!c ? (
        <button
          type="button"
          disabled={props.busy}
          onClick={() =>
            void props.onRead().then((c) => {
              if (c) setLoaded({ revision: props.revision, c });
            })
          }
        >
          {w.read}
        </button>
      ) : error ? (
        <p role="alert" className="save-editor-error">
          {w.invalid}
        </p>
      ) : (
        plot && (
          <>
            <label>
              <span>{w.field}</span>
              <Select
                value={index}
                disabled={props.busy}
                onChange={(e) => setIndex(Number(e.target.value))}
              >
                {c.plots.map((p) => (
                  <option key={p.index} value={p.index}>
                    {String(p.index + 1).padStart(2, "0")}
                  </option>
                ))}
              </Select>
            </label>
            <dl className="save-berry6xy-values">
              {plot.values.map((v, i) => (
                <div key={i}>
                  <dt>{i === 0 ? w.berry : w.unknown + " " + i}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <details>
              <summary>{w.raw}</summary>
              <p>{plot.rawHex}</p>
            </details>
          </>
        )
      )}
    </section>
  );
}
