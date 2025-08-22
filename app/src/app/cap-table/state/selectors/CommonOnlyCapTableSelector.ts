import { createSelector } from "reselect";
import { ExistingShareholderState, IConversionStateData } from "../ConversionState";
import { ExistingShareholderProps } from "@/components/safe-conversion/Conversion/ExistingShareholders"
import { buildExistingShareholderCapTable } from "@library/cap-table";
import { CapTableRowType, CommonStockholder, CommonRowType } from "@library/cap-table/types";

// The initial shares of the existing shareholders
export const getCommonOnlyCapTable = createSelector(
  (state: IConversionStateData) => state.rowData,
  (state: IConversionStateData) => state.unusedOptions,
  (
    rowData,
    unusedOptions
  ): ExistingShareholderProps[] => {
    const commonRows = rowData.filter((row) => row.type === CapTableRowType.Common) as ExistingShareholderState[]
    const commonStock: CommonStockholder[] = (commonRows).map(
      (row) => {
        return {
          id: row.id,
          name: row.name ?? "",
          shares: row.shares,
          type: CapTableRowType.Common,
          commonType: CommonRowType.Shareholder
        }
      }
    );
    commonStock.push({
      name: "Unused Options Pool",
      shares: unusedOptions,
      type: CapTableRowType.Common,
      commonType: CommonRowType.UnusedOptions,
    })
    const results = buildExistingShareholderCapTable(commonStock);
    return results.map((row) => {
      let id: string | undefined = row.id
      if (row.commonType === "unusedOptions") {
        id = "UnusedOptionsPool";
      }
      return {
        id: id ?? "",
        name: row.name ?? "",
        shares: row.shares,
        ownershipPct: row.ownershipPct,
        type: row.type,
        commonType: row.commonType,
      }
    })
  },
);
