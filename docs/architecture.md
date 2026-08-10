# Zeva Mimari Kararları

## Genel yapı

Zeva tek repository içerisinde iki uygulama barındıran bir monorepo olarak geliştirilecektir.

- `apps/backend`: backend API
- `apps/frontend`: web arayüzü

Codex, projenin frontend, backend, veritabanı, test, CI ve dokümantasyon geliştirmesinden uçtan uca sorumludur.

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

Ana modüller:

- auth
- customers
- customer-prices
- work-orders
- packages
- printing
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

Arayüz modern, koyu, sade ve tekstil atölyesinde hızlı kullanıma uygun olacaktır.

## Özellik bazlı geliştirme

Geliştirme frontend ve backend branch'lerine bölünmeyecek. Her özellik mümkün olduğunca uçtan uca geliştirilecektir.

Örnek branch'ler:

- `feature/project-setup`
- `feature/auth`
- `feature/customers`
- `feature/work-orders`
- `feature/packages`
- `feature/accounting`
- `feature/dashboard`
- `feature/reports`

Örneğin `feature/customers` branch'i müşteri veri modeli, backend API, doğrulama, testler ve frontend müşteri ekranlarını birlikte içerebilir.

## Entegrasyon

`main` stabil entegrasyon branch'idir.

Tamamlanan özellikler Pull Request ile `main` branch'ine alınır.

Pull Request merge edilmeden önce ilgili typecheck, lint, test ve build kontrolleri geçmelidir.

## Git

Commit açıklamaları Türkçe yazılır ve Conventional Commits ön ekleri korunur.

Örnek:

- `feat: müşteri yönetimini uçtan uca ekle`
- `fix: iş emri durum kontrolünü düzelt`
- `test: ödeme entegrasyon testlerini ekle`
- `ci: proje kalite kontrollerini ekle`
