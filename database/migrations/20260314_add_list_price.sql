SET @list_price_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'gadgets'
    AND COLUMN_NAME = 'list_price'
);

SET @sql := IF(
  @list_price_exists = 0,
  'ALTER TABLE `gadgets` ADD COLUMN `list_price` DECIMAL(10,2) DEFAULT NULL AFTER `cost_price`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
