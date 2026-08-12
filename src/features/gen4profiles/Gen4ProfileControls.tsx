import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput } from "../../input";
import type { Gen4GameVersion } from "../gen4static/domain";
import {
  DEFAULT_GEN4_PROFILE,
  EMPTY_GEN4_UNOWN_DISCOVERED,
  EMPTY_GEN4_UNOWN_PUZZLES,
  GEN4_GAME_VERSIONS,
  isHgssVersion,
  serializeGen4ProfileBackup,
  type Gen4Profile,
  type Gen4ProfileDraft,
  type Gen4UnownDiscovered,
  type Gen4UnownPuzzles,
} from "./domain";
import type { Gen4ProfilesController } from "./useGen4Profiles";

const versionKeys: Record<Gen4GameVersion, string> = {
  diamond: "gameDiamond",
  pearl: "gamePearl",
  platinum: "gamePlatinum",
  heartgold: "gameHeartGold",
  soulsilver: "gameSoulSilver",
};

const unownLetters = Array.from({ length: 26 }, (_, index) =>
  String.fromCharCode(65 + index),
);
const unownPuzzleLabels = ["A-J", "R-V", "K-Q", "W-Z"];

interface ProfileEditorProps {
  original?: Gen4Profile;
  onCancel(): void;
  onSave(draft: Gen4ProfileDraft): Promise<void>;
}

