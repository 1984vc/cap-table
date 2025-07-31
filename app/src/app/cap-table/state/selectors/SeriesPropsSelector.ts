import { createSelector } from "reselect";
import { IConversionStateData } from "../ConversionState";
import { SeriesProps } from "@/components/safe-conversion/Conversion/SeriesInvestorList";
import { getPricedConversion } from "./PricedRoundSelector";
import { CapTableRowType } from "@library/cap-table/types";

export const getSeriesPropsSelector = createSelector(
  getPricedConversion,
  (state: IConversionStateData) => state.rowData,
  (pricedConversion, rowData): SeriesProps[] => {
    const rows = rowData.filter((row) => row.type === CapTableRowType.Series);
    if (!pricedConversion) throw new Error("Priced conversion not found");

    return rows.map((row) => {
      const shares = Math.floor(row.investment / pricedConversion.pps);
      const ownershipPct = shares / pricedConversion.totalShares * 100;
      return {
        id: row.id,
        type: CapTableRowType.Series,
        name: row.name,
        investment: row.investment,
        shares,
        ownershipPct,
        pps: pricedConversion.pps,
        allowDelete: rows.length > 1,
      };
    });
  },
);
