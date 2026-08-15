import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, GitBranch, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { GEN7_WILD_NATURES, type Gen7WildGameVersion } from "../gen7wild/data";
import {
  formatGen7SosHex32,
  formatGen7SosHex64,
  gen7SosAreas,
  gen7SosCallRates,
  gen7SosCallers,
  gen7SosLocationName,
  gen7SosPersonal,
  gen7SosSlots,
  gen7SosSpeciesName,
  parseGen7SosDecimal,
  parseGen7SosHex,
  validateGen7SosRequest,
  type Gen7SosAbilityFilter,
  type Gen7SosBlinkFilter,
  type Gen7SosCallRequest,
  type Gen7SosCallResult,
  type Gen7SosGenderFilter,
  type Gen7SosIvTuple,
  type Gen7SosLead,
  type Gen7SosMode,
  type Gen7SosPokemonFilters,
  type Gen7SosPokemonRequest,
  type Gen7SosPokemonResult,
  type Gen7SosResult,
  type Gen7SosShinyFilter,
  type Gen7SosWeather,
} from "./domain";
import {
  gen7WildStartingFrame,
  type Gen7WildLanguage,
} from "../gen7wild/domain";
import { Gen7SosUiPreviewEngine } from "./preview/Gen7SosUiPreviewEngine";
import type { Gen7SosEngine, Gen7SosProgress, Gen7SosSummary } from "./search";
import { Gen7SosWorker } from "./worker/Gen7SosWorker";
import "./Gen7SosPanel.css";

type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type SortDirection = "asc" | "desc";
type IvText = [string, string, string, string, string, string];
type ResultColumn = { key: string; label: string };

const IV_KEYS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;
const IV_SORT_KEYS = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
] as const;
const POWER_KEYS = [
  "powerFighting",
  "powerFlying",
  "powerPoison",
  "powerGround",
  "powerRock",
  "powerBug",
  "powerGhost",
  "powerSteel",
  "powerFire",
  "powerWater",
  "powerGrass",
  "powerElectric",
  "powerPsychic",
  "powerIce",
  "powerDragon",
  "powerDark",
] as const;
const LEADS: readonly { value: Gen7SosLead; label: string }[] = [
  { value: "none", label: "-" },
  { value: "synchronize", label: "Synchronize" },
  { value: "cute-charm-male", label: "Cute Charm ♂" },
  { value: "cute-charm-female", label: "Cute Charm ♀" },
  { value: "static", label: "Static" },
  { value: "magnet-pull", label: "Magnet Pull" },
  { value: "compound-eyes", label: "Compound Eyes" },
  { value: "suction-cups", label: "Suction Cups | Sticky Hold" },
  { value: "level-modifier", label: "Pressure | Hustle | Vital Spirit" },
  { value: "black-flute", label: "黑色玻璃哨" },
  { value: "white-flute", label: "白色玻璃哨" },
];
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;

function compareValues(left: unknown, right: unknown) {
  if (typeof left === "bigint" && typeof right === "bigint")
    return left < right ? -1 : left > right ? 1 : 0;
  return Number(left) - Number(right);
}

function csvCell(value: unknown) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function ivTuple(values: IvText): Gen7SosIvTuple {
  return values.map(parseGen7SosDecimal) as Gen7SosIvTuple;
}

function itemLabel(item: number, common: string, rare: string, none: string) {
  return item === 0 ? common : item === 1 ? rare : item === 2 ? "Hidden" : none;
}

