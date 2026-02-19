"use client";

import { useMemo, useState } from "react";
import { useCorridors } from "@/hooks/use-api";
import { Corridor } from "@/types/corridor";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Loader2, X, ChevronsUpDown } from "lucide-react";
import { cn } from "@/utils/utils";
import { Label } from "@/components/ui/label";

interface CorridorSelectorProps {
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  error?: string;
}

export function CorridorSelector({
  values = [],
  onChange,
  disabled,
  error,
}: CorridorSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useCorridors({ status: "PUBLISHED" });

  const corridors = useMemo(() => {
    if (!data?.data) return [];
    return data.data as Corridor[];
  }, [data]);

  const getCorridorLabel = (corridor: Corridor) => {
    if (corridor.type === "city-to-city") {
      return `${corridor.fromCity} - ${corridor.toCity}`;
    }
    return `${corridor.fromCountry} - ${corridor.toCountry}`;
  };

  const selectedCorridors = useMemo(() => {
    return corridors.filter((c) => values.includes(c._id));
  }, [corridors, values]);

  const handleSelect = (corridorId: string) => {
    const newValues = values.includes(corridorId)
      ? values.filter((id) => id !== corridorId)
      : [...values, corridorId];
    onChange(newValues);
  };

  const handleRemove = (corridorId: string) => {
    onChange(values.filter((id) => id !== corridorId));
  };

  return (
    <div className="space-y-2">
      <Label>
        Select Corridors <span className="text-destructive">*</span>
      </Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedCorridors.map((corridor) => (
          <Badge key={corridor._id} variant="secondary" className="gap-1 px-2 py-1">
            {corridor.title}
            <button
              type="button"
              onClick={() => handleRemove(corridor._id)}
              className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              disabled={disabled}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </Badge>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              error ? "border-destructive" : ""
            )}
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading corridors...</span>
              </div>
            ) : values.length > 0 ? (
              `${values.length} corridor${values.length > 1 ? "s" : ""} selected`
            ) : (
              "Select corridors..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search corridors..." />
            <CommandList>
              <CommandEmpty>No corridors found.</CommandEmpty>
              <CommandGroup>
                {corridors.map((corridor) => (
                  <CommandItem
                    key={corridor._id}
                    onSelect={() => handleSelect(corridor._id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        values.includes(corridor._id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{corridor.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {getCorridorLabel(corridor)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
