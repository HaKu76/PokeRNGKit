import { useEffect, useRef, useState } from "react";
import {
  rtcDraft,
  rtcLimits,
  rtcWords,
  validateRtc,
  type RtcCatalog,
  type RtcEdit,
} from "./rtc";
export function RtcEditor({
  revision,
  busy,
  canEdit,
  lang,
  onRead,
  onApply,
}: {
  revision: number;
  busy: boolean;
  canEdit: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<RtcCatalog | undefined>;
  onApply(edit: RtcEdit): Promise<void>;
}) {
  const reader = useRef(onRead);
  const [loaded, setLoaded] = useState<{
    revision: number;
    catalog: RtcCatalog;
  }>();
  useEffect(() => {
    reader.current = onRead;
  }, [onRead]);
  useEffect(() => {
    let active = true;
    void reader.current().then((c) => {
      if (active && c) setLoaded({ revision, catalog: c });
    });
    return () => {
      active = false;
    };
  }, [revision]);
  return (
    <section className="save-record-editor">
      <h3>{rtcWords[lang].title}</h3>
      {loaded?.revision === revision ? (
        <RtcForm
          key={revision}
          catalog={loaded.catalog}
          disabled={busy || !canEdit}
          lang={lang}
          onApply={onApply}
        />
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void onRead().then((c) => {
              if (c) setLoaded({ revision, catalog: c });
            })
          }
        >
          {rtcWords[lang].read}
        </button>
      )}
    </section>
  );
}

function RtcForm({
  catalog,
  disabled,
  lang,
  onApply,
}: {
  catalog: RtcCatalog;
  disabled: boolean;
  lang: "zh" | "en" | "ja";
  onApply(edit: RtcEdit): Promise<void>;
}) {
  const words = rtcWords[lang];
  const [draft, setDraft] = useState(() => rtcDraft(catalog));
  const [invalid, setInvalid] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(rtcDraft(catalog));
  const apply = () => {
    let edit;
    try {
      edit = validateRtc(catalog, draft);
    } catch {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void onApply(edit);
  };
  return (
    <fieldset className="save-food-fields" disabled={disabled}>
      <legend>{words.title}</legend>
      {(["initial", "elapsed"] as const).map((group) => (
        <div className="save-record-editor" key={group}>
          <h4>{words[group]}</h4>
          <div className="save-editor-fields">
            {words.fields.map((name, i) => (
              <label className="field" key={name}>
                <span>
                  {name} · 0–{rtcLimits[i]}
                </span>
                <input
                  value={draft[group][i]}
                  inputMode="numeric"
                  maxLength={i === 0 ? 5 : 3}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDraft((old) => ({
                      ...old,
                      [group]: old[group].map((v, n) => (i === n ? value : v)),
                    }));
                  }}
                />
                {catalog[group][i] > rtcLimits[i] && (
                  <span className="save-editor-note">{words.unusual}</span>
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
      {invalid && (
        <p className="save-editor-error" role="alert">
          {words.invalid}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          className="primary"
          disabled={disabled || !dirty}
          onClick={apply}
        >
          {words.apply}
        </button>
        <button
          type="button"
          disabled={disabled || !dirty}
          onClick={() => {
            setDraft(rtcDraft(catalog));
            setInvalid(false);
          }}
        >
          {words.discard}
        </button>
        <button
          type="button"
          disabled={disabled || dirty}
          onClick={() => void onApply({ action: "reset" })}
        >
          {words.reset}
        </button>
        <button
          type="button"
          disabled={disabled || dirty}
          onClick={() => void onApply({ action: "berryFix" })}
        >
          {words.berryFix}
        </button>
      </div>
      <p className="save-editor-note">{words.note}</p>
    </fieldset>
  );
}
