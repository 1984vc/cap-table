import type { BestFit, ExistingCapTable, PreRoundCapTable, PricedRoundCapTable } from "./index.js";
import type { CapTableRow } from "./index.js";

type Result = ExistingCapTable | PreRoundCapTable | {
  conversion: BestFit;
  capTable: PreRoundCapTable | PricedRoundCapTable;
};
type Table = ExistingCapTable | PreRoundCapTable | PricedRoundCapTable;

const hasSafes = (table: Table): table is PreRoundCapTable | PricedRoundCapTable => "safes" in table;
const hasSeries = (table: Table): table is PricedRoundCapTable => "series" in table;

const titles: Record<string, string> = {
  existing: "Existing cap table",
  "estimated-pre-round": "Estimated pre-round cap table",
  "pre-round": "Pre-round cap table",
  "priced-round": "Priced-round cap table",
};

const escapeCell = (text: string): string =>
  text.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ")
    .replace(/([`*_\[\]<>])/g, "\\$1");

const shares = (value?: number): string => value === undefined ? "—" : value.toLocaleString("en-US", {
  maximumFractionDigits: 15,
});
const percent = (value?: number): string => value === undefined ? "—" : `${(value * 100).toFixed(2)}%`;

export function formatMarkdownReport(command: string, result: Result): string {
  const conversion = "conversion" in result ? result.conversion : undefined;
  const table = "capTable" in result ? result.capTable : result;
  const rows: CapTableRow[] = [
    ...table.common,
    ...(hasSafes(table) ? table.safes : []),
    ...(hasSeries(table) ? table.series : []),
    table.optionsPool,
    table.total,
  ];
  const hasUnknownOwnership = rows.some((row) => row.ownershipError?.type === "tbd");
  const notes: string[] = [];
  const lines = [
    `# ${titles[command] ?? "Cap table"}`,
    "",
    "| Holder | Shares | Ownership |",
    "| --- | ---: | ---: |",
  ];

  for (const row of rows) {
    const error = row.ownershipError;
    const label = escapeCell(row.name ?? row.type);
    const ownership = error?.type === "tbd" || (row === table.total && hasUnknownOwnership)
      ? "TBD" : percent(row.ownershipPct);
    const marked = error?.type === "caveat" ? `${ownership} (estimate)` : ownership;
    lines.push(`| ${label} | ${shares("shares" in row ? row.shares : undefined)} | ${marked} |`);
    if (error) notes.push(`- **${label}:** ${escapeCell(error.reason ?? (error.type === "tbd" ? "Ownership cannot yet be calculated." : "Ownership is provisional."))}`);
  }
  if (hasUnknownOwnership) {
    notes.push("- **Total:** Shares shown include only currently known shares; final fully diluted ownership cannot yet be calculated.");
  }

  if (conversion) {
    lines.push("", "## Round figures", "", `- ${command === "pre-round" ? "Modeled financing price per share" : "Round price per share"}: $${conversion.pps}`);
    if (command === "priced-round") {
      lines.push(`- New Series shares: ${shares(conversion.seriesShares)}`);
      lines.push(`- Option-pool increase: ${shares(conversion.additionalOptions)} shares`);
    } else {
      lines.push("- This pre-round view excludes new Series shares and the option-pool increase.");
    }
  }
  if (notes.length) lines.push("", "## Estimate notes", "", ...notes);

  lines.push("", "Generated with [@1984vc/cap-table](https://github.com/1984vc/cap-table).", "", "Learn more: [Cap Table 101](https://1984.vc/docs/founders-handbook/cap-table-101.md) · [SAFE Side Letters](https://1984.vc/docs/founders-handbook/safe-side-letters.md).");
  return lines.join("\n");
}
