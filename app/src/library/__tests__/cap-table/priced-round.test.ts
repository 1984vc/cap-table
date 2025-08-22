import { describe, expect, test } from "@jest/globals";
import { buildPricedRoundCapTable } from "@library/cap-table";
import { DEFAULT_ROUNDING_STRATEGY, fitConversion } from "@library/conversion-solver";
import { crossCheckCapTableResults } from "./utils";
import { CommonStockholder, CapTableRowType, CommonRowType, SAFENote, SeriesInvestor } from "@library/cap-table/types";

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
    round: 1,
  },
  {
    name: "Venture Fund 2",
    investment: 1_000_000,
    type: CapTableRowType.Series,
    round: 1,
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
    const {common, safes, series, refreshedOptionsPool, total} = buildPricedRoundCapTable(pricedConversion, [...commonFixture, ...safeFixture, ...seriesFixture]);
    expect(common.length).toEqual(3); // We drop unused options from the common stockholders and add it back as Refreshed Options
    expect(safes.length).toEqual(2);
    expect(series.length).toEqual(2);
    
    crossCheckCapTableResults([...common, ...safes, ...series, refreshedOptionsPool], total);
  });
});