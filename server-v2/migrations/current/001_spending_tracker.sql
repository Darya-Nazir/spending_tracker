-- Up Migration

CREATE TYPE category_type AS ENUM ('income', 'expense');

CREATE TABLE users (
    id serial PRIMARY KEY,
    email text NOT NULL,
    name text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT current_timestamp,
    initial_balance numeric(14, 2) NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email));
CREATE UNIQUE INDEX users_email_unique ON users (email);

CREATE TABLE categories (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type category_type NOT NULL,
    title text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    title_normalized text NOT NULL,
    CONSTRAINT categories_user_id_type_unique UNIQUE (user_id, id, type)
);

CREATE UNIQUE INDEX categories_user_type_title_normalized_unique
    ON categories (user_id, type, title_normalized);

CREATE UNIQUE INDEX categories_user_type_default_unique
    ON categories (user_id, type)
    WHERE is_default;

CREATE TABLE operations (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    category_id integer NOT NULL,
    type category_type NOT NULL,
    amount numeric(14, 2) NOT NULL CHECK (amount > 0),
    date date NOT NULL,
    comment text NOT NULL DEFAULT '',
    CONSTRAINT operations_category_fkey
        FOREIGN KEY (user_id, category_id, type)
        REFERENCES categories (user_id, id, type)
);

CREATE INDEX operations_user_date_desc_index
    ON operations (user_id, date DESC);

CREATE INDEX operations_category_id_index
    ON operations (category_id);

CREATE TABLE sessions (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash char(64) NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    device text NOT NULL,
    revoked_at timestamptz,
    replaced_by integer REFERENCES sessions (id) ON DELETE SET NULL
);

CREATE INDEX sessions_user_id_index ON sessions (user_id);

-- Down Migration

DROP TABLE sessions;
DROP TABLE operations;
DROP TABLE categories;
DROP TABLE users;
DROP TYPE category_type;
