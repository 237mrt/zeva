# Zeva

Müşteri, iş emri, ütü-paket, baskı, teslimat ve ödeme süreçlerini tek yerden yönetmek için geliştirilmiş modern bir tekstil atölyesi yönetim sistemi.

## Proje yapısı

Zeva, frontend ve backend uygulamalarının aynı repository içerisinde tutulduğu bir monorepo olarak geliştirilecektir.

- `apps/backend`: Node.js + TypeScript + Fastify + Prisma + MySQL backend
- `apps/frontend`: React + TypeScript + Vite frontend
- `docs`: ürün, mimari ve API sözleşmeleri

## Geliştirme modeli

Projenin tüm geliştirmesi Codex tarafından özellik bazlı feature branch'lerinde yürütülecektir.

Her özellik mümkün olduğunca veritabanı, backend, frontend ve testleriyle birlikte uçtan uca tamamlanacaktır.

Örnek branch'ler:

- `feature/project-setup`
- `feature/customers`
- `feature/work-orders`
- `feature/accounting`

Tamamlanan özellikler Pull Request üzerinden `main` branch'ine alınacaktır. `main` stabil entegrasyon branch'i olarak korunacaktır.

Commit mesajlarının açıklama kısmı Türkçe yazılır ve Conventional Commits ön ekleri kullanılır.
