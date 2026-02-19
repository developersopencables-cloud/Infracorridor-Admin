"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/utils/utils"
import { Input } from "./input"

type PasswordInputProps = React.ComponentProps<typeof Input> & {
    containerClassName?: string
}

export function PasswordInput({
    className,
    containerClassName,
    ...props
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = React.useState(false)

    const toggle = () => setShowPassword((prev) => !prev)

    return (
        <div className={cn("relative", containerClassName)}>
            <Input
                {...props}
                type={showPassword ? "text" : "password"}
                className={cn("pr-10", className)}
            />
            <button
                type="button"
                onClick={toggle}
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 inline-flex items-center justify-center"
                aria-label={showPassword ? "Hide password" : "Show password"}
            >
                {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                )}
            </button>
        </div>
    )
}


