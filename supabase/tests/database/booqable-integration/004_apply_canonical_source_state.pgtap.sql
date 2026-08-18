begin;

select plan(63);

select has_table('public', 'booqable_accepted_order_graphs', 'accepted graphs are persisted');
select has_table('public', 'booqable_integration_incidents', 'incidents are persisted');
select has_table('public', 'booqable_rental_line_attention', 'rental-line attention is persisted');
select has_column('public', 'booqable_product_groups', 'source_fingerprint', 'catalog rows persist fingerprints');
select has_column('public', 'booqable_order_bike_memberships', 'identity_kind', 'memberships persist identity kind');
select has_column('public', 'booqable_order_bike_memberships', 'line_quantity', 'memberships persist line quantity');
select has_function('public', 'apply_canonical_order_graph', ARRAY['jsonb'], 'atomic apply function exists');

select ok(
  not has_table_privilege('authenticated', 'public.booqable_integration_incidents', 'INSERT')
  and not has_table_privilege('authenticated', 'public.booqable_rental_line_attention', 'INSERT')
  and not has_table_privilege('anon', 'public.booqable_accepted_order_graphs', 'SELECT'),
  'direct API roles cannot write incident or attention storage'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.apply_canonical_order_graph(jsonb)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.apply_canonical_order_graph(jsonb)',
    'EXECUTE'
  ),
  'direct API roles cannot execute the coordinator'
);

select ok(
  has_table_privilege('service_role', 'public.booqable_integration_incidents', 'SELECT')
  and has_function_privilege(
    'service_role',
    'public.apply_canonical_order_graph(jsonb)',
    'EXECUTE'
  ),
  'service_role can use coordinator storage'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "producer_version": "canonical-adapter@v1",
      "profile_version": "nested-order@v1",
      "root": { "resource_type": "order", "external_id": "ord_apply_1" },
      "order_status": "reserved",
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_apply_1",
          "source_version": "2026-08-17T09:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-applied-1",
      "graph": {
        "product_groups": [
          {
            "resource_type": "product_group",
            "external_id": "pg_apply_1",
            "tag_list": ["workshop-road-bike"],
            "source_lifecycle": "open",
            "source_version": "2026-08-17T09:00:00.000Z",
            "source_updated_at": "2026-08-17T09:00:00.000Z",
            "ingested_at": "2026-08-17T09:05:00.000Z"
          }
        ],
        "products": [],
        "bundles": [],
        "bundle_items": [],
        "stock_items": [
          {
            "resource_type": "stock_item",
            "external_id": "si_apply_1",
            "product_external_id": null,
            "source_lifecycle": "open",
            "source_version": "2026-08-17T09:00:00.000Z",
            "source_updated_at": "2026-08-17T09:00:00.000Z",
            "ingested_at": "2026-08-17T09:05:00.000Z"
          }
        ],
        "plannings": [],
        "stock_item_plannings": [],
        "memberships": [
          {
            "id": "11111111-1111-4111-8111-aaaaaaaaaaaa",
            "order_external_id": "ord_apply_1",
            "line_external_id": "line_apply_1",
            "source_unit_discriminator": "si_apply_1",
            "replacement_chain_incarnation": 1,
            "identity_kind": "stock_item_external_id",
            "line_quantity": 3,
            "planning_external_id": null,
            "stock_item_planning_external_id": null,
            "stock_item_external_id": "si_apply_1",
            "source_lifecycle": "open",
            "source_version": "2026-08-17T09:00:00.000Z",
            "source_updated_at": "2026-08-17T09:00:00.000Z",
            "ingested_at": "2026-08-17T09:05:00.000Z"
          }
        ],
        "predecessors": []
      },
      "resource_fingerprints": [
        {
          "resource_type": "product_group",
          "external_id": "pg_apply_1",
          "source_fingerprint": "pg-fp-1"
        },
        {
          "resource_type": "stock_item",
          "external_id": "si_apply_1",
          "source_fingerprint": "si-fp-1"
        },
        {
          "resource_type": "order_bike_membership",
          "external_id": "11111111-1111-4111-8111-aaaaaaaaaaaa",
          "source_fingerprint": "mem-fp-1"
        }
      ],
      "rental_lines": [
        {
          "line_external_id": "line_apply_1",
          "line_quantity": 3,
          "identified_count": 1,
          "unidentified_count": 2
        }
      ],
      "omissions": [],
      "incident": null,
      "comparison_result": "applied"
    }
  $payload$::jsonb)::text,
  'applied',
  'new accepted graph applies atomically'
);

