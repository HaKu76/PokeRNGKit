import { useTranslation } from "react-i18next";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";

interface Gen3WorkflowTipsPanelProps {
  expanded: boolean;
  onExpandedChange(expanded: boolean): void;
  onOpenId(): void;
  onOpenInitialSeed(): void;
  onOpenSeedToTime(): void;
  onOpenPainting(): void;
}

export function Gen3WorkflowTipsPanel({
  expanded,
  onExpandedChange,
  onOpenId,
  onOpenInitialSeed,
  onOpenSeedToTime,
  onOpenPainting,
}: Gen3WorkflowTipsPanelProps) {
  const { t } = useTranslation();
  return (
    <FloatingToolPanel
      className="gen3-workflow-tips-panel"
      closeLabel={t("close")}
      expanded={expanded}
      id="gen3-workflow-tips-panel"
      label={t("gen3WorkflowTitle")}
      onExpandedChange={onExpandedChange}
      subtitle={t("gen3WorkflowSubtitle")}
      tone="brand"
      triggerId="gen3-workflow-tips-trigger"
    >
      <div className="floating-tool-panel-body workflow-tips-body">
        <ol className="workflow-tips-list">
          <li>{t("gen3WorkflowStepNewGame")}</li>
          <li>{t("gen3WorkflowStepSearcher")}</li>
          <li>
            {t("gen3WorkflowStepId")}
            <button onClick={onOpenId} type="button">
              {t("gen3WorkflowOpenId")}
            </button>
          </li>
          <li>{t("gen3WorkflowStepSave")}</li>
          <li>
            {t("gen3WorkflowStepBridge")}
            <button onClick={onOpenSeedToTime} type="button">
              {t("gen3WorkflowOpenSeedToTime")}
            </button>
          </li>
          <li>
            {t("gen3WorkflowStepBackSeed")}
            <button onClick={onOpenInitialSeed} type="button">
              {t("gen3WorkflowOpenBackSeed")}
            </button>
          </li>
          <li>
            {t("gen3WorkflowStepTimer")}
            <button onClick={onOpenPainting} type="button">
              {t("gen3WorkflowOpenPainting")}
            </button>
          </li>
          <li>{t("gen3WorkflowStepHit")}</li>
        </ol>
        <div className="alert warning">{t("gen3WorkflowShinyNote")}</div>
      </div>
    </FloatingToolPanel>
  );
}