export function Gen7SosPanel({ uiPreviewMode }: { uiPreviewMode: boolean }) {
  const { t, i18n } = useTranslation();
  const language: Gen7WildLanguage =
    i18n.resolvedLanguage === "ja"
      ? "ja"
      : i18n.resolvedLanguage === "zh"
        ? "zh"
        : "en";
  const engine = useMemo<Gen7SosEngine>(
    () => (uiPreviewMode ? new Gen7SosUiPreviewEngine() : new Gen7SosWorker()),
    [uiPreviewMode],
  );
  const [mode, setMode] = useState<Gen7SosMode>("pokemon");
  const [version, setVersion] = useState<Gen7WildGameVersion>("ultra-sun");
  const [seed, setSeed] = useState("0");
  const [minFrame, setMinFrame] = useState("478");
  const [maxFrame, setMaxFrame] = useState("50000");
  const [tsv, setTsv] = useState("0");
  const [trv, setTrv] = useState("0");
  const [shinyCharm, setShinyCharm] = useState(false);
  const [lead, setLead] = useState<Gen7SosLead>("none");
  const [syncNature, setSyncNature] = useState("");
  const [npc, setNpc] = useState("0");
  const [considerDelay, setConsiderDelay] = useState(true);
  const [delayTime, setDelayTime] = useState("0");
  const [areaId, setAreaId] = useState("");
  const [night, setNight] = useState(false);
  const [caller, setCaller] = useState(0);
  const [weather, setWeather] = useState<Gen7SosWeather>("none");
  const [sosSeed, setSosSeed] = useState("0");
  const [sosFrame, setSosFrame] = useState("0");
  const [chainLength, setChainLength] = useState("0");
  const [levelMin, setLevelMin] = useState("1");
  const [levelMax, setLevelMax] = useState("100");
  const [callRate, setCallRate] = useState("15");
  const [hpBonus, setHpBonus] = useState("1");
  const [adrenalineOrb, setAdrenalineOrb] = useState(false);
  const [intimidate, setIntimidate] = useState(false);
  const [lastCallSucceeded, setLastCallSucceeded] = useState(false);
  const [lastCallFailed, setLastCallFailed] = useState(false);
  const [superEffective, setSuperEffective] = useState(false);
  const [callsDelay, setCallsDelay] = useState("0");
  const [existingPerfectIvMask, setExistingPerfectIvMask] = useState(0);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shinyFilter, setShinyFilter] = useState<Gen7SosShinyFilter>("any");
  const [genderFilter, setGenderFilter] = useState<Gen7SosGenderFilter>("any");
  const [abilityFilter, setAbilityFilter] =
    useState<Gen7SosAbilityFilter>("any");
  const [blinkFilter, setBlinkFilter] = useState<Gen7SosBlinkFilter>("any");
  const [natureMask, setNatureMask] = useState(ALL_NATURES);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(ALL_HIDDEN_POWERS);
  const [slotMask, setSlotMask] = useState(0);
  const [levelFilter, setLevelFilter] = useState("0");
  const [ivMin, setIvMin] = useState<IvText>(["0", "0", "0", "0", "0", "0"]);
  const [ivMax, setIvMax] = useState<IvText>([
    "31",
    "31",
    "31",
    "31",
    "31",
    "31",
  ]);
  const [perfectIvValue, setPerfectIvValue] = useState("31");
  const [perfectIvCount, setPerfectIvCount] = useState("0");
  const [successOnly, setSuccessOnly] = useState(false);
  const [syncOnly, setSyncOnly] = useState(false);
  const [hiddenAbilityOnly, setHiddenAbilityOnly] = useState(false);
  const [results, setResults] = useState<Gen7SosResult[]>([]);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Gen7SosProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen7SosSummary>();
  const [sort, setSort] = useState<{ key: string; direction: SortDirection }>({
    key: "frame",
    direction: "asc",
  });
  const [selectedFrame, setSelectedFrame] = useState<number>();
  const [pathBusy, setPathBusy] = useState(false);
  const [pathText, setPathText] = useState("");
  const abortRef = useRef<AbortController | undefined>(undefined);
  const tableRef = useRef<HTMLDivElement>(null);

  const areas = useMemo(() => gen7SosAreas(version), [version]);
  const selectedArea = areas.find((area) => area.id === areaId) ?? areas[0];
  const callers = useMemo(
    () => (selectedArea ? gen7SosCallers(selectedArea, version, night) : []),
    [night, selectedArea, version],
  );
  const selectedCaller = callers.includes(caller) ? caller : (callers[0] ?? 0);
  const slots = useMemo(
    () =>
      selectedArea && selectedCaller
        ? gen7SosSlots({
            area: selectedArea,
            caller: selectedCaller,
            version,
            night,
            weather,
          })
        : [],
    [night, selectedArea, selectedCaller, version, weather],
  );
  const callRates = useMemo(() => {
    const parsedHpBonus = parseGen7SosDecimal(hpBonus);
    return gen7SosCallRates({
      callRate: [0, 3, 6, 9, 15].includes(parseGen7SosDecimal(callRate))
        ? parseGen7SosDecimal(callRate)
        : 15,
      hpBonus: ([1, 3, 5].includes(parsedHpBonus) ? parsedHpBonus : 1) as
        1 | 3 | 5,
      adrenalineOrb,
      intimidate,
      lastCallSucceeded,
      lastCallFailed,
      superEffective,
    });
  }, [
    adrenalineOrb,
    callRate,
    hpBonus,
    intimidate,
    lastCallFailed,
    lastCallSucceeded,
    superEffective,
  ]);
  const natureOptions = useMemo(
    () => GEN7_WILD_NATURES[language].map((label, value) => ({ label, value })),
    [language],
  );
  const slotOptions = slots.map((slot, index) => ({
    label:
      slot.species === 0
        ? `${index + 1}: -`
        : `${index + 1}: ${gen7SosSpeciesName(slot.specForm, language)}`,
    value: index + 1,
  }));
  const callSlotOptions = Array.from({ length: 9 }, (_, index) => ({
    label: `${index + 1}`,
    value: index + 1,
  }));

  useEffect(() => {
    if (selectedArea && selectedArea.id !== areaId) setAreaId(selectedArea.id);
  }, [areaId, selectedArea]);
  useEffect(() => {
    if (selectedCaller !== caller) setCaller(selectedCaller);
    if (selectedCaller)
      setCallRate(String(gen7SosPersonal(selectedCaller).callRate));
  }, [caller, selectedCaller]);
  useEffect(() => {
    setMinFrame(String(gen7WildStartingFrame(version)));
  }, [version]);
  useEffect(() => () => engine.dispose(), [engine]);
  useEffect(() => {
    setResults([]);
    setSelectedFrame(undefined);
    setPathText("");
    setError("");
  }, [mode]);

  const filteredResults = useMemo(
    () => results.filter((result) => result.mode === mode),
    [mode, results],
  );
  const sortedResults = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filteredResults].sort(
      (left, right) =>
        compareValues(
          resultSortValue(left, sort.key),
          resultSortValue(right, sort.key),
        ) * direction,
    );
  }, [filteredResults, sort]);
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 38,
    overscan: 12,
  });
  const columns = useMemo<ResultColumn[]>(() => {
    if (mode === "calls") {
      return [
        { key: "frame", label: t("gen7SosFrame") },
        { key: "random", label: t("gen7RandomNumber") },
        { key: "call1", label: "Call 1" },
        { key: "call2", label: "Call 2" },
        { key: "rate1", label: "Rate 1" },
        { key: "rate2", label: "Rate 2" },
        { key: "success", label: t("gen7SosSuccess") },
        { key: "synchronize", label: t("gen7StationarySync") },
        { key: "slot", label: t("gen7WildEncounterSlot") },
        { key: "level", label: t("level") },
        { key: "item", label: t("gen7WildItem") },
        { key: "bumpedIvMask", label: t("gen7SosPerfectIvs") },
        { key: "hiddenAbility", label: t("gen7StationaryHiddenAbility") },
        { key: "advance", label: t("gen7SosAdvance") },
      ];
    }
    return [
      { key: "frame", label: t("gen7SosFrame") },
      { key: "realTimeFrames", label: t("gen7StationaryRealtime") },
      { key: "random", label: t("gen7RandomNumber") },
      { key: "species", label: t("species") },
      { key: "form", label: "Form" },
      { key: "level", label: t("level") },
      { key: "slot", label: t("gen7WildEncounterSlot") },
      { key: "ec", label: "EC" },
      { key: "pid", label: "PID" },
      ...IV_KEYS.map((label, index) => ({ key: IV_SORT_KEYS[index], label })),
      { key: "nature", label: t("nature") },
      { key: "ability", label: t("ability") },
      { key: "gender", label: t("gender") },
      { key: "hiddenPower", label: t("hiddenPower") },
      { key: "item", label: t("gen7WildItem") },
      { key: "shiny", label: t("shiny") },
      { key: "synchronize", label: t("gen7StationarySync") },
      { key: "blink", label: t("gen7WildMark") },
      { key: "delay", label: t("delay") },
      { key: "callSuccess", label: t("gen7SosSuccess") },
      { key: "bumpedIvMask", label: t("gen7SosPerfectIvs") },
      { key: "battleAdvance", label: t("gen7SosAdvance") },
    ];
  }, [mode, t]);

  function buildCallConditions(
    overrides: Partial<Gen7SosCallRequest["callConditions"]> = {},
  ) {
    return {
      callRate: parseGen7SosDecimal(callRate),
      hpBonus: parseGen7SosDecimal(hpBonus) as 1 | 3 | 5,
      adrenalineOrb,
      intimidate,
      lastCallSucceeded,
      lastCallFailed,
      superEffective,
      ...overrides,
    };
  }

  function buildPokemonRequest(overrides: Partial<Gen7SosPokemonRequest> = {}) {
    if (!selectedArea || !selectedCaller || slots.length !== 9)
      throw new Error(t("invalidGen7SosInput"));
    const filters: Gen7SosPokemonFilters = {
      disabled: filtersDisabled,
      shiny: shinyFilter,
      gender: genderFilter,
      ability: abilityFilter,
      natureMask,
      hiddenPowerMask,
      ivMin: ivTuple(ivMin),
      ivMax: ivTuple(ivMax),
      perfectIvValue: parseGen7SosDecimal(perfectIvValue),
      perfectIvCount: parseGen7SosDecimal(perfectIvCount),
      blink: blinkFilter,
      slotMask,
      level: parseGen7SosDecimal(levelFilter),
    };
    return validateGen7SosRequest({
      mode: "pokemon",
      version,
      seed: parseGen7SosHex(seed),
      minFrame: parseGen7SosDecimal(minFrame),
      maxFrame: parseGen7SosDecimal(maxFrame),
      tsv: parseGen7SosDecimal(tsv),
      trv: parseGen7SosDecimal(trv),
      shinyCharm,
      syncNature:
        lead === "synchronize" ? parseGen7SosDecimal(syncNature) : null,
      lead,
      npc: parseGen7SosDecimal(npc),
      considerDelay,
      delayTime: parseGen7SosDecimal(delayTime),
      sosSeed: parseGen7SosHex(sosSeed),
      sosFrame: parseGen7SosDecimal(sosFrame),
      chainLength: parseGen7SosDecimal(chainLength),
      levelMin: parseGen7SosDecimal(levelMin),
      levelMax: parseGen7SosDecimal(levelMax),
      weather,
      slots,
      callConditions: buildCallConditions(),
      filters,
      resultLimit: 100_000,
      ...overrides,
    });
  }

  function buildCallRequest(overrides: Partial<Gen7SosCallRequest> = {}) {
    return validateGen7SosRequest({
      mode: "calls",
      seed: parseGen7SosHex(seed),
      minFrame: parseGen7SosDecimal(minFrame),
      maxFrame: parseGen7SosDecimal(maxFrame),
      delay: parseGen7SosDecimal(callsDelay),
      chainLength: parseGen7SosDecimal(chainLength),
      levelMin: parseGen7SosDecimal(levelMin),
      levelMax: parseGen7SosDecimal(levelMax),
      weather: weather !== "none",
      existingPerfectIvMask,
      callConditions: buildCallConditions(),
      filters: {
        disabled: filtersDisabled,
        successOnly,
        syncOnly,
        hiddenAbilityOnly,
        slotMask,
        level: parseGen7SosDecimal(levelFilter),
      },
      resultLimit: 100_000,
      ...overrides,
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (status === "calculating") return;
    try {
      const request =
        mode === "pokemon" ? buildPokemonRequest() : buildCallRequest();
      const controller = new AbortController();
      abortRef.current = controller;
      setResults([]);
      setSummary(undefined);
      setError("");
      setSelectedFrame(undefined);
      setPathText("");
      setStatus("calculating");
      setProgress({
        processedStates: 0,
        totalStates: request.maxFrame - request.minFrame + 1,
        resultCount: 0,
        percent: 0,
      });
      const completed = await engine.search(request, {
        signal: controller.signal,
        onBatch: (batch) => setResults((current) => [...current, ...batch]),
        onProgress: setProgress,
      });
      setSummary(completed);
      setStatus(completed.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("invalidGen7SosInput"),
      );
      setStatus("failed");
    } finally {
      abortRef.current = undefined;
    }
  }

  function cancel() {
    abortRef.current?.abort();
    engine.cancel();
  }

  async function findPath() {
    if (mode !== "calls" || selectedFrame === undefined || pathBusy) return;
    const target = selectedFrame;
    if (target < 0) return;
    setPathBusy(true);
    setPathText("");
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    const start = Math.max(0, target - 27);
    try {
      const variants = [
        buildCallRequest({
          minFrame: start,
          maxFrame: target,
          callConditions: buildCallConditions({
            lastCallSucceeded: false,
            lastCallFailed: false,
          }),
          filters: {
            disabled: true,
            successOnly: false,
            syncOnly: false,
            hiddenAbilityOnly: false,
            slotMask: 0,
            level: 0,
          },
        }),
        buildCallRequest({
          minFrame: start,
          maxFrame: target,
          callConditions: buildCallConditions({
            lastCallSucceeded: true,
            lastCallFailed: false,
          }),
          filters: {
            disabled: true,
            successOnly: false,
            syncOnly: false,
            hiddenAbilityOnly: false,
            slotMask: 0,
            level: 0,
          },
        }),
        buildCallRequest({
          minFrame: start,
          maxFrame: target,
          callConditions: buildCallConditions({
            lastCallSucceeded: true,
            lastCallFailed: true,
          }),
          filters: {
            disabled: true,
            successOnly: false,
            syncOnly: false,
            hiddenAbilityOnly: false,
            slotMask: 0,
            level: 0,
          },
        }),
      ];
      const lists: Gen7SosCallResult[][] = [];
      for (const request of variants) {
        const list: Gen7SosCallResult[] = [];
        await engine.search(request, {
          signal: controller.signal,
          onBatch: (batch) =>
            list.push(
              ...batch.filter(
                (entry): entry is Gen7SosCallResult => entry.mode === "calls",
              ),
            ),
        });
        lists.push(list);
      }
      const byFrame = (list: Gen7SosCallResult[]) =>
        new Map(list.map((entry) => [entry.frame, entry]));
      const nothing = byFrame(lists[0]);
      const callOnly = byFrame(lists[1]);
      const both = byFrame(lists[2]);
      const nTarget = nothing.get(target);
      const cTarget = callOnly.get(target);
      const bTarget = both.get(target);
      let steps = "没有找到路径";
      if (nTarget && cTarget && bTarget) {
        if (nTarget.advance > 2) {
          steps = `1. 在index=${target}前使用电磁波或大蛇瞪眼使其麻痹\n2. 推进index到${target}\n3. 在index=${target}使其解除麻痹 => 目标出现`;
        } else if (
          target >= 2 &&
          bTarget.advance > 2 &&
          nothing.get(target - 2)?.advance === 2
        ) {
          steps = `1. 在index=${target - 2}前使用电磁波或大蛇瞪眼使其麻痹\n2. 在index=${target - 2}使用治愈波动 => 呼唤失败 => index=${target}\n3. 在index=${target}推进回合 => 目标出现`;
        } else if (cTarget.advance > 2) {
          for (let distance = 1; distance <= 25; distance++) {
            const startFrame = target - distance;
            const previous = nothing.get(startFrame);
            if (!previous || previous.advance === 1) continue;
            if (previous.frame + previous.advance === cTarget.frame) {
              steps = `1. 在index=${startFrame}前使用电磁波或大蛇瞪眼使其麻痹\n2. 在index=${startFrame}使用治愈波动 => 新的同伴出现 (主随机数生成器不应生成任何完美个体值) => 落在index=${target}\n3. 在index=${target}时，击败新同伴 => 目标出现`;
              break;
            }
            const bothPrevious = both.get(startFrame);
            const failedPrevious = nothing.get(startFrame - 2);
            if (
              bothPrevious &&
              failedPrevious?.advance === 2 &&
              bothPrevious.frame + bothPrevious.advance === cTarget.frame
            ) {
              steps = `1. 在index=${startFrame - 2}前使用电磁波或大蛇瞪眼使其麻痹\n2. 在index=${startFrame - 2}使用治愈招式 => 触发失败 => 落在index=${startFrame}\n3. 在index=${startFrame}时，推进回合 => 新的同伴出现 (主随机数生成器不应生成任何完美个体值) => 落在index=${target}\n4. 在index=${target}时，击败新同伴 => 目标出现`;
              break;
            }
          }
        }
      }
      setPathText(steps);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("invalidGen7SosInput"),
      );
    } finally {
      abortRef.current = undefined;
      setPathBusy(false);
    }
  }

  function exportCsv() {
    if (sortedResults.length === 0) return;
    const headers = columns.map((column) => column.label);
    const rows = sortedResults.map((result) =>
      columns.map((column) => resultCell(result, column.key)),
    );
    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gen7-sos-${mode}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function resultCell(
    result: Gen7SosResult,
    key: string,
  ): string | number | boolean {
    if (result.mode === "pokemon") {
      const ivIndex = IV_SORT_KEYS.indexOf(
        key as (typeof IV_SORT_KEYS)[number],
      );
      if (ivIndex >= 0) return result.ivs[ivIndex];
      if (key === "random") return formatGen7SosHex64(result.random);
      if (key === "ec" || key === "pid") return formatGen7SosHex32(result[key]);
      if (key === "species")
        return gen7SosSpeciesName(
          result.species | (result.form << 11),
          language,
        );
      if (key === "nature") return GEN7_WILD_NATURES[language][result.nature];
      if (key === "hiddenPower") return t(POWER_KEYS[result.hiddenPower]);
      if (key === "gender")
        return result.gender === 1 ? "♂" : result.gender === 2 ? "♀" : "-";
      if (key === "item")
        return itemLabel(
          result.item,
          t("gen7WildItemCommon"),
          t("gen7WildItemRare"),
          t("none"),
        );
      if (key === "shiny")
        return result.shiny === 2
          ? t("shinySquare")
          : result.shiny === 1
            ? t("shinyStar")
            : "-";
      if (key === "bumpedIvMask")
        return result.ivs
          .map((iv, index) => (iv === 31 ? IV_KEYS[index] : ""))
          .filter(Boolean)
          .join(" ");
      if (key === "synchronize" || key === "callSuccess") return result[key];
      return String(result[key as keyof Gen7SosPokemonResult] ?? "");
    }
    if (key === "random") return formatGen7SosHex32(result.random);
    if (key === "item")
      return itemLabel(
        result.item,
        t("gen7WildItemCommon"),
        t("gen7WildItemRare"),
        t("none"),
      );
    if (key === "success" || key === "synchronize" || key === "hiddenAbility")
      return result[key];
    if (key === "bumpedIvMask")
      return IV_KEYS.filter(
        (_, index) => (result.bumpedIvMask & (1 << index)) !== 0,
      ).join(" ");
    return String(result[key as keyof Gen7SosCallResult] ?? "");
  }

  const statusText =
    status === "calculating"
      ? `${progress.percent.toFixed(1)}%`
      : status === "completed"
        ? `${results.length}`
        : status === "cancelled"
          ? t("cancel")
          : status === "failed"
            ? t("invalidGen7SosInput")
            : t("ready");

  return (
    <form className="gen7sos-panel" onSubmit={submit}>
      <div className="gen7sos-mode-tabs" role="tablist">
        <button
          className={mode === "pokemon" ? "active" : ""}
          onClick={() => setMode("pokemon")}
          role="tab"
          type="button"
        >
          {t("gen7SosPokemonMode")}
        </button>
        <button
          className={mode === "calls" ? "active" : ""}
          onClick={() => setMode("calls")}
          role="tab"
          type="button"
        >
          {t("gen7SosCallsMode")}
        </button>
      </div>
      <div className="gen7sos-workspace">
        <section className="panel gen7sos-controls">
          <header className="gen7sos-heading">
            <div>
              <Play aria-hidden="true" size={18} />
              <h2>{t("gen7SosSetup")}</h2>
            </div>
            <strong>{statusText}</strong>
          </header>
          <div className="gen7sos-section">
            <h3>{t("rngInfo")}</h3>
            <div className="gen7sos-grid">
              {mode === "pokemon" && (
                <label className="field">
                  <span>{t("gen7GameVersion")}</span>
                  <select
                    value={version}
                    onChange={(event) =>
                      setVersion(event.target.value as Gen7WildGameVersion)
                    }
                  >
                    <option value="sun">{t("gen7Sun")}</option>
                    <option value="moon">{t("gen7Moon")}</option>
                    <option value="ultra-sun">{t("gen7UltraSun")}</option>
                    <option value="ultra-moon">{t("gen7UltraMoon")}</option>
                  </select>
                </label>
              )}
              <label className="field">
                <span>{t("seed")}</span>
                <input
                  inputMode="text"
                  value={seed}
                  onChange={(event) =>
                    setSeed(normalizeHexInput(event.target.value, 8))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen7SosFrame")}</span>
                <input
                  inputMode="numeric"
                  value={minFrame}
                  onChange={(event) =>
                    setMinFrame(normalizeDecimalInput(event.target.value, 8))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen7StationaryMaxFrame")}</span>
                <input
                  inputMode="numeric"
                  value={maxFrame}
                  onChange={(event) =>
                    setMaxFrame(normalizeDecimalInput(event.target.value, 8))
                  }
                />
              </label>
              {mode === "calls" && (
                <label className="field">
                  <span>{t("delay")}</span>
                  <input
                    inputMode="numeric"
                    value={callsDelay}
                    onChange={(event) =>
                      setCallsDelay(
                        normalizeDecimalInput(event.target.value, 5),
                      )
                    }
                  />
                </label>
              )}
              {mode === "pokemon" && (
                <>
                  <label className="field">
                    <span>TSV</span>
                    <input
                      inputMode="numeric"
                      value={tsv}
                      onChange={(event) =>
                        setTsv(normalizeDecimalInput(event.target.value, 4))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>TRV</span>
                    <input
                      inputMode="numeric"
                      value={trv}
                      onChange={(event) =>
                        setTrv(normalizeDecimalInput(event.target.value, 2))
                      }
                    />
                  </label>
                </>
              )}
            </div>
            {mode === "pokemon" && (
              <div className="gen7sos-toggle-grid">
                <label className="check-row">
                  <input
                    checked={shinyCharm}
                    onChange={(event) => setShinyCharm(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("gen7StationaryShinyCharm")}</span>
                </label>
              </div>
            )}
          </div>

          {mode === "pokemon" ? (
            <>
              <div className="gen7sos-section">
                <h3>{t("gen7SosEncounter")}</h3>
                <div className="gen7sos-grid">
                  <label className="field">
                    <span>{t("gen7WildLocation")}</span>
                    <select
                      value={selectedArea?.id ?? ""}
                      onChange={(event) => setAreaId(event.target.value)}
                    >
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {gen7SosLocationName(area, language)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("gen7WildTime")}</span>
                    <select
                      value={night ? "night" : "day"}
                      onChange={(event) =>
                        setNight(event.target.value === "night")
                      }
                    >
                      <option value="day">{t("gen7WildDay")}</option>
                      <option value="night">{t("gen7WildNight")}</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("gen7SosCaller")}</span>
                    <select
                      value={selectedCaller}
                      onChange={(event) =>
                        setCaller(Number(event.target.value))
                      }
                    >
                      {callers.map((value) => (
                        <option key={value} value={value}>
                          {gen7SosSpeciesName(value, language)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("gen7SosWeather")}</span>
                    <select
                      value={weather}
                      onChange={(event) =>
                        setWeather(event.target.value as Gen7SosWeather)
                      }
                    >
                      <option value="none">{t("none")}</option>
                      <option value="rain">Rain</option>
                      <option value="hail">Hail</option>
                      <option value="sand">Sandstorm</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("gen7SosSeed")}</span>
                    <input
                      value={sosSeed}
                      onChange={(event) =>
                        setSosSeed(normalizeHexInput(event.target.value, 8))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>{t("gen7SosFrame")}</span>
                    <input
                      inputMode="numeric"
                      value={sosFrame}
                      onChange={(event) =>
                        setSosFrame(
                          normalizeDecimalInput(event.target.value, 7),
                        )
                      }
                    />
                  </label>
                </div>
                <div className="gen7sos-slot-grid">
                  {slots.map((slot, index) => (
                    <span
                      key={`${slot.specForm}-${index}`}
                      className={slot.species === 0 ? "empty" : ""}
                    >
                      {index + 1}.{" "}
                      {slot.species === 0
                        ? "-"
                        : gen7SosSpeciesName(slot.specForm, language)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="gen7sos-section">
                <h3>{t("gen7SosBattle")}</h3>
                <div className="gen7sos-grid">
                  <label className="field">
                    <span>{t("gen7SosChain")}</span>
                    <input
                      inputMode="numeric"
                      value={chainLength}
                      onChange={(event) =>
                        setChainLength(
                          normalizeDecimalInput(event.target.value, 3),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    <span>{t("gen7WildLevelMin")}</span>
                    <input
                      inputMode="numeric"
                      value={levelMin}
                      onChange={(event) =>
                        setLevelMin(
                          normalizeDecimalInput(event.target.value, 3),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    <span>{t("gen7WildLevelMax")}</span>
                    <input
                      inputMode="numeric"
                      value={levelMax}
                      onChange={(event) =>
                        setLevelMax(
                          normalizeDecimalInput(event.target.value, 3),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    <span>{t("gen7WildLead")}</span>
                    <select
                      value={lead}
                      onChange={(event) =>
                        setLead(event.target.value as Gen7SosLead)
                      }
                    >
                      {LEADS.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {lead === "synchronize" && (
                    <label className="field">
                      <span>{t("gen7StationarySyncNature")}</span>
                      <select
                        value={syncNature}
                        onChange={(event) => setSyncNature(event.target.value)}
                      >
                        <option value="">-</option>
                        {natureOptions.map((entry) => (
                          <option key={entry.value} value={entry.value}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="field">
                    <span>{t("gen7WildNpc")}</span>
                    <input
                      inputMode="numeric"
                      value={npc}
                      onChange={(event) =>
                        setNpc(normalizeDecimalInput(event.target.value, 3))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>{t("gen7SosMainDelay")}</span>
                    <input
                      inputMode="numeric"
                      value={delayTime}
                      onChange={(event) =>
                        setDelayTime(
                          normalizeDecimalInput(event.target.value, 4),
                        )
                      }
                    />
                  </label>
                </div>
                <div className="gen7sos-toggle-grid">
                  <label className="check-row">
                    <input
                      checked={considerDelay}
                      onChange={(event) =>
                        setConsiderDelay(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>{t("gen7WildConsiderDelay")}</span>
                  </label>
                </div>
                <div className="gen7sos-grid">
                  <label className="field">
                    <span>Call Rate</span>
                    <select
                      value={callRate}
                      onChange={(event) => setCallRate(event.target.value)}
                    >
                      {[0, 3, 6, 9, 15].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>HP Bar Color</span>
                    <select
                      value={hpBonus}
                      onChange={(event) => setHpBonus(event.target.value)}
                    >
                      <option value="1">Green</option>
                      <option value="3">Yellow</option>
                      <option value="5">Red</option>
                    </select>
                  </label>
                </div>
                <div className="gen7sos-toggle-grid">
                  <label className="check-row">
                    <input
                      checked={adrenalineOrb}
                      onChange={(event) =>
                        setAdrenalineOrb(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>Adrenaline Orb</span>
                  </label>
                  <label className="check-row">
                    <input
                      checked={intimidate}
                      onChange={(event) => setIntimidate(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Intimidate</span>
                  </label>
                  <label className="check-row">
                    <input
                      checked={lastCallSucceeded}
                      onChange={(event) =>
                        setLastCallSucceeded(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>Last Turn: Called</span>
                  </label>
                  <label className="check-row">
                    <input
                      checked={lastCallFailed}
                      onChange={(event) =>
                        setLastCallFailed(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>Last Turn: Called and Failed</span>
                  </label>
                  <label className="check-row">
                    <input
                      checked={superEffective}
                      onChange={(event) =>
                        setSuperEffective(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>Super Effective</span>
                  </label>
                </div>
                <p className="gen7sos-rate">
                  Rate 1: {callRates.rate1}% / Rate 2: {callRates.rate2}%
                </p>
              </div>
            </>
          ) : (
            <div className="gen7sos-section">
              <h3>{t("gen7SosBattle")}</h3>
              <div className="gen7sos-grid">
                <label className="field">
                  <span>{t("gen7SosChain")}</span>
                  <input
                    inputMode="numeric"
                    value={chainLength}
                    onChange={(event) =>
                      setChainLength(
                        normalizeDecimalInput(event.target.value, 3),
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>{t("gen7WildLevelMin")}</span>
                  <input
                    inputMode="numeric"
                    value={levelMin}
                    onChange={(event) =>
                      setLevelMin(normalizeDecimalInput(event.target.value, 3))
                    }
                  />
                </label>
                <label className="field">
                  <span>{t("gen7WildLevelMax")}</span>
                  <input
                    inputMode="numeric"
                    value={levelMax}
                    onChange={(event) =>
                      setLevelMax(normalizeDecimalInput(event.target.value, 3))
                    }
                  />
                </label>
                <label className="field">
                  <span>Call Rate</span>
                  <select
                    value={callRate}
                    onChange={(event) => setCallRate(event.target.value)}
                  >
                    {[0, 3, 6, 9, 15].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>HP Bar Color</span>
                  <select
                    value={hpBonus}
                    onChange={(event) => setHpBonus(event.target.value)}
                  >
                    <option value="1">Green</option>
                    <option value="3">Yellow</option>
                    <option value="5">Red</option>
                  </select>
                </label>
                <label className="field">
                  <span>{t("gen7SosExistingIvs")}</span>
                  <MultiCheckSelect
                    anyLabel={t("any")}
                    label=""
                    mask={existingPerfectIvMask}
                    onChange={setExistingPerfectIvMask}
                    options={IV_KEYS.map((label, value) => ({ label, value }))}
                    resetHint={t("checkListResetHint")}
                  />
                </label>
              </div>
              <div className="gen7sos-toggle-grid">
                <label className="check-row">
                  <input
                    checked={weather !== "none"}
                    onChange={(event) =>
                      setWeather(event.target.checked ? "rain" : "none")
                    }
                    type="checkbox"
                  />
                  <span>Weather</span>
                </label>
                <label className="check-row">
                  <input
                    checked={adrenalineOrb}
                    onChange={(event) => setAdrenalineOrb(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Adrenaline Orb</span>
                </label>
                <label className="check-row">
                  <input
                    checked={intimidate}
                    onChange={(event) => setIntimidate(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Intimidate</span>
                </label>
                <label className="check-row">
                  <input
                    checked={lastCallSucceeded}
                    onChange={(event) =>
                      setLastCallSucceeded(event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>Last Turn: Called</span>
                </label>
                <label className="check-row">
                  <input
                    checked={lastCallFailed}
                    onChange={(event) =>
                      setLastCallFailed(event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>Last Turn: Called and Failed</span>
                </label>
                <label className="check-row">
                  <input
                    checked={superEffective}
                    onChange={(event) =>
                      setSuperEffective(event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>Super Effective</span>
                </label>
              </div>
              <p className="gen7sos-rate">
                Rate 1: {callRates.rate1}% / Rate 2: {callRates.rate2}%
              </p>
            </div>
          )}

          <details className="gen7sos-disclosure" open>
            <summary>{t("filters")}</summary>
            {mode === "pokemon" ? (
              <fieldset className="gen7sos-filter-content">
                <div className="gen7sos-grid">
                  <label className="field">
                    <span>{t("shiny")}</span>
                    <select
                      value={shinyFilter}
                      onChange={(event) =>
                        setShinyFilter(event.target.value as Gen7SosShinyFilter)
                      }
                    >
                      <option value="any">{t("any")}</option>
                      <option value="shiny">{t("shiny")}</option>
                      <option value="square">{t("shinySquare")}</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("gender")}</span>
                    <select
                      value={genderFilter}
                      onChange={(event) =>
                        setGenderFilter(
                          event.target.value as Gen7SosGenderFilter,
                        )
                      }
                    >
                      <option value="any">{t("any")}</option>
                      <option value="male">{t("male")}</option>
                      <option value="female">{t("female")}</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("ability")}</span>
                    <select
                      value={abilityFilter}
                      onChange={(event) =>
                        setAbilityFilter(
                          event.target.value as Gen7SosAbilityFilter,
                        )
                      }
                    >
                      <option value="any">{t("any")}</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="hidden">
                        {t("gen7StationaryHiddenAbility")}
                      </option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("gen7WildMark")}</span>
                    <select
                      value={blinkFilter}
                      onChange={(event) =>
                        setBlinkFilter(event.target.value as Gen7SosBlinkFilter)
                      }
                    >
                      <option value="any">{t("any")}</option>
                      <option value="blink">{t("gen7WildBlinkOnly")}</option>
                      <option value="safe">{t("gen7WildSafeOnly")}</option>
                    </select>
                  </label>
                  <MultiCheckSelect
                    anyLabel={t("any")}
                    label={t("nature")}
                    mask={natureMask}
                    onChange={setNatureMask}
                    options={natureOptions}
                    resetHint={t("checkListResetHint")}
                  />
                  <MultiCheckSelect
                    anyLabel={t("any")}
                    label={t("hiddenPower")}
                    mask={hiddenPowerMask}
                    onChange={setHiddenPowerMask}
                    options={POWER_KEYS.map((key, value) => ({
                      label: t(key),
                      value,
                    }))}
                    resetHint={t("checkListResetHint")}
                  />
                  <MultiCheckSelect
                    anyLabel={t("any")}
                    label={t("gen7WildEncounterSlot")}
                    mask={slotMask}
                    onChange={setSlotMask}
                    options={slotOptions}
                    resetHint={t("checkListResetHint")}
                  />
                  <label className="field">
                    <span>{t("level")}</span>
                    <input
                      inputMode="numeric"
                      value={levelFilter}
                      onChange={(event) =>
                        setLevelFilter(
                          normalizeDecimalInput(event.target.value, 3),
                        )
                      }
                    />
                  </label>
                </div>
                <div className="gen7sos-iv-table">
                  <div className="header">
                    <span>{t("ivs")}</span>
                    <span>{t("minimum")}</span>
                    <span>{t("maximum")}</span>
                  </div>
                  {IV_KEYS.map((label, index) => (
                    <label key={label}>
                      <span>{label}</span>
                      <input
                        value={ivMin[index]}
                        onChange={(event) =>
                          setIvMin(
                            (current) =>
                              current.map((value, currentIndex) =>
                                currentIndex === index
                                  ? normalizeDecimalInput(event.target.value, 2)
                                  : value,
                              ) as IvText,
                          )
                        }
                      />
                      <input
                        value={ivMax[index]}
                        onChange={(event) =>
                          setIvMax(
                            (current) =>
                              current.map((value, currentIndex) =>
                                currentIndex === index
                                  ? normalizeDecimalInput(event.target.value, 2)
                                  : value,
                              ) as IvText,
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="gen7sos-grid">
                  <label className="field">
                    <span>{t("gen7SosPerfectValue")}</span>
                    <input
                      value={perfectIvValue}
                      onChange={(event) =>
                        setPerfectIvValue(
                          normalizeDecimalInput(event.target.value, 2),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    <span>{t("gen7SosPerfectCount")}</span>
                    <input
                      value={perfectIvCount}
                      onChange={(event) =>
                        setPerfectIvCount(
                          normalizeDecimalInput(event.target.value, 1),
                        )
                      }
                    />
                  </label>
                </div>
              </fieldset>
            ) : (
              <fieldset className="gen7sos-filter-content">
                <div className="gen7sos-toggle-grid">
                  <label className="check-row">
                    <input
                      checked={successOnly}
                      onChange={(event) => setSuccessOnly(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Success Only</span>
                  </label>
                  <label className="check-row">
                    <input
                      checked={syncOnly}
                      onChange={(event) => setSyncOnly(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Sync Success</span>
                  </label>
                  <label className="check-row">
                    <input
                      checked={hiddenAbilityOnly}
                      onChange={(event) =>
                        setHiddenAbilityOnly(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>Hidden Ability</span>
                  </label>
                </div>
                <div className="gen7sos-grid">
                  <MultiCheckSelect
                    anyLabel={t("any")}
                    label={t("gen7WildEncounterSlot")}
                    mask={slotMask}
                    onChange={setSlotMask}
                    options={callSlotOptions}
                    resetHint={t("checkListResetHint")}
                  />
                  <label className="field">
                    <span>{t("level")}</span>
                    <input
                      value={levelFilter}
                      onChange={(event) =>
                        setLevelFilter(
                          normalizeDecimalInput(event.target.value, 3),
                        )
                      }
                    />
                  </label>
                </div>
              </fieldset>
            )}
          </details>
          <label className="check-row gen7sos-disable-filter">
            <input
              checked={filtersDisabled}
              onChange={(event) => setFiltersDisabled(event.target.checked)}
              type="checkbox"
            />
            <span>{t("disableFilters")}</span>
          </label>
          <div className="gen7sos-run-actions">
            {status === "calculating" ? (
              <button
                className="gen7sos-primary"
                onClick={cancel}
                type="button"
              >
                <Square aria-hidden="true" size={17} />
                {t("cancel")}
              </button>
            ) : (
              <button className="gen7sos-primary" type="submit">
                <Play aria-hidden="true" size={17} />
                {t("generate")}
              </button>
            )}
          </div>
        </section>

        <section className="panel gen7sos-results">
          <header className="gen7sos-heading">
            <div>
              <h2>{t("results")}</h2>
              <span>{filteredResults.length}</span>
            </div>
            <div className="gen7sos-result-actions">
              <button
                aria-label={t("exportCsv")}
                className="gen7sos-icon-button"
                disabled={filteredResults.length === 0}
                onClick={exportCsv}
                title={t("exportCsv")}
                type="button"
              >
                <Download aria-hidden="true" size={18} />
              </button>
              <button
                aria-label={t("clear")}
                className="gen7sos-icon-button"
                disabled={
                  filteredResults.length === 0 || status === "calculating"
                }
                onClick={() => setResults([])}
                title={t("clear")}
                type="button"
              >
                <Trash2 aria-hidden="true" size={18} />
              </button>
              {mode === "calls" && (
                <button
                  aria-label="Find Path for index"
                  className="gen7sos-icon-button"
                  disabled={
                    selectedFrame === undefined ||
                    pathBusy ||
                    status === "calculating"
                  }
                  onClick={findPath}
                  title="Find Path for index"
                  type="button"
                >
                  <GitBranch aria-hidden="true" size={18} />
                </button>
              )}
            </div>
          </header>
          <div className="gen7sos-summary">
            <span>
              {progress.processedStates.toLocaleString()} /{" "}
              {progress.totalStates.toLocaleString()}
            </span>
            <span>
              {summary
                ? `${t("elapsed")}: ${summary.elapsedMs.toFixed(0)} ms`
                : ""}
            </span>
            {summary?.resultLimitReached && (
              <strong>{t("limitReached")}</strong>
            )}
          </div>
          {pathBusy && (
            <p className="gen7sos-path-status">{t("gen7SosPathCalculating")}</p>
          )}
          {pathText && (
            <pre className="gen7sos-path" role="status">
              {pathText}
            </pre>
          )}
          {error && (
            <p className="gen7sos-error" role="alert">
              {error}
            </p>
          )}
          <div className="gen7sos-table" ref={tableRef}>
            <div
              className="gen7sos-table-head"
              style={{ width: `${columns.length * 112}px` }}
            >
              {columns.map((column) => (
                <button
                  key={column.key}
                  onClick={() =>
                    setSort((current) => ({
                      key: column.key,
                      direction:
                        current.key === column.key &&
                        current.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                  type="button"
                >
                  {column.label}
                  {sort.key === column.key
                    ? sort.direction === "asc"
                      ? " ↑"
                      : " ↓"
                    : ""}
                </button>
              ))}
            </div>
            {sortedResults.length === 0 ? (
              <div className="gen7sos-empty">{t("emptyGen7Sos")}</div>
            ) : (
              <div
                className="gen7sos-table-body"
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: `${columns.length * 112}px`,
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const result = sortedResults[virtualRow.index];
                  return (
                    <button
                      className={
                        selectedFrame === result.frame
                          ? "gen7sos-table-row selected"
                          : "gen7sos-table-row"
                      }
                      key={`${result.frame}-${virtualRow.index}`}
                      onClick={() => setSelectedFrame(result.frame)}
                      style={{
                        transform: `translateY(${virtualRow.start}px)`,
                        width: `${columns.length * 112}px`,
                      }}
                      type="button"
                    >
                      {columns.map((column) => (
                        <span
                          key={column.key}
                          title={String(resultCell(result, column.key))}
                        >
                          {resultCell(result, column.key)}
                        </span>
                      ))}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </form>
  );
}

function resultSortValue(result: Gen7SosResult, key: string): unknown {
  if (result.mode === "pokemon") {
    const index = IV_SORT_KEYS.indexOf(key as (typeof IV_SORT_KEYS)[number]);
    if (index >= 0) return result.ivs[index];
  }
  return result[key as keyof Gen7SosResult];
}
