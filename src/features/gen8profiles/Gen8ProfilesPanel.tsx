import type { TFunction } from "i18next";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Database,
  Download,
  Eraser,
  FileUp,
  GripVertical,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
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
import {
  DEFAULT_GEN8_PROFILE_DRAFT,
  GEN8_GAME_VERSIONS,
  serializeGen8ProfileBackup,
  validateGen8ProfileDraft,
  type Gen8GameVersion,
  type Gen8Profile,
  type Gen8ProfileDraft,
} from "./domain";
import {
  useGen8Profiles,
  type Gen8ProfilesController,
} from "./useGen8Profiles";
import "./Gen8ProfilesPanel.css";

interface Labels {
  title: string;
  profileName: string;
  version: string;
  tid: string;
  sid: string;
  nationalDex: string;
  shinyCharm: string;
  ovalCharm: string;
  options: string;
  newProfile: string;
  edit: string;
  duplicate: string;
  moveUp: string;
  moveDown: string;
  delete: string;
  clear: string;
  import: string;
  export: string;
  save: string;
  cancel: string;
  close: string;
  createTitle: string;
  editTitle: string;
  confirmDelete: string;
  confirmClear: string;
  empty: string;
  loading: string;
  storageIndexedDb: string;
  storageLocal: string;
  selected: string;
  enterProfileName: string;
  noProfileSelected: string;
  pleaseSelectProfile: string;
  yes: string;
  no: string;
  versions: Record<Gen8GameVersion, string>;
}

function translated(t: TFunction, key: string, fallback: string) {
  return String(t(key, { defaultValue: fallback }));
}

