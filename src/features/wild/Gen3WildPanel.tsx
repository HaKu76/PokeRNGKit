import { type FormEvent, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatHex, parseDecimal, parseHex } from "../id/domain";
import { GEN3_ENCOUNTERS, GEN3_PERSONAL, GEN3_SPECIES_ZH } from "./gen3Data";

type Game = keyof typeof GEN3_ENCOUNTERS;
type Method = "method1" | "method2" | "method4";
type Lead =
  | "none"
  | "synchronize"
  | "cute-charm-f"
  | "cute-charm-m"
  | "pressure"
  | "magnet-pull"
  | "static";
type EncounterKind =
  "land" | "surf" | "rock-smash" | "old-rod" | "good-rod" | "super-rod";
type WildState = {
  advances: number;
  slot: number;
  species: number;
  level: number;
  pid: number;
  ivs: [number, number, number, number, number, number];
  nature: number;
  shiny: boolean;
};

const natureKeys = [
  "natureHardy",
  "natureLonely",
  "natureBrave",
  "natureAdamant",
  "natureNaughty",
  "natureBold",
  "natureDocile",
  "natureRelaxed",
  "natureImpish",
  "natureLax",
  "natureTimid",
  "natureHasty",
  "natureSerious",
  "natureJolly",
  "natureNaive",
  "natureModest",
  "natureMild",
  "natureQuiet",
  "natureBashful",
  "natureRash",
  "natureCalm",
  "natureGentle",
  "natureSassy",
  "natureCareful",
  "natureQuirky",
] as const;
const kindLabels: Record<EncounterKind, string> = {
  land: "Land",
  surf: "Surf",
  "rock-smash": "Rock Smash",
  "old-rod": "Old Rod",
  "good-rod": "Good Rod",
  "super-rod": "Super Rod",
};
const gameLabels: Record<Game, string> = {
  ruby: "Ruby",
  sapphire: "Sapphire",
  emerald: "Emerald",
  "fire-red": "FireRed",
  "leaf-green": "LeafGreen",
};
const slotRanges: Record<EncounterKind, number[]> = {
  land: [20, 40, 50, 60, 70, 80, 85, 90, 94, 98, 99, 100],
  surf: [60, 90, 95, 99, 100],
  "rock-smash": [60, 90, 95, 99, 100],
  "old-rod": [70, 100],
  "good-rod": [60, 80, 100],
  "super-rod": [40, 80, 95, 99, 100],
};

function next(seed: number) {
  return (Math.imul(seed, 0x41c64e6d) + 0x6073) >>> 0;
}
function nextUShort(seed: number) {
  const state = next(seed);
  return [state, state >>> 16] as const;
}
function slotFor(kind: EncounterKind, value: number) {
  return slotRanges[kind].findIndex((limit) => value < limit);
}
function ivs(first: number, second: number): WildState["ivs"] {
  return [
    first & 31,
    (first >>> 5) & 31,
    (first >>> 10) & 31,
    (second >>> 5) & 31,
    (second >>> 10) & 31,
    second & 31,
  ];
}

