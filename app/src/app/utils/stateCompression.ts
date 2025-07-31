import { IConversionStateData } from "@/cap-table/state/ConversionState";
import { CapTableRowType } from "@library/cap-table/types";
import { compressToBase64, decompressFromBase64 } from "lz-string";

// Allow for future changes to state compression and rehydration
const VERSION_MAGIC_CODE = "AA";

// We removed the `ycmfn` and `yc7p` conversion types
const migrateState = (state: IConversionStateData): IConversionStateData => {
  const rowData = state.rowData.map((row) => {
    if (row.type === CapTableRowType.Safe) {
      let conversionType = row.conversionType;
      if (conversionType === "ycmfn") {
        conversionType = "mfn";
      } else if (conversionType === "yc7p") {
        conversionType = "post";
      }
      return {
        ...row,
        conversionType,
      };
    }
    return row
  })
  return {
    ...state,
    rowData,
  };
}

const encodeURLSafeBase64 = (str: string): string => {
  // Replace characters that are not URL safe
  // Use `.` for `+` because it doesn't wrap in a text editor
  return str.replace(/\//g, "_").replace(/\+/g, ".").replace(/=/g, "");
};

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

export const compressState = (state: IConversionStateData): string => {
  const hash = compressToBase64(JSON.stringify(state));
  return encodeURLSafeBase64(`${VERSION_MAGIC_CODE}${hash}`);
};

export const decompressState = (str: string): IConversionStateData => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_version, b64str] = decodeVersionMagicCode(str);
  // for now, do nothing with the version

  const stateBuffer = decompressFromBase64(b64str);
  const stateObj = JSON.parse(stateBuffer.toString());
  // Ensure that our old state data is still compatible
  return migrateState(stateObj as IConversionStateData);
};
