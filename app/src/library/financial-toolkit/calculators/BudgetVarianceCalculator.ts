import {
  BudgetVarianceInput,
  BudgetVarianceOutput,
  BudgetVarianceLineOutput,
} from '../types';
import { IdGenerator, CalcUtils, Validator, StatusDeterminer } from '../utils/shared';

export class BudgetVarianceCalculator {
  calculate(input: BudgetVarianceInput): BudgetVarianceOutput {
    const currency = input.currency || 'KES';

    if (!input.items || input.items.length === 0) {
      throw new Error('At least one budget item is required');
    }

    const items: BudgetVarianceLineOutput[] = input.items.map((item) => {
      if (!Validator.isValidCurrency(item.budgeted) || !Validator.isValidCurrency(item.actual)) {
        throw new Error(`Invalid values for category "${item.category}"`);
      }

      const variance = CalcUtils.round(item.actual - item.budgeted);
      const variancePercentage = CalcUtils.round(
        CalcUtils.percentage(variance, item.budgeted)
      );
      const isOverBudget = variance > 0;

      return {
        category: item.category,
        budgeted: item.budgeted,
        actual: item.actual,
        variance,
        variancePercentage,
        status: StatusDeterminer.fromRatio(
          Math.abs(variancePercentage),
          { good: 5, warning: 15 },
          false
        ),
        isOverBudget,
      };
    });

    const totalBudgeted = CalcUtils.round(
      CalcUtils.sum(input.items.map((i) => i.budgeted))
    );
    const totalActual = CalcUtils.round(
      CalcUtils.sum(input.items.map((i) => i.actual))
    );
    const totalVariance = CalcUtils.round(totalActual - totalBudgeted);
    const totalVariancePercentage = CalcUtils.round(
      CalcUtils.percentage(totalVariance, totalBudgeted)
    );

    const overBudgetCategories = items
      .filter((i) => i.isOverBudget)
      .map((i) => i.category);
    const underBudgetCategories = items
      .filter((i) => !i.isOverBudget && i.variance < 0)
      .map((i) => i.category);

    return {
      id: IdGenerator.generate('budget-variance'),
      currency,
      period: input.period,
      status: StatusDeterminer.fromRatio(
        Math.abs(totalVariancePercentage),
        { good: 5, warning: 15 },
        false
      ),
      timestamp: new Date().toISOString(),
      items,
      totalBudgeted,
      totalActual,
      totalVariance,
      totalVariancePercentage,
      overBudgetCategories,
      underBudgetCategories,
    };
  }
}
