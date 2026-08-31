export type PassportAddress = {
  country: string | null;
  region: string | null;
  city: string | null;
  street: string | null;
  zip: string | null;
};

export type CustomerPassport = {
  booqableCustomerId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  address: PassportAddress | null;
};

type JsonApiResource = {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
};

export class InvalidLandingCustomerError extends Error {
  readonly code = "INVALID_CUSTOMER";

  constructor(message = "INVALID_CUSTOMER") {
    super(message);
    this.name = "InvalidLandingCustomerError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asResource(value: unknown): JsonApiResource | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.type !== "string") return null;
  const attributes = isRecord(value.attributes) ? value.attributes : {};
  return { id: value.id, type: value.type, attributes };
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function formatBirthday(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();
  const parts = trimmed.split("-");
  let candidate = trimmed;

  if (parts.length === 3 && parts[2].length === 4 && parts[0].length !== 4) {
    candidate = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  return isCalendarDate(candidate) ? candidate : null;
}

function properties(attrs: Record<string, unknown> | undefined): Record<string, unknown> {
  return isRecord(attrs?.properties) ? attrs.properties : {};
}

function addressFromRecord(value: Record<string, unknown>): PassportAddress | null {
  const street =
    toStringOrNull(value.address1) ??
    toStringOrNull(value.street) ??
    toStringOrNull(value.address_line_1);
  const city = toStringOrNull(value.city);
  const region =
    toStringOrNull(value.region) ??
    toStringOrNull(value.state) ??
    toStringOrNull(value.province);
  const zip =
    toStringOrNull(value.zipcode) ??
    toStringOrNull(value.zip) ??
    toStringOrNull(value.postal_code);
  const country = toStringOrNull(value.country);
  if (!street && !city && !region && !zip && !country) return null;
  return { street, city, region, zip, country };
}

function includedResources(payload: Record<string, unknown>): JsonApiResource[] {
  if (!Array.isArray(payload.included)) return [];
  const resources: JsonApiResource[] = [];
  for (const entry of payload.included) {
    const resource = asResource(entry);
    if (resource) resources.push(resource);
  }
  return resources;
}

function includedProperties(resources: JsonApiResource[]): JsonApiResource[] {
  return resources.filter((resource) => resource.type === "properties");
}

function phoneFromIncluded(resources: JsonApiResource[]): string | null {
  for (const resource of includedProperties(resources)) {
    const attrs = resource.attributes ?? {};
    const identifier = toStringOrNull(attrs.identifier);
    const propertyType = toStringOrNull(attrs.property_type);
    if (propertyType === "phone" || identifier === "phone") {
      const value = toStringOrNull(attrs.value);
      if (value) return value;
    }
  }
  return null;
}

function birthdayFromIncluded(resources: JsonApiResource[]): string | null {
  for (const resource of includedProperties(resources)) {
    const attrs = resource.attributes ?? {};
    const identifier = toStringOrNull(attrs.identifier);
    if (identifier === "birthday_date" || identifier === "birthday") {
      return toStringOrNull(attrs.value);
    }
  }
  return null;
}

function addressFromIncluded(resources: JsonApiResource[]): PassportAddress | null {
  for (const resource of includedProperties(resources)) {
    const attrs = resource.attributes ?? {};
    const identifier = toStringOrNull(attrs.identifier);
    const propertyType = toStringOrNull(attrs.property_type);
    if (propertyType !== "address" && identifier !== "address") continue;
    const address = addressFromRecord(attrs);
    if (address) return address;
  }
  return null;
}

function addressFromProps(props: Record<string, unknown>): PassportAddress | null {
  const nested = props.address;
  if (isRecord(nested)) {
    const fromNested = addressFromRecord(nested);
    if (fromNested) return fromNested;
  }
  return addressFromRecord(props);
}

/**
 * JSON:API customer document → landing passport. Address comes from
 * sideloaded properties or a structured properties hash — never from a
 * webhook form body.
 */
export function parseLandingCustomer(payload: unknown): CustomerPassport {
  if (!isRecord(payload)) {
    throw new InvalidLandingCustomerError();
  }

  const customer = asResource(payload.data);
  if (!customer || customer.type !== "customers") {
    throw new InvalidLandingCustomerError();
  }

  const attrs = customer.attributes ?? {};
  const props = properties(attrs);
  const included = includedResources(payload);

  return {
    booqableCustomerId: customer.id,
    name: toStringOrNull(attrs.name),
    email: toStringOrNull(attrs.email),
    phone: toStringOrNull(props.phone) ?? phoneFromIncluded(included),
    birthday: formatBirthday(
      toStringOrNull(props.birthday_date) ??
        toStringOrNull(props.birthday) ??
        birthdayFromIncluded(included),
    ),
    address: addressFromIncluded(included) ?? addressFromProps(props),
  };
}
