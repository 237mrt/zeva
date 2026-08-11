import { AlertTriangle, CheckCircle2, CircleAlert, Info, X, type LucideIcon } from 'lucide-react';
import { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ToastContext,
  type ToastContextValue,
  type ToastOptions,
  type ToastType,
} from '../../contexts/toast-context';

interface ToastRecord {
  id: string;
  type: ToastType;
  title: string;
  message: string | undefined;
  isClosing: boolean;
}

const toastStyles: Record<ToastType, { icon: LucideIcon; className: string }> = {
  success: { icon: CheckCircle2, className: 'border-[#355443] text-[#9acbad]' },
  error: { icon: CircleAlert, className: 'border-[#613d3d] text-[#e49b9b]' },
  warning: { icon: AlertTriangle, className: 'border-[#5c4d32] text-[#dfbc75]' },
  info: { icon: Info, className: 'border-[#354e62] text-[#91b9d9]' },
};

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const activeKeys = useRef(new Map<string, string>());
  const autoDismissTimers = useRef(new Map<string, number>());
  const closeTimers = useRef(new Map<string, number>());

  const removeToast = useCallback((id: string) => {
    const activeKey = activeKeys.current.get(id);
    if (activeKey) {
      activeKeys.current.delete(id);
      activeKeys.current.delete(activeKey);
    }

    const autoDismissTimer = autoDismissTimers.current.get(id);
    if (autoDismissTimer) {
      window.clearTimeout(autoDismissTimer);
      autoDismissTimers.current.delete(id);
    }

    const closeTimer = closeTimers.current.get(id);
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimers.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      setToasts((current) =>
        current.map((toast) => (toast.id === id ? { ...toast, isClosing: true } : toast)),
      );

      if (!closeTimers.current.has(id)) {
        closeTimers.current.set(
          id,
          window.setTimeout(() => {
            removeToast(id);
          }, 180),
        );
      }
    },
    [removeToast],
  );

  const show = useCallback(
    (type: ToastType, options: ToastOptions): string => {
      const key = `${type}:${options.title}:${options.message ?? ''}`;
      const existingId = activeKeys.current.get(key);

      if (existingId) {
        return existingId;
      }

      const id = crypto.randomUUID();
      activeKeys.current.set(key, id);
      activeKeys.current.set(id, key);
      setToasts((current) => [
        ...current,
        {
          id,
          type,
          title: options.title,
          message: options.message,
          isClosing: false,
        },
      ]);

      autoDismissTimers.current.set(
        id,
        window.setTimeout(() => {
          dismiss(id);
        }, options.duration ?? 4_500),
      );

      return id;
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      autoDismissTimers.current.forEach((timer) => window.clearTimeout(timer));
      closeTimers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      dismiss,
      success: (title, message) => show('success', { title, message }),
      error: (title, message) => show('error', { title, message }),
      warning: (title, message) => show('warning', { title, message }),
      info: (title, message) => show('info', { title, message }),
    }),
    [dismiss, show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 top-4 z-[80] flex flex-col items-end gap-2 sm:left-auto sm:w-[380px]"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const style = toastStyles[toast.type];
          const Icon = style.icon;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto w-full rounded-xl border bg-[#171b18] p-4 shadow-2xl shadow-black/35 ${style.className} ${
                toast.isClosing
                  ? 'animate-[toast-out_180ms_ease-in_forwards]'
                  : 'animate-[toast-in_180ms_ease-out]'
              }`}
              role={toast.type === 'error' ? 'alert' : 'status'}
            >
              <div className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#eef1ef]">{toast.title}</p>
                  {toast.message ? (
                    <p className="mt-1 text-xs leading-5 text-[var(--zeva-text-muted)]">{toast.message}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="grid size-7 shrink-0 place-items-center rounded-md text-[#7f8881] hover:bg-white/5 hover:text-[#d8ddd9]"
                  aria-label="Bildirimi kapat"
                  onClick={() => dismiss(toast.id)}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
