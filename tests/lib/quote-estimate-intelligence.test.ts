import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyEstimateOffset,
  calculateEstimateVariancePercent,
  estimateTenderQuoteValue,
  getUtcWeekStart,
  selectBottomThirdPriceScale,
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
});
