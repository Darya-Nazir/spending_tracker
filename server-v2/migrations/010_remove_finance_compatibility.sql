-- Up Migration

drop trigger accounts_initial_balance_sync on finance.accounts;
drop trigger users_account_delete on identity.users;
drop trigger users_initial_balance_update on identity.users;
drop trigger users_account_insert on identity.users;

drop function finance.sync_user_initial_balance();
drop function public.delete_account_of_user();
drop function public.sync_account_initial_balance();

drop view public.users;
drop view public.operations;
drop view public.categories;
drop domain public.category_type;

-- Стартовый баланс хранится в finance.accounts.
alter table identity.users drop column initial_balance;

-- Down Migration

-- Восстанавливаем зеркало из актуальных финансовых данных.
alter table identity.users
    add column initial_balance numeric(14, 2) not null default 0;

update identity.users u
   set initial_balance = a.initial_balance
  from finance.accounts a
 where a.user_id = u.id;

create view public.users as
    select id, email, name, password_hash, created_at, initial_balance
      from identity.users;

create domain public.category_type as finance.category_type;

create view public.categories as
    select id, user_id, type, title, is_default, title_normalized
      from finance.categories;

create view public.operations as
    select id, user_id, category_id, type, amount, date, comment
      from finance.operations;

create function public.sync_account_initial_balance() returns trigger
language plpgsql as $$
begin
    insert into finance.accounts (user_id, initial_balance)
    values (new.id, new.initial_balance)
    on conflict (user_id) do update
       set initial_balance = excluded.initial_balance
     where finance.accounts.initial_balance is distinct from excluded.initial_balance;
    return null;
end $$;

create function public.delete_account_of_user() returns trigger
language plpgsql as $$
begin
    delete from finance.accounts where user_id = old.id;
    return null;
end $$;

create function finance.sync_user_initial_balance() returns trigger
language plpgsql as $$
begin
    update public.users
       set initial_balance = new.initial_balance
     where id = new.user_id
       and initial_balance is distinct from new.initial_balance;
    return null;
end $$;

create trigger users_account_insert
    after insert on identity.users
    for each row execute function public.sync_account_initial_balance();

create trigger users_initial_balance_update
    after update of initial_balance on identity.users
    for each row when (old.initial_balance is distinct from new.initial_balance)
    execute function public.sync_account_initial_balance();

create trigger users_account_delete
    after delete on identity.users
    for each row execute function public.delete_account_of_user();

create trigger accounts_initial_balance_sync
    after insert or update of initial_balance on finance.accounts
    for each row execute function finance.sync_user_initial_balance();
