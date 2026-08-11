import { useEffect, useMemo, useState } from "react";
import {
  createGen3Profile,
  EMPTY_GEN3_PROFILE_STATE,
  parseGen3ProfileBackup,
  type Gen3Profile,
  type Gen3ProfileDraft,
  type Gen3ProfileState,
} from "./domain";
import {
  Gen3ProfileRepository,
  type Gen3ProfileStorageMode,
} from "./repository";

const repository = new Gen3ProfileRepository();

export interface Gen3ProfilesController {
  loading: boolean;
  error: string;
  storageMode: Gen3ProfileStorageMode;
  profiles: Gen3Profile[];
  selectedProfileId: string | null;
  selectedProfile?: Gen3Profile;
  selectProfile(id: string | null): Promise<void>;
  createProfile(draft: Gen3ProfileDraft): Promise<void>;
  updateProfile(original: Gen3Profile, draft: Gen3ProfileDraft): Promise<void>;
  duplicateProfile(profile: Gen3Profile): Promise<void>;
  deleteProfile(profile: Gen3Profile): Promise<void>;
  clearProfiles(): Promise<void>;
  importBackup(json: string): Promise<number>;
  exportState(): Gen3ProfileState;
}

export function useGen3Profiles(): Gen3ProfilesController {
  const [state, setState] = useState<Gen3ProfileState>({
    ...EMPTY_GEN3_PROFILE_STATE,
    profiles: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [storageMode, setStorageMode] =
    useState<Gen3ProfileStorageMode>("indexeddb");

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
        if (active)
          setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const commit = async (nextState: Gen3ProfileState) => {
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
      const profile = createGen3Profile(draft);
      return commit({
        ...state,
        profiles: [...state.profiles, profile],
        selectedProfileId: profile.id,
      });
    },
    updateProfile: (original, draft) => {
      const profile = createGen3Profile(draft, original);
      return commit({
        ...state,
        profiles: state.profiles.map((entry) =>
          entry.id === original.id ? profile : entry,
        ),
      });
    },
    duplicateProfile: (profile) => {
      const duplicate = createGen3Profile({
        name: profile.name,
        version: profile.version,
        tid: profile.tid,
        sid: profile.sid,
        deadBattery: profile.deadBattery,
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
      setState({ ...EMPTY_GEN3_PROFILE_STATE, profiles: [] });
    },
    importBackup: async (json) => {
      const imported = parseGen3ProfileBackup(json);
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
