import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  gen4AdvanceCallLabels,
  gen4AdvanceChatotLabels,
  gen4AdvanceTokenLabel,
  parseGen4AdvanceRows,
  validateGen4AdvanceRequest,
  type Gen4AdvanceMatch,
  type Gen4AdvanceMode,
  type Gen4AdvanceRequest,
  type Gen4AdvanceRow,
  type Gen4AdvanceToken,
} from "./domain";
import { Gen4AdvanceUiPreviewEngine } from "./preview/Gen4AdvanceUiPreviewEngine";
import type { Gen4AdvanceEngine, Gen4AdvanceSummary } from "./search";
import { Gen4AdvanceWorker } from "./worker/Gen4AdvanceWorker";
import "./Gen4AdvancePanel.css";

const callResponses = {
  elm: [
    "K - I expect there are some Pokémon in the Kanto region that I don't know. There are probably methods of evolution that I'm not familiar with yet. I should use that perspective and discover what I can!",
    "E - There are so many different ways that Pokémon evolve, aren't there?! Some Pokémon don't even evolve until they meet certain conditions first!",
    "P - It seems that Pokémon that have been infected with Pokérus level up better. We're not quite sure why...",
  ],
  irwin: [
    "K - I'm so glad you called! I was just about to call you, too! I guess we must be a good match!",
    "E - Hearing about your escapades rocks my soul! It sure does!",
    "P - How are you? What are you doing? Where are you? How many Badges do you have now? How much money have you saved? How's your mom? Have you got lots of Pokémon? Is it going to be sunny tomorrow? Arrgh, there's so much I want to chat about! This is going nowhere!",
  ],
} as const;

export interface Gen4AdvancePanelProps {
  uiPreviewMode: boolean;
  sourceRows?: Partial<Record<Gen4AdvanceMode, Gen4AdvanceRow[]>>;
  supportsCalls?: boolean;
  onJump?(match: Gen4AdvanceMatch, source: Gen4AdvanceRow): void;
}

function rowText(rows: Gen4AdvanceRow[]) {
  return rows.map((row) => `${row.advances},${row.value}`).join("\n");
}

function tokenLabels(mode: Gen4AdvanceMode, chinese: boolean) {
  const labels =
    mode === "calls" ? gen4AdvanceCallLabels : gen4AdvanceChatotLabels;
  return labels.map((label, token) => ({
    label: chinese && label === "Any" ? "任意" : label,
    token: token as Gen4AdvanceToken,
  }));
}

