// app/src/library/financial-toolkit/calculators/PLCalculator.ts
/**
 * P&L Statement Calculator
 * Pure functions for profit & loss calculations
 * MIT Licensed
 */

import type { PLStatement, PLStatementInput, ValidationResult, ValidationError } from '../types';

export class PLCalculator {
  /**
   * Calculate complete P&L statement with all metrics
   */
  static calculate(input: PLStatementInput): PLStatement {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const grossProfit = input.revenue - input.cogs;
    const totalSGA = input.rent + input.salaries + input.utilities + 
                     input.marketing + input.transport + input.otherExpenses;
    const ebitda = grossProfit - totalSGA - input.founderSalary;
    const netIncome = ebitda - input.depreciation - input.interest - input.tax;

    const grossMargin = input.revenue > 0 ? (grossProfit / input.revenue) * 100 : 0;
    const operatingMargin = input.revenue > 0 ? (ebitda / input.revenue) * 100 : 0;
    const ebitdaMargin = input.revenue > 0 ? (ebitda / input.revenue) * 100 : 0;
    const netMargin = input.revenue > 0 ? (netIncome / input.revenue) * 100 : 0;

    // Calculate monthly burn rate (negative EBITDA)
    const burnRate = ebitda < 0 ? Math.abs(ebitda) : 0;
    
    // Runway calculation would need cash balance (not in P&L)
    const runway = 0; // Calculated separately with cash balance

    const now = Date.now();

    return {
      id: this.generateId(),
      companyId: input.companyId,
      period: input.period,
      startDate: input.startDate,
      endDate: input.endDate,
      businessName: input.businessName,
      currency: 'KES',
      
      revenue: {
        recurring: [],
        nonRecurring: [],
        total: input.revenue
      },
      
      cogs: {
        items: [],
        total: input.cogs
      },
      
      operatingExpenses: {
        rent: input.rent,
        salaries: input.salaries,
        utilities: input.utilities,
        marketing: input.marketing,
        transport: input.transport,
        other: input.otherExpenses,
        items: [],
        total: totalSGA
      },
      
      founderSalary: input.founderSalary,
      depreciation: input.depreciation,
      interest: input.interest,
      tax: input.tax,
      
      metrics: {
        grossProfit,
        grossMargin,
        operatingIncome: ebitda,
        operatingMargin,
        ebitda,
        ebitdaMargin,
        netIncome,
        netMargin,
        burnRate,
        runway
      },
      
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Validate P&L input data
   */
  static validate(input: PLStatementInput): ValidationResult {
    const errors: ValidationError[] = [];

    // Required fields
    if (!input.companyId) {
      errors.push({ field: 'companyId', message: 'Company ID is required', code: 'REQUIRED' });
    }

    if (!input.businessName?.trim()) {
      errors.push({ field: 'businessName', message: 'Business name is required', code: 'REQUIRED' });
    }

    if (!input.startDate) {
      errors.push({ field: 'startDate', message: 'Start date is required', code: 'REQUIRED' });
    }

    if (!input.endDate) {
      errors.push({ field: 'endDate', message: 'End date is required', code: 'REQUIRED' });
    }

    // Date validation
    if (input.startDate && input.endDate) {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      
      if (isNaN(start.getTime())) {
        errors.push({ field: 'startDate', message: 'Invalid start date format', code: 'INVALID_FORMAT' });
      }
      
      if (isNaN(end.getTime())) {
        errors.push({ field: 'endDate', message: 'Invalid end date format', code: 'INVALID_FORMAT' });
      }
      
      if (start >= end) {
        errors.push({ field: 'endDate', message: 'End date must be after start date', code: 'INVALID_RANGE' });
      }
    }

    // Numeric validations
    const numericFields = [
      'revenue', 'cogs', 'rent', 'salaries', 'utilities', 
      'marketing', 'transport', 'otherExpenses', 'founderSalary',
      'depreciation', 'interest', 'tax'
    ];

    for (const field of numericFields) {
      const value = input[field as keyof PLStatementInput] as number;
      
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push({ 
          field, 
          message: `${field} must be a valid number`, 
          code: 'INVALID_TYPE' 
        });
      } else if (value < 0) {
        errors.push({ 
          field, 
          message: `${field} cannot be negative`, 
          code: 'NEGATIVE_VALUE' 
        });
      }
    }

    // Business logic validations
    if (input.cogs > input.revenue && input.revenue > 0) {
      errors.push({ 
        field: 'cogs', 
        message: 'COGS exceeds revenue - this indicates a problem', 
        code: 'BUSINESS_LOGIC_WARNING' 
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate industry benchmarks comparison
   */
  static getBenchmarks(statement: PLStatement): {
    category: string;
    metric: string;
    yourValue: number;
    benchmark: number;
    status: 'good' | 'fair' | 'poor';
  }[] {
    const benchmarks = [];

    // Gross Margin benchmarks
    if (statement.metrics.grossMargin < 30) {
      benchmarks.push({
        category: 'Profitability',
        metric: 'Gross Margin',
        yourValue: statement.metrics.grossMargin,
        benchmark: 35,
        status: 'poor' as const
      });
    } else if (statement.metrics.grossMargin < 45) {
      benchmarks.push({
        category: 'Profitability',
        metric: 'Gross Margin',
        yourValue: statement.metrics.grossMargin,
        benchmark: 45,
        status: 'fair' as const
      });
    } else {
      benchmarks.push({
        category: 'Profitability',
        metric: 'Gross Margin',
        yourValue: statement.metrics.grossMargin,
        benchmark: 45,
        status: 'good' as const
      });
    }

    // Net Margin benchmarks
    if (statement.metrics.netMargin < 5) {
      benchmarks.push({
        category: 'Profitability',
        metric: 'Net Margin',
        yourValue: statement.metrics.netMargin,
        benchmark: 10,
        status: 'poor' as const
      });
    } else if (statement.metrics.netMargin < 15) {
      benchmarks.push({
        category: 'Profitability',
        metric: 'Net Margin',
        yourValue: statement.metrics.netMargin,
        benchmark: 15,
        status: 'fair' as const
      });
    } else {
      benchmarks.push({
        category: 'Profitability',
        metric: 'Net Margin',
        yourValue: statement.metrics.netMargin,
        benchmark: 15,
        status: 'good' as const
      });
    }

    return benchmarks;
  }

  /**
   * Generate insights and recommendations
   */
  static getInsights(statement: PLStatement): string[] {
    const insights: string[] = [];

    // Profitability insights
    if (statement.metrics.netIncome < 0) {
      insights.push('⚠️ Your business is operating at a loss. Review all expenses and consider revenue growth strategies.');
    }

    if (statement.metrics.grossMargin < 30) {
      insights.push('📉 Your gross margin is below 30%. Consider raising prices or reducing cost of goods sold.');
    }

    if (statement.metrics.ebitda < 0) {
      insights.push('💰 Negative EBITDA indicates operational challenges. Focus on cost optimization.');
    }

    // Operating expenses insights
    const opexRatio = (statement.operatingExpenses.total / statement.revenue.total) * 100;
    if (opexRatio > 70 && statement.revenue.total > 0) {
      insights.push('📊 Operating expenses are consuming over 70% of revenue. Review all costs for optimization opportunities.');
    }

    // Founder salary insights
    if (statement.founderSalary === 0 && statement.metrics.netIncome > 0) {
      insights.push('💼 Consider paying yourself a founder salary now that the business is profitable.');
    }

    // Growth insights
    if (statement.metrics.netMargin > 15) {
      insights.push('✅ Excellent net margin! Consider reinvesting profits for growth or building cash reserves.');
    }

    // COGS insights
    const cogsRatio = (statement.cogs.total / statement.revenue.total) * 100;
    if (cogsRatio > 60 && statement.revenue.total > 0) {
      insights.push('🔍 COGS is high (>60% of revenue). Explore supplier negotiations or pricing adjustments.');
    }

    return insights;
  }

  /**
   * Compare two P&L statements (period-over-period analysis)
   */
  static compare(current: PLStatement, previous: PLStatement): {
    metric: string;
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'flat';
  }[] {
    const comparisons = [];

    const metrics = [
      { key: 'revenue', label: 'Revenue', current: current.revenue.total, previous: previous.revenue.total },
      { key: 'grossProfit', label: 'Gross Profit', current: current.metrics.grossProfit, previous: previous.metrics.grossProfit },
      { key: 'ebitda', label: 'EBITDA', current: current.metrics.ebitda, previous: previous.metrics.ebitda },
      { key: 'netIncome', label: 'Net Income', current: current.metrics.netIncome, previous: previous.metrics.netIncome },
      { key: 'burnRate', label: 'Burn Rate', current: current.metrics.burnRate, previous: previous.metrics.burnRate }
    ];

    for (const metric of metrics) {
      const change = metric.current - metric.previous;
      const changePercent = metric.previous !== 0 ? (change / metric.previous) * 100 : 0;
      
      let trend: 'up' | 'down' | 'flat';
      if (Math.abs(changePercent) < 1) {
        trend = 'flat';
      } else if (change > 0) {
        trend = 'up';
      } else {
        trend = 'down';
      }

      comparisons.push({
        metric: metric.label,
        current: metric.current,
        previous: metric.previous,
        change,
        changePercent,
        trend
      });
    }

    return comparisons;
  }

  /**
   * Calculate runway with cash balance
   */
  static calculateRunway(statement: PLStatement, cashBalance: number): number {
    if (statement.metrics.burnRate === 0) {
      return Infinity; // No burn, infinite runway
    }
    return Math.max(0, cashBalance / statement.metrics.burnRate);
  }

  /**
   * Helper: Generate unique ID
   */
  private static generateId(): string {
    return `pl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
