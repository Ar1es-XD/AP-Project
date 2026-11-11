-- Up Migration


CREATE TABLE waitlist (
  waitlist_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id       uuid NOT NULL REFERENCES hospital(hospital_id) ON DELETE CASCADE,
  patient_id        uuid NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
  preferred_ward_id uuid REFERENCES ward(ward_id) ON DELETE SET NULL,
  priority          integer NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'WAITING'
                    CHECK (status IN ('WAITING', 'ASSIGNED', 'CANCELLED')),
  requested_at      timestamptz NOT NULL DEFAULT now(),
  requested_by      uuid REFERENCES app_user(user_id) ON DELETE SET NULL, 
  assigned_at       timestamptz,
  assigned_bed_id   uuid REFERENCES bed(bed_id) ON DELETE SET NULL,
  notes             text
);

CREATE INDEX waitlist_hospital_status_idx ON waitlist (hospital_id, status);
CREATE INDEX waitlist_patient_idx ON waitlist (patient_id);

CREATE TABLE housekeeping_task (
  task_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id       uuid NOT NULL REFERENCES hospital(hospital_id) ON DELETE CASCADE,
  bed_id            uuid NOT NULL REFERENCES bed(bed_id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'DONE')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  started_at        timestamptz,
  completed_at      timestamptz,
  assigned_to       uuid REFERENCES app_user(user_id) ON DELETE SET NULL,
  notes             text
);

CREATE INDEX housekeeping_hospital_status_idx ON housekeeping_task (hospital_id, status);
CREATE INDEX housekeeping_bed_idx ON housekeeping_task (bed_id);

-- Down Migration

DROP TABLE IF EXISTS housekeeping_task;
DROP TABLE IF EXISTS waitlist;
