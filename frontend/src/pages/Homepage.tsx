import React, { useEffect, useRef, useState } from 'react';
import '../assets/style.css';
import '../assets/homepage-refresh.css';
import axios from 'axios';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useNavigate } from 'react-router-dom';
import { dispatchSessionChanged } from '../lib/apiClient';
import { canAccessAdminWorkspace, getLandingRouteForProfile, isCustomerRoleSet } from '../lib/roleUtils';
import { customerApi } from '../services/api';
import Login from "./Login.tsx";
import PromotionPublicSection from '../components/promotions/PromotionPublicSection';
import ProductSection from '../components/ProductSection';
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
    permissions?: string[];
    updatedAt?: string;
};

const API_BASE_URL = import.meta.env.VITE_API_AUTH || '/api-auth';
const CUS_API_BASE_URL = import.meta.env.VITE_API_CUSTOMER || '/api-customer';

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
        avatarUrl: profile.avatarUrl ?? '',
        permissions: Array.isArray(profile.permissions) ? profile.permissions : [],
        roles: Array.isArray(profile.roles) ? profile.roles : []
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

const STOREFRONT_BRAND = {
    name: 'CoffeePulse',
    label: 'Coffee supply chain',
    heroKicker: 'Slow mornings. Bold pours. Better coffee rituals.',
    heroTitle: 'Brewed for the city days that deserve more than average coffee.',
    heroDescription:
        'Small-batch espresso, bakery-fresh pastries, and polished pickup for customers who want a storefront that feels premium from the first scroll.',
    primaryCtaLabel: 'Explore Menu',
    secondaryCtaLabel: 'See Offers'
};

const NAV_LINKS = [
    { href: '#home', label: 'Home' },
    { href: '#promotions', label: 'Offers' },
    { href: '#about', label: 'Story' },
    { href: '#menu', label: 'Menu' },
    { href: '#gallery', label: 'Gallery' },
    { href: '#reviews', label: 'Reviews' },
    { href: '#contact', label: 'Contact' },
    { href: '#blogs', label: 'Journal' }
];

const HOME_HIGHLIGHTS = [
    { value: '12', label: 'seasonal drinks on bar' },
    { value: '15 min', label: 'average pickup window' },
    { value: 'Daily', label: 'pastries baked before 7 AM' }
];

const HOME_SPOTLIGHT = {
    eyebrow: 'Signature Pour',
    title: 'Brown Sugar Cloud Latte',
    description:
        'Velvety espresso layered with caramel cream and a pastry pairing built for mid-morning resets.',
    meta: ['Single-origin espresso', 'Best with almond croissant', 'Pickup-ready']
};

const MENU_FEATURES = [
    {
        image: 'images/menu-1.png',
        name: 'Brown Sugar Latte',
        description: 'Bold espresso, dark caramel sweetness, and a clean finish that keeps the cup balanced.'
    },
    {
        image: 'images/menu-2.png',
        name: 'Velvet Cold Brew',
        description: 'Slow-steeped overnight for low acidity, layered cocoa notes, and a bright final sip.'
    },
    {
        image: 'images/menu-3.png',
        name: 'Cinnamon Flat White',
        description: 'A tighter milk texture with warm spice and a stronger roast profile for regulars.'
    },
    {
        image: 'images/menu-4.png',
        name: 'Butter Croissant',
        description: 'Laminated every morning for crisp layers that work with both black coffee and milk drinks.'
    },
    {
        image: 'images/menu-5.png',
        name: 'Matcha Cloud',
        description: 'Ceremonial matcha with soft cream foam when the mood is slower but the bar still feels sharp.'
    },
    {
        image: 'images/menu-6.png',
        name: 'House Tiramisu',
        description: 'Light mascarpone, espresso-soaked sponge, and enough bitterness to stay grown-up.'
    }
];

