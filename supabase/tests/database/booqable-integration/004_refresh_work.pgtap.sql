begin;

select plan(52);

select has_table('public', 'booqable_refresh_receipts', 'receipts are persisted');
select has_table('public', 'booqable_refresh_intents', 'intents are persisted');
select has_table('public', 'booqable_refresh_receipt_intents', 'receipt-intent correlations are persisted');
select has_table('public', 'booqable_refresh_attempts', 'attempts are persisted');
select has_table('public', 'booqable_refresh_transition_catalogue', 'transition catalogue is persisted');
select has_table('public', 'booqable_refresh_incidents', 'incidents are persisted');

select is(
  (select count(*)::integer from public.booqable_refresh_transition_catalogue),
  13,
  'v1 catalogue contains every registered transition code'
);

create temp table refresh_case_a as
select
  (r->>'receipt_id')::uuid as receipt_id,
  (r->>'intent_id')::uuid as intent_id,
  (r->>'receipt_generation')::bigint as receipt_generation,
  (r->>'deduplicated')::boolean as deduplicated
from (
  select public.record_booqable_refresh_work(
    'booqable',
    'order',
    'ord_a',
    'evt-a1',
    'provider_event_id',
    1
  ) as r
) s;

select is(
  (select receipt_generation from refresh_case_a),
  1::bigint,
  'first receipt advances generation to 1'
);

select is(
  (
    public.record_booqable_refresh_work(
      'booqable',
      'order',
      'ord_a',
      'evt-a1',
      'provider_event_id',
      1
    )->>'receipt_generation'
  )::bigint,
  1::bigint,
  'duplicate delivery does not advance receipt_generation'
);

select is(
  (
    public.record_booqable_refresh_work(
      'booqable',
      'order',
      'ord_a',
      'evt-a2',
      'provider_event_id',
      1
    )->>'intent_id'
  )::uuid,
  (select intent_id from refresh_case_a),
  'a new receipt coalesces onto the open intent'
);

select is(
  (
    select receipt_generation
    from public.booqable_refresh_intents
    where id = (select intent_id from refresh_case_a)
  ),
  2::bigint,
  'a new receipt advances receipt_generation monotonically'
);

select is(
  (
    select count(*)::integer
    from public.booqable_refresh_receipts
    where source_external_id = 'ord_a'
  ),
  2,
  'duplicate delivery does not insert a second receipt'
);

create temp table refresh_claim_a as
select
  (c->>'ok')::boolean as ok,
  (c->>'lease_generation')::bigint as lease_generation,
  (c->>'lease_expires_at')::timestamptz as lease_expires_at
from (
  select public.claim_booqable_refresh_intent(
    (select intent_id from refresh_case_a),
    60,
    'worker-a'
  ) as c
) s;

select ok(
  (select ok from refresh_claim_a)
  and (select lease_generation from refresh_claim_a) = 1,
  'first claimant wins a new lease generation'
);

create temp table refresh_heartbeat_a as
select
  (h->>'ok')::boolean as ok,
  (h->>'lease_expires_at')::timestamptz as lease_expires_at
from (
  select public.heartbeat_booqable_refresh_intent(
    (select intent_id from refresh_case_a),
    (select lease_generation from refresh_claim_a),
    180
  ) as h
) s;

select ok(
  (select ok from refresh_heartbeat_a)
  and (select lease_expires_at from refresh_heartbeat_a)
    > (select lease_expires_at from refresh_claim_a),
  'heartbeat with the winning generation extends lease expiry'
);

select is(
  public.heartbeat_booqable_refresh_intent(
    (select intent_id from refresh_case_a),
    0,
    180
  )->>'code',
  'lease_superseded',
  'heartbeat with a stale generation is rejected'
);

select is(
  (
    select lease_expires_at
    from public.booqable_refresh_intents
    where id = (select intent_id from refresh_case_a)
  ),
  (select lease_expires_at from refresh_heartbeat_a),
  'stale heartbeat does not change the live lease expiry'
);

select is(
  public.claim_booqable_refresh_intent(
    (select intent_id from refresh_case_a),
    60,
    'worker-b'
  )->>'code',
  'rejected_retryable',
  'concurrent claimant receives a typed retryable rejection'
);

