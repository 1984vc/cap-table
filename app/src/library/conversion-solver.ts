import { SAFENote } from "./cap-table/types";
import { sumSafeConvertedShares, safeConvert } from "./safe-calcs";
import { RoundingStrategy, roundPPSToPlaces, roundShares } from "./utils/rounding";

export type BestFit = {
  pps: number;
  ppss: number[];
  convertedSafeShares: number;
  seriesShares: number;
  preMoneyShares: number;
  postMoneyShares: number;
  newSharesIssued: number;
  totalShares: number;
  additionalOptions: number;
  totalOptions: number;
  totalInvested: number;
  totalSeriesInvestment: number;
  roundingStrategy: RoundingStrategy;
};

export const DEFAULT_ROUNDING_STRATEGY: RoundingStrategy = {
  roundDownShares: true,
  roundPPSPlaces: 5,
};

// Quick utility to sum an array of numbers
const sumArray = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);
type PreAndPostMoneyCalculation = {
  preMoneyShares: number;
  postMoneyShares: number;
  pps: number;
  optionsPool: number;
  increaseInOptionsPool: number;
  totalShares: number;
  seriesShares: number;
}

// Here's what we know:
// 1. The amount of pre-money shares are equal to the sum of the common shares and the increase in options pool
// 2. The amount of post-money shares are equal to the total shares minus the series shares and the increase in options pool
// This function calculates the pre-money and post-money shares using the minimum amount of information needed
const calculatePreAndPostMoneyShares = (
  preMoneyValuation: number,
  commonShares: number,
  unusedOptions: number,
  targetOptionsPct: number,
  seriesInvestments: number[],
  totalShares: number, // This is only number that changes
  roundingStrategy: RoundingStrategy = DEFAULT_ROUNDING_STRATEGY,
): PreAndPostMoneyCalculation => {

  let optionsPool =
    roundShares(totalShares * targetOptionsPct, roundingStrategy);

  // Don't let the options pool be less than the unused options. Assume the unused options are the minimum
  if (optionsPool < unusedOptions) {
    optionsPool = unusedOptions;
  }


  const increaseInOptionsPool = optionsPool - unusedOptions;

  const seriesInvestment = sumArray(seriesInvestments.map((seriesInvestment) => {
    return seriesInvestment
  }))

  const pps = roundPPSToPlaces((preMoneyValuation + seriesInvestment) / totalShares, roundingStrategy.roundPPSPlaces);

  const seriesShares = sumArray(
    seriesInvestments.map((seriesInvestment) =>
      roundShares(seriesInvestment / pps, roundingStrategy),
    ),
  );

  const preMoneyShares = commonShares + unusedOptions + increaseInOptionsPool;
  const postMoneyShares = totalShares - seriesShares - increaseInOptionsPool;

  return {
    preMoneyShares,
    postMoneyShares,
    pps,
    optionsPool,
    increaseInOptionsPool,
    totalShares: postMoneyShares + increaseInOptionsPool + seriesShares, // We need to take into account the rounding of the Series shares
    seriesShares, // Helpful for debugging
  }

}

// Allows us to "test" a fit of the total shares to see if it's stable
const attemptFit = (
  preMoneyValuation: number,
  commonShares: number,
  unusedOptions: number,
  targetOptionsPct: number,
  safes: SAFENote[],
  seriesInvestments: number[],
  totalShares: number, // This is only number that changes
  roundingStrategy: RoundingStrategy = DEFAULT_ROUNDING_STRATEGY,
): number => {
  // Calculate the pre and post money shares using the total shares as the only variable
  const results = calculatePreAndPostMoneyShares(preMoneyValuation, commonShares, unusedOptions, targetOptionsPct, seriesInvestments, totalShares, roundingStrategy)

  // Use the pre and post money shares to calculate the new SAFE shares conversions
  const safeShares = sumSafeConvertedShares(
    safes,
    results.pps,
    results.preMoneyShares,
    results.postMoneyShares,
    roundingStrategy,
  )

  // This changes the total shares based on how the SAFEs converted

  // Determine the new total shares, this could be different than the original total shares
  const newTotalShares = results.seriesShares + commonShares + results.optionsPool + safeShares;
  return newTotalShares
};

// Takes in mininum information and returns the best fit for a conversion of SAFEs and the new target option pool
export const fitConversion = (
  // The premoney valuation of the round
  preMoneyValuation: number,
  // Existing shareholders (doesn't include unused options)
  commonShares: number,
  // The SAFE's we wish to convert
  safes: SAFENote[],
  // Our unused options - This plus existing is the total shares we currently have
  unusedOptions: number,
  // Our new target option pool size
  targetOptionsPct: number,
  // The series investors on the priced round
  // We split this out because we need to know how much each invested since we'll be rounding shares
  // per investor. This is the only way to get a truly accurate representation of the total shares
  seriesInvestments: number[],
  roundingStrategy: RoundingStrategy = DEFAULT_ROUNDING_STRATEGY,
): BestFit => {
  // Use this figure as a starting point
  let totalShares = commonShares + unusedOptions;
  let lastTotalShares = totalShares;

  // Walk the total shares up until we find a stable value where
  // the total shares converges
  for (let i = 0; i < 100; i++) {
    totalShares = attemptFit(
      preMoneyValuation,
      commonShares,
      unusedOptions,
      targetOptionsPct,
      safes,
      seriesInvestments,
      totalShares,
      roundingStrategy
    );

    if (totalShares === lastTotalShares) {
      break
    }
    lastTotalShares = totalShares;
  }

  // Grab the final results
  const {
    pps,
    preMoneyShares,
    postMoneyShares,
    increaseInOptionsPool,
    seriesShares,
  } = calculatePreAndPostMoneyShares(preMoneyValuation, commonShares, unusedOptions, targetOptionsPct, seriesInvestments, totalShares, roundingStrategy)

  const convertedSafeShares = sumSafeConvertedShares(
    safes,
    pps,
    preMoneyShares,
    postMoneyShares,
    roundingStrategy,
  );

  // Get a list of the PPS's for each SAFE
  const ppss: number[] = Array(safes.length).fill(pps);
  for (const [idx, safe] of Array.from(safes.entries())) {
    ppss[idx] = roundPPSToPlaces(safeConvert(safe, preMoneyShares, postMoneyShares, pps), roundingStrategy.roundPPSPlaces);
  }

  const totalInvested = sumArray(seriesInvestments) + safes.reduce((acc, safe) => acc + safe.investment, 0);

  return {
    pps,
    ppss,
    totalShares,
    newSharesIssued: totalShares - commonShares - unusedOptions,
    preMoneyShares,
    postMoneyShares,
    convertedSafeShares,
    seriesShares,
    additionalOptions: increaseInOptionsPool,
    totalOptions: increaseInOptionsPool + unusedOptions,
    totalInvested,
    totalSeriesInvestment: sumArray(seriesInvestments),
    roundingStrategy,
  };
};