const GALLERY_FEATURES = [
    {
        image: 'images/g-img-1.jpg',
        title: 'Morning bar setup',
        description: 'Low light, polished brass, and the first grinders kicking in before the city gets loud.'
    },
    {
        image: 'images/g-img-2.jpg',
        title: 'Signature plating',
        description: 'Pastries and drinks styled to feel gift-worthy, even on a rushed weekday pickup.'
    },
    {
        image: 'images/g-img-3.jpg',
        title: 'Roast detail',
        description: 'A closer look at the beans, color, and texture that shape each espresso-heavy cup.'
    },
    {
        image: 'images/g-img-4.jpg',
        title: 'Counter moments',
        description: 'Fast service without losing the premium finish customers expect from a modern coffee brand.'
    },
    {
        image: 'images/g-img-5.jpg',
        title: 'Afternoon glow',
        description: 'Warm surfaces, softer shadows, and the kind of room people want to stay in longer.'
    },
    {
        image: 'images/g-img-6.jpg',
        title: 'Weekend scene',
        description: 'Built for casual dates, work sprints, and those slow reset hours customers remember.'
    }
];

const GUEST_REVIEWS = [
    {
        image: 'images/pic-1.png',
        name: 'Gia Tran',
        title: 'Creative Lead',
        review:
            'Velvet Ember feels cleaner than most cafe sites and the pickup flow is actually fast. The brown sugar latte is the one I keep reordering.',
        rating: 5
    },
    {
        image: 'images/pic-2.png',
        name: 'Minh Hoang',
        title: 'Product Manager',
        review:
            'The storefront looks premium, the offers section is easy to scan, and the pastries do not feel like an afterthought. It feels considered.',
        rating: 5
    },
    {
        image: 'images/pic-3.png',
        name: 'Lan Pham',
        title: 'Weekend Regular',
        review:
            'I like that the menu feels curated instead of crowded. You can tell what the hero drinks are in a few seconds, which is how a real brand should feel.',
        rating: 4
    }
];

const JOURNAL_POSTS = [
    {
        image: 'images/g-img-1.jpg',
        title: 'Designing a coffee bar that feels calm under pressure',
        description: 'How lighting, queue flow, and menu wording make rush-hour service feel more premium.',
        date: 'April 05, 2026',
        author: 'Velvet Ember Team'
    },
    {
        image: 'images/g-img-2.jpg',
        title: 'What makes a seasonal drink worth launching',
        description: 'A quick look at testing flavors, naming drinks, and choosing what deserves the spotlight.',
        date: 'March 30, 2026',
        author: 'Product & Bar Team'
    },
    {
        image: 'images/g-img-3.jpg',
        title: 'Why polished pickup UX matters for coffee brands',
        description: 'Customers notice when a storefront feels fast, clear, and built with intention from the first tap.',
        date: 'March 22, 2026',
        author: 'Customer Experience'
    }
];

const SOCIAL_LINKS = [
    { icon: 'fab fa-facebook-f', label: 'Facebook', href: '#home' },
    { icon: 'fab fa-instagram', label: 'Instagram', href: '#home' },
    { icon: 'fab fa-x-twitter', label: 'X', href: '#home' },
    { icon: 'fab fa-tiktok', label: 'TikTok', href: '#home' }
];

