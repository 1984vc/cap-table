// app/src/library/financial-toolkit/calculators/CashLeakageCalculator.ts
/**
 * Cash Leakage Calculator - PRODUCTION VERSION
 * Risk scoring and prioritization for cash leaks
 * MIT Licensed
 */

import type { 
  CashLeakage,
  CashLeakageSummary,
  CashLeakageInput, 
  ValidationResult, 
  ValidationError 
} from '../types';

export class CashLeakageCalculator {
  /**
   * Calculate cash leakage with risk scoring
   */
  static calculate(input: CashLeakageInput): CashLeakage {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Calculate risk score: impact × frequency × severity
    const riskScore = input.monthlyImpact * input.frequency * input.severity;

    const now = Date.now();

    return {
      id: this.generateId(),
      companyId: input.companyId,
      type: input.type,
      monthlyImpact: input.monthlyImpact,
      frequency: input.frequency,
      severity: input.severity,
      riskScore,
      notes: input.notes,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Validate cash leakage input
   */
  static validate(input: CashLeakageInput): ValidationResult {
    const errors: ValidationError[] = [];

    if (!input.companyId) {
      errors.push({ 
        field: 'companyId', 
        message: 'Company ID is required', 
        code: 'REQUIRED' 
      });
    }

    if (!input.type?.trim()) {
      errors.push({ 
        field: 'type', 
        message: 'Leak type is required', 
        code: 'REQUIRED' 
      });
    }

    if (typeof input.monthlyImpact !== 'number' || isNaN(input.monthlyImpact) || input.monthlyImpact < 0) {
      errors.push({ 
        field: 'monthlyImpact', 
        message: 'Monthly impact must be a non-negative number', 
        code: 'INVALID_VALUE' 
      });
    }

    if (typeof input.frequency !== 'number' || ![1, 2, 3, 4, 5].includes(input.frequency)) {
      errors.push({ 
        field: 'frequency', 
        message: 'Frequency must be between 1 (rare) and 5 (constant)', 
        code: 'OUT_OF_RANGE' 
      });
    }

    if (typeof input.severity !== 'number' || ![1, 2, 3, 4, 5].includes(input.severity)) {
      errors.push({ 
        field: 'severity', 
        message: 'Severity must be between 1 (minor) and 5 (critical)', 
        code: 'OUT_OF_RANGE' 
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate summary of all leakages
   */
  static calculateSummary(leaks: CashLeakage[]): CashLeakageSummary {
    const activeLeaks = leaks.filter(l => l.status === 'active');
    
    const totalMonthlyImpact = activeLeaks.reduce((sum, l) => sum + l.monthlyImpact, 0);
    const totalRiskScore = activeLeaks.reduce((sum, l) => sum + l.riskScore, 0);

    // Determine risk level
    let riskLevel: 'none' | 'minor' | 'significant' | 'major';
    if (totalRiskScore === 0) {
      riskLevel = 'none';
    } else if (totalRiskScore < 50) {
      riskLevel = 'minor';
    } else if (totalRiskScore < 150) {
      riskLevel = 'significant';
    } else {
      riskLevel = 'major';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(activeLeaks, totalRiskScore, totalMonthlyImpact);

    return {
      companyId: activeLeaks[0]?.companyId || '',
      leaks: activeLeaks,
      totalLeaks: activeLeaks.length,
      totalMonthlyImpact,
      totalRiskScore,
      riskLevel,
      recommendations
    };
  }

  /**
   * Generate actionable recommendations based on leakages
   */
  private static generateRecommendations(
    leaks: CashLeakage[], 
    totalRiskScore: number,
    totalMonthlyImpact: number
  ): string[] {
    const recommendations: string[] = [];

    if (leaks.length === 0) {
      recommendations.push('✅ No active cash leaks identified. Maintain financial discipline!');
      return recommendations;
    }

    // Overall assessment
    if (totalRiskScore >= 150) {
      recommendations.push('🚨 CRITICAL: Major cash leakage detected!');
      recommendations.push(`   Total monthly impact: KES ${totalMonthlyImpact.toLocaleString()}`);
      recommendations.push(`   Risk score: ${totalRiskScore.toFixed(0)}`);
      recommendations.push('   Immediate action required to prevent cash crisis.');
      recommendations.push('');
    } else if (totalRiskScore >= 50) {
      recommendations.push('⚠️ WARNING: Significant cash leakage');
      recommendations.push(`   Total monthly impact: KES ${totalMonthlyImpact.toLocaleString()}`);
      recommendations.push('   Address these issues within 30 days.');
      recommendations.push('');
    }

    // Sort by risk score (highest first)
    const sortedLeaks = [...leaks].sort((a, b) => b.riskScore - a.riskScore);

    // Top 3 priority leaks
    recommendations.push('🎯 Priority Actions (by risk score):');
    sortedLeaks.slice(0, 3).forEach((leak, index) => {
      recommendations.push(`   ${index + 1}. ${leak.type}`);
      recommendations.push(`      Impact: KES ${leak.monthlyImpact.toLocaleString()}/mo | Risk: ${leak.riskScore.toFixed(0)}`);
      
      // Specific action based on leak type
      const action = this.getActionForLeakType(leak.type);
      if (action) {
        recommendations.push(`      Action: ${action}`);
      }
    });

    // Annual impact
    const annualImpact = totalMonthlyImpact * 12;
    if (annualImpact > 0) {
      recommendations.push('');
      recommendations.push(`💰 Annual Impact: KES ${annualImpact.toLocaleString()}`);
      recommendations.push('   Fixing these leaks could save substantial cash over the year.');
    }

    // Preventive measures
    if (leaks.length > 5) {
      recommendations.push('');
      recommendations.push('🛡️ Preventive Measures:');
      recommendations.push('   • Conduct monthly cash leak audits');
      recommendations.push('   • Implement approval workflows for expenses');
      recommendations.push('   • Review vendor contracts quarterly');
      recommendations.push('   • Track all business vs personal expenses');
    }

    return recommendations;
  }

  /**
   * Get specific action recommendation for common leak types
   */
  private static getActionForLeakType(leakType: string): string | null {
    const type = leakType.toLowerCase();
    
    if (type.includes('late payment') || type.includes('receivable')) {
      return 'Chase overdue invoices immediately, implement payment terms';
    }
    if (type.includes('inventory') || type.includes('stock') || type.includes('shrinkage')) {
      return 'Improve inventory tracking, audit for theft/waste';
    }
    if (type.includes('subscription') || type.includes('software')) {
      return 'Review all subscriptions, cancel unused services';
    }
    if (type.includes('overstaffing') || type.includes('labor')) {
      return 'Analyze productivity, consider contractors vs full-time';
    }
    if (type.includes('personal') || type.includes('expense')) {
      return 'Separate business and personal accounts strictly';
    }
    if (type.includes('bank fee') || type.includes('interest')) {
      return 'Negotiate with bank or switch to lower-fee account';
    }
    if (type.includes('waste') || type.includes('production')) {
      return 'Audit production process, optimize for efficiency';
    }
    if (type.includes('supplier') || type.includes('price')) {
      return 'Renegotiate contracts, get competitive quotes';
    }
    if (type.includes('discount')) {
      return 'Set clear discount policy, track all discounts';
    }
    if (type.includes('petty cash')) {
      return 'Implement receipt tracking, limit access';
    }
    
    return 'Investigate root cause and implement controls';
  }

  /**
   * Prioritize leaks by risk score
   */
  static prioritizeLeaks(leaks: CashLeakage[]): {
    critical: CashLeakage[];
    high: CashLeakage[];
    medium: CashLeakage[];
    low: CashLeakage[];
  } {
    const activeLeaks = leaks.filter(l => l.status === 'active');
    
    return {
      critical: activeLeaks.filter(l => l.riskScore >= 100),
      high: activeLeaks.filter(l => l.riskScore >= 50 && l.riskScore < 100),
      medium: activeLeaks.filter(l => l.riskScore >= 20 && l.riskScore < 50),
      low: activeLeaks.filter(l => l.riskScore < 20)
    };
  }

  /**
   * Calculate potential savings if leaks are fixed
   */
  static calculatePotentialSavings(leaks: CashLeakage[], timeframe: 'monthly' | 'quarterly' | 'annually'): {
    totalSavings: number;
    byPriority: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  } {
    const multiplier = timeframe === 'monthly' ? 1 : timeframe === 'quarterly' ? 3 : 12;
    const activeLeaks = leaks.filter(l => l.status === 'active');
    const prioritized = this.prioritizeLeaks(activeLeaks);

    const totalSavings = activeLeaks.reduce((sum, l) => sum + l.monthlyImpact, 0) * multiplier;

    return {
      totalSavings,
      byPriority: {
        critical: prioritized.critical.reduce((sum, l) => sum + l.monthlyImpact, 0) * multiplier,
        high: prioritized.high.reduce((sum, l) => sum + l.monthlyImpact, 0) * multiplier,
        medium: prioritized.medium.reduce((sum, l) => sum + l.monthlyImpact, 0) * multiplier,
        low: prioritized.low.reduce((sum, l) => sum + l.monthlyImpact, 0) * multiplier
      }
    };
  }

  /**
   * Common cash leak templates
   */
  static getCommonLeakTemplates(): Array<{
    type: string;
    description: string;
    typicalImpact: number;
    suggestedFrequency: 1 | 2 | 3 | 4 | 5;
    suggestedSeverity: 1 | 2 | 3 | 4 | 5;
  }> {
    return [
      {
        type: 'Late customer payments',
        description: 'Customers not paying on time',
        typicalImpact: 50000,
        suggestedFrequency: 4,
        suggestedSeverity: 4
      },
      {
        type: 'Inventory shrinkage',
        description: 'Theft, damage, or waste of inventory',
        typicalImpact: 20000,
        suggestedFrequency: 3,
        suggestedSeverity: 3
      },
      {
        type: 'Unused subscriptions',
        description: 'Software/services no longer needed',
        typicalImpact: 5000,
        suggestedFrequency: 5,
        suggestedSeverity: 2
      },
      {
        type: 'Overstaffing',
        description: 'More employees than workload requires',
        typicalImpact: 80000,
        suggestedFrequency: 5,
        suggestedSeverity: 5
      },
      {
        type: 'Personal expenses',
        description: 'Personal costs mixed with business',
        typicalImpact: 15000,
        suggestedFrequency: 4,
        suggestedSeverity: 3
      },
      {
        type: 'Bank fees',
        description: 'High transaction or account fees',
        typicalImpact: 3000,
        suggestedFrequency: 5,
        suggestedSeverity: 2
      },
      {
        type: 'Production waste',
        description: 'Materials wasted in production',
        typicalImpact: 25000,
        suggestedFrequency: 3,
        suggestedSeverity: 4
      },
      {
        type: 'Supplier price creep',
        description: 'Gradual supplier price increases not noticed',
        typicalImpact: 10000,
        suggestedFrequency: 2,
        suggestedSeverity: 3
      },
      {
        type: 'Excessive discounts',
        description: 'Discounts given without clear policy',
        typicalImpact: 30000,
        suggestedFrequency: 4,
        suggestedSeverity: 4
      },
      {
        type: 'Petty cash losses',
        description: 'Untracked petty cash expenses',
        typicalImpact: 5000,
        suggestedFrequency: 3,
        suggestedSeverity: 2
      }
    ];
  }

  /**
   * Helper: Generate unique ID
   */
  private static generateId(): string {
    return `cl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
