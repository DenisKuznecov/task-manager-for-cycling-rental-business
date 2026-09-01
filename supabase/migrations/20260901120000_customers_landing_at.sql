-- Filter/sort key for /customers. Workshop apply updates updated_at without landing.
-- Idempotent. Apply locally only.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS landing_at timestamp with time zone;

UPDATE public.customers
SET landing_at = updated_at
WHERE landing_at IS NULL
  AND (
    landing_google_status IS NOT NULL
    OR landing_holded_status IS NOT NULL
    OR landing_mailchimp_status IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS customers_landing_at_id_desc_idx
ON public.customers (landing_at DESC, id DESC)
WHERE landing_at IS NOT NULL;

REVOKE UPDATE ON TABLE public.customers FROM authenticated;
GRANT UPDATE (
  landing_google_id,
  landing_google_status,
  landing_google_error,
  landing_holded_id,
  landing_holded_status,
  landing_holded_error,
  landing_mailchimp_id,
  landing_mailchimp_status,
  landing_mailchimp_error,
  landing_at
) ON TABLE public.customers TO authenticated;
