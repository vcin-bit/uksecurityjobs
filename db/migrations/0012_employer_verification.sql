ALTER TABLE employers ADD COLUMN verified boolean NOT NULL DEFAULT false;
ALTER TABLE employers ADD COLUMN verified_at timestamptz;
ALTER TABLE employers ADD COLUMN verified_by text;
ALTER TABLE employers ADD COLUMN verification_notes text;
