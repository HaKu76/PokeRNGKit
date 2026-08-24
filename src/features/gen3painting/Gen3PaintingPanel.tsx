import { useMemo, useState } from "react";

interface Gen3PaintingPanelProps {
  onApplyToStatic(seed: number): void;
}

function formatHex(value: number) {
  return value.toString(16).toUpperCase().padStart(4, "0");
}

export function Gen3PaintingPanel({ onApplyToStatic }: Gen3PaintingPanelProps) {
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
    <section className="panel compact-module-panel gen3-painting-panel">
      <div className="panel-heading">
        <div>
          <h2>Target Painting Timer</h2>
        </div>
      </div>
      <div className="gen3-painting-control-grid">
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
      </div>
      <div className="computed-value gen3-painting-result">
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
    </section>
  );
}
