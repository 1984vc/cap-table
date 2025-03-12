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
    <div className="w-full max-w-full sm:max-w-[960px] mx-auto mb-4 p-4 bg-gray-800 rounded-lg">
      <div className="font-bold text-white mb-3">{shareholder.name}</div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {investment !== null && (
          <div>
            <div className="text-gray-400 text-sm">Investment</div>
            <div className="text-white">${formatNumberWithCommas(investment || 0)}</div>
          </div>
        )}
        
        {pps !== null && (
          <div>
            <div className="text-gray-400 text-sm">PPS</div>
            <div className="text-white">${formatNumberWithCommas(pps || 0)}</div>
          </div>
        )}
        
        {shareholder.shares && (
          <div>
            <div className="text-gray-400 text-sm">Shares</div>
            <div className="text-white">{formatNumberWithCommas(shareholder.shares || 0)}</div>
          </div>
        )}
        
        <div>
          <div className="text-gray-400 text-sm">Ownership</div>
          <div className="flex items-center">
            <span className="text-white">{ownershipPct}</span>
            {hasChanges && (
              <span
                className={`ml-2 ${changePct > 0 ? "text-green-500" : changePct < 0 ? "text-red-500" : "text-white"}`}
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
    <div className="w-full max-w-full sm:max-w-[960px] mx-auto mb-4 p-4 bg-gray-900 rounded-lg border-2 border-gray-700">
      <div className="font-bold text-white mb-3">Total</div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-gray-400 text-sm">Investment</div>
          <div className="text-white">${formatNumberWithCommas(totalRow.investment)}</div>
        </div>
        
        <div>
          <div className="text-gray-400 text-sm">PPS</div>
          <div className="text-white">-</div>
        </div>
        
        <div>
          <div className="text-gray-400 text-sm">Shares</div>
          <div className="text-white">{formatNumberWithCommas(totalRow.shares ?? 0)}</div>
        </div>
        
        <div>
          <div className="text-gray-400 text-sm">Ownership</div>
          <div className="text-white">{(totalRow.ownershipPct * 100).toFixed(2)}%</div>
        </div>
      </div>
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
      {/* Card view for all screen sizes */}
      <div>
        {rows.map((shareholder, idx) => (
          <CapTableCardItem
            key={`captablecard-${idx}`}
            shareholder={shareholder}
            change={changes[idx]}
          />
        ))}
        <TotalCard totalRow={totalRow} />
      </div>
    </div>
  );
};
