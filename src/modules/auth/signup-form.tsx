"use client"

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
import { signUp } from "@/database/auth-client"
import { showSuccess } from "@/utils/toast"
import { signupSchema, type SignupInput } from "@/validators/auth.validator"
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator"
import { PasswordInput } from "@/components/ui/password-input"
import { handleError } from "@/utils/error-handler"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const password = watch("password")

  const onSubmit = async (data: SignupInput) => {
    try {
      const emailLocalPart = data.email.split("@")[0]
      const safeName = emailLocalPart
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 50) || "User"

      const result = await signUp.email({
        email: data.email,
        password: data.password,
        name: safeName,
      })

      if (result.error) {
        const errorMessage = result.error.message || "Failed to create account"
        const userFriendlyMessage =
          errorMessage.toLowerCase().includes("already exists") ||
            errorMessage.toLowerCase().includes("duplicate")
            ? "An account with this email may already exist. Please try logging in or use a different email."
            : "Failed to create account. Please try again."

        handleError(new Error(userFriendlyMessage), "Signup failed")
        return
      }

      showSuccess("Account created successfully", "Redirecting to login page...")
      router.push("/login?message=Account created successfully")
    } catch (err) {
      handleError(err, "Signup error")
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Create your account</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Enter your email below to create your account
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <PasswordInput
                      id="password"
                      {...register("password")}
                      disabled={isSubmitting}
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
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <PasswordInput
                      id="confirm-password"
                      {...register("confirmPassword")}
                      disabled={isSubmitting}
                      aria-invalid={errors.confirmPassword ? "true" : "false"}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </Field>
                </div>
                <FieldDescription>
                  Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Already have an account? <a href="/login">Sign in</a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <Image
              src="/Login_image.jpg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover "
              width={500}
              height={500}
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
