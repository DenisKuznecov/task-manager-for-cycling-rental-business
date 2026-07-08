-- Add per-user onboarding acknowledgment timestamp to profiles.
-- Lives on profiles (not partners) because it is per-user: multiple accounts
-- can share the same partner_id, and dismissing by one user must not suppress
-- the card for colleagues.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Narrowly-scoped SECURITY DEFINER function so partners can stamp their own row
-- without needing a broad UPDATE policy on profiles (which would let them edit
-- their own role, partner_id, etc.).
-- search_path is pinned to '' and all references are schema-qualified so the
-- function cannot be hijacked by a malicious search_path object.
CREATE OR REPLACE FUNCTION public.acknowledge_onboarding()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET    onboarding_completed_at = now()
  WHERE  id = (SELECT auth.uid());
END;
$$;

-- Restrict execute: revoke from PUBLIC (which includes anon), then grant only
-- to authenticated so unauthenticated callers cannot invoke this function.
REVOKE EXECUTE ON FUNCTION public.acknowledge_onboarding() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.acknowledge_onboarding() FROM anon;
GRANT  EXECUTE ON FUNCTION public.acknowledge_onboarding() TO authenticated;
