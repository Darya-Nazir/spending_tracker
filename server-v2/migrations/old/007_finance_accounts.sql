-- Up Migration

create schema finance;

create table finance.accounts (
    user_id integer primary key,
    initial_balance numeric(14, 2) not null default 0,
    status text not null default 'pending' check (status in ('pending', 'ready'))
);

insert into finance.accounts (user_id, initial_balance)
select id, initial_balance from public.users;

alter type public.category_type set schema finance;
alter table public.categories set schema finance;
alter table public.operations set schema finance;

alter table finance.categories drop constraint categories_user_id_fkey;
alter table finance.categories add constraint categories_user_id_fkey
    foreign key (user_id) references finance.accounts (user_id) on delete cascade;
alter table finance.operations drop constraint operations_user_id_fkey;
alter table finance.operations add constraint operations_user_id_fkey
    foreign key (user_id) references finance.accounts (user_id) on delete cascade;

alter table public.users drop column initial_balance;

-- Down Migration

-- Откат к users требует владельца для каждого финансового аккаунта.
do $$
begin
    if exists (
        select 1 from finance.accounts a
        where not exists (select 1 from public.users u where u.id = a.user_id)
    ) then
        raise exception 'Restore identity users before rolling back finance accounts';
    end if;
end $$;

alter table public.users add column initial_balance numeric(14, 2) not null default 0;
update public.users u set initial_balance = a.initial_balance
from finance.accounts a where a.user_id = u.id;

alter table finance.categories drop constraint categories_user_id_fkey;
alter table finance.categories add constraint categories_user_id_fkey
    foreign key (user_id) references public.users (id) on delete cascade;
alter table finance.operations drop constraint operations_user_id_fkey;
alter table finance.operations add constraint operations_user_id_fkey
    foreign key (user_id) references public.users (id) on delete cascade;

alter table finance.operations set schema public;
alter table finance.categories set schema public;
alter type finance.category_type set schema public;
drop table finance.accounts;
drop schema finance;
