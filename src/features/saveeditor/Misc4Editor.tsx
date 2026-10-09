import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { Br4Lang } from "./br4";
import {
  misc4Actions,
  misc4Backdrops,
  misc4Bulk,
  misc4Frozen,
  misc4Image,
  misc4Number,
  misc4Pixel,
  misc4Words,
  type Misc4Catalog,
  type Misc4Edit,
  type Misc4Preview,
  type Misc4Row,
} from "./misc4";
import "./Misc4Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Misc4Catalog | undefined>;
  onPreview(edit: Misc4Edit): Promise<Misc4Preview | undefined>;
  onApply(edit: Misc4Edit): Promise<void>;
  onRelated(kind: "food" | "pokegear4" | "pokeathlon4"): void;
};
export function Misc4Editor(props: Props) {
  const [group, setGroup] = useState("general"),
    [entry, setEntry] = useState(""),
    [loaded, setLoaded] = useState<{ revision: number; c: Misc4Catalog }>();
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
  const w = misc4Words[props.lang];
  return (
    <section className="save-record-editor save-misc4-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === props.revision ? (
        <MainForm
          key={props.revision}
          {...props}
          c={loaded.c}
          group={group}
          setGroup={setGroup}
          entry={entry}
          setEntry={setEntry}
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
            {w.read}
          </button>
        </div>
      )}
    </section>
  );
}
function MainForm({
  c,
  group: requestedGroup,
  setGroup,
  entry,
  setEntry,
  busy,
  lang,
  onPreview,
  onApply,
  onRelated,
}: Props & {
  c: Misc4Catalog;
  group: string;
  setGroup(v: string): void;
  entry: string;
  setEntry(v: string): void;
}) {
  const [preview, setPreview] = useState<Misc4Preview>(),
    [pending, setPending] = useState<Misc4Edit>(),
    [rawDraft, setRawDraft] = useState<{ key: string; value: string }>(),
    [backdrops, setBackdrops] = useState<number[]>(),
    [error, setError] = useState("");
  const w = misc4Words[lang],
    group = c.groups.some((g) => g.id === requestedGroup)
      ? requestedGroup
      : "general",
    rows = c.rows.filter((r) => r.group === group),
    indexed =
      ["seals", "accessories", "records32", "records16"].includes(group) ||
      group.startsWith("hall."),
    selected = rows.find((r) => r.key === entry) ?? rows[0],
    visible = indexed && selected ? [selected] : rows,
    locked = busy || !!rawDraft || !!pending || !!preview || !!backdrops;
  const start = async (edit: Misc4Edit) => {
    setError("");
    const result = await onPreview(edit);
    if (result) setPreview(result);
  };
  const prepare = (build: () => Misc4Edit) => {
    try {
      void start(build());
    } catch {
      setError(w.invalid);
    }
  };
  const before = new Map(c.rows.map((r) => [r.key, r.value]));
  return (
    <>
      <label>
        <span>{w.group}</span>
        <Select
          value={group}
          disabled={locked}
          onChange={(e) => setGroup(e.target.value)}
        >
          {c.groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name[lang]}
            </option>
          ))}
        </Select>
      </label>
      {group.startsWith("bf.2") && !c.hallAvailable && <p>{w.missingHall}</p>}
      {group.startsWith("records") && <p>{w.recordNote}</p>}
      {indexed && selected && (
        <label>
          <span>{w.entry}</span>
          <Select
            value={selected.key}
            disabled={locked}
            onChange={(e) => setEntry(e.target.value)}
          >
            {rows.map((r) => (
              <option key={r.key} value={r.key}>
                {r.name[lang]}
              </option>
            ))}
          </Select>
        </label>
      )}
      <fieldset
        disabled={busy || !c.canEdit || !!preview}
        className="save-misc4-body"
      >
        <div className="save-misc4-fields">
          {visible.map((r) => (
            <NumberField
              key={r.key}
              row={r}
              lang={lang}
              blocked={!!backdrops || (!!rawDraft && rawDraft.key !== r.key)}
              edit={pending?.values?.find((v) => v.key === r.key)?.value}
              draft={rawDraft?.key === r.key ? rawDraft.value : ""}
              onEdit={(value, raw) => {
                const text = raw ?? (value === undefined ? "" : String(value));
                setRawDraft(
                  text === "" ? undefined : { key: r.key, value: text },
                );
                if (value === undefined) {
                  setPending(undefined);
                  setError(text === "" ? "" : w.invalid);
                } else
                  try {
                    setPending(misc4Number(c, r.key, value));
                    setError("");
                  } catch {
                    setError(w.invalid);
                  }
              }}
            />
          ))}
        </div>
        {group === "backdrops" && c.backdrops && (
          <>
            <p>{w.backdropNote}</p>
            <div className="save-misc4-fields">
              {(backdrops ?? c.backdrops).map((id, pos) => (
                <label key={pos}>
                  <span>
                    {w.slot} {pos + 1}
                  </span>
                  <Select
                    value={id}
                    onChange={(e) => {
                      const next = [...(backdrops ?? c.backdrops!)];
                      next[pos] = Number(e.target.value);
                      setBackdrops(next);
                    }}
                  >
                    {[...c.backdropChoices]
                      .sort((a, b) =>
                        a.name[lang].localeCompare(b.name[lang], lang),
                      )
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name[lang]}
                        </option>
                      ))}
                  </Select>
                </label>
              ))}
            </div>
          </>
        )}
        {(rawDraft || pending || backdrops) && (
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={!pending && !backdrops}
              onClick={() =>
                prepare(() => pending ?? misc4Backdrops(c, backdrops!))
              }
            >
              {w.preview}
            </button>
            <button
              type="button"
              onClick={() => {
                setPending(undefined);
                setRawDraft(undefined);
                setError("");
                setBackdrops(undefined);
              }}
            >
              {w.discard}
            </button>
          </div>
        )}
        {!rawDraft && !pending && !backdrops && (
          <div className="save-editor-toolbar">
            {misc4Actions(group).map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => prepare(() => misc4Bulk(c, group, action))}
              >
                {w[action]}
              </button>
            ))}
          </div>
        )}
        {group === "poketch" && c.pixels && (
          <DotArt
            pixels={c.pixels}
            lang={lang}
            disabled={busy || !!rawDraft || !!pending || !!preview}
            onPixel={(pixel) => prepare(() => misc4Pixel(c, pixel))}
            onImage={(rgb, size) => prepare(() => misc4Image(c, rgb, size))}
          />
        )}
      </fieldset>
      {preview && (
        <section className="save-misc4-preview" aria-label={w.preview}>
          <h4>{w.preview}</h4>
          {!preview.data.length && <p>{w.noChanges}</p>}
          {preview.changed.map((r) => {
            const input = preview.request.values?.find(
              (v) => v.key === r.key,
            )?.value;
            return (
              <p key={r.key}>
                {r.name[lang]}: {before.get(r.key)} → {r.value}
                {input !== undefined && input !== r.value
                  ? ` (${w.input}: ${input} · ${w.stored}: ${r.value})`
                  : ""}
              </p>
            );
          })}
          {group === "backdrops" && preview.backdrops && (
            <ol className="save-misc4-backdrop-preview">
              {preview.backdrops.map((id, pos) => (
                <li key={pos}>
                  {c.backdropChoices.find((v) => v.id === id)?.name[lang]}
                </li>
              ))}
            </ol>
          )}
          {preview.request.action.startsWith("dot") && preview.pixels && (
            <DotCanvas pixels={preview.pixels} label={w.preview} />
          )}
          <details>
            <summary>
              {w.data} (
              {preview.data.reduce((n, d) => n + d.before.length / 2, 0)})
            </summary>
            <div className="save-misc4-data">
              {preview.data.map((d) => (
                <p key={`${d.region}.${d.offset}`}>
                  <code>
                    {d.region} +{d.offset.toString(16).toUpperCase()}:{" "}
                    {d.before} → {d.after}
                  </code>
                </p>
              ))}
            </div>
          </details>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy}
              onClick={() => prepareCommit()}
            >
              {w.confirm}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPreview(undefined)}
            >
              {w.cancel}
            </button>
          </div>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      <p>{w.note}</p>
      <div>
        <p>{w.linked}</p>
        <div className="save-editor-toolbar">
          {c.pixels ? (
            <button
              type="button"
              disabled={locked}
              onClick={() => onRelated("food")}
            >
              {w.poffins}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={locked}
                onClick={() => onRelated("pokegear4")}
              >
                {w.gear}
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => onRelated("pokeathlon4")}
              >
                {w.ath}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
  function prepareCommit() {
    try {
      void onApply(misc4Frozen(c, preview!));
      setError("");
    } catch {
      setError(w.invalid);
    }
  }
}
function NumberField({
  row: r,
  lang,
  blocked,
  edit,
  draft,
  onEdit,
}: {
  row: Misc4Row;
  lang: Br4Lang;
  blocked: boolean;
  edit: number | undefined;
  draft: string;
  onEdit(v: number | undefined, raw?: string): void;
}) {
  const w = misc4Words[lang];
  const valid =
    draft === "" ||
    (/^-?[0-9]+$/.test(draft) &&
      Number(draft) >= r.minimum &&
      Number(draft) <= r.maximum);
  return (
    <div className="save-misc4-field">
      <label>
        <span>{r.name[lang]}</span>
        {!r.writable ? (
          <output>{r.value}</output>
        ) : r.choices ? (
          <Select
            value={edit ?? r.value}
            disabled={blocked}
            onChange={(e) => onEdit(Number(e.target.value))}
          >
            {!r.choices.some((v) => v.id === r.value) && (
              <option value={r.value} disabled>
                {w.old}: {r.value}
              </option>
            )}
            {r.choices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name[lang]}
              </option>
            ))}
          </Select>
        ) : r.minimum === 0 && r.maximum === 1 ? (
          <span className="save-misc4-check">
            <input
              type="checkbox"
              disabled={blocked}
              checked={(edit ?? r.value) !== 0}
              onChange={(e) => onEdit(e.target.checked ? 1 : 0)}
            />
            <span>
              {r.value} → {edit ?? r.value}
            </span>
          </span>
        ) : (
          <input
            type="text"
            inputMode="numeric"
            maxLength={r.width}
            placeholder={String(r.value)}
            value={draft}
            disabled={blocked}
            aria-invalid={!valid}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "") onEdit(undefined, value);
              else if (
                /^-?[0-9]+$/.test(value) &&
                Number(value) >= r.minimum &&
                Number(value) <= r.maximum
              )
                onEdit(Number(value), value);
              else onEdit(undefined, value);
            }}
          />
        )}
      </label>
      {r.writable && r.maximum !== 1 && (
        <p>
          {w.current}: {r.value} · {w.limit}: {r.minimum}–{r.maximum}
          {r.storeMaximum !== null && r.storeMaximum < r.maximum
            ? ` · ${w.stored} ≤ ${r.storeMaximum}`
            : ""}
        </p>
      )}
    </div>
  );
}
function DotCanvas({
  pixels,
  label,
  onPixel,
  disabled,
}: {
  pixels: number[];
  label: string;
  onPixel?(i: number): void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    [cursor, setCursor] = useState(0);
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(24, 20),
      colors = [248, 168, 88, 8];
    for (let i = 0; i < 480; i++) {
      const value = colors[pixels[i]];
      image.data.set([value, value, value, 255], i * 4);
    }
    ctx.putImageData(image, 0, 0);
  }, [pixels]);
  return (
    <canvas
      ref={ref}
      width={24}
      height={20}
      className="save-misc4-canvas"
      role="img"
      aria-label={`${label}${onPixel ? ` (${cursor % 24}, ${Math.floor(cursor / 24)})` : ""}`}
      tabIndex={onPixel && !disabled ? 0 : undefined}
      onClick={(e) => {
        if (!onPixel || disabled) return;
        const r = e.currentTarget.getBoundingClientRect();
        const x = Math.max(
            0,
            Math.min(23, Math.floor(((e.clientX - r.left) * 24) / r.width)),
          ),
          y = Math.max(
            0,
            Math.min(19, Math.floor(((e.clientY - r.top) * 20) / r.height)),
          );
        setCursor(x + y * 24);
        onPixel(x + y * 24);
      }}
      onKeyDown={(e) => {
        if (!onPixel || disabled) return;
        const move: { [key: string]: number } = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -24,
          ArrowDown: 24,
        };
        if (e.key in move) {
          e.preventDefault();
          setCursor((v) => Math.max(0, Math.min(479, v + move[e.key])));
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPixel(cursor);
        }
      }}
    />
  );
}
function DotArt({
  pixels,
  lang,
  disabled,
  onPixel,
  onImage,
}: {
  pixels: number[];
  lang: Br4Lang;
  disabled: boolean;
  onPixel(i: number): void;
  onImage(rgb: number[], size: number): void;
}) {
  const [pixel, setPixel] = useState("0"),
    [error, setError] = useState("");
  const w = misc4Words[lang];
  const load = async (file: File | undefined) => {
    if (!file || disabled) return;
    try {
      if (file.size < 1 || file.size > 2058) throw Error();
      const image = await createImageBitmap(file);
      try {
        if (image.width !== 24 || image.height !== 20) throw Error();
        const canvas = document.createElement("canvas");
        canvas.width = 24;
        canvas.height = 20;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw Error();
        ctx.drawImage(image, 0, 0);
        const rgba = ctx.getImageData(0, 0, 24, 20).data;
        const rgb = Array.from(
          { length: 1440 },
          (_, i) => rgba[Math.floor(i / 3) * 4 + (i % 3)],
        );
        onImage(rgb, file.size);
        setError("");
      } finally {
        image.close();
      }
    } catch {
      setError(w.imageError);
    }
  };
  return (
    <div
      className="save-misc4-dot"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void load(e.dataTransfer.files[0]);
      }}
    >
      <h4>{w.dot}</h4>
      <DotCanvas
        pixels={pixels}
        label={w.dot}
        onPixel={onPixel}
        disabled={disabled}
      />
      <div className="save-misc4-fields">
        <label>
          <span>{w.pixel} (0–479)</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={3}
            value={pixel}
            disabled={disabled}
            onChange={(e) => setPixel(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={disabled || !/^\d+$/.test(pixel) || Number(pixel) > 479}
          onClick={() => onPixel(Number(pixel))}
        >
          {w.cycle}
        </button>
      </div>
      <label>
        <span>{w.image}</span>
        <input
          type="file"
          accept="image/*"
          disabled={disabled}
          onChange={(e) => {
            void load(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <p>{w.imageNote}</p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
