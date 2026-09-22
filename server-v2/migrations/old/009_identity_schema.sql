-- Up Migration

create schema identity;

alter table public.users set schema identity;
alter table public.sessions set schema identity;

-- Слой совместимости 
create view public.users as
    select id, email, name, password_hash, created_at, initial_balance
      from identity.users;

-- Down Migration

drop view public.users;

alter table identity.sessions set schema public;
alter table identity.users set schema public;

drop schema identity;
