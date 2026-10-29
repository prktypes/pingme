import type { IconName } from '@/components/iconNames';

export type PlaceCategoryDefinition = {
  id: string;
  label: string;
  pluralLabel: string;
  proximityLabel: string;
  googleType: string;
  icon: IconName;
};

export const PLACE_CATEGORIES = [
  {
    id: 'supermarket',
    label: 'Supermarket',
    pluralLabel: 'supermarkets',
    proximityLabel: 'a supermarket',
    googleType: 'supermarket',
    icon: 'store',
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    pluralLabel: 'pharmacies',
    proximityLabel: 'a pharmacy',
    googleType: 'pharmacy',
    icon: 'pharmacy',
  },
  {
    id: 'bank',
    label: 'Bank',
    pluralLabel: 'banks',
    proximityLabel: 'a bank',
    googleType: 'bank',
    icon: 'bank',
  },
  {
    id: 'petrol',
    label: 'Petrol station',
    pluralLabel: 'petrol stations',
    proximityLabel: 'a petrol station',
    googleType: 'gas_station',
    icon: 'fuel',
  },
  {
    id: 'atm',
    label: 'ATM',
    pluralLabel: 'ATMs',
    proximityLabel: 'an ATM',
    googleType: 'atm',
    icon: 'atm',
  },
  {
    id: 'post_office',
    label: 'Post office',
    pluralLabel: 'post offices',
    proximityLabel: 'a post office',
    googleType: 'post_office',
    icon: 'post',
  },
  {
    id: 'hospital',
    label: 'Hospital',
    pluralLabel: 'hospitals',
    proximityLabel: 'a hospital',
    googleType: 'hospital',
    icon: 'hospital',
  },
  {
    id: 'hardware',
    label: 'Hardware store',
    pluralLabel: 'hardware stores',
    proximityLabel: 'a hardware store',
    googleType: 'hardware_store',
    icon: 'hardware',
  },
  {
    id: 'laundromat',
    label: 'Laundromat',
    pluralLabel: 'laundromats',
    proximityLabel: 'a laundromat',
    googleType: 'laundromat',
    icon: 'laundry',
  },
] as const satisfies readonly PlaceCategoryDefinition[];

export type PlaceCategoryId = (typeof PLACE_CATEGORIES)[number]['id'];

export const DEFAULT_CATEGORY_ID: PlaceCategoryId = 'supermarket';

export function isPlaceCategoryId(value: unknown): value is PlaceCategoryId {
  return (
    typeof value === 'string' && PLACE_CATEGORIES.some((category) => category.id === value)
  );
}

export function getCategory(id: string | null | undefined): PlaceCategoryDefinition | null {
  if (!id) return null;
  return PLACE_CATEGORIES.find((category) => category.id === id) ?? null;
}

export function categoryLabel(id: string | null | undefined): string {
  return getCategory(id)?.label ?? 'Category';
}

export function categoryProximityLabel(id: string | null | undefined): string {
  return getCategory(id)?.proximityLabel ?? 'a place';
}