select is(
  public.complete_booqable_refresh_intent(
    (select intent_id from refresh_case_a),
    99,
    'applied',
    'failed for rider@example.com'
  )->>'code',
  'lease_superseded',
  'stale completion is rejected without applying the requested code'
);

select is(
  (
    select state::text
    from public.booqable_refresh_intents
    where id = (select intent_id from refresh_case_a)
  ),
  'leased',
  'stale completion does not mutate intent state'
);

select is(
  (
    select transition_code
    from public.booqable_refresh_attempts
    where intent_id = (select intent_id from refresh_case_a)
    order by attempt_number
    limit 1
  ),
  'rejected_retryable',
  'stale completion records a redacted rejected_retryable attempt'
);

select ok(
  (
    select error_redacted
    from public.booqable_refresh_attempts
    where intent_id = (select intent_id from refresh_case_a)
    order by attempt_number
    limit 1
  ) like '%[redacted]%'
  and (
    select error_redacted
    from public.booqable_refresh_attempts
    where intent_id = (select intent_id from refresh_case_a)
    order by attempt_number
    limit 1
  ) not like '%rider@example.com%',
  'stale completion redacts PII from the stored attempt error'
);

select throws_ok(
  format(
    $sql$update public.booqable_refresh_attempts
      set error_redacted = 'mutated'
      where intent_id = %L$sql$,
    (select intent_id from refresh_case_a)
  ),
  'P0001',
  'booqable refresh booqable_refresh_attempts rows are append-only',
  'attempts cannot be updated'
);

select is(
  public.complete_booqable_refresh_intent(
    (select intent_id from refresh_case_a),
    (select lease_generation from refresh_claim_a),
    'applied',
    null
  )->>'state',
  'succeeded',
  'a live lease can complete as succeeded'
);

create temp table refresh_case_a_next as
select
  (r->>'ok')::boolean as ok,
  (r->>'intent_id')::uuid as intent_id
from (
  select public.record_booqable_refresh_work(
    'booqable',
    'order',
    'ord_a',
    'evt-a3',
    'provider_event_id',
    1
  ) as r
) s;

select ok(
  (select ok from refresh_case_a_next)
  and (select intent_id from refresh_case_a_next)
    is distinct from (select intent_id from refresh_case_a)
  and (
    select state::text
    from public.booqable_refresh_intents
    where id = (select intent_id from refresh_case_a_next)
  ) = 'claimable',
  'a new delivery after success opens a distinct claimable intent'
);

create temp table refresh_case_b as
select
  (r->>'intent_id')::uuid as intent_id
from (
  select public.record_booqable_refresh_work(
    'booqable',
    'order',
    'ord_b',
    'evt-b1',
    'provider_event_id',
    1
  ) as r
) s;

create temp table refresh_claim_b as
select
  (c->>'lease_generation')::bigint as lease_generation
from (
  select public.claim_booqable_refresh_intent(
    (select intent_id from refresh_case_b),
    60,
    'worker-b'
  ) as c
) s;

update public.booqable_refresh_intents
set lease_expires_at = now() - interval '1 second'
where id = (select intent_id from refresh_case_b);

select is(
  public.complete_booqable_refresh_intent(
    (select intent_id from refresh_case_b),
    (select lease_generation from refresh_claim_b),
    'applied',
    'late complete'
  )->>'code',
  'lease_superseded',
  'an expired lease cannot complete as succeeded'
);

select is(
  (
    select state::text
    from public.booqable_refresh_intents
    where id = (select intent_id from refresh_case_b)
  ),
  'leased',
  'expired completion leaves the intent non-terminal'
);

select is(
  (
    public.reclaim_booqable_refresh_intent(
      (select intent_id from refresh_case_b),
      (select lease_generation from refresh_claim_b)
    )->>'state'
  ),
  'claimable',
  'reclaim returns an expired lease to claimable'
);

select is(
  public.complete_booqable_refresh_intent(
    (select intent_id from refresh_case_b),
    (select lease_generation from refresh_claim_b),
    'applied',
    'old generation'
  )->>'code',
  'lease_superseded',
  'reclaim advances generation so the old worker cannot complete'
);

create temp table refresh_case_c as
select
  (r->>'intent_id')::uuid as intent_id
from (
  select public.record_booqable_refresh_work(
    'booqable',
    'order',
    'ord_c',
    'evt-c1',
    'provider_event_id',
    1
  ) as r
) s;

