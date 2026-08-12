CREATE TABLE `work_orders` (
    `id` VARCHAR(30) NOT NULL,
    `customer_id` VARCHAR(30) NOT NULL,
    `product_name` VARCHAR(191) NOT NULL,
    `type` ENUM('IRONING', 'PACKAGING', 'IRONING_PACKAGING', 'PRINTING', 'OTHER') NOT NULL,
    `status` ENUM('WAITING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
    `total_quantity` INTEGER NOT NULL,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `total_amount` DECIMAL(18, 2) NOT NULL,
    `received_at` DATETIME(3) NOT NULL,
    `due_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `work_orders_customer_id_idx`(`customer_id`),
    INDEX `work_orders_status_idx`(`status`),
    INDEX `work_orders_type_idx`(`type`),
    INDEX `work_orders_deleted_at_received_at_idx`(`deleted_at`, `received_at`),
    INDEX `work_orders_due_at_idx`(`due_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `work_orders`
    ADD CONSTRAINT `work_orders_customer_id_fkey`
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
