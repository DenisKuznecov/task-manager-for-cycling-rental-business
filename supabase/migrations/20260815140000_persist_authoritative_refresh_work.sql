-- Durable Booqable refresh inbox: PII-free receipts, coalesced intents,
-- append-only attempts, and a protected transition catalogue.
-- Writes go through service-role-only SECURITY DEFINER RPCs with CAS fencing.
-- Enum labels and catalogue rows are fixture-checked against
-- src/lib/booqable/contracts/refresh-work.ts.
-- This migration does not fetch, mutate canonical source rows, or add a worker.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'refresh_intent_state'
  ) THEN
    CREATE TYPE public.refresh_intent_state AS ENUM (
      'claimable',
      'leased',
      'succeeded',
      'exhausted',
      'quarantined',
      'rejected_terminal'
    );
  END IF;
END
$$;

ALTER TYPE public.refresh_intent_state ADD VALUE IF NOT EXISTS 'claimable';
ALTER TYPE public.refresh_intent_state ADD VALUE IF NOT EXISTS 'leased';
ALTER TYPE public.refresh_intent_state ADD VALUE IF NOT EXISTS 'succeeded';
ALTER TYPE public.refresh_intent_state ADD VALUE IF NOT EXISTS 'exhausted';
ALTER TYPE public.refresh_intent_state ADD VALUE IF NOT EXISTS 'quarantined';
ALTER TYPE public.refresh_intent_state ADD VALUE IF NOT EXISTS 'rejected_terminal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'refresh_delivery_identity_kind'
  ) THEN
    CREATE TYPE public.refresh_delivery_identity_kind AS ENUM (
      'provider_event_id',
      'body_hmac_sha256'
    );
  END IF;
END
$$;

ALTER TYPE public.refresh_delivery_identity_kind ADD VALUE IF NOT EXISTS 'provider_event_id';
ALTER TYPE public.refresh_delivery_identity_kind ADD VALUE IF NOT EXISTS 'body_hmac_sha256';

