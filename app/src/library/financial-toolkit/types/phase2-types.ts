// app/src/library/financial-toolkit/types/phase2-types.ts
/**
 * Phase 2 Calculator Types - CAPEX, Payroll, Tax Calendar, Operations KPIs
 * Production-ready TypeScript definitions
 */

import type { Currency, ValidationResult, ValidationError } from './index';

// ═══════════════════════════════════════════════════════════════════
// CAPEX (Capital Expenditure) TYPES
// ═══════════════════════════════════════════════════════════════════

export interface CapexInput {
  companyId: string;
  currency?: Currency; // Optional, defaults to 'KES'
  projectName: string;
  category: 'equipment' | 'facility' | 'technology' | 'vehicle' | 'other';
  budgeted: number;
  startDate: string; // ISO date
  expectedCompletionDate: string; // ISO date
  approvalStatus: 'proposed' | 'approved' | 'rejected' | 'on-hold';
  approvedBy?: string;
  approvalDate?: string;
  spendToDate?: number;
  expectedAnnualBenefit?: number; // Annual savings/revenue
  expectedUsefulLife?: number; // Years
  plannedPayments?: CapexPayment[];
  notes?: string;
}

export interface CapexPayment {
  date: string; // ISO date
  amount: number;
  description: string;
}

export interface Capex {
  id: string;
  companyId: string;
  projectName: string;
  category: string;
  
  budget: {
    total: number;
    spendToDate: number;
    remaining: number;
    percentComplete: number;
  };
  
  timeline: {
    startDate: string;
    expectedCompletionDate: string;
    status: 'on-track' | 'at-risk' | 'delayed' | 'complete';
    daysRemaining: number;
  };
  
  approval: {
    status: 'proposed' | 'approved' | 'rejected' | 'on-hold';
    approvedBy?: string;
    approvalDate?: string;
  };
  
  financialMetrics: {
    roi?: number; // Return on Investment %
    paybackPeriod?: number; // Years
  };
  
  cashFlow: {
    plannedPayments: CapexPayment[];
    totalPlanned: number;
    paidToDate: number;
    remaining: number;
  };
  
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// ═══════════════════════════════════════════════════════════════════
// PAYROLL TYPES
// ═══════════════════════════════════════════════════════════════════

export interface PayrollInput {
  companyId: string;
  currency?: Currency; // Optional, defaults to 'KES'
  period: string; // e.g., "2026-01" for monthly
  departments: PayrollDepartment[];
  totalRevenue?: number; // For payroll % of revenue calculation
}

export interface PayrollDepartment {
  name: string;
  headcount: number;
  totalGrossPay: number;
  totalBenefits: number;
  totalTaxes: number;
  notes?: string;
}

export interface Payroll {
  id: string;
  companyId: string;
  period: string;
  currency: Currency;
  
  departments: PayrollDepartmentSummary[];
  
  totals: {
    headcount: number;
    grossPay: number;
    benefits: number;
    taxes: number;
    totalCost: number;
  };
  
  metrics: {
    costPerEmployee: number;
    payrollAsPercentRevenue?: number;
    monthOverMonthChange?: number;
  };
  
  affordability: {
    maxAffordableHeadcount: number; // Based on revenue/cash
    hiringCapacity: number; // Additional FTEs affordable
    recommendation: string;
  };
  
  createdAt: number;
  updatedAt: number;
}

export interface PayrollDepartmentSummary extends PayrollDepartment {
  totalCost: number;
  costPerEmployee: number;
  percentOfTotal: number;
}

// ═══════════════════════════════════════════════════════════════════
// TAX CALENDAR TYPES
// ═══════════════════════════════════════════════════════════════════

export interface TaxCalendarInput {
  companyId: string;
  currency?: Currency; // Optional, defaults to 'KES'
  fiscalYear: number; // e.g., 2026
  obligations: TaxObligation[];
}

export interface TaxObligation {
  taxType: 'vat' | 'corporate-income' | 'payroll' | 'property' | 'sales' | 'other';
  jurisdiction: string; // e.g., "Kenya", "EU", "California"
  description: string;
  dueDate: string; // ISO date
  estimatedAmount: number;
  currency: Currency;
  frequency: 'monthly' | 'quarterly' | 'annually' | 'one-time';
  isPaid: boolean;
  paidDate?: string;
  paidAmount?: number;
  notes?: string;
}

export interface TaxCalendar {
  id: string;
  companyId: string;
  fiscalYear: number;
  currency: Currency;
  
  obligations: TaxObligationSummary[];
  
  timeline: {
    next30Days: TaxObligationSummary[];
    next60Days: TaxObligationSummary[];
    next90Days: TaxObligationSummary[];
    overdue: TaxObligationSummary[];
  };
  
  summary: {
    totalObligations: number;
    totalEstimatedAmount: number;
    totalPaid: number;
    totalOutstanding: number;
    overdueCount: number;
    overdueAmount: number;
  };
  
  alerts: TaxAlert[];
  
  createdAt: number;
  updatedAt: number;
}

export interface TaxObligationSummary extends TaxObligation {
  daysUntilDue: number;
  status: 'paid' | 'upcoming' | 'due-soon' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TaxAlert {
  severity: 'info' | 'warning' | 'critical';
  message: string;
  obligationId?: string;
  dueDate?: string;
}

// ═══════════════════════════════════════════════════════════════════
// OPERATIONS KPI TYPES
// ═══════════════════════════════════════════════════════════════════

export interface OperationsKPIInput {
  companyId: string;
  currency?: Currency; // Optional, defaults to 'KES'
  period: string;
  industry: 'automotive' | 'saas' | 'manufacturing' | 'retail' | 'services' | 'custom';
  kpis: KPIValue[];
}

export interface KPIValue {
  name: string;
  category: 'production' | 'quality' | 'delivery' | 'efficiency' | 'growth' | 'engagement';
  value: number;
  unit: string; // e.g., "%", "units", "days", "$"
  target?: number;
  benchmark?: number; // Industry benchmark
}

export interface OperationsKPI {
  id: string;
  companyId: string;
  period: string;
  industry: string;
  currency: Currency;
  
  kpisByCategory: {
    [category: string]: KPISummary[];
  };
  
  performance: {
    totalKPIs: number;
    meetsTarget: number;
    percentMeetingTarget: number;
    overallStatus: 'excellent' | 'good' | 'needs-improvement' | 'poor';
  };
  
  topPerformers: KPISummary[]; // Top 5
  needsAttention: KPISummary[]; // Bottom 5 or missing target
  
  recommendations: string[];
  
  createdAt: number;
  updatedAt: number;
}

export interface KPISummary extends KPIValue {
  performance: 'exceeds' | 'meets' | 'below' | 'critical';
  percentOfTarget?: number;
  percentOfBenchmark?: number;
  status: 'green' | 'yellow' | 'red';
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export type {
  CapexInput,
  Capex,
  CapexPayment,
  PayrollInput,
  Payroll,
  PayrollDepartment,
  PayrollDepartmentSummary,
  TaxCalendarInput,
  TaxCalendar,
  TaxObligation,
  TaxObligationSummary,
  TaxAlert,
  OperationsKPIInput,
  OperationsKPI,
  KPIValue,
  KPISummary,
};
