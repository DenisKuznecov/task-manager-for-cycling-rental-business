-- Destination sync is a 1:1 child of customers, not columns on identity.
-- Cleans leftover local-only landing columns if they exist. No backfill.
-- Staff read the list; webhook writes use the service role.
-- Idempotent. Apply locally only.

DROP POLICY IF EXISTS "Staff can update customer landing status" ON public.customers;
DROP INDEX IF EXISTS customers_landing_at_id_desc_idx;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_landing_google_status_check;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_landing_holded_status_check;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_landing_mailchimp_status_check;

ALTER TABLE public.customers DROP COLUMN IF EXISTS landing_google_id;
ALTER TABLE public.customers DROP COLUMN IF EXISTS landing_google_status;
ALTER TABLE public.customers DROP COLUMN IF EXISTS landing_google_error;
ALTER TABLE public.customers DROP COLUMN IF EXISTS landing_holded_id;
ALTER TABLE public.customers DROP COLUMN IF EXISTS landing_holded_status;
ALTER TABLE public.customers DROP COLUMN IF EXISTS landing_holded_error;
ALTER TABLE public.customers DROP COLUMN IF EXISTS landing_mailchimp_id;
ALTER TABLE public.customers DROP COLUMN IF EXISTS landing_mailchimp_status;
ALTER TABLE public.customers DROP COLUMN IF EXISTS landing_mailchimp_error;
ALTER TABLE public.customers DROP COLUMN IF EXISTS landing_at;

GRANT UPDATE ON TABLE public.customers TO authenticated;

CREATE TABLE IF NOT EXISTS public.customer_sync (
  customer_id uuid PRIMARY KEY REFERENCES public.customers (id) ON DELETE CASCADE,
  google_id text,
  google_status text,
  google_error text,
  holded_id text,
  holded_status text,
  holded_error text,
  mailchimp_id text,
  mailchimp_status text,
  mailchimp_error text,
  synced_at timestamp with time zone NOT NULL
);

ALTER TABLE public.customer_sync DROP CONSTRAINT IF EXISTS customer_sync_google_status_check;
ALTER TABLE public.customer_sync
  ADD CONSTRAINT customer_sync_google_status_check
  CHECK (
    google_status IS NULL
    OR google_status = ANY (ARRAY['green'::text, 'red'::text])
  );

ALTER TABLE public.customer_sync DROP CONSTRAINT IF EXISTS customer_sync_holded_status_check;
ALTER TABLE public.customer_sync
  ADD CONSTRAINT customer_sync_holded_status_check
  CHECK (
    holded_status IS NULL
    OR holded_status = ANY (ARRAY['green'::text, 'red'::text])
  );

ALTER TABLE public.customer_sync DROP CONSTRAINT IF EXISTS customer_sync_mailchimp_status_check;
ALTER TABLE public.customer_sync
  ADD CONSTRAINT customer_sync_mailchimp_status_check
  CHECK (
    mailchimp_status IS NULL
    OR mailchimp_status = ANY (ARRAY['green'::text, 'red'::text])
  );

CREATE INDEX IF NOT EXISTS customer_sync_synced_at_id_desc_idx
ON public.customer_sync (synced_at DESC, customer_id DESC);

ALTER TABLE public.customer_sync ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read customer sync" ON public.customer_sync;

CREATE POLICY "Staff can read customer sync"
ON public.customer_sync
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = ANY (
    ARRAY['admin'::public.user_role, 'manager'::public.user_role]
  )
);

REVOKE ALL ON TABLE public.customer_sync FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.customer_sync TO authenticated;
GRANT ALL ON TABLE public.customer_sync TO service_role;

CREATE OR REPLACE VIEW public.customer_sync_list
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.name,
  c.booqable_customer_id,
  s.synced_at,
  s.google_status,
  s.google_error,
  s.holded_status,
  s.holded_error,
  s.mailchimp_status,
  s.mailchimp_error
FROM public.customer_sync s
JOIN public.customers c ON c.id = s.customer_id;

REVOKE ALL ON TABLE public.customer_sync_list FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.customer_sync_list TO authenticated;
GRANT ALL ON TABLE public.customer_sync_list TO service_role;
