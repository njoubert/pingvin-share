DELETE FROM "Config" WHERE "name" = 'enableByDefault' AND "category" = 'gallery';

INSERT INTO "Config" ("name", "category", "type", "defaultValue", "value", "obscured", "secret", "locked", "order", "updatedAt")
SELECT 'filenameRegex', 'gallery', 'string', 'jpegs?\\.zip$', NULL, false, false, false, 0, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "Config" WHERE "name" = 'filenameRegex' AND "category" = 'gallery'
);
