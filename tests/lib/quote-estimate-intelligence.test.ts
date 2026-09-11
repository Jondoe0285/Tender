import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyEstimateOffset,
  applyMasterEstimateReduction,
  buildEstimateBaselineKey,
  buildPricingCatalogue,
  calculateAutomaticOffsetPercent,
  calculateEstimateVariancePercent,
  convertQuantityToStandardUnit,
  estimateTenderQuoteValue,
  effectiveBaselineOffsetPercent,
  getUtcWeekStart,
  selectBottomThirdPriceScale,
  standardUnitForPurchase,
  unitPriceFromQuoteLine,
} from '@/server/domain/quoteEstimateService';
import { calculateTenderUnlockDynamicFeeGbp } from '@/server/domain/platformSettings';

describe('quote estimate intelligence', () => {
  it('applies the owner offset as a percentage of the estimate', () => {
    assert.equal(applyEstimateOffset(2500, 12.5), 2812.5);
  });

  it('calculates estimate variance as a percentage difference from actual quoted value', () => {
    assert.equal(calculateEstimateVariancePercent(2000, 2200), 10);
    assert.equal(calculateEstimateVariancePercent(2000, 1800), -10);
  });

  it('derives an internal estimate from the tender item mix and category baseline', () => {
    const estimate = estimateTenderQuoteValue({
      category: 'Groundworks',
      items: [
        { category: 'Groundworks', item: 'Concrete', quantity: '12', description: 'C25 mix' },
        { category: 'Groundworks', item: 'Aggregate', quantity: '4', description: 'Topsoil' },
      ],
    }, {
      Groundworks: 1200,
    });

    assert.ok(estimate > 0);
    assert.ok(estimate > 1000);
  });

  it('uses a bottom-third pricing scale instead of a straight average when prices conflict', () => {
    const prices = [400, 450, 500, 1200, 1400, 1600, 5000, 5200, 5400];

    assert.equal(selectBottomThirdPriceScale(prices), 450);
  });

  it('calculates the weekly review period from Monday UTC', () => {
    assert.equal(getUtcWeekStart(new Date('2026-09-11T12:00:00.000Z')).toISOString(), '2026-09-07T00:00:00.000Z');
  });

  it('uses the same staged progression for dynamic tender unlock pricing', () => {
    assert.equal(calculateTenderUnlockDynamicFeeGbp(150000, 1, 0.5, 0.25), 675);
  });

  it('builds product-category baseline keys from service, category, and item', () => {
    assert.equal(buildEstimateBaselineKey('Materials', 'Bricks', 'Facing bricks'), 'Materials > Bricks > Facing bricks');
  });

  it('applies a master reduction after item estimates for the fee basis', () => {
    assert.equal(applyMasterEstimateReduction(100000, 5), 95000);
  });

  it('uses manual item offset when the owner overrides automatic pricing intelligence', () => {
    assert.equal(effectiveBaselineOffsetPercent({ automaticOffsetPercent: -7.5, manualOffsetPercent: 2.25, offsetMode: 'MANUAL' }), 2.25);
    assert.equal(effectiveBaselineOffsetPercent({ automaticOffsetPercent: -7.5, manualOffsetPercent: 2.25, offsetMode: 'AUTOMATIC' }), -7.5);
  });

  it('calculates automatic offset from reviewed live-data baseline movement', () => {
    assert.equal(calculateAutomaticOffsetPercent(1000, 925), -7.5);
  });

  it('defines standard estimate units for potential purchases', () => {
    assert.deepEqual(standardUnitForPurchase('Materials', 'Bricks', 'Facing bricks'), { standardUnit: 'units', standardUnitSize: 1000 });
    assert.deepEqual(standardUnitForPurchase('Plant Hire', 'Excavators', 'Mini excavators approx. 1.5-3 tonnes'), { standardUnit: 'week', standardUnitSize: 1 });
  });

  it('converts quote quantities into the standard estimate unit', () => {
    assert.equal(convertQuantityToStandardUnit('4,000 units', 'units', 1000), 4);
    assert.equal(convertQuantityToStandardUnit('10 days', 'week', 1), 2);
  });

  it('calculates live quotation price per standard estimate unit', () => {
    assert.equal(unitPriceFromQuoteLine(2400, '4,000 units', 'units', 1000), 600);
  });

  it('lists potential purchases from the platform catalogue before live data exists', () => {
    const catalogue = buildPricingCatalogue();

    assert.ok(catalogue.some((row) => row.key === 'Materials > Bricks > Facing bricks'));
    assert.ok(catalogue.some((row) => row.key === 'Professional Services > Safety, Compliance & Consultancy'));
  });
});
