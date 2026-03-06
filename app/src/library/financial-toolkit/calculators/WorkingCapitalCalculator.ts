import { WorkingCapitalInput, WorkingCapitalOutput } from '../types';
import { IdGenerator, CalcUtils, Validator, StatusDeterminer } from '../utils/shared';

export class WorkingCapitalCalculator {
  calculate(input: WorkingCapitalInput): WorkingCapitalOutput {
    const currency = input.currency || 'KES';

    if (
      !Validator.allNonNegative([
        input.cash,
        input.accountsReceivable,
        input.inventory,
      ])
    ) {
      throw new Error('Asset values must be non-negative');
    }
    if (!Validator.isNonNegative(input.accountsPayable)) {
      throw new Error('Accounts payable must be non-negative');
    }

    const currentAssets = CalcUtils.round(
      CalcUtils.sum([
        input.cash,
        input.accountsReceivable,
        input.inventory,
        input.otherCurrentAssets || 0,
      ])
    );

    const currentLiabilities = CalcUtils.round(
      CalcUtils.sum([
        input.accountsPayable,
        input.shortTermDebt || 0,
        input.otherCurrentLiabilities || 0,
      ])
    );

    const workingCapital = CalcUtils.round(currentAssets - currentLiabilities);
    const currentRatio = CalcUtils.round(
      CalcUtils.divide(currentAssets, currentLiabilities)
    );
    const quickRatio = CalcUtils.round(
      CalcUtils.divide(currentAssets - input.inventory, currentLiabilities)
    );
    const cashRatio = CalcUtils.round(
      CalcUtils.divide(input.cash, currentLiabilities)
    );

    let daysPayableOutstanding: number | undefined;
    let daysReceivableOutstanding: number | undefined;
    let daysInventoryOutstanding: number | undefined;
    let cashConversionCycle: number | undefined;
    let workingCapitalTurnover: number | undefined;

    if (input.annualCOGS && input.annualCOGS > 0) {
      const dailyCOGS = input.annualCOGS / 365;
      daysPayableOutstanding = CalcUtils.round(
        CalcUtils.divide(input.accountsPayable, dailyCOGS)
      );
      daysInventoryOutstanding = CalcUtils.round(
        CalcUtils.divide(input.inventory, dailyCOGS)
      );
    }

    if (input.annualRevenue && input.annualRevenue > 0) {
      const dailyRevenue = input.annualRevenue / 365;
      daysReceivableOutstanding = CalcUtils.round(
        CalcUtils.divide(input.accountsReceivable, dailyRevenue)
      );
      workingCapitalTurnover = CalcUtils.round(
        CalcUtils.divide(input.annualRevenue, workingCapital)
      );
    }

    if (
      daysReceivableOutstanding !== undefined &&
      daysInventoryOutstanding !== undefined &&
      daysPayableOutstanding !== undefined
    ) {
      cashConversionCycle = CalcUtils.round(
        daysReceivableOutstanding +
          daysInventoryOutstanding -
          daysPayableOutstanding
      );
    }

    return {
      id: IdGenerator.generate('working-capital'),
      currency,
      period: input.period,
      status: StatusDeterminer.fromRatio(currentRatio, {
        excellent: 2,
        good: 1.5,
        warning: 1,
      }),
      timestamp: new Date().toISOString(),
      currentAssets,
      currentLiabilities,
      workingCapital,
      currentRatio,
      quickRatio,
      cashRatio,
      daysPayableOutstanding,
      daysReceivableOutstanding,
      daysInventoryOutstanding,
      cashConversionCycle,
      workingCapitalTurnover,
    };
  }
}
