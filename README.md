# @1984vc/cap-table

Model startup cap table ownership across funding events — SAFE note conversions, priced rounds, option pools, and dilution.

Calculations validate all public inputs and throw `CalculationError` with a
stable `code` (`INVALID_INPUT`, `UNSUPPORTED_TERMS`,
`CONFLICTING_TRANSACTION_DATA`, or `UNRECONCILED_ROUNDING`). Pro-rata side
letters are rejected because the current model has no participation amount.

Used by the [1984 Ventures Cap Table Worksheet](https://startup-finance.1984.vc/), a free web tool for founders.

## CLI

Run instantly with `npx` — no install needed:

```bash
npx @1984vc/cap-table priced-round '{
  "preMoneyValuation": 12000000,
  "common": [
    { "name": "Founder 1", "shares": 4500000 },
    { "name": "Founder 2", "shares": 4500000 },
    { "name": "Options Pool", "shares": 1000000, "commonType": "unusedOptions" }
  ],
  "safes": [
    { "name": "Seed SAFE", "investment": 1000000, "cap": 10000000, "discount": 0, "conversionType": "post" }
  ],
  "seriesInvestors": [
    { "name": "Lead Investor", "investment": 2000000 }
  ],
  "targetOptionsPct": 0.10
}'
```

Returns JSON with `conversion` (PPS, share counts, dilution details) and `capTable` (full ownership breakdown).

**Commands:**

| Command | Use case |
|---------|----------|
| `existing` | Just existing shareholders, no SAFEs or rounds |
| `estimated-pre-round` | Have SAFEs but no priced round — estimates ownership |
| `pre-round` | Know the round valuation — shows pre-money ownership |
| `priced-round` | Full round with SAFE conversions, series investors, option pool |

Input can be a JSON argument, piped via stdin, or a `.json` file path. The CLI auto-fills type fields — you only need to pass `name` + `shares` (or `name` + `investment` for investors). See `skills/cap-table/SKILL.md` for the complete input/output schema.

```bash
npx @1984vc/cap-table --help
```

### Agent Skill

Install as an agent skill so coding agents (Claude Code, Cursor, etc.) know how to use the CLI:

```bash
npx skills add 1984vc/cap-table
```

## Install (Library)

```bash
npm install @1984vc/cap-table
```

## Quick Start

```typescript
import {
  fitConversion,
  buildPricedRoundCapTable,
  CapTableRowType,
  CommonRowType,
} from "@1984vc/cap-table";

// 1. Define your current shareholders
const founders = [
  { name: "Founder 1", shares: 4_500_000, type: CapTableRowType.Common, commonType: CommonRowType.Shareholder },
  { name: "Founder 2", shares: 4_500_000, type: CapTableRowType.Common, commonType: CommonRowType.Shareholder },
  { name: "Options Pool", shares: 1_000_000, type: CapTableRowType.Common, commonType: CommonRowType.UnusedOptions },
];

// 2. Define outstanding SAFEs
const safes = [
  { name: "Seed SAFE", investment: 1_000_000, cap: 10_000_000, discount: 0, conversionType: "post", type: CapTableRowType.Safe },
];

// 3. Solve for share counts at a priced Series A
const conversion = fitConversion(
  12_000_000,   // pre-money valuation
  9_000_000,    // total common shares (founders + issued options)
  safes,
  1_000_000,    // unused options
  0.10,         // target options pool percentage post-round
  [2_000_000],  // series A investment amounts
);

// 4. Build the full cap table
const { common, safes: safeRows, series, refreshedOptionsPool, total } =
  buildPricedRoundCapTable(conversion, [...founders, ...safes, {
    name: "Lead Investor",
    investment: 2_000_000,
    type: CapTableRowType.Series,
    round: 0,
  }]);
```

## Concepts

### SAFE Conversion Types

| `conversionType` | Description |
|---|---|
| `"pre"` | Pre-money SAFE — converts on pre-money valuation |
| `"post"` | Post-money SAFE — converts on post-money (YC standard) |
| `"mfn"` | MFN (Most Favored Nation) — no cap, gets lowest subsequent cap |
| `"yc7p"` | Fixed 7% — measured after SAFE conversions and before new Series shares and the pool increase |
| `"ycmfn"` | YC MFN variant (legacy) |

### MFN Side Letters

SAFEs with `sideLetters: ["mfn"]` elect one complete later post-money SAFE package (cap and
discount). Packages are compared at actual conversion PPS; ties select the
earliest later SAFE. Adoption of a later pre-money package is unsupported.

### Rounding

Share counts and price-per-share (PPS) are rounded to match legal standards. The default strategy floors shares and rounds PPS to 5 decimal places. Override via `RoundingStrategy`:

```typescript
const strategy = {
  roundDownShares: true,   // floor shares (default)
  roundPPSPlaces: 5,       // PPS decimal places (default)
};
```

### Ownership Errors

Some rows can't be fully calculated and are flagged rather than crashed:

- **`"tbd"`** — Needs more info (e.g. uncapped SAFE before a priced round)
- **`"caveat"`** — Calculated with assumptions (e.g. MFN cap assigned)
- **`"error"`** — Invalid input (e.g. investment ≥ cap)

## API Reference

### Cap Table Builders

#### `buildExistingShareholderCapTable(stockholders)`

Calculates ownership percentages for existing shareholders with no round.

```typescript
import { buildExistingShareholderCapTable } from "@1984vc/cap-table";

const rows = buildExistingShareholderCapTable(founders);
// rows[0].ownershipPct === 0.45
```

---

#### `buildEstimatedPreRoundCapTable(stakeHolders, roundingStrategy?)`

Estimates SAFE ownership before a priced round is known. Marks uncapped SAFEs as `"tbd"`.

```typescript
const { common, safes, total } = buildEstimatedPreRoundCapTable([
  ...founders,
  ...safes,
]);
```

Returns `{ common: CommonCapTableRow[], safes: SafeCapTableRow[], total: TotalCapTableRow }`.

---

#### `buildPreRoundCapTable(pricedConversion, stakeHolders)`

Builds the pre-round view using a solved `BestFit` from `fitConversion()`.

```typescript
const { common, safes, total } = buildPreRoundCapTable(conversion, stakeHolders);
```

---

#### `buildPricedRoundCapTable(pricedConversion, stakeHolders)`

Builds the full cap table including the new priced round and refreshed options pool.

```typescript
const { common, safes, series, refreshedOptionsPool, total, error } =
  buildPricedRoundCapTable(conversion, stakeHolders);
```

---

### Conversion Solver

#### `fitConversion(preMoneyValuation, commonShares, safes, unusedOptions, targetOptionsPct, seriesInvestments, roundingStrategy?)`

Solves the active conversion terms and reconciles legal PPS/share rounding to
an exact share identity. A result includes `safeConversions` and
`seriesInvestorShares`; cap-table builders use these allocations directly.

```typescript
const conversion = fitConversion(
  12_000_000,   // pre-money valuation
  9_000_000,    // common shares outstanding (excluding unused options)
  safes,        // SAFENote[]
  1_000_000,    // unused options
  0.10,         // target option pool % post-round
  [2_000_000],  // one entry per series investor (or total)
);
```

Returns a `BestFit` object:

```typescript
{
  pps: number               // series round price per share
  ppss: number[]            // per-SAFE conversion price
  convertedSafeShares: number
  seriesShares: number
  preMoneyShares: number    // fully diluted pre-money share count
  postMoneyShares: number
  newSharesIssued: number
  totalShares: number
  additionalOptions: number // new options beyond existing pool
  totalOptions: number
  totalInvested: number
  totalSeriesInvestment: number
  roundingStrategy: RoundingStrategy
}
```

---

### SAFE Utilities

#### `populateSafeCaps(safeNotes)`

Applies MFN logic — assigns each uncapped MFN SAFE the lowest cap from subsequent capped SAFEs.

```typescript
const processedSafes = populateSafeCaps(rawSafes);
```

#### `safeConvert(safe, preShares, postShares, pps)`

Returns the effective conversion price per share for a single SAFE.

#### `checkSafeNotesForErrors(safeNotes)`

Validates SAFE inputs. Returns a `CapTableOwnershipError` or `undefined`.

---

### Number Formatting

```typescript
import { stringToNumber, formatUSDWithCommas, shortenedUSD } from "@1984vc/cap-table";

stringToNumber("$1.5M")          // → 1_500_000
stringToNumber("1,000,000")      // → 1_000_000
formatUSDWithCommas(1_234_567)   // → "$1,234,567"
shortenedUSD(1_500_000)          // → "$1.5M"
shortenedUSD(50_000)             // → "$50K"
```

---

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
  round: number; // 0-indexed round number
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

---

## Development

```bash
npm install
npm run build      # tsup → dist/
npm test           # vitest
```

## License

MIT — [1984 Ventures](https://1984.vc)
