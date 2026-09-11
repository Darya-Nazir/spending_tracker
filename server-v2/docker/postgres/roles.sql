do $$
declare
    module text;
    role_name text;
begin
    foreach module in array array['identity', 'finance'] loop
        role_name := module || '_app';

        if not exists (select 1 from pg_roles where rolname = role_name) then
            execute format('create role %I login password %L', role_name, role_name);
        end if;

        execute format('grant usage on schema %I to %I', module, role_name);

        execute format(
            'grant select, insert, update, delete on all tables in schema %I to %I',
            module, role_name);
        execute format(
            'grant usage, select on all sequences in schema %I to %I',
            module, role_name);

        execute format(
            'alter default privileges for role %I in schema %I '
            'grant select, insert, update, delete on tables to %I',
            current_user, module, role_name);
        execute format(
            'alter default privileges for role %I in schema %I '
            'grant usage, select on sequences to %I',
            current_user, module, role_name);
    end loop;
end $$;
