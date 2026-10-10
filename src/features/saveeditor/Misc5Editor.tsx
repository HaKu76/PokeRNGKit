import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { pokemonImage } from "./art";
import type { Br4Lang } from "./br4";
import { gl5Number, gl5Words } from "./globalLink5";
import { misc5Labels } from "./misc5Labels";
import { misc5Words } from "./misc5Words";
import {
  misc5Action,
  misc5Frozen,
  misc5Import,
  misc5Patch,
  misc5Maximum,
  type Misc5Catalog,
  type Misc5Edit,
  type Misc5Preview,
  type Misc5ForestEdit,
  type Misc5MissionEdit,
  type Misc5Field,
} from "./misc5";
import "./Misc5Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Misc5Catalog | undefined>;
  onPreview(e: Misc5Edit): Promise<Misc5Preview | undefined>;
  onApply(e: Misc5Edit): Promise<void>;
  onExport(): Promise<void>;
};
export function Misc5Editor(props: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Misc5Catalog }>(),
    [group, setGroup] = useState("general"),
    [part, setPart] = useState("fly"),
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
  return (
    <section className="save-record-editor save-misc5-editor">
      <h3>{misc5Labels[props.lang].title}</h3>
      {loaded?.revision === props.revision ? (
        <Form
          key={props.revision}
          {...props}
          c={loaded.c}
          group={group}
          part={part}
          index={index}
          onGroup={(g) => {
            setGroup(g);
            setPart(
              g === "general"
                ? "fly"
                : g === "subway"
                  ? "current"
                  : g === "records"
                    ? "32"
                    : "",
            );
            setIndex(0);
          }}
          onPart={(p) => {
            setPart(p);
            setIndex(0);
          }}
          onIndex={setIndex}
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
          {misc5Words[props.lang].read}
        </button>
      )}
    </section>
  );
}
function Form({
  c,
  group,
  part,
  index,
  onGroup,
  onPart,
  onIndex,
  busy,
  lang,
  onPreview,
  onApply,
  onExport,
}: Props & {
  c: Misc5Catalog;
  group: string;
  part: string;
  index: number;
  onGroup(g: string): void;
  onPart(p: string): void;
  onIndex(i: number): void;
}) {
  const l = misc5Labels[lang],
    w = misc5Words[lang],
    common = gl5Words[lang];
  const [fields, setFields] = useState<Record<string, string>>({}),
    [forest, setForest] = useState<Omit<Misc5ForestEdit, "index">>({}),
    [mission, setMission] = useState<Omit<Misc5MissionEdit, "index">>({}),
    [missionNumbers, setMissionNumbers] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState<Misc5Preview>(),
    [error, setError] = useState(""),
    [reading, setReading] = useState(false);
  const dirty =
      Object.keys(fields).length +
        Object.keys(forest).length +
        Object.keys(mission).length +
        Object.keys(missionNumbers).length >
      0,
    locked = busy || reading || dirty || !!preview,
    writable = c.canEdit && !busy && !reading && !preview;
  const groups: Record<string, string> = {
    general: l.TAB_Main,
    subway: l.TAB_Subway,
    entralink: l.TAB_Entralink,
    forest: l.TAB_Forest,
    missions: l.GB_FunfestMissions,
    props: l.TAB_Muscial,
    records: w.records,
    fc: l.TAB_BWCityForest,
  };
  const routes: Record<string, string> = {
    current: w.current,
    single: l.GB_Singles,
    double: l.GB_Doubles,
    multiNpc: l.GB_Multi + " / " + l.L_MultiNPC,
    multiFriends: l.GB_Multi + " / " + l.L_MultiFriends,
    superSingle: l.GB_SuperSingles,
    superDouble: l.GB_SuperDoubles,
    superMultiNpc: l.L_SuperSets + " / " + l.L_SMultiNPC,
    superMultiFriends: l.L_SuperSets + " / " + l.L_SMultiFriends,
  };
  const generalParts: Record<string, string> = {
    fly: l.GB_FlyDest,
    ...(c.canExportFc ? { roamer: l.GB_Roamer } : { keys: l.GB_KeySystem }),
  };
  const f = c.forest[index],
    m = c.missions[index];
  const areas = [...new Set(c.forest.map((f) => f.area))];
  const areaName = (area: number) => {
    if (area === 1) return w.deepest;
    const base = area & 1023;
    const n = Math.log2(base),
      position = area & 1024 ? w.left : area & 2048 ? w.right : w.center;
    return `${w.areaPrefix} ${n} · ${position}`;
  };
  const area = part === "" ? (f?.area ?? areas[0]) : Number(part),
    slots = c.forest.filter((f) => f.area === area);
  const species = forest.species ?? f?.species,
    choices = c.forestChoices.find((v) => v.species === species),
    forms = choices?.forms ?? f?.forms ?? [],
    genders = choices?.genders ?? f?.genders ?? [];
  const selectedFields = c.fields.filter(
    (v) =>
      v.group === group &&
      (group === "general"
        ? part === "fly"
          ? v.id.startsWith("fly")
          : part === "keys"
            ? v.id.startsWith("key")
            : !v.id.startsWith("fly")
        : group === "subway"
          ? part === "current"
            ? /^(current|subwayFlag|npc)/.test(v.id)
            : v.id.startsWith(part)
          : group === "props"
            ? v.id === "prop" + index
            : group === "records"
              ? v.id === `record${part}_${index}`
              : true),
  );
  const fieldName = (f: Misc5Field) =>
    f.id === "whiteLevel"
      ? l.GB_EntreeLevel + " / " + l.L_EntreeWhite
      : f.id === "blackLevel"
        ? l.GB_EntreeLevel + " / " + l.L_EntreeBlack
        : f.id === "whiteExp"
          ? w.exp + " / " + l.L_EntreeWhite
          : f.id === "blackExp"
            ? w.exp + " / " + l.L_EntreeBlack
            : f.id.startsWith("power")
              ? f.name[lang] + " " + (Number(f.id.slice(-1)) + 1)
              : f.name[lang];
  const discard = () => {
    setFields({});
    setForest({});
    setMission({});
    setMissionNumbers({});
    setPreview(undefined);
    setError("");
  };
  const start = async (e: Misc5Edit) => {
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
      const values = Object.entries(fields).map(([id, text]) => {
        const f = c.fields.find((v) => v.id === id)!;
        return {
          id,
          value: gl5Number(
            text,
            f.minimum,
            id === "whiteExp" || id === "blackExp" ? 255 : f.maximum,
          ),
        };
      });
      const editedMission = { ...mission };
      if (missionNumbers.score !== undefined)
        editedMission.score = gl5Number(missionNumbers.score, 0, 9999);
      if (missionNumbers.total !== undefined)
        editedMission.total = gl5Number(missionNumbers.total, 0, 9999);
      void start(
        misc5Patch(c, {
          ...(values.length ? { fields: values } : {}),
          ...(Object.keys(forest).length
            ? { forest: [{ index, ...forest }] }
            : {}),
          ...(Object.keys(editedMission).length
            ? { missions: [{ index, ...editedMission }] }
            : {}),
        }),
      );
    } catch {
      setError(w.invalid);
    }
  };
  const action = (name: Exclude<Misc5Edit["action"], "patch" | "importFc">) => {
    try {
      void start(misc5Action(c, name));
    } catch {
      setError(w.invalid);
    }
  };
  const boolean = (v: boolean) => (v ? w.yes : w.no);
  const inputMaximum = (field: Misc5Field) => {
    try {
      return misc5Maximum(
        c,
        field,
        Object.entries(fields).map(([id, value]) => ({
          id,
          value: Number(value),
        })),
      );
    } catch {
      return field.maximum;
    }
  };
  const genderName = (v: number, selectedSpecies = species) =>
    selectedSpecies === 0
      ? "—"
      : ([w.male, w.female, w.genderless][v] ?? `${common.keep}: ${v}`);
  const selector = (
    list: { id: number; name: { zh: string; en: string; ja: string } }[],
    value: number,
    sorted = false,
  ) => (
    <>
      {!list.some((v) => v.id === value) && (
        <option value={value} disabled>
          {common.keep}: {value}
        </option>
      )}
      {(sorted
        ? [...list].sort((a, b) => a.name[lang].localeCompare(b.name[lang]))
        : list
      ).map((v) => (
        <option key={v.id} value={v.id}>
          {v.name[lang] || v.id} · {v.id}
        </option>
      ))}
    </>
  );
  const changedFields =
      preview?.result.fields.filter((v) => {
        const before = c.fields.find((f) => f.id === v.id)!;
        return v.value !== before.value || v.rawHex !== before.rawHex;
      }) ?? [],
    changedSlots =
      preview?.result.forest.filter((v) => v.raw !== c.forest[v.index].raw) ??
      [],
    changedMissions =
      preview?.result.missions.filter(
        (v) =>
          v.raw !== c.missions[v.index].raw ||
          v.unlocked !== c.missions[v.index].unlocked,
      ) ?? [];
  return (
    <div className="save-misc5-body">
      <label>
        <span>{common.group}</span>
        <Select
          value={group}
          disabled={locked}
          onChange={(e) => onGroup(e.target.value)}
        >
          {[
            ...c.groups,
            ...(c.missions.length ? ["missions"] : []),
            ...(c.canExportFc ? ["fc"] : []),
          ].map((g) => (
            <option key={g} value={g}>
              {groups[g]}
            </option>
          ))}
        </Select>
      </label>
      {(group === "general" || group === "subway") && (
        <label>
          <span>{w.field}</span>
          <Select
            value={part}
            disabled={locked}
            onChange={(e) => onPart(e.target.value)}
          >
            {Object.entries(group === "general" ? generalParts : routes).map(
              ([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ),
            )}
          </Select>
        </label>
      )}
      {group === "records" && (
        <label>
          <span>{w.field}</span>
          <Select
            value={part}
            disabled={locked}
            onChange={(e) => onPart(e.target.value)}
          >
            <option value="32">{w.bits32}</option>
            <option value="16">{w.bits16}</option>
          </Select>
        </label>
      )}
      {(group === "records" || group === "props" || group === "missions") && (
        <label>
          <span>{w.field}</span>
          <Select
            value={index}
            disabled={locked}
            onChange={(e) => onIndex(Number(e.target.value))}
          >
            {group === "missions"
              ? c.missions.map((m) => (
                  <option key={m.index} value={m.index}>
                    {m.index} · {m.name[lang]}
                  </option>
                ))
              : Array.from(
                  {
                    length: group === "props" ? 100 : part === "32" ? 68 : 100,
                  },
                  (_, i) => (
                    <option key={i} value={i}>
                      {i}
                      {group === "props"
                        ? ` · ${c.fields.find((f) => f.id === "prop" + i)?.name[lang]}`
                        : ""}
                    </option>
                  ),
                )}
          </Select>
        </label>
      )}
      {group === "forest" && (
        <>
          <div className="save-misc5-grid">
            <label>
              <span>{w.area}</span>
              <Select
                value={area}
                disabled={locked}
                onChange={(e) => {
                  onPart(e.target.value);
                  onIndex(
                    c.forest.find((f) => f.area === Number(e.target.value))!
                      .index,
                  );
                }}
              >
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {areaName(a)}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{w.slot}</span>
              <Select
                value={index}
                disabled={locked}
                onChange={(e) => onIndex(Number(e.target.value))}
              >
                {slots.map((s) => (
                  <option key={s.index} value={s.index}>
                    {s.index} ·{" "}
                    {c.speciesChoices.find((v) => v.id === s.species)?.name[
                      lang
                    ] ?? s.species}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          {f && (
            <div className="save-misc5-pokemon">
              {f.species !== 0 && (
                <img
                  src={pokemonImage(f)}
                  width={56}
                  height={56}
                  alt={
                    c.speciesChoices.find((v) => v.id === f.species)?.name[
                      lang
                    ] ?? String(f.species)
                  }
                />
              )}
              <span>
                {w.rawValue}: 0x
                {f.raw.toString(16).toUpperCase().padStart(8, "0")}
              </span>
            </div>
          )}
        </>
      )}
      <fieldset className="save-misc5-fields" disabled={!writable}>
        <div className="save-misc5-grid">
          {selectedFields.map((f) =>
            f.boolean ? (
              <label className="save-misc5-check" key={f.id}>
                <input
                  type="checkbox"
                  checked={
                    (fields[f.id] === undefined
                      ? f.value
                      : Number(fields[f.id])) === 1
                  }
                  onChange={(e) =>
                    setFields({
                      ...fields,
                      [f.id]: e.target.checked ? "1" : "0",
                    })
                  }
                />
                <span>
                  {fieldName(f)}
                  {f.rawHex ? ` · 0x${f.rawHex}` : ""}
                </span>
              </label>
            ) : (
              <label key={f.id}>
                <span>
                  {fieldName(f)} · {common.current}: {f.value}
                </span>
                {f.choices ? (
                  <Select
                    value={fields[f.id] ?? f.value}
                    disabled={!writable}
                    onChange={(e) =>
                      setFields({ ...fields, [f.id]: e.target.value })
                    }
                  >
                    {selector(f.choices, Number(fields[f.id] ?? f.value))}
                  </Select>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fields[f.id] ?? ""}
                    placeholder={common.keep}
                    onChange={(e) =>
                      setFields({ ...fields, [f.id]: e.target.value })
                    }
                    onBlur={(e) => {
                      if (!e.target.value.trim())
                        setFields((old) => {
                          const next = { ...old };
                          delete next[f.id];
                          return next;
                        });
                    }}
                  />
                )}
                {!f.choices && (
                  <small>
                    {w.range}: {f.minimum}–{inputMaximum(f)}
                  </small>
                )}
              </label>
            ),
          )}
        </div>
        {group === "forest" && f && (
          <>
            <div className="save-misc5-grid">
              <label>
                <span>{l.L_Species}</span>
                <Select
                  value={forest.species ?? f.species}
                  disabled={!writable}
                  onChange={(e) => {
                    const species = Number(e.target.value),
                      choice = c.forestChoices.find(
                        (v) => v.species === species,
                      )!;
                    setForest({
                      ...forest,
                      species,
                      form: choice.forms[0].id,
                      gender: choice.genders[0],
                    });
                  }}
                >
                  {selector(
                    c.speciesChoices,
                    forest.species ?? f.species,
                    true,
                  )}
                </Select>
              </label>
              <label>
                <span>{l.L_Move}</span>
                <Select
                  value={forest.move ?? f.move}
                  disabled={!writable}
                  onChange={(e) =>
                    setForest({ ...forest, move: Number(e.target.value) })
                  }
                >
                  {selector(c.moveChoices, forest.move ?? f.move, true)}
                </Select>
              </label>
              <label>
                <span>{l.L_Form}</span>
                <Select
                  value={forest.form ?? f.form}
                  disabled={!writable}
                  onChange={(e) =>
                    setForest({ ...forest, form: Number(e.target.value) })
                  }
                >
                  {selector(forms, forest.form ?? f.form)}
                </Select>
              </label>
              <label>
                <span>{w.gender}</span>
                <Select
                  value={forest.gender ?? f.gender}
                  disabled={!writable}
                  onChange={(e) =>
                    setForest({ ...forest, gender: Number(e.target.value) })
                  }
                >
                  {!genders.includes(forest.gender ?? f.gender) && (
                    <option value={forest.gender ?? f.gender} disabled>
                      {common.keep}: {forest.gender ?? f.gender}
                    </option>
                  )}
                  {genders.map((g) => (
                    <option key={g} value={g}>
                      {genderName(g)}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                <span>{l.L_Animation}</span>
                <Select
                  value={forest.animation ?? f.animation}
                  disabled={!writable}
                  onChange={(e) =>
                    setForest({ ...forest, animation: Number(e.target.value) })
                  }
                >
                  {Array.from({ length: 8 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <p>{w.forestNote}</p>
          </>
        )}
        {group === "missions" && m && (
          <>
            <p>
              {m.name[lang]} · {m.unlocked ? l.L_FMUnlocked : l.L_FMLocked} · 0x
              {m.raw.toString(16).toUpperCase()}
            </p>
            <div className="save-misc5-grid">
              {(["score", "total"] as const).map((key) => (
                <label key={key}>
                  <span>
                    {key === "score" ? l.L_FMBestScore : l.L_FMBestTotal} ·{" "}
                    {common.current}: {m[key]}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={missionNumbers[key] ?? ""}
                    placeholder={common.keep}
                    onChange={(e) =>
                      setMissionNumbers({
                        ...missionNumbers,
                        [key]: e.target.value,
                      })
                    }
                    onBlur={(e) => {
                      if (!e.target.value.trim())
                        setMissionNumbers((old) => {
                          const next = { ...old };
                          delete next[key];
                          return next;
                        });
                    }}
                  />
                </label>
              ))}
              <label>
                <span>{common.value}</span>
                <Select
                  value={mission.level ?? m.level}
                  disabled={!writable}
                  onChange={(e) =>
                    setMission({ ...mission, level: Number(e.target.value) })
                  }
                >
                  {![0, 1, 2, 3, 7].includes(mission.level ?? m.level) && (
                    <option disabled value={mission.level ?? m.level}>
                      {common.keep}: {mission.level ?? m.level}
                    </option>
                  )}
                  {[0, 1, 2, 3, 7].map((v) => (
                    <option key={v} value={v}>
                      {v === 7
                        ? (c.speciesChoices.find((v) => v.id === 0)?.name[
                            lang
                          ] ?? "—")
                        : ["Lv.1", "Lv.2 +", "Lv.3 ++", "Lv.3 +++"][v]}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="save-misc5-check">
                <input
                  type="checkbox"
                  checked={mission.isNew ?? m.isNew}
                  onChange={(e) =>
                    setMission({ ...mission, isNew: e.target.checked })
                  }
                />
                <span>{l.CHK_FMNew}</span>
              </label>
            </div>
          </>
        )}
      </fieldset>
      {group !== "fc" && (
        <div className="save-editor-toolbar">
          <button type="button" disabled={!writable || !dirty} onClick={patch}>
            {common.preview}
          </button>
          <button
            type="button"
            disabled={busy || reading || !dirty}
            onClick={discard}
          >
            {common.discard}
          </button>
        </div>
      )}
      {group === "general" && part === "fly" && (
        <button
          type="button"
          disabled={locked || !c.canEdit}
          onClick={() => action("giveFly")}
        >
          {l.B_AllFlyDest}
        </button>
      )}
      {group === "general" && part === "keys" && (
        <button
          type="button"
          disabled={locked || !c.canEdit}
          onClick={() => action("giveKeys")}
        >
          {l.B_AllKeys}
        </button>
      )}
      {group === "props" && (
        <>
          <button
            type="button"
            disabled={locked || !c.canEdit}
            onClick={() => action("giveProps")}
          >
            {l.B_UnlockAllProps}
          </button>
          <p>{w.bulkNote}</p>
        </>
      )}
      {group === "missions" && (
        <>
          <button
            type="button"
            disabled={locked || !c.canEdit}
            onClick={() => action("missionUnlockAll")}
          >
            {l.B_FunfestMissions}
          </button>
          <p>{w.bulkNote}</p>
        </>
      )}
      {group === "forest" && (
        <>
          <button
            type="button"
            disabled={locked || !c.canEdit}
            onClick={() => action("forestRandom")}
          >
            {l.B_RandForest}
          </button>
          <p>{w.randomNote}</p>
        </>
      )}
      {group === "records" && <p>{w.recordNote}</p>}
      {group === "subway" && <p>{w.subwayNote}</p>}
      {group === "entralink" && <p>{w.expNote}</p>}
      {group === "fc" && (
        <>
          <p>{w.fcNote}</p>
          <button
            type="button"
            disabled={locked}
            onClick={() => void onExport()}
          >
            {l.B_DumpFC} (.fc5)
          </button>
          <label>
            <span>{l.B_ImportFC} (.fc5 · 488 bytes)</span>
            <input
              type="file"
              accept=".fc5"
              disabled={locked || !c.canEdit}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setError("");
                if (file.size !== 488) {
                  setError(w.fileSize);
                  return;
                }
                setReading(true);
                void file
                  .arrayBuffer()
                  .then((data) => start(misc5Import(c, new Uint8Array(data))))
                  .catch(() => setError(w.fileSize))
                  .finally(() => setReading(false));
              }}
            />
          </label>
        </>
      )}
      {error && (
        <p className="save-editor-error" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <section className="save-misc5-preview" aria-label={common.preview}>
          <h4>{w.saved}</h4>
          <p>
            {common.changed}: {preview.changedOffsets.length}
          </p>
          {preview.request.frozenForest && (
            <p>
              {w.sourceDraws}: {preview.request.frozenForest.length}
            </p>
          )}
          <div className="save-misc5-changes">
            {changedFields.map((f) => (
              <p key={f.id}>
                {fieldName(f)}: {c.fields.find((v) => v.id === f.id)!.value} →{" "}
                {f.value}
                {f.rawHex ? ` · 0x${f.rawHex}` : ""}
              </p>
            ))}
            {changedSlots.map((f) => (
              <div key={f.index} className="save-misc5-pokemon">
                {f.species !== 0 && (
                  <img
                    src={pokemonImage(f)}
                    width={40}
                    height={40}
                    alt={
                      c.speciesChoices.find((v) => v.id === f.species)?.name[
                        lang
                      ] ?? String(f.species)
                    }
                  />
                )}
                <p>
                  {w.slot} {f.index}: 0x
                  {c.forest[f.index].raw.toString(16).toUpperCase()} → 0x
                  {f.raw.toString(16).toUpperCase()} ·{" "}
                  {c.speciesChoices.find((v) => v.id === f.species)?.name[
                    lang
                  ] ?? f.species}{" "}
                  /{" "}
                  {c.moveChoices.find((v) => v.id === f.move)?.name[lang] ??
                    f.move}{" "}
                  / {l.L_Form} {f.form} / {genderName(f.gender, f.species)} /{" "}
                  {l.L_Animation} {f.animation}
                </p>
              </div>
            ))}
            {changedMissions.map((m) => (
              <p key={m.index}>
                {m.index} · {m.name[lang]}: 0x
                {c.missions[m.index].raw.toString(16).toUpperCase()} → 0x
                {m.raw.toString(16).toUpperCase()} · {l.L_FMBestScore} {m.score}{" "}
                / {l.L_FMBestTotal} {m.total} / {common.value} {m.level} /{" "}
                {l.CHK_FMNew} {boolean(m.isNew)} /{" "}
                {m.unlocked ? l.L_FMUnlocked : l.L_FMLocked}
              </p>
            ))}
            {!preview.changedOffsets.length && <p>{common.noChanges}</p>}
          </div>
          <details>
            <summary>{common.raw}</summary>
            <div className="save-misc5-raw">
              <p>{c.rawHex}</p>
              <p>{preview.result.rawHex}</p>
            </div>
          </details>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || reading}
              onClick={() => {
                try {
                  void onApply(misc5Frozen(c, preview));
                } catch {
                  setError(w.stale);
                }
              }}
            >
              {common.apply}
            </button>
            <button
              type="button"
              disabled={busy || reading}
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
