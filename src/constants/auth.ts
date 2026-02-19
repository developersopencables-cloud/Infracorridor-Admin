/**
 * Authentication constants and configuration
 */

export const AUTH_CONSTANTS = {
    // Password requirements
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: 128,

    // Rate limiting
    MAX_LOGIN_ATTEMPTS: 15,
    LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
    MAX_PASSWORD_RESET_REQUESTS: 3,
    PASSWORD_RESET_RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_SIGNUP_ATTEMPTS: 5,
    SIGNUP_RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000, // 1 hour

    // Token expiration
    RESET_TOKEN_EXPIRY_MS: 60 * 60 * 1000, // 1 hour
SESSION_DURATION_MS: 7 * 24 * 60 * 60 * 1000, // 7 days

    
    PASSWORD_HISTORY_COUNT: 5, // Prevent reusing last 5 passwords
} as const;

/**
 * Password strength requirements
 * Must contain: lowercase, uppercase, number, special character
 */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/])[A-Za-z\d@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/]{8,}$/;

/**
 * Password strength levels
 */
export enum PasswordStrength {
    WEAK = 'weak',
    FAIR = 'fair',
    GOOD = 'good',
    STRONG = 'strong',
}

/**
 * Get password strength based on criteria
 */
export function getPasswordStrength(password: string): PasswordStrength {
    if (password.length < 8) return PasswordStrength.WEAK;

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/]/.test(password)) strength++;

    if (strength <= 2) return PasswordStrength.WEAK;
    if (strength <= 4) return PasswordStrength.FAIR;
    if (strength <= 5) return PasswordStrength.GOOD;
    return PasswordStrength.STRONG;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (password.length < AUTH_CONSTANTS.MIN_PASSWORD_LENGTH) {
        errors.push(`Password must be at least ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} characters long`);
    }

    if (password.length > AUTH_CONSTANTS.MAX_PASSWORD_LENGTH) {
        errors.push(`Password must be no more than ${AUTH_CONSTANTS.MAX_PASSWORD_LENGTH} characters long`);
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (!/[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/]/.test(password)) {
        errors.push('Password must contain at least one special character (@$!%*?&#^()_+-=[]{};\':"|,.<>/)');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