function getLabels(t: TFunction, chinese: boolean): Labels {
  const fallback = chinese
    ? {
        title: "第八世代存档信息管理",
        profileName: "存档名",
        version: "版本",
        tid: "TID",
        sid: "SID",
        nationalDex: "全国图鉴",
        shinyCharm: "闪耀护符",
        ovalCharm: "圆形护符",
        options: "设置",
        newProfile: "新建",
        edit: "编辑",
        duplicate: "复制",
        moveUp: "Move up",
        moveDown: "Move down",
        delete: "删除",
        clear: "清空",
        import: "导入",
        export: "Export",
        save: "确认",
        cancel: "取消",
        close: "取消",
        createTitle: "第八世代存档信息编辑",
        editTitle: "第八世代存档信息编辑",
        confirmDelete: "确定要删除此存档信息吗？",
        confirmClear: "确定要清空全部第八世代存档信息吗？",
        empty: "尚未保存第八世代存档信息。",
        loading: "正在读取存档信息",
        storageIndexedDb: "IndexedDB",
        storageLocal: "localStorage 后备存储",
        selected: "Selected",
        enterProfileName: "请输入存档名",
        noProfileSelected: "未选择存档信息",
        pleaseSelectProfile: "请选择一个存档信息",
        yes: "是",
        no: "否",
      }
    : {
        title: "Profile Manager Gen 8",
        profileName: "Profile Name",
        version: "Version",
        tid: "TID",
        sid: "SID",
        nationalDex: "National Dex",
        shinyCharm: "Shiny Charm",
        ovalCharm: "Oval Charm",
        options: "Settings",
        newProfile: "New",
        edit: "Edit",
        duplicate: "Duplicate",
        moveUp: "Move up",
        moveDown: "Move down",
        delete: "Delete",
        clear: "Clear",
        import: "Import",
        export: "Export",
        save: "Okay",
        cancel: "Cancel",
        close: "Cancel",
        createTitle: "Profile Editor Gen 8",
        editTitle: "Profile Editor Gen 8",
        confirmDelete: "Are you sure you wish to delete this profile?",
        confirmClear: "Are you sure you wish to clear all Gen 8 profiles?",
        empty: "No Gen 8 profile saved.",
        loading: "Loading profiles",
        storageIndexedDb: "IndexedDB",
        storageLocal: "localStorage fallback",
        selected: "Selected",
        enterProfileName: "Enter a profile name",
        noProfileSelected: "No profile selected",
        pleaseSelectProfile: "Please select a profile",
        yes: "Yes",
        no: "No",
      };
  return {
    title: translated(t, "gen8Profiles.title", fallback.title),
    profileName: translated(
      t,
      "gen8Profiles.profileName",
      fallback.profileName,
    ),
    version: translated(t, "gen8Profiles.version", fallback.version),
    tid: translated(t, "gen8Profiles.tid", fallback.tid),
    sid: translated(t, "gen8Profiles.sid", fallback.sid),
    nationalDex: translated(
      t,
      "gen8Profiles.nationalDex",
      fallback.nationalDex,
    ),
    shinyCharm: translated(t, "gen8Profiles.shinyCharm", fallback.shinyCharm),
    ovalCharm: translated(t, "gen8Profiles.ovalCharm", fallback.ovalCharm),
    options: translated(t, "gen8Profiles.options", fallback.options),
    newProfile: translated(t, "gen8Profiles.actions.new", fallback.newProfile),
    edit: translated(t, "gen8Profiles.actions.edit", fallback.edit),
    duplicate: translated(
      t,
      "gen8Profiles.actions.duplicate",
      fallback.duplicate,
    ),
    moveUp: translated(t, "gen8Profiles.actions.moveUp", fallback.moveUp),
    moveDown: translated(t, "gen8Profiles.actions.moveDown", fallback.moveDown),
    delete: translated(t, "gen8Profiles.actions.delete", fallback.delete),
    clear: translated(t, "gen8Profiles.actions.clear", fallback.clear),
    import: translated(t, "gen8Profiles.actions.import", fallback.import),
    export: translated(t, "gen8Profiles.actions.export", fallback.export),
    save: translated(t, "gen8Profiles.actions.save", fallback.save),
    cancel: translated(t, "gen8Profiles.actions.cancel", fallback.cancel),
    close: translated(t, "gen8Profiles.actions.close", fallback.close),
    createTitle: translated(
      t,
      "gen8Profiles.editor.createTitle",
      fallback.createTitle,
    ),
    editTitle: translated(
      t,
      "gen8Profiles.editor.editTitle",
      fallback.editTitle,
    ),
    confirmDelete: translated(
      t,
      "gen8Profiles.confirmDelete",
      fallback.confirmDelete,
    ),
    confirmClear: translated(
      t,
      "gen8Profiles.confirmClear",
      fallback.confirmClear,
    ),
    empty: translated(t, "gen8Profiles.empty", fallback.empty),
    loading: translated(t, "gen8Profiles.loading", fallback.loading),
    storageIndexedDb: translated(
      t,
      "gen8Profiles.storage.indexedDb",
      fallback.storageIndexedDb,
    ),
    storageLocal: translated(
      t,
      "gen8Profiles.storage.local",
      fallback.storageLocal,
    ),
    selected: translated(t, "gen8Profiles.selected", fallback.selected),
    enterProfileName: translated(
      t,
      "gen8Profiles.enterProfileName",
      fallback.enterProfileName,
    ),
    noProfileSelected: translated(
      t,
      "gen8Profiles.noProfileSelected",
      fallback.noProfileSelected,
    ),
    pleaseSelectProfile: translated(
      t,
      "gen8Profiles.pleaseSelectProfile",
      fallback.pleaseSelectProfile,
    ),
    yes: translated(t, "common.yes", fallback.yes),
    no: translated(t, "common.no", fallback.no),
    versions: {
      sword: translated(
        t,
        "gen8Profiles.versions.sword",
        chinese ? "剑" : "Sword",
      ),
      shield: translated(
        t,
        "gen8Profiles.versions.shield",
        chinese ? "盾" : "Shield",
      ),
      brilliantdiamond: translated(
        t,
        "gen8Profiles.versions.brilliantDiamond",
        chinese ? "晶灿钻石" : "Brilliant Diamond",
      ),
      shiningpearl: translated(
        t,
        "gen8Profiles.versions.shiningPearl",
        chinese ? "明亮珍珠" : "Shining Pearl",
      ),
    },
  };
}

function decimalInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 5);
  if (!digits) return "";
  return String(Math.min(0xffff, Number(digits)));
}

