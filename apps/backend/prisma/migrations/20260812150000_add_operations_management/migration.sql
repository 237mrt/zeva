CREATE TABLE `deliveries` (
    `id` VARCHAR(30) NOT NULL,
    `work_order_id` VARCHAR(30) NOT NULL,
    `total_quantity` INTEGER NOT NULL,
    `delivered_at` DATETIME(3) NOT NULL,
    `receiver_name` VARCHAR(120) NULL,
    `notes` TEXT NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `deliveries_work_order_id_delivered_at_idx`(`work_order_id`, `delivered_at`),
    INDEX `deliveries_cancelled_at_delivered_at_idx`(`cancelled_at`, `delivered_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `work_order_packages` (
    `id` VARCHAR(30) NOT NULL,
    `work_order_id` VARCHAR(30) NOT NULL,
    `sequence_no` INTEGER NOT NULL,
    `type` ENUM('SACK', 'BOX') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `delivery_id` VARCHAR(30) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `work_order_packages_work_order_id_deleted_at_idx`(`work_order_id`, `deleted_at`),
    INDEX `work_order_packages_delivery_id_idx`(`delivery_id`),
    UNIQUE INDEX `work_order_packages_work_order_id_sequence_no_key`(`work_order_id`, `sequence_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `delivery_package_items` (
    `id` VARCHAR(30) NOT NULL,
    `delivery_id` VARCHAR(30) NOT NULL,
    `work_order_package_id` VARCHAR(30) NOT NULL,
    `sequence_no` INTEGER NOT NULL,
    `type` ENUM('SACK', 'BOX') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `delivery_package_items_work_order_package_id_idx`(`work_order_package_id`),
    UNIQUE INDEX `delivery_package_items_delivery_id_work_order_package_id_key`(`delivery_id`, `work_order_package_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `deliveries`
    ADD CONSTRAINT `deliveries_work_order_id_fkey`
    FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `work_order_packages`
    ADD CONSTRAINT `work_order_packages_work_order_id_fkey`
    FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `work_order_packages`
    ADD CONSTRAINT `work_order_packages_delivery_id_fkey`
    FOREIGN KEY (`delivery_id`) REFERENCES `deliveries`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `delivery_package_items`
    ADD CONSTRAINT `delivery_package_items_delivery_id_fkey`
    FOREIGN KEY (`delivery_id`) REFERENCES `deliveries`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `delivery_package_items`
    ADD CONSTRAINT `delivery_package_items_work_order_package_id_fkey`
    FOREIGN KEY (`work_order_package_id`) REFERENCES `work_order_packages`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