select is(
  (
    select source_fingerprint
    from public.booqable_product_groups
    where external_id = 'pg_apply_1'
  ),
  'pg-fp-1',
  'source fingerprints persist on canonical rows'
);

select is(
  (
    select unidentified_count
    from public.booqable_rental_line_attention
    where order_external_id = 'ord_apply_1'
      and line_external_id = 'line_apply_1'
      and status = 'open'
  ),
  2,
  'one attention record tracks the remaining unidentified count'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "producer_version": "canonical-adapter@v1",
      "profile_version": "nested-order@v1",
      "root": { "resource_type": "order", "external_id": "ord_apply_1" },
      "order_status": "reserved",
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_apply_1",
          "source_version": "2026-08-17T09:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-applied-1",
      "graph": {
        "product_groups": [],
        "products": [],
        "bundles": [],
        "bundle_items": [],
        "stock_items": [],
        "plannings": [],
        "stock_item_plannings": [],
        "memberships": [],
        "predecessors": []
      },
      "resource_fingerprints": [],
      "rental_lines": [],
      "omissions": [],
      "incident": null,
      "comparison_result": "no_op"
    }
  $payload$::jsonb)::text,
  'no_op',
  'exact repeat is a no-op'
);

select is(
  (
    select count(*)::integer
    from public.booqable_product_groups
    where external_id = 'pg_apply_1'
  ),
  1,
  'no-op does not duplicate canonical rows'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "producer_version": "canonical-adapter@v1",
      "profile_version": "nested-order@v1",
      "root": { "resource_type": "order", "external_id": "ord_apply_1" },
      "order_status": "reserved",
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_apply_1",
          "source_version": "2026-08-17T09:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-conflict",
      "graph": {
        "product_groups": [
          {
            "resource_type": "product_group",
            "external_id": "pg_should_not_write",
            "tag_list": ["workshop-road-bike"],
            "source_lifecycle": "open",
            "source_version": "2026-08-17T09:00:00.000Z",
            "source_updated_at": "2026-08-17T09:00:00.000Z",
            "ingested_at": "2026-08-17T09:05:00.000Z"
          }
        ],
        "products": [],
        "bundles": [],
        "bundle_items": [],
        "stock_items": [],
        "plannings": [],
        "stock_item_plannings": [],
        "memberships": [],
        "predecessors": []
      },
      "resource_fingerprints": [],
      "rental_lines": [],
      "omissions": [],
      "incident": {
        "kind": "equal_version_conflict",
        "field_name": "source_fingerprint",
        "resource_type": "order",
        "resource_external_id": "ord_apply_1"
      },
      "comparison_result": "quarantined"
    }
  $payload$::jsonb)::text,
  'quarantined',
  'equal-version fingerprint conflict quarantines'
);

select is(
  (
    select count(*)::integer
    from public.booqable_product_groups
    where external_id = 'pg_should_not_write'
  ),
  0,
  'quarantine does not mutate canonical source'
);

select is(
  (
    select count(*)::integer
    from public.booqable_integration_incidents
    where root_external_id = 'ord_apply_1'
      and incident_kind = 'equal_version_conflict'
  ),
  1,
  'conflict records one deduplicated incident'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "producer_version": "canonical-adapter@v1",
      "profile_version": "nested-order@v1",
      "root": { "resource_type": "order", "external_id": "ord_apply_1" },
      "order_status": "reserved",
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_apply_1",
          "source_version": "2026-08-17T09:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-conflict",
      "graph": {
        "product_groups": [],
        "products": [],
        "bundles": [],
        "bundle_items": [],
        "stock_items": [],
        "plannings": [],
        "stock_item_plannings": [],
        "memberships": [],
        "predecessors": []
      },
      "resource_fingerprints": [],
      "rental_lines": [],
      "omissions": [],
      "incident": {
        "kind": "equal_version_conflict",
        "field_name": "source_fingerprint",
        "resource_type": "order",
        "resource_external_id": "ord_apply_1"
      },
      "comparison_result": "quarantined"
    }
  $payload$::jsonb)::text,
  'quarantined',
  'repeat conflict stays quarantined'
);

