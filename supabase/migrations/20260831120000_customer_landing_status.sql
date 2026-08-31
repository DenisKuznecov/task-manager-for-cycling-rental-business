-- Per-destination landing status on the existing customers identity.
-- Idempotent. Apply locally only.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS landing_google_id text,
  ADD COLUMN IF NOT EXISTS landing_google_status text,
  ADD COLUMN IF NOT EXISTS landing_google_error text,
  ADD COLUMN IF NOT EXISTS landing_holded_id text,
  ADD COLUMN IF NOT EXISTS landing_holded_status text,
  ADD COLUMN IF NOT EXISTS landing_holded_error text,
  ADD COLUMN IF NOT EXISTS landing_mailchimp_id text,
  ADD COLUMN IF NOT EXISTS landing_mailchimp_status text,
  ADD COLUMN IF NOT EXISTS landing_mailchimp_error text;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_landing_google_status_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_landing_google_status_check
  CHECK (
    landing_google_status IS NULL
    OR landing_google_status = ANY (ARRAY['green'::text, 'red'::text])
  );

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_landing_holded_status_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_landing_holded_status_check
  CHECK (
    landing_holded_status IS NULL
    OR landing_holded_status = ANY (ARRAY['green'::text, 'red'::text])
  );

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_landing_mailchimp_status_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_landing_mailchimp_status_check
  CHECK (
    landing_mailchimp_status IS NULL
    OR landing_mailchimp_status = ANY (ARRAY['green'::text, 'red'::text])
  );
