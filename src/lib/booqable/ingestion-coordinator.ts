import {
  SOURCE_ENVELOPE_SCHEMA_VERSION,
  TERMINAL_ORDER_STATUSES,
  admitCanonicalGraph,
  fingerprintResource,
  hashFingerprintInputs,
  pickFingerprintInputs,
  type CanonicalGraph,
  type IntegrationIncidentKind,
  type MembershipProjection,
  type ResourceSlot,
  type SourceApplyResult,
  type SourceEnvelope,
  type SourceVersionEntry,
} from "@/src/lib/booqable/contracts";

export type AcceptedCanonicalState = {
  graph: CanonicalGraph;
  sourceVector: SourceVersionEntry[];
  sourceFingerprint: string;
  schemaVersion: number;
  orderStatus: string | null;
  acceptedEnvelopeResources?: ResourceSlot[];
};

export type OmittedChild = {
  resource_type: string;
  external_id: string;
};

export type RentalLineAttentionFact = {
  line_external_id: string;
  line_quantity: number;
  identified_count: number;
  unidentified_count: number;
};

export type CanonicalApplyPayload = {
  schema_version: number;
  producer_version: string;
  profile_version: string;
  root: { resource_type: string; external_id: string };
  order_status: string | null;
  source_vector: SourceVersionEntry[];
  merged_fingerprint: string;
  graph: CanonicalGraph;
  resource_fingerprints: Array<{
    resource_type: string;
    external_id: string;
    source_fingerprint: string;
  }>;
  rental_lines: RentalLineAttentionFact[];
  omissions: OmittedChild[];
  incident: {
    kind: IntegrationIncidentKind;
    field_name: string | null;
    resource_type: string;
    resource_external_id: string;
  } | null;
  comparison_result: SourceApplyResult;
};

export type CanonicalApplyDeps = {
  apply: (payload: CanonicalApplyPayload) => Promise<SourceApplyResult>;
};

export type PreparedCanonicalApply = {
  result: SourceApplyResult;
  payload: CanonicalApplyPayload;
};

/**
 * Carry accepted children forward when the refresh omits them without
 * an approved removal. Generic absence must not close memberships.
 */
export function carryForwardOmittedChildren(
  incoming: CanonicalGraph,
  accepted: CanonicalGraph | null,
): { graph: CanonicalGraph; omissions: OmittedChild[] } {
  if (!accepted) {
    return { graph: incoming, omissions: [] };
  }

  const omissions: OmittedChild[] = [];
  const graph: CanonicalGraph = {
    product_groups: carryList(
      incoming.product_groups,
      accepted.product_groups,
      "product_group",
      omissions,
    ),
    products: carryList(
      incoming.products,
      accepted.products,
      "product",
      omissions,
    ),
    bundles: carryList(incoming.bundles, accepted.bundles, "bundle", omissions),
    bundle_items: carryList(
      incoming.bundle_items,
      accepted.bundle_items,
      "bundle_item",
      omissions,
    ),
    stock_items: carryList(
      incoming.stock_items,
      accepted.stock_items,
      "stock_item",
      omissions,
    ),
    plannings: carryList(
      incoming.plannings,
      accepted.plannings,
      "planning",
      omissions,
    ),
    stock_item_plannings: carryList(
      incoming.stock_item_plannings,
      accepted.stock_item_plannings,
      "stock_item_planning",
      omissions,
    ),
    memberships: carryMemberships(
      incoming.memberships,
      accepted.memberships,
      omissions,
    ),
    predecessors: incoming.predecessors.length > 0
      ? incoming.predecessors
      : accepted.predecessors,
  };

  return { graph, omissions };
}

