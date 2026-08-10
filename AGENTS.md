# Zeva Codex Geliştirme Kuralları

Zeva, frontend ve backend uygulamalarının aynı repository içerisinde geliştirildiği bir monorepo projesidir.

## Sorumluluk

Codex yalnızca backend geliştirmesinden sorumludur.

Backend kaynak kodu:

`apps/backend/`

Açıkça istenmedikçe şu dizindeki dosyaları değiştirme:

`apps/frontend/`

## Backend teknoloji yığını

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
- pnpm

## Mimari

Modüler monolith mimarisi kullan.

Backend özelliklerini `apps/backend/src/modules/` altında modüllere ayır.

Gerektiğinde şu sorumlulukları ayrı tut:

- routes
- controllers
- services
- repositories
- schemas
- types

İş kuralları service katmanında bulunmalıdır.

Veritabanı erişimi repository katmanında bulunmalıdır.

Controller katmanı ince tutulmalı ve HTTP ile ilgili işlemlerle ilgilenmelidir.

## API kuralları

- Tüm API endpointleri `/api/v1` prefix'i kullanmalıdır.
- Başarı ve hata response yapıları tutarlı olmalıdır.
- Endpointler OpenAPI ile belgelenmelidir.
- Dışarıdan gelen bütün veriler doğrulanmalıdır.
- API sözleşmesinde gereksiz breaking change yapılmamalıdır.
- API sözleşmesi değişirse dokümantasyon da aynı değişiklikte güncellenmelidir.

## Veritabanı

- Veritabanı erişiminde Prisma kullan.
- Güçlü ve belgelenmiş bir gerekçe olmadıkça raw SQL kullanma.
- Şema değişiklikleri migration ile yapılmalıdır.
- Para değerlerinde uygun DECIMAL tipleri kullanılmalıdır.
- Geri getirilebilir kayıtlar için soft delete kullanılmalıdır.
- Tarihler veritabanında UTC olarak saklanmalıdır.

## Kalite

Bir özellik tamamlanmadan önce:

- TypeScript typecheck çalıştır.
- lint çalıştır.
- testleri çalıştır.
- mevcut testlerin bozulmadığını doğrula.
- yeni davranış için gerekli testleri ekle.
- başarısız testleri sessizce silme veya devre dışı bırakma.

## Git ve commit kuralları

Doğrudan `main` üzerinde geliştirme yapma.

Backend branch'leri `backend/` prefix'i kullanmalıdır.

Örnekler:

- `backend/setup`
- `backend/customers`
- `backend/work-orders`
- `backend/payments`

Commit mesajları TÜRKÇE yazılmalıdır.

Conventional Commits ön eklerini kullan, ancak açıklama kısmı Türkçe olmalıdır.

Kullanılabilecek ön ekler:

- `feat:`
- `fix:`
- `test:`
- `refactor:`
- `docs:`
- `chore:`
- `ci:`
- `build:`

Doğru örnekler:

- `chore: Fastify backend altyapısını oluştur`
- `feat: müşteri yönetimini ekle`
- `feat: iş emri oluşturma akışını ekle`
- `fix: çuval adet toplamı kontrolünü düzelt`
- `test: müşteri API entegrasyon testlerini ekle`
- `refactor: müşteri servis katmanını sadeleştir`
- `docs: Swagger dokümantasyonunu güncelle`

İngilizce commit mesajı yazma.

Her dosya değişikliğinde commit oluşturma. Tek bir mantıksal geliştirme adımını temsil eden küçük ve anlamlı commitler oluştur.

Tamamlanan commitleri aktif backend branch'ine push et.

Bir backend özelliği tamamlandığında ve bütün kontroller geçtiğinde `main` branch'ine Pull Request hazırla.

Açıkça istenmedikçe Pull Request'i otomatik olarak merge etme.

## Frontend koordinasyonu

Frontend bağımsız olarak geliştirilmektedir.

Frontend UI geliştirme.

Backend ve frontend arasındaki ana sözleşme OpenAPI dokümantasyonudur.

Frontend ekibinin paralel çalışabilmesi için endpoint, request, response ve enum değişikliklerini açık ve geriye dönük uyumlu tutmaya çalış.

## Kod dili

Dosya, sınıf, fonksiyon, değişken ve teknik isimlendirmeler İngilizce olmalıdır.

Kullanıcıya gösterilen hata ve açıklama mesajları Türkçe olabilir.
