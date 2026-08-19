import {
  ArrowDown,
  ArrowUp,
  Check,
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
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_THREE_DS_PROFILE_DRAFT,
  formatThreeDsProfileSeed,
  formatThreeDsProfileSeeds,
  serializeThreeDsProfileBackup,
  THREE_DS_GAME_VERSIONS,
  threeDsProfileUsesFourSeeds,
  validateThreeDsProfileDraft,
  type ThreeDsGameVersion,
  type ThreeDsProfile,
  type ThreeDsProfileDraft,
  type ThreeDsProfileSeeds,
} from "./domain";
import type { ThreeDsProfilesController } from "./useThreeDsProfiles";
import "./ThreeDsProfilesPanel.css";

function normalizeDecimal(value: string, maximum: number, digits: number) {
  const normalized = value.replace(/\D/g, "").slice(0, digits);
  return normalized ? String(Math.min(maximum, Number(normalized))) : "";
}

function normalizeHex(value: string, digits: number) {
  return value
    .replace(/[^0-9a-f]/gi, "")
    .toUpperCase()
    .slice(0, digits);
}

function parseHex(value: string) {
  return Number.parseInt(value || "0", 16);
}

interface ProfileEditorProps {
  original?: ThreeDsProfile;
  busy: boolean;
  onCancel(): void;
  onSave(draft: ThreeDsProfileDraft): Promise<void>;
}

