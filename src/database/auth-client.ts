import { createAuthClient } from "better-auth/react";


const getAuthBaseURL = () => {
  
    if (typeof window === "undefined") {
        return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";
    }

   
    return window.location.origin;
};

export const authClient = createAuthClient({
    baseURL: getAuthBaseURL(),
});


export const {
    signIn,
    signUp,
    signOut,
    useSession,
    requestPasswordReset,
    resetPassword,
} = authClient;

