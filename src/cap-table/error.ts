import { SAFENote, CommonStockholder, CommonCapTableRow, SafeCapTableRow, TotalCapTableRow, CapTableOwnershipError, CapTableRowType } from "./types";

export const buildTBDPreRoundCapTable = (safeNotes: SAFENote[], common: CommonStockholder[]): {common: CommonCapTableRow[], safes: SafeCapTableRow[], total: TotalCapTableRow} => {
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

  const commonCapTable: CommonCapTableRow[] = common.map((stockholder) => {
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


// Builds a cap table with all the ownership marked as an Error
export const buildErrorPreRoundCapTable = (safeNotes: SAFENote[], common: CommonStockholder[]): {common: CommonCapTableRow[], safes: SafeCapTableRow[], total: TotalCapTableRow} => {
  const totalInvestment = safeNotes.reduce((acc, investor) => acc + investor.investment, 0);
  const totalShares = common.reduce((acc, common) => acc + common.shares, 0)
  const ownershipError: CapTableOwnershipError = {
    type: "error",
  }

  const safeCapTable: SafeCapTableRow[] = safeNotes.map((safe) => {
    const safeOwnershipError = {...ownershipError}
    if (safe.investment >= safe.cap && safe.cap !== 0) {
      safeOwnershipError.reason = "SAFE's investment cannot equal or exceed the Cap"
    }
    return {
      name: safe.name,
      cap: safe.cap,
      discount: safe.discount,
      ownershipError: safeOwnershipError,
      investment: safe.investment,
      type: CapTableRowType.Safe,
    }
  })

  const commonCapTable: CommonCapTableRow[] = common.map((stockholder) => {
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
