import { Suspense } from "react"
import { ForgotPasswordForm } from "@/modules/auth/forgot-password-form"

function ForgotPasswordFormWrapper() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <ForgotPasswordForm />
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="bg-muted flex min-h-svh items-center justify-center">Loading...</div>}>
      <ForgotPasswordFormWrapper />
    </Suspense>
  )
}

