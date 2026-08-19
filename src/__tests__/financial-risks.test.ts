import { describe, expect, test } from "vitest";
import {
  buildEstimatedPreRoundCapTable,
  buildExistingShareholderCapTable,
  buildPreRoundCapTable,
  CapTableRowType,
  CommonRowType,
  fitConversion,
  populateSafeCaps,
  buildPricedRoundCapTable,
} from "../index";
import type { CommonStockholder, SAFENote } from "../index";

const founders: CommonStockholder = {
  name: "Founders",
  shares: 10_000_000,
  type: CapTableRowType.Common,
  commonType: CommonRowType.Shareholder,
};

const postSafe = (overrides: Partial<SAFENote> = {}): SAFENote => ({
  name: "SAFE",
  investment: 1_000_000,
  cap: 10_000_000,
  discount: 0,
  conversionType: "post",
  type: CapTableRowType.Safe,
  ...overrides,
});

describe("known financial-model risks", () => {
  test("a fixed-percentage YC SAFE converts into 7% before priced-round dilution", () => {
    const yc = postSafe({
      name: "YC 7% SAFE",
      investment: 125_000,
      cap: 0,
      conversionType: "yc7p",
    });
    const conversion = fitConversion(
      20_000_000,
      founders.shares,
      [yc],
      0,
      0,
      [5_000_000],
    );
    const preRound = buildPreRoundCapTable(conversion, [founders, yc]);

    expect(preRound.safes[0].ownershipPct).toBeCloseTo(0.07, 8);
  });

  test("an MFN SAFE can adopt a later discount when that is the favorable term", () => {
    const mfn = postSafe({
      name: "MFN SAFE",
      investment: 375_000,
      cap: 0,
      sideLetters: ["mfn"],
    });
    const laterDiscountSafe = postSafe({
      name: "Later Discount SAFE",
      investment: 500_000,
      cap: 0,
      discount: 0.2,
    });

    const [resolved] = populateSafeCaps([mfn, laterDiscountSafe]);

    expect(resolved.discount).toBe(0.2);
  });

  test("an MFN estimate is explicitly provisional when priced terms can elect a different package", () => {
    const mfn = postSafe({ name: "MFN", investment: 375_000, cap: 0, sideLetters: ["mfn"] });
    const capped = postSafe({ name: "Capped 30M", investment: 500_000, cap: 30_000_000 });
    const discounted = postSafe({ name: "Discount 20%", investment: 500_000, cap: 0, discount: 0.2 });
    const safes = [mfn, capped, discounted];
    const estimate = buildEstimatedPreRoundCapTable([founders, ...safes]);
    const conversion = fitConversion(10_000_000, founders.shares, safes, 0, 0, [10_000_000]);
    const priced = buildPricedRoundCapTable(conversion, [
      founders,
      ...safes,
      { name: "Lead", investment: 10_000_000, type: CapTableRowType.Series },
    ]);

    expect(estimate.safes[0].cap).toBe(30_000_000);
    expect(estimate.safes[0].ownershipError?.type).toBe("caveat");
    expect(estimate.safes[0].ownershipError?.reason).toContain("provisional");
    expect(conversion.safeConversions[0].electionSourceName).toBe("Discount 20%");
    expect(priced.safes[0].discount).toBe(0.2);
    expect(priced.safes[0].cap).toBe(0);
  });

  test("an MFN election never mixes a cap and discount from different later SAFEs", () => {
    const mfn = postSafe({ name: "MFN", investment: 375_000, cap: 0, sideLetters: ["mfn"] });
    const lowCap = postSafe({ name: "Low Cap", investment: 500_000, cap: 8_000_000 });
    const discounted = postSafe({ name: "Discount 30%", investment: 500_000, cap: 0, discount: 0.3 });

    const conversion = fitConversion(
      50_000_000,
      founders.shares,
      [mfn, lowCap, discounted],
      0,
      0,
      [5_000_000],
    );
    const election = conversion.safeConversions[0];

    expect(election.electionSourceName).toBe("Low Cap");
    expect(election.effectiveTerms).toEqual({
      cap: 8_000_000,
      discount: 0,
      conversionType: "post",
    });
    expect(election.effectiveTerms).not.toEqual({
      cap: 8_000_000,
      discount: 0.3,
      conversionType: "post",
    });
  });

  test.each(["pre", "post"] as const)(
    "a %s-money SAFE whose investment reaches its cap gets the specific diagnostic",
    (conversionType) => {
      expect(() => buildEstimatedPreRoundCapTable([
        founders,
        postSafe({ investment: 8_000_000, cap: 8_000_000, conversionType }),
      ])).toThrow("safes[0].investment must be less than safes[0].cap");
    },
  );

  test("fractional opening shares require share rounding to be explicitly disabled", () => {
    expect(() => fitConversion(12_000_000, 9_000_000.5, [], 0, 0, [2_000_000]))
      .toThrow("commonShares must be an integer when share rounding is enabled");

    const noShareRounding = { roundPPSPlaces: -1 };
    const conversion = fitConversion(
      12_000_000, 9_000_000.5, [], 0, 0, [2_000_000], noShareRounding,
    );
    const existing = buildExistingShareholderCapTable([
      { ...founders, shares: 9_000_000.5 },
    ], noShareRounding);

    expect(Number.isInteger(conversion.totalShares)).toBe(false);
    expect(existing.total.shares).toBe(9_000_000.5);
  });

  test("aggregate post-money SAFE ownership of 100% is rejected", () => {
    const safes = [
      postSafe({ name: "SAFE 1", investment: 6_000_000 }),
      postSafe({ name: "SAFE 2", investment: 4_000_000 }),
    ];

    expect(() =>
      buildEstimatedPreRoundCapTable([founders, ...safes]),
    ).toThrow();
  });

  test("a 100% discount is rejected before conversion", () => {
    const invalid = postSafe({ cap: 0, discount: 1 });

    expect(() =>
      fitConversion(
        20_000_000,
        founders.shares,
        [invalid],
        0,
        0,
        [5_000_000],
      ),
    ).toThrow();
  });

  test("an option-pool target of 100% is rejected", () => {
    expect(() =>
      fitConversion(
        20_000_000,
        founders.shares,
        [],
        0,
        1,
        [5_000_000],
      ),
    ).toThrow();
  });

  test("a zero pre-money valuation is rejected", () => {
    expect(() =>
      fitConversion(0, founders.shares, [], 0, 0, [5_000_000]),
    ).toThrow();
  });

  test("an exercised pro-rata side letter is explicitly rejected", () => {
    expect(() => fitConversion(
      20_000_000, founders.shares,
      [postSafe({ sideLetters: ["pro-rata"] })],
      0, 0, [5_000_000],
    )).toThrow();
  });

  test("the solver returns an exactly reconciled share identity", () => {
    const result = fitConversion(
      18_000_000, founders.shares,
      [postSafe({ investment: 733_333, cap: 8_750_000 })],
      500_000, 0.13, [2_345_678, 1_234_567],
    );
    expect(
      founders.shares + result.totalOptions + result.convertedSafeShares + result.seriesShares,
    ).toBe(result.totalShares);
  });
});
