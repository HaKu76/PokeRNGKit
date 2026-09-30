import { PokemonTrainingEditor } from "./PokemonTrainingEditor";
import { PokemonHistoryEditor } from "./PokemonHistoryEditor";
import { PokemonMemoryEditor } from "./PokemonMemoryEditor";
import { PokemonRibbonEditor } from "./PokemonRibbonEditor";
import { PokemonRelearnEditor } from "./PokemonRelearnEditor";
import { PokemonShinyEditor } from "./PokemonShinyEditor";
import { PokemonEggEditor } from "./PokemonEggEditor";
import { PokemonOriginEditor } from "./PokemonOriginEditor";
import { PokemonEncounterEditor } from "./PokemonEncounterEditor";
import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { PokemonFileTools } from "./PokemonFileTools";
import { PokemonRawEditor } from "./PokemonRawEditor";
import { PokemonFormArgumentEditor } from "./PokemonFormArgumentEditor";
import { StorageEditor } from "./StorageEditor";
import { BoxEditor } from "./BoxEditor";
import { BoxArchiveEditor } from "./BoxArchiveEditor";
import { BoxImportEditor } from "./BoxImportEditor";
import { BoxBinaryEditor, type BoxBinaryActions } from "./BoxBinaryEditor";
import type { BoxImportOptions, BoxImportConfirmation } from "./boxImport";
import type { BoxArchiveRequest } from "./boxArchive";
import { PokemonLegality } from "./PokemonLegality";
import { PokemonEditor, type PokemonEdit } from "./PokemonEditor";
import { boxWallpaper, pokemonImage } from "./art";
import { Select } from "../shared/Select";
import type {
  OriginCatalog,
  LocalizedText,
  BoxEdit,
  StorageEdit,
  SaveReport,
  PokemonLegalityReport,
  PokemonPosition,
  PokemonRawEdit,
} from "./domain";
import type { saveEditorResources } from "./locales";

