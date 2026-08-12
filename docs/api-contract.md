# Zeva API Sözleşmesi

Bu belge frontend ve backend ekiplerinin paralel çalışabilmesi için Zeva API'sinin temel sözleşmesini tanımlar.

Tüm endpointler `/api/v1` prefix'i kullanır.

## Standart başarı cevabı

```json
{
  "success": true,
  "data": {}
}
```

## Standart hata cevabı

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Kullanıcıya gösterilebilir Türkçe hata mesajı."
  }
}
```

## Temel modüller

### System

- `GET /api/v1/health`

### Auth

Zeva public bir SaaS değildir. Public register endpointi bulunmaz. İlk yönetici hesabı güvenli bootstrap komutuyla oluşturulur.

#### `POST /api/v1/auth/login`

Request:

```json
{
  "email": "admin@example.com",
  "password": "strong-password"
}
```

Başarılı response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "admin@example.com",
      "name": "Zeva Yöneticisi",
      "role": "ADMIN"
    }
  }
}
```

Başarılı login JWT'yi response body içinde paylaşmaz; yalnızca JavaScript tarafından okunamayan `HttpOnly`, `SameSite=Strict` cookie ile gönderir. Production ortamında cookie `Secure` ve `__Host-` prefix'li olur. Login route'u IP başına dakikada beş istekle sınırlandırılır.

Hata kodları:

- `INVALID_CREDENTIALS` (`401`): email bulunamadığında ve şifre yanlış olduğunda aynı genel mesaj kullanılır.
- `ACCOUNT_DISABLED` (`403`): doğru bilgilerle giriş yapan kullanıcı aktif değilse döner.
- `VALIDATION_ERROR` (`400`): request sözleşmesi geçersizse döner.
- `RATE_LIMIT_EXCEEDED` (`429`): login deneme sınırı aşıldığında döner.

#### `POST /api/v1/auth/logout`

İstek gövdesi gerektirmez. Endpoint idempotent çalışır ve mevcut HttpOnly oturum cookie’sini temizler.

Başarılı response:

```json
{
  "success": true,
  "data": {}
}
```

#### `GET /api/v1/auth/me`

Login sırasında üretilen HttpOnly oturum cookie’sini gerektirir.