select is(
  (
    public.complete_booqable_refresh_intent(
      (select intent_id from refresh_case_c),
      (
        select (public.claim_booqable_refresh_intent(
          (select intent_id from refresh_case_c),
          60,
          'worker-c1'
        )->>'lease_generation')::bigint
      ),
      'upstream_timeout',
      'timeout 1'
    )->>'state'
  ),
  'claimable',
  'first retryable failure returns the intent to delayed claimable'
);

select ok(
  (
    select claimable_after
    from public.booqable_refresh_intents
    where id = (select intent_id from refresh_case_c)
  ) between now() + interval '29 seconds' and now() + interval '31 seconds',
  'first retryable failure delays claimability by 30 seconds'
);

select is(
  public.claim_booqable_refresh_intent(
    (select intent_id from refresh_case_c),
    60,
    'worker-c-early'
  )->>'code',
  'rejected_retryable',
  'claim is rejected while claimable_after is still in the future'
);

update public.booqable_refresh_intents
set claimable_after = now()
where id = (select intent_id from refresh_case_c);

select is(
  (
    public.complete_booqable_refresh_intent(
      (select intent_id from refresh_case_c),
      (
        select (public.claim_booqable_refresh_intent(
          (select intent_id from refresh_case_c),
          60,
          'worker-c2'
        )->>'lease_generation')::bigint
      ),
      'upstream_rate_limited',
      '429'
    )->>'state'
  ),
  'claimable',
  'second retryable failure stays claimable'
);

select ok(
  (
    select claimable_after
    from public.booqable_refresh_intents
    where id = (select intent_id from refresh_case_c)
  ) between now() + interval '119 seconds' and now() + interval '121 seconds',
  'second retryable failure delays claimability by 120 seconds'
);

update public.booqable_refresh_intents
set claimable_after = now()
where id = (select intent_id from refresh_case_c);

select is(
  (
    public.complete_booqable_refresh_intent(
      (select intent_id from refresh_case_c),
      (
        select (public.claim_booqable_refresh_intent(
          (select intent_id from refresh_case_c),
          60,
          'worker-c3'
        )->>'lease_generation')::bigint
      ),
      'upstream_server_error',
      '5xx'
    )->>'state'
  ),
  'exhausted',
  'the third retryable failure exhausts the intent'
);

select is(
  (
    select count(*)::integer
    from public.booqable_refresh_intents
    where id = (select intent_id from refresh_case_c)
      and state = 'exhausted'
  ),
  1,
  'exhausted work remains visible'
);

create temp table refresh_successor as
select
  (s->>'intent_id')::uuid as intent_id,
  (s->>'predecessor_intent_id')::uuid as predecessor_intent_id,
  (s->>'attempt_count')::integer as attempt_count
from (
  select public.create_booqable_refresh_operator_successor(
    (select intent_id from refresh_case_c)
  ) as s
) q;

select ok(
  (select predecessor_intent_id from refresh_successor)
    = (select intent_id from refresh_case_c)
  and (select attempt_count from refresh_successor) = 0,
  'operator retry creates a fresh-budget successor linked to its predecessor'
);

select is(
  (
    select state::text
    from public.booqable_refresh_intents
    where id = (select intent_id from refresh_case_c)
  ),
  'exhausted',
  'operator successor does not mutate the exhausted predecessor'
);

select is(
  public.create_booqable_refresh_operator_successor(
    (select intent_id from refresh_case_c)
  )->>'code',
  'rejected_retryable',
  'a second operator successor is a typed retryable rejection'
);

select is(
  (
    select count(*)::integer
    from public.booqable_refresh_intents
    where provider = 'booqable'
      and source_kind = 'order'
      and source_external_id = 'ord_c'
      and state in ('claimable', 'leased')
  ),
  1,
  'a second successor does not create another open intent'
);

select is(
  public.record_booqable_refresh_work(
    'booqable',
    'order',
    'ord_root_2',
    'evt-a1',
    'provider_event_id',
    1
  )->>'code',
  'rejected_retryable',
  'a reused delivery identity for a different root fails closed'
);

select is(
  (
    select count(*)::integer
    from public.booqable_refresh_intents
    where source_external_id = 'ord_root_2'
  ),
  0,
  'a mismatched delivery identity does not attach to another root'
);

