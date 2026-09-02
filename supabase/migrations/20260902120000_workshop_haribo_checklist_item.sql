-- Workshop prep catalogs: ROAD v3 (20 items), e-city v2 (23 items),
-- plus independent gravel/e-road v1 snapshot copies of Road v3.
-- Start preparation adopts the new mapping on to_prepare so a catalog remap
-- does not CONFIGURATION_BLOCK until a Booqable sync.
-- Append-only catalog inserts; mappings are the active-version pointer.
-- Idempotent. Apply locally only.

INSERT INTO public.checklist_definitions (definition_key, version)
VALUES ('road_bike_preparation', 3)
ON CONFLICT (definition_key, version) DO NOTHING;

INSERT INTO public.checklist_definitions (definition_key, version)
VALUES ('e_city_bike_preparation', 2)
ON CONFLICT (definition_key, version) DO NOTHING;

INSERT INTO public.checklist_definitions (definition_key, version)
VALUES ('gravel_bike_preparation', 1)
ON CONFLICT (definition_key, version) DO NOTHING;

INSERT INTO public.checklist_definitions (definition_key, version)
VALUES ('e_road_bike_preparation', 1)
ON CONFLICT (definition_key, version) DO NOTHING;

INSERT INTO public.checklist_definition_items (
  definition_id, item_key, sort_order, label, item_type, required, m2_verifies, na_allowed
)
SELECT d.id, v.item_key, v.sort_order, v.label, v.item_type, true, v.m2_verifies, v.na_allowed
FROM public.checklist_definitions d
CROSS JOIN (
  VALUES
    ('ROAD-01', 1,  'Bikefit applied',                         'action'::public.checklist_item_type, false, true),
    ('ROAD-02', 2,  'Bike cleaned',                            'action', false, false),
    ('ROAD-03', 3,  'Check frame and components for damage',   'action', false, false),
    ('ROAD-04', 4,  'Rewax chain',                             'action', false, true),
    ('ROAD-05', 5,  'Check brake pads wear, pins checked',     'action', false, false),
    ('ROAD-06', 6,  'Check rotors wear',                       'action', false, false),
    ('ROAD-07', 7,  'Adjust brakes',                           'action', true,  false),
    ('ROAD-08', 8,  'Adjust gears',                            'action', true,  false),
    ('ROAD-09', 9,  'Tighten pedals and cranks',               'action', false, false),
    ('ROAD-10', 10, 'Check front tyre wear, pressure PSI',     'tyre_pressure_psi', true, false),
    ('ROAD-11', 11, 'Check rear tyre wear, pressure PSI',      'tyre_pressure_psi', true, false),
    ('ROAD-12', 12, 'Adjust headset preload',                  'action', false, false),
    ('ROAD-13', 13, 'Check saddle level',                      'action', false, false),
    ('ROAD-14', 14, 'Bolt check — stem, handlebar, saddle',    'action', true,  false),
    ('ROAD-15', 15, 'Bag/pump/comp mount',                     'action', true,  false),
    ('ROAD-16', 16, 'Charger/lube with a bike',                'action', true,  true),
    ('ROAD-17', 17, 'Charge + check shifting batteries',       'action', true,  false),
    ('ROAD-18', 18, 'Check powermeter battery',                'action', false, true),
    ('ROAD-19', 19, 'Customer name on a bike',                 'action', false, false),
    ('ROAD-20', 20, 'Attach a haribo pouch to the bike',       'action', false, true)
) AS v(item_key, sort_order, label, item_type, m2_verifies, na_allowed)
WHERE d.definition_key = 'road_bike_preparation' AND d.version = 3
ON CONFLICT (definition_id, item_key) DO NOTHING;

