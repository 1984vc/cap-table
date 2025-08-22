import { describe, expect, test } from "@jest/globals";
import {
  createConversionStore,
  IConversionStateData,
} from "@/cap-table/state/ConversionState";
import { getSAFERowPropsSelector } from "@/cap-table/state/selectors/SAFEPropsSelector";
import fixtureData from "../../__tests__/fixtures/state_fixtures.json";

describe("SAFE Props selector behaviour", () => {
  test("Basic sanity check of selector", () => {
    const store = createConversionStore(fixtureData as IConversionStateData);
    const safeNotes = getSAFERowPropsSelector(
      store.getState(),
    );
    expect(safeNotes[0].ownershipPct?.toFixed(2)).toEqual("7.00");
  });
  test("Handle special SAFEs and their disabled fields", () => {
    const store = createConversionStore(fixtureData as IConversionStateData);
    const safeNotes = getSAFERowPropsSelector(
      store.getState(),
    );
    expect(safeNotes[1].ownershipPct?.toFixed(2)).toEqual("3.75");
    expect(safeNotes[1].disabledFields?.sort()).toEqual(["cap"].sort());
  });
});
