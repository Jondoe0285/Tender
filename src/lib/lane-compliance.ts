import { REQUIREMENT_OPTIONS } from '@/lib/categories';

export const LANE_COMPLIANCE: Record<string, readonly (typeof REQUIREMENT_OPTIONS)[number][]> = {
  Materials: [
    'Delivery to site required',
    'Timed delivery required',
    'Delivery booking required',
    'Offloading required',
    'Lifting equipment required',
    'Parking or restricted-access arrangements',
  ],
  Waste: [
    'Collection or uplift required',
    'Waste transfer note required',
    'Waste segregation or skip exchange required',
    'Public liability insurance required',
    'Site access required',
  ],
  'Plant Hire': [
    'Driver or operator required',
    'Proof of insurance required',
    'Public liability insurance required',
    'Lift plan required',
    'Site induction required',
    'PPE required',
    'Parking or restricted-access arrangements',
  ],
  'Contractor Services': [
    'SSIP membership required',
    'Risk assessment (RAMS) required',
    'Method statement required',
    'Public liability insurance required',
    'CSCS-certified operative required',
    'Site induction required',
    'PPE required',
    'Pre-start survey or site visit required',
  ],
  'Professional Services': [
    'Proof of insurance required',
    'Pre-start survey or site visit required',
    'Working windows or scheduling constraints',
  ],
};

export function laneComplianceFor(service: string): readonly (typeof REQUIREMENT_OPTIONS)[number][] {
  return LANE_COMPLIANCE[service] ?? [];
}

export function laneComplianceForServices(services: readonly string[]): (typeof REQUIREMENT_OPTIONS)[number][] {
  return [...new Set(services.flatMap((service) => [...laneComplianceFor(service)]))];
}
