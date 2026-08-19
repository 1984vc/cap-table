import { describe, expect, test } from "vitest";
import { buildPricedRoundCapTable, DEFAULT_ROUNDING_STRATEGY, fitConversion, CapTableRowType, CommonRowType } from "../../index";
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

describe("Building a priced-round cap table with common shareholders, SAFE notes, and priced round investors", () => {
  test("Sanity check our baseline", () => {
    const premoney = 25_000_000;
    const commonShares = commonFixture.filter(row => row.type === CapTableRowType.Common && row.commonType === CommonRowType.Shareholder).reduce((acc, row) => acc + row.shares, 0);
    const unusedOptions = commonFixture.filter(row => row.type === CapTableRowType.Common && row.commonType === CommonRowType.UnusedOptions).reduce((acc, row) => acc + row.shares, 0);

    const pricedConversion = fitConversion(premoney, commonShares, safeFixture, unusedOptions, 0.1, [
      seriesFixture[0].investment,
      seriesFixture[1].investment,
    ], DEFAULT_ROUNDING_STRATEGY);
    const {common, safes, series, optionsPool, total} = buildPricedRoundCapTable(pricedConversion, [...commonFixture, ...safeFixture, ...seriesFixture]);
    expect(common.length).toEqual(3); // We drop unused options from the common stockholders and add it back as Refreshed Options
    expect(safes.length).toEqual(2);
    expect(series.length).toEqual(2);

    crossCheckCapTableResults([...common, ...safes, ...series, optionsPool], total);
  });

  test("an MFN SAFE adopts the lowest subsequent post-money SAFE cap", () => {
    const documentedMFN: SAFENote[] = [
      {
        name: "YC MFN",
        investment: 375_000,
        discount: 0,
        cap: 0,
        conversionType: "post",
        sideLetters: ["mfn"],
        type: CapTableRowType.Safe,
      },
      {
        name: "Later SAFE",
        investment: 5_000_000,
        discount: 0,
        cap: 30_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
    ];
    const explicitCapMFN: SAFENote[] = documentedMFN.map((safe, index) =>
      index === 0 ? { ...safe, cap: 30_000_000, sideLetters: [] } : safe,
    );

    const calculate = (safes: SAFENote[]) =>
      fitConversion(50_000_000, 10_000_000, safes, 0, 0.1, [10_000_000]);

    const documentedResult = calculate(documentedMFN);
    const explicitResult = calculate(explicitCapMFN);
    const common: CommonStockholder[] = [
      {
        name: "Founder 1",
        shares: 5_000_000,
        type: CapTableRowType.Common,
        commonType: CommonRowType.Shareholder,
      },
      {
        name: "Founder 2",
        shares: 5_000_000,
        type: CapTableRowType.Common,
        commonType: CommonRowType.Shareholder,
      },
    ];
    const capTable = buildPricedRoundCapTable(documentedResult, [...common, ...documentedMFN]);

    expect(documentedResult.ppss[0]).toBe(explicitResult.ppss[0]);
    expect(documentedResult.totalShares).toBe(explicitResult.totalShares);
    expect(capTable.safes[0].cap).toBe(30_000_000);
  });
});
