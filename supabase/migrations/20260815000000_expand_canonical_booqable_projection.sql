-- Additive canonical Booqable projection.
-- Storage only: no writers, fetch, UI, or Workshop derivation.
-- Enum labels and manifest rows are fixture-checked against
-- src/lib/booqable/contracts/canonical-projection.ts.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'projection_row_origin'
  ) THEN
    CREATE TYPE public.projection_row_origin AS ENUM (
      'local',
      'booqable'
    );
  END IF;
END
$$;

ALTER TYPE public.projection_row_origin ADD VALUE IF NOT EXISTS 'local';
ALTER TYPE public.projection_row_origin ADD VALUE IF NOT EXISTS 'booqable';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'projection_source_lifecycle'
  ) THEN
    CREATE TYPE public.projection_source_lifecycle AS ENUM (
      'open',
      'closed'
    );
  END IF;
END
$$;

ALTER TYPE public.projection_source_lifecycle ADD VALUE IF NOT EXISTS 'open';
ALTER TYPE public.projection_source_lifecycle ADD VALUE IF NOT EXISTS 'closed';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'projection_entity_origin'
  ) THEN
    CREATE TYPE public.projection_entity_origin AS ENUM (
      'local_customer',
      'booqable_customer',
      'booqable_order',
      'booqable_order_item',
      'booqable_product_group',
      'booqable_product',
      'booqable_bundle',
      'booqable_bundle_item',
      'booqable_stock_item',
      'booqable_planning',
      'booqable_stock_item_planning',
      'booqable_order_bike_membership',
      'booqable_membership_predecessor'
    );
  END IF;
END
$$;

ALTER TYPE public.projection_entity_origin ADD VALUE IF NOT EXISTS 'local_customer';
ALTER TYPE public.projection_entity_origin ADD VALUE IF NOT EXISTS 'booqable_customer';
ALTER TYPE public.projection_entity_origin ADD VALUE IF NOT EXISTS 'booqable_order';
ALTER TYPE public.projection_entity_origin ADD VALUE IF NOT EXISTS 'booqable_order_item';
ALTER TYPE public.projection_entity_origin ADD VALUE IF NOT EXISTS 'booqable_product_group';
ALTER TYPE public.projection_entity_origin ADD VALUE IF NOT EXISTS 'booqable_product';
ALTER TYPE public.projection_entity_origin ADD VALUE IF NOT EXISTS 'booqable_bundle';
ALTER TYPE public.projection_entity_origin ADD VALUE IF NOT EXISTS 'booqable_bundle_item';
ALTER TYPE public.projection_entity_origin ADD VALUE IF NOT EXISTS 'booqable_stock_item';
ALTER TYPE public.projection_entity_origin ADD VALUE IF NOT EXISTS 'booqable_planning';
ALTER TYPE public.projection_entity_origin ADD VALUE IF NOT EXISTS 'booqable_stock_item_planning';
ALTER TYPE public.projection_entity_origin ADD VALUE IF NOT EXISTS 'booqable_order_bike_membership';
ALTER TYPE public.projection_entity_origin ADD VALUE IF NOT EXISTS 'booqable_membership_predecessor';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'projection_field_authority'
  ) THEN
    CREATE TYPE public.projection_field_authority AS ENUM (
      'booqable_source',
      'app_owned',
      'app_derived',
      'compatibility_alias'
    );
  END IF;
END
$$;

ALTER TYPE public.projection_field_authority ADD VALUE IF NOT EXISTS 'booqable_source';
ALTER TYPE public.projection_field_authority ADD VALUE IF NOT EXISTS 'app_owned';
ALTER TYPE public.projection_field_authority ADD VALUE IF NOT EXISTS 'app_derived';
ALTER TYPE public.projection_field_authority ADD VALUE IF NOT EXISTS 'compatibility_alias';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'projection_field_writer'
  ) THEN
    CREATE TYPE public.projection_field_writer AS ENUM (
      'legacy_sync',
      'local_customer_capability',
      'none_until_coordinator_cutover'
    );
  END IF;
END
$$;

