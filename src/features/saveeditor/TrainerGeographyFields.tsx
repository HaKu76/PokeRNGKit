import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Select } from "../shared/Select";
import {
  changeTrainerCountry,
  trainerGeographyChoices,
  type OriginChoice,
  type SaveReport,
  type TrainerDraft,
} from "./domain";
import type { saveEditorResources } from "./locales";

export function TrainerGeographyFields({
  report,
  draft,
  onChange,
  disabled = false,
}: {
  report: SaveReport;
  draft: TrainerDraft;
  onChange(value: TrainerDraft): void;
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const geo = report.trainer.geography;
  const [regionSource, setRegionSource] = useState(
    String(geo?.value.country ?? 0),
  );
  if (!geo) return null;
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const sourceGen6 = ["SAV6XY", "SAV6AO"].includes(report.format);
  const shownCountry =
    sourceGen6 && draft.country === "0" ? regionSource : draft.country;
  const regions = trainerGeographyChoices(report, lang, shownCountry);
  const options = (choices: OriginChoice[], value: string) => (
    <>
      {!choices.some((c) => String(c.id) === value) && (
        <option value={value}>#{value}</option>
      )}
      {choices.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name[lang] || `#${c.id}`}
        </option>
      ))}
    </>
  );
  return (
    <>
      <label className="field">
        <span>{words.historyCountry}</span>
        <Select
          value={draft.country}
          disabled={disabled}
          onChange={(e) => {
            const country = e.target.value;
            onChange(
              changeTrainerCountry(
                draft,
                report,
                country,
                lang,
                sourceGen6 ? shownCountry : draft.country,
              ),
            );
            if (country !== "0" || !geo.keepRegionWhenCountryZero)
              setRegionSource(country);
          }}
        >
          {options(trainerGeographyChoices(report, lang), draft.country)}
        </Select>
      </label>
      <label className="field">
        <span>{words.historyRegion}</span>
        <Select
          value={draft.region}
          disabled={
            disabled ||
            (!sourceGen6 &&
              draft.country === "0" &&
              geo.keepRegionWhenCountryZero) ||
            regions.length === 0
          }
          onChange={(e) => onChange({ ...draft, region: e.target.value })}
        >
          {options(regions, draft.region)}
        </Select>
      </label>
      {geo.consoles.length > 0 && (
        <label className="field">
          <span>{words.trainerConsoleRegion}</span>
          <Select
            value={draft.consoleRegion}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...draft, consoleRegion: e.target.value })
            }
          >
            {options(geo.consoles, draft.consoleRegion)}
          </Select>
        </label>
      )}
    </>
  );
}
