-- Persist landed passport address on customers and expose contact
-- fields on the staff list view. No backfill.
-- Idempotent. Apply locally only.

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address_street text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address_region text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address_zip text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address_country text;

DROP VIEW IF EXISTS public.customer_sync_list;

CREATE VIEW public.customer_sync_list
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.name,
  c.email,
  c.phone,
  c.birthday,
  c.address_street,
  c.address_city,
  c.address_region,
  c.address_zip,
  c.address_country,
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
