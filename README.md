# Zeva

Müşteri, iş emri, ütü-paket, baskı, teslimat ve ödeme süreçlerini tek yerden yönetmek için geliştirilmiş modern bir tekstil atölyesi yönetim sistemi.

## Proje yapısı

Zeva, frontend ve backend uygulamalarının aynı repository içerisinde tutulduğu bir monorepo olarak geliştirilecektir.

- `apps/backend`: Node.js + TypeScript + Fastify + Prisma + MySQL backend
- `apps/frontend`: React + TypeScript + Vite frontend
- `docs`: ortak mimari ve API sözleşmeleri

## Çalışma modeli

Frontend ve backend ayrı feature branch'lerinde paralel olarak geliştirilecek, tamamlanan işler Pull Request üzerinden `main` branch'ine alınacaktır.
