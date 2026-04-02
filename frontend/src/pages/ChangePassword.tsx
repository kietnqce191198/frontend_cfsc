import React, { useState } from 'react';
import axios from 'axios';
import apiClient from '../lib/apiClient';
import { Link, useNavigate } from 'react-router-dom';
import '../assets/style.css';
import '../assets/change-password.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

type MessageState = {
    type: 'success' | 'error';
    text: string;
} | null;

type ChangePasswordFields = {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
};

type PasswordFieldErrors = {
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
};

const getErrorMessage = (error: unknown) => {
    const maybeAxios = error as any;
    if (maybeAxios?.isAxiosError) {
        const responseData = maybeAxios.response?.data;
        return responseData?.message || responseData?.error || maybeAxios.message || 'Request failed.';
    }
    return error instanceof Error ? error.message : 'Unexpected error.';
};

const ChangePassword: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<ChangePasswordFields>({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Quản lý ẩn/hiện mật khẩu cho từng ô
    const [visibleFields, setVisibleFields] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const [message, setMessage] = useState<MessageState>(null);
    const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({});
    const [isSaving, setIsSaving] = useState(false);

    const toggleVisibility = (field: keyof typeof visibleFields) => {
        setVisibleFields(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const clearSessionAndRedirect = () => {
        localStorage.clear();
        navigate('/', { replace: true });
    };

    const changePasswordRequest = () =>
        apiClient.post('/api/auth/change-password', {
            oldPassword: formData.oldPassword,
            newPassword: formData.newPassword,
            confirmPassword: formData.confirmPassword
        });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFieldErrors(prev => ({ ...prev, [name]: undefined }));
        if (message?.type === 'error') setMessage(null);
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const nextFieldErrors: PasswordFieldErrors = {};
        
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (!formData.oldPassword) nextFieldErrors.oldPassword = 'Enter current password.';
        if (!formData.newPassword) {
            nextFieldErrors.newPassword = 'Enter new password.';
        } else {
            // Kiểm tra độ dài (từ 8 ký tự trở lên)
            if (formData.newPassword.length < 8) {
                nextFieldErrors.newPassword = 'Password must be at least 8 characters.';
            }
            // Kiểm tra định dạng phức tạp
            else if (!passwordRegex.test(formData.newPassword)) {
                nextFieldErrors.newPassword = 'Must include uppercase, lowercase, number and special character.';
            }
            // Kiểm tra mật khẩu mới phải khác mật khẩu cũ
            else if (formData.newPassword === formData.oldPassword) {
                nextFieldErrors.newPassword = 'New password must be different from old one.';
            }
        }
        if (!formData.confirmPassword) {

            nextFieldErrors.confirmPassword = 'Enter comfirm password.';
        } else if (formData.newPassword !== formData.confirmPassword) {
            nextFieldErrors.confirmPassword = 'Confirm password does not match.';
        }

        if (Object.keys(nextFieldErrors).length > 0) {
            setFieldErrors(nextFieldErrors);
            return;
        }

        setIsSaving(true);
        if (!localStorage.getItem('accessToken')) {
            setIsSaving(false);
            clearSessionAndRedirect();
            return;
        }

        try {
            const response = await changePasswordRequest();

            // Nếu thành công
            setMessage({ type: 'success', text: response.data.message || 'Password updated!' });
            setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => { clearSessionAndRedirect(); }, 2000);

        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                clearSessionAndRedirect();
                return;
            }

            const errorMessage = getErrorMessage(error);
            const lowerMsg = errorMessage.toLowerCase();

            // Phân loại lỗi trả về từ BE vào từng ô input tương ứng
            if (lowerMsg.includes("current password")) {
                setFieldErrors({ oldPassword: errorMessage });
            }
            else if (lowerMsg.includes("new password") || lowerMsg.includes("characters") || lowerMsg.includes("contain")) {
                setFieldErrors({ newPassword: errorMessage });
            }
            else if (lowerMsg.includes("match")) {
                setFieldErrors({ confirmPassword: errorMessage });
            }
            else {
                // Nếu là lỗi chung chung khác thì hiện thông báo tổng
                setMessage({ type: 'error', text: errorMessage });
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="account-page">
            <header className="header active">
                <div className="container d-flex align-items-center w-100">
                    <Link to="/" className="logo"><i className="fas fa-mug-hot"></i> coffee</Link>
                    <div className="account-page-actions">
                        <button type="button" className="link-btn account-top-btn" onClick={() => navigate(-1)}>
                            <i className="fas fa-arrow-left"></i> <span>back</span>
                        </button>
                    </div>
                </div>
            </header>

            <section className="account-page-shell">
                <div className="container account-container-center">
                    <div className="account-card account-card-clean shadow-sm">
                        <div className="account-card-header text-center">
                            <span className="account-eyebrow">security</span>
                            <h3>Change Password</h3>
                        </div>

                        {message && <p className={`auth-message ${message.type}`}>{message.text}</p>}

                        <div className="account-card-body">
                            <form className="account-form" onSubmit={handleSubmit} noValidate>
                                <div className="account-form-grid">

                                    {/* Current Password */}
                                    <div className={`account-field account-field-full ${fieldErrors.oldPassword ? 'has-error' : ''}`}>
                                        <label className="account-field-label">current password</label>
                                        <div className="password-input-wrapper">
                                            <input
                                                type={visibleFields.current ? "text" : "password"}
                                                name="oldPassword"
                                                placeholder="••••••••"
                                                className="box"
                                                value={formData.oldPassword}
                                                onChange={handleChange}
                                            />
                                            <i className={`fas ${visibleFields.current ? 'fa-eye-slash' : 'fa-eye'} password-toggle-icon`} onClick={() => toggleVisibility('current')}></i>
                                        </div>
                                        {fieldErrors.oldPassword && <p className="field-error-text">{fieldErrors.oldPassword}</p>}
                                    </div>

                                    {/* New Password */}
                                    <div className={`account-field account-field-full ${fieldErrors.newPassword ? 'has-error' : ''}`}>
                                        <label className="account-field-label">new password</label>
                                        <div className="password-input-wrapper">
                                            <input
                                                type={visibleFields.new ? "text" : "password"}
                                                name="newPassword"
                                                placeholder="••••••••"
                                                className="box"
                                                value={formData.newPassword}
                                                onChange={handleChange}
                                            />
                                            <i className={`fas ${visibleFields.new ? 'fa-eye-slash' : 'fa-eye'} password-toggle-icon`} onClick={() => toggleVisibility('new')}></i>
                                        </div>
                                        {fieldErrors.newPassword && <p className="field-error-text">{fieldErrors.newPassword}</p>}
                                    </div>

                                    {/* Confirm Password */}
                                    <div className={`account-field account-field-full ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
                                        <label className="account-field-label">confirm password</label>
                                        <div className="password-input-wrapper">
                                            <input
                                                type={visibleFields.confirm ? "text" : "password"}
                                                name="confirmPassword"
                                                placeholder="••••••••"
                                                className="box"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                            />
                                            <i className={`fas ${visibleFields.confirm ? 'fa-eye-slash' : 'fa-eye'} password-toggle-icon`} onClick={() => toggleVisibility('confirm')}></i>
                                        </div>
                                        {fieldErrors.confirmPassword && <p className="field-error-text">{fieldErrors.confirmPassword}</p>}
                                    </div>
                                </div>

                                <div className="account-url-hint text-center">
                                    <i className="fas fa-shield-halved"></i>
                                    <span>Use a strong password to protect your account.</span>
                                </div>

                                <div className="account-action-row d-flex justify-content-center">
                                    <Link to="/" className="link-btn account-secondary-btn">
                                        <i className="fas fa-house"></i> <span>home</span>
                                    </Link>
                                    <button type="submit" className="link-btn account-primary-btn" disabled={isSaving}>
                                        <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
                                        <span>{isSaving ? 'updating...' : 'update password'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ChangePassword;