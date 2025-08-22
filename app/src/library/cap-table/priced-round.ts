import { BestFit } from "@library/conversion-solver";
import { roundShares } from "@library/utils/rounding";
import { StakeHolder, CommonCapTableRow, SafeCapTableRow, SeriesCapTableRow, RefreshedOptionsCapTableRow, TotalCapTableRow, CapTableOwnershipError, CommonStockholder, SAFENote, SeriesInvestor, CapTableRowType, CommonRowType } from "./types";


export const buildPricedRoundCapTable = (pricedConversion: BestFit, stakeHolders: StakeHolder[]): 
  {
    common: CommonCapTableRow[],
    safes: SafeCapTableRow[],
    series: SeriesCapTableRow[],
    refreshedOptionsPool: RefreshedOptionsCapTableRow,
    total: TotalCapTableRow,
    error?: CapTableOwnershipError
  } => {
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
    const pps = pricedConversion.ppss[idx] || 0;
    const shares = roundShares(safe.investment / pps, pricedConversion.roundingStrategy);
    const ownershipPct = shares / totalShares;
    return {
      name: safe.name,
      investment: safe.investment,
      ownershipPct,
      discount: safe.discount,
      cap: safe.cap,
      shares,
      type: CapTableRowType.Safe,
      pps,
    }
  })

  const seriesCapTable: SeriesCapTableRow[] = seriesInvestors.map((seriesInvestor) => {
    const shares = roundShares(seriesInvestor.investment / pricedConversion.pps, pricedConversion.roundingStrategy);
    return {
      name: seriesInvestor.name,
      investment: seriesInvestor.investment,
      shares: shares,
      ownershipPct: shares / totalShares,
      pps: pricedConversion.pps,
      type: CapTableRowType.Series,
    }
  })
  
  const refreshedOptionsPool: RefreshedOptionsCapTableRow = {
    name: "Refreshed Options Pool",
    shares: pricedConversion.totalOptions,
    ownershipPct: pricedConversion.totalOptions / totalShares,
    type: CapTableRowType.RefreshedOptions
  }

  return {
    common: commonCapTable,
    safes: safeCapTable,
    series: seriesCapTable,
    refreshedOptionsPool,
    total: {
      name: "Total",
      // In a pre-round cap table, the total shares are just the common shares since we can't know the PPS yet
      shares: totalShares,
      investment: totalInvestment,
      ownershipPct: 1,
      type: CapTableRowType.Total,
    },
    error: undefined
  }
}
