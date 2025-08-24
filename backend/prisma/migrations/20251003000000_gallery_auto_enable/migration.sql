INSERT INTO "Config" ("name", "category", "type", "defaultValue", "value", "obscured", "secret", "locked", "order", "updatedAt")
SELECT 'autoEnable', 'gallery', 'boolean', 'true', NULL, false, false, false, 0, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "Config" WHERE "name" = 'autoEnable' AND "category" = 'gallery'
);

UPDATE "Config"
SET "order" = 1
WHERE "name" = 'filenameRegex' AND "category" = 'gallery';
