// You can access any of the global GAS objects in this file. You can also
// import local files or external dependencies:
import { SAFENote, CapTableRowType } from "@library/cap-table/types";
import {
  DEFAULT_ROUNDING_STRATEGY,
  fitConversion,
} from "@library/conversion-solver";
import { RoundingStrategy } from "@library/utils/rounding";


type SAFE_CONVERSION_RESULT = [
  ["Result", string],
  ["Calculated At", string],
  ["PreMoney", number],
  ["PostMoney", number],
  ["TotalShares", number],
  ["PPS", number],
];

const defaultRounding = DEFAULT_ROUNDING_STRATEGY;

function toNumber(i: string | number): number {
  if (typeof i === "number") return i;
  const num = parseFloat(i);
  if (isNaN(num)) {
    throw new Error(`Error: expected a number but got ${i}`);
  }
  return num;
}

function SAFE_CONVERSION(
  preMoney: number | string,
  commonShares: number | string,
  safeRanges: [
    investment: number,
    cap: number,
    discount: number,
    conversionType: string,
  ][],
  unusedOptions: number | string,
  targetOptionsPct: number | string,
  seriesInvestmentRanges: number[][] | string[][] | number | string,
  roundDownShares: boolean = defaultRounding.roundDownShares ?? false,
  roundPPSPlaces: number = defaultRounding.roundPPSPlaces,
): SAFE_CONVERSION_RESULT {
  try {
    const safes: SAFENote[] = safeRanges.map((e) => {
      // Check each element of the array to see if it's a number, if not throw an Error
      if ([e[0], e[1], e[2]].some((el) => typeof el !== "number")) {
        throw new Error(
          `SAFE_CONVERSION: Invalid input for SAFE, expected numbers, got ${e[0]}, ${e[1]}, ${e[2]}`,
        );
      }
      return {
        investment: e[0],
        cap: e[1],
        discount: e[2],
        type: CapTableRowType.Safe,
        conversionType: e[3].match(/^pre/i) ? "pre" : "post",
      };
    });

    // We need to handle when the seriesInvestment is just one cell, or when it's a series of cells as investments
    let seriesInvestments: number[] = [];
    if (Array.isArray(seriesInvestmentRanges)) {
      seriesInvestments = seriesInvestmentRanges.map((e) => {
        try {
          const num = toNumber(e[0]);
          return num;
        } catch (err) {
          throw new Error(
            `SAFE_CONVERSION: Invalid input for seriesInvestmentRanges, expected number, got ${e[0]}: ${err}`,
          );
        }
        // Check each element of the array to see if it's a number, if not throw an Error
      });
    } else {
      try {
        seriesInvestments = [toNumber(seriesInvestmentRanges)];
      } catch (err) {
        throw new Error(
          `SAFE_CONVERSION: Invalid input for seriesInvestmentRanges, expected number, got ${seriesInvestmentRanges}: ${err}`,
        );
      }
    }

    if (typeof preMoney !== "number") {
      throw new Error(
        `SAFE_CONVERSION: Invalid input for premoney, expected number, got ${preMoney}}`,
      );
    }
    if (typeof commonShares !== "number") {
      throw new Error(
        `SAFE_CONVERSION: Invalid input for commonShares, expected number, got ${commonShares}}`,
      );
    }
    if (typeof unusedOptions !== "number") {
      throw new Error(
        `SAFE_CONVERSION: Invalid input for unusedOptions, expected number, got ${unusedOptions}}`,
      );
    }
    if (typeof targetOptionsPct !== "number") {
      throw new Error(
        `SAFE_CONVERSION: Invalid input for targetOptionsPct, expected number, got ${targetOptionsPct}}`,
      );
    }

    if (roundPPSPlaces !== undefined && typeof roundPPSPlaces !== "number") {
      throw new Error(
        `SAFE_CONVERSION: Invalid input for roundPPSPlaces, expected a number, got ${seriesInvestmentRanges}`,
      );
    }

    const roundingStrategy: RoundingStrategy = {
      roundDownShares,
      roundPPSPlaces,
    };

    const fit = fitConversion(
      preMoney,
      commonShares,
      safes,
      unusedOptions,
      targetOptionsPct,
      seriesInvestments,
      roundingStrategy,
    );
    return [
      ["Result", "Success"],
      ["Calculated At", new Date().toISOString()],
      ["PreMoney", Number(fit.preMoneyShares)],
      ["PostMoney", Number(fit.postMoneyShares)],
      ["TotalShares", Number(fit.totalShares)],
      ["PPS", Number(fit.pps)],
    ];
  } catch (e: Error | unknown) {
    const message = (e as Error).message || "Unknown Error";
    return [
      ["Result", "Error: " + message],
      ["Calculated At", new Date().toISOString()],
      ["PreMoney", 0],
      ["PostMoney", 0],
      ["TotalShares", 0],
      ["PPS", 0],
    ];
  }
}

function VERSION() {
  // Replaced via WebPack DefinePlugin with the package.json version
  return global.process.env.VERSION;
}

function onOpen(
  e:
    | GoogleAppsScript.Events.DocsOnOpen
    | GoogleAppsScript.Events.SlidesOnOpen
    | GoogleAppsScript.Events.SheetsOnOpen
    | GoogleAppsScript.Events.FormsOnOpen,
): void {
  console.log(e);
}

function onEdit(e: GoogleAppsScript.Events.SheetsOnEdit): void {
  console.log(e);
}

function onInstall(e: GoogleAppsScript.Events.AddonOnInstall): void {
  console.log(e);
}

function doGet(e: GoogleAppsScript.Events.DoGet): void {
  console.log(e);
}

function doPost(e: GoogleAppsScript.Events.DoPost): void {
  console.log(e);
}

export { onOpen, onEdit, onInstall, doGet, doPost, SAFE_CONVERSION, VERSION };

// Hack to get in custom function JSDOCS
declare const global: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

// The below function proxy is needed to make Google see the number of parameters

/**
 * Finds the best fit for the conversion of SAFEs to priced rounds
 *
 * @param { number }  preMoney Premoney valuation
 * @param { number }  commonShares Current total common shares
 * @param { Array }   safeRanges  Range of cells containing the SAFE data [[investment, cap, discount, type]...]
 * @param { number }  unusedOptions  Unused options
 * @param { number }  targetOptionsPct  Target options pool percentage
 * @param { number }  seriesInvestmentRanges  Range of cells containing the series investments. eg [[investment]]
 * @param { boolean }  roundDownShares Optional: Round down the shares (default true)
 * @param { number }   roundPPSPlaces  Optional: Round the PPS to this many decimal places (default 5) Use -1 to not round
 * @return An array of key value pairs
 * @customfunction
 */
global.SAFE_CONVERSION = (
  preMoney: number | string,
  commonShares: number | string,
  safeRanges: [
    investment: number,
    cap: number,
    discount: number,
    conversionType: string,
  ][],
  unusedOptions: number | string,
  targetOptionsPct: number | string,
  seriesInvestmentRanges: number[][] | string[][] | number | string,
  roundDownShares: boolean = defaultRounding.roundDownShares ?? false,
  roundPPSPlaces: number = defaultRounding.roundPPSPlaces,
) => {
  return SAFE_CONVERSION(
    preMoney,
    commonShares,
    safeRanges,
    unusedOptions,
    targetOptionsPct,
    seriesInvestmentRanges,
    roundDownShares,
    roundPPSPlaces,
  );
};

/**
 * Returns the version of the script
 *
 * @return The sematic version of this script
 * @customfunction
 */
global.VERSION = VERSION;
