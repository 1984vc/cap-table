// app/src/library/financial-toolkit/types/phase1-types.ts
/**
 * Phase 1 Calculator Types - Balance Sheet, Budget Variance, Working Capital, Dashboard
 * Production-ready TypeScript definitions
 */

import type { Currency, ValidationResult, ValidationError } from './index';

// ═══════════════════════════════════════════════════════════════════
// BALANCE SHEET TYPES
// ═══════════════════════════════════════════════════════════════════

export interface BalanceSheetInput {
  companyId: string;
  currency?: Currency; // Optional, defaults to 'KES'
  asOfDate: string; // ISO date format
  
  // Current Assets
  cashAndEquivalents: number;
  accountsReceivable: number;
  inventory: number;
  prepaidExpenses: number;
  otherCurrentAssets: number;
  
  // Non-Current Assets
  propertyPlantEquipment: number;
  accumulatedDepreciation: number;
  intangibleAssets: number;
  longTermInvestments: number;
  otherNonCurrentAssets: number;
  
  // Current Liabilities
  accountsPayable: number;
  shortTermDebt: number;
  accruedExpenses: number;
  deferredRevenue: number;
  otherCurrentLiabilities: number;
  
  // Non-Current Liabilities
  longTermDebt: number;
  deferredTaxLiabilities: number;
  otherNonCurrentLiabilities: number;
  
  // Equity
  shareCapital: number;
  retainedEarnings: number;
  otherEquity: number;
}

export interface BalanceSheet {
  id: string;
  companyId: string;
  asOfDate: string;
  currency: Currency;
  
  // Assets
  currentAssets: {
    cashAndEquivalents: number;
    accountsReceivable: number;
    inventory: number;
    prepaidExpenses: number;
    otherCurrentAssets: number;
    total: number;
  };
  
  nonCurrentAssets: {
    propertyPlantEquipment: number;
    accumulatedDepreciation: number;
    netPPE: number;
    intangibleAssets: number;
    longTermInvestments: number;
    otherNonCurrentAssets: number;
    total: number;
  };
  
  totalAssets: number;
  
  // Liabilities
  currentLiabilities: {
    accountsPayable: number;
    shortTermDebt: number;
    accruedExpenses: number;
    deferredRevenue: number;
    otherCurrentLiabilities: number;
    total: number;
  };
  
  nonCurrentLiabilities: {
    longTermDebt: number;
    deferredTaxLiabilities: number;
    otherNonCurrentLiabilities: number;
    total: number;
  };
  
  totalLiabilities: number;
  
  // Equity
  equity: {
    shareCapital: number;
    retainedEarnings: number;
    otherEquity: number;
    total: number;
  };
  
  totalLiabilitiesAndEquity: number;
  
  // Key Ratios
  ratios: {
    currentRatio: number; // Current Assets / Current Liabilities
    quickRatio: number; // (Current Assets - Inventory) / Current Liabilities
    workingCapital: number; // Current Assets - Current Liabilities
    debtToEquity: number; // Total Liabilities / Total Equity
    debtToAssets: number; // Total Liabilities / Total Assets
    equityRatio: number; // Total Equity / Total Assets
  };
  
  // Health Indicators
  health: {
    isBalanced: boolean; // Assets = Liabilities + Equity
    isLiquid: boolean; // Current Ratio > 1.5
    isSolvent: boolean; // Debt to Equity < 2.0
    status: 'healthy' | 'warning' | 'distressed';
  };
  
  createdAt: number;
  updatedAt: number;
}

// ═══════════════════════════════════════════════════════════════════
// BUDGET VARIANCE TYPES
// ═══════════════════════════════════════════════════════════════════

export interface BudgetVarianceInput {
  companyId: string;
  currency?: Currency; // Optional, defaults to 'KES'
  period: string; // e.g., "2026-Q1" or "2026-01"
  
  // Line items with budget and actual
  lineItems: BudgetLineItem[];
}

export interface BudgetLineItem {
  category: string; // e.g., "Revenue", "COGS", "Salaries"
  subcategory?: string;
  budgeted: number;
  actual: number;
}

export interface BudgetVariance {
  id: string;
  companyId: string;
  period: string;
  currency: Currency;
  
  // Summary
  summary: {
    totalBudgeted: number;
    totalActual: number;
    totalVariance: number;
    totalVariancePercent: number;
  };
  
  // Line item details
  lineItems: VarianceLineItem[];
  
  // Top variances (absolute value)
  topVariances: VarianceLineItem[]; // Top 10
  
  // Insights
  insights: {
    favorableCount: number; // How many items beat budget
    unfavorableCount: number; // How many missed budget
    materialVariances: number; // Count of variances >10%
    overallStatus: 'on-track' | 'slight-miss' | 'significant-miss';
  };
  
  createdAt: number;
  updatedAt: number;
}

export interface VarianceLineItem {
  category: string;
  subcategory?: string;
  budgeted: number;
  actual: number;
  variance: number; // actual - budgeted
  variancePercent: number;
  isFavorable: boolean;
  isMaterial: boolean; // >10% variance
}

