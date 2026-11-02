-- Up Migration
create extension if not exists citext;
create type user_role as enum 
('FRONT_DESK','NURSE','DOCTOR','HOUSEKEEPING','BED_MANAGER','HOSPITAL_ADMIN','CITY_VIEWER');

CREATE table city(
    city_id uuid PRIMARY KEY default gen_random_uuid(),
    name text not null unique
);
create table hospital(
hospital_id uuid primary key default gen_random_uuid(),
city_id uuid not null references city,
name text not null,
address text,
hospital_type text,
created_at timestamptz not null default now()
);

create table department (
    department_id uuid PRIMARY KEY default gen_random_uuid(),
    hospital_id uuid not null REFERENCES hospital,
    name text not null,
    unique(hospital_id,name)
);

create table app_user(
     user_id uuid PRIMARY key default gen_random_uuid(),
     email citext unique not null,
     full_name text not null ,
     password_hash text not null,
     is_active boolean not null default true ,
     failed_logins int not null default 0 ,
     locked_until timestamptz ,
     last_login_at timestamptz,
     created_at timestamptz not null DEFAULT now()
);

create table user_hospital_role(
    user_id uuid not null references app_user,
    hospital_id uuid not null REFERENCES hospital,
    department_id uuid references department,
    role user_role not null,
    primary key (user_id,hospital_id,role)
);

create table patient (
    patient_id uuid primary key default gen_random_uuid(),
    hospital_id uuid not null REFERENCES hospital,
    uhid text not null,
    full_name text not null,
    date_of_birth date not null,
    sex text,
    phone_e164 text,
    merged_into uuid references patient,
    created_at timestamptz not null default now(),
    created_by uuid references app_user,
    unique (hospital_id,uhid)
);

create table audit_log(
    audit_id bigint generated always as identity primary key,
    at timestamptz not null default now(),
    actor_user_id uuid references app_user,
    hospital_id uuid,
    action text not null ,
    entity_type text not null,
    entity_id text not null ,
    before jsonb,
    after jsonb,
    request_id uuid
);

create table idempotency_key (
    key uuid primary key ,
    user_id uuid not null ,
    request_hash text not null ,
    response jsonb,
    created_at timestamptz not null default now()
);


-- Down Migration 
drop table idempotency_key, audit_log, patient, user_hospital_role, app_user,
department, hospital, city;
drop type user_role;
