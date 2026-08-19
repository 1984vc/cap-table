import { describe, expect, test } from "vitest";
import { stringToNumber, formatUSDWithCommas, shortenedUSD } from "../index";

describe("number formatting", () => {
  test("stringToNumber parses K/M/B/T suffixes", () => {
    expect(stringToNumber("$1.5M")).toBe(1_500_000);
    expect(stringToNumber("$50K")).toBe(50_000);
    expect(stringToNumber("1,000,000")).toBe(1_000_000);
    expect(stringToNumber("1.5m")).toBe(1_500_000);
    expect(stringToNumber("-$2B")).toBe(-2_000_000_000);
    expect(stringToNumber("1,500,000.75")).toBe(1_500_000.75);
    expect(stringToNumber(42)).toBe(42);
  });

  test("stringToNumber returns NaN for unrecognizable input", () => {
    expect(stringToNumber("")).toBeNaN();
    expect(stringToNumber("abc")).toBeNaN();
  });

  test("shortenedUSD handles boundaries and negatives", () => {
    expect(shortenedUSD(1_500_000)).toBe("$1.5M");
    expect(shortenedUSD(50_000)).toBe("$50K");
    expect(shortenedUSD(999_999)).toBe("$1M");
    expect(shortenedUSD(1_000_000)).toBe("$1M");
    expect(shortenedUSD(999)).toBe("$999");
    expect(shortenedUSD(-1_500_000)).toBe("-$1.5M");
    expect(shortenedUSD("$1.5M")).toBe("$1.5M");
  });

  test("formatUSDWithCommas preserves cents and drops whole-dollar zeros", () => {
    expect(formatUSDWithCommas(1_234_567.89)).toBe("$1,234,567.89");
    expect(formatUSDWithCommas(1_234_567)).toBe("$1,234,567");
    expect(formatUSDWithCommas(5)).toBe("$5");
    expect(formatUSDWithCommas(0.5)).toBe("$0.50");
  });
});
