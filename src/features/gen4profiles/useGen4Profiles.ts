import { useEffect, useMemo, useState } from "react";
import {
  createGen4Profile,
  EMPTY_GEN4_PROFILE_STATE,
  parseGen4ProfileBackup,
  type Gen4Profile,
  type Gen4ProfileDraft,
  type Gen4ProfileState,
} from "./domain";
import {
  Gen4ProfileRepository,
  type Gen4ProfileStorageMode,
} from "./repository";

const repository = new Gen4ProfileRepository();

export interface Gen4ProfilesController {
  loading: boolean;
  error: string;
  storageMode: Gen4ProfileStorageMode;
  profiles: Gen4Profile[];
  selectedProfileId: string | null;
  selectedProfile?: Gen4Profile;
  selectProfile(id: string | null): Promise<void>;
  createProfile(draft: Gen4ProfileDraft): Promise<void>;
  updateProfile(original: Gen4Profile, draft: Gen4ProfileDraft): Promise<void>;
  duplicateProfile(profile: Gen4Profile): Promise<void>;
  deleteProfile(profile: Gen4Profile): Promise<void>;
  clearProfiles(): Promise<void>;
  importBackup(json: string): Promise<number>;
  exportState(): Gen4ProfileState;
}

export function useGen4Profiles(): Gen4ProfilesController {
  const [state, setState] = useState<Gen4ProfileState>({
    ...EMPTY_GEN4_PROFILE_STATE,
    profiles: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [storageMode, setStorageMode] =
    useState<Gen4ProfileStorageMode>("indexeddb");

  useEffect(() => {
    let active = true;
    void repository
      .load()
      .then((result) => {
        if (!active) return;
        setState(result.state);
        setStorageMode(result.storageMode);
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const commit = async (nextState: Gen4ProfileState) => {
    setError("");
    setState(nextState);
    try {
      setStorageMode(await repository.save(nextState));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    }
  };

  const selectedProfile = useMemo(
    () =>
      state.profiles.find((profile) => profile.id === state.selectedProfileId),
    [state.profiles, state.selectedProfileId],
  );

  return {
    loading,
    error,
    storageMode,
    profiles: state.profiles,
    selectedProfileId: state.selectedProfileId,
    selectedProfile,
    selectProfile: (selectedProfileId) =>
      commit({ ...state, selectedProfileId }),
    createProfile: (draft) => {
      const profile = createGen4Profile(draft);
      return commit({
        ...state,
        profiles: [...state.profiles, profile],
        selectedProfileId: profile.id,
      });
    },
    updateProfile: (original, draft) => {
      const profile = createGen4Profile(draft, original);
      return commit({
        ...state,
        profiles: state.profiles.map((entry) =>
          entry.id === original.id ? profile : entry,
        ),
      });
    },
    duplicateProfile: (profile) => {
      const duplicate = createGen4Profile({
        name: profile.name,
        version: profile.version,
        tid: profile.tid,
        sid: profile.sid,
        nationalDex: profile.nationalDex,
        unownDiscovered: [...profile.unownDiscovered],
        unownPuzzles: [...profile.unownPuzzles],
      });
      return commit({
        ...state,
        profiles: [...state.profiles, duplicate],
        selectedProfileId: duplicate.id,
      });
    },
    deleteProfile: (profile) =>
      commit({
        ...state,
        profiles: state.profiles.filter((entry) => entry.id !== profile.id),
        selectedProfileId:
          state.selectedProfileId === profile.id
            ? null
            : state.selectedProfileId,
      }),
    clearProfiles: async () => {
      await repository.clear();
      setError("");
      setState({ ...EMPTY_GEN4_PROFILE_STATE, profiles: [] });
    },
    importBackup: async (json) => {
      const imported = parseGen4ProfileBackup(json);
      const merged = new Map(
        state.profiles.map((profile) => [profile.id, profile]),
      );
      for (const profile of imported.profiles) merged.set(profile.id, profile);
      const selectedProfileId =
        imported.selectedProfileId ?? state.selectedProfileId;
      await commit({
        schemaVersion: 1,
        profiles: [...merged.values()],
        selectedProfileId:
          selectedProfileId && merged.has(selectedProfileId)
            ? selectedProfileId
            : null,
      });
      return imported.profiles.length;
    },
    exportState: () => state,
  };
}
