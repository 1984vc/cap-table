# @1984vc/cap-table Library API Reference

> Full mathematical foundations and TypeScript API for programmatic use.
> For CLI usage, see the parent SKILL.md.

## Install

```bash
npm install @1984vc/cap-table
```

```typescript
import {
  fitConversion,
  buildPricedRoundCapTable,
  buildPreRoundCapTable,
  buildEstimatedPreRoundCapTable,
  buildExistingShareholderCapTable,
  CapTableRowType,
  CommonRowType,
} from "@1984vc/cap-table";
```

## Mathematical Foundations

### Ownership Basics

```
ownershipPct = shares / totalShares
```

All percentages are decimals (0.45 = 45%).

### Pre-Money vs Post-Money Valuation

- **Pre-money** = company value before new investment
- **Post-money** = pre-money + total new investment

Price per share (PPS) for the Series round:

```
PPS = (preMoneyValuation + totalSeriesInvestment) / totalPostMoneyShares
```

### SAFE Conversion

SAFEs convert at the **better** of cap or discount:

```
effectivePPS = min((1 - discount) * seriesPPS, cap / shares)
shares = investment / effectivePPS
```

- **Pre-money SAFEs**: cap applies to pre-money share count (dilutive)
- **Post-money SAFEs** (YC standard): guarantee fixed ownership % of post-money table

### Iterative Solver

`fitConversion` resolves the finite active set of SAFE terms, detects repeated
rounded states, and returns only an exactly reconciled share identity.

## API Reference

### `buildExistingShareholderCapTable(commonStockholders)`

Simplest case — existing shareholders, no rounds.

```typescript
const rows = buildExistingShareholderCapTable([
  { name: "Alice", shares: 8000000, type: CapTableRowType.Common, commonType: CommonRowType.Shareholder },
  { name: "Bob", shares: 2000000, type: CapTableRowType.Common, commonType: CommonRowType.Shareholder },
]);
// rows[0].ownershipPct === 0.8
```

### `buildEstimatedPreRoundCapTable(stakeHolders)`

Estimates ownership when you have SAFEs but no priced round yet.

```typescript
const result = buildEstimatedPreRoundCapTable([
  { name: "Founder", shares: 9000000, type: CapTableRowType.Common, commonType: CommonRowType.Shareholder },
  { name: "Pool", shares: 1000000, type: CapTableRowType.Common, commonType: CommonRowType.UnusedOptions },
  { name: "SAFE", investment: 500000, cap: 8000000, discount: 0, conversionType: "post", type: CapTableRowType.Safe },
]);
// result.common, result.safes, result.total
```

### `fitConversion(preMoneyValuation, commonShares, safes, unusedOptions, targetOptionsPct, seriesInvestments, roundingStrategy?)`

Solves and reconciles share counts at a priced round. `safeConversions` and
`seriesInvestorShares` are authoritative investor-level allocations.

```typescript
const conversion = fitConversion(
  12_000_000,   // pre-money valuation
  9_000_000,    // common shares (excludes unused options)
  safes,        // SAFENote[]
  1_000_000,    // unused options
  0.10,         // target option pool % post-round
  [2_000_000],  // one entry per series investor
);
```

Returns `BestFit`:

```typescript
{
  pps: number               // series round price per share
  ppss: number[]            // per-SAFE conversion price
  convertedSafeShares: number
  seriesShares: number
  preMoneyShares: number
  postMoneyShares: number
  newSharesIssued: number
  totalShares: number
  additionalOptions: number
  totalOptions: number
  totalInvested: number
  totalSeriesInvestment: number
  roundingStrategy: RoundingStrategy
}
```

### `buildPreRoundCapTable(pricedConversion, stakeHolders)`

Shows ownership *before* the round (after SAFE conversion, before series).

### `buildPricedRoundCapTable(pricedConversion, stakeHolders)`

Full post-round cap table with all dilution.

```typescript
const { common, safes, series, refreshedOptionsPool, total } =
  buildPricedRoundCapTable(conversion, [...founders, ...safes, ...seriesInvestors]);
```

### `populateSafeCaps(safeNotes)`

Applies MFN logic by electing a complete later post-money SAFE package at
actual conversion. It never combines a cap and discount from different SAFEs.

### `safeConvert(safe, preShares, postShares, pps)`

Returns the effective conversion price per share for a single SAFE.

### `checkSafeNotesForErrors(safeNotes)`

Validates SAFE inputs. Returns `CapTableOwnershipError | undefined`.

## Type Reference

### Input Types

```typescript
type CommonStockholder = {
  id?: string;
  name: string;
  shares: number;
  type: CapTableRowType.Common;
  commonType: CommonRowType.Shareholder | CommonRowType.UnusedOptions;
};

type SAFENote = {
  id?: string;
  name?: string;
  investment: number;
  cap: number;
  discount: number;
  type: CapTableRowType.Safe;
  conversionType: "pre" | "post" | "mfn" | "yc7p" | "ycmfn";
  sideLetters?: ("mfn" | "pro-rata")[];
};

type SeriesInvestor = {
  id?: string;
  name?: string;
  investment: number;
  type: CapTableRowType.Series;
  round: number;
};

type StakeHolder = CommonStockholder | SAFENote | SeriesInvestor;
```

### Enums

```typescript
enum CapTableRowType {
  Common = "common",
  Safe = "safe",
  Series = "series",
  Total = "total",
  RefreshedOptions = "refreshedOptions",
}

enum CommonRowType {
  Shareholder = "shareholder",
  UnusedOptions = "unusedOptions",
}
```

### Rounding Strategy

```typescript
type RoundingStrategy = {
  roundDownShares?: boolean;   // floor shares (default: true)
  roundShares?: boolean;       // round to nearest
  roundPPSPlaces: number;      // PPS decimal places (default: 5)
};
```

## Error States

| State | Meaning |
|-------|---------|
| `"tbd"` | Can't calculate yet (uncapped SAFE without priced round) |
| `"caveat"` | Calculated with assumptions (MFN cap assigned) |
| `"error"` | Invalid input (investment >= cap) |
