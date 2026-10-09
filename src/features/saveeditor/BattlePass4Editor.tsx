import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { pokemonImage } from "./art";
import { battlePass4Labels } from "./battlePass4Labels";
import {
  battlePass4Words,
  battlePassNumber,
  battlePassText,
  battlePassOperation,
  type BattlePass4Catalog,
  type BattlePass4Edit,
  type BattlePass4PokemonPreview,
} from "./battlePass4";
import type { Br4Lang } from "./br4";
import "./BattlePass4Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(index: number): Promise<BattlePass4Catalog | undefined>;
  onApply(edit: BattlePass4Edit): Promise<void>;
  onPreview(
    edit: BattlePass4Edit,
  ): Promise<BattlePass4PokemonPreview | undefined>;
  onExport(index: number, slot?: number): Promise<void>;
};
const models = [
  "None",
  "YoungBoy",
  "CoolBoy",
  "MuscleMan",
  "YoungGirl",
  "CoolGirl",
  "LittleGirl",
  "Lucas",
  "Dawn",
  "Joe",
  "Sashay",
  "Kruger",
  "Mysterial",
];
const groups = [
  "f_MAIN",
  "GB_Appearance",
  "f_CATCHPHRASES",
  "f_CREATOR",
  "GB_Records",
  "f_PKM",
];
const flags = [
  "PresetGreeting",
  "PresetSentOut",
  "PresetShift1",
  "PresetShift2",
  "PresetWin",
  "PresetLose",
  "Available",
  "Issued",
  "Rental",
  "Friend",
];
const label = (lang: Br4Lang, key: string) =>
  battlePass4Labels[lang][key] ??
  battlePass4Labels.en[key] ??
  key.split(".").at(-1)!;
const fieldLabel = (lang: Br4Lang, source: string) =>
  source.startsWith("Preset")
    ? `${label(lang, "SAV_BattlePass.L_" + source.replace("Preset", "").replace("Index", ""))} ${lang === "zh" ? "预设索引" : lang === "ja" ? "定型文番号" : "preset index"}`
    : label(lang, "SAV_BattlePass.L_" + source);
