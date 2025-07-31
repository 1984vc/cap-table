import { describe, expect, test } from "@jest/globals";
import { decompressState } from "@/utils/stateCompression";
import { createConversionStore } from "../ConversionState";
import { getPreRoundCapTable } from "../selectors/PreRoundCapTableSelector";
import { getSAFERowPropsSelector } from "../selectors/SAFEPropsSelector";
import { getPricedRoundCapTableSelector } from "../selectors/PricedRoundSelector";

// Our old state with YC MFN / 375k and YC 7%, which should now be 375k MFN and 125k post at $1.785M
const v1State = "AAN4IgDgTgpgsg9gOygTxALgMwDYAMf8A0IALgIYQDmUxA8mMQJaIDOACnHADboCMORAVwQDmUACZ1GLdAHYArPn4gIcAO4ARUmXQBtUAzHoQAThBFiyMFCMBjOAFt7iMyASl71tCABScABYIAAQAwlycDMzORMx.5FDM6AAsCooAvgT6hl58LhZWtg5OCC5uHkbq0KqBABJwIsRRIDFxCWjJijjpmUYAkszMAuKSTAgJ5paeIHaOjaWTfQPigcPS0bHQrQBMKXhdIAZGPDy5E0bMpABm1kRzRgCawYEyAKQuDAgAbvHEHgjEvNtCCAxBE7EJ_mglDZSGBeDIABxyGQ8RIAOk2iORiQxckSRDsnygEGYIwAKqcvMgbDJYXsDtlNid8l5zlcSu5Jg9AjAAGIAOTehOYPygf3QGHkQJBzDBYsh.JhvA6eHxiC.xLJFJAVPsF2KdKyIB4GCZk1Z11cHMOxnhiUCADVRcQBBtBV9hb8IZKpaC6nKoYq0HxlarCRrEOTmeA4MKQAbDolTWdLhbbl4AMpwGwMUicEIwhhkbhEd7ukVyxLepTS2UQgOwoPKqFqokkiNasAx_7x7JyJMslPsspeADSnCg7yJgVYRIA1u8xvsheWITsVcDfeD0PXeBgQ1MW.GEJHJp3Yz2jVh.00iQx4kPJjAtBAGAAPafkYhIYlu76e8XKhePAyNeogvveNxWhmMJgH4DDQA6TouhBS5lv.jYdKkAC6RCQAwNjiAASn6YitDwqRAA"

// Ensure that the state can be decompressed and we don't break state from older versions
describe("Serialize and deserialize state", () => {
  test("Ensure we don't break older states (and migrate correctly)", () => {
    const state = decompressState(v1State);
    expect(state.rowData.length).toEqual(10);
    expect(state.unusedOptions).toEqual(750_000);
    expect(state.preMoney).toEqual(36_000_000);
    // Should default to 1 if not present in the legacy state
    expect(state.pricedRounds).toEqual(1);
    const store = createConversionStore(state);
    const preRoundSelector = getPreRoundCapTable(
      store.getState(),
    );
    expect(preRoundSelector.rows[0].ownershipPct?.toFixed(2)).toEqual("32.92")
    expect(preRoundSelector.rows[1].ownershipPct?.toFixed(2)).toEqual("32.92")
    const safeProps = getSAFERowPropsSelector(store.getState());
    expect(safeProps[0].ownershipPct?.toFixed(2)).toEqual("7.00")
    expect(safeProps[0].cap.toFixed(0)).toEqual("1785714")
    expect(safeProps[0].conversionType).toEqual("post")
    expect(safeProps[1].ownershipPct?.toFixed(2)).toEqual("3.75")
    expect(safeProps[1].cap).toEqual(10_000_000)
    expect(safeProps[1].conversionType).toEqual("mfn")

    const pricedRoundSelector = getPricedRoundCapTableSelector(
      store.getState(),
    );
    expect(pricedRoundSelector.rows[0].ownershipPct?.toFixed(2)).toEqual("27.86")

  });
});
