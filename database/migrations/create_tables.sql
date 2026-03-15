-- -------------------------------------------------------------
--  SQL schema for the Sika Prime Gadget Manager
--
--  This script creates the database tables used by the application.
--  It can be executed with the MySQL client:
--
--      mysql -u <user> -p <database> < create_tables.sql
--
--  The tables include:
--    • gadgets      – core table storing item information
--    • laptop_specs – additional specs for laptops
--    • phone_specs  – additional specs for phones
--    • sales        – records of sold items and profit calculation
--

-- Create the users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) DEFAULT NULL,
  `username` VARCHAR(100) NOT NULL,
  `full_name` VARCHAR(255) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` DATETIME DEFAULT NULL,
  `created_by` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_users_email` (`email`),
  UNIQUE KEY `uniq_users_username` (`username`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create the gadgets table
CREATE TABLE IF NOT EXISTS `gadgets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('laptop', 'phone', 'other') NOT NULL,
  `brand` VARCHAR(255) DEFAULT NULL,
  `model` VARCHAR(255) DEFAULT NULL,
  `cost_price` DECIMAL(10,2) NOT NULL,
  `list_price` DECIMAL(10,2) DEFAULT NULL,
  `status` ENUM('available', 'sold') NOT NULL DEFAULT 'available',
  `image_path` VARCHAR(500) DEFAULT NULL,
  `description` TEXT,
  `other_specs` TEXT DEFAULT NULL,
  `deleted_at` DATETIME DEFAULT NULL,
  `deleted_by` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_gadgets_type` (`type`),
  INDEX `idx_gadgets_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create the laptop specifications table
CREATE TABLE IF NOT EXISTS `laptop_specs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `gadget_id` INT NOT NULL,
  `processor` VARCHAR(255) DEFAULT NULL,
  `ram` VARCHAR(255) DEFAULT NULL,
  `storage` VARCHAR(255) DEFAULT NULL,
  `battery_hours` VARCHAR(50) DEFAULT NULL,
  `screen_size` VARCHAR(50) DEFAULT NULL,
  `graphics` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_laptop_specs_gadget` FOREIGN KEY (`gadget_id`) REFERENCES `gadgets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uniq_laptop_gadget_id` (`gadget_id`),
  INDEX `idx_laptop_gadget_id` (`gadget_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create the phone specifications table
CREATE TABLE IF NOT EXISTS `phone_specs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `gadget_id` INT NOT NULL,
  `os` VARCHAR(255) DEFAULT NULL,
  `ram` VARCHAR(255) DEFAULT NULL,
  `storage` VARCHAR(255) DEFAULT NULL,
  `screen_size` VARCHAR(50) DEFAULT NULL,
  `camera` VARCHAR(255) DEFAULT NULL,
  `battery` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_phone_specs_gadget` FOREIGN KEY (`gadget_id`) REFERENCES `gadgets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uniq_phone_gadget_id` (`gadget_id`),
  INDEX `idx_phone_gadget_id` (`gadget_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create the sales table
CREATE TABLE IF NOT EXISTS `sales` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `gadget_id` INT NOT NULL,
  `selling_price` DECIMAL(10,2) NOT NULL,
  `sold_at` DATETIME NOT NULL,
  `buyer_name` VARCHAR(255) DEFAULT NULL,
  `profit` DECIMAL(10,2) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sales_gadget` FOREIGN KEY (`gadget_id`) REFERENCES `gadgets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uniq_sales_gadget_id` (`gadget_id`),
  INDEX `idx_sales_gadget_id` (`gadget_id`),
  INDEX `idx_sales_sold_at` (`sold_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- End of create_tables.sql
