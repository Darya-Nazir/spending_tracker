-- Up Migration

-- CategoryTitleService подготавливает title_normalized при записи категорий.
lock table public.categories in access exclusive mode;

drop index public.categories_user_type_title_lower_unique;
drop index public.categories_user_type_title_normalized_unique;

alter table public.categories
    alter column title_normalized set not null;

create unique index categories_user_type_title_normalized_unique
    on public.categories (user_id, type, title_normalized);

-- Down Migration

lock table public.categories in access exclusive mode;

create unique index categories_user_type_title_lower_unique
    on public.categories (user_id, type, lower(title));

drop index public.categories_user_type_title_normalized_unique;

alter table public.categories
    alter column title_normalized drop not null;

create unique index categories_user_type_title_normalized_unique
    on public.categories (user_id, type, title_normalized)
    where title_normalized is not null;
