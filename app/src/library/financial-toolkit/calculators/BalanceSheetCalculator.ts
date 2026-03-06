// app/src/library/financial-toolkit/calculators/BalanceSheetCalculator.ts
/**
 * Balance Sheet Calculator - PRODUCTION VERSION
 * Asset-Liability-Equity analysis with ratios and health indicators
 * MIT Licensed
 */

import type { 
  BalanceSheet, 
  BalanceSheetInput, 
  ValidationResult, 
  ValidationError 
} from '../types/phase1-types';

export class BalanceSheetCalculator {
  /**
   * Calculate complete Balance Sheet with ratios and health indicators
   */
  static calculate(input: BalanceSheetInput): BalanceSheet {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Calculate Current Assets
    const currentAssetsTotal = 
      input.cashAndEquivalents +
      input.accountsReceivable +
      input.inventory +
      input.prepaidExpenses +
      input.otherCurrentAssets;

    // Calculate Non-Current Assets
    const netPPE = input.propertyPlantEquipment - input.accumulatedDepreciation;
    const nonCurrentAssetsTotal = 
      netPPE +
      input.intangibleAssets +
      input.longTermInvestments +
      input.otherNonCurrentAssets;

    const totalAssets = currentAssetsTotal + nonCurrentAssetsTotal;

    // Calculate Current Liabilities
    const currentLiabilitiesTotal = 
      input.accountsPayable +
      input.shortTermDebt +
      input.accruedExpenses +
      input.deferredRevenue +
      input.otherCurrentLiabilities;

    // Calculate Non-Current Liabilities
    const nonCurrentLiabilitiesTotal = 
      input.longTermDebt +
      input.deferredTaxLiabilities +
      input.otherNonCurrentLiabilities;

    const totalLiabilities = currentLiabilitiesTotal + nonCurrentLiabilitiesTotal;

    // Calculate Equity
    const equityTotal = 
      input.shareCapital +
      input.retainedEarnings +
      input.otherEquity;

    const totalLiabilitiesAndEquity = totalLiabilities + equityTotal;

    // Calculate Key Ratios
    const currentRatio = currentLiabilitiesTotal > 0 
      ? currentAssetsTotal / currentLiabilitiesTotal 
      : Infinity;

    const quickRatio = currentLiabilitiesTotal > 0
      ? (currentAssetsTotal - input.inventory) / currentLiabilitiesTotal
      : Infinity;

    const workingCapital = currentAssetsTotal - currentLiabilitiesTotal;

    const debtToEquity = equityTotal > 0 
      ? totalLiabilities / equityTotal 
      : Infinity;

    const debtToAssets = totalAssets > 0 
      ? totalLiabilities / totalAssets 
      : 0;

    const equityRatio = totalAssets > 0 
      ? equityTotal / totalAssets 
      : 0;

    // Health Assessment
    const balanceDiff = Math.abs(totalAssets - totalLiabilitiesAndEquity);
    const isBalanced = balanceDiff < 0.01; // Allow tiny rounding errors

    const isLiquid = currentRatio >= 1.5;
    const isSolvent = debtToEquity < 2.0;

    let status: 'healthy' | 'warning' | 'distressed';
    if (isLiquid && isSolvent && isBalanced) {
      status = 'healthy';
    } else if (currentRatio >= 1.0 && debtToEquity < 3.0) {
      status = 'warning';
    } else {
      status = 'distressed';
    }

    const now = Date.now();

    return {
      id: this.generateId(),
      companyId: input.companyId,
      asOfDate: input.asOfDate,
      currency: 'KES',
      
      currentAssets: {
        cashAndEquivalents: input.cashAndEquivalents,
        accountsReceivable: input.accountsReceivable,
        inventory: input.inventory,
        prepaidExpenses: input.prepaidExpenses,
        otherCurrentAssets: input.otherCurrentAssets,
        total: currentAssetsTotal
      },
      
      nonCurrentAssets: {
        propertyPlantEquipment: input.propertyPlantEquipment,
        accumulatedDepreciation: input.accumulatedDepreciation,
        netPPE,
        intangibleAssets: input.intangibleAssets,
        longTermInvestments: input.longTermInvestments,
        otherNonCurrentAssets: input.otherNonCurrentAssets,
        total: nonCurrentAssetsTotal
      },
      
      totalAssets,
      
      currentLiabilities: {
        accountsPayable: input.accountsPayable,
        shortTermDebt: input.shortTermDebt,
        accruedExpenses: input.accruedExpenses,
        deferredRevenue: input.deferredRevenue,
        otherCurrentLiabilities: input.otherCurrentLiabilities,
        total: currentLiabilitiesTotal
      },
      
      nonCurrentLiabilities: {
        longTermDebt: input.longTermDebt,
        deferredTaxLiabilities: input.deferredTaxLiabilities,
        otherNonCurrentLiabilities: input.otherNonCurrentLiabilities,
        total: nonCurrentLiabilitiesTotal
      },
      
      totalLiabilities,
      
      equity: {
        shareCapital: input.shareCapital,
        retainedEarnings: input.retainedEarnings,
        otherEquity: input.otherEquity,
        total: equityTotal
      },
      
      totalLiabilitiesAndEquity,
      
      ratios: {
        currentRatio,
        quickRatio,
        workingCapital,
        debtToEquity,
        debtToAssets,
        equityRatio
      },
      
      health: {
        isBalanced,
        isLiquid,
        isSolvent,
        status
      },
      
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Validate balance sheet input
   */
  static validate(input: BalanceSheetInput): ValidationResult {
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

    // Validate all numeric fields are non-negative
    const numericFields = [
      'cashAndEquivalents', 'accountsReceivable', 'inventory', 'prepaidExpenses', 
      'otherCurrentAssets', 'propertyPlantEquipment', 'intangibleAssets',
      'longTermInvestments', 'otherNonCurrentAssets', 'accountsPayable',
      'shortTermDebt', 'accruedExpenses', 'deferredRevenue', 'otherCurrentLiabilities',
      'longTermDebt', 'deferredTaxLiabilities', 'otherNonCurrentLiabilities',
      'shareCapital'
    ];

    for (const field of numericFields) {
      const value = input[field as keyof BalanceSheetInput] as number;
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

    // Accumulated depreciation should be negative or zero
    if (typeof input.accumulatedDepreciation === 'number' && input.accumulatedDepreciation > 0) {
      errors.push({
        field: 'accumulatedDepreciation',
        message: 'Accumulated depreciation should be negative or zero (it reduces assets)',
        code: 'BUSINESS_LOGIC_WARNING'
      });
    }

    // Retained earnings can be negative (accumulated losses)
    if (typeof input.retainedEarnings !== 'number' || isNaN(input.retainedEarnings)) {
      errors.push({
        field: 'retainedEarnings',
        message: 'Retained earnings must be a valid number',
        code: 'INVALID_TYPE'
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
  static getInsights(balanceSheet: BalanceSheet): string[] {
    const insights: string[] = [];
    const { ratios, health, totalAssets, totalLiabilities, equity } = balanceSheet;

    // Overall health status
    if (health.status === 'healthy') {
      insights.push('✅ Strong financial position with healthy liquidity and solvency');
    } else if (health.status === 'warning') {
      insights.push('⚠️ Financial position needs attention - liquidity or leverage concerns');
    } else {
      insights.push('🚨 CRITICAL: Financial distress - immediate action required');
    }

    // Balance check
    if (!health.isBalanced) {
      const diff = Math.abs(totalAssets - (totalLiabilities + equity.total));
      insights.push(`⚠️ Balance sheet does not balance! Difference: ${diff.toLocaleString()}`);
      insights.push('   • Check data entry for errors');
      insights.push('   • Verify retained earnings matches P&L net income');
    }

    // Liquidity analysis
    if (ratios.currentRatio < 1.0) {
      insights.push('🚨 Current Ratio < 1.0 - Cannot cover short-term obligations!');
      insights.push('   • Immediate liquidity crisis');
      insights.push('   • Need to raise capital or restructure debt');
    } else if (ratios.currentRatio < 1.5) {
      insights.push(`⚠️ Current Ratio: ${ratios.currentRatio.toFixed(2)} - Below healthy threshold (1.5+)`);
      insights.push('   • Limited liquidity buffer');
      insights.push('   • Improve collections (reduce AR) or delay payments (extend AP)');
    } else {
      insights.push(`✅ Current Ratio: ${ratios.currentRatio.toFixed(2)} - Healthy liquidity`);
    }

    // Quick ratio (acid test)
    if (ratios.quickRatio < 1.0) {
      insights.push(`⚠️ Quick Ratio: ${ratios.quickRatio.toFixed(2)} - Heavy reliance on inventory`);
      insights.push('   • Cannot cover obligations without selling inventory');
    }

    // Working capital
    if (ratios.workingCapital < 0) {
      insights.push(`🚨 Negative Working Capital: ${ratios.workingCapital.toLocaleString()}`);
      insights.push('   • Current liabilities exceed current assets');
      insights.push('   • Urgent cash management required');
    } else {
      insights.push(`Working Capital: ${ratios.workingCapital.toLocaleString()}`);
    }

    // Leverage analysis
    if (ratios.debtToEquity > 3.0) {
      insights.push(`🚨 Debt-to-Equity: ${ratios.debtToEquity.toFixed(2)} - Highly leveraged!`);
      insights.push('   • Heavy debt burden');
      insights.push('   • Limited borrowing capacity');
      insights.push('   • Focus on debt reduction');
    } else if (ratios.debtToEquity > 2.0) {
      insights.push(`⚠️ Debt-to-Equity: ${ratios.debtToEquity.toFixed(2)} - Above recommended level`);
      insights.push('   • Consider debt paydown strategy');
    } else {
      insights.push(`✅ Debt-to-Equity: ${ratios.debtToEquity.toFixed(2)} - Healthy leverage`);
    }

    // Asset composition
    const cashPercent = (balanceSheet.currentAssets.cashAndEquivalents / totalAssets) * 100;
    if (cashPercent < 5) {
      insights.push(`⚠️ Cash is only ${cashPercent.toFixed(1)}% of assets - Very low cash buffer`);
    } else if (cashPercent > 30) {
      insights.push(`💡 Cash is ${cashPercent.toFixed(1)}% of assets - Consider investing excess cash`);
    }

    // Equity position
    if (ratios.equityRatio < 0.3) {
      insights.push('⚠️ Equity < 30% of assets - Consider equity injection');
    } else if (ratios.equityRatio > 0.6) {
      insights.push('✅ Strong equity position - Low financial risk');
    }

    return insights;
  }

  /**
   * Compare with prior period
   */
  static compare(current: BalanceSheet, prior: BalanceSheet): {
    assetGrowth: number;
    liabilityGrowth: number;
    equityGrowth: number;
    workingCapitalChange: number;
    liquidityChange: number;
    leverageChange: number;
  } {
    return {
      assetGrowth: ((current.totalAssets - prior.totalAssets) / prior.totalAssets) * 100,
      liabilityGrowth: ((current.totalLiabilities - prior.totalLiabilities) / prior.totalLiabilities) * 100,
      equityGrowth: ((current.equity.total - prior.equity.total) / prior.equity.total) * 100,
      workingCapitalChange: current.ratios.workingCapital - prior.ratios.workingCapital,
      liquidityChange: current.ratios.currentRatio - prior.ratios.currentRatio,
      leverageChange: current.ratios.debtToEquity - prior.ratios.debtToEquity
    };
  }

  /**
   * Calculate Return on Assets (ROA) - requires net income from P&L
   */
  static calculateROA(balanceSheet: BalanceSheet, netIncome: number): number {
    return balanceSheet.totalAssets > 0 
      ? (netIncome / balanceSheet.totalAssets) * 100 
      : 0;
  }

  /**
   * Calculate Return on Equity (ROE) - requires net income from P&L
   */
  static calculateROE(balanceSheet: BalanceSheet, netIncome: number): number {
    return balanceSheet.equity.total > 0 
      ? (netIncome / balanceSheet.equity.total) * 100 
      : 0;
  }

  /**
   * Helper: Generate unique ID
   */
  private static generateId(): string {
    return `bs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
