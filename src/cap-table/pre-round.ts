import { BestFit, DEFAULT_ROUNDING_STRATEGY } from "../conversion-solver";
import { isMFN, populateSafeCaps } from "../safe-calcs";
import { RoundingStrategy, roundShares } from "../utils/rounding";
import { SAFENote, CommonStockholder, CommonCapTableRow, SafeCapTableRow, StakeHolder, CapTableRowType, CommonRowType, PreRoundCapTable } from "./types";
import { buildTBDPreRoundCapTable } from "./error";
import { formatUSDWithCommas } from "../utils/numberFormatting";
import { validateStakeholders } from "../validation";

// Builds a preRound cap table assuming there are no refreshed options
// Needs to handle 2 possible output states; invalid input throws:
// 1. Round modelled with max Cap
// 2. Round entirely TBD because no max cap
export const buildEstimatedPreRoundCapTable = (stakeHolders: StakeHolder[], roundingStrategy: RoundingStrategy = DEFAULT_ROUNDING_STRATEGY): PreRoundCapTable => {
  validateStakeholders(stakeHolders, roundingStrategy);
  const commonShareholders = stakeHolders.filter((stakeHolder) => stakeHolder.type === CapTableRowType.Common) as CommonStockholder[];
  const issuedShareholders = commonShareholders.filter((stockholder) => stockholder.commonType === CommonRowType.Shareholder);
  const unusedOptions = commonShareholders
    .filter((stockholder) => stockholder.commonType === CommonRowType.UnusedOptions)
    .reduce((total, stockholder) => total + stockholder.shares, 0);

  // The premoney shares are used to determine the pre-money safe conversions (SAFE cap / PreMoneyShares)
  const preMoneyShares = commonShareholders.reduce((acc, stockholder) => acc + stockholder.shares, 0);

  // Make a provisional, price-free election of one complete later MFN package.
  const inputSafeNotes = stakeHolders.filter((stakeHolder) => stakeHolder.type === CapTableRowType.Safe) as SAFENote[];
  const safeNotes = populateSafeCaps(inputSafeNotes)

  const maxCap = safeNotes.reduce((max, stakeholder) => Math.max(max, stakeholder.cap), 0)

  // Handle cases where we simply can't build an estimated cap table until a priced round.
  // A fixed-percentage (yc7p) SAFE is contractually set at 7% and can still be modelled.
  if (maxCap === 0 && safeNotes.some((safe) => safe.conversionType !== "yc7p")) {
    return buildTBDPreRoundCapTable(safeNotes, [...commonShareholders])
  }

  // Step one, convert all the SAFE's with the following rules
  // 1. Premoney SAFE | shares = (investment/cap) * preMoneyShares
  // 2. PostMoney SAFE | ownershipPct = investment / cap
  //
  // Next, use the Post Money SAFE pct to calculate the total pre-round shares
  // postMoneyShares = (preMoneyShare + preMoneySafeShares) / (1 - totalSafePercent)
  //
  // Finally, get the preMoneySafe percents using preMoneySafe shares / postMoneyShares


  const totalInvestment = [...safeNotes].reduce((acc, investor) => acc + investor.investment, 0);

  let safeCapTable: SafeCapTableRow[] = safeNotes.map((safe) => {
    if (safe.conversionType === "yc7p") {
      return {
        name: safe.name,
        cap: safe.cap,
        discount: safe.discount,
        sideLetters: safe.sideLetters,
        ownershipPct: 0.07,
        investment: safe.investment,
        type: CapTableRowType.Safe,
      };
    } else if (safe.conversionType === 'pre') {
      const cap = (safe.cap === 0 ? maxCap : safe.cap)
      const shares = roundShares((safe.investment / cap) * preMoneyShares, roundingStrategy)
      return {
        name: safe.name,
        cap: safe.cap,
        discount: safe.discount,
        shares: shares,
        sideLetters: safe.sideLetters,
        investment: safe.investment,
        type: CapTableRowType.Safe,
      }
    } else {
      return {
        name: safe.name,
        cap: safe.cap,
        discount: safe.discount,
        sideLetters: safe.sideLetters,
        ownershipPct: safe.investment / (safe.cap === 0 ? maxCap : safe.cap),
        investment: safe.investment,
        type: CapTableRowType.Safe,
      }
    }
  })


  const preMoneySafeShares = safeCapTable.reduce((acc, safe) => acc + (safe.shares ?? 0), 0)
  const postSharePct = safeCapTable.reduce((acc, safe) => acc + (safe.ownershipPct ?? 0), 0)
  // Now we can use this to get pre-money ownership Pct
  const postShareCapitilization = roundShares((preMoneyShares + preMoneySafeShares) / ( 1 - postSharePct), roundingStrategy)

  // Now recalc all the safes with this information
  safeCapTable = safeCapTable.map((safe) => {
    if (safe.shares && safe.shares > 0) {
      const pct = safe.shares / postShareCapitilization
      return {
        name: safe.name,
        cap: safe.cap,
        discount: safe.discount,
        shares: safe.shares,
        ownershipPct: pct,
        sideLetters: safe.sideLetters,
        investment: safe.investment,
        type: CapTableRowType.Safe,
      }
    } else {
      return {
        ...safe,
        shares: roundShares((safe.ownershipPct ?? 0) * postShareCapitilization, roundingStrategy)
      }
    }
  })

  safeCapTable = safeCapTable.map((safe, idx) => {
    const effectiveSafe = safeNotes[idx];
    const inputSafe = inputSafeNotes[idx];
    if (safeNotes[idx]?.conversionType === "yc7p") {
      return safe
    }
    if (inputSafe && isMFN(inputSafe)) {
      const election = effectiveSafe.electionSourceName
        ? ` The provisional estimate elects ${effectiveSafe.electionSourceName}.`
        : " No eligible later SAFE package is currently available.";
      return {
        ...safe,
        ownershipError: {
          type: "caveat" as const,
          reason: `MFN ownership is provisional because the future priced-round PPS can change which cap or discount package is most favorable.${election}`,
        },
      };
    }
    if (safe.cap === 0) {
      let reason = `No cap set for this SAFE, ownership based on max cap of all other SAFE's. Currently set to ${formatUSDWithCommas(maxCap)}.`
      if (safe.discount > 0) {
        reason = reason + " It is not possible to calculate ownership with a discount until a priced round is entered."

      }

      return {
        ...safe,
        ownershipError: {
          type: "caveat" as const,
          reason,
        },
      }
    } else if (safe.discount > 0) {
      return {
        ...safe,
        ownershipError: {
          type: "caveat" as const,
          reason: "It is not possible to calculate ownership with a discount until a priced round is entered",
        },
      }
    }
    return safe
  })

  const commonCapTable: CommonCapTableRow[] = issuedShareholders.map((stockholder) => {
    return {
      name: stockholder.name,
      shares: stockholder.shares,
      ownershipPct: stockholder.shares / postShareCapitilization,
      type: CapTableRowType.Common,
      commonType: stockholder.commonType,
    }
  })

  // Retotal the shares to account for rounding
  const totalShares = preMoneyShares + safeCapTable.reduce((acc, safe) => acc + (safe.shares ?? 0), 0)

  return {
    common: commonCapTable,
    safes: safeCapTable,
    optionsPool: {
      name: "Options Pool",
      shares: unusedOptions,
      ownershipPct: unusedOptions / postShareCapitilization,
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

// Build a pre-round cap table once we have a pricedRound to convert at
export const buildPreRoundCapTable = (pricedConversion: BestFit, stakeHolders: StakeHolder[]): PreRoundCapTable => {
  validateStakeholders(stakeHolders, pricedConversion.roundingStrategy);
  const commonShareholders = stakeHolders.filter((stakeHolder) => stakeHolder.type === CapTableRowType.Common) as CommonStockholder[];
  const issuedShareholders = commonShareholders.filter((stockholder) => stockholder.commonType === CommonRowType.Shareholder);
  const unusedOptions = commonShareholders
    .filter((stockholder) => stockholder.commonType === CommonRowType.UnusedOptions)
    .reduce((total, stockholder) => total + stockholder.shares, 0);
  const safeNotes = stakeHolders.filter((stakeHolder) => stakeHolder.type === CapTableRowType.Safe) as SAFENote[];
  const totalShares = pricedConversion.totalShares - pricedConversion.seriesShares - pricedConversion.additionalOptions;

  const totalInvestment = [...safeNotes].reduce((acc, investor) => acc + investor.investment, 0);

  const commonCapTable: CommonCapTableRow[] = issuedShareholders.map((stockholder) => {
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
    // yc7p is contractually measured at this exact pre-Series stage. Shares
    // remain legally rounded and authoritative for the post-financing table.
    const ownershipPct = safe.conversionType === "yc7p" ? 0.07 : shares / totalShares;
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

  return {
    common: commonCapTable,
    safes: safeCapTable,
    optionsPool: {
      name: "Options Pool",
      shares: unusedOptions,
      ownershipPct: unusedOptions / totalShares,
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
