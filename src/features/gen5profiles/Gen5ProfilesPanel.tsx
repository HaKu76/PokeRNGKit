import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import "./Gen5ProfilesPanel.css";
import {
  DEFAULT_GEN5_PROFILE_DRAFT,
  GEN5_DS_TYPES,
  GEN5_GAME_VERSIONS,
  GEN5_LANGUAGES,
  GEN5_NEEDLE_DIRECTIONS,
  gen5CalibrationDefaults,
  isBw2Version,
  normalizeHex,
  parseHex,
  serializeGen5ProfileBackup,
  validateGen5CalibrationRequest,
  type Gen5CalibrationRequest,
  type Gen5CalibrationResult,
  type Gen5DsType,
  type Gen5GameVersion,
  type Gen5Language,
  type Gen5Profile,
  type Gen5ProfileDraft,
} from "./domain";
import { Gen5ProfilesWorkerPool } from "./worker/Gen5ProfilesWorkerPool";
import { Gen5ProfilesUiPreviewEngine } from "./preview/Gen5ProfilesUiPreviewEngine";
import {
  useGen5Profiles,
  type Gen5ProfilesController,
} from "./useGen5Profiles";

const GAME_LABELS: Record<Gen5GameVersion, string> = {
  black: "Black",
  white: "White",
  black2: "Black 2",
  white2: "White 2",
};
const GAME_LABELS_ZH: Record<Gen5GameVersion, string> = {
  black: "黑",
  white: "白",
  black2: "黑2",
  white2: "白2",
};
const LANGUAGE_LABELS: Record<Gen5Language, string> = {
  english: "ENG",
  spanish: "SPA",
  french: "FRE",
  italian: "ITA",
  german: "DEU",
  japanese: "JPN",
  korean: "KOR",
};
const DS_LABELS: Record<Gen5DsType, string> = {
  ds: "DS Original/Lite",
  dsi: "DSi/DSi XL",
  "3ds": "3DS",
};
const BUTTONS = [
  "R",
  "L",
  "X",
  "Y",
  "A",
  "B",
  "Select",
  "Start",
  "Right",
  "Left",
  "Up",
  "Down",
];
const CALIBRATION_MODES = ["ivs", "needles", "seed"] as const;
const MAIN_TABS = ["manager", "calibrator"] as const;
type CalibrationHexRangeKey =
  | "minVCount"
  | "maxVCount"
  | "minTimer0"
  | "maxTimer0"
  | "minGxStat"
  | "maxGxStat"
  | "minVFrame"
  | "maxVFrame";
interface ProfileEditorProps {
  original?: Gen5Profile;
  initial?: Gen5ProfileDraft;
  labels: Labels;
  onCancel(): void;
  onFindParameters(): void;
  onSave(draft: Gen5ProfileDraft): Promise<void>;
}

interface Labels {
  profileManager: string;
  profileCalibrator: string;
  profileName: string;
  version: string;
  language: string;
  dsType: string;
  mac: string;
  profileMac: string;
  keypresses: string;
  vcount: string;
  gxstat: string;
  vframe: string;
  timer0Min: string;
  timer0Max: string;
  tid: string;
  sid: string;
  accept: string;
  cancel: string;
  findParameters: string;
  skipLR: string;
  memoryLink: string;
  nsReleased: string;
  shinyCharm: string;
  ivCache: string;
  shaCache: string;
  selectFile: string;
  clear: string;
  newProfile: string;
  edit: string;
  duplicate: string;
  delete: string;
  confirmDelete: string;
  done: string;
  import: string;
  export: string;
  emptyProfiles: string;
  noProfile: string;
  storageIndexedDb: string;
  storageLocal: string;
  settings: string;
  date: string;
  time: string;
  seconds: string;
  min: string;
  max: string;
  search: string;
  ivSearch: string;
  minIVs: string;
  maxIVs: string;
  needleSearch: string;
  unovaLink: string;
  saving: string;
  seedSearch: string;
  seed: string;
  result: string;
  processed: string;
  createProfile: string;
  noResults: string;
  cancelled: string;
  running: string;
  error: string;
  resultLimit: string;
  yes: string;
  no: string;
}

function getLabels(chinese: boolean): Labels {
  if (!chinese) {
    return {
      profileManager: "Profile Manager Gen 5",
      profileCalibrator: "Profile Calibrator",
      profileName: "Profile Name",
      version: "Version",
      language: "Language",
      dsType: "DS Type",
      mac: "MAC Address",
      profileMac: "MAC",
      keypresses: "Keypresses",
      vcount: "VCount",
      gxstat: "GxStat",
      vframe: "VFrame",
      timer0Min: "Timer0 Min",
      timer0Max: "Timer0 Max",
      tid: "TID",
      sid: "SID",
      accept: "Accept",
      cancel: "Cancel",
      findParameters: "Find Parameters",
      skipLR: "Skip L/R",
      memoryLink: "Memory Link",
      nsReleased: "N's Pokémon released",
      shinyCharm: "Shiny Charm",
      ivCache: "IV Cache",
      shaCache: "SHA Cache",
      selectFile: "Select File",
      clear: "Clear",
      newProfile: "New",
      edit: "Edit",
      duplicate: "Duplicate",
      delete: "Delete",
      confirmDelete: "Are you sure you wish to delete this profile?",
      done: "Done",
      import: "Import",
      export: "Export",
      emptyProfiles: "No Gen 5 profile saved.",
      noProfile: "No profile selected",
      storageIndexedDb: "IndexedDB",
      storageLocal: "localStorage fallback",
      settings: "Settings",
      date: "Date",
      time: "Time",
      seconds: "Seconds",
      min: "Min",
      max: "Max",
      search: "Search",
      ivSearch: "IV Search",
      minIVs: "Min IVs",
      maxIVs: "Max IVs",
      needleSearch: "Needle Search",
      unovaLink: "Unova Link",
      saving: "Saving",
      seedSearch: "Seed Search",
      seed: "Seed",
      result: "Result",
      processed: "Processed",
      createProfile: "Create profile",
      noResults: "No calibration result.",
      cancelled: "Cancelled",
      running: "Searching",
      error: "Error",
      resultLimit: "Result limit",
      yes: "Yes",
      no: "No",
    };
  }
  return {
    profileManager: "第五世代存档信息管理",
    profileCalibrator: "存档信息校准",
    profileName: "存档名",
    version: "版本",
    language: "语言",
    dsType: "机型",
    mac: "MAC地址",
    profileMac: "MAC",
    keypresses: "按键",
    vcount: "VCount",
    gxstat: "GxStat",
    vframe: "VFrame",
    timer0Min: "最小Timer0",
    timer0Max: "Timer0 Max",
    tid: "TID",
    sid: "SID",
    accept: "确定",
    cancel: "取消",
    findParameters: "查询参数",
    skipLR: "Skip L/R",
    memoryLink: "记忆连接",
    nsReleased: "N's Pokémon released",
    shinyCharm: "闪耀护符",
    ivCache: "IV Cache",
    shaCache: "SHA Cache",
    selectFile: "选择文件",
    clear: "清空",
    newProfile: "新建",
    edit: "编辑",
    duplicate: "复制",
    delete: "删除",
    confirmDelete: "确定要删除此存档信息吗？",
    done: "完成",
    import: "导入",
    export: "Export",
    emptyProfiles: "尚未保存第五世代存档信息。",
    noProfile: "未选择存档信息",
    storageIndexedDb: "IndexedDB",
    storageLocal: "localStorage fallback",
    settings: "设置",
    date: "日期",
    time: "时间",
    seconds: "秒",
    min: "最小",
    max: "最大",
    search: "检索",
    ivSearch: "个体值检索",
    minIVs: "最小个体值",
    maxIVs: "最大个体值",
    needleSearch: "指针检索",
    unovaLink: "合众连接",
    saving: "存档",
    seedSearch: "Seed检索",
    seed: "Seed",
    result: "结果",
    processed: "已处理",
    createProfile: "Create profile",
    noResults: "没有校准结果。",
    cancelled: "已取消",
    running: "检索中",
    error: "错误",
    resultLimit: "Result limit",
    yes: "是",
    no: "否",
  };
}

