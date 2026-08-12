\set ON_ERROR_STOP on

DROP SCHEMA IF EXISTS spike_booqable_warehouse CASCADE;
CREATE SCHEMA spike_booqable_warehouse;

CREATE TABLE spike_booqable_warehouse.source_orders (
  source_id text PRIMARY KEY,
  source_updated_at timestamptz NOT NULL,
  status text NOT NULL,
  fingerprint text NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE spike_booqable_warehouse.source_bikes (
  source_id text PRIMARY KEY,
  identifier text NOT NULL,
  source_updated_at timestamptz NOT NULL,
  source_archived_at timestamptz,
  fingerprint text NOT NULL,
  UNIQUE (identifier)
);

CREATE TABLE spike_booqable_warehouse.order_bike_assignments (
  source_id text PRIMARY KEY,
  order_source_id text NOT NULL
    REFERENCES spike_booqable_warehouse.source_orders(source_id),
  bike_source_id text NOT NULL
    REFERENCES spike_booqable_warehouse.source_bikes(source_id),
  planning_source_id text NOT NULL,
  source_updated_at timestamptz NOT NULL,
  source_archived_at timestamptz,
  fingerprint text NOT NULL
);

CREATE TABLE spike_booqable_warehouse.webhook_events (
  event_id text PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  status text NOT NULL CHECK (
    status = ANY (ARRAY['received', 'processing', 'succeeded', 'failed'])
  ),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  error_context text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE TABLE spike_booqable_warehouse.reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL,
  status text NOT NULL CHECK (
    status = ANY (ARRAY['running', 'succeeded', 'failed'])
  ),
  checkpoint_page integer NOT NULL DEFAULT 0 CHECK (checkpoint_page >= 0),
  processed_count integer NOT NULL DEFAULT 0 CHECK (processed_count >= 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE spike_booqable_warehouse.reconciliation_items (
  run_id uuid NOT NULL
    REFERENCES spike_booqable_warehouse.reconciliation_runs(id) ON DELETE CASCADE,
  source_id text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, source_id)
);

CREATE TABLE spike_booqable_warehouse.proof_results (
  assertion text PRIMARY KEY,
  passed boolean NOT NULL,
  observed jsonb NOT NULL
);

CREATE OR REPLACE FUNCTION spike_booqable_warehouse.apply_snapshot(
  snapshot jsonb
) RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  order_row jsonb := snapshot -> 'order';
  bike_row jsonb;
  assignment_row jsonb;
  incoming_id text;
  incoming_updated_at timestamptz;
  incoming_fingerprint text;
  existing_updated_at timestamptz;
  existing_fingerprint text;
BEGIN
  IF order_row IS NULL OR jsonb_typeof(order_row) <> 'object' THEN
    RAISE EXCEPTION 'snapshot.order is required';
  END IF;

  incoming_id := order_row ->> 'id';
  incoming_updated_at := (order_row ->> 'updated_at')::timestamptz;
  incoming_fingerprint := md5(order_row::text);
  IF incoming_id IS NULL OR incoming_updated_at IS NULL THEN
    RAISE EXCEPTION 'order id and updated_at are required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(incoming_id, 0)
  );

  SELECT source_updated_at, fingerprint
  INTO existing_updated_at, existing_fingerprint
  FROM spike_booqable_warehouse.source_orders
  WHERE source_id = incoming_id
  FOR UPDATE;

  IF existing_updated_at IS NULL THEN
    INSERT INTO spike_booqable_warehouse.source_orders (
      source_id,
      source_updated_at,
      status,
      fingerprint
    ) VALUES (
      incoming_id,
      incoming_updated_at,
      order_row ->> 'status',
      incoming_fingerprint
    );
  ELSIF incoming_updated_at > existing_updated_at THEN
    UPDATE spike_booqable_warehouse.source_orders
    SET source_updated_at = incoming_updated_at,
        status = order_row ->> 'status',
        fingerprint = incoming_fingerprint,
        ingested_at = now()
    WHERE source_id = incoming_id;
  ELSIF incoming_updated_at = existing_updated_at
    AND incoming_fingerprint <> existing_fingerprint THEN
    RAISE EXCEPTION 'conflicting order content at identical source version: %',
      incoming_id;
  END IF;

  FOR bike_row IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(snapshot -> 'bikes', '[]'::jsonb))
  LOOP
    incoming_id := bike_row ->> 'id';
    incoming_updated_at := (bike_row ->> 'updated_at')::timestamptz;
    incoming_fingerprint := md5(bike_row::text);

    SELECT source_updated_at, fingerprint
    INTO existing_updated_at, existing_fingerprint
    FROM spike_booqable_warehouse.source_bikes
    WHERE source_id = incoming_id
    FOR UPDATE;

    IF existing_updated_at IS NULL THEN
      INSERT INTO spike_booqable_warehouse.source_bikes (
        source_id,
        identifier,
        source_updated_at,
        source_archived_at,
        fingerprint
      ) VALUES (
        incoming_id,
        bike_row ->> 'identifier',
        incoming_updated_at,
        (bike_row ->> 'archived_at')::timestamptz,
        incoming_fingerprint
      );
    ELSIF incoming_updated_at > existing_updated_at THEN
      UPDATE spike_booqable_warehouse.source_bikes
      SET identifier = bike_row ->> 'identifier',
          source_updated_at = incoming_updated_at,
          source_archived_at = (bike_row ->> 'archived_at')::timestamptz,
          fingerprint = incoming_fingerprint
      WHERE source_id = incoming_id;
    ELSIF incoming_updated_at = existing_updated_at
      AND incoming_fingerprint <> existing_fingerprint THEN
      RAISE EXCEPTION 'conflicting bike content at identical source version: %',
        incoming_id;
    END IF;
  END LOOP;

  FOR assignment_row IN
    SELECT value
    FROM jsonb_array_elements(
      COALESCE(snapshot -> 'assignments', '[]'::jsonb)
    )
  LOOP
    incoming_id := assignment_row ->> 'id';
    incoming_updated_at := (assignment_row ->> 'updated_at')::timestamptz;
    incoming_fingerprint := md5(assignment_row::text);

    SELECT source_updated_at, fingerprint
    INTO existing_updated_at, existing_fingerprint
    FROM spike_booqable_warehouse.order_bike_assignments
    WHERE source_id = incoming_id
    FOR UPDATE;

    IF existing_updated_at IS NULL THEN
      INSERT INTO spike_booqable_warehouse.order_bike_assignments (
        source_id,
        order_source_id,
        bike_source_id,
        planning_source_id,
        source_updated_at,
        source_archived_at,
        fingerprint
      ) VALUES (
        incoming_id,
        assignment_row ->> 'order_id',
        assignment_row ->> 'bike_id',
        assignment_row ->> 'planning_id',
        incoming_updated_at,
        (assignment_row ->> 'archived_at')::timestamptz,
        incoming_fingerprint
      );
    ELSIF incoming_updated_at > existing_updated_at THEN
      UPDATE spike_booqable_warehouse.order_bike_assignments
      SET order_source_id = assignment_row ->> 'order_id',
          bike_source_id = assignment_row ->> 'bike_id',
          planning_source_id = assignment_row ->> 'planning_id',
          source_updated_at = incoming_updated_at,
          source_archived_at =
            (assignment_row ->> 'archived_at')::timestamptz,
          fingerprint = incoming_fingerprint
      WHERE source_id = incoming_id;
    ELSIF incoming_updated_at = existing_updated_at
      AND incoming_fingerprint <> existing_fingerprint THEN
      RAISE EXCEPTION
        'conflicting assignment content at identical source version: %',
        incoming_id;
    END IF;
  END LOOP;
