// app/src/library/financial-toolkit/types/index.ts
/**
 * Unified Type Exports - PRODUCTION READY
 * Single source of truth for all type definitions
 * 
 * FIXES APPLIED:
 * ✅ All types exported from single location
 * ✅ No fragmented imports
 * ✅ Currency type properly defined
 */

// ═══════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════

export type Currency = 'USD' | 'EUR' | 'GBP' | 'KES' | 'NGN' | 'ZAR' | 'GHS' | 'TZS' | 'UGX' | 'RWF' | 'XAF' | 'XOF';

export interface ValidationError {
  field: string;
  message: string;
  code: 'REQUIRED' | 'INVALID_TYPE' | 'INVALID_VALUE' | 'OUT_OF_RANGE' | 'BUSINESS_LOGIC_WARNING';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface TimeRange {
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
}

export interface CalculatorMetadata {
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
  deletedAt?: number; // Unix timestamp (soft delete)
}

// ═══════════════════════════════════════════════════════════════════
// RE-EXPORT ALL PHASE TYPES
// ═══════════════════════════════════════════════════════════════════

export * from './phase1-types';
export * from './phase2-types';
export * from './phase3-types';

// ═══════════════════════════════════════════════════════════════════
// SHARED RESULT TYPES
// ═══════════════════════════════════════════════════════════════════

export interface BaseCalculatorResult {
  id: string;
  companyId: string;
  currency: Currency;
  createdAt: number;
  updatedAt: number;
}

export interface InsightResult {
  insights: string[];
  recommendations?: string[];
  alerts?: string[];
}

// ═══════════════════════════════════════════════════════════════════
// INTEGRATION TYPES (for calculator interconnections)
// ═══════════════════════════════════════════════════════════════════

export interface CompanyFinancialSnapshot {
  companyId: string;
  period: string;
  currency: Currency;
  pl?: any; // PLStatement
  balanceSheet?: any; // BalanceSheet
  cashForecast?: any; // CashForecast
  workingCapital?: any; // WorkingCapital
  dashboard?: any; // Dashboard
  capexProjects?: any[]; // Capex[]
  payroll?: any; // Payroll
  taxCalendar?: any; // TaxCalendar
  operationsKPIs?: any; // OperationsKPI
  weeklyReviews?: any[]; // WeeklyReview[]
  actionPlans?: any[]; // ActionPlan[]
}
