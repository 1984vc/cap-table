// app/src/library/financial-toolkit/calculators/PayrollCalculator.ts
/**
 * Payroll Calculator - PRODUCTION VERSION
 * Department-level payroll tracking, affordability analysis, hiring capacity
 * MIT Licensed
 */

import type {
  Payroll,
  PayrollInput,
  PayrollDepartment,
  PayrollDepartmentSummary,
  ValidationResult,
  ValidationError
} from '../types/phase2-types';

export class PayrollCalculator {
  /**
   * Calculate payroll metrics with department breakdown and hiring capacity
   */
  static calculate(input: PayrollInput): Payroll {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Calculate department summaries
    const totalCostAllDepts = input.departments.reduce((sum, dept) => 
      sum + dept.totalGrossPay + dept.totalBenefits + dept.totalTaxes, 0
    );

    const departments: PayrollDepartmentSummary[] = input.departments.map(dept => {
      const totalCost = dept.totalGrossPay + dept.totalBenefits + dept.totalTaxes;
      const costPerEmployee = dept.headcount > 0 ? totalCost / dept.headcount : 0;
      const percentOfTotal = totalCostAllDepts > 0 ? (totalCost / totalCostAllDepts) * 100 : 0;

      return {
        ...dept,
        totalCost,
        costPerEmployee,
        percentOfTotal
      };
    });

    // Calculate company totals
    const totals = {
      headcount: input.departments.reduce((sum, dept) => sum + dept.headcount, 0),
      grossPay: input.departments.reduce((sum, dept) => sum + dept.totalGrossPay, 0),
      benefits: input.departments.reduce((sum, dept) => sum + dept.totalBenefits, 0),
      taxes: input.departments.reduce((sum, dept) => sum + dept.totalTaxes, 0),
      totalCost: totalCostAllDepts
    };

    // Calculate metrics
    const costPerEmployee = totals.headcount > 0 ? totals.totalCost / totals.headcount : 0;
    const payrollAsPercentRevenue = input.totalRevenue 
      ? (totals.totalCost / input.totalRevenue) * 100 
      : undefined;

    // Affordability analysis
    // Rule of thumb: Payroll should be <50% of revenue for sustainability
    // Can afford additional headcount if payroll < 40% of revenue
    let maxAffordableHeadcount = totals.headcount;
    let hiringCapacity = 0;
    let recommendation = 'Track payroll % of revenue to ensure sustainability';

    if (input.totalRevenue && costPerEmployee > 0) {
      const targetPayrollPercent = 0.40; // 40% is sustainable
      const maxPayroll = input.totalRevenue * targetPayrollPercent;
      maxAffordableHeadcount = Math.floor(maxPayroll / costPerEmployee);
      hiringCapacity = Math.max(0, maxAffordableHeadcount - totals.headcount);

      if (payrollAsPercentRevenue! > 50) {
        recommendation = '🚨 Payroll >50% of revenue - CRITICAL: Reduce costs or increase revenue';
      } else if (payrollAsPercentRevenue! > 40) {
        recommendation = '⚠️ Payroll >40% of revenue - Limited hiring capacity, focus on efficiency';
      } else if (hiringCapacity >= 10) {
        recommendation = `✅ Healthy payroll ratio - Can afford ${hiringCapacity} more FTEs`;
      } else if (hiringCapacity > 0) {
        recommendation = `✅ Can afford ${hiringCapacity} more FTEs at current cost per employee`;
      } else {
        recommendation = '⚠️ At hiring limit - Any new hires require revenue growth or cost reduction';
      }
    }

    const now = Date.now();

    return {
      id: this.generateId(),
      companyId: input.companyId,
      period: input.period,
      currency: 'KES',
      
      departments,
      totals,
      
      metrics: {
        costPerEmployee,
        payrollAsPercentRevenue,
        monthOverMonthChange: undefined // Would need prior period for this
      },
      
      affordability: {
        maxAffordableHeadcount,
        hiringCapacity,
        recommendation
      },
      
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Validate payroll input
   */
  static validate(input: PayrollInput): ValidationResult {
    const errors: ValidationError[] = [];

    if (!input.companyId) {
      errors.push({ field: 'companyId', message: 'Company ID is required', code: 'REQUIRED' });
    }

    if (!input.period) {
      errors.push({ field: 'period', message: 'Period is required', code: 'REQUIRED' });
    }

    if (!Array.isArray(input.departments) || input.departments.length === 0) {
      errors.push({ 
        field: 'departments', 
        message: 'At least one department is required', 
        code: 'REQUIRED' 
      });
      return { valid: false, errors };
    }

    // Validate each department
    input.departments.forEach((dept, index) => {
      if (!dept.name?.trim()) {
        errors.push({ 
          field: `departments[${index}].name`, 
          message: `Department ${index + 1}: Name is required`, 
          code: 'REQUIRED' 
        });
      }

      if (typeof dept.headcount !== 'number' || dept.headcount < 0) {
        errors.push({ 
          field: `departments[${index}].headcount`, 
          message: `Department ${index + 1}: Headcount must be non-negative`, 
          code: 'INVALID_VALUE' 
        });
      }

      const numericFields = ['totalGrossPay', 'totalBenefits', 'totalTaxes'];
      numericFields.forEach(field => {
        const value = dept[field as keyof PayrollDepartment] as number;
        if (typeof value !== 'number' || value < 0) {
          errors.push({ 
            field: `departments[${index}].${field}`, 
            message: `Department ${index + 1}: ${field} must be non-negative`, 
            code: 'INVALID_VALUE' 
          });
        }
      });
    });

    if (input.totalRevenue !== undefined && input.totalRevenue < 0) {
      errors.push({ 
        field: 'totalRevenue', 
        message: 'Total revenue cannot be negative', 
        code: 'INVALID_VALUE' 
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get insights and recommendations
   */
  static getInsights(payroll: Payroll): string[] {
    const insights: string[] = [];

    // Overall payroll status
    insights.push(`👥 Total Headcount: ${payroll.totals.headcount} FTE`);
    insights.push(`💰 Total Payroll Cost: ${payroll.totals.totalCost.toLocaleString()}/month`);
    insights.push(`📊 Cost per Employee: ${payroll.metrics.costPerEmployee.toLocaleString()}/month`);

    // Payroll as % of revenue
    if (payroll.metrics.payrollAsPercentRevenue !== undefined) {
      const percent = payroll.metrics.payrollAsPercentRevenue;
      insights.push(`\n💵 Payroll as % of Revenue: ${percent.toFixed(1)}%`);
      
      if (percent > 50) {
        insights.push('   🚨 CRITICAL: Payroll >50% of revenue');
        insights.push('   • Immediate cost reduction or revenue increase needed');
        insights.push('   • Consider: Hiring freeze, role consolidation, automation');
      } else if (percent > 40) {
        insights.push('   ⚠️ WARNING: Payroll >40% of revenue');
        insights.push('   • Limited room for growth');
        insights.push('   • Focus on revenue growth or efficiency improvements');
      } else if (percent > 30) {
        insights.push('   ✅ Healthy range (30-40%)');
        insights.push('   • Sustainable but monitor closely');
      } else {
        insights.push('   ✅ Excellent (<30%)');
        insights.push('   • Room for strategic hiring');
      }
    }

    // Hiring capacity
    insights.push(`\n🎯 Hiring Capacity:`);
    insights.push(payroll.affordability.recommendation);
    if (payroll.affordability.hiringCapacity > 0) {
      insights.push(`   • Can afford ${payroll.affordability.hiringCapacity} additional FTEs`);
      insights.push(`   • At ${payroll.metrics.costPerEmployee.toLocaleString()}/FTE`);
    }

    // Department analysis
    insights.push(`\n🏢 Department Breakdown:`);
    const sortedDepts = [...payroll.departments]
      .sort((a, b) => b.percentOfTotal - a.percentOfTotal)
      .slice(0, 5); // Top 5 departments

    sortedDepts.forEach(dept => {
      insights.push(`   ${dept.name}: ${dept.headcount} FTE, ${dept.percentOfTotal.toFixed(1)}% of total`);
    });

    // Cost per employee by department
    const highCostDepts = payroll.departments
      .filter(dept => dept.costPerEmployee > payroll.metrics.costPerEmployee * 1.5)
      .sort((a, b) => b.costPerEmployee - a.costPerEmployee);

    if (highCostDepts.length > 0) {
      insights.push(`\n💸 High Cost Departments (>50% above average):`);
      highCostDepts.forEach(dept => {
        insights.push(`   ${dept.name}: ${dept.costPerEmployee.toLocaleString()}/FTE`);
      });
    }

    return insights;
  }

  /**
   * Compare with prior period
   */
  static compare(current: Payroll, prior: Payroll): {
    headcountChange: number;
    costChange: number;
    costChangePercent: number;
    costPerEmployeeChange: number;
  } {
    return {
      headcountChange: current.totals.headcount - prior.totals.headcount,
      costChange: current.totals.totalCost - prior.totals.totalCost,
      costChangePercent: prior.totals.totalCost > 0 
        ? ((current.totals.totalCost - prior.totals.totalCost) / prior.totals.totalCost) * 100 
        : 0,
      costPerEmployeeChange: current.metrics.costPerEmployee - prior.metrics.costPerEmployee
    };
  }

  /**
   * Determine hiring affordability for specific roles
   */
  static canAffordHire(
    payroll: Payroll,
    proposedSalary: number,
    totalRevenue: number,
    cashBalance: number,
    monthlyBurnRate: number
  ): {
    canAfford: boolean;
    reason: string;
    impact: {
      newPayrollPercent: number;
      newBurnRate: number;
      runwayImpact: number; // weeks
    };
  } {
    const proposedFullCost = proposedSalary * 1.35; // Salary + 35% for benefits/taxes
    const newTotalCost = payroll.totals.totalCost + proposedFullCost;
    const newPayrollPercent = (newTotalCost / totalRevenue) * 100;
    const newBurnRate = monthlyBurnRate + proposedFullCost;
    const currentRunway = cashBalance / monthlyBurnRate;
    const newRunway = cashBalance / newBurnRate;
    const runwayImpact = (currentRunway - newRunway) * 4.33; // Convert months to weeks

    let canAfford = true;
    let reason = '';

    if (newPayrollPercent > 50) {
      canAfford = false;
      reason = `Payroll would be ${newPayrollPercent.toFixed(1)}% of revenue (>50% is unsustainable)`;
    } else if (newRunway < 3) { // Less than 3 months runway
      canAfford = false;
      reason = `Runway would drop to ${newRunway.toFixed(1)} months (need minimum 3 months)`;
    } else if (newPayrollPercent > 45) {
      canAfford = false;
      reason = `Payroll would be ${newPayrollPercent.toFixed(1)}% (need revenue growth first)`;
    } else {
      reason = `✅ Affordable - Payroll would be ${newPayrollPercent.toFixed(1)}% of revenue`;
    }

    return {
      canAfford,
      reason,
      impact: {
        newPayrollPercent,
        newBurnRate,
        runwayImpact
      }
    };
  }

  /**
   * Helper: Generate unique ID
   */
  private static generateId(): string {
    return `payroll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
