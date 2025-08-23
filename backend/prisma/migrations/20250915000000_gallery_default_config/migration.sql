INSERT INTO "Config" ("name", "category", "type", "defaultValue", "value", "obscured", "secret", "locked", "order", "updatedAt")
SELECT 'enableByDefault', 'gallery', 'boolean', 'true', NULL, false, false, false, 0, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "Config" WHERE "name" = 'enableByDefault' AND "category" = 'gallery'
);