select is(
  (
    select count(*)::integer
    from public.booqable_integration_incidents
    where root_external_id = 'ord_apply_1'
      and incident_kind = 'equal_version_conflict'
  ),
  1,
  'repeat conflict does not duplicate the incident'
);

select throws_ok(
  $$update public.booqable_order_bike_memberships
    set source_unit_discriminator = 'si_changed'
    where id = '11111111-1111-4111-8111-aaaaaaaaaaaa'$$,
  'P0001',
  'booqable order-bike membership identity is immutable',
  'applied membership identity stays immutable'
);

select throws_ok(
  $$select public.apply_canonical_order_graph('{
    "schema_version": 1,
    "producer_version": "canonical-adapter@v1",
    "profile_version": "nested-order@v1",
    "root": { "resource_type": "order", "external_id": "ord_fail_1" },
    "order_status": "reserved",
    "source_vector": [
      {
        "resource_type": "order",
        "external_id": "ord_fail_1",
        "source_version": "2026-08-17T09:00:00.000Z"
      }
    ],
    "merged_fingerprint": "fp-fail",
    "graph": {
      "product_groups": [
        {
          "resource_type": "product_group",
          "external_id": "pg_fail_1",
          "tag_list": ["workshop-road-bike"],
          "source_lifecycle": "open",
          "source_version": "2026-08-17T09:00:00.000Z",
          "source_updated_at": "2026-08-17T09:00:00.000Z",
          "ingested_at": "2026-08-17T09:05:00.000Z"
        }
      ],
      "products": [],
      "bundles": [],
      "bundle_items": [],
      "stock_items": [],
      "plannings": [],
      "stock_item_plannings": [],
      "memberships": [
        {
          "id": "22222222-2222-4222-8222-bbbbbbbbbbbb",
          "order_external_id": "ord_fail_1",
          "line_external_id": "line_fail_1",
          "source_unit_discriminator": "",
          "replacement_chain_incarnation": 1,
          "identity_kind": "quantity_one_single",
          "line_quantity": 1,
          "source_lifecycle": "open",
          "source_version": "2026-08-17T09:00:00.000Z",
          "source_updated_at": "2026-08-17T09:00:00.000Z",
          "ingested_at": "2026-08-17T09:05:00.000Z"
        }
      ],
      "predecessors": []
    },
    "resource_fingerprints": [],
    "rental_lines": [],
    "omissions": [],
    "incident": null,
    "comparison_result": "applied"
  }'::jsonb)$$,
  '23514',
  'new row for relation "booqable_order_bike_memberships" violates check constraint "booqable_order_bike_memberships_discriminator_check"',
  'invalid membership identity aborts the apply'
);

select is(
  (
    select count(*)::integer
    from public.booqable_product_groups
    where external_id = 'pg_fail_1'
  ),
  0,
  'failed apply rolls back canonical writes'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "producer_version": "canonical-adapter@v1",
      "profile_version": "nested-order@v1",
      "root": { "resource_type": "order", "external_id": "ord_apply_1" },
      "order_status": "reserved",
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_apply_1",
          "source_version": "2026-08-16T09:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-older",
      "graph": {
        "product_groups": [],
        "products": [],
        "bundles": [],
        "bundle_items": [],
        "stock_items": [],
        "plannings": [],
        "stock_item_plannings": [],
        "memberships": [],
        "predecessors": []
      },
      "resource_fingerprints": [],
      "rental_lines": [],
      "omissions": [],
      "incident": {
        "kind": "older_present_state",
        "field_name": "source_fingerprint",
        "resource_type": "order",
        "resource_external_id": "ord_apply_1"
      },
      "comparison_result": "quarantined"
    }
  $payload$::jsonb)::text,
  'quarantined',
  'older present state quarantines'
);

select is(
  (
    select source_fingerprint
    from public.booqable_accepted_order_graphs
    where order_external_id = 'ord_apply_1'
  ),
  'fp-applied-1',
  'older present state does not change the accepted fingerprint'
);