export function Gen4AdvancePanel({
  uiPreviewMode,
  sourceRows,
  supportsCalls = true,
  onJump,
}: Gen4AdvancePanelProps) {
  const { i18n, t } = useTranslation();
  const chinese = i18n.language.startsWith("zh");
  const engine = useMemo<Gen4AdvanceEngine>(
    () =>
      uiPreviewMode
        ? new Gen4AdvanceUiPreviewEngine()
        : new Gen4AdvanceWorker(),
    [uiPreviewMode],
  );
  const initialMode: Gen4AdvanceMode = "chatot";
  const [mode, setMode] = useState<Gen4AdvanceMode>(initialMode);
  const [speaker, setSpeaker] = useState<"elm" | "irwin">("irwin");
  const [sourceText, setSourceText] = useState<Record<Gen4AdvanceMode, string>>(
    {
      calls: sourceRows?.calls ? rowText(sourceRows.calls) : "",
      chatot: sourceRows?.chatot ? rowText(sourceRows.chatot) : "",
    },
  );
  const [tokens, setTokens] = useState<Gen4AdvanceToken[]>([]);
  const [summary, setSummary] = useState<Gen4AdvanceSummary>();
  const [selected, setSelected] = useState<number>();
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "cancelled" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const runVersion = useRef(0);

  useEffect(() => () => engine.dispose(), [engine]);

  const parsedRows = useMemo(
    () => sourceRows?.[mode] ?? parseGen4AdvanceRows(mode, sourceText[mode]),
    [mode, sourceRows, sourceText],
  );
  const displayMatches = useMemo(() => {
    if (tokens.length > 0 && !summary) return [];
    if (summary && summary.matches.length <= 5) return summary.matches;
    return (parsedRows ?? []).map((row, index) => ({
      row: index,
      advances: row.advances,
    }));
  }, [parsedRows, summary, tokens.length]);
  const possibleCount =
    tokens.length === 0
      ? (parsedRows?.length ?? 0)
      : (summary?.matches.length ?? 0);

  const changeMode = (next: Gen4AdvanceMode) => {
    if (next === mode || status === "calculating") return;
    runVersion.current++;
    setMode(next);
    setTokens([]);
    setSummary(undefined);
    setSelected(undefined);
    setError("");
    setStatus("ready");
  };

  const changeTokens = (next: Gen4AdvanceToken[]) => {
    setTokens(next);
    setSummary(undefined);
    setSelected(undefined);
    setError("");
    setStatus("ready");
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request: Gen4AdvanceRequest = {
      mode,
      rows: parsedRows ?? [],
      tokens,
    };
    if (validateGen4AdvanceRequest(request).length > 0) {
      setError(
        chinese
          ? "Advances / Call / Chatot 输入无效。"
          : "Invalid Advances / Call / Chatot input.",
      );
      setStatus("failed");
      return;
    }
    setError("");
    setSummary(undefined);
    setSelected(undefined);
    setStatus("calculating");
    const version = ++runVersion.current;
    try {
      const next = await engine.search(request);
      if (version !== runVersion.current) return;
      setSummary(next);
      setStatus(next.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      if (version !== runVersion.current) return;
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const clear = () => {
    runVersion.current++;
    changeTokens([]);
  };

  const cancel = () => {
    runVersion.current++;
    engine.cancel();
    setStatus("cancelled");
  };

  const jump = () => {
    if (selected === undefined) return;
    const match = displayMatches[selected];
    const source = parsedRows?.[match.row];
    if (!match || !source) return;
    if (onJump) {
      onJump(match, source);
      return;
    }
    const textarea = sourceRef.current;
    if (!textarea) return;
    const lines = textarea.value.split(/\r?\n/);
    let sourceRow = -1;
    let start = 0;
    for (const line of lines) {
      if (line.trim()) sourceRow++;
      const end = start + line.length;
      if (sourceRow === match.row && line.trim()) {
        textarea.focus();
        textarea.setSelectionRange(start, end);
        return;
      }
      start = end + 1;
    }
  };

  const copy = {
    advances: chinese ? "帧数" : "Advances",
    call: chinese ? "电话" : "Call",
    chatot: chinese ? "音高" : "Chatot",
    clear: chinese ? "清空" : "Clear",
    possible: chinese ? "可能的结果:" : "Possible Results:",
    remove: chinese ? "删除" : "Remove",
    results: chinese ? "计算结果" : "Results",
    search: chinese ? "检索" : "Search",
  };
  const labels = tokenLabels(mode, chinese);
  const valueLabel = mode === "calls" ? copy.call : copy.chatot;
  const canJump = Boolean(onJump || !sourceRows?.[mode]);

  return (
    <form className="gen4advance-workspace" onSubmit={run}>
      <section className="panel gen4advance-observation-panel">
        <div className="panel-heading compact">
          <h2>Advance Finder</h2>
          <span className="panel-note">PokeFinder / AdvanceSearcher</span>
        </div>
        <div
          aria-label="Advance Finder"
          className="operation-tabs gen4advance-tabs"
          role="tablist"
        >
          {supportsCalls && (
            <button
              aria-selected={mode === "calls"}
              className={mode === "calls" ? "active" : ""}
              onClick={() => changeMode("calls")}
              role="tab"
              type="button"
            >
              Calls
            </button>
          )}
          <button
            aria-selected={mode === "chatot"}
            className={mode === "chatot" ? "active" : ""}
            onClick={() => changeMode("chatot")}
            role="tab"
            type="button"
          >
            {copy.chatot}
          </button>
        </div>

        {mode === "calls" && (
          <div className="gen4advance-call-reference">
            <div className="gen4advance-speaker" role="radiogroup">
              {(["elm", "irwin"] as const).map((entry) => (
                <label key={entry}>
                  <input
                    checked={speaker === entry}
                    name="gen4advance-speaker"
                    onChange={() => setSpeaker(entry)}
                    type="radio"
                  />
                  <span>{entry === "elm" ? "Elm" : "Irwin"}</span>
                </label>
              ))}
            </div>
            <div className="gen4advance-responses">
              {callResponses[speaker].map((response) => (
                <p key={response}>{response}</p>
              ))}
            </div>
          </div>
        )}

        <div className={`gen4advance-token-grid ${mode}`}>
          {labels.map(({ label, token }) => (
            <button
              disabled={status === "calculating"}
              key={`${mode}-${token}`}
              onClick={() => changeTokens(tokens.concat(token))}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <input
          aria-label={valueLabel}
          className="gen4advance-sequence"
          readOnly
          value={tokens
            .map((token) => gen4AdvanceTokenLabel(mode, token))
            .join(", ")}
        />
        <div className="panel-actions gen4advance-actions">
          <button
            className="primary-action"
            disabled={
              status === "calculating" || tokens.length === 0 || !parsedRows
            }
            type="submit"
          >
            {copy.search}
          </button>
          {status === "calculating" && (
            <button className="secondary-action" onClick={cancel} type="button">
              {t("cancel")}
            </button>
          )}
          <button
            className="secondary-action"
            disabled={tokens.length === 0 || status === "calculating"}
            onClick={() => changeTokens(tokens.slice(0, -1))}
            type="button"
          >
            {copy.remove}
          </button>
          <button
            className="secondary-action"
            disabled={
              status === "calculating" || (tokens.length === 0 && !summary)
            }
            onClick={clear}
            type="button"
          >
            {copy.clear}
          </button>
        </div>
      </section>

      <section className="panel results-panel gen4advance-results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <h2>{copy.results}</h2>
            <span className={`run-status ${status}`}>{t(status)}</span>
          </div>
          <span className="result-count">{possibleCount}</span>
        </div>

        {!sourceRows?.[mode] && (
          <label className="field gen4advance-source-field">
            <span>
              {copy.advances} / {valueLabel}
            </span>
            <textarea
              aria-invalid={sourceText[mode].length > 0 && !parsedRows}
              disabled={status === "calculating"}
              onChange={(event) => {
                const value = event.target.value;
                setSourceText((current) => ({ ...current, [mode]: value }));
                setSummary(undefined);
                setSelected(undefined);
                setStatus("ready");
              }}
              ref={sourceRef}
              spellCheck={false}
              value={sourceText[mode]}
            />
          </label>
        )}

        <div aria-live="polite" className="gen4advance-possible">
          <span>{copy.possible}</span>
          <strong>{possibleCount}</strong>
        </div>
        {summary && (
          <div className="metrics-row">
            <span>
              {t("processed")} <strong>{summary.processedRows}</strong>
            </span>
            <span>
              {t("elapsed")} <strong>{summary.elapsedMs.toFixed(1)} ms</strong>
            </span>
          </div>
        )}
        {error && <div className="alert error">{error}</div>}

        <div className="table-shell gen4advance-table-shell">
          {displayMatches.length === 0 ? (
            <div className="empty-state compact" />
          ) : (
            <table className="gen4advance-table" role="grid">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{copy.advances}</th>
                  <th>{valueLabel}</th>
                </tr>
              </thead>
              <tbody>
                {displayMatches.map((match, index) => (
                  <tr
                    aria-selected={selected === index}
                    className={selected === index ? "selected" : ""}
                    key={`${match.row}-${match.advances}`}
                    onClick={() => setSelected(index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(index);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td>{match.row}</td>
                    <td>{match.advances}</td>
                    <td>{parsedRows?.[match.row]?.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="panel-actions gen4advance-jump-action">
          <button
            className="secondary-action"
            disabled={selected === undefined || !canJump}
            onClick={jump}
            type="button"
          >
            Jump to Advance
          </button>
        </div>
      </section>
    </form>
  );
}
