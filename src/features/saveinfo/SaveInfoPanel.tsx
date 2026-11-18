import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";
import { MAX_SAVE_BYTES, type SaveInfoResponse } from "./protocol";
import "./SaveInfoPanel.css";

interface Props {
  expanded: boolean;
  language: "zh" | "en" | "ja";
  onExpandedChange: (expanded: boolean) => void;
}

export function SaveInfoPanel({ expanded, language, onExpandedChange }: Props) {
  const { t } = useTranslation();
  return (
    <FloatingToolPanel
      className="save-info-panel"
      closeLabel={t("collapse")}
      expanded={expanded}
      id="save-info-panel"
      label={t("saveInfo.title")}
      onExpandedChange={onExpandedChange}
      tone="teal"
      triggerId="save-info-trigger"
    >
      <SaveInfoBody language={language} />
    </FloatingToolPanel>
  );
}

function SaveInfoBody({ language }: Pick<Props, "language">) {
  const { t } = useTranslation();
  const picker = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<
    SaveInfoResponse | { status: "reading" }
  >();

  useEffect(
    () => () => {
      worker.current?.terminate();
      worker.current = null;
    },
    [],
  );

  function openFile(file: File) {
    worker.current?.terminate();
    worker.current = null;
    setFileName(file.name);

    if (file.size === 0 || file.size > MAX_SAVE_BYTES) {
      setResult({ status: "size" });
      return;
    }

    setResult({ status: "reading" });
    try {
      const reader = new Worker(
        new URL("./saveinfo.worker.ts", import.meta.url),
        {
          type: "module",
        },
      );
      worker.current = reader;
      const finish = (response: SaveInfoResponse) => {
        if (worker.current !== reader) return;
        reader.terminate();
        worker.current = null;
        setResult(response);
      };
      reader.onmessage = ({ data }: MessageEvent<SaveInfoResponse>) =>
        finish(data);
      reader.onerror = () => finish({ status: "runtime" });
      reader.onmessageerror = () => finish({ status: "runtime" });
      const base = new URL(import.meta.env.BASE_URL, window.location.href).href;
      reader.postMessage({ base, file });
    } catch {
      worker.current?.terminate();
      worker.current = null;
      setResult({ status: "runtime" });
    }
  }

  const summary = result?.status === "ready" ? result.summary : undefined;
  const rows = summary && [
    [t("saveInfo.file"), fileName],
    [t("saveInfo.game"), summary.game[language]],
    [t("saveInfo.trainer"), summary.trainer],
    [t("tid"), summary.tid.toString().padStart(5, "0")],
    [t("sid"), summary.sid.toString().padStart(5, "0")],
    ...(summary.displayTid === null
      ? []
      : [[t("saveInfo.displayTid"), summary.displayTid]]),
    [t("saveInfo.playTime"), summary.playTime],
    [
      t("saveInfo.checksum"),
      t(summary.checksumsValid ? "saveInfo.valid" : "saveInfo.invalid"),
    ],
  ];

  return (
    <div className="save-info-body">
      <div>
        <input
          hidden
          ref={picker}
          type="file"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) openFile(file);
          }}
        />
        <button
          className="primary-action"
          type="button"
          onClick={() => picker.current?.click()}
        >
          {t("saveInfo.open")}
        </button>
      </div>
      {result?.status === "reading" && (
        <p role="status">{t("saveInfo.reading")}</p>
      )}
      {result && result.status !== "ready" && result.status !== "reading" && (
        <p role="alert">{t(`saveInfo.${result.status}`)}</p>
      )}
      {rows && (
        <dl className="save-info-fields" aria-live="polite">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "—"}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
