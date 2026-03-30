// app/src/library/financial-toolkit/calculators/WorkingCapitalCalculator.ts
/**
 * Working Capital Calculator - PRODUCTION VERSION  
 * AR/AP Aging, DSO/DPO, Cash Conversion Cycle analysis
 * MIT Licensed
 */

import type { 
  WorkingCapital, 
  WorkingCapitalInput, 
  ValidationResult, 
  ValidationError 
} from '../types/phase1-types';

export class WorkingCapitalCalculator {
  /**
   * Calculate working capital metrics with AR/AP aging and optimization opportunities
   */
  static calculate(input: WorkingCapitalInput): WorkingCapital {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Calculate AR totals and metrics
    const arTotal = 
      input.arAging.current +
      input.arAging.days30 +
      input.arAging.days60 +
      input.arAging.days90Plus;

    const arOverdue = 
      input.arAging.days30 +
      input.arAging.days60 +
      input.arAging.days90Plus;

    const arOverduePercent = arTotal > 0 ? (arOverdue / arTotal) * 100 : 0;

    // DSO = (AR / Annual Revenue) * 365
    const dso = input.annualRevenue > 0 
      ? (arTotal / input.annualRevenue) * 365 
      : 0;

    // Credit Risk Assessment
    let creditRisk: 'low' | 'medium' | 'high';
    if (arOverduePercent < 15 && dso < 45) {
      creditRisk = 'low';
    } else if (arOverduePercent < 30 && dso < 60) {
      creditRisk = 'medium';
    } else {
      creditRisk = 'high';
    }

    // Calculate AP totals and metrics
    const apTotal = 
      input.apAging.current +
      input.apAging.days30 +
      input.apAging.days60 +
      input.apAging.days90Plus;

    const apOverdue = 
      input.apAging.days30 +
      input.apAging.days60 +
      input.apAging.days90Plus;

    const apOverduePercent = apTotal > 0 ? (apOverdue / apTotal) * 100 : 0;

    // DPO = (AP / Annual COGS) * 365
    const dpo = input.annualCOGS > 0 
      ? (apTotal / input.annualCOGS) * 365 
      : 0;

    // Payment Risk Assessment
    let paymentRisk: 'low' | 'medium' | 'high';
    if (apOverduePercent < 10) {
      paymentRisk = 'low';
    } else if (apOverduePercent < 25) {
      paymentRisk = 'medium';
    } else {
      paymentRisk = 'high';
    }

    // Cash Conversion Cycle
    // DIO (Days Inventory Outstanding) - only if inventory provided
    const dio = input.inventory && input.annualCOGS > 0 
      ? (input.inventory / input.annualCOGS) * 365 
      : 0;

    const ccc = dso + dio - dpo;

    // CCC Status
    let cccStatus: 'excellent' | 'good' | 'needs-improvement' | 'critical';
    if (ccc < 30) {
      cccStatus = 'excellent';
    } else if (ccc < 60) {
      cccStatus = 'good';
    } else if (ccc < 90) {
      cccStatus = 'needs-improvement';
    } else {
      cccStatus = 'critical';
    }

    // Optimization Opportunities
    // Target: Reduce DSO by 10%
    const targetDSO = dso * 0.9;
    const dsoReductionDays = dso - targetDSO;
    const cashFreedFromDSO = (dsoReductionDays / 365) * input.annualRevenue;

    // Target: Extend DPO by 7 days
    const targetDPO = dpo + 7;
    const dpoExtensionDays = targetDPO - dpo;
    const cashBenefitFromDPO = (dpoExtensionDays / 365) * input.annualCOGS;

    const totalPotential = cashFreedFromDSO + cashBenefitFromDPO;

    const now = Date.now();

    return {
      id: this.generateId(),
      companyId: input.companyId,
      asOfDate: input.asOfDate,
      currency: 'KES',
      
      accountsReceivable: {
        aging: {
          current: input.arAging.current,
          days30: input.arAging.days30,
          days60: input.arAging.days60,
          days90Plus: input.arAging.days90Plus,
          total: arTotal
        },
        dso,
        overdue: arOverdue,
        overduePercent: arOverduePercent,
        creditRisk
      },
      
      accountsPayable: {
        aging: {
          current: input.apAging.current,
          days30: input.apAging.days30,
          days60: input.apAging.days60,
          days90Plus: input.apAging.days90Plus,
          total: apTotal
        },
        dpo,
        overdue: apOverdue,
        overduePercent: apOverduePercent,
        paymentRisk
      },
      
      cashConversionCycle: {
        dso,
        dio,
        dpo,
        ccc,
        status: cccStatus
      },
      
      opportunities: {
        dsoReduction: {
          targetDays: targetDSO,
          cashFreed: cashFreedFromDSO
        },
        dpoExtension: {
          targetDays: targetDPO,
          cashBenefit: cashBenefitFromDPO
        },
        totalPotential
      },
      
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Validate working capital input
   */
  static validate(input: WorkingCapitalInput): ValidationResult {
    const errors: ValidationError[] = [];

    if (!input.companyId) {
      errors.push({ 
        field: 'companyId', 
        message: 'Company ID is required', 
        code: 'REQUIRED' 
      });
    }

    if (!input.asOfDate) {
      errors.push({ 
        field: 'asOfDate', 
        message: 'As-of date is required', 
        code: 'REQUIRED' 
      });
    }

    // Validate AR aging buckets
    const arFields = ['current', 'days30', 'days60', 'days90Plus'];
    arFields.forEach(field => {
      const value = input.arAging[field as keyof typeof input.arAging];
      if (typeof value !== 'number' || isNaN(value) || value < 0) {
        errors.push({ 
          field: `arAging.${field}`, 
          message: `AR ${field} must be a non-negative number`, 
          code: 'INVALID_VALUE' 
        });
      }
    });

    // Validate AP aging buckets
    const apFields = ['current', 'days30', 'days60', 'days90Plus'];
    apFields.forEach(field => {
      const value = input.apAging[field as keyof typeof input.apAging];
      if (typeof value !== 'number' || isNaN(value) || value < 0) {
        errors.push({ 
          field: `apAging.${field}`, 
          message: `AP ${field} must be a non-negative number`, 
          code: 'INVALID_VALUE' 
        });
      }
    });

    // Validate annual revenue and COGS
    if (typeof input.annualRevenue !== 'number' || isNaN(input.annualRevenue) || input.annualRevenue < 0) {
      errors.push({ 
        field: 'annualRevenue', 
        message: 'Annual revenue must be a non-negative number', 
        code: 'INVALID_VALUE' 
      });
    }

    if (typeof input.annualCOGS !== 'number' || isNaN(input.annualCOGS) || input.annualCOGS < 0) {
      errors.push({ 
        field: 'annualCOGS', 
        message: 'Annual COGS must be a non-negative number', 
        code: 'INVALID_VALUE' 
      });
    }

    // Inventory is optional but must be valid if provided
    if (input.inventory !== undefined) {
      if (typeof input.inventory !== 'number' || isNaN(input.inventory) || input.inventory < 0) {
        errors.push({ 
          field: 'inventory', 
          message: 'Inventory must be a non-negative number if provided', 
          code: 'INVALID_VALUE' 
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get actionable insights and recommendations
   */
  static getInsights(wc: WorkingCapital): string[] {
    const insights: string[] = [];
    const { accountsReceivable: ar, accountsPayable: ap, cashConversionCycle: ccc, opportunities } = wc;

    // Overall CCC Status
    insights.push(`💰 Cash Conversion Cycle: ${ccc.ccc.toFixed(0)} days - ${ccc.status.toUpperCase()}`);
    if (ccc.status === 'excellent') {
      insights.push('   ✅ Outstanding working capital management!');
    } else if (ccc.status === 'good') {
      insights.push('   ✅ Good working capital efficiency');
    } else if (ccc.status === 'needs-improvement') {
      insights.push('   ⚠️ Working capital needs optimization');
    } else {
      insights.push('   🚨 Critical: Working capital is tying up too much cash');
    }

    // AR Analysis
    insights.push(`\n📥 Accounts Receivable (DSO: ${ar.dso.toFixed(0)} days):`);
    
    if (ar.creditRisk === 'low') {
      insights.push('   ✅ Low credit risk - Strong collections performance');
    } else if (ar.creditRisk === 'medium') {
      insights.push('   ⚠️ Medium credit risk - Monitor collections closely');
      insights.push(`   • ${ar.overduePercent.toFixed(1)}% of AR is overdue`);
    } else {
      insights.push('   🚨 High credit risk - Immediate action required');
      insights.push(`   • ${ar.overduePercent.toFixed(1)}% of AR is overdue`);
      insights.push('   • Implement aggressive collection strategy');
    }

    // AR Aging Breakdown
    if (ar.overdue > 0) {
      insights.push(`   Overdue breakdown:`);
      if (ar.aging.days30 > 0) {
        insights.push(`   • 30-60 days: ${ar.aging.days30.toLocaleString()}`);
      }
      if (ar.aging.days60 > 0) {
        insights.push(`   • 60-90 days: ${ar.aging.days60.toLocaleString()} ⚠️`);
      }
      if (ar.aging.days90Plus > 0) {
        insights.push(`   • 90+ days: ${ar.aging.days90Plus.toLocaleString()} 🚨 (high risk)`);
      }
    }

    // DSO Benchmark
    if (ar.dso < 30) {
      insights.push('   💡 DSO is excellent (<30 days)');
    } else if (ar.dso < 45) {
      insights.push('   ✅ DSO is good (30-45 days)');
    } else if (ar.dso < 60) {
      insights.push('   ⚠️ DSO needs improvement (45-60 days)');
    } else {
      insights.push('   🚨 DSO is critical (>60 days) - Cash is locked up');
    }

    // AP Analysis
    insights.push(`\n📤 Accounts Payable (DPO: ${ap.dpo.toFixed(0)} days):`);
    
    if (ap.paymentRisk === 'low') {
      insights.push('   ✅ Low payment risk - Good supplier relationships');
    } else if (ap.paymentRisk === 'medium') {
      insights.push('   ⚠️ Medium payment risk - Some overdue payments');
      insights.push(`   • ${ap.overduePercent.toFixed(1)}% of AP is overdue`);
    } else {
      insights.push('   🚨 High payment risk - Many overdue payments');
      insights.push(`   • ${ap.overduePercent.toFixed(1)}% of AP is overdue`);
      insights.push('   • Risk of supplier relationship damage');
      insights.push('   • Prioritize critical supplier payments');
    }

    // DPO Benchmark
    if (ap.dpo > 60) {
      insights.push('   💡 DPO is strong (>60 days) - Good payment terms');
    } else if (ap.dpo > 45) {
      insights.push('   ✅ DPO is reasonable (45-60 days)');
    } else if (ap.dpo > 30) {
      insights.push('   ⚠️ DPO is short (30-45 days) - Consider negotiating terms');
    } else {
      insights.push('   🚨 DPO is very short (<30 days) - Negotiate better terms');
    }

    // Optimization Opportunities
    insights.push(`\n🎯 Working Capital Optimization Opportunities:`);
    insights.push(`   Total potential cash improvement: ${opportunities.totalPotential.toLocaleString()}`);
    insights.push('');
    insights.push(`   1. DSO Reduction (Target: ${opportunities.dsoReduction.targetDays.toFixed(0)} days)`);
    insights.push(`      • Reduce from ${ar.dso.toFixed(0)} to ${opportunities.dsoReduction.targetDays.toFixed(0)} days`);
    insights.push(`      • Cash freed: ${opportunities.dsoReduction.cashFreed.toLocaleString()}`);
    insights.push('      Actions:');
    insights.push('      - Implement automated payment reminders');
    insights.push('      - Offer 2% discount for payment within 10 days');
    insights.push('      - Weekly collection calls for 30+ day invoices');
    insights.push('      - Require upfront deposits from slow payers');
    insights.push('');
    insights.push(`   2. DPO Extension (Target: ${opportunities.dpoExtension.targetDays.toFixed(0)} days)`);
    insights.push(`      • Extend from ${ap.dpo.toFixed(0)} to ${opportunities.dpoExtension.targetDays.toFixed(0)} days`);
    insights.push(`      • Cash benefit: ${opportunities.dpoExtension.cashBenefit.toLocaleString()}`);
    insights.push('      Actions:');
    insights.push('      - Negotiate Net 45 or Net 60 terms with top suppliers');
    insights.push('      - Leverage good payment history in negotiations');
    insights.push('      - Consider early payment discounts vs extended terms');

    // DIO Analysis (if inventory data available)
    if (ccc.dio > 0) {
      insights.push(`\n📦 Inventory (DIO: ${ccc.dio.toFixed(0)} days):`);
      if (ccc.dio < 30) {
        insights.push('   ✅ Excellent inventory turnover (<30 days)');
      } else if (ccc.dio < 60) {
        insights.push('   ✅ Good inventory turnover (30-60 days)');
      } else if (ccc.dio < 90) {
        insights.push('   ⚠️ Slow inventory turnover (60-90 days)');
        insights.push('   • Consider reducing inventory levels');
      } else {
        insights.push('   🚨 Very slow inventory turnover (>90 days)');
        insights.push('   • Significant cash tied up in inventory');
        insights.push('   • Review slow-moving SKUs');
        insights.push('   • Implement just-in-time ordering');
      }
    }

    return insights;
  }

  /**
   * Calculate payment prioritization (which suppliers to pay first)
   */
  static prioritizePayments(
    suppliers: Array<{
      name: string;
      amount: number;
      daysOverdue: number;
      isCritical: boolean; // Critical supplier (e.g., key raw materials)
    }>
  ): Array<{
    name: string;
    amount: number;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    reason: string;
  }> {
    return suppliers
      .map(supplier => {
        let priority: 'urgent' | 'high' | 'medium' | 'low';
        let reason: string;

        if (supplier.isCritical && supplier.daysOverdue > 30) {
          priority = 'urgent';
          reason = 'Critical supplier + significantly overdue';
        } else if (supplier.daysOverdue > 60) {
          priority = 'urgent';
          reason = 'Severely overdue (>60 days)';
        } else if (supplier.isCritical) {
          priority = 'high';
          reason = 'Critical supplier';
        } else if (supplier.daysOverdue > 30) {
          priority = 'high';
          reason = 'Overdue >30 days';
        } else if (supplier.daysOverdue > 0) {
          priority = 'medium';
          reason = 'Overdue but within tolerance';
        } else {
          priority = 'low';
          reason = 'Not yet due';
        }

        return {
          name: supplier.name,
          amount: supplier.amount,
          priority,
          reason
        };
      })
      .sort((a, b) => {
        const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }

  /**
   * Calculate collection prioritization (which customers to chase first)
   */
  static prioritizeCollections(
    customers: Array<{
      name: string;
      amount: number;
      daysOverdue: number;
      historicalPaymentDays: number; // Average payment days historically
    }>
  ): Array<{
    name: string;
    amount: number;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    action: string;
  }> {
    return customers
      .map(customer => {
        let priority: 'urgent' | 'high' | 'medium' | 'low';
        let action: string;

        if (customer.daysOverdue > 90) {
          priority = 'urgent';
          action = 'Escalate to collections/legal';
        } else if (customer.daysOverdue > 60) {
          priority = 'urgent';
          action = 'Final notice + payment plan offer';
        } else if (customer.daysOverdue > 45) {
          priority = 'high';
          action = 'Formal demand letter + phone call';
        } else if (customer.daysOverdue > 30) {
          priority = 'high';
          action = 'Follow-up call + late fee notice';
        } else if (customer.daysOverdue > 15) {
          priority = 'medium';
          action = 'Friendly payment reminder';
        } else {
          priority = 'low';
          action = 'Monitor - not yet concerning';
        }

        return {
          name: customer.name,
          amount: customer.amount,
          priority,
          action
        };
      })
      .sort((a, b) => {
        const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        // Within same priority, sort by amount (largest first)
        return b.amount - a.amount;
      });
  }

  /**
   * Helper: Generate unique ID
   */
  private static generateId(): string {
    return `wc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
