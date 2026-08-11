# Zeva

Müşteri, iş emri, ütü-paket, baskı, teslimat ve ödeme süreçlerini tek yerden yönetmek için geliştirilen modern tekstil atölyesi yönetim sistemi.

Proje altyapısına ek olarak yönetici bootstrap mekanizması, güvenli login akışı, korumalı frontend oturumu ve müşteri/fiyat yönetimi bulunur. İş emirleri ve ödemeler gibi diğer domain özellikleri sonraki feature branch'lerinde uçtan uca geliştirilecektir.

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

- Backend: Node.js 24 LTS, TypeScript, Fastify, Prisma, MySQL 8.4, Zod, Vitest, Pino, OpenAPI, JWT ve Argon2id.
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

`.env` dosyalarındaki örnek değerleri yalnızca yerel geliştirme ortamına uygun değerlerle değiştirin. Gerçek secret bilgilerini repository'ye eklemeyin. Backend `DATABASE_URL` içindeki kullanıcı ve şifre, kök `.env` dosyasındaki MySQL değerleriyle eşleşmelidir.

`JWT_SECRET` en az 32 karakterlik, tahmin edilmesi zor rastgele bir değer olmalıdır. Güvenli bir örnek değer üretmek için:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

İlk yönetici hesabı public register endpointi yerine `ZEVA_ADMIN_EMAIL`, `ZEVA_ADMIN_PASSWORD` ve `ZEVA_ADMIN_NAME` değerlerinden oluşturulur. MySQL başladıktan sonra migration ve idempotent bootstrap komutlarını çalıştırın:

```bash
pnpm db:migrate
pnpm db:bootstrap-admin
```

Bootstrap komutu aynı e-posta için tekrar çalıştırıldığında ikinci bir hesap oluşturmaz ve mevcut hesabın şifresini değiştirmez.

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
| `pnpm db:bootstrap-admin` | Environment değerlerinden ilk yönetici hesabını idempotent olarak oluşturur. |

## Geliştirme modeli

Geliştirme özellik bazlı `feature/` branch'lerinde yürütülür. Her özellik mümkün olduğunca veritabanı, backend, frontend ve testleriyle birlikte tamamlanır. Typecheck, lint, test ve build kontrolleri geçtikten sonra `main` branch'i için Pull Request hazırlanır.

Commit mesajlarında Conventional Commits ön eki ve Türkçe açıklama kullanılır.
