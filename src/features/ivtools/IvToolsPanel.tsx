import { Check, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";
import {
  defaultIvRangeSelections,
  emitIvToolsChange,
  formatIvTemplate,
  getStoredIvTemplatesSnapshot,
  IV_JUDGE_VALUES,
  IV_STATS,
  rangeBoundsFromSelection,
  saveIvTemplates,
  useIvTemplates,
  type IvJudgeValue,
  type IvParent,
  type IvTemplate,
} from "./domain";
import "./IvToolsPanel.css";

interface IvToolsPanelProps {
  readonly expanded: boolean;
  readonly onExpandedChange: (expanded: boolean) => void;
}

export function IvToolsPanel({
  expanded,
  onExpandedChange,
}: IvToolsPanelProps) {
  const { t } = useTranslation();
  const storedTemplates = getStoredIvTemplatesSnapshot(useIvTemplates());
  const [tab, setTab] = useState<"range" | "template">("range");
  const [range, setRange] = useState<IvJudgeValue[]>(defaultIvRangeSelections);
  const [rangeInput, setRangeInput] = useState<string[]>(
    defaultIvRangeSelections,
  );
  const [templates, setTemplates] = useState<IvTemplate[]>(storedTemplates);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [draft, setDraft] = useState<string>();
  const [status, setStatus] = useState("");

  const judgeOptions = useMemo(
    () =>
      IV_JUDGE_VALUES.map((value) => ({
        value,
        label:
          value === "-"
            ? value
            : t(`ivJudge${value[0].toUpperCase()}${value.slice(1)}`),
      })),
    [t],
  );
  const selectedTemplate = templates[selectedIndex];

  const changeTemplate = (index: number) => {
    setSelectedIndex(index);
    setDraft(templates[index] ? formatIvTemplate(templates[index]) : undefined);
    setStatus("");
  };

  const addTemplate = () => {
    const template = getStoredIvTemplatesSnapshot(draft ?? "")[0];
    if (!template) return setStatus(t("ivToolsInvalidTemplate"));
    const next = [...templates, template];
    setTemplates(next);
    setSelectedIndex(next.length - 1);
    saveIvTemplates(next);
    setStatus(t("ivToolsSaved"));
  };

  const updateTemplate = () => {
    const template = getStoredIvTemplatesSnapshot(draft ?? "")[0];
    if (!template || !selectedTemplate)
      return setStatus(t("ivToolsInvalidTemplate"));
    const next = templates.map((item, index) =>
      index === selectedIndex ? template : item,
    );
    setTemplates(next);
    saveIvTemplates(next);
    setStatus(t("ivToolsSaved"));
  };

  const removeTemplate = () => {
    if (!templates.length) return;
    const next = templates.filter((_, index) => index !== selectedIndex);
    setTemplates(next);
    setSelectedIndex(Math.max(0, Math.min(selectedIndex, next.length - 1)));
    setDraft(next[0] ? formatIvTemplate(next[0]) : undefined);
    saveIvTemplates(next);
    setStatus(t("ivToolsSaved"));
  };

  const applyRange = () => {
    emitIvToolsChange({
      type: "range",
      bounds: rangeBoundsFromSelection(range),
    });
    setStatus(t("ivToolsApplied"));
  };

  const applyTemplate = (parent: IvParent) => {
    if (!selectedTemplate) return;
    emitIvToolsChange({
      type: "template",
      parent,
      values: selectedTemplate.values,
    });
    setStatus(t("ivToolsApplied"));
  };

  return (
    <FloatingToolPanel
      className="iv-tools-display"
      closeLabel={t("collapse")}
      expanded={expanded}
      id="iv-tools-panel"
      label={t("ivToolsModule")}
      onExpandedChange={onExpandedChange}
      subtitle={t("ivToolsEngine")}
      tone="teal"
      triggerId="iv-tools-trigger"
    >
      <div className="iv-tools-tabs" role="tablist">
        <button
          aria-selected={tab === "range"}
          className="iv-tools-tab"
          onClick={() => setTab("range")}
          role="tab"
          type="button"
        >
          IV Range
        </button>
        <button
          aria-selected={tab === "template"}
          className="iv-tools-tab"
          onClick={() => setTab("template")}
          role="tab"
          type="button"
        >
          IV Template
        </button>
      </div>
      {tab === "range" ? (
        <div className="iv-tools-body">
          <div className="iv-tools-range-grid">
            {IV_STATS.map((stat, index) => (
              <label className="field" key={stat}>
                <span>{stat}</span>
                <AutoCompleteComboBox
                  inputValue={rangeInput[index] ?? ""}
                  label={stat}
                  onInputChange={(value) =>
                    setRangeInput((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? value : item,
                      ),
                    )
                  }
                  onValueChange={(value) => {
                    setRange((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? value : item,
                      ),
                    );
                    setRangeInput((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? (judgeOptions.find(
                              (option) => option.value === value,
                            )?.label ?? "")
                          : item,
                      ),
                    );
                  }}
                  options={judgeOptions}
                  value={range[index]}
                />
              </label>
            ))}
          </div>
          <div className="iv-tools-actions">
            <button
              className="primary-action"
              onClick={applyRange}
              type="button"
            >
              <Check aria-hidden="true" size={17} />
              {t("ivToolsApplyRange")}
            </button>
          </div>
          {status && (
            <div aria-live="polite" className="iv-tools-status">
              {status}
            </div>
          )}
        </div>
      ) : (
        <div className="iv-tools-body">
          <div className="iv-tools-template-layout">
            <div
              aria-label="IV Template"
              className="iv-tools-template-list"
              role="listbox"
            >
              {templates.map((template, index) => (
                <button
                  aria-selected={index === selectedIndex}
                  className="iv-tools-template-item"
                  key={`${template.name}-${index}`}
                  onClick={() => changeTemplate(index)}
                  role="option"
                  type="button"
                >
                  <span title={formatIvTemplate(template)}>
                    {template.name}
                  </span>
                  {index === selectedIndex && (
                    <Check aria-hidden="true" size={15} />
                  )}
                </button>
              ))}
            </div>
            <div className="iv-tools-template-editor">
              <label className="field">
                <span>Template</span>
                <input
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setStatus("");
                  }}
                  placeholder="Name = 1,2,3,4,5,6"
                  value={
                    draft ??
                    (selectedTemplate ? formatIvTemplate(selectedTemplate) : "")
                  }
                />
              </label>
              <div className="iv-tools-actions">
                <button
                  className="secondary-action"
                  onClick={addTemplate}
                  type="button"
                >
                  <Plus aria-hidden="true" size={16} />
                  Add
                </button>
                <button
                  className="primary-action"
                  onClick={updateTemplate}
                  type="button"
                >
                  <Save aria-hidden="true" size={16} />
                  Save
                </button>
                <button
                  className="secondary-action"
                  onClick={removeTemplate}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={16} />
                  Remove
                </button>
              </div>
              <div className="iv-tools-actions">
                <button
                  className="secondary-action"
                  onClick={() => applyTemplate("male")}
                  type="button"
                >
                  Set as Male
                </button>
                <button
                  className="secondary-action"
                  onClick={() => applyTemplate("female")}
                  type="button"
                >
                  Set as Female
                </button>
              </div>
            </div>
          </div>
          {status && (
            <div aria-live="polite" className="iv-tools-status">
              {status}
            </div>
          )}
        </div>
      )}
    </FloatingToolPanel>
  );
}
