# Zeva Mimari Kararları

## Genel yapı

Zeva tek repository içerisinde iki uygulama barındıran bir monorepo olarak geliştirilecektir.

- `apps/backend`: backend API
- `apps/frontend`: web arayüzü

Frontend ve backend bağımsız branch'lerde paralel geliştirilecektir.

## Backend

Teknolojiler:

- Node.js 24 LTS
- TypeScript
- Fastify
- Prisma ORM
- MySQL 8.4 LTS
- Zod
- Vitest
- Pino
- Swagger / OpenAPI
- JWT
- Argon2

Mimari yaklaşım: modüler monolith.

Temel akış:

`Route -> Controller -> Service -> Repository -> Prisma -> MySQL`

İlk modüller:

- auth
- customers
- customer-prices
- work-orders
- packages
- deliveries
- payments
- accounting
- dashboard
- reports
- settings

## Frontend

Teknolojiler:

- React
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod

Frontend backend'e REST API üzerinden bağlanır.

Geliştirmenin ilk aşamalarında backend endpointleri hazır değilse API sözleşmesine uygun mock veriler kullanılabilir.

## Ortak çalışma

`main` stabil entegrasyon branch'idir.

Backend feature branch örnekleri:

- `backend/setup`
- `backend/customers`
- `backend/work-orders`

Frontend feature branch örnekleri:

- `frontend/setup`
- `frontend/dashboard`
- `frontend/customers`

Tamamlanan özellikler Pull Request ile `main` branch'ine alınır.

## Git

Commit açıklamaları Türkçe yazılır ve Conventional Commits ön ekleri korunur.

Örnek:

- `feat: müşteri yönetimini ekle`
- `fix: iş emri durum kontrolünü düzelt`
- `test: ödeme API testlerini ekle`
