import { toast } from "sonner"

/**
 * Show a success toast notification
 */
export function showSuccess(message: string, description?: string) {
    toast.success(message, {
        description,
        position: "top-right",
        className: "bg-green-500 text-white",
        duration: 4000,
    })
}

/**
 * Show an error toast notification
 */
export function showError(message: string, description?: string) {
    toast.error(message, {
        description,
        position: "top-right",
        className: "bg-red-500 text-white",
        duration: 5000,
    })
}

/**
 * Show an info toast notification
 */
export function showInfo(message: string, description?: string) {
    toast.info(message, {
        description,    
        position: "top-right",
        className: "bg-blue-500 text-white",
        duration: 4000,
    })
}

/**
 * Show a warning toast notification
 */
export function showWarning(message: string, description?: string) {
    toast.warning(message, {
        description,
        position: "top-right",
        className: "bg-yellow-500 text-white",
        duration: 4000,
    })
}

/**
 * Show a loading toast notification
 * Returns a function to update or dismiss the toast
 */
export function showLoading(message: string) {
    return toast.loading(message, {
        position: "top-right",
        className: "bg-gray-500 text-white",
        duration: 4000,
    })
}

/**
 * Show a promise toast (automatically shows loading, then success/error)
 */
export function showPromise<T>(
    promise: Promise<T>,
    messages: {
        loading: string
        success: string | ((data: T) => string)
        error: string | ((error: unknown) => string)
    }
) {
    return toast.promise(promise, messages)
}

