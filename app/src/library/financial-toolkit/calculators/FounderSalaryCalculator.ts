// app/src/library/financial-toolkit/calculators/FounderSalaryCalculator.ts
/**
 * Founder Salary Calculator - PRODUCTION VERSION
 * Determines affordable founder compensation
 * MIT Licensed
 */

import type { 
  FounderSalaryCalc, 
  FounderSalaryInput, 
  ValidationResult, 
  ValidationError 
} from '../types';

export class FounderSalaryCalculator {
  /**
   * Calculate founder salary affordability and recommendations
   */
  static calculate(input: FounderSalaryInput): FounderSalaryCalc {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Calculate total personal expenses
    const totalExpenses = 
      input.rent + 
      input.food + 
      input.school + 
      input.transport + 
      input.insurance + 
      input.savings + 
      input.other;

    // Minimum salary = expenses + 20% buffer
    const minimumSalary = totalExpenses * 1.2;

    // Check affordability criteria
    const profitCoversMin = input.businessProfit >= minimumSalary;
    const cashCovers3Months = input.businessCash >= (minimumSalary * 3);
    const canAfford = profitCoversMin && cashCovers3Months;

    // Determine recommended salary
    let recommendedSalary = 0;
    let reasoning = '';

    if (canAfford) {
      recommendedSalary = minimumSalary;
      reasoning = `Your business can afford to pay you KES ${minimumSalary.toLocaleString()}/month. ` +
        `Profit (${input.businessProfit.toLocaleString()}) covers the salary and ` +
        `cash balance (${input.businessCash.toLocaleString()}) covers 3-month reserve.`;
    } else if (!profitCoversMin) {
      recommendedSalary = 0;
      const deficit = minimumSalary - input.businessProfit;
      reasoning = `Business profit (${input.businessProfit.toLocaleString()}) is ` +
        `${deficit.toLocaleString()} short of minimum salary (${minimumSalary.toLocaleString()}). ` +
        `Focus on profitability first. Consider paying yourself when monthly profit exceeds ${minimumSalary.toLocaleString()}.`;
    } else if (!cashCovers3Months) {
      recommendedSalary = 0;
      const requiredReserve = minimumSalary * 3;
      const shortfall = requiredReserve - input.businessCash;
      reasoning = `While profit covers salary, cash balance (${input.businessCash.toLocaleString()}) ` +
        `is ${shortfall.toLocaleString()} short of required 3-month reserve (${requiredReserve.toLocaleString()}). ` +
        `Build cash reserves before taking salary.`;
    }

    const now = Date.now();

    return {
      id: this.generateId(),
      companyId: input.companyId,
      personalExpenses: {
        rent: input.rent,
        food: input.food,
        school: input.school,
        transport: input.transport,
        insurance: input.insurance,
        savings: input.savings,
        other: input.other,
        total: totalExpenses
      },
      minimumSalary,
      businessFinancials: {
        monthlyProfit: input.businessProfit,
        cashBalance: input.businessCash
      },
      decision: {
        canAfford,
        profitCoversMin,
        cashCovers3Months,
        recommendedSalary,
        reasoning
      },
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Validate input data
   */
  static validate(input: FounderSalaryInput): ValidationResult {
    const errors: ValidationError[] = [];

    if (!input.companyId) {
      errors.push({ 
        field: 'companyId', 
        message: 'Company ID is required', 
        code: 'REQUIRED' 
      });
    }

    // Validate all numeric fields
    const numericFields = [
      'rent', 'food', 'school', 'transport', 
      'insurance', 'savings', 'other', 
      'businessProfit', 'businessCash'
    ];

    for (const field of numericFields) {
      const value = input[field as keyof FounderSalaryInput] as number;
      
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

    // Business logic validation
    if (input.businessProfit < 0 && Math.abs(input.businessProfit) > input.businessCash) {
      errors.push({
        field: 'businessProfit',
        message: 'Losses exceed cash balance - business may be insolvent',
        code: 'BUSINESS_LOGIC_WARNING'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get detailed recommendations
   */
  static getRecommendations(calc: FounderSalaryCalc): string[] {
    const recommendations: string[] = [];
    const { decision, minimumSalary, businessFinancials, personalExpenses } = calc;

    if (decision.canAfford) {
      recommendations.push('✅ You can safely pay yourself a salary!');
      recommendations.push(`💰 Recommended: KES ${minimumSalary.toLocaleString()}/month`);
      recommendations.push('📝 Document this in your P&L as "Founder Salary"');
      recommendations.push('📊 Review quarterly to adjust for business growth');
      recommendations.push('💡 Consider increasing after 6 months of consistent profitability');
    } else {
      recommendations.push('⚠️ Not ready for founder salary yet. Here\'s your path:');
      
      if (!decision.profitCoversMin) {
        const gap = minimumSalary - businessFinancials.monthlyProfit;
        recommendations.push(`1️⃣ Increase profit by KES ${gap.toLocaleString()}/month`);
        recommendations.push('   • Review pricing strategy');
        recommendations.push('   • Reduce operating expenses');
        recommendations.push('   • Focus on high-margin sales');
      } else {
        recommendations.push('✅ Profit is sufficient');
      }

      if (!decision.cashCovers3Months) {
        const required = minimumSalary * 3;
        const gap = required - businessFinancials.cashBalance;
        recommendations.push(`2️⃣ Build cash reserve to KES ${required.toLocaleString()} (need ${gap.toLocaleString()} more)`);
        recommendations.push('   • Retain profits instead of distributing');
        recommendations.push('   • Accelerate collections');
        recommendations.push('   • Consider a small business loan');
      } else {
        recommendations.push('✅ Cash reserve is sufficient');
      }
    }

    // Lifestyle recommendations
    if (personalExpenses.total < minimumSalary * 0.5) {
      recommendations.push('💡 Your personal expenses are quite low - consider if this is sustainable long-term');
    }

    if (personalExpenses.rent > personalExpenses.total * 0.4) {
      recommendations.push('🏠 Rent is >40% of expenses - consider if this is optimal');
    }

    if (personalExpenses.savings === 0) {
      recommendations.push('💰 Consider including personal savings in your expense calculation');
    }

    return recommendations;
  }

  /**
   * Calculate runway based on current salary draw
   */
  static calculateSalaryRunway(
    calc: FounderSalaryCalc,
    monthlySalary: number
  ): {
    months: number;
    status: 'safe' | 'warning' | 'critical';
    recommendation: string;
  } {
    const availableCash = calc.businessFinancials.cashBalance;
    const monthlyProfit = calc.businessFinancials.monthlyProfit;
    const netBurn = monthlySalary - monthlyProfit;

    if (netBurn <= 0) {
      return {
        months: Infinity,
        status: 'safe',
        recommendation: 'Business generates enough profit to cover salary indefinitely.'
      };
    }

    const months = availableCash / netBurn;

    if (months > 12) {
      return {
        months,
        status: 'safe',
        recommendation: `You have ${months.toFixed(1)} months runway. Excellent position.`
      };
    } else if (months > 6) {
      return {
        months,
        status: 'warning',
        recommendation: `You have ${months.toFixed(1)} months runway. Monitor closely.`
      };
    } else {
      return {
        months,
        status: 'critical',
        recommendation: `Only ${months.toFixed(1)} months runway. Reduce salary or increase profit urgently.`
      };
    }
  }

  /**
   * Compare with industry benchmarks
   */
  static getBenchmarks(calc: FounderSalaryCalc): {
    category: string;
    yourValue: number;
    benchmark: number;
    status: 'above' | 'at' | 'below';
  }[] {
    const totalExpenses = calc.personalExpenses.total;
    const minimumSalary = calc.minimumSalary;
    const profit = calc.businessFinancials.monthlyProfit;

    return [
      {
        category: 'Salary as % of Revenue',
        yourValue: 0, // Would need revenue data
        benchmark: 10, // 10% is typical
        status: 'at'
      },
      {
        category: 'Profit Margin Needed',
        yourValue: profit > 0 ? (minimumSalary / profit) * 100 : 0,
        benchmark: 30, // Should have 30% margin above salary
        status: profit > minimumSalary * 1.3 ? 'above' : 'below'
      },
      {
        category: 'Cash Reserve (months)',
        yourValue: minimumSalary > 0 ? calc.businessFinancials.cashBalance / minimumSalary : 0,
        benchmark: 3, // 3 months minimum
        status: calc.decision.cashCovers3Months ? 'above' : 'below'
      }
    ];
  }

  /**
   * Helper: Generate unique ID
   */
  private static generateId(): string {
    return `fs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
