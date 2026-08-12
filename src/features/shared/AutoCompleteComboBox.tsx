import {
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

export interface AutoCompleteOption<T extends string | number> {
  readonly label: string;
  readonly value: T;
}

interface AutoCompleteComboBoxProps<T extends string | number> {
  readonly inputValue: string;
  readonly label: string;
  readonly onInputChange: (value: string) => void;
  readonly onValueChange: (value: T) => void;
  readonly options: readonly AutoCompleteOption<T>[];
  readonly value: T;
}

/** Mirrors PokeFinder ComboBox::enableAutoComplete with NoInsert semantics. */
export function AutoCompleteComboBox<T extends string | number>({
  inputValue,
  label,
  onInputChange,
  onValueChange,
  options,
  value,
}: AutoCompleteComboBoxProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [filterText, setFilterText] = useState<string>();
  const normalizedFilter = filterText?.toLocaleLowerCase();
  const filteredOptions = useMemo(
    () =>
      normalizedFilter
        ? options.filter((option) =>
            option.label.toLocaleLowerCase().includes(normalizedFilter),
          )
        : options,
    [normalizedFilter, options],
  );
  const selectedIndex = filteredOptions.findIndex(
    (option) => option.value === value,
  );
  const visibleActiveIndex = Math.min(
    Math.max(activeIndex, 0),
    Math.max(filteredOptions.length - 1, 0),
  );
  const activeOption = filteredOptions[visibleActiveIndex];
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setFilterText(undefined);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${listboxId}-option-${visibleActiveIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [listboxId, open, visibleActiveIndex]);

  const openMenu = () => {
    setFilterText(undefined);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const selectOption = (option: AutoCompleteOption<T>) => {
    onInputChange(option.label);
    onValueChange(option.value);
    setOpen(false);
    setFilterText(undefined);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) =>
        Math.min(
          Math.max(current + direction, 0),
          Math.max(filteredOptions.length - 1, 0),
        ),
      );
      return;
    }
    if (event.key === "Enter" && open) {
      const option = filteredOptions[visibleActiveIndex];
      if (option) {
        event.preventDefault();
        selectOption(option);
      }
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setFilterText(undefined);
    }
  };

  return (
    <div className="autocomplete-combobox" ref={rootRef}>
      <input
        aria-activedescendant={
          open && activeOption ? optionId(visibleActiveIndex) : undefined
        }
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-label={label}
        autoComplete="off"
        onChange={(event) => {
          onInputChange(event.target.value);
          setFilterText(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onClick={openMenu}
        onKeyDown={handleKeyDown}
        ref={inputRef}
        role="combobox"
        value={inputValue}
      />
      <button
        aria-label={label}
        className="autocomplete-combobox-trigger"
        onClick={() => {
          if (open) {
            setOpen(false);
            setFilterText(undefined);
          } else {
            inputRef.current?.focus();
            openMenu();
          }
        }}
        tabIndex={-1}
        type="button"
      >
        <span aria-hidden="true">v</span>
      </button>
      {open && filteredOptions.length > 0 && (
        <div
          className="autocomplete-combobox-menu"
          id={listboxId}
          role="listbox"
        >
          {filteredOptions.map((option, index) => (
            <button
              aria-selected={option.value === value}
              className={index === visibleActiveIndex ? "active" : undefined}
              id={optionId(index)}
              key={`${String(option.value)}-${option.label}`}
              onClick={() => selectOption(option)}
              onMouseDown={(event) => event.preventDefault()}
              role="option"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
