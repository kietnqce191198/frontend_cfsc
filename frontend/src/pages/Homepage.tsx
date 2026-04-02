import React, { useEffect, useRef, useState } from 'react';
import '../assets/style.css';
import axios from 'axios';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useNavigate } from 'react-router-dom';
import { dispatchSessionChanged } from '../lib/apiClient';
import { customerApi } from '../services/api';
import Login from "./Login.tsx";
import PromotionPublicSection from '../components/promotions/PromotionPublicSection';

type ActivePanel = 'login' | 'update' | 'forgot' | null;

type MessageState = {
    type: 'success' | 'error';
    text: string;
} | null;

export type LoginResponse = {
    accessToken?: string;
    refreshToken?: string;
    userId?: number;
};

type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
};

type AccountProfile = {
    id?: number;
    username?: string;
    email: string;
    fullName: string;
    phone: string;
    avatarUrl: string;
    status?: string;
    roles?: string[];
    updatedAt?: string;
};

const API_BASE_URL = 'http://localhost:8081';
const CUS_API_BASE_URL = 'http://localhost:8082';
/** Google Maps (or other) embed URL; leave empty to skip iframe (avoids React warning on src=""). */
const CONTACT_MAP_EMBED_URL = '';
const createEmptyProfile = (email = ''): AccountProfile => ({
    email,
    fullName: '',
    phone: '',
    avatarUrl: ''
});

/** Backend often sends null for optional strings; inputs must use "" not null (controlled components). */
const normalizeProfileForState = (
    profile: Partial<AccountProfile>,
    fallbackEmail = ''
): AccountProfile => {
    const email = profile.email || fallbackEmail || '';
    return {
        ...createEmptyProfile(email),
        ...profile,
        email,
        fullName: profile.fullName ?? '',
        phone: profile.phone ?? '',
        avatarUrl: profile.avatarUrl ?? ''
    };
};

const getErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;

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

        return error.message || 'Request failed.';
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'Unexpected error.';
};

const getDisplayName = (profile: AccountProfile, email?: string | null) => {
    const fullName = profile.fullName?.trim();
    if (fullName) {
        return fullName;
    }

    const username = profile.username?.trim();
    if (username) {
        return username;
    }

    if (email) {
        return email.split('@')[0];
    }

    if (profile.email) {
        return profile.email.split('@')[0];
    }

    return 'Account';
};

const getInitials = (value: string) => {
    const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (parts.length === 0) {
        return 'A';
    }

    return parts.map(part => part[0].toUpperCase()).join('');
};

const hasRole = (roles: string[] | undefined, ...expectedRoles: string[]) =>
    Array.isArray(roles) && roles.some(role => expectedRoles.includes(role));

const isAuthFailure = (error: unknown) =>
    axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403);

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidPhone = (value: string) => /^\+?[0-9]{9,15}$/.test(value);

const isValidHttpUrl = (value: string) => {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
};

