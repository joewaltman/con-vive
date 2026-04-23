-- Seed existing hosts
INSERT INTO hosts (first_name, last_name, address, city) VALUES
  ('Joe', 'Waltman', '412 Hillcrest Drive, Encinitas 92024', 'Encinitas'),
  ('Mureen', 'Brown', NULL, 'Encinitas'),
  ('Barry', 'Anderson', NULL, NULL),
  ('Betsy', 'Gustafson', NULL, NULL),
  ('Lori', 'Estrada', NULL, NULL);

-- Link to guest records where found
UPDATE hosts h SET guest_id = g.id
FROM guests g
WHERE LOWER(h.first_name) = LOWER(g.first_name)
  AND LOWER(h.last_name) = LOWER(g.last_name);

-- Backfill dinners.host_id from legacy host text field
UPDATE dinners d SET host_id = h.id
FROM hosts h
WHERE d.host ILIKE h.first_name || '%' OR d.host ILIKE '%' || h.last_name;
