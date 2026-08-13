import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { normalizeHexInput } from "../../input";
import { getGen3AbilityName } from "../shared/gen3Abilities";
import { getGen3Personal } from "../shared/gen3Personal";
import spot1 from "./assets/spinda_spot1.png";
import spot2 from "./assets/spinda_spot2.png";
import spot3 from "./assets/spinda_spot3.png";
import spot4 from "./assets/spinda_spot4.png";
import spinda from "./assets/spinda.png";
import {
  clampSpindaSpotPosition,
  SPINDA_CANVAS_HEIGHT,
  SPINDA_CANVAS_WIDTH,
  SPINDA_GRID_SIZE,
  spindaPidFromSpotPositions,
  spindaSpotPositionsFromPid,
  type SpindaSpotPosition,
  type SpindaSpotPositions,
} from "./domain";

const spotAssets = [spot1, spot2, spot3, spot4];
const spotSizes = [
  { width: 96, height: 96 },
  { width: 104, height: 104 },
  { width: 56, height: 72 },
  { width: 64, height: 72 },
];
const arrowDeltas: Record<string, SpindaSpotPosition> = {
  ArrowLeft: { x: -SPINDA_GRID_SIZE, y: 0 },
  ArrowRight: { x: SPINDA_GRID_SIZE, y: 0 },
  ArrowUp: { x: 0, y: -SPINDA_GRID_SIZE },
  ArrowDown: { x: 0, y: SPINDA_GRID_SIZE },
};
const natureKeys = [
  "hardy",
  "lonely",
  "brave",
  "adamant",
  "naughty",
  "bold",
  "docile",
  "relaxed",
  "impish",
  "lax",
  "timid",
  "hasty",
  "serious",
  "jolly",
  "naive",
  "modest",
  "mild",
  "quiet",
  "bashful",
  "rash",
  "calm",
  "gentle",
  "sassy",
  "careful",
  "quirky",
] as const;

function parsePid(value: string) {
  return value === "" ? 0 : Number.parseInt(value, 16) >>> 0;
}

export function Gen3SpindaPainterPanel() {
  const { i18n, t } = useTranslation();
  const [pidInput, setPidInput] = useState("0");
  const [spots, setSpots] = useState<SpindaSpotPositions>(() =>
    spindaSpotPositionsFromPid(0),
  );
  const boardRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<SpindaSpotPosition | undefined>(undefined);
  const pid = parsePid(pidInput);
  const personal = getGen3Personal(327);
  const female = (pid & 0xff) < personal.genderRatio;
  const ability = personal.abilities[pid & 1];

  const updateSpot = (index: number, next: SpindaSpotPosition) => {
    const positions = spots.map((spot, spotIndex) =>
      spotIndex === index ? clampSpindaSpotPosition(index, next) : spot,
    ) as SpindaSpotPositions;
    setSpots(positions);
    setPidInput(
      spindaPidFromSpotPositions(positions).toString(16).toUpperCase(),
    );
  };

  const updatePidInput = (value: string) => {
    const normalized = normalizeHexInput(value, 8);
    setPidInput(normalized);
    setSpots(spindaSpotPositionsFromPid(parsePid(normalized)));
  };

  const onSpotPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const pointerPosition = {
      x: ((event.clientX - rect.left) / rect.width) * SPINDA_CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * SPINDA_CANVAS_HEIGHT,
    };
    dragOffsetRef.current = {
      x: pointerPosition.x - spots[index].x,
      y: pointerPosition.y - spots[index].y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onSpotPointerMove = (
    event: PointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (
      !event.currentTarget.hasPointerCapture(event.pointerId) ||
      !boardRef.current
    )
      return;
    const rect = boardRef.current.getBoundingClientRect();
    const offset = dragOffsetRef.current ?? { x: 0, y: 0 };
    updateSpot(index, {
      x:
        ((event.clientX - rect.left) / rect.width) * SPINDA_CANVAS_WIDTH -
        offset.x,
      y:
        ((event.clientY - rect.top) / rect.height) * SPINDA_CANVAS_HEIGHT -
        offset.y,
    });
  };

  const onSpotKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const current = spots[index];
    const delta = arrowDeltas[event.key];
    if (!delta) return;
    event.preventDefault();
    updateSpot(index, { x: current.x + delta.x, y: current.y + delta.y });
  };

  return (
    <section className="spinda-painter-panel">
      <div className="spinda-painter-heading">
        <label className="field">
          <span>{t("pid")}</span>
          <input
            inputMode="text"
            maxLength={8}
            onChange={(event) => updatePidInput(event.target.value)}
            value={pidInput}
          />
        </label>
        <dl className="spinda-painter-info">
          <div>
            <dt>{t("nature")}</dt>
            <dd>{t(natureKeys[pid % 25])}</dd>
          </div>
          <div>
            <dt>{t("gender")}</dt>
            <dd>{t(female ? "female" : "male")}</dd>
          </div>
          <div>
            <dt>{t("ability")}</dt>
            <dd>{getGen3AbilityName(i18n.language, ability)}</dd>
          </div>
        </dl>
      </div>
      <div
        aria-label={t("spindaPainterModule")}
        className="spinda-painter-canvas"
        ref={boardRef}
      >
        <img
          alt=""
          className="spinda-painter-base"
          draggable={false}
          src={spinda}
        />
        {spots.map((spot, index) => (
          <button
            aria-label={`${t("pid")} ${index + 1}`}
            className="spinda-painter-spot"
            key={spotAssets[index]}
            onKeyDown={(event) => onSpotKeyDown(event, index)}
            onPointerDown={(event) => onSpotPointerDown(event, index)}
            onPointerMove={(event) => onSpotPointerMove(event, index)}
            style={{
              left: `${(spot.x / SPINDA_CANVAS_WIDTH) * 100}%`,
              top: `${(spot.y / SPINDA_CANVAS_HEIGHT) * 100}%`,
              width: `${(spotSizes[index].width / SPINDA_CANVAS_WIDTH) * 100}%`,
              height: `${(spotSizes[index].height / SPINDA_CANVAS_HEIGHT) * 100}%`,
            }}
            type="button"
          >
            <img alt="" draggable={false} src={spotAssets[index]} />
          </button>
        ))}
      </div>
    </section>
  );
}