select is(
  (
    select count(*)::integer
    from public.booqable_integration_incidents
    where root_external_id = 'ord_apply_1'
      and incident_kind = 'older_present_state'
  ),
  1,
  'older present state records one incident'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "producer_version": "canonical-adapter@v1",
      "profile_version": "nested-order@v1",
      "root": { "resource_type": "order", "external_id": "ord_apply_1" },
      "order_status": "reserved",
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_apply_1",
          "source_version": "2026-08-17T09:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-applied-1",
      "graph": {
        "product_groups": [],
        "products": [],
        "bundles": [],
        "bundle_items": [],
        "stock_items": [],
        "plannings": [],
        "stock_item_plannings": [],
        "memberships": [],
        "predecessors": []
      },
      "resource_fingerprints": [],
      "rental_lines": [],
      "omissions": [
        {
          "resource_type": "stock_item",
          "external_id": "si_apply_1"
        }
      ],
      "incident": {
        "kind": "omitted_child",
        "field_name": "stock_item",
        "resource_type": "stock_item",
        "resource_external_id": "si_apply_1"
      },
      "comparison_result": "no_op"
    }
  $payload$::jsonb)::text,
  'no_op',
  'omitted child on an exact repeat is a no-op'
);

select is(
  (
    select count(*)::integer
    from public.booqable_integration_incidents
    where root_external_id = 'ord_apply_1'
      and incident_kind = 'omitted_child'
  ),
  1,
  'omitted child records one absence incident'
);

select is(
  (
    select source_fingerprint
    from public.booqable_accepted_order_graphs
    where order_external_id = 'ord_apply_1'
  ),
  'fp-applied-1',
  'omitted-child no-op does not mutate canonical source'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "producer_version": "canonical-adapter@v1",
      "profile_version": "nested-order@v1",
      "root": { "resource_type": "order", "external_id": "ord_apply_1" },
      "order_status": "reserved",
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_apply_1",
          "source_version": "2026-08-17T10:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-remaining-1",
      "graph": {
        "product_groups": [],
        "products": [],
        "bundles": [],
        "bundle_items": [],
        "stock_items": [],
        "plannings": [],
        "stock_item_plannings": [],
        "memberships": [
          {
            "id": "11111111-1111-4111-8111-aaaaaaaaaaaa",
            "order_external_id": "ord_apply_1",
            "line_external_id": "line_apply_1",
            "source_unit_discriminator": "si_apply_1",
            "replacement_chain_incarnation": 1,
            "identity_kind": "stock_item_external_id",
            "line_quantity": 3,
            "stock_item_external_id": "si_apply_1",
            "source_lifecycle": "open",
            "source_version": "2026-08-17T10:00:00.000Z",
            "source_updated_at": "2026-08-17T10:00:00.000Z",
            "ingested_at": "2026-08-17T10:05:00.000Z"
          }
        ],
        "predecessors": []
      },
      "resource_fingerprints": [],
      "rental_lines": [
        {
          "line_external_id": "line_apply_1",
          "line_quantity": 3,
          "identified_count": 2,
          "unidentified_count": 1
        }
      ],
      "omissions": [],
      "incident": null,
      "comparison_result": "applied"
    }
  $payload$::jsonb)::text,
  'applied',
  'later accepted graph can reduce remaining unidentified count'
);

