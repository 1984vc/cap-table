import { buildEstimatedPreRoundCapTable, buildPreRoundCapTable } from "./pre-round";
import { buildPricedRoundCapTable } from "./priced-round";
import { CommonStockholder, CommonCapTableRow, CapTableRowType } from "./types";
import { validateStakeholders } from "../validation";


// Very basic implementation of the ownership calculation before any rounds, including SAFEs
export const buildExistingShareholderCapTable = (commonStockholders: CommonStockholder[]): CommonCapTableRow[] => {
  validateStakeholders(commonStockholders);
  const totalCommonShares = commonStockholders.reduce((acc, stockholder) => acc + stockholder.shares, 0);
  return commonStockholders.map((stockholder) => {
    return {
      id: stockholder.id,
      name: stockholder.name,
      shares: stockholder.shares,
      ownershipPct: stockholder.shares / totalCommonShares,
      type: CapTableRowType.Common,
      commonType: stockholder.commonType,
    }
  })
}

export {
  buildPreRoundCapTable,
  buildEstimatedPreRoundCapTable,
  buildPricedRoundCapTable,
}
