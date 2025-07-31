import { createSelector } from "reselect";
import {
  IConversionStateData,
  SAFEState,
} from "../ConversionState";
import { SAFEProps } from "@/components/safe-conversion/Conversion/SafeNoteList";
import { getPreRoundCapTable } from "./PreRoundCapTableSelector";
import { CapTableRowType } from "@library/cap-table/types";

const determineRowDisabledFields = (row: SAFEState) => {
  if (row.conversionType === "mfn") return ["cap"]
  if (row.conversionType === "ycmfn") return ["cap"]
  return []
}


export const getSAFERowPropsSelector = createSelector(
  getPreRoundCapTable,
  (state: IConversionStateData) => state.rowData,
  (preRoundCapTable, rowData): SAFEProps[] => {
    const rows = rowData.filter((row) => row.type === CapTableRowType.Safe) as SAFEState[];
    const safeCapTable = preRoundCapTable.rows.filter((row) => row.type === CapTableRowType.Safe);

    return rows.map((row, idx) => {
      return {
        id: row.id,
        type: CapTableRowType.Safe,
        name: row.name,
        investment: row.investment,
        cap: safeCapTable[idx].cap ?? row.cap,
        discount: row.discount,
        shares: 0,
        ownershipPct: safeCapTable[idx].ownershipPct,
        ownershipError: safeCapTable[idx].ownershipError,
        allowDelete: true,
        disabledFields: determineRowDisabledFields(row),
        conversionType: row.conversionType,
      };
    });
  },
);