function ProfileEditor({
  original,
  busy,
  onCancel,
  onSave,
}: ProfileEditorProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ThreeDsProfileDraft>(() =>
    original
      ? {
          name: original.name,
          version: original.version,
          tsv: original.tsv,
          trv: original.trv,
          shinyCharm: original.shinyCharm,
          saveVariable: original.saveVariable,
          timeVariable: original.timeVariable,
          seeds: [...original.seeds] as ThreeDsProfileSeeds,
        }
      : {
          ...DEFAULT_THREE_DS_PROFILE_DRAFT,
          seeds: [...DEFAULT_THREE_DS_PROFILE_DRAFT.seeds],
        },
  );
  const [tsvText, setTsvText] = useState(original ? String(original.tsv) : "0");
  const [trvText, setTrvText] = useState(
    original ? original.trv.toString(16).toUpperCase() : "0",
  );
  const [saveVariableText, setSaveVariableText] = useState(
    original ? formatThreeDsProfileSeed(original.saveVariable) : "00000000",
  );
  const [timeVariableText, setTimeVariableText] = useState(
    original ? formatThreeDsProfileSeed(original.timeVariable) : "00000000",
  );
  const [seedTexts, setSeedTexts] = useState<[string, string, string, string]>(
    () =>
      original
        ? (original.seeds.map(formatThreeDsProfileSeed) as [
            string,
            string,
            string,
            string,
          ])
        : ["00000000", "00000000", "00000000", "00000000"],
  );
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

  const setSeedText = (index: number, value: string) => {
    setSeedTexts((current) => {
      const next = [...current] as [string, string, string, string];
      next[index] = normalizeHex(value, 8);
      return next;
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const next: ThreeDsProfileDraft = {
        ...draft,
        tsv: Number(tsvText || "0"),
        trv: parseHex(trvText),
        saveVariable: parseHex(saveVariableText),
        timeVariable: parseHex(timeVariableText),
        seeds: seedTexts.map(parseHex) as ThreeDsProfileSeeds,
      };
      if (!next.name.trim()) {
        setError(String(t("threeDsProfilesEnterName")));
        return;
      }
      validateThreeDsProfileDraft(next);
      setError("");
      await onSave(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <div
      className="threedsprofiles-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <form
        aria-busy={busy}
        aria-labelledby="threedsprofiles-dialog-title"
        aria-modal="true"
        className="threedsprofiles-dialog"
        onSubmit={submit}
        ref={dialogRef}
        role="dialog"
      >
        <div className="threedsprofiles-dialog-heading">
          <h2 id="threedsprofiles-dialog-title">
            {t("threeDsProfilesEditorTitle")}
          </h2>
          <button
            aria-label={String(t("threeDsProfilesCancel"))}
            className="threedsprofiles-icon-button"
            disabled={busy}
            onClick={onCancel}
            title={String(t("threeDsProfilesCancel"))}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>
        <div className="threedsprofiles-form-grid">
          <label className="threedsprofiles-field threedsprofiles-span-2">
            <span>{t("threeDsProfilesDescription")}</span>
            <input
              aria-invalid={Boolean(error) && !draft.name.trim()}
              disabled={busy}
              maxLength={32767}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              value={draft.name}
            />
          </label>
          <label className="threedsprofiles-field threedsprofiles-span-2">
            <span>{t("threeDsProfilesGameVersion")}</span>
            <select
              disabled={busy}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  version: event.target.value as ThreeDsGameVersion,
                }))
              }
              value={draft.version}
            >
              {THREE_DS_GAME_VERSIONS.map((version) => (
                <option key={version} value={version}>
                  {t(`threeDsProfilesVersion_${version}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="threedsprofiles-field">
            <span>TSV</span>
            <input
              disabled={busy}
              inputMode="numeric"
              max={4095}
              min={0}
              onChange={(event) =>
                setTsvText(normalizeDecimal(event.target.value, 4095, 4))
              }
              value={tsvText}
            />
          </label>
          <label className="threedsprofiles-field">
            <span>TRV</span>
            <input
              disabled={busy}
              inputMode="text"
              maxLength={1}
              onChange={(event) =>
                setTrvText(normalizeHex(event.target.value, 1))
              }
              value={trvText}
            />
          </label>
          <label className="threedsprofiles-field">
            <span>{t("threeDsProfilesSaveVariable")}</span>
            <input
              disabled={busy}
              inputMode="text"
              maxLength={8}
              onChange={(event) =>
                setSaveVariableText(normalizeHex(event.target.value, 8))
              }
              value={saveVariableText}
            />
          </label>
          <label className="threedsprofiles-field">
            <span>{t("threeDsProfilesTimeVariable")}</span>
            <input
              disabled={busy}
              inputMode="text"
              maxLength={8}
              onChange={(event) =>
                setTimeVariableText(normalizeHex(event.target.value, 8))
              }
              value={timeVariableText}
            />
          </label>
        </div>
        <label className="threedsprofiles-boolean-option">
          <input
            checked={draft.shinyCharm}
            disabled={busy}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                shinyCharm: event.target.checked,
              }))
            }
            type="checkbox"
          />
          <span>{t("threeDsProfilesShinyCharm")}</span>
        </label>
        <fieldset className="threedsprofiles-seeds" disabled={busy}>
          <legend>{t("threeDsProfilesEggSeeds")}</legend>
          <div className="threedsprofiles-seed-grid">
            {[3, 2, 1, 0].map((index) => (
              <label className="threedsprofiles-field" key={index}>
                <span>[{index}]</span>
                <input
                  disabled={
                    busy ||
                    (!threeDsProfileUsesFourSeeds(draft.version) && index > 1)
                  }
                  inputMode="text"
                  maxLength={8}
                  onChange={(event) => setSeedText(index, event.target.value)}
                  value={seedTexts[index]}
                />
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <div className="threedsprofiles-alert error" role="alert">
            {error}
          </div>
        )}
        <div className="threedsprofiles-dialog-actions">
          <button
            className="threedsprofiles-secondary-button"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={18} />
            <span>{t("threeDsProfilesCancel")}</span>
          </button>
          <button
            className="threedsprofiles-primary-button"
            disabled={busy}
            type="submit"
          >
            {busy ? (
              <LoaderCircle
                aria-hidden="true"
                className="threedsprofiles-spin"
                size={18}
              />
            ) : (
              <Save aria-hidden="true" size={18} />
            )}
            <span>{t("threeDsProfilesSave")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function BooleanValue({ value }: { value: boolean }) {
  const { t } = useTranslation();
  return value ? (
    <span className="threedsprofiles-boolean yes">
      <Check aria-hidden="true" size={16} />
      {t("threeDsProfilesYes")}
    </span>
  ) : (
    <span className="threedsprofiles-boolean">{t("threeDsProfilesNo")}</span>
  );
}

interface ProfileRowsProps {
  controller: ThreeDsProfilesController;
  draggedId?: string;
  setDraggedId(value?: string): void;
  onEdit(profile: ThreeDsProfile): void;
}

function ProfileRows({
  controller,
  draggedId,
  setDraggedId,
  onEdit,
}: ProfileRowsProps) {
  const { t } = useTranslation();
  const persist = (operation: Promise<void>) => {
    void operation.catch(() => undefined);
  };
  const selectByKeyboard = (
    event: ReactKeyboardEvent<HTMLTableRowElement>,
    profile: ThreeDsProfile,
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
  return controller.profiles.map((profile, index) => {
    const selected = profile.id === controller.selectedProfileId;
    return (
      <tr
        aria-selected={selected}
        className={selected ? "selected" : ""}
        draggable={!controller.busy}
        key={profile.id}
        onClick={() => persist(controller.selectProfile(profile.id))}
        onDoubleClick={() => onEdit(profile)}
        onDragEnd={() => setDraggedId(undefined)}
        onDragOver={(event) => event.preventDefault()}
        onDragStart={() => setDraggedId(profile.id)}
        onDrop={() => {
          if (draggedId && draggedId !== profile.id) {
            persist(controller.reorderProfile(draggedId, profile.id));
          }
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
          <span className="threedsprofiles-profile-cell">
            <GripVertical aria-hidden="true" size={18} />
            <span>{profile.name}</span>
          </span>
        </td>
        <td>{t(`threeDsProfilesVersion_${profile.version}`)}</td>
        <td>{profile.tsv}</td>
        <td>{profile.trv.toString(16).toUpperCase()}</td>
        <td className="mono">
          {formatThreeDsProfileSeed(profile.saveVariable)}
        </td>
        <td className="mono">
          {formatThreeDsProfileSeed(profile.timeVariable)}
        </td>
        <td>
          <BooleanValue value={profile.shinyCharm} />
        </td>
        <td className="mono">{formatThreeDsProfileSeeds(profile)}</td>
      </tr>
    );
  });
}

function MobileProfiles({
  controller,
  onEdit,
}: Pick<ProfileRowsProps, "controller" | "onEdit">) {
  const { t } = useTranslation();
  const persist = (operation: Promise<void>) => {
    void operation.catch(() => undefined);
  };
  return (
    <div className="threedsprofiles-mobile-list">
      {controller.profiles.map((profile) => {
        const selected = profile.id === controller.selectedProfileId;
        return (
          <button
            aria-pressed={selected}
            className={`threedsprofiles-mobile-profile${selected ? " selected" : ""}`}
            key={profile.id}
            onClick={() => persist(controller.selectProfile(profile.id))}
            onDoubleClick={() => onEdit(profile)}
            type="button"
          >
            <span className="threedsprofiles-mobile-heading">
              <strong>{profile.name}</strong>
              <span>{t(`threeDsProfilesVersion_${profile.version}`)}</span>
            </span>
            <span className="threedsprofiles-mobile-values">
              <span>
                <small>TSV / TRV</small>
                {profile.tsv} / {profile.trv.toString(16).toUpperCase()}
              </span>
              <span>
                <small>{t("threeDsProfilesSaveVariable")}</small>
                <span className="mono">
                  {formatThreeDsProfileSeed(profile.saveVariable)}
                </span>
              </span>
              <span>
                <small>{t("threeDsProfilesTimeVariable")}</small>
                <span className="mono">
                  {formatThreeDsProfileSeed(profile.timeVariable)}
                </span>
              </span>
              <span>
                <small>{t("threeDsProfilesShinyCharm")}</small>
                {profile.shinyCharm
                  ? t("threeDsProfilesYes")
                  : t("threeDsProfilesNo")}
              </span>
              <span className="threedsprofiles-mobile-seeds">
                <small>{t("threeDsProfilesEggSeeds")}</small>
                {formatThreeDsProfileSeeds(profile)}
              </span>
            </span>
            {selected && (
              <span className="threedsprofiles-selected-label">
                <Check aria-hidden="true" size={16} />
                {t("threeDsProfilesSelected")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ThreeDsProfilesPanel({
  controller,
}: {
  controller: ThreeDsProfilesController;
}) {
  const { t } = useTranslation();
  const [editor, setEditor] = useState<{ original?: ThreeDsProfile }>();
  const [draggedId, setDraggedId] = useState<string>();
  const [importError, setImportError] = useState("");
  const selectedIndex = controller.profiles.findIndex(
    (profile) => profile.id === controller.selectedProfileId,
  );
  const locked = controller.loading || controller.busy;
  const persist = (operation: Promise<void>) => {
    void operation.catch(() => undefined);
  };

  const save = async (draft: ThreeDsProfileDraft) => {
    if (editor?.original) {
      await controller.updateProfile(editor.original, draft);
    } else {
      await controller.createProfile(draft);
    }
    setEditor(undefined);
  };

  const importProfiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImportError("");
      await controller.importProfiles(await file.text());
    } catch (cause) {
      setImportError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      event.target.value = "";
    }
  };

  const exportBackup = () => {
    const blob = new Blob(
      [serializeThreeDsProfileBackup(controller.exportState())],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-3dsrngtool-profiles.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const selected = controller.selectedProfile;
  return (
    <div className="threedsprofiles-panel">
      <header className="threedsprofiles-header">
        <div>
          <span className="threedsprofiles-generation">3DSRNGTool</span>
          <h2>{t("threeDsProfilesTitle")}</h2>
        </div>
      </header>
      <section className="threedsprofiles-manager">
        <div className="threedsprofiles-toolbar">
          <div className="threedsprofiles-toolbar-summary">
            <Database aria-hidden="true" size={18} />
            <span>
              {controller.storageMode === "indexeddb"
                ? "IndexedDB"
                : t("threeDsProfilesLocalStorage")}
            </span>
            <strong>{controller.profiles.length}</strong>
          </div>
          <div
            aria-label={String(t("threeDsProfilesActions"))}
            className="threedsprofiles-toolbar-actions"
            role="toolbar"
          >
            <button
              aria-label="Add"
              className="threedsprofiles-icon-button primary"
              disabled={locked}
              onClick={() => setEditor({})}
              title="Add"
              type="button"
            >
              <Plus aria-hidden="true" size={18} />
            </button>
            <button
              aria-label="Edit"
              className="threedsprofiles-icon-button"
              disabled={locked || !selected}
              onClick={() => selected && setEditor({ original: selected })}
              title="Edit"
              type="button"
            >
              <Pencil aria-hidden="true" size={17} />
            </button>
            <button
              aria-label="Remove"
              className="threedsprofiles-icon-button danger"
              disabled={locked || !selected}
              onClick={() => {
                if (
                  selected &&
                  window.confirm(String(t("threeDsProfilesConfirmDelete")))
                ) {
                  persist(controller.deleteProfile(selected));
                }
              }}
              title="Remove"
              type="button"
            >
              <Trash2 aria-hidden="true" size={17} />
            </button>
            <span
              aria-hidden="true"
              className="threedsprofiles-toolbar-divider"
            />
            <button
              aria-label="Move up"
              className="threedsprofiles-icon-button"
              disabled={locked || selectedIndex <= 0}
              onClick={() =>
                selected && persist(controller.moveProfile(selected.id, -1))
              }
              title="Move up"
              type="button"
            >
              <ArrowUp aria-hidden="true" size={18} />
            </button>
            <button
              aria-label="Move down"
              className="threedsprofiles-icon-button"
              disabled={
                locked ||
                selectedIndex < 0 ||
                selectedIndex >= controller.profiles.length - 1
              }
              onClick={() =>
                selected && persist(controller.moveProfile(selected.id, 1))
              }
              title="Move down"
              type="button"
            >
              <ArrowDown aria-hidden="true" size={18} />
            </button>
            <label
              aria-disabled={locked}
              aria-label={String(t("threeDsProfilesImport"))}
              className="threedsprofiles-icon-button threedsprofiles-file-button"
              title={String(t("threeDsProfilesImport"))}
            >
              <FileUp aria-hidden="true" size={17} />
              <input
                accept="application/json,application/xml,text/xml,.json,.xml"
                disabled={locked}
                onChange={importProfiles}
                type="file"
              />
            </label>
            <button
              aria-label={String(t("threeDsProfilesExport"))}
              className="threedsprofiles-icon-button"
              disabled={locked || controller.profiles.length === 0}
              onClick={exportBackup}
              title={String(t("threeDsProfilesExport"))}
              type="button"
            >
              <Download aria-hidden="true" size={17} />
            </button>
            <button
              aria-label={String(t("threeDsProfilesClear"))}
              className="threedsprofiles-icon-button danger"
              disabled={locked || controller.profiles.length === 0}
              onClick={() => {
                if (window.confirm(String(t("threeDsProfilesConfirmClear")))) {
                  persist(controller.clearProfiles());
                }
              }}
              title={String(t("threeDsProfilesClear"))}
              type="button"
            >
              <Eraser aria-hidden="true" size={17} />
            </button>
          </div>
        </div>
        {(controller.error || importError) && (
          <div className="threedsprofiles-alert error" role="alert">
            {controller.error || importError}
          </div>
        )}
        {controller.loading ? (
          <div className="threedsprofiles-empty" role="status">
            <LoaderCircle
              aria-hidden="true"
              className="threedsprofiles-spin"
              size={22}
            />
            <span>{t("threeDsProfilesLoading")}</span>
          </div>
        ) : controller.profiles.length === 0 ? (
          <div className="threedsprofiles-empty">
            <span>{t("threeDsProfilesEmpty")}</span>
          </div>
        ) : (
          <>
            <div className="threedsprofiles-table-shell">
              <table
                aria-label={String(t("threeDsProfilesTitle"))}
                className="threedsprofiles-table"
                role="grid"
              >
                <thead>
                  <tr>
                    <th>{t("threeDsProfilesDescription")}</th>
                    <th>Game</th>
                    <th>TSV</th>
                    <th>TRV</th>
                    <th>{t("threeDsProfilesSaveVariable")}</th>
                    <th>{t("threeDsProfilesTimeVariable")}</th>
                    <th>Shiny Charm?</th>
                    <th>Egg Seeds</th>
                  </tr>
                </thead>
                <tbody>
                  <ProfileRows
                    controller={controller}
                    draggedId={draggedId}
                    onEdit={(profile) => setEditor({ original: profile })}
                    setDraggedId={setDraggedId}
                  />
                </tbody>
              </table>
            </div>
            <MobileProfiles
              controller={controller}
              onEdit={(profile) => setEditor({ original: profile })}
            />
          </>
        )}
      </section>
      {editor && (
        <ProfileEditor
          busy={controller.busy}
          onCancel={() => setEditor(undefined)}
          onSave={save}
          original={editor.original}
        />
      )}
    </div>
  );
}
