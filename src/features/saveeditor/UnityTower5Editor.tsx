import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { Br4Lang } from "./br4";
import { gl5Words } from "./globalLink5";
import {
  tower5Action,
  tower5Frozen,
  tower5Patch,
  tower5Words,
  type Tower5Catalog,
  type Tower5Edit,
  type Tower5Preview,
} from "./unityTower5";
import "./UnityTower5Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Tower5Catalog | undefined>;
  onPreview(e: Tower5Edit): Promise<Tower5Preview | undefined>;
  onApply(e: Tower5Edit): Promise<void>;
};
export function UnityTower5Editor(props: Props) {
  const [loaded, setLoaded] = useState<{
      revision: number;
      c: Tower5Catalog;
    }>(),
    [country, setCountry] = useState(1),
    [region, setRegion] = useState(0);
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
    <section className="save-record-editor save-unity5-editor">
      <h3>{tower5Words[props.lang].title}</h3>
      {loaded?.revision === props.revision ? (
        <Form
          key={props.revision}
          {...props}
          c={loaded.c}
          country={country}
          region={region}
          onCountry={(v) => {
            setCountry(v);
            setRegion(loaded.c.points.find((p) => p.country === v)!.region);
          }}
          onRegion={setRegion}
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
          {tower5Words[props.lang].read}
        </button>
      )}
    </section>
  );
}
function Form({
  c,
  country,
  region,
  onCountry,
  onRegion,
  busy,
  lang,
  onPreview,
  onApply,
}: Props & {
  c: Tower5Catalog;
  country: number;
  region: number;
  onCountry(c: number): void;
  onRegion(r: number): void;
}) {
  const w = tower5Words[lang],
    common = gl5Words[lang],
    rows = c.points.filter((p) => p.country === country),
    row = rows.find((p) => p.region === region) ?? rows[0],
    floor = c.floors.find((f) => f.country === country)!;
  const [point, setPoint] = useState<number>(),
    [unlockedFloor, setUnlockedFloor] = useState<boolean>(),
    [global, setGlobal] = useState<boolean>(),
    [unlocked, setUnlocked] = useState<boolean>(),
    [preview, setPreview] = useState<Tower5Preview>(),
    [error, setError] = useState("");
  const dirty =
      point !== undefined ||
      unlockedFloor !== undefined ||
      global !== undefined ||
      unlocked !== undefined,
    locked = busy || dirty || !!preview,
    writable = c.canEdit && !busy && !preview;
  const start = async (e: Tower5Edit) => {
    setError("");
    try {
      const p = await onPreview(e);
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    }
  };
  const patch = () => {
    try {
      void start(
        tower5Patch(c, {
          ...(point !== undefined ? { points: [{ id: row.id, point }] } : {}),
          ...(unlockedFloor !== undefined
            ? { floors: [{ country, unlocked: unlockedFloor }] }
            : {}),
          ...(global !== undefined ? { global } : {}),
          ...(unlocked !== undefined ? { unlocked } : {}),
        }),
      );
    } catch {
      setError(w.invalid);
    }
  };
  const action = (action: Exclude<Tower5Edit["action"], "patch">) => {
    try {
      void start(tower5Action(c, action));
    } catch {
      setError(w.invalid);
    }
  };
  const discard = () => {
    setPoint(undefined);
    setUnlockedFloor(undefined);
    setGlobal(undefined);
    setUnlocked(undefined);
    setPreview(undefined);
    setError("");
  };
  const boolean = (v: boolean) => (v ? w.yes : w.no);
  const changedPoints =
      preview?.result.points.filter(
        (p) => p.point !== c.points.find((v) => v.id === p.id)!.point,
      ) ?? [],
    changedFloors =
      preview?.result.floors.filter(
        (f) =>
          f.unlocked !==
          c.floors.find((v) => v.country === f.country)!.unlocked,
      ) ?? [];
  return (
    <div className="save-unity5-body">
      <p>
        {w.owned}: {c.country} / {c.region}
      </p>
      <p>{w.ownNote}</p>
      {!c.ownSafe ? (
        <p className="save-editor-error" role="alert">
          {w.unsafe}
        </p>
      ) : !c.ownListed ? (
        <p>{w.unlisted}</p>
      ) : null}
      <div className="save-unity5-grid">
        <label>
          <span>{w.country}</span>
          <Select
            value={country}
            disabled={locked}
            onChange={(e) => onCountry(Number(e.target.value))}
          >
            {[...c.floors]
              .sort((a, b) => a.name[lang].localeCompare(b.name[lang]))
              .map((f) => (
                <option key={f.country} value={f.country}>
                  {f.name[lang]} · {f.country}
                </option>
              ))}
          </Select>
        </label>
        <label>
          <span>{w.region}</span>
          <Select
            value={row.region}
            disabled={locked}
            onChange={(e) => onRegion(Number(e.target.value))}
          >
            {[...rows]
              .sort((a, b) =>
                a.regionName[lang].localeCompare(b.regionName[lang]),
              )
              .map((p) => (
                <option key={p.id} value={p.region}>
                  {p.regionName[lang]} · {p.region}
                </option>
              ))}
          </Select>
        </label>
      </div>
      <fieldset className="save-unity5-fields" disabled={!writable}>
        <div className="save-unity5-grid">
          <label>
            <span>
              {w.point} · {common.current}: {w.pointNames[row.point]}
            </span>
            <Select
              value={point ?? row.point}
              disabled={!writable}
              onChange={(e) => setPoint(Number(e.target.value))}
            >
              {w.pointNames.map((name, i) => (
                <option key={i} value={i}>
                  {name}
                </option>
              ))}
            </Select>
          </label>
          <label className="save-unity5-check">
            <input
              type="checkbox"
              checked={unlockedFloor ?? floor.unlocked}
              onChange={(e) => setUnlockedFloor(e.target.checked)}
            />
            <span>
              {w.floor} · {floor.name[lang]}
            </span>
          </label>
          <label className="save-unity5-check">
            <input
              type="checkbox"
              checked={global ?? c.global}
              onChange={(e) => setGlobal(e.target.checked)}
            />
            <span>
              {w.global} · 0x{c.rawGlobal.toString(16).toUpperCase()}
            </span>
          </label>
          <label className="save-unity5-check">
            <input
              type="checkbox"
              checked={unlocked ?? c.unlocked}
              onChange={(e) => setUnlocked(e.target.checked)}
            />
            <span>
              {w.unlocked} · 0x{c.rawUnlocked.toString(16).toUpperCase()}
            </span>
          </label>
        </div>
      </fieldset>
      {floor.legal && <small>{w.legalTag}</small>}
      <div className="save-editor-toolbar">
        <button type="button" disabled={!writable || !dirty} onClick={patch}>
          {common.preview}
        </button>
        <button type="button" disabled={busy || !dirty} onClick={discard}>
          {common.discard}
        </button>
      </div>
      <div className="save-editor-toolbar">
        {(["all", "legal", "clear", "resave"] as const).map((actionName) => (
          <button
            type="button"
            key={actionName}
            disabled={locked || !c.canEdit}
            onClick={() => action(actionName)}
          >
            {w[actionName]}
          </button>
        ))}
      </div>
      <p>{w.resaveNote}</p>
      {error && (
        <p role="alert" className="save-editor-error">
          {error}
        </p>
      )}
      {preview && (
        <section className="save-unity5-preview" aria-label={common.preview}>
          <h4>{common.changes}</h4>
          <p>
            {common.changed}: {preview.changedOffsets.length}
          </p>
          <div className="save-unity5-changes">
            {changedPoints.map((p) => (
              <p key={p.id}>
                {p.countryName[lang]} / {p.regionName[lang]} ({p.country}/
                {p.region}):{" "}
                {w.pointNames[c.points.find((v) => v.id === p.id)!.point]} →{" "}
                {w.pointNames[p.point]}
              </p>
            ))}
            {changedFloors.map((f) => (
              <p key={f.country}>
                {w.floor} · {f.name[lang]} ({f.country}):{" "}
                {boolean(
                  c.floors.find((v) => v.country === f.country)!.unlocked,
                )}{" "}
                → {boolean(f.unlocked)}
              </p>
            ))}
            {preview.result.rawGlobal !== c.rawGlobal && (
              <p>
                {w.global}: 0x{c.rawGlobal.toString(16).toUpperCase()} → 0x
                {preview.result.rawGlobal.toString(16).toUpperCase()}
              </p>
            )}
            {preview.result.rawUnlocked !== c.rawUnlocked && (
              <p>
                {w.unlocked}: 0x{c.rawUnlocked.toString(16).toUpperCase()} → 0x
                {preview.result.rawUnlocked.toString(16).toUpperCase()}
              </p>
            )}
            {!preview.changedOffsets.length && <p>{common.noChanges}</p>}
          </div>
          <details>
            <summary>{common.raw}</summary>
            <div className="save-unity5-raw">
              <p>{c.rawHex}</p>
              <p>{preview.result.rawHex}</p>
            </div>
          </details>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                try {
                  void onApply(tower5Frozen(c, preview));
                } catch {
                  setError(w.stale);
                }
              }}
            >
              {common.apply}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPreview(undefined)}
            >
              {common.cancel}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
