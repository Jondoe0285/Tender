import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { uniqueServicesFromStoredList } from '../../src/lib/categories';
import { countCompaniesByService } from '../../src/server/domain/registeredCompanyCounts';

test('stored company services keep catalog names and allow more than one type', () => {
  assert.deepEqual(uniqueServicesFromStoredList('Materials,Waste,Materials'), ['Materials', 'Waste']);
  assert.deepEqual(uniqueServicesFromStoredList('plant hire,Contractor Services'), ['Plant Hire', 'Contractor Services']);
  assert.deepEqual(uniqueServicesFromStoredList(''), []);
});

test('company type counts are unique companies per service, not extra users', () => {
  const counted = countCompaniesByService([
    { categories: 'Materials,Waste' },
    { categories: 'Materials' },
    { categories: 'Contractor Services,Plant Hire' },
    { categories: 'plant hire' },
    { categories: '' },
  ]);
  assert.equal(counted.uniqueCompanies, 5);
  assert.deepEqual(
    Object.fromEntries(counted.types.map((row) => [row.key, row.companies])),
    {
      Materials: 2,
      Waste: 1,
      'Plant Hire': 2,
      'Contractor Services': 1,
      'Professional Services': 0,
    },
  );
});

test('Super User dashboard shows registered company counts by type', () => {
  const dashboard = readFileSync('src/app/super-user/page.tsx', 'utf8');
  const panel = readFileSync('src/components/admin/RegisteredCompanyCounts.tsx', 'utf8');
  const query = readFileSync('src/server/domain/registeredCompanyCounts.ts', 'utf8');
  assert.match(dashboard, /RegisteredCompanyCounts/);
  assert.match(panel, /Counts unique companies/);
  assert.match(query, /retailerProfile\.findMany/);
  assert.match(query, /suspended: false/);
  assert.doesNotMatch(query, /RetailerTeamMember/);
});
