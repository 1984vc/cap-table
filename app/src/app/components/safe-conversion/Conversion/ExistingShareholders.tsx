import React, { useState, useRef, useEffect } from "react";
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
  index: number;
}

const ExistingShareholderTableRow: React.FC<ExistingShareholderRowProps> = ({
  data,
  onDelete,
  onUpdate,
  allowDelete,
  disableNameEdit,
  index,
}) => {
  const [editingCell, setEditingCell] = useState<{
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editNumericValue, setEditNumericValue] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ownership = data.ownershipPct ?? 0;

  const getTooltipButton = () => {
    if (data.id === "UnusedOptionsPool") {
      return (
        <div className="inline-block text-nt84bluedarker dark:text-nt84lightblue ml-2">
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
        <div className="inline-block text-nt84bluedarker dark:text-nt84lightblue ml-2">
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

  // Start editing a cell
  const startEditing = (field: string) => {
    if (field === 'name' && disableNameEdit) return;
    if (field === 'ownershipPct') return; // Ownership % is not editable
    
    let initialValue = '';
    
    if (field === 'shares') {
      setEditNumericValue(data.shares || 0);
    } else {
      initialValue = (data[field as keyof ExistingShareholderProps] as string) || '';
    }
    
    setEditingCell({ field });
    setEditValue(initialValue);
    
    // Focus the input after it's rendered
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  // Save edited value
  const saveEdit = () => {
    if (!editingCell) return;

    const { field } = editingCell;
    let valueToSave: any;

    if (field === 'shares') {
      valueToSave = editNumericValue || 0;
      onUpdate({ ...data, shares: valueToSave });
    } else {
      valueToSave = editValue;
      onUpdate({ ...data, [field]: valueToSave });
    }

    setEditingCell(null);
  };

  // Handle key press in editable cell
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Focus the input when editing cell changes
  useEffect(() => {
    if (inputRef.current && editingCell) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  // Render editable cell
  const renderEditableCell = (field: string, currentValue: string | number | null | undefined) => {
    const displayValue = currentValue === null || currentValue === undefined ? '' : String(currentValue);
    const isEditing = editingCell?.field === field;
    
    if (isEditing) {
      if (field === 'shares') {
        return (
          <CurrencyInput
            ref={inputRef as any}
            value={editNumericValue || 0}
            onValueChange={(value) => setEditNumericValue(parseFloat(value || '0'))}
            onBlur={saveEdit}
            onKeyDown={handleKeyPress}
            placeholder="Shares"
            className="w-full px-2 py-1 border rounded text-right bg-white dark:bg-gray-700 text-sm h-8"
            prefix=""
            decimalScale={0}
            allowDecimals={false}
            customInput={Input}
          />
        );
      } else {
        return (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyPress}
            className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm h-8"
          />
        );
      }
    }
    
    // Display value when not editing
    const canEdit = !(field === 'name' && disableNameEdit) && field !== 'ownershipPct';
    
    return (
      <div
        onClick={() => canEdit && startEditing(field)}
        className={`w-full px-2 py-1 rounded text-sm h-8 flex items-center ${field === 'shares' ? 'justify-end' : 'justify-start'} ${
          canEdit 
            ? 'bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent hover:border-gray-300 dark:hover:border-gray-600' 
            : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
        }`}
      >
        {field === 'ownershipPct' 
          ? `${(ownership * 100).toFixed(2)}%`
          : field === 'shares' && displayValue
            ? parseInt(displayValue).toLocaleString()
            : displayValue || (canEdit ? <span className="text-gray-400">Click to edit</span> : '')
        }
      </div>
    );
  };

  return (
    <tr>
      {/* Name */}
      <td className="px-3 py-2 w-2/5 break-words">
        <div className="flex items-center">
          {disableNameEdit ? (
            <div className="w-full px-2 py-1 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold text-sm h-8 flex items-center">
              {data.name}
            </div>
          ) : (
            renderEditableCell('name', data.name)
          )}
          {getTooltipButton()}
        </div>
      </td>
      
      {/* Shares */}
      <td className="px-3 py-2 w-1/4">
        {renderEditableCell('shares', data.shares)}
      </td>
      
      {/* Ownership % */}
      <td className="px-3 py-2 w-1/5">
        {renderEditableCell('ownershipPct', ownership)}
      </td>
      
      {/* Actions */}
      <td className="px-3 py-2 text-center w-1/6">
        {allowDelete && (
          <Button
            onClick={() => onDelete(data.id)}
            variant="ghost"
            className="p-2 text-red-400 hover:text-red-500 h-auto"
          >
            <FaRegTrashCan className="w-4 h-4" />
          </Button>
        )}
      </td>
    </tr>
  );
};

const ExisingShareholderList: React.FC<RowsProps<ExistingShareholderProps>> = ({
  rows,
  onDelete,
  onUpdate,
  onAddRow,
}) => {
  // Don't include the UnusedOptionsRow in the editable list since this is edited in a separate field
  const existingShareholders = rows.filter(
    (row) => ["UnusedOptionsPool", "IssuedOptions"].indexOf(row.id) === -1
  );

  const issuedOptionsRow = rows.find((row) => row.id === "IssuedOptions");
  const unusedOptionsRow = rows.find((row) => row.id === "UnusedOptionsPool");

  // Calculate totals
  const totalShares = rows.reduce((sum, row) => sum + (row.shares || 0), 0);
  const totalOwnership = rows.reduce((sum, row) => sum + (row.ownershipPct || 0), 0);

  // Combine all rows for display
  const allRows = [
    ...existingShareholders,
    ...(issuedOptionsRow ? [issuedOptionsRow] : []),
    ...(unusedOptionsRow ? [unusedOptionsRow] : [])
  ];

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 shadow overflow-x-auto rounded-lg">
        <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-600">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-2/5">
                <div className="flex items-center justify-between">
                  <span>Shareholder</span>
                  <Button
                    onClick={onAddRow}
                    variant="ghost"
                    className="ml-2 p-1 text-blue-500 hover:text-blue-700 h-auto"
                    title="Add new shareholder"
                  >
                    +
                  </Button>
                </div>
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/4">
                Shares
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/5">
                Ownership %
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-100 dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
            {allRows.map((shareholder, idx) => (
              <ExistingShareholderTableRow
                key={shareholder.id || idx}
                data={shareholder}
                onUpdate={onUpdate}
                onDelete={onDelete}
                allowDelete={existingShareholders.length > 1 && existingShareholders.includes(shareholder)}
                disableNameEdit={["UnusedOptionsPool", "IssuedOptions"].includes(shareholder.id)}
                index={idx}
              />
            ))}
            
            {/* Total Row */}
            <tr className="bg-gray-100 dark:bg-gray-600 font-bold">
              <td className="px-3 py-2 text-gray-900 dark:text-white w-2/5">
                Total
              </td>
              <td className="px-3 py-2 text-right text-gray-900 dark:text-white w-1/4">
                {totalShares.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-gray-900 dark:text-white w-1/5">
                {(totalOwnership * 100).toFixed(2)}%
              </td>
              <td className="px-3 py-2 w-1/6"></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Add new row button at bottom */}
      <div className="flex justify-center mt-4">
        <Button
          onClick={onAddRow}
          className="bg-nt84blue hover:bg-nt84bluedarker dark:text-white"
        >
          + Add another Shareholder
        </Button>
      </div>
    </div>
  );
};

export default ExisingShareholderList;
