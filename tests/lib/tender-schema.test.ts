import assert from 'node:assert/strict';
import test from 'node:test';
import { createTenderSchema } from '../../src/lib/schemas/tender';

test('accepts a valid structured construction tender', () => {
  const result = createTenderSchema.safeParse({
    projectName: 'Warehouse concrete supply',
    category: 'Materials',
    subcategory: 'Aggregates',
    location: 'Leeds LS10',
    quantity: '20 tonnes',
    urgency: 'standard',
    closingDate: '2099-08-27',
    budget: '1200',
    requirements: ['Delivery to site required'],
    description: 'Twenty tonnes of aggregate with delivery to the project site.',
  });

  assert.equal(result.success, true);
});

test('rejects a subcategory from a different category', () => {
  const result = createTenderSchema.safeParse({
    projectName: 'Plant requirement',
    category: 'Plant hire',
    subcategory: 'Aggregates',
    location: 'Leeds',
    quantity: '1 unit',
    urgency: 'urgent',
    closingDate: '2099-08-27',
    description: 'An excavator is required for groundworks on site.',
  });

  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.error.issues.some((issue) => issue.path[0] === 'subcategory'), true);
});

test('rejects a closing date in the past', () => {
  const result = createTenderSchema.safeParse({
    projectName: 'Past requirement',
    category: 'Waste',
    subcategory: 'Skip hire',
    location: 'Leeds',
    quantity: '1 skip',
    urgency: 'standard',
    closingDate: '2020-01-01',
    description: 'This tender has a date that has already passed.',
  });

  assert.equal(result.success, false);
});
