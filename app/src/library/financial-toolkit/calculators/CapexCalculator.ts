import { CapexInput, CapexOutput, CapexItemOutput } from '../types';
import { IdGenerator, CalcUtils, Validator, StatusDeterminer } from '../utils/shared';

export class CapexCalculator {
  calculate(input: CapexInput): CapexOutput {
    const currency = input.currency || 'KES';
    const method = input.depreciationMethod || 'straight-line';

    if (!input.items || input.items.length === 0) {
      throw new Error('At least one CapEx item is required');
    }

    const items: CapexItemOutput[] = input.items.map((item) => {
      if (!Validator.isPositive(item.cost)) {
        throw new Error(`Item "${item.name}" must have a positive cost`);
      }
      if (!Validator.isPositive(item.usefulLifeYears)) {
        throw new Error(
          `Item "${item.name}" must have a positive useful life`
        );
      }

      const salvageValue = item.salvageValue || 0;
      const depreciableAmount = item.cost - salvageValue;

      let annualDepreciation: number;
      switch (method) {
        case 'declining-balance':
          annualDepreciation = CalcUtils.round(
            item.cost * (2 / item.usefulLifeYears)
          );
          break;
        case 'sum-of-years': {
          const sumOfYears =
            (item.usefulLifeYears * (item.usefulLifeYears + 1)) / 2;
          annualDepreciation = CalcUtils.round(
            depreciableAmount * (item.usefulLifeYears / sumOfYears)
          );
          break;
        }
        default: // straight-line
          annualDepreciation = CalcUtils.round(
            CalcUtils.divide(depreciableAmount, item.usefulLifeYears)
          );
      }

      const monthlyDepreciation = CalcUtils.round(annualDepreciation / 12);
      const accumulatedDepreciation = annualDepreciation; // first year
      const netBookValue = CalcUtils.round(item.cost - accumulatedDepreciation);

      return {
        name: item.name,
        cost: item.cost,
        annualDepreciation,
        monthlyDepreciation,
        netBookValue,
        accumulatedDepreciation,
      };
    });

    const totalCapex = CalcUtils.sum(input.items.map((i) => i.cost));
    const totalAnnualDepreciation = CalcUtils.sum(
      items.map((i) => i.annualDepreciation)
    );
    const totalMonthlyDepreciation = CalcUtils.round(
      totalAnnualDepreciation / 12
    );

    return {
      id: IdGenerator.generate('capex'),
      currency,
      period: input.period,
      status: StatusDeterminer.fromRatio(totalCapex, {
        good: 1,
        warning: 0.01,
      }),
      timestamp: new Date().toISOString(),
      totalCapex,
      totalAnnualDepreciation,
      totalMonthlyDepreciation,
      items,
    };
  }
}
