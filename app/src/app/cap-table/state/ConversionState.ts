import { randomFounders, randomSeed, randomSeries } from "./initialState";
import { create } from "zustand";
import { CurrencyInputOnChangeValues } from "react-currency-input-field";
import { SeriesProps } from "@/components/safe-conversion/Conversion/SeriesInvestorList";
import { SAFEProps } from "@/components/safe-conversion/Conversion/SafeNoteList";
import { ExistingShareholderProps } from "@/components/safe-conversion/Conversion/ExistingShareholders";
import { CapTableRowType, CommonRowType } from "@library/cap-table/types";

// Only the state that we need to serialize
export type ExistingShareholderState = Pick<
  ExistingShareholderProps,
  "id" | "type" | "name" | "shares"
>;

export type SAFEState = Pick<
  SAFEProps,
  "id" | "type" | "name" | "investment" | "cap" | "discount" | "conversionType" 
>;
export type SeriesState = Pick<
  SeriesProps,
  "id" | "type" | "name" | "investment"
>;

export type IRowState = SAFEState | ExistingShareholderState | SeriesState;

// The only thing we need to serialize
export interface IConversionStateData {
  name?: string;
  targetOptionsPool: number;
  rowData: IRowState[];
  unusedOptions: number;
  preMoney: number;
  pricedRounds?: number;
  objectId?: string;
  editKey?: string;
}

export type ConversionStore = ReturnType<typeof createConversionStore>;

export interface IConversionState extends IConversionStateData {
  onAddRow: (type: CapTableRowType.Common | CapTableRowType.Safe | CapTableRowType.Series) => void;
  onDeleteRow: (id: string) => void;
  onUpdateRow: (data: IRowState) => void;
  onUpdateName: (name: string) => void;
  onValueChange: (
    type: "number" | "percent",
  ) => (
    val: string | undefined,
    name: string | undefined,
    values?: CurrencyInputOnChangeValues,
  ) => void;
  onMoveRow: (rowId: string, afterId: string) => void;
  togglepriceRounds: () => void;
}

function getNextIdx(rowData: IRowState[]) {
  // get the highest id from rowData[] and return an increment
  return (
    rowData.map((row) => row.id.match(/^[0-9]+$/) ? parseInt(row.id) : 0).reduce((a, b) => Math.max(a, b), 0) +
    1
  ).toString();
}

function getRandomSeed(rowData: IRowState[]) {
  const existingNames = rowData
    .filter((r) => r.type === CapTableRowType.Safe)
    .map((r) => r.name);
  const availableNames = randomSeed().filter((r) => !existingNames.includes(r));
  if (availableNames.length > 0) {
    return availableNames[Math.floor(Math.random() * availableNames.length)];
  } else {
    return "Another Seed Investor";
  }
}

function getRandomInvestor(rowData: IRowState[]) {
  const existingNames = rowData
    .filter((r) => r.type === CapTableRowType.Series)
    .map((r) => r.name);
  const availableNames = randomSeries().filter((r) => !existingNames.includes(r));
  if (availableNames.length > 0) {
    return availableNames[Math.floor(Math.random() * availableNames.length)];
  } else {
    return "Another Series Investor";
  }
}

function getRandomFounder(rowData: IRowState[]) {
  const existingNames = rowData
    .filter((r) => r.type === CapTableRowType.Common)
    .map((r) => r.name);
  const availableNames = randomFounders().filter(
    (r) => !existingNames.includes(r),
  );
  if (availableNames.length > 0) {
    return availableNames[Math.floor(Math.random() * availableNames.length)];
  } else {
    return "Another Founder";
  }
}



export const createConversionStore = (initialState: IConversionStateData) =>
  create<IConversionState>((set, get) => ({
    ...initialState,

    onAddRow: (type: CapTableRowType.Common | CapTableRowType.Safe | CapTableRowType.Series) => {
      const idx = getNextIdx(get().rowData);
      if (type === CapTableRowType.Safe) {
        set((state) => ({
          ...state,
          rowData: [
            ...state.rowData,
            {
              id: idx,
              name: getRandomSeed(state.rowData),
              investment: 0,
              cap: 0,
              discount: 0,
              conversionType: "post",
              type: CapTableRowType.Safe,
            },
          ],
        }));
      } else if (type === CapTableRowType.Common) {
        set((state) => ({
          ...state,
          rowData: [
            ...state.rowData,
            {
              id: idx,
              name: getRandomFounder(state.rowData),
              shares: 0,
              type: CapTableRowType.Common,
              commonType: CommonRowType.Shareholder,
            },
          ],
        }));
      } else if (type === CapTableRowType.Series) {
        set((state) => ({
          ...state,
          rowData: [
            ...state.rowData,
            {
              id: idx,
              type: CapTableRowType.Series,
              name: getRandomInvestor(state.rowData),
              investment: 0,
            },
          ],
        }));
      }
    },

    onDeleteRow: (id: string): void => {
      set((state) => ({
        ...state,
        rowData: state.rowData.filter((row) => row.id !== id),
      }));
    },

    onUpdateRow: (data: IRowState) => {
      set((state) => ({
        ...state,
        rowData: state.rowData.map((row) => (row.id === data.id ? data : row)),
      }));
    },

    onUpdateName: (name: string) => {
      set((state) => ({
        ...state,
        name: name.trim() || undefined,
      }));
    },

    onMoveRow: (rowId: string, afterId: string) => {
      const updatedRows = [...get().rowData];
      const rowIndex = updatedRows.findIndex((row) => row.id === rowId);
      const afterIndex = updatedRows.findIndex((row) => row.id === afterId);
      if (rowIndex !== -1 && afterIndex !== -1) {
        const [movedRow] = updatedRows.splice(rowIndex, 1);
        const insertIndex = afterIndex + (rowIndex < afterIndex ? 0 : 1);
        updatedRows.splice(insertIndex, 0, movedRow);
        set((state) => ({
          ...state,
          rowData: updatedRows,
        }));
      }
    },

    onValueChange:
      (type: "number" | "percent") =>
        (
          value: string | undefined,
          name: string | undefined,
          values?: CurrencyInputOnChangeValues,
        ) => {
          if (type === "number") {
            if (name) {
              const val = values?.float ?? 0;
              if (val < 0) {
                return;
              }
              // Get the value and replace anything that's not a number or period or negative sign, strip errant dashes
              const newValue = value?.replace(/[^-0-9.]/g, "").replace(/(?!^)-/g, "")
              const newValueNumber = parseFloat(newValue ?? "0");
              set((state) => ({
                ...state,
                [name]: newValueNumber,
              }));
            }
          } else if (type === "percent") {
            if (name) {
              const val = values?.float ?? 0;
              if (val > 99 || val < 0) {
                return;
              }
              const newValue = value?.replace(/[^0-9.]/g, "");
              const newValueNumber = parseFloat(newValue ?? "0");
              set((state) => ({
                ...state,
                [name]: newValueNumber,
              }));
            }
          }
        },
        togglepriceRounds: () => {
          set((state) => {
            return {
              ...state,
              pricedRounds: state.pricedRounds === 0 ? 1 : 0,
            }
          });

        },
  }));
