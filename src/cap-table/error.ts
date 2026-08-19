import { SAFENote, CommonStockholder, CommonCapTableRow, SafeCapTableRow, CapTableOwnershipError, CapTableRowType, CommonRowType, PreRoundCapTable } from "./types";

export const buildTBDPreRoundCapTable = (safeNotes: SAFENote[], common: CommonStockholder[]): PreRoundCapTable => {
  const totalInvestment = safeNotes.reduce((acc, investor) => acc + investor.investment, 0);
  const totalShares = common.reduce((acc, common) => acc + common.shares, 0)
  const ownershipError: CapTableOwnershipError = {
    type: "tbd",
    reason: "Unable to model Pre-Round cap table with uncapped SAFE's",
  }

  const safeCapTable: SafeCapTableRow[] = safeNotes.map((safe) => {
    return {
      name: safe.name,
      cap: safe.cap,
      discount: safe.discount,
      ownershipError: {
        type: "tbd",
        reason: "Unable to model Pre-Round cap table with uncapped SAFE's",
      },
      investment: safe.investment,
      type: CapTableRowType.Safe,
    }
  })

  const poolShares = common
    .filter((stockholder) => stockholder.commonType === CommonRowType.UnusedOptions)
    .reduce((total, stockholder) => total + stockholder.shares, 0);
  const commonCapTable: CommonCapTableRow[] = common
    .filter((stockholder) => stockholder.commonType === CommonRowType.Shareholder)
    .map((stockholder) => {
    return {
      name: stockholder.name,
      shares: stockholder.shares,
      ownershipError,
      type: CapTableRowType.Common,
      commonType: stockholder.commonType,
    }
  })


  return {
    common: commonCapTable,
    safes: safeCapTable,
    optionsPool: {
      name: "Options Pool",
      shares: poolShares,
      ownershipError,
      type: CapTableRowType.OptionsPool,
    },
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
