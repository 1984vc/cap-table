import { describe, expect, test } from "vitest";
import { buildEstimatedPreRoundCapTable, buildPreRoundCapTable, fitConversion, DEFAULT_ROUNDING_STRATEGY, CapTableRowType, CommonRowType } from "../../index";
import type { CommonStockholder, SAFENote, SeriesInvestor } from "../../index";
import { crossCheckCapTableResults } from "./utils";

const commonFixture: CommonStockholder[] = [
  {
    shares: 4_500_000,
    name: "Founder 1",
    type: CapTableRowType.Common,
    commonType: CommonRowType.Shareholder,
  },
  {
    shares: 4_500_000,
    name: "Founder 1",
    type: CapTableRowType.Common,
    commonType: CommonRowType.Shareholder,
  },
  {
    shares: 400_000,
    name: "Issued Options",
    type: CapTableRowType.Common,
    commonType: CommonRowType.Shareholder,
  },
  {
    shares: 600_000,
    name: "Unused options",
    type: CapTableRowType.Common,
    commonType: CommonRowType.UnusedOptions,
  },
]

const safeFixture: SAFENote[] = [
  {
    name: "1984",
    investment: 1_000_000,
    discount: 0,
    cap: 10_000_000,
    conversionType: "post",
    type: CapTableRowType.Safe,
  },
  {
    name: "Venture Fund 2",
    investment: 1_000_000,
    discount: 0,
    cap: 20_000_000,
    conversionType: "post",
    type: CapTableRowType.Safe,
  },
]

const safeFixtureWithPreMoney: SAFENote[] = [
  ...safeFixture,
  {
    name: "Pre Investor 1",
    investment: 1_000_000,
    discount: 0,
    cap: 10_000_000,
    conversionType: "pre",
    type: CapTableRowType.Safe,
  },
]

describe("Building an estimated pre-round cap table with common shareholders and SAFEs", () => {
  test("Sanity check our baseline", () => {
    const {common, safes, optionsPool, total} = buildEstimatedPreRoundCapTable([...commonFixture, ...safeFixture]);
    expect(common.length).toEqual(3);
    expect(safes.length).toEqual(2);
    crossCheckCapTableResults([...common, ...safes, optionsPool], total);
  });
  test("Handle pre-round with MFN", () => {
    const safeFixtureMod: SAFENote[] = [...safeFixture]
    safeFixtureMod.push(
      {
        name: "MFN Investor",
        investment: 1_000_000,
        discount: 0,
        cap: 0,
        conversionType: "post",
        sideLetters: ["mfn"],
        type: CapTableRowType.Safe,
      },
      {
        name: "Another Investor 1",
        investment: 1_000_000,
        discount: 0,
        cap: 10_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        name: "Another Investor 2",
        investment: 1_000_000,
        discount: 0,
        cap: 8_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
    )
    const {common, safes, optionsPool, total} = buildEstimatedPreRoundCapTable([...commonFixture, ...safeFixtureMod]);
    crossCheckCapTableResults([...common, ...safes, optionsPool], total);

    expect(common.length).toEqual(3);

    // Ensure MFN cap is correct
    expect(safes[2].cap).toEqual(8_000_000);

  });

  test("Handle pre-round with pre-money conversion", () => {
    const {common, safes, optionsPool, total} = buildEstimatedPreRoundCapTable([...commonFixture, ...safeFixtureWithPreMoney]);
    crossCheckCapTableResults([...common, ...safes, optionsPool], total);

    // We use a "fake" priced round with no additional options to estimate the pre-money conversion
    // As long as the priced-round is at a valuation higher than the cap, this will be an accurate pre-money value
    expect(safes[2].type === CapTableRowType.Safe && safes[2].ownershipPct?.toFixed(5)).toEqual("0.07727");

  });

  test("Handle pre-round with a standalone fixed-percentage (yc7p) SAFE", () => {
    const ycSafe: SAFENote = {
      name: "YC 7%",
      investment: 125_000,
      discount: 0,
      cap: 0,
      conversionType: "yc7p",
      type: CapTableRowType.Safe,
    };
    const {common, safes, optionsPool, total} = buildEstimatedPreRoundCapTable([
      { shares: 9_000_000, name: "Founder", type: CapTableRowType.Common, commonType: CommonRowType.Shareholder },
      ycSafe,
    ]);

    expect(safes[0].ownershipPct).toBeCloseTo(0.07, 8);
    expect(safes[0].ownershipError).toBeUndefined();
    crossCheckCapTableResults([...common, ...safes, optionsPool], total);
  });
});

const seriesFixture: SeriesInvestor[] = [
  {
    name: "1984",
    investment: 3_000_000,
    type: CapTableRowType.Series,
  },
  {
    name: "Venture Fund 2",
    investment: 1_000_000,
    type: CapTableRowType.Series,
  },
]

describe("Building a priced-round pre-round cap table with common shareholders, SAFE notes", () => {
  test("Pre-round cap table with pre-money SAFE should be the same as the estimate", () => {
    const premoney = 25_000_000;
    const commonShares = commonFixture.filter(row => row.type === CapTableRowType.Common && row.commonType === CommonRowType.Shareholder).reduce((acc, row) => acc + row.shares, 0);
    const unusedOptions = commonFixture.filter(row => row.type === CapTableRowType.Common && row.commonType === CommonRowType.UnusedOptions).reduce((acc, row) => acc + row.shares, 0);

    const pricedConversion = fitConversion(premoney, commonShares, safeFixtureWithPreMoney, unusedOptions, 0.0, [
      seriesFixture[0].investment,
      seriesFixture[1].investment,
    ], DEFAULT_ROUNDING_STRATEGY);
    const {common, safes, optionsPool, total} = buildPreRoundCapTable(pricedConversion, [...commonFixture, ...safeFixtureWithPreMoney]);
    expect(common.length).toEqual(3);
    expect(optionsPool.shares).toEqual(600_000);
    expect(safes.length).toEqual(3);

    crossCheckCapTableResults([...common, ...safes, optionsPool], total);

    // Should match our ownership pct from the estimated round because we didn't add additional options
    expect(safes[2].type === CapTableRowType.Safe && safes[2].ownershipPct?.toFixed(8)).toEqual("0.07727277");
  });
});
