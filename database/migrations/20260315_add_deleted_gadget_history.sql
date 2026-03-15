SET @deleted_at_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'gadgets'
    AND COLUMN_NAME = 'deleted_at'
);

SET @sql := IF(
  @deleted_at_exists = 0,
  'ALTER TABLE `gadgets` ADD COLUMN `deleted_at` DATETIME DEFAULT NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @deleted_by_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'gadgets'
    AND COLUMN_NAME = 'deleted_by'
);

SET @sql := IF(
  @deleted_by_exists = 0,
  'ALTER TABLE `gadgets` ADD COLUMN `deleted_by` VARCHAR(255) DEFAULT NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
