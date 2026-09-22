-- Up Migration

create table identity.outbox (
    id integer generated always as identity primary key,
    event_id uuid not null unique,
    type text not null,
    version integer not null,
    user_id integer not null references identity.users (id) on delete cascade,
    occurred_at timestamptz not null default current_timestamp,
    attempts integer not null default 0,
    available_at timestamptz not null default current_timestamp,
    lease_token uuid,
    leased_until timestamptz,
    delivered_at timestamptz,
    last_error text
);

create unique index outbox_type_version_user_unique
    on identity.outbox (type, version, user_id);

create index outbox_pending_index
    on identity.outbox (available_at)
    where delivered_at is null;

insert into identity.outbox (event_id, type, version, user_id, occurred_at)
select gen_random_uuid(), 'UserRegistered', 1, id, created_at
  from identity.users
on conflict (type, version, user_id) do nothing;

-- Down Migration

drop table identity.outbox;