INSERT INTO public.checklist_definition_items (
  definition_id, item_key, sort_order, label, item_type, required, m2_verifies, na_allowed
)
SELECT d.id, v.item_key, v.sort_order, v.label, v.item_type, true, v.m2_verifies, v.na_allowed
FROM public.checklist_definitions d
CROSS JOIN (
  VALUES
    ('ECITY-01', 1,  'Check bike, bag cleaned',                     'action'::public.checklist_item_type, false, false),
    ('ECITY-02', 2,  'Check frame and components for damage',       'action', false, false),
    ('ECITY-03', 3,  'Check front brake performance',               'action', true,  false),
    ('ECITY-04', 4,  'Check rear brake performance',                'action', true,  false),
    ('ECITY-05', 5,  'Check rear derailleur shifting',              'action', true,  false),
    ('ECITY-06', 6,  'Torque check: stem and handlebar',            'action', true,  false),
    ('ECITY-07', 7,  'Torque check: seatpost and saddle clamp',     'action', true,  false),
    ('ECITY-08', 8,  'Torque check: front and rear thru-axle',      'action', true,  false),
    ('ECITY-09', 9,  'Check headset for play',                      'action', true,  false),
    ('ECITY-10', 10, 'Check front wheel is true',                   'action', false, false),
    ('ECITY-11', 11, 'Check front tyre for wear, cuts, and cracks', 'action', true,  false),
    ('ECITY-12', 12, 'Check rear wheel is true',                    'action', false, false),
    ('ECITY-13', 13, 'Check rear tyre for wear, cuts, and cracks',  'action', true,  false),
    ('ECITY-14', 14, 'Set front tyre pressure PSI',                 'tyre_pressure_psi', true, false),
    ('ECITY-15', 15, 'Set rear tyre pressure PSI',                  'tyre_pressure_psi', true, false),
    ('ECITY-16', 16, 'Check main battery level (>80%)',             'action', true,  false),
    ('ECITY-17', 17, 'Check saddle bag contents, pump',             'action', true,  false),
    ('ECITY-18', 18, 'Verify charger and lock included',            'action', true,  false),
    ('ECITY-19', 19, 'Verify keys matched and included',            'action', true,  false),
    ('ECITY-20', 20, 'Customer name tag attached',                  'action', false, false),
    ('ECITY-21', 21, 'Check saddle level',                          'action', false, false),
    ('ECITY-22', 22, 'Bikefit applied',                             'action', false, true),
    ('ECITY-23', 23, 'Attach a haribo pouch to the bike',           'action', false, true)
) AS v(item_key, sort_order, label, item_type, m2_verifies, na_allowed)
WHERE d.definition_key = 'e_city_bike_preparation' AND d.version = 2
ON CONFLICT (definition_id, item_key) DO NOTHING;

INSERT INTO public.checklist_definition_items (
  definition_id, item_key, sort_order, label, item_type, required, m2_verifies, na_allowed
)
SELECT d.id, v.item_key, v.sort_order, v.label, v.item_type, true, v.m2_verifies, v.na_allowed
FROM public.checklist_definitions d
CROSS JOIN (
  VALUES
    ('ROAD-01', 1,  'Bikefit applied',                         'action'::public.checklist_item_type, false, true),
    ('ROAD-02', 2,  'Bike cleaned',                            'action', false, false),
    ('ROAD-03', 3,  'Check frame and components for damage',   'action', false, false),
    ('ROAD-04', 4,  'Rewax chain',                             'action', false, true),
    ('ROAD-05', 5,  'Check brake pads wear, pins checked',     'action', false, false),
    ('ROAD-06', 6,  'Check rotors wear',                       'action', false, false),
    ('ROAD-07', 7,  'Adjust brakes',                           'action', true,  false),
    ('ROAD-08', 8,  'Adjust gears',                            'action', true,  false),
    ('ROAD-09', 9,  'Tighten pedals and cranks',               'action', false, false),
    ('ROAD-10', 10, 'Check front tyre wear, pressure PSI',     'tyre_pressure_psi', true, false),
    ('ROAD-11', 11, 'Check rear tyre wear, pressure PSI',      'tyre_pressure_psi', true, false),
    ('ROAD-12', 12, 'Adjust headset preload',                  'action', false, false),
    ('ROAD-13', 13, 'Check saddle level',                      'action', false, false),
    ('ROAD-14', 14, 'Bolt check — stem, handlebar, saddle',    'action', true,  false),
    ('ROAD-15', 15, 'Bag/pump/comp mount',                     'action', true,  false),
    ('ROAD-16', 16, 'Charger/lube with a bike',                'action', true,  true),
    ('ROAD-17', 17, 'Charge + check shifting batteries',       'action', true,  false),
    ('ROAD-18', 18, 'Check powermeter battery',                'action', false, true),
    ('ROAD-19', 19, 'Customer name on a bike',                 'action', false, false),
    ('ROAD-20', 20, 'Attach a haribo pouch to the bike',       'action', false, true)
) AS v(item_key, sort_order, label, item_type, m2_verifies, na_allowed)
WHERE d.definition_key = 'gravel_bike_preparation' AND d.version = 1
ON CONFLICT (definition_id, item_key) DO NOTHING;

