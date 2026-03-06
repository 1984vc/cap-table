import {
  CashLeakageInput,
  CashLeakageOutput,
  CashLeakageItemOutput,
} from '../types';
import { IdGenerator, CalcUtils, Validator, StatusDeterminer } from '../utils/shared';

export class CashLeakageCalculator {
  calculate(input: CashLeakageInput): CashLeakageOutput {
    const currency = input.currency || 'KES';

    if (!input.items || input.items.length === 0) {
      throw new Error('At least one line item is required');
    }

    const items: CashLeakageItemOutput[] = input.items.map((item) => {
      if (
        !Validator.isValidCurrency(item.expectedAmount) ||
        !Validator.isValidCurrency(item.actualAmount)
      ) {
        throw new Error(`Invalid values for category "${item.category}"`);
      }

      const leakage = CalcUtils.round(item.actualAmount - item.expectedAmount);
      const leakagePercentage = CalcUtils.round(
        CalcUtils.percentage(leakage, item.expectedAmount)
      );

      return {
        category: item.category,
        expected: item.expectedAmount,
        actual: item.actualAmount,
        leakage,
        leakagePercentage,
        status: StatusDeterminer.fromRatio(
          Math.abs(leakagePercentage),
          { good: 5, warning: 20 },
          false
        ),
      };
    });

    const totalExpected = CalcUtils.round(
      CalcUtils.sum(input.items.map((i) => i.expectedAmount))
    );
    const totalActual = CalcUtils.round(
      CalcUtils.sum(input.items.map((i) => i.actualAmount))
    );
    const totalLeakage = CalcUtils.round(totalActual - totalExpected);
    const totalLeakagePercentage = CalcUtils.round(
      CalcUtils.percentage(totalLeakage, totalExpected)
    );

    const topLeakageCategories = items
      .filter((i) => i.leakage > 0)
      .sort((a, b) => b.leakage - a.leakage)
      .slice(0, 3)
      .map((i) => i.category);

    const leakageScore = CalcUtils.clamp(
      100 - Math.abs(totalLeakagePercentage) * 2,
      0,
      100
    );

    return {
      id: IdGenerator.generate('cash-leakage'),
      currency,
      period: input.period,
      status: StatusDeterminer.fromRatio(leakageScore, {
        excellent: 90,
        good: 70,
        warning: 50,
      }),
      timestamp: new Date().toISOString(),
      items,
      totalExpected,
      totalActual,
      totalLeakage,
      totalLeakagePercentage,
      topLeakageCategories,
      leakageScore: CalcUtils.round(leakageScore),
    };
  }
}
