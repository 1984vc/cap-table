// app/src/library/financial-toolkit/calculators/CapexCalculator.ts
/**
 * CAPEX Calculator - FULLY FIXED VERSION
 * Shows complete fix pattern for all issues
 * 
 * FIXES APPLIED:
 * ✅ Currency parameterization (not hardcoded)
 * ✅ Shared utilities (IdGenerator, CalcUtils, Validator)
 * ✅ Unified type imports
 * ✅ Consistent validation messages
 * ✅ Integration methods for CashForecastCalculator
 * ✅ No code duplication
 */

import type {
  Capex,
  CapexInput,
  CapexPayment,
  ValidationResult,
  ValidationError,
  Currency
} from '../types'; // ✅ Unified import
import { IdGenerator, CalcUtils, Validator, StatusDeterminer } from '../utils/shared'; // ✅ Shared utils

export class CapexCalculator {
  /**
   * Calculate CAPEX project metrics with ROI and timeline analysis
   */
  static calculate(input: CapexInput): Capex {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const currency = input.currency || 'KES'; // ✅ Configurable currency

    // Budget tracking
    const spendToDate = input.spendToDate || 0;
    const remaining = input.budgeted - spendToDate;
    const percentComplete = CalcUtils.percent(spendToDate, input.budgeted); // ✅ Shared util

    // Timeline analysis using shared utility
    const daysRemaining = CalcUtils.daysBetween(
      new Date().toISOString().split('T')[0], 
      input.expectedCompletionDate
    ); // ✅ Shared util

    let timelineStatus: 'on-track' | 'at-risk' | 'delayed' | 'complete';
    if (percentComplete >= 100) {
      timelineStatus = 'complete';
    } else if (daysRemaining < 0) {
      timelineStatus = 'delayed';
    } else if (percentComplete < 50 && daysRemaining < 30) {
      timelineStatus = 'at-risk';
    } else {
      timelineStatus = 'on-track';
    }

    // Cash flow analysis
    const plannedPayments = input.plannedPayments || [];
    const totalPlanned = plannedPayments.reduce((sum, p) => sum + p.amount, 0);
    const paidToDate = spendToDate;
    const cashRemaining = totalPlanned - paidToDate;

    // Financial metrics - ROI calculation
    let roi: number | undefined;
    let paybackPeriod: number | undefined;

    if (input.expectedAnnualBenefit && input.expectedUsefulLife) {
      const totalBenefit = input.expectedAnnualBenefit * input.expectedUsefulLife;
      roi = CalcUtils.percent(totalBenefit - input.budgeted, input.budgeted); // ✅ Shared util
      
      if (input.expectedAnnualBenefit > 0) {
        paybackPeriod = input.budgeted / input.expectedAnnualBenefit;
      }
    }

    const now = Date.now();

    return {
      id: IdGenerator.generate('capex'), // ✅ Shared ID generator
      companyId: input.companyId,
      projectName: input.projectName,
      category: input.category,
      currency, // ✅ Use variable, not hardcoded
      
      budget: {
        total: input.budgeted,
        spendToDate,
        remaining,
        percentComplete
      },
      
      timeline: {
        startDate: input.startDate,
        expectedCompletionDate: input.expectedCompletionDate,
        status: timelineStatus,
        daysRemaining
      },
      
      approval: {
        status: input.approvalStatus,
        approvedBy: input.approvedBy,
        approvalDate: input.approvalDate
      },
      
      financialMetrics: {
        roi,
        paybackPeriod
      },
      
      cashFlow: {
        plannedPayments,
        totalPlanned,
        paidToDate,
        remaining: cashRemaining
      },
      
      notes: input.notes,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * ✅ NEW: Integration method for CashForecastCalculator
   * Extracts payment schedule for cash planning
   */
  static extractPaymentSchedule(projects: Capex[]): Array<{
    date: string;
    amount: number;
    projectName: string;
    category: string;
  }> {
    return projects
      .filter(p => p.approval.status === 'approved' && p.timeline.status !== 'complete')
      .flatMap(project => 
        project.cashFlow.plannedPayments
          .filter(payment => {
            const paymentDate = new Date(payment.date);
            return paymentDate >= new Date(); // Only future payments
          })
          .map(payment => ({
            date: payment.date,
            amount: payment.amount,
            projectName: project.projectName,
            category: project.category
          }))
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * ✅ NEW: Calculate weekly CAPEX cash needs
   * Integrates with 13-week cash forecast
   */
  static weeklyCapexNeeds(projects: Capex[], startDate: string, weeks: number = 13): Array<{
    weekNumber: number;
    weekStart: string;
    totalCapex: number;
    projects: string[];
  }> {
    const weeklyNeeds: Array<any> = [];
    const start = new Date(startDate);

    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const weekPayments = projects
        .filter(p => p.approval.status === 'approved')
        .flatMap(p => 
          p.cashFlow.plannedPayments
            .filter(payment => {
              const paymentDate = new Date(payment.date);
              return paymentDate >= weekStart && paymentDate < weekEnd;
            })
            .map(payment => ({
              amount: payment.amount,
              projectName: p.projectName
            }))
        );

      weeklyNeeds.push({
        weekNumber: i + 1,
        weekStart: weekStart.toISOString().split('T')[0],
        totalCapex: weekPayments.reduce((sum, p) => sum + p.amount, 0),
        projects: [...new Set(weekPayments.map(p => p.projectName))]
      });
    }

    return weeklyNeeds;
  }

  /**
   * Validate CAPEX input - ✅ Using shared validators
   */
  static validate(input: CapexInput): ValidationResult {
    const errors: ValidationError[] = [];

    Validator.required(input.companyId, 'companyId', errors);
    Validator.required(input.projectName, 'projectName', errors);
    Validator.number(input.budgeted, 'budgeted', errors, { min: 0 });
    Validator.date(input.startDate, 'startDate', errors);
    Validator.date(input.expectedCompletionDate, 'expectedCompletionDate', errors);

    if (input.startDate && input.expectedCompletionDate) {
      Validator.dateRange(input.startDate, input.expectedCompletionDate, errors);
    }

    if (input.spendToDate !== undefined) {
      Validator.number(input.spendToDate, 'spendToDate', errors, { min: 0 });
      
      if (input.spendToDate > input.budgeted * 1.2) {
        errors.push({
          field: 'spendToDate',
          message: 'Spend significantly exceeds budget - verify data',
          code: 'BUSINESS_LOGIC_WARNING'
        });
      }
    }

    return {
      valid: errors.filter(e => e.code !== 'BUSINESS_LOGIC_WARNING').length === 0,
      errors
    };
  }

  /**
   * Get insights and recommendations
   */
  static getInsights(capex: Capex): string[] {
    const insights: string[] = [];

    // Budget status
    if (capex.budget.percentComplete > 100) {
      insights.push(`🚨 OVER BUDGET: ${capex.budget.percentComplete.toFixed(1)}% spent`);
      insights.push(`   • Over by: ${(capex.budget.spendToDate - capex.budget.total).toLocaleString()}`);
      insights.push('   • Action: Review scope, request budget increase');
    } else if (capex.budget.percentComplete > 90) {
      insights.push(`⚠️ Near budget limit: ${capex.budget.percentComplete.toFixed(1)}% spent`);
      insights.push(`   • Remaining: ${capex.budget.remaining.toLocaleString()}`);
    } else {
      insights.push(`✅ Budget on track: ${capex.budget.percentComplete.toFixed(1)}% spent`);
    }

    // Timeline status
    if (capex.timeline.status === 'delayed') {
      insights.push(`🚨 PROJECT DELAYED by ${Math.abs(capex.timeline.daysRemaining)} days`);
      insights.push('   • Action: Review timeline, communicate new completion date');
    } else if (capex.timeline.status === 'at-risk') {
      insights.push(`⚠️ Timeline at risk: ${capex.timeline.daysRemaining} days remaining`);
      insights.push(`   • Only ${capex.budget.percentComplete.toFixed(0)}% complete`);
      insights.push('   • Action: Accelerate work or revise timeline');
    } else if (capex.timeline.status === 'complete') {
      insights.push('✅ Project complete!');
    } else {
      insights.push(`✅ On track: ${capex.timeline.daysRemaining} days remaining`);
    }

    // ROI insights
    if (capex.financialMetrics.roi !== undefined) {
      if (capex.financialMetrics.roi > 50) {
        insights.push(`✅ Excellent ROI: ${capex.financialMetrics.roi.toFixed(1)}%`);
      } else if (capex.financialMetrics.roi > 20) {
        insights.push(`✅ Good ROI: ${capex.financialMetrics.roi.toFixed(1)}%`);
      } else if (capex.financialMetrics.roi > 0) {
        insights.push(`⚠️ Low ROI: ${capex.financialMetrics.roi.toFixed(1)}%`);
      } else {
        insights.push(`🚨 Negative ROI: ${capex.financialMetrics.roi.toFixed(1)}%`);
        insights.push('   • This investment will lose money');
      }
    }

    // Payback period
    if (capex.financialMetrics.paybackPeriod !== undefined) {
      if (capex.financialMetrics.paybackPeriod < 2) {
        insights.push(`✅ Quick payback: ${capex.financialMetrics.paybackPeriod.toFixed(1)} years`);
      } else if (capex.financialMetrics.paybackPeriod < 5) {
        insights.push(`✅ Reasonable payback: ${capex.financialMetrics.paybackPeriod.toFixed(1)} years`);
      } else {
        insights.push(`⚠️ Long payback: ${capex.financialMetrics.paybackPeriod.toFixed(1)} years`);
      }
    }

    // Approval status
    if (capex.approval.status === 'proposed') {
      insights.push('⏳ Awaiting approval');
    } else if (capex.approval.status === 'rejected') {
      insights.push('❌ Project rejected');
    } else if (capex.approval.status === 'on-hold') {
      insights.push('⏸️ Project on hold');
    }

    return insights;
  }

  /**
   * Prioritize projects by ROI and strategic value
   */
  static prioritizeProjects(projects: Capex[]): Capex[] {
    return [...projects].sort((a, b) => {
      const statusOrder = { approved: 1, proposed: 2, 'on-hold': 3, rejected: 4 };
      const aStatusPriority = statusOrder[a.approval.status];
      const bStatusPriority = statusOrder[b.approval.status];
      
      if (aStatusPriority !== bStatusPriority) {
        return aStatusPriority - bStatusPriority;
      }
      
      const aROI = a.financialMetrics.roi || 0;
      const bROI = b.financialMetrics.roi || 0;
      
      if (Math.abs(aROI - bROI) > 10) {
        return bROI - aROI;
      }
      
      const aPayback = a.financialMetrics.paybackPeriod || 999;
      const bPayback = b.financialMetrics.paybackPeriod || 999;
      
      return aPayback - bPayback;
    });
  }

  /**
   * Calculate aggregate summary
   */
  static summarize(projects: Capex[]): {
    totalBudget: number;
    totalSpend: number;
    totalRemaining: number;
    averagePercentComplete: number;
    projectsByStatus: Record<string, number>;
    averageROI: number;
    totalROI: number;
  } {
    const total = projects.reduce(
      (acc, p) => ({
        budget: acc.budget + p.budget.total,
        spend: acc.spend + p.budget.spendToDate,
        remaining: acc.remaining + p.budget.remaining,
        percentSum: acc.percentSum + p.budget.percentComplete,
        roiSum: acc.roiSum + (p.financialMetrics.roi || 0),
        roiCount: acc.roiCount + (p.financialMetrics.roi !== undefined ? 1 : 0)
      }),
      { budget: 0, spend: 0, remaining: 0, percentSum: 0, roiSum: 0, roiCount: 0 }
    );

    const projectsByStatus = projects.reduce((acc, p) => {
      acc[p.timeline.status] = (acc[p.timeline.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalBudget: total.budget,
      totalSpend: total.spend,
      totalRemaining: total.remaining,
      averagePercentComplete: projects.length > 0 ? total.percentSum / projects.length : 0,
      projectsByStatus,
      averageROI: total.roiCount > 0 ? total.roiSum / total.roiCount : 0,
      totalROI: total.roiSum
    };
  }
}