export function Gen3WildPanel() {
  const { t } = useTranslation();
  const cancelled = useRef(false);
  const [game, setGame] = useState<Game>("emerald");
  const [kind, setKind] = useState<EncounterKind>("land");
  const [method, setMethod] = useState<Method>("method1");
  const [locationIndex, setLocationIndex] = useState("0");
  const [lead, setLead] = useState<Lead>("none");
  const [leadNature, setLeadNature] = useState("0");
  const [seed, setSeed] = useState("12345678");
  const [initial, setInitial] = useState("0");
  const [maximum, setMaximum] = useState("10000");
  const [offset, setOffset] = useState("0");
  const [tid, setTid] = useState("0");
  const [sid, setSid] = useState("0");
  const [nature, setNature] = useState("-1");
  const [results, setResults] = useState<WildState[]>([]);
  const [processed, setProcessed] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "cancelled" | "failed"
  >("ready");
  const locations = useMemo(
    () =>
      GEN3_ENCOUNTERS[game].filter((location) =>
        location.encounters.some((entry) => entry.kind === kind),
      ),
    [game, kind],
  );
  const selected = locations[Number(locationIndex)]?.encounters.find(
    (entry) => entry.kind === kind,
  );
  const displayResults = useMemo(() => results.slice(0, 10_000), [results]);
  const chooseGame = (value: Game) => {
    setGame(value);
    setLocationIndex("0");
  };
  const chooseKind = (value: EncounterKind) => {
    setKind(value);
    setLocationIndex("0");
  };

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    const input = {
      seed: parseHex(seed),
      initial: parseDecimal(initial),
      max: parseDecimal(maximum),
      offset: parseDecimal(offset),
      tid: parseDecimal(tid),
      sid: parseDecimal(sid),
      nature: Number.parseInt(nature, 10),
      leadNature: Number.parseInt(leadNature, 10),
    };
    if (
      !selected ||
      Object.values(input).some((value) => value === undefined) ||
      !Number.isInteger(input.nature) ||
      input.max! > 50_000 ||
      input.tid! > 65535 ||
      input.sid! > 65535 ||
      input.nature < -1 ||
      input.nature > 24 ||
      input.leadNature < 0 ||
      input.leadNature > 24 ||
      input.initial! + input.offset! + input.max! > 0xffff_ffff
    ) {
      setError(t("invalidWildInput"));
      setStatus("failed");
      return;
    }
    cancelled.current = false;
    setError("");
    setResults([]);
    setProcessed(0);
    setStatus("calculating");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const slots = selected.slots;
    const matchingSlots = slots
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => {
        const personal = GEN3_PERSONAL[entry[0]];
        return lead === "magnet-pull"
          ? personal?.[1] === 8 || personal?.[2] === 8
          : lead === "static" && (personal?.[1] === 12 || personal?.[2] === 12);
      });
    const found: WildState[] = [];
    let base = input.seed!;
    for (let count = 0; count < input.initial! + input.offset!; count++)
      base = next(base);
    const trainerXor = input.tid! ^ input.sid!;
    for (let count = 0; count <= input.max!; count++) {
      if (cancelled.current) break;
      let state = base;
      let value: number;
      if (kind === "rock-smash") {
        [state, value] = nextUShort(state);
        if (value % 2880 >= selected.rate * 16) {
          base = next(base);
          continue;
        }
      }
      let slot: number;
      if (
        (lead === "magnet-pull" || lead === "static") &&
        matchingSlots.length
      ) {
        [state, value] = nextUShort(state);
        if (value % 2 === 0) {
          [state, value] = nextUShort(state);
          slot = matchingSlots[value % matchingSlots.length].index;
        } else {
          [state, value] = nextUShort(state);
          slot = slotFor(kind, value % 100);
        }
      } else {
        [state, value] = nextUShort(state);
        slot = slotFor(kind, value % 100);
      }
      const encounter = slots[slot];
      if (!encounter) {
        base = next(base);
        continue;
      }
      const [species, minLevel, maxLevel] = encounter;
      [state, value] = nextUShort(state);
      const levelRoll = value % (maxLevel - minLevel + 1);
      let level = minLevel + levelRoll;
      if (lead === "pressure") {
        [state, value] = nextUShort(state);
        level =
          value % 2 === 0
            ? maxLevel
            : minLevel + (levelRoll === 0 ? 0 : levelRoll - 1);
      }
      let targetNature: number;
      if (lead === "synchronize") {
        [state, value] = nextUShort(state);
        if (value % 2 === 0) targetNature = input.leadNature;
        else {
          [state, value] = nextUShort(state);
          targetNature = value % 25;
        }
      } else {
        [state, value] = nextUShort(state);
        targetNature = value % 25;
      }
      const genderRatio = GEN3_PERSONAL[species]?.[0] ?? 255;
      let pid: number;
      const cuteCharm =
        (lead === "cute-charm-f" || lead === "cute-charm-m") &&
        genderRatio !== 0 &&
        genderRatio !== 254 &&
        genderRatio !== 255 &&
        (() => {
          const nextValue = nextUShort(state);
          state = nextValue[0];
          return nextValue[1] % 3 !== 0;
        })();
      do {
        let low: number, high: number;
        [state, low] = nextUShort(state);
        [state, high] = nextUShort(state);
        pid = (low | (high << 16)) >>> 0;
      } while (
        pid % 25 !== targetNature ||
        (cuteCharm &&
          (lead === "cute-charm-f"
            ? (pid & 0xff) >= genderRatio
            : (pid & 0xff) < genderRatio))
      );
      if (method === "method2") state = next(state);
      const nextFirst = nextUShort(state);
      state = nextFirst[0];
      const first = nextFirst[1];
      if (method === "method4") state = next(state);
      const second = nextUShort(state)[1];
      const shiny = (((pid >>> 16) ^ (pid & 0xffff) ^ trainerXor) & 0xffff) < 8;
      if (input.nature === -1 || input.nature === targetNature)
        found.push({
          advances: input.initial! + count,
          slot,
          species,
          level,
          pid,
          ivs: ivs(first, second),
          nature: targetNature,
          shiny,
        });
      base = next(base);
      if (count % 500 === 0) {
        setProcessed(count + 1);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
    setProcessed(input.max! + 1);
    setResults(found);
    setStatus(cancelled.current ? "cancelled" : "completed");
  };

  const exportCsv = () => {
    const rows = [
      "Advance,Slot,Pokémon,Level,PID,HP,Atk,Def,SpA,SpD,Spe,Nature,Shiny",
      ...results.map((entry) =>
        [
          entry.advances,
          entry.slot + 1,
          GEN3_SPECIES_ZH[entry.species],
          entry.level,
          formatHex(entry.pid, 8),
          ...entry.ivs,
          t(natureKeys[entry.nature]),
          entry.shiny ? "Yes" : "No",
        ].join(","),
      ),
    ];
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${rows.join("\n")}`], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen3wild.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const statusLabel = {
    ready: t("ready"),
    calculating: t("calculating"),
    completed: t("completed"),
    cancelled: t("cancelled"),
    failed: t("failed"),
  }[status];
  return (
    <>
      <form className="static-control-grid" onSubmit={generate}>
        <section className="panel static-panel static-rng-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("rngInfo")}</h2>
            </div>
            <span className="panel-note">Gen III / Wild</span>
          </div>
          <div className="static-form-stack">
            <div className="mode-tabs static-method-tabs">
              {(["method1", "method2", "method4"] as Method[]).map((entry) => (
                <button
                  className={method === entry ? "mode-tab active" : "mode-tab"}
                  key={entry}
                  onClick={() => setMethod(entry)}
                  type="button"
                >
                  {entry === "method1"
                    ? t("method1")
                    : entry === "method2"
                      ? "Method 2"
                      : t("method4")}
                </button>
              ))}
            </div>
            <label className="field">
              <span>{t("seed")}</span>
              <input
                maxLength={10}
                onChange={(event) => setSeed(event.target.value)}
                value={seed}
              />
            </label>
            <div className="compact-field-row">
              <label className="field">
                <span>{t("initialAdvances")}</span>
                <input
                  onChange={(event) => setInitial(event.target.value)}
                  value={initial}
                />
              </label>
              <label className="field">
                <span>{t("maxAdvances")}</span>
                <input
                  onChange={(event) => setMaximum(event.target.value)}
                  value={maximum}
                />
                <small>MAX / 50,000</small>
              </label>
            </div>
            <label className="field">
              <span>{t("offset")}</span>
              <input
                onChange={(event) => setOffset(event.target.value)}
                value={offset}
              />
            </label>
          </div>
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              {t("generate")}
            </button>
            {status === "calculating" && (
              <button
                className="secondary-action"
                onClick={() => {
                  cancelled.current = true;
                }}
                type="button"
              >
                {t("cancel")}
              </button>
            )}
          </div>
        </section>
        <section className="panel static-panel static-settings-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("wildEncounter")}</h2>
            </div>
            <span className="panel-note">PokeFinder data</span>
          </div>
          <div className="static-form-stack">
            <label className="field">
              <span>Game</span>
              <select
                onChange={(event) => chooseGame(event.target.value as Game)}
                value={game}
              >
                {(Object.keys(gameLabels) as Game[]).map((entry) => (
                  <option key={entry} value={entry}>
                    {gameLabels[entry]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Encounter</span>
              <select
                onChange={(event) =>
                  chooseKind(event.target.value as EncounterKind)
                }
                value={kind}
              >
                {(Object.keys(kindLabels) as EncounterKind[]).map((entry) => (
                  <option key={entry} value={entry}>
                    {kindLabels[entry]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Location</span>
              <select
                onChange={(event) => setLocationIndex(event.target.value)}
                value={locationIndex}
              >
                {locations.map((entry, index) => (
                  <option key={`${entry.name}-${index}`} value={index}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Lead</span>
              <select
                onChange={(event) => setLead(event.target.value as Lead)}
                value={lead}
              >
                <option value="none">None</option>
                <option value="synchronize">Synchronize</option>
                <option value="cute-charm-f">Cute Charm (female)</option>
                <option value="cute-charm-m">Cute Charm (male)</option>
                <option value="pressure">Pressure</option>
                <option value="magnet-pull">Magnet Pull</option>
                <option value="static">Static</option>
              </select>
            </label>
            {lead === "synchronize" && (
              <label className="field">
                <span>Synchronize nature</span>
                <select
                  onChange={(event) => setLeadNature(event.target.value)}
                  value={leadNature}
                >
                  {natureKeys.map((key, index) => (
                    <option key={key} value={index}>
                      {t(key)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="compact-field-row">
              <label className="field">
                <span>{t("tid")}</span>
                <input
                  onChange={(event) => setTid(event.target.value)}
                  value={tid}
                />
              </label>
              <label className="field">
                <span>{t("sid")}</span>
                <input
                  onChange={(event) => setSid(event.target.value)}
                  value={sid}
                />
              </label>
            </div>
          </div>
        </section>
        <section className="panel static-panel static-filter-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">03</span>
              <h2>{t("filters")}</h2>
            </div>
          </div>
          <div className="static-filter-selects">
            <label className="field">
              <span>{t("nature")}</span>
              <select
                onChange={(event) => setNature(event.target.value)}
                value={nature}
              >
                <option value="-1">{t("any")}</option>
                {natureKeys.map((key, index) => (
                  <option key={key} value={index}>
                    {t(key)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      </form>
      <section className="panel results-panel static-results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">04</span>
              <h2>{t("results")}</h2>
            </div>
            <span className={`run-status ${status}`}>{statusLabel}</span>
          </div>
          <div className="result-actions">
            <span className="result-count">
              {results.length.toLocaleString()} / {processed.toLocaleString()}
            </span>
            <button
              className="secondary-action"
              disabled={!results.length}
              onClick={exportCsv}
              type="button"
            >
              {t("exportCsv")}
            </button>
          </div>
        </div>
        {error && <div className="alert error">{error}</div>}
        <div className="table-shell static-table-shell">
          {displayResults.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>{t("emptyStatic")}</span>
            </div>
          ) : (
            <div
              className="static-virtual-table"
              style={{ height: `${displayResults.length * 42 + 38}px` }}
            >
              <div className="static-table-header wild-table-header">
                <span>{t("rowAdvance")}</span>
                <span>{t("wildSlot")}</span>
                <span>{t("pokemon")}</span>
                <span>{t("level")}</span>
                <span>{t("rowPid")}</span>
                <span>IVs</span>
                <span>{t("nature")}</span>
                <span>{t("shiny")}</span>
              </div>
              {displayResults.map((entry, index) => (
                <div
                  className="static-table-row wild-table-row"
                  key={`${entry.advances}-${entry.pid}`}
                  style={{ transform: `translateY(${index * 42 + 38}px)` }}
                >
                  <span>{entry.advances}</span>
                  <span>{entry.slot + 1}</span>
                  <span>{GEN3_SPECIES_ZH[entry.species]}</span>
                  <span>{entry.level}</span>
                  <span>{formatHex(entry.pid, 8)}</span>
                  <span>{entry.ivs.join("/")}</span>
                  <span>{t(natureKeys[entry.nature])}</span>
                  <span>{entry.shiny ? t("shinyAny") : t("shinyNone")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