INSERT INTO public.checklist_definition_items (
  definition_id, item_key, sort_order, label, item_type, required, m2_verifies, na_allowed
)
SELECT d.id, v.item_key, v.sort_order, v.label, v.item_type, true, v.m2_verifies, v.na_allowed
FROM public.checklist_definitions d
CROSS JOIN (
  VALUES
    ('ROAD-01', 1,  'Bikefit applied',                         'action'::public.checklist_item_type, false, true),
    ('ROAD-02', 2,  'Bike cleaned',                            'action', false, false),
    ('ROAD-03', 3,  'Check frame and components for damage',   'action', false, false),
    ('ROAD-04', 4,  'Rewax chain',                             'action', false, true),
    ('ROAD-05', 5,  'Check brake pads wear, pins checked',     'action', false, false),
    ('ROAD-06', 6,  'Check rotors wear',                       'action', false, false),
    ('ROAD-07', 7,  'Adjust brakes',                           'action', true,  false),
    ('ROAD-08', 8,  'Adjust gears',                            'action', true,  false),
    ('ROAD-09', 9,  'Tighten pedals and cranks',               'action', false, false),
    ('ROAD-10', 10, 'Check front tyre wear, pressure PSI',     'tyre_pressure_psi', true, false),
    ('ROAD-11', 11, 'Check rear tyre wear, pressure PSI',      'tyre_pressure_psi', true, false),
    ('ROAD-12', 12, 'Adjust headset preload',                  'action', false, false),
    ('ROAD-13', 13, 'Check saddle level',                      'action', false, false),
    ('ROAD-14', 14, 'Bolt check — stem, handlebar, saddle',    'action', true,  false),
    ('ROAD-15', 15, 'Bag/pump/comp mount',                     'action', true,  false),
    ('ROAD-16', 16, 'Charger/lube with a bike',                'action', true,  true),
    ('ROAD-17', 17, 'Charge + check shifting batteries',       'action', true,  false),
    ('ROAD-18', 18, 'Check powermeter battery',                'action', false, true),
    ('ROAD-19', 19, 'Customer name on a bike',                 'action', false, false),
    ('ROAD-20', 20, 'Attach a haribo pouch to the bike',       'action', false, true)
) AS v(item_key, sort_order, label, item_type, m2_verifies, na_allowed)
WHERE d.definition_key = 'e_road_bike_preparation' AND d.version = 1
ON CONFLICT (definition_id, item_key) DO NOTHING;

UPDATE public.checklist_tag_mappings m
SET definition_id = d.id,
    enabled = true
FROM public.checklist_definitions d
WHERE m.tag = 'workshop-road-bike'
  AND d.definition_key = 'road_bike_preparation'
  AND d.version = 3;

UPDATE public.checklist_tag_mappings m
SET definition_id = d.id,
    enabled = true
