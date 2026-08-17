-- Commit new enum labels before the coordinator migration uses them.
-- PostgreSQL cannot use ALTER TYPE ... ADD VALUE in the same transaction
-- that inserts those labels.

ALTER TYPE public.projection_field_writer
  ADD VALUE IF NOT EXISTS 'canonical_coordinator';
ALTER TYPE public.projection_entity_origin
  ADD VALUE IF NOT EXISTS 'booqable_accepted_order_graph';
ALTER TYPE public.projection_entity_origin
  ADD VALUE IF NOT EXISTS 'booqable_integration_incident';
ALTER TYPE public.projection_entity_origin
  ADD VALUE IF NOT EXISTS 'booqable_rental_line_attention';
