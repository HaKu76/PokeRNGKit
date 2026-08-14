import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createGen8Profile,
  EMPTY_GEN8_PROFILE_STATE,
  GEN8_PROFILE_SCHEMA_VERSION,
  parseGen8ProfileBackup,
  type Gen8Profile,
  type Gen8ProfileDraft,
  type Gen8ProfileState,
} from "./domain";
import {
  Gen8ProfileRepository,
  type Gen8ProfileStorageMode,
} from "./repository";

const repository = new Gen8ProfileRepository();
let repositoryQueue: Promise<void> = Promise.resolve();

function enqueueRepository<T>(operation: () => Promise<T>) {
  const result = repositoryQueue.then(operation, operation);
  repositoryQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export interface Gen8ProfilesController {
  loading: boolean;
  busy: boolean;
  error: string;
  storageMode: Gen8ProfileStorageMode;
  profiles: Gen8Profile[];
  selectedProfileId: string | null;
  selectedProfile?: Gen8Profile;
  selectProfile(id: string | null): Promise<void>;
  createProfile(draft: Gen8ProfileDraft): Promise<void>;
  updateProfile(original: Gen8Profile, draft: Gen8ProfileDraft): Promise<void>;
  duplicateProfile(profile: Gen8Profile): Promise<void>;
  deleteProfile(profile: Gen8Profile): Promise<void>;
  moveProfile(id: string, direction: -1 | 1): Promise<void>;
  reorderProfile(id: string, targetId: string): Promise<void>;
  clearProfiles(): Promise<void>;
  importBackup(json: string): Promise<number>;
  exportState(): Gen8ProfileState;
}

export function useGen8Profiles(): Gen8ProfilesController {
  const [state, setState] = useState<Gen8ProfileState>({
    ...EMPTY_GEN8_PROFILE_STATE,
    profiles: [],
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [storageMode, setStorageMode] =
    useState<Gen8ProfileStorageMode>("indexeddb");
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
    (update: (current: Gen8ProfileState) => Gen8ProfileState) =>
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
        const profile = createGen8Profile(draft);
        return {
          ...current,
          profiles: [...current.profiles, profile],
          selectedProfileId: profile.id,
        };
      }),
    updateProfile: (original, draft) =>
      commit((current) => {
        const profile = createGen8Profile(draft, original);
        return {
          ...current,
          profiles: current.profiles.map((entry) =>
            entry.id === original.id ? profile : entry,
          ),
        };
      }),
    duplicateProfile: (profile) => {
      const draft: Gen8ProfileDraft = {
        name: profile.name,
        version: profile.version,
        tid: profile.tid,
        sid: profile.sid,
        nationalDex: profile.nationalDex,
        shinyCharm: profile.shinyCharm,
        ovalCharm: profile.ovalCharm,
      };
      return commit((current) => {
        const duplicate = createGen8Profile(draft);
        return {
          ...current,
          profiles: [...current.profiles, duplicate],
          selectedProfileId: duplicate.id,
        };
      });
    },
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
          const empty = { ...EMPTY_GEN8_PROFILE_STATE, profiles: [] };
          stateRef.current = empty;
          setState(empty);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause));
          throw cause;
        }
      }),
    importBackup: async (json) => {
      const imported = parseGen8ProfileBackup(json);
      await commit((current) => {
        const merged = new Map(
          current.profiles.map((profile) => [profile.id, profile]),
        );
        imported.profiles.forEach((profile) => merged.set(profile.id, profile));
        const selectedProfileId =
          imported.selectedProfileId ?? current.selectedProfileId;
        return {
          schemaVersion: GEN8_PROFILE_SCHEMA_VERSION,
          profiles: [...merged.values()],
          selectedProfileId:
            selectedProfileId && merged.has(selectedProfileId)
              ? selectedProfileId
              : null,
        };
      });
      return imported.profiles.length;
    },
    exportState: () => stateRef.current,
  };
}
