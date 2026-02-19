"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";

interface ExpandableListProps {
  items: string[];
  maxVisible?: number;
  className?: string;
  itemClassName?: string;
  emptyText?: string;
}

export function ExpandableList({
  items,
  maxVisible = 2,
  className,
  itemClassName,
  emptyText = "—",
}: ExpandableListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!items || items.length === 0) {
    return (
      <div className={cn("text-xs text-gray-500", className)}>{emptyText}</div>
    );
  }

  const shouldShowToggle = items.length > maxVisible;
  const visibleItems = isExpanded ? items : items.slice(0, maxVisible);
  const remainingCount = items.length - maxVisible;

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Visible items - displayed line by line */}
      <div className="space-y-1">
        {visibleItems.map((item, index) => (
          <div
            key={index}
            className={cn(
              "text-xs text-gray-700 leading-relaxed break-words",
              itemClassName
            )}
          >
            {item}
          </div>
        ))}
      </div>

      {/* Show more/less toggle */}
      {shouldShowToggle && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 -ml-2 mt-0.5"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              +{remainingCount} more
            </>
          )}
        </Button>
      )}
    </div>
  );
}

