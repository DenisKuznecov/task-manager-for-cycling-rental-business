import { z } from "zod";

export const WORKSHOP_TAG_CONTRACT_VERSION = 1;
export const WORKSHOP_TAG_PREFIX = "workshop-";

export const WORKSHOP_BIKE_CATEGORIES = [
  "e-city",
  "e-road",
  "road",
  "gravel",
  "mtb",
  "e-mtb",
] as const;

export type WorkshopBikeCategory = (typeof WORKSHOP_BIKE_CATEGORIES)[number];

export const WORKSHOP_PRODUCT_GROUP_TAGS = {
  "e-city": "workshop-e-city-bike",
  "e-road": "workshop-e-road-bike",
  road: "workshop-road-bike",
  gravel: "workshop-gravel-bike",
  mtb: "workshop-mtb-bike",
  "e-mtb": "workshop-e-mtb-bike",
} as const satisfies Record<WorkshopBikeCategory, string>;

export const WORKSHOP_BUNDLE_TAGS = {
  "e-city": "workshop-e-city-bike-bundle",
  "e-road": "workshop-e-road-bike-bundle",
  road: "workshop-road-bike-bundle",
  gravel: "workshop-gravel-bike-bundle",
  mtb: "workshop-mtb-bike-bundle",
  "e-mtb": "workshop-e-mtb-bike-bundle",
} as const satisfies Record<WorkshopBikeCategory, string>;

export type WorkshopProductGroupTag =
  (typeof WORKSHOP_PRODUCT_GROUP_TAGS)[WorkshopBikeCategory];
export type WorkshopBundleTag =
  (typeof WORKSHOP_BUNDLE_TAGS)[WorkshopBikeCategory];

export const SourceTagListSchema = z.array(z.string().trim().min(1));
export const WorkshopProductGroupTagSchema = z.enum([
  WORKSHOP_PRODUCT_GROUP_TAGS["e-city"],
  WORKSHOP_PRODUCT_GROUP_TAGS["e-road"],
  WORKSHOP_PRODUCT_GROUP_TAGS.road,
  WORKSHOP_PRODUCT_GROUP_TAGS.gravel,
  WORKSHOP_PRODUCT_GROUP_TAGS.mtb,
  WORKSHOP_PRODUCT_GROUP_TAGS["e-mtb"],
]);
export const WorkshopBundleTagSchema = z.enum([
  WORKSHOP_BUNDLE_TAGS["e-city"],
  WORKSHOP_BUNDLE_TAGS["e-road"],
  WORKSHOP_BUNDLE_TAGS.road,
  WORKSHOP_BUNDLE_TAGS.gravel,
  WORKSHOP_BUNDLE_TAGS.mtb,
  WORKSHOP_BUNDLE_TAGS["e-mtb"],
]);

export const WORKSHOP_TAG_INCIDENT_CODES = [
  "unknown_workshop_tag",
  "multiple_workshop_bike_tags",
  "conflicting_resource_tag",
  "product_tag_mismatch",
  "bundle_product_group_mismatch",
] as const;

export type WorkshopTagIncidentCode =
  (typeof WORKSHOP_TAG_INCIDENT_CODES)[number];

export type WorkshopTagClassification =
  | {
      status: "untagged";
      category: null;
      tag: null;
    }
  | {
      status: "classified";
      category: WorkshopBikeCategory;
      tag: WorkshopProductGroupTag | WorkshopBundleTag;
    }
  | {
      status: "incident";
      category: null;
      tag: null;
      code: WorkshopTagIncidentCode;
      workshopTags: readonly string[];
    };

const PRODUCT_GROUP_CATEGORY_BY_TAG = new Map<
  WorkshopProductGroupTag,
  WorkshopBikeCategory
>(
  WORKSHOP_BIKE_CATEGORIES.map((category) => [
    WORKSHOP_PRODUCT_GROUP_TAGS[category],
    category,
  ]),
);
const BUNDLE_CATEGORY_BY_TAG = new Map<
  WorkshopBundleTag,
  WorkshopBikeCategory
>(
  WORKSHOP_BIKE_CATEGORIES.map((category) => [
    WORKSHOP_BUNDLE_TAGS[category],
    category,
  ]),
);
const PRODUCT_GROUP_TAG_VALUES = new Set(PRODUCT_GROUP_CATEGORY_BY_TAG.keys());
const BUNDLE_TAG_VALUES = new Set(BUNDLE_CATEGORY_BY_TAG.keys());

