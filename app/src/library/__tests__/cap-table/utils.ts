import { expect } from "@jest/globals";
import { CapTableRow, TotalCapTableRow, CapTableRowType, SafeCapTableRow, SeriesCapTableRow } from "@library/cap-table/types";
import { roundToPlaces } from "@library/utils/rounding";

export const crossCheckCapTableResults = (rows: CapTableRow[], total: TotalCapTableRow) => {
  const investors = rows.filter(row => (row.type === CapTableRowType.Safe || row.type === CapTableRowType.Series)) as (SafeCapTableRow | SeriesCapTableRow)[];
  const investedTotal = investors.reduce((acc, row) => acc + (row.investment ?? 0), 0);
  expect(investedTotal).toEqual(total.investment);

  // Handle PPS rounding issues
  const pctTotal = roundToPlaces(rows.reduce((acc, row) => acc + (row.ownershipPct ?? 0), 0), 5)
  expect(pctTotal).toEqual(1);
  expect(total.ownershipPct).toEqual(1);

  const totalShares = rows.reduce((acc, row) => acc + (row.shares ?? 0), 0);
  expect(totalShares).toEqual(total.shares);
}