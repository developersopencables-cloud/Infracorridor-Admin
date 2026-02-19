"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
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
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { requestPasswordReset } from "@/database/auth-client"
import { showSuccess } from "@/utils/toast"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/validators/auth.validator"
import { handleError } from "@/utils/error-handler"

const RESEND_COOLDOWN_SECONDS = 120 // 2 minutes

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  const [isSuccess, setIsSuccess] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const email = watch("email")

  const redirectUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/reset-password`
    }
    return "/reset-password"
  }, [])

  // Countdown timer effect
  useEffect(() => {
    if (timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timeRemaining])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const sendResetEmail = async (emailToSend: string) => {
    try {
      const result = await requestPasswordReset({
        email: emailToSend,
        redirectTo: redirectUrl,
      })

      setIsSuccess(true)
      setTimeRemaining(RESEND_COOLDOWN_SECONDS)
      const userFriendlyMessage =
        "If an account with this email exists, you'll receive a password reset link shortly."

      if (result.error) {
        showSuccess("Request submitted", userFriendlyMessage)
      } else {
        showSuccess("Reset email sent", userFriendlyMessage)
      }
    } catch (err) {
      handleError(err, "Password reset request error")
    }
  }

  const onSubmit = async (data: ForgotPasswordInput) => {
    await sendResetEmail(data.email)
  }

  const handleResend = async () => {
    if (timeRemaining > 0) return
    await sendResetEmail(email)
  }

  if (isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="p-6 md:p-8">
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Check your email</h1>
                  <p className="text-muted-foreground text-balance">
                    We&apos;ve sent a password reset link to {email}
                  </p>
                </div>
                <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
                  If an account with that email exists, you&apos;ll receive a password reset link shortly.
                </div>
                <Field>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      onClick={handleResend}
                      disabled={isSubmitting || timeRemaining > 0}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        "Sending..."
                      ) : timeRemaining > 0 ? (
                        `Resend email (${formatTime(timeRemaining)})`
                      ) : (
                        "Resend email"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/login")}
                      className="w-full"
                    >
                      Back to login
                    </Button>
                  </div>
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
                <h1 className="text-2xl font-bold">Forgot your password?</h1>
                <p className="text-muted-foreground text-balance">
                  Enter your email address and we&apos;ll send you a link to reset your password
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  {...register("email")}
                  disabled={isSubmitting}
                  aria-invalid={errors.email ? "true" : "false"}
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.email.message}
                  </p>
                )}
              </Field>
              <Field>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Sending..." : "Send reset link"}
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
