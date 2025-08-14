import { describe, it, expect } from "vitest";
import { decompressState, isLegacyHash } from "../src/utils/stateCompression";

describe("Legacy Hash Conversion", () => {
  const legacyHash = "AAN4IgDgTgpgsg9gOygTxALgBwAYe4DQgAuAhhAOZSEDyYhAlogM4AKccANulgQK4I.MoAExr0mXAhDgB3ACLES6ANqg6Q9CACcIAoWRgoGgMZwAtqcQ6QCYqcNoQAMTh8hUCAAIAglcYALUihGdABGXHwQGSQIfzowZVB_QOC0MPDucHcjKARCdAAmAGYAOnyAVjKMEMLNMsKAFgwMQoB2AncpCHQAM2J2QQBfPESA6BS08IIDCGzcgpDigDZ8ls0QkMWsevWsfPqy9ohOnr7B4ZAksdD0jOnZvNSMYo2W.vqV1Yx87_zD47Rev0oAMALoEPrsGSyKDsSj2QgQHjA85qDRhKx6AzGMwWBBWGx2DTOVzuDwAIV8oyC13SBCi7li8TQKguVPGNymWRyDzKGQ6cC6ANOyJGyRpk0yM256Hqi2KvJwITqb00mhaNXqfwFJyBQ1FV1SHMl93QNWKWDKqrVLRCTU0i2qBxA_MFgMGYJAEKhMLh6ARSL1IFRDgAkoxGEiRLQGAhgrp9PYQCZzJYCATE2GI8IPKIY3HWWK0Bl6TE_HEEgWDbcuXMi1rXcLA5dqXXjdLWy6dWd9S3q1La3yjtqhbqPV65D7CPDESKg.oHBsMQmNIIIHRqWnbImAMpQbMhhAANyChG1BDoR5Pdlr.SNJcZFebKQVETu7dvoPB7EhE9hU67wIepAdDZEIABKLgIEI4wDEAA";

  it("should identify legacy hash correctly", () => {
    expect(isLegacyHash(legacyHash)).toBe(true);
    expect(isLegacyHash("BNotALegacyHash")).toBe(false);
    expect(isLegacyHash("")).toBe(false);
  });

  it("should decompress legacy hash to valid state", () => {
    const decompressedState = decompressState(legacyHash);
    
    // Check that we get a valid state object
    expect(decompressedState).toBeDefined();
    expect(typeof decompressedState).toBe("object");
    
    // Check that data contains expected cap table structure
    expect(decompressedState).toHaveProperty("rowData");
    expect(Array.isArray(decompressedState.rowData)).toBe(true);
    
    // Check for other expected properties
    expect(decompressedState).toHaveProperty("preMoney");
  });

  it("should handle invalid legacy hash gracefully", () => {
    expect(() => decompressState("AInvalidHash")).toThrow();
    expect(() => decompressState("AAInvalidBase64")).toThrow();
  });
});
