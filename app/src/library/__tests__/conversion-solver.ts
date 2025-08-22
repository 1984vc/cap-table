import { describe, expect, test } from "@jest/globals";
import { CapTableRowType, SAFENote } from "@library/cap-table/types";
import { fitConversion } from "@library/conversion-solver";

describe("converting safe investments with existing common stock", () => {
  test("Sanity check our baseline", () => {
    const preMoneyValuation = 32_000_000;
    const common = 2_000_000;
    const unusedOptions = { name: "Unused options", amount: 0 };
    const safes: SAFENote[] = [
      {
        investment: 2_000_000,
        discount: 0,
        type: CapTableRowType.Safe,
        cap: 10_000_000,
        conversionType: "post",
      },
    ];
    const seriesInvestments = [8_000_000];

    const expectedValuation = 40_000_000;
    const expectedTotalShares = 3_125_000;
    const expectedPPS = 12.8;
    const exptectedTotalOptions = 0;
    const fit = fitConversion(
      preMoneyValuation,
      common,
      safes,
      unusedOptions.amount,
      0.0,
      seriesInvestments,
      { roundShares: true, roundPPSPlaces: 8},
    );

    expect(fit.totalShares).toEqual(expectedTotalShares);
    expect(fit.totalShares * fit.pps).toEqual(expectedValuation);
    expect(fit.totalOptions).toEqual(exptectedTotalOptions);
    expect(fit.totalShares).toEqual(expectedTotalShares);
    expect(fit.totalInvested).toEqual(10_000_000);
    expect(fit.pps).toEqual(expectedPPS);
  });
  test("matches our Google Sheet", () => {
    const preMoneyValuation = 16_700_000;
    const common = 9_390_728;
    const unusedOptions = 609_272;
    const safes: SAFENote[] = [
      {
        investment: 125_000,
        discount: 0,
        type: CapTableRowType.Safe,
        cap: 125_000 / 0.07,
        conversionType: "post",
      },
      { investment: 375_000, discount: 0, cap: 10_000_000, conversionType: "post", type: CapTableRowType.Safe },
      {
        investment: 475_000,
        discount: 0,
        type: CapTableRowType.Safe,
        cap: 10_000_000,
        conversionType: "post",
      },
      {
        investment: 28_500,
        discount: 0,
        type: CapTableRowType.Safe,
        cap: 13_000_000,
        conversionType: "post",
      },
      {
        investment: 2_997_500,
        discount: 0,
        type: CapTableRowType.Safe,
        cap: 30_000_000,
        conversionType: "post",
      },
    ];
    const seriesInvestments = [3_000_000, 1_000_000];

    const expectedValuation = 20_700_117;
    const expectedTotalShares = 21_040_767;
    const expectedPostMoneyShares = 15_480_138;
    const expectedPreMoneyShares = 11_494_804;
    const expectedAdditionalOptions = 1_494_804;
    const exptectedTotalOptions = 2_104_076;
    const fit = fitConversion(
      preMoneyValuation,
      common,
      safes,
      unusedOptions,
      0.1,
      seriesInvestments,
      { roundPPSPlaces: 5, roundDownShares: true },
    );

    expect(Math.round(fit.totalShares * fit.pps)).toEqual(expectedValuation);
    expect(Math.round(fit.totalShares)).toEqual(expectedTotalShares);
    expect(Math.round(fit.totalOptions)).toEqual(exptectedTotalOptions);
    expect(Math.round(fit.additionalOptions)).toEqual(expectedAdditionalOptions);
    expect(Math.round(fit.postMoneyShares)).toEqual(expectedPostMoneyShares);
    expect(Math.round(fit.preMoneyShares)).toEqual(expectedPreMoneyShares);
  });
  test("matches our known truth", () => {
    const preMoneyValuation = 49_800_000;
    const common = 10_000_000 + 1_694_118;
    const unusedOptions = 0;
    const safes: SAFENote[] = [
      {
        investment: 50_000,
        discount: 0,
        cap: 10_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 1_000_000,
        discount: 0,
        cap: 10_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 25_000,
        discount: 0,
        cap: 10_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 175_000,
        discount: 0,
        cap: 10_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 150_000,
        discount: 0,
        cap: 10_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 50_000,
        discount: 0,
        cap: 10_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 5_000,
        discount: 0,
        cap: 20_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 50_000,
        discount: 0,
        cap: 20_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 311_147.8,
        discount: 0,
        cap: 20_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 250_000,
        discount: 0,
        cap: 20_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
    ];
    const seriesInvestments = [10_199_995.29];

    const expectedValuation = 60_000_046;
    const expectedTotalShares = 19_436_361;
    const expectedTotalOptions = 1_943_636;
    const fit = fitConversion(
      preMoneyValuation,
      common,
      safes,
      unusedOptions,
      0.1,
      seriesInvestments,
      { roundDownShares: true, roundPPSPlaces: 5 },
    );

    expect(fit.totalShares).toEqual(expectedTotalShares);
    expect(fit.totalOptions).toEqual(expectedTotalOptions);
    expect(Math.round(fit.pps * fit.totalShares)).toEqual(expectedValuation);
  });
  test("matches our known truth 2", () => {
    const preMoneyValuation = 80_000_000;
    const common = 15_201_645
    const unusedOptions = 1_259_260;
    const safes: SAFENote[] = [
      {
        investment: 3_250_000,
        discount: 0,
        cap: 17_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 350_000,
        discount: 0,
        cap: 17_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 15_000,
        discount: 0,
        cap: 17_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 15_000,
        discount: 0,
        cap: 17_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 1_000,
        discount: 0,
        cap: 17_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 1_000_000,
        discount: 0,
        cap: 80_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
    ];
    const seriesInvestments = [
      380_001,
      3_419_999,
      1_000_000,
      14_905_973,
      194_027,
      100_000,
    ]

    const expectedValuation = 100_000_000;
    const expectedTotalShares = 27_426_235;
    const expectedTotalOptions = 1_919_836;
    const fit = fitConversion(
      preMoneyValuation,
      common,
      safes,
      unusedOptions,
      0.07,
      seriesInvestments,
      { roundDownShares: true, roundPPSPlaces: 5 },
    );

    expect(Math.abs((fit.totalShares-expectedTotalShares)/expectedTotalShares)).toBeLessThan(0.00001);
    expect(Math.abs((fit.totalOptions-expectedTotalOptions)/expectedTotalOptions)).toBeLessThan(0.00001);
    expect(Math.abs((fit.pps * fit.totalShares-expectedValuation)/expectedValuation)).toBeLessThan(0.00001);
  });
  // When a user puts in a target option pool of less than the existing options pool, we should just use the existing options pool, not subtract from it
  test("when the target options pool is less than the current pool", () => {
    const preMoneyValuation = 16_700_000;
    const common = 9_390_728;
    const unusedOptions = { name: "Unused options", amount: 609_272 };
    const safes: SAFENote[] = [
      // YC 7% on $125k is $1,785,714.28571429 cap
      {
        investment: 125_000,
        discount: 0,
        cap: 125_000 / 0.07,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      { investment: 375_000, discount: 0, cap: 0, conversionType: "post", type: CapTableRowType.Safe },
      {
        investment: 475_000,
        discount: 0,
        cap: 10_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 28_500,
        discount: 0,
        cap: 13_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
      {
        investment: 2_997_500,
        discount: 0,
        cap: 30_000_000,
        conversionType: "post",
        type: CapTableRowType.Safe,
      },
    ];
    const seriesInvestments = [4_000_000];

    const fit = fitConversion(
      preMoneyValuation,
      common,
      safes,
      unusedOptions.amount,
      0.01,
      seriesInvestments,
      { roundDownShares: false, roundPPSPlaces: -1 },
    );

    expect(Math.round(fit.totalOptions)).toEqual(609_272);
  });
});
