import { CalculationStatus } from '../types';

// ─── ID Generator ──────────────────────────────────────────────────────────────

export const IdGenerator = {
  generate: (prefix: string): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  },
};

// ─── Calculation Utilities ─────────────────────────────────────────────────────

export const CalcUtils = {
  round: (value: number, decimals = 2): number => {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  },

  percentage: (value: number, total: number, decimals = 2): number => {
    if (total === 0) return 0;
    return CalcUtils.round((value / total) * 100, decimals);
  },

  divide: (numerator: number, denominator: number, fallback = 0): number => {
    if (denominator === 0) return fallback;
    return numerator / denominator;
  },

  sum: (values: number[]): number =>
    values.reduce((acc, val) => acc + (val || 0), 0),

  average: (values: number[]): number => {
    if (values.length === 0) return 0;
    return CalcUtils.sum(values) / values.length;
  },

  clamp: (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value)),

  ratioChange: (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return CalcUtils.round(((current - previous) / Math.abs(previous)) * 100);
  },

  max: (values: number[]): number => Math.max(...values),

  min: (values: number[]): number => Math.min(...values),
};

// ─── Validator ─────────────────────────────────────────────────────────────────

export const Validator = {
  isPositive: (value: number): boolean => value > 0,
  isNonNegative: (value: number): boolean => value >= 0,
  isValidPercentage: (value: number): boolean => value >= 0 && value <= 100,
  isValidCurrency: (amount: number): boolean => isFinite(amount) && !isNaN(amount),
  allPositive: (values: number[]): boolean => values.every((v) => v > 0),
  allNonNegative: (values: number[]): boolean => values.every((v) => v >= 0),
  hasRequiredFields: (
    obj: Record<string, unknown>,
    fields: string[]
  ): boolean =>
    fields.every((field) => obj[field] !== undefined && obj[field] !== null),
};

// ─── Status Determiner ─────────────────────────────────────────────────────────

export const StatusDeterminer = {
  /**
   * Determine status from a numeric ratio.
   * @param higherIsBetter - when true, higher values yield better status (default)
   */
  fromRatio: (
    ratio: number,
    thresholds: { excellent?: number; good: number; warning: number },
    higherIsBetter = true
  ): CalculationStatus => {
    if (higherIsBetter) {
      if (thresholds.excellent !== undefined && ratio >= thresholds.excellent)
        return 'excellent';
      if (ratio >= thresholds.good) return 'good';
      if (ratio >= thresholds.warning) return 'warning';
      return 'critical';
    } else {
      if (thresholds.excellent !== undefined && ratio <= thresholds.excellent)
        return 'excellent';
      if (ratio <= thresholds.good) return 'good';
      if (ratio <= thresholds.warning) return 'warning';
      return 'critical';
    }
  },

  fromBoolean: (isGood: boolean): CalculationStatus =>
    isGood ? 'good' : 'warning',

  worst: (statuses: CalculationStatus[]): CalculationStatus => {
    const order: CalculationStatus[] = [
      'critical',
      'warning',
      'good',
      'excellent',
      'neutral',
    ];
    return statuses.reduce((worst, status) =>
      order.indexOf(status) < order.indexOf(worst) ? status : worst,
      'excellent' as CalculationStatus
    );
  },
};

// ─── Formatter ─────────────────────────────────────────────────────────────────

export const Formatter = {
  currency: (value: number, currency = 'KES', decimals = 0): string => {
    const symbols: Record<string, string> = {
      KES: 'KES ',
      USD: '$',
      EUR: '€',
      GBP: '£',
      TZS: 'TZS ',
      UGX: 'UGX ',
      RWF: 'RWF ',
      NGN: '₦',
      ZAR: 'R',
      GHS: 'GHS ',
    };
    const symbol = symbols[currency] ?? `${currency} `;
    return `${symbol}${value.toLocaleString('en-KE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  },

  percentage: (value: number, decimals = 1): string =>
    `${value.toFixed(decimals)}%`,

  number: (value: number, decimals = 0): string =>
    value.toLocaleString('en-KE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
};
