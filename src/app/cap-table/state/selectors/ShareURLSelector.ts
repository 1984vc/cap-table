import { createSelector } from "reselect";
import { IConversionStateData } from "../ConversionState";

export const getShareUrl = createSelector(
  (state: IConversionStateData) => state,
  (state): string => {
    const url = window.location.protocol + "//" + window.location.host + window.location.pathname;
    // Use the composite ID (objectId-editKey) if available, otherwise just objectId
    if (state.objectId && state.editKey) {
      return url + "#" + state.objectId + "-" + state.editKey;
    } else if (state.objectId) {
      return url + "#" + state.objectId;
    }
    return url;
  })