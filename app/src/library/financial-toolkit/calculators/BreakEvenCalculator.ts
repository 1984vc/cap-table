import { BreakEvenInput, BreakEvenOutput } from '../types';
import { IdGenerator, CalcUtils, Validator, StatusDeterminer } from '../utils/shared';

export class BreakEvenCalculator {
  calculate(input: BreakEvenInput): BreakEvenOutput {
    const currency = input.currency || 'KES';

    if (!Validator.isPositive(input.fixedCosts)) {
      throw new Error('Fixed costs must be positive');
    }
    if (!Validator.isPositive(input.sellingPricePerUnit)) {
      throw new Error('Selling price must be positive');
    }
    if (!Validator.isNonNegative(input.variableCostPerUnit)) {
      throw new Error('Variable cost per unit must be non-negative');
    }
    if (input.variableCostPerUnit >= input.sellingPricePerUnit) {
      throw new Error('Selling price must exceed variable cost per unit');
    }

    const contributionMarginPerUnit = CalcUtils.round(
      input.sellingPricePerUnit - input.variableCostPerUnit
    );
    const contributionMarginRatio = CalcUtils.percentage(
      contributionMarginPerUnit,
      input.sellingPricePerUnit
    );
    const breakEvenUnits = Math.ceil(
      CalcUtils.divide(input.fixedCosts, contributionMarginPerUnit)
    );
    const breakEvenRevenue = CalcUtils.round(
      breakEvenUnits * input.sellingPricePerUnit
    );

    let marginOfSafety: number | undefined;
    let marginOfSafetyPercentage: number | undefined;
    if (input.currentUnits !== undefined) {
      marginOfSafety = CalcUtils.round(
        (input.currentUnits - breakEvenUnits) * input.sellingPricePerUnit
      );
      marginOfSafetyPercentage = CalcUtils.round(
        CalcUtils.percentage(
          input.currentUnits - breakEvenUnits,
          input.currentUnits
        )
      );
    }

    let unitsForTargetProfit: number | undefined;
    let revenueForTargetProfit: number | undefined;
    if (input.targetProfit !== undefined) {
      unitsForTargetProfit = Math.ceil(
        CalcUtils.divide(
          input.fixedCosts + input.targetProfit,
          contributionMarginPerUnit
        )
      );
      revenueForTargetProfit = CalcUtils.round(
        unitsForTargetProfit * input.sellingPricePerUnit
      );
    }

    return {
      id: IdGenerator.generate('break-even'),
      currency,
      period: input.period,
      status: StatusDeterminer.fromRatio(contributionMarginRatio, {
        excellent: 50,
        good: 30,
        warning: 15,
      }),
      timestamp: new Date().toISOString(),
      breakEvenUnits,
      breakEvenRevenue,
      contributionMarginPerUnit,
      contributionMarginRatio,
      marginOfSafety,
      marginOfSafetyPercentage,
      unitsForTargetProfit,
      revenueForTargetProfit,
    };
  }
}
