import { zodResolver } from '@hookform/resolvers/zod';
import { Factory, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { useAuth } from '../hooks/use-auth';
import { useToast } from '../hooks/use-toast';
import { ApiError } from '../lib/api-client';

const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'E-posta adresi zorunludur.')
    .email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(1, 'Şifre zorunludur.'),
});

type LoginFormData = z.infer<typeof loginFormSchema>;

interface LoginLocationState {
  from?: {
    pathname?: string;
  };
}

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Sunucu bağlantısı kurulamadı. Lütfen tekrar deneyin.';
}

export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit: SubmitHandler<LoginFormData> = async (credentials) => {
    try {
      const user = await login(credentials);
      toast.success('Giriş başarılı', `Hoş geldiniz, ${user.name}.`);
      const state = location.state as LoginLocationState | null;
      void navigate(state?.from?.pathname ?? '/', { replace: true });
    } catch (error) {
      const message = getLoginErrorMessage(error);
      setError('root', { message });
      toast.error('Giriş yapılamadı', message);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--zeva-bg)] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)]">
      <section className="relative hidden min-h-screen border-r border-[var(--zeva-border)] bg-[#101411] px-12 py-10 lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg border border-[#42614d] bg-[#1d2b21] text-[var(--zeva-accent-strong)]">
            <Factory className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-semibold tracking-tight">Zeva</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--zeva-text-muted)]">
              Atölye yönetimi
            </p>
          </div>
        </div>

        <div className="max-w-xl pb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--zeva-accent)]">
            Güvenli çalışma alanı
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.03em] text-[#edf1ee] xl:text-5xl">
            Atölyenizin tüm akışı tek, düzenli çalışma alanında.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[var(--zeva-text-muted)]">
            İş emirleri, üretim adımları, müşteriler ve finansal hareketler yetkili kullanıcılar tarafından güvenle yönetilir.
          </p>
          <div className="mt-8 flex items-center gap-3 border-t border-[var(--zeva-border)] pt-5 text-sm text-[#b5bdb7]">
            <ShieldCheck className="size-5 text-[var(--zeva-accent)]" aria-hidden="true" />
            Yalnızca yetkilendirilmiş yönetici erişimi
          </div>
        </div>

        <p className="text-xs text-[#687169]">Zeva Tekstil Atölyesi Yönetim Sistemi</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md animate-[page-in_180ms_ease-out]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-lg border border-[#42614d] bg-[#1d2b21] text-[var(--zeva-accent-strong)]">
              <Factory className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-semibold">Zeva</p>
              <p className="text-xs text-[var(--zeva-text-muted)]">Atölye yönetimi</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--zeva-accent)]">
              Yönetici girişi
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#eef2ef]">Tekrar hoş geldiniz</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--zeva-text-muted)]">
              Zeva çalışma alanına devam etmek için bilgilerinizi girin.
            </p>
          </div>

          <form
            className="mt-8 space-y-5"
            noValidate
            onSubmit={(event) => {
              void handleSubmit(onSubmit)(event);
            }}
          >
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#d8ded9]">
                E-posta
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-[#778078]" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  aria-invalid={Boolean(errors.email)}
                  className="h-11 w-full rounded-lg border border-[var(--zeva-border-strong)] bg-[var(--zeva-surface)] pl-11 pr-3 text-sm text-[var(--zeva-text)] placeholder:text-[#687169] hover:border-[#485248] focus:border-[var(--zeva-accent)] focus:outline-none"
                  placeholder="yonetici@zeva.com"
                  {...register('email')}
                />
              </div>
              {errors.email ? <p className="mt-1.5 text-xs text-[var(--zeva-danger)]">{errors.email.message}</p> : null}
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#d8ded9]">
                Şifre
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-[#778078]" aria-hidden="true" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  className="h-11 w-full rounded-lg border border-[var(--zeva-border-strong)] bg-[var(--zeva-surface)] pl-11 pr-3 text-sm text-[var(--zeva-text)] placeholder:text-[#687169] hover:border-[#485248] focus:border-[var(--zeva-accent)] focus:outline-none"
                  placeholder="Şifrenizi girin"
                  {...register('password')}
                />
              </div>
              {errors.password ? <p className="mt-1.5 text-xs text-[var(--zeva-danger)]">{errors.password.message}</p> : null}
            </div>

            {errors.root ? (
              <p role="alert" className="rounded-lg border border-[#5f3d3d] bg-[#261a1a] px-3.5 py-3 text-sm text-[#e4a0a0]">
                {errors.root.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--zeva-accent)] px-4 text-sm font-semibold text-[#0d140f] hover:bg-[var(--zeva-accent-strong)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-[#31513b] border-t-transparent" aria-hidden="true" />
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş yap'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-[#727b74]">
            Hesap erişimi için sistem yöneticinizle iletişime geçin.
          </p>
        </div>
      </section>
    </main>
  );
}
