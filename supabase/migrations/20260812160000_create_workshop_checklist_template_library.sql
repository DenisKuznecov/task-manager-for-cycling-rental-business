-- Read-only foundation for governed Prep and Return checklist standards.
-- Later stories own draft creation, item definitions, and lifecycle mutations.

CREATE TABLE IF NOT EXISTS public.workshop_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase text NOT NULL CHECK (phase IN ('prep', 'return')),
  bike_category text NOT NULL CHECK (
    bike_category IN ('e-city', 'e-road', 'road', 'gravel', 'mtb')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phase, bike_category)
);

CREATE TABLE IF NOT EXISTS public.workshop_checklist_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.workshop_checklist_templates(id)
    ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'active', 'superseded')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, version_number)
);

CREATE INDEX IF NOT EXISTS workshop_checklist_versions_library_order_idx
  ON public.workshop_checklist_versions (template_id, version_number DESC);

CREATE UNIQUE INDEX IF NOT EXISTS workshop_checklist_versions_one_active_per_template_idx
  ON public.workshop_checklist_versions (template_id)
  WHERE status = 'active';

CREATE OR REPLACE VIEW public.workshop_checklist_template_library_view
WITH (security_invoker = true) AS
SELECT
  version.id,
  template.phase,
  template.bike_category,
  version.version_number,
  version.status,
  version.created_at
FROM public.workshop_checklist_versions AS version
JOIN public.workshop_checklist_templates AS template
  ON template.id = version.template_id;

COMMENT ON VIEW public.workshop_checklist_template_library_view IS
  'RLS-enforcing read model for the governed workshop checklist template library.';

ALTER TABLE public.workshop_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_checklist_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and managers can read workshop checklist templates"
  ON public.workshop_checklist_templates;
CREATE POLICY "Admins and managers can read workshop checklist templates"
  ON public.workshop_checklist_templates
  FOR SELECT
  TO authenticated
  USING (
    (select public.get_user_role()) = ANY (
      ARRAY['admin'::public.user_role, 'manager'::public.user_role]
    )
  );

DROP POLICY IF EXISTS "Admins and managers can read workshop checklist versions"
  ON public.workshop_checklist_versions;
CREATE POLICY "Admins and managers can read workshop checklist versions"
  ON public.workshop_checklist_versions
  FOR SELECT
  TO authenticated
  USING (
    (select public.get_user_role()) = ANY (
      ARRAY['admin'::public.user_role, 'manager'::public.user_role]
    )
  );

REVOKE ALL ON TABLE public.workshop_checklist_templates FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.workshop_checklist_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.workshop_checklist_template_library_view FROM PUBLIC, anon;

-- A security_invoker view evaluates table privileges and RLS as the caller.
-- Base-table SELECT is therefore limited by the explicit Admin/Manager policies above.
GRANT SELECT ON TABLE public.workshop_checklist_templates TO authenticated;
GRANT SELECT ON TABLE public.workshop_checklist_versions TO authenticated;
GRANT SELECT ON TABLE public.workshop_checklist_template_library_view TO authenticated;
