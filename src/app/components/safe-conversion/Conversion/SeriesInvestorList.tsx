import React from "react";
import CurrencyInput from "react-currency-input-field";
import { RowsProps } from "./PropTypes";
import { XCircleIcon } from "@heroicons/react/24/outline";
import { SeriesCapTableRow } from "@library/cap-table/types";

export type SeriesProps = SeriesCapTableRow & {
  id: string;
  name: string;
  investment: number;
  allowDelete?: boolean;
}

interface SeriesRowProps {
  data: SeriesProps;
  onDelete: (id: string) => void;
  onUpdate: (data: SeriesProps) => void;
  allowDelete?: boolean;
}

const SeriesInvestorRow: React.FC<SeriesRowProps> = ({
  data,
  onDelete,
  onUpdate,
}) => {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    onUpdate({ ...data, [name]: value });
  };
  const onValueChange = (
    value: string | undefined,
    name: string | undefined,
  ) => {
    if (name) {
      onUpdate({ ...data, [name]: parseFloat(value ?? "0") });
    }
  };

  return (
    <div className="w-full max-w-full sm:max-w-[960px] mx-auto mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <input
          type="text"
          name="name"
          autoComplete="off"
          value={data.name}
          onChange={handleInputChange}
          placeholder="Series Investor Name"
          className="w-full px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        
        <button
          onClick={() => onDelete(data.id)}
          disabled={!data.allowDelete}
          className={`ml-8 focus:outline-none ${
            data.allowDelete
              ? "text-red-400 hover:text-red-500"
              : "text-gray-500 cursor-not-allowed"
          }`}
        >
          <XCircleIcon className="inline" width={20} />
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-gray-500 dark:text-gray-400 mb-1">Investment</div>
          <CurrencyInput
            type="text"
            name="investment"
            value={data.investment}
            onValueChange={onValueChange}
            placeholder="Investment"
            autoComplete="off"
            className="w-full px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            prefix="$"
            decimalScale={0}
          />
        </div>
        
        <div>
          <div className="text-gray-500 dark:text-gray-400 mb-1">Ownership %</div>
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600">{data.ownershipPct.toFixed(2)}%</div>
        </div>
      </div>
    </div>
  );
};

const SeriesInvestorList: React.FC<RowsProps<SeriesProps>> = ({
  rows,
  onDelete,
  onUpdate,
  onAddRow,
}) => {
  return (
    <div className="w-full">
      {rows.map((note, idx) => (
        <SeriesInvestorRow
          key={idx}
          data={note}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
      
      <div className="w-full max-w-full sm:max-w-[960px] mx-auto">
        <button
          onClick={onAddRow}
          className="w-full px-4 py-2 bg-nt84blue text-white hover:bg-nt84bluedarker focus:outline-none focus:ring-blue-500 rounded-lg"
        >
          + Add another Series Investor
        </button>
      </div>
    </div>
  );
};

export default SeriesInvestorList;
