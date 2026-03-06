// app/src/library/financial-toolkit/calculators/CashForecastCalculator.ts
/**
 * Cash Forecast Calculator (13-Week Rolling)
 * Pure functions for cash flow forecasting
 * MIT Licensed
 */

import type { CashForecast, CashForecastInput, WeekForecast, ValidationResult, ValidationError } from '../types';

export class CashForecastCalculator {
  /**
   * Calculate 13-week rolling cash forecast with runway analysis
   */
  static calculate(input: CashForecastInput): CashForecast {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const weeks: WeekForecast[] = [];
    let runningCash = input.openingCash;
    
    // Calculate total cash flow for burn rate
    const totalCashIn = input.weeks.reduce((sum, w) => sum + w.cashIn, 0);
    const totalCashOut = input.weeks.reduce((sum, w) => sum + w.cashOut, 0);
    const avgBurnRate = totalCashOut / input.weeks.length;

    // Build rolling forecast
    for (let i = 0; i < input.weeks.length; i++) {
      const week = input.weeks[i];
      const openingCash = runningCash;
      const closingCash = openingCash + week.cashIn - week.cashOut;
      const runway = this.calculateRunway(closingCash, avgBurnRate);
      const status = this.getRunwayStatus(runway);

      weeks.push({
        week: i + 1,
        openingCash,
        cashIn: week.cashIn,
        cashOut: week.cashOut,
        closingCash,
        runway,
        status
      });

      runningCash = closingCash;
    }

    // Calculate summary metrics
    const healthyWeeks = weeks.filter(w => w.status === 'healthy').length;
    const warningWeeks = weeks.filter(w => w.status === 'warning').length;
    const crisisWeeks = weeks.filter(w => w.status === 'crisis').length;

    const now = Date.now();

    return {
      id: this.generateId(),
      companyId: input.companyId,
      weeks,
      metrics: {
        averageBurnRate: avgBurnRate,
        totalCashIn,
        totalCashOut,
        netCashFlow: totalCashIn - totalCashOut,
        healthyWeeks,
        warningWeeks,
        crisisWeeks
      },
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Calculate runway in weeks based on cash and burn rate
   */
  static calculateRunway(cashBalance: number, weeklyBurnRate: number): number {
    if (weeklyBurnRate === 0) {
      return Infinity;
    }
    return Math.max(0, cashBalance / weeklyBurnRate);
  }

  /**
   * Determine runway status
   */
  static getRunwayStatus(runwayWeeks: number): 'healthy' | 'warning' | 'crisis' {
    if (runwayWeeks > 8) return 'healthy';
    if (runwayWeeks > 4) return 'warning';
    return 'crisis';
  }

  /**
   * Validate cash forecast input
   */
  static validate(input: CashForecastInput): ValidationResult {
    const errors: ValidationError[] = [];

    if (!input.companyId) {
      errors.push({ field: 'companyId', message: 'Company ID is required', code: 'REQUIRED' });
    }

    if (typeof input.openingCash !== 'number' || isNaN(input.openingCash)) {
      errors.push({ field: 'openingCash', message: 'Opening cash must be a valid number', code: 'INVALID_TYPE' });
    }

    if (!input.weeks || !Array.isArray(input.weeks)) {
      errors.push({ field: 'weeks', message: 'Weeks array is required', code: 'REQUIRED' });
    } else {
      if (input.weeks.length === 0) {
        errors.push({ field: 'weeks', message: 'At least one week is required', code: 'MIN_LENGTH' });
      }

      if (input.weeks.length > 52) {
        errors.push({ field: 'weeks', message: 'Maximum 52 weeks allowed', code: 'MAX_LENGTH' });
      }

      // Validate each week
      input.weeks.forEach((week, index) => {
        if (typeof week.cashIn !== 'number' || isNaN(week.cashIn) || week.cashIn < 0) {
          errors.push({ 
            field: `weeks[${index}].cashIn`, 
            message: `Week ${index + 1}: Cash IN must be a non-negative number`, 
            code: 'INVALID_VALUE' 
          });
        }

        if (typeof week.cashOut !== 'number' || isNaN(week.cashOut) || week.cashOut < 0) {
          errors.push({ 
            field: `weeks[${index}].cashOut`, 
            message: `Week ${index + 1}: Cash OUT must be a non-negative number`, 
            code: 'INVALID_VALUE' 
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get actionable recommendations based on forecast
   */
  static getRecommendations(forecast: CashForecast): string[] {
    const recommendations: string[] = [];

    if (forecast.metrics.crisisWeeks > 0) {
      recommendations.push('🚨 URGENT: You have weeks with critical runway (<4 weeks). Take immediate action:');
      recommendations.push('   • Chase all outstanding invoices');
      recommendations.push('   • Delay non-essential expenses');
      recommendations.push('   • Consider emergency financing');
      recommendations.push('   • Negotiate extended payment terms with suppliers');
    }

    if (forecast.metrics.warningWeeks > 3) {
      recommendations.push('⚠️ Multiple weeks show warning status (4-8 weeks runway):');
      recommendations.push('   • Review and optimize all expenses');
      recommendations.push('   • Accelerate revenue collection');
      recommendations.push('   • Build a contingency plan');
    }

    if (forecast.metrics.netCashFlow < 0) {
      recommendations.push('📉 Overall negative cash flow. Focus on:');
      recommendations.push('   • Increasing revenue');
      recommendations.push('   • Reducing burn rate');
      recommendations.push('   • Securing additional funding');
    }

    if (forecast.metrics.healthyWeeks === forecast.weeks.length) {
      recommendations.push('✅ Strong cash position across all weeks!');
      recommendations.push('   • Consider building a 6-month reserve');
      recommendations.push('   • Explore growth investments');
      recommendations.push('   • Maintain financial discipline');
    }

    // Week-specific warnings
    const criticalWeeks = forecast.weeks
      .filter(w => w.status === 'crisis')
      .map(w => w.week);
    
    if (criticalWeeks.length > 0) {
      recommendations.push(`💡 Critical weeks: ${criticalWeeks.join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Scenario analysis: what-if modeling
   */
  static scenarioAnalysis(forecast: CashForecast, scenarios: {
    revenueIncrease?: number; // percentage
    expenseDecrease?: number; // percentage
    additionalCash?: number;  // one-time injection
  }): {
    scenario: string;
    originalHealthyWeeks: number;
    newHealthyWeeks: number;
    improvement: number;
  }[] {
    const results = [];
    const original = forecast.metrics.healthyWeeks;

    if (scenarios.revenueIncrease) {
      const multiplier = 1 + (scenarios.revenueIncrease / 100);
      const newWeeks = forecast.weeks.map(w => ({
        ...w,
        cashIn: w.cashIn * multiplier
      }));
      const healthyCount = newWeeks.filter(w => 
        this.getRunwayStatus(
          this.calculateRunway(w.closingCash, forecast.metrics.averageBurnRate)
        ) === 'healthy'
      ).length;

      results.push({
        scenario: `Increase revenue by ${scenarios.revenueIncrease}%`,
        originalHealthyWeeks: original,
        newHealthyWeeks: healthyCount,
        improvement: healthyCount - original
      });
    }

    if (scenarios.expenseDecrease) {
      const multiplier = 1 - (scenarios.expenseDecrease / 100);
      const newWeeks = forecast.weeks.map(w => ({
        ...w,
        cashOut: w.cashOut * multiplier
      }));
      const healthyCount = newWeeks.filter(w => 
        this.getRunwayStatus(
          this.calculateRunway(w.closingCash, forecast.metrics.averageBurnRate * multiplier)
        ) === 'healthy'
      ).length;

      results.push({
        scenario: `Reduce expenses by ${scenarios.expenseDecrease}%`,
        originalHealthyWeeks: original,
        newHealthyWeeks: healthyCount,
        improvement: healthyCount - original
      });
    }

    return results;
  }

  /**
   * Helper: Generate unique ID
   */
  private static generateId(): string {
    return `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
