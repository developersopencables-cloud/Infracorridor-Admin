"use client"

import { useMemo } from "react"
import { getPasswordStrength, PasswordStrength } from "@/constants/auth"
import { cn } from "@/utils/utils"

interface PasswordStrengthIndicatorProps {
    password: string
    className?: string
}

export function PasswordStrengthIndicator({
    password,
    className,
}: PasswordStrengthIndicatorProps) {
    const strength = useMemo(() => getPasswordStrength(password), [password])

    if (!password) {
        return null
    }

    const strengthConfig = {
        [PasswordStrength.WEAK]: {
            label: "Weak",
            color: "bg-red-500",
            textColor: "text-red-600 dark:text-red-400",
            width: "w-1/4",
        },
        [PasswordStrength.FAIR]: {
            label: "Fair",
            color: "bg-orange-500",
            textColor: "text-orange-600 dark:text-orange-400",
            width: "w-2/4",
        },
        [PasswordStrength.GOOD]: {
            label: "Good",
            color: "bg-yellow-500",
            textColor: "text-yellow-600 dark:text-yellow-400",
            width: "w-3/4",
        },
        [PasswordStrength.STRONG]: {
            label: "Strong",
            color: "bg-green-500",
            textColor: "text-green-600 dark:text-green-400",
            width: "w-full",
        },
    }

    const config = strengthConfig[strength]

    return (
        <div className={cn("space-y-1", className)}>
            <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Password strength</span>
                <span className={cn("font-medium", config.textColor)}>
                    {config.label}
                </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className={cn(
                        "h-full transition-all duration-300",
                        config.color,
                        config.width
                    )}
                />
            </div>
        </div>
    )
}