function ProfileEditor({ original, onCancel, onSave }: ProfileEditorProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(original?.name ?? "");
  const [version, setVersion] = useState<Gen4GameVersion>(
    original?.version ?? "diamond",
  );
  const [tid, setTid] = useState(String(original?.tid ?? 12345));
  const [sid, setSid] = useState(String(original?.sid ?? 54321));
  const [nationalDex, setNationalDex] = useState(
    original?.nationalDex ?? false,
  );
  const [unownDiscovered, setUnownDiscovered] = useState<Gen4UnownDiscovered>(
    original ? [...original.unownDiscovered] : [...EMPTY_GEN4_UNOWN_DISCOVERED],
  );
  const [unownPuzzles, setUnownPuzzles] = useState<Gen4UnownPuzzles>(
    original ? [...original.unownPuzzles] : [...EMPTY_GEN4_UNOWN_PUZZLES],
  );
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const numericTid = Number(tid);
    const numericSid = Number(sid);
    if (!name.trim()) {
      setError(t("enterProfileName"));
      return;
    }
    if (
      !Number.isInteger(numericTid) ||
      numericTid < 0 ||
      numericTid > 0xffff ||
      !Number.isInteger(numericSid) ||
      numericSid < 0 ||
      numericSid > 0xffff
    ) {
      setError(t("invalidProfileIds"));
      return;
    }
    await onSave({
      name,
      version,
      tid: numericTid,
      sid: numericSid,
      nationalDex,
      unownDiscovered,
      unownPuzzles,
    });
  };

  const updateUnown = (index: number, checked: boolean) => {
    setUnownDiscovered(
      (current) =>
        current.map((value, entry) =>
          entry === index ? checked : value,
        ) as Gen4UnownDiscovered,
    );
  };

  const updatePuzzle = (index: number, checked: boolean) => {
    setUnownPuzzles(
      (current) =>
        current.map((value, entry) =>
          entry === index ? checked : value,
        ) as Gen4UnownPuzzles,
    );
  };

  return (
    <div className="modal-backdrop">
      <form
        aria-labelledby="gen4-profile-editor-title"
        className="profile-modal profile-editor gen4-profile-editor"
        onSubmit={submit}
        role="dialog"
      >
        <div className="modal-heading">
          <h2 id="gen4-profile-editor-title">{t("profileEditor4")}</h2>
        </div>
        <label className="field">
          <span>{t("profileName")}</span>
          <input
            autoFocus
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>
        <label className="field">
          <span>{t("profileVersion")}</span>
          <select
            onChange={(event) =>
              setVersion(event.target.value as Gen4GameVersion)
            }
            value={version}
          >
            {GEN4_GAME_VERSIONS.map((entry) => (
              <option key={entry} value={entry}>
                {t(versionKeys[entry])}
              </option>
            ))}
          </select>
        </label>
        <div className="advance-row">
          <label className="field">
            <span>{t("tid")}</span>
            <input
              inputMode="numeric"
              maxLength={5}
              onChange={(event) =>
                setTid(normalizeDecimalInput(event.target.value, 0xffff))
              }
              value={tid}
            />
          </label>
          <label className="field">
            <span>{t("sid")}</span>
            <input
              inputMode="numeric"
              maxLength={5}
              onChange={(event) =>
                setSid(normalizeDecimalInput(event.target.value, 0xffff))
              }
              value={sid}
            />
          </label>
        </div>
        <label className="toggle-field">
          <input
            checked={nationalDex}
            onChange={(event) => setNationalDex(event.target.checked)}
            type="checkbox"
          />
          <span>{t("nationalDex")}</span>
        </label>
        {isHgssVersion(version) && (
          <>
            <fieldset className="gen4-profile-checklist">
              <legend>{t("unownPuzzles")}</legend>
              <div className="gen4-unown-puzzle-grid">
                {unownPuzzleLabels.map((label, index) => (
                  <label key={label}>
                    <input
                      checked={unownPuzzles[index]}
                      onChange={(event) =>
                        updatePuzzle(index, event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="gen4-profile-checklist">
              <legend>{t("unownDiscovered")}</legend>
              <div className="gen4-unown-letter-grid">
                {unownLetters.map((letter, index) => (
                  <label key={letter}>
                    <input
                      checked={unownDiscovered[index]}
                      onChange={(event) =>
                        updateUnown(index, event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>{letter}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}
        {error && <div className="error-message">{error}</div>}
        <div className="modal-actions">
          <button className="secondary-action" onClick={onCancel} type="button">
            {t("cancel")}
          </button>
          <button className="primary-action" type="submit">
            {t("okay")}
          </button>
        </div>
      </form>
    </div>
  );
}

interface ProfileManagerProps {
  controller: Gen4ProfilesController;
  onClose(): void;
}

function ProfileManager({ controller, onClose }: ProfileManagerProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Gen4Profile | "new">();
  const [selectedId, setSelectedId] = useState<string>();
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = controller.profiles.find(
    (profile) => profile.id === selectedId,
  );

  const requireSelected = () => {
    if (selected) return selected;
    setNotice(t("pleaseSelectProfile"));
    return undefined;
  };

  const exportBackup = () => {
    const blob = new Blob(
      [serializeGen4ProfileBackup(controller.exportState())],
      { type: "application/json;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen4-profiles.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const count = await controller.importBackup(await file.text());
      setNotice(t("profilesImported", { count }));
    } catch {
      setNotice(t("invalidProfileBackup"));
    }
  };

  return (
    <div className="modal-backdrop">
      <section
        aria-labelledby="gen4-profile-manager-title"
        className="profile-modal profile-manager"
        role="dialog"
      >
        <div className="modal-heading">
          <h2 id="gen4-profile-manager-title">{t("profileManager4")}</h2>
          <span>{t(`storage_${controller.storageMode}`)}</span>
        </div>
        <div className="profile-table-wrap">
          <table className="profile-table">
            <thead>
              <tr>
                <th>{t("profileName")}</th>
                <th>{t("profileVersion")}</th>
                <th>{t("tid")}</th>
                <th>{t("sid")}</th>
                <th>{t("nationalDex")}</th>
              </tr>
            </thead>
            <tbody>
              {controller.profiles.map((profile) => (
                <tr
                  className={selectedId === profile.id ? "selected" : ""}
                  key={profile.id}
                  onClick={() => setSelectedId(profile.id)}
                >
                  <td>{profile.name}</td>
                  <td>{t(versionKeys[profile.version])}</td>
                  <td>{profile.tid}</td>
                  <td>{profile.sid}</td>
                  <td>{t(profile.nationalDex ? "yes" : "no")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {controller.profiles.length === 0 && (
            <div className="empty-state compact">{t("noProfiles")}</div>
          )}
        </div>
        {notice && <div className="profile-notice">{notice}</div>}
        {controller.error && (
          <div className="error-message">{controller.error}</div>
        )}
        <div className="profile-actions">
          <button onClick={() => setEditing("new")} type="button">
            {t("newProfile")}
          </button>
          <button
            onClick={() => {
              const profile = requireSelected();
              if (profile) setEditing(profile);
            }}
            type="button"
          >
            {t("editProfile")}
          </button>
          <button
            onClick={() => {
              const profile = requireSelected();
              if (profile) void controller.duplicateProfile(profile);
            }}
            type="button"
          >
            {t("duplicateProfile")}
          </button>
          <button
            onClick={() => {
              const profile = requireSelected();
              if (profile && window.confirm(t("confirmDeleteProfile"))) {
                void controller.deleteProfile(profile);
                setSelectedId(undefined);
              }
            }}
            type="button"
          >
            {t("deleteProfile")}
          </button>
          <button onClick={() => fileInput.current?.click()} type="button">
            {t("importProfiles")}
          </button>
          <button onClick={exportBackup} type="button">
            {t("exportProfiles")}
          </button>
          <button
            className="danger-action"
            disabled={controller.profiles.length === 0}
            onClick={() => {
              if (window.confirm(t("confirmClearGen4Profiles"))) {
                void controller.clearProfiles().then(() => {
                  setSelectedId(undefined);
                  setNotice(t("gen4ProfilesCleared"));
                });
              }
            }}
            type="button"
          >
            {t("clearProfiles")}
          </button>
          <input
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(event) => void importBackup(event)}
            ref={fileInput}
            type="file"
          />
          <button className="primary-action" onClick={onClose} type="button">
            {t("done")}
          </button>
        </div>
      </section>
      {editing && (
        <ProfileEditor
          onCancel={() => setEditing(undefined)}
          onSave={async (draft) => {
            if (editing === "new") await controller.createProfile(draft);
            else await controller.updateProfile(editing, draft);
            setEditing(undefined);
          }}
          original={editing === "new" ? undefined : editing}
        />
      )}
    </div>
  );
}

interface Gen4ProfileControlsProps {
  controller: Gen4ProfilesController;
  expanded: boolean;
  onExpandedChange(expanded: boolean): void;
}

export function Gen4ProfileControls({
  controller,
  expanded,
  onExpandedChange,
}: Gen4ProfileControlsProps) {
  const { t } = useTranslation();
  const [managerOpen, setManagerOpen] = useState(false);
  const selected = controller.selectedProfile ?? DEFAULT_GEN4_PROFILE;

  return (
    <>
      <aside
        aria-label={t("profile")}
        className={`profile-display gen4-profile-display${
          expanded ? "" : " collapsed"
        }`}
      >
        <button
          aria-controls="gen4-profile-float-body"
          aria-expanded={expanded}
          aria-label={t(expanded ? "collapse" : "expand")}
          className="profile-float-heading"
          onClick={() => onExpandedChange(!expanded)}
          title={t(expanded ? "collapse" : "expand")}
          type="button"
        >
          <div className="profile-float-title">
            <strong>{t("profile")}</strong>
            <span title={selected.name}>{selected.name}</span>
          </div>
          <span aria-hidden="true" className="floating-tool-trigger-icon">
            {expanded ? "×" : "+"}
          </span>
        </button>
        {expanded && (
          <div className="profile-float-body" id="gen4-profile-float-body">
            <label>
              <span>{t("profile")}</span>
              <select
                disabled={controller.loading}
                onChange={(event) =>
                  void controller.selectProfile(
                    event.target.value === DEFAULT_GEN4_PROFILE.id
                      ? null
                      : event.target.value,
                  )
                }
                value={selected.id}
              >
                <option value={DEFAULT_GEN4_PROFILE.id}>-</option>
                {controller.profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
            <dl>
              <div>
                <dt>{t("tid")}</dt>
                <dd>{selected.tid}</dd>
              </div>
              <div>
                <dt>{t("sid")}</dt>
                <dd>{selected.sid}</dd>
              </div>
              <div>
                <dt>{t("game")}</dt>
                <dd>{t(versionKeys[selected.version])}</dd>
              </div>
              <div>
                <dt>{t("nationalDex")}</dt>
                <dd>{t(selected.nationalDex ? "yes" : "no")}</dd>
              </div>
            </dl>
            <button onClick={() => setManagerOpen(true)} type="button">
              {t("manager")}
            </button>
          </div>
        )}
      </aside>
      {managerOpen && (
        <ProfileManager
          controller={controller}
          onClose={() => setManagerOpen(false)}
        />
      )}
    </>
  );
}
