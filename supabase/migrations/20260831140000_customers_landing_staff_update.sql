-- Staff may persist landing statuses on customers without the service role.
-- Idempotent. Apply locally only.

DROP POLICY IF EXISTS "Staff can update customer landing status" ON public.customers;

CREATE POLICY "Staff can update customer landing status"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  public.get_user_role() = ANY (
    ARRAY['admin'::public.user_role, 'manager'::public.user_role]
  )
)
WITH CHECK (
  public.get_user_role() = ANY (
    ARRAY['admin'::public.user_role, 'manager'::public.user_role]
  )
);

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
  landing_mailchimp_error
) ON TABLE public.customers TO authenticated;
