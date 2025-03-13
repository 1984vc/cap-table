import { useState } from "react";
import { FaRegClock } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { getRecentStates } from "@/cap-table/state/localstorage";
import { compressState } from "@/utils/stateCompression";
import { IConversionStateData } from "@/cap-table/state/ConversionState";
import { shortenedUSD } from "@library/utils/numberFormatting";
import { CapTableRowType } from "@library/cap-table/types";

// Get a list of recent states from local storage
// Also allow for a reset of the recent states
const Finder: React.FC<{
  currentId: string;
  loadById: (id: string) => void;
}> = ({ currentId, loadById }) => {
  const [showModal, setShowModal] = useState(false);

  const buttonText = () => {
    return (
      <span>
        History
        <span className="inline">
          <FaRegClock className="inline ml-2" width={20} />
        </span>
      </span>
    );
  };

  const url =
    window.location.protocol +
    "//" +
    window.location.host +
    window.location.pathname;

  const recentStates = () => {
    return getRecentStates().map((state) => {
      const hash = compressState(state.conversionState);
      return {
        id: state.id,
        updatedAt: state.updatedAt,
        createdAt: state.createdAt,
        hash,
        state: state.conversionState,
        url: `${url}#I${compressState(state.conversionState)}`,
      };
    });
  };

  const describeCapTable = (state: IConversionStateData) => {
    const safeInvestments = state.rowData
      .filter((row) => row.type === CapTableRowType.Safe)
      .map((row) => row.investment)
      .reduce((acc, val) => acc + val, 0);
    const safeCount = state.rowData.filter(
      (row) => row.type === CapTableRowType.Safe
    ).length;
    return `${safeCount} SAFE${
      safeCount === 1 ? "" : "'s"
    } totaling ${shortenedUSD(safeInvestments)}`;
  };

  // Credit to https://www.builder.io/blog/relative-time
  function getRelativeTimeString(
    date: Date | number,
    lang = navigator.language
  ): string {
    // Allow dates or times to be passed
    const timeMs = typeof date === "number" ? date : date.getTime();

    // Get the amount of seconds between the given date and now
    const deltaSeconds = Math.round((timeMs - Date.now()) / 1000);

    // Array reprsenting one minute, hour, day, week, month, etc in seconds
    const cutoffs = [
      60,
      3600,
      86400,
      86400 * 7,
      86400 * 30,
      86400 * 365,
      Infinity,
    ];

    // Array equivalent to the above but in the string representation of the units
    const units: Intl.RelativeTimeFormatUnit[] = [
      "second",
      "minute",
      "hour",
      "day",
      "week",
      "month",
      "year",
    ];

    // Grab the ideal cutoff unit
    const unitIndex = cutoffs.findIndex(
      (cutoff) => cutoff > Math.abs(deltaSeconds)
    );

    // Get the divisor to divide from the seconds. E.g. if our unit is "day" our divisor
    // is one day in seconds, so we can divide our seconds by this to get the # of days
    const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1;

    // Intl.RelativeTimeFormat do its magic
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
    return rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex]);
  }

  return (
    <div className="">
      <Button
        className="w-28 bg-nt84blue hover:bg-nt84bluedarker dark:text-white"
        onClick={() => setShowModal(true)}
      >
        {buttonText()}
      </Button>
      {showModal && (
        <div className="fixed z-50 inset-0 flex items-center justify-center overflow-hidden">
          <div className="fixed inset-0 transition-opacity">
            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>

          <div className=" text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full">
            <div className="bg-white dark:bg-gray-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 className="text-xl leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">
                Recent Cap Tables
              </h3>
              <ul>
                {recentStates().map((state) => (
                  <li key={state.id}>
                    <a
                      onClick={() => {
                        loadById(state.id);
                        setShowModal(false);
                      }}
                      className={`text-blue-500 hover:underline dark:text-blue-200 ${
                        state.id === currentId
                          ? "bg-gray-100 dark:bg-gray-800"
                          : ""
                      }`}
                    >
                      {state.id.slice(0, 7)} - {describeCapTable(state.state)}{" "}
                      <span className="text-xs text-gray-900 dark:text-gray-300">
                        ({getRelativeTimeString(state.updatedAt)})
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-200 dark:bg-gray-800 px-4 py-3 sm:flex sm:flex-row-reverse">
              <Button
                type="button"
                variant="secondary"
                className="sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => setShowModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finder;
