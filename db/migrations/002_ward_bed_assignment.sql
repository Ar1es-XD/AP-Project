-- Up Migration

-- Bed status enum
CREATE TYPE bed_status AS ENUM (
  'AVAILABLE',
  'RESERVED',
  'OCCUPIED',
  'CLEANING',
  'MAINTENANCE',
  'OUT_OF_SERVICE'
);

-- Ward
CREATE TABLE ward (
  ward_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     uuid NOT NULL REFERENCES hospital(hospital_id),
  name            text NOT NULL,
  floor           text,
  ward_type       text,                    -- e.g. ICU, General, Pediatric
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, name),
  UNIQUE (ward_id, hospital_id)
);

-- Bed
CREATE TABLE bed (
  bed_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id         uuid NOT NULL,
  hospital_id     uuid NOT NULL REFERENCES hospital(hospital_id),
  bed_number      text NOT NULL,
  status          bed_status NOT NULL DEFAULT 'AVAILABLE',
  reserved_until  timestamptz,
  row_version     integer NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (ward_id, bed_number),
  UNIQUE (bed_id, hospital_id),
  CONSTRAINT bed_hospital_matches_ward FOREIGN KEY (ward_id, hospital_id) REFERENCES ward (ward_id, hospital_id)
);

-- Bed assignment (history + current occupancy)
CREATE TABLE bed_assignment (
  assignment_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id          uuid NOT NULL,
  admission_id    uuid,                    -- will be filled when admission table exists
  hospital_id     uuid NOT NULL REFERENCES hospital(hospital_id),
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  released_at     timestamptz,
  CONSTRAINT bed_assignment_release_order
    CHECK (released_at IS NULL OR released_at >= assigned_at),
  assigned_by     uuid REFERENCES app_user(user_id),
  released_by     uuid REFERENCES app_user(user_id),
  notes           text,
  CONSTRAINT bed_assignment_hospital_matches_bed FOREIGN KEY (bed_id, hospital_id) REFERENCES bed (bed_id, hospital_id)
);

-- One active assignment per bed
CREATE UNIQUE INDEX bed_assignment_one_active_per_bed
  ON bed_assignment (bed_id)
  WHERE released_at IS NULL;

-- One active assignment per admission (will become useful once admission table exists)
CREATE UNIQUE INDEX bed_assignment_one_active_per_admission
  ON bed_assignment (admission_id)
  WHERE released_at IS NULL AND admission_id IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX bed_assignment_bed_id_idx ON bed_assignment (bed_id);
CREATE INDEX bed_assignment_admission_id_idx ON bed_assignment (admission_id);
CREATE INDEX bed_hospital_status_idx ON bed (hospital_id, status);

-- Trigger to keep bed.updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bed_status_updated_at
  BEFORE UPDATE ON bed
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TRIGGER IF EXISTS bed_status_updated_at ON bed;
DROP FUNCTION IF EXISTS set_updated_at();
DROP TABLE IF EXISTS bed_assignment;
DROP TABLE IF EXISTS bed;
DROP TABLE IF EXISTS ward;
DROP TYPE IF EXISTS bed_status;
