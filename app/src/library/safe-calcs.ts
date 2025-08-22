import { CapTableOwnershipError, SAFENote } from "./cap-table/types";
import { RoundingStrategy, roundPPSToPlaces, roundShares } from "./utils/rounding";

const isMFN = (safe: SAFENote): boolean => {
  // TODO: Legacy of having the conversionType as 'mfn' or "ycmfm", but the eventual conversionType is 'post' and a side letter of 'mfn'
  // We will eventually need to 'migrate' the old states to this style
  if (safe.conversionType === "mfn" || safe.conversionType === "ycmfn" || safe.sideLetters?.includes("mfn")) {
    return true;
  }
  return false;
}

const getMFNCapAfter = (rows: SAFENote[], idx: number): number => {
  // For each safe after the idx, find the lowest number that's not 0
  // and return that number
  return (
    rows.slice(idx + 1).reduce((val, row) => {

      // Ignore anything that's in MFN
      if (isMFN(row)) {
        return val;
      }

      // Ignore Pre-money safes for now. The assumption is that the MFN is Post-money (YC's is)
      if (row.conversionType === "pre") {
        return val;
      }

      // if the value is 0, return the cap (this is the lowest possible value)
      if (val === 0) {
        return row.cap;
      }
      // If the value is greater than 0 and the cap is greater than 0 and less than the value
      // This is our new MFN
      if (val > 0 && row.cap > 0 && row.cap < val) {
        return row.cap;
      }
      // Just return the current value
      return val;
    }, 0) ?? 0
  );
};

// Do all the complex work here of handling row data and doing some complex calculations
// like MFN on safes and ownership percentages at various stages
export const getCapForSafe = (idx: number, safes: SAFENote[]): number => {
  const safe = safes[idx];
  if (isMFN(safe)) {
    return getMFNCapAfter(safes, idx);
  }
  return safe.cap;
};

// Ensure MFN Safes get the proper cap
export const populateSafeCaps = (safeNotes: SAFENote[]): SAFENote[] => {
  return safeNotes.map((safe, idx): SAFENote => {
    if (isMFN(safe)) {
      const cap = getCapForSafe(idx, safeNotes);
       return { ...safe, cap }
    }
    return {...safe}
  })
}


// Sum the shares of the safes after conversion
export const sumSafeConvertedShares = (
  safes: SAFENote[],
  pps: number,
  preMoneyShares: number,
  postMoneyShares: number,
  roundingStrategy: RoundingStrategy,
): number => {
  return sumArray(
    safes.map((safe) => {
      const discountPPS = roundPPSToPlaces(safeConvert(safe, preMoneyShares, postMoneyShares, pps), roundingStrategy.roundPPSPlaces);
      const postSafeShares = safe.investment / discountPPS;
      return roundShares(postSafeShares, roundingStrategy);
    }),
  );
};

// Returns the PPS of a conversion given the amount of shares and the price of the shares
export const safeConvert = (
  safe: SAFENote,
  preShares: number,
  postShares: number,
  pps: number,
): number => {
  if (safe.cap === 0) {
    return (1 - safe.discount) * pps;
  }
  const discountPPS = (1 - safe.discount) * pps;

  const shares = safe.conversionType === "pre" ? preShares : postShares;
  const capPPS = safe.cap / shares;
  return Math.min(discountPPS, capPPS);
};

// Quick utility to sum an array of numbers
const sumArray = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);

export const checkSafeNotesForErrors = (safeNotes: SAFENote[]): CapTableOwnershipError | undefined => {
  let ownershipError: CapTableOwnershipError | undefined = undefined
  safeNotes.forEach((safe) => {
    if (safe.investment >= safe.cap && safe.cap !== 0) {
      ownershipError = {
        type: 'error',
        reason: "Investment is greater than Cap"
      }

    }
  })
  return ownershipError
}