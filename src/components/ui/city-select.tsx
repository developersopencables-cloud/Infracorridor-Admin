"use client";

import * as React from "react";
import { Check, ChevronDown, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";
import { useCities, useCitiesByCountry } from "@/hooks/use-static-data";
import { type City } from "@/services/static-data.service";

interface CitySelectProps {
    value?: string;
    onValueChange: (value: string) => void;
    countryCode?: string;
    placeholder?: string;
    className?: string;
    error?: boolean;
}

const OTHERS_OPTION = "__others__";

export function CitySelect({
    value,
    onValueChange,
    countryCode,
    placeholder = "Select city...",
    className,
    error,
}: CitySelectProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [isOthers, setIsOthers] = React.useState(false);
    const [othersValue, setOthersValue] = React.useState("");

    // New API cities for specific country
    const {
        data: cities = [],
        isLoading,
    } = useCitiesByCountry(countryCode);

 
    React.useEffect(() => {
        if (value) {
            const found = cities.some(
                (c: City) =>
                    c.city.toLowerCase() === value.toLowerCase() ||
                    c.city_ascii.toLowerCase() === value.toLowerCase()
            );
            if (!found && cities.length > 0) {
               
                setIsOthers(true);
                setOthersValue(value);
            } else if (found) {
                setIsOthers(false);
                setOthersValue("");
            }
        } else {
            setIsOthers(false);
            setOthersValue("");
        }
    }, [value, cities]);

   
    const filteredCities = React.useMemo(() => {
        if (!searchQuery) return cities.slice(0, 100); // Limit initial results
        const query = searchQuery.toLowerCase();
        return cities
            .filter(
                (city) =>
                    city.city.toLowerCase().includes(query) ||
                    city.city_ascii.toLowerCase().includes(query) ||
                    city.country.toLowerCase().includes(query)
            )
            .slice(0, 100); // Limit to 100 results for performance
    }, [cities, searchQuery]);

    // Get selected city
    const selectedCity = cities.find(
        (c: City) =>
            c.city.toLowerCase() === value?.toLowerCase() ||
            c.city_ascii.toLowerCase() === value?.toLowerCase()
    );

    const handleSelect = (selectedValue: string) => {
        if (selectedValue === OTHERS_OPTION) {
            setIsOthers(true);
            setOpen(false);
            setSearchQuery("");
            // Don't set value yet, wait for user to type
        } else {
            setIsOthers(false);
            onValueChange(selectedValue);
            setOpen(false);
            setSearchQuery("");
        }
    };

    const handleOthersInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setOthersValue(newValue);
        onValueChange(newValue);
    };

    return (
        <div className="space-y-1.5">
            {!isOthers ? (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            disabled={isLoading}
                            className={cn(
                                "w-full justify-between font-normal",
                                !value && "text-muted-foreground",
                                error && "border-red-500",
                                className
                            )}
                            onClick={() => {
                                if (!countryCode) {
                                    
                                    setIsOthers(true);
                                }
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading cities...
                                </>
                            ) : selectedCity ? (
                                `${selectedCity.city}${selectedCity.country ? `, ${selectedCity.country}` : ""}`
                            ) : (
                                placeholder
                            )}
                            {!isLoading && (
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 min-w-[200px]" align="start">
                        <Command>
                            <CommandInput
                                placeholder="Search cities..."
                                value={searchQuery}
                                onValueChange={setSearchQuery}
                            />
                            <CommandList>
                                <CommandEmpty>
                                    No city found.
                                </CommandEmpty>
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="ml-2 text-sm text-muted-foreground">
                                            Loading cities...
                                        </span>
                                    </div>
                                ) : (
                                    <CommandGroup className="max-h-[300px] overflow-auto">
                                        {filteredCities.map((city: City, index: number) => (
                                            <CommandItem
                                                key={`${city.city}-${city.country}-${index}`}
                                                value={city.city}
                                                onSelect={() => handleSelect(city.city)}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        value?.toLowerCase() === city.city.toLowerCase() ||
                                                            value?.toLowerCase() === city.city_ascii.toLowerCase()
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                    )}
                                                />
                                                <span className="flex-1">
                                                    {city.city}
                                                    {city.country && (
                                                        <span className="text-xs text-muted-foreground ml-2">
                                                            {city.country}
                                                        </span>
                                                    )}
                                                </span>
                                            </CommandItem>
                                        ))}
                                        <CommandItem
                                            value={OTHERS_OPTION}
                                            onSelect={() => handleSelect(OTHERS_OPTION)}
                                            className="border-t mt-1 pt-1"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            <span className="flex-1">Others (Enter custom city)</span>
                                        </CommandItem>
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            ) : (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Enter city name..."
                            value={othersValue}
                            onChange={handleOthersInputChange}
                            className={cn(error && "border-red-500")}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setIsOthers(false);
                                setOthersValue("");
                                onValueChange("");
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        City not in list? Enter it manually above.
                    </p>
                </div>
            )}
        </div>
    );
}