ALTER TYPE public.projection_field_writer ADD VALUE IF NOT EXISTS 'legacy_sync';
ALTER TYPE public.projection_field_writer ADD VALUE IF NOT EXISTS 'local_customer_capability';
ALTER TYPE public.projection_field_writer ADD VALUE IF NOT EXISTS 'none_until_coordinator_cutover';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'projection_backfill_rule'
  ) THEN
    CREATE TYPE public.projection_backfill_rule AS ENUM (
      'nullable_preserve',
      'derive_from_existing_identity',
      'default_open',
      'not_applicable_new_table'
    );
  END IF;
END
$$;

ALTER TYPE public.projection_backfill_rule ADD VALUE IF NOT EXISTS 'nullable_preserve';
ALTER TYPE public.projection_backfill_rule ADD VALUE IF NOT EXISTS 'derive_from_existing_identity';
ALTER TYPE public.projection_backfill_rule ADD VALUE IF NOT EXISTS 'default_open';
ALTER TYPE public.projection_backfill_rule ADD VALUE IF NOT EXISTS 'not_applicable_new_table';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'projection_field_disposition'
  ) THEN
    CREATE TYPE public.projection_field_disposition AS ENUM (
      'retain',
      'project_source',
      'bounded_archived_pii',
      'compatibility_until_contract',
      'never_auto_merge'
    );
  END IF;
END
$$;

ALTER TYPE public.projection_field_disposition ADD VALUE IF NOT EXISTS 'retain';
ALTER TYPE public.projection_field_disposition ADD VALUE IF NOT EXISTS 'project_source';
ALTER TYPE public.projection_field_disposition ADD VALUE IF NOT EXISTS 'bounded_archived_pii';
ALTER TYPE public.projection_field_disposition ADD VALUE IF NOT EXISTS 'compatibility_until_contract';
ALTER TYPE public.projection_field_disposition ADD VALUE IF NOT EXISTS 'never_auto_merge';

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS entity_origin public.projection_row_origin,
  ADD COLUMN IF NOT EXISTS source_lifecycle public.projection_source_lifecycle,
  ADD COLUMN IF NOT EXISTS source_version text,
  ADD COLUMN IF NOT EXISTS source_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS ingested_at timestamptz;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS entity_origin public.projection_row_origin,
  ADD COLUMN IF NOT EXISTS source_lifecycle public.projection_source_lifecycle,
  ADD COLUMN IF NOT EXISTS source_version text,
  ADD COLUMN IF NOT EXISTS source_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS ingested_at timestamptz;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS entity_origin public.projection_row_origin,
  ADD COLUMN IF NOT EXISTS source_lifecycle public.projection_source_lifecycle,
  ADD COLUMN IF NOT EXISTS source_version text,
  ADD COLUMN IF NOT EXISTS source_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS ingested_at timestamptz;

UPDATE public.customers
SET entity_origin = CASE
  WHEN booqable_customer_id IS NOT NULL
    AND btrim(booqable_customer_id) <> ''
    THEN 'booqable'::public.projection_row_origin
  ELSE 'local'::public.projection_row_origin
END
WHERE entity_origin IS NULL;

UPDATE public.customers
SET source_lifecycle = 'open'::public.projection_source_lifecycle
WHERE entity_origin = 'booqable'::public.projection_row_origin
  AND source_lifecycle IS NULL;

UPDATE public.orders
SET
  entity_origin = COALESCE(entity_origin, 'booqable'::public.projection_row_origin),
  source_lifecycle = COALESCE(source_lifecycle, 'open'::public.projection_source_lifecycle)
WHERE entity_origin IS NULL OR source_lifecycle IS NULL;

UPDATE public.order_items
SET
  entity_origin = COALESCE(entity_origin, 'booqable'::public.projection_row_origin),
  source_lifecycle = COALESCE(source_lifecycle, 'open'::public.projection_source_lifecycle)
