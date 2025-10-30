import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { PASSWORD_REQUIREMENTS } from '@core/constants/security.constants';

/**
 * Password strength levels
 */
export enum PasswordStrength {
    WEAK = 'weak',
    MEDIUM = 'medium',
    STRONG = 'strong',
    VERY_STRONG = 'very-strong',
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
    strength: PasswordStrength;
    score: number; // 0-100
    feedback: string[];
    meetsRequirements: boolean;
}

/**
 * Custom validator for password strength
 * Enforces password complexity requirements from security constants
 *
 * Requirements:
 * - Minimum length
 * - Uppercase letter (if configured)
 * - Lowercase letter (if configured)
 * - Number (if configured)
 * - Special character (if configured)
 *
 * Usage:
 * ```typescript
 * password: ['', [Validators.required, passwordStrengthValidator()]]
 * ```
 */
export function passwordStrengthValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const password = control.value as string;

        if (!password) {
            // Let required validator handle empty passwords
            return null;
        }

        const errors: ValidationErrors = {};
        const feedback: string[] = [];

        // Check minimum length
        if (password.length < PASSWORD_REQUIREMENTS.MIN_LENGTH) {
            errors['minLength'] = true;
            feedback.push(`Mínimo ${PASSWORD_REQUIREMENTS.MIN_LENGTH} caracteres`);
        }

        // Check for uppercase
        if (PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
            errors['uppercase'] = true;
            feedback.push('Al menos una letra mayúscula');
        }

        // Check for lowercase
        if (PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
            errors['lowercase'] = true;
            feedback.push('Al menos una letra minúscula');
        }

        // Check for number
        if (PASSWORD_REQUIREMENTS.REQUIRE_NUMBER && !/\d/.test(password)) {
            errors['number'] = true;
            feedback.push('Al menos un número');
        }

        // Check for special character
        if (PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL_CHAR) {
            const specialChars = PASSWORD_REQUIREMENTS.SPECIAL_CHARS.split('').map((c) => `\\${c}`).join('');
            const specialCharRegex = new RegExp(`[${specialChars}]`);

            if (!specialCharRegex.test(password)) {
                errors['specialChar'] = true;
                feedback.push('Al menos un carácter especial (!@#$%^&*...)');
            }
        }

        // If there are errors, return them
        if (Object.keys(errors).length > 0) {
            return {
                passwordStrength: {
                    ...errors,
                    feedback,
                },
            };
        }

        return null;
    };
}

/**
 * Evaluate password strength and provide detailed feedback
 * Can be used to show strength meter in UI
 *
 * @param password - Password to evaluate
 * @returns Detailed validation result with strength score
 */