create temp table refresh_case_d as
select
  (r->>'intent_id')::uuid as intent_id,
  (
    public.claim_booqable_refresh_intent(
      (r->>'intent_id')::uuid,
      60,
      'worker-d'
    )->>'lease_generation'
  )::bigint as lease_generation
from (
  select public.record_booqable_refresh_work(
    'booqable',
    'order',
    'ord_d',
    'evt-d1',
    'provider_event_id',
    1
  ) as r
) s;

select is(
  public.complete_booqable_refresh_intent(
    (select intent_id from refresh_case_d),
    (select lease_generation from refresh_case_d),
    'newer_unknown_code',
    'nope'
  )->>'code',
  'unknown_transition_code',
  'an unregistered completion code fails closed'
);

select is(
  (
    select state::text
    from public.booqable_refresh_intents
    where id = (select intent_id from refresh_case_d)
  ),
  'leased',
  'unknown codes do not transition the intent'
);

select is(
  (
    select count(*)::integer
    from public.booqable_refresh_incidents
    where source_external_id = 'ord_d'
      and code = 'unknown_transition_code'
  ),
  1,
  'unknown codes record a catalogue-owned incident'
);

select is(
  public.complete_booqable_refresh_intent(
    (select intent_id from refresh_case_d),
    (select lease_generation from refresh_case_d),
    'newer_unknown_code',
    'again'
  )->>'code',
  'unknown_transition_code',
  'repeating an unknown code still fails closed'
);

select is(
  (
    select count(*)::integer
    from public.booqable_refresh_incidents
    where source_external_id = 'ord_d'
      and code = 'unknown_transition_code'
  ),
  1,
  'unknown-code incidents are deduplicated'
);

select throws_ok(
  format(
    $sql$insert into public.booqable_refresh_attempts (
      intent_id,
      lease_generation,
      attempt_number,
      transition_code
    ) values (%L, 1, 99, 'not_a_catalogue_code')$sql$,
    (select intent_id from refresh_case_d)
  ),
  '23503',
  'insert or update on table "booqable_refresh_attempts" violates foreign key constraint "booqable_refresh_attempts_transition_code_fkey"',
  'attempts cannot use an unregistered catalogue code'
);

select ok(
  not has_table_privilege('authenticated', 'public.booqable_refresh_receipts', 'SELECT')
  and not has_table_privilege('authenticated', 'public.booqable_refresh_intents', 'INSERT')
  and not has_table_privilege('authenticated', 'public.booqable_refresh_attempts', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.booqable_refresh_incidents', 'DELETE'),
  'authenticated roles have no operational-table DML'
);

select ok(
  not has_table_privilege('anon', 'public.booqable_refresh_receipts', 'SELECT')
  and not has_table_privilege('anon', 'public.booqable_refresh_transition_catalogue', 'SELECT')
  and not has_table_privilege('anon', 'public.booqable_refresh_receipt_intents', 'INSERT'),
  'anonymous roles have no operational-table access'
);

select ok(
  not has_table_privilege('service_role', 'public.booqable_refresh_receipts', 'INSERT')
  and not has_table_privilege('service_role', 'public.booqable_refresh_intents', 'UPDATE')
  and not has_table_privilege('service_role', 'public.booqable_refresh_attempts', 'SELECT')
  and not has_table_privilege('service_role', 'public.booqable_refresh_incidents', 'DELETE'),
  'service_role has no direct operational-table DML'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.record_booqable_refresh_work(text, text, text, text, text, integer)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.claim_booqable_refresh_intent(uuid, integer, text)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.heartbeat_booqable_refresh_intent(uuid, bigint, integer)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.complete_booqable_refresh_intent(uuid, bigint, text, text)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.reclaim_booqable_refresh_intent(uuid, bigint)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.create_booqable_refresh_operator_successor(uuid)',
    'EXECUTE'
  ),
  'service_role can execute the six refresh-work RPCs'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.record_booqable_refresh_work(text, text, text, text, text, integer)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.complete_booqable_refresh_intent(uuid, bigint, text, text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'service_role',
    'public.record_booqable_refresh_incident(text, text, text, text, uuid, text)',
    'EXECUTE'
  ),
  'application roles cannot execute inbox helpers or record/complete as users'
);

select * from finish();
rollback;
