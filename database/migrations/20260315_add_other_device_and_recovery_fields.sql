ALTER TABLE `gadgets`
  MODIFY COLUMN `type` ENUM('laptop', 'phone', 'other') NOT NULL;

ALTER TABLE `gadgets`
  ADD COLUMN IF NOT EXISTS `other_specs` TEXT DEFAULT NULL AFTER `description`;

ALTER TABLE `laptop_specs`
  ADD COLUMN IF NOT EXISTS `battery_hours` VARCHAR(50) DEFAULT NULL AFTER `storage`;