interface ProfileEditorProps {
  labels: Labels;
  original?: Gen8Profile;
  busy: boolean;
  onCancel(): void;
  onSave(draft: Gen8ProfileDraft): Promise<void>;
}

function ProfileEditor({
  labels,
  original,
  busy,
  onCancel,
  onSave,
}: ProfileEditorProps) {
  const [draft, setDraft] = useState<Gen8ProfileDraft>(() =>
    original
      ? {
          name: original.name,
          version: original.version,
          tid: original.tid,
          sid: original.sid,
          nationalDex: original.nationalDex,
          shinyCharm: original.shinyCharm,
          ovalCharm: original.ovalCharm,
        }
      : { ...DEFAULT_GEN8_PROFILE_DRAFT },
  );
  const [tid, setTid] = useState(original ? String(original.tid) : "");
  const [sid, setSid] = useState(original ? String(original.sid) : "");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLFormElement>(null);
  const busyRef = useRef(busy);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    }, 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busyRef.current) onCancelRef.current();
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
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const update = <K extends keyof Gen8ProfileDraft>(
    key: K,
    value: Gen8ProfileDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const next = {
        ...draft,
        tid: Number(tid || "0"),
        sid: Number(sid || "0"),
      };
      if (!next.name.trim()) {
        setError(labels.enterProfileName);
        return;
      }
      validateGen8ProfileDraft(next);
      setError("");
      await onSave(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <div
      className="gen8profiles-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <form
        aria-busy={busy}
        aria-labelledby="gen8profiles-dialog-title"
        aria-modal="true"
        className="gen8profiles-dialog"
        onSubmit={submit}
        ref={dialogRef}
        role="dialog"
      >
        <div className="gen8profiles-dialog-heading">
          <h2 id="gen8profiles-dialog-title">
            {original ? labels.editTitle : labels.createTitle}
          </h2>
          <button
            aria-label={labels.close}
            className="gen8profiles-icon-button"
            disabled={busy}
            onClick={onCancel}
            title={labels.close}
            type="button"
          >
            <X aria-hidden="true" size={19} strokeWidth={2} />
          </button>
        </div>
        <div className="gen8profiles-form-grid">
          <label className="gen8profiles-field gen8profiles-span-2">
            <span>{labels.profileName}</span>
            <input
              aria-invalid={Boolean(error) && !draft.name.trim()}
              disabled={busy}
              onChange={(event) => update("name", event.target.value)}
              value={draft.name}
            />
          </label>
          <label className="gen8profiles-field gen8profiles-span-2">
            <span>{labels.version}</span>
            <select
              disabled={busy}
              onChange={(event) =>
                update("version", event.target.value as Gen8GameVersion)
              }
              value={draft.version}
            >
              {GEN8_GAME_VERSIONS.map((version) => (
                <option key={version} value={version}>
                  {labels.versions[version]}
                </option>
              ))}
            </select>
          </label>
          <label className="gen8profiles-field">
            <span>{labels.tid}</span>
            <input
              disabled={busy}
              inputMode="numeric"
              maxLength={5}
              onChange={(event) => setTid(decimalInput(event.target.value))}
              value={tid}
            />
          </label>
          <label className="gen8profiles-field">
            <span>{labels.sid}</span>
            <input
              disabled={busy}
              inputMode="numeric"
              maxLength={5}
              onChange={(event) => setSid(decimalInput(event.target.value))}
              value={sid}
            />
          </label>
        </div>
        <fieldset className="gen8profiles-options" disabled={busy}>
          <legend>{labels.options}</legend>
          <div className="gen8profiles-check-grid">
            {(
              [
                ["nationalDex", labels.nationalDex],
                ["shinyCharm", labels.shinyCharm],
                ["ovalCharm", labels.ovalCharm],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  checked={draft[key]}
                  onChange={(event) => update(key, event.target.checked)}
                  type="checkbox"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <div className="gen8profiles-alert error" role="alert">
            {error}
          </div>
        )}
        <div className="gen8profiles-dialog-actions">
          <button
            className="gen8profiles-secondary-button"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            {labels.cancel}
          </button>
          <button
            className="gen8profiles-primary-button"
            disabled={busy}
            type="submit"
          >
            {busy ? (
              <LoaderCircle
                aria-hidden="true"
                className="gen8profiles-spin"
                size={18}
              />
            ) : (
              <Save aria-hidden="true" size={18} />
            )}
            <span>{labels.save}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

interface ToolbarProps {
  controller: Gen8ProfilesController;
  labels: Labels;
  onEdit(profile?: Gen8Profile): void;
  onImport(event: ChangeEvent<HTMLInputElement>): void;
  onExport(): void;
}

function Toolbar({
  controller,
  labels,
  onEdit,
  onImport,
  onExport,
}: ToolbarProps) {
  const locked = controller.loading || controller.busy;
  const selectedIndex = controller.profiles.findIndex(
    (profile) => profile.id === controller.selectedProfileId,
  );
  const persist = (operation: Promise<void>) => {
    void operation.catch(() => undefined);
  };
  const requireSelectedProfile = () => {
    if (controller.selectedProfile) return controller.selectedProfile;
    window.alert(
      `${labels.noProfileSelected}\n\n${labels.pleaseSelectProfile}`,
    );
    return undefined;
  };
  return (
    <div className="gen8profiles-toolbar">
      <div className="gen8profiles-toolbar-summary">
        <Database aria-hidden="true" size={18} />
        <span>
          {controller.storageMode === "indexeddb"
            ? labels.storageIndexedDb
            : labels.storageLocal}
        </span>
        <strong>{controller.profiles.length}</strong>
      </div>
      <div className="gen8profiles-toolbar-actions">
        <button
          className="gen8profiles-primary-button"
          disabled={locked}
          onClick={() => onEdit()}
          type="button"
        >
          <Plus aria-hidden="true" size={18} />
          <span>{labels.newProfile}</span>
        </button>
        <button
          className="gen8profiles-secondary-button"
          disabled={locked}
          onClick={() => {
            const profile = requireSelectedProfile();
            if (profile) onEdit(profile);
          }}
          type="button"
        >
          <Pencil aria-hidden="true" size={17} />
          <span>{labels.edit}</span>
        </button>
        <button
          className="gen8profiles-secondary-button"
          disabled={locked}
          onClick={() => {
            const profile = requireSelectedProfile();
            if (profile) persist(controller.duplicateProfile(profile));
          }}
          type="button"
        >
          <Copy aria-hidden="true" size={17} />
          <span>{labels.duplicate}</span>
        </button>
        <div className="gen8profiles-order-actions">
          <button
            aria-label={labels.moveUp}
            className="gen8profiles-icon-button"
            disabled={locked || selectedIndex <= 0}
            onClick={() => {
              if (controller.selectedProfile)
                persist(
                  controller.moveProfile(controller.selectedProfile.id, -1),
                );
            }}
            title={labels.moveUp}
            type="button"
          >
            <ArrowUp aria-hidden="true" size={18} />
          </button>
          <button
            aria-label={labels.moveDown}
            className="gen8profiles-icon-button"
            disabled={
              locked ||
              selectedIndex < 0 ||
              selectedIndex >= controller.profiles.length - 1
            }
            onClick={() => {
              if (controller.selectedProfile)
                persist(
                  controller.moveProfile(controller.selectedProfile.id, 1),
                );
            }}
            title={labels.moveDown}
            type="button"
          >
            <ArrowDown aria-hidden="true" size={18} />
          </button>
        </div>
        <label
          aria-disabled={locked}
          className="gen8profiles-secondary-button gen8profiles-file-button"
        >
          <FileUp aria-hidden="true" size={17} />
          <span>{labels.import}</span>
          <input
            accept="application/json,.json"
            disabled={locked}
            onChange={onImport}
            type="file"
          />
        </label>
        <button
          className="gen8profiles-secondary-button"
          disabled={locked || controller.profiles.length === 0}
          onClick={onExport}
          type="button"
        >
          <Download aria-hidden="true" size={17} />
          <span>{labels.export}</span>
        </button>
        <button
          className="gen8profiles-danger-button"
          disabled={locked}
          onClick={() => {
            const profile = requireSelectedProfile();
            if (profile && window.confirm(labels.confirmDelete))
              persist(controller.deleteProfile(profile));
          }}
          type="button"
        >
          <Trash2 aria-hidden="true" size={17} />
          <span>{labels.delete}</span>
        </button>
        <button
          className="gen8profiles-danger-button"
          disabled={locked || controller.profiles.length === 0}
          onClick={() => {
            if (window.confirm(labels.confirmClear))
              persist(controller.clearProfiles());
          }}
          type="button"
        >
          <Eraser aria-hidden="true" size={17} />
          <span>{labels.clear}</span>
        </button>
      </div>
    </div>
  );
}

function BooleanValue({ labels, value }: { labels: Labels; value: boolean }) {
  return value ? (
    <span className="gen8profiles-boolean yes">
      <Check aria-hidden="true" size={16} />
      {labels.yes}
    </span>
  ) : (
    <span className="gen8profiles-boolean">{labels.no}</span>
  );
}

interface ProfileRowsProps {
  controller: Gen8ProfilesController;
  labels: Labels;
  draggedId?: string;
  setDraggedId(value?: string): void;
  onEdit(profile: Gen8Profile): void;
}

function ProfileRows({
  controller,
  labels,
  draggedId,
  setDraggedId,
  onEdit,
}: ProfileRowsProps) {
  const persist = (operation: Promise<void>) => {
    void operation.catch(() => undefined);
  };
  const selectByKeyboard = (
    event: ReactKeyboardEvent<HTMLTableRowElement>,
    profile: Gen8Profile,
    index: number,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      persist(controller.selectProfile(profile.id));
      return;
    }
    let nextIndex: number | undefined;
    if (event.key === "ArrowUp") nextIndex = Math.max(0, index - 1);
    else if (event.key === "ArrowDown")
      nextIndex = Math.min(controller.profiles.length - 1, index + 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = controller.profiles.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    const next = controller.profiles[nextIndex];
    persist(controller.selectProfile(next.id));
    const nextRow = event.currentTarget.parentElement?.children[nextIndex];
    if (nextRow instanceof HTMLTableRowElement) nextRow.focus();
  };
  return (
    <>
      {controller.profiles.map((profile, index) => {
        const selected = profile.id === controller.selectedProfileId;
        return (
          <tr
            aria-selected={selected}
            className={selected ? "selected" : ""}
            data-profile-id={profile.id}
            draggable={!controller.busy}
            key={profile.id}
            onClick={() => persist(controller.selectProfile(profile.id))}
            onDoubleClick={() => onEdit(profile)}
            onDragEnd={() => setDraggedId(undefined)}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDraggedId(profile.id)}
            onDrop={() => {
              if (draggedId && draggedId !== profile.id)
                persist(controller.reorderProfile(draggedId, profile.id));
              setDraggedId(undefined);
            }}
            onKeyDown={(event) => selectByKeyboard(event, profile, index)}
            tabIndex={
              selected || (controller.selectedProfileId === null && index === 0)
                ? 0
                : -1
            }
          >
            <td>
              <span className="gen8profiles-profile-cell">
                <GripVertical aria-hidden="true" size={18} />
                <span>{profile.name}</span>
              </span>
            </td>
            <td>{labels.versions[profile.version]}</td>
            <td>{profile.tid}</td>
            <td>{profile.sid}</td>
            <td>
              <BooleanValue labels={labels} value={profile.shinyCharm} />
            </td>
            <td>
              <BooleanValue labels={labels} value={profile.ovalCharm} />
            </td>
          </tr>
        );
      })}
    </>
  );
}

function MobileProfiles({
  controller,
  labels,
  onEdit,
}: Pick<ProfileRowsProps, "controller" | "labels" | "onEdit">) {
  const persist = (operation: Promise<void>) => {
    void operation.catch(() => undefined);
  };
  return (
    <div className="gen8profiles-mobile-list">
      {controller.profiles.map((profile) => {
        const selected = profile.id === controller.selectedProfileId;
        return (
          <button
            aria-pressed={selected}
            className={`gen8profiles-mobile-profile${selected ? " selected" : ""}`}
            key={profile.id}
            onClick={() => persist(controller.selectProfile(profile.id))}
            onDoubleClick={() => onEdit(profile)}
            type="button"
          >
            <span className="gen8profiles-mobile-heading">
              <strong>{profile.name}</strong>
              <span>{labels.versions[profile.version]}</span>
            </span>
            <span className="gen8profiles-mobile-values">
              <span>
                <small>{labels.tid}</small>
                {profile.tid}
              </span>
              <span>
                <small>{labels.sid}</small>
                {profile.sid}
              </span>
              <span>
                <small>{labels.shinyCharm}</small>
                {profile.shinyCharm ? labels.yes : labels.no}
              </span>
              <span>
                <small>{labels.ovalCharm}</small>
                {profile.ovalCharm ? labels.yes : labels.no}
              </span>
            </span>
            {selected && (
              <span className="gen8profiles-selected-label">
                <Check aria-hidden="true" size={16} />
                {labels.selected}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Gen8ProfilesPanel() {
  const { i18n, t } = useTranslation();
  const labels = useMemo(
    () => getLabels(t, i18n.language.startsWith("zh")),
    [i18n.language, t],
  );
  const controller = useGen8Profiles();
  const [editor, setEditor] = useState<{ original?: Gen8Profile }>();
  const [draggedId, setDraggedId] = useState<string>();
  const [importError, setImportError] = useState("");

  const save = async (draft: Gen8ProfileDraft) => {
    if (editor?.original)
      await controller.updateProfile(editor.original, draft);
    else await controller.createProfile(draft);
    setEditor(undefined);
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImportError("");
      await controller.importBackup(await file.text());
    } catch (cause) {
      setImportError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      event.target.value = "";
    }
  };

  const exportBackup = () => {
    const blob = new Blob(
      [serializeGen8ProfileBackup(controller.exportState())],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen8-profiles.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gen8profiles-panel">
      <header className="gen8profiles-header">
        <div>
          <span className="gen8profiles-generation">Gen 8</span>
          <h2>{labels.title}</h2>
        </div>
      </header>
      <section className="gen8profiles-manager">
        <Toolbar
          controller={controller}
          labels={labels}
          onEdit={(profile) => setEditor({ original: profile })}
          onExport={exportBackup}
          onImport={importBackup}
        />
        {(controller.error || importError) && (
          <div className="gen8profiles-alert error" role="alert">
            {controller.error || importError}
          </div>
        )}
        {controller.loading ? (
          <div className="gen8profiles-empty" role="status">
            <LoaderCircle
              aria-hidden="true"
              className="gen8profiles-spin"
              size={22}
            />
            <span>{labels.loading}</span>
          </div>
        ) : controller.profiles.length === 0 ? (
          <div className="gen8profiles-empty">
            <span>{labels.empty}</span>
          </div>
        ) : (
          <>
            <div className="gen8profiles-table-shell">
              <table
                aria-label={labels.title}
                className="gen8profiles-table"
                role="grid"
              >
                <thead>
                  <tr>
                    <th>{labels.profileName}</th>
                    <th>{labels.version}</th>
                    <th>{labels.tid}</th>
                    <th>{labels.sid}</th>
                    <th>{labels.shinyCharm}</th>
                    <th>{labels.ovalCharm}</th>
                  </tr>
                </thead>
                <tbody>
                  <ProfileRows
                    controller={controller}
                    draggedId={draggedId}
                    labels={labels}
                    onEdit={(profile) => setEditor({ original: profile })}
                    setDraggedId={setDraggedId}
                  />
                </tbody>
              </table>
            </div>
            <MobileProfiles
              controller={controller}
              labels={labels}
              onEdit={(profile) => setEditor({ original: profile })}
            />
          </>
        )}
      </section>
      {editor && (
        <ProfileEditor
          busy={controller.busy}
          labels={labels}
          onCancel={() => setEditor(undefined)}
          onSave={save}
          original={editor.original}
        />
      )}
    </div>
  );
}
