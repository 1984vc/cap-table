import { CapTableRowType } from "@library/cap-table/types";
import { IConversionStateData } from "./ConversionState";
import { earlyStageInvestors, founders, seriesAInvestors } from "./data";

export const randomSeries = () => {
  return seriesAInvestors.sort(() => Math.random() - 0.5);
}

export const randomSeed = () => {
  return earlyStageInvestors.sort(() => Math.random() - 0.5);
}

export const randomFounders = () => {
  return founders.sort(() => Math.random() - 0.5);
}

export const getRandomData = () => {
  return {
    randomFounders: randomFounders(),
    randomSeed: randomSeed(),
    randomSeries: randomSeries(),
  };
};

let idx = 0;

const getID = (): string => {
  return (idx++).toString();
};

export const initialState = ({
  randomFounders,
  randomSeed,
  randomSeries,
}: ReturnType<typeof getRandomData>): IConversionStateData => ({
  rowData: [
    {
      id: getID(),
      type: CapTableRowType.Common,
      name: `${randomFounders[0]}`,
      shares: 4_500_000,
    },
    {
      id: getID(),
      type: CapTableRowType.Common,
      name: `${randomFounders[1]}`,
      shares: 4_500_000,
    },
    {
      id: "IssuedOptions",
      type: CapTableRowType.Common,
      name: `Issued Options`,
      shares: 250_000,
    },
    // YC 7% SAFE
    {
      id: getID(),
      type: CapTableRowType.Safe,
      name: "YC 7%",
      investment: 125_000,
      discount: 0,
      cap: 125_000 / 0.07,
      conversionType: "post",
    },
    // Uncapped YC MFN SAFE (Cap to best cap of all safes)
    {
      id: getID(),
      type: CapTableRowType.Safe,
      name: "YC MFN",
      investment: 375_000,
      discount: 0,
      cap: 10_000_000,
      conversionType: "mfn",
    },
    {
      id: getID(),
      type: CapTableRowType.Safe,
      name: "1984 Ventures",
      investment: 750_000,
      discount: 0,
      cap: 10_000_000,
      conversionType: "post",
    },
    {
      id: getID(),
      type: CapTableRowType.Safe,
      name: `${randomSeed[0]}`,
      investment: 475_000,
      discount: 0,
      cap: 10_000_000,
      conversionType: "post",
    },
    {
      id: getID(),
      type: CapTableRowType.Safe,
      name: `${randomSeed[1]}`,
      investment: 500_000,
      discount: 0,
      cap: 13_000_000,
      conversionType: "post",
    },
    {
      id: getID(),
      type: CapTableRowType.Series,
      name: `${randomSeries[0]}`,
      investment: 3_000_000,
    },
    {
      id: getID(),
      type: CapTableRowType.Series,
      name: `${randomSeries[1]}`,
      investment: 1_000_000,
    },
  ],
  preMoney: 36_000_000,
  targetOptionsPool: 10,
  unusedOptions: 750_000,
  pricedRounds: 0,
});
