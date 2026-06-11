"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type TooltipLine = {
  label: string;
  text: string;
};

type InfoTooltipProps = {
  label?: string;
  text?: string;
  lines?: TooltipLine[];
};

export function InfoTooltip({ label = "Info", text, lines }: InfoTooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const ariaText = lines?.map((line) => `${line.label}: ${line.text}`).join(" ") ?? text ?? "";

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const tooltipHalfWidth = 260;
    const left = Math.min(
      window.innerWidth - tooltipHalfWidth - 22,
      Math.max(tooltipHalfWidth + 22, rect.left + rect.width / 2)
    );

    setPosition({
      left,
      top: rect.top - 9
    });
  }, []);

  const showTooltip = () => {
    updatePosition();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <span
        aria-label={`${label}: ${ariaText}`}
        className="filterInfo"
        onBlur={() => setIsOpen(false)}
        onClick={(event) => event.stopPropagation()}
        onFocus={showTooltip}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setIsOpen(false)}
        ref={triggerRef}
        tabIndex={0}
      >
        i
      </span>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
          <div
            className="floatingTooltip"
            role="tooltip"
            style={{ left: `${position.left}px`, top: `${position.top}px` }}
          >
            {lines ? (
              lines.map((line) => (
                <div className="floatingTooltipLine" key={line.label}>
                  <strong>{line.label}:</strong> {line.text}
                </div>
              ))
            ) : (
              text
            )}
          </div>,
          document.body
        )
        : null}
    </>
  );
}
