import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  triggerId?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  size?: 'small' | 'default';
  className?: string;
}

function enabledIndex<T extends string>(options: SelectOption<T>[], start: number, step: 1 | -1) {
  for (let offset = 1; offset <= options.length; offset += 1) {
    const index = (start + offset * step + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  triggerId,
  placeholder = 'Seçin',
  disabled = false,
  invalid = false,
  size = 'default',
  className = '',
}: SelectProps<T>) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnResize = () => setOpen(false);
    document.addEventListener('pointerdown', closeOnOutsideClick);
    window.addEventListener('resize', closeOnResize);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      window.removeEventListener('resize', closeOnResize);
    };
  }, [open]);

  const openMenu = () => {
    if (disabled) return;
    const bounds = rootRef.current?.getBoundingClientRect();
    if (bounds) {
      setDropUp(window.innerHeight - bounds.bottom < 260 && bounds.top > 260);
      setAlignRight(bounds.left + bounds.width / 2 > window.innerWidth / 2);
    }
    setActiveIndex(selectedIndex >= 0 && !selected?.disabled ? selectedIndex : enabledIndex(options, -1, 1));
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      openMenu();
      return;
    }
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => enabledIndex(options, current, event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActiveIndex(enabledIndex(options, event.key === 'Home' ? -1 : 0, event.key === 'Home' ? 1 : -1));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(activeIndex);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={triggerId}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-[#111512] px-3 text-left text-[var(--zeva-text)] transition-colors hover:border-[#4b554d] focus-visible:border-[var(--zeva-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--zeva-accent)]/20 disabled:cursor-not-allowed disabled:opacity-50 ${
          invalid ? 'border-[var(--zeva-danger)]' : 'border-[var(--zeva-border-strong)]'
        } ${size === 'small' ? 'min-h-9 text-xs' : 'min-h-11 text-sm'}`}
      >
        <span className={`min-w-0 truncate ${selected ? '' : 'text-[#707970]'}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-[#7f8981] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={`${id}-listbox`}
          role="listbox"
          aria-label={`${ariaLabel} seçenekleri`}
          className={`absolute z-50 max-h-64 w-full min-w-44 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-[var(--zeva-border-strong)] bg-[#171b18] p-1.5 shadow-2xl ${alignRight ? 'right-0' : 'left-0'} ${
            dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {options.map((option, index) => (
            <div
              id={`${id}-option-${index}`}
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              onPointerMove={() => !option.disabled && setActiveIndex(index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
              className={`flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                option.disabled
                  ? 'cursor-not-allowed text-[#5e665f]'
                  : activeIndex === index
                    ? 'bg-[#263229] text-[#eef3ef]'
                    : 'text-[#c4cbc5] hover:bg-[#212822]'
              }`}
            >
              <span>{option.label}</span>
              {option.value === value ? <Check className="size-4 shrink-0 text-[var(--zeva-accent-strong)]" aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