WHERE entity_origin IS NULL OR source_lifecycle IS NULL;

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_local_origin_not_merged_check;
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_origin_identity_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_origin_identity_check
  CHECK (
    entity_origin IS NULL
    OR (
      entity_origin = 'local'::public.projection_row_origin
      AND booqable_customer_id IS NULL
    )
    OR (
      entity_origin = 'booqable'::public.projection_row_origin
      AND booqable_customer_id IS NOT NULL
      AND btrim(booqable_customer_id) <> ''
    )
  );

CREATE TABLE IF NOT EXISTS public.booqable_product_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  tag_list text[] NOT NULL,
  source_lifecycle public.projection_source_lifecycle NOT NULL DEFAULT 'open',
  source_version text,
  source_updated_at timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booqable_product_groups_external_id_key UNIQUE (external_id)
);

CREATE TABLE IF NOT EXISTS public.booqable_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  product_group_external_id text,
  product_group_id uuid REFERENCES public.booqable_product_groups(id) ON DELETE RESTRICT,
  tag_list text[] NOT NULL,
  source_lifecycle public.projection_source_lifecycle NOT NULL DEFAULT 'open',
  source_version text,
  source_updated_at timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booqable_products_external_id_key UNIQUE (external_id)
);

CREATE TABLE IF NOT EXISTS public.booqable_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  tag_list text[] NOT NULL,
  source_lifecycle public.projection_source_lifecycle NOT NULL DEFAULT 'open',
  source_version text,
  source_updated_at timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booqable_bundles_external_id_key UNIQUE (external_id)
);

CREATE TABLE IF NOT EXISTS public.booqable_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  bundle_external_id text NOT NULL,
  bundle_id uuid NOT NULL REFERENCES public.booqable_bundles(id) ON DELETE RESTRICT,
  product_external_id text,
  product_id uuid REFERENCES public.booqable_products(id) ON DELETE RESTRICT,
  product_group_external_id text,
  product_group_id uuid REFERENCES public.booqable_product_groups(id) ON DELETE RESTRICT,
  source_lifecycle public.projection_source_lifecycle NOT NULL DEFAULT 'open',
  source_version text,
  source_updated_at timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booqable_bundle_items_external_id_key UNIQUE (external_id)
);

CREATE TABLE IF NOT EXISTS public.booqable_stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  product_external_id text,
  product_id uuid REFERENCES public.booqable_products(id) ON DELETE RESTRICT,
  source_lifecycle public.projection_source_lifecycle NOT NULL DEFAULT 'open',
  source_version text,
  source_updated_at timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booqable_stock_items_external_id_key UNIQUE (external_id)
);

CREATE TABLE IF NOT EXISTS public.booqable_plannings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  order_external_id text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  line_external_id text,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE RESTRICT,
  source_lifecycle public.projection_source_lifecycle NOT NULL DEFAULT 'open',
  source_version text,
  source_updated_at timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booqable_plannings_external_id_key UNIQUE (external_id)
);

CREATE TABLE IF NOT EXISTS public.booqable_stock_item_plannings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  planning_external_id text,
  planning_id uuid REFERENCES public.booqable_plannings(id) ON DELETE RESTRICT,
  stock_item_external_id text,
  stock_item_id uuid REFERENCES public.booqable_stock_items(id) ON DELETE RESTRICT,
  source_lifecycle public.projection_source_lifecycle NOT NULL DEFAULT 'open',
  source_version text,
  source_updated_at timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booqable_stock_item_plannings_external_id_key UNIQUE (external_id)
);

CREATE TABLE IF NOT EXISTS public.booqable_order_bike_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_external_id text NOT NULL,
  line_external_id text NOT NULL,
  source_unit_discriminator text NOT NULL,
  replacement_chain_incarnation integer NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE RESTRICT,
  planning_external_id text,
  planning_id uuid REFERENCES public.booqable_plannings(id) ON DELETE RESTRICT,
  stock_item_planning_external_id text,
  stock_item_planning_id uuid REFERENCES public.booqable_stock_item_plannings(id) ON DELETE RESTRICT,
  stock_item_external_id text,
  stock_item_id uuid REFERENCES public.booqable_stock_items(id) ON DELETE RESTRICT,
  source_lifecycle public.projection_source_lifecycle NOT NULL DEFAULT 'open',
  source_version text,
  source_updated_at timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booqable_order_bike_memberships_identity_key UNIQUE (
    order_external_id,
    line_external_id,
    source_unit_discriminator,
    replacement_chain_incarnation
  ),
  CONSTRAINT booqable_order_bike_memberships_incarnation_check
    CHECK (replacement_chain_incarnation >= 1),
  CONSTRAINT booqable_order_bike_memberships_discriminator_check
    CHECK (char_length(source_unit_discriminator) > 0)
);

