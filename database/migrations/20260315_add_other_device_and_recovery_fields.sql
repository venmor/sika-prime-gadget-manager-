ALTER TABLE `gadgets`
  MODIFY COLUMN `type` ENUM('laptop', 'phone', 'other') NOT NULL;

SET @other_specs_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'gadgets'
    AND COLUMN_NAME = 'other_specs'
);

SET @sql := IF(
  @other_specs_exists = 0,
  'ALTER TABLE `gadgets` ADD COLUMN `other_specs` TEXT DEFAULT NULL AFTER `description`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @battery_hours_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'laptop_specs'
    AND COLUMN_NAME = 'battery_hours'
);

SET @sql := IF(
  @battery_hours_exists = 0,
  'ALTER TABLE `laptop_specs` ADD COLUMN `battery_hours` VARCHAR(50) DEFAULT NULL AFTER `storage`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
