// app/src/library/financial-toolkit/calculators/BreakEvenCalculator.ts
/**
 * Break-Even Analysis Calculator
 * Pure functions for break-even calculations
 * MIT Licensed
 */

import type { BreakEvenAnalysis, BreakEvenInput, ValidationResult, ValidationError } from '../types';

export class BreakEvenCalculator {
  /**
   * Calculate break-even analysis with scenarios
   */
  static calculate(input: BreakEvenInput): BreakEvenAnalysis {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Core calculations
    const contributionMargin = input.pricePerUnit - input.variableCostPerUnit;
    const contributionMarginPercent = input.pricePerUnit > 0 
      ? (contributionMargin / input.pricePerUnit) * 100 
      : 0;
    
    const breakEvenUnits = contributionMargin > 0 
      ? input.fixedCosts / contributionMargin 
      : 0;
    
    const breakEvenRevenue = breakEvenUnits * input.pricePerUnit;
    const currentRevenue = input.currentSales * input.pricePerUnit;
    const unitsAboveBelowBreakEven = input.currentSales - breakEvenUnits;
    const isAboveBreakEven = input.currentSales >= breakEvenUnits;
    
    const percentageToBreakEven = breakEvenUnits > 0 && !isAboveBreakEven
      ? ((breakEvenUnits - input.currentSales) / input.currentSales) * 100
      : 0;

    // What-if scenarios
    const priceIncrease10 = this.calculateBreakEvenUnits(
      input.fixedCosts,
      input.pricePerUnit * 1.1,
      input.variableCostPerUnit
    );

    const fixedDecrease20 = this.calculateBreakEvenUnits(
      input.fixedCosts * 0.8,
      input.pricePerUnit,
      input.variableCostPerUnit
    );

    const variableDecrease5 = this.calculateBreakEvenUnits(
      input.fixedCosts,
      input.pricePerUnit,
      Math.max(0, input.variableCostPerUnit - 5)
    );

    const now = Date.now();

    return {
      id: this.generateId(),
      companyId: input.companyId,
      productName: input.productName,
      
      inputs: {
        fixedCosts: input.fixedCosts,
        pricePerUnit: input.pricePerUnit,
        variableCostPerUnit: input.variableCostPerUnit,
        currentSales: input.currentSales
      },
      
      results: {
        contributionMargin,
        contributionMarginPercent,
        breakEvenUnits,
        breakEvenRevenue,
        currentRevenue,
        unitsAboveBelowBreakEven,
        isAboveBreakEven,
        percentageToBreakEven
      },
      
      scenarios: {
        priceIncrease10Percent: priceIncrease10,
        fixedCostsDecrease20Percent: fixedDecrease20,
        variableCostDecrease5: variableDecrease5
      },
      
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Calculate break-even units (helper for scenarios)
   */
  private static calculateBreakEvenUnits(
    fixedCosts: number,
    pricePerUnit: number,
    variableCostPerUnit: number
  ): number {
    const cm = pricePerUnit - variableCostPerUnit;
    return cm > 0 ? fixedCosts / cm : 0;
  }

  /**
   * Validate break-even input
   */
  static validate(input: BreakEvenInput): ValidationResult {
    const errors: ValidationError[] = [];

    if (!input.companyId) {
      errors.push({ field: 'companyId', message: 'Company ID is required', code: 'REQUIRED' });
    }

    // Numeric validations
    if (typeof input.fixedCosts !== 'number' || isNaN(input.fixedCosts) || input.fixedCosts < 0) {
      errors.push({ 
        field: 'fixedCosts', 
        message: 'Fixed costs must be a non-negative number', 
        code: 'INVALID_VALUE' 
      });
    }

    if (typeof input.pricePerUnit !== 'number' || isNaN(input.pricePerUnit) || input.pricePerUnit <= 0) {
      errors.push({ 
        field: 'pricePerUnit', 
        message: 'Price per unit must be a positive number', 
        code: 'INVALID_VALUE' 
      });
    }

    if (typeof input.variableCostPerUnit !== 'number' || isNaN(input.variableCostPerUnit) || input.variableCostPerUnit < 0) {
      errors.push({ 
        field: 'variableCostPerUnit', 
        message: 'Variable cost per unit must be a non-negative number', 
        code: 'INVALID_VALUE' 
      });
    }

    if (typeof input.currentSales !== 'number' || isNaN(input.currentSales) || input.currentSales < 0) {
      errors.push({ 
        field: 'currentSales', 
        message: 'Current sales must be a non-negative number', 
        code: 'INVALID_VALUE' 
      });
    }

    // Business logic validations
    if (input.variableCostPerUnit >= input.pricePerUnit) {
      errors.push({ 
        field: 'variableCostPerUnit', 
        message: 'Variable cost per unit must be less than price per unit (contribution margin must be positive)', 
        code: 'BUSINESS_LOGIC_ERROR' 
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
  static getInsights(analysis: BreakEvenAnalysis): string[] {
    const insights: string[] = [];
    const { results, scenarios, inputs } = analysis;

    // Current status
    if (results.isAboveBreakEven) {
      const unitsAbove = Math.abs(results.unitsAboveBelowBreakEven);
      insights.push(`✅ You're ${unitsAbove.toFixed(0)} units above break-even. Well done!`);
      
      if (unitsAbove < results.breakEvenUnits * 0.2) {
        insights.push('⚠️ But only by a small margin. Focus on sales growth to build a safety buffer.');
      }
    } else {
      const unitsNeeded = Math.abs(results.unitsAboveBelowBreakEven);
      const percentIncrease = results.percentageToBreakEven;
      insights.push(`🎯 You need ${unitsNeeded.toFixed(0)} more units to break even (${percentIncrease.toFixed(0)}% increase).`);
    }

    // Contribution margin analysis
    if (results.contributionMarginPercent < 30) {
      insights.push('📊 Your contribution margin is below 30%. Consider:');
      insights.push('   • Raising prices');
      insights.push('   • Reducing variable costs');
      insights.push('   • Targeting higher-margin products');
    } else if (results.contributionMarginPercent > 60) {
      insights.push('💰 Excellent contribution margin (>60%)! You have strong unit economics.');
    }

    // Scenario analysis insights
    const currentBE = results.breakEvenUnits;
    const priceScenarioImprovement = ((currentBE - scenarios.priceIncrease10Percent) / currentBE) * 100;
    const costScenarioImprovement = ((currentBE - scenarios.fixedCostsDecrease20Percent) / currentBE) * 100;
    const varScenarioImprovement = ((currentBE - scenarios.variableCostDecrease5) / currentBE) * 100;

    insights.push('');
    insights.push('💡 What-If Analysis:');
    insights.push(`   • 10% price increase → Break-even at ${scenarios.priceIncrease10Percent.toFixed(0)} units (${priceScenarioImprovement.toFixed(0)}% improvement)`);
    insights.push(`   • 20% fixed cost reduction → Break-even at ${scenarios.fixedCostsDecrease20Percent.toFixed(0)} units (${costScenarioImprovement.toFixed(0)}% improvement)`);
    insights.push(`   • $5 variable cost reduction → Break-even at ${scenarios.variableCostDecrease5.toFixed(0)} units (${varScenarioImprovement.toFixed(0)}% improvement)`);

    // Best action recommendation
    const bestScenario = Math.max(priceScenarioImprovement, costScenarioImprovement, varScenarioImprovement);
    if (bestScenario === priceScenarioImprovement) {
      insights.push('');
      insights.push('🎯 Recommended Action: Focus on price optimization for maximum impact.');
    } else if (bestScenario === costScenarioImprovement) {
      insights.push('');
      insights.push('🎯 Recommended Action: Prioritize fixed cost reduction.');
    } else {
      insights.push('');
      insights.push('🎯 Recommended Action: Work on reducing variable costs per unit.');
    }

    return insights;
  }

  /**
   * Calculate margin of safety
   */
  static calculateMarginOfSafety(analysis: BreakEvenAnalysis): {
    units: number;
    revenue: number;
    percentage: number;
  } {
    const { currentSales, breakEvenUnits, breakEvenRevenue, currentRevenue } = analysis.results;
    
    const unitsMargin = currentSales - breakEvenUnits;
    const revenueMargin = currentRevenue - breakEvenRevenue;
    const percentage = currentSales > 0 ? (unitsMargin / currentSales) * 100 : 0;

    return {
      units: Math.max(0, unitsMargin),
      revenue: Math.max(0, revenueMargin),
      percentage: Math.max(0, percentage)
    };
  }

  /**
   * Calculate operating leverage
   */
  static calculateOperatingLeverage(analysis: BreakEvenAnalysis): number {
    const { contributionMargin, currentSales } = analysis.inputs;
    const totalContribution = contributionMargin * currentSales;
    const operatingIncome = totalContribution - analysis.inputs.fixedCosts;
    
    if (operatingIncome === 0) return 0;
    
    return totalContribution / operatingIncome;
  }

  /**
   * Helper: Generate unique ID
   */
  private static generateId(): string {
    return `be_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
