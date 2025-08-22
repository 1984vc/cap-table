import React, { useRef } from "react";
import { Tooltip } from "react-tooltip";

const TooltipComponent: React.FC<{
  content: string;
  children: React.ReactNode;
}> = ({ content, children: children }) => {
  const id = useRef(`tooltip-${crypto.randomUUID()}`);
  return (
    <span className="inline">
      <span
        className="inline"
        data-tooltip-id={id.current}
      >
        {children}
      </span>
      <Tooltip id={id.current} place="top" clickable>
        <div className="max-w-72">
          {content}
        </div>
      </Tooltip>
    </span>
  );
};

export default TooltipComponent;
