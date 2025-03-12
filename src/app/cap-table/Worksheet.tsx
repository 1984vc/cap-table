import React, { useEffect, useRef, useState } from "react";
import CurrencyInput from "react-currency-input-field";

import {
  IConversionState,
  SeriesState,
} from "@/cap-table/state/ConversionState";
import ExisingShareholderList from "@/components/safe-conversion/Conversion/ExistingShareholders";
import PricedRound from "@/components/safe-conversion/Conversion/PricedRound";
import SeriesInvestorList from "@/components/safe-conversion/Conversion/SeriesInvestorList";
import { stringToNumber } from "@library/utils/numberFormatting";
import { getSAFERowPropsSelector } from "@/cap-table/state/selectors/SAFEPropsSelector";
import { getSeriesPropsSelector } from "@/cap-table/state/selectors/SeriesPropsSelector";
import SafeNoteList from "@/components/safe-conversion/Conversion/SafeNoteList";
import Share from "@/components/safe-conversion/Conversion/Share";
import { CapTableResults } from "@/components/safe-conversion/Conversion/CapTableResults";
import { getShareUrl } from "./state/selectors/ShareURLSelector";
import { getErrorSelector } from "./state/selectors/ErrorSelector";
import Finder from "@/components/safe-conversion/Conversion/Finder";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { localStorageWorks } from "./state/localstorage";
import { getCommonOnlyCapTable } from "./state/selectors/CommonOnlyCapTableSelector";
import { getPreRoundCapTable } from "./state/selectors/PreRoundCapTableSelector";
import { getPricedConversion, getPricedRoundCapTableSelector, getPricedRoundOverviewSelector } from "./state/selectors/PricedRoundSelector";
import TooltipComponent from "@/components/tooltip/Tooltip";
import { CapTableRowType } from "@library/cap-table/types";

type WorksheetProps = {
  conversionState: IConversionState;
  currentStateId: string
  loadById: (id: string) => void;
  createNewState: (findRecent: boolean) => void;
} 

