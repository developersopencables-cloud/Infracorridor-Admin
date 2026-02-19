import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { sendEmail } from "@/utils/email";
import { logAuditEvent, AuditEventType } from "@/utils/audit-log";

if (!process.env.MONGODB_URI) {
    throw new Error("Please add MONGODB_URI to your .env file");
}

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db();

client.connect().catch(console.error);


const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_BASE_URL) {
        return process.env.NEXT_PUBLIC_BASE_URL;
    }
    return "http://localhost:3000";
};

const getTrustedOrigins = () => {
    const origins = [
        "http://localhost:3000",
        "http://localhost:3001",
    ];


    if (process.env.NEXT_PUBLIC_BASE_URL &&
        !process.env.NEXT_PUBLIC_BASE_URL.includes("localhost")) {
        origins.push(process.env.NEXT_PUBLIC_BASE_URL);
    }


    if (process.env.BETTER_AUTH_URL &&
        !origins.includes(process.env.BETTER_AUTH_URL)) {
        origins.push(process.env.BETTER_AUTH_URL);
    }


    if (process.env.TRUSTED_ORIGINS) {
        const customOrigins = process.env.TRUSTED_ORIGINS.split(",").map(o => o.trim());
        origins.push(...customOrigins);
    }


    if (process.env.NODE_ENV === "development") {

        origins.push("https://*.devtunnels.ms");
        origins.push("http://localhost:3001");
        origins.push("https://*.githubpreview.dev");
        origins.push("https://*.github.dev");
        origins.push("https://*.app.github.dev");

        origins.push("https://*.preview.app.github.dev");
        origins.push("https://*.ngrok-free.dev");
    }



    return origins;
};

export const auth = betterAuth({
    database: mongodbAdapter(db, {

    }),
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    trustedOrigins: getTrustedOrigins(),
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, token }) => {
            const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;

            try {
                await sendEmail({
                    to: user.email,
                    subject: "Reset your password",
                    text: `Click the link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #333;">Reset Your Password</h2>
                            <p>Click the button below to reset your password:</p>
                            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
                            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
                            <p style="color: #666; font-size: 12px; word-break: break-all;">${resetUrl}</p>
                            <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour.</p>
                            <p style="color: #999; font-size: 12px;">If you didn't request this password reset, please ignore this email.</p>
                        </div>
                    `,
                });
            } catch (error) {

                console.error('[Email Service Error] Failed to send password reset email:', {
                    email: user.email,
                    error: error instanceof Error ? error.message : String(error),
                });

                throw error;
            }
        },
        onPasswordReset: async ({ user }) => {

            logAuditEvent(AuditEventType.PASSWORD_RESET_SUCCESS, {
                userId: user.id,
                email: user.email,
            });


            try {
                await sendEmail({
                    to: user.email,
                    subject: "Password reset successful",
                    text: "Your password has been successfully reset. If you didn't make this change, please contact support immediately.",
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #333;">Password Reset Successful</h2>
                            <p>Your password has been successfully reset.</p>
                            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't make this change, please contact support immediately.</p>
                        </div>
                    `,
                });
            } catch (error) {

                console.error('[Email Service Error] Failed to send password reset confirmation email:', {
                    email: user.email,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        },
    },


    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "user",
            },
        },
    },
});