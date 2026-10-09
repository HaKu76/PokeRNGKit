import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { speciesImage } from "./art";
import {
  br4GearWords,
  br4Flag,
  br4Batch,
  type Br4GearCatalog,
  type Br4GearEdit,
  type Br4Lang,
} from "./br4";
import { br4Labels } from "./br4Labels";
import "./Br4GearEditor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Br4GearCatalog | undefined>;
  onApply(edit: Br4GearEdit): Promise<void>;
};
const models = [
  "None",
  "YoungBoy",
  "CoolBoy",
  "MuscleMan",
  "YoungGirl",
  "CoolGirl",
  "LittleGirl",
];
const categories = [
  "Head",
  "Hair",
  "Face",
  "Top",
  "Bottom",
  "Shoes",
  "Hands",
  "Bags",
  "Glasses",
  "Badges",
];
const label = (lang: Br4Lang, key: string) =>
  br4Labels[lang][key] ?? br4Labels.en[key] ?? key.split(".").at(-1)!;
export function Br4GearEditor({
  revision,
  busy,
  lang,
  onRead,
  onApply,
}: Props) {
  const reader = useRef(onRead),
    [loaded, setLoaded] = useState<{ revision: number; c: Br4GearCatalog }>();
  useEffect(() => {
    reader.current = onRead;
  }, [onRead]);
  useEffect(() => {
    let active = true;
    void reader.current().then((c) => {
      if (active && c) setLoaded({ revision, c });
    });
    return () => {
      active = false;
    };
  }, [revision]);
  return (
    <section className="save-record-editor">
      <h3>{label(lang, "SAV_Gear")}</h3>
      {loaded?.revision === revision ? (
        <GearForm
          key={revision}
          c={loaded.c}
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
                if (c) setLoaded({ revision, c });
              })
            }
          >
            {br4GearWords[lang].read}
          </button>
        </div>
      )}
    </section>
  );
}
function GearForm({
  c,
  busy,
  lang,
  onApply,
}: {
  c: Br4GearCatalog;
  busy: boolean;
  lang: Br4Lang;
  onApply: Props["onApply"];
}) {
  const w = br4GearWords[lang],
    [view, setView] = useState<"gear" | "outfits" | "batch">("gear"),
    [model, setModel] = useState(1),
    [category, setCategory] = useState(0),
    [id, setId] = useState(
      c.gear.find((v) => v.model === 1 && v.category === 0)!.id,
    ),
    [outfit, setOutfit] = useState(0),
    [value, setValue] = useState<boolean | undefined>(),
    [action, setAction] = useState<"all" | "defaults">("all"),
    [review, setReview] = useState(false),
    [invalid, setInvalid] = useState(false);
  const dirty = value !== undefined,
    locked = dirty || review,
    rows = c.gear.filter(
      (v) => v.category === category && (v.model === model || v.shared),
    ),
    entry = c.gear.find((v) => v.id === id)!,
    current = view === "gear" ? entry.unlocked : c.outfits[outfit],
    plan = c.plans.find((v) => v.action === action)!;
  const selectGroup = (nextModel: number, nextCategory: number) => {
    setModel(nextModel);
    setCategory(nextCategory);
    setId(
      c.gear.find((v) => v.category === nextCategory && v.model === nextModel)!
        .id,
    );
    setInvalid(false);
  };
  const apply = (batch: boolean) => {
    try {
      const edit = batch
        ? br4Batch(c, action)
        : br4Flag(
            c,
            view === "gear" ? "gear" : "outfits",
            view === "gear" ? id : outfit,
            value!,
          );
      setInvalid(false);
      void onApply(edit);
    } catch {
      setInvalid(true);
    }
  };
  return (
    <div className="save-food-fields">
      <p>
        {w.player}: {c.profile + 1}
      </p>
      <label className="field save-br4-select">
        <span>{w.view}</span>
        <Select
          value={view}
          disabled={busy || locked}
          onChange={(e) => {
            setView(e.target.value as typeof view);
            setInvalid(false);
          }}
        >
          {(["gear", "outfits", "batch"] as const).map((v) => (
            <option key={v} value={v}>
              {w[v]}
            </option>
          ))}
        </Select>
      </label>
      {view === "gear" ? (
        <>
          <div className="save-editor-fields">
            <label className="field">
              <span>{w.model}</span>
              <Select
                value={model}
                disabled={busy || dirty}
                onChange={(e) => selectGroup(Number(e.target.value), category)}
              >
                {models.slice(1).map((v, i) => (
                  <option key={v} value={i + 1}>
                    {label(lang, `ModelBR.${v}`)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>{w.category}</span>
              <Select
                value={category}
                disabled={busy || dirty}
                onChange={(e) => selectGroup(model, Number(e.target.value))}
              >
                {categories.map((v, i) => (
                  <option key={v} value={i}>
                    {label(lang, `GearCategory.${v}`)}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <label className="field">
            <span>{w.item}</span>
            <Select
              value={id}
              disabled={busy || dirty}
              onChange={(e) => {
                setId(Number(e.target.value));
                setInvalid(false);
              }}
            >
              {rows.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name[lang]}
                  {v.shared ? ` · ${w.allModels}` : ""} ·{" "}
                  {v.unlocked ? w.unlocked : w.locked}
                </option>
              ))}
            </Select>
          </label>
          {lang === "zh" && <p>{w.sourceNote}</p>}
        </>
      ) : view === "outfits" ? (
        <>
          <label className="field">
            <span>{w.outfits}</span>
            <Select
              value={outfit}
              disabled={busy || dirty}
              onChange={(e) => {
                setOutfit(Number(e.target.value));
                setInvalid(false);
              }}
            >
              {w.names.map((name, i) => (
                <option key={name} value={i}>
                  {name}
                </option>
              ))}
            </Select>
          </label>
          <div className="save-br4-outfit">
            <img
              src={speciesImage([383, 448, 466, 382, 407, 417][outfit])}
              alt=""
            />
            <span>{w.names[outfit]}</span>
          </div>
        </>
      ) : (
        <>
          <label className="field save-br4-select">
            <span>{w.batch}</span>
            <Select
              value={action}
              disabled={busy || review}
              onChange={(e) => {
                setAction(e.target.value as typeof action);
                setInvalid(false);
              }}
            >
              <option value="all">{label(lang, "SAV_Gear.B_UnlockAll")}</option>
              <option value="defaults">
                {label(lang, "SAV_Gear.B_Clear")}
              </option>
            </Select>
          </label>
          <p>{w.batchNote}</p>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || review}
              onClick={() => setReview(true)}
            >
              {w.preview}
            </button>
          </div>
          {review && (
            <>
              <dl className="save-editor-summary">
                <div>
                  <dt>{w.before}</dt>
                  <dd>{c.gear.filter((v) => v.unlocked).length}</dd>
                </div>
                <div>
                  <dt>{w.after}</dt>
                  <dd>{plan.unlocked}</dd>
                </div>
                <div>
                  <dt>{w.changed}</dt>
                  <dd>{plan.changed.length}</dd>
                </div>
              </dl>
              <details className="save-br4-details">
                <summary>{w.rawChanged}</summary>
                <div className="save-br4-list">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">{w.item}</th>
                        <th scope="col">{w.before}</th>
                        <th scope="col">{w.after}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.changed.map((id) => {
                        const row = c.gear.find((v) => v.id === id);
                        const after =
                          (parseInt(
                            plan.targetHex.slice(
                              (id >> 3) * 2,
                              (id >> 3) * 2 + 2,
                            ),
                            16,
                          ) >>
                            (id & 7)) &
                          1;
                        return (
                          <tr key={id}>
                            <th scope="row">
                              {row ? row.name[lang] : `${w.rawChanged} (${id})`}
                            </th>
                            <td>{after ? 0 : 1}</td>
                            <td>{after}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  className="primary"
                  disabled={busy || !c.canEdit}
                  onClick={() => apply(true)}
                >
                  {w.confirm}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setReview(false);
                    setInvalid(false);
                  }}
                >
                  {w.cancel}
                </button>
              </div>
            </>
          )}
        </>
      )}
      {view !== "batch" && (
        <fieldset className="save-food-fields" disabled={busy || !c.canEdit}>
          <label className="save-food-toggle">
            <input
              type="checkbox"
              checked={value ?? current}
              onChange={(e) => {
                setValue(
                  e.target.checked === current ? undefined : e.target.checked,
                );
                setInvalid(false);
              }}
            />
            <span>{w.unlocked}</span>
          </label>
          <div className="save-editor-toolbar">
            <button
              type="button"
              className="primary"
              disabled={!dirty}
              onClick={() => apply(false)}
            >
              {w.apply}
            </button>
            <button
              type="button"
              disabled={!dirty}
              onClick={() => {
                setValue(undefined);
                setInvalid(false);
              }}
            >
              {w.discard}
            </button>
          </div>
        </fieldset>
      )}
      {locked && <p role="status">{w.draft}</p>}
      {invalid && (
        <p role="alert" className="save-editor-error">
          {w.invalid}
        </p>
      )}
      <p>{w.note}</p>
    </div>
  );
}