const CONTACT_DETAILS = [
    {
        icon: 'fas fa-phone',
        title: 'Call us',
        lines: ['028 7300 1122', '0908 221 445']
    },
    {
        icon: 'fas fa-envelope',
        title: 'Email',
        lines: ['hello@velvetember.vn', 'events@velvetember.vn']
    },
    {
        icon: 'fas fa-map',
        title: 'Visit',
        lines: ['12 Nguyen Hue, District 1', 'Ho Chi Minh City']
    }
];

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
    const isCustomerAccount = isCustomerRoleSet(updateData.roles);
    const canAccessAdminPanel = canAccessAdminWorkspace(updateData);

    useEffect(() => {
        if (loggedInUser && canAccessAdminPanel) {
            navigate(getLandingRouteForProfile(updateData), { replace: true });
        }
    }, [loggedInUser, canAccessAdminPanel, navigate, updateData]);

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
                    console.log("profile");
                    if (profile) {
                        // Cập nhật State của Homepage ngay tại chỗ để giao diện đổi luôn
                        setUpdateData(profile);
                        setLoggedInUser(profile.email);
                        
                        console.log(profile.roles);
                        // 3. ĐIỀU HƯỚNG (Redirect)
                        // Nếu đại ca muốn trải nghiệm mượt mà (SPA), hãy dùng navigate
                        // Nếu muốn sạch sẽ tuyệt đối, hãy dùng window.location.href
                        navigate(getLandingRouteForProfile(profile), { replace: true });
                    }
                } catch (syncError) {
                    console.error('Unable to sync profile after login.', syncError);
                }
                setLoginData(prev => ({ ...prev, password: '' }));
                closePanels();
                localStorage.removeItem('username');
                showAppNotice('success', 'Welcome back.');

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
            showAppNotice('error', 'Please sign in to view your cart.');
            openLoginPanel();
        } else {
            // Nếu đã đăng nhập, điều hướng sang trang cart
            navigate('/cart');
        }
    };
    return (
        <div className="storefront-homepage">
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
                    <a href="#home" className="logo">
                        <span className="brand-lockup">
                            <span className="brand-mark">
                                <i className="fas fa-mug-hot"></i>
                            </span>
                            <span className="brand-copy">
                                <strong>{STOREFRONT_BRAND.name}</strong>
                                <small>{STOREFRONT_BRAND.label}</small>
                            </span>
                        </span>
                    </a>

                    <nav className="navbar d-flex align-items-center ms-auto">
                        {NAV_LINKS.map((link) => (
                            <a key={link.href} href={link.href}>
                                {link.label}
                            </a>
                        ))}
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
                                        <small>Member Lounge</small>
                                    </span>
                                    <i className="fas fa-chevron-down user-profile-caret"></i>
                                </button>
                                <div className="user-dropdown" role="menu">

                                    {canAccessAdminPanel && (
                                        <button type="button" onClick={() => navigate(getLandingRouteForProfile(updateData))}>
                                            Supply Chain
                                        </button>
                                    )}

                                    {isCustomerAccount ? (
                                        <>
                                            <button type="button" onClick={openCustomerProfile}>
                                                Customer Profile
                                            </button>
                                            <button type="button" onClick={openViewOrderHistory}>
                                                Order History
                                            </button>
                                        </>
                                    ) : (
                                        <button type="button" onClick={openUpdatePanel}>
                                            Profile Settings
                                        </button>
                                    )}

                                    <button type="button" onClick={() => navigate('/loyalty')}>
                                        Rewards
                                    </button>

                                    <button type="button" onClick={handleLogout}>
                                        Sign Out
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

                    <div className="home-shell">
                        <div className="home-copy">
                            <span className="home-kicker">{STOREFRONT_BRAND.heroKicker}</span>
                            <h1>{STOREFRONT_BRAND.heroTitle}</h1>
                            <p>{STOREFRONT_BRAND.heroDescription}</p>

                            <div className="home-actions">
                                <a href="#menu" className="link-btn">{STOREFRONT_BRAND.primaryCtaLabel}</a>
                                <a href="#promotions" className="link-btn home-link-btn--ghost">{STOREFRONT_BRAND.secondaryCtaLabel}</a>
                            </div>

                            <div className="home-metrics">
                                {HOME_HIGHLIGHTS.map((item) => (
                                    <div key={item.label} className="home-metric">
                                        <strong>{item.value}</strong>
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="home-spotlight">
                            <div className="home-spotlight-card">
                                <span className="home-spotlight-kicker">{HOME_SPOTLIGHT.eyebrow}</span>
                                <h3>{HOME_SPOTLIGHT.title}</h3>
                                <p>{HOME_SPOTLIGHT.description}</p>
                                <div className="home-spotlight-meta">
                                    {HOME_SPOTLIGHT.meta.map((item) => (
                                        <span key={item}>{item}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </section>

            {/* home section ends */}

            <PromotionPublicSection />

            <ProductSection  />

            {/* about section starts  */}

            <section className="about" id="about">

                <div className="container">

                    <div className="row align-items-center">
                        <div className="col-md-6 about-visual">
                            <div className="about-image-frame">
                                <img src="images/about-img-1.png" className="w-100" alt="Velvet Ember interior" />
                            </div>
                        </div>
                        <div className="col-md-6 about-copy">
                            <span className="section-eyebrow">Our Story</span>
                            <h3 className="title">A neighborhood coffee bar with a sharper storefront presence.</h3>
                            <p className="section-lead">
                                Velvet Ember is built around small-batch roasting, warm service, and a menu that feels edited instead of crowded.
                                The goal is simple: let customers understand the brand fast, trust the quality quickly, and move from browse to order without friction.
                            </p>
                            <a href="#blogs" className="link-btn">Read the Journal</a>
                            <div className="icons-container">
                                <div className="icons">
                                    <i className="fas fa-coffee"></i>
                                    <h3>small-batch beans</h3>
                                </div>
                                <div className="icons">
                                    <i className="fas fa-shipping-fast"></i>
                                    <h3>fast pickup flow</h3>
                                </div>
                                <div className="icons">
                                    <i className="fas fa-headset"></i>
                                    <h3>warm support</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </section>

            {/* about section ends */}

            {/* menu section starts  */}

            <section className="menu" id="menu">

                <span className="section-eyebrow">Best Sellers</span>
                <h1 className="heading">house favorites</h1>
                <p className="section-lead">
                    Signature drinks, pastry pairings, and dessert picks that define the storefront in one quick scan.
                </p>

                <div className="container box-container">

                    {MENU_FEATURES.map((item) => (
                        <div key={item.name} className="box">
                            <img src={item.image} alt={item.name} />
                            <h3>{item.name}</h3>
                            <p>{item.description}</p>
                            <a href="#promotions" className="link-btn">Pair with offers</a>
                        </div>
                    ))}

                </div>

            </section>

            {/* menu section ends */}

            {/* gallery section starts  */}

            <section className="gallery" id="gallery">

                <span className="section-eyebrow">Atmosphere</span>
                <h1 className="heading">inside velvet ember</h1>
                <p className="section-lead">
                    A warmer, slower visual world that supports the premium feel behind each drink and pickup moment.
                </p>

                <div className="box-container container">

                    {GALLERY_FEATURES.map((item) => (
                        <div key={item.title} className="box">
                            <img src={item.image} alt={item.title} />
                            <div className="content">
                                <h3>{item.title}</h3>
                                <p>{item.description}</p>
                                <a href="#contact" className="link-btn">Plan a visit</a>
                            </div>
                        </div>
                    ))}

                </div>

            </section>

            {/* gallery section ends */}

            {/* reviews section starts  */}

            <section className="reviews" id="reviews">

                <span className="section-eyebrow">Customer Signals</span>
                <h1 className="heading">guest notes</h1>
                <p className="section-lead">
                    Real reactions from customers who care about service speed, menu clarity, and how the brand feels online.
                </p>

                <div className="box-container container">

                    {GUEST_REVIEWS.map((item) => (
                        <div key={item.name} className="box">
                            <img src={item.image} alt={item.name} />
                            <h3>{item.name}</h3>
                            <span className="review-role">{item.title}</span>
                            <p>{item.review}</p>
                            <div className="stars">
                                {Array.from({ length: 5 }, (_, index) => (
                                    <i
                                        key={`${item.name}-${index}`}
                                        className={index < item.rating ? 'fas fa-star' : 'far fa-star'}
                                    ></i>
                                ))}
                            </div>
                        </div>
                    ))}

                </div>

            </section>

            {/* reviews section ends */}

            {/* contact section starts  */}

            <section className="contact" id="contact">

                <span className="section-eyebrow">Plan a Visit</span>
                <h1 className="heading">visit velvet ember</h1>
                <p className="section-lead">
                    Reach the bar, ask about events, or line up your next pickup without digging through scattered details.
                </p>

                <div className="container">

                    <div className="contact-info-container">

                        {CONTACT_DETAILS.map((item) => (
                            <div key={item.title} className="box">
                                <i className={item.icon}></i>
                                <h3>{item.title}</h3>
                                {item.lines.map((line) => (
                                    <p key={line}>{line}</p>
                                ))}
                            </div>
                        ))}

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

                        <form
                            action=""
                            className="col-md-6"
                            onSubmit={(event) => event.preventDefault()}
                        >
                            <h3>Plan your next coffee run</h3>
                            <input type="text" placeholder="Your name" className="box" />
                            <input type="email" placeholder="Email address" className="box" />
                            <input type="number" placeholder="Phone number" className="box" />
                            <textarea name="" placeholder="Tell us about your order, event, or reservation idea" className="box" id="" cols={30} rows={10}></textarea>
                            <input type="submit" value="Send message" className="link-btn" />
                        </form>

                    </div>
                </div>


            </section >

            {/* contact section ends */}

            {/* blogs section starts  */}

            <section className="blogs" id="blogs">

                <span className="section-eyebrow">Brand Journal</span>
                <h1 className="heading">from the journal</h1>
                <p className="section-lead">
                    Short reads on menu thinking, service design, and the details that make a cafe brand feel considered.
                </p>

                <div className="box-container container">

                    {JOURNAL_POSTS.map((item) => (
                        <div key={item.title} className="box">
                            <div className="image">
                                <img src={item.image} alt={item.title} />
                            </div>
                            <div className="content">
                                <h3>{item.title}</h3>
                                <p>{item.description}</p>
                                <a href="#about" className="link-btn">Read more</a>
                            </div>
                            <div className="icons">
                                <span> <i className="fas fa-calendar"></i> {item.date} </span>
                                <span> <i className="fas fa-user"></i> {item.author} </span>
                            </div>
                        </div>
                    ))}

                </div>

            </section>

            {/* blogs section ends */}

            {/* newsletter section starts  */}

            <section className="newsletter">
                <div className="container">
                    <span className="section-eyebrow">Newsletter</span>
                    <h3>Join the Roast List</h3>
                    <p>Limited drops, menu updates, and offer announcements without the spammy feel.</p>
                    <form action="" onSubmit={(event) => event.preventDefault()}>
                        <input type="email" name="" placeholder="Enter your email" id="" className="email" />
                        <input type="submit" value="Subscribe" className="link-btn" />
                    </form>
                </div>
            </section>

            {/* newsletter section ends */}

            {/* footer section starts  */}

            <section className="footer container">

                <a href="#home" className="logo">
                    <span className="brand-lockup">
                        <span className="brand-mark">
                            <i className="fas fa-mug-hot"></i>
                        </span>
                        <span className="brand-copy">
                            <strong>{STOREFRONT_BRAND.name}</strong>
                            <small>{STOREFRONT_BRAND.label}</small>
                        </span>
                    </span>
                </a>

                <p className="credit">Crafted for customers who expect a cleaner, more premium coffee storefront.</p>

                <div className="footer-nav">
                    {NAV_LINKS.map((link) => (
                        <a key={`footer-${link.href}`} href={link.href}>
                            {link.label}
                        </a>
                    ))}
                </div>

                <div className="share">
                    {SOCIAL_LINKS.map((item) => (
                        <a key={item.label} href={item.href} className={item.icon} aria-label={item.label}></a>
                    ))}
                </div>

            </section>

            {/* footer section ends */}

        </div>
    );
};

export default Homepage;
