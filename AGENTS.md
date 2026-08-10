# Zeva Codex Geliştirme Kuralları

Zeva, frontend ve backend uygulamalarının aynı repository içerisinde geliştirildiği bir monorepo projesidir.

## Sorumluluk

Codex, Zeva projesinin uçtan uca geliştirilmesinden sorumludur.

Sorumluluk alanları:

- `apps/backend/`
- `apps/frontend/`
- veritabanı şeması ve migrationlar
- API sözleşmeleri
- testler
- CI yapılandırmaları
- teknik dokümantasyon
- gerekli geliştirme araçları ve yapılandırmalar

Bir özelliği yalnızca backend veya frontend tarafında yarım bırakma. Mümkün olduğunda özelliği veritabanından arayüze kadar uçtan uca tamamla.

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

## Frontend teknoloji yığını

- React
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod

## Arayüz ve tasarım kuralları

Zeva arayüzü modern, koyu, sade, profesyonel ve tekstil atölyesinde hızlı kullanıma uygun olmalıdır.

Tasarımda şu kuralları uygula:

- Koyu tema ana tasarım dilidir.
- Yüzeyler arasında yumuşak fakat belirgin ton farkları kullan.
- Kart, tablo, form, modal, drawer ve menüler aynı tasarım sistemini kullanmalıdır.
- Köşe yuvarlaklıkları, boşluklar, border ve gölge kullanımı tutarlı olmalıdır.
- Tasarım temiz olmalı; gereksiz gradient, glow, glassmorphism ve dekoratif efektlerle kalabalıklaştırılmamalıdır.
- Masaüstü kullanım önceliklidir ancak arayüz makul ölçüde responsive olmalıdır.
- Veri yoğun ekranlarda okunabilirlik ve hızlı işlem yapabilme görsellikten daha önemlidir.

### Geçişler ve mikro etkileşimler

Arayüz statik veya sert hissettirmemelidir.

- Hover, focus, açılma/kapanma ve durum değişikliklerinde yumuşak geçişler kullan.
- Genel mikro geçiş sürelerini yaklaşık 150-250 ms aralığında tut.
- Sayfa ve panel geçişlerinde hafif fade/translate gibi sade animasyonlar kullanılabilir.
- Modal, drawer, dropdown ve popover açılış/kapanışları yumuşak olmalıdır.
- Butonların hover, active, disabled ve loading durumları açıkça anlaşılmalıdır.
- Animasyonlar kullanıcıyı bekletmemeli ve veri giriş hızını düşürmemelidir.
- `prefers-reduced-motion` tercihini dikkate al.

### Bildirim sistemi

Tarayıcının `alert()` fonksiyonunu kullanıcı deneyiminin parçası olarak kullanma.

Uygulama genelinde merkezi bir toast/bildirim sistemi kullan.

Desteklenecek temel bildirim türleri:

- başarı
- hata
- uyarı
- bilgi

Örnek kullanım alanları:

- müşteri başarıyla oluşturuldu
- iş emri güncellendi
- ödeme kaydedildi
- PDF oluşturuldu
- bağlantı veya API hatası oluştu
- doğrulama nedeniyle işlem tamamlanamadı

Bildirimler kısa, anlaşılır ve Türkçe olmalıdır. Aynı hatayı gereksiz şekilde art arda göstermemeye çalış.

Kritik ve geri alınamaz işlemlerde yalnızca toast kullanma; uygun onay modalı göster.

### Loading ve boş durumlar

- Veri yüklenen ekranlarda uygun skeleton/loading durumları kullan.
- Küçük işlemlerde buton seviyesinde loading göstergesi kullan.
- Boş liste ve sonuç bulunamayan durumlar için açıklayıcı empty state tasarla.
- Kullanıcı bir işlem gönderdiğinde sistemin çalışıp çalışmadığını her zaman anlayabilmelidir.

## Backend mimarisi

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
- İş emri toplam adedi ile çuval/koli adetlerinin toplamı tutarlı şekilde doğrulanmalıdır.

## Zeva iş alanları

Proje şu ana iş alanlarını destekleyecek şekilde geliştirilecektir:

- authentication
- customers
- customer prices
- work orders
- ironing and packaging
- printing
- sacks / packages
- work order history
- deliveries
- payments
- current account / accounting
- dashboard
- reports
- settings
- PDF çıktıları

İş akışlarını geliştirirken `docs/` altındaki ürün ve API belgelerini temel al.

## Kalite

Bir özellik tamamlanmadan önce:

- TypeScript typecheck çalıştır.
- lint çalıştır.
- testleri çalıştır.
- build çalıştır.
- mevcut testlerin bozulmadığını doğrula.
- yeni davranış için gerekli testleri ekle.
- başarısız testleri sessizce silme veya devre dışı bırakma.

## Git ve branch kuralları

Doğrudan `main` üzerinde geliştirme yapma.

Özellik branch'leri `feature/` prefix'i kullanmalıdır.

Örnekler:

- `feature/project-setup`
- `feature/auth`
- `feature/customers`
- `feature/work-orders`
- `feature/packages`
- `feature/accounting`
- `feature/dashboard`
- `feature/reports`

Bir feature branch'i mümkün olduğunda ilgili özelliğin backend, frontend ve testlerini birlikte içermelidir.

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

- `chore: Zeva geliştirme altyapısını oluştur`
- `feat: müşteri yönetimini uçtan uca ekle`
- `feat: iş emri oluşturma akışını ekle`
- `fix: çuval adet toplamı kontrolünü düzelt`
- `test: müşteri entegrasyon testlerini ekle`
- `refactor: müşteri servis katmanını sadeleştir`
- `docs: Swagger dokümantasyonunu güncelle`

İngilizce commit mesajı yazma.

Her dosya değişikliğinde commit oluşturma. Tek bir mantıksal geliştirme adımını temsil eden küçük ve anlamlı commitler oluştur.

Tamamlanan commitleri aktif feature branch'ine push et.

Bir özellik tamamlandığında ve bütün kontroller geçtiğinde `main` branch'ine Pull Request hazırla.

Açıkça istenmedikçe Pull Request'i otomatik olarak merge etme.

## Kod dili

Dosya, sınıf, fonksiyon, değişken ve teknik isimlendirmeler İngilizce olmalıdır.

Kullanıcıya gösterilen metinler Türkçe olmalıdır.