CREATE TABLE IF NOT EXISTS public.booqable_membership_predecessors (
  successor_id uuid NOT NULL REFERENCES public.booqable_order_bike_memberships(id) ON DELETE RESTRICT,
  predecessor_id uuid NOT NULL REFERENCES public.booqable_order_bike_memberships(id) ON DELETE RESTRICT,
  CONSTRAINT booqable_membership_predecessors_pkey PRIMARY KEY (successor_id),
  CONSTRAINT booqable_membership_predecessors_predecessor_key UNIQUE (predecessor_id),
  CONSTRAINT booqable_membership_predecessors_distinct_check
    CHECK (successor_id <> predecessor_id)
);

CREATE TABLE IF NOT EXISTS public.booqable_field_authority_manifest (
  entity_origin public.projection_entity_origin NOT NULL,
  field_name text NOT NULL,
  authority public.projection_field_authority NOT NULL,
  writer public.projection_field_writer NOT NULL,
  backfill_rule public.projection_backfill_rule NOT NULL,
  disposition public.projection_field_disposition NOT NULL,
  CONSTRAINT booqable_field_authority_manifest_pkey
    PRIMARY KEY (entity_origin, field_name)
);

ALTER TABLE public.booqable_product_groups
  DROP CONSTRAINT IF EXISTS booqable_product_groups_external_id_not_blank_check;
ALTER TABLE public.booqable_product_groups
  ADD CONSTRAINT booqable_product_groups_external_id_not_blank_check
  CHECK (btrim(external_id) <> '');

ALTER TABLE public.booqable_products
  DROP CONSTRAINT IF EXISTS booqable_products_external_id_not_blank_check;
ALTER TABLE public.booqable_products
  ADD CONSTRAINT booqable_products_external_id_not_blank_check
  CHECK (btrim(external_id) <> '');

ALTER TABLE public.booqable_bundles
  DROP CONSTRAINT IF EXISTS booqable_bundles_external_id_not_blank_check;
ALTER TABLE public.booqable_bundles
  ADD CONSTRAINT booqable_bundles_external_id_not_blank_check
  CHECK (btrim(external_id) <> '');

ALTER TABLE public.booqable_bundle_items
  DROP CONSTRAINT IF EXISTS booqable_bundle_items_external_id_not_blank_check;
ALTER TABLE public.booqable_bundle_items
  ADD CONSTRAINT booqable_bundle_items_external_id_not_blank_check
  CHECK (btrim(external_id) <> '');

ALTER TABLE public.booqable_stock_items
  DROP CONSTRAINT IF EXISTS booqable_stock_items_external_id_not_blank_check;
ALTER TABLE public.booqable_stock_items
  ADD CONSTRAINT booqable_stock_items_external_id_not_blank_check
  CHECK (btrim(external_id) <> '');

ALTER TABLE public.booqable_plannings
  DROP CONSTRAINT IF EXISTS booqable_plannings_external_id_not_blank_check;
ALTER TABLE public.booqable_plannings
  ADD CONSTRAINT booqable_plannings_external_id_not_blank_check
  CHECK (btrim(external_id) <> '');

ALTER TABLE public.booqable_plannings
  DROP CONSTRAINT IF EXISTS booqable_plannings_order_external_id_not_blank_check;
ALTER TABLE public.booqable_plannings
  ADD CONSTRAINT booqable_plannings_order_external_id_not_blank_check
  CHECK (btrim(order_external_id) <> '');

