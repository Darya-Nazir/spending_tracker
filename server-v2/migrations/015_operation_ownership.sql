-- Up Migration

alter table public.categories
    add constraint categories_user_id_type_unique unique (user_id, id, type);

alter table public.operations
    drop constraint operations_category_id_fkey;

alter table public.operations
    add constraint operations_category_fkey
    foreign key (user_id, category_id, type)
    references public.categories (user_id, id, type);

-- Down Migration

alter table public.operations
    drop constraint operations_category_fkey;

alter table public.operations
    add constraint operations_category_id_fkey
    foreign key (category_id) references public.categories (id);

alter table public.categories
    drop constraint categories_user_id_type_unique;
