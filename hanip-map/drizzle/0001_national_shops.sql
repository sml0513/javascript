CREATE TABLE catalog_shops (
  id INTEGER PRIMARY KEY,
  food TEXT NOT NULL,
  source TEXT NOT NULL,
  entry TEXT NOT NULL,
  UNIQUE(food, source)
);