select is(
  (
    select unidentified_count
    from public.booqable_rental_line_attention
    where order_external_id = 'ord_apply_1'
      and line_external_id = 'line_apply_1'
      and status = 'open'
  ),
  1,
  'open attention updates when remaining count changes from 2 to 1'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "producer_version": "canonical-adapter@v1",
      "profile_version": "nested-order@v1",
      "root": { "resource_type": "order", "external_id": "ord_apply_1" },
      "order_status": "reserved",
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_apply_1",
          "source_version": "2026-08-17T11:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-fully-identified",
      "graph": {
        "product_groups": [],
        "products": [],
        "bundles": [],
        "bundle_items": [],
        "stock_items": [],
        "plannings": [],
        "stock_item_plannings": [],
        "memberships": [
          {
            "id": "11111111-1111-4111-8111-aaaaaaaaaaaa",
            "order_external_id": "ord_apply_1",
            "line_external_id": "line_apply_1",
            "source_unit_discriminator": "si_apply_1",
            "replacement_chain_incarnation": 1,
            "identity_kind": "stock_item_external_id",
            "line_quantity": 3,
            "stock_item_external_id": "si_apply_1",
            "source_lifecycle": "open",
            "source_version": "2026-08-17T11:00:00.000Z",
            "source_updated_at": "2026-08-17T11:00:00.000Z",
            "ingested_at": "2026-08-17T11:05:00.000Z"
          }
        ],
        "predecessors": []
      },
      "resource_fingerprints": [],
      "rental_lines": [
        {
          "line_external_id": "line_apply_1",
          "line_quantity": 3,
          "identified_count": 3,
          "unidentified_count": 0
        }
      ],
      "omissions": [],
      "incident": null,
      "comparison_result": "applied"
    }
  $payload$::jsonb)::text,
  'applied',
  'zero remaining count applies on a non-terminal order'
);

select is(
  (
    select status
    from public.booqable_rental_line_attention
    where order_external_id = 'ord_apply_1'
      and line_external_id = 'line_apply_1'
  ),
  'closed',
  'zero remaining count closes attention on a reserved order'
);

select is(
  (
    select close_reason
    from public.booqable_rental_line_attention
    where order_external_id = 'ord_apply_1'
      and line_external_id = 'line_apply_1'
  ),
  'fully_identified',
  'zero remaining count closes with fully_identified'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "producer_version": "canonical-adapter@v1",
      "profile_version": "nested-order@v1",
      "root": { "resource_type": "order", "external_id": "ord_apply_1" },
      "order_status": "canceled",
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_apply_1",
          "source_version": "2026-08-18T09:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-canceled",
      "graph": {
        "product_groups": [],
        "products": [],
        "bundles": [],
        "bundle_items": [],
        "stock_items": [],
        "plannings": [],
        "stock_item_plannings": [],
        "memberships": [
          {
            "id": "11111111-1111-4111-8111-aaaaaaaaaaaa",
            "order_external_id": "ord_apply_1",
            "line_external_id": "line_apply_1",
            "source_unit_discriminator": "si_apply_1",
            "replacement_chain_incarnation": 1,
            "identity_kind": "stock_item_external_id",
            "line_quantity": 3,
            "stock_item_external_id": "si_apply_1",
            "source_lifecycle": "open",
            "source_version": "2026-08-18T09:00:00.000Z",
            "source_updated_at": "2026-08-18T09:00:00.000Z",
            "ingested_at": "2026-08-18T09:05:00.000Z"
          }
        ],
        "predecessors": []
      },
      "resource_fingerprints": [],
      "rental_lines": [
        {
          "line_external_id": "line_apply_1",
          "line_quantity": 3,
          "identified_count": 1,
          "unidentified_count": 2
        }
      ],
      "omissions": [],
      "incident": null,
      "comparison_result": "applied"
    }
  $payload$::jsonb)::text,
  'applied',
  'later newer graph can apply after the first accepted snapshot'
);

select is(
  (
    select close_reason
    from public.booqable_rental_line_attention
    where order_external_id = 'ord_apply_1'
      and line_external_id = 'line_apply_1'
  ),
  'order_canceled',
  'attention closes with a retained reason on a terminal order'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 2,
      "root": { "resource_type": "order", "external_id": "ord_unsupported_schema" },
      "source_vector": [],
      "merged_fingerprint": "fp-unsupported-schema",
      "graph": {}
    }
  $payload$::jsonb)::text,
  'quarantined',
  'unsupported schema quarantines in the database coordinator'
);

select is(
  (
    select count(*)
    from public.booqable_integration_incidents
    where incident_kind = 'unsupported_schema'
      and root_external_id = 'ord_unsupported_schema'
  ),
  1::bigint,
  'unsupported schema records one deduplicated incident'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "root": { "resource_type": "order", "external_id": "ord_sql_quarantine" },
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_sql_quarantine",
          "source_version": "2026-08-18T10:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-sql-baseline",
      "graph": {}
    }
  $payload$::jsonb)::text,
  'applied',
  'database quarantine fixture establishes an accepted baseline'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "root": { "resource_type": "order", "external_id": "ord_sql_quarantine" },
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_sql_quarantine",
          "source_version": ""
        }
      ],
      "merged_fingerprint": "fp-incomparable",
      "graph": {}
    }
  $payload$::jsonb)::text,
  'quarantined',
  'blank present source version quarantines in the database coordinator'
);

