create type bed_status as enum(
    'AVAILABLE','RESERVED','OCCUPIED','CLEANING','MAINTAINCE','OUT_OF_SERVICE'
);
-- WARD 
create table ward (
    ward_id  uuid primary key default gen_random_uuid(),
    hospital_id uuid not null references hospital(hospital_id),
    name text not null,
    floor text,
    ward_type text,   
    -- eg icu ,general wanna ask teammate kii should fix it like bed_status 
    created_at timestamptz not null default now(),
    unique(hospital_id,name) ,
    unique(ward_id,hospital_id) 
);
create table bed(
    bed_id uuid primary_key default gen_random_uuid(),
    ward_id uuid not null references ward(ward_id),
    hospital_id uuid not null references hospital(hospital_id),
    bed_number text not null,
    status as bed_status not null default 'AVAILABLE',
    reserved_until timestamptz,
    row_version integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(ward_id,bed_number) 

);
-- ensuring that bed belongs to same hospital as its ward 
ALTER TABLE bed
  ADD CONSTRAINT bed_hospital_matches_ward
  FOREIGN KEY (ward_id, hospital_id)
  REFERENCES ward (ward_id, hospital_id);


-- bed assignment (history+current occupancy)
create table bed_assignment(
    assignment_id uuid primary key default gen_random_uuid,
    bed_id uuid not null references bed(bed_id),
    admission_id uuid,
    hospital_id uuid not null references hospital(hospital_id),
    released_at timestamptz,
    assigned_by uuid references app_user(user_id),
    released_by uuid references app_user(user_id),
    notes text 

);
-- one active assignment per bed 
-- this is neccesaary so no two person get sam ebed allot at that time 
create unique index bed_assignment_one_active_per_bed on bed_assignment (bed_id) where released_at is NULL;
-- one active admission per admission (will become useful once admission table exists )
create unique index bed_assignment_one_active_per_admission on bed_assignment (admission_id) where released_at is NULL and admission_id is not NULL ;
-- COMPOSite keys for common queries 
create index bed_assignment_bed_id_idx on assignment(bed_id);
create index bed_assignment_admission_id_idx on bed_assignment (admission_id);
create index bed_hospital_status_idx on bed (hospital_id,status);



-- simple trigger to keep updated_at freahs 
create or replace function set_updated_at()
returns triger as $$ 
begin new.updated_at =now();
return new;
end;
$$ language plpgsql;
create trigger bed_status_updated_at 
before update on bed 
for each row 
execute function set_updated_at();


-- down migration 
DROP TRIGGER IF EXISTS bed_set_updated_at ON bed;
DROP FUNCTION IF EXISTS set_updated_at();
DROP TABLE IF EXISTS bed_assignment;
DROP TABLE IF EXISTS bed;
DROP TABLE IF EXISTS ward;
DROP TYPE IF EXISTS bed_status;