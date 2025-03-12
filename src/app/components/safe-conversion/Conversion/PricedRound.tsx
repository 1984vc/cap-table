import { formatNumberWithCommas } from "@library/utils/numberFormatting";
import { BestFit } from "@library/conversion-solver";
import QuestionMarkTooltipComponent from "@/components/tooltip/QuestionMarkTooltip";
import { CapTableOwnershipError } from "@library/cap-table/types";

export type OwnershipPctNotes = {
  error?: CapTableOwnershipError["type"];
  explanation?: string;
};

interface PricedRoundData {
  preMoney: number;
  postMoney: number;
  totalSeriesInvestment: number;
  totalShares: number;
  newSharesIssued: number;
  totalInvestedToDate: number;
  pricedConversion: BestFit;
  totalRoundDilution: number;
}

export interface PricedRoundPropsData {
  current: PricedRoundData;
  previous: PricedRoundData;
  preMoneyChange: number;
  investmentChange: number;
  targetOptionsChange: number;
}

export interface PricedRoundProps extends PricedRoundPropsData {
  updateInvestmentChange: (change: number) => void;
  updatePreMoneyChange: (change: number) => void;
  updateTargetOptionsChange: (change: number) => void;
}

const roundFactor = Math.pow(10, 5);
const quickRound = (num: number) => Math.round(num * roundFactor) / roundFactor;

