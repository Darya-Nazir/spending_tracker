-- Up Migration

-- Блокировки удерживают данные согласованными до завершения транзакции.
lock table identity.users, identity.sessions, identity.outbox,
    finance.accounts, finance.categories, finance.operations in access exclusive mode;

do $$
declare
    orphan_ids text;
begin
    select string_agg(a.user_id::text, ', ' order by a.user_id)
      into orphan_ids
      from finance.accounts a
     where not exists (select 1 from identity.users u where u.id = a.user_id);

    if orphan_ids is not null then
        raise exception 'Restore identity users for finance accounts before migration 014: %', orphan_ids;
    end if;
end $$;

alter table identity.users
    add column initial_balance numeric(14, 2) not null default 0;

update identity.users u
   set initial_balance = a.initial_balance
  from finance.accounts a
 where a.user_id = u.id;

alter table finance.operations drop constraint operations_category_fkey;
alter table finance.operations add constraint operations_category_id_fkey
    foreign key (category_id) references finance.categories (id);
alter table finance.categories drop constraint categories_user_id_type_unique;

alter table finance.categories drop constraint categories_user_id_fkey;
alter table finance.operations drop constraint operations_user_id_fkey;

alter table identity.users set schema public;
alter table identity.sessions set schema public;
alter table finance.categories set schema public;
alter table finance.operations set schema public;
alter type finance.category_type set schema public;

alter table public.categories add constraint categories_user_id_fkey
    foreign key (user_id) references public.users (id) on delete cascade;
alter table public.operations add constraint operations_user_id_fkey
    foreign key (user_id) references public.users (id) on delete cascade;

-- Бизнес-данные перенесены; служебные события и статусы остаются в резервном дампе.
drop table identity.outbox;
drop table finance.accounts;
drop schema identity;
drop schema finance;

-- Down Migration

do $$
begin
    raise exception 'Migration 014 is forward-only. Restore the pre-014 database backup to recover outbox events and account statuses.';
end $$;
