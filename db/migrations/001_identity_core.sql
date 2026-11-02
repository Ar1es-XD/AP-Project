--up migrations
create extension if not exists citext;
create type user_role as enum 
('Front_Desk','Nurse','Doctor','House Kepping','Bed_Manager','Hospital_Admin','City_Viewer');

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

