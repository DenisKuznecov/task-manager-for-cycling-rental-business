-- Customer directory read models. The directory begins at customers so local
-- customers without a destination-sync row stay visible. Idempotent; apply
-- locally only.

CREATE INDEX IF NOT EXISTS customers_directory_name_id_idx
ON public.customers (name ASC, id ASC);

CREATE INDEX IF NOT EXISTS orders_customer_created_at_id_idx
ON public.orders (customer_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS bike_fits_customer_date_fit_number_idx
ON public.bike_fits (customer_id, date_of_fit DESC, fit_number DESC);

CREATE OR REPLACE VIEW public.customer_directory
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
  s.google_status,
  s.google_error,
  s.holded_status,
  s.holded_error,
  s.mailchimp_status,
  s.mailchimp_error
FROM public.customers AS c
LEFT JOIN public.customer_sync AS s ON s.customer_id = c.id;

CREATE OR REPLACE VIEW public.customer_partner_history
WITH (security_invoker = true) AS
SELECT DISTINCT
  o.customer_id,
  p.id AS partner_id,
  p.name AS partner_name
FROM public.orders AS o
JOIN public.partners AS p ON p.id = o.partner_id
WHERE o.partner_id IS NOT NULL
  AND NULLIF(btrim(o.partner_promo), '') IS NOT NULL;

REVOKE ALL ON TABLE public.customer_directory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.customer_directory TO authenticated;
GRANT SELECT ON TABLE public.customer_directory TO service_role;

REVOKE ALL ON TABLE public.customer_partner_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.customer_partner_history TO authenticated;
GRANT SELECT ON TABLE public.customer_partner_history TO service_role;
