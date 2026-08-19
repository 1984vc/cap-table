# Cap Table Modeling Skill

> **Current correctness contract:** Public boundaries throw typed
> `CalculationError`s for invalid or unsupported transactions. `yc7p` is 7%
> after all SAFE conversions and before Series and pool-refresh dilution. MFN
> elects one complete later post-money package at actual conversion (earliest
> wins a PPS tie); pro-rata and later pre-money MFN adoption are rejected. The
> solver returns authoritative per-investor allocations only after exact share
> reconciliation. Older fixed-point and cap-only MFN examples below are
> historical implementation detail.

> **Purpose:** Enable an agent to build an interactive cap-table calculator inside a chat interface.  
> **Source:** This skill documents the complete mathematical model, the annotated reference implementation, and conversation patterns used by the [`@1984vc/cap-table`](https://github.com/1984vc/cap-table) TypeScript library.
> **Founder reference:** Use the hosted [Cap Table 101 Markdown](https://1984.vc/docs/founders-handbook/cap-table-101.md)
> as the source of truth for founder-facing terminology, examples, and the
> intended workflow: understand today's ownership, then model the dilution from
> one upcoming financing and its option-pool refresh.

---

## Table of Contents

1. [Mathematical Foundations](#1-mathematical-foundations)
2. [Complete Annotated Implementation](#2-complete-annotated-implementation)
3. [Building the Conversational Tool](#3-building-the-conversational-tool)

---

## 1. Mathematical Foundations

### 1.1 Ownership Basics

At its core, a cap table is a list of ownership stakes. For any stakeholder:

```
ownershipPct = shares / totalShares
```

All percentages in the library are expressed as decimals (e.g., `0.45` = 45%).

### 1.2 Pre-Money vs Post-Money Valuation

When a priced round occurs, two valuations matter:

- **Pre-money valuation** = The value of the company *before* the new investment.
- **Post-money valuation** = Pre-money + total new investment.

The **price per share (PPS)** for the Series round is derived from the post-money:

```
PPS = postMoneyValuation / totalPostMoneyShares
```

Where `totalPostMoneyShares` includes:
- All existing common shares (founders + issued options)
- Any new shares issued to SAFE investors upon conversion
- Any increase in the options pool (the "refresh")
- Series investor shares

### 1.3 SAFE Conversion Mechanics

A SAFE (Simple Agreement for Future Equity) converts to shares at a priced round. The conversion depends on three variables:

1. **Cap** — the maximum valuation used for conversion
2. **Discount** — a percentage reduction off the Series PPS
3. **Conversion type** — whether the cap applies to pre-money or post-money share count

#### 1.3.1 Pre-Money SAFE

A pre-money SAFE converts based on the pre-money share count:

```
capPPS = cap / preMoneyShares
shares = investment / capPPS
```

Equivalently:

```
shares = (investment / cap) * preMoneyShares
```

The investor's ownership is dilutive — they get shares *before* the new money comes in, so the Series investors dilute them too.

#### 1.3.2 Post-Money SAFE

A post-money SAFE (the Y Combinator standard) guarantees a fixed ownership percentage of the *post-money* cap table:

```
ownershipPct = investment / cap
```

This means the SAFE investor's stake is calculated *after* all conversions but *before* the Series round. Critically, post-money SAFEs are **not diluted** by the Series investors — their ownership percentage is locked in at conversion.

#### 1.3.3 Discount

A discount gives the SAFE investor a lower PPS than the Series investors:

```
discountPPS = (1 - discount) * seriesPPS
```

For example, a 20% discount means `discountPPS = 0.80 * seriesPPS`.

#### 1.3.4 Effective Conversion Price

The SAFE investor always gets the **better** of the cap or the discount:

```
effectivePPS = min(discountPPS, capPPS)
shares = investment / effectivePPS
```

If the cap is `0` (uncapped), only the discount applies:

```
effectivePPS = (1 - discount) * seriesPPS
```

#### 1.3.5 MFN (Most Favored Nation)

An MFN SAFE has no explicit cap but receives the **lowest cap** of any subsequent capped SAFE. This is implemented by scanning all SAFEs that come *after* the MFN SAFE in the list and taking the minimum non-zero cap among post-money SAFEs.

```
mfnCap = min(cap of all subsequent post-money SAFEs where cap > 0)
```

If no subsequent capped SAFE exists, the MFN remains uncapped until one is added.

#### 1.3.6 YC 7% Post-Money

A special case: guarantees exactly 7% ownership post-conversion:

```
ownershipPct = 0.07
```

This is treated as a post-money SAFE with `cap = investment / 0.07`.


### 1.4 The Iterative Solver (`fitConversion`)

The central challenge in cap table math is that **SAFE conversions depend on the total share count, but the total share count depends on SAFE conversions**. This is a circular dependency that requires an iterative solver.

#### Why It's Circular

Consider a post-money SAFE:

```
ownershipPct = investment / cap   // fixed
shares = ownershipPct * totalShares // depends on totalShares
totalShares = commonShares + safeShares + seriesShares + optionsPool // depends on shares
```

You can't solve for `totalShares` algebraically in one step because of rounding and the interaction between pre-money and post-money SAFEs.

#### The Iteration

The solver starts with an initial guess:

```
totalShares = commonShares + unusedOptions
```

Then it repeatedly computes what the total shares *should* be given that guess, and uses the result as the next guess. The iteration converges when the guess stabilizes.

At each iteration, given a `totalShares` guess:

1. **Compute the refreshed options pool:**
   ```
   optionsPool = max(totalShares * targetOptionsPct, unusedOptions)
   ```
   The pool can't shrink below existing unused options.

2. **Compute the increase in the options pool:**
   ```
   increaseInOptionsPool = optionsPool - unusedOptions
   ```

3. **Compute the Series PPS:**
   ```
   seriesPPS = (preMoneyValuation + totalSeriesInvestment) / totalShares
   ```
   Note: the numerator is the post-money valuation.

4. **Compute Series shares (per investor, rounded):**
   ```
   seriesShares_i = round(seriesInvestment_i / seriesPPS)
   totalSeriesShares = sum(seriesShares_i)
   ```

5. **Compute pre-money and post-money share counts:**
   ```
   preMoneyShares = commonShares + unusedOptions + increaseInOptionsPool
   postMoneyShares = totalShares - totalSeriesShares - increaseInOptionsPool
   ```

6. **Convert each SAFE:**
   For each SAFE, compute `effectivePPS` using `safeConvert()` (see §1.3.4), then:
   ```
   safeShares_i = round(investment_i / effectivePPS_i)
   totalSafeShares = sum(safeShares_i)
   ```

7. **Recompute total shares:**
   ```
   newTotalShares = totalSeriesShares + commonShares + optionsPool + totalSafeShares
   ```

8. **Check convergence:**
   If `newTotalShares == totalShares`, the model is stable. Otherwise, set `totalShares = newTotalShares` and repeat.

The loop has a hard cap of 100 iterations. In practice, it converges in 5–15 iterations.

#### Why It Converges

Each iteration adds the missing SAFE shares to the total. Because all share counts are positive and bounded above by the uncapped case, the sequence is monotonically increasing and bounded, so it must converge. Rounding can cause minor oscillation, but once two consecutive iterations produce the same integer share count, convergence is guaranteed.

### 1.5 Option Pool Refresh

The option pool is refreshed to hit a target percentage of the *post-money fully diluted* cap table:

```
targetOptionsPool = totalPostMoneyShares * targetOptionsPct
```

If the existing unused options are already larger than the target, no refresh occurs:

```
actualOptionsPool = max(targetOptionsPool, unusedOptions)
additionalOptions = actualOptionsPool - unusedOptions
```

These additional options dilute everyone (founders, SAFEs, Series investors) proportionally because they're added *before* the Series round but *after* SAFE conversions.

### 1.6 Rounding

Legal cap tables use specific rounding conventions:

- **Share counts** are floored (`Math.floor`) by default. Fractional opening
  shares are accepted only when both share-rounding flags are explicitly disabled.
- **Price per share (PPS)** is rounded **up** to a configurable number of decimal places (default: 5). This slightly favors the company by making each share more expensive, reducing the number of shares issued.

These rounding choices affect the iteration because a small change in PPS can change the floored share count, which changes the total, which changes the PPS.

### 1.7 Cap Table Workflows Summary

These workflows compare a current ownership snapshot with one upcoming
financing event, matching the founder scenarios in 1984's Cap Table 101. They
do not form a historical multi-round ledger.

| Workflow | When to Use | Key Function |
|----------|-------------|--------------|
| **Existing shareholders only** | No SAFEs, no priced round | `buildExistingShareholderCapTable` |
| **Estimated pre-round** | SAFEs exist but no priced round yet | `buildEstimatedPreRoundCapTable` |
| **Solved pre-round** | Priced round known, show pre-money ownership | `buildPreRoundCapTable` |
| **Full priced round** | Complete cap table after Series A | `buildPricedRoundCapTable` |

---

## 2. Complete Annotated Implementation

Below is the **complete, verbatim source code** from the `@1984vc/cap-table` library. It is annotated with mathematical explanations so an agent can understand *why* each line works, not just *what* it does.

> **Note:** The excerpts below explain the model; the installed package's exported
> types are authoritative. If `npm` is available, run:
> ```bash
> npm install @1984vc/cap-table
> ```
> and import the functions instead.



### 2.1 Type Definitions (`src/cap-table/types.ts`)

```typescript
// Every row in a cap table has one of these types
export enum CapTableRowType {
  Common = "common",          // Founder, employee, or options
  Safe = "safe",              // SAFE note investor
  Series = "series",          // Priced round investor
  Total = "total",            // Sum row
  OptionsPool = "optionsPool", // Available/reserved options, separate from issued shares
}

// Common stock can be a shareholder or unused options
export enum CommonRowType {
  Shareholder = "shareholder",
  UnusedOptions = "unusedOptions",
}

// Base fields shared by all stakeholders
export type BaseStake = {
  id?: string;
  name?: string;
  shares?: number;
  type: CapTableRowType.Common | CapTableRowType.Safe | CapTableRowType.Series;
}

// A common stockholder (founder, employee, or options pool)
export type CommonStockholder = BaseStake & {
  name: string;
  shares: number;
  type: CapTableRowType.Common;
  commonType: CommonRowType.Shareholder | CommonRowType.UnusedOptions;
}

// A SAFE note. The `cap` is 0 for uncapped SAFEs.
export type SAFENote = BaseStake & {
  investment: number;          // Dollars invested
  cap: number;                 // Valuation cap (0 = uncapped)
  discount: number;            // Discount rate (0.20 = 20%)
  type: CapTableRowType.Safe;
  sideLetters?: ("mfn" | "pro-rata")[];  // Special terms
  conversionType: "pre" | "post" | "mfn" | "yc7p" | "ycmfn";
}

// A priced round investor
export type SeriesInvestor = BaseStake & {
  investment: number;
  type: CapTableRowType.Series;
}

// Union of all possible inputs
export type StakeHolder = CommonStockholder | SAFENote | SeriesInvestor;

// Error states for ownership calculations
export type CapTableOwnershipError = {
  type: "tbd" | "caveat";
  reason?: string
}

// Output row types — these are what the cap table builders return

export type BaseCapTableRow = {
  id?: string;
  name?: string;
  ownershipPct?: number;
  ownershipError?: CapTableOwnershipError
}

export type TotalCapTableRow = BaseCapTableRow & {
  type: CapTableRowType.Total;
  investment: number;
  shares: number;
  ownershipPct: number;
};

export type CommonCapTableRow = BaseCapTableRow & {
  type: CapTableRowType.Common;
  shares: number;
  commonType: CommonRowType;
};

export type SafeCapTableRow = BaseCapTableRow & {
  type: CapTableRowType.Safe;
  investment: number;
  discount: number;
  cap: number;
  sideLetters?: ("mfn" | "pro-rata")[];
  pps?: number;                // Effective conversion price per share
  shares?: number;
  ownershipPct?: number;
};

export type SeriesCapTableRow = BaseCapTableRow & {
  type: CapTableRowType.Series;
  investment: number;
  shares: number;
  pps: number;
  ownershipPct: number;
};

export type OptionsPoolCapTableRow = BaseCapTableRow & {
  type: CapTableRowType.OptionsPool;
  shares: number;
  ownershipPct?: number;
};

export type CapTableRow = TotalCapTableRow | SafeCapTableRow | SeriesCapTableRow | CommonCapTableRow | OptionsPoolCapTableRow;
```



### 2.2 Rounding Utilities (`src/utils/rounding.ts`)

```typescript
export type RoundingStrategy = {
  roundDownShares?: boolean;   // true = floor shares (legal default)
  roundShares?: boolean;       // true = round to nearest (alternative)
  roundPPSPlaces: number;      // Decimal places for PPS; -1 = no rounding
};

// Legal convention: round DOWN shares so you never over-issue
export const roundShares = (num: number, strategy: RoundingStrategy): number => {
  if (strategy.roundDownShares) {
    return Math.floor(num);
  } else if (strategy.roundShares) {
    return Math.round(num);
  }
  return num
}

// Legal convention: round UP PPS so each share costs slightly more,
// reducing the number of shares issued to investors
export const roundPPSToPlaces = (num: number, places: number): number => {
  if (places < 0) {
    return num;
  }
  const factor = Math.pow(10, places);
  return Math.ceil(num * factor) / factor;
};

// General rounding utility (used for output formatting, not calculations)
export const roundToPlaces = (num: number, places: number): number => {
  if (places < 0) {
    return num;
  }
  const factor = Math.pow(10, places);
  return Math.round(num * factor) / factor;
};
```

### 2.3 Number Formatting (`src/utils/numberFormatting.ts`)

```typescript
// Parses strings like "$1.5M", "1,000,000", "$50K" into numbers.
// Supports K/M/B/T suffixes; returns NaN for unrecognizable input.
export const stringToNumber = (value: string | number): number => {
  if (typeof value === "number") {
    return value;
  }
  const cleaned = value.trim().replace(/[,$%\s_]/g, "");
  const match = cleaned.match(/^(-?)(\d+(?:\.\d+)?)([KMBT])?$/i);
  if (!match) return NaN;
  const sign = match[1] === "-" ? -1 : 1;
  const base = parseFloat(match[2]);
  const suffix = (match[3] ?? "").toUpperCase();
  return sign * base * ({ K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[suffix] ?? 1);
};

// Formats as "$1,234,567.89" (up to 2 decimals, drops trailing zeros)
export const formatUSDWithCommas = (value: number | string) => {
  if (typeof value === "string") {
    value = stringToNumber(value);
  }
  const minimumFractionDigits = value % 1 !== 0 ? 2 : 0;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits,
    maximumFractionDigits: 2,
  });
};

// Formats as "$1.5M", "$50K", "$999" (compact, honors negatives)
export const shortenedUSD = (value: number | string) => {
  if (typeof value === "string") {
    value = stringToNumber(value);
  }
  if (!Number.isFinite(value)) return String(value);
  const sign = value < 0 ? "-" : "";
  const formatted = Math.abs(value).toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return sign + "$" + formatted;
};
```



### 2.4 SAFE Calculations (`src/safe-calcs.ts`)

```typescript
import { CapTableOwnershipError, SAFENote } from "./cap-table/types";
import { RoundingStrategy, roundPPSToPlaces, roundShares } from "./utils/rounding";

// Determine if a SAFE is an MFN variant
const isMFN = (safe: SAFENote): boolean => {
  if (safe.conversionType === "mfn" || safe.conversionType === "ycmfn" || safe.sideLetters?.includes("mfn")) {
    return true;
  }
  return false;
}

// Find the lowest cap among subsequent post-money SAFEs.
// This implements the MFN side-letter logic.
const getMFNCapAfter = (rows: SAFENote[], idx: number): number => {
  return (
    rows.slice(idx + 1).reduce((val, row) => {
      // Ignore other MFNs — they also don't have a cap yet
      if (isMFN(row)) {
        return val;
      }
      // Ignore pre-money SAFEs for MFN cap purposes
      // (YC MFNs are post-money by convention)
      if (row.conversionType === "pre") {
        return val;
      }
      // If we haven't found a cap yet, take this one
      if (val === 0) {
        return row.cap;
      }
      // Otherwise keep the lowest cap
      if (val > 0 && row.cap > 0 && row.cap < val) {
        return row.cap;
      }
      return val;
    }, 0) ?? 0
  );
};

// Returns the effective cap for a SAFE, applying MFN logic if needed
export const getCapForSafe = (idx: number, safes: SAFENote[]): number => {
  const safe = safes[idx];
  if (isMFN(safe)) {
    return getMFNCapAfter(safes, idx);
  }
  return safe.cap;
};

// Apply MFN caps to all SAFEs in the list.
// This mutates the cap field on MFN SAFEs.
export const populateSafeCaps = (safeNotes: SAFENote[]): SAFENote[] => {
  return safeNotes.map((safe, idx): SAFENote => {
    if (isMFN(safe)) {
      const cap = getCapForSafe(idx, safeNotes);
       return { ...safe, cap }
    }
    return {...safe}
  })
}

// Sum the shares all SAFEs convert to, given the priced-round parameters.
// This is called inside the iterative solver.
export const sumSafeConvertedShares = (
  safes: SAFENote[],
  pps: number,                  // Series round PPS
  preMoneyShares: number,
  postMoneyShares: number,
  roundingStrategy: RoundingStrategy,
): number => {
  return sumArray(
    safes.map((safe) => {
      // Get the effective PPS for this SAFE (discount vs cap)
      const discountPPS = roundPPSToPlaces(
        safeConvert(safe, preMoneyShares, postMoneyShares, pps),
        roundingStrategy.roundPPSPlaces
      );
      // Shares = investment / effectivePPS, rounded down
      const postSafeShares = safe.investment / discountPPS;
      return roundShares(postSafeShares, roundingStrategy);
    }),
  );
};

// The core SAFE conversion formula.
// Returns the effective price per share for a single SAFE.
export const safeConvert = (
  safe: SAFENote,
  preShares: number,            // Pre-money fully diluted shares
  postShares: number,           // Post-money fully diluted shares
  pps: number,                  // Series round PPS
): number => {
  // Uncapped SAFE: only discount applies
  if (safe.cap === 0) {
    return (1 - safe.discount) * pps;
  }
  // Compute discount price
  const discountPPS = (1 - safe.discount) * pps;
  
  // Compute cap price. Pre-money uses preShares; post-money uses postShares.
  const shares = safe.conversionType === "pre" ? preShares : postShares;
  const capPPS = safe.cap / shares;
  
  // Investor gets the BETTER price (lower PPS = more shares)
  return Math.min(discountPPS, capPPS);
};

const sumArray = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);

// Validate SAFE inputs. Invalid terms throw a typed CalculationError.
export const checkSafeNotesForErrors = (safeNotes: SAFENote[]): CapTableOwnershipError | undefined => {
  validateSafes(safeNotes);
  return undefined;
}
```



### 2.5 Conversion Solver (`src/conversion-solver.ts`)

```typescript
import { SAFENote } from "./cap-table/types";
import { sumSafeConvertedShares, safeConvert } from "./safe-calcs";
import { RoundingStrategy, roundPPSToPlaces, roundShares } from "./utils/rounding";

// The result of a successful fitConversion call
export type BestFit = {
  pps: number;                  // Series round price per share
  ppss: number[];               // Per-SAFE effective PPS
  convertedSafeShares: number;
  seriesShares: number;
  preMoneyShares: number;       // Common + options refresh (pre-Series)
  postMoneyShares: number;      // Post-conversion, pre-Series
  newSharesIssued: number;      // Total new shares from SAFEs + Series + options
  totalShares: number;          // Fully diluted post-money shares
  additionalOptions: number;    // New options added in refresh
  totalOptions: number;         // Final options pool size
  totalInvested: number;
  totalSeriesInvestment: number;
  roundingStrategy: RoundingStrategy;
};

// Legal default: floor shares, round PPS up to 5 decimal places
export const DEFAULT_ROUNDING_STRATEGY: RoundingStrategy = {
  roundDownShares: true,
  roundPPSPlaces: 5,
};

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

// Given a totalShares guess, compute all derived values.
// This is the "engine" of each iteration.
const calculatePreAndPostMoneyShares = (
  preMoneyValuation: number,
  commonShares: number,         // Existing common (excludes unused options)
  unusedOptions: number,        // Currently unissued options
  targetOptionsPct: number,     // Target option pool % post-round
  seriesInvestments: number[],  // Array of $ invested per Series investor
  totalShares: number,          // CURRENT guess for total shares
  roundingStrategy: RoundingStrategy = DEFAULT_ROUNDING_STRATEGY,
): PreAndPostMoneyCalculation => {

  // Step 1: Compute refreshed options pool
  let optionsPool = roundShares(totalShares * targetOptionsPct, roundingStrategy);
  if (optionsPool < unusedOptions) {
    optionsPool = unusedOptions; // Can't shrink the pool
  }

  // Step 2: How many new options are we adding?
  const increaseInOptionsPool = optionsPool - unusedOptions;

  // Step 3: Total Series investment
  const seriesInvestment = sumArray(seriesInvestments);

  // Step 4: Series PPS = post-money valuation / total shares
  // Note: post-money = preMoneyValuation + seriesInvestment
  const pps = roundPPSToPlaces(
    (preMoneyValuation + seriesInvestment) / totalShares,
    roundingStrategy.roundPPSPlaces
  );

  // Step 5: Series shares per investor (rounded down)
  const seriesShares = sumArray(
    seriesInvestments.map((investment) =>
      roundShares(investment / pps, roundingStrategy),
    ),
  );

  // Step 6: Pre-money shares = common + all options (existing + refresh)
  const preMoneyShares = commonShares + unusedOptions + increaseInOptionsPool;
  
  // Step 7: Post-money shares = everything except Series and the option increase
  // (these are the shares that post-money SAFEs convert into)
  const postMoneyShares = totalShares - seriesShares - increaseInOptionsPool;

  return {
    preMoneyShares,
    postMoneyShares,
    pps,
    optionsPool,
    increaseInOptionsPool,
    // Recalculate total to account for Series share rounding
    totalShares: postMoneyShares + increaseInOptionsPool + seriesShares,
    seriesShares,
  }
}
```



```typescript
// Test a totalShares guess and return what the NEW totalShares should be.
// If this equals the input, we've converged.
const attemptFit = (
  preMoneyValuation: number,
  commonShares: number,
  unusedOptions: number,
  targetOptionsPct: number,
  safes: SAFENote[],
  seriesInvestments: number[],
  totalShares: number,
  roundingStrategy: RoundingStrategy = DEFAULT_ROUNDING_STRATEGY,
): number => {
  // Derive pre/post money shares and PPS from our guess
  const results = calculatePreAndPostMoneyShares(
    preMoneyValuation, commonShares, unusedOptions,
    targetOptionsPct, seriesInvestments, totalShares, roundingStrategy
  )

  // Convert all SAFEs using these parameters
  const safeShares = sumSafeConvertedShares(
    safes,
    results.pps,
    results.preMoneyShares,
    results.postMoneyShares,
    roundingStrategy,
  )

  // Reconstruct total shares from components
  const newTotalShares = results.seriesShares + commonShares + results.optionsPool + safeShares;
  return newTotalShares
};

// Main entry point: iteratively solve for share counts at a priced round.
export const fitConversion = (
  preMoneyValuation: number,
  commonShares: number,
  safes: SAFENote[],
  unusedOptions: number,
  targetOptionsPct: number,
  seriesInvestments: number[],
  roundingStrategy: RoundingStrategy = DEFAULT_ROUNDING_STRATEGY,
): BestFit => {
  // Initial guess: existing shares + unused options only
  let totalShares = commonShares + unusedOptions;
  let lastTotalShares = totalShares;

  // Iterate until convergence or max 100 attempts
  for (let i = 0; i < 100; i++) {
    totalShares = attemptFit(
      preMoneyValuation, commonShares, unusedOptions,
      targetOptionsPct, safes, seriesInvestments,
      totalShares, roundingStrategy
    );

    if (totalShares === lastTotalShares) {
      break // Converged!
    }
    lastTotalShares = totalShares;
  }

  // Final calculation with converged totalShares
  const {
    pps, preMoneyShares, postMoneyShares,
    increaseInOptionsPool, seriesShares,
  } = calculatePreAndPostMoneyShares(
    preMoneyValuation, commonShares, unusedOptions,
    targetOptionsPct, seriesInvestments, totalShares, roundingStrategy
  )

  const convertedSafeShares = sumSafeConvertedShares(
    safes, pps, preMoneyShares, postMoneyShares, roundingStrategy,
  );

  // Compute per-SAFE effective PPS
  const ppss: number[] = Array(safes.length).fill(pps);
  for (const [idx, safe] of Array.from(safes.entries())) {
    ppss[idx] = roundPPSToPlaces(
      safeConvert(safe, preMoneyShares, postMoneyShares, pps),
      roundingStrategy.roundPPSPlaces
    );
  }

  const totalInvested = sumArray(seriesInvestments) + safes.reduce((acc, s) => acc + s.investment, 0);

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
```



### 2.6 TBD-State Builder (`src/cap-table/error.ts`)

Invalid input throws a typed `CalculationError`. Output-level ownership states
are reserved for estimates that are `tbd` or carry a `caveat`.

```typescript
import { SAFENote, CommonStockholder, CommonCapTableRow, SafeCapTableRow, CapTableOwnershipError, CapTableRowType, PreRoundCapTable } from "./types";

// When all SAFEs are uncapped, we can't estimate ownership.
// Return a cap table with everything marked "tbd".
export const buildTBDPreRoundCapTable = (safeNotes: SAFENote[], common: CommonStockholder[]): 
  PreRoundCapTable => {
  const totalInvestment = safeNotes.reduce((acc, investor) => acc + investor.investment, 0);
  const totalShares = common.reduce((acc, common) => acc + common.shares, 0)
  const ownershipError: CapTableOwnershipError = {
    type: "tbd",
    reason: "Unable to model Pre-Round cap table with uncapped SAFE's",
  }

  const safeCapTable: SafeCapTableRow[] = safeNotes.map((safe) => ({
    name: safe.name,
    cap: safe.cap,
    discount: safe.discount,
    ownershipError: { type: "tbd", reason: "Unable to model Pre-Round cap table with uncapped SAFE's" },
    investment: safe.investment,
    type: CapTableRowType.Safe,
  }))

  const commonCapTable: CommonCapTableRow[] = common.map((stockholder) => ({
    name: stockholder.name,
    shares: stockholder.shares,
    ownershipError,
    type: CapTableRowType.Common,
    commonType: stockholder.commonType,
  }))

  return {
    common: commonCapTable,
    safes: safeCapTable,
    total: {
      name: "Total",
      shares: totalShares,
      investment: totalInvestment,
      ownershipPct: 1,
      type: CapTableRowType.Total,
    },
  }
}

```



### 2.7 Pre-Round Builders (`src/cap-table/pre-round.ts`)

The calculation excerpts are abridged. Production output always separates
unused options into `optionsPool` and returns the `PreRoundCapTable` shape.

```typescript
import { BestFit, DEFAULT_ROUNDING_STRATEGY } from "../conversion-solver";
import { populateSafeCaps } from "../safe-calcs";
import { RoundingStrategy, roundShares } from "../utils/rounding";
import { SAFENote, CommonStockholder, CommonCapTableRow, SafeCapTableRow, StakeHolder, CapTableRowType, PreRoundCapTable } from "./types";
import { buildTBDPreRoundCapTable } from "./error";
import { formatUSDWithCommas } from "../utils/numberFormatting";

// Build a pre-round cap table BEFORE a priced round is known.
// Uses the MAX cap among all SAFEs to estimate ownership.
// Returns "tbd" if no caps exist, "caveat" for discounts/MFN assumptions.
export const buildEstimatedPreRoundCapTable = (
  stakeHolders: StakeHolder[],
  roundingStrategy: RoundingStrategy = DEFAULT_ROUNDING_STRATEGY
): PreRoundCapTable => {

  const commonShareholders = stakeHolders.filter(
    (s) => s.type === CapTableRowType.Common
  ) as CommonStockholder[];

  // Pre-money shares = all common shares (used for pre-money SAFE estimate)
  const preMoneyShares = commonShareholders.reduce((acc, s) => acc + s.shares, 0);

  // Apply MFN caps
  const safeNotes = populateSafeCaps(
    stakeHolders.filter((s) => s.type === CapTableRowType.Safe) as SAFENote[]
  )

  // Find the highest cap for estimation purposes
  const maxCap = safeNotes.reduce((max, s) => Math.max(max, s.cap), 0)

  // If no caps at all, we can't estimate
  if (maxCap === 0) {
    return buildTBDPreRoundCapTable(safeNotes, [...commonShareholders])
  }

  const totalInvestment = safeNotes.reduce((acc, s) => acc + s.investment, 0);

  // Step 1: Convert each SAFE using maxCap as a stand-in for uncapped
  let safeCapTable: SafeCapTableRow[] = safeNotes.map((safe) => {
    if (safe.conversionType === 'pre') {
      const cap = safe.cap === 0 ? maxCap : safe.cap;
      const shares = roundShares((safe.investment / cap) * preMoneyShares, roundingStrategy);
      return {
        name: safe.name,
        cap: safe.cap,
        discount: safe.discount,
        shares,
        sideLetters: safe.sideLetters,
        investment: safe.investment,
        type: CapTableRowType.Safe,
      }
    } else {
      // Post-money: ownershipPct is fixed at investment/cap
      return {
        name: safe.name,
        cap: safe.cap,
        discount: safe.discount,
        sideLetters: safe.sideLetters,
        ownershipPct: safe.investment / (safe.cap === 0 ? maxCap : safe.cap),
        investment: safe.investment,
        type: CapTableRowType.Safe,
      }
    }
  })

  // Step 2: Calculate total post-money capitalization
  const preMoneySafeShares = safeCapTable.reduce((acc, s) => acc + (s.shares ?? 0), 0)
  const postSharePct = safeCapTable.reduce((acc, s) => acc + (s.ownershipPct ?? 0), 0)
  
  // postMoneyCapitalization = (preMoneyShares + preMoneySafeShares) / (1 - postSafePct)
  // This solves for the total shares where post-money SAFEs own their fixed %.
  const postShareCapitalization = roundShares(
    (preMoneyShares + preMoneySafeShares) / (1 - postSharePct),
    roundingStrategy
  )

  // Step 3: Recalculate all SAFEs with the total capitalization
  safeCapTable = safeCapTable.map((safe) => {
    if (safe.shares && safe.shares > 0) {
      // Pre-money SAFE: now compute its % of the full cap table
      const pct = safe.shares / postShareCapitalization
      return {
        ...safe,
        ownershipPct: pct,
      }
    } else {
      // Post-money SAFE: now compute its absolute shares
      return {
        ...safe,
        shares: roundShares((safe.ownershipPct ?? 0) * postShareCapitalization, roundingStrategy)
      }
    }
  })

  // Step 4: Add caveat flags for estimates that may be wrong
  safeCapTable = safeCapTable.map((safe) => {
    if (safe.cap === 0) {
      let reason = `No cap set for this SAFE, ownership based on max cap of all other SAFE's. Currently set to ${formatUSDWithCommas(maxCap)}.`
      if (safe.discount > 0) {
        reason += " It is not possible to calculate ownership with a discount until a priced round is entered."
      }
      return { ...safe, ownershipError: { type: "caveat" as const, reason } }
    } else if (safe.discount > 0) {
      return {
        ...safe,
        ownershipError: {
          type: "caveat" as const,
          reason: "It is not possible to calculate ownership with a discount until a priced round is entered",
        },
      }
    } else if (safe.sideLetters?.includes("mfn")) {
      return {
        ...safe,
        ownershipError: {
          type: "caveat" as const,
          reason: "For an Uncapped MFN the cap is set to the lowest cap in subsequent SAFE's. You can re-order the SAFEs using the reorder button on the left.",
        },
      }
    }
    return safe
  })

  // Common rows: ownership = shares / total post-money cap
  const commonCapTable: CommonCapTableRow[] = commonShareholders.map((s) => ({
    name: s.name,
    shares: s.shares,
    ownershipPct: s.shares / postShareCapitalization,
    type: CapTableRowType.Common,
    commonType: s.commonType,
  }))

  const totalShares = preMoneyShares + safeCapTable.reduce((acc, s) => acc + (s.shares ?? 0), 0)

  return {
    common: commonCapTable,
    safes: safeCapTable,
    total: {
      name: "Total",
      shares: totalShares,
      investment: totalInvestment,
      ownershipPct: 1,
      type: CapTableRowType.Total,
    },
  }
}
```



```typescript
// Build a pre-round cap table AFTER fitConversion has been called.
// This gives exact ownership using the solved conversion prices.
export const buildPreRoundCapTable = (
  pricedConversion: BestFit,
  stakeHolders: StakeHolder[]
): PreRoundCapTable => {

  const commonShareholders = stakeHolders.filter(
    (s) => s.type === CapTableRowType.Common
  ) as CommonStockholder[];

  const safeNotes = populateSafeCaps(
    stakeHolders.filter((s) => s.type === CapTableRowType.Safe) as SAFENote[]
  )

  // Total shares BEFORE the Series round and option refresh
  const totalShares = pricedConversion.totalShares 
    - pricedConversion.seriesShares 
    - pricedConversion.additionalOptions;

  const totalInvestment = safeNotes.reduce((acc, s) => acc + s.investment, 0);

  const commonCapTable: CommonCapTableRow[] = commonShareholders.map((s) => ({
    name: s.name,
    shares: s.shares,
    ownershipPct: s.shares / totalShares,
    type: CapTableRowType.Common,
    commonType: s.commonType,
  }))

  const safeCapTable: SafeCapTableRow[] = safeNotes.map((safe, idx) => {
    const pps = pricedConversion.ppss[idx];
    const shares = roundShares(safe.investment / pps, pricedConversion.roundingStrategy);
    const ownershipPct = shares / totalShares;
    return {
      name: safe.name,
      investment: safe.investment,
      ownershipPct,
      discount: safe.discount,
      cap: safe.cap,
      shares,
      type: CapTableRowType.Safe,
      pps,
    }
  })

  return {
    common: commonCapTable,
    safes: safeCapTable,
    total: {
      name: "Total",
      shares: totalShares,
      investment: totalInvestment,
      ownershipPct: 1,
      type: CapTableRowType.Total,
    },
  }
}
```



### 2.8 Priced Round Builder (`src/cap-table/priced-round.ts`)

```typescript
import { BestFit } from "../conversion-solver";
import { roundShares } from "../utils/rounding";
import { StakeHolder, CommonCapTableRow, SafeCapTableRow, SeriesCapTableRow, OptionsPoolCapTableRow, TotalCapTableRow, CommonStockholder, SAFENote, SeriesInvestor, CapTableRowType, CommonRowType } from "./types";

// Build the FULL cap table including Series investors and refreshed options pool.
export const buildPricedRoundCapTable = (
  pricedConversion: BestFit,
  stakeHolders: StakeHolder[]
): {
  common: CommonCapTableRow[],
  safes: SafeCapTableRow[],
  series: SeriesCapTableRow[],
  optionsPool: OptionsPoolCapTableRow,
  total: TotalCapTableRow,
} => {

  // Filter out unused options from common — they'll appear as optionsPool
  const commonShareholders = stakeHolders.filter(
    (s) => s.type === CapTableRowType.Common && s.commonType !== CommonRowType.UnusedOptions
  ) as CommonStockholder[];

  const safeNotes = stakeHolders.filter(
    (s) => s.type === CapTableRowType.Safe
  ) as SAFENote[];

  const seriesInvestors = stakeHolders.filter(
    (s) => s.type === CapTableRowType.Series
  ) as SeriesInvestor[];

  const totalShares = pricedConversion.totalShares;
  const totalInvestment = [...seriesInvestors, ...safeNotes].reduce((acc, s) => acc + s.investment, 0);

  // Common stockholders: same shares, new % of larger pie
  const commonCapTable: CommonCapTableRow[] = commonShareholders.map((s) => ({
    name: s.name,
    shares: s.shares,
    ownershipPct: s.shares / totalShares,
    type: CapTableRowType.Common,
    commonType: s.commonType,
  }))

  // SAFEs: use their solved effective PPS to compute final shares
  const safeCapTable: SafeCapTableRow[] = safeNotes.map((safe, idx) => {
    const pps = pricedConversion.ppss[idx] || 0;
    const shares = roundShares(safe.investment / pps, pricedConversion.roundingStrategy);
    const ownershipPct = shares / totalShares;
    return {
      name: safe.name,
      investment: safe.investment,
      ownershipPct,
      discount: safe.discount,
      cap: safe.cap,
      shares,
      type: CapTableRowType.Safe,
      pps,
    }
  })

  // Series investors: shares = investment / seriesPPS
  const seriesCapTable: SeriesCapTableRow[] = seriesInvestors.map((inv) => {
    const shares = roundShares(inv.investment / pricedConversion.pps, pricedConversion.roundingStrategy);
    return {
      name: inv.name,
      investment: inv.investment,
      shares,
      ownershipPct: shares / totalShares,
      pps: pricedConversion.pps,
      type: CapTableRowType.Series,
    }
  })

  // Available/reserved options pool
  const optionsPool: OptionsPoolCapTableRow = {
    name: "Options Pool",
    shares: pricedConversion.totalOptions,
    ownershipPct: pricedConversion.totalOptions / totalShares,
    type: CapTableRowType.OptionsPool
  }

  return {
    common: commonCapTable,
    safes: safeCapTable,
    series: seriesCapTable,
    optionsPool,
    total: {
      name: "Total",
      shares: totalShares,
      investment: totalInvestment,
      ownershipPct: 1,
      type: CapTableRowType.Total,
    },
  }
}
```



### 2.9 Main Cap Table Index (`src/cap-table/index.ts`)

```typescript
import { buildEstimatedPreRoundCapTable, buildPreRoundCapTable } from "./pre-round";
import { buildPricedRoundCapTable } from "./priced-round";
import { CommonStockholder, CapTableRowType, CommonRowType, ExistingCapTable } from "./types";

// Simplest case: just existing shareholders, no SAFEs, no rounds.
export const buildExistingShareholderCapTable = (
  commonStockholders: CommonStockholder[]
): ExistingCapTable => {
  const totalCommonShares = commonStockholders.reduce((acc, s) => acc + s.shares, 0);
  const common = commonStockholders.filter((s) => s.commonType === CommonRowType.Shareholder).map((s) => ({
    id: s.id,
    name: s.name,
    shares: s.shares,
    ownershipPct: s.shares / totalCommonShares,
    type: CapTableRowType.Common,
    commonType: s.commonType,
  }));
  const poolShares = commonStockholders.filter((s) => s.commonType === CommonRowType.UnusedOptions)
    .reduce((total, s) => total + s.shares, 0);
  return {
    common,
    optionsPool: { name: "Options Pool", shares: poolShares, ownershipPct: poolShares / totalCommonShares, type: CapTableRowType.OptionsPool },
    total: { name: "Total", shares: totalCommonShares, investment: 0, ownershipPct: 1, type: CapTableRowType.Total },
  };
}

export {
  buildPreRoundCapTable,
  buildEstimatedPreRoundCapTable,
  buildPricedRoundCapTable,
}
```

### 2.10 Library Exports (`src/index.ts`)

```typescript
export * from "./cap-table/types";
export * from "./cap-table/index";
export * from "./conversion-solver";
export * from "./safe-calcs";
export * from "./utils/rounding";
export * from "./utils/numberFormatting";
```

---

## 3. Building the Conversational Tool

### 3.1 Conversation Architecture

The tool should branch based on the user's goal. Here's the decision tree:

```
User asks about cap table
│
├─→ "Do you want to model an existing cap table, or a future priced round?"
│   │
│   ├─→ "Existing only" → buildExistingShareholderCapTable
│   │
│   ├─→ "Future priced round" → "Do you know the pre-money valuation?"
│   │   │
│   │   ├─→ "No" → buildEstimatedPreRoundCapTable (SAFEs only, no pricing)
│   │   │
│   │   └─→ "Yes" → fitConversion → buildPreRoundCapTable OR buildPricedRoundCapTable
│   │       │
│   │       ├─→ "Show me pre-money ownership" → buildPreRoundCapTable
│   │       │
│   │       └─→ "Show me the full priced round" → buildPricedRoundCapTable
│   │
│   └─→ "I have SAFEs but no priced round yet" → buildEstimatedPreRoundCapTable
```



### 3.2 Input Gathering Strategy

Use a **hybrid approach**: ask the high-level branching question first, then provide a compact JSON template for bulk data entry.

#### Step 1: Branching Question

> "I can help you model your cap table. Are you looking to:  
> (a) See ownership for existing shareholders only,  
> (b) Model SAFE ownership before a priced round, or  
> (c) Model a full Series A priced round?"

#### Step 2: JSON Template (for bulk entry)

For **existing shareholders only**:
```json
{
  "common": [
    { "name": "Founder 1", "shares": 4500000 },
    { "name": "Founder 2", "shares": 4500000 },
    { "name": "Options Pool", "shares": 1000000, "commonType": "unusedOptions" }
  ]
}
```

For **SAFE modeling** (priced or pre-round):
```json
{
  "common": [
    { "name": "Founder 1", "shares": 4500000 },
    { "name": "Founder 2", "shares": 4500000 },
    { "name": "Issued Options", "shares": 400000 },
    { "name": "Unused Options", "shares": 600000, "commonType": "unusedOptions" }
  ],
  "safes": [
    {
      "name": "Seed SAFE",
      "investment": 1000000,
      "cap": 10000000,
      "discount": 0,
      "conversionType": "post"
    }
  ]
}
```

For **priced round**:
```json
{
  "preMoneyValuation": 25000000,
  "targetOptionsPct": 0.10,
  "seriesInvestments": [3000000, 1000000],
  "common": [ ... ],
  "safes": [ ... ]
}
```

#### Step 3: Interactive follow-ups for complex items

- **MFN ordering**: "You have an MFN SAFE. The order matters — it looks at subsequent SAFEs for the lowest cap. Is this the correct order? [list SAFEs]"
- **Option pool**: "What target option pool % do you want post-round? (Common: 10%)"
- **Discounts**: "I see a discount on a SAFE. Note: I can flag this, but exact ownership requires a priced round."

### 3.3 Error Handling Strategy

#### Pre-validate before calling the library

Check these conditions and refuse to proceed with a clear message:

| Check | Error Message |
|-------|--------------|
| Investment ≥ cap (and cap ≠ 0) | "A SAFE's investment ($X) can't equal or exceed its cap ($Y). Please fix this and try again." |
| Negative shares | "Share counts must be positive." |
| Negative investment | "Investment amounts must be positive." |
| Empty cap table | "Please add at least one shareholder." |
| Target options % > 1 | "Option pool percentage should be a decimal (e.g., 0.10 for 10%)." |

#### Translate library error states conversationally

When the library returns `tbd` or `caveat`, don't crash — explain:

- **`tbd`**: "I can't calculate exact ownership yet because one or more SAFEs don't have a cap. Add a cap or a priced round to see precise numbers."
- **`caveat`**: "This ownership is an estimate. [reason from library]. For exact numbers, add a priced round with a pre-money valuation."
- **`error`**: "There's a problem with the input: [reason]. Please fix it and I'll recalculate."



### 3.4 Output Formatting

#### Default: Markdown Table

```
| Stakeholder | Shares | Investment | Ownership |
|-------------|--------|------------|-----------|
| Founder 1 | 4,500,000 | — | 45.00% |
| Seed SAFE | 555,556 | $1,000,000 | 5.56% |
| Series A | 1,230,769 | $4,000,000 | 12.31% |
| **Total** | **10,000,000** | **$5,000,000** | **100.00%** |
```

#### Alternative: Compact JSON

For users who want raw data:
```json
{
  "common": [...],
  "safes": [...],
  "series": [...],
  "optionsPool": {...},
  "total": {...}
}
```

#### Key Stats Summary

Always include a human-readable summary:

> **Summary:**
> - Pre-money valuation: $25M
> - Post-money valuation: $29M
> - Series PPS: $3.25
> - Total fully diluted shares: 10,000,000
> - New options issued: 400,000

### 3.5 Quick Reference: Function Call Cheat Sheet

| Goal | Call This | With These Inputs |
|------|-----------|-------------------|
| Existing ownership only | `buildExistingShareholderCapTable(commonStockholders)` | Array of `CommonStockholder`; returns `{ common, optionsPool, total }` |
| Estimate SAFE ownership | `buildEstimatedPreRoundCapTable(stakeHolders)` | Array of `CommonStockholder` + `SAFENote` |
| Exact pre-round ownership | `buildPreRoundCapTable(bestFit, stakeHolders)` | Output of `fitConversion` + stakeholders |
| Full priced round | `buildPricedRoundCapTable(bestFit, stakeHolders)` | Output of `fitConversion` + stakeholders |

**To get a `BestFit`:**
```typescript
const bestFit = fitConversion(
  preMoneyValuation,      // e.g., 25_000_000
  commonShares,           // e.g., 9_000_000 (excludes unused options)
  safes,                  // Array of SAFENote
  unusedOptions,          // e.g., 1_000_000
  targetOptionsPct,       // e.g., 0.10
  seriesInvestments       // e.g., [3_000_000, 1_000_000]
);
```

### 3.6 Edge Cases to Handle in Conversation

1. **All uncapped SAFEs**: The estimated pre-round will return `tbd`. Tell the user: "I need at least one capped SAFE or a priced round to estimate ownership."

2. **Zero founders**: Unusual but valid. The entire company is owned by SAFE/series investors.

3. **100% option pool**: Mathematically possible but practically suspicious. Flag it.

4. **Investment at or above cap**: Throws `CalculationError("INVALID_INPUT", ...)`. Catch it early.

5. **Multiple Series rounds**: Unsupported. Treat all opening holders as the
   current snapshot and model only the immediate upcoming financing event.

6. **Re-ordering SAFEs for MFN**: If the user has MFNs, ask them to confirm the chronological order. The MFN looks at *subsequent* SAFEs only.

---

*End of Skill Document*
