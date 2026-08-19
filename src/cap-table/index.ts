import { buildEstimatedPreRoundCapTable, buildPreRoundCapTable } from "./pre-round";
import { buildPricedRoundCapTable } from "./priced-round";
import { DEFAULT_ROUNDING_STRATEGY } from "../conversion-solver";
import { CommonStockholder, CommonCapTableRow, CapTableRowType, CommonRowType, ExistingCapTable } from "./types";
import { CalculationError, validateStakeholders } from "../validation";
import type { RoundingStrategy } from "../utils/rounding";


// Very basic implementation of the ownership calculation before any rounds, including SAFEs
export const buildExistingShareholderCapTable = (
  commonStockholders: CommonStockholder[],
  roundingStrategy: RoundingStrategy = DEFAULT_ROUNDING_STRATEGY,
): ExistingCapTable => {
  validateStakeholders(commonStockholders, roundingStrategy);
  const totalCommonShares = commonStockholders.reduce((acc, stockholder) => acc + stockholder.shares, 0);
  if (totalCommonShares <= 0) {
    throw new CalculationError("INVALID_INPUT", "at least one existing share is required");
  }
  const poolShares = commonStockholders
    .filter((stockholder) => stockholder.commonType === CommonRowType.UnusedOptions)
    .reduce((total, stockholder) => total + stockholder.shares, 0);
  const common: CommonCapTableRow[] = commonStockholders
    .filter((stockholder) => stockholder.commonType === CommonRowType.Shareholder)
    .map((stockholder) => {
    return {
      id: stockholder.id,
      name: stockholder.name,
      shares: stockholder.shares,
      ownershipPct: stockholder.shares / totalCommonShares,
      type: CapTableRowType.Common,
      commonType: stockholder.commonType,
    }
  });
  return {
    common,
    optionsPool: {
      name: "Options Pool",
      shares: poolShares,
      ownershipPct: poolShares / totalCommonShares,
      type: CapTableRowType.OptionsPool,
    },
    total: {
      name: "Total",
      shares: totalCommonShares,
      investment: 0,
      ownershipPct: 1,
      type: CapTableRowType.Total,
    },
  };
}

export {
  buildPreRoundCapTable,
  buildEstimatedPreRoundCapTable,
  buildPricedRoundCapTable,
}