CREATE TABLE IF NOT EXISTS public.booqable_refresh_transition_catalogue (
  code text PRIMARY KEY,
  contract_version integer NOT NULL,
  producer text NOT NULL,
  severity text NOT NULL,
  dedupe_scope text NOT NULL,
  retryable boolean NOT NULL,
  activation_effect text NOT NULL,
  resolution text NOT NULL,
  acknowledgement text NOT NULL,
  consumes_attempt boolean NOT NULL,
  next_state public.refresh_intent_state,
  uses_retry_backoff boolean NOT NULL,
  records_incident boolean NOT NULL,
  allows_operator_successor boolean NOT NULL,
  fail_closed boolean NOT NULL,
  max_attempts integer NOT NULL,
  retry_backoff_seconds integer[] NOT NULL,
  retry_exhausted_state public.refresh_intent_state,
  successor_state public.refresh_intent_state,
  successor_max_attempts integer,
  CONSTRAINT booqable_refresh_transition_catalogue_max_attempts_check
    CHECK (max_attempts > 0),
  CONSTRAINT booqable_refresh_transition_catalogue_backoff_check
    CHECK (
      NOT uses_retry_backoff
      OR (
        cardinality(retry_backoff_seconds) >= max_attempts - 1
        AND retry_exhausted_state IS NOT NULL
      )
    ),
  CONSTRAINT booqable_refresh_transition_catalogue_successor_check
    CHECK (
      (allows_operator_successor
        AND successor_state IS NOT NULL
        AND successor_max_attempts > 0)
      OR
      (NOT allows_operator_successor
        AND successor_state IS NULL
        AND successor_max_attempts IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS public.booqable_refresh_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  source_kind text NOT NULL,
  source_external_id text NOT NULL,
  delivery_identity text NOT NULL,
  delivery_identity_kind public.refresh_delivery_identity_kind NOT NULL,
  contract_version integer NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booqable_refresh_receipts_provider_check
    CHECK (btrim(provider) <> ''),
  CONSTRAINT booqable_refresh_receipts_source_kind_check
    CHECK (btrim(source_kind) <> ''),
  CONSTRAINT booqable_refresh_receipts_source_external_id_check
    CHECK (btrim(source_external_id) <> ''),
  CONSTRAINT booqable_refresh_receipts_delivery_identity_check
    CHECK (btrim(delivery_identity) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS booqable_refresh_receipts_delivery_identity_key
  ON public.booqable_refresh_receipts (provider, delivery_identity);

CREATE INDEX IF NOT EXISTS booqable_refresh_receipts_source_root_idx
  ON public.booqable_refresh_receipts (provider, source_kind, source_external_id);

CREATE TABLE IF NOT EXISTS public.booqable_refresh_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  source_kind text NOT NULL,
  source_external_id text NOT NULL,
  state public.refresh_intent_state NOT NULL,
  receipt_generation bigint NOT NULL DEFAULT 0,
  lease_generation bigint NOT NULL DEFAULT 0,
  lease_expires_at timestamptz,
  lease_owner text,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL,
  claimable_after timestamptz,
  predecessor_intent_id uuid,
  last_transition_code text,
  last_error_redacted text,
  contract_version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booqable_refresh_intents_provider_check
    CHECK (btrim(provider) <> ''),
  CONSTRAINT booqable_refresh_intents_source_kind_check
    CHECK (btrim(source_kind) <> ''),
  CONSTRAINT booqable_refresh_intents_source_external_id_check
    CHECK (btrim(source_external_id) <> ''),
  CONSTRAINT booqable_refresh_intents_receipt_generation_check
    CHECK (receipt_generation >= 0),
  CONSTRAINT booqable_refresh_intents_lease_generation_check
    CHECK (lease_generation >= 0),
  CONSTRAINT booqable_refresh_intents_attempt_count_check
    CHECK (attempt_count >= 0),
  CONSTRAINT booqable_refresh_intents_max_attempts_check
    CHECK (max_attempts > 0)
);

ALTER TABLE public.booqable_refresh_intents
  DROP CONSTRAINT IF EXISTS booqable_refresh_intents_predecessor_fkey;
ALTER TABLE public.booqable_refresh_intents
  ADD CONSTRAINT booqable_refresh_intents_predecessor_fkey
  FOREIGN KEY (predecessor_intent_id)
  REFERENCES public.booqable_refresh_intents(id)
  ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS booqable_refresh_intents_open_root_key
  ON public.booqable_refresh_intents (provider, source_kind, source_external_id)
  WHERE state IN (
    'claimable'::public.refresh_intent_state,
    'leased'::public.refresh_intent_state
  );

CREATE INDEX IF NOT EXISTS booqable_refresh_intents_claimable_idx
  ON public.booqable_refresh_intents (state, claimable_after)
  WHERE state = 'claimable'::public.refresh_intent_state;

CREATE TABLE IF NOT EXISTS public.booqable_refresh_receipt_intents (
  receipt_id uuid NOT NULL,
  intent_id uuid NOT NULL,
  correlated_generation bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (receipt_id, intent_id),
  CONSTRAINT booqable_refresh_receipt_intents_generation_check
    CHECK (correlated_generation >= 0)
);

ALTER TABLE public.booqable_refresh_receipt_intents
  DROP CONSTRAINT IF EXISTS booqable_refresh_receipt_intents_receipt_fkey;
ALTER TABLE public.booqable_refresh_receipt_intents
  ADD CONSTRAINT booqable_refresh_receipt_intents_receipt_fkey
  FOREIGN KEY (receipt_id)
  REFERENCES public.booqable_refresh_receipts(id)
  ON DELETE RESTRICT;

ALTER TABLE public.booqable_refresh_receipt_intents
  DROP CONSTRAINT IF EXISTS booqable_refresh_receipt_intents_intent_fkey;
ALTER TABLE public.booqable_refresh_receipt_intents
  ADD CONSTRAINT booqable_refresh_receipt_intents_intent_fkey
  FOREIGN KEY (intent_id)
  REFERENCES public.booqable_refresh_intents(id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS booqable_refresh_receipt_intents_intent_idx
  ON public.booqable_refresh_receipt_intents (intent_id);

CREATE TABLE IF NOT EXISTS public.booqable_refresh_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id uuid NOT NULL,
  lease_generation bigint NOT NULL,
  attempt_number integer NOT NULL,
  transition_code text NOT NULL,
  error_redacted text,
  covered_receipt_generation bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booqable_refresh_attempts_number_check
    CHECK (attempt_number > 0)
);

ALTER TABLE public.booqable_refresh_attempts
  DROP CONSTRAINT IF EXISTS booqable_refresh_attempts_intent_fkey;
ALTER TABLE public.booqable_refresh_attempts
  ADD CONSTRAINT booqable_refresh_attempts_intent_fkey
  FOREIGN KEY (intent_id)
  REFERENCES public.booqable_refresh_intents(id)
  ON DELETE RESTRICT;

ALTER TABLE public.booqable_refresh_attempts
  DROP CONSTRAINT IF EXISTS booqable_refresh_attempts_transition_code_fkey;
ALTER TABLE public.booqable_refresh_attempts
  ADD CONSTRAINT booqable_refresh_attempts_transition_code_fkey
  FOREIGN KEY (transition_code)
  REFERENCES public.booqable_refresh_transition_catalogue(code)
  ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS booqable_refresh_attempts_intent_number_key
  ON public.booqable_refresh_attempts (intent_id, attempt_number);

CREATE INDEX IF NOT EXISTS booqable_refresh_attempts_intent_created_idx
  ON public.booqable_refresh_attempts (intent_id, created_at);

CREATE TABLE IF NOT EXISTS public.booqable_refresh_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  dedupe_key text NOT NULL,
  source_kind text,
  source_external_id text,
  intent_id uuid,
  detail_redacted text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booqable_refresh_incidents
  DROP CONSTRAINT IF EXISTS booqable_refresh_incidents_code_fkey;
ALTER TABLE public.booqable_refresh_incidents
  ADD CONSTRAINT booqable_refresh_incidents_code_fkey
  FOREIGN KEY (code)
  REFERENCES public.booqable_refresh_transition_catalogue(code)
  ON DELETE RESTRICT;

ALTER TABLE public.booqable_refresh_incidents
  DROP CONSTRAINT IF EXISTS booqable_refresh_incidents_intent_fkey;
ALTER TABLE public.booqable_refresh_incidents
  ADD CONSTRAINT booqable_refresh_incidents_intent_fkey
  FOREIGN KEY (intent_id)
  REFERENCES public.booqable_refresh_intents(id)
  ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS booqable_refresh_incidents_dedupe_key
  ON public.booqable_refresh_incidents (code, dedupe_key);

INSERT INTO public.booqable_refresh_transition_catalogue (
  code,
  contract_version,
  producer,
  severity,
  dedupe_scope,
  retryable,
  activation_effect,
  resolution,
  acknowledgement,
  consumes_attempt,
  next_state,
  uses_retry_backoff,
  records_incident,
  allows_operator_successor,
  fail_closed,
  max_attempts,
  retry_backoff_seconds,
  retry_exhausted_state,
  successor_state,
  successor_max_attempts
) VALUES
  ('applied', 1, 'coordinator', 'info', 'none', false, 'none', 'none', 'none', false, 'succeeded', false, false, false, false, 3, ARRAY[]::integer[], NULL, NULL, NULL),
  ('no_op', 1, 'coordinator', 'info', 'none', false, 'none', 'none', 'none', false, 'succeeded', false, false, false, false, 3, ARRAY[]::integer[], NULL, NULL, NULL),
  ('derivation_disabled', 1, 'coordinator', 'info', 'none', false, 'none', 'none', 'none', false, 'succeeded', false, false, false, false, 3, ARRAY[]::integer[], NULL, NULL, NULL),
  ('quarantined', 1, 'coordinator', 'error', 'source_root_code', false, 'block_activation', 'operator_successor', 'required', true, 'quarantined', false, true, true, false, 3, ARRAY[]::integer[], NULL, 'claimable', 3),
  ('rejected_retryable', 1, 'coordinator', 'warning', 'none', true, 'none', 'retry', 'none', true, 'claimable', true, false, true, false, 3, ARRAY[30, 120]::integer[], 'exhausted', 'claimable', 3),
  ('rejected_terminal', 1, 'coordinator', 'error', 'source_root_code', false, 'block_activation', 'operator_successor', 'required', true, 'rejected_terminal', false, true, true, false, 3, ARRAY[]::integer[], NULL, 'claimable', 3),
  ('upstream_rate_limited', 1, 'booqable_adapter', 'warning', 'none', true, 'none', 'retry', 'none', true, 'claimable', true, false, true, false, 3, ARRAY[30, 120]::integer[], 'exhausted', 'claimable', 3),
  ('upstream_server_error', 1, 'booqable_adapter', 'warning', 'none', true, 'none', 'retry', 'none', true, 'claimable', true, false, true, false, 3, ARRAY[30, 120]::integer[], 'exhausted', 'claimable', 3),
  ('upstream_timeout', 1, 'booqable_adapter', 'warning', 'none', true, 'none', 'retry', 'none', true, 'claimable', true, false, true, false, 3, ARRAY[30, 120]::integer[], 'exhausted', 'claimable', 3),
  ('terminal_validation_failed', 1, 'booqable_adapter', 'error', 'source_root_code', false, 'block_activation', 'operator_successor', 'required', true, 'rejected_terminal', false, true, true, false, 3, ARRAY[]::integer[], NULL, 'claimable', 3),
  ('source_conflict_quarantined', 1, 'coordinator', 'error', 'source_root_code', false, 'block_activation', 'operator_successor', 'required', true, 'quarantined', false, true, true, false, 3, ARRAY[]::integer[], NULL, 'claimable', 3),
  ('lease_superseded', 1, 'refresh_inbox', 'warning', 'none', true, 'none', 'retry', 'none', false, 'claimable', false, false, false, false, 3, ARRAY[]::integer[], NULL, NULL, NULL),
  ('unknown_transition_code', 1, 'refresh_inbox', 'error', 'source_root_code', false, 'block_activation', 'manual', 'required', false, NULL, false, true, false, true, 3, ARRAY[]::integer[], NULL, NULL, NULL)
ON CONFLICT (code) DO UPDATE SET
  contract_version = EXCLUDED.contract_version,
  producer = EXCLUDED.producer,
  severity = EXCLUDED.severity,
  dedupe_scope = EXCLUDED.dedupe_scope,
  retryable = EXCLUDED.retryable,
  activation_effect = EXCLUDED.activation_effect,
  resolution = EXCLUDED.resolution,
  acknowledgement = EXCLUDED.acknowledgement,
  consumes_attempt = EXCLUDED.consumes_attempt,
  next_state = EXCLUDED.next_state,
  uses_retry_backoff = EXCLUDED.uses_retry_backoff,
  records_incident = EXCLUDED.records_incident,
  allows_operator_successor = EXCLUDED.allows_operator_successor,
  fail_closed = EXCLUDED.fail_closed,
  max_attempts = EXCLUDED.max_attempts,
  retry_backoff_seconds = EXCLUDED.retry_backoff_seconds,
  retry_exhausted_state = EXCLUDED.retry_exhausted_state,
  successor_state = EXCLUDED.successor_state,
  successor_max_attempts = EXCLUDED.successor_max_attempts;

CREATE OR REPLACE FUNCTION public.reject_booqable_refresh_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'booqable refresh % rows are append-only', TG_TABLE_NAME
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS booqable_refresh_receipts_append_only
  ON public.booqable_refresh_receipts;
CREATE TRIGGER booqable_refresh_receipts_append_only
  BEFORE UPDATE OR DELETE ON public.booqable_refresh_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_booqable_refresh_mutation();

DROP TRIGGER IF EXISTS booqable_refresh_receipt_intents_append_only
  ON public.booqable_refresh_receipt_intents;
CREATE TRIGGER booqable_refresh_receipt_intents_append_only
  BEFORE UPDATE OR DELETE ON public.booqable_refresh_receipt_intents
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_booqable_refresh_mutation();

DROP TRIGGER IF EXISTS booqable_refresh_attempts_append_only
  ON public.booqable_refresh_attempts;
CREATE TRIGGER booqable_refresh_attempts_append_only
  BEFORE UPDATE OR DELETE ON public.booqable_refresh_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_booqable_refresh_mutation();

DROP TRIGGER IF EXISTS booqable_refresh_incidents_append_only
  ON public.booqable_refresh_incidents;
CREATE TRIGGER booqable_refresh_incidents_append_only
  BEFORE UPDATE OR DELETE ON public.booqable_refresh_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_booqable_refresh_mutation();

CREATE OR REPLACE FUNCTION public.redact_booqable_refresh_error(p_error text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN btrim(COALESCE(p_error, '')) = '' THEN NULL
    ELSE '[redacted]'
  END;
$$;

CREATE OR REPLACE FUNCTION public.record_booqable_refresh_incident(
  p_code text,
  p_dedupe_key text,
  p_source_kind text,
  p_source_external_id text,
  p_intent_id uuid,
  p_detail_redacted text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.booqable_refresh_incidents (
    code,
    dedupe_key,
    source_kind,
    source_external_id,
    intent_id,
    detail_redacted
  ) VALUES (
    p_code,
    p_dedupe_key,
    p_source_kind,
    p_source_external_id,
    p_intent_id,
    public.redact_booqable_refresh_error(p_detail_redacted)
  )
  ON CONFLICT (code, dedupe_key) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM public.booqable_refresh_incidents
    WHERE code = p_code
      AND dedupe_key = p_dedupe_key;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_booqable_refresh_work(
  p_provider text,
  p_source_kind text,
  p_source_external_id text,
  p_delivery_identity text,
  p_delivery_identity_kind text,
  p_contract_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_receipt_id uuid;
  v_intent_id uuid;
  v_receipt_generation bigint;
  v_deduplicated boolean := false;
  v_kind public.refresh_delivery_identity_kind;
  v_existing_source_kind text;
  v_existing_source_external_id text;
  v_max_attempts integer;
BEGIN
  IF btrim(COALESCE(p_provider, '')) = ''
     OR btrim(COALESCE(p_source_kind, '')) = ''
     OR btrim(COALESCE(p_source_external_id, '')) = ''
     OR btrim(COALESCE(p_delivery_identity, '')) = ''
  THEN
    RAISE EXCEPTION 'refresh work requires provider, source, and delivery identity'
      USING ERRCODE = '22023';
  END IF;

  IF p_contract_version IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'unsupported refresh-work contract version'
      USING ERRCODE = '22023';
  END IF;

  SELECT MIN(max_attempts) INTO v_max_attempts
  FROM public.booqable_refresh_transition_catalogue
  WHERE contract_version = p_contract_version
  HAVING MIN(max_attempts) = MAX(max_attempts);

  IF v_max_attempts IS NULL THEN
    RAISE EXCEPTION 'refresh-work catalogue has no single attempt budget'
      USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_kind := p_delivery_identity_kind::public.refresh_delivery_identity_kind;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'unsupported refresh delivery identity kind'
        USING ERRCODE = '22023';
  END;

  INSERT INTO public.booqable_refresh_receipts (
    provider,
    source_kind,
    source_external_id,
    delivery_identity,
    delivery_identity_kind,
    contract_version
  ) VALUES (
    btrim(p_provider),
    btrim(p_source_kind),
    btrim(p_source_external_id),
    btrim(p_delivery_identity),
    v_kind,
    p_contract_version
  )
  ON CONFLICT (provider, delivery_identity) DO NOTHING
  RETURNING id INTO v_receipt_id;

  IF v_receipt_id IS NULL THEN
    v_deduplicated := true;
    SELECT id, source_kind, source_external_id
    INTO v_receipt_id, v_existing_source_kind, v_existing_source_external_id
    FROM public.booqable_refresh_receipts
    WHERE provider = btrim(p_provider)
      AND delivery_identity = btrim(p_delivery_identity);

    IF v_existing_source_kind IS DISTINCT FROM btrim(p_source_kind)
       OR v_existing_source_external_id IS DISTINCT FROM btrim(p_source_external_id)
    THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'delivery identity belongs to a different source root',
        'code', 'rejected_retryable'
      );
    END IF;
  END IF;

  IF v_deduplicated THEN
    SELECT id INTO v_intent_id
    FROM public.booqable_refresh_intents
    WHERE provider = btrim(p_provider)
      AND source_kind = btrim(p_source_kind)
      AND source_external_id = btrim(p_source_external_id)
      AND state IN (
        'claimable'::public.refresh_intent_state,
        'leased'::public.refresh_intent_state
      )
    FOR UPDATE;

    IF v_intent_id IS NULL THEN
      SELECT ri.intent_id INTO v_intent_id
      FROM public.booqable_refresh_receipt_intents ri
      WHERE ri.receipt_id = v_receipt_id
      ORDER BY ri.created_at DESC
      LIMIT 1;
    ELSE
      INSERT INTO public.booqable_refresh_receipt_intents (
        receipt_id,
        intent_id,
        correlated_generation
      )
      SELECT v_receipt_id, v_intent_id, i.receipt_generation
      FROM public.booqable_refresh_intents i
      WHERE i.id = v_intent_id
      ON CONFLICT (receipt_id, intent_id) DO NOTHING;
    END IF;

    SELECT receipt_generation INTO v_receipt_generation
    FROM public.booqable_refresh_intents
    WHERE id = v_intent_id;
  ELSE
    LOOP
      SELECT id INTO v_intent_id
      FROM public.booqable_refresh_intents
      WHERE provider = btrim(p_provider)
        AND source_kind = btrim(p_source_kind)
        AND source_external_id = btrim(p_source_external_id)
        AND state IN (
          'claimable'::public.refresh_intent_state,
          'leased'::public.refresh_intent_state
        )
      FOR UPDATE;

      IF v_intent_id IS NOT NULL THEN
        EXIT;
      END IF;

      BEGIN
        INSERT INTO public.booqable_refresh_intents (
          provider,
          source_kind,
          source_external_id,
          state,
          receipt_generation,
          max_attempts,
          contract_version
        ) VALUES (
          btrim(p_provider),
          btrim(p_source_kind),
          btrim(p_source_external_id),
          'claimable'::public.refresh_intent_state,
          0,
          v_max_attempts,
          p_contract_version
        )
        RETURNING id INTO v_intent_id;
        EXIT;
      EXCEPTION
        WHEN unique_violation THEN
          NULL;
      END;
    END LOOP;

    UPDATE public.booqable_refresh_intents
    SET
      receipt_generation = receipt_generation + 1,
      updated_at = now()
    WHERE id = v_intent_id
    RETURNING receipt_generation INTO v_receipt_generation;

    INSERT INTO public.booqable_refresh_receipt_intents (
      receipt_id,
      intent_id,
      correlated_generation
    ) VALUES (
      v_receipt_id,
      v_intent_id,
      v_receipt_generation
    )
    ON CONFLICT (receipt_id, intent_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'receipt_id', v_receipt_id,
    'intent_id', v_intent_id,
    'receipt_generation', v_receipt_generation,
    'deduplicated', v_deduplicated
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_booqable_refresh_intent(
  p_intent_id uuid,
  p_lease_seconds integer,
  p_lease_owner text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lease_seconds integer := COALESCE(p_lease_seconds, 60);
  v_intent public.booqable_refresh_intents%ROWTYPE;
BEGIN
  IF p_intent_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'intent is required',
      'code', 'rejected_retryable'
    );
  END IF;

  IF v_lease_seconds <= 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'lease seconds must be positive',
      'code', 'rejected_retryable'
    );
  END IF;

  UPDATE public.booqable_refresh_intents
  SET
    state = 'leased'::public.refresh_intent_state,
    lease_generation = lease_generation + 1,
    lease_expires_at = now() + make_interval(secs => v_lease_seconds),
    lease_owner = NULLIF(btrim(COALESCE(p_lease_owner, '')), ''),
    updated_at = now()
  WHERE id = p_intent_id
    AND state = 'claimable'::public.refresh_intent_state
    AND (claimable_after IS NULL OR claimable_after <= now())
    AND attempt_count < max_attempts
  RETURNING * INTO v_intent;

  IF v_intent.id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'intent is not claimable',
      'code', 'rejected_retryable'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'intent_id', v_intent.id,
    'lease_generation', v_intent.lease_generation,
    'receipt_generation', v_intent.receipt_generation,
    'lease_expires_at', v_intent.lease_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_booqable_refresh_intent(
  p_intent_id uuid,
  p_lease_generation bigint,
  p_lease_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lease_seconds integer := COALESCE(p_lease_seconds, 60);
  v_intent public.booqable_refresh_intents%ROWTYPE;
BEGIN
  IF v_lease_seconds <= 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'lease seconds must be positive',
      'code', 'rejected_retryable'
    );
  END IF;

  UPDATE public.booqable_refresh_intents
  SET
    lease_expires_at = now() + make_interval(secs => v_lease_seconds),
    updated_at = now()
  WHERE id = p_intent_id
    AND state = 'leased'::public.refresh_intent_state
    AND lease_generation = p_lease_generation
    AND lease_expires_at IS NOT NULL
    AND lease_expires_at > now()
  RETURNING * INTO v_intent;

  IF v_intent.id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'lease expired or superseded',
      'code', 'lease_superseded'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'intent_id', v_intent.id,
    'lease_generation', v_intent.lease_generation,
    'lease_expires_at', v_intent.lease_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_booqable_refresh_intent(
  p_intent_id uuid,
  p_lease_generation bigint,
  p_covered_receipt_generation bigint,
  p_transition_code text,
  p_error_redacted text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rule public.booqable_refresh_transition_catalogue%ROWTYPE;
  v_intent public.booqable_refresh_intents%ROWTYPE;
  v_error text := public.redact_booqable_refresh_error(p_error_redacted);
  v_attempt_count integer;
  v_next_state public.refresh_intent_state;
  v_claimable_after timestamptz;
  v_attempt_number integer;
  v_incident_code text;
  v_dedupe_key text;
  v_lease_valid boolean;
BEGIN
  SELECT * INTO v_rule
  FROM public.booqable_refresh_transition_catalogue
  WHERE code = p_transition_code;

  SELECT * INTO v_intent
  FROM public.booqable_refresh_intents
  WHERE id = p_intent_id
  FOR UPDATE;

  IF v_intent.id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'intent not found',
      'code', 'rejected_retryable'
    );
  END IF;

  IF v_rule.code IS NULL OR v_rule.fail_closed THEN
    SELECT * INTO v_rule
    FROM public.booqable_refresh_transition_catalogue
    WHERE code = 'unknown_transition_code'
      AND contract_version = v_intent.contract_version;

    v_dedupe_key := CASE v_rule.dedupe_scope
      WHEN 'source_root' THEN concat_ws(
        '|',
        v_intent.source_kind,
        v_intent.source_external_id
      )
      WHEN 'source_root_code' THEN concat_ws(
        '|',
        v_rule.code,
        v_intent.source_kind,
        v_intent.source_external_id
      )
      ELSE gen_random_uuid()::text
    END;
    PERFORM public.record_booqable_refresh_incident(
      v_rule.code,
      v_dedupe_key,
      v_intent.source_kind,
      v_intent.source_external_id,
      v_intent.id,
      'unregistered transition code'
    );
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'unknown transition code',
      'code', 'unknown_transition_code'
    );
  END IF;

  v_lease_valid :=
    v_intent.state = 'leased'::public.refresh_intent_state
    AND v_intent.lease_generation = p_lease_generation
    AND v_intent.lease_expires_at IS NOT NULL
    AND v_intent.lease_expires_at > now();

  IF NOT v_lease_valid THEN
    SELECT COALESCE(MAX(attempt_number), 0) + 1
    INTO v_attempt_number
    FROM public.booqable_refresh_attempts
    WHERE intent_id = v_intent.id;

    INSERT INTO public.booqable_refresh_attempts (
      intent_id,
      lease_generation,
      attempt_number,
      transition_code,
      error_redacted,
      covered_receipt_generation
    ) VALUES (
      v_intent.id,
      COALESCE(p_lease_generation, v_intent.lease_generation),
      v_attempt_number,
      'rejected_retryable',
      COALESCE(v_error, 'lease expired or superseded'),
      p_covered_receipt_generation
    );

    RETURN jsonb_build_object(
      'ok', false,
      'error', 'lease expired or superseded',
      'code', 'lease_superseded'
    );
  END IF;

  IF p_covered_receipt_generation IS NULL
     OR p_covered_receipt_generation < 0
     OR p_covered_receipt_generation > v_intent.receipt_generation
  THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'covered receipt generation is invalid',
      'code', 'rejected_retryable'
    );
  END IF;

  IF p_covered_receipt_generation < v_intent.receipt_generation THEN
    SELECT * INTO v_rule
    FROM public.booqable_refresh_transition_catalogue
    WHERE code = 'lease_superseded'
      AND contract_version = v_intent.contract_version;
    v_error := NULL;
  END IF;

  v_attempt_count := v_intent.attempt_count;
  IF v_rule.consumes_attempt THEN
    v_attempt_count := v_attempt_count + 1;
  END IF;

  v_next_state := v_rule.next_state;
  v_claimable_after := NULL;

  IF v_rule.uses_retry_backoff THEN
    IF v_attempt_count >= v_rule.max_attempts THEN
      v_next_state := v_rule.retry_exhausted_state;
    ELSE
      v_next_state := v_rule.next_state;
      v_claimable_after := now() + make_interval(
        secs => v_rule.retry_backoff_seconds[v_attempt_count]
      );
    END IF;
  END IF;

  IF v_next_state IS NOT NULL THEN
    UPDATE public.booqable_refresh_intents
    SET
      state = v_next_state,
      attempt_count = v_attempt_count,
      claimable_after = CASE
        WHEN v_next_state = 'claimable'::public.refresh_intent_state
          THEN v_claimable_after
        ELSE NULL
      END,
      lease_expires_at = NULL,
      lease_owner = NULL,
      last_transition_code = v_rule.code,
      last_error_redacted = v_error,
      updated_at = now()
    WHERE id = v_intent.id
      AND state = 'leased'::public.refresh_intent_state
      AND lease_generation = p_lease_generation
      AND lease_expires_at IS NOT NULL
      AND lease_expires_at > now();

    IF NOT FOUND THEN
      SELECT COALESCE(MAX(attempt_number), 0) + 1
      INTO v_attempt_number
      FROM public.booqable_refresh_attempts
      WHERE intent_id = v_intent.id;

      INSERT INTO public.booqable_refresh_attempts (
        intent_id,
        lease_generation,
        attempt_number,
        transition_code,
        error_redacted,
        covered_receipt_generation
      ) VALUES (
        v_intent.id,
        COALESCE(p_lease_generation, v_intent.lease_generation),
        v_attempt_number,
        'rejected_retryable',
        COALESCE(v_error, 'lease expired or superseded'),
        p_covered_receipt_generation
      );

      RETURN jsonb_build_object(
        'ok', false,
        'error', 'lease expired or superseded',
        'code', 'lease_superseded'
      );
    END IF;
  END IF;

  SELECT COALESCE(MAX(attempt_number), 0) + 1
  INTO v_attempt_number
  FROM public.booqable_refresh_attempts
  WHERE intent_id = v_intent.id;

  INSERT INTO public.booqable_refresh_attempts (
    intent_id,
    lease_generation,
    attempt_number,
    transition_code,
    error_redacted,
    covered_receipt_generation
  ) VALUES (
    v_intent.id,
    v_intent.lease_generation,
    v_attempt_number,
    v_rule.code,
    v_error,
    p_covered_receipt_generation
  );

  IF v_rule.records_incident THEN
    v_incident_code := v_rule.code;
    v_dedupe_key := CASE v_rule.dedupe_scope
      WHEN 'source_root' THEN concat_ws(
        '|',
        v_intent.source_kind,
        v_intent.source_external_id
      )
      WHEN 'source_root_code' THEN concat_ws(
        '|',
        v_incident_code,
        v_intent.source_kind,
        v_intent.source_external_id
      )
      ELSE gen_random_uuid()::text
    END;
    PERFORM public.record_booqable_refresh_incident(
      v_incident_code,
      v_dedupe_key,
      v_intent.source_kind,
      v_intent.source_external_id,
      v_intent.id,
      v_error
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'intent_id', v_intent.id,
    'state', COALESCE(v_next_state, v_intent.state),
    'attempt_count', CASE
      WHEN v_next_state IS NULL THEN v_intent.attempt_count
      ELSE v_attempt_count
    END,
    'code', v_rule.code,
    'claimable_after', v_claimable_after
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reclaim_booqable_refresh_intent(
  p_intent_id uuid,
  p_expected_lease_generation bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_intent public.booqable_refresh_intents%ROWTYPE;
  v_rule public.booqable_refresh_transition_catalogue%ROWTYPE;
  v_attempt_count integer;
  v_attempt_number integer;
  v_next_state public.refresh_intent_state;
  v_claimable_after timestamptz;
BEGIN
  SELECT * INTO v_intent
  FROM public.booqable_refresh_intents
  WHERE id = p_intent_id
    AND state = 'leased'::public.refresh_intent_state
    AND lease_generation = p_expected_lease_generation
    AND lease_expires_at IS NOT NULL
    AND lease_expires_at <= now()
  FOR UPDATE;

  IF v_intent.id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'lease is not reclaimable',
      'code', 'rejected_retryable'
    );
  END IF;

  SELECT * INTO v_rule
  FROM public.booqable_refresh_transition_catalogue
  WHERE code = 'upstream_timeout'
    AND contract_version = v_intent.contract_version;

  IF v_rule.code IS NULL
     OR NOT v_rule.consumes_attempt
     OR NOT v_rule.uses_retry_backoff
     OR v_rule.retry_exhausted_state IS NULL
  THEN
    RAISE EXCEPTION 'catalogue does not define lease-expiry retry behavior'
      USING ERRCODE = 'P0001';
  END IF;

  v_attempt_count := v_intent.attempt_count + 1;
  IF v_attempt_count >= v_rule.max_attempts THEN
    v_next_state := v_rule.retry_exhausted_state;
    v_claimable_after := NULL;
  ELSE
    v_next_state := v_rule.next_state;
    v_claimable_after := now() + make_interval(
      secs => v_rule.retry_backoff_seconds[v_attempt_count]
    );
  END IF;

  UPDATE public.booqable_refresh_intents
  SET
    state = v_next_state,
    lease_generation = lease_generation + 1,
    lease_expires_at = NULL,
    lease_owner = NULL,
    attempt_count = v_attempt_count,
    claimable_after = v_claimable_after,
    last_transition_code = v_rule.code,
    last_error_redacted = NULL,
    updated_at = now()
  WHERE id = v_intent.id
  RETURNING * INTO v_intent;

  SELECT COALESCE(MAX(attempt_number), 0) + 1
  INTO v_attempt_number
  FROM public.booqable_refresh_attempts
  WHERE intent_id = v_intent.id;

  INSERT INTO public.booqable_refresh_attempts (
    intent_id,
    lease_generation,
    attempt_number,
    transition_code,
    error_redacted,
    covered_receipt_generation
  ) VALUES (
    v_intent.id,
    p_expected_lease_generation,
    v_attempt_number,
    v_rule.code,
    NULL,
    NULL
  );

  RETURN jsonb_build_object(
    'ok', true,
    'intent_id', v_intent.id,
    'lease_generation', v_intent.lease_generation,
    'state', v_intent.state,
    'attempt_count', v_intent.attempt_count,
    'claimable_after', v_intent.claimable_after,
    'code', v_rule.code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booqable_refresh_operator_successor(
  p_predecessor_intent_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_predecessor public.booqable_refresh_intents%ROWTYPE;
  v_rule public.booqable_refresh_transition_catalogue%ROWTYPE;
  v_successor public.booqable_refresh_intents%ROWTYPE;
BEGIN
  SELECT * INTO v_predecessor
  FROM public.booqable_refresh_intents
  WHERE id = p_predecessor_intent_id
  FOR UPDATE;

  IF v_predecessor.id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'predecessor intent not found',
      'code', 'rejected_retryable'
    );
  END IF;

  IF v_predecessor.state NOT IN (
    'exhausted'::public.refresh_intent_state,
    'quarantined'::public.refresh_intent_state,
    'rejected_terminal'::public.refresh_intent_state
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'predecessor is not eligible for operator successor',
      'code', 'rejected_retryable'
    );
  END IF;

  SELECT * INTO v_rule
  FROM public.booqable_refresh_transition_catalogue
  WHERE code = v_predecessor.last_transition_code
    AND contract_version = v_predecessor.contract_version;

  IF v_rule.code IS NULL
     OR NOT v_rule.allows_operator_successor
     OR v_rule.successor_state IS NULL
     OR v_rule.successor_max_attempts IS NULL
  THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'catalogue does not authorize an operator successor',
      'code', 'rejected_retryable'
    );
  END IF;

  BEGIN
    INSERT INTO public.booqable_refresh_intents (
      provider,
      source_kind,
      source_external_id,
      state,
      receipt_generation,
      attempt_count,
      max_attempts,
      predecessor_intent_id,
      contract_version
    ) VALUES (
      v_predecessor.provider,
      v_predecessor.source_kind,
      v_predecessor.source_external_id,
      v_rule.successor_state,
      0,
      0,
      v_rule.successor_max_attempts,
      v_predecessor.id,
      v_predecessor.contract_version
    )
    RETURNING * INTO v_successor;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'an open intent already exists for this source root',
        'code', 'rejected_retryable'
      );
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'intent_id', v_successor.id,
    'predecessor_intent_id', v_predecessor.id,
    'attempt_count', v_successor.attempt_count,
    'state', v_successor.state
  );
END;
$$;

COMMENT ON FUNCTION public.record_booqable_refresh_work(text, text, text, text, text, integer) IS
  'Persist a PII-free receipt and coalesce it onto one claimable/leased intent. Advances receipt_generation only for a new delivery identity.';

COMMENT ON FUNCTION public.claim_booqable_refresh_intent(uuid, integer, text) IS
  'Compare-and-set claim of a due claimable intent. Concurrent losers receive a typed retryable rejection.';

COMMENT ON FUNCTION public.heartbeat_booqable_refresh_intent(uuid, bigint, integer) IS
  'Extend a live lease only when generation and expiry still match.';

COMMENT ON FUNCTION public.complete_booqable_refresh_intent(uuid, bigint, bigint, text, text) IS
  'Apply a catalogue-owned completion for exactly the receipt generation covered by the worker. Newer receipts return the intent to claimable without consuming budget.';

COMMENT ON FUNCTION public.reclaim_booqable_refresh_intent(uuid, bigint) IS
  'Apply the catalogue-owned timeout transition to an expired lease, consuming budget/backoff and advancing lease_generation so the old worker cannot complete.';

COMMENT ON FUNCTION public.create_booqable_refresh_operator_successor(uuid) IS
  'Create a fresh-budget claimable successor linked to an exhausted, quarantined, or rejected-terminal predecessor without mutating that lineage.';

ALTER TABLE public.booqable_refresh_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_refresh_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_refresh_receipt_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_refresh_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_refresh_transition_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_refresh_incidents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.booqable_refresh_receipts FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.booqable_refresh_intents FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.booqable_refresh_receipt_intents FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.booqable_refresh_attempts FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.booqable_refresh_transition_catalogue FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.booqable_refresh_incidents FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.reject_booqable_refresh_mutation() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.redact_booqable_refresh_error(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_booqable_refresh_incident(text, text, text, text, uuid, text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_booqable_refresh_work(text, text, text, text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_booqable_refresh_work(text, text, text, text, text, integer)
  TO service_role;

REVOKE ALL ON FUNCTION public.claim_booqable_refresh_intent(uuid, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booqable_refresh_intent(uuid, integer, text)
  TO service_role;

REVOKE ALL ON FUNCTION public.heartbeat_booqable_refresh_intent(uuid, bigint, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_booqable_refresh_intent(uuid, bigint, integer)
  TO service_role;

REVOKE ALL ON FUNCTION public.complete_booqable_refresh_intent(uuid, bigint, bigint, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_booqable_refresh_intent(uuid, bigint, bigint, text, text)
  TO service_role;

REVOKE ALL ON FUNCTION public.reclaim_booqable_refresh_intent(uuid, bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reclaim_booqable_refresh_intent(uuid, bigint)
  TO service_role;

REVOKE ALL ON FUNCTION public.create_booqable_refresh_operator_successor(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booqable_refresh_operator_successor(uuid)
  TO service_role;
