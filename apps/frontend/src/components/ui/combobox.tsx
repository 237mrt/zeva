import { Check, ChevronDown, LoaderCircle, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  value: string;
  selectedLabel?: string | undefined;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  onSearchChange: (query: string) => void;
  ariaLabel: string;
  inputId?: string;
  placeholder: string;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  clearOptionLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

export function Combobox({
  value,
  selectedLabel,
  options,
  onChange,
  onSearchChange,
  ariaLabel,
  inputId,
  placeholder,
  loading = false,
  loadingText = 'Seçenekler yükleniyor…',
  emptyText = 'Sonuç bulunamadı.',
  clearOptionLabel,
  disabled = false,
  invalid = false,
  className = '',
}: ComboboxProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [inputValue, setInputValue] = useState<string | null>(null);
  const visibleOptions = useMemo(
    () => (clearOptionLabel ? [{ value: '', label: clearOptionLabel }, ...options] : options),
    [clearOptionLabel, options],
  );

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setInputValue(null);
      }
    };
    const closeOnResize = () => {
      setOpen(false);
      setInputValue(null);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    window.addEventListener('resize', closeOnResize);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      window.removeEventListener('resize', closeOnResize);
    };
  }, [open]);

  const openList = () => {
    if (disabled) return;
    const bounds = rootRef.current?.getBoundingClientRect();
    if (bounds) {
      setDropUp(window.innerHeight - bounds.bottom < 300 && bounds.top > 300);
      setAlignRight(bounds.left + bounds.width / 2 > window.innerWidth / 2);
    }
    const selectedIndex = visibleOptions.findIndex((option) => option.value === value);
    setActiveIndex(Math.max(0, selectedIndex));
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = visibleOptions[index];
    if (!option) return;
    onChange(option.value);
    onSearchChange('');
    setInputValue(null);
    setOpen(false);
  };

  const clear = () => {
    onChange('');
    onSearchChange('');
    setInputValue('');
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (!open) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setInputValue(null);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) openList();
      else if (visibleOptions.length > 0) {
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((current) => (current + step + visibleOptions.length) % visibleOptions.length);
      }
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      choose(activeIndex);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className={`flex min-h-11 items-center gap-2 rounded-lg border bg-[#111512] px-3 transition-colors focus-within:border-[var(--zeva-accent)] focus-within:ring-2 focus-within:ring-[color:var(--zeva-accent)]/20 ${invalid ? 'border-[var(--zeva-danger)]' : 'border-[var(--zeva-border-strong)]'} ${disabled ? 'opacity-50' : ''}`}>
        <Search className="size-4 shrink-0 text-[#758078]" aria-hidden="true" />
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-activedescendant={open && visibleOptions[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          autoComplete="off"
          disabled={disabled}
          value={inputValue ?? (value ? (selectedLabel ?? '') : (clearOptionLabel ?? ''))}
          placeholder={placeholder}
          onFocus={(event) => {
            openList();
            if (value) event.currentTarget.select();
          }}
          onChange={(event) => {
            const query = event.target.value;
            setInputValue(query);
            onSearchChange(query);
            setActiveIndex(0);
            if (!open) openList();
          }}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-[var(--zeva-text)] placeholder:text-[#707970] focus:outline-none disabled:cursor-not-allowed"
        />
        {loading ? <LoaderCircle className="size-4 shrink-0 animate-spin text-[var(--zeva-accent)]" aria-hidden="true" /> : null}
        {!disabled && (value || inputValue) ? (
          <button type="button" aria-label={`${ariaLabel} seçimini temizle`} onPointerDown={(event) => event.preventDefault()} onClick={clear} className="grid size-7 shrink-0 place-items-center rounded-md text-[#7e8780] hover:bg-[#262d27] hover:text-[#dce2dd]">
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : (
          <ChevronDown className={`size-4 shrink-0 text-[#758078] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        )}
      </div>

      {open ? (
        <div id={`${id}-listbox`} role="listbox" aria-label={`${ariaLabel} seçenekleri`} className={`absolute z-50 max-h-72 w-full min-w-56 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-[var(--zeva-border-strong)] bg-[#171b18] p-1.5 shadow-2xl ${alignRight ? 'right-0' : 'left-0'} ${dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}>
          {loading ? <p className="px-3 py-3 text-sm text-[var(--zeva-text-muted)]">{loadingText}</p> : null}
          {!loading && options.length === 0 ? <p className="px-3 py-3 text-sm leading-5 text-[var(--zeva-text-muted)]">{emptyText}</p> : null}
          {!loading
            ? visibleOptions.map((option, index) => (
                <div
                  id={`${id}-option-${index}`}
                  key={`${option.value}-${option.label}`}
                  role="option"
                  aria-selected={option.value === value}
                  onPointerMove={() => setActiveIndex(index)}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => choose(index)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors ${activeIndex === index ? 'bg-[#263229] text-[#eef3ef]' : 'text-[#c4cbc5] hover:bg-[#212822]'}`}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value ? <Check className="size-4 shrink-0 text-[var(--zeva-accent-strong)]" aria-hidden="true" /> : null}
                </div>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
