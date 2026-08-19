import { Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";
import {
  formatTsvListText,
  parseTsvListText,
  TSV_LIST_MAX_ENTRIES,
  useTsvListText,
  saveTsvList,
} from "./domain";
import "./TsvListPanel.css";

interface TsvListPanelProps {
  readonly expanded: boolean;
  readonly onExpandedChange: (expanded: boolean) => void;
}

export function TsvListPanel({
  expanded,
  onExpandedChange,
}: TsvListPanelProps) {
  const { t } = useTranslation();
  const storedText = useTsvListText();
  const [draftOverride, setDraftOverride] = useState<string>();
  const [saved, setSaved] = useState(false);

  const draft = draftOverride ?? storedText;

  const values = useMemo(() => parseTsvListText(draft), [draft]);

  const save = () => {
    saveTsvList(values);
    setDraftOverride(formatTsvListText(values));
    setSaved(true);
  };

  const clear = () => {
    saveTsvList([]);
    setDraftOverride("");
    setSaved(true);
  };

  return (
    <FloatingToolPanel
      className="tsv-list-display"
      closeLabel={t("collapse")}
      expanded={expanded}
      id="tsv-list-panel"
      label={t("tsvListModule")}
      onExpandedChange={onExpandedChange}
      subtitle={t("tsvListEngine")}
      tone="teal"
      triggerId="tsv-list-trigger"
    >
      <div className="tsv-list-body">
        <label className="tsv-list-editor">
          <span>{t("tsvListValues")}</span>
          <textarea
            aria-describedby="tsv-list-count"
            onChange={(event) => {
              setDraftOverride(event.target.value);
              setSaved(false);
            }}
            rows={12}
            spellCheck={false}
            value={draft}
          />
        </label>
        <div className="tsv-list-meta" id="tsv-list-count">
          <span>
            {t("tsvListCount", {
              count: values.length,
              max: TSV_LIST_MAX_ENTRIES,
            })}
          </span>
          <span>{t("tsvListRange")}</span>
        </div>
        <div className="tsv-list-actions">
          <button className="primary-action" onClick={save} type="button">
            <Save aria-hidden="true" size={17} />
            {t("tsvListSave")}
          </button>
          <button className="secondary-action" onClick={clear} type="button">
            <Trash2 aria-hidden="true" size={16} />
            {t("tsvListClear")}
          </button>
        </div>
        {saved && (
          <div aria-live="polite" className="tsv-list-status">
            {t("tsvListSaved")}
          </div>
        )}
      </div>
    </FloatingToolPanel>
  );
}
