import { useTranslation } from "react-i18next";
import { normalizeDecimalInput } from "../../input";

interface PerfectIvFilterFieldsProps {
  readonly count: string;
  readonly disabled?: boolean;
  readonly onCountChange: (value: string) => void;
  readonly onValueChange: (value: string) => void;
  readonly value: string;
}

export function PerfectIvFilterFields({
  count,
  disabled = false,
  onCountChange,
  onValueChange,
  value,
}: PerfectIvFilterFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="compact-field-row perfect-iv-filter-fields">
      <label className="field">
        <span>{t("perfectIvValue")}</span>
        <input
          disabled={disabled}
          inputMode="numeric"
          max="31"
          min="0"
          onChange={(event) =>
            onValueChange(normalizeDecimalInput(event.target.value, 31, 2))
          }
          type="number"
          value={value}
        />
      </label>
      <label className="field">
        <span>{t("perfectIvCount")}</span>
        <input
          disabled={disabled}
          inputMode="numeric"
          max="6"
          min="0"
          onChange={(event) =>
            onCountChange(normalizeDecimalInput(event.target.value, 6, 1))
          }
          type="number"
          value={count}
        />
      </label>
    </div>
  );
}
