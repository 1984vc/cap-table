import { createSelector } from "reselect";
import { IConversionStateData } from "../ConversionState";

export const getSerializedSelector = createSelector(
  (state: IConversionStateData) => state,
  (state): IConversionStateData => {
    const { preMoney, targetOptionsPool, unusedOptions, rowData, pricedRounds } = state;
    return {
      preMoney,
      targetOptionsPool,
      unusedOptions,
      rowData,
      pricedRounds
    }

  },
);