const Homepage: React.FC = () => {
    const navigate = useNavigate();
    const [activePanel, setActivePanel] = useState<ActivePanel>(null);
    const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement | null>(null);

    const [loginData, setLoginData] = useState({
        email: '',
        password: ''
    });
    const [updateData, setUpdateData] = useState<AccountProfile>(createEmptyProfile());
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotFieldError, setForgotFieldError] = useState('');
    const [loginMessage, setLoginMessage] = useState<MessageState>(null);
    const [updateMessage, setUpdateMessage] = useState<MessageState>(null);
    const [forgotMessage, setForgotMessage] = useState<MessageState>(null);
    const [appNotice, setAppNotice] = useState<MessageState>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
    const [isRequestingReset, setIsRequestingReset] = useState(false);
    const [isHomepageAvatarBroken, setIsHomepageAvatarBroken] = useState(false);

    const showAppNotice = (type: 'success' | 'error', text: string) => {
        setAppNotice({ type, text });
    };

    const clearClientSession = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('email');
        localStorage.removeItem('accountProfile');
        localStorage.removeItem('username');
        setLoggedInUser(null);
        setUpdateData(createEmptyProfile());
        setForgotEmail('');
        setIsUserMenuOpen(false);
    };

    const persistProfile = (profile: AccountProfile, fallbackEmail?: string | null) => {
        const normalizedProfile = normalizeProfileForState(profile, fallbackEmail || '');

        localStorage.setItem('accountProfile', JSON.stringify(normalizedProfile));

        if (normalizedProfile.email) {
            localStorage.setItem('email', normalizedProfile.email);
        }

        setUpdateData(normalizedProfile);
        setLoggedInUser(normalizedProfile.email || null);
        setForgotEmail(normalizedProfile.email || '');

        return normalizedProfile;
    };

    const refreshAccessToken = async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            throw new Error('Session expired. Please log in again.');
        }

        const response = await axios.post<LoginResponse>(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken
        });

        const nextAccessToken = response.data.accessToken;
        if (!nextAccessToken) {
            throw new Error('Unable to refresh session. Please log in again.');
        }

        localStorage.setItem('accessToken', nextAccessToken);

        if (response.data.refreshToken) {
            localStorage.setItem('refreshToken', response.data.refreshToken);
        }

        return nextAccessToken;
    };

    const fetchAccountProfile = async (token: string) =>
        axios.get<ApiResponse<AccountProfile>>(`${API_BASE_URL}/api/accounts/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

    const syncProfileWithServer = async (tokenOverride?: string, fallbackEmail?: string | null) => {
        let token = tokenOverride || localStorage.getItem('accessToken');
        if (!token) {
            return null;
        }

        try {
            const response = await fetchAccountProfile(token);
            return persistProfile(response.data.data, fallbackEmail);
        } catch (error) {
            if (!isAuthFailure(error)) {
                throw error;
            }

            token = await refreshAccessToken();
            const response = await fetchAccountProfile(token);
            return persistProfile(response.data.data, fallbackEmail);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        const savedEmail = localStorage.getItem('email');
        const savedProfile = localStorage.getItem('accountProfile');

        if (savedEmail) {
            setLoggedInUser(savedEmail);
            setLoginData(prev => ({ ...prev, email: savedEmail }));
            setForgotEmail(savedEmail);
            setUpdateData(createEmptyProfile(savedEmail));
        }

        if (!savedProfile) {
            return;
        }

        try {
            const parsedProfile = JSON.parse(savedProfile) as AccountProfile;
            const email = parsedProfile.email || savedEmail || '';

            setUpdateData(normalizeProfileForState(parsedProfile, email));
        } catch (restoreError) {
            console.error('Unable to restore account profile from localStorage.', restoreError);
        }

        if (!token) {
            return;
        }

        syncProfileWithServer(token, savedEmail).catch((error) => {
            const errorMessage = getErrorMessage(error);
            if (isAuthFailure(error) || /refresh session|log in again|expired token/i.test(errorMessage)) {
                clearClientSession();
                return;
            }

            console.error('Unable to sync account profile from backend.', error);
        });
    }, []);

    useEffect(() => {
        setIsHomepageAvatarBroken(false);
    }, [updateData.avatarUrl]);

    useEffect(() => {
        if (!appNotice) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setAppNotice(null);
        }, 2800);

        return () => window.clearTimeout(timeoutId);
    }, [appNotice]);

    useEffect(() => {
        if (!isUserMenuOpen) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isUserMenuOpen]);

    const closePanels = () => {
        setActivePanel(null);
        setLoginMessage(null);
        setUpdateMessage(null);
        setForgotMessage(null);
        setIsUserMenuOpen(false);
    };

    const openLoginPanel = () => {
        setLoginMessage(null);
        setActivePanel('login');
    };

    const openUpdatePanel = () => {
        if (!loggedInUser) {
            return;
        }

        setIsUserMenuOpen(false);
        navigate('/account');
    };

    const openCustomerProfile = async () => {
        const userId = updateData.id;

        if (!loggedInUser || !userId) {
            showAppNotice('error', 'Customer profile is unavailable right now.');
            return;
        }

        setIsUserMenuOpen(false);

        try {
            const response = await customerApi.getCustomerByUserId(userId);
            const customerId = response.data?.data?.customerId || response.data?.customerId;

            if (!customerId) {
                throw new Error('Customer profile not found.');
            }

            navigate(`/customers/${customerId}`);
        } catch (error) {
            showAppNotice('error', getErrorMessage(error));
        }
    };

    const openViewOrderHistory = () => {
        if (!loggedInUser) {
            return;
        }

        setIsUserMenuOpen(false);
        navigate('/order-history');
    }

    const toggleUserMenu = () => {
        setIsUserMenuOpen(prev => !prev);
    };

    const openForgotPanel = () => {
        const email = loggedInUser || loginData.email || forgotEmail;

        setForgotMessage(null);
        setForgotFieldError('');
        setForgotEmail(email);
        setActivePanel('forgot');
    };

    const displayName = getDisplayName(updateData, loggedInUser);
    const avatarInitials = getInitials(displayName);
    const isCustomerAccount = hasRole(updateData.roles, 'ROLE_CUSTOMER', 'CUSTOMER');
    const canAccessAdminPanel = hasRole(
        updateData.roles,
        'ROLE_ADMIN',
        'MANAGER',
        'ROLE_MANAGER',
        'ADMIN'
    );

    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLoginData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUpdateData(prev => ({ ...prev, [name]: value }));
    };

    const handleForgotEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setForgotEmail(value);
        setForgotFieldError('');

        if (forgotMessage?.type === 'error') {
            setForgotMessage(null);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginMessage(null);

        const email = loginData.email.trim();
        const password = loginData.password.trim();

        if (!email || !password) {
            setLoginMessage({
                type: 'error',
                text: 'Enter email and password.'
            });
            return;
        }

        if (!isValidEmail(email)) {
            setLoginMessage({
                type: 'error',
                text: 'Enter a valid email.'
            });
            return;
        }

        setIsLoggingIn(true);

        try {
            const response = await axios.post<LoginResponse>(`${API_BASE_URL}/api/auth/login`, loginData);

            if (response.status === 200) {

                const { accessToken } = response.data;

                if (!accessToken) {
                    throw new Error('Login response did not contain an access token.');
                }

                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('email', loginData.email);

                console.log(accessToken)
                persistProfile(createEmptyProfile(loginData.email), loginData.email);


                if (response.data.refreshToken) {
                    localStorage.setItem('refreshToken', response.data.refreshToken);
                }
                localStorage.removeItem('username');

                setLoggedInUser(loginData.email); // Cập nhật giao diện
                try {

                    const profile = await syncProfileWithServer(accessToken, loginData.email);

                    //check role để redirect
                    if (profile?.roles?.includes('CUSTOMER')) {
                        navigate('/'); // ở lại homepage
                    } else {
                        navigate('/admin'); // sang dashboard
                    }
                } catch (syncError) {
                    console.error('Unable to sync profile after login.', syncError);
                }
                setLoginData(prev => ({ ...prev, password: '' }));
                closePanels();
                localStorage.removeItem('username');
                showAppNotice('success', 'Signed in.');

                try {
                    const savedProfile = localStorage.getItem('accountProfile');
                    console.log(savedProfile)
                    let userId = null;

                    if (savedProfile) {
                        const profile = JSON.parse(savedProfile);
                        console.log("Toàn bộ profile nè đại ca:", profile);
                        userId = profile.id;
                    }

                    const token = localStorage.getItem('accessToken');
                    if (!token) return;
                    const payload = JSON.parse(atob(token.split(".")[1]));
                    const customerResp = await customerApi.getByUserId(payload.userId);
                    // Lưu lại dùng cho trang Order History
                    
                    const customerId = customerResp?.id || customerResp?.data?.id;
                    console.log("customerID: " + customerId);
                    localStorage.setItem('customerId', customerId);
                } catch (e) {
                    console.log("Không tìm thấy thông tin Customer tương ứng với User này");
                }
                console.log('Homepage: Login successful, dispatching session changed event');
                dispatchSessionChanged();
            }
        } catch (error) {
            setLoginMessage({
                type: 'error',
                text: getErrorMessage(error)
            });
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleUpdateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdateMessage(null);

        const fullName = updateData.fullName.trim();
        const phone = updateData.phone.trim();
        const avatarUrl = updateData.avatarUrl.trim();

        if (!fullName) {
            setUpdateMessage({
                type: 'error',
                text: 'Enter your name.'
            });
            return;
        }

        if (!phone) {
            setUpdateMessage({
                type: 'error',
                text: 'Enter your phone.'
            });
            return;
        }

        if (!isValidPhone(phone)) {
            setUpdateMessage({
                type: 'error',
                text: 'Enter a valid phone number.'
            });
            return;
        }

        if (!avatarUrl) {
            setUpdateMessage({
                type: 'error',
                text: 'Enter an avatar URL.'
            });
            return;
        }

        if (!isValidHttpUrl(avatarUrl)) {
            setUpdateMessage({
                type: 'error',
                text: 'Enter a valid image URL.'
            });
            return;
        }

        setIsUpdatingAccount(true);

        const token = localStorage.getItem('accessToken');
        if (!token) {
            setUpdateMessage({
                type: 'error',
                text: 'Please log in before updating your account.'
            });
            setIsUpdatingAccount(false);
            return;
        }

        try {
            const response = await axios.put<ApiResponse<AccountProfile>>(
                `${API_BASE_URL}/api/accounts/me`,
                {
                    fullName: updateData.fullName,
                    phone: updateData.phone,
                    avatarUrl: updateData.avatarUrl
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const returnedProfile = response.data.data;
            const normalizedProfile = persistProfile(
                returnedProfile,
                returnedProfile.email || loggedInUser || updateData.email
            );
            setLoggedInUser(normalizedProfile.email);
            setUpdateMessage({
                type: 'success',
                text: response.data.message || 'Account updated successfully.'
            });
        } catch (error) {
            setUpdateMessage({
                type: 'error',
                text: getErrorMessage(error)
            });
        } finally {
            setIsUpdatingAccount(false);
        }
    };

    const handleForgotPasswordRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotMessage(null);
        setForgotFieldError('');

        const email = forgotEmail.trim();
        if (!email) {
            setForgotFieldError('Enter your email.');
            return;
        }

        if (!isValidEmail(email)) {
            setForgotFieldError('Enter a valid email.');
            return;
        }

        setIsRequestingReset(true);

        try {
            const response = await axios.post<ApiResponse<null>>(
                `${API_BASE_URL}/api/accounts/forgot-password/request`,
                { email }
            );

            setForgotMessage({
                type: 'success',
                text: response.data.message || 'If the email exists, a reset link has been sent.'
            });
        } catch (error) {
            setForgotMessage({
                type: 'error',
                text: getErrorMessage(error)
            });
        } finally {
            setIsRequestingReset(false);
        }
    };

    const handleLogout = async () => {
        setIsUserMenuOpen(false);
        // 1. Lấy token từ localStorage ra để gửi đi
        const token = localStorage.getItem('accessToken');

        if (token) {
            try {
                // 2. Gửi request POST lên BE để blacklist token này

                await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
                    headers: {
                        'Authorization': `Bearer ${token}` // Gửi token theo định dạng Bearer
                    }
                });
            } catch (error) {
                console.error("Lỗi khi gọi API logout ở BE:", error);

            }
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('email');
        localStorage.removeItem('accountProfile');
        localStorage.removeItem('username');
        localStorage.removeItem('customerId');
        setLoggedInUser(null);
        setUpdateData(createEmptyProfile());
        setLoginData(prev => ({ ...prev, password: '' }));
        setForgotEmail('');
        closePanels();

        showAppNotice('success', 'Signed out.');
        dispatchSessionChanged();
    };

    const handleCartClick = () => {
        if (!loggedInUser) {
            // Nếu chưa đăng nhập, thông báo và mở panel login
            showAppNotice('error', 'Vui lòng đăng nhập để xem giỏ hàng!');
            openLoginPanel();
        } else {
            // Nếu đã đăng nhập, điều hướng sang trang cart
            navigate('/cart');
        }
    };
    return (
        <>
            <div className={`app-toast ${appNotice ? `show ${appNotice.type}` : ''}`}>
                {appNotice && (
                    <>
                        <i className={`fas ${appNotice.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
                        <span>{appNotice.text}</span>
                    </>
                )}
            </div>

            <header className="header fixed-top">
                <div className="container d-flex align-items-center w-100">

                    {/* 1. Logo */}
                    <a href="#" className="logo"> <i className="fas fa-mug-hot"></i> coffee </a>

                    <nav className="navbar d-flex align-items-center ms-auto">
                        <a href="#home">home</a>
                        <a href="#promotions">promotions</a>
                        <a href="#about">about</a>
                        <a href="#menu">menu</a>
                        <a href="#gallery">gallery</a>
                        <a href="#reviews">reviews</a>
                        <a href="#contact">contact</a>
                        <a href="#blogs">blogs</a>
                    </nav>
                    <div className="icons d-flex align-items-center ms-4">
                        <div id="menu-btn" className="fas fa-bars"></div>
                        <div
                            className="fas fa-shopping-cart"
                            onClick={handleCartClick}
                            style={{ cursor: 'pointer', marginRight: '1.5rem' }}
                        ></div>
                        {loggedInUser ? (
                            <div
                                className={`user-menu-container ${isUserMenuOpen ? 'open' : ''}`}
                                ref={userMenuRef}
                            >
                                <button
                                    type="button"
                                    className="user-profile-trigger"
                                    onClick={toggleUserMenu}
                                    aria-haspopup="menu"
                                    aria-expanded={isUserMenuOpen}
                                >
                                    {updateData.avatarUrl && !isHomepageAvatarBroken ? (
                                        <img
                                            src={updateData.avatarUrl}
                                            alt={displayName}
                                            className="user-avatar"
                                            onLoad={() => setIsHomepageAvatarBroken(false)}
                                            onError={() => setIsHomepageAvatarBroken(true)}
                                        />
                                    ) : (
                                        <span className="user-avatar-placeholder">{avatarInitials}</span>
                                    )}
                                    <span className="user-profile-text">
                                        <strong>{displayName}</strong>
                                        <small>My account</small>
                                    </span>
                                    <i className="fas fa-chevron-down user-profile-caret"></i>
                                </button>
                                <div className="user-dropdown" role="menu">

                                    {canAccessAdminPanel && (
                                        <button type="button" onClick={() => navigate('/admin')}>
                                            Admin Panel
                                        </button>
                                    )}

                                    {isCustomerAccount ? (
                                        <>
                                            <button type="button" onClick={openCustomerProfile}>
                                                Customer Profile
                                            </button>
                                            <button type="button" onClick={openViewOrderHistory}>
                                                View Order History
                                            </button>
                                        </>
                                    ) : (
                                        <button type="button" onClick={openUpdatePanel}>
                                            View Profile
                                        </button>
                                    )}

                                    <button type="button" onClick={() => navigate('/loyalty')}>
                                        Loyalty
                                    </button>

                                    <button type="button" onClick={handleLogout}>
                                        Logout
                                    </button>

                                </div>
                            </div>
                        ) : (
                            <div id="login-btn" className="fas fa-user" onClick={openLoginPanel}></div>
                        )}
                    </div>
                </div>
            </header>



            {/* login form ends */}
            <Login
                isActive={activePanel === 'login'}
                onClose={closePanels}
                onLoginSuccess={(email, accessToken, refreshToken) => {
                    localStorage.setItem('accessToken', accessToken);
                    if (refreshToken) {
                        localStorage.setItem('refreshToken', refreshToken);
                    }
                    localStorage.setItem('email', email);
                    setLoggedInUser(email);
                    closePanels();
                }}
                openForgotPanel={openForgotPanel}
                getErrorMessage={getErrorMessage}
                isValidEmail={isValidEmail}
                API_BASE_URL={API_BASE_URL}
            />
            <div className={`login-form-container ${activePanel === 'update' ? 'active' : ''}`}>
                <div id="close-login-btn" className="fas fa-times" onClick={closePanels}></div>

                <form onSubmit={handleUpdateAccount} noValidate>
                    <h3>update account</h3>

                    {updateMessage && (
                        <p className={`auth-message ${updateMessage.type}`}>{updateMessage.text}</p>
                    )}

                    <input
                        type="email"
                        value={updateData.email ?? ''}
                        className="box auth-readonly-box"
                        readOnly
                    />

                    <input
                        type="text"
                        name="fullName"
                        placeholder="your full name"
                        className="box"
                        value={updateData.fullName ?? ''}
                        onChange={handleUpdateChange}
                    />

                    <input
                        type="tel"
                        name="phone"
                        placeholder="your phone"
                        className="box"
                        value={updateData.phone ?? ''}
                        onChange={handleUpdateChange}
                    />

                    <input
                        type="url"
                        name="avatarUrl"
                        placeholder="your avatar url"
                        className="box"
                        value={updateData.avatarUrl ?? ''}
                        onChange={handleUpdateChange}
                    />

                    {updateData.avatarUrl && (
                        <img
                            src={updateData.avatarUrl}
                            alt="Avatar preview"
                            className="auth-avatar-preview"
                            onError={(event) => {
                                event.currentTarget.style.display = 'none';
                            }}
                            onLoad={(event) => {
                                event.currentTarget.style.display = 'block';
                            }}
                        />
                    )}

                    <button type="submit" className="link-btn" disabled={isUpdatingAccount}>
                        {isUpdatingAccount ? 'saving...' : 'save changes'}
                    </button>
                </form>
            </div>
            <div className={`login-form-container ${activePanel === 'forgot' ? 'active' : ''}`}>
                <form className="auth-login-card auth-forgot-card" onSubmit={handleForgotPasswordRequest} noValidate>
                    <button
                        type="button"
                        className="auth-close-btn"
                        onClick={closePanels}
                        aria-label="Close forgot password"
                    >
                        <i className="fas fa-times"></i>
                    </button>

                    <div className="auth-login-top">
                        <span className="auth-login-badge">recovery</span>
                        <h3>Forgot Password</h3>
                        <p>We will send you a reset link.</p>
                    </div>

                    {forgotMessage && (
                        <p className={`auth-message ${forgotMessage.type}`}>{forgotMessage.text}</p>
                    )}

                    <div className="auth-login-fields">
                        <label
                            className={`auth-input-shell ${forgotFieldError ? 'has-error' : ''}`}
                            htmlFor="forgot-email"
                        >
                            <i className="fas fa-envelope"></i>
                            <input
                                id="forgot-email"
                                type="email"
                                placeholder="Email"
                                className="box"
                                value={forgotEmail}
                                onChange={handleForgotEmailChange}
                                aria-invalid={Boolean(forgotFieldError)}
                                aria-describedby={forgotFieldError ? 'forgot-email-error' : undefined}
                            />
                        </label>
                        {forgotFieldError && (
                            <p id="forgot-email-error" className="field-error-text auth-field-error">
                                {forgotFieldError}
                            </p>
                        )}
                    </div>

                    <button type="submit" className="link-btn auth-login-submit" disabled={isRequestingReset}>
                        <i className={`fas ${isRequestingReset ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                        <span>{isRequestingReset ? 'Sending...' : 'Send reset link'}</span>
                    </button>

                    <button type="button" className="auth-text-btn auth-login-link" onClick={openLoginPanel}>
                        Back to sign in
                    </button>
                </form>
            </div>
            {/* header section ends    */}

            {/* home section starts  */}

            <section className="home" id="home">

                <div className="container">

                    <div className="row align-items-center text-center text-md-left min-vh-100">
                        <div className="col-md-6">
                            <span>coffee house</span>
                            <h3>start your day with our coffee</h3>
                            <a href="#" className="link-btn">get started</a>
                        </div>
                    </div>

                </div>

            </section>

            {/* home section ends */}

            <PromotionPublicSection />

            {/* about section starts  */}

            <section className="about" id="about">

                <div className="container">

                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <img src="images/about-img-1.png" className="w-100" alt="" />
                        </div>
                        <div className="col-md-6">
                            <span>why choose us?</span>
                            <h3 className="title">the best coffee maker in the town</h3>
                            <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Omnis dolorem laborum itaque. Perspiciatis in veniam illum deserunt, quos animi maiores nisi officiis amet accusantium soluta a, excepturi vero obcaecati nobis.</p>
                            <a href="#" className="link-btn">read more</a>
                            <div className="icons-container">
                                <div className="icons">
                                    <i className="fas fa-coffee"></i>
                                    <h3>best coffee</h3>
                                </div>
                                <div className="icons">
                                    <i className="fas fa-shipping-fast"></i>
                                    <h3>free delivery</h3>
                                </div>
                                <div className="icons">
                                    <i className="fas fa-headset"></i>
                                    <h3>24/7 service</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </section>

            {/* about section ends */}

            {/* menu section starts  */}

            <section className="menu" id="menu">

                <h1 className="heading"> our menu </h1>

                <div className="container box-container">

                    <div className="box">
                        <img src="images/menu-1.png" alt="" />
                        <h3>coffee bean</h3>
                        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Possimus, eos.</p>
                        <a href="#" className="link-btn">read more</a>
                    </div>

                    <div className="box">
                        <img src="images/menu-2.png" alt="" />
                        <h3>coffee bean</h3>
                        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Possimus, eos.</p>
                        <a href="#" className="link-btn">read more</a>
                    </div>

                    <div className="box">
                        <img src="images/menu-3.png" alt="" />
                        <h3>coffee bean</h3>
                        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Possimus, eos.</p>
                        <a href="#" className="link-btn">read more</a>
                    </div>

                    <div className="box">
                        <img src="images/menu-4.png" alt="" />
                        <h3>coffee bean</h3>
                        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Possimus, eos.</p>
                        <a href="#" className="link-btn">read more</a>
                    </div>

                    <div className="box">
                        <img src="images/menu-5.png" alt="" />
                        <h3>coffee bean</h3>
                        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Possimus, eos.</p>
                        <a href="#" className="link-btn">read more</a>
                    </div>

                    <div className="box">
                        <img src="images/menu-6.png" alt="" />
                        <h3>coffee bean</h3>
                        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Possimus, eos.</p>
                        <a href="#" className="link-btn">read more</a>
                    </div>

                </div>

            </section>

            {/* menu section ends */}

            {/* gallery section starts  */}

            <section className="gallery" id="gallery">

                <h1 className="heading"> our gallery </h1>

                <div className="box-container container">

                    <div className="box">
                        <img src="images/g-img-1.jpg" alt="" />
                        <div className="content">
                            <h3>morning coffee</h3>
                            <p>Lorem ipsum dolor sit amet consectetur, adipisicing elit. Temporibus, dolore?</p>
                            <a href="#" className="link-btn">read more</a>
                        </div>
                    </div>

                    <div className="box">
                        <img src="images/g-img-2.jpg" alt="" />
                        <div className="content">
                            <h3>morning coffee</h3>
                            <p>Lorem ipsum dolor sit amet consectetur, adipisicing elit. Temporibus, dolore?</p>
                            <a href="#" className="link-btn">read more</a>
                        </div>
                    </div>

                    <div className="box">
                        <img src="images/g-img-3.jpg" alt="" />
                        <div className="content">
                            <h3>morning coffee</h3>
                            <p>Lorem ipsum dolor sit amet consectetur, adipisicing elit. Temporibus, dolore?</p>
                            <a href="#" className="link-btn">read more</a>
                        </div>
                    </div>

                    <div className="box">
                        <img src="images/g-img-4.jpg" alt="" />
                        <div className="content">
                            <h3>morning coffee</h3>
                            <p>Lorem ipsum dolor sit amet consectetur, adipisicing elit. Temporibus, dolore?</p>
                            <a href="#" className="link-btn">read more</a>
                        </div>
                    </div>

                    <div className="box">
                        <img src="images/g-img-5.jpg" alt="" />
                        <div className="content">
                            <h3>morning coffee</h3>
                            <p>Lorem ipsum dolor sit amet consectetur, adipisicing elit. Temporibus, dolore?</p>
                            <a href="#" className="link-btn">read more</a>
                        </div>
                    </div>

                    <div className="box">
                        <img src="images/g-img-6.jpg" alt="" />
                        <div className="content">
                            <h3>morning coffee</h3>
                            <p>Lorem ipsum dolor sit amet consectetur, adipisicing elit. Temporibus, dolore?</p>
                            <a href="#" className="link-btn">read more</a>
                        </div>
                    </div>

                </div>

            </section>

            {/* gallery section ends */}

            {/* reviews section starts  */}

            <section className="reviews" id="reviews">

                <h1 className="heading">customers reviews</h1>

                <div className="box-container container">

                    <div className="box">
                        <img src="images/pic-1.png" alt="" />
                        <h3>Dennis Nziokiss</h3>
                        <p>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Suscipit, ipsum eos? Perspiciatis expedita laudantium blanditiis cupiditate at natus, quam alias?</p>
                        <div className="stars">
                            <i className="fas fa-star"></i>
                            <i className="fas fa-star"></i>
                            <i className="fas fa-star"></i>
                            <i className="fas fa-star"></i>
                            <i className="fas fa-star-half-alt"></i>
                        </div>
                    </div>

                    <div className="box">
                        <img src="images/pic-2.png" alt="" />
                        <h3>Dennis Nzioki</h3>
                        <p>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Suscipit, ipsum eos? Perspiciatis expedita laudantium blanditiis cupiditate at natus, quam alias?</p>
                        <div className="stars">
                            <i className="fas fa-star"></i>
                            <i className="fas fa-star"></i>
                            <i className="fas fa-star"></i>
                            <i className="fas fa-star"></i>
                            <i className="fas fa-star-half-alt"></i>
                        </div>
                    </div>

                    <div className="box">
                        <img src="images/pic-3.png" alt="" />
                        <h3>Dennis Nzioki</h3>
                        <p>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Suscipit, ipsum eos? Perspiciatis expedita laudantium blanditiis cupiditate at natus, quam alias?</p>
                        <div className="stars">
                            <i className="fas fa-star"></i>
                            <i className="fas fa-star"></i>
                            <i className="fas fa-star"></i>
                            <i className="fas fa-star"></i>
                            <i className="fas fa-star-half-alt"></i>
                        </div>
                    </div>

                </div>

            </section>

            {/* reviews section ends */}

            {/* contact section starts  */}

            <section className="contact" id="contact">

                <h1 className="heading"> contact us  </h1>

                <div className="container">

                    <div className="contact-info-container">

                        <div className="box">
                            <i className="fas fa-phone"></i>
                            <h3>phone</h3>
                            <p>+123-456-7890</p>
                            <p>+111-222-3333</p>
                        </div>

                        <div className="box">
                            <i className="fas fa-envelope"></i>
                            <h3>email</h3>
                            <p>minemail@gmail.com</p>
                            <p>yourmail@gmail.com</p>
                        </div>

                        <div className="box">
                            <i className="fas fa-map"></i>
                            <h3>address</h3>
                            <p>Nairobi , Kenya - 400104</p>
                        </div>

                    </div>

                    <div className="row align-items-center">

                        <div className="col-md-6 mb-5 mb-md-0 ">
                            {CONTACT_MAP_EMBED_URL ? (
                                <iframe
                                    className="map w-100"
                                    src={CONTACT_MAP_EMBED_URL}
                                    width={600}
                                    height={450}
                                    style={{ border: 0 }}
                                    allowFullScreen={true}
                                    loading="lazy"
                                    title="Map"
                                />
                            ) : (
                                <div
                                    className="map w-100 bg-light"
                                    style={{ minHeight: 450, border: 0 }}
                                    role="presentation"
                                    aria-hidden
                                />
                            )}
                        </div>

                        <form action="" className="col-md-6">
                            <h3>get in touch</h3>
                            <input type="text" placeholder="your name" className="box" />
                            <input type="email" placeholder="email" className="box" />
                            <input type="number" placeholder="phone" className="box" />
                            <textarea name="" placeholder="message" className="box" id="" cols={30} rows={10}></textarea>
                            <input type="submit" value="send message" className="link-btn" />
                        </form>

                    </div>
                </div>


            </section >

            {/* contact section ends */}

            {/* blogs section starts  */}

            <section className="blogs" id="blogs">

                <h1 className="heading"> our daily posts </h1>

                <div className="box-container container">

                    <div className="box">
                        <div className="image">
                            <img src="images/g-img-1.jpg" alt="" />
                        </div>
                        <div className="content">
                            <h3>blog title goes here.</h3>
                            <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio, illum?</p>
                            <a href="#" className="link-btn">read more</a>
                        </div>
                        <div className="icons">
                            <span> <i className="fas fa-calendar"></i> 21st may, 2023 </span>
                            <span> <i className="fas fa-user"></i> by admin </span>
                        </div>
                    </div>

                    <div className="box">
                        <div className="image">
                            <img src="images/g-img-2.jpg" alt="" />
                        </div>
                        <div className="content">
                            <h3>blog title goes here.</h3>
                            <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio, illum?</p>
                            <a href="#" className="link-btn">read more</a>
                        </div>
                        <div className="icons">
                            <span> <i className="fas fa-calendar"></i> 21st may, 2023 </span>
                            <span> <i className="fas fa-user"></i> by admin </span>
                        </div>
                    </div>

                    <div className="box">
                        <div className="image">
                            <img src="images/g-img-3.jpg" alt="" />
                        </div>
                        <div className="content">
                            <h3>blog title goes here.</h3>
                            <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio, illum?</p>
                            <a href="#" className="link-btn">read more</a>
                        </div>
                        <div className="icons">
                            <span> <i className="fas fa-calendar"></i> 21st may, 2023 </span>
                            <span> <i className="fas fa-user"></i> by admin </span>
                        </div>
                    </div>

                </div>

            </section>

            {/* blogs section ends */}

            {/* newsletter section starts  */}

            <section className="newsletter">
                <div className="container">
                    <h3>newsletter</h3>
                    <p>subscribe for latest upadates</p>
                    <form action="">
                        <input type="email" name="" placeholder="enter your email" id="" className="email" />
                        <input type="submit" value="subscribe" className="link-btn" />
                    </form>
                </div>
            </section>

            {/* newsletter section ends */}

            {/* footer section starts  */}

            <section className="footer container">

                <a href="https://dennisnzioki.com/" className="logo"> <i className="fas fa-mug-hot"></i> coffee </a>

                <p className="credit"> created by <span>DNX EMPIRE</span> | all rights reserved! </p>

                <div className="share">
                    <a href="https://dennisnzioki.com/" className="fab fa-facebook-f"></a>
                    <a href="https://dennisnzioki.com/" className="fab fa-linkedin"></a>
                    <a href="https://dennisnzioki.com/" className="fab fa-twitter"></a>
                    <a href="https://dennisnzioki.com/" className="fab fa-github"></a>
                </div>

            </section>

            {/* footer section ends */}

        </>
    );
};

export default Homepage;
