import { describe, expect, test } from "@jest/globals";
import {
  createConversionStore,
  IConversionStateData,
} from "@/cap-table/state/ConversionState";
import fixtureData from "../../__tests__/fixtures/state_fixtures.json";
import { getPreRoundCapTable } from "../PreRoundCapTableSelector";

describe("Existing Shareholder Selector", () => {
  test("Basic sanity check of selector", () => {
    const store = createConversionStore(fixtureData as IConversionStateData);
    const preRoundSelector = getPreRoundCapTable(
      store.getState(),
    );
    expect(preRoundSelector.rows[0].ownershipPct?.toFixed(2)).toEqual("31.35")
  });
});
