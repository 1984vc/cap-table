# @1984vc/cap-table

Understand who owns what today—and what happens to everyone’s ownership when
you raise your next round.

This is the calculation engine behind the free
[1984 Ventures Cap Table Worksheet](https://startup-finance.1984.vc/). It is
designed for founders modeling an early-stage cap table with issued shares,
unused options, SAFEs, a priced financing, and an option-pool refresh.

The examples below come from
[Cap Table 101](https://1984.vc/docs/founders-handbook/cap-table-101). The
[original Markdown](https://1984.vc/docs/founders-handbook/cap-table-101.md)
is also available if you want the full explanation of the math.

## What can I model?

The library helps answer practical questions such as:

- What percentage does each founder own today?
- How much will a seed or Series A investor own?
- How much will the financing dilute the founders?
- What happens when the investor asks for a 10% option pool?
- What will outstanding SAFEs own before and after the priced round?
- How much of the option pool is still available for future hires?

It models your current ownership snapshot plus one upcoming financing event.
For a later round, use the post-financing shares as the next starting cap table.
It is not a historical financing ledger or a liquidation-waterfall model.

## Start with your current cap table

Two founders each receive 1,000,000 shares, so they each own 50%:

```bash
npx @1984vc/cap-table existing '{
  "common": [
    { "name": "Founder A", "shares": 1000000 },
    { "name": "Founder B", "shares": 1000000 }
  ]
}'
```

| Holder | Shares | Ownership |
|---|---:|---:|
| Founder A | 1,000,000 | 50% |
| Founder B | 1,000,000 | 50% |
| Total | 2,000,000 | 100% |

The command returns structured JSON with `common`, `optionsPool`, and `total`
so it can feed a spreadsheet, application, or AI assistant.

## Model a seed round

Now suppose an investor puts in $2 million at an $8 million pre-money
valuation. The post-money valuation is $10 million, so the investor buys 20%:

```bash
npx @1984vc/cap-table priced-round '{
  "preMoneyValuation": 8000000,
  "common": [
    { "name": "Founder A", "shares": 1000000 },
    { "name": "Founder B", "shares": 1000000 }
  ],
  "seriesInvestors": [
    { "name": "Seed Investor", "investment": 2000000 }
  ],
  "targetOptionsPct": 0
}'
```

The round price is $4 per share and the investor receives 500,000 shares:

| Holder | Before | After |
|---|---:|---:|
| Founder A | 50% | 40% |
| Founder B | 50% | 40% |
| Seed Investor | — | 20% |

The investor owns 20%, and each founder’s original stake is diluted by 20%:
`50% × (1 - 20%) = 40%`.

## See the effect of an option-pool request

Investors often ask the company to reserve options for future hires as part of
the financing. Set `targetOptionsPct` to the desired post-financing pool:

```bash
npx @1984vc/cap-table priced-round '{
  "preMoneyValuation": 8000000,
  "common": [
    { "name": "Founder A", "shares": 1000000 },
    { "name": "Founder B", "shares": 1000000 }
  ],
  "seriesInvestors": [
    { "name": "Seed Investor", "investment": 2000000 }
  ],
  "targetOptionsPct": 0.10
}'
```

| Holder | Ownership after financing |
|---|---:|
| Founder A | 35% |
| Founder B | 35% |
| Seed Investor | 20% |
| Available option pool | 10% |

The investor still receives 20%, but the founders absorb the additional pool
dilution. This is why experienced founders negotiate ownership and option-pool
size—not valuation alone.

Granted employee shares belong in `common` like any other issued shares.
Unissued options should be marked as the available pool:

```json
{
  "name": "Available Option Pool",
  "shares": 250000,
  "commonType": "unusedOptions"
}
```

The output always reports those unissued shares separately as `optionsPool`.
Moving a grant from the available pool to an employee does not increase the
fully diluted share count and therefore does not dilute the other holders.

## Add outstanding SAFEs

If you have raised on SAFEs but do not yet know the terms of the next priced
round, use `estimated-pre-round`:

```bash
npx @1984vc/cap-table estimated-pre-round '{
  "common": [
    { "name": "Founder A", "shares": 1000000 },
    { "name": "Founder B", "shares": 1000000 }
  ],
  "safes": [
    {
      "name": "Seed SAFE",
      "investment": 500000,
      "cap": 5000000,
      "conversionType": "post"
    }
  ]
}'
```

A capped post-money SAFE’s estimated pre-round ownership is generally its
investment divided by its cap—in this example, 10%. Discounts and MFN terms may
depend on the future round price, so estimates that rely on assumptions include
a `caveat`.

Once the priced-round valuation and investment are known, use `pre-round` to
see ownership immediately before the new money and `priced-round` to see the
fully diluted ownership after the financing.

## Choose a command

| Command | Question it answers |
|---|---|
| `existing` | Who owns the company today? |
| `estimated-pre-round` | What might the SAFEs own before round terms are known? |
| `pre-round` | What do existing holders and converting SAFEs own immediately before the new investment? |
| `priced-round` | What does the fully diluted cap table look like after the financing and pool refresh? |

Input can be supplied as a JSON argument, piped through stdin, or read from a
`.json` file:

```bash
npx @1984vc/cap-table priced-round ./scenario.json
cat scenario.json | npx @1984vc/cap-table priced-round
```

Run `npx @1984vc/cap-table --help` for the command summary.

## Understanding the result

A priced-round command returns:

```json
{
  "conversion": {
    "pps": 4,
    "totalShares": 2500000,
    "additionalOptions": 0
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

- `common` contains founders, employees, and other issued opening shares.
- `safes` contains the shares issued when SAFEs convert.
- `series` contains investors purchasing shares in this financing.
- `optionsPool` contains unissued shares reserved for future grants.
- `total` reconciles all shares to 100%.
- `conversion` explains the round PPS, new shares, SAFE conversions, and pool
  increase used to produce the cap table.

Share counts are floored and PPS is rounded up to five decimal places by
default, matching common legal spreadsheet conventions. Invalid or unsupported
transactions fail with a stable error code instead of returning a plausible but
incorrect cap table.

## Use it from TypeScript

```bash
npm install @1984vc/cap-table
```

```typescript
import {
  CapTableRowType,
  CommonRowType,
  buildPricedRoundCapTable,
  fitConversion,
} from "@1984vc/cap-table";

const openingCapTable = [
  {
    name: "Founder A",
    shares: 1_000_000,
    type: CapTableRowType.Common,
    commonType: CommonRowType.Shareholder,
  },
  {
    name: "Founder B",
    shares: 1_000_000,
    type: CapTableRowType.Common,
    commonType: CommonRowType.Shareholder,
  },
];

const conversion = fitConversion(
  8_000_000,   // pre-money valuation
  2_000_000,   // issued opening shares
  [],          // outstanding SAFEs
  0,           // currently unused options
  0.10,        // desired post-financing option pool
  [2_000_000], // investments in this priced round
);

const result = buildPricedRoundCapTable(conversion, [
  ...openingCapTable,
  {
    name: "Seed Investor",
    investment: 2_000_000,
    type: CapTableRowType.Series,
  },
]);
```

The primary library functions are:

| Function | Purpose |
|---|---|
| `buildExistingShareholderCapTable` | Calculate the current ownership snapshot |
| `buildEstimatedPreRoundCapTable` | Estimate SAFE ownership without priced-round terms |
| `fitConversion` | Solve the PPS, SAFE conversions, pool refresh, and investor shares |
| `buildPreRoundCapTable` | Build the exact cap table immediately before new money |
| `buildPricedRoundCapTable` | Build the fully diluted post-financing cap table |

All public inputs are validated. Failures throw `CalculationError` with one of
these codes:

- `INVALID_INPUT`
- `UNSUPPORTED_TERMS`
- `CONFLICTING_TRANSACTION_DATA`
- `UNRECONCILED_ROUNDING`

Pro-rata participation is not yet represented by the input model and is
rejected rather than silently omitted.

## Install the agent skill

The repository includes a skill that teaches coding agents how to gather cap
table inputs, run the calculator, and explain the result in founder-friendly
language:

```bash
npx skills add 1984vc/cap-table
```

The skill uses the hosted
[Cap Table 101 Markdown](https://1984.vc/docs/founders-handbook/cap-table-101.md)
as its founder-facing reference.

## Migrating to the unified output

- `existing` now returns an object; read its rows from `result.common`.
- `optionsPool` replaces `refreshedOptionsPool` and is present in every view.
- Input rows with `commonType: "unusedOptions"` are aggregated into
  `optionsPool` and are not returned in `common`.
- `SeriesInvestor.round` has been removed because one call models one upcoming
  financing event.
- Invalid transactions throw `CalculationError`; builders no longer return
  ownership rows with `type: "error"`.

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