Başarılı response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "admin@example.com",
      "name": "Zeva Yöneticisi",
      "role": "ADMIN"
    }
  }
}
```

Hata kodları:

- `UNAUTHORIZED` (`401`): oturum cookie’si yoksa, geçersizse, süresi dolmuşsa veya kullanıcı artık bulunamıyorsa döner.
- `ACCOUNT_DISABLED` (`403`): oturum sahibi kullanıcı devre dışı bırakılmışsa döner.

Auth response'ları hiçbir koşulda `passwordHash` veya başka hassas kullanıcı alanlarını içermez.

### Customers

Tüm müşteri endpointleri login sırasında üretilen HttpOnly oturum cookie’sini gerektirir. Oturumsuz istekler `401 UNAUTHORIZED` alır.

#### `GET /api/v1/customers`

Yalnızca `deletedAt = null` olan aktif müşterileri döndürür.

Query parametreleri:

- `q`: opsiyonel, en fazla 191 karakter; `name`, `contactName` ve `phone` alanlarında case-insensitive arama yapar.
- `page`: opsiyonel, minimum `1`, varsayılan `1`.
- `pageSize`: opsiyonel, `1-100`, varsayılan `20`.

Başarılı response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "customer-id",
        "name": "Atlas Tekstil",
        "contactName": "Ayşe Kaya",
        "phone": "0555 111 22 33",
        "address": "Sanayi Mahallesi",
        "notes": null,
        "createdAt": "2026-08-11T10:00:00.000Z",
        "updatedAt": "2026-08-11T10:00:00.000Z",
        "deletedAt": null
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

#### `POST /api/v1/customers`

Request:

```json
{
  "name": "Atlas Tekstil",
  "contactName": "Ayşe Kaya",
  "phone": "0555 111 22 33",
  "address": "Sanayi Mahallesi",
  "notes": "Opsiyonel not"
}
```

`name` trim sonrası 2-191 karakter ve zorunludur. `contactName` en fazla 120, `phone` 3-40, `address` 500, `notes` 5000 karakterdir. Opsiyonel alanlar gönderilmeyebilir veya `null` olabilir; boş stringler `null` olarak normalize edilir. Başarılı istek `201` ve `data.customer` içinde oluşturulan kaydı döndürür. Aynı isimli birden fazla müşteri olabilir.

#### `GET /api/v1/customers/:id`

Aktif müşteriyi `data.customer` içinde döndürür. Kayıt yoksa veya soft-delete edilmişse `404 CUSTOMER_NOT_FOUND` döner.

#### `PATCH /api/v1/customers/:id`

`POST /customers` ile aynı alanlarda partial update yapar. En az bir alan gönderilmelidir; boş body `400 VALIDATION_ERROR` döndürür. Soft-delete edilmiş kayıt güncellenemez ve `404 CUSTOMER_NOT_FOUND` alır.

#### `DELETE /api/v1/customers/:id`

Hard delete yapmaz; `deletedAt` alanını UTC zamanı ile doldurur. Başarılı response `{ "success": true, "data": {} }` biçimindedir. Bulunmayan veya zaten silinmiş kayıt `404 CUSTOMER_NOT_FOUND` alır. Silinen müşteri normal liste ve detay akışlarında görünmez.

#### `GET /api/v1/customers/trash`

Yalnızca `deletedAt != null` kayıtları döndürür. `q`, `page` ve `pageSize` parametreleri ile response pagination yapısı aktif listeyle aynıdır.

#### `POST /api/v1/customers/:id/restore`

Soft-delete edilmiş müşterinin `deletedAt` alanını `null` yapar ve `data.customer` içinde aktif kaydı döndürür. Kayıt yoksa `404 CUSTOMER_NOT_FOUND`, müşteri zaten aktifse `409 CUSTOMER_ALREADY_ACTIVE` döner.

Customer hata kodları:

- `VALIDATION_ERROR` (`400`): body, parametre veya query doğrulaması başarısız.
- `UNAUTHORIZED` (`401`): geçerli HttpOnly oturum cookie’si yok.
- `CUSTOMER_NOT_FOUND` (`404`): müşteri yok veya endpoint için soft-delete durumunda.
- `CUSTOMER_ALREADY_ACTIVE` (`409`): aktif müşteriye restore istendi.

### Customer Prices

Müşteri fiyat endpointleri de cookie authentication gerektirir. Bulunmayan veya soft-delete edilmiş müşteri için `404 CUSTOMER_NOT_FOUND` döner.

#### `GET /api/v1/customers/:id/prices`

Başarılı response:

```json
{
  "success": true,
  "data": {
    "prices": [
      {
        "type": "IRONING",
        "unitPrice": "1.25"
      }
    ]
  }
}
```

#### `PUT /api/v1/customers/:id/prices`

Request:

```json
{
  "prices": [
    {
      "type": "IRONING",
      "unitPrice": "1.25"
    },
    {
      "type": "PACKAGING",
      "unitPrice": "0.75"
    }
  ]
}
```

PUT isteğindeki `prices` dizisi müşterinin varsayılan fiyat setinin tamamıdır. İşlem transaction içinde mevcut seti değiştirir; gönderilmeyen eski hizmet türleri kaldırılır. Boş dizi tüm fiyatları kaldırır. Aynı `type` bir payload içinde birden fazla kez gönderilemez.

`unitPrice` JSON number değil decimal string olmalıdır. Negatif değerler, ikiden fazla ondalık basamak ve `DECIMAL(12,2)` sınırını aşan değerler `400 VALIDATION_ERROR` ile reddedilir. API değeri precision kaybetmeden iki ondalık basamaklı canonical string olarak döndürür; örneğin `"2"` girdisi `"2.00"` olur. Finansal hesaplamaların doğruluk kaynağı frontend değildir.

Desteklenen `type` değerleri `WorkOrderType` enum’uyla aynıdır: `IRONING`, `PACKAGING`, `IRONING_PACKAGING`, `PRINTING`, `OTHER`.

### Work Orders

Tüm Work Order endpointleri HttpOnly oturum cookie'si gerektirir. Oturumsuz istekler `401 UNAUTHORIZED` alır. `unitPrice` ve `totalAmount` JSON number değil, iki ondalık basamaklı canonical decimal string olarak taşınır.

#### GET /api/v1/work-orders

Yalnızca `deletedAt = null` iş emirlerini döndürür.

Query parametreleri:

- `q`: ürün/iş adı veya müşteri adında arama
- `page`: varsayılan `1`, minimum `1`
- `pageSize`: varsayılan `20`, `1-100`
- `customerId`: müşteri filtresi
- `type`: `WorkOrderType` filtresi
- `status`: `WorkOrderStatus` filtresi

Liste item'ları iş emri alanlarının yanında N+1 API isteğini önleyen `{ id, name }` biçiminde küçük bir `customer` özeti taşır. `data.pagination` alanı `page`, `pageSize`, `total` ve `totalPages` değerlerini içerir.

#### POST /api/v1/work-orders

```json
{
  "customerId": "cm...",
  "productName": "Galatasaray Garson",
  "type": "IRONING_PACKAGING",
  "totalQuantity": 1000,
  "unitPrice": "1.25",
  "receivedAt": "2026-08-12T08:00:00.000Z",
  "dueAt": "2026-08-15T17:00:00.000Z",
  "notes": "Öncelikli"
}
```

Yeni kayıt her zaman `WAITING` durumunda oluşturulur; create body içinde `status` kabul edilmez. `totalQuantity` pozitif integer ve en fazla `1.000.000` olmalıdır. `dueAt`, `receivedAt` değerinden önce olamaz. Boş opsiyonel metinler `null` olarak normalize edilir.

`unitPrice` gönderilmişse doğrulanıp fiyat snapshot'ı olarak kullanılır. Gönderilmemişse aktif müşterinin ilgili `WorkOrderType` için `CustomerPrice` değeri kullanılır. İki kaynakta da fiyat yoksa `422 WORK_ORDER_UNIT_PRICE_REQUIRED` döner. Müşteri fiyatının daha sonra değişmesi geçmiş iş emrini değiştirmez.

Backend `totalAmount = totalQuantity * unitPrice` hesabını Decimal arithmetic ile yapar; istemciden `totalAmount` kabul edilmez. Başarılı cevap oluşturulan iş emrini customer özetiyle döndürür.

#### GET /api/v1/work-orders/:id

Aktif iş emrini customer özetiyle döndürür. Kayıt yoksa veya soft-delete edilmişse `404 WORK_ORDER_NOT_FOUND` döner.

#### PATCH /api/v1/work-orders/:id

`customerId`, `productName`, `type`, `totalQuantity`, `unitPrice`, `receivedAt`, `dueAt` ve `notes` alanlarında partial update yapar. En az bir alan gereklidir. `status` bu endpoint üzerinden değiştirilemez.

Müşteri veya hizmet türü değişirken `unitPrice` açıkça gönderilmezse yeni müşteri/türün varsayılan fiyatı snapshot olarak alınır; bulunamazsa `422 WORK_ORDER_UNIT_PRICE_REQUIRED` döner. Müşteri ve tür değişmiyorsa mevcut fiyat korunur. Her başarılı güncellemede toplam tutar backend tarafından yeniden hesaplanır.

#### PATCH /api/v1/work-orders/:id/status

Request body yalnızca geçerli bir `WorkOrderStatus` içeren `status` alanını kabul eder. Bu temel feature katı bir transition state-machine uygulamaz; aynı durumu tekrar göndermek idempotenttir. Soft-delete edilmiş kayıt `404 WORK_ORDER_NOT_FOUND` alır.

#### DELETE /api/v1/work-orders/:id

Hard delete yapmaz; `deletedAt` alanını doldurur. Silinen kayıt normal liste, detay, update ve status akışlarında görünmez veya değiştirilemez.

#### GET /api/v1/work-orders/trash

Yalnızca `deletedAt != null` kayıtları döndürür. Normal listeyle aynı `q`, pagination ve `customerId`/`type`/`status` filtrelerini destekler.

#### POST /api/v1/work-orders/:id/restore

Silinmiş kaydı aktif hale getirir. Kayıt yoksa `404 WORK_ORDER_NOT_FOUND`, zaten aktifse `409 WORK_ORDER_ALREADY_ACTIVE` döner.

İş emri akışındaki domain hata kodları: `WORK_ORDER_NOT_FOUND`, `WORK_ORDER_ALREADY_ACTIVE`, `WORK_ORDER_UNIT_PRICE_REQUIRED`, `CUSTOMER_NOT_FOUND`, `VALIDATION_ERROR` ve `UNAUTHORIZED`. Prisma/SQL hata ayrıntıları API response'una yansıtılmaz.

### Packages / Sacks

Tüm paket endpointleri HttpOnly oturum cookie'si gerektirir. `PackageType` değerleri `SACK` (Çuval) ve `BOX` (Koli) olarak tanımlıdır. Paketler iş emri içinde artan `sequenceNo` alır; soft-delete edilen sıra numaraları yeniden kullanılmaz.

#### `GET /api/v1/work-orders/:id/packages`

Aktif iş emrinin soft-delete edilmemiş paketlerini sıra numarasıyla listeler. Response `workOrder`, `packages` ve aşağıdaki özeti taşır:

```json
{
  "success": true,
  "data": {
    "workOrder": {
      "id": "work-order-id",
      "productName": "Galatasaray Garson",
      "status": "READY",
      "totalQuantity": 1000,
      "customer": { "id": "customer-id", "name": "Alpha Tekstil" }
    },
    "packages": [
      {
        "id": "package-id",
        "workOrderId": "work-order-id",
        "sequenceNo": 1,
        "type": "SACK",
        "quantity": 250,
        "deliveryId": null,
        "delivery": null,
        "notes": null,
        "createdAt": "2026-08-12T09:00:00.000Z",
        "updatedAt": "2026-08-12T09:00:00.000Z",
        "deletedAt": null
      }
    ],
    "summary": {
      "workOrderTotalQuantity": 1000,
      "packagedQuantity": 750,
      "remainingQuantity": 250,
      "deliveredQuantity": 500,
      "packageCount": 3,
      "deliveredPackageCount": 2
    }
  }
}
```

Bulunmayan veya soft-delete edilmiş iş emri `404 WORK_ORDER_NOT_FOUND` alır.

#### `POST /api/v1/work-orders/:id/packages`

Paketleri tek transaction içinde toplu oluşturur:

```json
{
  "packages": [
    { "type": "SACK", "quantity": 250 },
    { "type": "BOX", "quantity": 200, "notes": "Mavi koli" }
  ]
}
```

Liste `1-100` paket içermeli; `quantity` pozitif integer ve en fazla `1.000.000`, `notes` en fazla `2.000` karakter olmalıdır. Batch içindeki tek bir hata bütün işlemi başarısız kılar. Aktif paket toplamı `WorkOrder.totalQuantity` değerini aşarsa `422 PACKAGE_QUANTITY_EXCEEDS_WORK_ORDER` döner. Başarılı istek `201` ile güncel paket listesi ve özeti döndürür.

#### `PATCH /api/v1/work-order-packages/:packageId`

Teslim edilmemiş aktif paketin `type`, `quantity` ve `notes` alanlarında partial update yapar. En az bir alan gerekir. Yeni paket toplamı iş emri adedini aşamaz. Teslim edilmiş paket `409 PACKAGE_ALREADY_DELIVERED`, bulunamayan/soft-delete paket `404 PACKAGE_NOT_FOUND` alır.

#### `DELETE /api/v1/work-order-packages/:packageId`

Teslim edilmemiş paketi `deletedAt` ile soft-delete eder. Kayıt liste ve paket toplamlarından çıkar. Teslim edilmiş paket silinemez ve `409 PACKAGE_ALREADY_DELIVERED` döner.

Aktif paket toplamı bulunan bir iş emrinde `PATCH /work-orders/:id` ile `totalQuantity` bu toplamın altına indirilemez; `422 WORK_ORDER_QUANTITY_BELOW_PACKAGED` döner.

### Deliveries

Teslimatlar belirli paketlere bağlıdır; yalnız adet toplamı kaydedilmez. Tüm endpointler HttpOnly oturum cookie'si gerektirir.

#### `GET /api/v1/deliveries`

Query parametreleri:

- `q`: iş/ürün adı, müşteri adı veya teslim alan kişide arama
- `page`: minimum `1`, varsayılan `1`
- `pageSize`: `1-100`, varsayılan `20`
- `customerId`: opsiyonel müşteri filtresi
- `workOrderId`: opsiyonel iş emri filtresi
- `deliveredFrom`, `deliveredTo`: opsiyonel ISO datetime aralığı

Response `items` ve standart `pagination` alanlarını taşır. Liste item'ında `{ id, name }` müşteri özeti, `{ id, productName }` iş emri özeti, `packageCount`, backend hesaplı `totalQuantity`, teslim bilgileri ve iptal zamanı bulunur. İptal edilen kayıtlar audit amacıyla listede kalır.

#### `POST /api/v1/deliveries`

```json
{
  "workOrderId": "work-order-id",
  "packageIds": ["package-1", "package-2"],
  "deliveredAt": "2026-08-12T10:30:00.000Z",
  "receiverName": "Ahmet Yılmaz",
  "notes": "Müşteri teslim aldı."
}
```

`packageIds` boş olamaz ve aynı id tekrarlanamaz. İş emri aktif ve `READY` (kısmi teslimattan sonra gerektiğinde `DELIVERED`) durumda olmalıdır. Seçilen paketlerin tamamı aynı iş emrine ait, aktif ve teslim edilmemiş olmalıdır. Backend paket adetlerini toplar; request'ten teslimat toplamı kabul edilmez. Paket claim işlemi transaction içinde `deliveryId = null` koşuluyla atomik yapılır.

Kısmi teslimatta iş emri `READY` kalır. Aktif teslim edilmiş paket toplamı iş emri toplam adedine ulaştığında yalnız `READY` durumundaki iş emri otomatik `DELIVERED` olur. Başarılı response `201` ve `data.delivery` içinde müşteri/iş emri özetiyle paket listesini döndürür.

#### `GET /api/v1/deliveries/:id`

Teslimatın müşteri, iş emri, toplam adet, teslim alan, not, iptal bilgisi ve teslim anındaki paket listesini döndürür. Bulunamayan kayıt `404 DELIVERY_NOT_FOUND` alır.

#### `POST /api/v1/deliveries/:id/cancel`

Teslimatı hard-delete etmez; `cancelledAt` alanını doldurur ve ilgili paketlerin aktif `deliveryId` kilidini transaction içinde kaldırır. Paketler yeniden teslim edilebilir. Teslim anındaki paket kalemleri audit kaydı olarak korunur. İş emri yalnız mevcut durumu `DELIVERED` ise ve iptal sonrası teslim edilen toplam eksikse `READY` durumuna döner; `CLOSED` iş emri otomatik açılmaz. İkinci iptal `409 DELIVERY_ALREADY_CANCELLED`, bulunamayan kayıt `404 DELIVERY_NOT_FOUND` döner.

Delivery hata kodları: `WORK_ORDER_NOT_FOUND`, `WORK_ORDER_NOT_READY_FOR_DELIVERY`, `DELIVERY_PACKAGE_NOT_AVAILABLE`, `PACKAGE_ALREADY_DELIVERED`, `DELIVERY_NOT_FOUND`, `DELIVERY_ALREADY_CANCELLED`, `VALIDATION_ERROR` ve `UNAUTHORIZED`.

### Payments

- `GET /api/v1/payments`
- `POST /api/v1/payments`
- `GET /api/v1/customers/:id/payments`

### Accounting

- `GET /api/v1/customers/:id/account`
- `GET /api/v1/customers/:id/account/transactions`

### Dashboard

- `GET /api/v1/dashboard/summary`
- `GET /api/v1/dashboard/recent-work-orders`

### Reports

- `GET /api/v1/reports/daily`
- `GET /api/v1/reports/monthly`
- `GET /api/v1/reports/customers/:id`
- `GET /api/v1/work-orders/:id/pdf`

## Temel enumlar

### WorkOrderType

- `IRONING`
- `PACKAGING`
- `IRONING_PACKAGING`
- `PRINTING`
- `OTHER`

### WorkOrderStatus

- `WAITING`
- `IN_PROGRESS`
- `READY`
- `DELIVERED`
- `CLOSED`
- `CANCELLED`

### PaymentMethod

- `CASH`
- `BANK_TRANSFER`
- `EFT`
- `OTHER`

## Temel iş emri alanları

Bir iş emri en az şu bilgileri desteklemelidir:

- `id`
- `customerId`
- `productName`
- `type`
- `status`
- `totalQuantity`
- `unitPrice`
- `totalAmount`
- `receivedAt`
- `dueAt`
- `notes`
- `createdAt`
- `updatedAt`

## Temel müşteri alanları

Bir müşteri en az şu bilgileri desteklemelidir:

- `id`
- `name`
- `contactName`
- `phone`
- `address`
- `notes`
- `createdAt`
- `updatedAt`
- `deletedAt`

## Sözleşme değişikliği

Backend tarafında request, response, endpoint veya enum yapısını etkileyen bir değişiklik yapılırsa bu belge ve OpenAPI dokümantasyonu aynı geliştirme içerisinde güncellenmelidir.
