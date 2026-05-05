export const stringToNumber = (value: string | number): number => {
  if (typeof value === "number") {
    return value;
  } else {
    // Remove anything that's not a digit or a period or negative sign
    const cleanedValue = value.replace(/[^-\d.]/g, "");
    // if it has a period, parseFloat, otherwise parseInt
    return cleanedValue.includes(".")
      ? parseFloat(cleanedValue)
      : parseInt(cleanedValue, 10);
  }
};

export const formatUSDWithCommas = (value: number | string) => {
  if (typeof value === "string") {
    value = stringToNumber(value);
  }
  const maximumFractionDigits = value < 1000 ? 2 : 0
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
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

  if (value >= 1_000_000) {
    return "$" + (value / 1_000_000).toFixed(1) + "M";
  } else if (value >= 1_000) {
    return "$" + (value / 1_000).toFixed(1) + "K";
  } else {
    return "$" + value.toString();
  }
};
