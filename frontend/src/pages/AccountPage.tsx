import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import '../assets/style.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

type MessageState = { type: 'success' | 'error'; text: string } | null;
type ApiResponse<T> = { success: boolean; message: string; data: T };
type DetailItem = { label: string; value: string; icon: string; helper?: string; truncate?: boolean; fullRow?: boolean };
type DetailSection = { title: string; description: string; items: DetailItem[] };

type AccountProfile = {
    id?: number;
    username?: string;
    email: string;
    fullName: string;
    phone: string;
    avatarUrl: string;
    address: string;
    dateOfBirth: string;
    gender?: string;
    status?: string;
    roles?: string[];
    lastLoginAt?: string;
    createdAt?: string;
    updatedAt?: string;
};

type AccountFieldErrors = {
    fullName?: string;
    phone?: string;
    avatarFile?: string;
    address?: string;
    dateOfBirth?: string;
};

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const ENG_BASE = import.meta.env.VITE_ENGAGEMENT_BASE_URL || 'http://localhost:8083';

const createEmptyProfile = (email = ''): AccountProfile => ({
    email,
    fullName: '',
    phone: '',
    avatarUrl: '',
    address: '',
    dateOfBirth: ''
});

const normalizeProfile = (profile?: Partial<AccountProfile> | null, fallbackEmail = ''): AccountProfile => ({
    ...createEmptyProfile(profile?.email || fallbackEmail),
    ...profile,
    email: profile?.email || fallbackEmail,
    fullName: profile?.fullName?.trim() || '',
    phone: profile?.phone?.trim() || '',
    avatarUrl: profile?.avatarUrl?.trim() || '',
    address: profile?.address?.trim() || '',
    dateOfBirth: profile?.dateOfBirth || ''
});

const getErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (typeof data === 'string' && data.trim()) return data;
        if (data?.error) return data.error;
        if (data?.message) return data.message;
        if (data?.detail) return data.detail;
        return error.message || 'Request failed.';
    }
    return error instanceof Error ? error.message : 'Unexpected error.';
};

const isValidPhone = (value: string) => /^\+?[0-9]{9,15}$/.test(value);

const isPastOrToday = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsed.getTime() <= today.getTime();
};

const formatText = (value?: string) => value?.trim() || 'Not set';
const toTitleCase = (value: string) => value.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
const formatEnumValue = (value?: string) => (value ? toTitleCase(value.replace(/_/g, ' ')) : 'Not set');

const formatDate = (value?: string) => {
    if (!value) return 'Not set';
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
};

