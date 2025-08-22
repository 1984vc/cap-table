import { decompressFromBase64 } from "lz-string";

const decodeURLSafeBase64 = (str: string): string => {
  return str.replace(/_/g, "/").replace(/-/g, "+").replace(/\./g, "+");
};

const decodeVersionMagicCode = (
  b64: string,
): [version: number, b64: string] => {
  const version = new Uint8Array(atob(b64.slice(0, 2)).split('').map((char) => char.charCodeAt(0)))[0];
  const b64str = decodeURLSafeBase64(b64.slice(2));
  return [version, b64str];
};

export const decompressState = (str: string): any => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [version, b64str] = decodeVersionMagicCode(str);

  const stateBuffer = decompressFromBase64(b64str);
  if (!stateBuffer || version !== 0) {
    throw new Error("Failed to decompress state data");
  }
  
  return JSON.parse(stateBuffer);
};

export const isLegacyHash = (hash: string): boolean => {
  return hash.length > 0 && hash.charAt(0) === "A";
};
