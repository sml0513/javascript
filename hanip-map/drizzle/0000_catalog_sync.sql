CREATE TABLE catalog_sync (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  catalog TEXT NOT NULL,
  progress TEXT NOT NULL,
  lease TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0
);
