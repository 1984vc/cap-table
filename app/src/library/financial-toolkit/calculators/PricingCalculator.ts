import { PricingInput, PricingOutput } from '../types';
import { IdGenerator, CalcUtils, Validator, StatusDeterminer } from '../utils/shared';

export class PricingCalculator {
  calculate(input: PricingInput): PricingOutput {
    const currency = input.currency || 'KES';

    if (!Validator.isNonNegative(input.directCost)) {
      throw new Error('Direct cost must be non-negative');
    }
    if (!Validator.isNonNegative(input.indirectCostAllocation)) {
      throw new Error('Indirect cost allocation must be non-negative');
    }
    if (!Validator.isValidPercentage(input.desiredProfitMargin)) {
      throw new Error('Desired profit margin must be between 0 and 100');
    }

    const totalCost = CalcUtils.round(
      input.directCost + input.indirectCostAllocation
    );

    // Cost-plus pricing: price = cost / (1 - margin%)
    const marginDecimal = input.desiredProfitMargin / 100;
    const costPlusPrice = CalcUtils.round(
      CalcUtils.divide(totalCost, 1 - marginDecimal)
    );
    const minimumViablePrice = CalcUtils.round(totalCost * 1.05); // 5% floor above cost

    let competitorPriceAverage: number | undefined;
    if (input.competitorPrices && input.competitorPrices.length > 0) {
      competitorPriceAverage = CalcUtils.round(
        CalcUtils.average(input.competitorPrices)
      );
    }

    const customerWTP = input.customerWillingnessToPay;

    let recommendedPrice: number;
    if (competitorPriceAverage !== undefined && customerWTP !== undefined) {
      recommendedPrice = CalcUtils.round(
        CalcUtils.clamp(
          costPlusPrice,
          minimumViablePrice,
          Math.min(competitorPriceAverage * 1.1, customerWTP)
        )
      );
    } else if (competitorPriceAverage !== undefined) {
      recommendedPrice = CalcUtils.round(
        Math.max(costPlusPrice, competitorPriceAverage * 0.95)
      );
    } else {
      recommendedPrice = costPlusPrice;
    }

    const profitPerUnit = CalcUtils.round(recommendedPrice - totalCost);
    const marginAtRecommendedPrice = CalcUtils.round(
      CalcUtils.percentage(profitPerUnit, recommendedPrice)
    );

    let pricePositioning: PricingOutput['pricePositioning'];
    if (competitorPriceAverage !== undefined) {
      if (recommendedPrice < competitorPriceAverage * 0.95)
        pricePositioning = 'below-market';
      else if (recommendedPrice > competitorPriceAverage * 1.05)
        pricePositioning = 'above-market';
      else pricePositioning = 'at-market';
    }

    return {
      id: IdGenerator.generate('pricing'),
      currency,
      period: input.period,
      status: StatusDeterminer.fromRatio(marginAtRecommendedPrice, {
        excellent: 40,
        good: 20,
        warning: 10,
      }),
      timestamp: new Date().toISOString(),
      totalCost,
      costPlusPrice,
      minimumViablePrice,
      recommendedPrice,
      profitPerUnit,
      competitorPriceAverage,
      pricePositioning,
      marginAtRecommendedPrice,
    };
  }
}