const formatDateTime = (value?: string) => {
    if (!value) return 'Not available';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

const getInitials = (value: string) => {
    const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.length === 0 ? 'A' : parts.map(part => part[0].toUpperCase()).join('');
};

const getDisplayName = (profile: AccountProfile) =>
    profile.fullName?.trim() || profile.username?.trim() || profile.email.split('@')[0] || 'Account';

const getFieldErrors = (message: string): AccountFieldErrors => {
    const normalized = message.toLowerCase();
    if (normalized.includes('full name')) return { fullName: message };
    if (normalized.includes('phone')) return { phone: message };
    if (normalized.includes('avatar') || normalized.includes('image')) return { avatarFile: message };
    if (normalized.includes('address')) return { address: message };
    if (normalized.includes('date of birth') || normalized.includes('dateofbirth')) return { dateOfBirth: message };
    return {};
};

const AccountPage: React.FC = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(createEmptyProfile());
    const [formData, setFormData] = useState(createEmptyProfile());
    const [fieldErrors, setFieldErrors] = useState<AccountFieldErrors>({});
    const [message, setMessage] = useState<MessageState>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [previewAvailable, setPreviewAvailable] = useState(true);
    const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
    const avatarInputRef = useRef<HTMLInputElement | null>(null);
    const [loyaltyPoints, setLoyaltyPoints] = useState<string | null>(null);
    const [loyaltyTier, setLoyaltyTier] = useState<string | null>(null);
    const resetAvatarInput = () => {
        if (avatarInputRef.current) {
            avatarInputRef.current.value = '';
        }
    };

    const clearSelectedAvatar = () => {
        setSelectedAvatarFile(null);
        setPreviewAvailable(true);
        setFieldErrors(prev => ({ ...prev, avatarFile: undefined }));
        resetAvatarInput();
    };

    const clearSessionAndRedirect = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('email');
        localStorage.removeItem('accountProfile');
        localStorage.removeItem('username');
        localStorage.removeItem('customerId');
        navigate('/', { replace: true });
    };

    const persistProfile = (nextProfile: AccountProfile) => {
        localStorage.setItem('accountProfile', JSON.stringify(nextProfile));
        localStorage.setItem('email', nextProfile.email);
        localStorage.removeItem('username');
        setProfile(nextProfile);
        setFormData(nextProfile);
        setSelectedAvatarFile(null);
        setAvatarPreviewUrl('');
        resetAvatarInput();
    };

    const fetchAccount = () =>
        apiClient.get<ApiResponse<AccountProfile>>('/api/accounts/me');

    const fetchLoyalty = async (token: string) => {
        try {
            const res = await fetch(`${ENG_BASE}/me/loyalty/current-points`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) return;
            const data = await res.json() as any;
            const current = typeof data?.current_points === 'number'
                ? data.current_points
                :data?.current_points ?? 0;
            if (!Number.isNaN(current)) {
                setLoyaltyPoints(current);
            }
            setLoyaltyTier("🥇"+data?.tier)
        } catch {
            // ignore errors on overview
        }
    };
   

    const saveAccount = (nextProfile: AccountProfile, avatarFile: File | null) => {
        const payload = new FormData();
        payload.append('fullName', nextProfile.fullName.trim());
        payload.append('phone', nextProfile.phone.trim());
        payload.append('address', nextProfile.address.trim());

        if (nextProfile.dateOfBirth) {
            payload.append('dateOfBirth', nextProfile.dateOfBirth);
        }
        if (avatarFile) {
            payload.append('avatarFile', avatarFile);
        }

        return apiClient.put<ApiResponse<AccountProfile>>('/api/accounts/me', payload);
    };

    useEffect(() => {
        if (!selectedAvatarFile) {
            setAvatarPreviewUrl('');
            return;
        }

        const objectUrl = URL.createObjectURL(selectedAvatarFile);
        setAvatarPreviewUrl(objectUrl);
        setPreviewAvailable(true);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [selectedAvatarFile]);

    useEffect(() => {
        let isMounted = true;
        const token = localStorage.getItem('accessToken');
        const savedEmail = localStorage.getItem('email') || '';
        const savedProfile = localStorage.getItem('accountProfile');

        if (!token) {
            navigate('/', { replace: true });
            return;
        }

        if (savedProfile) {
            try {
                const parsed = JSON.parse(savedProfile) as Partial<AccountProfile>;
                const restored = normalizeProfile(parsed, savedEmail);
                setProfile(restored);
                setFormData(restored);
            } catch {
                const fallback = createEmptyProfile(savedEmail);
                setProfile(fallback);
                setFormData(fallback);
            }
        }

        const syncProfile = async () => {
            try {
                const response = await fetchAccount();

                if (!isMounted) return;
                const normalized = normalizeProfile(response.data.data, savedEmail);
                persistProfile(normalized);

                const tokenForCalls = token;
                if (tokenForCalls) {
                    await fetchLoyalty(tokenForCalls);
                }
            } catch (error) {
                if (axios.isAxiosError(error) && error.response?.status === 401) {
                    clearSessionAndRedirect();
                    return;
                }

                const errorMessage = getErrorMessage(error);
                if (/refresh session|log in again|expired token/i.test(errorMessage)) {
                    clearSessionAndRedirect();
                    return;
                }

                if (isMounted) setMessage({ type: 'error', text: errorMessage });
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        syncProfile();
        return () => {
            isMounted = false;
        };
    }, [navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const errorKey = name as keyof AccountFieldErrors;
        const fieldKey = name as keyof AccountProfile;
        if (message) setMessage(null);
        setFieldErrors(prev => ({ ...prev, [errorKey]: undefined }));
        setFormData(prev => ({ ...prev, [fieldKey]: value }));
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextFile = e.target.files?.[0] || null;
        if (message) setMessage(null);
        setFieldErrors(prev => ({ ...prev, avatarFile: undefined }));

        if (!nextFile) {
            setSelectedAvatarFile(null);
            setPreviewAvailable(true);
            resetAvatarInput();
            return;
        }

        if (!ALLOWED_AVATAR_TYPES.has(nextFile.type)) {
            setSelectedAvatarFile(null);
            setFieldErrors(prev => ({
                ...prev,
                avatarFile: 'Choose a JPG, PNG, GIF, or WEBP image.'
            }));
            resetAvatarInput();
            return;
        }

        if (nextFile.size > MAX_AVATAR_SIZE_BYTES) {
            setSelectedAvatarFile(null);
            setFieldErrors(prev => ({
                ...prev,
                avatarFile: 'Avatar image must be 5 MB or smaller.'
            }));
            resetAvatarInput();
            return;
        }

        setSelectedAvatarFile(nextFile);
        setPreviewAvailable(true);
    };

    const handleStartEditing = () => {
        setFieldErrors({});
        setMessage(null);
        setFormData(profile);
        setPreviewAvailable(true);
        setSelectedAvatarFile(null);
        resetAvatarInput();
        setIsEditing(true);
    };

    const handleCancelEditing = () => {
        setFieldErrors({});
        setMessage(null);
        setFormData(profile);
        setPreviewAvailable(true);
        setSelectedAvatarFile(null);
        resetAvatarInput();
        setIsEditing(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        const nextProfile = {
            ...formData,
            fullName: formData.fullName.trim(),
            phone: formData.phone.trim(),
            address: formData.address.trim()
        };

        const nextErrors: AccountFieldErrors = {};
        if (!nextProfile.fullName) nextErrors.fullName = 'Enter your name.';
        if (!nextProfile.phone) nextErrors.phone = 'Enter your phone.';
        else if (!isValidPhone(nextProfile.phone)) nextErrors.phone = 'Enter a valid phone number.';
        if (nextProfile.address.length > 255) nextErrors.address = 'Address must be 255 characters or fewer.';
        if (nextProfile.dateOfBirth && !isPastOrToday(nextProfile.dateOfBirth)) {
            nextErrors.dateOfBirth = 'Date of birth cannot be in the future.';
        }
        if (selectedAvatarFile && !ALLOWED_AVATAR_TYPES.has(selectedAvatarFile.type)) {
            nextErrors.avatarFile = 'Choose a JPG, PNG, GIF, or WEBP image.';
        }
        if (selectedAvatarFile && selectedAvatarFile.size > MAX_AVATAR_SIZE_BYTES) {
            nextErrors.avatarFile = 'Avatar image must be 5 MB or smaller.';
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            return;
        }

        if (!localStorage.getItem('accessToken')) {
            clearSessionAndRedirect();
            return;
        }

        setIsSaving(true);
        try {
            const response = await saveAccount(nextProfile, selectedAvatarFile);

            persistProfile(normalizeProfile(response.data.data, profile.email));
            setIsEditing(false);
            setMessage({ type: 'success', text: response.data.message || 'Account updated successfully.' });
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                clearSessionAndRedirect();
                return;
            }

            const errorMessage = getErrorMessage(error);
            if (/refresh session|log in again|expired token/i.test(errorMessage)) {
                clearSessionAndRedirect();
                return;
            }

            const nextErrors = getFieldErrors(errorMessage);
            if (Object.keys(nextErrors).length > 0) {
                setFieldErrors(nextErrors);
                return;
            }

            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setIsSaving(false);
        }
    };
    const getTierColor = (tier?: string | null) => {
        switch (tier) {
            case 'GOLD': return '#f59e0b';
            case 'SILVER': return '#9ca3af';
            case 'BRONZE': return '#b45309';
            default: return '#6b7280';
        }
    };
    const displayName = getDisplayName(profile);
    const avatarSource = avatarPreviewUrl || profile.avatarUrl;
    const userHandle = profile.username?.trim() ? `@${profile.username.trim()}` : 'Member account';
    const detailSections: DetailSection[] = [
        {
            title: 'Account information',
            description: 'The main details attached to your account.',
            items: [
                { label: 'Full name', value: formatText(profile.fullName), icon: 'fas fa-id-badge', fullRow: true },
                { label: 'Username', value: formatText(profile.username), icon: 'fas fa-at', truncate: true },
                { label: 'Email', value: formatText(profile.email), icon: 'fas fa-envelope', fullRow: true },
                {
                    label: 'Current Pointssss',
                    value: loyaltyPoints !== null ? `${loyaltyPoints}`  : 'Loading...',
                    icon: 'fas fa-gem'
                },
                {
                    label: 'Rank',
                    value: loyaltyTier ? loyaltyTier : 'Loading...',
                    icon: 'fas fa-crown'
                },
                { label: 'Phone', value: formatText(profile.phone), icon: 'fas fa-phone' }
            ]
        },
        {
            title: 'Personal details',
            description: 'Optional details you can complete whenever you want.',
            items: [
                { label: 'Address', value: formatText(profile.address), icon: 'fas fa-location-dot' },
                { label: 'Date of birth', value: formatDate(profile.dateOfBirth), icon: 'fas fa-cake-candles' },
                { label: 'Gender', value: formatEnumValue(profile.gender), icon: 'fas fa-user' },            ]
        }

    ];
    const selectedAvatarSize = selectedAvatarFile ? `${(selectedAvatarFile.size / (1024 * 1024)).toFixed(2)} MB` : '';

    return (
        <div className="account-page">
            <header className="header active">
                <div className="container d-flex align-items-center w-100">
                    <Link to="/" className="logo">
                        <i className="fas fa-mug-hot"></i> coffee
                    </Link>
                    <div className="account-page-actions">
                        <button type="button" className="link-btn account-top-btn" onClick={() => navigate(-1)}>
                            <i className="fas fa-arrow-left"></i>
                            <span>back</span>
                        </button>
                        <Link to="/" className="link-btn account-top-btn">
                            <i className="fas fa-house"></i>
                            <span>home</span>
                        </Link>
                    </div>
                </div>
            </header>
            <section className="account-page-shell">
                <div className="container">
                    <div className="account-card account-card-clean account-card-compact">
                        <div className="account-card-header">
                                <div className="account-card-topline">
                                    <div className="account-card-title">
                                        <span className="account-eyebrow">profile</span>
                                        <h3>{isEditing ? 'Update Account' : 'Account Overview'}</h3>
                                    </div>
                                    <div className="account-chip-group">
                                        <span className="account-info-chip">Personal account</span>
                                    </div>
                            </div>
                        </div>

                        <div className="account-card-body">
                            <div className="account-avatar-panel">
                                <span className="account-panel-badge">account</span>
                                <div className="account-avatar-frame">
                                    {avatarSource && previewAvailable ? (
                                        <img
                                            src={avatarSource}
                                            alt="Avatar preview"
                                            className="account-avatar-image"
                                            onLoad={() => setPreviewAvailable(true)}
                                            onError={() => setPreviewAvailable(false)}
                                        />
                                    ) : (
                                        <span className="account-avatar-fallback">{getInitials(displayName)}</span>
                                    )}
                                </div>
                                <div className="account-avatar-meta">
                                    <h4>{displayName}</h4>
                                    <p>{profile.email}</p>
                                    <div className="account-avatar-identity">
                                        <span><i className="fas fa-at"></i>{userHandle}</span>
                                    </div>
                                    {avatarSource && !previewAvailable && (
                                        <span className="account-avatar-hint">Preview failed. Choose another image.</span>
                                    )}
                                </div>
                            </div>

                            <div className="account-content-panel">
                                {!isEditing ? (
                                    <div className="account-mode-shell">
                                        <div className="account-form-header">
                                            <div>
                                                <h4>Your Information</h4>
                                            </div>
                                            <div className="account-email-pill">
                                                <strong title={profile.email}>{profile.email}</strong>
                                            </div>
                                        </div>

                                        {isLoading && (
                                            <div className="account-loading-state">
                                                <i className="fas fa-spinner fa-spin"></i>
                                                <span>Syncing latest account details...</span>
                                            </div>
                                        )}

                                        <div className="account-view-shell">
                                            <div className="account-section-stack">
                                            {detailSections.map(section => (
                                                <section key={section.title} className="account-section-block">
                                                    <div className="account-section-head">
                                                        <div>
                                                            <h5>{section.title}</h5>
                                                        </div>
                                                    </div>

                                                    <div className="account-details-grid">
                                                        {section.items.map(item => (
                                                            <div key={item.label} className={`account-detail-card${item.fullRow ? ' account-detail-card-wide' : ''}`}>
                                                                <div className="account-detail-icon">
                                                                    <i className={item.icon}></i>
                                                                </div>
                                                                <div className="account-detail-body">
                                                                    <span className="account-detail-label">{item.label}</span>
                                                                    <div
                                                                        className={`account-detail-value${item.truncate ? ' account-detail-value-truncate' : ''}`}
                                                                        title={item.truncate ? item.value : undefined}
                                                                    >
                                                                        {item.value}
                                                                    </div>
                                                                    {item.helper && <span className="account-detail-helper">{item.helper}</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </section>
                                            ))}
                                            </div>
                                        </div>

                                        <div className="account-action-row">
                                            <Link to="/" className="link-btn account-secondary-btn">
                                                <i className="fas fa-house"></i>
                                                <span>home</span>
                                            </Link>
                                            <Link to="/change-password" className="link-btn account-secondary-btn">
                                                <i className="fas fa-key"></i>
                                                <span>Change Password</span>
                                            </Link>
                                            <button type="button" className="link-btn account-primary-btn account-primary-btn-hover" onClick={handleStartEditing}>
                                                <i className="fas fa-pen"></i>
                                                <span>Update Profile</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <form className="account-mode-shell account-form" onSubmit={handleSubmit} noValidate>
                                        <div className="account-form-header">
                                            <div>
                                                <h4>Edit Profile</h4>
                                            </div>
                                            <div className="account-email-pill">
                                                <strong title={profile.username || profile.email}>{profile.username || profile.email}</strong>
                                            </div>
                                        </div>

                                        <div className="account-edit-shell">
                                            <section className="account-section-block account-section-block-form">
                                                <div className="account-section-head">
                                                    <div>
                                                        <h5>Editable details</h5>
                                                    </div>
                                                </div>

                                                <div className="account-form-grid">
                                                    <div className={`account-field ${fieldErrors.fullName ? 'has-error' : ''}`}>
                                                        <label className="account-field-label" htmlFor="account-full-name">Full Name</label>
                                                        <input id="account-full-name" type="text" name="fullName" className="box" value={formData.fullName} onChange={handleChange} />
                                                        {fieldErrors.fullName && <p className="field-error-text account-field-error">{fieldErrors.fullName}</p>}
                                                    </div>

                                                    <div className={`account-field ${fieldErrors.phone ? 'has-error' : ''}`}>
                                                        <label className="account-field-label" htmlFor="account-phone">Phone</label>
                                                        <input id="account-phone" type="tel" name="phone" className="box" value={formData.phone} onChange={handleChange} />
                                                        {fieldErrors.phone && <p className="field-error-text account-field-error">{fieldErrors.phone}</p>}
                                                    </div>

                                                    <div className={`account-field account-field-full ${fieldErrors.address ? 'has-error' : ''}`}>
                                                        <label className="account-field-label" htmlFor="account-address">Address</label>
                                                        <textarea id="account-address" name="address" className="box account-textarea" rows={3} value={formData.address} onChange={handleChange} />
                                                        {fieldErrors.address && <p className="field-error-text account-field-error">{fieldErrors.address}</p>}
                                                    </div>

                                                    <div className={`account-field ${fieldErrors.dateOfBirth ? 'has-error' : ''}`}>
                                                        <label className="account-field-label" htmlFor="account-date-of-birth">Date of Birth</label>
                                                        <input id="account-date-of-birth" type="date" name="dateOfBirth" className="box" value={formData.dateOfBirth} onChange={handleChange} />
                                                        {fieldErrors.dateOfBirth && <p className="field-error-text account-field-error">{fieldErrors.dateOfBirth}</p>}
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="account-section-block account-section-block-form">
                                                <div className="account-section-head">
                                                    <div>
                                                        <h5>Profile photo</h5>
                                                    </div>
                                                </div>

                                                <div className="account-form-grid">
                                                    <div className={`account-field account-field-full ${fieldErrors.avatarFile ? 'has-error' : ''}`}>
                                                <label className="account-field-label" htmlFor="account-avatar">Profile Photo</label>
                                                <input
                                                    id="account-avatar"
                                                    type="file"
                                                    name="avatarFile"
                                                    className="account-file-input"
                                                    accept="image/png,image/jpeg,image/gif,image/webp"
                                                    ref={avatarInputRef}
                                                    onChange={handleAvatarChange}
                                                />
                                                <label className={`account-upload-box ${fieldErrors.avatarFile ? 'has-error' : ''}`} htmlFor="account-avatar">
                                                    <span className="account-upload-icon">
                                                        <i className="fas fa-cloud-arrow-up"></i>
                                                    </span>
                                                    <div className="account-upload-copy">
                                                        <strong>{selectedAvatarFile ? 'New photo selected' : 'Choose a new profile photo'}</strong>
                                                        <span>
                                                            {selectedAvatarFile
                                                                ? `${selectedAvatarFile.name} • ${selectedAvatarSize}`
                                                                : 'PNG, JPG, GIF, or WEBP up to 5 MB.'}
                                                        </span>
                                                    </div>
                                                    <span className="account-upload-action">{selectedAvatarFile ? 'Replace' : 'Browse files'}</span>
                                                </label>
                                                        <div className="account-upload-meta">
                                                            {selectedAvatarFile ? (
                                                                <button type="button" className="account-upload-reset" onClick={clearSelectedAvatar}>
                                                                    Keep current photo instead
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                        {fieldErrors.avatarFile && <p className="field-error-text account-field-error">{fieldErrors.avatarFile}</p>}
                                                    </div>
                                                </div>
                                            </section>
                                        </div>

                                        <div className="account-action-row">
                                            <button type="button" className="link-btn account-secondary-btn" onClick={handleCancelEditing} disabled={isSaving}>
                                                <i className="fas fa-xmark"></i>
                                                <span>Cancel</span>
                                            </button>
                                            <button type="submit" className="link-btn account-primary-btn account-primary-btn-hover" disabled={isSaving}>
                                                <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
                                                <span>{isSaving ? 'saving...' : 'Save Changes'}</span>
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {message && (
                                    <div className={`form-feedback form-feedback-inline ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'} aria-live="polite">
                                        <i className={`fas ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
                                        <div className="form-feedback-copy">
                                            <span className="form-feedback-title">{message.text}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AccountPage;