END;
$$;

-- Initial canonical snapshot.
SELECT spike_booqable_warehouse.apply_snapshot(
  '{
    "order": {
      "id": "order-1",
      "updated_at": "2026-08-10T10:00:00Z",
      "status": "reserved"
    },
    "bikes": [{
      "id": "bike-1",
      "identifier": "BIKE-001",
      "updated_at": "2026-08-10T10:00:00Z",
      "archived_at": null
    }],
    "assignments": [{
      "id": "assignment-1",
      "order_id": "order-1",
      "bike_id": "bike-1",
      "planning_id": "planning-1",
      "updated_at": "2026-08-10T10:00:00Z",
      "archived_at": null
    }]
  }'::jsonb
);

-- Duplicate delivery must be a no-op.
SELECT spike_booqable_warehouse.apply_snapshot(
  '{
    "order": {
      "id": "order-1",
      "updated_at": "2026-08-10T10:00:00Z",
      "status": "reserved"
    },
    "bikes": [{
      "id": "bike-1",
      "identifier": "BIKE-001",
      "updated_at": "2026-08-10T10:00:00Z",
      "archived_at": null
    }],
    "assignments": [{
      "id": "assignment-1",
      "order_id": "order-1",
      "bike_id": "bike-1",
      "planning_id": "planning-1",
      "updated_at": "2026-08-10T10:00:00Z",
      "archived_at": null
    }]
  }'::jsonb
);

INSERT INTO spike_booqable_warehouse.proof_results
SELECT
  'duplicate_snapshot_is_idempotent',
  count(*) = 1,
  jsonb_build_object('assignment_rows', count(*))
