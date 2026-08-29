import assert from 'node:assert/strict';
import test from 'node:test';
import { createTenderSchema } from '../../src/lib/schemas/tender';

test('accepts multiple construction items in one tender project', () => {
  const result = createTenderSchema.safeParse({
    projectName: 'Residential extension package',
    category: 'Materials',
    subcategory: 'Bricks and blocks',
    location: 'Leeds LS10 2AB',
    quantity: '4,000 units',
    urgency: 'standard',
    closingDate: '2099-08-27',
    description: 'Primary brick and block package for the extension project.',
    items: [
      { category: 'Waste', subcategory: 'Skip hire', quantity: '2 skips', description: 'Two eight-yard skips required during demolition.' },
      { category: 'Plant hire', subcategory: 'Excavators', quantity: '1 unit', description: 'One excavator required for groundworks and loading.' },
      { category: 'Materials', subcategory: 'Bricks and blocks', quantity: '2,000 units', description: 'Additional engineering blocks for the retaining wall.' },
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
    urgency: 'standard',
    closingDate: '2099-08-27',
    description: 'A mixed package for a construction project.',
    items: [{ category: 'Waste', subcategory: 'Aggregates', quantity: '2 tonnes', description: 'This item has an invalid category pairing.' }],
  });

  assert.equal(result.success, false);
});
