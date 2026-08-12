import { describe, expect, it } from 'vitest';

import { createCustomDateFilter, createDateFilter } from './date-range';

const now = new Date('2026-08-11T22:30:00.000Z');

describe('reporting date ranges', () => {
  it.each([
    ['TODAY', '2026-08-12', '2026-08-12', '2026-08-11T21:00:00.000Z', '2026-08-12T20:59:59.999Z'],
    ['LAST_7_DAYS', '2026-08-06', '2026-08-12', '2026-08-05T21:00:00.000Z', '2026-08-12T20:59:59.999Z'],
    ['THIS_MONTH', '2026-08-01', '2026-08-12', '2026-07-31T21:00:00.000Z', '2026-08-12T20:59:59.999Z'],
    ['LAST_MONTH', '2026-07-01', '2026-07-31', '2026-06-30T21:00:00.000Z', '2026-07-31T20:59:59.999Z'],
    ['LAST_30_DAYS', '2026-07-14', '2026-08-12', '2026-07-13T21:00:00.000Z', '2026-08-12T20:59:59.999Z'],
    ['THIS_YEAR', '2026-01-01', '2026-08-12', '2025-12-31T21:00:00.000Z', '2026-08-12T20:59:59.999Z'],
  ] as const)('%s presetini Europe/Istanbul iş günü sınırlarına dönüştürür', (preset, fromDate, toDate, from, to) => {
    expect(createDateFilter(preset, now)).toEqual({ preset, fromDate, toDate, from, to });
  });

  it('özel tarih değerlerini host timezone kullanmadan İstanbul sınırlarına dönüştürür', () => {
    expect(createCustomDateFilter('2026-08-01', '2026-08-10')).toEqual({
      preset: 'CUSTOM',
      fromDate: '2026-08-01',
      toDate: '2026-08-10',
      from: '2026-07-31T21:00:00.000Z',
      to: '2026-08-10T20:59:59.999Z',
    });
  });
});
