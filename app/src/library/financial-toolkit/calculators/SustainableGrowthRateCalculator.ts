// app/src/library/financial-toolkit/calculators/SustainableGrowthRateCalculator.ts
/**
 * Sustainable Growth Rate (SGR) Calculator
 * SGR = ROE × Retention Ratio
 * Answers: "How fast can we grow without needing external funding?"
 */

import type { BaseCalculatorResult, ValidationResult, ValidationError, Currency } from '../types';
import { IdGenerator } from '../utils/shared';

export interface SustainableGrowthRateInputs {
  companyId: string;
  currency: Currency;
  netIncome: number;        // annual net profit
  equity: number;           // total shareholders' equity
  dividendPayoutRatio: number; // 0–1  (e.g. 0.30 = pay out 30%)
  targetGrowthRate: number;    // desired annual growth % (e.g. 25 for 25%)
  totalAssets?: number;        // optional – enables DuPont decomposition
  totalRevenue?: number;       // optional – enables asset-turnover metrics
}

export interface SGRDuPont {
  netProfitMargin: number;   // net income / revenue
  assetTurnover: number;     // revenue / total assets
  equityMultiplier: number;  // total assets / equity
  roeDuPont: number;         // product of the three
}

export interface SustainableGrowthRateResult extends BaseCalculatorResult {
  roe: number;                     // Return on Equity (%)
  retentionRatio: number;          // 1 - dividendPayoutRatio
  sustainableGrowthRate: number;   // SGR (%)
  canGrowWithoutFinancing: boolean;
  growthGap: number;               // targetGrowthRate - SGR (negative = surplus)
  externalFinancingNeeded: number; // additional equity/debt required
  duPont?: SGRDuPont;
  analysis: string;
  recommendations: string[];
}

export class SustainableGrowthRateCalculator {
  static calculate(inputs: SustainableGrowthRateInputs): SustainableGrowthRateResult {
    const validation = this.validate(inputs);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const { netIncome, equity, dividendPayoutRatio, targetGrowthRate } = inputs;

    const roe = (netIncome / equity) * 100;
    const retentionRatio = 1 - dividendPayoutRatio;
    const sustainableGrowthRate = roe * retentionRatio;

    const canGrowWithoutFinancing = targetGrowthRate <= sustainableGrowthRate;
    const growthGap = targetGrowthRate - sustainableGrowthRate;
    const externalFinancingNeeded = canGrowWithoutFinancing
      ? 0
      : (growthGap / 100) * equity;

    // Optional DuPont decomposition
    let duPont: SGRDuPont | undefined;
    if (inputs.totalAssets && inputs.totalRevenue && inputs.totalRevenue > 0) {
      const netProfitMargin = (netIncome / inputs.totalRevenue) * 100;
      const assetTurnover = inputs.totalRevenue / inputs.totalAssets;
      const equityMultiplier = inputs.totalAssets / equity;
      duPont = {
        netProfitMargin,
        assetTurnover,
        equityMultiplier,
        roeDuPont: (netProfitMargin / 100) * assetTurnover * equityMultiplier * 100,
      };
    }

    const analysis = canGrowWithoutFinancing
      ? `Your SGR of ${sustainableGrowthRate.toFixed(1)}% fully supports your target growth of ${targetGrowthRate}%. ` +
        `You have a ${Math.abs(growthGap).toFixed(1)}% growth surplus — you can even distribute more dividends or invest in new initiatives.`
      : `Your SGR of ${sustainableGrowthRate.toFixed(1)}% falls ${Math.abs(growthGap).toFixed(1)} percentage points short of your ` +
        `target of ${targetGrowthRate}%. To close the gap without external financing, improve profitability or retain more earnings.`;

    const recommendations: string[] = [];
    if (!canGrowWithoutFinancing) {
      if (roe < 15) recommendations.push('Improve net profit margin to boost ROE above 15%.');
      if (retentionRatio < 0.7)
        recommendations.push('Reduce dividend payout — retaining more earnings directly raises your SGR.');
      recommendations.push(
        `To reach ${targetGrowthRate}% organically you need ROE × retention ≥ ${targetGrowthRate}. ` +
        `At your current retention of ${(retentionRatio * 100).toFixed(0)}%, target ROE ≥ ${(targetGrowthRate / retentionRatio).toFixed(1)}%.`
      );
    } else {
      recommendations.push('You are growing within sustainable limits. Consider reinvesting surplus into high-ROI initiatives.');
    }

    const now = Date.now();
    return {
      id: IdGenerator.generate('sgr'),
      companyId: inputs.companyId,
      currency: inputs.currency,
      createdAt: now,
      updatedAt: now,
      roe,
      retentionRatio,
      sustainableGrowthRate,
      canGrowWithoutFinancing,
      growthGap,
      externalFinancingNeeded,
      duPont,
      analysis,
      recommendations,
    };
  }

  static validate(inputs: SustainableGrowthRateInputs): ValidationResult {
    const errors: ValidationError[] = [];

    if (!inputs.companyId)
      errors.push({ field: 'companyId', message: 'Company ID is required', code: 'REQUIRED' });
    if (!inputs.currency)
      errors.push({ field: 'currency', message: 'Currency is required', code: 'REQUIRED' });
    if (!inputs.netIncome || inputs.netIncome <= 0)
      errors.push({ field: 'netIncome', message: 'Net income must be positive', code: 'OUT_OF_RANGE' });
    if (!inputs.equity || inputs.equity <= 0)
      errors.push({ field: 'equity', message: "Shareholders' equity must be positive", code: 'OUT_OF_RANGE' });
    if (inputs.dividendPayoutRatio < 0 || inputs.dividendPayoutRatio > 1)
      errors.push({ field: 'dividendPayoutRatio', message: 'Dividend payout ratio must be between 0 and 1', code: 'OUT_OF_RANGE' });
    if (inputs.targetGrowthRate < 0)
      errors.push({ field: 'targetGrowthRate', message: 'Target growth rate cannot be negative', code: 'OUT_OF_RANGE' });

    return { valid: errors.length === 0, errors };
  }
}
