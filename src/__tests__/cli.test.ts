import { describe, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const cli = resolve(__dirname, "../../dist/cli.js");
const run = (cmd: string, json: string) =>
  execFileSync("node", [cli, cmd, json], { encoding: "utf-8" });
const runStdin = (cmd: string, json: string) =>
  execFileSync("node", [cli, cmd], { input: json, encoding: "utf-8" });

const sampleInput = JSON.stringify({
  preMoneyValuation: 12_000_000,
  common: [
    { name: "Founder 1", shares: 4_500_000 },
    { name: "Founder 2", shares: 4_500_000 },
    { name: "Options Pool", shares: 1_000_000, commonType: "unusedOptions" },
  ],
  safes: [
    { name: "Seed SAFE", investment: 1_000_000, cap: 10_000_000, discount: 0, conversionType: "post" },
  ],
  seriesInvestors: [
    { name: "Lead", investment: 2_000_000 },
  ],
  targetOptionsPct: 0.10,
});

describe("CLI", () => {
  test("existing — returns ownership percentages", () => {
    const out = run("existing", JSON.stringify({
      common: [
        { name: "A", shares: 8_000_000 },
        { name: "B", shares: 2_000_000 },
      ],
    }));
    const result = JSON.parse(out);
    expect(result).toHaveLength(2);
    expect(result[0].ownershipPct).toBe(0.8);
    expect(result[1].ownershipPct).toBe(0.2);
  });

  test("estimated-pre-round — returns common + safes + total", () => {
    const out = run("estimated-pre-round", JSON.stringify({
      common: [
        { name: "Founder", shares: 9_000_000 },
        { name: "Pool", shares: 1_000_000, commonType: "unusedOptions" },
      ],
      safes: [
        { name: "SAFE", investment: 500_000, cap: 8_000_000, conversionType: "post" },
      ],
    }));
    const result = JSON.parse(out);
    expect(result.common.length).toBe(2);
    expect(result.safes.length).toBe(1);
    expect(result.total.ownershipPct).toBe(1);
  });

  test("priced-round — returns conversion + capTable", () => {
    const out = run("priced-round", sampleInput);
    const result = JSON.parse(out);
    expect(result.conversion).toBeDefined();
    expect(result.conversion.pps).toBeGreaterThan(0);
    expect(result.capTable).toBeDefined();
    expect(result.capTable.common.length).toBe(2); // unused options excluded
    expect(result.capTable.safes.length).toBe(1);
    expect(result.capTable.series.length).toBe(1);
    expect(result.capTable.refreshedOptionsPool).toBeDefined();
    expect(result.capTable.total.shares).toBe(result.conversion.totalShares);
  });

  test("pre-round — returns conversion + capTable", () => {
    const out = run("pre-round", sampleInput);
    const result = JSON.parse(out);
    expect(result.conversion).toBeDefined();
    expect(result.capTable).toBeDefined();
    expect(result.capTable.total.shares).toBeGreaterThan(0);
  });

  test("stdin piping works", () => {
    const out = runStdin("existing", JSON.stringify({
      common: [
        { name: "A", shares: 750_000 },
        { name: "B", shares: 250_000 },
      ],
    }));
    const result = JSON.parse(out);
    expect(result[0].ownershipPct).toBe(0.75);
  });

  test("auto-fills type fields — agents can skip enums", () => {
    const out = run("priced-round", JSON.stringify({
      preMoneyValuation: 5_000_000,
      common: [{ name: "Solo", shares: 10_000_000 }],
      safes: [{ name: "Angel", investment: 100_000, cap: 4_000_000 }],
      seriesInvestors: [{ name: "VC", investment: 1_000_000 }],
    }));
    const result = JSON.parse(out);
    expect(result.capTable.common[0].type).toBe("common");
    expect(result.capTable.safes[0].type).toBe("safe");
    expect(result.capTable.series[0].type).toBe("series");
  });
});
