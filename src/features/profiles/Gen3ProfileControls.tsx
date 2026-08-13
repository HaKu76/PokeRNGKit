import {
  type ChangeEvent,
  type FormEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput } from "../../input";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";
import {
  DEFAULT_GEN3_GAMECUBE_PROFILE,
  DEFAULT_GEN3_PROFILE,
  GEN3_GAME_VERSIONS,
  isGen3StaticVersion,
  isRsVersion,
  serializeGen3ProfileBackup,
  type Gen3GameVersion,
  type Gen3Profile,
  type Gen3ProfileDraft,
} from "./domain";
import type { Gen3ProfilesController } from "./useGen3Profiles";

const versionKeys: Record<Gen3GameVersion, string> = {
  ruby: "gameRuby",
  sapphire: "gameSapphire",
  firered: "gameFireRed",
  leafgreen: "gameLeafGreen",
  emerald: "gameEmerald",
  xd: "gameXd",
  colosseum: "gameColosseum",
};

interface ProfileEditorProps {
  original?: Gen3Profile;
  onCancel(): void;
  onSave(draft: Gen3ProfileDraft): Promise<void>;
}

function ProfileEditor({ original, onCancel, onSave }: ProfileEditorProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(original?.name ?? "");
  const [version, setVersion] = useState<Gen3GameVersion>(
    original?.version ?? "emerald",
  );
  const [tid, setTid] = useState(String(original?.tid ?? 12345));
  const [sid, setSid] = useState(String(original?.sid ?? 54321));
  const [deadBattery, setDeadBattery] = useState(
    original?.deadBattery ?? false,
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
      deadBattery,
    });
  };

  return (
    <div className="modal-backdrop">
      <form
        aria-labelledby="profile-editor-title"
        className="profile-modal profile-editor"
        onSubmit={submit}
        role="dialog"
      >
        <div className="modal-heading">
          <h2 id="profile-editor-title">{t("profileEditor3")}</h2>
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
            onChange={(event) => {
              const nextVersion = event.target.value as Gen3GameVersion;
              setVersion(nextVersion);
              if (!isRsVersion(nextVersion)) setDeadBattery(false);
            }}
            value={version}
          >
            {GEN3_GAME_VERSIONS.map((entry) => (
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
        {isRsVersion(version) && (
          <label className="toggle-field">
            <input
              checked={deadBattery}
              onChange={(event) => setDeadBattery(event.target.checked)}
              type="checkbox"
            />
            <span>{t("deadBattery")}</span>
          </label>
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
  controller: Gen3ProfilesController;
  onClose(): void;
}

function ProfileManager({ controller, onClose }: ProfileManagerProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Gen3Profile | "new">();
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
      [serializeGen3ProfileBackup(controller.exportState())],
      { type: "application/json;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen3-profiles.json";
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
        aria-labelledby="profile-manager-title"
        className="profile-modal profile-manager"
        role="dialog"
      >
        <div className="modal-heading">
          <h2 id="profile-manager-title">{t("profileManager3")}</h2>
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
                <th>{t("deadBattery")}</th>
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
                  <td>{t(profile.deadBattery ? "yes" : "no")}</td>
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
              if (window.confirm(t("confirmClearProfiles"))) {
                void controller.clearProfiles().then(() => {
                  setSelectedId(undefined);
                  setNotice(t("profilesCleared"));
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

interface Gen3ProfileControlsProps {
  controller: Gen3ProfilesController;
  compatibleVersions: "all" | "handheld" | "gamecube" | "xd";
  expanded: boolean;
  onExpandedChange(expanded: boolean): void;
}

export function Gen3ProfileControls({
  compatibleVersions,
  controller,
  expanded,
  onExpandedChange,
}: Gen3ProfileControlsProps) {
  const { t } = useTranslation();
  const [managerOpen, setManagerOpen] = useState(false);
  const profiles = useMemo(
    () =>
      controller.profiles.filter((profile) =>
        compatibleVersions === "all"
          ? true
          : compatibleVersions === "handheld"
            ? isGen3StaticVersion(profile.version)
            : compatibleVersions === "xd"
              ? profile.version === "xd"
              : profile.version === "xd" || profile.version === "colosseum",
      ),
    [compatibleVersions, controller.profiles],
  );
  const defaultProfile =
    compatibleVersions === "gamecube" || compatibleVersions === "xd"
      ? DEFAULT_GEN3_GAMECUBE_PROFILE
      : DEFAULT_GEN3_PROFILE;
  const selected =
    profiles.find((profile) => profile.id === controller.selectedProfileId) ??
    defaultProfile;

  return (
    <>
      <FloatingToolPanel
        className="profile-display"
        closeLabel={t("collapse")}
        expanded={expanded}
        id="gen3-profile-panel"
        label={t("profile")}
        onExpandedChange={onExpandedChange}
        subtitle={selected.name}
        tone="brand"
        triggerId="gen3-profile-trigger"
      >
        {expanded && (
          <div className="profile-float-body">
            <label>
              <span>{t("profile")}</span>
              <select
                disabled={controller.loading}
                onChange={(event) =>
                  void controller.selectProfile(
                    event.target.value === defaultProfile.id
                      ? null
                      : event.target.value,
                  )
                }
                value={selected.id}
              >
                <option value={defaultProfile.id}>-</option>
                {profiles.map((profile) => (
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
            </dl>
            <button onClick={() => setManagerOpen(true)} type="button">
              {t("manager")}
            </button>
          </div>
        )}
      </FloatingToolPanel>
      {managerOpen && (
        <ProfileManager
          controller={controller}
          onClose={() => setManagerOpen(false)}
        />
      )}
    </>
  );
}
