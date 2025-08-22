import React, { useEffect, useRef, useState } from "react";
import CurrencyInput from "react-currency-input-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { FaRegQuestionCircle, FaEdit } from "react-icons/fa";

import {
  IConversionState,
  SeriesState,
} from "@/cap-table/state/ConversionState";
import { WebSocketConnectionState } from "@/cap-table/managers/WebSocketManager";
import ExisingShareholderList from "@/components/safe-conversion/Conversion/ExistingShareholders";
import PricedRound from "@/components/safe-conversion/Conversion/PricedRound";
import SeriesInvestorList from "@/components/safe-conversion/Conversion/SeriesInvestorList";
import { formatNumberWithCommas, stringToNumber } from "@library/utils/numberFormatting";
import { getSAFERowPropsSelector } from "@/cap-table/state/selectors/SAFEPropsSelector";
import { getSeriesPropsSelector } from "@/cap-table/state/selectors/SeriesPropsSelector";
import SafeNoteList from "@/components/safe-conversion/Conversion/SafeNoteList";
import Share from "@/components/safe-conversion/Conversion/Share";
import History from "@/components/safe-conversion/Conversion/History";
import { CapTableResults } from "@/components/safe-conversion/Conversion/CapTableResults";
import { getReadOnlyUrl, getFullAccessUrl, hasEditAccess } from "./state/selectors/ShareURLSelector";
import { getErrorSelector } from "./state/selectors/ErrorSelector";
import { getCommonOnlyCapTable } from "./state/selectors/CommonOnlyCapTableSelector";
import { getPreRoundCapTable } from "./state/selectors/PreRoundCapTableSelector";
import {
  getPricedConversion,
  getPricedRoundCapTableSelector,
  getPricedRoundOverviewSelector,
} from "./state/selectors/PricedRoundSelector";
import TooltipComponent from "@/components/tooltip/Tooltip";
import { CapTableRowType } from "@library/cap-table/types";
import { addToHistory } from "@/services/historyService";

type WorksheetProps = {
  conversionState: IConversionState;
  createNewState: (findRecent: boolean) => void;
  onClone?: () => void;
  isCloning?: boolean;
  wsConnectionState: WebSocketConnectionState;
  showSavingIndicator: boolean;
};