FROM spike_booqable_warehouse.order_bike_assignments;

-- Newer source state archives the old assignment and adds the replacement.
SELECT spike_booqable_warehouse.apply_snapshot(
  '{
    "order": {
      "id": "order-1",
      "updated_at": "2026-08-10T10:20:00Z",
      "status": "started"
    },
    "bikes": [{
      "id": "bike-1",
      "identifier": "BIKE-001",
      "updated_at": "2026-08-10T10:20:00Z",
      "archived_at": null
    }, {
      "id": "bike-2",
      "identifier": "BIKE-002",
      "updated_at": "2026-08-10T10:20:00Z",
      "archived_at": null
    }],
    "assignments": [{
      "id": "assignment-1",
      "order_id": "order-1",
      "bike_id": "bike-1",
      "planning_id": "planning-1",
      "updated_at": "2026-08-10T10:20:00Z",
      "archived_at": "2026-08-10T10:20:00Z"
    }, {
      "id": "assignment-2",
      "order_id": "order-1",
      "bike_id": "bike-2",
      "planning_id": "planning-1",
      "updated_at": "2026-08-10T10:20:00Z",
      "archived_at": null
    }]
  }'::jsonb
);

INSERT INTO spike_booqable_warehouse.proof_results
SELECT
  'replacement_preserves_historical_assignment',
  count(*) = 2
    AND count(*) FILTER (WHERE source_archived_at IS NOT NULL) = 1,
  jsonb_build_object(
    'assignment_rows', count(*),
    'archived_rows', count(*) FILTER (WHERE source_archived_at IS NOT NULL)
  )
FROM spike_booqable_warehouse.order_bike_assignments;

-- An older delayed snapshot must not regress newer rows.
SELECT spike_booqable_warehouse.apply_snapshot(
  '{
    "order": {
      "id": "order-1",
      "updated_at": "2026-08-10T10:10:00Z",
      "status": "reserved"
    },
    "bikes": [{
      "id": "bike-1",
      "identifier": "BIKE-001",
      "updated_at": "2026-08-10T10:10:00Z",
      "archived_at": null
    }],
    "assignments": [{
      "id": "assignment-1",
      "order_id": "order-1",
      "bike_id": "bike-1",
      "planning_id": "planning-1",
      "updated_at": "2026-08-10T10:10:00Z",
      "archived_at": null
    }]
  }'::jsonb
);

INSERT INTO spike_booqable_warehouse.proof_results
SELECT
  'out_of_order_snapshot_cannot_regress_state',
  o.status = 'started' AND a.source_archived_at IS NOT NULL,
  jsonb_build_object(
    'order_status', o.status,
    'old_assignment_archived', a.source_archived_at IS NOT NULL
  )
FROM spike_booqable_warehouse.source_orders o
JOIN spike_booqable_warehouse.order_bike_assignments a
  ON a.source_id = 'assignment-1'
WHERE o.source_id = 'order-1';

-- A failed multi-row snapshot must roll back the preceding order update.
DO $$
BEGIN
  BEGIN
    PERFORM spike_booqable_warehouse.apply_snapshot(
      '{
        "order": {
          "id": "order-1",
          "updated_at": "2026-08-10T10:30:00Z",
          "status": "stopped"
        },
        "bikes": [],
        "assignments": [{
          "id": "assignment-invalid",
          "order_id": "order-1",
          "bike_id": "missing-bike",
          "planning_id": "planning-1",
          "updated_at": "2026-08-10T10:30:00Z",
          "archived_at": null
        }]
      }'::jsonb
    );
    RAISE EXCEPTION 'invalid snapshot unexpectedly succeeded';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;
END;
$$;

INSERT INTO spike_booqable_warehouse.proof_results
SELECT
  'failed_snapshot_rolls_back_atomically',
  status = 'started'
    AND source_updated_at = '2026-08-10T10:20:00Z'::timestamptz
    AND NOT EXISTS (
      SELECT 1
      FROM spike_booqable_warehouse.order_bike_assignments
      WHERE source_id = 'assignment-invalid'
    ),
  jsonb_build_object(
    'order_status', status,
    'order_source_updated_at', source_updated_at
  )
FROM spike_booqable_warehouse.source_orders
WHERE source_id = 'order-1';

-- Durable inbox: duplicate receipt is ignored, failure remains visible, retry
-- succeeds without manual source-table repair.
INSERT INTO spike_booqable_warehouse.webhook_events (
  event_id,
  entity_type,
  entity_id,
  status
) VALUES ('event-1', 'orders', 'order-1', 'received');