export function SavePokemonBrowser({
  report,
  revision,
  busy,
  onApply,
  onApplyRaw,
  legality,
  onReadOrigin,
  onSuggestRelearn,
  onReadRibbons,
  onReadHistory,
  onReadMemory,
  onAnalyze,
  onApplyBox,
  onStorage,
  onImport,
  onExport,
  onExportBoxes,
  onPreviewBoxImport,
  onApplyBoxImport,
  onDiscardBoxImport,
  onPreviewBoxBinary,
  onApplyBoxBinary,
  onDiscardBoxBinary,
  onExportBoxBinary,
}: {
  report: SaveReport;
  revision: number;
  busy: boolean;
  onApply(edit: PokemonEdit): Promise<void>;
  onApplyRaw(edit: PokemonRawEdit): Promise<void>;
  onApplyBox(edit: BoxEdit): Promise<void>;
  onStorage(edit: StorageEdit): Promise<void>;
  onImport(position: PokemonPosition, file: File): Promise<void>;
  onExport(position: PokemonPosition): Promise<void>;
  onExportBoxes(request: BoxArchiveRequest): Promise<boolean>;
  onPreviewBoxImport(
    files: File[],
    options: BoxImportOptions,
  ): Promise<import("./domain").SaveEditorResult | undefined>;
  onApplyBoxImport(confirmation: BoxImportConfirmation): Promise<void>;
  onDiscardBoxImport(token: string): void;
  onPreviewBoxBinary: BoxBinaryActions["onPreviewBoxBinary"];
  onApplyBoxBinary: BoxBinaryActions["onApplyBoxBinary"];
  onDiscardBoxBinary: BoxBinaryActions["onDiscardBoxBinary"];
  onExportBoxBinary: BoxBinaryActions["onExportBoxBinary"];
  legality?: PokemonLegalityReport;
  onSuggestRelearn(position: PokemonPosition): Promise<number[] | undefined>;
  onReadHistory(
    position: PokemonPosition,
  ): Promise<import("./domain").HistoryCatalog | undefined>;
  onReadMemory(
    query: import("./domain").MemoryQuery,
  ): Promise<import("./domain").MemoryCatalog | undefined>;
  onReadRibbons(
    position: PokemonPosition,
  ): Promise<import("./domain").RibbonCatalog | undefined>;
  onReadOrigin(
    position: PokemonPosition,
    version?: number,
  ): Promise<OriginCatalog | undefined>;
  onAnalyze(position: PokemonPosition): Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const name = (value: LocalizedText) => value[lang];
  const [box, setBox] = useState(-1);
  const [slot, setSlot] = useState<number>();
  const entries = report.pokemon.filter((p) => p.box === box);
  const selected =
    slot === undefined ? entries[0] : entries.find((p) => p.slot === slot);
  const filePosition = {
    box,
    slot:
      box === -1
        ? Math.min(slot ?? selected?.slot ?? 0, report.partyCount)
        : (slot ?? selected?.slot ?? 0),
  };
  const stats = [
    words.hp,
    words.attack,
    words.defense,
    words.spAttack,
    words.spDefense,
    words.speed,
  ];
  return (
    <section className="save-pokemon-browser" aria-label={words.pokemon}>
      <h3>{words.pokemon}</h3>
      <p className="save-editor-note">{words.readPokemon}</p>
      <label className="field">
        <span>
          {words.party} / {words.box}
        </span>
        <Select
          value={box}
          onChange={(e) => {
            setBox(Number(e.target.value));
            setSlot(undefined);
          }}
        >
          <option value={-1}>
            {words.party} ({report.pokemon.filter((p) => p.box === -1).length})
          </option>
          {Array.from({ length: report.boxCount }, (_, i) => (
            <option key={i} value={i}>
              {report.boxes[i]?.name || `${words.box} ${i + 1}`} (
              {report.pokemon.filter((p) => p.box === i).length})
            </option>
          ))}
        </Select>
      </label>
      <div className="save-storage-tools">
        {box >= 0 && report.canEdit && (
          <BoxEditor
            key={JSON.stringify([
              box,
              report.boxes[box],
              report.boxOptions,
              revision,
            ])}
            report={report}
            box={box}
            busy={busy}
            onApply={onApplyBox}
          />
        )}
        {report.boxCount > 0 && report.checksumsValid && (
          <BoxArchiveEditor
            key={`archive-${box}:${revision}`}
            box={box}
            busy={busy}
            onExport={onExportBoxes}
          />
        )}
        {report.boxCount > 0 && report.canEdit && report.checksumsValid && (
          <BoxImportEditor
            key={`import-${box}:${revision}:${lang}`}
            report={report}
            box={box}
            busy={busy}
            lang={lang}
            onPreview={onPreviewBoxImport}
            onApply={onApplyBoxImport}
            onDiscard={onDiscardBoxImport}
          />
        )}
        {report.boxCount > 0 && report.checksumsValid && (
          <BoxBinaryEditor
            key={`binary-${box}:${revision}:${lang}`}
            box={box}
            canEdit={report.canEdit}
            busy={busy}
            lang={lang}
            onPreviewBoxBinary={onPreviewBoxBinary}
            onApplyBoxBinary={onApplyBoxBinary}
            onDiscardBoxBinary={onDiscardBoxBinary}
            onExportBoxBinary={onExportBoxBinary}
          />
        )}
        <PokemonFileTools
          key={`file-${box}:${filePosition.slot}`}
          position={filePosition}
          canImport={report.canEdit}
          canExport={report.checksumsValid && !!selected?.valid}
          busy={busy}
          onImport={async (position, file) => {
            await onImport(position, file);
            setSlot(position.slot);
          }}
          onExport={onExport}
        />
      </div>
      <div className="save-pokemon-workspace">
        <div className="save-pokemon-storage">
          <div
            className="save-pokemon-slots"
            data-party={box === -1}
            style={
              box === -1
                ? undefined
                : ({
                    "--box-wallpaper": `url("${boxWallpaper(report, box)}")`,
                    "--box-columns": Math.max(
                      1,
                      Math.floor(report.boxSlotCount / 5),
                    ),
                  } as CSSProperties)
            }
            aria-label={words.slot}
          >
            {Array.from(
              {
                length:
                  box === -1
                    ? Math.max(6, report.partyCount)
                    : report.boxSlotCount,
              },
              (_, position) => {
                const p = entries.find((entry) => entry.slot === position);
                const label = `${position + 1}. ${p ? name(p.speciesName) : words.empty}`;
                return (
                  <button
                    type="button"
                    key={position}
                    aria-label={label}
                    title={label}
                    aria-pressed={
                      selected?.slot === position || slot === position
                    }
                    onClick={() => setSlot(position)}
                  >
                    <span className="save-pokemon-slot-number">
                      {position + 1}
                    </span>
                    {p && (
                      <>
                        <img
                          src={pokemonImage(p)}
                          alt=""
                          draggable={false}
                          width={68}
                          height={56}
                        />
                        <span className="save-pokemon-slot-state">
                          {!p.valid ? "!" : ""}
                          {p.shiny ? "★" : ""}
                        </span>
                      </>
                    )}
                  </button>
                );
              },
            )}
          </div>
          <p className="save-editor-note">
            {entries.length} / {box === -1 ? 6 : report.boxSlotCount}
          </p>
        </div>
        <div className="save-pokemon-detail">
          {!selected && <p>{words.empty}</p>}
          {selected && (
            <>
              {!selected.valid && (
                <p role="alert" className="save-editor-error">
                  {words.invalidPokemon}
                </p>
              )}
              <div className="save-pokemon-identity">
                <img
                  src={pokemonImage(selected)}
                  alt=""
                  width={68}
                  height={56}
                />
                <h4>
                  {name(selected.speciesName)} · {words.level} {selected.level}
                </h4>
              </div>
              <dl className="save-editor-summary">
                {[
                  [
                    words.species,
                    `${name(selected.speciesName)} #${selected.species}`,
                  ],
                  [words.nickname, selected.nickname || "—"],
                  [words.level, selected.level],
                  [words.form, selected.form],
                  [
                    words.gender,
                    [words.male, words.female, words.genderless][
                      selected.gender
                    ] ?? "—",
                  ],
                  [words.shiny, selected.shiny ? words.yes : words.no],
                  [words.egg, selected.egg ? words.yes : words.no],
                  [words.nature, name(selected.nature)],
                  [words.ability, name(selected.ability)],
                  [words.item, name(selected.item)],
                  [words.originalTrainer, selected.ot],
                  [words.tid, selected.tid],
                  [words.sid, selected.sid],
                  [
                    "PID",
                    selected.pid.toString(16).toUpperCase().padStart(8, "0"),
                  ],
                  [words.experience, selected.experience],
                  [
                    selected.egg ? words.hatchCounter : words.friendship,
                    selected.friendship,
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {report.canEdit && (
                <StorageEditor
                  key={`storage-${JSON.stringify(selected)}`}
                  report={report}
                  source={selected}
                  busy={busy}
                  onApply={onStorage}
                />
              )}
              <PokemonLegality
                position={selected}
                report={legality}
                busy={busy}
                onAnalyze={onAnalyze}
              />
              <PokemonEditor
                key={`pokemon-${JSON.stringify(selected)}`}
                pokemon={selected}
                moveChoices={report.moveChoices}
                attributeChoices={report.attributeChoices}
                disabled={busy || !report.canEdit || !selected.valid}
                onApply={onApply}
              />
              <PokemonEggEditor
                key={`egg-${JSON.stringify(selected)}`}
                egg={selected.eggInfo}
                position={{ box: selected.box, slot: selected.slot }}
                disabled={busy || !report.canEdit || !selected.valid}
                onApply={onApplyRaw}
              />
              <PokemonOriginEditor
                readDisabled={busy || !selected.valid}
                key={`origin-${JSON.stringify(selected)}`}
                origin={selected.origin}
                position={{ box: selected.box, slot: selected.slot }}
                disabled={busy || !report.canEdit || !selected.valid}
                onRead={onReadOrigin}
                onApply={onApplyRaw}
              />
              <PokemonTrainingEditor
                key={`training-${revision}-${JSON.stringify(selected)}`}
                training={selected.training}
                generation={report.generation}
                position={{ box: selected.box, slot: selected.slot }}
                disabled={busy || !report.canEdit || !selected.valid}
                onApply={onApplyRaw}
              />
              <PokemonEncounterEditor
                key={`encounter-${JSON.stringify(selected)}`}
                encounter={selected.encounter}
                position={{ box: selected.box, slot: selected.slot }}
                disabled={busy || !report.canEdit || !selected.valid}
                onApply={onApplyRaw}
              />
              {report.generation >= 6 && (
                <PokemonMemoryEditor
                  readDisabled={busy || !selected.valid}
                  key={`memory-${revision}-${JSON.stringify(selected)}`}
                  position={{ box: selected.box, slot: selected.slot }}
                  disabled={busy || !report.canEdit || !selected.valid}
                  onApply={onApplyRaw}
                  onRead={onReadMemory}
                />
              )}
              {report.generation >= 6 && (
                <PokemonHistoryEditor
                  readDisabled={busy || !selected.valid}
                  key={`history-${revision}-${JSON.stringify(selected)}`}
                  position={{ box: selected.box, slot: selected.slot }}
                  disabled={busy || !report.canEdit || !selected.valid}
                  onRead={onReadHistory}
                  onApply={onApplyRaw}
                />
              )}
              <PokemonRibbonEditor
                readDisabled={busy || !selected.valid}
                key={`ribbons-${revision}-${JSON.stringify(selected)}`}
                position={{ box: selected.box, slot: selected.slot }}
                disabled={busy || !report.canEdit || !selected.valid}
                onApply={onApplyRaw}
                onRead={onReadRibbons}
                generation={report.generation}
              />
              <PokemonRelearnEditor
                key={`relearn-${JSON.stringify(selected)}`}
                moves={selected.relearnMoves}
                choices={report.moveChoices}
                position={{ box: selected.box, slot: selected.slot }}
                disabled={busy || !report.canEdit || !selected.valid}
                onApply={onApplyRaw}
                onSuggest={onSuggestRelearn}
              />
              <PokemonShinyEditor
                key={`shiny-${JSON.stringify(selected)}`}
                position={{ box: selected.box, slot: selected.slot }}
                disabled={busy || !report.canEdit || !selected.valid}
                onApply={onApplyRaw}
              />
              <PokemonRawEditor
                key={`raw-${JSON.stringify(selected)}`}
                pokemon={selected}
                disabled={busy || !report.canEdit || !selected.valid}
                onApply={onApplyRaw}
              />
              {selected.formArgument && (
                <PokemonFormArgumentEditor
                  key={`form-argument-${JSON.stringify(selected)}`}
                  argument={selected.formArgument}
                  position={selected}
                  disabled={busy || !report.canEdit || !selected.valid}
                  onApply={onApplyRaw}
                />
              )}
              <h4>{words.moves}</h4>
              <ul className="save-pokemon-moves">
                {selected.moves.map((move, i) => (
                  <li key={i}>
                    {name(move)} · PP {selected.movePp[i]}
                  </li>
                ))}
              </ul>
              <div className="save-pokemon-stats">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{words.pokemon}</th>
                      {stats.map((s) => (
                        <th scope="col" key={s}>
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">{words.ivs}</th>
                      {selected.ivs.map((v, i) => (
                        <td key={i}>{v}</td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">{words.evs}</th>
                      {selected.evs.map((v, i) => (
                        <td key={i}>{v}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
