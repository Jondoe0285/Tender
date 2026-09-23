import assert from 'node:assert/strict';
import test from 'node:test';
import { SERVICE_CATALOG } from '../../src/lib/categories';
import { issuedTenderSpecHash, hashPackageSpec } from '../../src/lib/package-spec';
import { missingCredentials, packageRequiresHazardousWasteCarrier, requiredUnlockCredentials } from '../../src/lib/package-credentials';
import { laneComplianceFor, laneComplianceForServices } from '../../src/lib/lane-compliance';
import { ATTACHMENT_KINDS } from '../../src/lib/attachment-kinds';
import { retailerCanMatchTender } from '../../src/server/domain/tenderService';
import { STALE_QUOTE_REVISION_MESSAGE } from '../../src/lib/package-spec';

const eligibleRetailer = {
  coverageScope: 'REGION',
  counties: '',
  regions: 'Yorkshire and The Humber',
  categories: 'Waste,Materials',
  serviceProvisions: JSON.stringify(['Waste::Hazardous waste', 'Materials::Reinforcement']),
};

test('catalogue includes merchant, plant, scaffolding, roofing, and training families', () => {
  assert.ok(SERVICE_CATALOG.Materials.Reinforcement.includes('Cut and bent rebar'));
  assert.ok(SERVICE_CATALOG.Materials['Electrical Supplies'].includes('SWA cable'));
  assert.ok(SERVICE_CATALOG.Materials['Mechanical and Plumbing Supplies'].includes('Copper pipe'));
  assert.ok(SERVICE_CATALOG.Materials['Roofing Materials'].includes('Roof tiles'));
  assert.ok(SERVICE_CATALOG['Plant Hire'].Compressors.includes('Portable diesel compressors'));
  assert.ok(SERVICE_CATALOG['Plant Hire']['Temporary site establishment'].includes('Hoarding panels and gates'));
  assert.ok(SERVICE_CATALOG['Contractor Services']['Scaffolding and access'].includes('Independent scaffolding'));
  assert.ok(SERVICE_CATALOG['Contractor Services']['Roofing & Cladding'].includes('Roofing, roof maintenance, cladding and rainwater systems'));
  assert.ok(SERVICE_CATALOG['Professional Services']['Training Providers'].includes('SMSTS'));
  assert.ok(SERVICE_CATALOG.Waste['Skip and container hire'].includes('8 yard skip'));
});

test('package spec hashes are stable and change when quantity changes', () => {
  const base = {
    category: 'Materials',
    subcategory: 'Reinforcement',
    item: 'Cut and bent rebar',
    quantity: '12 tonnes',
    quantityValue: 12,
    unit: 'tonnes',
    description: 'Cut and bent rebar to the issued bending schedule.',
    specJson: '{"dimension":"12 mm","materialClass":"B500B","standard":"BS 4449","pack":"bulk"}',
    requirements: 'Delivery to site required',
  };
  const first = hashPackageSpec(base);
  const second = hashPackageSpec(base);
  assert.equal(first, second);
  assert.notEqual(first, hashPackageSpec({ ...base, quantity: '14 tonnes', quantityValue: 14 }));
  assert.equal(issuedTenderSpecHash([first, first]).length, 64);
});

test('hazardous waste is fail-closed on match without a current WCL', () => {
  const packages = [{ category: 'Waste', subcategory: 'Hazardous waste', specJson: '{"hazardous":true}' }];
  assert.equal(packageRequiresHazardousWasteCarrier(packages[0]!), true);
  assert.equal(retailerCanMatchTender(eligibleRetailer, 'Leeds LS10 2AB', packages), false);
  assert.equal(retailerCanMatchTender(eligibleRetailer, 'Leeds LS10 2AB', packages, [{
    documentType: 'WASTE_CARRIERS_LICENCE',
    verified: true,
    expiryDate: new Date('2099-01-01'),
  }]), true);
});

test('unlock credentials require WCL for waste and PLI for plant', () => {
  assert.deepEqual(requiredUnlockCredentials([{ category: 'Waste', subcategory: 'Inert waste' }]), ['WASTE_CARRIERS_LICENCE']);
  assert.deepEqual(requiredUnlockCredentials([{ category: 'Plant Hire', subcategory: 'Compressors' }]), ['PUBLIC_LIABILITY_INSURANCE']);
  assert.deepEqual(missingCredentials(
    [{ category: 'Professional Services', subcategory: 'Training Providers' }],
    [{ documentType: 'PROFESSIONAL_INDEMNITY_INSURANCE', verified: true, expiryDate: new Date('2020-01-01') }],
    'unlock',
  ), ['PROFESSIONAL_INDEMNITY_INSURANCE']);
});

test('a scaffolding company does not match a roofing-only package', () => {
  const scaffolder = {
    coverageScope: 'COUNTY' as const,
    counties: 'West Yorkshire',
    regions: '',
    categories: 'Contractor Services',
    serviceProvisions: JSON.stringify(['Contractor Services::Scaffolding and access']),
  };
  assert.equal(retailerCanMatchTender(scaffolder, 'Leeds LS10 2AB', [{ category: 'Contractor Services', subcategory: 'Scaffolding and access' }]), true);
  assert.equal(retailerCanMatchTender(scaffolder, 'Leeds LS10 2AB', [{ category: 'Contractor Services', subcategory: 'Roofing & Cladding' }]), false);
  assert.equal(retailerCanMatchTender(scaffolder, 'Leeds LS10 2AB', [
    { category: 'Contractor Services', subcategory: 'Scaffolding and access' },
    { category: 'Contractor Services', subcategory: 'Roofing & Cladding' },
  ]), true);
});

test('lane compliance is gated by selected supply lane', () => {
  assert.ok(laneComplianceFor('Waste').includes('Waste transfer note required'));
  assert.equal(laneComplianceFor('Waste').includes('SSIP membership required'), false);
  assert.ok(laneComplianceForServices(['Contractor Services']).includes('Risk assessment (RAMS) required'));
  assert.ok(ATTACHMENT_KINDS.includes('RAMS'));
  assert.match(STALE_QUOTE_REVISION_MESSAGE, /previous package revision/);
});
