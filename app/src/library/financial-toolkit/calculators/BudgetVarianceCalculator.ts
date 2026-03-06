// app/src/library/financial-toolkit/calculators/BudgetVarianceCalculator.ts
/**
 * Budget Variance Calculator - PRODUCTION VERSION
 * Budget vs Actual analysis with variance detection and insights
 * MIT Licensed
 */

import type { 
  BudgetVariance, 
  BudgetVarianceInput,
  BudgetLineItem,
  VarianceLineItem,
  ValidationResult, 
  ValidationError 
} from '../types/phase1-types';

export class BudgetVarianceCalculator {
  /**
   * Calculate budget variance analysis with insights
   */
  static calculate(input: BudgetVarianceInput): BudgetVariance {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Calculate variance for each line item
    const lineItems: VarianceLineItem[] = input.lineItems.map(item => {
      const variance = item.actual - item.budgeted;
      const variancePercent = item.budgeted !== 0 
        ? (variance / Math.abs(item.budgeted)) * 100 
        : (item.actual !== 0 ? Infinity : 0);
      
      // Determine if favorable (depends on account type)
      // Revenue/Income: actual > budget is favorable
      // Expenses/Costs: actual < budget is favorable
      const isRevenueAccount = this.isRevenueAccount(item.category);
      const isFavorable = isRevenueAccount 
        ? variance > 0  // Higher revenue is good
        : variance < 0; // Lower expense is good
      
      const isMaterial = Math.abs(variancePercent) > 10;

      return {
        category: item.category,
        subcategory: item.subcategory,
        budgeted: item.budgeted,
        actual: item.actual,
        variance,
        variancePercent,
        isFavorable,
        isMaterial
      };
    });

    // Calculate summary
    const totalBudgeted = input.lineItems.reduce((sum, item) => sum + item.budgeted, 0);
    const totalActual = input.lineItems.reduce((sum, item) => sum + item.actual, 0);
    const totalVariance = totalActual - totalBudgeted;
    const totalVariancePercent = totalBudgeted !== 0 
      ? (totalVariance / Math.abs(totalBudgeted)) * 100 
      : 0;

    // Top 10 variances by absolute value
    const topVariances = [...lineItems]
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      .slice(0, 10);

    // Insights
    const favorableCount = lineItems.filter(item => item.isFavorable).length;
    const unfavorableCount = lineItems.filter(item => !item.isFavorable).length;
    const materialVariances = lineItems.filter(item => item.isMaterial).length;

    let overallStatus: 'on-track' | 'slight-miss' | 'significant-miss';
    if (Math.abs(totalVariancePercent) < 5) {
      overallStatus = 'on-track';
    } else if (Math.abs(totalVariancePercent) < 10) {
      overallStatus = 'slight-miss';
    } else {
      overallStatus = 'significant-miss';
    }

    const now = Date.now();

    return {
      id: this.generateId(),
      companyId: input.companyId,
      period: input.period,
      currency: 'KES',
      
      summary: {
        totalBudgeted,
        totalActual,
        totalVariance,
        totalVariancePercent
      },
      
      lineItems,
      topVariances,
      
      insights: {
        favorableCount,
        unfavorableCount,
        materialVariances,
        overallStatus
      },
      
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Validate budget variance input
   */
  static validate(input: BudgetVarianceInput): ValidationResult {
    const errors: ValidationError[] = [];

    if (!input.companyId) {
      errors.push({ 
        field: 'companyId', 
        message: 'Company ID is required', 
        code: 'REQUIRED' 
      });
    }

    if (!input.period) {
      errors.push({ 
        field: 'period', 
        message: 'Period is required', 
        code: 'REQUIRED' 
      });
    }

    if (!Array.isArray(input.lineItems) || input.lineItems.length === 0) {
      errors.push({ 
        field: 'lineItems', 
        message: 'At least one line item is required', 
        code: 'REQUIRED' 
      });
      return { valid: false, errors };
    }

    // Validate each line item
    input.lineItems.forEach((item, index) => {
      if (!item.category?.trim()) {
        errors.push({ 
          field: `lineItems[${index}].category`, 
          message: `Line item ${index + 1}: Category is required`, 
          code: 'REQUIRED' 
        });
      }

      if (typeof item.budgeted !== 'number' || isNaN(item.budgeted)) {
        errors.push({ 
          field: `lineItems[${index}].budgeted`, 
          message: `Line item ${index + 1}: Budgeted must be a valid number`, 
          code: 'INVALID_TYPE' 
        });
      }

      if (typeof item.actual !== 'number' || isNaN(item.actual)) {
        errors.push({ 
          field: `lineItems[${index}].actual`, 
          message: `Line item ${index + 1}: Actual must be a valid number`, 
          code: 'INVALID_TYPE' 
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get actionable insights and recommendations
   */
  static getInsights(variance: BudgetVariance): string[] {
    const insights: string[] = [];
    const { summary, insights: i, topVariances } = variance;

    // Overall performance
    if (i.overallStatus === 'on-track') {
      insights.push(`✅ Excellent budget performance: ${summary.totalVariancePercent.toFixed(1)}% variance`);
    } else if (i.overallStatus === 'slight-miss') {
      insights.push(`⚠️ Slight budget miss: ${summary.totalVariancePercent.toFixed(1)}% variance`);
      insights.push('   • Review material variances (>10%)');
      insights.push('   • Adjust forecast for next period');
    } else {
      insights.push(`🚨 Significant budget miss: ${summary.totalVariancePercent.toFixed(1)}% variance`);
      insights.push('   • Immediate action required on top variances');
      insights.push('   • Review budgeting assumptions');
      insights.push('   • Implement tighter controls');
    }

    // Favorable vs Unfavorable
    insights.push(`\n📊 Performance Mix:`);
    insights.push(`   • Favorable variances: ${i.favorableCount} line items`);
    insights.push(`   • Unfavorable variances: ${i.unfavorableCount} line items`);
    insights.push(`   • Material variances (>10%): ${i.materialVariances} items`);

    // Top 3 Variances requiring attention
    insights.push(`\n🎯 Top 3 Variances Requiring Attention:`);
    
    const unfavorableTop = topVariances
      .filter(v => !v.isFavorable && v.isMaterial)
      .slice(0, 3);

    if (unfavorableTop.length === 0) {
      insights.push('   ✅ No significant unfavorable variances');
    } else {
      unfavorableTop.forEach((item, index) => {
        insights.push(`   ${index + 1}. ${item.category}${item.subcategory ? ` - ${item.subcategory}` : ''}`);
        insights.push(`      Budget: ${item.budgeted.toLocaleString()}, Actual: ${item.actual.toLocaleString()}`);
        insights.push(`      Variance: ${item.variance.toLocaleString()} (${item.variancePercent.toFixed(1)}%)`);
        insights.push(`      Action: ${this.getVarianceAction(item)}`);
      });
    }

    // Revenue vs Expense Analysis
    const revenueItems = variance.lineItems.filter(item => this.isRevenueAccount(item.category));
    const expenseItems = variance.lineItems.filter(item => !this.isRevenueAccount(item.category));

    if (revenueItems.length > 0) {
      const revenueVariance = revenueItems.reduce((sum, item) => sum + item.variance, 0);
      const revenueBudgeted = revenueItems.reduce((sum, item) => sum + item.budgeted, 0);
      const revenueVariancePercent = (revenueVariance / revenueBudgeted) * 100;
      
      insights.push(`\n💰 Revenue Performance: ${revenueVariancePercent > 0 ? '✅' : '❌'} ${revenueVariancePercent.toFixed(1)}% vs budget`);
    }

    if (expenseItems.length > 0) {
      const expenseVariance = expenseItems.reduce((sum, item) => sum + item.variance, 0);
      const expenseBudgeted = expenseItems.reduce((sum, item) => sum + item.budgeted, 0);
      const expenseVariancePercent = (expenseVariance / expenseBudgeted) * 100;
      
      // For expenses, negative variance is good
      insights.push(`💸 Expense Performance: ${expenseVariance < 0 ? '✅' : '❌'} ${Math.abs(expenseVariancePercent).toFixed(1)}% ${expenseVariance < 0 ? 'under' : 'over'} budget`);
    }

    return insights;
  }

  /**
   * Get specific action recommendation for a variance
   */
  private static getVarianceAction(item: VarianceLineItem): string {
    const isRevenue = this.isRevenueAccount(item.category);
    const varianceAbs = Math.abs(item.variancePercent);

    if (isRevenue && !item.isFavorable) {
      // Revenue underperformance
      if (varianceAbs > 20) {
        return 'Critical: Review pricing, pipeline, and sales execution immediately';
      } else if (varianceAbs > 10) {
        return 'Review sales activities and adjust forecast';
      } else {
        return 'Monitor closely next period';
      }
    } else if (!isRevenue && !item.isFavorable) {
      // Expense overrun
      if (varianceAbs > 20) {
        return 'Critical: Identify root cause, implement immediate cost controls';
      } else if (varianceAbs > 10) {
        return 'Review spending, tighten approval process';
      } else {
        return 'Monitor and control discretionary spend';
      }
    } else {
      // Favorable variance
      return 'Understand drivers to replicate success';
    }
  }

  /**
   * Determine if a category is a revenue account
   */
  private static isRevenueAccount(category: string): boolean {
    const lowerCategory = category.toLowerCase();
    const revenueKeywords = ['revenue', 'sales', 'income', 'fees', 'services'];
    return revenueKeywords.some(keyword => lowerCategory.includes(keyword));
  }

  /**
   * Calculate forecast accuracy (how well did we predict?)
   */
  static calculateForecastAccuracy(variance: BudgetVariance): number {
    // Accuracy = 100% - average absolute variance %
    const totalAbsoluteVariancePercent = variance.lineItems.reduce(
      (sum, item) => sum + Math.abs(item.variancePercent),
      0
    );
    
    const avgVariancePercent = totalAbsoluteVariancePercent / variance.lineItems.length;
    return Math.max(0, 100 - avgVariancePercent);
  }

  /**
   * Group variances by category for analysis
   */
  static groupByCategory(variance: BudgetVariance): Record<string, {
    budgeted: number;
    actual: number;
    variance: number;
    variancePercent: number;
    items: VarianceLineItem[];
  }> {
    const grouped: Record<string, any> = {};

    variance.lineItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = {
          budgeted: 0,
          actual: 0,
          variance: 0,
          items: []
        };
      }

      grouped[item.category].budgeted += item.budgeted;
      grouped[item.category].actual += item.actual;
      grouped[item.category].variance += item.variance;
      grouped[item.category].items.push(item);
    });

    // Calculate percentages
    Object.keys(grouped).forEach(category => {
      const data = grouped[category];
      data.variancePercent = data.budgeted !== 0 
        ? (data.variance / Math.abs(data.budgeted)) * 100 
        : 0;
    });

    return grouped;
  }

  /**
   * Helper: Generate unique ID
   */
  private static generateId(): string {
    return `bv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
