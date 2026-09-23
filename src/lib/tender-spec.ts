export const WASTE_CONTAINERS = ['skip', 'grab', 'roll-on'] as const;
export type WasteContainer = (typeof WASTE_CONTAINERS)[number];

export const MATERIAL_PACKS = ['bag', 'pallet', 'pack', 'bulk', 'each'] as const;
export type MaterialPack = (typeof MATERIAL_PACKS)[number];

export const MEASURED_CONTRACTOR_UNITS = ['m', 'm²', 'm³', 'nr', 'item', 'week'] as const;
export type MeasuredContractorUnit = (typeof MEASURED_CONTRACTOR_UNITS)[number];

export const COMMON_EWC_CODES = [
  { code: '17 01 01', label: 'Concrete' },
  { code: '17 01 02', label: 'Bricks' },
  { code: '17 01 03', label: 'Tiles and ceramics' },
  { code: '17 01 07', label: 'Mixtures of concrete, bricks, tiles and ceramics' },
  { code: '17 02 01', label: 'Wood' },
  { code: '17 02 02', label: 'Glass' },
  { code: '17 02 03', label: 'Plastic' },
  { code: '17 03 02', label: 'Bituminous mixtures (non-hazardous)' },
  { code: '17 03 01*', label: 'Bituminous mixtures containing coal tar' },
  { code: '17 04 05', label: 'Iron and steel' },
  { code: '17 04 07', label: 'Mixed metals' },
  { code: '17 05 04', label: 'Soil and stones (non-hazardous)' },
  { code: '17 05 03*', label: 'Soil and stones containing hazardous substances' },
  { code: '17 06 04', label: 'Insulation materials (non-hazardous)' },
  { code: '17 06 01*', label: 'Insulation materials containing asbestos' },
  { code: '17 08 02', label: 'Gypsum-based construction materials' },
  { code: '17 09 04', label: 'Mixed construction and demolition wastes' },
  { code: '15 01 01', label: 'Paper and cardboard packaging' },
  { code: '15 01 02', label: 'Plastic packaging' },
  { code: '20 03 01', label: 'Mixed municipal waste' },
] as const;

const EWC_PATTERN = /^\d{2} \d{2} \d{2}\*?$/;
const WASTE_TONNES_PATTERN = /^\d+(?:\.\d+)? tonnes$/;

export type TenderLineSpec = {
  ewcCode?: string;
  hazardous?: boolean;
  container?: WasteContainer;
  dimension?: string;
  materialClass?: string;
  standard?: string;
  pack?: MaterialPack;
  plantClass?: string;
  capacity?: string;
  period?: string;
};

function serviceKind(service: string | undefined): 'waste' | 'materials' | 'plant' | 'other' {
  const value = String(service ?? '').trim().toLowerCase();
  if (value === 'waste') return 'waste';
  if (value === 'materials') return 'materials';
  if (value === 'plant hire') return 'plant';
  return 'other';
}

export function isListedEwcCode(code: string): boolean {
  return COMMON_EWC_CODES.some((entry) => entry.code === code);
}

export function isValidEwcCode(code: string): boolean {
  return EWC_PATTERN.test(code.trim());
}

export function parseSpecJson(value: string | null | undefined): TenderLineSpec {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as TenderLineSpec;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function serialiseSpec(spec: TenderLineSpec | null | undefined): string {
  return JSON.stringify(spec ?? {});
}

export function formatSpecPreview(spec: TenderLineSpec | null | undefined): string {
  if (!spec) return '';
  const parts: string[] = [];
  if (spec.ewcCode) parts.push(`EWC ${spec.ewcCode}`);
  if (spec.hazardous === true) parts.push('Hazardous');
  if (spec.hazardous === false && spec.ewcCode) parts.push('Non-hazardous');
  if (spec.container) parts.push(spec.container === 'roll-on' ? 'Roll-on container' : spec.container);
  if (spec.dimension) parts.push(spec.dimension);
  if (spec.materialClass) parts.push(spec.materialClass);
  if (spec.standard) parts.push(spec.standard);
  if (spec.pack) parts.push(spec.pack);
  if (spec.plantClass) parts.push(spec.plantClass);
  if (spec.capacity) parts.push(spec.capacity);
  if (spec.period) parts.push(spec.period);
  return parts.join(' · ');
}

function trimmed(value: string | undefined): string {
  return String(value ?? '').trim();
}

export function specIssues(service: string | undefined, spec: TenderLineSpec | undefined, quantity: string): string[] {
  const issues: string[] = [];
  const kind = serviceKind(service);
  const quantityValue = quantity.trim().replace(/,/g, '');

  if (kind === 'waste') {
    const code = trimmed(spec?.ewcCode);
    if (!isValidEwcCode(code)) issues.push('Enter a List of Wastes (EWC) code in the form 17 05 04');
    if (spec?.hazardous !== true && spec?.hazardous !== false) issues.push('Say whether the waste is hazardous');
    if (code.endsWith('*') && spec?.hazardous !== true) issues.push('Starred EWC codes must be marked hazardous');
    if (!spec?.container || !WASTE_CONTAINERS.includes(spec.container)) issues.push('Select skip, grab, or roll-on as the container');
    if (!WASTE_TONNES_PATTERN.test(quantityValue)) issues.push('Waste quantity must be a number of tonnes');
  }

  if (kind === 'materials') {
    if (trimmed(spec?.dimension).length < 1) issues.push('Enter a dimension or size (for example 215 mm or 20 mm)');
    if (trimmed(spec?.materialClass).length < 1) issues.push('Enter the material class or grade');
    if (trimmed(spec?.standard).length < 1) issues.push('Enter the standard or specification (for example BS EN or SHW)');
    if (!spec?.pack || !MATERIAL_PACKS.includes(spec.pack)) issues.push('Select a pack type');
  }

  if (kind === 'plant') {
    if (trimmed(spec?.plantClass).length < 1) issues.push('Enter the plant class');
    if (trimmed(spec?.capacity).length < 1) issues.push('Enter plant capacity (for example 3 tonnes or 22 m)');
    if (trimmed(spec?.period).length < 1 && !/^\d+(?:\.\d+)? (?:days|weeks|months)$/.test(quantityValue)) {
      issues.push('Enter the hire period');
    }
  }

  return issues;
}

export function emptyLineSpec(): TenderLineSpec {
  return {};
}
