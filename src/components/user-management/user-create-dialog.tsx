"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, X } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { createUserSchema, type CreateUserInput } from "@/validators/user.validator";
import { handleError, handleFetchError } from "@/utils/error-handler";

interface UserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultRole?: "admin" | "buyer" | "seller" | "user";
}

export function UserCreateDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultRole = "admin",
}: UserCreateDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      confirmPassword: "",
      role: defaultRole,
    },
  });

  const role = watch("role");

  useEffect(() => {
    if (open) {
      reset({
        email: "",
        name: "",
        password: "",
        confirmPassword: "",
        role: defaultRole,
      });
    }
  }, [open, defaultRole, reset]);

  const onSubmit = async (data: CreateUserInput) => {
    try {
      const response = await fetch("/api/user-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email.trim(),
          name: data.name.trim(),
          password: data.password,
          role: data.role || defaultRole,
        }),
      });

      if (!response.ok) {
        const errorMessage = await handleFetchError(response);
        showError("Error", errorMessage);
        return;
      }

      const result = await response.json();

      if (result.success) {
        showSuccess("User created successfully");
        onSuccess();
        onOpenChange(false);
      } else {
        handleError(new Error(result.error || "Unknown error"), "Failed to create user");
      }
    } catch (error) {
      handleError(error, "Failed to create user");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md flex flex-col m-4 max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Create New User</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Add a new user to the system. All fields are required.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1">
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="user@example.com"
                disabled={isSubmitting}
                aria-invalid={errors.email ? "true" : "false"}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Enter user name"
                disabled={isSubmitting}
                aria-invalid={errors.name ? "true" : "false"}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">
                Password <span className="text-destructive">*</span>
              </Label>
              <PasswordInput
                id="password"
                {...register("password")}
                placeholder="Enter password (min. 8 characters)"
                disabled={isSubmitting}
                aria-invalid={errors.password ? "true" : "false"}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">
                Confirm Password <span className="text-destructive">*</span>
              </Label>
              <PasswordInput
                id="confirmPassword"
                {...register("confirmPassword")}
                placeholder="Confirm password"
                disabled={isSubmitting}
                aria-invalid={errors.confirmPassword ? "true" : "false"}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={role}
                onValueChange={(value) => setValue("role", value as "admin" | "buyer" | "seller" | "user")}
                disabled={isSubmitting}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-xs text-destructive">{errors.role.message}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create User
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