export function compareMergedState(input: {
  schemaVersion: number;
  rootExternalId: string;
  incomingVector: SourceVersionEntry[];
  incomingFingerprint: string;
  accepted: AcceptedCanonicalState | null;
}): {
  result: Extract<SourceApplyResult, "applied" | "no_op" | "quarantined">;
  incidentKind: IntegrationIncidentKind | null;
  incidentResourceType?: string;
  incidentResourceExternalId?: string;
} {
  if (input.schemaVersion !== SOURCE_ENVELOPE_SCHEMA_VERSION) {
    return { result: "quarantined", incidentKind: "unsupported_schema" };
  }
  if (!input.accepted) {
    return { result: "applied", incidentKind: null };
  }
  if (input.accepted.schemaVersion !== SOURCE_ENVELOPE_SCHEMA_VERSION) {
    return { result: "quarantined", incidentKind: "unsupported_schema" };
  }

  const incomingMap = vectorMap(input.incomingVector);
  const acceptedMap = vectorMap(input.accepted.sourceVector);

  for (const [key, acceptedVersion] of acceptedMap) {
    const incomingVersion = incomingMap.get(key);
    if (incomingVersion === undefined) {
      continue;
    }
    const cmp = compareSourceVersions(incomingVersion, acceptedVersion);
    if (cmp === "older") {
      const [incidentResourceType, incidentResourceExternalId] = key.split("\0");
      return {
        result: "quarantined",
        incidentKind: "older_present_state",
        incidentResourceType,
        incidentResourceExternalId,
      };
    }
    if (cmp === "incomparable") {
      const [incidentResourceType, incidentResourceExternalId] = key.split("\0");
      return {
        result: "quarantined",
        incidentKind: "incomparable_present_state",
        incidentResourceType,
        incidentResourceExternalId,
      };
    }
  }

  const rootKey = `order\0${input.rootExternalId}`;
  const rootCmp = compareSourceVersions(
    incomingMap.get(rootKey) ?? null,
    acceptedMap.get(rootKey) ?? null,
  );

  for (const key of incomingMap.keys()) {
    if (!acceptedMap.has(key) && rootCmp !== "newer") {
      const [incidentResourceType, incidentResourceExternalId] = key.split("\0");
      return {
        result: "quarantined",
        incidentKind: "unauthoritative_addition",
        incidentResourceType,
        incidentResourceExternalId,
      };
    }
  }

  const vectorEqual =
    incomingMap.size === acceptedMap.size &&
    [...incomingMap].every(([key, version]) => acceptedMap.get(key) === version);

  if (vectorEqual) {
    if (input.incomingFingerprint === input.accepted.sourceFingerprint) {
      return { result: "no_op", incidentKind: null };
    }
    return { result: "quarantined", incidentKind: "equal_version_conflict" };
  }

  return { result: "applied", incidentKind: null };
}

export function mergedGraphFingerprint(
  graph: CanonicalGraph,
  envelope: SourceEnvelope,
  acceptedResources: ResourceSlot[] = [],
): string {
  const incomingOrderItems = envelope.resources.filter(
    (resource) => resource.resource_type === "order_item",
  );
  const incomingOrderItemIds = new Set(
    incomingOrderItems.map((resource) => resource.external_id),
  );
  const effectiveOrderItems = [
    ...incomingOrderItems,
    ...acceptedResources.filter(
      (resource) =>
        resource.resource_type === "order_item" &&
        !incomingOrderItemIds.has(resource.external_id),
    ),
  ];
  const facts = [
    pickFingerprintInputs("order", {
      status: scalarFromEnvelope(envelope, "order", "status"),
      starts_at: scalarFromEnvelope(envelope, "order", "starts_at"),
      stops_at: scalarFromEnvelope(envelope, "order", "stops_at"),
      customer_external_id: scalarFromEnvelope(
        envelope,
        "order",
        "customer_external_id",
      ),
    }),
    pickFingerprintInputs("customer", {
      name: scalarFromEnvelope(envelope, "customer", "name"),
      email: scalarFromEnvelope(envelope, "customer", "email"),
      phone: scalarFromEnvelope(envelope, "customer", "phone"),
      birthday: scalarFromEnvelope(envelope, "customer", "birthday"),
    }),
    ...effectiveOrderItems
      .map((resource) =>
        pickFingerprintInputs("order_item", resource.fingerprint_inputs ?? {}),
      ),
    ...graph.stock_items.map((resource) =>
      pickFingerprintInputs("stock_item", {
        product_external_id: resource.product_external_id,
        barcode: scalarFromEnvelopeOrAccepted(
          envelope,
          acceptedResources,
          "stock_item",
          "barcode",
          resource.external_id,
        ),
      }),
    ),
    ...graph.memberships.map((membership) =>
      pickFingerprintInputs("membership", {
        stock_item_external_id: membership.stock_item_external_id,
      }),
    ),
    ...graph.product_groups.map((resource) =>
      pickFingerprintInputs("product_group", { tag_list: resource.tag_list }),
    ),
    ...graph.products.map((resource) =>
      pickFingerprintInputs("product", {
        tag_list: resource.tag_list,
        product_group_external_id: resource.product_group_external_id,
      }),
    ),
    ...graph.bundles.map((resource) =>
      pickFingerprintInputs("bundle", { tag_list: resource.tag_list }),
    ),
  ];
  return hashFingerprintInputs(facts);
}

