// app/src/library/financial-toolkit/calculators/PricingCalculator.ts
/**
 * Pricing Calculator - PRODUCTION VERSION
 * 3-method anchor pricing: Cost-Plus, Market Rate, Value-Based
 * MIT Licensed
 */

import type { 
  PricingAnalysis, 
  PricingInput, 
  ValidationResult, 
  ValidationError 
} from '../types';

export class PricingCalculator {
  /**
   * Calculate pricing using three methods and recommend anchor price
   */
  static calculate(input: PricingInput): PricingAnalysis {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Method 1: Cost-Plus Pricing
    const costPlus = input.costPerUnit * (1 + input.desiredMarkup);

    // Method 2: Market Rate (average of competitors)
    const competitorPrices = [
      input.competitor1, 
      input.competitor2, 
      input.competitor3
    ].filter(p => p > 0);
    
    const marketRate = competitorPrices.length > 0
      ? competitorPrices.reduce((sum, p) => sum + p, 0) / competitorPrices.length
      : 0;

    // Method 3: Value-Based Pricing
    const valueBased = input.customerProblemCost * input.solutionPercentage * 0.3;

    // Anchor price: average of all methods with data
    const validPrices = [costPlus, marketRate, valueBased].filter(p => p > 0);
    const anchorPrice = validPrices.length > 0
      ? validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length
      : costPlus;

    // Minimum viable price (cost + 30% minimum margin)
    const minimumPrice = input.costPerUnit * 1.3;

    // Analysis
    const marginPerUnit = anchorPrice - input.costPerUnit;
    const marginPercent = input.costPerUnit > 0 
      ? (marginPerUnit / anchorPrice) * 100 
      : 0;
    const isBelowMinimum = anchorPrice < minimumPrice;

    let recommendation = '';
    if (isBelowMinimum) {
      recommendation = `⚠️ Anchor price (${anchorPrice.toFixed(0)}) is below minimum (${minimumPrice.toFixed(0)}). ` +
        `You risk losing money. Increase prices or reduce costs.`;
    } else if (marginPercent < 30) {
      recommendation = `📊 Margin is only ${marginPercent.toFixed(1)}%. ` +
        `Consider increasing to 40%+ for healthier unit economics.`;
    } else if (marginPercent > 60) {
      recommendation = `💰 Excellent margin (${marginPercent.toFixed(1)}%)! ` +
        `Strong unit economics. Consider if price is defensible against competition.`;
    } else {
      recommendation = `✅ Good margin (${marginPercent.toFixed(1)}%). ` +
        `Anchor price of ${anchorPrice.toFixed(0)} balances profitability and market competitiveness.`;
    }

    const now = Date.now();

    return {
      id: this.generateId(),
      companyId: input.companyId,
      productName: input.productName,
      inputs: {
        costPerUnit: input.costPerUnit,
        desiredMarkup: input.desiredMarkup,
        competitor1: input.competitor1,
        competitor2: input.competitor2,
        competitor3: input.competitor3,
        customerProblemCost: input.customerProblemCost,
        solutionPercentage: input.solutionPercentage
      },
      methods: {
        costPlus,
        marketRate,
        valueBased
      },
      anchorPrice,
      minimumPrice,
      analysis: {
        marginPerUnit,
        marginPercent,
        isBelowMinimum,
        recommendation
      },
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Validate pricing input
   */
  static validate(input: PricingInput): ValidationResult {
    const errors: ValidationError[] = [];

    if (!input.companyId) {
      errors.push({ 
        field: 'companyId', 
        message: 'Company ID is required', 
        code: 'REQUIRED' 
      });
    }

    if (!input.productName?.trim()) {
      errors.push({ 
        field: 'productName', 
        message: 'Product name is required', 
        code: 'REQUIRED' 
      });
    }

    // Cost validation
    if (typeof input.costPerUnit !== 'number' || isNaN(input.costPerUnit) || input.costPerUnit < 0) {
      errors.push({ 
        field: 'costPerUnit', 
        message: 'Cost per unit must be a non-negative number', 
        code: 'INVALID_VALUE' 
      });
    }

    // Markup validation
    if (typeof input.desiredMarkup !== 'number' || isNaN(input.desiredMarkup) || input.desiredMarkup < 0) {
      errors.push({ 
        field: 'desiredMarkup', 
        message: 'Desired markup must be a non-negative number', 
        code: 'INVALID_VALUE' 
      });
    } else if (input.desiredMarkup < 0.2) {
      errors.push({ 
        field: 'desiredMarkup', 
        message: 'Markup below 20% may not be sustainable', 
        code: 'BUSINESS_LOGIC_WARNING' 
      });
    }

    // Competitor price validation
    ['competitor1', 'competitor2', 'competitor3'].forEach(field => {
      const value = input[field as keyof PricingInput] as number;
      if (typeof value !== 'number' || isNaN(value) || value < 0) {
        errors.push({ 
          field, 
          message: `${field} must be a non-negative number`, 
          code: 'INVALID_VALUE' 
        });
      }
    });

    // Value-based validation
    if (typeof input.customerProblemCost !== 'number' || isNaN(input.customerProblemCost) || input.customerProblemCost < 0) {
      errors.push({ 
        field: 'customerProblemCost', 
        message: 'Customer problem cost must be a non-negative number', 
        code: 'INVALID_VALUE' 
      });
    }

    if (typeof input.solutionPercentage !== 'number' || isNaN(input.solutionPercentage)) {
      errors.push({ 
        field: 'solutionPercentage', 
        message: 'Solution percentage must be a valid number', 
        code: 'INVALID_VALUE' 
      });
    } else if (input.solutionPercentage < 0 || input.solutionPercentage > 1) {
      errors.push({ 
        field: 'solutionPercentage', 
        message: 'Solution percentage must be between 0 and 1 (e.g., 0.3 for 30%)', 
        code: 'OUT_OF_RANGE' 
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get detailed pricing recommendations
   */
  static getRecommendations(analysis: PricingAnalysis): string[] {
    const recommendations: string[] = [];
    const { methods, anchorPrice, minimumPrice, analysis: a } = analysis;

    // Compare the three methods
    recommendations.push('📊 Pricing Method Comparison:');
    recommendations.push(`   Cost-Plus: KES ${methods.costPlus.toFixed(0)}`);
    if (methods.marketRate > 0) {
      recommendations.push(`   Market Rate: KES ${methods.marketRate.toFixed(0)}`);
    }
    if (methods.valueBased > 0) {
      recommendations.push(`   Value-Based: KES ${methods.valueBased.toFixed(0)}`);
    }
    recommendations.push(`   Anchor (Recommended): KES ${anchorPrice.toFixed(0)}`);
    recommendations.push('');

    // Strategic recommendations
    if (a.isBelowMinimum) {
      recommendations.push('🚨 CRITICAL: Price is below minimum viable level');
      recommendations.push(`   • Current: KES ${anchorPrice.toFixed(0)}`);
      recommendations.push(`   • Minimum: KES ${minimumPrice.toFixed(0)}`);
      recommendations.push(`   • Gap: KES ${(minimumPrice - anchorPrice).toFixed(0)}`);
      recommendations.push('   • Action: Increase price OR reduce costs immediately');
    } else {
      const buffer = anchorPrice - minimumPrice;
      recommendations.push(`✅ Price is KES ${buffer.toFixed(0)} above minimum floor`);
    }

    // Market positioning
    if (methods.marketRate > 0) {
      const marketDiff = anchorPrice - methods.marketRate;
      const marketDiffPercent = (marketDiff / methods.marketRate) * 100;
      
      if (Math.abs(marketDiffPercent) < 10) {
        recommendations.push(`📍 Priced competitively (within 10% of market average)`);
      } else if (marketDiffPercent > 0) {
        recommendations.push(`📈 Premium pricing: ${Math.abs(marketDiffPercent).toFixed(0)}% above market`);
        recommendations.push(`   • Ensure your value proposition justifies the premium`);
        recommendations.push(`   • Focus on quality, service, or unique features`);
      } else {
        recommendations.push(`📉 Economy pricing: ${Math.abs(marketDiffPercent).toFixed(0)}% below market`);
        recommendations.push(`   • Good for market penetration strategy`);
        recommendations.push(`   • Ensure margins are sustainable`);
      }
    }

    // Margin analysis
    if (a.marginPercent < 30) {
      recommendations.push(`⚠️ Low margin (${a.marginPercent.toFixed(1)}%)`);
      recommendations.push(`   • Consider 40%+ for healthier unit economics`);
      recommendations.push(`   • Look for ways to add value without adding cost`);
    } else if (a.marginPercent > 60) {
      recommendations.push(`💰 Strong margin (${a.marginPercent.toFixed(1)}%)`);
      recommendations.push(`   • Excellent unit economics`);
      recommendations.push(`   • Watch for competitor undercuts`);
    }

    // Value-based insights
    if (methods.valueBased > anchorPrice * 1.5) {
      recommendations.push(`💡 Value-based price much higher than anchor`);
      recommendations.push(`   • Consider if customers truly perceive this value`);
      recommendations.push(`   • May have room for price increase if you can prove ROI`);
    }

    return recommendations;
  }

  /**
   * Sensitivity analysis: how price changes affect margins
   */
  static sensitivityAnalysis(
    analysis: PricingAnalysis,
    priceChanges: number[] = [-10, -5, 0, 5, 10, 15, 20]
  ): {
    priceChange: number;
    newPrice: number;
    marginPercent: number;
    marginPerUnit: number;
  }[] {
    return priceChanges.map(change => {
      const newPrice = analysis.anchorPrice * (1 + change / 100);
      const marginPerUnit = newPrice - analysis.inputs.costPerUnit;
      const marginPercent = (marginPerUnit / newPrice) * 100;

      return {
        priceChange: change,
        newPrice,
        marginPercent,
        marginPerUnit
      };
    });
  }

  /**
   * Volume-price tradeoff analysis
   */
  static volumePriceTradeoff(
    analysis: PricingAnalysis,
    currentVolume: number,
    elasticity: number = -1.5 // typical price elasticity
  ): {
    priceChange: number;
    volumeChange: number;
    revenueChange: number;
    profitChange: number;
  }[] {
    const results = [];
    const priceChanges = [-20, -10, -5, 0, 5, 10, 15, 20];

    for (const priceChange of priceChanges) {
      // Volume change based on elasticity
      const volumeChange = elasticity * priceChange;
      const newVolume = currentVolume * (1 + volumeChange / 100);
      
      // Revenue calculation
      const oldRevenue = analysis.anchorPrice * currentVolume;
      const newPrice = analysis.anchorPrice * (1 + priceChange / 100);
      const newRevenue = newPrice * newVolume;
      const revenueChange = ((newRevenue - oldRevenue) / oldRevenue) * 100;

      // Profit calculation
      const oldProfit = (analysis.anchorPrice - analysis.inputs.costPerUnit) * currentVolume;
      const newProfit = (newPrice - analysis.inputs.costPerUnit) * newVolume;
      const profitChange = oldProfit > 0 ? ((newProfit - oldProfit) / oldProfit) * 100 : 0;

      results.push({
        priceChange,
        volumeChange: Math.round(volumeChange * 10) / 10,
        revenueChange: Math.round(revenueChange * 10) / 10,
        profitChange: Math.round(profitChange * 10) / 10
      });
    }

    return results;
  }

  /**
   * Compare pricing strategy against competitors
   */
  static competitorComparison(analysis: PricingAnalysis): {
    competitor: string;
    theirPrice: number;
    yourPrice: number;
    difference: number;
    differencePercent: number;
    positioning: 'lower' | 'similar' | 'higher';
  }[] {
    const competitors = [
      { name: 'Competitor 1', price: analysis.inputs.competitor1 },
      { name: 'Competitor 2', price: analysis.inputs.competitor2 },
      { name: 'Competitor 3', price: analysis.inputs.competitor3 }
    ].filter(c => c.price > 0);

    return competitors.map(c => {
      const difference = analysis.anchorPrice - c.price;
      const differencePercent = (difference / c.price) * 100;
      
      let positioning: 'lower' | 'similar' | 'higher';
      if (Math.abs(differencePercent) < 5) {
        positioning = 'similar';
      } else if (differencePercent > 0) {
        positioning = 'higher';
      } else {
        positioning = 'lower';
      }

      return {
        competitor: c.name,
        theirPrice: c.price,
        yourPrice: analysis.anchorPrice,
        difference,
        differencePercent,
        positioning
      };
    });
  }

  /**
   * Helper: Generate unique ID
   */
  private static generateId(): string {
    return `pr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
