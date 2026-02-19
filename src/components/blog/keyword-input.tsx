"use client";

import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/utils/utils";

interface KeywordInputProps {
  value: string[];
  onChange: (keywords: string[]) => void;
  max?: number;
  className?: string;
}

export function KeywordInput({
  value = [],
  onChange,
  max = 10,
  className,
}: KeywordInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword();
    }
  };

  const addKeyword = () => {
    const trimmed = inputValue.trim();

    if (!trimmed) return;

    // Check if already at max
    if (value.length >= max) {
      return;
    }

    // Check for duplicates (case-insensitive)
    if (value.some(k => k.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue("");
      return;
    }

    onChange([...value, trimmed]);
    setInputValue("");
  };

  const removeKeyword = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md bg-background">
        {value.map((keyword, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="pl-2 pr-1 py-1 text-sm flex items-center gap-1"
          >
            {keyword}
            <button
              type="button"
              onClick={() => removeKeyword(index)}
              className="ml-1 hover:bg-muted rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {value.length < max && (
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addKeyword}
            placeholder={value.length === 0 ? "Type keyword and press Enter..." : ""}
            className="border-0 shadow-none focus-visible:ring-0 flex-1 min-w-[200px] h-auto p-0"
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {value.length}/{max} keywords
        {value.length < max && " • Press Enter or comma to add"}
      </p>
    </div>
  );
}
