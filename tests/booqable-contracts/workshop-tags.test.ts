import { describe, expect, it } from "vitest";
import {
  SourceTagListSchema,
  WORKSHOP_BIKE_CATEGORIES,
  WORKSHOP_BUNDLE_TAGS,
  WORKSHOP_PRODUCT_GROUP_TAGS,
  WORKSHOP_TAG_CONTRACT_VERSION,
  classifyBundleTags,
  classifyProductGroupTags,
  validateBundleTagAgreement,
  validateProductTagInheritance,
} from "@/src/lib/booqable/contracts";
import {
  WORKSHOP_BIKE_CATEGORIES as CHECKLIST_BIKE_CATEGORIES,
  WORKSHOP_BIKE_CATEGORY_LABELS,
} from "@/src/lib/workshop-tasks/types";

describe("source-first Workshop tag contract", () => {
  it("owns the exact six-category ProductGroup and Bundle vocabulary", () => {
    expect(WORKSHOP_TAG_CONTRACT_VERSION).toBe(1);
    expect(WORKSHOP_BIKE_CATEGORIES).toEqual([
      "e-city",
      "e-road",
      "road",
      "gravel",
      "mtb",
      "e-mtb",
    ]);
    expect(WORKSHOP_PRODUCT_GROUP_TAGS).toEqual({
      "e-city": "workshop-e-city-bike",
      "e-road": "workshop-e-road-bike",
      road: "workshop-road-bike",
      gravel: "workshop-gravel-bike",
      mtb: "workshop-mtb-bike",
      "e-mtb": "workshop-e-mtb-bike",
    });
    expect(WORKSHOP_BUNDLE_TAGS).toEqual({
      "e-city": "workshop-e-city-bike-bundle",
      "e-road": "workshop-e-road-bike-bundle",
      road: "workshop-road-bike-bundle",
      gravel: "workshop-gravel-bike-bundle",
      mtb: "workshop-mtb-bike-bundle",
      "e-mtb": "workshop-e-mtb-bike-bundle",
    });
  });

  it("shares all six categories with checklist validation and labels", () => {
    expect(CHECKLIST_BIKE_CATEGORIES).toBe(WORKSHOP_BIKE_CATEGORIES);
    expect(WORKSHOP_BIKE_CATEGORY_LABELS["e-mtb"]).toBe("E-MTB");
  });

  it("validates complete source tag lists without interpreting ordinary tags", () => {
    expect(SourceTagListSchema.parse(["  workshop-road-bike  ", "season-2026"]))
      .toEqual(["workshop-road-bike", "season-2026"]);
    expect(classifyProductGroupTags(["season-2026"])).toEqual({
      status: "untagged",
      category: null,
      tag: null,
    });
  });

  it.each(WORKSHOP_BIKE_CATEGORIES)(
    "classifies %s ProductGroups and matching Bundles",
    (category) => {
      expect(
        classifyProductGroupTags([
          "ordinary-source-tag",
          WORKSHOP_PRODUCT_GROUP_TAGS[category],
        ]),
      ).toMatchObject({ status: "classified", category });
      expect(
        classifyBundleTags([WORKSHOP_BUNDLE_TAGS[category]]),
      ).toMatchObject({ status: "classified", category });
      expect(
        validateBundleTagAgreement(
          [WORKSHOP_BUNDLE_TAGS[category]],
          [[WORKSHOP_PRODUCT_GROUP_TAGS[category]], ["accessory"]],
        ),
      ).toMatchObject({ status: "classified", category });
    },
  );

  it("keeps untagged source outside Workshop work", () => {
    expect(validateProductTagInheritance([], [])).toMatchObject({
      status: "untagged",
    });
    expect(validateBundleTagAgreement([], [[], ["accessory"]])).toMatchObject({
      status: "untagged",
    });
  });

  it("fails closed for unknown, multiple, and resource-conflicting tags", () => {
    expect(classifyProductGroupTags(["workshop-tandem-bike"])).toMatchObject({
      status: "incident",
      code: "unknown_workshop_tag",
    });
    expect(
      classifyProductGroupTags([
        WORKSHOP_PRODUCT_GROUP_TAGS.road,
        WORKSHOP_PRODUCT_GROUP_TAGS.gravel,
      ]),
    ).toMatchObject({
      status: "incident",
      code: "multiple_workshop_bike_tags",
    });
    expect(
      classifyProductGroupTags([WORKSHOP_BUNDLE_TAGS.road]),
    ).toMatchObject({
      status: "incident",
      code: "conflicting_resource_tag",
    });
    expect(classifyBundleTags([WORKSHOP_PRODUCT_GROUP_TAGS.road])).toMatchObject({
      status: "incident",
      code: "conflicting_resource_tag",
    });
  });

  it("fails closed when Product inheritance or Bundle agreement diverges", () => {
    expect(
      validateProductTagInheritance(
        [],
        [WORKSHOP_PRODUCT_GROUP_TAGS.road],
      ),
    ).toMatchObject({
      status: "incident",
      code: "product_tag_mismatch",
    });
    expect(
      validateProductTagInheritance(
        [WORKSHOP_PRODUCT_GROUP_TAGS.road],
        [WORKSHOP_PRODUCT_GROUP_TAGS.gravel],
      ),
    ).toMatchObject({
      status: "incident",
      code: "product_tag_mismatch",
    });
    expect(
      validateBundleTagAgreement(
        [WORKSHOP_BUNDLE_TAGS.road],
        [[WORKSHOP_PRODUCT_GROUP_TAGS.gravel]],
      ),
    ).toMatchObject({
      status: "incident",
      code: "bundle_product_group_mismatch",
    });
    expect(
      validateBundleTagAgreement(
        [],
        [[WORKSHOP_PRODUCT_GROUP_TAGS.road]],
      ),
    ).toMatchObject({
      status: "incident",
      code: "bundle_product_group_mismatch",
    });
    expect(
      validateBundleTagAgreement(
        [WORKSHOP_BUNDLE_TAGS.road],
        [
          [WORKSHOP_PRODUCT_GROUP_TAGS.road],
          [WORKSHOP_PRODUCT_GROUP_TAGS.road],
        ],
      ),
    ).toMatchObject({
      status: "incident",
      code: "bundle_product_group_mismatch",
    });
  });
});
