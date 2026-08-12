import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import {
  ENCOUNTER_LOOKUP_GAMES,
  findEncounterLookup,
  getEncounterLookupGameName,
  getEncounterLookupSpecies,
  type EncounterLookupResult,
  type EncounterLookupType,
} from "./domain";
import type { EncounterLookupGame, EncounterLookupLanguage } from "./data";

const ENCOUNTER_LABELS: Record<EncounterLookupType, string> = {
  0: "encounterLookupGrass",
  1: "encounterLookupSurfing",
  2: "encounterLookupOldRod",
  3: "encounterLookupGoodRod",
  4: "encounterLookupSuperRod",
  5: "encounterLookupRockSmash",
  6: "encounterLookupHeadbutt",
  7: "encounterLookupBugContest",
};

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

interface EncounterLookupPanelProps {
  expanded: boolean;
  onExpandedChange(expanded: boolean): void;
}

export function EncounterLookupPanel({
  expanded,
  onExpandedChange,
}: EncounterLookupPanelProps) {
  const { t, i18n } = useTranslation();
  const panelRef = useRef<HTMLElement>(null);
  const language: EncounterLookupLanguage =
    i18n.language === "ja" || i18n.language === "en" ? i18n.language : "zh";
  const [game, setGame] = useState<EncounterLookupGame>("ruby");
  const [species, setSpecies] = useState(1);
  const [pokemonInput, setPokemonInput] = useState({
    language,
    text: getEncounterLookupSpecies("ruby", language)[0]?.name ?? "",
  });
  const [query, setQuery] = useState<{
    game: EncounterLookupGame;
    species: number;
  }>();

  const speciesOptions = useMemo(
    () => getEncounterLookupSpecies(game, language),
    [game, language],
  );
  const displayedPokemon =
    pokemonInput.language === language
      ? pokemonInput.text
      : (speciesOptions[(species > 0 ? species : 1) - 1]?.name ?? "");
  const sortedResults = useMemo(() => {
    const results: EncounterLookupResult[] = query
      ? findEncounterLookup(query.game, query.species, language)
      : [];
    return results.sort((left, right) => {
      const location = left.locationId - right.locationId;
      if (location !== 0) return location;
      const encounter = compareText(
        t(ENCOUNTER_LABELS[left.encounter]),
        t(ENCOUNTER_LABELS[right.encounter]),
      );
      if (encounter !== 0) return encounter;
      const minimum = left.minLevel - right.minLevel;
      return minimum !== 0 ? minimum : left.maxLevel - right.maxLevel;
    });
  }, [language, query, t]);

  useEffect(() => {
    if (!expanded) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        onExpandedChange(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [expanded, onExpandedChange]);

  const changeGame = (nextGame: EncounterLookupGame) => {
    const nextOptions = getEncounterLookupSpecies(nextGame, language);
    const nextSpecies =
      species > 0 && species <= nextOptions.length ? species : 1;
    setGame(nextGame);
    setSpecies(nextSpecies);
    setPokemonInput({
      language,
      text: nextOptions[nextSpecies - 1]?.name ?? "",
    });
    setQuery(undefined);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery({ game, species });
  };

  return (
    <aside
      aria-label={t("encounterLookupModule")}
      className={`encounter-lookup-display${expanded ? "" : " collapsed"}`}
      ref={panelRef}
    >
      <button
        aria-controls="encounter-lookup-body"
        aria-expanded={expanded}
        aria-label={t(expanded ? "collapse" : "encounterLookupModule")}
        className="floating-tool-heading"
        onClick={() => onExpandedChange(!expanded)}
        title={t(expanded ? "collapse" : "encounterLookupModule")}
        type="button"
      >
        <strong>{t("encounterLookupModule")}</strong>
        <span aria-hidden="true" className="floating-tool-trigger-icon">
          {expanded ? "×" : "+"}
        </span>
      </button>
      {expanded && (
        <div className="encounter-lookup-body" id="encounter-lookup-body">
          <form className="encounter-lookup-form" onSubmit={submit}>
            <label className="field encounter-lookup-pokemon-field">
              <span>{t("encounterLookupPokemon")}</span>
              <AutoCompleteComboBox
                inputValue={displayedPokemon}
                label={t("encounterLookupPokemon")}
                onInputChange={(text) => {
                  setPokemonInput({ language, text });
                  setQuery(undefined);
                }}
                onValueChange={(value) => {
                  setSpecies(value);
                  setQuery(undefined);
                }}
                options={speciesOptions.map((option) => ({
                  label: option.name,
                  value: option.id,
                }))}
                value={species}
              />
            </label>
            <label className="field">
              <span>{t("encounterLookupGame")}</span>
              <select
                onChange={(event) =>
                  changeGame(event.target.value as EncounterLookupGame)
                }
                value={game}
              >
                {ENCOUNTER_LOOKUP_GAMES.map((option) => (
                  <option key={option.game} value={option.game}>
                    {getEncounterLookupGameName(option.game, language)}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="primary-action encounter-lookup-submit"
              type="submit"
            >
              {t("encounterLookupFind")}
            </button>
          </form>

          <div className="encounter-lookup-table-shell">
            <table className="encounter-lookup-table">
              <thead>
                <tr>
                  <th>{t("encounterLookupLocation")}</th>
                  <th>{t("encounterLookupType")}</th>
                  <th>{t("encounterLookupLevelRange")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((result) => (
                  <tr
                    key={`${result.locationId}-${result.encounter}-${result.minLevel}-${result.maxLevel}`}
                  >
                    <td>{result.location}</td>
                    <td>{t(ENCOUNTER_LABELS[result.encounter])}</td>
                    <td>{`${result.minLevel}-${result.maxLevel}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </aside>
  );
}
