import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import {
  validateSaveRecord,
  type SaveRecordCatalog,
  type SaveRecordEdit,
  type SaveRecordEntry,
} from "./domain";
import { localizeSaveError, type saveEditorResources } from "./locales";
import { saveRecordName } from "./recordNames";

export function SaveRecordEditor({
  revision,
  busy,
  canEdit,
  onRead,
  onApply,
}: {
  revision: number;
  busy: boolean;
  canEdit: boolean;
  onRead(): Promise<SaveRecordCatalog | undefined>;
  onApply(edit: SaveRecordEdit): Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const [catalog, setCatalog] = useState<SaveRecordCatalog>();
  const [index, setIndex] = useState(0);
  const reader = useRef(onRead);
  useEffect(() => {
    reader.current = onRead;
  }, [onRead]);
  useEffect(() => {
    let active = true;
    void reader.current().then((value) => {
      if (active) {
        setCatalog(value);
        setIndex((i) => (value?.entries.some((e) => e.index === i) ? i : 0));
      }
    });
    return () => {
      active = false;
    };
  }, [revision]);
  const entry = catalog?.entries.find((e) => e.index === index);
  return (
    <section className="save-record-editor">
      <h3>{words.recordsTitle}</h3>
      {!catalog ? (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onRead().then(setCatalog)}
          >
            {words.recordsRead}
          </button>
        </div>
      ) : (
        <>
          <label className="field">
            <span>{words.recordsChoose}</span>
            <Select
              value={index}
              disabled={busy}
              onChange={(e) => setIndex(Number(e.target.value))}
            >
              {catalog.entries.map((item) => (
                <option key={item.index} value={item.index}>
                  {String(item.index).padStart(3, "0")} ·{" "}
                  {saveRecordName(item.name, i18n.language)}
                </option>
              ))}
            </Select>
          </label>
          {entry && (
            <RecordForm
              key={`${revision}:${index}:${entry.value}`}
              entry={entry}
              disabled={busy || !canEdit}
              onApply={onApply}
            />
          )}
        </>
      )}
    </section>
  );
}

function RecordForm({
  entry,
  disabled,
  onApply,
}: {
  entry: SaveRecordEntry;
  disabled: boolean;
  onApply(edit: SaveRecordEdit): Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const hintLanguage = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const [value, setValue] = useState(String(entry.value));
  const [error, setError] = useState("");
  const apply = async () => {
    setError("");
    try {
      await onApply(validateSaveRecord(entry, value));
    } catch (e) {
      setError(
        localizeSaveError(e instanceof Error ? e.message : String(e), words),
      );
    }
  };
  return (
    <>
      <label className="field">
        <span>
          {words.recordsValue} · 0–{entry.max}
        </span>
        <input
          value={value}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={String(entry.max).length}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      {entry.max > entry.normalMax && (
        <p className="save-editor-note">
          {words.recordsClamp.replace("{max}", String(entry.normalMax))}
        </p>
      )}
      {entry.value < 0 && (
        <p className="save-editor-note">{words.recordsNegative}</p>
      )}
      {entry.timeHint && (
        <p className="save-editor-note" style={{ whiteSpace: "pre-line" }}>
          {words.recordsTime}:{" "}
          {entry.timeHintLocalized?.[hintLanguage] ?? entry.timeHint}
        </p>
      )}
      <details>
        <summary>{words.recordsDetails}</summary>
        <p className="save-editor-note">
          {words.recordsSourceName}: {entry.name}
        </p>
        <p className="save-editor-note">
          {words.recordsOffset}: 0x{entry.offset.toString(16).toUpperCase()}
        </p>
      </details>
      {error && (
        <p role="alert" className="save-editor-error">
          {error}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          className="primary"
          disabled={disabled || value === String(entry.value)}
          onClick={() => void apply()}
        >
          {words.recordsApply}
        </button>
      </div>
    </>
  );
}
