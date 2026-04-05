import React, { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '../assets/style.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

type MessageState = {
    type: 'success' | 'error';
    text: string;
} | null;

type ResetFieldErrors = {
    newPassword?: string;
    confirmPassword?: string;
};

type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
};

const API_BASE_URL = '/api-auth';

const getErrorMessage = (error: unknown) => {
    // apiClient uses axios under the hood; error shape is the same
    const maybeAxios = error as any;
    if (maybeAxios?.isAxiosError) {
        const responseData = maybeAxios.response?.data;

        if (typeof responseData === 'string' && responseData.trim()) {
            return responseData;
        }

        if (responseData?.error) {
            return responseData.error;
        }

        if (responseData?.message) {
            return responseData.message;
        }

        if (responseData?.detail) {
            return responseData.detail;
        }

        return maybeAxios.message || 'Request failed.';
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'Unexpected error.';
};

const getResetFieldErrors = (message: string): ResetFieldErrors => {
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes('passwords do not match')) {
        return {
            confirmPassword: 'Passwords do not match.'
        };
    }

    if (
        normalizedMessage.includes('at least 8 characters')
        || normalizedMessage.includes('uppercase')
        || normalizedMessage.includes('lowercase')
        || normalizedMessage.includes('special character')
    ) {
        return {
            newPassword: 'Use 8+ characters with uppercase, lowercase, number, and special character.'
        };
    }

    if (normalizedMessage.includes('different from current password')) {
        return {
            newPassword: 'Use a new password that is different from your current one.'
        };
    }

    return {};
};