function usePrevious<T>(value: T) {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const Worksheet: React.FC<WorksheetProps> = ({conversionState, currentStateId, loadById, createNewState}) => {

  const {
    rowData,
    preMoney,
    targetOptionsPool,
    pricedRounds,
    onAddRow,
    onDeleteRow,
    onUpdateRow,
    onMoveRow,
    onValueChange,
    togglepriceRounds,
  } = conversionState;

  const totalSeriesInvesment = (
    rowData.filter((row) => row.type === "series") as SeriesState[]
  )
    .map((row) => row.investment)
    .reduce((acc, val) => acc + val, 0);

  const [postMoney, setPostMoney] = useState(stringToNumber(preMoney) + totalSeriesInvesment);
  const previousPostMoney = usePrevious(postMoney);
  const pricedConversion = getPricedConversion(conversionState);

  const [preMoneyChange, updatePreMoneyChange] = useState(0);
  const [investmentChange, updateInvestmentChange] = useState(0);
  const [targetOptionsChange, updateTargetOptionsChange] = useState(0);

  const errors = getErrorSelector(conversionState);

  const hasPricedRound = (pricedRounds ?? 1) > 0
  
  useEffect(() => {
    // Lots of work here to get around a circular dependency of pre-money and post-money
    if (previousPostMoney !== postMoney) {
      onValueChange("number")((postMoney - totalSeriesInvesment).toString(), "preMoney");
    } else {
      setPostMoney(stringToNumber(preMoney) + totalSeriesInvesment);
    }
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [postMoney, preMoney, totalSeriesInvesment])

  const onPostMoneyChange = (val: string | undefined) => {
    setPostMoney(stringToNumber(val ?? 0));
  }

  return (
    <div className={"not-prose"}>
      <div className="w-full flex justify-end gap-2">
        <Share url={getShareUrl(conversionState)}></Share>
        { localStorageWorks &&
          <Finder currentId={currentStateId} loadById={loadById}></Finder>
        }
        <button
          className={`w-28 px-2 text-center cursor-pointer py-2 focus:outline-none focus:ring-2 text-white bg-nt84blue hover:bg-nt84bluedarker inline`}
          onClick={() => createNewState(false)}
        >
          Reset<ArrowPathIcon className="inline pl-2" width={20} />
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-12 pl-2">1 Existing Cap Table</h1>
      <div>
        <ExisingShareholderList
          rows={getCommonOnlyCapTable(conversionState)}
          onAddRow={() => onAddRow(CapTableRowType.Common)}
          onDelete={onDeleteRow}
          onUpdate={(data) => {
            if (data.id === "UnusedOptionsPool") {
              onValueChange("number")(data.shares.toString(), "unusedOptions");
            } else {
              onUpdateRow(data)
            }
          }}
        />
      </div>
      <h1 className="text-2xl font-bold mb-12 mt-24 pl-2">2 SAFE Investors</h1>
      <div>
        <SafeNoteList
          rows={getSAFERowPropsSelector(conversionState)}
          onAddRow={() => onAddRow(CapTableRowType.Safe)}
          onDelete={onDeleteRow}
          onUpdate={onUpdateRow}
          onMoveRow={onMoveRow}
        />
      </div>

      <div className="pt-10 ml-10">
        <div className="ml-2 mb-4 inline not-prose">
          { hasPricedRound ? 
            <span>Cap Table Before Priced Round</span>
            :
            <TooltipComponent content="Until a priced round is entered, this is just an estimate based on the assumption that all SAFE's convert at their current Cap or, if uncapped, the maximum Cap of all SAFE's">Cap Table Before Priced Round<sup>?</sup></TooltipComponent>
          }
        </div>
        <CapTableResults
          {...getPreRoundCapTable({
            ...conversionState,
          })}
        />
      </div>

      <div className="mt-12">
      { hasPricedRound ?
        <button
          onClick={togglepriceRounds}
          className="ml-10 px-4 py-2  bg-nt84blue text-white hover:bg-nt84bluedarker focus:outline-none focus:ring-blue-500"
        >
          Remove Priced Round
        </button> :
        <button
          onClick={togglepriceRounds}
          className="ml-10 px-4 py-2  bg-nt84blue text-white hover:bg-nt84bluedarker focus:outline-none focus:ring-blue-500"
        >
          Add Priced Round
        </button>
      }
      </div>

      { hasPricedRound &&
      <div>
        <div>
          <h1 className="text-2xl font-bold mb-12 mt-12 pl-2">3 New Round </h1>
          <div className="flex space-x-4 ml-10">
            <div className="w-1/4">
              <h2 className="my-2 not-prose">Premoney Valuation</h2>
              <div className="z-10 max-w-5xl items-center justify-between font-mono text-sm">
                <CurrencyInput
                  type="text"
                  name="preMoney"
                  value={preMoney}
                  onValueChange={onValueChange("number")}
                  placeholder="Investment"
                  className="flex-1 w-full px-3 py-2 mr-4 border  focus:outline-none focus:ring-2 focus:ring-blue-500"
                  prefix="$"
                  decimalScale={0}
                  allowDecimals={false}
                />
              </div>
            </div>
            <div className="w-1/4">
              <h2 className="my-2 not-prose">Post Money Valuation</h2>
              <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
                <CurrencyInput
                  type="text"
                  name="totalSeriesInvestment"
                  value={postMoney}
                  onValueChange={onPostMoneyChange}
                  className="flex-1 w-full px-3 py-2 border  focus:outline-none focus:ring-2 focus:ring-blue-500"
                  prefix="$"
                  decimalScale={0}
                  allowDecimals={false}
                />
              </div>
            </div>
          </div>
          <div className="flex space-x-4 ml-10">
            <div className="w-1/4">
              <h2 className="my-2 not-prose">Target Options Pool</h2>
              <CurrencyInput
                type="text"
                name="targetOptionsPool"
                value={targetOptionsPool}
                onValueChange={onValueChange("percent")}
                placeholder="Target Options Pool %"
                className="flex-1 w-full px-3 py-2 border  focus:outline-none focus:ring-2 focus:ring-blue-500"
                prefix=""
                suffix="%"
                decimalScale={1}
                max={99}
                allowDecimals={true}
              />
            </div>
            <div className="w-1/4">
              <h2 className="my-2 not-prose">Additional Options</h2>
              <CurrencyInput
                type="text"
                name="additionalOptions"
                value={pricedConversion?.additionalOptions}
                className="flex-1 w-full px-3 py-2 bg-gray-100 dark:bg-inherit border  focus:outline-none focus:ring-2 focus:ring-blue-500"
                prefix=""
                decimalScale={0}
                max={99}
                maxLength={2}
                allowDecimals={false}
                disabled={true}
              />
            </div>
          </div>
          <h1 className="text-1xl font-bold mb-4 mt-12 ml-10">Series Investors</h1>
          <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
            <SeriesInvestorList
              rows={getSeriesPropsSelector(conversionState)}
              onAddRow={() => onAddRow(CapTableRowType.Series)}
              onDelete={onDeleteRow}
              onUpdate={onUpdateRow}
            />
          </div>
        </div>

        <div className="pt-10">
          <h2 className="text-2xl ml-10 font-bold mb-4 not-prose">Priced Round Overview</h2>
          {errors.safeError && <p className="text-red-500 text-xl">SAFE Conversion Error</p>}
          {!errors.safeError &&
            <div className="ml-10">
              <PricedRound
                {...getPricedRoundOverviewSelector({
                  ...conversionState,
                  preMoneyChange,
                  investmentChange,
                  targetOptionsChange,
                })}
                updateInvestmentChange={updateInvestmentChange}
                updatePreMoneyChange={updatePreMoneyChange}
                updateTargetOptionsChange={updateTargetOptionsChange}
              />
              <h2 className="text-lg font-bold mb-4 mt-8 not-prose">
                Cap Table after Priced Round
              </h2>
              <CapTableResults
                {...getPricedRoundCapTableSelector({
                  ...conversionState,
                  preMoneyChange,
                  investmentChange,
                  targetOptionsChange
                })}
              />
            </div>
          }
        </div>
      </div>
      }
    </div>
  );
};

export default Worksheet