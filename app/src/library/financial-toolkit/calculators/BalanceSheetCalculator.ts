import { BalanceSheetInput, BalanceSheetOutput } from '../types';
import { IdGenerator, CalcUtils, Validator, StatusDeterminer } from '../utils/shared';

export class BalanceSheetCalculator {
  calculate(input: BalanceSheetInput): BalanceSheetOutput {
    const currency = input.currency || 'KES';

    if (!Validator.allNonNegative([input.cash, input.accountsReceivable, input.inventory])) {
      throw new Error('Asset values must be non-negative');
    }
    if (!Validator.isNonNegative(input.accountsPayable)) {
      throw new Error('Accounts payable must be non-negative');
    }

    // ── Assets ──────────────────────────────────────────────────────────────────
    const totalCurrentAssets = CalcUtils.round(
      CalcUtils.sum([
        input.cash,
        input.accountsReceivable,
        input.inventory,
        input.otherCurrentAssets || 0,
      ])
    );

    const netPPE =
      (input.propertyPlantEquipment || 0) - (input.accumulatedDepreciation || 0);
    const totalNonCurrentAssets = CalcUtils.round(
      CalcUtils.sum([
        netPPE,
        input.intangibleAssets || 0,
        input.otherNonCurrentAssets || 0,
      ])
    );

    const totalAssets = CalcUtils.round(totalCurrentAssets + totalNonCurrentAssets);

    // ── Liabilities ──────────────────────────────────────────────────────────────
    const totalCurrentLiabilities = CalcUtils.round(
      CalcUtils.sum([
        input.accountsPayable,
        input.shortTermDebt || 0,
        input.currentPortionLongTermDebt || 0,
        input.otherCurrentLiabilities || 0,
      ])
    );

    const totalNonCurrentLiabilities = CalcUtils.round(
      CalcUtils.sum([
        input.longTermDebt || 0,
        input.otherNonCurrentLiabilities || 0,
      ])
    );

    const totalLiabilities = CalcUtils.round(
      totalCurrentLiabilities + totalNonCurrentLiabilities
    );

    // ── Equity ───────────────────────────────────────────────────────────────────
    const totalEquity = CalcUtils.round(
      (input.paidInCapital || 0) + (input.retainedEarnings || 0)
    );

    // ── Balance Check ─────────────────────────────────────────────────────────────
    const liabilitiesAndEquity = CalcUtils.round(totalLiabilities + totalEquity);
    const balanceDifference = CalcUtils.round(totalAssets - liabilitiesAndEquity);
    const isBalanced = Math.abs(balanceDifference) < 0.01;

    // ── Ratios ────────────────────────────────────────────────────────────────────
    const currentRatio = CalcUtils.round(
      CalcUtils.divide(totalCurrentAssets, totalCurrentLiabilities)
    );
    const quickRatio = CalcUtils.round(
      CalcUtils.divide(
        totalCurrentAssets - input.inventory,
        totalCurrentLiabilities
      )
    );
    const debtToEquityRatio = CalcUtils.round(
      CalcUtils.divide(totalLiabilities, totalEquity)
    );
    const workingCapital = CalcUtils.round(
      totalCurrentAssets - totalCurrentLiabilities
    );

    return {
      id: IdGenerator.generate('balance-sheet'),
      currency,
      period: input.period,
      status: StatusDeterminer.fromRatio(currentRatio, {
        excellent: 2,
        good: 1.5,
        warning: 1,
      }),
      timestamp: new Date().toISOString(),
      totalCurrentAssets,
      totalNonCurrentAssets,
      totalAssets,
      totalCurrentLiabilities,
      totalNonCurrentLiabilities,
      totalLiabilities,
      totalEquity,
      currentRatio,
      quickRatio,
      debtToEquityRatio,
      workingCapital,
      isBalanced,
      balanceDifference,
    };
  }
}
