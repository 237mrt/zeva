CREATE TABLE `payments` (
    `id` VARCHAR(30) NOT NULL,
    `customer_id` VARCHAR(30) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `method` ENUM('CASH', 'BANK_TRANSFER', 'CARD', 'OTHER') NOT NULL,
    `paid_at` DATETIME(3) NOT NULL,
    `reference_no` VARCHAR(120) NULL,
    `notes` TEXT NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payments_customer_id_paid_at_idx`(`customer_id`, `paid_at`),
    INDEX `payments_method_paid_at_idx`(`method`, `paid_at`),
    INDEX `payments_cancelled_at_paid_at_idx`(`cancelled_at`, `paid_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `account_adjustments` (
    `id` VARCHAR(30) NOT NULL,
    `customer_id` VARCHAR(30) NOT NULL,
    `type` ENUM('DEBIT', 'CREDIT') NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `occurred_at` DATETIME(3) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `account_adjustments_customer_id_occurred_at_idx`(`customer_id`, `occurred_at`),
    INDEX `account_adjustments_type_occurred_at_idx`(`type`, `occurred_at`),
    INDEX `account_adjustments_cancelled_at_occurred_at_idx`(`cancelled_at`, `occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payments`
    ADD CONSTRAINT `payments_customer_id_fkey`
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `account_adjustments`
    ADD CONSTRAINT `account_adjustments_customer_id_fkey`
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
