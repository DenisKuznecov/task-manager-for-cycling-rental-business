-- Partner bike prep catalog v1 + enabled mapping for workshop-partner-bike.
-- Append-only catalog insert. Idempotent. Apply locally only.

INSERT INTO public.checklist_definitions (definition_key, version)
VALUES ('partner_bike_preparation', 1)
ON CONFLICT (definition_key, version) DO NOTHING;

INSERT INTO public.checklist_definition_items (
  definition_id, item_key, sort_order, label, item_type, required, m2_verifies, na_allowed
)
SELECT d.id, v.item_key, v.sort_order, v.label, v.item_type, true, v.m2_verifies, true
FROM public.checklist_definitions d
CROSS JOIN (
  VALUES
    ('PARTNER-01', 1, 'Check saddle bag, charger',              'action'::public.checklist_item_type, true),
    ('PARTNER-02', 2, 'Tyre pressure front',                    'tyre_pressure_psi', true),
    ('PARTNER-03', 3, 'Tyre pressure back',                     'tyre_pressure_psi', true),
    ('PARTNER-04', 4, 'Attach haribo pouch',                    'action', false),
    ('PARTNER-05', 5, 'Bolt check stem, saddle, handlebar',     'action', true),
    ('PARTNER-06', 6, 'Check computer mount',                   'action', true)
) AS v(item_key, sort_order, label, item_type, m2_verifies)
WHERE d.definition_key = 'partner_bike_preparation' AND d.version = 1
ON CONFLICT (definition_id, item_key) DO NOTHING;

INSERT INTO public.checklist_tag_mappings (tag, definition_id, enabled)
SELECT 'workshop-partner-bike', d.id, true
FROM public.checklist_definitions d
WHERE d.definition_key = 'partner_bike_preparation' AND d.version = 1
ON CONFLICT (tag) DO UPDATE
SET definition_id = EXCLUDED.definition_id,
    enabled = EXCLUDED.enabled;