export function rentalLineAttentionFacts(
  graph: CanonicalGraph,
  envelope?: SourceEnvelope,
): RentalLineAttentionFact[] {
  const membershipsByLine = new Map<string, MembershipProjection[]>();
  for (const membership of graph.memberships) {
    const existing = membershipsByLine.get(membership.line_external_id) ?? [];
    existing.push(membership);
    membershipsByLine.set(membership.line_external_id, existing);
  }

  const bikeLineIds = new Set<string>();
  for (const planning of graph.plannings) {
    if (planning.line_external_id) {
      bikeLineIds.add(planning.line_external_id);
    }
  }
  for (const membership of graph.memberships) {
    if (membership.stock_item_external_id) {
      bikeLineIds.add(membership.line_external_id);
    }
  }

  return [...bikeLineIds].map((line_external_id) => {
    const memberships = membershipsByLine.get(line_external_id) ?? [];
    const line_quantity = lineQuantityForAttention(
      line_external_id,
      memberships,
      envelope,
    );
    const identified_count = memberships.filter(
      (row) => row.source_lifecycle === "open" && row.stock_item_external_id,
    ).length;
    return {
      line_external_id,
      line_quantity,
      identified_count,
      unidentified_count: Math.max(0, line_quantity - identified_count),
    };
  });
}

/**
 * Admit, carry forward, and compare before the database coordinator
 * writes. Workshop task derivation stays out of this path.
 */
