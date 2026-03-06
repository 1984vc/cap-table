// app/src/library/financial-toolkit/calculators/WeeklyReviewCalculator.ts
/**
 * Weekly Review Calculator - PRODUCTION VERSION
 * Weekly plan vs actual tracking with variance analysis
 * MIT Licensed
 */

import type {
  WeeklyReview,
  WeeklyReviewInput,
  WeeklyMetrics,
  WeeklyVariance,
  VarianceMetric,
  ValidationResult,
  ValidationError
} from '../types/phase3-types';

export class WeeklyReviewCalculator {
  /**
   * Calculate weekly review with variance analysis and insights
   */
  static calculate(input: WeeklyReviewInput): WeeklyReview {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Calculate variances for each metric
    const variances: WeeklyVariance = {};
    const metricKeys: (keyof WeeklyMetrics)[] = ['revenue', 'cashIn', 'cashOut', 'collections', 'newCustomers'];
    
    let metricsOnTrack = 0;
    let totalMetrics = 0;

    metricKeys.forEach(key => {
      const target = input.targets[key];
      const actual = input.actuals[key];

      if (target !== undefined && actual !== undefined) {
        totalMetrics++;
        
        const variance = actual - target;
        const variancePercent = target !== 0 ? (variance / Math.abs(target)) * 100 : 0;
        
        // Determine if favorable
        // For cashOut, lower is better. For others, higher is better.
        const isFavorable = key === 'cashOut' ? variance < 0 : variance > 0;
        
        // Determine status
        let status: 'on-track' | 'slight-miss' | 'significant-miss';
        const absVariancePercent = Math.abs(variancePercent);
        
        if (absVariancePercent <= 5) {
          status = 'on-track';
          metricsOnTrack++;
        } else if (absVariancePercent <= 10) {
          status = 'slight-miss';
        } else {
          status = 'significant-miss';
        }

        variances[key] = {
          target,
          actual,
          variance,
          variancePercent,
          status,
          isFavorable
        };
      }
    });

    // Overall performance
    const percentOnTrack = totalMetrics > 0 ? (metricsOnTrack / totalMetrics) * 100 : 0;
    
    let overallStatus: 'excellent' | 'good' | 'needs-attention' | 'poor';
    if (percentOnTrack >= 80) {
      overallStatus = 'excellent';
    } else if (percentOnTrack >= 60) {
      overallStatus = 'good';
    } else if (percentOnTrack >= 40) {
      overallStatus = 'needs-attention';
    } else {
      overallStatus = 'poor';
    }

    // Generate insights
    const insights = this.generateInsights(variances, input.actuals);

    const now = Date.now();

    return {
      id: this.generateId(),
      companyId: input.companyId,
      weekNumber: input.weekNumber,
      year: input.year,
      weekStartDate: input.weekStartDate,
      weekEndDate: input.weekEndDate,
      currency: 'KES',
      
      targets: input.targets,
      actuals: input.actuals,
      variances,
      
      performance: {
        metricsOnTrack,
        totalMetrics,
        percentOnTrack,
        overallStatus
      },
      
      insights,
      wins: input.wins || [],
      challenges: input.challenges || [],
      notes: input.notes,
      
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Generate actionable insights from variances
   */
  private static generateInsights(variances: WeeklyVariance, actuals: WeeklyMetrics): string[] {
    const insights: string[] = [];

    // Revenue insights
    if (variances.revenue) {
      const v = variances.revenue;
      if (v.status === 'on-track') {
        insights.push(`✅ Revenue on track: ${v.actual.toLocaleString()} (${v.variancePercent.toFixed(1)}% vs target)`);
      } else if (!v.isFavorable) {
        insights.push(`🚨 Revenue miss: ${v.actual.toLocaleString()} vs ${v.target.toLocaleString()} (${v.variancePercent.toFixed(1)}%)`);
        insights.push('   • Review pipeline and close rate');
        insights.push('   • Accelerate sales activities for next week');
      } else {
        insights.push(`✅ Revenue exceeded: ${v.actual.toLocaleString()} vs ${v.target.toLocaleString()} (+${v.variancePercent.toFixed(1)}%)`);
      }
    }

    // Cash in insights
    if (variances.cashIn) {
      const v = variances.cashIn;
      if (!v.isFavorable && v.status !== 'on-track') {
        insights.push(`⚠️ Cash collections below target: ${v.actual.toLocaleString()} vs ${v.target.toLocaleString()}`);
        insights.push('   • Follow up on outstanding invoices');
        insights.push('   • Review payment terms with slow payers');
      }
    }

    // Cash out insights
    if (variances.cashOut) {
      const v = variances.cashOut;
      if (!v.isFavorable) {
        insights.push(`⚠️ Cash outflows exceeded budget: ${v.actual.toLocaleString()} vs ${v.target.toLocaleString()}`);
        insights.push('   • Review unplanned expenses');
        insights.push('   • Tighten spending controls for next week');
      }
    }

    // Collections insights
    if (variances.collections) {
      const v = variances.collections;
      if (!v.isFavorable && Math.abs(v.variancePercent) > 15) {
        insights.push(`🚨 Collections significantly below target: ${v.variancePercent.toFixed(0)}% miss`);
        insights.push('   • Implement daily collection calls');
        insights.push('   • Consider early payment incentives');
      }
    }

    // New customers insights
    if (variances.newCustomers) {
      const v = variances.newCustomers;
      if (v.isFavorable && v.variancePercent > 20) {
        insights.push(`✅ Strong customer acquisition: ${v.actual} new customers (+${v.variancePercent.toFixed(0)}%)`);
        insights.push('   • Document what worked this week');
        insights.push('   • Replicate successful tactics');
      } else if (!v.isFavorable) {
        insights.push(`⚠️ Customer acquisition below target: ${v.actual} vs ${v.target} customers`);
        insights.push('   • Review marketing effectiveness');
        insights.push('   • Increase outbound activities');
      }
    }

    return insights;
  }

  /**
   * Validate weekly review input
   */
  static validate(input: WeeklyReviewInput): ValidationResult {
    const errors: ValidationError[] = [];

    if (!input.companyId) {
      errors.push({ field: 'companyId', message: 'Company ID is required', code: 'REQUIRED' });
    }

    if (typeof input.weekNumber !== 'number' || input.weekNumber < 1 || input.weekNumber > 53) {
      errors.push({ 
        field: 'weekNumber', 
        message: 'Week number must be between 1 and 53', 
        code: 'INVALID_VALUE' 
      });
    }

    if (typeof input.year !== 'number' || input.year < 2000 || input.year > 2100) {
      errors.push({ 
        field: 'year', 
        message: 'Year must be between 2000 and 2100', 
        code: 'INVALID_VALUE' 
      });
    }

    if (!input.weekStartDate) {
      errors.push({ field: 'weekStartDate', message: 'Week start date is required', code: 'REQUIRED' });
    }

    if (!input.weekEndDate) {
      errors.push({ field: 'weekEndDate', message: 'Week end date is required', code: 'REQUIRED' });
    }

    // At least one target and one actual should be provided
    const hasTargets = Object.values(input.targets || {}).some(v => v !== undefined);
    const hasActuals = Object.values(input.actuals || {}).some(v => v !== undefined);

    if (!hasTargets) {
      errors.push({ 
        field: 'targets', 
        message: 'At least one target metric is required', 
        code: 'REQUIRED' 
      });
    }

    if (!hasActuals) {
      errors.push({ 
        field: 'actuals', 
        message: 'At least one actual metric is required', 
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
  static getInsights(review: WeeklyReview): string[] {
    const insights: string[] = [];

    insights.push(`📅 Week ${review.weekNumber}, ${review.year}`);
    insights.push(`Status: ${review.performance.overallStatus.toUpperCase()}`);
    insights.push(`${review.performance.metricsOnTrack}/${review.performance.totalMetrics} metrics on track (${review.performance.percentOnTrack.toFixed(0)}%)`);

    if (review.wins.length > 0) {
      insights.push(`\n✅ Wins This Week:`);
      review.wins.forEach(win => insights.push(`   • ${win}`));
    }

    if (review.challenges.length > 0) {
      insights.push(`\n⚠️ Challenges This Week:`);
      review.challenges.forEach(challenge => insights.push(`   • ${challenge}`));
    }

    insights.push(...review.insights);

    return insights;
  }

  /**
   * Compare with prior week
   */
  static compare(current: WeeklyReview, prior: WeeklyReview): {
    revenueChange: number;
    cashInChange: number;
    performanceChange: number;
    trend: 'improving' | 'stable' | 'declining';
  } {
    const revenueChange = (current.actuals.revenue || 0) - (prior.actuals.revenue || 0);
    const cashInChange = (current.actuals.cashIn || 0) - (prior.actuals.cashIn || 0);
    const performanceChange = current.performance.percentOnTrack - prior.performance.percentOnTrack;

    let trend: 'improving' | 'stable' | 'declining';
    if (performanceChange > 10) {
      trend = 'improving';
    } else if (performanceChange < -10) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    return {
      revenueChange,
      cashInChange,
      performanceChange,
      trend
    };
  }

  /**
   * Calculate rolling 4-week average
   */
  static calculateRollingAverage(reviews: WeeklyReview[], metric: keyof WeeklyMetrics): number {
    if (reviews.length === 0) return 0;

    const recentReviews = reviews.slice(-4); // Last 4 weeks
    const values = recentReviews
      .map(r => r.actuals[metric])
      .filter((v): v is number => v !== undefined);

    if (values.length === 0) return 0;

    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Helper: Generate unique ID
   */
  private static generateId(): string {
    return `weekly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
