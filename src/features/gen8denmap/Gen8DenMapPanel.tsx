import { Select } from "../shared/Select";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  GEN8_DEN_MAP_REGIONS,
  getGen8DenMapEntries,
  type Gen8DenMapRegionId,
} from "./domain";
import "./Gen8DenMapPanel.css";

const MAP_ASSETS = {
  "map.png": new URL("./assets/map.png", import.meta.url).href,
  "map_ioa.png": new URL("./assets/map_ioa.png", import.meta.url).href,
  "map_ct.png": new URL("./assets/map_ct.png", import.meta.url).href,
} as const;

export function Gen8DenMapPanel() {
  const { i18n, t } = useTranslation();
  const [regionId, setRegionId] = useState<Gen8DenMapRegionId>("wildArea");
  const [localIndex, setLocalIndex] = useState(0);
  const region = GEN8_DEN_MAP_REGIONS.find((entry) => entry.id === regionId)!;
  const entries = useMemo(
    () => getGen8DenMapEntries(regionId, i18n.language),
    [i18n.language, regionId],
  );
  const entry = entries[localIndex] ?? entries[0];
  const coordinate = entry.info.coordinate;
  const markerStyle = {
    left: `${(coordinate[0] / region.width) * 100}%`,
    top: `${(coordinate[1] / region.height) * 100}%`,
  };

  return (
    <section className="gen8denmap-panel" aria-label={t("gen8DenMapModule")}>
      <aside className="gen8denmap-controls panel">
        <div className="gen8denmap-panel-heading">
          <div>
            <span className="panel-index">01</span>
            <h2>{t("gen8DenMapSettings")}</h2>
          </div>
          <span className="panel-note">PokeFinder / DenMap</span>
        </div>
        <label className="gen8denmap-field">
          <span>{t("gen8DenMapLocation")}</span>
          <Select
            onChange={(event) => {
              setRegionId(event.target.value as Gen8DenMapRegionId);
              setLocalIndex(0);
            }}
            value={regionId}
          >
            {GEN8_DEN_MAP_REGIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.labelKey)}
              </option>
            ))}
          </Select>
        </label>
        <label className="gen8denmap-field">
          <span>{t("gen8DenMapDen")}</span>
          <Select
            onChange={(event) => setLocalIndex(Number(event.target.value))}
            value={localIndex}
          >
            {entries.map((option) => (
              <option key={option.info.index} value={option.localIndex}>
                {option.localIndex + 1}: {option.locationName}
              </option>
            ))}
          </Select>
        </label>
        <dl className="gen8denmap-details">
          <div>
            <dt>{t("gen8DenMapIndex")}</dt>
            <dd>{entry.info.index}</dd>
          </div>
          <div>
            <dt>{t("gen8DenMapArea")}</dt>
            <dd>{entry.locationName}</dd>
          </div>
          <div>
            <dt>{t("gen8DenMapCoordinates")}</dt>
            <dd>
              {coordinate[0]}, {coordinate[1]}
            </dd>
          </div>
        </dl>
      </aside>

      <section className="gen8denmap-map-panel panel">
        <div className="gen8denmap-map-heading">
          <div>
            <span className="panel-index">02</span>
            <h2>{t(region.labelKey)}</h2>
          </div>
          <span className="panel-note">
            {entry.localIndex + 1} / {entries.length}
          </span>
        </div>
        <div className="gen8denmap-map-scroll">
          <div
            className="gen8denmap-map-frame"
            style={{ aspectRatio: `${region.width} / ${region.height}` }}
          >
            <img
              alt={t("gen8DenMapMapAlt", {
                area: t(region.labelKey),
                den: entry.localIndex + 1,
              })}
              className="gen8denmap-map-image"
              src={MAP_ASSETS[region.image as keyof typeof MAP_ASSETS]}
            />
            <span
              aria-hidden="true"
              className="gen8denmap-marker"
              style={markerStyle}
            />
          </div>
        </div>
      </section>
    </section>
  );
}
