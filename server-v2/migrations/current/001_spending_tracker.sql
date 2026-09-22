-- Up Migration

create type category_type as enum ('income', 'expense');

create table users (
    id serial primary key,
    email text not null,
    name text not null,
    password_hash text not null,
    created_at timestamptz not null default current_timestamp,
    initial_balance numeric(14, 2) not null default 0
);

create unique index users_email_lower_unique on users (lower(email));
create unique index users_email_unique on users (email);

create table categories (
    id integer generated always as identity primary key,
    user_id integer not null references users (id) on delete cascade,
    type category_type not null,
    title text not null,
    is_default boolean not null default false,
    title_normalized text not null,
    constraint categories_user_id_type_unique unique (user_id, id, type)
);

create unique index categories_user_type_title_normalized_unique
    on categories (user_id, type, title_normalized);

create unique index categories_user_type_default_unique
    on categories (user_id, type)
    where is_default;

create table operations (
    id integer generated always as identity primary key,
    user_id integer not null references users (id) on delete cascade,
    category_id integer not null,
    type category_type not null,
    amount numeric(14, 2) not null check (amount > 0),
    date date not null,
    comment text not null default '',
    constraint operations_category_fkey
        foreign key (user_id, category_id, type)
        references categories (user_id, id, type)
);

create index operations_user_date_desc_index
    on operations (user_id, date desc);

create index operations_category_id_index
    on operations (category_id);

create table sessions (
    id integer generated always as identity primary key,
    user_id integer not null references users (id) on delete cascade,
    token_hash char(64) not null unique,
    expires_at timestamptz not null,
    device text not null,
    revoked_at timestamptz,
    replaced_by integer references sessions (id) on delete set null
);

create index sessions_user_id_index on sessions (user_id);

-- Down Migration

drop table sessions;
drop table operations;
drop table categories;
drop table users;
drop type category_type;