export function BattlePass4Editor(props: Props) {
  const [selection, setSelection] = useState({
      index: 0,
      group: 0,
      field: "t0",
      slot: 0,
    }),
    [loaded, setLoaded] = useState<{
      revision: number;
      index: number;
      c: BattlePass4Catalog;
    }>();
  const reader = useRef(props.onRead);
  useEffect(() => {
    reader.current = props.onRead;
  }, [props.onRead]);
  useEffect(() => {
    let active = true;
    void reader.current(selection.index).then((c) => {
      if (active && c)
        setLoaded({ revision: props.revision, index: selection.index, c });
    });
    return () => {
      active = false;
    };
  }, [props.revision, selection.index]);
  const ready =
    loaded?.revision === props.revision && loaded.index === selection.index;
  return (
    <section className="save-record-editor save-bp4-editor">
      <h3>{label(props.lang, "SAV_BattlePass")}</h3>
      {ready ? (
        <PassForm
          key={`${props.revision}-${selection.index}`}
          {...props}
          c={loaded.c}
          selection={selection}
          onSelect={setSelection}
        />
      ) : (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={props.busy}
            onClick={() =>
              void props.onRead(selection.index).then((c) => {
                if (c)
                  setLoaded({
                    revision: props.revision,
                    index: selection.index,
                    c,
                  });
              })
            }
          >
            {battlePass4Words[props.lang].read}
          </button>
        </div>
      )}
    </section>
  );
}
type Selection = { index: number; group: number; field: string; slot: number };
function PassForm({
  c,
  busy,
  lang,
  onApply,
  onPreview,
  onExport,
  selection,
  onSelect,
}: Props & {
  c: BattlePass4Catalog;
  selection: Selection;
  onSelect(value: Selection): void;
}) {
  const w = battlePass4Words[lang],
    group = selection.group,
    [draft, setDraft] = useState<string>(),
    [raw, setRaw] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState<{
      edit: BattlePass4Edit;
      title: string;
      file?: string;
      pokemon?: BattlePass4PokemonPreview;
    }>(),
    [confirmIncompatible, setConfirmIncompatible] = useState(false),
    [encrypted, setEncrypted] = useState(false),
    [links, setLinks] = useState<{
      box: string;
      position: string;
      flags: string;
    }>();
  const locked = busy || draft !== undefined || !!preview || !!links;
  const numbers = c.numbers.filter((v) =>
    group === 0
      ? v.id <= 2
      : group === 1
        ? v.id >= 3 && v.id <= 16
        : group === 2
          ? v.id >= 17 && v.id <= 22
          : group === 3
            ? v.id >= 23 && v.id <= 25
            : group === 4
              ? v.id >= 26
              : false,
  );
  const texts = c.text.filter((v) =>
    group === 0
      ? v.id === 0
      : group === 2
        ? v.id >= 1 && v.id <= 6
        : group === 3
          ? v.id >= 7
          : false,
  );
  const fields = [
    ...numbers.map((v) => ({ key: `n${v.id}`, source: v.source })),
    ...texts.map((v) => ({ key: `t${v.id}`, source: v.source })),
  ];
  const field = fields.find((v) => v.key === selection.field) ?? fields[0],
    id = Number(field?.key.slice(1)),
    number = field?.key.startsWith("n")
      ? c.numbers.find((v) => v.id === id)
      : undefined,
    text = field?.key.startsWith("t")
      ? c.text.find((v) => v.id === id)
      : undefined;
  const current = number ? String(number.value) : raw ? text?.hex : text?.value,
    value = draft ?? current ?? "";
  const member = c.members[selection.slot],
    pk = member?.pokemon;
  const run = async (edit: BattlePass4Edit) => {
    setError("");
    await onApply(edit);
  };
  const submit = () => {
    try {
      if (!field) return;
      void run(
        number
          ? battlePassNumber(c, id, value)
          : battlePassText(c, id, value, raw),
      );
    } catch {
      setError(w.invalid);
    }
  };
  const plan = (
    action: BattlePass4Edit["action"],
    title: string,
    extra: Partial<BattlePass4Edit> = {},
  ) => {
    try {
      setPreview({ edit: battlePassOperation(c, action, extra), title });
      setError("");
    } catch {
      setError(w.invalid);
    }
  };
  const upload = async (file: File | undefined, pokemon: boolean) => {
    if (!file) return;
    try {
      if (
        file.size === 0 ||
        file.size > (pokemon ? 1024 * 1024 : 1772) ||
        (!pokemon && file.size !== 1772)
      )
        throw Error();
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const edit = battlePassOperation(c, pokemon ? "setPokemon" : "import", {
        data: btoa(binary),
        ...(pokemon
          ? { fileName: file.name, encrypted, slot: selection.slot }
          : {}),
      });
      const imported = pokemon ? await onPreview(edit) : undefined;
      if (pokemon && !imported) return;
      setConfirmIncompatible(false);
      setPreview({
        edit,
        title: pokemon ? w.importPokemon : w.import,
        file: `${file.name} · ${file.size} bytes`,
        pokemon: imported,
      });
      setError("");
    } catch {
      setError(w.invalid);
    }
  };
  const choiceName = (source: string, id: number, fallback: string) =>
    source === "Model" && models[id] !== undefined
      ? label(lang, `ModelBR.${models[id]}`)
      : source === "SkinColor" && id >= 0 && id < 3
        ? label(lang, `SkinColorBR.${["Light", "Tan", "Dark"][id]}`)
        : source === "PictureType" && (id === 0 || id === 1)
          ? label(lang, `PictureTypeBR.${["FullBody", "HeadShot"][id]}`)
          : fallback;
  return (
    <>
      <div className="save-bp4-selectors">
        <label>
          <span>{label(lang, "SAV_BattlePass.L_BattlePasses")}</span>
          <Select
            value={selection.index}
            disabled={locked}
            onChange={(e) =>
              onSelect({ ...selection, index: Number(e.target.value) })
            }
          >
            {c.passes.map((p) => (
              <option key={p.index} value={p.index}>
                {p.index + 1} · {p.name || w.empty} ·{" "}
                {label(
                  lang,
                  `BattlePassType.${["Custom", "Rental", "Friend", "Download", "Other1", "Other2", "Other3"][p.type]}`,
                )}{" "}
                {p.available ? "✓" : ""} {p.issued ? "✓" : ""}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span>{w.field}</span>
          <Select
            value={group}
            disabled={locked}
            onChange={(e) => {
              setRaw(false);
              onSelect({ ...selection, group: Number(e.target.value) });
            }}
          >
            {groups.map((key, i) => (
              <option key={key} value={i}>
                {label(lang, "SAV_BattlePass." + key)}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <fieldset disabled={busy || !c.canEdit} className="save-bp4-body">
        {group < 5 && field && (
          <>
            <label>
              <span>{w.field}</span>
              <Select
                value={field.key}
                disabled={locked}
                onChange={(e) => {
                  setRaw(false);
                  onSelect({ ...selection, field: e.target.value });
                }}
              >
                {fields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {fieldLabel(lang, f.source)}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{fieldLabel(lang, field.source)}</span>
              {number?.choices ? (
                <Select
                  value={value}
                  onChange={(e) => setDraft(e.target.value)}
                >
                  {!number.choices.some((v) => String(v.id) === value) && (
                    <option value={value}>
                      {w.unknown} · {value}
                    </option>
                  )}
                  {number.choices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {choiceName(number.source, v.id, v.name[lang])}
                    </option>
                  ))}
                </Select>
              ) : text?.multiline && !raw ? (
                <textarea
                  value={value}
                  maxLength={text.maximum}
                  rows={3}
                  onChange={(e) => setDraft(e.target.value)}
                />
              ) : (
                <input
                  value={value}
                  type={number && id !== 1 && id !== 2 ? "number" : "text"}
                  min={number?.minimum}
                  max={number?.maximum}
                  step={number ? 1 : undefined}
                  inputMode={number ? "numeric" : undefined}
                  maxLength={
                    text
                      ? raw
                        ? text.bytes * 2
                        : text.maximum
                      : id === 1 || id === 2
                        ? 5
                        : undefined
                  }
                  onChange={(e) => setDraft(e.target.value)}
                />
              )}
            </label>
            {number && !number.choices && (
              <p>
                {number.minimum} – {number.maximum}
                {(id === 1 || id === 2) && draft !== undefined
                  ? ` → ${Number(value) & 65535}`
                  : ""}
              </p>
            )}
            {text && (
              <>
                <label className="save-bp4-check">
                  <input
                    type="checkbox"
                    checked={raw}
                    disabled={draft !== undefined}
                    onChange={(e) => setRaw(e.target.checked)}
                  />
                  <span>{w.raw}</span>
                </label>
                <p>{w.variables}</p>
              </>
            )}
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={draft === undefined}
                onClick={submit}
              >
                {w.apply}
              </button>
              <button
                type="button"
                disabled={draft === undefined}
                onClick={() => {
                  setDraft(undefined);
                  setError("");
                }}
              >
                {w.discard}
              </button>
            </div>
            {(group === 0 || group === 2) && (
              <div className="save-bp4-flags">
                {flags.map(
                  (key, i) =>
                    (group === 0 ? i >= 6 : i < 6) && (
                      <label key={key} className="save-bp4-check">
                        <input
                          type="checkbox"
                          checked={c.flags[i]}
                          disabled={locked}
                          onChange={(e) =>
                            void run({
                              action: "flags",
                              profile: c.profile,
                              index: c.index,
                              values: [
                                { id: i, value: e.target.checked ? "1" : "0" },
                              ],
                            })
                          }
                        />
                        <span>
                          {i < 6
                            ? `${fieldLabel(lang, key.replace("Preset", ""))} ${label(lang, "SAV_BattlePass.CHK_" + key)}`
                            : label(lang, "SAV_BattlePass.CHK_" + key)}
                        </span>
                      </label>
                    ),
                )}
              </div>
            )}
            <details className="save-bp4-details">
              <summary>
                {label(lang, "SAV_BattlePass." + groups[group])}
              </summary>
              <dl>
                {numbers.map((v) => (
                  <div key={`n${v.id}`}>
                    <dt>{fieldLabel(lang, v.source)}</dt>
                    <dd>
                      {v.choices
                        ? choiceName(
                            v.source,
                            v.value,
                            v.choices.find((ch) => ch.id === v.value)?.name[
                              lang
                            ] ?? `${w.unknown} · ${v.value}`,
                          )
                        : v.value}
                    </dd>
                  </div>
                ))}
                {texts.map((v) => (
                  <div key={`t${v.id}`}>
                    <dt>{fieldLabel(lang, v.source)}</dt>
                    <dd>{v.value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </>
        )}
        {group === 5 && (
          <>
            <div className="save-bp4-team">
              {c.members.map((m) => (
                <button
                  type="button"
                  key={m.slot}
                  disabled={locked}
                  aria-pressed={selection.slot === m.slot}
                  onClick={() => onSelect({ ...selection, slot: m.slot })}
                >
                  {m.pokemon && <img src={pokemonImage(m.pokemon)} alt="" />}
                  <span>
                    {m.slot + 1} · {m.pokemon?.speciesName[lang] ?? w.empty}
                  </span>
                  <small>
                    {m.present ? w.present : w.notPresent}
                    {m.pokemon ? ` · Lv.${m.pokemon.level}` : ""}
                  </small>
                </button>
              ))}
            </div>
            {pk && (
              <dl className="save-bp4-pokemon-info">
                <div>
                  <dt>
                    {lang === "zh"
                      ? "昵称"
                      : lang === "ja"
                        ? "ニックネーム"
                        : "Nickname"}
                  </dt>
                  <dd>{pk.nickname}</dd>
                </div>
                <div>
                  <dt>
                    {lang === "zh"
                      ? "训练家姓名"
                      : lang === "ja"
                        ? "親の名前"
                        : "Original trainer"}
                  </dt>
                  <dd>
                    {pk.ot} · {pk.tid}/{pk.sid}
                  </dd>
                </div>
                <div>
                  <dt>PID</dt>
                  <dd>{pk.pid.toString(16).toUpperCase().padStart(8, "0")}</dd>
                </div>
                <div>
                  <dt>
                    {lang === "zh"
                      ? "个体值 / 努力值"
                      : lang === "ja"
                        ? "個体値 / 努力値"
                        : "IVs / EVs"}
                  </dt>
                  <dd>
                    {pk.ivs.join(" / ")}
                    <br />
                    {pk.evs.join(" / ")}
                  </dd>
                </div>
                <div>
                  <dt>
                    {lang === "zh" ? "招式" : lang === "ja" ? "わざ" : "Moves"}
                  </dt>
                  <dd>
                    {pk.moves.map((v, i) => (
                      <span key={i}>
                        {v[lang]} · {pk.movePp[i]} PP
                        <br />
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            )}
            <h4>{w.links}</h4>
            <div className="save-bp4-link-grid">
              {(["box", "position", "flags"] as const).map((key, i) => (
                <label key={key}>
                  <span>
                    {label(
                      lang,
                      `SAV_BattlePass.L_PKM1${["Box", "Slot", "Flags"][i]}`,
                    )}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={key === "flags" ? 65535 : 255}
                    value={links?.[key] ?? member[key]}
                    onChange={(e) =>
                      setLinks((prev) => ({
                        ...(prev ?? {
                          box: String(member.box),
                          position: String(member.position),
                          flags: String(member.flags),
                        }),
                        [key]: e.target.value,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={!links}
                onClick={() => {
                  if (!links) return;
                  const values = Object.values(links);
                  if (
                    values.some((v) => !/^\d+$/.test(v)) ||
                    Number(links.box) > 255 ||
                    Number(links.position) > 255 ||
                    Number(links.flags) > 65535
                  ) {
                    setError(w.invalid);
                    return;
                  }
                  void run({
                    action: "links",
                    profile: c.profile,
                    index: c.index,
                    slot: selection.slot,
                    box: Number(links.box),
                    position: Number(links.position),
                    flags: Number(links.flags),
                  });
                }}
              >
                {w.apply}
              </button>
              <button
                type="button"
                disabled={!links}
                onClick={() => setLinks(undefined)}
              >
                {w.discard}
              </button>
              <button
                type="button"
                disabled={locked || !pk}
                onClick={() => void onExport(c.index, selection.slot)}
              >
                {w.exportPokemon}
              </button>
              <button
                type="button"
                disabled={locked || !member.present}
                onClick={() =>
                  plan("deletePokemon", w.deletePokemon, {
                    slot: selection.slot,
                  })
                }
              >
                {w.deletePokemon}
              </button>
            </div>
            <p>{w.pokemonNote}</p>
            <label className="save-bp4-check">
              <input
                type="checkbox"
                checked={encrypted}
                disabled={locked}
                onChange={(e) => setEncrypted(e.target.checked)}
              />
              <span>{w.encrypted}</span>
            </label>
            <label>
              <span>{w.importPokemon}</span>
              <input
                type="file"
                disabled={locked}
                accept=".bk4,.pk1,.pk2,.pk3,.pk4,.pk5,.pk6,.pk7,.pk8,.pk9,.ck3,.xk3,.pb7,.pb8,.pa8,.pa9"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  void upload(file, true);
                }}
              />
            </label>
          </>
        )}
        <details className="save-bp4-details">
          <summary>{w.operations}</summary>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked}
              onClick={() => void onExport(c.index)}
            >
              {w.export}
            </button>
            <button
              type="button"
              disabled={locked || c.index === 0}
              onClick={() => plan("swap", w.up, { other: c.index - 1 })}
            >
              {w.up}
            </button>
            <button
              type="button"
              disabled={locked || c.index === 186}
              onClick={() => plan("swap", w.down, { other: c.index + 1 })}
            >
              {w.down}
            </button>
            <button
              type="button"
              disabled={locked || c.passes[c.index].type === 1}
              onClick={() => plan("delete", w.delete)}
            >
              {w.delete}
            </button>
            {(["unlockCustom", "unlockRental"] as const).map((action) => (
              <button
                type="button"
                key={action}
                disabled={locked}
                onClick={() =>
                  plan(
                    action,
                    label(
                      lang,
                      `SAV_BattlePass.B_${action === "unlockCustom" ? "UnlockCustom" : "UnlockRental"}`,
                    ),
                  )
                }
              >
                {label(
                  lang,
                  `SAV_BattlePass.B_${action === "unlockCustom" ? "UnlockCustom" : "UnlockRental"}`,
                )}
              </button>
            ))}
          </div>
          <label>
            <span>{w.import}</span>
            <input
              type="file"
              disabled={locked}
              accept=".bin"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void upload(file, false);
              }}
            />
          </label>
        </details>
        {preview && (
          <div
            className="save-bp4-preview"
            role="region"
            aria-label={preview.title}
          >
            <h4>{preview.title}</h4>
            <p>
              {preview.file ??
                `${c.index + 1} · ${c.passes[c.index].name || w.empty}${preview.edit.other === undefined ? "" : ` → ${preview.edit.other + 1}`}`}
            </p>
            <p>
              {preview.edit.action === "setPokemon" ||
              preview.edit.action === "deletePokemon"
                ? w.pokemonNote
                : w.replaceNote}
            </p>
            {preview.pokemon && (
              <>
                <div className="save-bp4-import-pokemon">
                  <img src={pokemonImage(preview.pokemon.pokemon)} alt="" />
                  <span>
                    {preview.pokemon.pokemon.speciesName[lang]} ·{" "}
                    {preview.pokemon.pokemon.nickname} · Lv.
                    {preview.pokemon.pokemon.level}
                  </span>
                </div>
                <p>
                  {w.team} {preview.pokemon.target + 1} · {w.links}:{" "}
                  {preview.pokemon.box}/{preview.pokemon.position}
                </p>
                {preview.pokemon.warnings.length > 0 && (
                  <>
                    <ul>
                      {preview.pokemon.warnings.map((warning, i) => (
                        <li key={i}>{warning[lang]}</li>
                      ))}
                    </ul>
                    <label className="save-bp4-check">
                      <input
                        type="checkbox"
                        checked={confirmIncompatible}
                        onChange={(e) =>
                          setConfirmIncompatible(e.target.checked)
                        }
                      />
                      <span>
                        {lang === "zh"
                          ? "已了解兼容性提示，仍然导入"
                          : lang === "ja"
                            ? "互換性の警告を確認して読み込む"
                            : "Import after reviewing compatibility warnings"}
                      </span>
                    </label>
                  </>
                )}
              </>
            )}
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={
                  !!preview.pokemon?.warnings.length && !confirmIncompatible
                }
                onClick={() =>
                  void run(
                    preview.pokemon?.warnings.length
                      ? { ...preview.edit, confirmIncompatible: true }
                      : preview.edit,
                  )
                }
              >
                {w.confirm}
              </button>
              <button type="button" onClick={() => setPreview(undefined)}>
                {w.cancel}
              </button>
            </div>
          </div>
        )}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <p>{w.note}</p>
    </>
  );
}