const PricedRound: React.FC<PricedRoundProps> = (props) => {
  const current = props.current;
  const previous = props.previous;

  const {
    preMoneyChange,
    investmentChange,
    targetOptionsChange,
    updateInvestmentChange,
    updatePreMoneyChange,
    updateTargetOptionsChange,
  } = props;

  const currentTargetOptions = current.pricedConversion.totalOptions / current.pricedConversion.totalShares;
  const previousTargetOptions = previous.pricedConversion.totalOptions / previous.pricedConversion.totalShares;
  const currentTargetOptionsChange = quickRound(currentTargetOptions - previousTargetOptions);

  const increment = (name: "preMoney" | "investment" | "options") => {
    if (name === "preMoney") {
      const change = preMoneyChange + 500_000;
      updatePreMoneyChange(change);
    } else if (name === "investment") {
      const change = investmentChange + 500_000;
      updateInvestmentChange(change);
    } else if (name === "options") {
      const change = quickRound(targetOptionsChange + 0.01);
      if (change < 1) updateTargetOptionsChange(change);
    }
  };

  const decrement = (name: "preMoney" | "investment" | "options") => {
    if (name === "preMoney") {
      const change = preMoneyChange - 500_000;
      if (previous.preMoney + change > 0) {
        updatePreMoneyChange(change);
      }
    } else if (name === "investment") {
      const change = investmentChange - 500_000;
      if (previous.totalSeriesInvestment + change > 0) {
        updateInvestmentChange(change);
      }
    } else if (name === "options") {
      const change = quickRound(targetOptionsChange - 0.01);
      updateTargetOptionsChange(change);
    }
  };
  const changes = {
    postMoney: current.postMoney - previous.postMoney,
    pps: current.pricedConversion.pps - previous.pricedConversion.pps,
    shares: current.pricedConversion.totalShares - previous.pricedConversion.totalShares,
    additionalOptions: current.pricedConversion.additionalOptions - previous.pricedConversion.additionalOptions,
    newSharesIssued: current.pricedConversion.newSharesIssued - previous.pricedConversion.newSharesIssued,
    dilution: current.totalRoundDilution - previous.totalRoundDilution,
  }

  return (
    <div className="pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">

        <div className="flex flex-col bg-gray-100 p-8 text-center  relative dark:bg-nt84blue dark:text-gray-100">
          <div className="absolute text-nt84bluedarker dark:text-nt84lightblue top-0 right-0 p-2">
            <QuestionMarkTooltipComponent>
              <div className="max-w-72">
                PPS: The Price Per Share (PPS) in a round is calculated by dividing the pre-money valuation by number of pre-money shares
              </div>
            </QuestionMarkTooltipComponent>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-200 bottom-0 z-10 absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            {changes.pps !== 0
              ? ` (${changes.pps > 0 ? "+" : ""
              }$${formatNumberWithCommas(changes.pps)})`
              : ""}
          </div>
          <dt className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-200">
            PPS
          </dt>
          <dd className="order-first text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-200">
            ${current.pricedConversion.pps.toFixed(5)}
          </dd>
        </div>
        <div className="flex flex-col bg-gray-100 p-8 text-center  relative dark:bg-nt84blue dark:text-gray-100">
          <div className="text-sm text-gray-600 dark:text-gray-200 bottom-0 z-10 absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            {changes.newSharesIssued !== 0
              ? ` (${changes.newSharesIssued > 0 ? "+" : ""
              }${formatNumberWithCommas(changes.newSharesIssued)})`
              : ""}
          </div>
          <dt className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-200">
            New Shares Issued
            </dt>
          <dd className="order-first text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-200">
            {formatNumberWithCommas(current.pricedConversion.newSharesIssued)}
          </dd>
        </div>
        <div className="flex flex-col bg-gray-100 p-8 text-center  relative dark:bg-nt84blue dark:text-gray-100">
          <div className="absolute text-nt84bluedarker dark:text-nt84lightblue top-0 right-0 p-2">
            <QuestionMarkTooltipComponent>
              <div className="max-w-72">
                Additional Options: these are the options created as part of the round to expand the option table. 
              </div>
            </QuestionMarkTooltipComponent>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-200 bottom-0 z-10 absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            {changes.additionalOptions !== 0
              ? ` (${changes.additionalOptions > 0 ? "+" : ""
              }${formatNumberWithCommas(changes.additionalOptions)})`
              : ""}
          </div>
          <dt className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-200">
            Additional Options
          </dt>
          <dd className="order-first text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-200">
            {formatNumberWithCommas(current.pricedConversion.additionalOptions)}
          </dd>
        </div>
        <div className="flex flex-col bg-gray-100 p-8 text-center  relative dark:bg-nt84blue dark:text-gray-100">
          <div className="absolute text-nt84bluedarker dark:text-nt84lightblue top-0 right-0 p-2">
            <QuestionMarkTooltipComponent>
              <div className="max-w-72">
                Total Round Dilution: the percentage reduction in ownership for existing shareholders from a round, calculated as the number of new shares being issued from the transaction divided by the fully diluted shares after the transaction
              </div>
            </QuestionMarkTooltipComponent>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-200 bottom-0 z-10 absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            {changes.dilution !== 0
              ? ` (${changes.dilution > 0 ? "+" : ""
              }${changes.dilution.toFixed(2)})`
              : ""}
          </div>
          <dt className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-200">
            Total Round Dilution
          </dt>
          <dd className="order-first text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-200">
            {current.totalRoundDilution.toFixed(2)}%
          </dd>
        </div>

        <div className="flex flex-col bg-gray-100 p-8 text-center  relative dark:bg-nt84blue dark:text-gray-100">
          <div className="absolute text-nt84bluedarker bottom-0 left-0 p-2 text-xl">
              <button
                className="px-2 mr-2 text-nt84blue dark:text-gray-200"
                name="decrement"
                onClick={() => decrement("preMoney")}
              >
                -
              </button>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-200 bottom-0 z-10 absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            {preMoneyChange !== 0
              ? ` (${preMoneyChange > 0 ? "+" : ""
              }$${formatNumberWithCommas(current.preMoney - previous.preMoney)})`
              : ""}
          </div>
          <div className="absolute text-nt84bluedarker bottom-0 right-0 p-2 text-xl">
              <button
                className="px-2 mr-2 text-nt84blue dark:text-gray-200"
                name="increment"
                onClick={() => increment("preMoney")}
              >
                +
              </button>
          </div>
          <dt className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-200">
            Pre Money
          </dt>
          <dd className="order-first text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-200">
            <span className="text-xl p-0 m-0">
              ${formatNumberWithCommas(current.preMoney)}
            </span>
          </dd>
        </div>

        {/* Investment */}
        <div className="flex flex-col bg-gray-100 p-8 text-center  relative dark:bg-nt84blue dark:text-gray-100">
          <div className="absolute text-nt84bluedarker bottom-0 left-0 p-2 text-xl">
              <button
                className="px-2 mr-2 text-nt84blue dark:text-gray-200"
                name="decrement"
                onClick={() => decrement("investment")}
              >
                -
              </button>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-200 bottom-0 z-10 absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            {investmentChange !== 0
              ? ` (${investmentChange > 0 ? "+" : ""
              }$${formatNumberWithCommas(investmentChange)})`
              : ""}
          </div>
          <div className="absolute text-nt84bluedarker bottom-0 right-0 p-2 text-xl">
              <button
                className="px-2 mr-2 text-nt84blue dark:text-gray-200"
                name="increment"
                onClick={() => increment("investment")}
              >
                +
              </button>
          </div>
          <dt className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-200">
            Investment
          </dt>
          <dd className="order-first text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-200">
            <span className="text-xl p-0 m-0">
              ${formatNumberWithCommas(current.totalSeriesInvestment)}
            </span>
          </dd>
        </div>
        { /* End Investment */ }

        { /* PostMoney */ }
        <div className="flex flex-col bg-gray-100 p-8 text-center  relative dark:bg-nt84blue dark:text-gray-100">
          <div className="absolute text-nt84bluedarker bottom-0 left-0 p-2 text-xl">
              <button
                className="px-2 mr-2 text-nt84blue dark:text-gray-200"
                name="decrement"
                onClick={() => decrement("preMoney")}
              >
                -
              </button>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-200 bottom-0 z-10 absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            {changes.postMoney !== 0
              ? ` (${changes.postMoney > 0 ? "+" : ""
              }$${formatNumberWithCommas(changes.postMoney)})`
              : ""}
          </div>
          <div className="absolute text-nt84bluedarker bottom-0 right-0 p-2 text-xl">
              <button
                className="px-2 mr-2 text-nt84blue dark:text-gray-200"
                name="increment"
                onClick={() => increment("preMoney")}
              >
                +
              </button>
          </div>
          <dt className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-200">
            Post Money
          </dt>
          <dd className="order-first text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-200">
            <span className="text-xl p-0 m-0">
              ${formatNumberWithCommas(current.postMoney)}
            </span>
          </dd>
        </div>
        { /* End PostMoney */ }

        { /* Target Options */ }
        <div className="flex flex-col bg-gray-100 p-8 text-center  relative dark:bg-nt84blue dark:text-gray-100">
          <div className="absolute text-nt84bluedarker dark:text-nt84lightblue top-0 right-0 p-2">
            <QuestionMarkTooltipComponent>
              The target percentage of the new options pool, after the priced round
            </QuestionMarkTooltipComponent>
          </div>
          <div className="absolute text-nt84bluedarker bottom-0 left-0 p-2 text-xl">
              <button
                className="px-2 mr-2 text-nt84blue dark:text-gray-200"
                name="decrement"
                onClick={() => decrement("options")}
              >
                -
              </button>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-200 bottom-0 z-10 absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            {targetOptionsChange !== 0
              ? ` (${targetOptionsChange > 0 ? "+" : ""
              }${currentTargetOptionsChange * 100})`
              : ""}
          </div>
          <div className="absolute text-nt84bluedarker bottom-0 right-0 p-2 text-xl">
              <button
                className="px-2 mr-2 text-nt84blue dark:text-gray-200"
                name="increment"
                onClick={() => increment("options")}
              >
                +
              </button>
          </div>
          <dt className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-200">
            Target Options
          </dt>
          <dd className="order-first text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-200">
            <span className="text-xl p-0 m-0">
              {(currentTargetOptions * 100).toFixed(2)}%
            </span>
          </dd>
        </div>
        { /* End Target Options */ }

      </div>
    </div>
  );
};

export default PricedRound;
