// app/src/library/financial-toolkit/calculators/DashboardCalculator.ts
/**
 * Dashboard Calculator - FIXED VERSION
 * Executive summary with auto-integration from all modules
 * 
 * FIXES APPLIED:
 * - Added currency parameterization
 * - Uses shared utilities (IdGenerator, CalcUtils, Validator)
 * - Added integration helper methods
 * - Consistent validation messages
 * - Removed code duplication
 */

import type {
  Dashboard,
  DashboardInput,
  DashboardAction,
  ValidationResult,
  ValidationError,
  Currency
} from '../types';
import { IdGenerator, CalcUtils, Validator, StatusDeterminer } from '../utils/shared';

export class DashboardCalculator {
  /**
   * Calculate executive dashboard with health score and actions
   */
  static calculate(input: DashboardInput): Dashboard {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const currency = input.currency || 'KES';

    // Extract key metrics
    const revenue = input.plData?.totals?.revenue || 0;
    const revenueGrowth = input.plData?.growth?.revenueGrowth || 0;
    const grossMargin = input.plData?.margins?.grossMargin || 0;
    const netMargin = input.plData?.margins?.netMargin || 0;
    const ebitda = input.plData?.ebitda || 0;
    
    const cashBalance = input.cashForecastData?.weeks?.[0]?.endingBalance || 
                       input.balanceSheetData?.assets?.currentAssets?.cashAndEquivalents || 0;
    const runwayWeeks = input.cashForecastData?.summary?.runwayWeeks || 0;
    const burnRate = input.cashForecastData?.summary?.avgWeeklyBurn || 0;
    
    const dso = input.workingCapitalData?.metrics?.dso || 0;
    const dpo = input.workingCapitalData?.metrics?.dpo || 0;
    const ccc = input.workingCapitalData?.metrics?.cashConversionCycle || 0;
    const workingCapital = input.workingCapitalData?.metrics?.workingCapital || 0;
    
    const budgetVariance = input.budgetVarianceData?.summary?.totalVariancePercent || 0;
    const forecastAccuracy = input.budgetVarianceData?.insights?.forecastAccuracy || 100;

    // Calculate health score (0-100)
    let healthScore = 0;
    
    // Profitability (30 points)
    if (netMargin > 20) healthScore += 30;
    else if (netMargin > 10) healthScore += 20;
    else if (netMargin > 0) healthScore += 10;
    
    // Liquidity (30 points)
    if (runwayWeeks > 52) healthScore += 30;
    else if (runwayWeeks > 26) healthScore += 20;
    else if (runwayWeeks > 13) healthScore += 10;
    
    // Working Capital (20 points)
    if (ccc < 30) healthScore += 20;
    else if (ccc < 60) healthScore += 10;
    else if (ccc < 90) healthScore += 5;
    
    // Budget Performance (20 points)
    const absVariance = Math.abs(budgetVariance);
    if (absVariance < 5) healthScore += 20;
    else if (absVariance < 10) healthScore += 10;
    else if (absVariance < 15) healthScore += 5;

    const healthStatus = StatusDeterminer.healthStatus(healthScore);

    // Traffic lights
    const trafficLights = {
      profitability: this.getProfitabilityLight(netMargin),
      liquidity: this.getLiquidityLight(runwayWeeks),
      workingCapital: this.getWorkingCapitalLight(ccc),
      budgetPerformance: this.getBudgetLight(absVariance)
    };

    // Generate priority actions
    const actions = this.generateActions({
      healthScore,
      netMargin,
      runwayWeeks,
      burnRate,
      dso,
      ccc,
      budgetVariance,
      cashBalance
    });

    // Generate narrative
    const narrative = this.generateNarrative({
      healthStatus,
      netMargin,
      runwayWeeks,
      dso,
      revenue,
      revenueGrowth
    });

    const now = Date.now();

    return {
      id: IdGenerator.generate('dashboard'),
      companyId: input.companyId,
      period: input.period,
      currency,
      
      healthScore,
      healthStatus,
      
      keyMetrics: {
        revenue,
        revenueGrowth,
        grossMargin,
        netMargin,
        ebitda,
        cashBalance,
        runwayWeeks,
        burnRate,
        dso,
        dpo,
        workingCapital,
        budgetVariance,
        forecastAccuracy
      },
      
      trafficLights,
      priorityActions: actions,
      narrative,
      
      healthBreakdown: {
        profitability: this.scoreComponent(netMargin, 'profitability'),
        liquidity: this.scoreComponent(runwayWeeks, 'liquidity'),
        workingCapital: this.scoreComponent(ccc, 'workingCapital'),
        budgetPerformance: this.scoreComponent(absVariance, 'budget')
      },
      
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * AUTO-INTEGRATION: Calculate dashboard from individual calculator results
   * This eliminates manual data passing
   */
  static autoCalculate(params: {
    companyId: string;
    period: string;
    currency?: Currency;
    // Actual calculator results
    pl?: any;
    balanceSheet?: any;
    cashForecast?: any;
    workingCapital?: any;
    budgetVariance?: any;
  }): Dashboard {
    return this.calculate({
      companyId: params.companyId,
      period: params.period,
      currency: params.currency,
      plData: params.pl,
      balanceSheetData: params.balanceSheet,
      cashForecastData: params.cashForecast,
      workingCapitalData: params.workingCapital,
      budgetVarianceData: params.budgetVariance
    });
  }

  /**
   * Generate priority actions
   */
  private static generateActions(metrics: any): DashboardAction[] {
    const actions: DashboardAction[] = [];

    // Critical: Runway < 3 months
    if (metrics.runwayWeeks < 13) {
      actions.push({
        category: 'cash',
        priority: 'critical',
        title: 'URGENT: Runway < 3 months',
        description: `Only ${metrics.runwayWeeks} weeks of cash remaining`,
        recommendation: 'Raise capital immediately or reduce burn rate by 50%',
        estimatedImpact: metrics.burnRate * 13 // Extend runway to 3 months
      });
    }

    // High: Negative margin
    if (metrics.netMargin < 0) {
      actions.push({
        category: 'cost',
        priority: 'high',
        title: 'Negative profitability',
        description: `${metrics.netMargin.toFixed(1)}% net margin`,
        recommendation: 'Review and cut non-essential expenses',
        estimatedImpact: Math.abs(metrics.netMargin) * 0.5
      });
    }

    // High: DSO > 60 days
    if (metrics.dso > 60) {
      actions.push({
        category: 'cash',
        priority: 'high',
        title: 'Collections too slow',
        description: `DSO at ${metrics.dso} days`,
        recommendation: 'Implement automated payment reminders, offer early payment discounts',
        estimatedImpact: (metrics.dso - 45) * (metrics.cashBalance / 365)
      });
    }

    // Medium: Significant budget variance
    if (Math.abs(metrics.budgetVariance) > 15) {
      actions.push({
        category: 'operations',
        priority: 'medium',
        title: 'Budget variance high',
        description: `${metrics.budgetVariance.toFixed(1)}% variance from budget`,
        recommendation: 'Review forecasting process and improve accuracy'
      });
    }

    // Medium: CCC > 60 days
    if (metrics.ccc > 60) {
      actions.push({
        category: 'operations',
        priority: 'medium',
        title: 'Cash conversion cycle needs improvement',
        description: `CCC at ${metrics.ccc} days`,
        recommendation: 'Accelerate collections and optimize payment timing'
      });
    }

    return actions.slice(0, 5); // Top 5 actions
  }

  /**
   * Generate executive narrative
   */
  private static generateNarrative(data: any): string {
    const parts: string[] = [];

    // Health intro
    if (data.healthStatus === 'excellent') {
      parts.push('✅ Excellent financial health.');
    } else if (data.healthStatus === 'good') {
      parts.push('✅ Good financial position with some areas for improvement.');
    } else if (data.healthStatus === 'warning') {
      parts.push('⚠️ Financial performance needs attention.');
    } else {
      parts.push('🚨 Critical financial situation requiring immediate action.');
    }

    // Profitability
    if (data.netMargin > 15) {
      parts.push(`Strong profitability at ${data.netMargin.toFixed(0)}% net margin.`);
    } else if (data.netMargin > 5) {
      parts.push(`Moderate profitability at ${data.netMargin.toFixed(0)}% net margin.`);
    } else if (data.netMargin > 0) {
      parts.push(`Low profitability at ${data.netMargin.toFixed(0)}% net margin.`);
    } else {
      parts.push(`Operating at a loss with ${data.netMargin.toFixed(0)}% net margin.`);
    }

    // Liquidity
    if (data.runwayWeeks > 52) {
      parts.push(`Excellent liquidity with ${data.runwayWeeks} weeks runway.`);
    } else if (data.runwayWeeks > 26) {
      parts.push(`Healthy liquidity with ${data.runwayWeeks} weeks runway.`);
    } else if (data.runwayWeeks > 13) {
      parts.push(`Adequate runway at ${data.runwayWeeks} weeks.`);
    } else {
      parts.push(`🚨 Critical: Only ${data.runwayWeeks} weeks of runway remaining.`);
    }

    // Collections
    if (data.dso > 60) {
      parts.push(`Collections need improvement - DSO at ${data.dso} days.`);
    }

    // Growth
    if (data.revenueGrowth > 20) {
      parts.push(`Strong growth at ${data.revenueGrowth.toFixed(0)}% revenue increase.`);
    }

    return parts.join(' ');
  }

  /**
   * Helper: Get profitability traffic light
   */
  private static getProfitabilityLight(netMargin: number): 'green' | 'yellow' | 'red' {
    if (netMargin > 10) return 'green';
    if (netMargin > 5) return 'yellow';
    return 'red';
  }

  /**
   * Helper: Get liquidity traffic light
   */
  private static getLiquidityLight(runwayWeeks: number): 'green' | 'yellow' | 'red' {
    if (runwayWeeks > 26) return 'green';
    if (runwayWeeks > 13) return 'yellow';
    return 'red';
  }

  /**
   * Helper: Get working capital traffic light
   */
  private static getWorkingCapitalLight(ccc: number): 'green' | 'yellow' | 'red' {
    if (ccc < 30) return 'green';
    if (ccc < 60) return 'yellow';
    return 'red';
  }

  /**
   * Helper: Get budget traffic light
   */
  private static getBudgetLight(absVariance: number): 'green' | 'yellow' | 'red' {
    if (absVariance < 5) return 'green';
    if (absVariance < 10) return 'yellow';
    return 'red';
  }

  /**
   * Helper: Score component
   */
  private static scoreComponent(value: number, type: string): number {
    switch (type) {
      case 'profitability':
        if (value > 20) return 100;
        if (value > 10) return 67;
        if (value > 0) return 33;
        return 0;
      case 'liquidity':
        if (value > 52) return 100;
        if (value > 26) return 67;
        if (value > 13) return 33;
        return 0;
      case 'workingCapital':
        if (value < 30) return 100;
        if (value < 60) return 50;
        if (value < 90) return 25;
        return 0;
      case 'budget':
        if (value < 5) return 100;
        if (value < 10) return 50;
        if (value < 15) return 25;
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Validate dashboard input
   */
  static validate(input: DashboardInput): ValidationResult {
    const errors: ValidationError[] = [];

    Validator.required(input.companyId, 'companyId', errors);
    Validator.required(input.period, 'period', errors);

    // At least one data source required
    const hasSomeData = input.plData || input.balanceSheetData || 
                        input.cashForecastData || input.workingCapitalData || 
                        input.budgetVarianceData;
    
    if (!hasSomeData) {
      errors.push({
        field: 'data',
        message: 'At least one data source is required for dashboard',
        code: 'REQUIRED'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get summary insights
   */
  static getInsights(dashboard: Dashboard): string[] {
    const insights: string[] = [];

    insights.push(`📊 Executive Dashboard - ${dashboard.period}`);
    insights.push(`Health Score: ${dashboard.healthScore}/100 (${dashboard.healthStatus.toUpperCase()})`);
    insights.push(dashboard.narrative);

    if (dashboard.priorityActions.length > 0) {
      insights.push('\n🎯 Priority Actions:');
      dashboard.priorityActions.forEach((action, i) => {
        const emoji = action.priority === 'critical' ? '🚨' : action.priority === 'high' ? '⚠️' : '💡';
        insights.push(`   ${i + 1}. ${emoji} ${action.title}`);
      });
    }

    return insights;
  }
}