function usePrevious<T>(value: T) {
  const ref = useRef<T>(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const Worksheet: React.FC<WorksheetProps> = ({
  conversionState,
  createNewState,
  onClone,
  isCloning,
  wsConnectionState,
  showSavingIndicator,
}) => {
  const {
    name,
    rowData,
    preMoney,
    targetOptionsPool,
    pricedRounds,
    onAddRow,
    onDeleteRow,
    onUpdateRow,
    onUpdateName,
    onMoveRow,
    onValueChange,
    togglepriceRounds,
  } = conversionState;

  const isReadOnly = !hasEditAccess(conversionState);

  const totalSeriesInvesment = (
    rowData.filter((row) => row.type === "series") as SeriesState[]
  )
    .map((row) => row.investment)
    .reduce((acc, val) => acc + val, 0);

  const [postMoney, setPostMoney] = useState(
    stringToNumber(preMoney) + totalSeriesInvesment
  );
  const previousPostMoney = usePrevious(postMoney);
  const pricedConversion = getPricedConversion(conversionState);

  const [preMoneyChange, updatePreMoneyChange] = useState(0);
  const [investmentChange, updateInvestmentChange] = useState(0);
  const [targetOptionsChange, updateTargetOptionsChange] = useState(0);

  const errors = getErrorSelector(conversionState);

  const hasPricedRound = (pricedRounds ?? 1) > 0;

  useEffect(
    () => {
      // Lots of work here to get around a circular dependency of pre-money and post-money
      if (previousPostMoney !== postMoney) {
        onValueChange("number")(
          (postMoney - totalSeriesInvesment).toString(),
          "preMoney"
        );
      } else {
        setPostMoney(stringToNumber(preMoney) + totalSeriesInvesment);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [postMoney, preMoney, totalSeriesInvesment]
  );

  const onPostMoneyChange = (val: string | undefined) => {
    setPostMoney(stringToNumber(val ?? 0));
  };

  // State for editing worksheet name
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(name || "");

  const handleNameSave = () => {
    onUpdateName(tempName);
    // Update history with the new name immediately
    if (conversionState.objectId) {
      addToHistory(conversionState.objectId, tempName, conversionState.editKey);
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setTempName(name || "");
    setIsEditingName(false);
  };

  const handleNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      handleNameCancel();
    }
  };

  return (
    <div className={"not-prose mx-4"}>
      <div className="w-full flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6">
        {/* Left side: Worksheet Name and Connection Status */}
        <div className="flex flex-col min-w-0 flex-1">
          {/* Worksheet Name Section */}
          <div className="mb-2">
            {isEditingName && !isReadOnly ? (
              <div className="flex items-center gap-2">
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={handleNameKeyPress}
                  onBlur={handleNameSave}
                  className="text-2xl lg:text-3xl font-bold bg-transparent border-2 border-nt84orange focus:border-nt84orange"
                  placeholder="Enter worksheet name..."
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white break-words">
                  {name || "Untitled Worksheet"}
                </h1>
                {!isReadOnly && (
                  <button
                    onClick={() => {
                      setTempName(name || "");
                      setIsEditingName(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex-shrink-0"
                    title="Edit worksheet name"
                  >
                    <FaEdit className="w-4 h-4 text-gray-500 hover:text-nt84orange" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Connection status indicator */}
            {wsConnectionState.status === 'connected' && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
            )}
            {wsConnectionState.status === 'connecting' && (
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse flex-shrink-0"></div>
            )}
            {wsConnectionState.status === 'disconnected' && (
              <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
            )}
            {wsConnectionState.status === 'error' && (
              <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
            )}
            
            {/* Connection status text */}
            <span className="text-sm text-gray-600 dark:text-gray-400 break-words">
              {wsConnectionState.status === 'connected' && 'Connected'}
              {wsConnectionState.status === 'connecting' && 'Connecting...'}
              {wsConnectionState.status === 'disconnected' && 'Disconnected'}
              {wsConnectionState.status === 'error' && 'Connection Error'}
              {wsConnectionState.status === 'connected' && (
                <span className="hidden sm:inline"> • Auto-save enabled</span>
              )}
            </span>
            
            {/* Saving indicator */}
            {showSavingIndicator && (
              <span className="text-sm text-blue-600 dark:text-blue-400 animate-pulse">
                • Saving...
              </span>
            )}
          </div>
        </div>

        {/* Right side: Action Buttons */}
        <div className="flex gap-2 flex-shrink-0">
          <Share 
            readOnlyUrl={getReadOnlyUrl(conversionState)}
            fullAccessUrl={hasEditAccess(conversionState) ? getFullAccessUrl(conversionState) : undefined}
            hasEditAccess={hasEditAccess(conversionState)}
            onClone={onClone}
            isCloning={isCloning}
          />
          <History 
            currentObjectId={conversionState.objectId}
          />
          {!isReadOnly && (
            <Button
              className="w-28 bg-nt84blue hover:bg-nt84bluedarker text-white dark:text-white cursor-pointer"
              onClick={() => createNewState(false)}
            >
              Create New
            </Button>
          )}
        </div>
      </div>


      <h1 className="text-2xl font-bold mb-12 pl-2">1&#41;  Existing Cap Table</h1>
      <div>
        <ExisingShareholderList
          rows={getCommonOnlyCapTable(conversionState)}
          onAddRow={() => onAddRow(CapTableRowType.Common)}
          onDelete={onDeleteRow}
          onUpdate={(data) => {
            if (data.id === "UnusedOptionsPool") {
              onValueChange("number")(data.shares.toString(), "unusedOptions");
            } else {
              onUpdateRow(data);
            }
          }}
          isReadOnly={isReadOnly}
        />
      </div>
      <h1 className="text-2xl font-bold mb-12 mt-24 pl-2">2&#41; SAFE Investors</h1>
      <div>
        <SafeNoteList
          rows={getSAFERowPropsSelector(conversionState)}
          onAddRow={() => onAddRow(CapTableRowType.Safe)}
          onDelete={onDeleteRow}
          onUpdate={onUpdateRow}
          onMoveRow={onMoveRow}
          isReadOnly={isReadOnly}
        />
      </div>

      <div className="pt-10">
        <div className="ml-2 pb-4 not-prose">
          {hasPricedRound ? (
            <h1 className="text-lg font-bold mb-4 mt-4">
              Cap Table Before Priced Round
            </h1>
          ) : (
            <TooltipComponent content="Until a priced round is entered, this is just an estimate based on the assumption that all SAFE's convert at their current Cap or, if uncapped, the maximum Cap of all SAFE's">
              <h1 className="text-lg font-bold mb-4 mt-4">
                Cap Table Before Priced Round
                <sup>
                  <FaRegQuestionCircle className="inline ml-1" />
                </sup>
              </h1>
            </TooltipComponent>
          )}
        </div>
        <CapTableResults
          {...getPreRoundCapTable({
            ...conversionState,
          })}
        />
      </div>

      {!isReadOnly && (
        <div className="mt-12">
          {hasPricedRound ? (
            <Button
              onClick={togglepriceRounds}
              className="w-full bg-nt84blue hover:bg-nt84bluedarker text-white dark:text-white cursor-pointer"
            >
              Remove Priced Round
            </Button>
          ) : (
            <Button
              onClick={togglepriceRounds}
              className="w-full bg-nt84blue hover:bg-nt84bluedarker text-white dark:text-white cursor-pointer"
            >
              Add Priced Round
            </Button>
          )}
        </div>
      )}

      {hasPricedRound && (
        <div>
          <div>
            <hr />
            <h1 className="text-2xl font-bold mb-12 mt-24">3&#41; New Round </h1>
            <h1 className="text-lg font-bold mb-4">Round Details</h1>
            <div className="sm:max-w-[960px] mx-auto mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 relative">
              <div className="flex flex-wrap gap-4">
                <div className="w-full sm:w-1/5 md:w-1/5 lg:w-1/5">
                  <h2 className="my-2 not-prose">Premoney Valuation</h2>
                  {isReadOnly ? (
                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded flex-1 w-full">
                      ${formatNumberWithCommas(stringToNumber(preMoney))}
                    </div>
                  ) : (
                    <CurrencyInput
                      type="text"
                      name="preMoney"
                      value={preMoney}
                      onValueChange={onValueChange("number")}
                      placeholder="Investment"
                      className="flex-1 w-full"
                      prefix="$"
                      decimalScale={0}
                      allowDecimals={false}
                      customInput={Input}
                    />
                  )}
                </div>
                <div className="w-full sm:w-1/5 md:w-1/5 lg:w-1/5">
                  <h2 className="my-2 not-prose">Post Money Valuation</h2>
                  {isReadOnly ? (
                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded flex-1 w-full">
                      ${formatNumberWithCommas(postMoney)}
                    </div>
                  ) : (
                    <CurrencyInput
                      type="text"
                      name="totalSeriesInvestment"
                      value={postMoney}
                      onValueChange={onPostMoneyChange}
                      className="flex-1 w-full"
                      prefix="$"
                      decimalScale={0}
                      allowDecimals={false}
                      customInput={Input}
                    />
                  )}
                </div>
                <div className="w-full sm:w-1/5 md:w-1/5 lg:w-1/5">
                  <h2 className="my-2 not-prose">Target Options Pool</h2>
                  {isReadOnly ? (
                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded flex-1 w-full">
                      {targetOptionsPool}%
                    </div>
                  ) : (
                    <CurrencyInput
                      type="text"
                      name="targetOptionsPool"
                      value={targetOptionsPool}
                      onValueChange={onValueChange("percent")}
                      placeholder="Target Options Pool %"
                      className="flex-1 w-full"
                      prefix=""
                      suffix="%"
                      decimalScale={1}
                      max={99}
                      allowDecimals={true}
                      customInput={Input}
                    />
                  )}
                </div>
                <div className="w-full sm:w-1/5 md:w-1/5 lg:w-1/5">
                  <div className="text-gray-500 dark:text-gray-400 mb-1 my-2">
                    Additional Options
                  </div>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded">
                    {formatNumberWithCommas(pricedConversion?.additionalOptions || 0)}
                  </div>
                </div>
              </div>
            </div>
            <h1 className="text-lg font-bold mb-4 mt-12">Series Investors</h1>
            <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
              <SeriesInvestorList
                rows={getSeriesPropsSelector(conversionState)}
                onAddRow={() => onAddRow(CapTableRowType.Series)}
                onDelete={onDeleteRow}
                onUpdate={onUpdateRow}
                isReadOnly={isReadOnly}
              />
            </div>
          </div>

          <div className="pt-10">
            <h2 className="text-2xl font-bold mb-4 not-prose">
              Priced Round Overview
            </h2>
            {errors.safeError && (
              <p className="text-red-500 text-xl">SAFE Conversion Error</p>
            )}
            {!errors.safeError && (
              <div className="">
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
                    targetOptionsChange,
                  })}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Worksheet;
