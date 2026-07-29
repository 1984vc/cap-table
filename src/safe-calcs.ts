import { CapTableOwnershipError, SAFENote } from "./cap-table/types";
import { CalculationError, validateSafes } from "./validation";
import { RoundingStrategy, roundPPSToPlaces, roundShares } from "./utils/rounding";

export type EffectiveSAFE = SAFENote & {
  contractualTerms?: Pick<SAFENote, "cap" | "discount" | "conversionType">;
  electionSourceIndex?: number;
  electionSourceName?: string;
};

export const isMFN = (safe: SAFENote): boolean =>
  safe.conversionType === "mfn" ||
  safe.conversionType === "ycmfn" ||
  safe.sideLetters?.includes("mfn") === true;

const candidatePrice = (safe: SAFENote, preShares: number, postShares: number, roundPPS: number): number => {
  if (safe.conversionType === "pre") {
    throw new CalculationError("UNSUPPORTED_TERMS", "an MFN SAFE cannot adopt a later pre-money SAFE package");
  }
  return safeConvert({ ...safe, conversionType: "post" }, preShares, postShares, roundPPS);
};

/** Resolve complete later SAFE packages. Equal prices retain the earliest package. */
export const resolveMFNElections = (
  safes: SAFENote[],
  preShares: number,
  postShares: number,
  roundPPS: number,
): EffectiveSAFE[] => safes.map((safe, index) => {
  if (!isMFN(safe)) return { ...safe };
  let best: { safe: SAFENote; index: number; price: number } | undefined;
  for (let later = index + 1; later < safes.length; later++) {
    const candidate = safes[later];
    if (isMFN(candidate)) continue;
    const price = candidatePrice(candidate, preShares, postShares, roundPPS);
    if (!best || price < best.price) best = { safe: candidate, index: later, price };
  }
  if (!best) return { ...safe };
  return {
    ...safe,
    cap: best.safe.cap,
    discount: best.safe.discount,
    conversionType: "post",
    contractualTerms: {
      cap: safe.cap,
      discount: safe.discount,
      conversionType: safe.conversionType,
    },
    electionSourceIndex: best.index,
    electionSourceName: best.safe.name,
  };
});

/**
 * Compatibility helper for estimates that have no round price. It elects a
 * complete later post-money package; capped packages compare by cap, while an
 * uncapped discount beats an uncapped/no-discount package.
 */
export const populateSafeCaps = (safeNotes: SAFENote[]): EffectiveSAFE[] =>
  safeNotes.map((safe, index) => {
    if (!isMFN(safe)) return { ...safe };
    const candidates = safeNotes
      .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
      .slice(index + 1)
      .filter(({ candidate }) => !isMFN(candidate));
    if (candidates.some(({ candidate }) => candidate.conversionType === "pre")) {
      throw new CalculationError("UNSUPPORTED_TERMS", "an MFN SAFE cannot adopt a later pre-money SAFE package");
    }
    const ranked = candidates.sort((a, b) => {
      const aCap = a.candidate.cap || Number.POSITIVE_INFINITY;
      const bCap = b.candidate.cap || Number.POSITIVE_INFINITY;
      if (aCap !== bCap) return aCap - bCap;
      return b.candidate.discount - a.candidate.discount;
    });
    const elected = ranked[0];
    if (!elected) return { ...safe };
    return {
      ...safe,
      cap: elected.candidate.cap,
      discount: elected.candidate.discount,
      conversionType: "post",
      contractualTerms: { cap: safe.cap, discount: safe.discount, conversionType: safe.conversionType },
      electionSourceIndex: elected.candidateIndex,
      electionSourceName: elected.candidate.name,
    };
  });

export const getCapForSafe = (idx: number, safes: SAFENote[]): number =>
  populateSafeCaps(safes)[idx].cap;

export const sumSafeConvertedShares = (
  safes: SAFENote[],
  pps: number,
  preMoneyShares: number,
  postMoneyShares: number,
  roundingStrategy: RoundingStrategy,
): number => safes.reduce((sum, safe) => {
  const safePPS = roundPPSToPlaces(safeConvert(safe, preMoneyShares, postMoneyShares, pps), roundingStrategy.roundPPSPlaces);
  return sum + roundShares(safe.investment / safePPS, roundingStrategy);
}, 0);

export const safeConvert = (
  safe: SAFENote,
  preShares: number,
  postShares: number,
  pps: number,
): number => {
  if (safe.conversionType === "yc7p") {
    // Expressing a fixed percentage as a synthetic PPS lets legacy callers use
    // investment / PPS while the solver supplies the exact reconciled shares.
    return safe.investment / (0.07 * postShares);
  }
  const discountPPS = (1 - safe.discount) * pps;
  if (safe.cap === 0) return discountPPS;
  const shares = safe.conversionType === "pre" ? preShares : postShares;
  return Math.min(discountPPS, safe.cap / shares);
};

export const checkSafeNotesForErrors = (safeNotes: SAFENote[]): CapTableOwnershipError | undefined => {
  validateSafes(safeNotes);
  return undefined;
};