function gameLabel(version: Gen5GameVersion, chinese: boolean) {
  return (chinese ? GAME_LABELS_ZH : GAME_LABELS)[version];
}

function numberValue(value: string, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return minimum;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function handleTabKey<T extends string>(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  values: readonly T[],
  current: T,
  select: (value: T) => void,
) {
  const index = values.indexOf(current);
  let next: number;
  if (event.key === "ArrowLeft")
    next = (index - 1 + values.length) % values.length;
  else if (event.key === "ArrowRight") next = (index + 1) % values.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = values.length - 1;
  else return;
  event.preventDefault();
  select(values[next]);
  const tabs = event.currentTarget.parentElement?.querySelectorAll("button");
  (tabs?.[next] as HTMLButtonElement | undefined)?.focus();
}

function profileDecimalInput(value: string, maximum: number) {
  const normalized = value.replace(/[^0-9]/g, "").slice(0, 5);
  if (!normalized) return "";
  return String(Math.min(maximum, Number(normalized)));
}

function profileHexInput(value: string, length: number, maximum: number) {
  const normalized = normalizeHex(value, length).replace(/^0+(?=.)/, "");
  if (!normalized) return "";
  return Math.min(maximum, parseHex(normalized)).toString(16).toUpperCase();
}

function ProfileEditor({
  original,
  initial,
  labels,
  onCancel,
  onFindParameters,
  onSave,
}: ProfileEditorProps) {
  const chinese = labels.profileManager === "第五世代存档信息管理";
  const [draft, setDraft] = useState<Gen5ProfileDraft>(
    initial ??
      (original
        ? {
            name: original.name,
            version: original.version,
            language: original.language,
            dsType: original.dsType,
            tid: original.tid,
            sid: original.sid,
            mac: original.mac,
            vcount: original.vcount,
            timer0Min: original.timer0Min,
            timer0Max: original.timer0Max,
            gxstat: original.gxstat,
            vframe: original.vframe,
            keypresses: [
              ...original.keypresses,
            ] as Gen5ProfileDraft["keypresses"],
            skipLR: original.skipLR,
            memoryLink: original.memoryLink,
            nsPokemonReleased: original.nsPokemonReleased,
            shinyCharm: original.shinyCharm,
            ivCacheName: original.ivCacheName,
            shaCacheName: original.shaCacheName,
          }
        : {
            ...DEFAULT_GEN5_PROFILE_DRAFT,
            keypresses: [...DEFAULT_GEN5_PROFILE_DRAFT.keypresses],
          }),
  );
  const [profileInputs, setProfileInputs] = useState(() => {
    const blankNewProfile = !original && !initial;
    const hex = (value: number) => value.toString(16).toUpperCase();
    return {
      tid: blankNewProfile ? "" : String(draft.tid),
      sid: blankNewProfile ? "" : String(draft.sid),
      mac: draft.mac,
      vcount: blankNewProfile ? "" : hex(draft.vcount),
      gxstat: blankNewProfile ? "" : hex(draft.gxstat),
      vframe: blankNewProfile ? "" : hex(draft.vframe),
      timer0Min: blankNewProfile ? "" : hex(draft.timer0Min),
      timer0Max: blankNewProfile ? "" : hex(draft.timer0Max),
    };
  });
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>(
          "input:not([disabled]), select:not([disabled]), button:not([disabled])",
        )
        ?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onCancel]);

  const update = <K extends keyof Gen5ProfileDraft>(
    key: K,
    value: Gen5ProfileDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await onSave({
        ...draft,
        tid: Number(profileInputs.tid || "0"),
        sid: Number(profileInputs.sid || "0"),
        mac: profileInputs.mac,
        vcount: parseHex(profileInputs.vcount),
        gxstat: parseHex(profileInputs.gxstat),
        vframe: parseHex(profileInputs.vframe),
        timer0Min: parseHex(profileInputs.timer0Min),
        timer0Max: parseHex(profileInputs.timer0Max),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const chooseFile = (
    key: "ivCacheName" | "shaCacheName",
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setDraft((current) => ({
      ...current,
      [key]: file.name,
      ...(key === "ivCacheName" ? { shaCacheName: "" } : {}),
    }));
  };

  return (
    <div
      className="gen5profiles-overlay"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onCancel();
      }}
      role="presentation"
    >
      <form
        aria-labelledby="gen5-profile-editor-title"
        aria-modal="true"
        className="gen5profiles-dialog"
        onSubmit={submit}
        ref={dialogRef}
        role="dialog"
      >
        <div className="gen5profiles-dialog-heading">
          <div>
            <span className="gen5profiles-eyebrow">
              {labels.profileManager}
            </span>
            <h2 id="gen5-profile-editor-title">
              {original ? labels.edit : labels.newProfile}
            </h2>
          </div>
          <button
            aria-label={labels.cancel}
            className="gen5profiles-icon-button"
            onClick={onCancel}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="gen5profiles-form-grid">
          <label className="gen5profiles-field gen5profiles-span-2">
            <span>{labels.profileName}</span>
            <input
              autoFocus
              onChange={(event) => update("name", event.target.value)}
              value={draft.name}
            />
          </label>
          <label className="gen5profiles-field">
            <span>{labels.version}</span>
            <select
              onChange={(event) => {
                const version = event.target.value as Gen5GameVersion;
                setDraft((current) => ({
                  ...current,
                  version,
                  ...(isBw2Version(version)
                    ? {}
                    : {
                        memoryLink: false,
                        nsPokemonReleased: false,
                        shinyCharm: false,
                      }),
                }));
              }}
              value={draft.version}
            >
              {GEN5_GAME_VERSIONS.map((value) => (
                <option key={value} value={value}>
                  {gameLabel(value, chinese)}
                </option>
              ))}
            </select>
          </label>
          <label className="gen5profiles-field">
            <span>{labels.language}</span>
            <select
              onChange={(event) =>
                update("language", event.target.value as Gen5Language)
              }
              value={draft.language}
            >
              {GEN5_LANGUAGES.map((value) => (
                <option key={value} value={value}>
                  {LANGUAGE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="gen5profiles-field">
            <span>{labels.dsType}</span>
            <select
              onChange={(event) =>
                update("dsType", event.target.value as Gen5DsType)
              }
              value={draft.dsType}
            >
              {GEN5_DS_TYPES.map((value) => (
                <option key={value} value={value}>
                  {DS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="gen5profiles-field">
            <span>{labels.tid}</span>
            <input
              inputMode="numeric"
              maxLength={5}
              onChange={(event) =>
                setProfileInputs((current) => ({
                  ...current,
                  tid: profileDecimalInput(event.target.value, 65535),
                }))
              }
              value={profileInputs.tid}
            />
          </label>
          <label className="gen5profiles-field">
            <span>{labels.sid}</span>
            <input
              inputMode="numeric"
              maxLength={5}
              onChange={(event) =>
                setProfileInputs((current) => ({
                  ...current,
                  sid: profileDecimalInput(event.target.value, 65535),
                }))
              }
              value={profileInputs.sid}
            />
          </label>
          <label className="gen5profiles-field gen5profiles-span-2">
            <span>{labels.profileMac}</span>
            <input
              autoCapitalize="characters"
              inputMode="text"
              maxLength={12}
              onChange={(event) =>
                setProfileInputs((current) => ({
                  ...current,
                  mac: profileHexInput(
                    event.target.value,
                    12,
                    0xffff_ffff_ffff,
                  ),
                }))
              }
              value={profileInputs.mac}
            />
          </label>
          <label className="gen5profiles-field">
            <span>{labels.vcount}</span>
            <input
              inputMode="text"
              maxLength={2}
              onChange={(event) =>
                setProfileInputs((current) => ({
                  ...current,
                  vcount: profileHexInput(event.target.value, 2, 0xff),
                }))
              }
              value={profileInputs.vcount}
            />
          </label>
          <label className="gen5profiles-field">
            <span>{labels.gxstat}</span>
            <input
              inputMode="text"
              maxLength={2}
              onChange={(event) =>
                setProfileInputs((current) => ({
                  ...current,
                  gxstat: profileHexInput(event.target.value, 2, 0x63),
                }))
              }
              value={profileInputs.gxstat}
            />
          </label>
          <label className="gen5profiles-field">
            <span>{labels.vframe}</span>
            <input
              inputMode="text"
              maxLength={2}
              onChange={(event) =>
                setProfileInputs((current) => ({
                  ...current,
                  vframe: profileHexInput(event.target.value, 2, 0x63),
                }))
              }
              value={profileInputs.vframe}
            />
          </label>
          <label className="gen5profiles-field">
            <span>{labels.timer0Min}</span>
            <input
              inputMode="text"
              maxLength={4}
              onChange={(event) =>
                setProfileInputs((current) => ({
                  ...current,
                  timer0Min: profileHexInput(event.target.value, 4, 0xffff),
                }))
              }
              value={profileInputs.timer0Min}
            />
          </label>
          <label className="gen5profiles-field">
            <span>{labels.timer0Max}</span>
            <input
              inputMode="text"
              maxLength={4}
              onChange={(event) =>
                setProfileInputs((current) => ({
                  ...current,
                  timer0Max: profileHexInput(event.target.value, 4, 0xffff),
                }))
              }
              value={profileInputs.timer0Max}
            />
          </label>
        </div>
        <fieldset className="gen5profiles-option-group">
          <legend>{labels.keypresses}</legend>
          <div className="gen5profiles-check-grid">
            {draft.keypresses.map((checked, index) => (
              <label key={index}>
                <input
                  checked={checked}
                  onChange={(event) => {
                    const next = [
                      ...draft.keypresses,
                    ] as Gen5ProfileDraft["keypresses"];
                    next[index] = event.target.checked;
                    update("keypresses", next);
                  }}
                  type="checkbox"
                />
                {index}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="gen5profiles-check-grid gen5profiles-options-row">
          <label>
            <input
              checked={draft.skipLR}
              onChange={(event) => update("skipLR", event.target.checked)}
              type="checkbox"
            />
            {labels.skipLR}
          </label>
          {isBw2Version(draft.version) && (
            <>
              <label>
                <input
                  checked={draft.memoryLink}
                  onChange={(event) => {
                    const memoryLink = event.target.checked;
                    setDraft((current) => ({
                      ...current,
                      memoryLink,
                      nsPokemonReleased:
                        memoryLink && current.nsPokemonReleased,
                    }));
                  }}
                  type="checkbox"
                />
                {labels.memoryLink}
              </label>
              <label>
                <input
                  checked={draft.nsPokemonReleased}
                  disabled={!draft.memoryLink}
                  onChange={(event) =>
                    update("nsPokemonReleased", event.target.checked)
                  }
                  type="checkbox"
                />
                {labels.nsReleased}
              </label>
              <label>
                <input
                  checked={draft.shinyCharm}
                  onChange={(event) =>
                    update("shinyCharm", event.target.checked)
                  }
                  type="checkbox"
                />
                {labels.shinyCharm}
              </label>
            </>
          )}
        </div>
        <div className="gen5profiles-cache-grid">
          {(["ivCacheName", "shaCacheName"] as const).map((key) => (
            <div className="gen5profiles-cache-row" key={key}>
              <label className="gen5profiles-field">
                <span>
                  {key === "ivCacheName" ? labels.ivCache : labels.shaCache}
                </span>
                <input readOnly value={draft[key]} />
              </label>
              <label className="gen5profiles-file-button">
                <span>{labels.selectFile}</span>
                <input
                  accept={key === "ivCacheName" ? ".ivcache" : ".sha1cache"}
                  onChange={(event) => chooseFile(key, event)}
                  type="file"
                />
              </label>
              <button
                className="gen5profiles-secondary-button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    [key]: "",
                    ...(key === "ivCacheName" ? { shaCacheName: "" } : {}),
                  }))
                }
                type="button"
              >
                {labels.clear}
              </button>
            </div>
          ))}
        </div>
        {error && <div className="gen5profiles-alert error">{error}</div>}
        <div className="gen5profiles-dialog-actions">
          <button
            className="gen5profiles-secondary-button"
            onClick={onFindParameters}
            type="button"
          >
            {labels.findParameters}
          </button>
          <button
            className="gen5profiles-secondary-button"
            onClick={onCancel}
            type="button"
          >
            {labels.cancel}
          </button>
          <button className="gen5profiles-primary-button" type="submit">
            {labels.accept}
          </button>
        </div>
      </form>
    </div>
  );
}

interface ManagerProps {
  labels: Labels;
  controller: Gen5ProfilesController;
  onEdit(profile?: Gen5Profile): void;
}

function Manager({ labels, controller, onEdit }: ManagerProps) {
  const chinese = labels.profileManager === "第五世代存档信息管理";
  const [draggedId, setDraggedId] = useState<string>();
  const [importError, setImportError] = useState("");
  const locked = controller.loading || controller.busy;
  const selectedIndex = controller.profiles.findIndex(
    (profile) => profile.id === controller.selectedProfileId,
  );
  const persist = (operation: Promise<void>) => {
    void operation.catch(() => undefined);
  };

  const download = () => {
    const blob = new Blob(
      [serializeGen5ProfileBackup(controller.exportState())],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen5-profiles.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImportError("");
      await controller.importBackup(await file.text());
    } catch (cause) {
      setImportError(cause instanceof Error ? cause.message : String(cause));
    }
    event.target.value = "";
  };

  return (
    <section className="gen5profiles-manager">
      <div className="gen5profiles-toolbar">
        <div className="gen5profiles-toolbar-leading">
          <span className="gen5profiles-eyebrow">{labels.profileManager}</span>
          <strong>{controller.profiles.length}</strong>
        </div>
        <div className="gen5profiles-toolbar-actions">
          <button
            className="gen5profiles-secondary-button"
            disabled={locked}
            onClick={() => onEdit()}
            type="button"
          >
            {labels.newProfile}
          </button>
          <button
            className="gen5profiles-secondary-button"
            disabled={locked || !controller.selectedProfile}
            onClick={() => onEdit(controller.selectedProfile)}
            type="button"
          >
            {labels.edit}
          </button>
          <button
            className="gen5profiles-secondary-button"
            disabled={locked || !controller.selectedProfile}
            onClick={() =>
              controller.selectedProfile &&
              persist(controller.duplicateProfile(controller.selectedProfile))
            }
            type="button"
          >
            {labels.duplicate}
          </button>
          <button
            aria-label="Move up"
            className="gen5profiles-icon-button"
            disabled={locked || selectedIndex <= 0}
            onClick={() => {
              const profile = controller.selectedProfile;
              if (profile) persist(controller.moveProfile(profile.id, -1));
            }}
            title="Move up"
            type="button"
          >
            ↑
          </button>
          <button
            aria-label="Move down"
            className="gen5profiles-icon-button"
            disabled={
              locked ||
              selectedIndex < 0 ||
              selectedIndex >= controller.profiles.length - 1
            }
            onClick={() => {
              const profile = controller.selectedProfile;
              if (profile) persist(controller.moveProfile(profile.id, 1));
            }}
            title="Move down"
            type="button"
          >
            ↓
          </button>
          <button
            className="gen5profiles-danger-button"
            disabled={locked || !controller.selectedProfile}
            onClick={() => {
              const profile = controller.selectedProfile;
              if (profile && window.confirm(labels.confirmDelete))
                persist(controller.deleteProfile(profile));
            }}
            type="button"
          >
            {labels.delete}
          </button>
          <button
            className="gen5profiles-secondary-button"
            disabled={locked}
            onClick={download}
            type="button"
          >
            {labels.export}
          </button>
          <label
            aria-disabled={locked}
            className="gen5profiles-secondary-button"
          >
            <span>{labels.import}</span>
            <input
              accept="application/json,.json"
              disabled={locked}
              onChange={importBackup}
              type="file"
            />
          </label>
        </div>
      </div>
      <div className="gen5profiles-storage-note">
        {controller.storageMode === "indexeddb"
          ? labels.storageIndexedDb
          : labels.storageLocal}
      </div>
      {controller.error && (
        <div className="gen5profiles-alert error" role="alert">
          {controller.error}
        </div>
      )}
      {importError && (
        <div className="gen5profiles-alert error" role="alert">
          {importError}
        </div>
      )}
      <div className="gen5profiles-table-shell">
        {controller.loading ? (
          <div className="gen5profiles-empty">{labels.running}</div>
        ) : controller.profiles.length === 0 ? (
          <div className="gen5profiles-empty">{labels.emptyProfiles}</div>
        ) : (
          <table className="gen5profiles-table" role="grid">
            <thead>
              <tr>
                <th>{labels.profileName}</th>
                <th>{labels.version}</th>
                <th>{labels.language}</th>
                <th>{labels.tid}</th>
                <th>{labels.sid}</th>
                <th>{labels.mac}</th>
                <th>{labels.dsType}</th>
                <th>{labels.vcount}</th>
                <th>Timer0</th>
                <th>{labels.gxstat}</th>
                <th>{labels.vframe}</th>
                <th>{labels.keypresses}</th>
                <th>{labels.skipLR}</th>
                <th>{labels.memoryLink}</th>
                <th>{labels.nsReleased}</th>
                <th>{labels.shinyCharm}</th>
              </tr>
            </thead>
            <tbody>
              {controller.profiles.map((profile) => (
                <tr
                  aria-selected={profile.id === controller.selectedProfileId}
                  draggable={!locked}
                  onClick={() => persist(controller.selectProfile(profile.id))}
                  onDragEnd={() => setDraggedId(undefined)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedId)
                      persist(controller.reorderProfile(draggedId, profile.id));
                    setDraggedId(undefined);
                  }}
                  onDragStart={() => setDraggedId(profile.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      persist(controller.selectProfile(profile.id));
                      return;
                    }
                    if (event.key !== "ArrowUp" && event.key !== "ArrowDown")
                      return;
                    event.preventDefault();
                    const next =
                      event.key === "ArrowUp"
                        ? event.currentTarget.previousElementSibling
                        : event.currentTarget.nextElementSibling;
                    if (next instanceof HTMLTableRowElement) {
                      next.focus();
                      const nextId = next.dataset.profileId;
                      if (nextId) persist(controller.selectProfile(nextId));
                    }
                  }}
                  className={
                    profile.id === controller.selectedProfileId
                      ? "selected"
                      : ""
                  }
                  data-profile-id={profile.id}
                  key={profile.id}
                  tabIndex={0}
                >
                  <td>{profile.name}</td>
                  <td>{gameLabel(profile.version, chinese)}</td>
                  <td>{LANGUAGE_LABELS[profile.language]}</td>
                  <td>{profile.tid}</td>
                  <td>{profile.sid}</td>
                  <td className="mono">{profile.mac}</td>
                  <td>{DS_LABELS[profile.dsType]}</td>
                  <td className="mono">
                    {profile.vcount.toString(16).toUpperCase().padStart(2, "0")}
                  </td>
                  <td className="mono">
                    {profile.timer0Min
                      .toString(16)
                      .toUpperCase()
                      .padStart(4, "0")}
                    /
                    {profile.timer0Max
                      .toString(16)
                      .toUpperCase()
                      .padStart(4, "0")}
                  </td>
                  <td>{profile.gxstat}</td>
                  <td>{profile.vframe}</td>
                  <td>
                    {profile.keypresses
                      .map((checked, index) => (checked ? index : ""))
                      .filter((value) => value !== "")
                      .join(", ") || "-"}
                  </td>
                  <td>{profile.skipLR ? labels.yes : labels.no}</td>
                  <td>{profile.memoryLink ? labels.yes : labels.no}</td>
                  <td>{profile.nsPokemonReleased ? labels.yes : labels.no}</td>
                  <td>{profile.shinyCharm ? labels.yes : labels.no}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function defaultCalibration(): Gen5CalibrationRequest {
  const range = gen5CalibrationDefaults("black", "ds");
  return {
    mode: "ivs",
    version: "black",
    language: "english",
    dsType: "ds",
    mac: "",
    buttonMask: 0,
    date: "2000-01-01",
    hour: 0,
    minute: 0,
    minSeconds: 0,
    maxSeconds: 59,
    minVCount: range.minVCount,
    maxVCount: range.maxVCount,
    minTimer0: range.minTimer0,
    maxTimer0: range.maxTimer0,
    minGxStat: 6,
    maxGxStat: 6,
    minVFrame: 0,
    maxVFrame: 0x10,
    minIVs: [0, 0, 0, 0, 0, 0],
    maxIVs: [31, 31, 31, 31, 31, 31],
    needles: [],
    needleType: "unova-link",
    memoryLink: false,
    seed: "",
    resultLimit: 1000,
  };
}

function Calibrator({
  labels,
  onCreateProfile,
  uiPreviewMode,
}: {
  labels: Labels;
  onCreateProfile(draft: Gen5ProfileDraft): void;
  uiPreviewMode: boolean;
}) {
  const chinese = labels.profileManager === "第五世代存档信息管理";
  const engine = useMemo(
    () =>
      uiPreviewMode
        ? new Gen5ProfilesUiPreviewEngine()
        : new Gen5ProfilesWorkerPool(),
    [uiPreviewMode],
  );
  const [request, setRequest] =
    useState<Gen5CalibrationRequest>(defaultCalibration);
  const [rangeInputs, setRangeInputs] = useState<
    Record<CalibrationHexRangeKey, string>
  >(() => ({
    minVCount: request.minVCount.toString(16).toUpperCase(),
    maxVCount: request.maxVCount.toString(16).toUpperCase(),
    minTimer0: request.minTimer0.toString(16).toUpperCase(),
    maxTimer0: request.maxTimer0.toString(16).toUpperCase(),
    minGxStat: request.minGxStat.toString(16).toUpperCase(),
    maxGxStat: request.maxGxStat.toString(16).toUpperCase(),
    minVFrame: request.minVFrame.toString(16).toUpperCase(),
    maxVFrame: request.maxVFrame.toString(16).toUpperCase(),
  }));
  const [results, setResults] = useState<Gen5CalibrationResult[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "running" | "cancelled" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({
    processedStates: 0,
    totalStates: 0,
    percent: 0,
  });
  useEffect(() => () => engine.dispose(), [engine]);
  const update = <K extends keyof Gen5CalibrationRequest>(
    key: K,
    value: Gen5CalibrationRequest[K],
  ) => setRequest((current) => ({ ...current, [key]: value }));
  const updatePlatform = (
    key: "version" | "dsType",
    value: Gen5GameVersion | Gen5DsType,
  ) => {
    const next = { ...request, [key]: value } as Gen5CalibrationRequest;
    const range = gen5CalibrationDefaults(next.version, next.dsType);
    const reset = {
      ...range,
      minGxStat: 6,
      maxGxStat: 6,
      minVFrame: 0,
      maxVFrame: 0x10,
    };
    setRequest((current) => ({ ...current, [key]: value, ...reset }));
    setRangeInputs({
      minVCount: reset.minVCount.toString(16).toUpperCase(),
      maxVCount: reset.maxVCount.toString(16).toUpperCase(),
      minTimer0: reset.minTimer0.toString(16).toUpperCase(),
      maxTimer0: reset.maxTimer0.toString(16).toUpperCase(),
      minGxStat: "6",
      maxGxStat: "6",
      minVFrame: "0",
      maxVFrame: "10",
    });
  };
  const updateRange = (
    key:
      | "minSeconds"
      | "maxSeconds"
      | "minVCount"
      | "maxVCount"
      | "minTimer0"
      | "maxTimer0"
      | "minGxStat"
      | "maxGxStat"
      | "minVFrame"
      | "maxVFrame",
    value: string,
    radix: 10 | 16,
    limit: number,
    digits: number,
  ) => {
    let parsed: number;
    if (radix === 16) {
      const normalized = profileHexInput(value, digits, limit);
      setRangeInputs((current) => ({
        ...current,
        [key as CalibrationHexRangeKey]: normalized,
      }));
      parsed = parseHex(normalized);
    } else {
      parsed = numberValue(value, 0, limit);
    }
    setRequest((current) => ({ ...current, [key]: parsed }));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      validateGen5CalibrationRequest(request);
      setResults([]);
      setStatus("running");
      setRunning(true);
      const summary = await engine.search(request, {
        onProgress: (next) => setProgress(next),
      });
      setResults(summary.results);
      setStatus(summary.cancelled ? "cancelled" : "idle");
      setProgress({
        processedStates: summary.processedStates,
        totalStates: summary.totalStates,
        percent: summary.totalStates
          ? (summary.processedStates / summary.totalStates) * 100
          : 0,
      });
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRunning(false);
    }
  };
  const buttonMask = (index: number) =>
    (request.buttonMask & (1 << index)) !== 0;
  const setIv = (kind: "minIVs" | "maxIVs", index: number, value: string) => {
    const next = [...request[kind]] as Gen5CalibrationRequest[typeof kind];
    next[index] = numberValue(value, 0, 31);
    update(kind, next);
  };
  const addNeedle = (value: number) =>
    update("needles", [...request.needles, value]);
  return (
    <section className="gen5profiles-calibrator">
      <form className="gen5profiles-calibrator-controls" onSubmit={submit}>
        <div className="gen5profiles-calibrator-head">
          <div>
            <span className="gen5profiles-eyebrow">
              {labels.profileCalibrator}
            </span>
            <h2>{labels.settings}</h2>
          </div>
          <span
            aria-live="polite"
            className={`gen5profiles-status ${status}`}
            role="status"
          >
            {status === "running"
              ? labels.running
              : status === "cancelled"
                ? labels.cancelled
                : status === "error"
                  ? labels.error
                  : labels.result}
          </span>
        </div>
        <div className="gen5profiles-control-grid">
          <label className="gen5profiles-field">
            <span>{labels.version}</span>
            <select
              onChange={(event) =>
                updatePlatform("version", event.target.value as Gen5GameVersion)
              }
              value={request.version}
            >
              {GEN5_GAME_VERSIONS.map((value) => (
                <option key={value} value={value}>
                  {gameLabel(value, chinese)}
                </option>
              ))}
            </select>
          </label>
          <label className="gen5profiles-field">
            <span>{labels.language}</span>
            <select
              onChange={(event) =>
                update("language", event.target.value as Gen5Language)
              }
              value={request.language}
            >
              {GEN5_LANGUAGES.map((value) => (
                <option key={value} value={value}>
                  {LANGUAGE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="gen5profiles-field">
            <span>{labels.dsType}</span>
            <select
              onChange={(event) =>
                updatePlatform("dsType", event.target.value as Gen5DsType)
              }
              value={request.dsType}
            >
              {GEN5_DS_TYPES.map((value) => (
                <option key={value} value={value}>
                  {DS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="gen5profiles-field gen5profiles-span-2">
            <span>{labels.mac}</span>
            <input
              maxLength={12}
              onChange={(event) =>
                update("mac", normalizeHex(event.target.value, 12))
              }
              value={request.mac}
            />
          </label>
          <label className="gen5profiles-field">
            <span>{labels.date}</span>
            <input
              max="2099-12-31"
              min="2000-01-01"
              onChange={(event) => update("date", event.target.value)}
              type="date"
              value={request.date}
            />
          </label>
          <label className="gen5profiles-field">
            <span>{labels.time}</span>
            <input
              onChange={(event) => {
                const [hour, minute] = event.target.value
                  .split(":")
                  .map(Number);
                update("hour", hour);
                update("minute", minute);
              }}
              type="time"
              value={`${String(request.hour).padStart(2, "0")}:${String(request.minute).padStart(2, "0")}`}
            />
          </label>
        </div>
        <fieldset className="gen5profiles-option-group">
          <legend>{labels.keypresses}</legend>
          <div className="gen5profiles-check-grid button-grid">
            {BUTTONS.map((button, index) => (
              <label key={button}>
                <input
                  checked={buttonMask(index)}
                  onChange={(event) =>
                    update(
                      "buttonMask",
                      event.target.checked
                        ? request.buttonMask | (1 << index)
                        : request.buttonMask & ~(1 << index),
                    )
                  }
                  type="checkbox"
                />
                {button}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="gen5profiles-range-grid">
          {(
            [
              ["minSeconds", labels.seconds, 0, 59, 10, 2],
              ["maxSeconds", labels.seconds, 0, 59, 10, 2],
              ["minVCount", labels.vcount, 0, 255, 16, 2],
              ["maxVCount", labels.vcount, 0, 255, 16, 2],
              ["minTimer0", "Timer0", 0, 65535, 16, 4],
              ["maxTimer0", "Timer0", 0, 65535, 16, 4],
              ["minGxStat", labels.gxstat, 0, 99, 16, 2],
              ["maxGxStat", labels.gxstat, 0, 99, 16, 2],
              ["minVFrame", labels.vframe, 0, 99, 16, 2],
              ["maxVFrame", labels.vframe, 0, 99, 16, 2],
            ] as const
          ).map(([key, label, min, max, radix, digits]) => (
            <label className="gen5profiles-field" key={key}>
              <span>
                {label} {key.startsWith("min") ? labels.min : labels.max}
              </span>
              <input
                inputMode={radix === 16 ? "text" : "numeric"}
                max={radix === 10 ? max : undefined}
                min={radix === 10 ? min : undefined}
                maxLength={radix === 16 ? digits : undefined}
                onChange={(event) =>
                  updateRange(
                    key,
                    event.target.value,
                    radix as 10 | 16,
                    max,
                    digits,
                  )
                }
                value={
                  radix === 16
                    ? rangeInputs[key as CalibrationHexRangeKey]
                    : request[key]
                }
              />
            </label>
          ))}
        </div>
        <div className="gen5profiles-mode-tabs" role="tablist">
          <button
            aria-controls="gen5-calibrator-panel-ivs"
            aria-selected={request.mode === "ivs"}
            className={request.mode === "ivs" ? "active" : ""}
            id="gen5-calibrator-tab-ivs"
            onClick={() => update("mode", "ivs")}
            onKeyDown={(event) =>
              handleTabKey(event, CALIBRATION_MODES, request.mode, (mode) =>
                update("mode", mode),
              )
            }
            role="tab"
            tabIndex={request.mode === "ivs" ? 0 : -1}
            type="button"
          >
            {labels.ivSearch}
          </button>
          <button
            aria-controls="gen5-calibrator-panel-needles"
            aria-selected={request.mode === "needles"}
            className={request.mode === "needles" ? "active" : ""}
            id="gen5-calibrator-tab-needles"
            onClick={() => update("mode", "needles")}
            onKeyDown={(event) =>
              handleTabKey(event, CALIBRATION_MODES, request.mode, (mode) =>
                update("mode", mode),
              )
            }
            role="tab"
            tabIndex={request.mode === "needles" ? 0 : -1}
            type="button"
          >
            {labels.needleSearch}
          </button>
          <button
            aria-controls="gen5-calibrator-panel-seed"
            aria-selected={request.mode === "seed"}
            className={request.mode === "seed" ? "active" : ""}
            id="gen5-calibrator-tab-seed"
            onClick={() => update("mode", "seed")}
            onKeyDown={(event) =>
              handleTabKey(event, CALIBRATION_MODES, request.mode, (mode) =>
                update("mode", mode),
              )
            }
            role="tab"
            tabIndex={request.mode === "seed" ? 0 : -1}
            type="button"
          >
            {labels.seedSearch}
          </button>
        </div>
        {request.mode === "ivs" && (
          <div
            aria-labelledby="gen5-calibrator-tab-ivs"
            className="gen5profiles-iv-grid"
            id="gen5-calibrator-panel-ivs"
            role="tabpanel"
          >
            {["HP", "Atk", "Def", "SpA", "SpD", "Spe"].map((label, index) => (
              <div className="gen5profiles-iv-column" key={label}>
                <span>{label}</span>
                <input
                  aria-label={`${labels.minIVs} ${label}`}
                  inputMode="numeric"
                  max={31}
                  min={0}
                  onChange={(event) =>
                    setIv("minIVs", index, event.target.value)
                  }
                  type="number"
                  value={request.minIVs[index]}
                />
                <input
                  aria-label={`${labels.maxIVs} ${label}`}
                  inputMode="numeric"
                  max={31}
                  min={0}
                  onChange={(event) =>
                    setIv("maxIVs", index, event.target.value)
                  }
                  type="number"
                  value={request.maxIVs[index]}
                />
              </div>
            ))}
          </div>
        )}
        {request.mode === "needles" && (
          <div
            aria-labelledby="gen5-calibrator-tab-needles"
            className="gen5profiles-needle-settings"
            id="gen5-calibrator-panel-needles"
            role="tabpanel"
          >
            <div className="gen5profiles-needle-buttons">
              {GEN5_NEEDLE_DIRECTIONS.map(([label, value]) => (
                <button
                  aria-label={label}
                  key={value}
                  onClick={() => addNeedle(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="gen5profiles-needle-sequence">
              {request.needles.length ? (
                request.needles.map((value, index) => (
                  <span key={`${value}-${index}`}>
                    {GEN5_NEEDLE_DIRECTIONS[value][0]}
                  </span>
                ))
              ) : (
                <span>-</span>
              )}
            </div>
            <div className="gen5profiles-check-grid">
              <label>
                <input
                  checked={request.needleType === "unova-link"}
                  onChange={() => update("needleType", "unova-link")}
                  type="radio"
                />
                {labels.unovaLink}
              </label>
              <label>
                <input
                  checked={request.needleType === "saving"}
                  onChange={() => update("needleType", "saving")}
                  type="radio"
                />
                {labels.saving}
              </label>
              <label>
                <input
                  checked={request.memoryLink}
                  onChange={(event) =>
                    update("memoryLink", event.target.checked)
                  }
                  type="checkbox"
                />
                {labels.memoryLink}
              </label>
              <button
                className="gen5profiles-secondary-button"
                disabled={request.needles.length === 0}
                onClick={() => update("needles", request.needles.slice(0, -1))}
                type="button"
              >
                {labels.delete}
              </button>
              <button
                className="gen5profiles-secondary-button"
                onClick={() => update("needles", [])}
                type="button"
              >
                {labels.clear}
              </button>
            </div>
          </div>
        )}
        {request.mode === "seed" && (
          <div
            aria-labelledby="gen5-calibrator-tab-seed"
            id="gen5-calibrator-panel-seed"
            role="tabpanel"
          >
            <label className="gen5profiles-field">
              <span>{labels.seed}</span>
              <input
                maxLength={16}
                onChange={(event) =>
                  update("seed", normalizeHex(event.target.value, 16))
                }
                value={request.seed}
              />
            </label>
          </div>
        )}
        <div className="gen5profiles-search-actions">
          <label className="gen5profiles-field">
            <span>{labels.resultLimit}</span>
            <input
              max={100000}
              min={1}
              onChange={(event) =>
                update(
                  "resultLimit",
                  numberValue(event.target.value, 1, 100000),
                )
              }
              type="number"
              value={request.resultLimit}
            />
          </label>
          <button
            className="gen5profiles-primary-button"
            disabled={running}
            type="submit"
          >
            {labels.search}
          </button>
          <button
            className="gen5profiles-secondary-button"
            disabled={!running}
            onClick={() => engine.cancel()}
            type="button"
          >
            {labels.cancel}
          </button>
        </div>
        {error && (
          <div className="gen5profiles-alert error" role="alert">
            {error}
          </div>
        )}
      </form>
      <section className="gen5profiles-results">
        <div className="gen5profiles-results-heading">
          <h2>{labels.result}</h2>
          <span aria-live="polite" role="status">
            {progress.processedStates}/{progress.totalStates || "-"}
          </span>
        </div>
        <div
          aria-label={labels.processed}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.min(100, progress.percent)}
          className="gen5profiles-progress"
          role="progressbar"
        >
          <span style={{ width: `${Math.min(100, progress.percent)}%` }} />
        </div>
        <div className="gen5profiles-result-table-shell">
          {results.length === 0 ? (
            <div className="gen5profiles-empty">{labels.noResults}</div>
          ) : (
            <table className="gen5profiles-result-table">
              <thead>
                <tr>
                  <th>Seed</th>
                  <th>{labels.seconds}</th>
                  <th>{labels.vcount}</th>
                  <th>Timer0</th>
                  <th>{labels.gxstat}</th>
                  <th>{labels.vframe}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={`${result.seed}-${result.vframe}-${result.seconds}`}>
                    <td className="mono">{result.seed}</td>
                    <td>{result.seconds}</td>
                    <td className="mono">
                      {result.vcount
                        .toString(16)
                        .toUpperCase()
                        .padStart(2, "0")}
                    </td>
                    <td className="mono">
                      {result.timer0
                        .toString(16)
                        .toUpperCase()
                        .padStart(4, "0")}
                    </td>
                    <td className="mono">
                      {result.gxstat
                        .toString(16)
                        .toUpperCase()
                        .padStart(2, "0")}
                    </td>
                    <td className="mono">
                      {result.vframe
                        .toString(16)
                        .toUpperCase()
                        .padStart(2, "0")}
                    </td>
                    <td>
                      <button
                        className="gen5profiles-link-button"
                        onClick={() =>
                          onCreateProfile({
                            ...DEFAULT_GEN5_PROFILE_DRAFT,
                            name: `Calibration ${result.seed}`,
                            version: request.version,
                            language: request.language,
                            dsType: request.dsType,
                            mac: request.mac,
                            vcount: result.vcount,
                            timer0Min: result.timer0,
                            timer0Max: result.timer0,
                            gxstat: result.gxstat,
                            vframe: result.vframe,
                          })
                        }
                        type="button"
                      >
                        {labels.createProfile}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </section>
  );
}

export function Gen5ProfilesPanel({
  uiPreviewMode = false,
}: {
  uiPreviewMode?: boolean;
}) {
  const { i18n } = useTranslation();
  const labels = useMemo(
    () => getLabels(i18n.language.startsWith("zh")),
    [i18n.language],
  );
  const [tab, setTab] = useState<"manager" | "calibrator">("manager");
  const [editor, setEditor] = useState<{
    original?: Gen5Profile;
    initial?: Gen5ProfileDraft;
  }>();
  const managerController = useGen5Profiles();
  const saveEditor = async (draft: Gen5ProfileDraft) => {
    if (editor?.original)
      await managerController.updateProfile(editor.original, draft);
    else await managerController.createProfile(draft);
    setEditor(undefined);
  };
  return (
    <div className="gen5profiles-panel">
      <header className="gen5profiles-header">
        <div>
          <span className="gen5profiles-eyebrow">Gen 5</span>
          <h2>
            {tab === "manager"
              ? labels.profileManager
              : labels.profileCalibrator}
          </h2>
        </div>
        <div className="gen5profiles-tabs" role="tablist">
          <button
            aria-controls="gen5-main-panel-manager"
            aria-selected={tab === "manager"}
            className={tab === "manager" ? "active" : ""}
            id="gen5-main-tab-manager"
            onClick={() => setTab("manager")}
            onKeyDown={(event) => handleTabKey(event, MAIN_TABS, tab, setTab)}
            role="tab"
            tabIndex={tab === "manager" ? 0 : -1}
            type="button"
          >
            {labels.profileManager}
          </button>
          <button
            aria-controls="gen5-main-panel-calibrator"
            aria-selected={tab === "calibrator"}
            className={tab === "calibrator" ? "active" : ""}
            id="gen5-main-tab-calibrator"
            onClick={() => setTab("calibrator")}
            onKeyDown={(event) => handleTabKey(event, MAIN_TABS, tab, setTab)}
            role="tab"
            tabIndex={tab === "calibrator" ? 0 : -1}
            type="button"
          >
            {labels.profileCalibrator}
          </button>
        </div>
      </header>
      {tab === "manager" ? (
        <div
          aria-labelledby="gen5-main-tab-manager"
          id="gen5-main-panel-manager"
          role="tabpanel"
        >
          <Manager
            controller={managerController}
            labels={labels}
            onEdit={(profile) => setEditor({ original: profile })}
          />
        </div>
      ) : (
        <div
          aria-labelledby="gen5-main-tab-calibrator"
          id="gen5-main-panel-calibrator"
          role="tabpanel"
        >
          <Calibrator
            labels={labels}
            onCreateProfile={(initial) => {
              setEditor({ initial });
              setTab("manager");
            }}
            uiPreviewMode={uiPreviewMode}
          />
        </div>
      )}
      {editor && (
        <ProfileEditor
          initial={editor.initial}
          labels={labels}
          onCancel={() => setEditor(undefined)}
          onFindParameters={() => {
            setEditor(undefined);
            setTab("calibrator");
          }}
          onSave={saveEditor}
          original={editor.original}
        />
      )}
    </div>
  );
}
