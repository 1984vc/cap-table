import { createSelector } from "reselect";
import { IConversionStateData } from "../ConversionState";

export const getSerializedSelector = createSelector(
  (state: IConversionStateData) => state,
  (state): IConversionStateData => {
    const { name, preMoney, targetOptionsPool, unusedOptions, rowData, pricedRounds } = state;
    return {
      name,
      preMoney,
      targetOptionsPool,
      unusedOptions,
      rowData,
      pricedRounds
    }

  },
);
