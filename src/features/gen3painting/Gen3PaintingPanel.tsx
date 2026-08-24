import { useMemo, useState } from "react";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";

interface Gen3PaintingPanelProps {
  expanded: boolean;
  onExpandedChange(expanded: boolean): void;
  onApplyToStatic(seed: number): void;
}

function formatHex(value: number) {
  return value.toString(16).toUpperCase().padStart(4, "0");
}

export function Gen3PaintingPanel({
  expanded,
  onApplyToStatic,
  onExpandedChange,
}: Gen3PaintingPanelProps) {
  const [seed, setSeed] = useState("");
  const [calibration, setCalibration] = useState("30");

  const timer = useMemo(() => {
    const parsedSeed = Number.parseInt(seed.trim().replace(/^0x/i, ""), 16);
    const parsedCalibration = Number.parseInt(calibration, 10);
    if (
      !Number.isInteger(parsedSeed) ||
      parsedSeed < 0 ||
      parsedSeed > 0xffff ||
      !Number.isInteger(parsedCalibration) ||
      parsedCalibration < 0 ||
      parsedSeed <= parsedCalibration
    ) {
      return undefined;
    }
    return parsedSeed - parsedCalibration;
  }, [calibration, seed]);
  const parsedSeed = useMemo(() => {
    const value = Number.parseInt(seed.trim().replace(/^0x/i, ""), 16);
    return Number.isInteger(value) && value >= 0 && value <= 0xffff
      ? value
      : undefined;
  }, [seed]);

  return (
    <FloatingToolPanel
      className="gen3-painting-panel"
      closeLabel="关闭"
      expanded={expanded}
      id="gen3-painting-panel"
      label="Target Painting Timer"
      onExpandedChange={onExpandedChange}
      subtitle="Emerald / Emulator"
      tone="teal"
      triggerId="gen3-painting-trigger"
    >
      <div className="floating-tool-panel-body gen3-painting-body">
        <p className="panel-description">
          输入定点目标 Seed，计算模拟器 Painting Timer。校准值为十进制推进数，
          默认 30。
        </p>
        <label className="field">
          <span>Target Seed</span>
          <input
            inputMode="text"
            maxLength={4}
            onChange={(event) =>
              setSeed(event.target.value.replace(/[^0-9a-f]/gi, "").slice(0, 4))
            }
            placeholder="0000"
            value={seed}
          />
          <small>HEX / 16-bit</small>
        </label>
        <label className="field">
          <span>Calibration + Offset</span>
          <input
            inputMode="numeric"
            maxLength={5}
            onChange={(event) =>
              setCalibration(event.target.value.replace(/\D/g, "").slice(0, 5))
            }
            value={calibration}
          />
          <small>DEC / default 30</small>
        </label>
        <div className="computed-value">
          <span>Target Painting Timer</span>
          <code>{timer === undefined ? "----" : formatHex(timer)}</code>
        </div>
        <div className="panel-actions">
          <button
            className="secondary-action"
            disabled={timer === undefined}
            onClick={() => {
              if (timer !== undefined)
                void navigator.clipboard.writeText(formatHex(timer));
            }}
            type="button"
          >
            复制 Timer
          </button>
          <button
            className="primary-action"
            disabled={parsedSeed === undefined}
            onClick={() => {
              if (parsedSeed !== undefined) onApplyToStatic(parsedSeed);
            }}
            type="button"
          >
            回填定点 Generator
          </button>
        </div>
      </div>
    </FloatingToolPanel>
  );
}
