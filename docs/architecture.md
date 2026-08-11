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

### Backend uygulama altyapısı

Fastify uygulamasının oluşturulması `src/app.ts`, ağ portunun dinlenmesi ve kapanış sinyalleri `src/server.ts` sorumluluğundadır. Bu ayrım integration testlerinde gerçek port açmadan Fastify `inject` kullanımına izin verir.

Ortak altyapı şu dizinlere ayrılır:

- `src/config`: Zod ile environment doğrulama ve Pino ayarları
- `src/plugins`: global hata yönetimi ve Swagger/OpenAPI kaydı
- `src/routes`: `/api/v1` route prefix kaydı
- `src/shared`: ortak hata ve API response yapıları
- `src/modules`: domain ve sistem modülleri

Prisma şeması ve migration altyapısı `apps/backend/prisma` altında tutulur. Prisma ORM 7 yapılandırması `apps/backend/prisma.config.ts` dosyasındadır; Rust bağımsız `prisma-client` generator'ı çıktısını `src/generated/prisma` altına üretir ve MySQL bağlantısı `@prisma/adapter-mariadb` ile kurulur. Domain modelleri ilgili feature geliştirmesi sırasında migration ile eklenir.

### Authentication mimarisi

Authentication modülü `src/modules/auth` altında route, controller, service, repository, schema ve type sorumluluklarına ayrılır. Şifreler düz metin tutulmaz; Argon2id ile hashlenir. Public register endpointi bulunmaz. İlk `ADMIN` hesabı yalnızca environment değerlerini kullanan `db:bootstrap-admin` komutuyla oluşturulur; aynı normalize edilmiş e-posta için tekrar çalıştırılması yeni hesap veya istemsiz şifre sıfırlaması üretmez.

JWT erişim tokenları kısa ömürlüdür, issuer ve audience doğrulaması kullanır. `JWT_SECRET` uygulama başlangıcında doğrulanır; en az 32 karakter ve yeterli çeşitlilik taşımayan ya da placeholder görünen değerler development dahil reddedilir. Authorization ve cookie header'ları, `Set-Cookie`, password ve password hash alanları Pino redaction listesinde bulunur.

Tarayıcı oturumu için JWT, `HttpOnly`, `SameSite=Strict`, `/` path ve production ortamında `Secure` bayraklı cookie içinde saklanır. Production cookie adı `__Host-` prefix'i kullanır. Frontend tokenı `localStorage` veya `sessionStorage` içinde kalıcılaştırmaz; böylece XSS durumunda uzun süreli token okuma yüzeyi azaltılır. Login cevabındaki `accessToken` programatik REST istemcileri için korunur, tarayıcı frontend'i bu değeri saklamaz. API client gerektiğinde yalnızca process memory içindeki bir tokenı Bearer header olarak gönderebilir ve varsayılan tarayıcı akışında cookie kullanır.

Cookie tabanlı akışta CSRF yüzeyi `SameSite=Strict` ve same-site frontend/API dağıtımıyla sınırlandırılır. Gelecekte cross-site dağıtım gerekirse explicit CSRF token mekanizması eklenmelidir. Login route'u IP başına dakikada beş denemeyle sınırlandırılır. İlk tek-instance dağıtımda memory store yeterlidir; yatay ölçeklemede merkezi bir rate-limit store kullanılmalıdır.

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

### Frontend uygulama altyapısı

Frontend uygulaması aşağıdaki temel katmanları kullanır:

- `src/app`: router ve uygulama provider'ları
- `src/layouts`: ana uygulama yerleşimi
- `src/components`: layout ve ortak geri bildirim bileşenleri
- `src/contexts` ve `src/hooks`: toast ve confirmation dialog API'leri
- `src/lib`: standart API response sözleşmesini kullanan istemci
- `src/pages`: route seviyesindeki ekranlar

TanStack Query'nin query ve mutation hataları merkezi Türkçe toast bildirimlerine bağlanır. Render hataları uygulama error boundary'siyle, route hataları router error ekranıyla ele alınır.

Frontend başlangıcında `GET /api/v1/auth/me` ile HttpOnly cookie session'ı doğrulanır. Bu kontrol tamamlanana kadar session skeleton'ı gösterilir. Korumalı route'lar oturumsuz kullanıcıları `/login` sayfasına, aktif oturumu olan `/login` ziyaretçilerini ana uygulamaya yönlendirir. Kullanıcı çıkış yaptığında `POST /api/v1/auth/logout` oturum cookie'sini temizler; frontend session cache'ini sıfırlayıp kullanıcıyı login ekranına taşır.

### Tasarım dili

Zeva'nın arayüzü modern, koyu, sade ve profesyonel olacaktır. Masaüstünde hızlı veri girişi ve veri yoğun ekranların okunabilirliği önceliklidir.

Arayüzde:

- yumuşak hover/focus geçişleri,
- yaklaşık 150-250 ms mikro animasyonlar,
- sade fade/translate sayfa ve panel geçişleri,
- yumuşak modal, drawer, dropdown ve popover animasyonları,
- tutarlı kart, tablo, form ve dialog bileşenleri,
- skeleton/loading durumları,
- açıklayıcı boş durum ekranları

kullanılacaktır.

Animasyonlar iş akışını yavaşlatmamalı ve `prefers-reduced-motion` tercihine saygı göstermelidir.

### Bildirim sistemi

Uygulama merkezi bir toast/bildirim sistemine sahip olacaktır.

Bildirim türleri:

- başarı
- hata
- uyarı
- bilgi

Müşteri oluşturma, iş emri güncelleme, ödeme kaydetme, PDF oluşturma ve API hataları gibi işlemler kullanıcıya uygun bildirimlerle geri bildirim vermelidir.

Tarayıcı `alert()` kullanımı kullanıcı deneyiminin parçası olmayacaktır.

Kritik veya geri alınamaz işlemlerde onay modalı kullanılacaktır.

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

GitHub Actions, `main` hedefli Pull Request'lerde Node.js 24 ve repository'de sabitlenen pnpm sürümüyle sırasıyla install, typecheck, lint, test ve build kontrollerini çalıştırır.

## Yerel geliştirme ortamı

MySQL 8.4 geliştirme servisi kökteki `compose.yaml` ile çalıştırılır. Compose ortam değerlerini commitlenmeyen kök `.env` dosyasından alır. Örnek değerler `.env.example` dosyalarında tutulur ve gerçek secret içermez.

## Git

Commit açıklamaları Türkçe yazılır ve Conventional Commits ön ekleri korunur.

Örnek:

- `feat: müşteri yönetimini uçtan uca ekle`
- `fix: iş emri durum kontrolünü düzelt`
- `test: ödeme entegrasyon testlerini ekle`
- `ci: proje kalite kontrollerini ekle`
