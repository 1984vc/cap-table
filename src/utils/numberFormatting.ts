const SUFFIX_FACTORS: Record<string, number> = {
  K: 1e3,
  M: 1e6,
  B: 1e9,
  T: 1e12,
};

export const stringToNumber = (value: string | number): number => {
  if (typeof value === "number") {
    return value;
  }
  const cleaned = value.trim().replace(/[,$%\s_]/g, "");
  const match = cleaned.match(/^(-?)(\d+(?:\.\d+)?)([KMBT])?$/i);
  if (!match) {
    return NaN;
  }
  const sign = match[1] === "-" ? -1 : 1;
  const base = parseFloat(match[2]);
  const suffix = (match[3] ?? "").toUpperCase();
  return sign * base * (SUFFIX_FACTORS[suffix] ?? 1);
};

export const formatUSDWithCommas = (value: number | string) => {
  if (typeof value === "string") {
    value = stringToNumber(value);
  }
  const minimumFractionDigits = value % 1 !== 0 ? 2 : 0;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits,
    maximumFractionDigits: 2,
  });
};

export const formatNumberWithCommas = (value: number | string) => {
  if (typeof value === "string") {
    value = stringToNumber(value);
  }
  return value.toLocaleString("en-US", {
    style: "decimal",
  });
};

export const shortenedUSD = (value: number | string) => {
  if (typeof value === "string") {
    value = stringToNumber(value);
  }
  if (!Number.isFinite(value)) {
    return String(value);
  }
  const sign = value < 0 ? "-" : "";
  const formatted = Math.abs(value).toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return sign + "$" + formatted;
};
