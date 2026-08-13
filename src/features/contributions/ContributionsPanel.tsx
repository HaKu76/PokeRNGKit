import { useTranslation } from "react-i18next";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";

interface ContributionRecord {
  readonly amount: number;
  readonly contributor: string;
  readonly currency: "RMB";
  readonly purpose: string;
}

const contributions: readonly ContributionRecord[] = [
  {
    amount: 50,
    contributor: "差生文具多",
    currency: "RMB",
    purpose: "AI Token",
  },
];

interface ContributionsPanelProps {
  readonly expanded?: boolean;
  readonly onExpandedChange?: (expanded: boolean) => void;
}

export function ContributionsPanel({
  expanded = false,
  onExpandedChange = () => undefined,
}: ContributionsPanelProps) {
  const { t } = useTranslation();
  const total = contributions.reduce(
    (sum, contribution) => sum + contribution.amount,
    0,
  );

  const content = (
    <div className="contributions-body">
      <div className="contributions-summary">
        <span>{t("contributionTotal")}</span>
        <strong>¥{total}</strong>
        <small>{t("contributionCount", { count: contributions.length })}</small>
      </div>
      <div className="contributions-table-wrap">
        <table className="contributions-table">
          <thead>
            <tr>
              <th scope="col">{t("contributionContributor")}</th>
              <th scope="col">{t("contributionPurpose")}</th>
              <th scope="col">{t("contributionAmount")}</th>
            </tr>
          </thead>
          <tbody>
            {contributions.map((contribution, index) => (
              <tr
                key={`${contribution.contributor}-${contribution.purpose}-${index}`}
              >
                <td>
                  <span className="contribution-contributor">
                    <span className="contribution-index">
                      #{String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>{contribution.contributor}</strong>
                  </span>
                </td>
                <td>{contribution.purpose}</td>
                <td className="contribution-amount">
                  ¥{contribution.amount}
                  <small>{contribution.currency}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <FloatingToolPanel
      className="contributions-display"
      closeLabel={t("closeContributions")}
      expanded={expanded}
      id="contributions-panel"
      label={t("contributions")}
      onExpandedChange={onExpandedChange}
      subtitle={t("contributionsSubtitle")}
      tone="brand"
      triggerId="contributions-trigger"
    >
      {content}
    </FloatingToolPanel>
  );
}
