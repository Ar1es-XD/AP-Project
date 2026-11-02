CREATE TYPE ward_type AS ENUM ('GENERAL', 'ICU', 'EMERGENCY', 'PEDIATRIC', 'MATERNITY');
CREATE TYPE bed_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE');
CREATE TYPE assignment_status AS ENUM ('ACTIVE', 'DISCHARGED', 'TRANSFERRED');

ALTER TABLE department ADD CONSTRAINT uq_department_hospital_id_id UNIQUE (hospital_id, department_id);

CREATE TABLE ward (
    ward_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospital(hospital_id) ON DELETE RESTRICT,
    department_id UUID,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    type ward_type NOT NULL DEFAULT 'GENERAL',
    floor_number INTEGER NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ward_department FOREIGN KEY (hospital_id, department_id) 
        REFERENCES department(hospital_id, department_id) ON DELETE SET NULL (department_id),
    CONSTRAINT uq_ward_hospital_id_id UNIQUE (hospital_id, ward_id),
    CONSTRAINT uq_ward_hospital_code UNIQUE (hospital_id, code)
);

CREATE TABLE bed (
    bed_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospital(hospital_id) ON DELETE RESTRICT,
    ward_id UUID NOT NULL,
    bed_number VARCHAR(20) NOT NULL,
    status bed_status NOT NULL DEFAULT 'AVAILABLE',
    is_isolation BOOLEAN NOT NULL DEFAULT FALSE,
    reserved_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_bed_ward FOREIGN KEY (hospital_id, ward_id) 
        REFERENCES ward(hospital_id, ward_id) ON DELETE RESTRICT,
    CONSTRAINT uq_bed_hospital_id_id UNIQUE (hospital_id, bed_id),
    CONSTRAINT uq_bed_ward_number UNIQUE (ward_id, bed_number)
);
CREATE INDEX idx_bed_hospital_status ON bed(hospital_id, status);

CREATE TABLE bed_assignment (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospital(hospital_id) ON DELETE RESTRICT,
    bed_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    assigned_by UUID NOT NULL REFERENCES app_user(user_id) ON DELETE RESTRICT,
    status assignment_status NOT NULL DEFAULT 'ACTIVE',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    discharged_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_assignment_bed FOREIGN KEY (hospital_id, bed_id) 
        REFERENCES bed(hospital_id, bed_id) ON DELETE RESTRICT,
    CONSTRAINT ck_assignment_discharge CHECK (
        (status = 'ACTIVE' AND discharged_at IS NULL)
        OR (status <> 'ACTIVE' AND discharged_at IS NOT NULL AND discharged_at >= assigned_at)
    )
);

CREATE UNIQUE INDEX idx_unique_active_bed_assignment ON bed_assignment(bed_id) WHERE (status = 'ACTIVE');
CREATE UNIQUE INDEX idx_unique_active_patient_assignment ON bed_assignment(patient_id) WHERE (status = 'ACTIVE');