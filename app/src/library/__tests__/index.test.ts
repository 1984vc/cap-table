import { describe, expect, test } from "@jest/globals";
import { SAFE_CONVERSION } from "../../../google-apps-script/src/index";

describe("converting safe investments with existing common stock", () => {
  test("matches our Google Sheet", () => {
    const preMoneyValuation = 16_700_000;
    const common = 9_390_728;
    const unusedOptions = 609_272;
    const safes: [number, number, number, string][] = [
      [125_000, 125_000 / 0.07, 0, "post"],
      [375_000, 0, 0, "post"],
      [475_000, 10_000_000, 0, "post"],
      [28_500, 13_000_000, 0, "post"],
      [2_997_500, 30_000_000, 0, "post"],
    ];
    const seriesInvestments = [[1_000_000], [3_000_000]];

    const expectedValuation = 20_700_000;
    const exptectedTotalShares = 20_606_916;
    const fit = SAFE_CONVERSION(
      preMoneyValuation,
      common,
      safes,
      unusedOptions,
      0.1,
      seriesInvestments,
      false,
      -1,
    );
    const pps = fit[5] && fit[5][1];
    const totalShares = fit[4] && fit[4][1];
    if (!pps || !totalShares) {
      throw new Error("PPS and totalShares are undefined");
    }

    expect(Math.round(totalShares * pps)).toEqual(expectedValuation);
    expect(Math.round(totalShares)).toEqual(exptectedTotalShares);
  });
  test("Handles Errors", () => {
    const preMoneyValuation = 16_700_000;
    const common = 9_390_728;
    const unusedOptions = 609_272;
    const safes: [number, number, number, string][] = [
      [125_000, 125_000 / 0.07, 0, "post"],
      [375_000, 0, 0, "post"],
      [475_000, 10_000_000, 0, "post"],
      [28_500, 13_000_000, 0, "post"],
      [2_997_500, 30_000_000, 0, "post"],
    ];
    const seriesInvestment = "foo";

    // const exptectedTotalOptions = 2_060_692
    const fit = SAFE_CONVERSION(
      preMoneyValuation,
      common,
      safes,
      unusedOptions,
      0.1,
      seriesInvestment,
      false,
      -1,
    );
    expect(fit[0][1]).toMatch("Error");
  });
});
