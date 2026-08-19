import { BestFit } from "../conversion-solver";
import { roundShares } from "../utils/rounding";
import { StakeHolder, CommonCapTableRow, SafeCapTableRow, SeriesCapTableRow, CommonStockholder, SAFENote, SeriesInvestor, CapTableRowType, CommonRowType, PricedRoundCapTable, OptionsPoolCapTableRow } from "./types";
import { CalculationError, validateStakeholders } from "../validation";


export const buildPricedRoundCapTable = (pricedConversion: BestFit, stakeHolders: StakeHolder[]):
  PricedRoundCapTable => {
  validateStakeholders(stakeHolders, pricedConversion.roundingStrategy);
  const commonShareholders = stakeHolders.filter((stakeHolder) => stakeHolder.type === CapTableRowType.Common && stakeHolder.commonType !== CommonRowType.UnusedOptions) as CommonStockholder[];
  const safeNotes = stakeHolders.filter((stakeHolder) => stakeHolder.type === CapTableRowType.Safe) as SAFENote[];
  const seriesInvestors = stakeHolders.filter((stakeHolder) => stakeHolder.type === CapTableRowType.Series) as SeriesInvestor[];
  const totalShares = pricedConversion.totalShares;

  const totalInvestment = [...seriesInvestors, ...safeNotes].reduce((acc, investor) => acc + investor.investment, 0);

  const commonCapTable: CommonCapTableRow[] = commonShareholders.map((stockholder) => {
    return {
      name: stockholder.name,
      shares: stockholder.shares,
      ownershipPct: stockholder.shares / totalShares,
      type: CapTableRowType.Common,
      commonType: stockholder.commonType,
    }
  })

  const safeCapTable: SafeCapTableRow[] = safeNotes.map((safe, idx) => {
    const outcome = pricedConversion.safeConversions?.[idx];
    const pps = outcome?.pps ?? pricedConversion.ppss[idx];
    const shares = outcome?.shares ?? roundShares(safe.investment / pps, pricedConversion.roundingStrategy);
    const ownershipPct = shares / totalShares;
    return {
      name: safe.name,
      investment: safe.investment,
      ownershipPct,
      discount: outcome?.effectiveTerms.discount ?? safe.discount,
      cap: outcome?.effectiveTerms.cap ?? safe.cap,
      shares,
      type: CapTableRowType.Safe,
      pps,
    }
  })

  if (seriesInvestors.length > 0 && (
    pricedConversion.seriesInvestorShares.length !== seriesInvestors.length ||
    seriesInvestors.some((investor, index) =>
      investor.investment !== pricedConversion.seriesInvestorInvestments[index])
  )) {
    throw new CalculationError(
      "CONFLICTING_TRANSACTION_DATA",
      "the Series investor rows do not match the investor-level allocations used by the solver",
    );
  }
  const seriesCapTable: SeriesCapTableRow[] = seriesInvestors.map((seriesInvestor, index) => {
    const shares = pricedConversion.seriesInvestorShares[index];
    return {
      name: seriesInvestor.name,
      investment: seriesInvestor.investment,
      shares: shares,
      ownershipPct: shares / totalShares,
      pps: pricedConversion.pps,
      type: CapTableRowType.Series,
    }
  })

  const optionsPool: OptionsPoolCapTableRow = {
    name: "Options Pool",
    shares: pricedConversion.totalOptions,
    ownershipPct: pricedConversion.totalOptions / totalShares,
    type: CapTableRowType.OptionsPool,
  }

  return {
    common: commonCapTable,
    safes: safeCapTable,
    series: seriesCapTable,
    optionsPool,
    total: {
      name: "Total",
      // In a pre-round cap table, the total shares are just the common shares since we can't know the PPS yet
      shares: totalShares,
      investment: totalInvestment,
      ownershipPct: 1,
      type: CapTableRowType.Total,
    },
  }
}
