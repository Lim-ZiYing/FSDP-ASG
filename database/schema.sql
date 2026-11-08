-- Owner: Dana
-- The live database is the team's Supabase project. Its SQL Editor has the
-- shared scripts: schema, 02_security, 03_seed, 04_add_password_hash.
--
-- Dana: paste the contents of "schema", "02_security" and "04_add_password_hash"
-- below, in that order, so GitHub keeps a copy of how the database was built.
-- Update this file whenever a table changes.

-- 04_add_password_hash (added by Zi Ying for login)
alter table public.users add column if not exists password_hash text;
-- alter table public.users add constraint users_email_unique unique (email);
