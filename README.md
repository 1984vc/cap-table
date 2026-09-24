<img width="50%" height="50%" alt="image" src="https://github.com/user-attachments/assets/3638b04d-26ee-4bfa-a848-3b86302e6060" />


# @1984vc/cap-table

[![npm version](https://img.shields.io/npm/v/%401984vc%2Fcap-table?style=flat-square)](https://www.npmjs.com/package/@1984vc/cap-table)
[![Node.js 18+](https://img.shields.io/badge/node-%3E%3D18-blue?style=flat-square)](https://nodejs.org/)
[![MIT license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

Model your cap table when the math stops being obvious. Run it from an AI agent,
the command line, or a TypeScript application.

A 50/50 founder split is easy. The hard part starts when you add issued
options, an unused pool, several SAFEs with different caps, YC terms, an MFN
side letter, a priced round, and an investor-requested option-pool refresh.
Those terms interact recursively, and small PPS or share-rounding differences
can change the final ownership.

`@1984vc/cap-table` calculates the share counts and ownership. Its CLI prints
JSON for agents and scripts, or a Markdown table you can share with a founder.
It powers the free
[1984 Ventures Cap Table Worksheet](https://startup-finance.1984.vc/).

<details>
<summary>Contents</summary>

- [Quick start](#quick-start)
- [Use it with an AI coding agent](#use-it-with-an-ai-coding-agent)
- [A round with SAFEs and an option pool](#a-round-with-safes-and-an-option-pool)
- [What the agent will need from you](#what-the-agent-will-need-from-you)
- [Choose the right command](#choose-the-right-command)
- [Understand the output](#understand-the-output)
- [Use the library directly](#use-the-library-directly)
- [Model boundaries](#model-boundaries)
- [Development](#development)
- [Staged releases](#staged-releases)

</details>

## Quick start

No clone or local install is needed to try the CLI. This example prints a
Markdown report for two founders:

```bash
npx @1984vc/cap-table existing '{"common":[{"name":"Founder A","shares":8000000},{"name":"Founder B","shares":2000000}]}' --format markdown
```

```md
# Existing cap table

| Holder | Shares | Ownership |
| --- | ---: | ---: |
| Founder A | 8,000,000 | 80.00% |
| Founder B | 2,000,000 | 20.00% |
| Options Pool | 0 | 0.00% |
| Total | 10,000,000 | 100.00% |

Generated with [@1984vc/cap-table](https://github.com/1984vc/cap-table).

Learn more: [Cap Table 101](https://1984.vc/docs/founders-handbook/cap-table-101.md) · [SAFE Side Letters](https://1984.vc/docs/founders-handbook/safe-side-letters.md).
```

Leave off `--format markdown` to get JSON with exact values for an agent or
application. [Cap Table 101](https://1984.vc/docs/founders-handbook/cap-table-101.md)
explains the ownership concepts behind the numbers.

## Use it with an AI coding agent

### Install the cap-table skill

Install the skill so a compatible agent knows what to ask, which command to
run, and how to explain the result:

```bash
npx skills add 1984vc/cap-table
```

Then ask:

```text
Help me model our next financing with @1984vc/cap-table. The two founders
split their founder shares 45/55. We reserved 10% for employee options;
one early employee has been granted 2%. We have the standard 
YC SAFEs, plus $3M in other SAFEs at a $20M cap. We're considering
raising $6M at a $40M post, with an options refresh to 10%.

Help me understand how this affecty my ownership percentage.
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

## A round with SAFEs and an option pool

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

Run the complete scenario (add `--format markdown` after the JSON to print a
shareable report):

<details>
<summary>Show the full priced-round command</summary>


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

</details>

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
| Options Pool | 1,695,354 | 10.00% |
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

For `pre-round` and `priced-round`, the default `targetOptionsPct` is 0.10.
Set it explicitly if your round has a different pool target, including `0`.

The CLI returns JSON by default so agents can inspect exact values and
calculation caveats. For a founder-facing table with estimate notes and links
to 1984's guides, request a Markdown report:

```bash
npx @1984vc/cap-table priced-round ./scenario.json --format markdown
```

## Understand the output

A priced-round JSON result has two top-level fields, `conversion` and
`capTable`:

- `conversion` records the PPS, controlling SAFE terms, investor allocations,
  pool increase, and exact reconciled share totals.
- `common` contains founders, employees, and other issued opening shares.
- `safes` contains each SAFE's effective terms and converted shares.
- `series` contains the investors purchasing shares in this financing.
- `optionsPool` is the unissued pool reserved for future grants.
- `total` reconciles all rows to 100%.

`existing` returns a cap table directly. `estimated-pre-round` can mark
ownership with an `ownershipError` of `caveat` or `tbd` when terms are not yet
known; the Markdown report shows those warnings rather than treating an
estimate as final ownership. `pre-round` returns `conversion` and `capTable`
but does not include the new Series shares or refreshed pool in its table.

Share counts are floored and PPS is rounded up to five decimal places by
default, matching common legal spreadsheet conventions. Invalid or unsupported
transactions fail with a stable error code instead of returning a plausible but
incorrect cap table.

## Use the library directly

Applications can call the same engine from TypeScript. The library API requires
explicit row types; the CLI fills them in for JSON input.

```bash
npm install @1984vc/cap-table
```

```typescript
import {
  buildExistingShareholderCapTable,
  CapTableRowType,
  CommonRowType,
} from "@1984vc/cap-table";

const capTable = buildExistingShareholderCapTable([
  { name: "Founder A", shares: 8_000_000, type: CapTableRowType.Common, commonType: CommonRowType.Shareholder },
  { name: "Founder B", shares: 2_000_000, type: CapTableRowType.Common, commonType: CommonRowType.Shareholder },
]);

console.log(capTable.common[0].ownershipPct); // 0.8
```

| Function | Purpose |
|---|---|
| `buildExistingShareholderCapTable` | Calculate the current ownership snapshot |
| `buildEstimatedPreRoundCapTable` | Estimate SAFE ownership without priced-round terms |
| `fitConversion` | Solve SAFE conversions, PPS, investor shares, and the pool refresh |
| `buildPreRoundCapTable` | Build exact ownership immediately before new money |
| `buildPricedRoundCapTable` | Build the fully diluted post-financing cap table |

See the skill's [library API reference](skills/cap-table/references/library-api.md)
for the solver arguments and types used in priced-round calculations.

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

## Staged releases

Releases use [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
and [staged publishing](https://docs.npmjs.com/staged-publishing/).
In the settings for [`@1984vc/cap-table`](https://www.npmjs.com/package/@1984vc/cap-table),
add a GitHub Actions trusted publisher with:

| npm setting | Value |
|---|---|
| Organization or user | `1984vc` |
| Repository | `cap-table` |
| Workflow filename | `publish.yml` |
| Environment name | Leave blank |
| Allowed actions | `npm stage publish` only; do not allow `npm publish` |

Once the workflow is on `main`, tag the release commit as `v0.5.0` (or the
`v`-prefixed version in `package.json`) and push the tag. The workflow checks
that the tag and package version agree, runs the tests, builds `dist`, and
stages the package on npm using GitHub's OIDC identity. **The tag does not make
the version available for installation.** Review it in npm's **Staged Packages**
tab or with `npm stage list @1984vc/cap-table`, then approve it on npm with 2FA
when ready. No npm token is needed in GitHub secrets; the staged release stays
pending until a maintainer approves it.

## Disclaimer

This project is an educational modeling tool, not legal, tax, or investment
advice. Work with qualified counsel when issuing securities or completing a
financing.

## License

MIT — [1984 Ventures](https://1984.vc/)
