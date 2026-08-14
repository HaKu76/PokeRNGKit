import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createGen5Profile,
  EMPTY_GEN5_PROFILE_STATE,
  parseGen5ProfileBackup,
  type Gen5Profile,
  type Gen5ProfileDraft,
  type Gen5ProfileState,
} from "./domain";
import {
  Gen5ProfileRepository,
  type Gen5ProfileStorageMode,
} from "./repository";

const repository = new Gen5ProfileRepository();
let repositoryQueue: Promise<void> = Promise.resolve();

function enqueueRepository<T>(operation: () => Promise<T>) {
  const result = repositoryQueue.then(operation, operation);
  repositoryQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export interface Gen5ProfilesController {
  loading: boolean;
  busy: boolean;
  error: string;
  storageMode: Gen5ProfileStorageMode;
  profiles: Gen5Profile[];
  selectedProfileId: string | null;
  selectedProfile?: Gen5Profile;
  selectProfile(id: string | null): Promise<void>;
  createProfile(draft: Gen5ProfileDraft): Promise<void>;
  updateProfile(original: Gen5Profile, draft: Gen5ProfileDraft): Promise<void>;
  duplicateProfile(profile: Gen5Profile): Promise<void>;
  deleteProfile(profile: Gen5Profile): Promise<void>;
  moveProfile(id: string, direction: -1 | 1): Promise<void>;
  reorderProfile(id: string, targetId: string): Promise<void>;
  clearProfiles(): Promise<void>;
  importBackup(json: string): Promise<number>;
  exportState(): Gen5ProfileState;
}

export function useGen5Profiles(): Gen5ProfilesController {
  const [state, setState] = useState<Gen5ProfileState>({
    ...EMPTY_GEN5_PROFILE_STATE,
    profiles: [],
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [storageMode, setStorageMode] =
    useState<Gen5ProfileStorageMode>("indexeddb");
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
    (update: (current: Gen5ProfileState) => Gen5ProfileState) =>
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
        const profile = createGen5Profile(draft);
        return {
          ...current,
          profiles: [...current.profiles, profile],
          selectedProfileId: profile.id,
        };
      }),
    updateProfile: (original, draft) =>
      commit((current) => {
        const profile = createGen5Profile(draft, original);
        return {
          ...current,
          profiles: current.profiles.map((entry) =>
            entry.id === original.id ? profile : entry,
          ),
        };
      }),
    duplicateProfile: (profile) => {
      const draft: Gen5ProfileDraft = {
        name: profile.name,
        version: profile.version,
        language: profile.language,
        dsType: profile.dsType,
        tid: profile.tid,
        sid: profile.sid,
        mac: profile.mac,
        vcount: profile.vcount,
        timer0Min: profile.timer0Min,
        timer0Max: profile.timer0Max,
        gxstat: profile.gxstat,
        vframe: profile.vframe,
        keypresses: [...profile.keypresses] as Gen5ProfileDraft["keypresses"],
        skipLR: profile.skipLR,
        memoryLink: profile.memoryLink,
        nsPokemonReleased: profile.nsPokemonReleased,
        shinyCharm: profile.shinyCharm,
        ivCacheName: profile.ivCacheName,
        shaCacheName: profile.shaCacheName,
      };
      return commit((current) => {
        const duplicate = createGen5Profile(draft);
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
        if (index < 0 || target < 0 || target >= current.profiles.length)
          return current;
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
        await repository.clear();
        const empty = { ...EMPTY_GEN5_PROFILE_STATE, profiles: [] };
        stateRef.current = empty;
        setState(empty);
        setError("");
      }),
    importBackup: async (json) => {
      const imported = parseGen5ProfileBackup(json);
      await commit((current) => {
        const merged = new Map(
          current.profiles.map((profile) => [profile.id, profile]),
        );
        imported.profiles.forEach((profile) => merged.set(profile.id, profile));
        const selectedProfileId =
          imported.selectedProfileId ?? current.selectedProfileId;
        return {
          schemaVersion: 1,
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
