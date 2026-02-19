"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
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
import { cn } from "@/utils/utils";
import { useCountries } from "@/hooks/use-static-data";

interface CountrySelectProps {
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    error?: boolean;
}

export function CountrySelect({
    value,
    onValueChange,
    placeholder = "Select country...",
    className,
    error,
}: CountrySelectProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");


    const {
        data: countries = [],
        isLoading,
        error: countriesError,
    } = useCountries();

    const filteredCountries = React.useMemo(() => {
        if (!searchQuery) return countries;
        const query = searchQuery.toLowerCase();
        return countries.filter(
            (country) =>
                country.name.toLowerCase().includes(query) ||
                country.code.toLowerCase().includes(query)
        );
    }, [countries, searchQuery]);

    const selectedCountry = countries.find((c) => c.name === value);

    return (
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
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading countries...
                        </>
                    ) : selectedCountry ? (
                        <span className="flex items-center gap-2">
                            {selectedCountry.emoji && <span>{selectedCountry.emoji}</span>}
                            {selectedCountry.name}
                        </span>
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
                        placeholder="Search countries..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList>
                        <CommandEmpty>
                            {countriesError ? "Failed to load countries" : "No country found."}
                        </CommandEmpty>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="ml-2 text-sm text-muted-foreground">
                                    Loading countries...
                                </span>
                            </div>
                        ) : (
                            <CommandGroup className="max-h-[300px] overflow-auto">
                                {filteredCountries.map((country) => (
                                    <CommandItem
                                        key={country.id}
                                        value={country.name}
                                        onSelect={() => {
                                            onValueChange(country.name);
                                            setOpen(false);
                                            setSearchQuery("");
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === country.name ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <span className="flex-1 flex items-center gap-2">
                                            {country.emoji && <span>{country.emoji}</span>}
                                            {country.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-2">
                                            {country.code}
                                        </span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

