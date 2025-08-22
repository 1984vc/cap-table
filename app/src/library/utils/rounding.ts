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
  return Math.ceil(num * factor) / factor;
};

export const roundToPlaces = (num: number, places: number): number => {
  if (places < 0) {
    return num;
  }
  const factor = Math.pow(10, places);
  return Math.round(num * factor) / factor;
};

