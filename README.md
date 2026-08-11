# Zeva

Müşteri, iş emri, ütü-paket, baskı, teslimat ve ödeme süreçlerini tek yerden yönetmek için geliştirilen modern tekstil atölyesi yönetim sistemi.

Bu branch proje altyapısını içerir. Müşteriler, iş emirleri ve ödemeler gibi gerçek domain özellikleri sonraki feature branch'lerinde uçtan uca geliştirilecektir.

## Proje yapısı

Zeva, pnpm workspace kullanan bir monorepodur.

```text
zeva/
├── .github/workflows/ci.yml
├── apps/
│   ├── backend/
│   │   ├── prisma/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── modules/
│   │   │   ├── plugins/
│   │   │   ├── routes/
│   │   │   └── shared/
│   │   └── tests/
│   └── frontend/
│       └── src/
│           ├── app/
│           ├── components/
│           ├── contexts/
│           ├── hooks/
│           ├── layouts/
│           ├── lib/
│           └── pages/
├── docs/
├── compose.yaml
├── package.json
└── pnpm-workspace.yaml
```

## Teknolojiler

- Backend: Node.js 24 LTS, TypeScript, Fastify, Prisma, MySQL 8.4, Zod, Vitest, Pino ve OpenAPI.
- Frontend: React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Hook Form ve Zod.
- Geliştirme ortamı: pnpm workspace, Docker Compose ve GitHub Actions.

## Gereksinimler

- Node.js 24 LTS
- Corepack veya pnpm 11
- Docker Desktop ya da Docker Engine + Compose

## Kurulum

```bash
corepack enable
pnpm install
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

`.env` dosyalarındaki `change-me` değerlerini yalnızca yerel geliştirme ortamına uygun değerlerle değiştirin. Gerçek secret bilgilerini repository'ye eklemeyin. Backend `DATABASE_URL` içindeki kullanıcı ve şifre, kök `.env` dosyasındaki MySQL değerleriyle eşleşmelidir.

MySQL'i ve uygulamaları başlatın:

```bash
pnpm db:up
pnpm dev
```

Servis adresleri:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api/v1`
- Health endpoint: `http://localhost:3000/api/v1/health`
- Swagger UI: `http://localhost:3000/docs`

MySQL loglarını izlemek ve ortamı durdurmak için:

```bash
pnpm db:logs
pnpm db:down
```

`db:down` kalıcı geliştirme volume'unu silmez.

## Kök komutlar

| Komut | Açıklama |
| --- | --- |
| `pnpm dev` | Backend ve frontend geliştirme sunucularını paralel başlatır. |
| `pnpm typecheck` | Tüm workspace paketlerinde TypeScript kontrolü çalıştırır. |
| `pnpm lint` | Tüm workspace paketlerinde ESLint çalıştırır. |
| `pnpm test` | Backend ve frontend testlerini çalıştırır. |
| `pnpm build` | Backend ve frontend production build'lerini oluşturur. |
| `pnpm db:migrate` | Prisma geliştirme migration komutunu çalıştırır. |

## Geliştirme modeli

Geliştirme özellik bazlı `feature/` branch'lerinde yürütülür. Her özellik mümkün olduğunca veritabanı, backend, frontend ve testleriyle birlikte tamamlanır. Typecheck, lint, test ve build kontrolleri geçtikten sonra `main` branch'i için Pull Request hazırlanır.

Commit mesajlarında Conventional Commits ön eki ve Türkçe açıklama kullanılır.
