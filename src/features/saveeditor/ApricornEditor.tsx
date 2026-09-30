import { useEffect, useState } from "react";
import type { BagReport, BagOperation } from "./domain";
import { ItemImage } from "./ItemImage";
import { apricornOperation, apricornWords } from "./apricorns";
export function ApricornEditor({
  items,
  lang,
  disabled,
  onApply,
  onDirty,
}: {
  items: NonNullable<BagReport["apricorns"]>;
  lang: "zh" | "en" | "ja";
  disabled: boolean;
  onApply(edit: BagOperation): Promise<void>;
  onDirty(dirty: boolean): void;
}) {
  const words = apricornWords[lang];
  const [values, setValues] = useState(items.map((i) => String(i.count)));
  const [invalid, setInvalid] = useState(false);
  const dirty = values.some((v, i) => v !== String(items[i].count));
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const apply = () => {
    let edit;
    try {
      edit = apricornOperation("apricornEdit", values);
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
      <div className="save-editor-fields">
        {items.map((item, i) => (
          <label className="field" key={item.index}>
            <span>
              <ItemImage sprite={item.sprite} />
              {item.name[lang]} · 0–255
            </span>
            <input
              inputMode="numeric"
              maxLength={3}
              value={values[i]}
              onChange={(e) => {
                const value = e.target.value;
                setValues((old) => old.map((v, n) => (n === i ? value : v)));
              }}
            />
          </label>
        ))}
      </div>
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
            setValues(items.map((i) => String(i.count)));
            setInvalid(false);
          }}
        >
          {words.discard}
        </button>
        <button
          type="button"
          disabled={disabled || dirty}
          onClick={() => void onApply(apricornOperation("apricornFill"))}
        >
          {words.fill}
        </button>
        <button
          type="button"
          disabled={disabled || dirty}
          onClick={() => void onApply(apricornOperation("apricornClear"))}
        >
          {words.clear}
        </button>
      </div>
      <p className="save-editor-note">{words.note}</p>
    </fieldset>
  );
}
