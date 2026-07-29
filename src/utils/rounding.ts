export type RoundingStrategy = {
  roundDownShares?: boolean;
  roundShares?: boolean;
  // If no rounding, set to -1
  roundPPSPlaces: number;
};

// Legal spreadsheets tend to round down shares, allow for this to be configurable
export const roundShares = (num: number, strategy: RoundingStrategy): number => {
  if (strategy.roundDownShares) {
    return Math.floor(num);
  } else if (strategy.roundShares) {
    return Math.round(num);
  }
  return num
}

// Legal spreadsheets tend to round PPS up to 5 decimal places, allow for this to be configurable
export const roundPPSToPlaces = (num: number, places: number): number => {
  if (places < 0) {
    return num;
  }
  const factor = Math.pow(10, places);
  const scaled = num * factor;
  // Arithmetic that is exactly on a decimal boundary can land a few ulps above
  // the corresponding binary integer. Only normalize machine noise; a genuine
  // value above the boundary must still round upward.
  const nearest = Math.round(scaled);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
  return Math.ceil(Math.abs(scaled - nearest) <= tolerance ? nearest : scaled) / factor;
};

export const roundToPlaces = (num: number, places: number): number => {
  if (places < 0) {
    return num;
  }
  const factor = Math.pow(10, places);
  return Math.round(num * factor) / factor;
};
