-- Up Migration

alter table finance.accounts drop constraint accounts_status_check;

alter table finance.accounts
    add constraint accounts_status_check check (status in ('pending', 'ready', 'failed'));

alter table finance.accounts add column status_reason text;

alter table finance.accounts
    add constraint accounts_status_reason_check
    check ((status = 'failed') = (status_reason is not null));


alter table identity.outbox add column failed_at timestamptz;

drop index identity.outbox_pending_index;

create index outbox_pending_index
    on identity.outbox (available_at)
    where delivered_at is null and failed_at is null;

-- Down Migration

drop index identity.outbox_pending_index;

create index outbox_pending_index
    on identity.outbox (available_at)
    where delivered_at is null;

alter table identity.outbox drop column failed_at;

alter table finance.accounts drop constraint accounts_status_reason_check;

alter table finance.accounts drop column status_reason;

update finance.accounts set status = 'pending' where status = 'failed';

alter table finance.accounts drop constraint accounts_status_check;

alter table finance.accounts
    add constraint accounts_status_check check (status in ('pending', 'ready'));
