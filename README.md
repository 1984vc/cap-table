# @1984vc/cap-table

Model your cap table when the math stops being obvious.

A 50/50 founder split is easy. The hard part starts when you add issued
options, an unused pool, several SAFEs with different caps, YC terms, an MFN
side letter, a priced round, and an investor-requested option-pool refresh.
Those terms interact recursively, and small PPS or share-rounding differences
can change the final ownership.

`@1984vc/cap-table` gives an AI agent or application a deterministic,
well-tested calculation engine for that work. It powers the free
[1984 Ventures Cap Table Worksheet](https://startup-finance.1984.vc/).

## Use it with an AI coding agent

### Install the cap-table skill

Install the skill so a compatible agent knows what to ask, which command to
run, and how to explain the result:

```bash
npx skills add 1984vc/cap-table
```

Then ask:

```text
Help me model my cap table. I have founders, an existing option pool,
several SAFEs, and proposed terms for my next priced round.
```

The skill uses the hosted
[Cap Table 101 Markdown](https://1984.vc/docs/founders-handbook/cap-table-101.md)
for founder-facing concepts and uses this package for the actual math.

### Paste this into a CLI agent

You can also point Codex, Claude Code, Cursor, or another command-line coding
agent directly at the project:

```text
Use https://github.com/1984vc/cap-table to help me model my cap table.
Ask me for my current shareholders and share counts, issued and unused
options, every SAFE in chronological order, and the proposed priced-round
and option-pool terms. Use the package's npx CLI for the calculations,
then explain the ownership before and after the financing.
```

The agent can run the calculator without cloning or installing the library:

```bash
npx @1984vc/cap-table priced-round ./scenario.json
```

## The kind of scenario this tool is for

Consider a company with:

- Two founders holding 4,500,000 shares each.
- 250,000 issued employee options.
- 750,000 still available in the option pool.
- Five outstanding SAFEs:
  - YC 7% for $125,000.
  - YC MFN for $375,000.
  - $750,000 at a $10M post-money cap.
  - $475,000 at a $10M post-money cap.
  - $500,000 at a $13M post-money cap.
- A proposed $4M priced round at a $25M pre-money valuation.
- A request to refresh the available option pool to 10% after the financing.

Before the SAFEs and priced round, the founders each own 45% of the fully
diluted opening cap table. What they own afterward is not a one-line dilution
calculation: the SAFE shares, round PPS, Series shares, and pool refresh all
depend on one another.

Run the complete scenario:

```bash
npx @1984vc/cap-table priced-round '{
  "preMoneyValuation": 25000000,
  "common": [
    { "name": "Founder A", "shares": 4500000 },
    { "name": "Founder B", "shares": 4500000 },
    { "name": "Issued Options", "shares": 250000 },
    {
      "name": "Available Option Pool",
      "shares": 750000,
      "commonType": "unusedOptions"
    }
  ],
  "safes": [
    {
      "name": "YC 7%",
      "investment": 125000,
      "conversionType": "yc7p"
    },
    {
      "name": "YC MFN",
      "investment": 375000,
      "conversionType": "post",
      "sideLetters": ["mfn"]
    },
    {
      "name": "1984 Ventures",
      "investment": 750000,
      "cap": 10000000,
      "conversionType": "post"
    },
    {
      "name": "Benchmark",
      "investment": 475000,
      "cap": 10000000,
      "conversionType": "post"
    },
    {
      "name": "Follow-on SAFE",
      "investment": 500000,
      "cap": 13000000,
      "conversionType": "post"
    }
  ],
  "seriesInvestors": [
    { "name": "Series A Lead", "investment": 4000000 }
  ],
  "targetOptionsPct": 0.10
}'
```

The reconciled result is:

| Holder | Final shares | Final ownership |
|---|---:|---:|
| Founder A | 4,500,000 | 26.54% |
| Founder B | 4,500,000 | 26.54% |
| Issued Options | 250,000 | 1.47% |
| YC 7% | 956,884 | 5.64% |
| YC MFN | 512,610 | 3.02% |
| 1984 Ventures | 1,025,220 | 6.05% |
| Benchmark | 649,306 | 3.83% |
| Follow-on SAFE | 525,756 | 3.10% |
| Series A Lead | 2,338,415 | 13.79% |
| Available Option Pool | 1,695,354 | 10.00% |
| **Total** | **16,953,545** | **100.00%** |

The useful answers are not just the final percentages:

- The round PPS is `$1.71056` after solving all conversions and the pool refresh.
- The YC 7% SAFE receives exactly 7% immediately before the new Series shares
  and pool increase dilute it to 5.64% post-financing.
- The YC MFN elects the later $10M post-money SAFE package.
- Refreshing the existing 750,000-share pool to 10% requires 945,354 additional
  options.
- The two founders move from 90% combined ownership to 53.09%.
- The final legal share counts reconcile exactly to 16,953,545 shares.

This is the division of labor that works well with AI: let the agent gather the
facts, explore scenarios, and explain the tradeoffs; let a tested financial
model perform the recursive calculation and legal rounding.

## What the agent will need from you

For the best result, have these inputs available:

1. Every current holder and their issued shares.
2. Issued employee options and the unused option pool as separate amounts.
3. Every SAFE in chronological order, including investment, cap, discount,
   conversion type, and side letters.
4. The proposed pre-money valuation and each new investor's check size.
5. The target post-financing option-pool percentage.

SAFE order matters for MFN elections. If a term is unknown, say so—the
`estimated-pre-round` command marks assumptions and unavailable calculations
instead of presenting them as exact.

## Choose the right command

| Command | Use it when |
|---|---|
| `existing` | You want a clean view of current issued ownership and the available pool |
| `estimated-pre-round` | SAFEs are outstanding but the priced-round terms are not known |
| `pre-round` | The next-round terms are known and you want ownership after SAFE conversion but before new money |
| `priced-round` | You want the complete post-financing cap table, including Series shares and the refreshed pool |

Pass input as inline JSON, through stdin, or from a file:

```bash
npx @1984vc/cap-table priced-round ./scenario.json
cat scenario.json | npx @1984vc/cap-table priced-round
npx @1984vc/cap-table --help
```

## Understand the output

A priced-round calculation returns:

```json
{
  "conversion": {
    "pps": 1.71056,
    "safeConversions": [],
    "seriesInvestorShares": [],
    "additionalOptions": 945354,
    "totalShares": 16953545
  },
  "capTable": {
    "common": [],
    "safes": [],
    "series": [],
    "optionsPool": {},
    "total": {}
  }
}
```

- `conversion` records the PPS, controlling SAFE terms, investor allocations,
  pool increase, and exact reconciled share totals.
- `common` contains founders, employees, and other issued opening shares.
- `safes` contains each SAFE's effective terms and converted shares.
- `series` contains the investors purchasing shares in this financing.
- `optionsPool` is the unissued pool reserved for future grants.
- `total` reconciles all rows to 100%.

Share counts are floored and PPS is rounded up to five decimal places by
default, matching common legal spreadsheet conventions. Invalid or unsupported
transactions fail with a stable error code instead of returning a plausible but
incorrect cap table.

## Use the library directly

Applications can call the same engine from TypeScript:

```bash
npm install @1984vc/cap-table
```

```typescript
import {
  buildPricedRoundCapTable,
  fitConversion,
} from "@1984vc/cap-table";

const conversion = fitConversion(
  preMoneyValuation,
  issuedShares,
  safes,
  unusedOptions,
  targetOptionsPct,
  seriesInvestments,
);

const capTable = buildPricedRoundCapTable(conversion, stakeholders);
```

| Function | Purpose |
|---|---|
| `buildExistingShareholderCapTable` | Calculate the current ownership snapshot |
| `buildEstimatedPreRoundCapTable` | Estimate SAFE ownership without priced-round terms |
| `fitConversion` | Solve SAFE conversions, PPS, investor shares, and the pool refresh |
| `buildPreRoundCapTable` | Build exact ownership immediately before new money |
| `buildPricedRoundCapTable` | Build the fully diluted post-financing cap table |

All public inputs are validated. Failures throw `CalculationError` with
`INVALID_INPUT`, `UNSUPPORTED_TERMS`, `CONFLICTING_TRANSACTION_DATA`, or
`UNRECONCILED_ROUNDING`.

## Model boundaries

- One calculation models the current cap table plus one upcoming financing
  event. Use its final shares as the opening snapshot for a later round.
- Pro-rata participation is not yet represented and is rejected rather than
  silently omitted.
- The package models ownership and dilution, not liquidation preferences,
  waterfall proceeds, taxes, or legal compliance.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
```

## Disclaimer

This project is an educational modeling tool, not legal, tax, or investment
advice. Work with qualified counsel when issuing securities or completing a
financing.

## License

MIT — [1984 Ventures](https://1984.vc/)