FROM public.checklist_definitions d
WHERE m.tag = 'workshop-e-city-bike'
  AND d.definition_key = 'e_city_bike_preparation'
  AND d.version = 2;

UPDATE public.checklist_tag_mappings m
SET definition_id = d.id,
    enabled = true
FROM public.checklist_definitions d
WHERE m.tag = 'workshop-gravel-bike'
  AND d.definition_key = 'gravel_bike_preparation'
  AND d.version = 1;

UPDATE public.checklist_tag_mappings m
SET definition_id = d.id,
    enabled = true
FROM public.checklist_definitions d
WHERE m.tag = 'workshop-e-road-bike'
  AND d.definition_key = 'e_road_bike_preparation'
  AND d.version = 1;

CREATE OR REPLACE FUNCTION private.workshop_start_preparation(
  p_task_id uuid,
  p_expected_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ctx private.workshop_begin_result;
  v_enabled boolean;
  v_map_def uuid;
  v_task public.bike_tasks;
  v_has_prep boolean;
BEGIN
  v_ctx := private.workshop_begin_command(p_task_id, p_expected_version, false);
  IF v_ctx.err IS NOT NULL THEN
    RETURN v_ctx.err;
  END IF;

  IF v_ctx.status <> 'to_prepare'::public.bike_task_status THEN
    RETURN private.workshop_err('INVALID_TRANSITION', 'Preparation can only start from To Prepare.');
  END IF;

  SELECT m.enabled, m.definition_id
  INTO v_enabled, v_map_def
  FROM public.checklist_tag_mappings m
  WHERE m.tag = v_ctx.workshop_tag;

  IF v_ctx.workshop_tag IS NULL
     OR v_enabled IS DISTINCT FROM true
     OR v_map_def IS NULL
  THEN
    RETURN private.workshop_err(
      'CONFIGURATION_BLOCKED',
      'This bike has no recognized workshop checklist.'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.bike_task_items i
    WHERE i.task_id = v_ctx.task_id
      AND i.stage = 'preparation'::public.bike_task_item_stage
  ) INTO v_has_prep;

  IF v_ctx.selected_definition_id IS DISTINCT FROM v_map_def
     OR NOT v_has_prep
     OR v_ctx.has_configuration_warning
  THEN
    PERFORM private.workshop_replace_preparation_items(v_ctx.task_id, v_map_def);
    UPDATE public.bike_tasks
    SET selected_definition_id = v_map_def,
        has_configuration_warning = false
    WHERE id = v_ctx.task_id;
  END IF;

  v_task := private.workshop_bump_task(v_ctx.task_id, 'being_prepared');
  PERFORM private.workshop_record_event(
    v_task.id, 'transition', v_ctx.status, v_task.status, v_task.version,
    v_ctx.user_id, v_ctx.first_name, v_ctx.last_name, NULL
  );
  RETURN private.workshop_ok(v_task);
END;
$$;

-- Align waiting tasks so the queue/task page is current before anyone clicks Start.
-- Do not touch in-progress rows.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT t.id, m.definition_id
    FROM public.bike_tasks t
    JOIN public.checklist_tag_mappings m ON m.tag = t.workshop_tag
    WHERE t.status = 'to_prepare'::public.bike_task_status
      AND m.enabled
      AND m.definition_id IS NOT NULL
      AND (
        t.selected_definition_id IS DISTINCT FROM m.definition_id
        OR t.has_configuration_warning
        OR NOT EXISTS (
          SELECT 1
          FROM public.bike_task_items i
          WHERE i.task_id = t.id
            AND i.stage = 'preparation'::public.bike_task_item_stage
        )
      )
  LOOP
    PERFORM private.workshop_replace_preparation_items(r.id, r.definition_id);
    UPDATE public.bike_tasks
    SET selected_definition_id = r.definition_id,
        has_configuration_warning = false
    WHERE id = r.id;
  END LOOP;
END;
$$;