INSERT INTO spike_booqable_warehouse.webhook_events (
  event_id,
  entity_type,
  entity_id,
  status
) VALUES ('event-1', 'orders', 'order-1', 'received')
ON CONFLICT (event_id) DO NOTHING;

UPDATE spike_booqable_warehouse.webhook_events
SET status = 'failed',
    attempts = attempts + 1,
    error_context = 'synthetic transient upstream failure'
WHERE event_id = 'event-1';

UPDATE spike_booqable_warehouse.webhook_events
SET status = 'succeeded',
    attempts = attempts + 1,
    error_context = NULL,
    processed_at = now()
WHERE event_id = 'event-1';

INSERT INTO spike_booqable_warehouse.proof_results
SELECT
  'durable_event_retry_avoids_manual_row_repair',
  count(*) = 1
    AND max(status) = 'succeeded'
    AND max(attempts) = 2,
  jsonb_build_object(
    'event_rows', count(*),
    'status', max(status),
    'attempts', max(attempts)
  )
FROM spike_booqable_warehouse.webhook_events
WHERE event_id = 'event-1';

-- Checkpointed reconciliation: replaying page one after interruption is safe,
-- and page two advances only after committed unique items.
DO $$
DECLARE
  run_id uuid;
BEGIN
  INSERT INTO spike_booqable_warehouse.reconciliation_runs (
    resource_type,
    status
  ) VALUES ('orders', 'running')
  RETURNING id INTO run_id;

  INSERT INTO spike_booqable_warehouse.reconciliation_items (
    run_id,
    source_id
  ) VALUES (run_id, 'order-a'), (run_id, 'order-b')
  ON CONFLICT DO NOTHING;

  UPDATE spike_booqable_warehouse.reconciliation_runs
  SET checkpoint_page = 1,
      processed_count = (
        SELECT count(*)
        FROM spike_booqable_warehouse.reconciliation_items
        WHERE reconciliation_items.run_id =
          reconciliation_runs.id
      )
  WHERE id = run_id;

  -- Simulated process restart repeats the previous page before continuing.
  INSERT INTO spike_booqable_warehouse.reconciliation_items (
    run_id,
    source_id
  ) VALUES
    (run_id, 'order-a'),
    (run_id, 'order-b'),
    (run_id, 'order-c')
  ON CONFLICT DO NOTHING;

  UPDATE spike_booqable_warehouse.reconciliation_runs
  SET checkpoint_page = 2,
      processed_count = (
        SELECT count(*)
        FROM spike_booqable_warehouse.reconciliation_items
        WHERE reconciliation_items.run_id =
          reconciliation_runs.id
      ),
      status = 'succeeded',
      completed_at = now()
  WHERE id = run_id;
END;
$$;

INSERT INTO spike_booqable_warehouse.proof_results
SELECT
  'checkpointed_reconciliation_resumes_without_replay_damage',
  checkpoint_page = 2
    AND processed_count = 3
    AND status = 'succeeded',
  jsonb_build_object(
    'checkpoint_page', checkpoint_page,
    'processed_count', processed_count,
    'status', status
  )
FROM spike_booqable_warehouse.reconciliation_runs;

-- A source change with no webhook is repaired by the same canonical apply path
-- when reconciliation eventually observes it.
SELECT spike_booqable_warehouse.apply_snapshot(
  '{
    "order": {
      "id": "order-missed",
      "updated_at": "2026-08-10T09:00:00Z",
      "status": "reserved"
    },
    "bikes": [],
    "assignments": []
  }'::jsonb
);

SELECT spike_booqable_warehouse.apply_snapshot(
  '{
    "order": {
      "id": "order-missed",
      "updated_at": "2026-08-10T11:00:00Z",
      "status": "stopped"
    },
    "bikes": [],
    "assignments": []
  }'::jsonb
);

INSERT INTO spike_booqable_warehouse.proof_results
SELECT
  'reconciliation_repairs_a_missed_webhook_change',
  status = 'stopped'
    AND source_updated_at = '2026-08-10T11:00:00Z'::timestamptz,
  jsonb_build_object(
    'order_status', status,
    'order_source_updated_at', source_updated_at
  )
FROM spike_booqable_warehouse.source_orders
WHERE source_id = 'order-missed';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM spike_booqable_warehouse.proof_results
    WHERE NOT passed
  ) THEN
    RAISE EXCEPTION 'one or more local projection proof assertions failed';
  END IF;
END;
$$;

SELECT jsonb_pretty(
  jsonb_build_object(
    'all_passed', bool_and(passed),
    'assertion_count', count(*),
    'assertions', jsonb_object_agg(
      assertion,
      jsonb_build_object('passed', passed, 'observed', observed)
    )
  )
)
FROM spike_booqable_warehouse.proof_results;
