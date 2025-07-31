import { createSelector } from "reselect";
import { ExistingShareholderState, IConversionStateData, SAFEState } from "../ConversionState";
import { buildEstimatedPreRoundCapTable, buildPreRoundCapTable } from "@library/cap-table";
import { CapTableProps } from "@/components/safe-conversion/Conversion/CapTableResults";
import { getPricedConversion } from "./PricedRoundSelector";
import { CommonStockholder, CapTableRowType, CommonRowType, SAFENote } from "@library/cap-table/types";

// The initial shares of the existing shareholders
export const getPreRoundCapTable = createSelector(
  getPricedConversion,
  (state: IConversionStateData) => state.rowData,
  (state: IConversionStateData) => state.unusedOptions,
  (
    pricedConversion,
    rowData,
    unusedOptions
  ): CapTableProps => {
    const commonStock: CommonStockholder[] = (rowData.filter((row) => row.type === CapTableRowType.Common) as ExistingShareholderState[]).map(
      (row) => {
        return {
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
      commonType: CommonRowType.UnusedOptions
    })

    const safeNotes: SAFENote[] = (rowData.filter((row) => row.type === CapTableRowType.Safe) as SAFEState[]).map(
      (row) => {
        const conversionType = row.conversionType === "mfn" ? "post" : row.conversionType === 'post' ? "post" : "pre";
        return {
          name: row.name ?? "",
          investment: row.investment,
          cap: row.cap ?? 0,
          discount: row.discount ?? 0,
          conversionType,
          sideLetters: row.conversionType === "mfn" ? ["mfn"] : [],
          type: CapTableRowType.Safe,
        }
      }
    );
    const {common, safes, total} = pricedConversion ?
      buildPreRoundCapTable(pricedConversion, [...commonStock, ...safeNotes]) :
      buildEstimatedPreRoundCapTable([...commonStock, ...safeNotes]);
    return {
      totalRow: total,
      changes: [],
      rows: [...common, ...safes].map((row) => {
        if (row.type === CapTableRowType.Common) {
          return {
            id: row.id ?? "",
            name: row.name ?? "",
            shares: row.shares,
            type: row.type,
            ownershipPct: (row.ownershipPct ?? 0) * 100,
            ownershipError: row.ownershipError,
            commonType: row.commonType,
          }
        } 
        return {
          id: row.id ?? "",
          name: row.name ?? "",
          shares: row.shares,
          investment: row.investment,
          pps: row.pps ?? 0,
          discount: row.discount,
          cap: row.cap,
          type: row.type,
          ownershipPct: (row.ownershipPct ?? 0) * 100,
          ownershipError: row.ownershipError,
        }
      })
    }
  },
);