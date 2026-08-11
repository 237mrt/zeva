CREATE TABLE `customers` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contact_name` VARCHAR(120) NULL,
    `phone` VARCHAR(40) NULL,
    `address` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `customers_deleted_at_idx`(`deleted_at`),
    INDEX `customers_name_idx`(`name`),
    INDEX `customers_contact_name_idx`(`contact_name`),
    INDEX `customers_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `customer_prices` (
    `id` VARCHAR(30) NOT NULL,
    `customer_id` VARCHAR(30) NOT NULL,
    `type` ENUM('IRONING', 'PACKAGING', 'IRONING_PACKAGING', 'PRINTING', 'OTHER') NOT NULL,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customer_prices_customer_id_type_key`(`customer_id`, `type`),
    INDEX `customer_prices_customer_id_idx`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `customer_prices`
    ADD CONSTRAINT `customer_prices_customer_id_fkey`
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
