-- Queue list needs rental until + customer name from existing parent rows.
-- Progress columns stay (task page / detail still use them). Idempotent.
-- DROP+CREATE because CREATE OR REPLACE cannot insert columns mid-list.
-- Apply locally only.

DROP VIEW IF EXISTS public.workshop_tasks_view;

CREATE VIEW public.workshop_tasks_view
WITH (security_invoker = true) AS
SELECT
  t.id AS task_id,
  t.version,
  t.status,
  t.order_id,
  t.order_number,
  (t.order_number)::text AS order_number_text,
  t.starts_at,
  o.stops_at,
  c.name AS customer_name,
  ((t.starts_at AT TIME ZONE 'Europe/Madrid')::date) AS madrid_start_date,
  t.booqable_stock_item_id AS bike_source_id,
  t.bike_display_id,
  t.bike_title,
  t.workshop_tag,
  t.has_configuration_warning,
  COALESCE(p.items_completed, 0) AS items_completed,
  COALESCE(p.items_total, 0) AS items_total
FROM public.bike_tasks t
LEFT JOIN public.orders o ON o.id = t.order_id
LEFT JOIN public.customers c ON c.id = o.customer_id
LEFT JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE i.required AND private.workshop_item_m1_valid(i))::integer AS items_completed,
    count(*) FILTER (WHERE i.required)::integer AS items_total
  FROM public.bike_task_items i
  WHERE i.task_id = t.id
    AND i.stage = private.workshop_task_progress_stage(t.status)
) p ON true;

REVOKE ALL ON TABLE public.workshop_tasks_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.workshop_tasks_view TO authenticated;
GRANT ALL ON TABLE public.workshop_tasks_view TO service_role;
