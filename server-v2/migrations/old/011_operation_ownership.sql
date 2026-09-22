-- Up Migration

do $$
declare
    conflicting text;
begin
    select string_agg(o.id::text, ', ' order by o.id)
      into conflicting
      from finance.operations o
      left join finance.categories c
        on c.id = o.category_id
       and c.user_id = o.user_id
       and c.type = o.type
     where c.id is null;

    if conflicting is not null then
        raise exception
            'Operations reference a category of another owner or type: %', conflicting;
    end if;
end $$;

alter table finance.categories
    add constraint categories_user_id_type_unique unique (user_id, id, type);

alter table finance.operations
    drop constraint operations_category_id_fkey;

alter table finance.operations
    add constraint operations_category_fkey
    foreign key (user_id, category_id, type)
    references finance.categories (user_id, id, type);

-- Down Migration

alter table finance.operations
    drop constraint operations_category_fkey;

alter table finance.operations
    add constraint operations_category_id_fkey
    foreign key (category_id) references finance.categories (id);

alter table finance.categories
    drop constraint categories_user_id_type_unique;
