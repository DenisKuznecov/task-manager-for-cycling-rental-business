-- Vocabulary mirror for the repository-owned source envelope contract.
-- Enum labels are fixture-checked against src/lib/booqable/contracts.
-- This migration does not apply source, create writers, or store payloads.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'source_envelope_kind'
  ) THEN
    CREATE TYPE public.source_envelope_kind AS ENUM (
      'order_graph',
      'resource_batch'
    );
  END IF;
END
$$;

ALTER TYPE public.source_envelope_kind ADD VALUE IF NOT EXISTS 'order_graph';
ALTER TYPE public.source_envelope_kind ADD VALUE IF NOT EXISTS 'resource_batch';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'source_relationship_scope'
  ) THEN
    CREATE TYPE public.source_relationship_scope AS ENUM (
      'complete',
      'partial'
    );
  END IF;
END
$$;

ALTER TYPE public.source_relationship_scope ADD VALUE IF NOT EXISTS 'complete';
ALTER TYPE public.source_relationship_scope ADD VALUE IF NOT EXISTS 'partial';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'source_resource_presence'
  ) THEN
    CREATE TYPE public.source_resource_presence AS ENUM (
      'known',
      'unknown',
      'removed'
    );
  END IF;
END
$$;

ALTER TYPE public.source_resource_presence ADD VALUE IF NOT EXISTS 'known';
ALTER TYPE public.source_resource_presence ADD VALUE IF NOT EXISTS 'unknown';
ALTER TYPE public.source_resource_presence ADD VALUE IF NOT EXISTS 'removed';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'source_apply_result'
  ) THEN
    CREATE TYPE public.source_apply_result AS ENUM (
      'applied',
      'no_op',
      'derivation_disabled',
      'quarantined',
      'rejected_retryable',
      'rejected_terminal'
    );
  END IF;
END
$$;

ALTER TYPE public.source_apply_result ADD VALUE IF NOT EXISTS 'applied';
ALTER TYPE public.source_apply_result ADD VALUE IF NOT EXISTS 'no_op';
ALTER TYPE public.source_apply_result ADD VALUE IF NOT EXISTS 'derivation_disabled';
ALTER TYPE public.source_apply_result ADD VALUE IF NOT EXISTS 'quarantined';
ALTER TYPE public.source_apply_result ADD VALUE IF NOT EXISTS 'rejected_retryable';
ALTER TYPE public.source_apply_result ADD VALUE IF NOT EXISTS 'rejected_terminal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'source_canonical_identity'
  ) THEN
    CREATE TYPE public.source_canonical_identity AS (
      resource_type text,
      external_id text
    );
  END IF;
END
$$;
