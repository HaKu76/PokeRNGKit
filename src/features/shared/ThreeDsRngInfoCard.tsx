import { useId } from "react";
import { useTranslation } from "react-i18next";
import "./ThreeDsRngInfoCard.css";

export type ThreeDsRngInfoMode = "range" | "around";

export interface ThreeDsRngInfoCardProps {
  disabled?: boolean;
  generation: 6 | 7;
  maxFrame: string;
  maxFrameLimit: number;
  minFrame: string;
  minFrameLimit?: number;
  mode: ThreeDsRngInfoMode;
  npc?: string;
  onDelayChange: (value: string) => void;
  onMaxFrameChange: (value: string) => void;
  onMinFrameChange: (value: string) => void;
  onModeChange: (mode: ThreeDsRngInfoMode) => void;
  onNpcChange?: (value: string) => void;
  onTargetFrameChange: (value: string) => void;
  onTimelineSecondsChange: (value: string) => void;
  onConsiderDelayChange: (value: boolean) => void;
  considerDelay: boolean;
  delay: string;
  delayLimit?: number;
  delayMinimum?: number;
  showCalculate?: boolean;
  showNpc?: boolean;
  showTimeline?: boolean;
  showTimelineLeap?: boolean;
  targetFrame: string;
  timelineSeconds: string;
}

export function ThreeDsRngInfoCard({
  considerDelay,
  delay,
  delayLimit = 4000,
  delayMinimum = 0,
  disabled = false,
  generation,
  maxFrame,
  maxFrameLimit,
  minFrame,
  minFrameLimit = 0,
  mode,
  npc,
  onConsiderDelayChange,
  onDelayChange,
  onMaxFrameChange,
  onMinFrameChange,
  onModeChange,
  onNpcChange,
  onTargetFrameChange,
  onTimelineSecondsChange,
  showCalculate = false,
  showNpc = generation === 7,
  showTimeline = false,
  showTimelineLeap = false,
  targetFrame,
  timelineSeconds,
}: ThreeDsRngInfoCardProps) {
  const { t } = useTranslation();
  const modeName = useId();
  const timelinePending = t("gen7RngTimelinePending");

  return (
    <div
      className={`three-ds-rng-info-card${showTimeline ? " has-timeline" : ""}`}
    >
      <div className="three-ds-rng-range">
        <label className="three-ds-rng-mode">
          <input
            checked={mode === "range"}
            disabled={disabled}
            name={modeName}
            onChange={() => onModeChange("range")}
            type="radio"
          />
          <span>{t("gen7RngFrameRange")}</span>
        </label>
        <div className="three-ds-frame-range-inputs">
          <input
            aria-label={t("gen7StationaryMinFrame")}
            disabled={disabled}
            inputMode="numeric"
            max={maxFrameLimit}
            min={minFrameLimit}
            onChange={(event) => onMinFrameChange(event.target.value)}
            value={minFrame}
          />
          <span aria-hidden="true">→</span>
          <input
            aria-label={t("gen7StationaryMaxFrame")}
            disabled={disabled}
            inputMode="numeric"
            max={maxFrameLimit}
            onChange={(event) => onMaxFrameChange(event.target.value)}
            value={maxFrame}
          />
        </div>
      </div>

      <div className="three-ds-rng-target">
        <label className="field">
          <span>{t("gen7RngTargetFrame")}</span>
          <input
            disabled={disabled}
            inputMode="numeric"
            max={maxFrameLimit}
            onChange={(event) => onTargetFrameChange(event.target.value)}
            step={100}
            value={targetFrame}
          />
        </label>
        <label className="three-ds-rng-mode">
          <input
            checked={mode === "around"}
            disabled={disabled}
            name={modeName}
            onChange={() => onModeChange("around")}
            type="radio"
          />
          <span>{t("gen7RngAroundTarget")}</span>
        </label>
      </div>

      <div className="three-ds-rng-timing">
        <label className="checkbox-field">
          <input
            checked={considerDelay}
            disabled={disabled}
            onChange={(event) => onConsiderDelayChange(event.target.checked)}
            type="checkbox"
          />
          <span>{t("gen7EventConsiderDelay")}</span>
        </label>
        <div className="three-ds-delay-input">
          <input
            aria-label={t("delay")}
            disabled={disabled}
            inputMode="numeric"
            max={delayLimit}
            min={delayMinimum}
            onChange={(event) => onDelayChange(event.target.value)}
            value={delay}
          />
          <span>{generation === 7 ? "+4F" : "F"}</span>
        </div>
        {showNpc && onNpcChange && (
          <label className="field three-ds-npc-field">
            <span>NPC</span>
            <input
              disabled={disabled}
              inputMode="numeric"
              max={100}
              onChange={(event) => onNpcChange(event.target.value)}
              value={npc ?? "0"}
            />
          </label>
        )}
      </div>

      {showTimeline && (
        <div className="three-ds-rng-timeline">
          <label className="three-ds-rng-mode" title={timelinePending}>
            <input disabled type="radio" />
            <span>{t("gen7RngCreateTimeline")}</span>
          </label>
          <input
            aria-label={t("gen7RngCreateTimeline")}
            disabled
            inputMode="numeric"
            max={maxFrameLimit}
            onChange={(event) => onTimelineSecondsChange(event.target.value)}
            title={timelinePending}
            value={timelineSeconds}
          />
          {showTimelineLeap && (
            <label className="three-ds-rng-mode" title={timelinePending}>
              <input disabled type="radio" />
              <span>{t("gen7RngTimelineLeap")}</span>
            </label>
          )}
          {showCalculate && (
            <button className="three-ds-rng-calculate" type="submit">
              {t("calculate")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
