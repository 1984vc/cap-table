import React, { useEffect, useState } from "react";
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

interface SAFEInputRowProps {
  data: SAFEProps;
  isHovered?: boolean;
  isDragging?: boolean;
  onDelete: (id: string) => void;
  onUpdate: (data: SAFEProps) => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, index: string) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>, index: string) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, dropIndex: string) => void;
  isReadOnly?: boolean;
}

const SAFEInputRow: React.FC<SAFEInputRowProps> = ({
  data,
  isHovered = false,
  isDragging = false,
  onDelete,
  onUpdate,
  onDragStart,
  onDragOver,
  onDrop,
  isReadOnly = false,
}) => {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    onUpdate({ ...data, [name]: value });
  };

  const handleDropDownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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

  const conversionType = () => {
    if (data.conversionType === "yc7p") return "post";
    if (data.conversionType === "ycmfn") return "mfn";
    else return data.conversionType;
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>): void => {
    if (isReadOnly) return;
    event.dataTransfer.setData("text/plain", data.id);
    onDragStart(event, data.id);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    if (isReadOnly) return;
    event.preventDefault();
    onDragOver(event, data.id);
  };

  return (
    <div
      className={`w-full max-w-full sm:max-w-[960px] mx-auto mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${
        isHovered ? "mb-16" : ""
      } ${isDragging ? "opacity-50" : ""} relative`}
      draggable={!isReadOnly}
      onDragStart={!isReadOnly ? handleDragStart : undefined}
      onDragOver={!isReadOnly ? handleDragOver : undefined}
      onDragEnd={!isReadOnly ? (e) => {
        onDrop(e, data.id);
      } : undefined}
      onDrop={!isReadOnly ? (e) => {
        const dropIndex = e.dataTransfer.getData("text/plain");
        onDrop(e, dropIndex);
      } : undefined}
    >
      {data.allowDelete && !isReadOnly && (
        <Button
          onClick={() => onDelete(data.id)}
          variant="ghost"
          className="p-0 h-auto absolute top-3 right-1 text-red-400 hover:text-red-500"
        >
          <FaRegTrashCan className="inline" width={20} />
        </Button>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
        {!isReadOnly && (
          <button className="mr-2 text-gray-500 dark:text-gray-400 cursor-move focus:outline-none">
            <FaBars className="inline" width={20} />
          </button>
        )}
        <div className="mb-3 md:mb-0 md:w-[25%]">
          <div className="text-gray-500 dark:text-gray-400 mb-1">Name</div>
          <div className="flex items-center">
            {isReadOnly ? (
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600 w-full">
                {data.name}
              </div>
            ) : (
              <Input
                type="text"
                name="name"
                autoComplete="off"
                value={data.name}
                onChange={handleInputChange}
                placeholder="Name"
                className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            )}
          </div>
        </div>
        <div className="mb-3 md:mb-0 md:w-[16%]">
          <div className="text-gray-500 dark:text-gray-400 mb-1">
            Investment
          </div>
          {data.disabledFields?.includes("investment") || isReadOnly ? (
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600">
              ${formatNumberWithCommas(data.investment)}
            </div>
          ) : (
            <CurrencyInput
              type="text"
              name="investment"
              value={data.investment}
              onValueChange={onValueChange}
              placeholder="Investment"
              autoComplete="off"
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              prefix="$"
              allowDecimals={false}
              customInput={Input}
            />
          )}
        </div>

        <div className="mb-3 md:mb-0 md:w-[16%]">
          <div className="text-gray-500 dark:text-gray-400 mb-1">Cap</div>
          {data.disabledFields?.includes("cap") || isReadOnly ? (
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600">
              ${formatNumberWithCommas(Math.round(data.cap ?? 0))}
            </div>
          ) : (
            <CurrencyInput
              type="text"
              name="cap"
              value={data.cap}
              onValueChange={onValueChange}
              placeholder="Valuation Cap"
              autoComplete="off"
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              prefix="$"
              decimalScale={0}
              allowDecimals={true}
              customInput={Input}
            />
          )}
        </div>
        <div className="mb-3 md:mb-0 md:w-[10%]">
          <div className="text-gray-500 dark:text-gray-400 mb-1">
            <TooltipComponent content="Discount to the price of the next round when available (typically 0%-25%). Note that the actual Post Money Safe uses a Discount Rate which is (1 - Discount). So if the Safe has a Discount Rate of 80% then the Discount is 20% and you should enter 20%">
              Discount<sup>?</sup>
            </TooltipComponent>
          </div>
          {data.disabledFields?.includes("discount") || isReadOnly ? (
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600">
              {data.discount}%
            </div>
          ) : (
            <CurrencyInput
              type="text"
              name="discount"
              value={data.discount ?? "0"}
              onValueChange={onValueChange}
              placeholder="Discount %"
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              autoComplete="off"
              prefix=""
              suffix="%"
              decimalScale={0}
              max={99}
              maxLength={2}
              allowDecimals={false}
              customInput={Input}
            />
          )}
          {(data.discount ?? 0) > 99 && (
            <p className="text-red-500 mt-1">Invalid discount</p>
          )}
        </div>

        <div className="mb-3 md:mb-0 md:w-[18%]">
          <div className="text-gray-500 dark:text-gray-400 mb-1">Type</div>
          {isReadOnly ? (
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600">
              {conversionType() === "post" && "Post Money"}
              {conversionType() === "pre" && "Pre Money"}
              {conversionType() === "mfn" && "Uncapped MFN"}
            </div>
          ) : (
            <select
              name="conversionType"
              value={conversionType()}
              onChange={handleDropDownChange}
              className="w-full px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-500 text-gray-900 dark:text-white"
            >
              <option value="post">Post Money</option>
              <option value="pre">Pre Money</option>
              <option value="mfn">Uncapped MFN</option>
            </select>
          )}
        </div>

        <div className="mb-3 md:mb-0 md:w-[12%]">
          <div className="text-gray-500 dark:text-gray-400 mb-1">Ownership</div>
          <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded">
            <PercentNote
              pct={data.ownershipPct ?? 0}
              note={data.ownershipError?.reason}
              error={data.ownershipError?.type}
            />
          </div>
        </div>
      </div>
    </div>
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
    _event: React.DragEvent<HTMLDivElement>,
    index: string
  ) => {
    setDragStartId(index);
  };

  const onDragOver = (
    _event: React.DragEvent<HTMLDivElement>,
    index: string
  ) => {
    setDragOverId(index);
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

  return (
    <div className="w-full">
      {rows.map((note, idx) => (
        <SAFEInputRow
          key={idx}
          data={note}
          isDragging={dragStartId === note.id}
          isHovered={dragOverId === note.id && dragStartId !== note.id}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          isReadOnly={isReadOnly}
        />
      ))}

      {!isReadOnly && (
        <div className="w-full max-w-full sm:max-w-[960px] mx-auto">
          <Button
            onClick={onAddRow}
            className="w-full bg-nt84blue hover:bg-nt84bluedarker dark:text-white"
          >
            + Add another SAFE
          </Button>
        </div>
      )}
    </div>
  );
};

export default SafeNoteList;