ALTER TABLE public.booqable_plannings
  DROP CONSTRAINT IF EXISTS booqable_plannings_line_external_id_not_blank_check;
ALTER TABLE public.booqable_plannings
  ADD CONSTRAINT booqable_plannings_line_external_id_not_blank_check
  CHECK (line_external_id IS NULL OR btrim(line_external_id) <> '');

ALTER TABLE public.booqable_stock_item_plannings
  DROP CONSTRAINT IF EXISTS booqable_stock_item_plannings_external_id_not_blank_check;
ALTER TABLE public.booqable_stock_item_plannings
  ADD CONSTRAINT booqable_stock_item_plannings_external_id_not_blank_check
  CHECK (btrim(external_id) <> '');

ALTER TABLE public.booqable_order_bike_memberships
  DROP CONSTRAINT IF EXISTS booqable_order_bike_memberships_order_external_id_not_blank_check;
ALTER TABLE public.booqable_order_bike_memberships
  ADD CONSTRAINT booqable_order_bike_memberships_order_external_id_not_blank_check
  CHECK (btrim(order_external_id) <> '');

ALTER TABLE public.booqable_order_bike_memberships
  DROP CONSTRAINT IF EXISTS booqable_order_bike_memberships_line_external_id_not_blank_check;
ALTER TABLE public.booqable_order_bike_memberships
  ADD CONSTRAINT booqable_order_bike_memberships_line_external_id_not_blank_check
  CHECK (btrim(line_external_id) <> '');

CREATE INDEX IF NOT EXISTS booqable_products_product_group_id_idx
  ON public.booqable_products (product_group_id);
CREATE INDEX IF NOT EXISTS booqable_bundle_items_bundle_id_idx
  ON public.booqable_bundle_items (bundle_id);
CREATE INDEX IF NOT EXISTS booqable_stock_items_product_id_idx
  ON public.booqable_stock_items (product_id);
CREATE INDEX IF NOT EXISTS booqable_plannings_order_id_idx
  ON public.booqable_plannings (order_id);
CREATE INDEX IF NOT EXISTS booqable_stock_item_plannings_planning_id_idx
  ON public.booqable_stock_item_plannings (planning_id);
CREATE INDEX IF NOT EXISTS booqable_stock_item_plannings_stock_item_id_idx
  ON public.booqable_stock_item_plannings (stock_item_id);
CREATE INDEX IF NOT EXISTS booqable_order_bike_memberships_order_idx
  ON public.booqable_order_bike_memberships (order_external_id, line_external_id);
CREATE INDEX IF NOT EXISTS booqable_membership_predecessors_predecessor_idx
  ON public.booqable_membership_predecessors (predecessor_id);

CREATE OR REPLACE FUNCTION public.reject_booqable_membership_identity_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.order_external_id IS DISTINCT FROM OLD.order_external_id
    OR NEW.line_external_id IS DISTINCT FROM OLD.line_external_id
    OR NEW.source_unit_discriminator IS DISTINCT FROM OLD.source_unit_discriminator
    OR NEW.replacement_chain_incarnation IS DISTINCT FROM OLD.replacement_chain_incarnation
  THEN
    RAISE EXCEPTION 'booqable order-bike membership identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booqable_order_bike_memberships_identity_immutable
  ON public.booqable_order_bike_memberships;
CREATE TRIGGER booqable_order_bike_memberships_identity_immutable
  BEFORE UPDATE ON public.booqable_order_bike_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_booqable_membership_identity_mutation();

CREATE OR REPLACE FUNCTION public.reject_booqable_membership_predecessor_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'booqable membership predecessor links are immutable';
END;
$$;

DROP TRIGGER IF EXISTS booqable_membership_predecessors_immutable
  ON public.booqable_membership_predecessors;
CREATE TRIGGER booqable_membership_predecessors_immutable
  BEFORE UPDATE OR DELETE ON public.booqable_membership_predecessors
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_booqable_membership_predecessor_mutation();

