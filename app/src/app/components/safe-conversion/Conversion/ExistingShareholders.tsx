import React from "react";
import CurrencyInput from "react-currency-input-field";
import { RowsProps } from "./PropTypes";
import { FaRegTrashCan } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QuestionMarkTooltipComponent from "@/components/tooltip/QuestionMarkTooltip";
import { CommonCapTableRow } from "@library/cap-table/types";

export type ExistingShareholderProps = CommonCapTableRow & {
  // We need to ensure we can identify the row when updating or deleting
  id: string;
};

interface ExistingShareholderRowProps {
  data: ExistingShareholderProps;
  onDelete: (id: string) => void;
  onUpdate: (data: ExistingShareholderProps) => void;
  allowDelete?: boolean;
  disableNameEdit?: boolean;
  isReadOnly?: boolean;
}

const ExistingShareholderRow: React.FC<ExistingShareholderRowProps> = ({
  data,
  onDelete,
  onUpdate,
  allowDelete,
  disableNameEdit,
  isReadOnly = false,
}) => {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    onUpdate({ ...data, [name]: value });
  };

  const onValueChange = (
    value: string | undefined,
    name: string | undefined
  ) => {
    if (isReadOnly) return;
    if (name) {
      onUpdate({ ...data, [name]: parseFloat(value ?? "0") });
    }
  };

  const ownership = data.ownershipPct ?? 0;

  const getTooltipButton = () => {
    if (data.id === "UnusedOptionsPool") {
      return (
        <div className="inline-block text-nt84bluedarker dark:text-nt84lightblue">
          <QuestionMarkTooltipComponent>
            <div className="max-w-72">
              <p>
                Reserved shares that have yet to be assigned as option grants
                for team members.
              </p>
              <i>
                [For example, if you have an option plan with 150,000 reserved
                shares and then granted 50,000 options to team members, your
                Unissued Option pool would be 100,000.]
              </i>
            </div>
          </QuestionMarkTooltipComponent>
        </div>
      );
    } else if (data.id === "IssuedOptions") {
      return (
        <div className="inline-block text-nt84bluedarker dark:text-nt84lightblue">
          <QuestionMarkTooltipComponent>
            <div className="max-w-72">
              Options or shares already issued to other employees, advisors, or
              shareholders in the company.
            </div>
          </QuestionMarkTooltipComponent>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-full sm:max-w-[960px] mx-auto mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 relative">
      {allowDelete && !isReadOnly && (
        <Button
          onClick={() => {
            onDelete(data.id);
          }}
          variant="ghost"
          className="p-0 text-red-400 hover:text-red-500 h-auto absolute top-3 right-1"
        >
          <FaRegTrashCan className="inline" width={20} />
        </Button>
      )}
      <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
        <div className="mb-3 md:mb-0 md:flex-1">
          {disableNameEdit ? (
            <span className="ml-2 inline-block font-bold text-gray-900 dark:text-white">
              {data.name} {getTooltipButton()}
            </span>
          ) : (
            <div>
              <div className="text-gray-500 dark:text-gray-400 mb-1">Name</div>
              {isReadOnly ? (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600">
                  {data.name}
                </div>
              ) : (
                <Input
                  type="text"
                  name="name"
                  autoComplete="off"
                  value={data.name}
                  onChange={handleInputChange}
                  placeholder="Common Shareholder Name"
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              )}
            </div>
          )}
        </div>

        <div className="mb-3 md:mb-0 md:flex-1">
          <div className="text-gray-500 dark:text-gray-400 mb-1">Shares</div>
          {isReadOnly ? (
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600">
              {data.shares?.toLocaleString() || 0}
            </div>
          ) : (
            <CurrencyInput
              type="text"
              name="shares"
              value={data.shares}
              onValueChange={onValueChange}
              placeholder="Shares"
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              prefix=""
              decimalScale={0}
              allowDecimals={false}
              customInput={Input}
            />
          )}
        </div>

        <div className="mb-3 md:mb-0 md:flex-1">
          <div className="text-gray-500 dark:text-gray-400 mb-1">
            Ownership %
          </div>
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded">
            {(ownership * 100).toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
};

const ExisingShareholderList: React.FC<RowsProps<ExistingShareholderProps>> = ({
  rows,
  onDelete,
  onUpdate,
  onAddRow,
  isReadOnly = false,
}) => {
  // Don't include the UnusedOptionsRow in the editable list since this is edited in a separate field
  const existingShareholders = rows.filter(
    (row) => ["UnusedOptionsPool", "IssuedOptions"].indexOf(row.id) === -1
  );

  const issuedOptionsRow = rows.find((row) => row.id === "IssuedOptions");
  const unusedOptionsRow = rows.find((row) => row.id === "UnusedOptionsPool");

  return (
    <div className="w-full">
      {existingShareholders.map((shareholder, idx) => (
        <ExistingShareholderRow
          key={idx}
          data={shareholder}
          onUpdate={onUpdate}
          onDelete={onDelete}
          allowDelete={rows.length > 1}
          isReadOnly={isReadOnly}
        />
      ))}

      {issuedOptionsRow && (
        <ExistingShareholderRow
          data={issuedOptionsRow}
          onUpdate={onUpdate}
          onDelete={() => {}}
          allowDelete={false}
          disableNameEdit={true}
          isReadOnly={isReadOnly}
        />
      )}

      {unusedOptionsRow && (
        <ExistingShareholderRow
          data={unusedOptionsRow}
          onUpdate={onUpdate}
          onDelete={() => {}}
          allowDelete={false}
          disableNameEdit={true}
          isReadOnly={isReadOnly}
        />
      )}

      {!isReadOnly && (
        <div className="w-full max-w-full sm:max-w-[960px] mx-auto">
          <Button
            onClick={onAddRow}
            className="w-full bg-nt84blue hover:bg-nt84bluedarker dark:text-white"
          >
            + Add another Shareholder
          </Button>
        </div>
      )}
    </div>
  );
};

export default ExisingShareholderList;
