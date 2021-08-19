CREATE TABLE IF NOT EXISTS `test` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT,
  `first_name` VARCHAR(64) NOT NULL,
  `last_name` VARCHAR(64) NOT NULL,
  `person_info` JSON DEFAULT NULL,
  `data_version` BIGINT UNSIGNED,
  `delete_status` TINYINT NOT NULL DEFAULT 0,
  `creator` VARCHAR(64),
  `updater` VARCHAR(64),
  `create_time` BIGINT UNSIGNED,
  `update_time` BIGINT UNSIGNED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uix_first_name_last_name` (`first_name`, `last_name`)
)ENGINE=INNODB DEFAULT CHARSET=utf8;