export function prepareCanonicalApply(input: {
  graph: unknown;
  envelope: SourceEnvelope;
  accepted: AcceptedCanonicalState | null;
  orderStatus: string | null;
}): PreparedCanonicalApply {
  const root = input.envelope.root;
  const basePayload = {
    schema_version: input.envelope.schema_version,
    producer_version: input.envelope.producer_version,
    profile_version: input.envelope.profile_version,
    root,
    order_status: input.orderStatus,
    source_vector: input.envelope.source_versions,
    merged_fingerprint: "",
    graph: emptyGraph(),
    resource_fingerprints: [],
    rental_lines: [],
    omissions: [] as OmittedChild[],
    incident: null as CanonicalApplyPayload["incident"],
    comparison_result: "quarantined" as SourceApplyResult,
  };

  if (input.envelope.schema_version !== SOURCE_ENVELOPE_SCHEMA_VERSION) {
    return {
      result: "quarantined",
      payload: {
        ...basePayload,
        incident: {
          kind: "unsupported_schema",
          field_name: "schema_version",
          resource_type: root.resource_type,
          resource_external_id: root.external_id,
        },
      },
    };
  }

  const admission = admitCanonicalGraph(input.graph);
  if (admission.status !== "accepted") {
    return {
      result: "quarantined",
      payload: {
        ...basePayload,
        incident: {
          kind: "unauthoritative_addition",
          field_name: admission.reason,
          resource_type: root.resource_type,
          resource_external_id: root.external_id,
        },
      },
    };
  }

  const { graph: carried, omissions } = carryForwardOmittedChildren(
    admission.graph,
    input.accepted?.graph ?? null,
  );
  const mergedAdmission = admitCanonicalGraph(carried);
  if (mergedAdmission.status !== "accepted") {
    return {
      result: "quarantined",
      payload: {
        ...basePayload,
        omissions,
        incident: {
          kind: "unauthoritative_addition",
          field_name: mergedAdmission.reason,
          resource_type: root.resource_type,
          resource_external_id: root.external_id,
        },
      },
    };
  }

  const graph = mergedAdmission.graph;
  const acceptedResources = input.accepted?.acceptedEnvelopeResources ?? [];
  const mergedFingerprint = mergedGraphFingerprint(
    graph,
    input.envelope,
    acceptedResources,
  );
  const sourceVector = mergeSourceVectors(
    input.envelope.source_versions,
    graph,
    input.accepted?.sourceVector ?? [],
  );
  const comparison = compareMergedState({
    schemaVersion: input.envelope.schema_version,
    rootExternalId: root.external_id,
    incomingVector: sourceVector,
    incomingFingerprint: mergedFingerprint,
    accepted: input.accepted,
  });

  const incidentKind =
    comparison.incidentKind ??
    (omissions.length > 0 ? "omitted_child" : null);

  return {
    result: comparison.result,
    payload: {
      ...basePayload,
      source_vector: sourceVector,
      merged_fingerprint: mergedFingerprint,
      graph,
      resource_fingerprints: resourceFingerprints(
        graph,
        input.envelope,
        acceptedResources,
      ),
      rental_lines: rentalLineAttentionFacts(graph, input.envelope),
      omissions,
      incident: incidentKind
        ? {
            kind: incidentKind,
            field_name: incidentKind === "omitted_child"
              ? omissions[0]?.resource_type ?? null
              : comparison.incidentResourceType
                ? "source_version"
                : "source_fingerprint",
            resource_type:
              comparison.incidentResourceType ??
              omissions[0]?.resource_type ??
              root.resource_type,
            resource_external_id:
              comparison.incidentResourceExternalId ??
              omissions[0]?.external_id ??
              root.external_id,
          }
        : null,
      comparison_result: comparison.result,
    },
  };
}

export async function ingestCanonicalOrderGraph(
  deps: CanonicalApplyDeps,
  input: {
    graph: unknown;
    envelope: SourceEnvelope;
    accepted: AcceptedCanonicalState | null;
    orderStatus: string | null;
  },
): Promise<{ result: SourceApplyResult; payload: CanonicalApplyPayload }> {
  const prepared = prepareCanonicalApply(input);
  const result = await deps.apply(prepared.payload);
  return { result, payload: prepared.payload };
}

/**
 * Database coordinator is the sole canonical writer. Callers inject this
 * so unit tests can prove compare/carry-forward without a live RPC.
 */
export async function applyCanonicalOrderGraphRpc(
  supabase: {
    rpc: (
      fn: "apply_canonical_order_graph",
      args: { payload: CanonicalApplyPayload },
    ) => Promise<{ data: SourceApplyResult | null; error: { message: string } | null }>;
  },
  payload: CanonicalApplyPayload,
): Promise<SourceApplyResult> {
  const { data, error } = await supabase.rpc("apply_canonical_order_graph", {
    payload,
  });
  if (error) {
    console.error("applyCanonicalOrderGraphRpc:", error);
    throw new Error(error.message);
  }
  if (
    data !== "applied" &&
    data !== "no_op" &&
    data !== "derivation_disabled" &&
    data !== "quarantined" &&
    data !== "rejected_retryable" &&
    data !== "rejected_terminal"
  ) {
    throw new Error("applyCanonicalOrderGraphRpc: unknown apply result");
  }
  return data;
}