select is(
  (
    select source_fingerprint
    from public.booqable_accepted_order_graphs
    where order_external_id = 'ord_sql_quarantine'
  ),
  'fp-sql-baseline',
  'incomparable state does not mutate the accepted graph'
);

select is(
  (
    select count(*)
    from public.booqable_integration_incidents
    where incident_kind = 'incomparable_present_state'
      and root_external_id = 'ord_sql_quarantine'
  ),
  1::bigint,
  'incomparable state records one deduplicated incident'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "root": { "resource_type": "order", "external_id": "ord_sql_quarantine" },
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_sql_quarantine",
          "source_version": "2026-08-18T10:00:00.000Z"
        },
        {
          "resource_type": "product_group",
          "external_id": "pg_unauthoritative",
          "source_version": "2026-08-18T10:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-unauthoritative",
      "graph": {}
    }
  $payload$::jsonb)::text,
  'quarantined',
  'new child without a newer root quarantines in the database coordinator'
);

select is(
  (
    select source_fingerprint
    from public.booqable_accepted_order_graphs
    where order_external_id = 'ord_sql_quarantine'
  ),
  'fp-sql-baseline',
  'unauthoritative addition does not mutate the accepted graph'
);

select is(
  (
    select count(*)
    from public.booqable_integration_incidents
    where incident_kind = 'unauthoritative_addition'
      and root_external_id = 'ord_sql_quarantine'
  ),
  1::bigint,
  'unauthoritative addition records one deduplicated incident'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "root": { "resource_type": "order", "external_id": "ord_initially_identified" },
      "order_status": "reserved",
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_initially_identified",
          "source_version": "2026-08-18T10:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-initially-identified",
      "graph": {},
      "rental_lines": [
        {
          "line_external_id": "line_initially_identified",
          "line_quantity": 1,
          "identified_count": 1,
          "unidentified_count": 0
        }
      ]
    }
  $payload$::jsonb)::text,
  'applied',
  'initially identified bike line applies without opening attention'
);

select is(
  (
    select count(*)
    from public.booqable_rental_line_attention
    where order_external_id = 'ord_initially_identified'
      and line_external_id = 'line_initially_identified'
  ),
  0::bigint,
  'initially identified bike line creates no closed attention record'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "root": { "resource_type": "order", "external_id": "ord_stopped_attention" },
      "order_status": "stopped",
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_stopped_attention",
          "source_version": "2026-08-18T10:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-stopped-attention",
      "graph": {},
      "rental_lines": [
        {
          "line_external_id": "line_stopped_attention",
          "line_quantity": 2,
          "identified_count": 0,
          "unidentified_count": 2
        }
      ]
    }
  $payload$::jsonb)::text,
  'applied',
  'stopped order applies terminal attention closure'
);

select is(
  (
    select close_reason
    from public.booqable_rental_line_attention
    where order_external_id = 'ord_stopped_attention'
      and line_external_id = 'line_stopped_attention'
  ),
  'order_stopped',
  'stopped order retains its terminal attention reason'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "root": { "resource_type": "order", "external_id": "ord_archived_attention" },
      "order_status": "archived",
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_archived_attention",
          "source_version": "2026-08-18T10:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-archived-attention",
      "graph": {},
      "rental_lines": [
        {
          "line_external_id": "line_archived_attention",
          "line_quantity": 2,
          "identified_count": 0,
          "unidentified_count": 2
        }
      ]
    }
  $payload$::jsonb)::text,
  'applied',
  'archived order applies terminal attention closure'
);

