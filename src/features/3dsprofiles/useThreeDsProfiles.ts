import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createThreeDsProfile,
  EMPTY_THREE_DS_PROFILE_STATE,
  parseThreeDsProfileImport,
  THREE_DS_PROFILE_SCHEMA_VERSION,
  type ThreeDsProfile,
  type ThreeDsProfileDraft,
  type ThreeDsProfileState,
} from "./domain";
import {
  ThreeDsProfileRepository,
  type ThreeDsProfileStorageMode,
} from "./repository";

const repository = new ThreeDsProfileRepository();
let repositoryQueue: Promise<void> = Promise.resolve();

function enqueueRepository<T>(operation: () => Promise<T>) {
  const result = repositoryQueue.then(operation, operation);
  repositoryQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export interface ThreeDsProfilesController {
  loading: boolean;
  busy: boolean;
  error: string;
  storageMode: ThreeDsProfileStorageMode;
  profiles: ThreeDsProfile[];
  selectedProfileId: string | null;
  selectedProfile?: ThreeDsProfile;
  selectProfile(id: string | null): Promise<void>;
  createProfile(draft: ThreeDsProfileDraft): Promise<void>;
  updateProfile(
    original: ThreeDsProfile,
    draft: ThreeDsProfileDraft,
  ): Promise<void>;
  deleteProfile(profile: ThreeDsProfile): Promise<void>;
  moveProfile(id: string, direction: -1 | 1): Promise<void>;
  reorderProfile(id: string, targetId: string): Promise<void>;
  clearProfiles(): Promise<void>;
  importProfiles(text: string): Promise<number>;
  exportState(): ThreeDsProfileState;
}

export function useThreeDsProfiles(): ThreeDsProfilesController {
  const [state, setState] = useState<ThreeDsProfileState>({
    ...EMPTY_THREE_DS_PROFILE_STATE,
    profiles: [],
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [storageMode, setStorageMode] =
    useState<ThreeDsProfileStorageMode>("indexeddb");
  const stateRef = useRef(state);
  const pendingOperations = useRef(0);

  useEffect(() => {
    let active = true;
    void enqueueRepository(() => repository.load())
      .then((result) => {
        if (!active) return;
        stateRef.current = result.state;
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

  const run = useCallback(async <T>(operation: () => Promise<T>) => {
    pendingOperations.current += 1;
    setBusy(true);
    try {
      return await enqueueRepository(operation);
    } finally {
      pendingOperations.current -= 1;
      if (pendingOperations.current === 0) setBusy(false);
    }
  }, []);

  const commit = useCallback(
    (update: (current: ThreeDsProfileState) => ThreeDsProfileState) =>
      run(async () => {
        setError("");
        try {
          const nextState = update(stateRef.current);
          const mode = await repository.save(nextState);
          stateRef.current = nextState;
          setState(nextState);
          setStorageMode(mode);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause));
          throw cause;
        }
      }),
    [run],
  );

  const selectedProfile = useMemo(
    () =>
      state.profiles.find((profile) => profile.id === state.selectedProfileId),
    [state.profiles, state.selectedProfileId],
  );

  return {
    loading,
    busy,
    error,
    storageMode,
    profiles: state.profiles,
    selectedProfileId: state.selectedProfileId,
    selectedProfile,
    selectProfile: (selectedProfileId) =>
      commit((current) => ({ ...current, selectedProfileId })),
    createProfile: (draft) =>
      commit((current) => {
        const profile = createThreeDsProfile(draft);
        return {
          ...current,
          profiles: [...current.profiles, profile],
          selectedProfileId: profile.id,
        };
      }),
    updateProfile: (original, draft) =>
      commit((current) => {
        const profile = createThreeDsProfile(draft, original);
        return {
          ...current,
          profiles: current.profiles.map((entry) =>
            entry.id === original.id ? profile : entry,
          ),
        };
      }),
    deleteProfile: (profile) =>
      commit((current) => ({
        ...current,
        profiles: current.profiles.filter((entry) => entry.id !== profile.id),
        selectedProfileId:
          current.selectedProfileId === profile.id
            ? null
            : current.selectedProfileId,
      })),
    moveProfile: (id, direction) =>
      commit((current) => {
        const index = current.profiles.findIndex(
          (profile) => profile.id === id,
        );
        const target = index + direction;
        if (index < 0 || target < 0 || target >= current.profiles.length) {
          return current;
        }
        const profiles = [...current.profiles];
        [profiles[index], profiles[target]] = [
          profiles[target],
          profiles[index],
        ];
        return { ...current, profiles };
      }),
    reorderProfile: (id, targetId) =>
      commit((current) => {
        const source = current.profiles.findIndex(
          (profile) => profile.id === id,
        );
        const target = current.profiles.findIndex(
          (profile) => profile.id === targetId,
        );
        if (source < 0 || target < 0 || source === target) return current;
        const profiles = [...current.profiles];
        const [profile] = profiles.splice(source, 1);
        profiles.splice(target, 0, profile);
        return { ...current, profiles };
      }),
    clearProfiles: () =>
      run(async () => {
        setError("");
        try {
          await repository.clear();
          const empty = { ...EMPTY_THREE_DS_PROFILE_STATE, profiles: [] };
          stateRef.current = empty;
          setState(empty);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause));
          throw cause;
        }
      }),
    importProfiles: async (text) => {
      const imported = parseThreeDsProfileImport(text);
      await commit((current) => {
        if (imported.source === "legacy-xml") {
          const profiles = [...current.profiles, ...imported.state.profiles];
          return {
            schemaVersion: THREE_DS_PROFILE_SCHEMA_VERSION,
            profiles,
            selectedProfileId:
              imported.state.selectedProfileId ?? current.selectedProfileId,
          };
        }
        const merged = new Map(
          current.profiles.map((profile) => [profile.id, profile]),
        );
        imported.state.profiles.forEach((profile) =>
          merged.set(profile.id, profile),
        );
        const selectedProfileId =
          imported.state.selectedProfileId ?? current.selectedProfileId;
        return {
          schemaVersion: THREE_DS_PROFILE_SCHEMA_VERSION,
          profiles: [...merged.values()],
          selectedProfileId:
            selectedProfileId && merged.has(selectedProfileId)
              ? selectedProfileId
              : null,
        };
      });
      return imported.state.profiles.length;
    },
    exportState: () => stateRef.current,
  };
}