INSERT INTO public.booqable_field_authority_manifest (
  entity_origin,
  field_name,
  authority,
  writer,
  backfill_rule,
  disposition
) VALUES
  ('local_customer', 'id', 'app_owned', 'local_customer_capability', 'nullable_preserve', 'retain'),
  ('local_customer', 'booqable_customer_id', 'app_owned', 'local_customer_capability', 'nullable_preserve', 'never_auto_merge'),
  ('local_customer', 'name', 'app_owned', 'local_customer_capability', 'nullable_preserve', 'retain'),
  ('local_customer', 'email', 'app_owned', 'local_customer_capability', 'nullable_preserve', 'retain'),
  ('local_customer', 'phone', 'app_owned', 'local_customer_capability', 'nullable_preserve', 'retain'),
  ('local_customer', 'birthday', 'app_owned', 'local_customer_capability', 'nullable_preserve', 'retain'),
  ('local_customer', 'sex', 'app_owned', 'local_customer_capability', 'nullable_preserve', 'retain'),
  ('local_customer', 'created_at', 'app_owned', 'local_customer_capability', 'nullable_preserve', 'retain'),
  ('local_customer', 'updated_at', 'app_owned', 'local_customer_capability', 'nullable_preserve', 'retain'),
  ('local_customer', 'entity_origin', 'app_owned', 'none_until_coordinator_cutover', 'derive_from_existing_identity', 'never_auto_merge'),
  ('local_customer', 'source_lifecycle', 'app_owned', 'none_until_coordinator_cutover', 'nullable_preserve', 'retain'),
  ('local_customer', 'source_version', 'app_owned', 'none_until_coordinator_cutover', 'nullable_preserve', 'retain'),
  ('local_customer', 'source_updated_at', 'app_owned', 'none_until_coordinator_cutover', 'nullable_preserve', 'retain'),
  ('local_customer', 'ingested_at', 'app_owned', 'none_until_coordinator_cutover', 'nullable_preserve', 'retain'),
  ('booqable_customer', 'id', 'app_owned', 'legacy_sync', 'nullable_preserve', 'retain'),
  ('booqable_customer', 'booqable_customer_id', 'booqable_source', 'legacy_sync', 'derive_from_existing_identity', 'never_auto_merge'),
  ('booqable_customer', 'name', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'bounded_archived_pii'),
  ('booqable_customer', 'email', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'bounded_archived_pii'),
  ('booqable_customer', 'phone', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'bounded_archived_pii'),
  ('booqable_customer', 'birthday', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'bounded_archived_pii'),
  ('booqable_customer', 'sex', 'app_owned', 'local_customer_capability', 'nullable_preserve', 'bounded_archived_pii'),
  ('booqable_customer', 'created_at', 'compatibility_alias', 'legacy_sync', 'nullable_preserve', 'compatibility_until_contract'),
  ('booqable_customer', 'updated_at', 'compatibility_alias', 'legacy_sync', 'nullable_preserve', 'compatibility_until_contract'),
  ('booqable_customer', 'entity_origin', 'app_derived', 'none_until_coordinator_cutover', 'derive_from_existing_identity', 'never_auto_merge'),
  ('booqable_customer', 'source_lifecycle', 'booqable_source', 'none_until_coordinator_cutover', 'default_open', 'project_source'),
  ('booqable_customer', 'source_version', 'booqable_source', 'none_until_coordinator_cutover', 'nullable_preserve', 'project_source'),
  ('booqable_customer', 'source_updated_at', 'booqable_source', 'none_until_coordinator_cutover', 'nullable_preserve', 'project_source'),
  ('booqable_customer', 'ingested_at', 'app_owned', 'none_until_coordinator_cutover', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'id', 'app_owned', 'legacy_sync', 'nullable_preserve', 'retain'),
  ('booqable_order', 'booqable_order_id', 'booqable_source', 'legacy_sync', 'derive_from_existing_identity', 'project_source'),
  ('booqable_order', 'order_number', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'status', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'fulfillment_type', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'starts_at', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'stops_at', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'created_at', 'compatibility_alias', 'legacy_sync', 'nullable_preserve', 'compatibility_until_contract'),
  ('booqable_order', 'updated_at', 'compatibility_alias', 'legacy_sync', 'nullable_preserve', 'compatibility_until_contract'),
  ('booqable_order', 'delivery_address', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'billing_address', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'amount_in_cents', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'coupon_id', 'app_owned', 'legacy_sync', 'nullable_preserve', 'retain'),
  ('booqable_order', 'coupon_discount_in_cents', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'discount_type', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'discount_percentage', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'partner_id', 'app_derived', 'legacy_sync', 'nullable_preserve', 'compatibility_until_contract'),
  ('booqable_order', 'customer_id', 'app_owned', 'legacy_sync', 'nullable_preserve', 'never_auto_merge'),
  ('booqable_order', 'partner_promo', 'app_derived', 'legacy_sync', 'nullable_preserve', 'compatibility_until_contract'),
  ('booqable_order', 'coupon_code_value', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'payment_status', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'deposit_in_cents', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'tax_in_cents', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'grand_total_with_tax_in_cents', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'to_be_paid_in_cents', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'item_count', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'maps_link_order', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'entity_origin', 'app_derived', 'none_until_coordinator_cutover', 'derive_from_existing_identity', 'never_auto_merge'),
  ('booqable_order', 'source_lifecycle', 'booqable_source', 'none_until_coordinator_cutover', 'default_open', 'project_source'),
  ('booqable_order', 'source_version', 'booqable_source', 'none_until_coordinator_cutover', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'source_updated_at', 'booqable_source', 'none_until_coordinator_cutover', 'nullable_preserve', 'project_source'),
  ('booqable_order', 'ingested_at', 'app_owned', 'none_until_coordinator_cutover', 'nullable_preserve', 'project_source'),
  ('booqable_order_item', 'id', 'app_owned', 'legacy_sync', 'nullable_preserve', 'retain'),
  ('booqable_order_item', 'order_id', 'app_owned', 'legacy_sync', 'nullable_preserve', 'retain'),
  ('booqable_order_item', 'booqable_line_id', 'booqable_source', 'legacy_sync', 'derive_from_existing_identity', 'project_source'),
  ('booqable_order_item', 'booqable_item_id', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order_item', 'parent_booqable_line_id', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order_item', 'title', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order_item', 'quantity', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order_item', 'line_type', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order_item', 'charge_label', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order_item', 'extra_information', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order_item', 'price_each_in_cents', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order_item', 'price_in_cents', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order_item', 'position', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'compatibility_until_contract'),
  ('booqable_order_item', 'relevant', 'booqable_source', 'legacy_sync', 'nullable_preserve', 'project_source'),
  ('booqable_order_item', 'created_at', 'compatibility_alias', 'legacy_sync', 'nullable_preserve', 'compatibility_until_contract'),
  ('booqable_order_item', 'updated_at', 'compatibility_alias', 'legacy_sync', 'nullable_preserve', 'compatibility_until_contract'),
  ('booqable_order_item', 'entity_origin', 'app_derived', 'none_until_coordinator_cutover', 'derive_from_existing_identity', 'never_auto_merge'),
  ('booqable_order_item', 'source_lifecycle', 'booqable_source', 'none_until_coordinator_cutover', 'default_open', 'project_source'),
  ('booqable_order_item', 'source_version', 'booqable_source', 'none_until_coordinator_cutover', 'nullable_preserve', 'project_source'),
  ('booqable_order_item', 'source_updated_at', 'booqable_source', 'none_until_coordinator_cutover', 'nullable_preserve', 'project_source'),
  ('booqable_order_item', 'ingested_at', 'app_owned', 'none_until_coordinator_cutover', 'nullable_preserve', 'project_source'),
  ('booqable_product_group', 'id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_product_group', 'external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_product_group', 'tag_list', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_product_group', 'source_lifecycle', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_product_group', 'source_version', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_product_group', 'source_updated_at', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_product_group', 'ingested_at', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_product', 'id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_product', 'external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_product', 'product_group_external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_product', 'product_group_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_product', 'tag_list', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_product', 'source_lifecycle', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_product', 'source_version', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_product', 'source_updated_at', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_product', 'ingested_at', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle', 'id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_bundle', 'external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle', 'tag_list', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle', 'source_lifecycle', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle', 'source_version', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle', 'source_updated_at', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle', 'ingested_at', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle_item', 'id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_bundle_item', 'external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle_item', 'bundle_external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle_item', 'bundle_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_bundle_item', 'product_external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle_item', 'product_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_bundle_item', 'product_group_external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle_item', 'product_group_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_bundle_item', 'source_lifecycle', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle_item', 'source_version', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle_item', 'source_updated_at', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_bundle_item', 'ingested_at', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_stock_item', 'id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_stock_item', 'external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_stock_item', 'product_external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_stock_item', 'product_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_stock_item', 'source_lifecycle', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_stock_item', 'source_version', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_stock_item', 'source_updated_at', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_stock_item', 'ingested_at', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_planning', 'id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_planning', 'external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_planning', 'order_external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_planning', 'order_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_planning', 'line_external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_planning', 'order_item_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_planning', 'source_lifecycle', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_planning', 'source_version', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_planning', 'source_updated_at', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_planning', 'ingested_at', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_stock_item_planning', 'id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_stock_item_planning', 'external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_stock_item_planning', 'planning_external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_stock_item_planning', 'planning_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_stock_item_planning', 'stock_item_external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_stock_item_planning', 'stock_item_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_stock_item_planning', 'source_lifecycle', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_stock_item_planning', 'source_version', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_stock_item_planning', 'source_updated_at', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_stock_item_planning', 'ingested_at', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_order_bike_membership', 'id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_order_bike_membership', 'order_external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_order_bike_membership', 'line_external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_order_bike_membership', 'source_unit_discriminator', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_order_bike_membership', 'replacement_chain_incarnation', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_order_bike_membership', 'order_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_order_bike_membership', 'order_item_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_order_bike_membership', 'planning_external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_order_bike_membership', 'planning_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_order_bike_membership', 'stock_item_planning_external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_order_bike_membership', 'stock_item_planning_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_order_bike_membership', 'stock_item_external_id', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_order_bike_membership', 'stock_item_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_order_bike_membership', 'source_lifecycle', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_order_bike_membership', 'source_version', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_order_bike_membership', 'source_updated_at', 'booqable_source', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_order_bike_membership', 'ingested_at', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'project_source'),
  ('booqable_membership_predecessor', 'successor_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain'),
  ('booqable_membership_predecessor', 'predecessor_id', 'app_owned', 'none_until_coordinator_cutover', 'not_applicable_new_table', 'retain')

ON CONFLICT (entity_origin, field_name) DO UPDATE SET
  authority = EXCLUDED.authority,
  writer = EXCLUDED.writer,
  backfill_rule = EXCLUDED.backfill_rule,
  disposition = EXCLUDED.disposition;

ALTER TABLE public.booqable_product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_plannings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_stock_item_plannings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_order_bike_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_membership_predecessors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booqable_field_authority_manifest ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.booqable_product_groups FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.booqable_products FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.booqable_bundles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.booqable_bundle_items FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.booqable_stock_items FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.booqable_plannings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.booqable_stock_item_plannings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.booqable_order_bike_memberships FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.booqable_membership_predecessors FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.booqable_field_authority_manifest FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_booqable_membership_identity_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_booqable_membership_predecessor_mutation() FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.booqable_product_groups TO service_role;
GRANT ALL ON TABLE public.booqable_products TO service_role;
GRANT ALL ON TABLE public.booqable_bundles TO service_role;
GRANT ALL ON TABLE public.booqable_bundle_items TO service_role;
GRANT ALL ON TABLE public.booqable_stock_items TO service_role;
GRANT ALL ON TABLE public.booqable_plannings TO service_role;
GRANT ALL ON TABLE public.booqable_stock_item_plannings TO service_role;
GRANT ALL ON TABLE public.booqable_order_bike_memberships TO service_role;
GRANT ALL ON TABLE public.booqable_membership_predecessors TO service_role;
GRANT ALL ON TABLE public.booqable_field_authority_manifest TO service_role;
