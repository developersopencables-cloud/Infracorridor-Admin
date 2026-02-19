import { Suspense } from "react"
import { ResetPasswordForm } from "@/modules/auth/reset-password-form"

function ResetPasswordFormWrapper() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <ResetPasswordForm />
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="bg-muted flex min-h-svh items-center justify-center">Loading...</div>}>
      <ResetPasswordFormWrapper />
    </Suspense>
  )
}

