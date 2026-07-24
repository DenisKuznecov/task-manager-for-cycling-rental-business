-- Stores local metadata for Short.io short URLs, mapping them to UTM
-- parameters, creators, and optional partner assignments.

CREATE TABLE IF NOT EXISTS public.marketing_links (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  short_url   text        NOT NULL,
  long_url    text        NOT NULL,
  short_io_id text,
  partner_id  uuid        REFERENCES public.partners(id)  ON DELETE SET NULL,
  created_by  uuid        REFERENCES auth.users(id)       ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_links_partner_id_idx
  ON public.marketing_links (partner_id);

GRANT ALL ON TABLE public.marketing_links TO anon;
GRANT ALL ON TABLE public.marketing_links TO authenticated;
GRANT ALL ON TABLE public.marketing_links TO service_role;

ALTER TABLE public.marketing_links ENABLE ROW LEVEL SECURITY;

-- Admin & Manager: full CRUD
DROP POLICY IF EXISTS "Admins and managers manage marketing links" ON public.marketing_links;
CREATE POLICY "Admins and managers manage marketing links"
  ON public.marketing_links
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]))
  WITH CHECK (public.get_user_role() = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role]));

-- Partner: read-only for links assigned to their partner record
DROP POLICY IF EXISTS "Partners see own marketing links" ON public.marketing_links;
CREATE POLICY "Partners see own marketing links"
  ON public.marketing_links
  FOR SELECT
  TO authenticated
  USING (partner_id = (
    SELECT profiles.partner_id
    FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
  ));
