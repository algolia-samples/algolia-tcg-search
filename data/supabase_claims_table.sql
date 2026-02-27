-- Claims table for Pokemon TCG vending machine card claiming system.
-- Paste this into the Supabase SQL editor to set up the required table and permissions.

CREATE TABLE IF NOT EXISTS claims (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id            TEXT        NOT NULL,  -- Algolia objectID, e.g. "sv08-102"
  pokemon_name       TEXT        NOT NULL,
  card_number        TEXT,
  set_name           TEXT,
  card_value         NUMERIC,               -- USD value, nullable
  image_url          TEXT,                  -- Card image URL, nullable
  claimer_first_name TEXT        NOT NULL,
  claimer_last_name  TEXT        NOT NULL,
  claimer_name       TEXT,                  -- Legacy field, nullable
  claimed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Grant table-level privileges to the anon role.
-- Note: INSERTs go through the server-side API route using the service_role key,
-- which bypasses RLS entirely, so no INSERT grant is needed for anon.
-- SELECTs and Realtime subscriptions use the anon key from the frontend.
GRANT SELECT ON TABLE claims TO anon;

-- Allow anyone to read claims (app queries only non-PII columns)
CREATE POLICY "Allow public reads"
  ON claims FOR SELECT
  TO anon
  USING (true);

-- Allow server-side inserts (service_role key bypasses RLS, policy included for completeness)
CREATE POLICY "Allow service role inserts"
  ON claims FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Enable Realtime for this table so postgres_changes subscriptions fire.
-- Required for the "Recently Claimed" carousel live updates.
ALTER PUBLICATION supabase_realtime ADD TABLE claims;