function normalizedUniqueTags(tags: readonly string[]): readonly string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function incident(
  code: WorkshopTagIncidentCode,
  workshopTags: readonly string[],
): WorkshopTagClassification {
  return {
    status: "incident",
    category: null,
    tag: null,
    code,
    workshopTags,
  };
}

function classifyResourceTags<
  TTag extends WorkshopProductGroupTag | WorkshopBundleTag,
>(
  tags: readonly string[],
  expectedTags: ReadonlySet<TTag>,
  conflictingTags: ReadonlySet<string>,
  categoryByTag: ReadonlyMap<TTag, WorkshopBikeCategory>,
): WorkshopTagClassification {
  const workshopTags = normalizedUniqueTags(tags).filter((tag) =>
    tag.startsWith(WORKSHOP_TAG_PREFIX),
  );
  const matchedTags = workshopTags.filter((tag): tag is TTag =>
    expectedTags.has(tag as TTag),
  );
  const unexpectedTags = workshopTags.filter(
    (tag) => !expectedTags.has(tag as TTag),
  );

  if (unexpectedTags.length > 0) {
    const code = unexpectedTags.some((tag) => conflictingTags.has(tag))
      ? "conflicting_resource_tag"
      : "unknown_workshop_tag";
    return incident(code, workshopTags);
  }

  if (matchedTags.length === 0) {
    return { status: "untagged", category: null, tag: null };
  }

  if (matchedTags.length > 1) {
    return incident("multiple_workshop_bike_tags", workshopTags);
  }

  const [tag] = matchedTags;
  return {
    status: "classified",
    category: categoryByTag.get(tag)!,
    tag,
  };
}

export function classifyProductGroupTags(
  tags: readonly string[],
): WorkshopTagClassification {
  return classifyResourceTags(
    tags,
    PRODUCT_GROUP_TAG_VALUES,
    BUNDLE_TAG_VALUES,
    PRODUCT_GROUP_CATEGORY_BY_TAG,
  );
}

export function classifyBundleTags(
  tags: readonly string[],
): WorkshopTagClassification {
  return classifyResourceTags(
    tags,
    BUNDLE_TAG_VALUES,
    PRODUCT_GROUP_TAG_VALUES,
    BUNDLE_CATEGORY_BY_TAG,
  );
}

export function validateProductTagInheritance(
  productTags: readonly string[],
  productGroupTags: readonly string[],
): WorkshopTagClassification {
  const product = classifyProductGroupTags(productTags);
  const productGroup = classifyProductGroupTags(productGroupTags);

  if (product.status === "incident") return product;
  if (productGroup.status === "incident") return productGroup;
  if (
    product.status !== productGroup.status ||
    (product.status === "classified" &&
      productGroup.status === "classified" &&
      product.category !== productGroup.category)
  ) {
    return incident("product_tag_mismatch", [
      ...normalizedUniqueTags(productTags),
      ...normalizedUniqueTags(productGroupTags),
    ]);
  }

  return productGroup;
}

export function validateBundleTagAgreement(
  bundleTags: readonly string[],
  containedProductGroupTagLists: readonly (readonly string[])[],
): WorkshopTagClassification {
  const bundle = classifyBundleTags(bundleTags);
  if (bundle.status === "incident") return bundle;

  const containedBikeGroups: Extract<
    WorkshopTagClassification,
    { status: "classified" }
  >[] = [];
  const observedTags = [...normalizedUniqueTags(bundleTags)];

  for (const tagList of containedProductGroupTagLists) {
    observedTags.push(...normalizedUniqueTags(tagList));
    const productGroup = classifyProductGroupTags(tagList);
    if (productGroup.status === "incident") return productGroup;
    if (productGroup.status === "classified") {
      containedBikeGroups.push(productGroup);
    }
  }

  if (bundle.status === "untagged" && containedBikeGroups.length === 0) {
    return bundle;
  }

  if (
    bundle.status !== "classified" ||
    containedBikeGroups.length !== 1 ||
    containedBikeGroups[0].category !== bundle.category
  ) {
    return incident("bundle_product_group_mismatch", observedTags);
  }

  return bundle;
}