export function attentionCloseReason(
  orderStatus: string | null,
  unidentifiedCount: number,
): "fully_identified" | "order_canceled" | "order_stopped" | "order_archived" | null {
  if (orderStatus === "canceled") return "order_canceled";
  if (orderStatus === "stopped") return "order_stopped";
  if (orderStatus === "archived") return "order_archived";
  if (
    unidentifiedCount <= 0 &&
    !TERMINAL_ORDER_STATUSES.includes(
      orderStatus as (typeof TERMINAL_ORDER_STATUSES)[number],
    )
  ) {
    return "fully_identified";
  }
  return null;
}

function carryList<T extends { external_id: string }>(
  incoming: T[],
  accepted: T[],
  resourceType: string,
  omissions: OmittedChild[],
): T[] {
  const incomingIds = new Set(incoming.map((row) => row.external_id));
  const carried = [...incoming];
  for (const row of accepted) {
    if (!incomingIds.has(row.external_id)) {
      carried.push(row);
      omissions.push({
        resource_type: resourceType,
        external_id: row.external_id,
      });
    }
  }
  return carried;
}

function carryMemberships(
  incoming: MembershipProjection[],
  accepted: MembershipProjection[],
  omissions: OmittedChild[],
): MembershipProjection[] {
  const incomingKeys = new Set(incoming.map(membershipKey));
  const carried = [...incoming];
  for (const row of accepted) {
    if (!incomingKeys.has(membershipKey(row))) {
      carried.push(row);
      omissions.push({
        resource_type: "order_bike_membership",
        external_id: row.id,
      });
    }
  }
  return carried;
}

function membershipKey(membership: MembershipProjection): string {
  return [
    membership.order_external_id,
    membership.line_external_id,
    membership.source_unit_discriminator,
    String(membership.replacement_chain_incarnation),
  ].join("\0");
}

function vectorMap(vector: SourceVersionEntry[]): Map<string, string> {
  return new Map(
    vector.map((entry) => [
      `${entry.resource_type}\0${entry.external_id}`,
      entry.source_version,
    ]),
  );
}

function compareSourceVersions(
  incoming: string | null,
  accepted: string | null,
): "equal" | "newer" | "older" | "incomparable" {
  if (incoming === accepted) {
    return "equal";
  }
  if (!incoming || !accepted) {
    return "incomparable";
  }
  const incomingUtc = normalizeUtcTimestamp(incoming);
  const acceptedUtc = normalizeUtcTimestamp(accepted);
  if (!incomingUtc || !acceptedUtc) {
    return "incomparable";
  }
  if (incomingUtc === acceptedUtc) {
    return "equal";
  }
  return incomingUtc > acceptedUtc ? "newer" : "older";
}

/**
 * Timestamps without Z or a numeric offset are treated as UTC so JS
 * Date.parse and PostgreSQL timestamptz do not disagree.
 */
function normalizeUtcTimestamp(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const expanded = trimmed.replace(/([+-])(\d{2})$/, "$1$2:00");
  const hasZone = /Z$/i.test(expanded) || /[+-]\d{2}:?\d{2}$/.test(expanded);
  const candidate = hasZone ? expanded : `${expanded}Z`;
  const parsed = Date.parse(candidate);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
}

function mergeSourceVectors(
  incoming: SourceVersionEntry[],
  graph: CanonicalGraph,
  accepted: SourceVersionEntry[],
): SourceVersionEntry[] {
  const merged = new Map<string, SourceVersionEntry>();
  for (const entry of accepted) {
    merged.set(`${entry.resource_type}\0${entry.external_id}`, entry);
  }
  for (const entry of incoming) {
    merged.set(`${entry.resource_type}\0${entry.external_id}`, entry);
  }
  for (const row of [
    ...graph.product_groups,
    ...graph.products,
    ...graph.bundles,
    ...graph.bundle_items,
    ...graph.stock_items,
    ...graph.plannings,
    ...graph.stock_item_plannings,
  ]) {
    if (row.source_version) {
      const key = `${row.resource_type}\0${row.external_id}`;
      if (!merged.has(key)) {
        merged.set(key, {
          resource_type: row.resource_type,
          external_id: row.external_id,
          source_version: row.source_version,
        });
      }
    }
  }
  return [...merged.values()];
}

