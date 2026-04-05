import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import { getLandingRouteForProfile } from '../lib/roleUtils';

type MessageState = {
    type: 'success' | 'error';
    text: string;
} | null;

type RegisterData = {
    username: string;
    email: string;
    password: string;
    fullName: string;
    phone: string;
};

type LoginResponse = {
    accessToken?: string;
    refreshToken?: string;
};

type RegisterOtpStep = 'email' | 'otp' | 'details';

interface LoginFormProps {
    isActive: boolean;
    onClose: () => void;
    onLoginSuccess: (email: string, accessToken: string, refreshToken?: string) => void;
    openForgotPanel: () => void;
    getErrorMessage: (error: unknown) => string;
    isValidEmail: (value: string) => boolean;
    API_BASE_URL: string;
}

const emptyRegisterData: RegisterData = {
    username: '',
    email: '',
    password: '',
    fullName: '',
    phone: ''
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
    permissions?: string[];
    updatedAt?: string;
};
const createEmptyProfile = (email = ''): AccountProfile => ({
    email,
    fullName: '',
    phone: '',
    avatarUrl: ''
});
const Login: React.FC<LoginFormProps> = ({
    isActive,
    onClose,
    onLoginSuccess,
    openForgotPanel,
    getErrorMessage,
    isValidEmail,
    API_BASE_URL: _API_BASE_URL
}) => {
    const navigate = useNavigate();
    const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
    const [updateData, setUpdateData] = useState<AccountProfile>(createEmptyProfile());
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [registerData, setRegisterData] = useState<RegisterData>(emptyRegisterData);
    const [loginMessage, setLoginMessage] = useState<MessageState>(null);
    const [registerMessage, setRegisterMessage] = useState<MessageState>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [registerStep, setRegisterStep] = useState<RegisterOtpStep>('email');
    const [registerOtpEmail, setRegisterOtpEmail] = useState('');
    const [registerOtp, setRegisterOtp] = useState('');
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

    const backToLoginFromRegister = () => {
        setIsRegisterOpen(false);
        setRegisterMessage(null);
        setRegisterStep('email');
        setRegisterOtpEmail('');
        setRegisterOtp('');
        setRegisterData(emptyRegisterData);
    };

    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLoginData((prev) => ({ ...prev, [name]: value }));
    };

    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setRegisterData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSendRegisterOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegisterMessage(null);

        const email = registerOtpEmail.trim();
        if (!email) {
            setRegisterMessage({ type: 'error', text: 'Enter email.' });
            return;
        }
        if (!isValidEmail(email)) {
            setRegisterMessage({ type: 'error', text: 'Enter a valid email.' });
            return;
        }

        setIsSendingOtp(true);
        try {
            await apiClient.post('/api/auth/register/request-otp', { email });
            setRegisterMessage({ type: 'success', text: 'OTP sent. Please check your email.' });
            setRegisterStep('otp');
        } catch (error) {
            setRegisterMessage({ type: 'error', text: getErrorMessage(error) });
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyRegisterOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegisterMessage(null);

        const email = registerOtpEmail.trim();
        const otp = registerOtp.trim();
        if (!email) {
            setRegisterMessage({ type: 'error', text: 'Enter email.' });
            return;
        }
        if (!isValidEmail(email)) {
            setRegisterMessage({ type: 'error', text: 'Enter a valid email.' });
            return;
        }
        if (!otp) {
            setRegisterMessage({ type: 'error', text: 'Enter OTP.' });
            return;
        }

        setIsVerifyingOtp(true);
        try {
            await apiClient.post('/api/auth/register/verify-otp', { email, otp });
            setRegisterOtp('');
            setRegisterMessage({ type: 'success', text: 'Email verified. Complete your profile below.' });
            setRegisterData((prev) => ({ ...prev, email }));
            setRegisterStep('details');
        } catch (error) {
            setRegisterMessage({ type: 'error', text: getErrorMessage(error) });
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginMessage(null);

        const email = loginData.email.trim();
        const password = loginData.password.trim();

        if (!email || !password) {
            setLoginMessage({ type: 'error', text: 'Enter email and password.' });
            return;
        }
        if (!isValidEmail(email)) {
            setLoginMessage({ type: 'error', text: 'Enter a valid email.' });
            return;
        }

        setIsLoggingIn(true);
        try {
            const response = await apiClient.post<LoginResponse>('/api/auth/login', { email, password });
            const { accessToken, refreshToken } = response.data;
            if (!accessToken) throw new Error('Login response did not contain an access token.');

            onLoginSuccess(email, accessToken, refreshToken);

            const profileRes = await apiClient.get('/api/accounts/me');
            const profile = profileRes.data?.data ?? profileRes.data;
           if (profile) {
                // Cập nhật State của Homepage ngay tại chỗ để giao diện đổi luôn
                setUpdateData(profile);
                setLoggedInUser(profile.email);

                console.log(profile.roles);
                
                if (profile.roles?.includes('CUSTOMER')) {
                    navigate('/');
                } else {
                    navigate('/admin');
                }
            }
            localStorage.setItem('accountProfile', JSON.stringify(profile));



            setLoginData({ email: '', password: '' });
        } catch (error) {
            setLoginMessage({ type: 'error', text: getErrorMessage(error) });
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegisterMessage(null);

        const payload: RegisterData = {
            username: registerData.username.trim(),
            email: registerData.email.trim(),
            password: registerData.password.trim(),
            fullName: registerData.fullName.trim(),
            phone: registerData.phone.trim()
        };

        if (!payload.username || !payload.email || !payload.password || !payload.fullName) {
            setRegisterMessage({ type: 'error', text: 'Please fill in all required fields.' });
            return;
        }
        if (!isValidEmail(payload.email)) {
            setRegisterMessage({ type: 'error', text: 'Enter a valid email.' });
            return;
        }
        if (payload.password.length < 6) {
            setRegisterMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }

        setIsRegistering(true);
        try {
            const response = await apiClient.post<LoginResponse>('/api/auth/register', payload);
            if (response.status === 201) {
                const { accessToken, refreshToken } = response.data;
                if (!accessToken) throw new Error('Registration response did not contain an access token.');

                onLoginSuccess(payload.email, accessToken, refreshToken);
                setRegisterData(emptyRegisterData);
                setIsRegisterOpen(false);
            }
        } catch (error) {
            setRegisterMessage({ type: 'error', text: getErrorMessage(error) });
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <div className={`login-form-container ${isActive ? 'active' : ''}`}>
            {!isRegisterOpen && (
                <form className="auth-login-card" onSubmit={handleLoginSubmit} noValidate>
                    <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close login">
                        <i className="fas fa-times"></i>
                    </button>

                    <div className="auth-login-top">
                        <span className="auth-login-badge">Welcome Back</span>
                        <h3>Sign In</h3>
                        <p>Access your account.</p>
                    </div>

                    {loginMessage && <p className={`auth-message ${loginMessage.type}`}>{loginMessage.text}</p>}

                    <div className="auth-login-fields">
                        <label className="auth-input-shell" htmlFor="login-email">
                            <i className="fas fa-envelope"></i>
                            <input
                                id="login-email"
                                type="email"
                                name="email"
                                placeholder="Email"
                                className="box"
                                value={loginData.email}
                                onChange={handleLoginChange}
                            />
                        </label>

                        <label className="auth-input-shell" htmlFor="login-password">
                            <i className="fas fa-lock"></i>
                            <input
                                id="login-password"
                                type="password"
                                name="password"
                                placeholder="Password"
                                className="box"
                                value={loginData.password}
                                onChange={handleLoginChange}
                            />
                        </label>
                    </div>

                    <button type="submit" className="link-btn auth-login-submit" disabled={isLoggingIn}>
                        <i className={`fas ${isLoggingIn ? 'fa-spinner fa-spin' : 'fa-arrow-right'}`}></i>
                        <span>{isLoggingIn ? 'Signing in...' : 'Sign in'}</span>
                    </button>

                    <button type="button" className="auth-text-btn auth-login-link" onClick={openForgotPanel}>
                        Forgot password
                    </button>

                    <button
                        type="button"
                        className="auth-text-btn auth-login-link"
                        onClick={() => {
                            setIsRegisterOpen(true);
                            setRegisterStep('email');
                            setRegisterOtpEmail('');
                            setRegisterOtp('');
                            setRegisterData(emptyRegisterData);
                            setRegisterMessage(null);
                        }}
                    >
                        Create an account
                    </button>
                </form>
            )}

            {isRegisterOpen && (
                <form
                    className="auth-login-card"
                    onSubmit={
                        registerStep === 'email'
                            ? handleSendRegisterOtp
                            : registerStep === 'otp'
                                ? handleVerifyRegisterOtp
                                : handleRegisterSubmit
                    }
                    noValidate
                >
                    <button
                        type="button"
                        className="auth-close-btn"
                        onClick={backToLoginFromRegister}
                        aria-label="Close register"
                    >
                        <i className="fas fa-times"></i>
                    </button>

                    <div className="auth-login-top">
                        <span className="auth-login-badge">Join Us</span>
                        <h3>Sign Up</h3>
                        <p>Create a new account.</p>
                    </div>

                    {registerMessage && <p className={`auth-message ${registerMessage.type}`}>{registerMessage.text}</p>}

                    <div className="auth-login-fields">
                        <label className="auth-input-shell" htmlFor="register-email">
                            <i className="fas fa-envelope"></i>
                            <input
                                id="register-email"
                                type="email"
                                name="email"
                                placeholder="Email"
                                className="box"
                                value={registerStep === 'details' ? registerData.email : registerOtpEmail}
                                onChange={(e) => {
                                    if (registerStep === 'details') return;
                                    setRegisterOtpEmail(e.target.value);
                                }}
                                disabled={registerStep === 'details'}
                            />
                        </label>

                        {registerStep === 'otp' && (
                            <label className="auth-input-shell" htmlFor="register-otp">
                                <i className="fas fa-shield-alt"></i>
                                <input
                                    id="register-otp"
                                    type="text"
                                    inputMode="numeric"
                                    name="otp"
                                    placeholder="Enter OTP"
                                    className="box"
                                    value={registerOtp}
                                    onChange={(e) => setRegisterOtp(e.target.value)}
                                />
                            </label>
                        )}

                        {registerStep === 'details' && (
                            <>
                                <label className="auth-input-shell" htmlFor="register-username">
                                    <i className="fas fa-user"></i>
                                    <input
                                        id="register-username"
                                        type="text"
                                        name="username"
                                        placeholder="Username"
                                        className="box"
                                        value={registerData.username}
                                        onChange={handleRegisterChange}
                                    />
                                </label>

                                <label className="auth-input-shell" htmlFor="register-fullName">
                                    <i className="fas fa-id-card"></i>
                                    <input
                                        id="register-fullName"
                                        type="text"
                                        name="fullName"
                                        placeholder="Full name"
                                        className="box"
                                        value={registerData.fullName}
                                        onChange={handleRegisterChange}
                                    />
                                </label>

                                <label className="auth-input-shell" htmlFor="register-password">
                                    <i className="fas fa-lock"></i>
                                    <input
                                        id="register-password"
                                        type="password"
                                        name="password"
                                        placeholder="Password"
                                        className="box"
                                        value={registerData.password}
                                        onChange={handleRegisterChange}
                                    />
                                </label>

                                <label className="auth-input-shell" htmlFor="register-phone">
                                    <i className="fas fa-phone"></i>
                                    <input
                                        id="register-phone"
                                        type="tel"
                                        name="phone"
                                        placeholder="Phone (optional)"
                                        className="box"
                                        value={registerData.phone}
                                        onChange={handleRegisterChange}
                                    />
                                </label>
                            </>
                        )}
                    </div>

                    {registerStep === 'email' && (
                        <>
                            <button
                                type="button"
                                className="auth-text-btn auth-login-link"
                                onClick={backToLoginFromRegister}
                                disabled={isSendingOtp}
                            >
                                Back to sign in
                            </button>
                            <button type="submit" className="link-btn auth-login-submit" disabled={isSendingOtp}>
                                <i className={`fas ${isSendingOtp ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                                <span>{isSendingOtp ? 'Sending OTP...' : 'Send OTP'}</span>
                            </button>
                        </>
                    )}

                    {registerStep === 'otp' && (
                        <>
                            <button
                                type="button"
                                className="auth-text-btn auth-login-link"
                                onClick={() => {
                                    setRegisterStep('email');
                                    setRegisterOtp('');
                                    setRegisterMessage(null);
                                }}
                                disabled={isVerifyingOtp}
                            >
                                Back
                            </button>
                            <button type="submit" className="link-btn auth-login-submit" disabled={isVerifyingOtp}>
                                <i className={`fas ${isVerifyingOtp ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                                <span>{isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}</span>
                            </button>
                            <button
                                type="button"
                                className="auth-text-btn auth-login-link"
                                onClick={() => setRegisterStep('email')}
                                disabled={isVerifyingOtp}
                            >
                                Change email
                            </button>
                            <button
                                type="button"
                                className="auth-text-btn auth-login-link"
                                onClick={() => {
                                    setRegisterOtp('');
                                    setRegisterMessage(null);
                                    void handleSendRegisterOtp({ preventDefault: () => { } } as React.FormEvent);
                                }}
                                disabled={isVerifyingOtp || isSendingOtp}
                            >
                                Resend OTP
                            </button>
                        </>
                    )}

                    {registerStep === 'details' && (
                        <>
                            <button
                                type="button"
                                className="auth-text-btn auth-login-link"
                                onClick={() => {
                                    setRegisterStep('otp');
                                    setRegisterMessage(null);
                                }}
                                disabled={isRegistering}
                            >
                                Back
                            </button>
                            <button type="submit" className="link-btn auth-login-submit" disabled={isRegistering}>
                                <i className={`fas ${isRegistering ? 'fa-spinner fa-spin' : 'fa-user-plus'}`}></i>
                                <span>{isRegistering ? 'Signing up...' : 'Sign up'}</span>
                            </button>
                        </>
                    )}
                </form>
            )}
        </div>
    );
};

export default Login;
