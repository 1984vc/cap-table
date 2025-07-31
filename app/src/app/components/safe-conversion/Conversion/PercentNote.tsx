import TooltipComponent from "@/components/tooltip/Tooltip";
import { CapTableOwnershipError } from "@library/cap-table/types";

interface PercentNoteProps {
  pct: number;
  note?: string;
  error?: CapTableOwnershipError["type"];
}

const PercentNote: React.FC<PercentNoteProps> = ({ pct, note, error}) => {
    if (error === "caveat") {
      return (
        <TooltipComponent content={note ?? ""}>
          { pct.toFixed(2) }%
          { note && 
            <sup>*</sup>
          }
        </TooltipComponent>
      )
    } else if (error === "tbd") {
      return (
        <TooltipComponent content={note ?? ""}>
          TBD
          { note && 
            <sup>*</sup>
          }
        </TooltipComponent>
      );
    } else if (error === "error") {
      return (
        <TooltipComponent content={note ?? ""}>
          Error
          { note && 
            <sup>*</sup>
          }
        </TooltipComponent>
      );
    }
    return pct.toFixed(2) + "%";
}

export default PercentNote;