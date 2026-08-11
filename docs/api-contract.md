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

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

### Customers

- `GET /api/v1/customers`
- `POST /api/v1/customers`
- `GET /api/v1/customers/:id`
- `PATCH /api/v1/customers/:id`
- `DELETE /api/v1/customers/:id`
- `GET /api/v1/customers/trash`
- `POST /api/v1/customers/:id/restore`

### Customer Prices

- `GET /api/v1/customers/:id/prices`
- `PUT /api/v1/customers/:id/prices`

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
