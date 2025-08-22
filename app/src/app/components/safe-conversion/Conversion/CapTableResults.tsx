import { formatNumberWithCommas } from "@library/utils/numberFormatting";
import { CapTableRow, CapTableRowType, TotalCapTableRow } from "@library/cap-table/types";

export type CapTableProps = {
  rows: CapTableRow[];
  changes: number[];
  totalRow: TotalCapTableRow;
}

type CapTableRowItemProps = {
  shareholder: CapTableRow;
  change?: number
  ownershipError?: string;
  ownershipNotes?: string;
}

const roundTo = (num: number, decimal: number): number => {
  return Math.round(num * Math.pow(10, decimal)) / Math.pow(10, decimal);
};

// Card view for all screen sizes
const CapTableCardItem: React.FC<CapTableRowItemProps> = ({shareholder, change}) => {
  const investment = (shareholder.type === CapTableRowType.Safe || shareholder.type === CapTableRowType.Series) ? shareholder.investment : null
  const pps = (shareholder.type === CapTableRowType.Safe || shareholder.type === CapTableRowType.Series) ? shareholder.pps : null

  const hasChanges = change !== undefined
  const changePct = roundTo((change ?? 0) * 100, 2)
  let ownershipPct: string | undefined = shareholder.ownershipPct?.toFixed(2) + "%"
  if (shareholder.ownershipError) {
    if (shareholder.ownershipError.type === 'error') {
      ownershipPct = "Error"
    } else if (shareholder.ownershipError.type === 'tbd') {
      ownershipPct = "TBD"
    }
  }

  return (
    <div className="w-full max-w-full sm:max-w-[960px] mx-auto mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="font-bold text-gray-900 dark:text-white mb-3">{shareholder.name}</div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {investment !== null && (
          <div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">Investment</div>
            <div className="text-gray-900 dark:text-white">${formatNumberWithCommas(investment || 0)}</div>
          </div>
        )}
        
        {pps !== null && (
          <div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">PPS</div>
            <div className="text-gray-900 dark:text-white">${formatNumberWithCommas(pps || 0)}</div>
          </div>
        )}
        
        {shareholder.shares && (
          <div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">Shares</div>
            <div className="text-gray-900 dark:text-white">{formatNumberWithCommas(shareholder.shares || 0)}</div>
          </div>
        )}
        
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">Ownership</div>
          <div className="flex items-center">
            <span className="text-gray-900 dark:text-white">{ownershipPct}</span>
            {hasChanges && (
              <span
                className={`ml-2 ${changePct > 0 ? "text-green-500" : changePct < 0 ? "text-red-500" : "text-gray-900 dark:text-white"}`}
              >
                {changePct > 0 ? "+" : ""}{changePct}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Total card for all screen sizes
const TotalCard: React.FC<{totalRow: TotalCapTableRow}> = ({totalRow}) => {
  return (
    <div className="w-full max-w-full sm:max-w-[960px] mx-auto mb-4 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg border-2 border-gray-300 dark:border-gray-700">
      <div className="font-bold text-gray-900 dark:text-white mb-3">Total</div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">Investment</div>
          <div className="text-gray-900 dark:text-white">${formatNumberWithCommas(totalRow.investment)}</div>
        </div>
        
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">PPS</div>
          <div className="text-gray-900 dark:text-white">-</div>
        </div>
        
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">Shares</div>
          <div className="text-gray-900 dark:text-white">{formatNumberWithCommas(totalRow.shares ?? 0)}</div>
        </div>
        
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">Ownership</div>
          <div className="text-gray-900 dark:text-white">{(totalRow.ownershipPct * 100).toFixed(2)}%</div>
        </div>
      </div>
    </div>
  );
};

// Desktop table view
const CapTableDesktopView: React.FC<CapTableProps> = ({ rows, changes, totalRow }) => {
  return (
    <div className="w-full max-w-full sm:max-w-[960px] mx-auto overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            <th className="text-left p-3 border-b border-gray-200 dark:border-gray-700">Name</th>
            <th className="text-right p-3 border-b border-gray-200 dark:border-gray-700">Investment</th>
            <th className="text-right p-3 border-b border-gray-200 dark:border-gray-700">PPS</th>
            <th className="text-right p-3 border-b border-gray-200 dark:border-gray-700">Shares</th>
            <th className="text-right p-3 border-b border-gray-200 dark:border-gray-700">Ownership</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((shareholder, idx) => {
            const investment = (shareholder.type === CapTableRowType.Safe || shareholder.type === CapTableRowType.Series) ? shareholder.investment : null;
            const pps = (shareholder.type === CapTableRowType.Safe || shareholder.type === CapTableRowType.Series) ? shareholder.pps : null;
            
            const hasChanges = changes[idx] !== undefined;
            const changePct = roundTo((changes[idx] ?? 0) * 100, 2);
            let ownershipPct: string | undefined = shareholder.ownershipPct?.toFixed(2) + "%";
            if (shareholder.ownershipError) {
              if (shareholder.ownershipError.type === 'error') {
                ownershipPct = "Error";
              } else if (shareholder.ownershipError.type === 'tbd') {
                ownershipPct = "TBD";
              }
            }
            
            return (
              <tr key={`captablerow-${idx}`} className="border-b border-gray-200 dark:border-gray-700">
                <td className="p-3 font-medium text-gray-900 dark:text-white">{shareholder.name}</td>
                <td className="p-3 text-right text-gray-900 dark:text-white">
                  {investment !== null ? `$${formatNumberWithCommas(investment || 0)}` : "-"}
                </td>
                <td className="p-3 text-right text-gray-900 dark:text-white">
                  {pps !== null ? `$${formatNumberWithCommas(pps || 0)}` : "-"}
                </td>
                <td className="p-3 text-right text-gray-900 dark:text-white">
                  {shareholder.shares ? formatNumberWithCommas(shareholder.shares) : "-"}
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end">
                    <span className="text-gray-900 dark:text-white">{ownershipPct}</span>
                    {hasChanges && (
                      <span
                        className={`ml-2 ${changePct > 0 ? "text-green-500" : changePct < 0 ? "text-red-500" : "text-gray-900 dark:text-white"}`}
                      >
                        {changePct > 0 ? "+" : ""}{changePct}%
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {/* Total row */}
          <tr className="bg-gray-100 dark:bg-gray-800 font-bold">
            <td className="p-3 text-gray-900 dark:text-white">Total</td>
            <td className="p-3 text-right text-gray-900 dark:text-white">${formatNumberWithCommas(totalRow.investment)}</td>
            <td className="p-3 text-right text-gray-900 dark:text-white">-</td>
            <td className="p-3 text-right text-gray-900 dark:text-white">{formatNumberWithCommas(totalRow.shares ?? 0)}</td>
            <td className="p-3 text-right text-gray-900 dark:text-white">{(totalRow.ownershipPct * 100).toFixed(2)}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export const CapTableResults: React.FC<CapTableProps> = (props) => {
  const {
    rows,
    changes,
    totalRow,
  } = props

  return (
    <div>
      {/* Card view for mobile, hidden on md and larger screens */}
      <div className="md:hidden">
        {rows.map((shareholder, idx) => (
          <CapTableCardItem
            key={`captablecard-${idx}`}
            shareholder={shareholder}
            change={changes[idx]}
          />
        ))}
        <TotalCard totalRow={totalRow} />
      </div>
      
      {/* Table view for desktop, hidden on smaller screens */}
      <div className="hidden md:block">
        <CapTableDesktopView rows={rows} changes={changes} totalRow={totalRow} />
      </div>
    </div>
  );
};
