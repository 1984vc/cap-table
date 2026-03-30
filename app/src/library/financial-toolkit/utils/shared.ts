// app/src/library/financial-toolkit/utils/shared.ts
/**
 * Shared Utilities - FIXED VERSION
 * Eliminates code duplication across all calculators
 */

import type { ValidationError, Currency } from '../types';

// ═══════════════════════════════════════════════════════════════════
// ID GENERATION
// ═══════════════════════════════════════════════════════════════════

export class IdGenerator {
  static generate(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// CALCULATIONS
// ═══════════════════════════════════════════════════════════════════

export class CalcUtils {
  static variance(actual: number, target: number): {
    variance: number;
    variancePercent: number;
  } {
    const variance = actual - target;
    const variancePercent = target !== 0 ? (variance / Math.abs(target)) * 100 : 0;
    return { variance, variancePercent };
  }

  static percent(part: number, whole: number): number {
    return whole !== 0 ? (part / whole) * 100 : 0;
  }

  static daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  }

  static weekNumber(date: string): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  static round(value: number, decimals: number = 2): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  static growthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? Infinity : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  }
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════

export class Validator {
  static required(value: any, field: string, errors: ValidationError[]): void {
    if (value === undefined || value === null || value === '') {
      errors.push({
        field,
        message: `Field ${field} is required`,
        code: 'REQUIRED'
      });
    }
  }

  static number(
    value: any, 
    field: string, 
    errors: ValidationError[],
    opts?: { min?: number; max?: number; nonNegative?: boolean }
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push({ field, message: `Field ${field} must be a number`, code: 'INVALID_TYPE' });
      return;
    }
    if (opts?.nonNegative && value < 0) {
      errors.push({ field, message: `Field ${field} cannot be negative`, code: 'INVALID_VALUE' });
    }
    if (opts?.min !== undefined && value < opts.min) {
      errors.push({ field, message: `Field ${field} must be >= ${opts.min}`, code: 'OUT_OF_RANGE' });
    }
    if (opts?.max !== undefined && value > opts.max) {
      errors.push({ field, message: `Field ${field} must be <= ${opts.max}`, code: 'OUT_OF_RANGE' });
    }
  }

  static date(value: any, field: string, errors: ValidationError[]): void {
    if (!value) {
      errors.push({ field, message: `Field ${field} is required`, code: 'REQUIRED' });
      return;
    }
    if (isNaN(new Date(value).getTime())) {
      errors.push({ field, message: `Field ${field} must be valid ISO date`, code: 'INVALID_TYPE' });
    }
  }

  static dateRange(start: string, end: string, errors: ValidationError[], prefix = ''): void {
    if (new Date(start) >= new Date(end)) {
      errors.push({
        field: prefix ? `${prefix}.dateRange` : 'dateRange',
        message: 'Start date must be before end date',
        code: 'INVALID_VALUE'
      });
    }
  }

  static array(value: any, field: string, errors: ValidationError[]): void {
    if (!Array.isArray(value) || value.length === 0) {
      errors.push({ field, message: `Field ${field} must be non-empty array`, code: 'REQUIRED' });
    }
  }

  static year(value: any, field: string, errors: ValidationError[], min = 2000, max = 2100): void {
    if (typeof value !== 'number' || value < min || value > max) {
      errors.push({ field, message: `Field ${field} must be between ${min}-${max}`, code: 'OUT_OF_RANGE' });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// STATUS DETERMINATION
// ═══════════════════════════════════════════════════════════════════

export class StatusDeterminer {
  static varianceStatus(
    variancePercent: number,
    thresholds = { onTrack: 5, slightMiss: 10 }
  ): 'on-track' | 'slight-miss' | 'significant-miss' {
    const abs = Math.abs(variancePercent);
    if (abs <= thresholds.onTrack) return 'on-track';
    if (abs <= thresholds.slightMiss) return 'slight-miss';
    return 'significant-miss';
  }

  static healthStatus(
    score: number,
    thresholds = { excellent: 80, good: 60, warning: 40 }
  ): 'excellent' | 'good' | 'warning' | 'critical' {
    if (score >= thresholds.excellent) return 'excellent';
    if (score >= thresholds.good) return 'good';
    if (score >= thresholds.warning) return 'warning';
    return 'critical';
  }

  static trafficLight(value: number, target: number, higherBetter = true): 'green' | 'yellow' | 'red' {
    const ratio = value / target;
    if (higherBetter) {
      if (ratio >= 0.95) return 'green';
      if (ratio >= 0.80) return 'yellow';
      return 'red';
    } else {
      if (ratio <= 1.05) return 'green';
      if (ratio <= 1.20) return 'yellow';
      return 'red';
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════════

export class Formatter {
  static currency(amount: number, currency: Currency = 'KES'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  static percent(value: number, decimals = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  static number(value: number, decimals = 0): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  static date(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
