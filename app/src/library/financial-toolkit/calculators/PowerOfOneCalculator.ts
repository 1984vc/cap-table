// app/src/library/financial-toolkit/calculators/PowerOfOneCalculator.ts
/**
 * Power of One Calculator
 * Shows the compounding profit impact of a 1% improvement across key levers
 */

import type { BaseCalculatorResult, ValidationResult, ValidationError, Currency } from '../types';
import { IdGenerator } from '../utils/shared';

export interface PowerOfOneInputs {
  companyId: string;
  currency: Currency;
  currentRevenue: number;
  currentVolume: number;       // units sold
  currentPrice: number;        // price per unit
  currentVariableCost: number; // variable cost per unit
  currentFixedCost: number;    // total fixed costs
}

export interface PowerOfOneLever {
  lever: string;
  description: string;
  currentValue: number;
  improvedValue: number;
  profitImpact: number;
  profitImpactPercent: number; // % increase in profit from this lever alone
}

export interface PowerOfOneResult extends BaseCalculatorResult {
  currentGrossProfit: number;  // per unit
  currentProfit: number;       // total net profit
  currentMargin: number;       // net margin %
  rankedLevers: PowerOfOneLever[];
  bestLever: PowerOfOneLever;
  combinedImpact: number;      // total if all 4 levers improved by 1%
  combinedImpactPercent: number;
}

export class PowerOfOneCalculator {
  static calculate(inputs: PowerOfOneInputs): PowerOfOneResult {
    const validation = this.validate(inputs);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const { currentVolume, currentPrice, currentVariableCost, currentFixedCost } = inputs;

    const currentContribution = currentPrice - currentVariableCost;
    const currentProfit = currentVolume * currentContribution - currentFixedCost;
    const currentMargin = inputs.currentRevenue > 0
      ? (currentProfit / inputs.currentRevenue) * 100
      : 0;

    // 1% improvement in each lever
    const volumeImproved = currentVolume * 1.01;
    const priceImproved = currentPrice * 1.01;
    const vcImproved = currentVariableCost * 0.99;   // 1% reduction
    const fcImproved = currentFixedCost * 0.99;      // 1% reduction

    const profitAfterVolume = volumeImproved * currentContribution - currentFixedCost;
    const profitAfterPrice  = currentVolume * (priceImproved - currentVariableCost) - currentFixedCost;
    const profitAfterVC     = currentVolume * (currentPrice - vcImproved) - currentFixedCost;
    const profitAfterFC     = currentVolume * currentContribution - fcImproved;

    const pctImpact = (newProfit: number) =>
      currentProfit !== 0 ? ((newProfit - currentProfit) / Math.abs(currentProfit)) * 100 : 0;

    const levers: PowerOfOneLever[] = [
      {
        lever: 'Price',
        description: 'Increase selling price by 1%',
        currentValue: currentPrice,
        improvedValue: priceImproved,
        profitImpact: profitAfterPrice - currentProfit,
        profitImpactPercent: pctImpact(profitAfterPrice),
      },
      {
        lever: 'Volume',
        description: 'Increase units sold by 1%',
        currentValue: currentVolume,
        improvedValue: volumeImproved,
        profitImpact: profitAfterVolume - currentProfit,
        profitImpactPercent: pctImpact(profitAfterVolume),
      },
      {
        lever: 'Variable Cost',
        description: 'Reduce variable cost per unit by 1%',
        currentValue: currentVariableCost,
        improvedValue: vcImproved,
        profitImpact: profitAfterVC - currentProfit,
        profitImpactPercent: pctImpact(profitAfterVC),
      },
      {
        lever: 'Fixed Cost',
        description: 'Reduce total fixed costs by 1%',
        currentValue: currentFixedCost,
        improvedValue: fcImproved,
        profitImpact: profitAfterFC - currentProfit,
        profitImpactPercent: pctImpact(profitAfterFC),
      },
    ];

    const rankedLevers = [...levers].sort((a, b) => b.profitImpact - a.profitImpact);
    const bestLever = rankedLevers[0];

    const combinedImpact = rankedLevers.reduce((sum, l) => sum + l.profitImpact, 0);
    const combinedImpactPercent = pctImpact(currentProfit + combinedImpact);

    const now = Date.now();
    return {
      id: IdGenerator.generate('pow'),
      companyId: inputs.companyId,
      currency: inputs.currency,
      createdAt: now,
      updatedAt: now,
      currentGrossProfit: currentContribution,
      currentProfit,
      currentMargin,
      rankedLevers,
      bestLever,
      combinedImpact,
      combinedImpactPercent,
    };
  }

  static validate(inputs: PowerOfOneInputs): ValidationResult {
    const errors: ValidationError[] = [];

    if (!inputs.companyId)
      errors.push({ field: 'companyId', message: 'Company ID is required', code: 'REQUIRED' });
    if (!inputs.currency)
      errors.push({ field: 'currency', message: 'Currency is required', code: 'REQUIRED' });
    if (!inputs.currentRevenue || inputs.currentRevenue <= 0)
      errors.push({ field: 'currentRevenue', message: 'Revenue must be positive', code: 'OUT_OF_RANGE' });
    if (!inputs.currentVolume || inputs.currentVolume <= 0)
      errors.push({ field: 'currentVolume', message: 'Volume must be positive', code: 'OUT_OF_RANGE' });
    if (!inputs.currentPrice || inputs.currentPrice <= 0)
      errors.push({ field: 'currentPrice', message: 'Price must be positive', code: 'OUT_OF_RANGE' });
    if (inputs.currentVariableCost < 0)
      errors.push({ field: 'currentVariableCost', message: 'Variable cost cannot be negative', code: 'OUT_OF_RANGE' });
    if (inputs.currentFixedCost < 0)
      errors.push({ field: 'currentFixedCost', message: 'Fixed cost cannot be negative', code: 'OUT_OF_RANGE' });

    return { valid: errors.length === 0, errors };
  }
}
