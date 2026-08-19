import { describe, expect, test } from "vitest";
import {
  buildExistingShareholderCapTable,
  buildPreRoundCapTable,
  buildPricedRoundCapTable,
  CapTableRowType,
  CommonRowType,
  fitConversion,
  safeConvert,
} from "../index";
import type { CommonStockholder, SAFENote, SeriesInvestor } from "../index";

const founder = (shares = 10_000_000): CommonStockholder => ({
  name: "Founders",
  shares,
  type: CapTableRowType.Common,
  commonType: CommonRowType.Shareholder,
});

const safe = (overrides: Partial<SAFENote> = {}): SAFENote => ({
  name: "SAFE",
  investment: 1_000_000,
  cap: 10_000_000,
  discount: 0,
  conversionType: "post",
  type: CapTableRowType.Safe,
  ...overrides,
});

const series = (investment = 5_000_000): SeriesInvestor => ({
  name: "Series A",
  investment,
  type: CapTableRowType.Series,
});

const expectClose = (actual: number, expected: number, tolerance = 0.000_01) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

describe("priced-round financial identities", () => {
  test("matches the Cap Table 101 seed-round example", () => {
    const founders = [
      { ...founder(1_000_000), name: "Founder A" },
      { ...founder(1_000_000), name: "Founder B" },
    ];
    const investor = series(2_000_000);
    const conversion = fitConversion(8_000_000, 2_000_000, [], 0, 0, [2_000_000]);
    const capTable = buildPricedRoundCapTable(conversion, [...founders, investor]);

    expect(conversion.pps).toBe(4);
    expect(capTable.common.map((row) => row.ownershipPct)).toEqual([0.4, 0.4]);
    expect(capTable.series[0].ownershipPct).toBe(0.2);
    expect(capTable.optionsPool.ownershipPct).toBe(0);
  });

  test("matches the Cap Table 101 seed-round example with a 10% reserved pool", () => {
    const founders = [
      { ...founder(1_000_000), name: "Founder A" },
      { ...founder(1_000_000), name: "Founder B" },
    ];
    const conversion = fitConversion(8_000_000, 2_000_000, [], 0, 0.1, [2_000_000]);
    const capTable = buildPricedRoundCapTable(conversion, [...founders, series(2_000_000)]);

    expectClose(capTable.common[0].ownershipPct!, 0.35);
    expectClose(capTable.common[1].ownershipPct!, 0.35);
    expectClose(capTable.series[0].ownershipPct, 0.2);
    expectClose(capTable.optionsPool.ownershipPct!, 0.1);
  });

  test("matches the Cap Table 101 employee issuance without an option pool", () => {
    const founders = [
      { ...founder(1_000_000), name: "Founder A" },
      { ...founder(1_000_000), name: "Founder B" },
    ];
    const conversion = fitConversion(8_000_000, 2_000_000, [], 0, 0, [2_000_000]);
    const financed = buildPricedRoundCapTable(conversion, [...founders, series(2_000_000)]);
    const employeeShares = 131_578;
    const afterHire = buildExistingShareholderCapTable([
      ...founders,
      {
        name: "Seed Investor",
        shares: financed.series[0].shares,
        type: CapTableRowType.Common,
        commonType: CommonRowType.Shareholder,
      },
      {
        name: "Employee",
        shares: employeeShares,
        type: CapTableRowType.Common,
        commonType: CommonRowType.Shareholder,
      },
    ]);

    expect(afterHire.total.shares).toBe(2_631_578);
    expectClose(afterHire.common[0].ownershipPct!, 0.38);
    expectClose(afterHire.common[1].ownershipPct!, 0.38);
    expectClose(afterHire.common[2].ownershipPct!, 0.19);
    expectClose(afterHire.common[3].ownershipPct!, 0.05);
  });

  test("matches the Cap Table 101 employee grant from an existing option pool", () => {
    const founders = [
      { ...founder(1_000_000), name: "Founder A" },
      { ...founder(1_000_000), name: "Founder B" },
    ];
    const conversion = fitConversion(8_000_000, 2_000_000, [], 0, 0.1, [2_000_000]);
    const financed = buildPricedRoundCapTable(conversion, [...founders, series(2_000_000)]);
    const employeeShares = 142_857;
    const afterGrant = buildExistingShareholderCapTable([
      ...founders,
      {
        name: "Seed Investor",
        shares: financed.series[0].shares,
        type: CapTableRowType.Common,
        commonType: CommonRowType.Shareholder,
      },
      {
        name: "Employee",
        shares: employeeShares,
        type: CapTableRowType.Common,
        commonType: CommonRowType.Shareholder,
      },
      {
        name: "Available Option Pool",
        shares: financed.optionsPool.shares - employeeShares,
        type: CapTableRowType.Common,
        commonType: CommonRowType.UnusedOptions,
      },
    ]);

    expect(afterGrant.total.shares).toBe(financed.total.shares);
    expectClose(afterGrant.common[0].ownershipPct!, financed.common[0].ownershipPct!);
    expectClose(afterGrant.common[1].ownershipPct!, financed.common[1].ownershipPct!);
    expectClose(afterGrant.common[2].ownershipPct!, financed.series[0].ownershipPct);
    expectClose(afterGrant.common[3].ownershipPct!, 0.05);
    expectClose(afterGrant.optionsPool.ownershipPct!, 0.05);
  });

  test("a priced round without SAFEs or a pool refresh has the exact expected PPS and ownership", () => {
    const conversion = fitConversion(
      20_000_000,
      10_000_000,
      [],
      0,
      0,
      [5_000_000],
    );
    const capTable = buildPricedRoundCapTable(conversion, [founder(), series()]);

    expect(conversion.pps).toBe(2);
    expect(conversion.seriesShares).toBe(2_500_000);
    expect(conversion.totalShares).toBe(12_500_000);
    expect(capTable.common[0].ownershipPct).toBe(0.8);
    expect(capTable.series[0].ownershipPct).toBe(0.2);
  });

  test("a capped post-money SAFE owns investment divided by cap immediately before Series A", () => {
    const note = safe();
    const conversion = fitConversion(
      20_000_000,
      10_000_000,
      [note],
      0,
      0,
      [5_000_000],
    );
    const preRound = buildPreRoundCapTable(conversion, [founder(), note]);
    const pricedRound = buildPricedRoundCapTable(conversion, [
      founder(),
      note,
      series(),
    ]);

    expectClose(preRound.safes[0].ownershipPct!, 0.1);
    expectClose(pricedRound.safes[0].ownershipPct!, 0.08);
    expectClose(pricedRound.series[0].ownershipPct, 0.2);
  });

  test("several post-money SAFEs preserve their independently purchased pre-round percentages", () => {
    const first = safe({
      name: "First SAFE",
      investment: 500_000,
      cap: 5_500_000,
    });
    const second = safe({
      name: "Second SAFE",
      investment: 500_000,
      cap: 8_300_000,
    });
    const conversion = fitConversion(
      30_000_000,
      10_000_000,
      [first, second],
      0,
      0,
      [5_000_000],
    );
    const preRound = buildPreRoundCapTable(conversion, [
      founder(),
      first,
      second,
    ]);

    expectClose(preRound.safes[0].ownershipPct!, 500_000 / 5_500_000);
    expectClose(preRound.safes[1].ownershipPct!, 500_000 / 8_300_000);
    expectClose(
      preRound.common[0].ownershipPct!,
      1 - 500_000 / 5_500_000 - 500_000 / 8_300_000,
    );
  });

  test("an original pre-money SAFE is diluted by its own investment", () => {
    const note = safe({ conversionType: "pre" });
    const conversion = fitConversion(
      20_000_000,
      10_000_000,
      [note],
      0,
      0,
      [5_000_000],
    );
    const preRound = buildPreRoundCapTable(conversion, [founder(), note]);

    expect(conversion.ppss[0]).toBe(1);
    expect(preRound.safes[0].shares).toBe(1_000_000);
    expectClose(preRound.safes[0].ownershipPct!, 1 / 11);
  });

  test("the lower of cap price and discount price controls SAFE conversion", () => {
    const discounted = safe({ cap: 20_000_000, discount: 0.2 });
    const capped = safe({ cap: 8_000_000, discount: 0.2 });

    expect(safeConvert(discounted, 10_000_000, 12_000_000, 2)).toBe(1.6);
    expectClose(
      safeConvert(capped, 10_000_000, 12_000_000, 2),
      8_000_000 / 12_000_000,
      1e-12,
    );
  });

  test("a pool refresh stated as 10% post-financing reaches that target", () => {
    const conversion = fitConversion(
      20_000_000,
      10_000_000,
      [],
      0,
      0.1,
      [5_000_000],
    );
    const capTable = buildPricedRoundCapTable(conversion, [founder(), series()]);

    expectClose(capTable.optionsPool.ownershipPct!, 0.1);
    expectClose(capTable.series[0].ownershipPct, 0.2);
    expectClose(capTable.common[0].ownershipPct!, 0.7);
  });

  test("all priced-round rows reconcile to total shares and 100% ownership", () => {
    const note = safe({ investment: 750_000, cap: 9_000_000 });
    const conversion = fitConversion(
      18_000_000,
      9_000_000,
      [note],
      1_000_000,
      0.12,
      [3_000_000, 2_000_000],
    );
    const stakeholders = [
      founder(9_000_000),
      {
        name: "Unused Pool",
        shares: 1_000_000,
        type: CapTableRowType.Common,
        commonType: CommonRowType.UnusedOptions,
      } satisfies CommonStockholder,
      note,
      series(3_000_000),
      { ...series(2_000_000), name: "Series A 2" },
    ];
    const capTable = buildPricedRoundCapTable(conversion, stakeholders);
    const rows = [
      ...capTable.common,
      ...capTable.safes,
      ...capTable.series,
      capTable.optionsPool,
    ];

    expect(rows.reduce((sum, row) => sum + (row.shares ?? 0), 0)).toBe(
      capTable.total.shares,
    );
    expectClose(
      rows.reduce((sum, row) => sum + (row.ownershipPct ?? 0), 0),
      1,
    );
  });
});
