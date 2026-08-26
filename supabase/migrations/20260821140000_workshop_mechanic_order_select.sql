-- Scoped SELECT so a mechanic can read the parent order of a bike_tasks row
-- (plus that order's customer, partner, and items). No DML. An order with no
-- bike_tasks row stays invisible to mechanics. Admin/manager SELECT is unchanged.

DROP POLICY IF EXISTS "Mechanics can read orders with bike tasks" ON public.orders;

CREATE POLICY "Mechanics can read orders with bike tasks"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = 'mechanic'::public.user_role
  AND EXISTS (
    SELECT 1
    FROM public.bike_tasks t
    WHERE t.order_id = orders.id
  )
);

DROP POLICY IF EXISTS "Mechanics can read customers on task orders" ON public.customers;

CREATE POLICY "Mechanics can read customers on task orders"
ON public.customers
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = 'mechanic'::public.user_role
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.bike_tasks t ON t.order_id = o.id
    WHERE o.customer_id = customers.id
  )
);

DROP POLICY IF EXISTS "Mechanics can read partners on task orders" ON public.partners;

CREATE POLICY "Mechanics can read partners on task orders"
ON public.partners
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = 'mechanic'::public.user_role
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.bike_tasks t ON t.order_id = o.id
    WHERE o.partner_id = partners.id
  )
);

DROP POLICY IF EXISTS "Mechanics can read items on task orders" ON public.order_items;

CREATE POLICY "Mechanics can read items on task orders"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = 'mechanic'::public.user_role
  AND EXISTS (
    SELECT 1
    FROM public.bike_tasks t
    WHERE t.order_id = order_items.order_id
  )
);