function resourceFingerprints(
  graph: CanonicalGraph,
  envelope: SourceEnvelope,
  acceptedResources: ResourceSlot[] = [],
) {
  return [
    ...graph.product_groups.map((row) => ({
      resource_type: row.resource_type,
      external_id: row.external_id,
      source_fingerprint: fingerprintResource("product_group", {
        tag_list: row.tag_list,
      }).source_fingerprint,
    })),
    ...graph.products.map((row) => ({
      resource_type: row.resource_type,
      external_id: row.external_id,
      source_fingerprint: fingerprintResource("product", {
        tag_list: row.tag_list,
        product_group_external_id: row.product_group_external_id,
      }).source_fingerprint,
    })),
    ...graph.bundles.map((row) => ({
      resource_type: row.resource_type,
      external_id: row.external_id,
      source_fingerprint: fingerprintResource("bundle", {
        tag_list: row.tag_list,
      }).source_fingerprint,
    })),
    ...graph.stock_items.map((row) => ({
      resource_type: row.resource_type,
      external_id: row.external_id,
      source_fingerprint: fingerprintResource("stock_item", {
        product_external_id: row.product_external_id,
        barcode: scalarFromEnvelopeOrAccepted(
          envelope,
          acceptedResources,
          "stock_item",
          "barcode",
          row.external_id,
        ),
      }).source_fingerprint,
    })),
    ...graph.memberships.map((row) => ({
      resource_type: "order_bike_membership",
      external_id: row.id,
      source_fingerprint: fingerprintResource("membership", {
        stock_item_external_id: row.stock_item_external_id,
      }).source_fingerprint,
    })),
  ];
}

function lineQuantityForAttention(
  lineExternalId: string,
  memberships: MembershipProjection[],
  envelope?: SourceEnvelope,
): number {
  const fromMembership = memberships[0]?.line_quantity;
  if (fromMembership && fromMembership >= 1) {
    return fromMembership;
  }
  if (envelope) {
    const fromEnvelope = scalarFromEnvelope(
      envelope,
      "order_item",
      "quantity",
      lineExternalId,
    );
    if (typeof fromEnvelope === "number" && fromEnvelope >= 1) {
      return fromEnvelope;
    }
  }
  return 1;
}

function scalarFromEnvelope(
  envelope: SourceEnvelope,
  resourceType: string,
  field: string,
  externalId?: string,
): unknown {
  const resource = envelope.resources.find(
    (entry) =>
      entry.resource_type === resourceType &&
      (externalId ? entry.external_id === externalId : true),
  );
  return resource?.fingerprint_inputs?.[field] ?? null;
}

function scalarFromEnvelopeOrAccepted(
  envelope: SourceEnvelope,
  acceptedResources: ResourceSlot[],
  resourceType: string,
  field: string,
  externalId?: string,
): unknown {
  const incoming = envelope.resources.find(
    (entry) =>
      entry.resource_type === resourceType &&
      (externalId ? entry.external_id === externalId : true),
  );
  if (incoming) {
    return incoming.fingerprint_inputs?.[field] ?? null;
  }

  const accepted = acceptedResources.find(
    (entry) =>
      entry.resource_type === resourceType &&
      (externalId ? entry.external_id === externalId : true),
  );
  return accepted?.fingerprint_inputs?.[field] ?? null;
}

function emptyGraph(): CanonicalGraph {
  return {
    product_groups: [],
    products: [],
    bundles: [],
    bundle_items: [],
    stock_items: [],
    plannings: [],
    stock_item_plannings: [],
    memberships: [],
    predecessors: [],
  };
}
