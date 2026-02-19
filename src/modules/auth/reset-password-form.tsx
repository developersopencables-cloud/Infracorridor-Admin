"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/utils/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import Image from "next/image"
import { resetPassword } from "@/database/auth-client"
import { showSuccess } from "@/utils/toast"
import { resetPasswordSchema, type ResetPasswordInput } from "@/validators/auth.validator"
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator"
import { PasswordInput } from "@/components/ui/password-input"
import { handleError } from "@/utils/error-handler"

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSuccess, setIsSuccess] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      token: "",
    },
  })

  const password = watch("password")

  // On success, redirect to login after a short delay
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        router.push(
          "/login?message=Password reset successfully. Please login with your new password."
        )
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess, router])

  useEffect(() => {
    const urlToken = searchParams.get("token")
    const STORAGE_KEY = "resetPasswordToken"

    if (urlToken) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(STORAGE_KEY, urlToken)
        setToken(urlToken)
        setValue("token", urlToken)
        router.replace("/reset-password")
      } else {
        setToken(urlToken)
        setValue("token", urlToken)
      }
      return
    }

    if (typeof window !== "undefined") {
      const storedToken = sessionStorage.getItem(STORAGE_KEY)
      if (storedToken) {
        setToken(storedToken)
        setValue("token", storedToken)
        return
      }
    }

    const errorMessage =
      "Invalid or missing reset token. Please request a new password reset."
    handleError(new Error(errorMessage), "Invalid reset token")
  }, [searchParams, router, setValue])

  const onSubmit = async (data: ResetPasswordInput) => {
    if (!token) {
      handleError(new Error("Invalid reset token"), "Validation error")
      return
    }

    try {
      const result = await resetPassword({
        newPassword: data.password,
        token: data.token,
      })

      if (result.error) {
        const errorMessage = result.error.message || "Failed to reset password"

        // Check for specific error types
        let userFriendlyMessage = errorMessage
        if (
          errorMessage.toLowerCase().includes("invalid") ||
          errorMessage.toLowerCase().includes("expired") ||
          errorMessage.toLowerCase().includes("token")
        ) {
          userFriendlyMessage =
            "Invalid or expired reset token. Please request a new password reset."
        } else if (
          errorMessage.toLowerCase().includes("email") ||
          errorMessage.toLowerCase().includes("user")
        ) {
          userFriendlyMessage =
            "Failed to reset password. Please try again or request a new reset link."
        }

        handleError(new Error(userFriendlyMessage), "Failed to reset password")
        return
      }

      setIsSuccess(true)
      showSuccess("Password reset successful", "Redirecting to login page...")
      // Clear stored token so it can't be reused
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("resetPasswordToken")
      }
    } catch (err) {
      handleError(err, "Reset password error")
    }
  }

  if (isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="p-6 md:p-8">
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Password reset successful!</h1>
                  <p className="text-muted-foreground text-balance">
                    Your password has been reset. Redirecting to login...
                  </p>
                </div>
                <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
                  You can now login with your new password.
                </div>
                <Field>
                  <Button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="w-full"
                  >
                    Go to login
                  </Button>
                </Field>
              </FieldGroup>
            </div>
            <div className="bg-muted relative hidden md:block">
              <Image
                src="/Login_image.jpg"
                alt="Image"
                className="absolute inset-0 h-full w-full object-cover"
                width={500}
                height={500}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Reset your password</h1>
                <p className="text-muted-foreground text-balance">
                  Enter your new password below
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="password">New Password</FieldLabel>
                <PasswordInput
                  id="password"
                  placeholder="Enter new password"
                  {...register("password")}
                  disabled={isSubmitting || !token}
                  aria-invalid={errors.password ? "true" : "false"}
                />
                {password && (
                  <PasswordStrengthIndicator password={password} />
                )}
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.password.message}
                  </p>
                )}
                <FieldDescription>
                  Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Confirm new password"
                  {...register("confirmPassword")}
                  disabled={isSubmitting || !token}
                  aria-invalid={errors.confirmPassword ? "true" : "false"}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </Field>
              <Field>
                <Button
                  type="submit"
                  disabled={isSubmitting || !token}
                  className="w-full"
                >
                  {isSubmitting ? "Resetting..." : "Reset password"}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Remember your password? <a href="/login">Back to login</a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <Image
              src="/Login_image.jpg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover"
              width={500}
              height={500}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
