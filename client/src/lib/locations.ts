import UZ_LOCATIONS_JSON from "@/lib/uz_locations.json";

type RegionEntry = Record<string, unknown>;
type RegionMap = Record<string, RegionEntry>;

function normalizeRegionMap(raw: unknown): RegionMap {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const mapped: RegionMap = {};
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const name =
        (entry as any).name ||
        (entry as any).title ||
        (entry as any).region ||
        (entry as any).viloyat;
      if (typeof name === "string" && name.trim()) {
        mapped[name.trim()] = entry as RegionEntry;
      }
    }
    return mapped;
  }
  if (typeof raw === "object") {
    return raw as RegionMap;
  }
  return {};
}

function normalizeList(items?: unknown): string[] {
  if (!items) return [];
  if (Array.isArray(items)) {
    return items
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => item.trim())
      .filter((item, index, arr) => arr.indexOf(item) === index)
      .sort((a, b) => a.localeCompare(b, "uz"));
  }
  return [];
}

const REGION_MAP = normalizeRegionMap(UZ_LOCATIONS_JSON);

export function getRegions(): string[] {
  return Object.keys(REGION_MAP).sort((a, b) => a.localeCompare(b, "uz"));
}

export function getDistricts(region?: string): string[] {
  if (!region) return [];
  const entry = REGION_MAP[region];
  if (!entry) return [];
  const candidates = [
    (entry as any).districts,
    (entry as any).tumanlar,
    (entry as any).district,
  ];
  for (const candidate of candidates) {
    const list = normalizeList(candidate);
    if (list.length) return list;
  }
  return [];
}

export function getCities(region?: string, district?: string): string[] {
  if (!region || !district) return [];
  const entry = REGION_MAP[region];
  if (!entry) return [];
  const cities = (entry as any).cities || (entry as any).shaharlar || (entry as any).shahar;
  if (Array.isArray(cities)) {
    const list = normalizeList(cities);
    if (list.length) return list;
  }
  if (cities && typeof cities === "object") {
    const list = (cities as Record<string, unknown>)[district];
    if (Array.isArray(list)) {
      const normalized = normalizeList(list);
      if (normalized.length) return normalized;
    }
  }
  const mahallas = (entry as any).mahallas || (entry as any).mahalla;
  if (mahallas && typeof mahallas === "object") {
    const byDistrict = (mahallas as Record<string, unknown>)[district];
    if (byDistrict && typeof byDistrict === "object" && !Array.isArray(byDistrict)) {
      return Object.keys(byDistrict).sort((a, b) => a.localeCompare(b, "uz"));
    }
  }
  return [];
}

export function getMahallas(
  region?: string,
  district?: string,
  city?: string,
): string[] {
  if (!region || !district) return [];
  const entry = REGION_MAP[region];
  if (!entry) return [];
  const mahallas = (entry as any).mahallas || (entry as any).mahalla;
  if (!mahallas || typeof mahallas !== "object") return [];
  const byDistrict = (mahallas as Record<string, unknown>)[district];
  if (!byDistrict) return [];
  if (Array.isArray(byDistrict)) return normalizeList(byDistrict);
  if (typeof byDistrict === "object") {
    if (city) {
      const byCity = (byDistrict as Record<string, unknown>)[city];
      return normalizeList(byCity);
    }
    const flattened = Object.values(byDistrict).flatMap((value) =>
      Array.isArray(value) ? value : []
    );
    return normalizeList(flattened);
  }
  return [];
}
