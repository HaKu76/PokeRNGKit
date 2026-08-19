import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Check,
  FileVideo,
  KeyRound,
  Trash2,
  Upload,
} from "lucide-react";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";
import {
  formatKeyBvTrv,
  formatKeyBvTsv,
  inspectKeyBvFiles,
  keyBvSpeciesName,
  parseKeyBv,
  type KeyBvResult,
} from "./domain";
import type { Gen7StationaryLanguage } from "../gen7stationary/domain";
import "./KeyBvPanel.css";

interface KeyBvPanelProps {
  readonly expanded: boolean;
  readonly onExpandedChange: (expanded: boolean) => void;
}

function languageOf(language: string): Gen7StationaryLanguage {
  if (language.startsWith("ja")) return "ja";
  if (language.startsWith("zh")) return "zh";
  return "en";
}

export function KeyBvPanel({ expanded, onExpandedChange }: KeyBvPanelProps) {
  const { t, i18n } = useTranslation();
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const [videos, setVideos] = useState<
    readonly [File | undefined, File | undefined]
  >([undefined, undefined]);
  const [result, setResult] = useState<KeyBvResult>();
  const [error, setError] = useState("");
  const validation = inspectKeyBvFiles(videos[0]?.size, videos[1]?.size);
  const language = languageOf(i18n.language);

  const setVideo = (index: 0 | 1, file: File | undefined) => {
    setVideos((current) => {
      const next: [File | undefined, File | undefined] = [
        current[0],
        current[1],
      ];
      next[index] = file;
      return next;
    });
    setResult(undefined);
    setError("");
  };

  const chooseFile = (index: 0 | 1) => {
    inputRefs[index].current?.click();
  };

  const acceptFile = (index: 0 | 1, file: File | undefined) => {
    if (!file) return;
    setVideo(index, file);
  };

  const handleInput = (index: 0 | 1, event: ChangeEvent<HTMLInputElement>) => {
    acceptFile(index, event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (index: 0 | 1, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    acceptFile(index, event.dataTransfer.files[0]);
  };

  const dump = async () => {
    if (!validation.valid || !videos[0] || !videos[1]) {
      setError(t("keyBvPairRequired"));
      return;
    }
    try {
      const [video1, video2] = await Promise.all([
        videos[0].arrayBuffer(),
        videos[1].arrayBuffer(),
      ]);
      setResult(parseKeyBv(new Uint8Array(video1), new Uint8Array(video2)));
      setError("");
    } catch (cause) {
      setResult(undefined);
      setError(cause instanceof Error ? cause.message : t("keyBvDumpFailed"));
    }
  };

  const clear = () => {
    setVideos([undefined, undefined]);
    setResult(undefined);
    setError("");
  };

  const validationMessage =
    validation.code === "ready"
      ? t("keyBvFilesReady", { generation: validation.generation })
      : validation.code === "mismatched-size"
        ? t("keyBvMismatchedSize")
        : validation.code === "invalid-size"
          ? t("keyBvInvalidSize")
          : t("keyBvPairRequired");

  return (
    <FloatingToolPanel
      className="keybv-display"
      closeLabel={t("collapse")}
      expanded={expanded}
      id="keybv-panel"
      label={t("keyBvModule")}
      onExpandedChange={onExpandedChange}
      subtitle={t("keyBvEngine")}
      tone="amber"
      triggerId="keybv-trigger"
    >
      <div className="keybv-body">
        <div className="keybv-notice">
          <KeyRound aria-hidden="true" size={18} />
          <span>{t("keyBvDescription")}</span>
        </div>
        <div className="keybv-files">
          {[0, 1].map((index) => {
            const slot = index as 0 | 1;
            const file = videos[slot];
            return (
              <div
                className={`keybv-file-slot${file ? " has-file" : ""}`}
                key={slot}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(slot, event)}
              >
                <input
                  accept=".bin,.dat,application/octet-stream"
                  className="keybv-hidden-input"
                  onChange={(event) => handleInput(slot, event)}
                  ref={inputRefs[slot]}
                  type="file"
                />
                <div className="keybv-file-heading">
                  <FileVideo aria-hidden="true" size={18} />
                  <strong>
                    {t(slot === 0 ? "keyBvVideo1" : "keyBvVideo2")}
                  </strong>
                </div>
                <p className="keybv-file-hint">
                  {t(slot === 0 ? "keyBvVideo1Hint" : "keyBvVideo2Hint")}
                </p>
                <button
                  className="secondary-action keybv-file-button"
                  onClick={() => chooseFile(slot)}
                  type="button"
                >
                  <Upload aria-hidden="true" size={16} />
                  {t("keyBvChooseFile")}
                </button>
                <span className="keybv-file-name" title={file?.name}>
                  {file
                    ? `${file.name} (${file.size.toLocaleString()} B)`
                    : t("keyBvDropFile")}
                </span>
              </div>
            );
          })}
        </div>
        <div
          className={`keybv-validation ${validation.valid ? "valid" : "invalid"}`}
          role="status"
        >
          {validation.valid ? (
            <Check aria-hidden="true" size={16} />
          ) : (
            <AlertCircle aria-hidden="true" size={16} />
          )}
          <span>{validationMessage}</span>
        </div>
        <div className="keybv-actions">
          <button
            className="primary-action"
            disabled={!validation.valid}
            onClick={dump}
            type="button"
          >
            <KeyRound aria-hidden="true" size={17} />
            {t("keyBvDump")}
          </button>
          <button className="secondary-action" onClick={clear} type="button">
            <Trash2 aria-hidden="true" size={16} />
            {t("keyBvClear")}
          </button>
        </div>
        {error && <div className="alert error keybv-error">{error}</div>}
        {result && (
          <section aria-label={t("keyBvResults")} className="keybv-results">
            <div className="keybv-result-summary">
              <span>
                {t("keyBvGeneration", { generation: result.generation })}
              </span>
              <span>{result.pokemon.length} / 6</span>
            </div>
            <div className="keybv-table-shell">
              <table className="keybv-table">
                <thead>
                  <tr>
                    <th>{t("keyBvSlot")}</th>
                    <th>{t("keyBvSpecies")}</th>
                    <th>{t("keyBvTsv")}</th>
                    <th>{t("keyBvTrv")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.pokemon.map((pokemon) => (
                    <tr key={pokemon.slot}>
                      <td>{pokemon.slot + 1}</td>
                      <td>{keyBvSpeciesName(language, pokemon.species)}</td>
                      <td>{formatKeyBvTsv(pokemon.tsv)}</td>
                      <td>{formatKeyBvTrv(pokemon.trv)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </FloatingToolPanel>
  );
}