// ═══════════════════════════════════════════════════════════════════
// WORKING CAPITAL TYPES
// ═══════════════════════════════════════════════════════════════════

export interface WorkingCapitalInput {
  companyId: string;
  currency?: Currency; // Optional, defaults to 'KES'
  asOfDate: string;
  
  // AR Aging
  arAging: {
    current: number; // 0-30 days
    days30: number; // 31-60 days
    days60: number; // 61-90 days
    days90Plus: number; // 90+ days
  };
  
  // AP Aging
  apAging: {
    current: number; // 0-30 days
    days30: number; // 31-60 days
    days60: number; // 61-90 days
    days90Plus: number; // 90+ days
  };
  
  // For DSO/DPO calculation
  annualRevenue: number;
  annualCOGS: number;
  
  // Inventory (for Cash Conversion Cycle)
  inventory?: number;
}

export interface WorkingCapital {
  id: string;
  companyId: string;
  asOfDate: string;
  currency: Currency;
  
  // AR Analysis
  accountsReceivable: {
    aging: {
      current: number;
      days30: number;
      days60: number;
      days90Plus: number;
      total: number;
    };
    dso: number; // Days Sales Outstanding
    overdue: number; // days30 + days60 + days90Plus
    overduePercent: number;
    creditRisk: 'low' | 'medium' | 'high';
  };
  
  // AP Analysis
  accountsPayable: {
    aging: {
      current: number;
      days30: number;
      days60: number;
      days90Plus: number;
      total: number;
    };
    dpo: number; // Days Payable Outstanding
    overdue: number;
    overduePercent: number;
    paymentRisk: 'low' | 'medium' | 'high';
  };
  
  // Cash Conversion Cycle
  cashConversionCycle: {
    dso: number;
    dio: number; // Days Inventory Outstanding (if inventory provided)
    dpo: number;
    ccc: number; // DSO + DIO - DPO
    status: 'excellent' | 'good' | 'needs-improvement' | 'critical';
  };
  
  // Optimization Opportunities
  opportunities: {
    dsoReduction: {
      targetDays: number; // 10% reduction
      cashFreed: number;
    };
    dpoExtension: {
      targetDays: number; // 7 days extension
      cashBenefit: number;
    };
    totalPotential: number;
  };
  
  createdAt: number;
  updatedAt: number;
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD TYPES
// ═══════════════════════════════════════════════════════════════════

export interface DashboardInput {
  companyId: string;
  currency?: Currency; // Optional, defaults to 'KES'
  period: string;
  
  // Aggregated data from other calculators
  plData?: any; // Latest P&L
  balanceSheetData?: any; // Latest Balance Sheet
  cashForecastData?: any; // Latest Cash Forecast
  budgetVarianceData?: any; // Latest Budget Variance
  workingCapitalData?: any; // Latest Working Capital
  cashLeakageData?: any; // Latest Cash Leakage Summary
}

export interface Dashboard {
  id: string;
  companyId: string;
  period: string;
  currency: Currency;
  
  // Overall Health Score (0-100)
  healthScore: number;
  healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
  
  // Key Metrics Summary
  keyMetrics: {
    // Profitability
    revenue: number;
    revenueGrowth: number; // % vs prior period
    grossMargin: number; // %
    netMargin: number; // %
    ebitda: number;
    
    // Liquidity
    cashBalance: number;
    runway: number; // weeks
    burnRate: number;
    
    // Working Capital
    dso: number;
    dpo: number;
    workingCapital: number;
    
    // Performance
    budgetVariance: number; // %
    forecastAccuracy: number; // %
  };
  
  // Traffic Light Indicators
  indicators: {
    profitability: 'green' | 'yellow' | 'red';
    liquidity: 'green' | 'yellow' | 'red';
    workingCapital: 'green' | 'yellow' | 'red';
    budgetPerformance: 'green' | 'yellow' | 'red';
  };
  
  // Top 5 Priority Actions
  priorityActions: DashboardAction[];
  
  // Executive Narrative (AI-generated summary)
  narrative: string;
  
  // Trends
  trends: {
    revenueDirection: 'up' | 'flat' | 'down';
    marginDirection: 'improving' | 'stable' | 'declining';
    cashDirection: 'increasing' | 'stable' | 'decreasing';
  };
  
  createdAt: number;
  updatedAt: number;
}

export interface DashboardAction {
  priority: 'critical' | 'high' | 'medium';
  category: 'cash' | 'revenue' | 'cost' | 'operations';
  action: string;
  impact: string; // Estimated $ impact
  owner?: string;
  deadline?: string;
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export type {
  BalanceSheetInput,
  BalanceSheet,
  BudgetVarianceInput,
  BudgetVariance,
  BudgetLineItem,
  VarianceLineItem,
  WorkingCapitalInput,
  WorkingCapital,
  DashboardInput,
  Dashboard,
  DashboardAction,
};
