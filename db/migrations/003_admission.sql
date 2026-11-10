-- Up Migration

CREATE TABLE IF NOT EXISTS admission (
  admission_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id         uuid NOT NULL REFERENCES hospital(hospital_id) ON DELETE CASCADE,
  patient_id          uuid NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'ACTIVE'
                      CHECK (status IN ('ACTIVE', 'DISCHARGED', 'TRANSFERRED', 'CANCELLED')),
  admitted_at         timestamptz NOT NULL DEFAULT now(),
  discharged_at       timestamptz,
  admitted_by         uuid NOT NULL REFERENCES app_user(user_id) ON DELETE RESTRICT,
  discharged_by       uuid REFERENCES app_user(user_id) ON DELETE SET NULL,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Partial unique index: only one active admission per patient at a time
CREATE UNIQUE INDEX idx_admission_one_active_per_patient
  ON admission (patient_id)
  WHERE (status = 'ACTIVE');

-- Indexes for fast querying
CREATE INDEX idx_admission_hospital_status ON admission (hospital_id, status);
CREATE INDEX idx_admission_patient_id ON admission (patient_id);

-- Foreign key linking bed_assignment to admission
ALTER TABLE bed_assignment
  ADD CONSTRAINT fk_bed_assignment_admission
  FOREIGN KEY (admission_id)
  REFERENCES admission(admission_id)
  ON DELETE SET NULL;

-- Helper view for current bed occupancy and ward bed map
CREATE OR REPLACE VIEW v_bed_current AS
SELECT
  b.bed_id,
  b.hospital_id,
  b.ward_id,
  b.bed_number,
  b.status          AS bed_status,
  b.reserved_until,
  b.row_version,
  ba.assignment_id,
  ba.assigned_at,
  a.admission_id,
  a.status          AS admission_status,
  a.patient_id,
  a.admitted_at
FROM bed b
LEFT JOIN bed_assignment ba
  ON ba.bed_id = b.bed_id
 AND ba.released_at IS NULL
LEFT JOIN admission a
  ON a.admission_id = ba.admission_id
 AND a.status = 'ACTIVE';

-- Down Migration

DROP VIEW IF EXISTS v_bed_current;
ALTER TABLE bed_assignment DROP CONSTRAINT IF EXISTS fk_bed_assignment_admission;
DROP TABLE IF EXISTS admission;
