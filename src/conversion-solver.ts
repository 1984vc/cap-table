import { SAFENote } from "./cap-table/types";
import { EffectiveSAFE, resolveMFNElections, safeConvert } from "./safe-calcs";
import { CalculationError, validateConversionInput } from "./validation";
import { RoundingStrategy, roundPPSToPlaces, roundShares } from "./utils/rounding";

export type SafeConversionOutcome = {
  safeIndex: number;
  pps: number;
  shares: number;
  controllingTerm: "round" | "discount" | "pre-money-cap" | "post-money-cap" | "fixed-percentage";
  contractualTerms: Pick<SAFENote, "cap" | "discount" | "conversionType">;
  effectiveTerms: Pick<SAFENote, "cap" | "discount" | "conversionType">;
  electionSourceIndex?: number;
  electionSourceName?: string;
};

export type BestFit = {
  pps: number;
  ppss: number[];
  safeConversions: SafeConversionOutcome[];
  seriesInvestorShares: number[];
  seriesInvestorInvestments: number[];
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

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

type Attempt = {
  inputTotal: number;
  totalShares: number;
  pps: number;
  safes: EffectiveSAFE[];
  safeConversions: SafeConversionOutcome[];
  seriesInvestorShares: number[];
  preMoneyShares: number;
  postMoneyShares: number;
  additionalOptions: number;
  totalOptions: number;
};

const controllingTerm = (
  safe: SAFENote,
  preShares: number,
  postShares: number,
  roundPPS: number,
): SafeConversionOutcome["controllingTerm"] => {
  if (safe.conversionType === "yc7p") return "fixed-percentage";
  const discountPrice = (1 - safe.discount) * roundPPS;
  if (safe.cap === 0) return safe.discount > 0 ? "discount" : "round";
  const capPrice = safe.cap / (safe.conversionType === "pre" ? preShares : postShares);
  if (capPrice <= discountPrice) return safe.conversionType === "pre" ? "pre-money-cap" : "post-money-cap";
  return safe.discount > 0 ? "discount" : "round";
};

const calculateAttempt = (
  inputTotal: number,
  preMoneyValuation: number,
  commonShares: number,
  safes: SAFENote[],
  unusedOptions: number,
  targetOptionsPct: number,
  seriesInvestments: number[],
  strategy: RoundingStrategy,
): Attempt => {
  const totalOptions = Math.max(unusedOptions, roundShares(inputTotal * targetOptionsPct, strategy));
  const additionalOptions = totalOptions - unusedOptions;
  const totalSeriesInvestment = sum(seriesInvestments);
  const pps = roundPPSToPlaces(
    (preMoneyValuation + totalSeriesInvestment) / inputTotal,
    strategy.roundPPSPlaces,
  );
  const seriesInvestorShares = seriesInvestments.map((investment) => roundShares(investment / pps, strategy));
  const seriesShares = sum(seriesInvestorShares);
  const preMoneyShares = commonShares + totalOptions;
  const postMoneyShares = inputTotal - seriesShares - additionalOptions;
  const effectiveSafes = resolveMFNElections(safes, preMoneyShares, postMoneyShares, pps);

  const ordinary: SafeConversionOutcome[] = [];
  const fixedIndexes: number[] = [];
  effectiveSafes.forEach((safe, safeIndex) => {
    if (safe.conversionType === "yc7p") {
      fixedIndexes.push(safeIndex);
      return;
    }
    const conversionPPS = roundPPSToPlaces(
      safeConvert(safe, preMoneyShares, postMoneyShares, pps),
      strategy.roundPPSPlaces,
    );
    ordinary.push({
      safeIndex,
      pps: conversionPPS,
      shares: roundShares(safe.investment / conversionPPS, strategy),
      controllingTerm: controllingTerm(safe, preMoneyShares, postMoneyShares, pps),
      contractualTerms: safe.contractualTerms ?? {
        cap: safe.cap, discount: safe.discount, conversionType: safe.conversionType,
      },
      effectiveTerms: { cap: safe.cap, discount: safe.discount, conversionType: safe.conversionType },
      electionSourceIndex: safe.electionSourceIndex,
      electionSourceName: safe.electionSourceName,
    });
  });

  const fixedPct = fixedIndexes.length * 0.07;
  const fixedBase = commonShares + unusedOptions + sum(ordinary.map((outcome) => outcome.shares));
  const preSeriesWithFixed = fixedBase / (1 - fixedPct);
  const fixed = fixedIndexes.map((safeIndex): SafeConversionOutcome => {
    const safe = effectiveSafes[safeIndex];
    const shares = roundShares(0.07 * preSeriesWithFixed, strategy);
    return {
      safeIndex,
      pps: safe.investment / shares,
      shares,
      controllingTerm: "fixed-percentage",
      contractualTerms: safe.contractualTerms ?? {
        cap: safe.cap, discount: safe.discount, conversionType: safe.conversionType,
      },
      effectiveTerms: { cap: safe.cap, discount: safe.discount, conversionType: safe.conversionType },
      electionSourceIndex: safe.electionSourceIndex,
      electionSourceName: safe.electionSourceName,
    };
  });
  const safeConversions = [...ordinary, ...fixed].sort((a, b) => a.safeIndex - b.safeIndex);
  const totalShares = commonShares + totalOptions + sum(safeConversions.map((outcome) => outcome.shares)) + seriesShares;
  return {
    inputTotal,
    totalShares,
    pps,
    safes: effectiveSafes,
    safeConversions,
    seriesInvestorShares,
    preMoneyShares,
    postMoneyShares: totalShares - seriesShares - additionalOptions,
    additionalOptions,
    totalOptions,
  };
};

export const fitConversion = (
  preMoneyValuation: number,
  commonShares: number,
  safes: SAFENote[],
  unusedOptions: number,
  targetOptionsPct: number,
  seriesInvestments: number[],
  roundingStrategy: RoundingStrategy = DEFAULT_ROUNDING_STRATEGY,
): BestFit => {
  validateConversionInput(
    preMoneyValuation, commonShares, safes, unusedOptions,
    targetOptionsPct, seriesInvestments, roundingStrategy,
  );

  const totalSeriesInvestment = sum(seriesInvestments);
  const financingFraction = totalSeriesInvestment / (preMoneyValuation + totalSeriesInvestment);
  let candidate = Math.max(
    commonShares + unusedOptions,
    roundShares((commonShares + unusedOptions) / (1 - targetOptionsPct - financingFraction), roundingStrategy),
  );
  const seen = new Set<number>();
  let attempt: Attempt | undefined;

  while (!seen.has(candidate) && seen.size < 10_000) {
    seen.add(candidate);
    attempt = calculateAttempt(
      candidate, preMoneyValuation, commonShares, safes, unusedOptions,
      targetOptionsPct, seriesInvestments, roundingStrategy,
    );
    if (attempt.totalShares === candidate) break;
    candidate = attempt.totalShares;
  }

  if (!attempt || attempt.totalShares !== attempt.inputTotal) {
    // Directed price/share rounding can create a short cycle. Search the
    // bounded neighborhood induced by the cycle before declaring no solution.
    const center = attempt?.totalShares ?? candidate;
    const radius = Math.max(64, seen.size + safes.length + seriesInvestments.length);
    for (let offset = 0; offset <= radius; offset++) {
      for (const value of offset === 0 ? [center] : [center - offset, center + offset]) {
        if (value <= 0) continue;
        const nearby = calculateAttempt(
          value, preMoneyValuation, commonShares, safes, unusedOptions,
          targetOptionsPct, seriesInvestments, roundingStrategy,
        );
        if (nearby.totalShares === value) {
          attempt = nearby;
          break;
        }
      }
      if (attempt && attempt.totalShares === attempt.inputTotal) break;
    }
  }

  if (!attempt || attempt.totalShares !== attempt.inputTotal) {
    throw new CalculationError(
      "UNRECONCILED_ROUNDING",
      "no exact share identity exists under the requested PPS and share-rounding settings",
      { visitedStates: seen.size, lastTotalShares: attempt?.totalShares },
    );
  }

  const convertedSafeShares = sum(attempt.safeConversions.map((outcome) => outcome.shares));
  const seriesShares = sum(attempt.seriesInvestorShares);
  return {
    pps: attempt.pps,
    ppss: attempt.safeConversions.map((outcome) => outcome.pps),
    safeConversions: attempt.safeConversions,
    seriesInvestorShares: attempt.seriesInvestorShares,
    seriesInvestorInvestments: [...seriesInvestments],
    totalShares: attempt.totalShares,
    newSharesIssued: attempt.totalShares - commonShares - unusedOptions,
    preMoneyShares: attempt.preMoneyShares,
    postMoneyShares: attempt.postMoneyShares,
    convertedSafeShares,
    seriesShares,
    additionalOptions: attempt.additionalOptions,
    totalOptions: attempt.totalOptions,
    totalInvested: totalSeriesInvestment + sum(safes.map((safe) => safe.investment)),
    totalSeriesInvestment,
    roundingStrategy,
  };
};
