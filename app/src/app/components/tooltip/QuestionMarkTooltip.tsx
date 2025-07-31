import React, { useRef } from "react";
import { Tooltip } from "react-tooltip";

import { FaRegQuestionCircle } from "react-icons/fa";

const QuestionMarkTooltipComponent: React.FC<{
  content?: string;
  clickable?: boolean;
  children?: React.ReactNode;
}> = ({ content, children }) => {
  const id = useRef(`tooltip-${crypto.randomUUID()}`);
  return (
    <span className="inline">
      <span
        className="inline"
        data-tooltip-id={id.current}
        data-tooltip-content={content}
      >
        <FaRegQuestionCircle width="20" />
      </span>
      <Tooltip id={id.current} place="top" clickable>
        {children}
      </Tooltip>
    </span>
  );
};

export default QuestionMarkTooltipComponent;
