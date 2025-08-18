import React, { useEffect, useState, useRef } from "react";
import { formatNumberWithCommas } from "@library/utils/numberFormatting";
import CurrencyInput from "react-currency-input-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RowsProps } from "./PropTypes";
import { FaRegTrashCan, FaBars } from "react-icons/fa6";
import PercentNote from "./PercentNote";
import { SafeCapTableRow } from "@library/cap-table/types";
import TooltipComponent from "@/components/tooltip/Tooltip";

export type SAFEProps = SafeCapTableRow & {
  id: string;
  name: string;
  // Legacy where we used to allow specific version of SAFE
  conversionType: "post" | "pre" | "mfn" | "yc7p" | "ycmfn";
  allowDelete?: boolean;
  disabledFields?: string[];
};

interface SAFETableRowProps {
  data: SAFEProps;
  onDelete: (id: string) => void;
  onUpdate: (data: SAFEProps) => void;
  isDragging?: boolean;
  isHovered?: boolean;
  onDragStart: (event: React.DragEvent<HTMLTableRowElement>, id: string) => void;
  onDragOver: (event: React.DragEvent<HTMLTableRowElement>, id: string) => void;
  onDrop: (event: React.DragEvent<HTMLTableRowElement>, dropId: string) => void;
  isReadOnly?: boolean;
}

