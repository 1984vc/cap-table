// app/src/library/financial-toolkit/calculators/TaxCalendarCalculator.ts
/**
 * Tax Calendar Calculator - PRODUCTION VERSION
 * Tax obligation tracking, payment scheduling, compliance alerts
 * MIT Licensed
 */

import type {
  TaxCalendar,
  TaxCalendarInput,
  TaxObligation,
  TaxObligationSummary,
  TaxAlert,
  ValidationResult,
  ValidationError
} from '../types/phase2-types';

export class TaxCalendarCalculator {
  /**
   * Calculate tax calendar with timeline analysis and alerts
   */
  static calculate(input: TaxCalendarInput): TaxCalendar {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const today = new Date();

    // Enhance obligations with calculated fields
    const obligations: TaxObligationSummary[] = input.obligations.map(ob => {
      const dueDate = new Date(ob.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Determine status
      let status: 'paid' | 'upcoming' | 'due-soon' | 'overdue';
      if (ob.isPaid) {
        status = 'paid';
      } else if (daysUntilDue < 0) {
        status = 'overdue';
      } else if (daysUntilDue <= 7) {
        status = 'due-soon';
      } else {
        status = 'upcoming';
      }

      // Determine priority
      let priority: 'low' | 'medium' | 'high' | 'critical';
      if (ob.isPaid) {
        priority = 'low';
      } else if (daysUntilDue < 0) {
        priority = 'critical'; // Overdue
      } else if (daysUntilDue <= 7) {
        priority = 'critical'; // Due within week
      } else if (daysUntilDue <= 14) {
        priority = 'high'; // Due within 2 weeks
      } else if (daysUntilDue <= 30) {
        priority = 'medium'; // Due within month
      } else {
        priority = 'low';
      }

      return {
        ...ob,
        daysUntilDue,
        status,
        priority
      };
    });

    // Organize by timeline
    const timeline = {
      next30Days: obligations.filter(ob => !ob.isPaid && ob.daysUntilDue >= 0 && ob.daysUntilDue <= 30),
      next60Days: obligations.filter(ob => !ob.isPaid && ob.daysUntilDue > 30 && ob.daysUntilDue <= 60),
      next90Days: obligations.filter(ob => !ob.isPaid && ob.daysUntilDue > 60 && ob.daysUntilDue <= 90),
      overdue: obligations.filter(ob => !ob.isPaid && ob.daysUntilDue < 0)
    };

    // Calculate summary
    const summary = {
      totalObligations: obligations.length,
      totalEstimatedAmount: obligations.reduce((sum, ob) => sum + ob.estimatedAmount, 0),
      totalPaid: obligations
        .filter(ob => ob.isPaid)
        .reduce((sum, ob) => sum + (ob.paidAmount || ob.estimatedAmount), 0),
      totalOutstanding: obligations
        .filter(ob => !ob.isPaid)
        .reduce((sum, ob) => sum + ob.estimatedAmount, 0),
      overdueCount: timeline.overdue.length,
      overdueAmount: timeline.overdue.reduce((sum, ob) => sum + ob.estimatedAmount, 0)
    };

    // Generate alerts
    const alerts = this.generateAlerts(obligations, timeline);

    const now = Date.now();

    return {
      id: this.generateId(),
      companyId: input.companyId,
      fiscalYear: input.fiscalYear,
      currency: 'KES',
      
      obligations,
      timeline,
      summary,
      alerts,
      
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Generate alerts based on obligations
   */
  private static generateAlerts(
    obligations: TaxObligationSummary[],
    timeline: TaxCalendar['timeline']
  ): TaxAlert[] {
    const alerts: TaxAlert[] = [];

    // Critical: Overdue obligations
    if (timeline.overdue.length > 0) {
      alerts.push({
        severity: 'critical',
        message: `🚨 ${timeline.overdue.length} overdue tax obligations - IMMEDIATE ACTION REQUIRED`,
        dueDate: timeline.overdue[0].dueDate
      });

      timeline.overdue.forEach(ob => {
        alerts.push({
          severity: 'critical',
          message: `Overdue: ${ob.description} (${ob.taxType}) - ${Math.abs(ob.daysUntilDue)} days late`,
          obligationId: ob.description,
          dueDate: ob.dueDate
        });
      });
    }

    // Warning: Due within 7 days
    const dueSoon = obligations.filter(ob => !ob.isPaid && ob.daysUntilDue >= 0 && ob.daysUntilDue <= 7);
    if (dueSoon.length > 0) {
      alerts.push({
        severity: 'warning',
        message: `⚠️ ${dueSoon.length} tax obligations due within 7 days`,
        dueDate: dueSoon[0].dueDate
      });

      dueSoon.forEach(ob => {
        alerts.push({
          severity: 'warning',
          message: `Due ${ob.daysUntilDue === 0 ? 'TODAY' : `in ${ob.daysUntilDue} days`}: ${ob.description} - ${ob.estimatedAmount.toLocaleString()}`,
          obligationId: ob.description,
          dueDate: ob.dueDate
        });
      });
    }

    // Info: Upcoming in next 30 days
    const upcoming = timeline.next30Days.filter(ob => ob.daysUntilDue > 7);
    if (upcoming.length > 0) {
      const totalAmount = upcoming.reduce((sum, ob) => sum + ob.estimatedAmount, 0);
      alerts.push({
        severity: 'info',
        message: `💡 ${upcoming.length} tax obligations in next 30 days totaling ${totalAmount.toLocaleString()}`,
        dueDate: upcoming[0].dueDate
      });
    }

    return alerts;
  }

  /**
   * Validate tax calendar input
   */
  static validate(input: TaxCalendarInput): ValidationResult {
    const errors: ValidationError[] = [];

    if (!input.companyId) {
      errors.push({ field: 'companyId', message: 'Company ID is required', code: 'REQUIRED' });
    }

    if (!input.fiscalYear || input.fiscalYear < 2000 || input.fiscalYear > 2100) {
      errors.push({ 
        field: 'fiscalYear', 
        message: 'Valid fiscal year is required (2000-2100)', 
        code: 'INVALID_VALUE' 
      });
    }

    if (!Array.isArray(input.obligations)) {
      errors.push({ 
        field: 'obligations', 
        message: 'Obligations must be an array', 
        code: 'INVALID_TYPE' 
      });
      return { valid: false, errors };
    }

    // Validate each obligation
    input.obligations.forEach((ob, index) => {
      if (!ob.description?.trim()) {
        errors.push({ 
          field: `obligations[${index}].description`, 
          message: `Obligation ${index + 1}: Description is required`, 
          code: 'REQUIRED' 
        });
      }

      if (!ob.dueDate) {
        errors.push({ 
          field: `obligations[${index}].dueDate`, 
          message: `Obligation ${index + 1}: Due date is required`, 
          code: 'REQUIRED' 
        });
      }

      if (typeof ob.estimatedAmount !== 'number' || ob.estimatedAmount < 0) {
        errors.push({ 
          field: `obligations[${index}].estimatedAmount`, 
          message: `Obligation ${index + 1}: Estimated amount must be non-negative`, 
          code: 'INVALID_VALUE' 
        });
      }

      if (typeof ob.isPaid !== 'boolean') {
        errors.push({ 
          field: `obligations[${index}].isPaid`, 
          message: `Obligation ${index + 1}: isPaid must be boolean`, 
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
   * Get insights and recommendations
   */
  static getInsights(calendar: TaxCalendar): string[] {
    const insights: string[] = [];

    // Overall status
    insights.push(`📅 Tax Calendar for FY ${calendar.fiscalYear}`);
    insights.push(`Total Obligations: ${calendar.summary.totalObligations}`);
    insights.push(`Total Estimated: ${calendar.summary.totalEstimatedAmount.toLocaleString()}`);
    insights.push(`Paid: ${calendar.summary.totalPaid.toLocaleString()}`);
    insights.push(`Outstanding: ${calendar.summary.totalOutstanding.toLocaleString()}`);

    // Overdue status
    if (calendar.summary.overdueCount > 0) {
      insights.push(`\n🚨 OVERDUE OBLIGATIONS:`);
      insights.push(`   Count: ${calendar.summary.overdueCount}`);
      insights.push(`   Amount: ${calendar.summary.overdueAmount.toLocaleString()}`);
      insights.push('   Action: Pay immediately to avoid penalties and interest');
    }

    // Upcoming obligations
    if (calendar.timeline.next30Days.length > 0) {
      const total = calendar.timeline.next30Days.reduce((sum, ob) => sum + ob.estimatedAmount, 0);
      insights.push(`\n📌 Next 30 Days:`);
      insights.push(`   ${calendar.timeline.next30Days.length} obligations totaling ${total.toLocaleString()}`);
      
      // List critical ones
      const critical = calendar.timeline.next30Days.filter(ob => ob.priority === 'critical');
      if (critical.length > 0) {
        insights.push(`   🚨 ${critical.length} require immediate attention:`);
        critical.slice(0, 3).forEach(ob => {
          insights.push(`      • ${ob.description}: ${ob.estimatedAmount.toLocaleString()} (due in ${ob.daysUntilDue} days)`);
        });
      }
    }

    // By tax type
    const byType = calendar.obligations.reduce((acc, ob) => {
      if (!acc[ob.taxType]) {
        acc[ob.taxType] = { count: 0, total: 0, paid: 0 };
      }
      acc[ob.taxType].count++;
      acc[ob.taxType].total += ob.estimatedAmount;
      if (ob.isPaid) {
        acc[ob.taxType].paid += ob.paidAmount || ob.estimatedAmount;
      }
      return acc;
    }, {} as Record<string, { count: number; total: number; paid: number }>);

    insights.push(`\n📊 By Tax Type:`);
    Object.entries(byType).forEach(([type, data]) => {
      const outstanding = data.total - data.paid;
      insights.push(`   ${type}: ${data.count} obligations, ${outstanding.toLocaleString()} outstanding`);
    });

    // Recommendations
    insights.push(`\n💡 Recommendations:`);
    if (calendar.summary.overdueCount > 0) {
      insights.push('   1. Pay all overdue obligations immediately');
    }
    if (calendar.timeline.next30Days.length > 0) {
      insights.push('   2. Review upcoming payments and ensure sufficient cash');
    }
    insights.push('   3. Set calendar reminders for obligations 7 days before due date');
    insights.push('   4. Consider setting up automated tax payments where possible');

    return insights;
  }

  /**
   * Calculate cash impact for upcoming tax payments
   */
  static calculateCashImpact(calendar: TaxCalendar, weeks: number = 13): {
    weeklyPayments: Array<{ week: number; amount: number; obligations: number }>;
    totalCashNeeded: number;
  } {
    const today = new Date();
    const weeklyPayments = Array.from({ length: weeks }, (_, i) => ({
      week: i + 1,
      amount: 0,
      obligations: 0
    }));

    calendar.obligations
      .filter(ob => !ob.isPaid && ob.daysUntilDue >= 0)
      .forEach(ob => {
        const weekNumber = Math.floor(ob.daysUntilDue / 7);
        if (weekNumber < weeks) {
          weeklyPayments[weekNumber].amount += ob.estimatedAmount;
          weeklyPayments[weekNumber].obligations++;
        }
      });

    const totalCashNeeded = weeklyPayments.reduce((sum, week) => sum + week.amount, 0);

    return {
      weeklyPayments,
      totalCashNeeded
    };
  }

  /**
   * Helper: Generate unique ID
   */
  private static generateId(): string {
    return `tax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