const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<MessageState>(null);
    const [fieldErrors, setFieldErrors] = useState<ResetFieldErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasResetSucceeded, setHasResetSucceeded] = useState(false);
    const successMessage = message?.type === 'success'
        ? message.text
        : 'Password reset successfully. Please log in again.';

    useEffect(() => {
        const nextToken = searchParams.get('token')?.trim() || '';

        setToken(nextToken);

        if (!nextToken) {
            setMessage({
                type: 'error',
                text: 'Invalid reset link. Please request a new password reset email.'
            });
            return;
        }

        setMessage(null);
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        const nextFieldErrors: ResetFieldErrors = {};

        if (!token) {
            setMessage({
                type: 'error',
                text: 'Invalid reset link. Please request a new password reset email.'
            });
            return;
        }

        if (!newPassword.trim()) {
            nextFieldErrors.newPassword = 'Enter your new password.';
        }

        if (!confirmPassword.trim()) {
            nextFieldErrors.confirmPassword = 'Confirm your new password.';
        } else if (newPassword !== confirmPassword) {
            nextFieldErrors.confirmPassword = 'Passwords do not match.';
        }

        if (Object.keys(nextFieldErrors).length > 0) {
            setFieldErrors(nextFieldErrors);
            return;
        }

        setFieldErrors({});
        setIsSubmitting(true);

        try {
            const response = await apiClient.post<ApiResponse<null>>(
                `${API_BASE_URL}/api/accounts/forgot-password/reset`,
                {
                    token,
                    newPassword,
                    confirmPassword
                }
            );

            if (localStorage.getItem('accessToken')) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('email');
                localStorage.removeItem('accountProfile');
                localStorage.removeItem('username');
            }

            setHasResetSucceeded(true);
            setNewPassword('');
            setConfirmPassword('');
            setMessage({
                type: 'success',
                text: response.data.message || 'Password reset successfully. Please log in again.'
            });
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            const nextFieldErrors = getResetFieldErrors(errorMessage);

            if (Object.keys(nextFieldErrors).length > 0) {
                setFieldErrors(nextFieldErrors);
                return;
            }

            setMessage({
                type: 'error',
                text: errorMessage
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="account-page">
            <header className="header active">
                <div className="container d-flex align-items-center w-100">
                    <Link to="/" className="logo">
                        <i className="fas fa-mug-hot"></i> coffee
                    </Link>

                    <div className="account-page-actions">
                        <button
                            type="button"
                            className="link-btn account-top-btn"
                            onClick={() => navigate('/')}
                        >
                            <i className="fas fa-house"></i>
                            <span>Storefront</span>
                        </button>
                    </div>
                </div>
            </header>

            <section className="account-page-shell">
                <div className="container">
                    <div className="account-card account-card-clean reset-card">
                        <div className="account-card-header">
                            <div className="account-card-title">
                                <span className="account-eyebrow">security</span>
                                <h3>Reset Password</h3>
                            </div>
                        </div>

                        {!hasResetSucceeded && (
                            <form className="reset-password-form" onSubmit={handleSubmit} noValidate>
                                <div className={`account-field account-field-full ${fieldErrors.newPassword ? 'has-error' : ''}`}>
                                    <input
                                        type="password"
                                        className="box"
                                        placeholder="New password"
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            if (message) {
                                                setMessage(null);
                                            }
                                            setFieldErrors(prev => ({
                                                ...prev,
                                                newPassword: undefined,
                                                confirmPassword: undefined
                                            }));
                                        }}
                                        disabled={!token || isSubmitting}
                                        aria-invalid={Boolean(fieldErrors.newPassword)}
                                        aria-describedby={fieldErrors.newPassword ? 'reset-new-password-error' : undefined}
                                    />
                                    {fieldErrors.newPassword && (
                                        <p id="reset-new-password-error" className="field-error-text account-field-error">
                                            {fieldErrors.newPassword}
                                        </p>
                                    )}
                                </div>

                                <div className={`account-field account-field-full ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
                                    <input
                                        type="password"
                                        className="box"
                                        placeholder="Confirm password"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            if (message) {
                                                setMessage(null);
                                            }
                                            setFieldErrors(prev => ({
                                                ...prev,
                                                confirmPassword: undefined
                                            }));
                                        }}
                                        disabled={!token || isSubmitting}
                                        aria-invalid={Boolean(fieldErrors.confirmPassword)}
                                        aria-describedby={fieldErrors.confirmPassword ? 'reset-confirm-password-error' : undefined}
                                    />
                                    {fieldErrors.confirmPassword && (
                                        <p id="reset-confirm-password-error" className="field-error-text account-field-error">
                                            {fieldErrors.confirmPassword}
                                        </p>
                                    )}
                                </div>

                                <p className="reset-password-note">
                                    One-time link.
                                </p>

                                <div className="account-action-row">
                                    <Link to="/" className="link-btn account-secondary-btn">
                                        <i className="fas fa-house"></i>
                                        <span>Storefront</span>
                                    </Link>
                                    <button
                                        type="submit"
                                        className="link-btn account-primary-btn"
                                        disabled={!token || isSubmitting}
                                    >
                                        <i className={`fas ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-key'}`}></i>
                                        <span>{isSubmitting ? 'Resetting...' : 'Reset Password'}</span>
                                    </button>
                                </div>

                                {message?.type === 'error' && (
                                    <div
                                        className={`form-feedback form-feedback-inline ${message.type}`}
                                        role="alert"
                                        aria-live="assertive"
                                    >
                                        <i className="fas fa-circle-exclamation"></i>
                                        <div className="form-feedback-copy">
                                            <span className="form-feedback-title">{message.text}</span>
                                        </div>
                                    </div>
                                )}
                            </form>
                        )}

                        {hasResetSucceeded && (
                            <div className="reset-success-state">
                                <div className="reset-success-badge">
                                    <i className="fas fa-circle-check"></i>
                                </div>
                                <p className="reset-success-title">Password Updated</p>
                                <span className="reset-success-copy">{successMessage}</span>
                            </div>
                        )}

                        {hasResetSucceeded && (
                            <div className="account-action-row reset-success-actions">
                                <Link to="/" className="link-btn account-primary-btn">
                                    <i className="fas fa-right-to-bracket"></i>
                                    <span>Back to Sign In</span>
                                </Link>
                                <Link to="/" className="link-btn account-secondary-btn">
                                    <i className="fas fa-house"></i>
                                    <span>Go to Storefront</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ResetPasswordPage;
