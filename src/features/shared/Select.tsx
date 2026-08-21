import {
  Children,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { useMenuPlacement } from "./useMenuPlacement";

type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "children" | "onChange" | "onClick" | "onKeyDown" | "onMouseDown"
> & {
  children?: ReactNode;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
};

interface SelectOption {
  disabled: boolean;
  group?: string;
  label: string;
  value: string;
}

function collectOptions(children: ReactNode, group?: string): SelectOption[] {
  const options: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!child || typeof child !== "object" || !("type" in child)) return;
    const element = child as ReactElement<{
      children?: ReactNode;
      disabled?: boolean;
      label?: string;
      value?: string | number;
    }>;
    if (element.type === "option") {
      const label = Children.toArray(element.props.children)
        .map((part) => (typeof part === "string" ? part : ""))
        .join("")
        .trim();
      options.push({
        disabled: Boolean(element.props.disabled),
        group,
        label,
        value: String(element.props.value ?? label),
      });
      return;
    }
    if (element.type === "optgroup") {
      options.push(
        ...collectOptions(element.props.children, element.props.label),
      );
    }
  });
  return options;
}

function createChangeEvent(
  value: string,
  name: string | undefined,
): ChangeEvent<HTMLSelectElement> {
  const target = { name: name ?? "", value } as HTMLSelectElement;
  return { target, currentTarget: target } as ChangeEvent<HTMLSelectElement>;
}

export function Select({
  children,
  className,
  disabled = false,
  id,
  name,
  onBlur,
  onChange,
  onFocus,
  style,
  tabIndex,
  title,
  value,
  defaultValue,
  ...ariaAndDataProps
}: SelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const options = useMemo(() => collectOptions(children), [children]);
  const initialValue = defaultValue == null ? "" : String(defaultValue);
  const controlledValue = value == null ? undefined : String(value);
  const [uncontrolledValue, setUncontrolledValue] = useState(initialValue);
  const selectedValue = controlledValue ?? uncontrolledValue;
  const [open, setOpen] = useState(false);
  const menuPlacement = useMenuPlacement(
    rootRef,
    open && !disabled,
    options.length * 44 + 8,
  );
  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === selectedValue),
    0,
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selectedOption = options[selectedIndex];
  const enabledIndexes = options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);
  const triggerProps = Object.fromEntries(
    Object.entries(ariaAndDataProps).filter(
      ([key]) => key.startsWith("aria-") || key.startsWith("data-"),
    ),
  );

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${listboxId}-option-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId, open]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    if (controlledValue === undefined) setUncontrolledValue(option.value);
    onChange?.(createChangeEvent(option.value, name));
    setOpen(false);
    triggerRef.current?.focus();
  };

  const moveActive = (direction: 1 | -1) => {
    if (enabledIndexes.length === 0) return;
    const currentPosition = Math.max(enabledIndexes.indexOf(activeIndex), 0);
    const nextPosition = Math.min(
      Math.max(currentPosition + direction, 0),
      enabledIndexes.length - 1,
    );
    setActiveIndex(enabledIndexes[nextPosition]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setActiveIndex(selectedIndex);
        setOpen(true);
      } else {
        moveActive(event.key === "ArrowDown" ? 1 : -1);
      }
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      choose(activeIndex);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(enabledIndexes[0] ?? 0);
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(enabledIndexes.at(-1) ?? 0);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLButtonElement>) => {
    onBlur?.(event as unknown as FocusEvent<HTMLSelectElement>);
  };
  const handleFocus = (event: FocusEvent<HTMLButtonElement>) => {
    onFocus?.(event as unknown as FocusEvent<HTMLSelectElement>);
  };

  return (
    <div
      className={`haku-select ${className ?? ""}`.trim()}
      data-open={open && !disabled ? "true" : undefined}
      ref={rootRef}
    >
      <button
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="haku-select-trigger"
        disabled={disabled}
        id={id}
        onBlur={handleBlur}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        ref={triggerRef}
        style={style}
        tabIndex={tabIndex}
        title={title}
        type="button"
        {...triggerProps}
      >
        <span>{selectedOption?.label ?? ""}</span>
        <ChevronDown
          aria-hidden="true"
          className={open ? "rotated" : undefined}
          size={17}
        />
      </button>
      {open && !disabled && (
        <div
          aria-label={title}
          className="haku-select-menu"
          data-align={menuPlacement.horizontal}
          data-placement={menuPlacement.vertical}
          id={listboxId}
          role="listbox"
        >
          {options.map((option, index) => (
            <div key={`${option.group ?? "root"}-${option.value}-${index}`}>
              {option.group &&
                (index === 0 || options[index - 1]?.group !== option.group) && (
                  <div className="haku-select-group-label">{option.group}</div>
                )}
              <button
                aria-selected={option.value === selectedValue}
                className={index === activeIndex ? "active" : undefined}
                disabled={option.disabled}
                id={`${listboxId}-option-${index}`}
                onClick={() => choose(index)}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                type="button"
              >
                <span>{option.label}</span>
                {option.value === selectedValue && (
                  <Check aria-hidden="true" size={15} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
