import assert from 'node:assert/strict';
import test from 'node:test';
import { createTenderSchema } from '../../src/lib/schemas/tender';

test('accepts multiple construction items in one tender project', () => {
  const result = createTenderSchema.safeParse({
    projectName: 'Residential extension package',
    category: 'Materials',
    subcategory: 'Bricks',
    item: 'Facing bricks',
    location: 'Leeds LS10 2AB',
    quantity: '4000 units',
    itemDescription: 'Primary brick and block specification including delivery assumptions and walling requirements.',
    urgency: 'standard',
    closingDate: '2099-08-27',
    description: 'Primary brick and block package for the extension project.',
    spec: { dimension: '215 mm', materialClass: 'facing', standard: 'BS EN 771-1', pack: 'pack' },
    items: [
      { category: 'Waste', subcategory: 'Mixed construction and demolition waste', item: 'Non-hazardous mixed skips from general site clearance', quantity: '8 tonnes', description: 'Non-hazardous mixed C&D waste from demolition.', spec: { ewcCode: '17 09 04', hazardous: false, container: 'skip' } },
      { category: 'Plant Hire', subcategory: 'Excavators', item: 'Mini excavators approx. 1.5-3 tonnes', quantity: '2 weeks', description: 'One excavator required for groundworks and loading.', spec: { plantClass: 'Excavators', capacity: '3 tonnes', period: '2 weeks' } },
      { category: 'Materials', subcategory: 'Blocks', item: 'Dense concrete blocks', quantity: '2000 units', description: 'Additional engineering blocks for the retaining wall.', spec: { dimension: '440x215x100 mm', materialClass: 'dense', standard: 'BS EN 771-3', pack: 'pack' } },
    ],
  });

  assert.equal(result.success, true);
});

test('rejects a tender item whose subcategory belongs to another category', () => {
  const result = createTenderSchema.safeParse({
    projectName: 'Mixed procurement package',
    category: 'Materials',
    subcategory: 'Aggregates',
    location: 'Leeds LS10 2AB',
    quantity: '20 tonnes',
    itemDescription: 'Aggregate specification including grading, delivery assumptions, and site access constraints.',
    urgency: 'standard',
    closingDate: '2099-08-27',
    description: 'A mixed package for a construction project.',
    items: [{ category: 'Waste', subcategory: 'Aggregates', quantity: '2 tonnes', description: 'This item has an invalid category pairing.' }],
  });

  assert.equal(result.success, false);
});
