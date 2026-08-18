-- Atomic canonical order-graph apply. Adds fingerprints, membership facts,
-- service-role-only incident/attention storage, and apply_canonical_order_graph.
-- Enum labels are added in 20260816595900. Idempotent. Local stack only.

ALTER TABLE public.booqable_product_groups
  ADD COLUMN IF NOT EXISTS source_fingerprint text;
ALTER TABLE public.booqable_products
  ADD COLUMN IF NOT EXISTS source_fingerprint text;
ALTER TABLE public.booqable_bundles
  ADD COLUMN IF NOT EXISTS source_fingerprint text;
ALTER TABLE public.booqable_bundle_items
  ADD COLUMN IF NOT EXISTS source_fingerprint text;
ALTER TABLE public.booqable_stock_items
  ADD COLUMN IF NOT EXISTS source_fingerprint text;
ALTER TABLE public.booqable_plannings
  ADD COLUMN IF NOT EXISTS source_fingerprint text;
ALTER TABLE public.booqable_stock_item_plannings
  ADD COLUMN IF NOT EXISTS source_fingerprint text;
ALTER TABLE public.booqable_order_bike_memberships
  ADD COLUMN IF NOT EXISTS identity_kind text;
ALTER TABLE public.booqable_order_bike_memberships
  ADD COLUMN IF NOT EXISTS line_quantity integer;
ALTER TABLE public.booqable_order_bike_memberships
  ADD COLUMN IF NOT EXISTS source_fingerprint text;

ALTER TABLE public.booqable_order_bike_memberships
  DROP CONSTRAINT IF EXISTS booqable_order_bike_memberships_identity_kind_check;
ALTER TABLE public.booqable_order_bike_memberships
  ADD CONSTRAINT booqable_order_bike_memberships_identity_kind_check
  CHECK (
    identity_kind IS NULL
    OR identity_kind IN ('quantity_one_single', 'stock_item_external_id')
  );

ALTER TABLE public.booqable_order_bike_memberships
  DROP CONSTRAINT IF EXISTS booqable_order_bike_memberships_line_quantity_check;
ALTER TABLE public.booqable_order_bike_memberships
  ADD CONSTRAINT booqable_order_bike_memberships_line_quantity_check
  CHECK (line_quantity IS NULL OR line_quantity >= 1);

CREATE TABLE IF NOT EXISTS public.booqable_accepted_order_graphs (
  order_external_id text PRIMARY KEY,
  schema_version integer NOT NULL,
  producer_version text NOT NULL,
  profile_version text NOT NULL,
  source_fingerprint text NOT NULL,
  source_vector jsonb NOT NULL,
  order_status text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booqable_accepted_order_graphs_order_id_not_blank_check
    CHECK (btrim(order_external_id) <> '')
);

CREATE TABLE IF NOT EXISTS public.booqable_integration_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_kind text NOT NULL,
  root_resource_type text NOT NULL,
  root_external_id text NOT NULL,
  resource_type text NOT NULL,
  resource_external_id text NOT NULL,
  source_version text,
  field_name text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booqable_integration_incidents_kind_check
    CHECK (
      incident_kind IN (
        'equal_version_conflict',
        'older_present_state',
        'incomparable_present_state',
        'unsupported_schema',
        'unauthoritative_addition',
        'omitted_child'
      )
    ),
  CONSTRAINT booqable_integration_incidents_status_check
    CHECK (status IN ('open')),
  CONSTRAINT booqable_integration_incidents_identity_key UNIQUE (
    incident_kind,
    root_resource_type,
    root_external_id,
    resource_type,
    resource_external_id
  )
);

CREATE TABLE IF NOT EXISTS public.booqable_rental_line_attention (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_external_id text NOT NULL,
  line_external_id text NOT NULL,
  unidentified_count integer NOT NULL,
  status text NOT NULL,
  close_reason text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booqable_rental_line_attention_identity_key
    UNIQUE (order_external_id, line_external_id),
  CONSTRAINT booqable_rental_line_attention_status_check
    CHECK (status IN ('open', 'closed')),
  CONSTRAINT booqable_rental_line_attention_close_reason_check
    CHECK (
      close_reason IS NULL
      OR close_reason IN (
        'fully_identified',
        'order_canceled',
        'order_stopped',
        'order_archived'
      )
    ),
  CONSTRAINT booqable_rental_line_attention_count_check
    CHECK (unidentified_count >= 0)
);

