import { describe, expect, test } from "@jest/globals";
import {
  createConversionStore,
  IConversionStateData,
} from "@/cap-table/state/ConversionState";
import fixtureData from "../../__tests__/fixtures/state_fixtures.json";
import { getPricedRoundCapTableSelector } from "../PricedRoundSelector";
import { CapTableRowType } from "@library/cap-table/types";

// Test our Result Selector, which handles both showing the resulting cap table and allow users to play around with the pre-money and investment changes
describe("Result Selector", () => {
  test("Basic sanity check of selector", () => {
    const store = createConversionStore(fixtureData as IConversionStateData);
    const resultSelector = getPricedRoundCapTableSelector({
      ...store.getState(),
      preMoneyChange: 0,
      investmentChange: 0,
    });
    const investors = resultSelector.rows.filter((row) => row.type === CapTableRowType.Safe || row.type === CapTableRowType.Series)
    const totalInvestment = investors.reduce((sum, current) => sum + current.investment, 0);
    expect(resultSelector.totalRow.investment).toEqual(totalInvestment);
  });
  test("Changing investment amounts", () => {
    const store = createConversionStore(fixtureData as IConversionStateData);
    const resultSelector = getPricedRoundCapTableSelector({
      ...store.getState(),
      preMoneyChange: 0,
      investmentChange: 500_000,
    });
    expect(resultSelector.totalRow.shares).toEqual(13_027_681);
    // Ensure the pricedConversion matches the expected shares from the entire cap table
  });
  test("Ensure percentages total to 100%", () => {
    const store = createConversionStore(fixtureData as IConversionStateData);
    const resultSelector = getPricedRoundCapTableSelector({
      ...store.getState(),
      preMoneyChange: 0,
      investmentChange: 500_000,
      targetOptionsPool: 0,
    });
    expect(resultSelector.totalRow.ownershipPct).toEqual(1);
  });
});
