import { AlertTriangle, X } from 'lucide-react';
import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ConfirmationContext,
  type ConfirmationContextValue,
  type ConfirmationOptions,
} from '../../contexts/confirmation-context';

interface DialogState {
  options: ConfirmationOptions;
  isClosing: boolean;
}

export function ConfirmationDialogProvider({ children }: PropsWithChildren) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);
  const closeTimer = useRef<number | null>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    if (resolver.current) {
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setDialog({ options, isClosing: false });
    });
  }, []);

  const complete = useCallback(
    (confirmed: boolean) => {
      if (!dialog || dialog.isClosing) {
        return;
      }

      setDialog({ ...dialog, isClosing: true });
      closeTimer.current = window.setTimeout(() => {
        resolver.current?.(confirmed);
        resolver.current = null;
        closeTimer.current = null;
        setDialog(null);
      }, 180);
    },
    [dialog],
  );

  useEffect(() => {
    if (dialog) cancelButton.current?.focus();
  }, [dialog]);

  useEffect(
    () => () => {
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
      }
      resolver.current?.(false);
    },
    [],
  );

  const value = useMemo<ConfirmationContextValue>(() => ({ confirm }), [confirm]);
  const isDanger = dialog?.options.tone === 'danger';

  return (
    <ConfirmationContext.Provider value={value}>
      {children}
      {dialog ? (
        <div
          className={`fixed inset-0 z-[70] grid place-items-center bg-black/65 p-4 backdrop-blur-[2px] transition-opacity duration-200 ${
            dialog.isClosing ? 'opacity-0' : 'animate-[overlay-in_180ms_ease-out] opacity-100'
          }`}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              complete(false);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
            aria-describedby="confirmation-description"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === 'Escape') complete(false);
            }}
            className={`w-full max-w-md rounded-xl border border-[var(--zeva-border-strong)] bg-[#171b18] p-5 shadow-2xl shadow-black/50 transition duration-200 ${
              dialog.isClosing
                ? 'scale-[0.98] opacity-0'
                : 'animate-[dialog-in_180ms_ease-out] scale-100 opacity-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-lg border ${
                  isDanger
                    ? 'border-[#603f3f] bg-[#2b1d1d] text-[var(--zeva-danger)]'
                    : 'border-[#405043] bg-[#202a22] text-[var(--zeva-accent-strong)]'
                }`}
              >
                <AlertTriangle className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="confirmation-title" className="text-base font-semibold text-[#eef1ef]">
                  {dialog.options.title}
                </h2>
                <p
                  id="confirmation-description"
                  className="mt-1.5 text-sm leading-6 text-[var(--zeva-text-muted)]"
                >
                  {dialog.options.description}
                </p>
              </div>
              <button
                type="button"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-[#818a83] hover:bg-white/5 hover:text-[#dce1dd]"
                aria-label="Pencereyi kapat"
                onClick={() => complete(false)}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                ref={cancelButton}
                type="button"
                className="rounded-lg border border-[var(--zeva-border-strong)] px-3.5 py-2 text-sm font-medium text-[#cbd1cc] hover:bg-[var(--zeva-surface-hover)]"
                onClick={() => complete(false)}
              >
                {dialog.options.cancelLabel ?? 'Vazgeç'}
              </button>
              <button
                type="button"
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${
                  isDanger
                    ? 'bg-[#b95f5f] text-white hover:bg-[#c96d6d]'
                    : 'bg-[var(--zeva-accent)] text-[#0d140f] hover:bg-[var(--zeva-accent-strong)]'
                }`}
                onClick={() => complete(true)}
              >
                {dialog.options.confirmLabel ?? 'Onayla'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </ConfirmationContext.Provider>
  );
}
