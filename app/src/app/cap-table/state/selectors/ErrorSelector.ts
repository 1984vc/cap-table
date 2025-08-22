import { createSelector } from "reselect";
import { getSAFERowPropsSelector } from "./SAFEPropsSelector";
type ErrorSelectorState = {
  commonStockError: boolean;
  safeError: boolean;
  seriesError: boolean;
};

// Determine if we have an error that keeps us from calculating the cap table
export const getErrorSelector = createSelector(
  getSAFERowPropsSelector,
  (safeInvestors): ErrorSelectorState => {
    const hasSafeError = safeInvestors.some((row) => row.ownershipError?.type === "error");

    // For future use
    return {
      commonStockError: false,
      safeError: hasSafeError,
      seriesError: false,
    }

  },
);