INSERT INTO public.booqable_field_authority_manifest (
  entity_origin,
  field_name,
  authority,
  writer,
  backfill_rule,
  disposition
) VALUES
  ('booqable_product_group', 'source_fingerprint', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_product', 'source_fingerprint', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle', 'source_fingerprint', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle_item', 'source_fingerprint', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_stock_item', 'source_fingerprint', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_planning', 'source_fingerprint', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_stock_item_planning', 'source_fingerprint', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_order_bike_membership', 'identity_kind', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_order_bike_membership', 'line_quantity', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_order_bike_membership', 'source_fingerprint', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_accepted_order_graph', 'order_external_id', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_accepted_order_graph', 'schema_version', 'app_owned', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_accepted_order_graph', 'producer_version', 'app_owned', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_accepted_order_graph', 'profile_version', 'app_owned', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_accepted_order_graph', 'source_fingerprint', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_accepted_order_graph', 'source_vector', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_accepted_order_graph', 'order_status', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_accepted_order_graph', 'applied_at', 'app_owned', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_integration_incident', 'id', 'app_owned', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_integration_incident', 'incident_kind', 'app_derived', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_integration_incident', 'root_resource_type', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_integration_incident', 'root_external_id', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_integration_incident', 'resource_type', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_integration_incident', 'resource_external_id', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_integration_incident', 'source_version', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_integration_incident', 'field_name', 'app_derived', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_integration_incident', 'status', 'app_owned', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_integration_incident', 'created_at', 'app_owned', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_integration_incident', 'updated_at', 'app_owned', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_rental_line_attention', 'id', 'app_owned', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_rental_line_attention', 'order_external_id', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_rental_line_attention', 'line_external_id', 'booqable_source', 'canonical_coordinator', 'not_applicable_new_table', 'project_source'),
  ('booqable_rental_line_attention', 'unidentified_count', 'app_derived', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_rental_line_attention', 'status', 'app_owned', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_rental_line_attention', 'close_reason', 'app_derived', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_rental_line_attention', 'opened_at', 'app_owned', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_rental_line_attention', 'closed_at', 'app_owned', 'canonical_coordinator', 'not_applicable_new_table', 'retain'),
  ('booqable_rental_line_attention', 'updated_at', 'app_owned', 'canonical_coordinator', 'not_applicable_new_table', 'retain')
ON CONFLICT (entity_origin, field_name) DO UPDATE SET
  authority = EXCLUDED.authority,
  writer = EXCLUDED.writer,
  backfill_rule = EXCLUDED.backfill_rule,
  disposition = EXCLUDED.disposition;

CREATE OR REPLACE FUNCTION public.record_canonical_integration_incident(
  p_kind text,
  p_root_type text,
  p_root_id text,
  p_resource_type text,
  p_resource_id text,
  p_source_version text,
  p_field_name text
)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.booqable_integration_incidents (
    incident_kind,
    root_resource_type,
    root_external_id,
    resource_type,
    resource_external_id,
    source_version,
    field_name,
    status
  ) VALUES (
    p_kind,
    p_root_type,
    p_root_id,
    p_resource_type,
    p_resource_id,
    p_source_version,
    p_field_name,
    'open'
  )
  ON CONFLICT (
    incident_kind,
    root_resource_type,
    root_external_id,
    resource_type,
    resource_external_id
  ) DO UPDATE SET
    source_version = EXCLUDED.source_version,
    field_name = EXCLUDED.field_name,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_canonical_rental_line_attention(
  p_order_id text,
  p_line_id text,
  p_unidentified integer,
  p_order_status text
)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_close_reason text;
  v_status text;
BEGIN
  IF p_order_status = 'canceled' THEN
    v_close_reason := 'order_canceled';
  ELSIF p_order_status = 'stopped' THEN
    v_close_reason := 'order_stopped';
  ELSIF p_order_status = 'archived' THEN
    v_close_reason := 'order_archived';
  ELSIF p_unidentified <= 0 THEN
    v_close_reason := 'fully_identified';
  ELSE
    v_close_reason := NULL;
  END IF;

  v_status := CASE WHEN v_close_reason IS NULL THEN 'open' ELSE 'closed' END;

  IF v_status = 'closed' AND p_unidentified <= 0 AND v_close_reason = 'fully_identified' THEN
    UPDATE public.booqable_rental_line_attention
    SET
      unidentified_count = 0,
      status = 'closed',
      close_reason = 'fully_identified',
      closed_at = COALESCE(closed_at, now()),
      updated_at = now()
    WHERE order_external_id = p_order_id
      AND line_external_id = p_line_id
      AND status = 'open';
    RETURN;
  END IF;

  IF v_status = 'closed' THEN
    INSERT INTO public.booqable_rental_line_attention (
      order_external_id,
      line_external_id,
      unidentified_count,
      status,
      close_reason,
      closed_at
    ) VALUES (
      p_order_id,
      p_line_id,
      GREATEST(p_unidentified, 0),
      'closed',
      v_close_reason,
      now()
    )
    ON CONFLICT (order_external_id, line_external_id) DO UPDATE SET
      unidentified_count = EXCLUDED.unidentified_count,
      status = 'closed',
      close_reason = EXCLUDED.close_reason,
      closed_at = COALESCE(public.booqable_rental_line_attention.closed_at, now()),
      updated_at = now();
    RETURN;
  END IF;

  INSERT INTO public.booqable_rental_line_attention (
    order_external_id,
    line_external_id,
    unidentified_count,
    status,
    close_reason,
    opened_at,
    closed_at
  ) VALUES (
    p_order_id,
    p_line_id,
    GREATEST(p_unidentified, 0),
    'open',
    NULL,
    now(),
    NULL
  )
  ON CONFLICT (order_external_id, line_external_id) DO UPDATE SET
    unidentified_count = EXCLUDED.unidentified_count,
    status = 'open',
    close_reason = NULL,
    closed_at = NULL,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.compare_canonical_source_versions(
  incoming text,
  accepted text
)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  incoming_ts timestamptz;
  accepted_ts timestamptz;
BEGIN
  IF incoming IS NOT DISTINCT FROM accepted THEN
    RETURN 'equal';
  END IF;
  IF incoming IS NULL OR accepted IS NULL THEN
    RETURN 'incomparable';
  END IF;
  BEGIN
    incoming_ts := incoming::timestamptz;
    accepted_ts := accepted::timestamptz;
    IF incoming_ts = accepted_ts THEN
      RETURN 'equal';
    END IF;
    IF incoming_ts > accepted_ts THEN
      RETURN 'newer';
    END IF;
    RETURN 'older';
  EXCEPTION
    WHEN others THEN
      RETURN 'incomparable';
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_canonical_order_graph(payload jsonb)
RETURNS public.source_apply_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_root_type text;
  v_root_id text;
  v_schema integer;
  v_result public.source_apply_result;
  v_incident_kind text;
  v_accepted_fp text;
  v_accepted_vector jsonb;
  v_accepted_schema integer;
  v_incoming_fp text;
  v_incoming_vector jsonb;
  v_order_status text;
  v_graph jsonb;
  v_empty_graph boolean;
  v_acc record;
  v_inc text;
  v_inc_present boolean;
  v_cmp text;
  v_root_cmp text;
  v_vector_equal boolean;
  v_has_unauth boolean := false;
  v_row jsonb;
  v_fp text;
  v_line jsonb;
  v_omission jsonb;
BEGIN
  v_root_type := payload->'root'->>'resource_type';
  v_root_id := payload->'root'->>'external_id';
  v_schema := COALESCE((payload->>'schema_version')::integer, 0);
  v_incoming_fp := payload->>'merged_fingerprint';
  v_incoming_vector := COALESCE(payload->'source_vector', '[]'::jsonb);
  v_order_status := payload->>'order_status';
  v_graph := COALESCE(payload->'graph', '{}'::jsonb);

  IF v_root_id IS NULL OR btrim(v_root_id) = '' THEN
    RAISE EXCEPTION 'apply_canonical_order_graph requires a root external id';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('canonical_order_graph:' || v_root_id));

  v_empty_graph :=
    COALESCE(jsonb_array_length(v_graph->'memberships'), 0) = 0
    AND COALESCE(jsonb_array_length(v_graph->'product_groups'), 0) = 0
    AND COALESCE(jsonb_array_length(v_graph->'stock_items'), 0) = 0;

  IF v_schema <> 1 THEN
    PERFORM public.record_canonical_integration_incident(
      'unsupported_schema',
      COALESCE(v_root_type, 'order'),
      v_root_id,
      COALESCE(v_root_type, 'order'),
      v_root_id,
      NULL,
      'schema_version'
    );
    RETURN 'quarantined';
  END IF;

  IF v_empty_graph
    AND payload->>'comparison_result' = 'quarantined'
    AND payload->'incident' IS NOT NULL
  THEN
    PERFORM public.record_canonical_integration_incident(
      payload->'incident'->>'kind',
      COALESCE(v_root_type, 'order'),
      v_root_id,
      COALESCE(payload->'incident'->>'resource_type', v_root_type, 'order'),
      COALESCE(payload->'incident'->>'resource_external_id', v_root_id),
      NULL,
      payload->'incident'->>'field_name'
    );
    RETURN 'quarantined';
  END IF;

  SELECT source_fingerprint, source_vector, schema_version
  INTO v_accepted_fp, v_accepted_vector, v_accepted_schema
  FROM public.booqable_accepted_order_graphs
  WHERE order_external_id = v_root_id;

  v_result := 'applied';
  v_incident_kind := NULL;

  IF v_accepted_fp IS NULL THEN
    v_result := 'applied';
  ELSE
    IF v_accepted_schema IS DISTINCT FROM 1 THEN
      v_result := 'quarantined';
      v_incident_kind := 'unsupported_schema';
    ELSE
      FOR v_acc IN
        SELECT
          elem->>'resource_type' AS resource_type,
          elem->>'external_id' AS external_id,
          elem->>'source_version' AS source_version
        FROM jsonb_array_elements(COALESCE(v_accepted_vector, '[]'::jsonb)) AS elem
      LOOP
        SELECT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(v_incoming_vector) AS elem
          WHERE elem->>'resource_type' = v_acc.resource_type
            AND elem->>'external_id' = v_acc.external_id
        ) INTO v_inc_present;

        IF v_inc_present THEN
          SELECT elem->>'source_version'
          INTO v_inc
          FROM jsonb_array_elements(v_incoming_vector) AS elem
          WHERE elem->>'resource_type' = v_acc.resource_type
            AND elem->>'external_id' = v_acc.external_id
          LIMIT 1;

          IF v_inc IS NULL OR btrim(v_inc) = '' THEN
            v_result := 'quarantined';
            v_incident_kind := 'incomparable_present_state';
            EXIT;
          END IF;

          v_cmp := public.compare_canonical_source_versions(v_inc, v_acc.source_version);
          IF v_cmp = 'older' THEN
            v_result := 'quarantined';
            v_incident_kind := 'older_present_state';
            EXIT;
          END IF;
          IF v_cmp = 'incomparable' THEN
            v_result := 'quarantined';
            v_incident_kind := 'incomparable_present_state';
            EXIT;
          END IF;
        END IF;
      END LOOP;

      IF v_result <> 'quarantined' THEN
        SELECT public.compare_canonical_source_versions(inc.ver, acc.ver)
        INTO v_root_cmp
        FROM (
          SELECT elem->>'source_version' AS ver
          FROM jsonb_array_elements(v_incoming_vector) AS elem
          WHERE elem->>'resource_type' = 'order'
            AND elem->>'external_id' = v_root_id
          LIMIT 1
        ) inc
        FULL JOIN (
          SELECT elem->>'source_version' AS ver
          FROM jsonb_array_elements(COALESCE(v_accepted_vector, '[]'::jsonb)) AS elem
          WHERE elem->>'resource_type' = 'order'
            AND elem->>'external_id' = v_root_id
          LIMIT 1
        ) acc ON true;

        SELECT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(v_incoming_vector) AS incoming
          WHERE NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(v_accepted_vector, '[]'::jsonb)) AS accepted
            WHERE accepted->>'resource_type' = incoming->>'resource_type'
              AND accepted->>'external_id' = incoming->>'external_id'
          )
          AND COALESCE(v_root_cmp, 'incomparable') <> 'newer'
        ) INTO v_has_unauth;

        IF v_has_unauth THEN
          v_result := 'quarantined';
          v_incident_kind := 'unauthoritative_addition';
        ELSE
          SELECT
            NOT EXISTS (
              SELECT 1
              FROM jsonb_array_elements(v_incoming_vector) AS incoming
              WHERE NOT EXISTS (
                SELECT 1
                FROM jsonb_array_elements(COALESCE(v_accepted_vector, '[]'::jsonb)) AS accepted
                WHERE accepted->>'resource_type' = incoming->>'resource_type'
                  AND accepted->>'external_id' = incoming->>'external_id'
                  AND accepted->>'source_version' = incoming->>'source_version'
              )
            )
            AND jsonb_array_length(v_incoming_vector)
              = jsonb_array_length(COALESCE(v_accepted_vector, '[]'::jsonb))
          INTO v_vector_equal;

          IF v_vector_equal THEN
            IF v_incoming_fp IS NOT DISTINCT FROM v_accepted_fp THEN
              v_result := 'no_op';
            ELSE
              v_result := 'quarantined';
              v_incident_kind := 'equal_version_conflict';
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  IF v_result = 'quarantined' THEN
    PERFORM public.record_canonical_integration_incident(
      COALESCE(v_incident_kind, payload->'incident'->>'kind', 'equal_version_conflict'),
      COALESCE(v_root_type, 'order'),
      v_root_id,
      COALESCE(payload->'incident'->>'resource_type', v_root_type, 'order'),
      COALESCE(payload->'incident'->>'resource_external_id', v_root_id),
      NULL,
      COALESCE(payload->'incident'->>'field_name', 'source_fingerprint')
    );
    RETURN 'quarantined';
  END IF;

  IF v_result = 'no_op' THEN
    FOR v_omission IN
      SELECT value FROM jsonb_array_elements(COALESCE(payload->'omissions', '[]'::jsonb))
    LOOP
      PERFORM public.record_canonical_integration_incident(
        'omitted_child',
        COALESCE(v_root_type, 'order'),
        v_root_id,
        v_omission->>'resource_type',
        v_omission->>'external_id',
        NULL,
        v_omission->>'resource_type'
      );
    END LOOP;
    RETURN 'no_op';
  END IF;

  FOR v_row IN
    SELECT value FROM jsonb_array_elements(COALESCE(v_graph->'product_groups', '[]'::jsonb))
  LOOP
    SELECT elem->>'source_fingerprint' INTO v_fp
    FROM jsonb_array_elements(COALESCE(payload->'resource_fingerprints', '[]'::jsonb)) AS elem
    WHERE elem->>'resource_type' = 'product_group'
      AND elem->>'external_id' = v_row->>'external_id'
    LIMIT 1;

    INSERT INTO public.booqable_product_groups (
      external_id, tag_list, source_lifecycle, source_version,
      source_updated_at, ingested_at, source_fingerprint
    ) VALUES (
      v_row->>'external_id',
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_row->'tag_list')), ARRAY[]::text[]),
      COALESCE(v_row->>'source_lifecycle', 'open')::public.projection_source_lifecycle,
      v_row->>'source_version',
      NULLIF(v_row->>'source_updated_at', '')::timestamptz,
      COALESCE(NULLIF(v_row->>'ingested_at', '')::timestamptz, now()),
      v_fp
    )
    ON CONFLICT (external_id) DO UPDATE SET
      tag_list = EXCLUDED.tag_list,
      source_lifecycle = EXCLUDED.source_lifecycle,
      source_version = EXCLUDED.source_version,
      source_updated_at = EXCLUDED.source_updated_at,
      ingested_at = EXCLUDED.ingested_at,
      source_fingerprint = EXCLUDED.source_fingerprint;
  END LOOP;

  FOR v_row IN
    SELECT value FROM jsonb_array_elements(COALESCE(v_graph->'products', '[]'::jsonb))
  LOOP
    SELECT elem->>'source_fingerprint' INTO v_fp
    FROM jsonb_array_elements(COALESCE(payload->'resource_fingerprints', '[]'::jsonb)) AS elem
    WHERE elem->>'resource_type' = 'product'
      AND elem->>'external_id' = v_row->>'external_id'
    LIMIT 1;

    INSERT INTO public.booqable_products (
      external_id, product_group_external_id, tag_list, source_lifecycle,
      source_version, source_updated_at, ingested_at, source_fingerprint
    ) VALUES (
      v_row->>'external_id',
      v_row->>'product_group_external_id',
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_row->'tag_list')), ARRAY[]::text[]),
      COALESCE(v_row->>'source_lifecycle', 'open')::public.projection_source_lifecycle,
      v_row->>'source_version',
      NULLIF(v_row->>'source_updated_at', '')::timestamptz,
      COALESCE(NULLIF(v_row->>'ingested_at', '')::timestamptz, now()),
      v_fp
    )
    ON CONFLICT (external_id) DO UPDATE SET
      product_group_external_id = EXCLUDED.product_group_external_id,
      tag_list = EXCLUDED.tag_list,
      source_lifecycle = EXCLUDED.source_lifecycle,
      source_version = EXCLUDED.source_version,
      source_updated_at = EXCLUDED.source_updated_at,
      ingested_at = EXCLUDED.ingested_at,
      source_fingerprint = EXCLUDED.source_fingerprint;
  END LOOP;

  FOR v_row IN
    SELECT value FROM jsonb_array_elements(COALESCE(v_graph->'bundles', '[]'::jsonb))
  LOOP
    SELECT elem->>'source_fingerprint' INTO v_fp
    FROM jsonb_array_elements(COALESCE(payload->'resource_fingerprints', '[]'::jsonb)) AS elem
    WHERE elem->>'resource_type' = 'bundle'
      AND elem->>'external_id' = v_row->>'external_id'
    LIMIT 1;

    INSERT INTO public.booqable_bundles (
      external_id, tag_list, source_lifecycle, source_version,
      source_updated_at, ingested_at, source_fingerprint
    ) VALUES (
      v_row->>'external_id',
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_row->'tag_list')), ARRAY[]::text[]),
      COALESCE(v_row->>'source_lifecycle', 'open')::public.projection_source_lifecycle,
      v_row->>'source_version',
      NULLIF(v_row->>'source_updated_at', '')::timestamptz,
      COALESCE(NULLIF(v_row->>'ingested_at', '')::timestamptz, now()),
      v_fp
    )
    ON CONFLICT (external_id) DO UPDATE SET
      tag_list = EXCLUDED.tag_list,
      source_lifecycle = EXCLUDED.source_lifecycle,
      source_version = EXCLUDED.source_version,
      source_updated_at = EXCLUDED.source_updated_at,
      ingested_at = EXCLUDED.ingested_at,
      source_fingerprint = EXCLUDED.source_fingerprint;
  END LOOP;

  FOR v_row IN
    SELECT value FROM jsonb_array_elements(COALESCE(v_graph->'bundle_items', '[]'::jsonb))
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.booqable_bundles b
      WHERE b.external_id = v_row->>'bundle_external_id'
    ) THEN
      RAISE EXCEPTION
        'apply_canonical_order_graph: missing parent bundle % for bundle_item %',
        v_row->>'bundle_external_id',
        v_row->>'external_id';
    END IF;

    INSERT INTO public.booqable_bundle_items (
      external_id, bundle_external_id, bundle_id, product_external_id,
      product_group_external_id, source_lifecycle, source_version,
      source_updated_at, ingested_at
    )
    SELECT
      v_row->>'external_id',
      v_row->>'bundle_external_id',
      b.id,
      v_row->>'product_external_id',
      v_row->>'product_group_external_id',
      COALESCE(v_row->>'source_lifecycle', 'open')::public.projection_source_lifecycle,
      v_row->>'source_version',
      NULLIF(v_row->>'source_updated_at', '')::timestamptz,
      COALESCE(NULLIF(v_row->>'ingested_at', '')::timestamptz, now())
    FROM public.booqable_bundles b
    WHERE b.external_id = v_row->>'bundle_external_id'
    ON CONFLICT (external_id) DO UPDATE SET
      bundle_external_id = EXCLUDED.bundle_external_id,
      product_external_id = EXCLUDED.product_external_id,
      product_group_external_id = EXCLUDED.product_group_external_id,
      source_lifecycle = EXCLUDED.source_lifecycle,
      source_version = EXCLUDED.source_version,
      source_updated_at = EXCLUDED.source_updated_at,
      ingested_at = EXCLUDED.ingested_at;
  END LOOP;

  FOR v_row IN
    SELECT value FROM jsonb_array_elements(COALESCE(v_graph->'stock_items', '[]'::jsonb))
  LOOP
    SELECT elem->>'source_fingerprint' INTO v_fp
    FROM jsonb_array_elements(COALESCE(payload->'resource_fingerprints', '[]'::jsonb)) AS elem
    WHERE elem->>'resource_type' = 'stock_item'
      AND elem->>'external_id' = v_row->>'external_id'
    LIMIT 1;

    INSERT INTO public.booqable_stock_items (
      external_id, product_external_id, source_lifecycle, source_version,
      source_updated_at, ingested_at, source_fingerprint
    ) VALUES (
      v_row->>'external_id',
      v_row->>'product_external_id',
      COALESCE(v_row->>'source_lifecycle', 'open')::public.projection_source_lifecycle,
      v_row->>'source_version',
      NULLIF(v_row->>'source_updated_at', '')::timestamptz,
      COALESCE(NULLIF(v_row->>'ingested_at', '')::timestamptz, now()),
      v_fp
    )
    ON CONFLICT (external_id) DO UPDATE SET
      product_external_id = EXCLUDED.product_external_id,
      source_lifecycle = EXCLUDED.source_lifecycle,
      source_version = EXCLUDED.source_version,
      source_updated_at = EXCLUDED.source_updated_at,
      ingested_at = EXCLUDED.ingested_at,
      source_fingerprint = EXCLUDED.source_fingerprint;
  END LOOP;

  FOR v_row IN
    SELECT value FROM jsonb_array_elements(COALESCE(v_graph->'plannings', '[]'::jsonb))
  LOOP
    INSERT INTO public.booqable_plannings (
      external_id, order_external_id, line_external_id, source_lifecycle,
      source_version, source_updated_at, ingested_at
    ) VALUES (
      v_row->>'external_id',
      v_row->>'order_external_id',
      v_row->>'line_external_id',
      COALESCE(v_row->>'source_lifecycle', 'open')::public.projection_source_lifecycle,
      v_row->>'source_version',
      NULLIF(v_row->>'source_updated_at', '')::timestamptz,
      COALESCE(NULLIF(v_row->>'ingested_at', '')::timestamptz, now())
    )
    ON CONFLICT (external_id) DO UPDATE SET
      order_external_id = EXCLUDED.order_external_id,
      line_external_id = EXCLUDED.line_external_id,
      source_lifecycle = EXCLUDED.source_lifecycle,
      source_version = EXCLUDED.source_version,
      source_updated_at = EXCLUDED.source_updated_at,
      ingested_at = EXCLUDED.ingested_at;
  END LOOP;

  FOR v_row IN
    SELECT value FROM jsonb_array_elements(COALESCE(v_graph->'stock_item_plannings', '[]'::jsonb))
  LOOP
    INSERT INTO public.booqable_stock_item_plannings (
      external_id, planning_external_id, stock_item_external_id,
      source_lifecycle, source_version, source_updated_at, ingested_at
    ) VALUES (
      v_row->>'external_id',
      v_row->>'planning_external_id',
      v_row->>'stock_item_external_id',
      COALESCE(v_row->>'source_lifecycle', 'open')::public.projection_source_lifecycle,
      v_row->>'source_version',
      NULLIF(v_row->>'source_updated_at', '')::timestamptz,
      COALESCE(NULLIF(v_row->>'ingested_at', '')::timestamptz, now())
    )
    ON CONFLICT (external_id) DO UPDATE SET
      planning_external_id = EXCLUDED.planning_external_id,
      stock_item_external_id = EXCLUDED.stock_item_external_id,
      source_lifecycle = EXCLUDED.source_lifecycle,
      source_version = EXCLUDED.source_version,
      source_updated_at = EXCLUDED.source_updated_at,
      ingested_at = EXCLUDED.ingested_at;
  END LOOP;

  FOR v_row IN
    SELECT value FROM jsonb_array_elements(COALESCE(v_graph->'memberships', '[]'::jsonb))
  LOOP
    SELECT elem->>'source_fingerprint' INTO v_fp
    FROM jsonb_array_elements(COALESCE(payload->'resource_fingerprints', '[]'::jsonb)) AS elem
    WHERE elem->>'resource_type' = 'order_bike_membership'
      AND elem->>'external_id' = v_row->>'id'
    LIMIT 1;

    INSERT INTO public.booqable_order_bike_memberships (
      id, order_external_id, line_external_id, source_unit_discriminator,
      replacement_chain_incarnation, identity_kind, line_quantity,
      planning_external_id, stock_item_planning_external_id,
      stock_item_external_id, source_lifecycle, source_version,
      source_updated_at, ingested_at, source_fingerprint
    ) VALUES (
      COALESCE((v_row->>'id')::uuid, gen_random_uuid()),
      v_row->>'order_external_id',
      v_row->>'line_external_id',
      v_row->>'source_unit_discriminator',
      COALESCE((v_row->>'replacement_chain_incarnation')::integer, 1),
      v_row->>'identity_kind',
      NULLIF(v_row->>'line_quantity', '')::integer,
      v_row->>'planning_external_id',
      v_row->>'stock_item_planning_external_id',
      v_row->>'stock_item_external_id',
      COALESCE(v_row->>'source_lifecycle', 'open')::public.projection_source_lifecycle,
      v_row->>'source_version',
      NULLIF(v_row->>'source_updated_at', '')::timestamptz,
      COALESCE(NULLIF(v_row->>'ingested_at', '')::timestamptz, now()),
      v_fp
    )
    ON CONFLICT (
      order_external_id,
      line_external_id,
      source_unit_discriminator,
      replacement_chain_incarnation
    ) DO UPDATE SET
      identity_kind = EXCLUDED.identity_kind,
      line_quantity = EXCLUDED.line_quantity,
      planning_external_id = EXCLUDED.planning_external_id,
      stock_item_planning_external_id = EXCLUDED.stock_item_planning_external_id,
      stock_item_external_id = EXCLUDED.stock_item_external_id,
      source_lifecycle = EXCLUDED.source_lifecycle,
      source_version = EXCLUDED.source_version,
      source_updated_at = EXCLUDED.source_updated_at,
      ingested_at = EXCLUDED.ingested_at,
      source_fingerprint = EXCLUDED.source_fingerprint;
  END LOOP;

  INSERT INTO public.booqable_accepted_order_graphs (
    order_external_id,
    schema_version,
    producer_version,
    profile_version,
    source_fingerprint,
    source_vector,
    order_status,
    applied_at
  ) VALUES (
    v_root_id,
    v_schema,
    COALESCE(payload->>'producer_version', 'canonical-adapter@v1'),
    COALESCE(payload->>'profile_version', 'nested-order@v1'),
    COALESCE(v_incoming_fp, ''),
    v_incoming_vector,
    v_order_status,
    now()
  )
  ON CONFLICT (order_external_id) DO UPDATE SET
    schema_version = EXCLUDED.schema_version,
    producer_version = EXCLUDED.producer_version,
    profile_version = EXCLUDED.profile_version,
    source_fingerprint = EXCLUDED.source_fingerprint,
    source_vector = EXCLUDED.source_vector,
    order_status = EXCLUDED.order_status,
    applied_at = EXCLUDED.applied_at;

  FOR v_line IN
    SELECT value FROM jsonb_array_elements(COALESCE(payload->'rental_lines', '[]'::jsonb))
  LOOP
    PERFORM public.upsert_canonical_rental_line_attention(
      v_root_id,
      v_line->>'line_external_id',
      COALESCE((v_line->>'unidentified_count')::integer, 0),
      v_order_status
    );
  END LOOP;

  UPDATE public.booqable_rental_line_attention
  SET
    status = 'closed',
    close_reason = CASE
      WHEN v_order_status = 'canceled' THEN 'order_canceled'
      WHEN v_order_status = 'stopped' THEN 'order_stopped'
      WHEN v_order_status = 'archived' THEN 'order_archived'
      ELSE 'fully_identified'
    END,
    unidentified_count = 0,
    closed_at = COALESCE(closed_at, now()),
    updated_at = now()
  WHERE order_external_id = v_root_id
    AND status = 'open'
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(payload->'rental_lines', '[]'::jsonb)) AS line
      WHERE line->>'line_external_id' = public.booqable_rental_line_attention.line_external_id
    );

  FOR v_omission IN
    SELECT value FROM jsonb_array_elements(COALESCE(payload->'omissions', '[]'::jsonb))
  LOOP
    PERFORM public.record_canonical_integration_incident(
      'omitted_child',
      COALESCE(v_root_type, 'order'),
      v_root_id,
      v_omission->>'resource_type',
      v_omission->>'external_id',
      NULL,
      v_omission->>'resource_type'
    );
  END LOOP;

  RETURN 'applied';
END;
$$;

ALTER TABLE public.booqable_accepted_order_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_integration_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_rental_line_attention ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.booqable_accepted_order_graphs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.booqable_integration_incidents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.booqable_rental_line_attention FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_canonical_integration_incident(text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_canonical_rental_line_attention(text, text, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.compare_canonical_source_versions(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_canonical_order_graph(jsonb) FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.booqable_accepted_order_graphs TO service_role;
GRANT ALL ON TABLE public.booqable_integration_incidents TO service_role;
GRANT ALL ON TABLE public.booqable_rental_line_attention TO service_role;
GRANT EXECUTE ON FUNCTION public.record_canonical_integration_incident(text, text, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_canonical_rental_line_attention(text, text, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.compare_canonical_source_versions(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_canonical_order_graph(jsonb) TO service_role;