select is(
  (
    select close_reason
    from public.booqable_rental_line_attention
    where order_external_id = 'ord_archived_attention'
      and line_external_id = 'line_archived_attention'
  ),
  'order_archived',
  'archived order retains its terminal attention reason'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "producer_version": "canonical-adapter@v1",
      "profile_version": "nested-order@v1",
      "root": { "resource_type": "order", "external_id": "ord_bundle_tags" },
      "order_status": "reserved",
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_bundle_tags",
          "source_version": "2026-08-17T09:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-bundle-tags",
      "graph": {
        "product_groups": [
          {
            "resource_type": "product_group",
            "external_id": "pg_bundle_tags",
            "tag_list": ["workshop-road-bike", "season-2026"],
            "source_lifecycle": "open",
            "source_version": "2026-08-17T09:00:00.000Z",
            "source_updated_at": "2026-08-17T09:00:00.000Z",
            "ingested_at": "2026-08-17T09:05:00.000Z"
          }
        ],
        "products": [
          {
            "resource_type": "product",
            "external_id": "prod_bundle_tags",
            "product_group_external_id": "pg_bundle_tags",
            "tag_list": ["workshop-road-bike", "season-2026"],
            "source_lifecycle": "open",
            "source_version": "2026-08-17T09:00:00.000Z",
            "source_updated_at": "2026-08-17T09:00:00.000Z",
            "ingested_at": "2026-08-17T09:05:00.000Z"
          }
        ],
        "bundles": [
          {
            "resource_type": "bundle",
            "external_id": "bundle_bundle_tags",
            "tag_list": ["workshop-road-bike-bundle"],
            "source_lifecycle": "open",
            "source_version": "2026-08-17T09:00:00.000Z",
            "source_updated_at": "2026-08-17T09:00:00.000Z",
            "ingested_at": "2026-08-17T09:05:00.000Z"
          }
        ],
        "bundle_items": [
          {
            "resource_type": "bundle_item",
            "external_id": "bi_bundle_tags",
            "bundle_external_id": "bundle_bundle_tags",
            "product_external_id": "prod_bundle_tags",
            "product_group_external_id": "pg_bundle_tags",
            "source_lifecycle": "open",
            "source_version": "2026-08-17T09:00:00.000Z",
            "source_updated_at": "2026-08-17T09:00:00.000Z",
            "ingested_at": "2026-08-17T09:05:00.000Z"
          }
        ],
        "stock_items": [],
        "plannings": [],
        "stock_item_plannings": [],
        "memberships": [],
        "predecessors": []
      },
      "resource_fingerprints": [
        {
          "resource_type": "product_group",
          "external_id": "pg_bundle_tags",
          "source_fingerprint": "pg-bundle-fp-1"
        },
        {
          "resource_type": "product",
          "external_id": "prod_bundle_tags",
          "source_fingerprint": "prod-bundle-fp-1"
        },
        {
          "resource_type": "bundle",
          "external_id": "bundle_bundle_tags",
          "source_fingerprint": "bundle-fp-1"
        }
      ],
      "rental_lines": [],
      "omissions": [],
      "incident": null,
      "comparison_result": "applied"
    }
  $payload$::jsonb)::text,
  'applied',
  'accepted graph applies ProductGroup, Product, and Bundle tag lists'
);

select is(
  (
    select tag_list
    from public.booqable_product_groups
    where external_id = 'pg_bundle_tags'
  ),
  array['workshop-road-bike', 'season-2026']::text[],
  'applied graph persists complete ProductGroup tag_list'
);

select is(
  (
    select tag_list
    from public.booqable_products
    where external_id = 'prod_bundle_tags'
  ),
  array['workshop-road-bike', 'season-2026']::text[],
  'applied graph persists complete Product tag_list'
);

select is(
  (
    select tag_list
    from public.booqable_bundles
    where external_id = 'bundle_bundle_tags'
  ),
  array['workshop-road-bike-bundle']::text[],
  'applied graph persists Bundle tag_list as a source fact'
);