const SAFETableRow: React.FC<SAFETableRowProps> = ({
  data,
  onDelete,
  onUpdate,
  isDragging = false,
  isHovered = false,
  onDragStart,
  onDragOver,
  onDrop,
  isReadOnly = false,
}) => {
  const [editingCell, setEditingCell] = useState<{
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editNumericValue, setEditNumericValue] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conversionType = () => {
    if (data.conversionType === "yc7p") return "post";
    if (data.conversionType === "ycmfn") return "mfn";
    else return data.conversionType;
  };

  // Start editing a cell
  const startEditing = (field: string) => {
    if (isReadOnly) return; // Don't allow editing in read-only mode
    if (data.disabledFields?.includes(field)) return;
    
    let initialValue = '';
    
    if (field === 'investment' || field === 'cap' || field === 'discount') {
      setEditNumericValue((data[field as keyof SAFEProps] as number) || 0);
    } else {
      initialValue = (data[field as keyof SAFEProps] as string) || '';
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

    if (field === 'investment' || field === 'cap' || field === 'discount') {
      valueToSave = editNumericValue || 0;
      onUpdate({ ...data, [field]: valueToSave });
    } else if (field === 'conversionType') {
      valueToSave = editValue;
      onUpdate({ ...data, conversionType: valueToSave as any });
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

  // Handle drag events
  const handleDragStart = (event: React.DragEvent<HTMLTableRowElement>): void => {
    event.dataTransfer.setData("text/plain", data.id);
    onDragStart(event, data.id);
  };

  const handleDragOver = (event: React.DragEvent<HTMLTableRowElement>): void => {
    event.preventDefault();
    onDragOver(event, data.id);
  };

  const handleDrop = (event: React.DragEvent<HTMLTableRowElement>): void => {
    const dropIndex = event.dataTransfer.getData("text/plain");
    onDrop(event, dropIndex);
  };

  // Render editable cell
  const renderEditableCell = (field: string, currentValue: string | number | null | undefined) => {
    const displayValue = currentValue === null || currentValue === undefined ? '' : String(currentValue);
    const isEditing = editingCell?.field === field;
    const isDisabled = data.disabledFields?.includes(field);
    
    if (isDisabled) {
      let formattedValue = displayValue;
      if (field === 'investment' || field === 'cap') {
        formattedValue = `$${formatNumberWithCommas(Number(currentValue) || 0)}`;
      } else if (field === 'discount') {
        formattedValue = `${currentValue}%`;
      }
      
      return (
        <div className="w-full px-2 py-1 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm h-8 flex items-center justify-start">
          {formattedValue}
        </div>
      );
    }
    
    if (isEditing) {
      if (field === 'investment' || field === 'cap') {
        return (
          <CurrencyInput
            ref={inputRef as any}
            value={editNumericValue || 0}
            onValueChange={(value) => setEditNumericValue(parseFloat(value || '0'))}
            onBlur={saveEdit}
            onKeyDown={handleKeyPress}
            placeholder={field === 'investment' ? 'Investment' : 'Valuation Cap'}
            className="w-full px-2 py-1 border rounded text-right bg-white dark:bg-gray-700 text-sm h-8"
            prefix="$"
            decimalScale={0}
            allowDecimals={field === 'cap'}
            customInput={Input}
          />
        );
      } else if (field === 'discount') {
        return (
          <CurrencyInput
            ref={inputRef as any}
            value={editNumericValue || 0}
            onValueChange={(value) => setEditNumericValue(parseFloat(value || '0'))}
            onBlur={saveEdit}
            onKeyDown={handleKeyPress}
            placeholder="Discount %"
            className="w-full px-2 py-1 border rounded text-right bg-white dark:bg-gray-700 text-sm h-8"
            prefix=""
            suffix="%"
            decimalScale={0}
            max={99}
            maxLength={2}
            allowDecimals={false}
            customInput={Input}
          />
        );
      } else if (field === 'conversionType') {
        return (
          <select
            ref={inputRef as any}
            value={conversionType()}
            onChange={(e) => {
              setEditValue(e.target.value);
              onUpdate({ ...data, conversionType: e.target.value as any });
              setEditingCell(null);
            }}
            onBlur={saveEdit}
            onKeyDown={handleKeyPress}
            className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm h-8"
          >
            <option value="post">Post Money</option>
            <option value="pre">Pre Money</option>
            <option value="mfn">Uncapped MFN</option>
          </select>
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
    const canEdit = !isReadOnly && !isDisabled;
    let formattedDisplayValue = displayValue;
    
    if (field === 'investment' || field === 'cap') {
      formattedDisplayValue = displayValue ? `$${formatNumberWithCommas(Number(currentValue))}` : '';
    } else if (field === 'discount') {
      formattedDisplayValue = displayValue ? `${currentValue}%` : '';
    } else if (field === 'conversionType') {
      const typeMap: { [key: string]: string } = {
        'post': 'Post Money',
        'pre': 'Pre Money',
        'mfn': 'Uncapped MFN'
      };
      formattedDisplayValue = typeMap[conversionType()] || conversionType();
    }
    
    return (
      <div
        onClick={() => canEdit && startEditing(field)}
        className={`w-full px-2 py-1 rounded text-sm h-8 flex items-center ${
          field === 'investment' || field === 'cap' || field === 'discount' ? 'justify-end' : 'justify-start'
        } ${
          canEdit 
            ? 'bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent hover:border-gray-300 dark:hover:border-gray-600' 
            : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
        }`}
      >
        {formattedDisplayValue || (canEdit ? <span className="text-gray-400">Click to edit</span> : '')}
      </div>
    );
  };

  return (
    <tr
      className={`${isDragging ? 'opacity-50' : ''} ${isHovered ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
      draggable={!isReadOnly}
      onDragStart={!isReadOnly ? handleDragStart : undefined}
      onDragOver={!isReadOnly ? handleDragOver : undefined}
      onDrop={!isReadOnly ? handleDrop : undefined}
    >
      {/* Drag Handle */}
      {!isReadOnly ? (
        <td className="px-2 py-2 w-8 text-center">
          <button className="text-gray-500 dark:text-gray-400 cursor-move focus:outline-none">
            <FaBars className="w-3 h-3" />
          </button>
        </td>
      ) : (
        <td className="px-2 py-2 w-8 text-center"></td>
      )}
      
      {/* Name */}
      <td className="px-3 py-2 w-2/5 break-words">
        {renderEditableCell('name', data.name)}
      </td>
      
      {/* Investment */}
      <td className="px-3 py-2 w-1/6">
        {renderEditableCell('investment', data.investment)}
      </td>
      
      {/* Cap */}
      <td className="px-3 py-2 w-1/5">
        {renderEditableCell('cap', data.cap)}
      </td>
      
      {/* Discount */}
      <td className="px-3 py-2 w-12">
        <div className="space-y-1">
          {renderEditableCell('discount', data.discount)}
          {(data.discount ?? 0) > 99 && (
            <p className="text-red-500 text-xs">Invalid discount</p>
          )}
        </div>
      </td>
      
      {/* Type */}
      <td className="px-3 py-2 w-1/3">
        {renderEditableCell('conversionType', conversionType())}
      </td>
      
      {/* Ownership */}
      <td className="px-3 py-2 w-1/12">
        <div className="w-full px-2 py-1 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm h-8 flex items-center justify-end">
          <PercentNote
            pct={data.ownershipPct ?? 0}
            note={data.ownershipError?.reason}
            error={data.ownershipError?.type}
          />
        </div>
      </td>
      
      {/* Actions */}
      <td className="px-2 py-2 text-center w-8">
        {data.allowDelete && (
          <Button
            onClick={() => onDelete(data.id)}
            variant="ghost"
            className="p-1 text-red-400 hover:text-red-500 h-auto cursor-pointer"
          >
            <FaRegTrashCan className="w-3 h-3" />
          </Button>
        )}
      </td>
    </tr>
  );
};

const SafeNoteList: React.FC<RowsProps<SAFEProps>> = ({
  rows,
  onDelete,
  onUpdate,
  onAddRow,
  onMoveRow,
  isReadOnly = false,
}) => {
  const [dragStartId, setDragStartId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const onDragStart = (
    _event: React.DragEvent<HTMLTableRowElement>,
    id: string
  ) => {
    setDragStartId(id);
  };

  const onDragOver = (
    _event: React.DragEvent<HTMLTableRowElement>,
    id: string
  ) => {
    setDragOverId(id);
  };

  const onDrop = () => {
    if (dragStartId && dragOverId && dragStartId !== dragOverId) {
      onMoveRow?.(dragStartId, dragOverId);
    }
  };

  // Handle issue with dragend event not firing
  useEffect(() => {
    // Add global dragend listener
    const handleGlobalDragEnd = () => {
      setDragOverId(null); // Reset drag over state
      setDragStartId(null); // Reset drag start state
    };

    window.addEventListener("dragend", handleGlobalDragEnd);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("dragend", handleGlobalDragEnd);
    };
  }, []);

  // Calculate totals
  const totalInvestment = rows.reduce((sum, row) => sum + (row.investment || 0), 0);
  const totalOwnership = rows.reduce((sum, row) => sum + (row.ownershipPct || 0), 0);

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 shadow overflow-x-auto rounded-lg">
        <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-600">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-2 py-2 w-8"></th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-2/5">
                <div className="flex items-center justify-between">
                  <span>Safe Holder</span>
                  {!isReadOnly && (
                    <Button
                      onClick={onAddRow}
                      variant="ghost"
                      className="ml-2 p-1 text-blue-500 hover:text-blue-700 h-auto cursor-pointer"
                      title="Add new SAFE"
                    >
                      +
                    </Button>
                  )}
                </div>
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/6">
                Investment
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/5">
                Cap
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                <TooltipComponent content="Discount to the price of the next round when available (typically 0%-25%). Note that the actual Post Money Safe uses a Discount Rate which is (1 - Discount). So if the Safe has a Discount Rate of 80% then the Discount is 20% and you should enter 20%">
                  Discount<sup>?</sup>
                </TooltipComponent>
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/3">
                Type
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/12">
                Ownership
              </th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="bg-gray-100 dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
            {rows.map((safe, idx) => (
              <SAFETableRow
                key={safe.id || idx}
                data={{...safe, allowDelete: !isReadOnly && safe.allowDelete}}
                onUpdate={onUpdate}
                onDelete={onDelete}
                isDragging={dragStartId === safe.id}
                isHovered={dragOverId === safe.id && dragStartId !== safe.id}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                isReadOnly={isReadOnly}
              />
            ))}
            
            {/* Total Row */}
            <tr className="bg-gray-100 dark:bg-gray-600 font-bold">
              <td className="px-2 py-2 w-8"></td>
              <td className="px-3 py-2 text-gray-900 dark:text-white w-2/5">
                Total
              </td>
              <td className="px-3 py-2 text-right text-gray-900 dark:text-white w-1/6">
                ${formatNumberWithCommas(totalInvestment)}
              </td>
              <td className="px-3 py-2 w-1/5"></td>
              <td className="px-3 py-2 w-12"></td>
              <td className="px-3 py-2 w-1/3"></td>
              <td className="px-3 py-2 text-right text-gray-900 dark:text-white w-1/12">
                {totalOwnership.toFixed(2)}%
              </td>
              <td className="px-2 py-2 w-8"></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Add new row button at bottom */}
      {!isReadOnly && (
        <div className="flex justify-center mt-4">
          <Button
            onClick={onAddRow}
            className="bg-nt84blue hover:bg-nt84bluedarker dark:text-white cursor-pointer"
          >
            + Add another SAFE
          </Button>
        </div>
      )}
    </div>
  );
};

export default SafeNoteList;
