import {
  CashForecastInput,
  CashForecastOutput,
  CashForecastMonthOutput,
} from '../types';
import { IdGenerator, CalcUtils, Validator, StatusDeterminer } from '../utils/shared';

export class CashForecastCalculator {
  calculate(input: CashForecastInput): CashForecastOutput {
    const currency = input.currency || 'KES';
    const minimumCashBuffer = input.minimumCashBuffer || 0;

    if (!Validator.isNonNegative(input.openingBalance)) {
      throw new Error('Opening balance must be non-negative');
    }
    if (!input.months || input.months.length === 0) {
      throw new Error('At least one forecast month is required');
    }

    let runningBalance = input.openingBalance;

    const months: CashForecastMonthOutput[] = input.months.map((month) => {
      const openingBalance = runningBalance;
      const netCashFlow = month.projectedInflows - month.projectedOutflows;
      const closingBalance = CalcUtils.round(openingBalance + netCashFlow);
      runningBalance = closingBalance;

      const isBelowMinimum = closingBalance < minimumCashBuffer;
      const status = isBelowMinimum
        ? closingBalance < 0
          ? 'critical'
          : 'warning'
        : StatusDeterminer.fromRatio(closingBalance, {
            excellent: minimumCashBuffer * 3 || 100000,
            good: minimumCashBuffer * 2 || 50000,
            warning: minimumCashBuffer || 10000,
          });

      return {
        month: month.month,
        openingBalance: CalcUtils.round(openingBalance),
        inflows: CalcUtils.round(month.projectedInflows),
        outflows: CalcUtils.round(month.projectedOutflows),
        netCashFlow: CalcUtils.round(netCashFlow),
        closingBalance,
        status,
        isBelowMinimum,
      };
    });

    const balances = months.map((m) => m.closingBalance);
    const minimumBalance = CalcUtils.min(balances);
    const minimumBalanceMonth =
      months.find((m) => m.closingBalance === minimumBalance)?.month ?? '';

    const totalInflows = CalcUtils.round(
      CalcUtils.sum(input.months.map((m) => m.projectedInflows))
    );
    const totalOutflows = CalcUtils.round(
      CalcUtils.sum(input.months.map((m) => m.projectedOutflows))
    );
    const netCashFlow = CalcUtils.round(totalInflows - totalOutflows);
    const finalBalance = months[months.length - 1].closingBalance;
    const monthsBelowMinimum = months.filter((m) => m.isBelowMinimum).length;

    const avgMonthlyOutflow = CalcUtils.average(
      input.months.map((m) => m.projectedOutflows)
    );
    const cashRunwayMonths = CalcUtils.round(
      CalcUtils.divide(finalBalance, avgMonthlyOutflow)
    );

    const status =
      monthsBelowMinimum > 0
        ? 'warning'
        : StatusDeterminer.fromRatio(cashRunwayMonths, {
            excellent: 12,
            good: 6,
            warning: 3,
          });

    return {
      id: IdGenerator.generate('cash-forecast'),
      currency,
      period: input.period,
      status,
      timestamp: new Date().toISOString(),
      months,
      minimumBalance: CalcUtils.round(minimumBalance),
      minimumBalanceMonth,
      totalInflows,
      totalOutflows,
      netCashFlow,
      finalBalance,
      monthsBelowMinimum,
      cashRunwayMonths,
    };
  }
}