select is(
  (
    select source_fingerprint
    from public.booqable_bundles
    where external_id = 'bundle_bundle_tags'
  ),
  'bundle-fp-1',
  'applied graph persists Bundle source_fingerprint'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "producer_version": "canonical-adapter@v1",
      "profile_version": "nested-order@v1",
      "root": { "resource_type": "order", "external_id": "ord_bundle_tags" },
      "order_status": "reserved",
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_bundle_tags",
          "source_version": "2026-08-17T09:00:00.000Z"
        },
        {
          "resource_type": "product_group",
          "external_id": "pg_tag_admission_blocked",
          "source_version": "2026-08-17T09:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-tag-admission",
      "graph": {
        "product_groups": [
          {
            "resource_type": "product_group",
            "external_id": "pg_tag_admission_blocked",
            "tag_list": ["workshop-road-bike", "season-2026"],
            "source_lifecycle": "open",
            "source_version": "2026-08-17T09:00:00.000Z",
            "source_updated_at": "2026-08-17T09:00:00.000Z",
            "ingested_at": "2026-08-17T09:05:00.000Z"
          }
        ],
        "products": [],
        "bundles": [],
        "bundle_items": [],
        "stock_items": [],
        "plannings": [],
        "stock_item_plannings": [],
        "memberships": [],
        "predecessors": []
      },
      "resource_fingerprints": [],
      "rental_lines": [],
      "omissions": [],
      "incident": {
        "kind": "unauthoritative_addition",
        "field_name": "tag_admission",
        "resource_type": "order",
        "resource_external_id": "ord_bundle_tags"
      },
      "comparison_result": "quarantined"
    }
  $payload$::jsonb)::text,
  'quarantined',
  'tag admission quarantines with unauthoritative_addition'
);

select is(
  (
    select count(*)::integer
    from public.booqable_product_groups
    where external_id = 'pg_tag_admission_blocked'
  ),
  0,
  'tag admission quarantine does not write a ProductGroup'
);

select is(
  (
    select count(*)::integer
    from public.booqable_order_bike_memberships
    where order_external_id = 'ord_bundle_tags'
  ),
  0,
  'tag admission quarantine writes no membership'
);

select is(
  (
    select source_fingerprint
    from public.booqable_bundles
    where external_id = 'bundle_bundle_tags'
  ),
  'bundle-fp-1',
  'tag admission quarantine does not mutate previously applied Bundle rows'
);

select is(
  (
    select field_name
    from public.booqable_integration_incidents
    where root_external_id = 'ord_bundle_tags'
      and incident_kind = 'unauthoritative_addition'
  ),
  'tag_admission',
  'tag admission incident records field_name tag_admission'
);

select is(
  public.apply_canonical_order_graph($payload$
    {
      "schema_version": 1,
      "producer_version": "canonical-adapter@v1",
      "profile_version": "nested-order@v1",
      "root": { "resource_type": "order", "external_id": "ord_bundle_tags" },
      "order_status": "reserved",
      "source_vector": [
        {
          "resource_type": "order",
          "external_id": "ord_bundle_tags",
          "source_version": "2026-08-17T09:00:00.000Z"
        },
        {
          "resource_type": "product_group",
          "external_id": "pg_tag_admission_blocked",
          "source_version": "2026-08-17T09:00:00.000Z"
        }
      ],
      "merged_fingerprint": "fp-tag-admission",
      "graph": {
        "product_groups": [
          {
            "resource_type": "product_group",
            "external_id": "pg_tag_admission_blocked",
            "tag_list": ["workshop-road-bike", "season-2026"],
            "source_lifecycle": "open",
            "source_version": "2026-08-17T09:00:00.000Z",
            "source_updated_at": "2026-08-17T09:00:00.000Z",
            "ingested_at": "2026-08-17T09:05:00.000Z"
          }
        ],
        "products": [],
        "bundles": [],
        "bundle_items": [],
        "stock_items": [],
        "plannings": [],
        "stock_item_plannings": [],
        "memberships": [],
        "predecessors": []
      },
      "resource_fingerprints": [],
      "rental_lines": [],
      "omissions": [],
      "incident": {
        "kind": "unauthoritative_addition",
        "field_name": "tag_admission",
        "resource_type": "order",
        "resource_external_id": "ord_bundle_tags"
      },
      "comparison_result": "quarantined"
    }
  $payload$::jsonb)::text,
  'quarantined',
  'repeat tag admission stays quarantined'
);

select is(
  (
    select count(*)::integer
    from public.booqable_integration_incidents
    where root_external_id = 'ord_bundle_tags'
      and incident_kind = 'unauthoritative_addition'
      and field_name = 'tag_admission'
  ),
  1,
  'repeat tag admission does not duplicate the incident'
);

select * from finish();
rollback;
