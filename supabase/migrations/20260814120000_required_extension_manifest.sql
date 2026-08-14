-- Migration-owned contract for the production-known PostgreSQL extensions.
-- Names and expected schemas only; no version pins. plpgsql is built-in —
-- assert presence, do not CREATE it. Idempotent for reset and re-run.

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

DO $$
DECLARE
  required record;
  actual_schema text;
BEGIN
  FOR required IN
    SELECT * FROM (
      VALUES
        ('plpgsql', 'pg_catalog'),
        ('pgcrypto', 'extensions'),
        ('uuid-ossp', 'extensions'),
        ('supabase_vault', 'vault'),
        ('pg_stat_statements', 'extensions')
    ) AS t(extname, nspname)
  LOOP
    SELECT n.nspname
    INTO actual_schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = required.extname;

    IF actual_schema IS NULL THEN
      RAISE EXCEPTION 'required extension % is not present', required.extname;
    END IF;

    IF actual_schema IS DISTINCT FROM required.nspname THEN
      RAISE EXCEPTION
        'required extension % is in schema %, expected %',
        required.extname,
        actual_schema,
        required.nspname;
    END IF;
  END LOOP;
END
$$;
