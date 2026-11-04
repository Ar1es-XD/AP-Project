-- Up Migration

create type queue_status as ENUM ('OPEN', 'PAUSED', 'CLOSED');

create type queue_entry_status as enum (
    'WAITING',
    'CALLED',
    'IN_CONSULTATION',
    'COMPLETED',
    'NO_SHOW',
    'HOLD'
);

create type queue_priority as enum(
    'EMERGENCY',
    'URGENT',
    'ROUTINE'
);

create type doctor_session_status as enum(
    'ACTIVE',
    'ON_BREAK',
    'LOGGED_OUT'

);




create table queue_counter(
    department_id uuid not null references department(department_id) on delete cascade,
    queue_date date not null,
    current_token int not null default 0,
    last_updated_at timestamptz not null default now(),
    primary key (department_id, queue_date)
);


create table opd_queue(
    queue_id uuid primary key default gen_random_uuid(),
    hospital_id uuid not null references hospital(hospital_id) on delete cascade,
    department_id uuid not null references department(department_id) on delete cascade,
    queue_date date not null,
    status queue_status not null default 'OPEN',
    created_at timestamptz not null default now(),
    constraint uq_opd_queue_dept_date unique (department_id, queue_date)
);

create table queue_entry(
    entry_id uuid primary key default gen_random_uuid(),
    queue_id uuid not null references opd_queue(queue_id) on delete cascade,
    patient_id uuid not null references patient(patient_id) on delete cascade,
    hospital_id uuid not null references hospital(hospital_id) on delete cascade,
    department_id uuid not null references department(department_id) on delete cascade,
    token_number int not null,
    token_display text not null,
    priority queue_priority not null default 'ROUTINE',
    status queue_entry_status not null default 'WAITING',
    priority_bump_count int not null default 0,
    joined_at timestamptz not null default now(),
    called_at timestamptz,
    consultation_start_at timestamptz,
    consultation_end_at timestamptz,
    constraint uq_queue_entry_token unique (queue_id, token_number)
);

create index idx_queue_entry_status on queue_entry(queue_id, status);
create index idx_queue_entry_waiting_priority on queue_entry(queue_id, priority, joined_at) where status = 'WAITING';
create index idx_queue_entry_patient on queue_entry(patient_id);


create table docter_session(
    session_id uuid primary key default gen_random_uuid(),
    doctor_id uuid not null references app_user(user_id) on delete cascade,
    hospital_id uuid not null references hospital(hospital_id) on delete cascade,
    department_id uuid not null references department(department_id) on delete cascade,
    room_number text not null,
    status doctor_session_status not null default 'ACTIVE',
    started_at timestamptz not null default now(),
    ended_at timestamptz   

);


create index idx_doctor_session_live on docter_session(hospital_id, status) where status = 'ACTIVE';


create table consultation_log(
    lod_id bigint generated always as identify primary key,
    entry_id uuid not null references queue_entry(entry_id) on delete cascade,
    doctor_id uuid not null references app_user(user_id) on delete cascade,
    started_at timestamptz not null,
    ended_at timestamptz not null,
    duration_seconds int not null,
    created_at timestamptz not null default now()

);

create index idx_consultation_log_entry on consultation_log(doctor_id, started_at);



-- Down Migration
DROP TABLE IF EXISTS consultation_log CASCADE;
DROP TABLE IF EXISTS doctor_session CASCADE;
DROP TABLE IF EXISTS queue_entry CASCADE;
DROP TABLE IF EXISTS opd_queue CASCADE;
DROP TABLE IF EXISTS queue_counter CASCADE;

DROP TYPE IF EXISTS doctor_session_status;
DROP TYPE IF EXISTS queue_priority;
DROP TYPE IF EXISTS queue_entry_status;
DROP TYPE IF EXISTS queue_status;