import { test, expect } from '@playwright/test';
import { resolveToCode, getTicketPrice, getClassesToShow } from '../src/utils/trainUtils';

test.describe('trainUtils.ts - Unit Tests', () => {

  test.describe('resolveToCode', () => {
    test('should resolve names in [CODE] format', () => {
      expect(resolveToCode('New Delhi [NDLS]')).toBe('NDLS');
      expect(resolveToCode('Howrah Jn [HWH]')).toBe('HWH');
      expect(resolveToCode('Secunderabad [SC]')).toBe('SC');
    });

    test('should resolve common names without code', () => {
      expect(resolveToCode('New Delhi')).toBe('NDLS');
      expect(resolveToCode('Kolkata')).toBe('HWH');
      expect(resolveToCode('Hyderabad')).toBe('SC');
      expect(resolveToCode('Pune')).toBe('PUNE');
    });

    test('should clean suffixes like JN, JUNCTION, STATION', () => {
      expect(resolveToCode('Lucknow JN')).toBe('LUCKNOW');
      expect(resolveToCode('Agra Junction')).toBe('AGRA');
      expect(resolveToCode('Ambala Station')).toBe('AMBALA');
    });

    test('should return uppercase trimmed string as fallback', () => {
      expect(resolveToCode('unknown-station')).toBe('UNKNOWN-STATION');
    });
  });

  test.describe('getClassesToShow', () => {
    test('should return filtered available classes if provided', () => {
      const available = ['SL', '3A', '2A', 'unknown'];
      expect(getClassesToShow(available, 'Some Train')).toEqual(['SL', '3A', '2A']);
    });

    test('should use heuristic for premium trains if no classes provided', () => {
      expect(getClassesToShow(undefined, 'RAJDHANI EXP')).toEqual(['3A', '2A', '1A']);
      expect(getClassesToShow([], 'VANDE BHARAT')).toEqual(['3A', '2A', '1A']);
    });

    test('should use general heuristic for non-premium trains (no CC by default)', () => {
      expect(getClassesToShow(undefined, 'GENERAL EXPRESS')).toEqual(['SL', '3A', '2A']);
      expect(getClassesToShow(undefined, 'SF MAIL')).toEqual(['SL', '3A', '2A']);
      expect(getClassesToShow(undefined, 'SMVT BENGALURU SF EXPRESS')).toEqual(['SL', '3A', '2A']);
    });

    test('should show CC for Intercity / Chair Car type trains', () => {
      expect(getClassesToShow(undefined, 'INTERCITY EXPRESS')).toEqual(['SL', '3A', '2A', 'CC']);
      expect(getClassesToShow(undefined, 'JAN SHATABDI EXPRESS')).toEqual(['SL', '3A', '2A', 'CC']);
    });

    test('should show CC when API explicitly returns it in available_classes', () => {
      expect(getClassesToShow(['SL', '3A', 'CC'], 'SOME EXPRESS')).toEqual(['SL', '3A', 'CC']);
    });

    test('should return CC and 2S for Kulik Express by train number or name', () => {
      expect(getClassesToShow(undefined, 'Kulik Express', '13054')).toEqual(['CC', '2S']);
      expect(getClassesToShow(undefined, 'KULIK EXP')).toEqual(['CC', '2S']);
      expect(getClassesToShow(['SL', '3A'], 'Kulik Express', '13054')).toEqual(['CC', '2S']);
    });

    test('should return only 2S for Passenger trains', () => {
      expect(getClassesToShow(undefined, 'Radhikapur - Katihar Passenger', '55707', 'PASSENGER')).toEqual(['2S']);
      expect(getClassesToShow(['SL', '3A'], 'Radhikapur - Katihar Passenger', '55707', 'PASSENGER')).toEqual(['2S']);
      expect(getClassesToShow(undefined, 'Katihar Passgr', '55728')).toEqual(['2S']);
    });

    test('should return only 3A for Humsafar Express trains', () => {
      expect(getClassesToShow(undefined, 'SMVT Bengaluru Humsafar Express', '12504')).toEqual(['3A']);
      expect(getClassesToShow(['SL', '3A', '2A'], 'Humsafar Express')).toEqual(['3A']);
    });
  });

  test.describe('getTicketPrice', () => {
    const defaultCustomPrices: any[] = [];
    const defaultCorridors: any[] = [];

    test('should handle HWH-PUNE hardcoded corridor', () => {
      expect(getTicketPrice('HWH', 'PUNE', 'SL')).toBe(2600);
      expect(getTicketPrice('PUNE', 'HWH', '3A')).toBe(4200);
      expect(getTicketPrice('HWH', 'PUNE', '2A')).toBe(5400);
    });

    test('should apply custom price override if recent', () => {
      const customPrices = [{
        source: 'NDLS',
        destination: 'BOM',
        class: '3A',
        suggestedPrice: 1500,
        updatedAt: new Date().toISOString()
      }];
      expect(getTicketPrice('NDLS', 'BOM', '3A', undefined, undefined, undefined, customPrices)).toBe(1500);
    });

    test('should ignore stale custom price override', () => {
      const staleDate = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const customPrices = [{
        source: 'NDLS',
        destination: 'BOM',
        class: '3A',
        suggestedPrice: 1500,
        updatedAt: staleDate
      }];
      // Fallback to calculation
      const price = getTicketPrice('NDLS', 'BOM', '3A', 'TEST TRAIN', '08:00', undefined, customPrices);
      expect(price).not.toBe(1500);
      expect(price).toBeGreaterThan(0);
    });

    test('should return 0 (On Request) for premium trains without custom price', () => {
      expect(getTicketPrice('NDLS', 'HWH', '3A', 'RAJDHANI EXPRESS')).toBe(0);
      expect(getTicketPrice('SBC', 'MAS', 'CC', 'VANDE BHARAT')).toBe(0);
    });

    test('should use backend trainPrices if provided', () => {
      const trainPrices = { 'SL': 500, '3A': 1200 };
      expect(getTicketPrice('NDLS', 'HWH', 'SL', 'NORMAL EXP', undefined, trainPrices)).toBe(500);
      expect(getTicketPrice('NDLS', 'HWH', '3A', 'NORMAL EXP', undefined, trainPrices)).toBe(1200);
    });

    test('should apply dynamic corridor markup', () => {
      const corridors = [{
        name: 'North-East Express',
        originStations: JSON.stringify(['NDLS', 'ANVT']),
        destinationStations: JSON.stringify(['GHY', 'NJP']),
        markupSL: 1800,
        markup3A: 2800,
        markup2A: 3800
      }];
      // 'ANY TRAIN' variation: 646 % 10 = 6, 6 * 5 = 30
      // result = 1800 + 30 = 1830
      const price = getTicketPrice('NDLS', 'GHY', 'SL', 'ANY TRAIN', undefined, undefined, [], corridors);
      expect(price).toBe(1830);
    });

    test('should fallback to duration-based calculation', () => {
      // 10 hours travel time
      const priceSL = getTicketPrice('ABC', 'XYZ', 'SL', 'LOCAL EXP', '10:00');
      // baseSL = 150 + (35 * 10) = 500
      // result = 500 + 200 + 1200 = 1900
      // 'LOCAL EXP' variation: 632 % 10 = 2, 2 * 5 = 10
      // total = 1910
      expect(priceSL).toBe(1910);
    });

    test('should apply superfast charges', () => {
      const priceSF = getTicketPrice('ABC', 'XYZ', 'SL', 'SF EXPRESS', '10:00');
      const priceNormal = getTicketPrice('ABC', 'XYZ', 'SL', 'NORMAL TRAIN', '10:00');
      expect(priceSF).toBeGreaterThan(priceNormal);
    });
  });
});
