import type { SAFENote, StakeHolder } from "./cap-table/types";
import type { RoundingStrategy } from "./utils/rounding";

export type CalculationErrorCode =
  | "INVALID_INPUT"
  | "UNSUPPORTED_TERMS"
  | "CONFLICTING_TRANSACTION_DATA"
  | "UNRECONCILED_ROUNDING";

export class CalculationError extends Error {
  readonly code: CalculationErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: CalculationErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "CalculationError";
    this.code = code;
    this.details = details;
  }
}

const finite = (value: number, label: string): void => {
  if (!Number.isFinite(value)) {
    throw new CalculationError("INVALID_INPUT", `${label} must be finite`);
  }
};

const shareRoundingEnabled = (strategy?: RoundingStrategy): boolean =>
  strategy === undefined || strategy.roundDownShares === true || strategy.roundShares === true;

const validateShares = (value: number, label: string, strategy?: RoundingStrategy): void => {
  finite(value, label);
  if (shareRoundingEnabled(strategy) && !Number.isInteger(value)) {
    throw new CalculationError("INVALID_INPUT", `${label} must be an integer when share rounding is enabled`);
  }
};

export const validateRoundingStrategy = (strategy: RoundingStrategy): void => {
  finite(strategy.roundPPSPlaces, "roundPPSPlaces");
  if (!Number.isInteger(strategy.roundPPSPlaces) || strategy.roundPPSPlaces < -1 || strategy.roundPPSPlaces > 15) {
    throw new CalculationError("INVALID_INPUT", "roundPPSPlaces must be an integer from -1 through 15");
  }
  if (strategy.roundDownShares && strategy.roundShares) {
    throw new CalculationError("INVALID_INPUT", "roundDownShares and roundShares are mutually exclusive");
  }
};

export const validateSafes = (safes: SAFENote[]): void => {
  let fixedOwnership = 0;
  let postMoneyOwnership = 0;
  safes.forEach((safe, index) => {
    const prefix = `safes[${index}]`;
    finite(safe.investment, `${prefix}.investment`);
    finite(safe.cap, `${prefix}.cap`);
    finite(safe.discount, `${prefix}.discount`);
    if (safe.investment <= 0) throw new CalculationError("INVALID_INPUT", `${prefix}.investment must be positive`);
    if (safe.cap < 0) throw new CalculationError("INVALID_INPUT", `${prefix}.cap must be nonnegative`);
    if (safe.cap > 0 && safe.investment >= safe.cap) {
      throw new CalculationError("INVALID_INPUT", `${prefix}.investment must be less than ${prefix}.cap`);
    }
    if (safe.discount < 0 || safe.discount >= 1) {
      throw new CalculationError("INVALID_INPUT", `${prefix}.discount must be in [0, 1)`);
    }
    if (safe.sideLetters?.includes("pro-rata")) {
      throw new CalculationError(
        "UNSUPPORTED_TERMS",
        `${prefix} has a pro-rata side letter, but participation amounts are not represented by this input model`,
      );
    }
    if (safe.conversionType === "yc7p") fixedOwnership += 0.07;
    else if (safe.conversionType !== "pre" && safe.cap > 0) postMoneyOwnership += safe.investment / safe.cap;
  });
  if (fixedOwnership >= 1) {
    throw new CalculationError("INVALID_INPUT", "aggregate fixed-percentage SAFE ownership must be below 100%");
  }
  if (postMoneyOwnership + fixedOwnership >= 1) {
    throw new CalculationError("INVALID_INPUT", "aggregate post-money and fixed-percentage SAFE ownership must be below 100%");
  }
};

export const validateStakeholders = (stakeholders: StakeHolder[], strategy?: RoundingStrategy): void => {
  for (const [index, row] of stakeholders.entries()) {
    if (row.type === "common") {
      validateShares(row.shares, `stakeholders[${index}].shares`, strategy);
      if (row.shares <= 0) throw new CalculationError("INVALID_INPUT", `stakeholders[${index}].shares must be positive`);
    } else {
      finite(row.investment, `stakeholders[${index}].investment`);
      if (row.investment <= 0) throw new CalculationError("INVALID_INPUT", `stakeholders[${index}].investment must be positive`);
      if (row.type === "series" && "round" in row) {
        throw new CalculationError(
          "UNSUPPORTED_TERMS",
          `stakeholders[${index}].round is not supported; the model represents one financing event`,
        );
      }
    }
  }
  validateSafes(stakeholders.filter((row): row is SAFENote => row.type === "safe"));
};

export const validateConversionInput = (
  preMoneyValuation: number,
  commonShares: number,
  safes: SAFENote[],
  unusedOptions: number,
  targetOptionsPct: number,
  seriesInvestments: number[],
  roundingStrategy: RoundingStrategy,
): void => {
  finite(preMoneyValuation, "preMoneyValuation");
  validateShares(commonShares, "commonShares", roundingStrategy);
  validateShares(unusedOptions, "unusedOptions", roundingStrategy);
  finite(targetOptionsPct, "targetOptionsPct");
  if (preMoneyValuation <= 0) throw new CalculationError("INVALID_INPUT", "preMoneyValuation must be positive");
  if (commonShares <= 0) throw new CalculationError("INVALID_INPUT", "commonShares must be positive");
  if (unusedOptions < 0) throw new CalculationError("INVALID_INPUT", "unusedOptions must be nonnegative");
  if (targetOptionsPct < 0 || targetOptionsPct >= 1) {
    throw new CalculationError("INVALID_INPUT", "targetOptionsPct must be in [0, 1)");
  }
  seriesInvestments.forEach((investment, index) => {
    finite(investment, `seriesInvestments[${index}]`);
    if (investment <= 0) throw new CalculationError("INVALID_INPUT", `seriesInvestments[${index}] must be positive`);
  });
  const financingFraction = seriesInvestments.reduce((total, value) => total + value, 0) /
    (preMoneyValuation + seriesInvestments.reduce((total, value) => total + value, 0));
  if (targetOptionsPct + financingFraction >= 1) {
    throw new CalculationError("INVALID_INPUT", "the pool target and priced-round ownership leave no ownership for pre-round holders");
  }
  validateRoundingStrategy(roundingStrategy);
  validateSafes(safes);
};
