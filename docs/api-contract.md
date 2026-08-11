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

- `GET /api/v1/work-orders`
- `POST /api/v1/work-orders`
- `GET /api/v1/work-orders/:id`
- `PATCH /api/v1/work-orders/:id`
- `PATCH /api/v1/work-orders/:id/status`
- `DELETE /api/v1/work-orders/:id`
- `GET /api/v1/work-orders/trash`
- `POST /api/v1/work-orders/:id/restore`

### Packages / Sacks

Çuval ve koli kayıtları bir iş emrine bağlıdır.

- `GET /api/v1/work-orders/:id/packages`
- `POST /api/v1/work-orders/:id/packages`
- `PATCH /api/v1/work-orders/:workOrderId/packages/:packageId`
- `DELETE /api/v1/work-orders/:workOrderId/packages/:packageId`

Çuval/koli adetlerinin toplamı iş emrinin toplam adedi ile karşılaştırılmalıdır.

### Deliveries

- `GET /api/v1/deliveries`
- `POST /api/v1/work-orders/:id/deliveries`
- `GET /api/v1/work-orders/:id/deliveries`

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