export function evaluatePasswordStrength(password: string): PasswordValidationResult {
    if (!password) {
        return {
            strength: PasswordStrength.WEAK,
            score: 0,
            feedback: ['Ingresa una contraseña'],
            meetsRequirements: false,
        };
    }

    let score = 0;
    const feedback: string[] = [];
    const errors: string[] = [];

    // Length score (0-30 points)
    if (password.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH) {
        score += 20;
        if (password.length >= 12) score += 5;
        if (password.length >= 15) score += 5;
    } else {
        errors.push(`Mínimo ${PASSWORD_REQUIREMENTS.MIN_LENGTH} caracteres`);
    }

    // Uppercase (0-15 points)
    const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
    if (uppercaseCount > 0) {
        score += Math.min(15, uppercaseCount * 5);
    } else if (PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE) {
        errors.push('Agrega letras mayúsculas');
    }

    // Lowercase (0-15 points)
    const lowercaseCount = (password.match(/[a-z]/g) || []).length;
    if (lowercaseCount > 0) {
        score += Math.min(15, lowercaseCount * 5);
    } else if (PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE) {
        errors.push('Agrega letras minúsculas');
    }

    // Numbers (0-20 points)
    const numberCount = (password.match(/\d/g) || []).length;
    if (numberCount > 0) {
        score += Math.min(20, numberCount * 5);
    } else if (PASSWORD_REQUIREMENTS.REQUIRE_NUMBER) {
        errors.push('Agrega números');
    }

    // Special characters (0-20 points)
    const specialChars = PASSWORD_REQUIREMENTS.SPECIAL_CHARS.split('').map((c) => `\\${c}`).join('');
    const specialCharRegex = new RegExp(`[${specialChars}]`, 'g');
    const specialCharCount = (password.match(specialCharRegex) || []).length;

    if (specialCharCount > 0) {
        score += Math.min(20, specialCharCount * 10);
    } else if (PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL_CHAR) {
        errors.push('Agrega caracteres especiales (!@#$%...)');
    }

    // Bonus points for variety
    const hasUpperLowerNumber = uppercaseCount > 0 && lowercaseCount > 0 && numberCount > 0;
    if (hasUpperLowerNumber) score += 5;

    const hasAll = hasUpperLowerNumber && specialCharCount > 0;
    if (hasAll) score += 5;

    // Penalties
    // Repeated characters
    const repeatedChars = password.match(/(.)\1{2,}/g);
    if (repeatedChars) {
        score -= repeatedChars.length * 5;
        feedback.push('Evita repetir caracteres');
    }

    // Sequential characters (abc, 123)
    if (/abc|bcd|cde|def|012|123|234|345|456|567|678|789/i.test(password)) {
        score -= 10;
        feedback.push('Evita secuencias comunes');
    }

    // Common patterns
    const commonPatterns = ['password', 'qwerty', '12345', 'admin', 'letmein', 'welcome'];
    if (commonPatterns.some((pattern) => password.toLowerCase().includes(pattern))) {
        score -= 20;
        feedback.push('Evita palabras comunes');
    }

    // Cap score at 100
    score = Math.max(0, Math.min(100, score));

    // Determine strength
    let strength: PasswordStrength;
    if (score < 40) {
        strength = PasswordStrength.WEAK;
    } else if (score < 60) {
        strength = PasswordStrength.MEDIUM;
    } else if (score < 80) {
        strength = PasswordStrength.STRONG;
    } else {
        strength = PasswordStrength.VERY_STRONG;
    }

    // Add strength feedback
    if (errors.length === 0) {
        switch (strength) {
            case PasswordStrength.WEAK:
                feedback.unshift('Contraseña débil - considera hacerla más compleja');
                break;
            case PasswordStrength.MEDIUM:
                feedback.unshift('Contraseña aceptable - puedes mejorarla');
                break;
            case PasswordStrength.STRONG:
                feedback.unshift('Contraseña fuerte');
                break;
            case PasswordStrength.VERY_STRONG:
                feedback.unshift('Contraseña muy fuerte');
                break;
        }
    }

    return {
        strength,
        score,
        feedback: errors.length > 0 ? errors : feedback,
        meetsRequirements: errors.length === 0,
    };
}

/**
 * Validator to check if passwords match (for confirm password fields)
 * Usage:
 * ```typescript
 * form: this.fb.group({
 *   password: ['', [passwordStrengthValidator()]],
 *   confirmPassword: ['']
 * }, {
 *   validators: passwordMatchValidator('password', 'confirmPassword')
 * })
 * ```
 */
export function passwordMatchValidator(passwordField: string, confirmPasswordField: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const password = control.get(passwordField);
        const confirmPassword = control.get(confirmPasswordField);

        if (!password || !confirmPassword) {
            return null;
        }

        if (confirmPassword.value === '') {
            return null;
        }

        if (password.value !== confirmPassword.value) {
            // Set error on confirmPassword field
            confirmPassword.setErrors({ passwordMismatch: true });
            return { passwordMismatch: true };
        }

        // Clear error if passwords match
        if (confirmPassword.hasError('passwordMismatch')) {
            confirmPassword.setErrors(null);
        }

        return null;
    };
}
