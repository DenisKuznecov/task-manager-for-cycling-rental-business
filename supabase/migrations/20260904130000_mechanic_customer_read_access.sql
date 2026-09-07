-- Mechanics need the same customer, order, and bike-fit read model as staff,
-- without acquiring any write capability. Keep the historic task-scoped
-- migration intact; replace only its mechanic SELECT policies here. Idempotent.

DROP POLICY IF EXISTS "Mechanics can read orders with bike tasks" ON public.orders;
DROP POLICY IF EXISTS "Mechanics can read all orders" ON public.orders;

CREATE POLICY "Mechanics can read all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.get_user_role() = 'mechanic'::public.user_role);

DROP POLICY IF EXISTS "Mechanics can read customers on task orders" ON public.customers;
DROP POLICY IF EXISTS "Mechanics can read all customers" ON public.customers;

CREATE POLICY "Mechanics can read all customers"
ON public.customers
FOR SELECT
TO authenticated
USING (public.get_user_role() = 'mechanic'::public.user_role);

DROP POLICY IF EXISTS "Mechanics can read partners on task orders" ON public.partners;
DROP POLICY IF EXISTS "Mechanics can read partners on orders" ON public.partners;

CREATE POLICY "Mechanics can read partners on orders"
ON public.partners
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = 'mechanic'::public.user_role
  AND EXISTS (
    SELECT 1
    FROM public.orders AS o
    WHERE o.partner_id = partners.id
  )
);

DROP POLICY IF EXISTS "Mechanics can read items on task orders" ON public.order_items;
DROP POLICY IF EXISTS "Mechanics can read all order items" ON public.order_items;

CREATE POLICY "Mechanics can read all order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (public.get_user_role() = 'mechanic'::public.user_role);

DROP POLICY IF EXISTS "Mechanics can read all bike fits" ON public.bike_fits;

CREATE POLICY "Mechanics can read all bike fits"
ON public.bike_fits
FOR SELECT
TO authenticated
USING (public.get_user_role() = 'mechanic'::public.user_role);

DROP POLICY IF EXISTS "Staff can read customer sync" ON public.customer_sync;
DROP POLICY IF EXISTS "Staff and mechanics can read customer sync" ON public.customer_sync;

CREATE POLICY "Staff and mechanics can read customer sync"
ON public.customer_sync
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = ANY (
    ARRAY[
      'admin'::public.user_role,
      'manager'::public.user_role,
      'mechanic'::public.user_role
    ]
  )
);

-- Keep destination identifiers inaccessible through PostgREST and the
-- security-invoker customer views. Status/error fields are all the UI needs.
REVOKE ALL ON TABLE public.customer_sync FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  customer_id,
  google_status,
  google_error,
  holded_status,
  holded_error,
  mailchimp_status,
  mailchimp_error,
  synced_at
) ON TABLE public.customer_sync TO authenticated;
GRANT ALL ON TABLE public.customer_sync TO service_role;

DROP POLICY IF EXISTS "Staff can view bike fit reference images" ON storage.objects;
DROP POLICY IF EXISTS "Staff and mechanics can view bike fit reference images" ON storage.objects;

CREATE POLICY "Staff and mechanics can view bike fit reference images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bike-fit-images'
  AND public.get_user_role() = ANY (
    ARRAY[
      'admin'::public.user_role,
      'manager'::public.user_role,
      'mechanic'::public.user_role
    ]
  )
);
