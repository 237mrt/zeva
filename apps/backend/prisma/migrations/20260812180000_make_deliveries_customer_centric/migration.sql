ALTER TABLE `deliveries`
    ADD COLUMN `customer_id` VARCHAR(30) NULL;

ALTER TABLE `delivery_package_items`
    ADD COLUMN `work_order_id` VARCHAR(30) NULL,
    ADD COLUMN `work_order_product_name` VARCHAR(191) NULL;

UPDATE `deliveries` AS `delivery`
INNER JOIN `work_orders` AS `work_order`
    ON `work_order`.`id` = `delivery`.`work_order_id`
SET `delivery`.`customer_id` = `work_order`.`customer_id`;

UPDATE `delivery_package_items` AS `item`
INNER JOIN `deliveries` AS `delivery`
    ON `delivery`.`id` = `item`.`delivery_id`
INNER JOIN `work_orders` AS `work_order`
    ON `work_order`.`id` = `delivery`.`work_order_id`
SET
    `item`.`work_order_id` = `work_order`.`id`,
    `item`.`work_order_product_name` = `work_order`.`product_name`;

ALTER TABLE `deliveries`
    MODIFY `customer_id` VARCHAR(30) NOT NULL;

ALTER TABLE `delivery_package_items`
    MODIFY `work_order_id` VARCHAR(30) NOT NULL,
    MODIFY `work_order_product_name` VARCHAR(191) NOT NULL;

ALTER TABLE `deliveries`
    ADD INDEX `deliveries_customer_id_delivered_at_idx`(`customer_id`, `delivered_at`),
    ADD CONSTRAINT `deliveries_customer_id_fkey`
        FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `delivery_package_items`
    ADD INDEX `delivery_package_items_work_order_id_idx`(`work_order_id`),
    ADD CONSTRAINT `delivery_package_items_work_order_id_fkey`
        FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `deliveries`
    DROP FOREIGN KEY `deliveries_work_order_id_fkey`,
    DROP INDEX `deliveries_work_order_id_delivered_at_idx`,
    DROP COLUMN `work_order_id`;
