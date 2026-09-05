import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const pagePath = path.join(process.cwd(), 'src/app/client/tenders/new/page.tsx');

test('Contractor tender builder sequences selected service package requirements', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.ok(source.includes("{ id: 2, label: 'Tender Packages' }"));
  assert.ok(source.includes("{ id: 5, label: 'Review & Submit' }"));
  assert.ok(!source.includes("{ id: 6, label: 'Review & Submit' }"));
  assert.ok(source.indexOf('id="closing-date"') < source.indexOf('{step === 2 && ('));
  assert.ok(source.includes("{step === 2 && ("));
  assert.ok(source.includes('activePackageIndex'));
  assert.ok(source.includes('Complete this service package before moving to the next selected service.'));
  assert.ok(source.includes('Add another item'));
  assert.ok(source.includes("Package 1: {form.item || form.subcategory || 'Untitled package'}"));
  assert.ok(source.includes('const isActive = index === activePackageIndex - 1;'));
  assert.ok(source.includes('item.category === activeCategory'));
  assert.ok(source.includes('Edit details'));
  assert.ok(source.includes('Remove contact details'));
  assert.ok(source.includes('getServiceSenseCheck'));
  assert.ok(source.includes('Groundworks'));
  assert.ok(source.includes('days'));
  assert.ok(source.includes('weeks'));
  assert.ok(source.includes('id="quantity-value"'));
  assert.ok(source.includes('id="primary-item-description"'));
  assert.ok(source.includes("update('primaryItemDescription', event.target.value)"));
  assert.ok(source.includes('id="description"'));
  assert.ok(source.includes('Detailed provision (optional)'));
  assert.ok(source.includes("provision: 'Material category'"));
  assert.ok(!source.includes("if (!form.item) next.item = 'Select an item.';"));
  assert.ok(source.includes('id={`item-${index}-quantity`}'));
  assert.ok(source.includes('id={`item-${index}-description`}'));
  assert.ok(source.includes('Services to tender'));
  assert.ok(source.includes('sm:grid-cols-2'));
  assert.ok(source.includes("searchParams.get('copyFrom')"));
  assert.ok(source.includes('loadTenderForRetender'));
  assert.ok(source.includes('const [packagesNeedReset, setPackagesNeedReset] = useState(true);'));
  assert.ok(source.includes('if (step === 1 && packagesNeedReset)'));
  assert.ok(source.includes('ReviewSection title="Additional Requirements" onEdit={() => setStep(3)}'));
  assert.ok(source.includes('ReviewSection title="Attachments" onEdit={() => setStep(4)}'));
  assert.ok(source.includes('function ReviewSection({ title, onEdit, children }'));
  assert.ok(source.includes('const [furthestStep, setFurthestStep] = useState(1);'));
  assert.ok(source.includes('onStepClick={fastTravel}'));
});