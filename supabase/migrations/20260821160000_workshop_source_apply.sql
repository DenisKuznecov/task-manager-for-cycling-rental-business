-- Workshop source apply: per-order lease, SHA-256 fingerprints, assignment set-diff.
-- Idempotent. Apply locally only. service_role only — never grant to authenticated.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

ALTER TABLE public.booqable_assignment_instances
  ADD COLUMN IF NOT EXISTS booqable_stock_item_planning_id text;

CREATE TABLE IF NOT EXISTS private.booqable_order_leases (
  booqable_order_id text PRIMARY KEY,
  token uuid NOT NULL,
  fence bigint NOT NULL CHECK (fence >= 1),
  owner text,
  expires_at timestamptz NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE private.booqable_order_leases FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE private.booqable_order_leases TO postgres, service_role;

DROP TYPE IF EXISTS private.booqable_tag_resolution CASCADE;
CREATE TYPE private.booqable_tag_resolution AS (
  workshop_tag text,
  has_warning boolean,
  definition_id uuid
);

-- ---------------------------------------------------------------------------
-- Events: apply writes source = source_apply (staff default unchanged)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS private.workshop_record_event(
  uuid, text, public.bike_task_status, public.bike_task_status, integer, uuid, text, text, text
);

CREATE OR REPLACE FUNCTION private.workshop_record_event(
  p_task_id uuid,
  p_event_kind text,
  p_from public.bike_task_status,
  p_to public.bike_task_status,
  p_version integer,
  p_actor_id uuid,
  p_first text,
  p_last text,
  p_source_fingerprint text DEFAULT NULL,
  p_source text DEFAULT 'staff_command'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.bike_task_events (
    task_id, event_kind, from_status, to_status, resulting_version,
    source, actor_id, actor_first_name, actor_last_name, source_fingerprint
  ) VALUES (
    p_task_id, p_event_kind, p_from, p_to, p_version,
    p_source, p_actor_id, p_first, p_last, p_source_fingerprint
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_replace_preparation_items(
  p_task_id uuid,
  p_definition_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.bike_task_items
  WHERE task_id = p_task_id
    AND stage = 'preparation'::public.bike_task_item_stage;
  IF p_definition_id IS NOT NULL THEN
    PERFORM private.workshop_copy_definition_items(
      p_task_id,
      p_definition_id,
      'preparation'::public.bike_task_item_stage
    );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Fingerprints (sorted jsonb allowlists → SHA-256 hex)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.booqable_err(p_code text, p_error text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_build_object('ok', false, 'code', p_code, 'error', p_error);
$$;

CREATE OR REPLACE FUNCTION private.booqable_sha256(p_payload jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(p_payload::text, 'UTF8'), 'sha256'),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION private.booqable_source_fingerprint(p_snapshot jsonb)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT private.booqable_sha256(
    jsonb_build_object(
      'v', 1,
      'starts_at', p_snapshot->'order'->>'startsAt',
      'assignments', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'sip_id', a->>'sipId',
            'stock_item_id', a->>'stockItemId',
            'tag_list', COALESCE((
              SELECT jsonb_agg(tag ORDER BY tag)
              FROM jsonb_array_elements_text(COALESCE(a->'workshopTags', '[]'::jsonb)) AS tag
            ), '[]'::jsonb)
          )
          ORDER BY a->>'stockItemId', a->>'sipId'
        )
        FROM jsonb_array_elements(COALESCE(p_snapshot->'assignments', '[]'::jsonb)) AS a
      ), '[]'::jsonb)
    )
  );
$$;

CREATE OR REPLACE FUNCTION private.booqable_addon_fingerprint(p_snapshot jsonb)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT private.booqable_sha256(
    jsonb_build_object(
      'v', 1,
      'lines', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'parent_line_id', l->>'parentBooqableLineId',
            'quantity', l->'quantity'
          )
          ORDER BY l->>'booqableLineId'
        )
        FROM jsonb_array_elements(COALESCE(p_snapshot->'lines', '[]'::jsonb)) AS l
      ), '[]'::jsonb)
    )
  );
$$;

CREATE OR REPLACE FUNCTION private.booqable_enum_label_exists(p_type text, p_label text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_type t
    JOIN pg_catalog.pg_enum e ON e.enumtypid = t.oid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = p_type
      AND e.enumlabel = p_label
  );
