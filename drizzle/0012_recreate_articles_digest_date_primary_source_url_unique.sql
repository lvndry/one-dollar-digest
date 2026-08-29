CREATE UNIQUE INDEX IF NOT EXISTS `articles_digest_date_primary_source_url_unique` ON `articles` (`digest_date`,`primary_source_url`);
