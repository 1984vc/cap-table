#!/usr/bin/env node

import {
  fitConversion,
  buildPricedRoundCapTable,
  buildPreRoundCapTable,
  buildEstimatedPreRoundCapTable,
  buildExistingShareholderCapTable,
  DEFAULT_ROUNDING_STRATEGY,
  CapTableRowType,
  CommonRowType,
} from "./index.js";
import type { CommonStockholder, SAFENote, SeriesInvestor, StakeHolder } from "./index.js";
import { readFileSync } from "node:fs";

// ─── Input normalisation ────────────────────────────────────────────────────
// Agents shouldn't need to pass TypeScript enums.  We auto-fill `type` and
// `commonType` so the caller can just send { name, shares } for common rows.

function normalizeCommonholders(raw: any[]): CommonStockholder[] {
  return (raw ?? []).map((r: any) => ({
    ...r,
    type: CapTableRowType.Common,
    commonType: r.commonType === "unusedOptions" || r.commonType === CommonRowType.UnusedOptions
      ? CommonRowType.UnusedOptions
      : CommonRowType.Shareholder,
  }));
}

function normalizeSafes(raw: any[]): SAFENote[] {
  return (raw ?? []).map((r: any) => ({
    ...r,
    type: CapTableRowType.Safe,
    discount: r.discount ?? 0,
    cap: r.cap ?? 0,
    conversionType: r.conversionType ?? "post",
  }));
}

function normalizeSeries(raw: any[]): SeriesInvestor[] {
  return (raw ?? []).map((r: any) => ({
    ...r,
    type: CapTableRowType.Series,
    round: r.round ?? 0,
  }));
}

// ─── Commands ───────────────────────────────────────────────────────────────

function cmdExisting(input: any) {
  const common = normalizeCommonholders(input.commonShareholders ?? input.common ?? []);
  return buildExistingShareholderCapTable(common);
}

function cmdEstimatedPreRound(input: any) {
  const common = normalizeCommonholders(input.commonShareholders ?? input.common ?? []);
  const safes = normalizeSafes(input.safes ?? []);
  const stakeholders: StakeHolder[] = [...common, ...safes];
  return buildEstimatedPreRoundCapTable(stakeholders);
}

function resolveConversionInput(input: any) {
  const {
    preMoneyValuation,
    unusedOptions = 0,
    targetOptionsPct = 0.10,
    seriesInvestments = [],
    roundingStrategy,
  } = input;

  const common = normalizeCommonholders(input.commonShareholders ?? input.common ?? []);
  const safes = normalizeSafes(input.safes ?? []);
  const series = normalizeSeries(input.seriesInvestors ?? []);

  const commonShares = common
    .filter((c) => c.commonType === CommonRowType.Shareholder)
    .reduce((acc, c) => acc + c.shares, 0);

  const resolvedUnused = unusedOptions ||
    common
      .filter((c) => c.commonType === CommonRowType.UnusedOptions)
      .reduce((acc, c) => acc + c.shares, 0);

  const resolvedSeriesInvestments = seriesInvestments.length > 0
    ? seriesInvestments
    : series.map((s) => s.investment);

  const conversion = fitConversion(
    preMoneyValuation,
    commonShares,
    safes,
    resolvedUnused,
    targetOptionsPct,
    resolvedSeriesInvestments,
    roundingStrategy ?? DEFAULT_ROUNDING_STRATEGY,
  );

  return { conversion, common, safes, series };
}

function cmdPreRound(input: any) {
  const { conversion, common, safes, series } = resolveConversionInput(input);
  const stakeholders: StakeHolder[] = [...common, ...safes, ...series];
  const capTable = buildPreRoundCapTable(conversion, stakeholders);
  return { conversion, capTable };
}

function cmdPricedRound(input: any) {
  const { conversion, common, safes, series } = resolveConversionInput(input);
  const stakeholders: StakeHolder[] = [...common, ...safes, ...series];
  const capTable = buildPricedRoundCapTable(conversion, stakeholders);
  return { conversion, capTable };
}

// ─── CLI entry ──────────────────────────────────────────────────────────────

const USAGE = `Usage: cap-table <command> [json-input]

Commands:
  existing               Existing shareholders only (no SAFEs, no rounds)
  estimated-pre-round    Pre-round estimate without a priced round
  pre-round              Pre-round with a known priced round valuation
  priced-round           Full priced round cap table

Input:
  Pass JSON as the second argument, via stdin, or as a file path.

  npx @1984vc/cap-table priced-round '{"preMoneyValuation":12000000,...}'
  echo '...' | npx @1984vc/cap-table priced-round
  npx @1984vc/cap-table priced-round ./input.json

Options:
  -h, --help       Show this help
  -v, --version    Show version`;

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    if (process.stdin.isTTY) { resolve(""); return; }
    process.stdin.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("-h") || args.includes("--help") || args.length === 0) {
    console.log(USAGE);
    process.exit(0);
  }
  if (args.includes("-v") || args.includes("--version")) {
    console.log(getVersion());
    process.exit(0);
  }

  const command = args[0];
  const commands: Record<string, (input: any) => any> = {
    existing: cmdExisting,
    "estimated-pre-round": cmdEstimatedPreRound,
    "pre-round": cmdPreRound,
    "priced-round": cmdPricedRound,
  };

  if (!commands[command]) {
    console.error(`Unknown command: ${command}\nValid: ${Object.keys(commands).join(", ")}`);
    process.exit(1);
  }

  // Resolve JSON input: arg > file > stdin
  let rawInput: string;
  const secondArg = args[1];
  if (secondArg) {
    if (secondArg.endsWith(".json") || secondArg.startsWith("./") || secondArg.startsWith("/")) {
      try { rawInput = readFileSync(secondArg, "utf-8"); }
      catch { rawInput = secondArg; }
    } else {
      rawInput = secondArg;
    }
  } else {
    rawInput = await readStdin();
  }

  if (!rawInput?.trim()) {
    console.error("Error: No JSON input provided.");
    process.exit(1);
  }

  let input: any;
  try { input = JSON.parse(rawInput); }
  catch (e: any) {
    console.error(`Error: Invalid JSON: ${e.message}`);
    process.exit(1);
  }

  try {
    const result = commands[command](input);
    console.log(JSON.stringify(result, null, 2));
  } catch (e: any) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();
