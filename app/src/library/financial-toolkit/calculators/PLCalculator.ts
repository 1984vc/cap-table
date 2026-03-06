import { PLInput, PLOutput } from '../types';
import { IdGenerator, CalcUtils, Validator, StatusDeterminer } from '../utils/shared';

export class PLCalculator {
  calculate(input: PLInput): PLOutput {
    const currency = input.currency || 'KES';

    if (!Validator.isNonNegative(input.revenue)) {
      throw new Error('Revenue must be non-negative');
    }
    if (!Validator.isNonNegative(input.costOfGoodsSold)) {
      throw new Error('Cost of goods sold must be non-negative');
    }

    const opEx = input.operatingExpenses || {};
    const totalOperatingExpenses = CalcUtils.round(
      CalcUtils.sum([
        opEx.salaries || 0,
        opEx.rent || 0,
        opEx.utilities || 0,
        opEx.marketing || 0,
        opEx.depreciation || 0,
        opEx.other || 0,
      ])
    );

    const grossProfit = CalcUtils.round(input.revenue - input.costOfGoodsSold);
    const grossMargin = CalcUtils.percentage(grossProfit, input.revenue);

    // EBITDA: gross profit minus operating expenses (excl. depreciation) plus other income
    const ebitda = CalcUtils.round(
      grossProfit -
        totalOperatingExpenses +
        (opEx.depreciation || 0) +
        (input.otherIncome || 0)
    );
    const ebit = CalcUtils.round(ebitda - (opEx.depreciation || 0));

    const netProfitBeforeTax = CalcUtils.round(
      ebit - (input.otherExpenses || 0)
    );

    const taxRate = input.taxRate ?? 0.3; // Kenya default corporate tax rate
    const taxAmount = CalcUtils.round(Math.max(0, netProfitBeforeTax * taxRate));
    const netProfit = CalcUtils.round(netProfitBeforeTax - taxAmount);

    const netMargin = CalcUtils.percentage(netProfit, input.revenue);
    const operatingMargin = CalcUtils.percentage(ebit, input.revenue);

    return {
      id: IdGenerator.generate('pl'),
      currency,
      period: input.period,
      status: StatusDeterminer.fromRatio(netMargin, {
        excellent: 20,
        good: 10,
        warning: 0,
      }),
      timestamp: new Date().toISOString(),
      revenue: input.revenue,
      costOfGoodsSold: input.costOfGoodsSold,
      grossProfit,
      grossMargin,
      totalOperatingExpenses,
      ebitda,
      ebit,
      netProfitBeforeTax,
      taxAmount,
      netProfit,
      netMargin,
      operatingMargin,
    };
  }
}