$$;

CREATE OR REPLACE FUNCTION private.booqable_snapshot_error(
  p_snapshot jsonb,
  p_booqable_order_id text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_next text;
  v_assignment jsonb;
  v_seen text[] := '{}';
  v_stock text;
BEGIN
  IF p_snapshot IS NULL OR jsonb_typeof(p_snapshot) IS DISTINCT FROM 'object' THEN
    RETURN 'INVALID_SNAPSHOT';
  END IF;

  v_next := p_snapshot->'links'->>'next';
  IF v_next IS NOT NULL AND btrim(v_next) <> '' THEN
    RETURN 'INVALID_SNAPSHOT';
  END IF;

  IF COALESCE(p_snapshot->>'schemaVersion', '') <> '1' THEN
    RETURN 'INVALID_SNAPSHOT';
  END IF;

  IF COALESCE(p_snapshot->>'fetchedAt', '') = ''
     OR COALESCE(p_snapshot->>'sourceStatus', '') = '' THEN
    RETURN 'INVALID_SNAPSHOT';
  END IF;

  IF jsonb_typeof(p_snapshot->'order') IS DISTINCT FROM 'object' THEN
    RETURN 'INVALID_SNAPSHOT';
  END IF;

  IF COALESCE(p_snapshot->'order'->>'booqableOrderId', '') IS DISTINCT FROM p_booqable_order_id THEN
    RETURN 'INVALID_SNAPSHOT';
  END IF;

  IF NOT (p_snapshot ? 'assignments')
     OR jsonb_typeof(p_snapshot->'assignments') IS DISTINCT FROM 'array' THEN
    RETURN 'INVALID_SNAPSHOT';
  END IF;

  IF NOT (p_snapshot ? 'lines')
     OR jsonb_typeof(p_snapshot->'lines') IS DISTINCT FROM 'array' THEN
    RETURN 'INVALID_SNAPSHOT';
  END IF;

  FOR v_assignment IN
    SELECT value FROM jsonb_array_elements(p_snapshot->'assignments')
  LOOP
    IF jsonb_typeof(v_assignment) IS DISTINCT FROM 'object'
       OR COALESCE(v_assignment->>'stockItemId', '') = ''
       OR COALESCE(v_assignment->>'sipId', '') = '' THEN
      RETURN 'INVALID_SNAPSHOT';
    END IF;
    v_stock := v_assignment->>'stockItemId';
    IF v_stock = ANY (v_seen) THEN
      RETURN 'INVALID_SNAPSHOT';
    END IF;
    v_seen := v_seen || v_stock;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION private.booqable_resolve_workshop_tag(p_tags jsonb)
RETURNS private.booqable_tag_resolution
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_result private.booqable_tag_resolution;
  v_tag text;
  v_enabled boolean;
  v_def uuid;
  v_count integer;
BEGIN
  v_result.has_warning := true;
  v_result.workshop_tag := NULL;
  v_result.definition_id := NULL;

  SELECT count(*)::integer INTO v_count
  FROM jsonb_array_elements_text(COALESCE(p_tags, '[]'::jsonb)) AS t(tag)
  WHERE btrim(tag) <> '';

  IF v_count IS DISTINCT FROM 1 THEN
    RETURN v_result;
  END IF;

  SELECT btrim(tag) INTO v_tag
  FROM jsonb_array_elements_text(COALESCE(p_tags, '[]'::jsonb)) AS t(tag)
  WHERE btrim(tag) <> ''
  LIMIT 1;

  v_result.workshop_tag := v_tag;

  SELECT m.enabled, m.definition_id
  INTO v_enabled, v_def
  FROM public.checklist_tag_mappings m
  WHERE m.tag = v_tag;

  IF v_enabled IS TRUE AND v_def IS NOT NULL THEN
    v_result.has_warning := false;
    v_result.definition_id := v_def;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION private.booqable_cancel_instance_task(
  p_instance_id uuid,
  p_fingerprint text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_task public.bike_tasks;
  v_from public.bike_task_status;
BEGIN
  UPDATE public.booqable_assignment_instances
  SET closed_at = COALESCE(closed_at, now())
  WHERE id = p_instance_id
    AND closed_at IS NULL;

  SELECT * INTO v_task
  FROM public.bike_tasks t
  WHERE t.assignment_instance_id = p_instance_id
    AND t.status <> ALL (ARRAY[
      'completed'::public.bike_task_status,
      'cancelled'::public.bike_task_status
    ])
  FOR UPDATE;

  IF v_task.id IS NULL THEN
    RETURN false;
  END IF;

  v_from := v_task.status;
  v_task := private.workshop_bump_task(v_task.id, 'cancelled'::public.bike_task_status);
  PERFORM private.workshop_record_event(
    v_task.id,
    'cancelled',
    v_from,
    v_task.status,
    v_task.version,
    NULL,
    NULL,
    NULL,
    p_fingerprint,
    'source_apply'
  );
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION private.booqable_create_instance_task(
  p_order public.orders,
  p_assignment jsonb,
  p_fingerprint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_instance_id uuid;
  v_task public.bike_tasks;
  v_tag private.booqable_tag_resolution;
BEGIN
  v_tag := private.booqable_resolve_workshop_tag(p_assignment->'workshopTags');

  INSERT INTO public.booqable_assignment_instances (
    order_id,
    booqable_stock_item_id,
    booqable_stock_item_planning_id,
    bike_display_id,
    bike_title
  ) VALUES (
    p_order.id,
    p_assignment->>'stockItemId',
    p_assignment->>'sipId',
    p_assignment->>'displayId',
    p_assignment->>'title'
  )
  RETURNING id INTO v_instance_id;

  INSERT INTO public.bike_tasks (
    assignment_instance_id,
    task_kind,
    status,
    version,
    order_id,
    order_number,
    starts_at,
    booqable_stock_item_id,
    bike_display_id,
    bike_title,
    workshop_tag,
    has_configuration_warning,
    selected_definition_id
  ) VALUES (
    v_instance_id,
    'rental_turnaround',
    'to_prepare',
    1,
    p_order.id,
    p_order.order_number,
    p_order.starts_at,
    p_assignment->>'stockItemId',
    p_assignment->>'displayId',
    p_assignment->>'title',
    v_tag.workshop_tag,
    v_tag.has_warning,
    v_tag.definition_id
  )
  RETURNING * INTO v_task;

  IF v_tag.definition_id IS NOT NULL AND NOT v_tag.has_warning THEN
    PERFORM private.workshop_copy_definition_items(
      v_task.id,
      v_tag.definition_id,
      'preparation'::public.bike_task_item_stage
    );
  END IF;

  PERFORM private.workshop_record_event(
    v_task.id,
    'created',
    NULL,
    v_task.status,
    v_task.version,
    NULL,
    NULL,
    NULL,
    p_fingerprint,
    'source_apply'
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.booqable_sync_retained_task(
  p_order public.orders,
  p_instance public.booqable_assignment_instances,
  p_assignment jsonb,
  p_fingerprint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_task public.bike_tasks;
  v_tag private.booqable_tag_resolution;
  v_has_prep boolean;
  v_from public.bike_task_status;
BEGIN
  v_tag := private.booqable_resolve_workshop_tag(p_assignment->'workshopTags');

  UPDATE public.booqable_assignment_instances
  SET booqable_stock_item_planning_id = p_assignment->>'sipId',
      bike_display_id = p_assignment->>'displayId',
      bike_title = p_assignment->>'title'
  WHERE id = p_instance.id;

  SELECT * INTO v_task
  FROM public.bike_tasks t
  WHERE t.assignment_instance_id = p_instance.id
    AND t.status <> ALL (ARRAY[
      'completed'::public.bike_task_status,
      'cancelled'::public.bike_task_status
    ])
  FOR UPDATE;

  IF v_task.id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.bike_tasks
  SET order_number = p_order.order_number,
      starts_at = p_order.starts_at,
      bike_display_id = p_assignment->>'displayId',
      bike_title = p_assignment->>'title',
      workshop_tag = v_tag.workshop_tag,
      updated_at = now()
  WHERE id = v_task.id;

  IF v_task.status = 'to_prepare'::public.bike_task_status THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.bike_task_items i
      WHERE i.task_id = v_task.id
        AND i.stage = 'preparation'::public.bike_task_item_stage
    ) INTO v_has_prep;

    IF v_tag.definition_id IS NOT NULL AND NOT v_tag.has_warning THEN
      IF v_task.selected_definition_id IS DISTINCT FROM v_tag.definition_id
         OR NOT v_has_prep THEN
        PERFORM private.workshop_replace_preparation_items(v_task.id, v_tag.definition_id);
        v_from := v_task.status;
        v_task := private.workshop_bump_task(v_task.id, v_task.status);
        UPDATE public.bike_tasks
        SET selected_definition_id = v_tag.definition_id,
            has_configuration_warning = false
        WHERE id = v_task.id;
        PERFORM private.workshop_record_event(
          v_task.id,
          'checklist_changed',
          v_from,
          v_task.status,
          v_task.version,
          NULL, NULL, NULL,
          p_fingerprint,
          'source_apply'
        );
      ELSE
        UPDATE public.bike_tasks
        SET has_configuration_warning = false,
            selected_definition_id = v_tag.definition_id
        WHERE id = v_task.id;
      END IF;
    ELSE
      IF v_has_prep OR v_task.selected_definition_id IS NOT NULL THEN
        PERFORM private.workshop_replace_preparation_items(v_task.id, NULL);
        v_from := v_task.status;
        v_task := private.workshop_bump_task(v_task.id, v_task.status);
        UPDATE public.bike_tasks
        SET selected_definition_id = NULL,
            has_configuration_warning = true
        WHERE id = v_task.id;
        PERFORM private.workshop_record_event(
          v_task.id,
          'checklist_changed',
          v_from,
          v_task.status,
          v_task.version,
          NULL, NULL, NULL,
          p_fingerprint,
          'source_apply'
        );
      ELSE
        UPDATE public.bike_tasks
        SET has_configuration_warning = true,
            selected_definition_id = NULL
        WHERE id = v_task.id;
      END IF;
    END IF;
  ELSE
    UPDATE public.bike_tasks
    SET has_configuration_warning = CASE
          WHEN v_tag.has_warning THEN true
          WHEN v_tag.definition_id IS DISTINCT FROM v_task.selected_definition_id THEN true
          ELSE has_configuration_warning
        END
    WHERE id = v_task.id;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Lease + apply
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.booqable_acquire_order_lease(
  p_booqable_order_id text,
  p_expires_at timestamptz,
  p_owner text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lease private.booqable_order_leases;
BEGIN
  IF p_booqable_order_id IS NULL OR btrim(p_booqable_order_id) = '' THEN
    RETURN private.booqable_err('INVALID_SNAPSHOT', 'booqable_order_id is required.');
  END IF;

  INSERT INTO private.booqable_order_leases AS l (
    booqable_order_id, token, fence, owner, expires_at
  ) VALUES (
    p_booqable_order_id,
    pg_catalog.gen_random_uuid(),
    1,
    p_owner,
    p_expires_at
  )
  ON CONFLICT (booqable_order_id) DO UPDATE
  SET token = pg_catalog.gen_random_uuid(),
      fence = l.fence + 1,
      owner = EXCLUDED.owner,
      expires_at = EXCLUDED.expires_at,
      acquired_at = now()
  WHERE l.expires_at <= now()
  RETURNING * INTO v_lease;

  IF v_lease.token IS NULL THEN
    RETURN private.booqable_err(
      'SYNC_IN_PROGRESS',
      'An unexpired lease already holds this order.'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'token', v_lease.token,
    'fence', v_lease.fence,
    'expiresAt', v_lease.expires_at,
    'owner', v_lease.owner
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.booqable_apply_source_snapshot_v1(
  p_booqable_order_id text,
  p_token uuid,
  p_fence bigint,
  p_snapshot jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lease private.booqable_order_leases;
  v_error text;
  v_source_fp text;
  v_addon_fp text;
  v_old_source text;
  v_old_addon text;
  v_old_status public.order_status;
  v_old_customer uuid;
  v_old_partner uuid;
  v_old_promo text;
  v_customer_id uuid;
  v_partner_id uuid;
  v_promo text;
  v_coupon_code text;
  v_property_promo text;
  v_order public.orders;
  v_order_id uuid;
  v_status text;
  v_fulfillment text;
  v_discount text;
  v_created integer := 0;
  v_retained integer := 0;
  v_cancelled integer := 0;
  v_assignment jsonb;
  v_instance public.booqable_assignment_instances;
  v_c_ids text[];
  v_keep text[];
BEGIN
  SELECT * INTO v_lease
  FROM private.booqable_order_leases
  WHERE booqable_order_id = p_booqable_order_id
  FOR UPDATE;

  IF v_lease.token IS NULL
     OR v_lease.token IS DISTINCT FROM p_token
     OR v_lease.fence IS DISTINCT FROM p_fence
     OR v_lease.expires_at <= now() THEN
    RETURN private.booqable_err('STALE_LEASE', 'Lease token, fence, or expiry is not current.');
  END IF;

  v_error := private.booqable_snapshot_error(p_snapshot, p_booqable_order_id);
  IF v_error IS NOT NULL THEN
    RETURN private.booqable_err(v_error, 'Source snapshot is incomplete or invalid.');
  END IF;

  v_status := p_snapshot->>'sourceStatus';
  IF NOT private.booqable_enum_label_exists('order_status', v_status) THEN
    RETURN private.booqable_err('INVALID_SNAPSHOT', 'Source snapshot is incomplete or invalid.');
  END IF;

  v_fulfillment := NULLIF(p_snapshot->'order'->>'fulfillmentType', '');
  IF v_fulfillment IS NOT NULL
     AND NOT private.booqable_enum_label_exists('fulfillment_type', v_fulfillment) THEN
    RETURN private.booqable_err('INVALID_SNAPSHOT', 'Source snapshot is incomplete or invalid.');
  END IF;

  v_discount := NULLIF(p_snapshot->'order'->>'discountType', '');
  IF v_discount IS NOT NULL
     AND NOT private.booqable_enum_label_exists('discount_type', v_discount) THEN
    RETURN private.booqable_err('INVALID_SNAPSHOT', 'Source snapshot is incomplete or invalid.');
  END IF;

  v_source_fp := private.booqable_source_fingerprint(p_snapshot);
  v_addon_fp := private.booqable_addon_fingerprint(p_snapshot);

  SELECT o.id, o.source_fingerprint, o.addon_fingerprint, o.status,
         o.customer_id, o.partner_id, o.partner_promo
  INTO v_order_id, v_old_source, v_old_addon, v_old_status,
       v_old_customer, v_old_partner, v_old_promo
  FROM public.orders o
  WHERE o.booqable_order_id = p_booqable_order_id
  FOR UPDATE;

  IF v_order_id IS NOT NULL THEN
    PERFORM 1
    FROM public.booqable_assignment_instances i
    WHERE i.order_id = v_order_id
    FOR UPDATE;

    PERFORM 1
    FROM public.bike_tasks t
    WHERE t.order_id = v_order_id
    FOR UPDATE;

    PERFORM 1
    FROM public.bike_task_items i
    WHERE i.task_id IN (
      SELECT t.id FROM public.bike_tasks t WHERE t.order_id = v_order_id
    )
    FOR UPDATE;
  END IF;

  BEGIN
  IF jsonb_typeof(p_snapshot->'customer') = 'object' THEN
    INSERT INTO public.customers (
      booqable_customer_id, name, email, phone, birthday, created_at, updated_at
    ) VALUES (
      p_snapshot->'customer'->>'booqableCustomerId',
      p_snapshot->'customer'->>'name',
      p_snapshot->'customer'->>'email',
      p_snapshot->'customer'->>'phone',
      NULLIF(p_snapshot->'customer'->>'birthday', '')::date,
      COALESCE(NULLIF(p_snapshot->'customer'->>'createdAt', '')::timestamptz, now()),
      COALESCE(NULLIF(p_snapshot->'customer'->>'updatedAt', '')::timestamptz, now())
    )
    ON CONFLICT (booqable_customer_id) DO UPDATE
    SET name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        birthday = EXCLUDED.birthday,
        updated_at = EXCLUDED.updated_at
    RETURNING id INTO v_customer_id;
  ELSE
    v_customer_id := v_old_customer;
  END IF;

  v_coupon_code := NULLIF(p_snapshot->'coupon'->>'identifier', '');
  v_property_promo := NULLIF(p_snapshot->'order'->>'partnerPromo', '');
  IF jsonb_typeof(p_snapshot->'coupon') = 'object' OR v_property_promo IS NOT NULL THEN
    v_promo := COALESCE(v_coupon_code, v_property_promo);
    IF v_coupon_code IS NOT NULL THEN
      SELECT p.id INTO v_partner_id
      FROM public.partners p
      WHERE p.promo_code = v_coupon_code
      LIMIT 1;
      IF v_partner_id IS NOT NULL THEN
        v_promo := v_coupon_code;
      END IF;
    END IF;
    IF v_partner_id IS NULL AND v_property_promo IS NOT NULL THEN
      SELECT p.id INTO v_partner_id
      FROM public.partners p
      WHERE p.promo_code = v_property_promo
      LIMIT 1;
      IF v_partner_id IS NOT NULL THEN
        v_promo := v_property_promo;
      END IF;
    END IF;
  ELSE
    v_partner_id := v_old_partner;
    v_promo := v_old_promo;
  END IF;

  IF v_order_id IS NULL THEN
    INSERT INTO public.orders (
      booqable_order_id, order_number, status, starts_at, stops_at,
      created_at, updated_at, fulfillment_type, delivery_address, billing_address,
      maps_link_order, amount_in_cents, discount_type, discount_percentage,
      coupon_discount_in_cents, coupon_code_value, customer_id, partner_id, partner_promo,
      payment_status, deposit_in_cents, tax_in_cents, grand_total_with_tax_in_cents,
      to_be_paid_in_cents, item_count, source_fingerprint, addon_fingerprint
    ) VALUES (
      p_booqable_order_id,
      NULLIF(p_snapshot->'order'->>'orderNumber', '')::integer,
      v_status::public.order_status,
      NULLIF(p_snapshot->'order'->>'startsAt', '')::timestamptz,
      NULLIF(p_snapshot->'order'->>'stopsAt', '')::timestamptz,
      COALESCE(NULLIF(p_snapshot->'order'->>'createdAt', '')::timestamptz, now()),
      COALESCE(NULLIF(p_snapshot->'order'->>'updatedAt', '')::timestamptz, now()),
      v_fulfillment::public.fulfillment_type,
      NULLIF(p_snapshot->'order'->>'deliveryAddress', ''),
      NULLIF(p_snapshot->'order'->>'billingAddress', ''),
      NULLIF(p_snapshot->'order'->>'mapsLinkOrder', ''),
      COALESCE(NULLIF(p_snapshot->'order'->>'amountInCents', '')::integer, 0),
      v_discount::public.discount_type,
      NULLIF(p_snapshot->'order'->>'discountPercentage', '')::numeric,
      NULLIF(p_snapshot->'order'->>'couponDiscountInCents', '')::integer,
      COALESCE(
        NULLIF(p_snapshot->'order'->>'couponCodeValue', '')::integer,
        NULLIF(p_snapshot->'coupon'->>'value', '')::integer
      ),
      v_customer_id,
      v_partner_id,
      v_promo,
      NULLIF(p_snapshot->'order'->>'paymentStatus', ''),
      NULLIF(p_snapshot->'order'->>'depositInCents', '')::integer,
      NULLIF(p_snapshot->'order'->>'taxInCents', '')::integer,
      NULLIF(p_snapshot->'order'->>'grandTotalWithTaxInCents', '')::integer,
      NULLIF(p_snapshot->'order'->>'toBePaidInCents', '')::integer,
      NULLIF(p_snapshot->'order'->>'itemCount', '')::integer,
      v_source_fp,
      v_addon_fp
    )
    RETURNING * INTO v_order;
    v_order_id := v_order.id;
    PERFORM 1
    FROM public.orders o
    WHERE o.id = v_order_id
    FOR UPDATE;
  ELSE
    UPDATE public.orders
    SET order_number = NULLIF(p_snapshot->'order'->>'orderNumber', '')::integer,
        status = v_status::public.order_status,
        starts_at = NULLIF(p_snapshot->'order'->>'startsAt', '')::timestamptz,
        stops_at = NULLIF(p_snapshot->'order'->>'stopsAt', '')::timestamptz,
        updated_at = COALESCE(NULLIF(p_snapshot->'order'->>'updatedAt', '')::timestamptz, now()),
        fulfillment_type = v_fulfillment::public.fulfillment_type,
        delivery_address = NULLIF(p_snapshot->'order'->>'deliveryAddress', ''),
        billing_address = NULLIF(p_snapshot->'order'->>'billingAddress', ''),
        maps_link_order = NULLIF(p_snapshot->'order'->>'mapsLinkOrder', ''),
        amount_in_cents = COALESCE(NULLIF(p_snapshot->'order'->>'amountInCents', '')::integer, 0),
        discount_type = v_discount::public.discount_type,
        discount_percentage = NULLIF(p_snapshot->'order'->>'discountPercentage', '')::numeric,
        coupon_discount_in_cents = NULLIF(p_snapshot->'order'->>'couponDiscountInCents', '')::integer,
        coupon_code_value = COALESCE(
          NULLIF(p_snapshot->'order'->>'couponCodeValue', '')::integer,
          NULLIF(p_snapshot->'coupon'->>'value', '')::integer
        ),
        customer_id = v_customer_id,
        partner_id = v_partner_id,
        partner_promo = v_promo,
        payment_status = NULLIF(p_snapshot->'order'->>'paymentStatus', ''),
        deposit_in_cents = NULLIF(p_snapshot->'order'->>'depositInCents', '')::integer,
        tax_in_cents = NULLIF(p_snapshot->'order'->>'taxInCents', '')::integer,
        grand_total_with_tax_in_cents = NULLIF(p_snapshot->'order'->>'grandTotalWithTaxInCents', '')::integer,
        to_be_paid_in_cents = NULLIF(p_snapshot->'order'->>'toBePaidInCents', '')::integer,
        item_count = NULLIF(p_snapshot->'order'->>'itemCount', '')::integer,
        source_fingerprint = v_source_fp,
        addon_fingerprint = v_addon_fp
    WHERE id = v_order_id
    RETURNING * INTO v_order;
  END IF;

  INSERT INTO public.order_items (
    order_id, booqable_line_id, booqable_item_id, parent_booqable_line_id,
    title, quantity, line_type, charge_label, extra_information,
    price_each_in_cents, price_in_cents, position, relevant, created_at, updated_at
  )
  SELECT
    v_order.id,
    l->>'booqableLineId',
    NULLIF(l->>'booqableItemId', ''),
    NULLIF(l->>'parentBooqableLineId', ''),
    NULLIF(l->>'title', ''),
    NULLIF(l->>'quantity', '')::integer,
    NULLIF(l->>'lineType', ''),
    NULLIF(l->>'chargeLabel', ''),
    NULLIF(l->>'extraInformation', ''),
    NULLIF(l->>'priceEachInCents', '')::integer,
    NULLIF(l->>'priceInCents', '')::integer,
    NULLIF(l->>'position', '')::integer,
    COALESCE((l->>'relevant')::boolean, true),
    COALESCE(NULLIF(l->>'createdAt', '')::timestamptz, now()),
    COALESCE(NULLIF(l->>'updatedAt', '')::timestamptz, now())
  FROM jsonb_array_elements(p_snapshot->'lines') AS l
  ON CONFLICT (booqable_line_id) DO UPDATE
  SET order_id = EXCLUDED.order_id,
      booqable_item_id = EXCLUDED.booqable_item_id,
      parent_booqable_line_id = EXCLUDED.parent_booqable_line_id,
      title = EXCLUDED.title,
      quantity = EXCLUDED.quantity,
      line_type = EXCLUDED.line_type,
      charge_label = EXCLUDED.charge_label,
      extra_information = EXCLUDED.extra_information,
      price_each_in_cents = EXCLUDED.price_each_in_cents,
      price_in_cents = EXCLUDED.price_in_cents,
      position = EXCLUDED.position,
      relevant = EXCLUDED.relevant,
      updated_at = EXCLUDED.updated_at;

  SELECT COALESCE(array_agg(l->>'booqableLineId'), '{}')
  INTO v_keep
  FROM jsonb_array_elements(p_snapshot->'lines') AS l;

  DELETE FROM public.order_items oi
  WHERE oi.order_id = v_order.id
    AND NOT (oi.booqable_line_id = ANY (v_keep));

  IF v_old_source IS NOT NULL
     AND v_old_source = v_source_fp
     AND v_old_addon = v_addon_fp
     AND v_old_status::text = v_status THEN
    SELECT count(*)::integer INTO v_retained
    FROM public.booqable_assignment_instances i
    WHERE i.order_id = v_order.id
      AND i.closed_at IS NULL;
    RETURN jsonb_build_object(
      'ok', true,
      'created', 0,
      'retained', v_retained,
      'cancelled', 0,
      'sourceFingerprint', v_source_fp,
      'addonFingerprint', v_addon_fp
    );
  END IF;

  SELECT COALESCE(array_agg(a->>'stockItemId'), '{}')
  INTO v_c_ids
  FROM jsonb_array_elements(p_snapshot->'assignments') AS a;

  IF v_status = 'canceled' THEN
    FOR v_instance IN
      SELECT * FROM public.booqable_assignment_instances i
      WHERE i.order_id = v_order.id
        AND i.closed_at IS NULL
    LOOP
      IF private.booqable_cancel_instance_task(v_instance.id, v_source_fp) THEN
        v_cancelled := v_cancelled + 1;
      ELSE
        UPDATE public.booqable_assignment_instances
        SET closed_at = now()
        WHERE id = v_instance.id
          AND closed_at IS NULL;
      END IF;
    END LOOP;
    RETURN jsonb_build_object(
      'ok', true,
      'created', 0,
      'retained', 0,
      'cancelled', v_cancelled,
      'sourceFingerprint', v_source_fp,
      'addonFingerprint', v_addon_fp
    );
  END IF;

  FOR v_instance IN
    SELECT * FROM public.booqable_assignment_instances i
    WHERE i.order_id = v_order.id
      AND i.closed_at IS NULL
  LOOP
    IF v_instance.booqable_stock_item_id = ANY (v_c_ids) THEN
      SELECT value INTO v_assignment
      FROM jsonb_array_elements(p_snapshot->'assignments') AS e(value)
      WHERE e.value->>'stockItemId' = v_instance.booqable_stock_item_id
      LIMIT 1;
      PERFORM private.booqable_sync_retained_task(
        v_order, v_instance, v_assignment, v_source_fp
      );
      v_retained := v_retained + 1;
    ELSE
      IF private.booqable_cancel_instance_task(v_instance.id, v_source_fp) THEN
        v_cancelled := v_cancelled + 1;
      END IF;
    END IF;
  END LOOP;

  FOR v_assignment IN
    SELECT value FROM jsonb_array_elements(p_snapshot->'assignments')
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.booqable_assignment_instances i
      WHERE i.order_id = v_order.id
        AND i.booqable_stock_item_id = v_assignment->>'stockItemId'
        AND i.closed_at IS NULL
    ) THEN
      PERFORM private.booqable_create_instance_task(v_order, v_assignment, v_source_fp);
      v_created := v_created + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'created', v_created,
    'retained', v_retained,
    'cancelled', v_cancelled,
    'sourceFingerprint', v_source_fp,
    'addonFingerprint', v_addon_fp
  );
  EXCEPTION
    WHEN invalid_text_representation
      OR invalid_datetime_format
      OR datetime_field_overflow
      OR datatype_mismatch THEN
      RETURN private.booqable_err(
        'INVALID_SNAPSHOT',
        'Source snapshot is incomplete or invalid.'
      );
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.booqable_acquire_order_lease(
  booqable_order_id text,
  expires_at timestamptz,
  owner text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.booqable_acquire_order_lease(booqable_order_id, expires_at, owner);
END;
$$;

CREATE OR REPLACE FUNCTION public.booqable_apply_source_snapshot_v1(
  booqable_order_id text,
  token uuid,
  fence bigint,
  snapshot jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.booqable_apply_source_snapshot_v1(
    booqable_order_id, token, fence, snapshot
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants: backend role only
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE (n.nspname = 'private' AND p.proname LIKE 'booqable%')
       OR (n.nspname = 'private' AND p.proname IN (
         'workshop_record_event', 'workshop_replace_preparation_items'
       ))
       OR (n.nspname = 'public' AND p.proname LIKE 'booqable%')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC', r.schema, r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM anon', r.schema, r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM authenticated', r.schema, r.proname, r.args);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION private.booqable_err(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_sha256(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_source_fingerprint(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_addon_fingerprint(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_enum_label_exists(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_snapshot_error(jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_resolve_workshop_tag(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_cancel_instance_task(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_create_instance_task(public.orders, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_sync_retained_task(public.orders, public.booqable_assignment_instances, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_acquire_order_lease(text, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_apply_source_snapshot_v1(text, uuid, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION private.workshop_replace_preparation_items(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.workshop_record_event(
  uuid, text, public.bike_task_status, public.bike_task_status, integer, uuid, text, text, text, text
) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.booqable_acquire_order_lease(text, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.booqable_apply_source_snapshot_v1(text, uuid, bigint, jsonb) TO service_role;
