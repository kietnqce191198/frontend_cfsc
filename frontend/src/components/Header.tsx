import React, { useState, useEffect } from 'react';
import "../assets/style.css";
import apiClient, { dispatchSessionChanged } from '../lib/apiClient';
import '@fortawesome/fontawesome-free/css/all.min.css';

const Header: React.FC = () => {

    const [isLoginActive, setIsLoginActive] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState<string | null>(null);

    const [loginData, setLoginData] = useState({
        email: '',
        password: ''
    });

    useEffect(() => {
        const savedUser = localStorage.getItem('email');
        if (savedUser) setLoggedInUser(savedUser);
    }, []);

    const toggleLoginForm = () => setIsLoginActive(!isLoginActive);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLoginData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await apiClient.post('/auth/login', loginData);

            if (response.status === 200) {
                const token = response.data.token;
                localStorage.setItem('accessToken', token);
                localStorage.setItem('email', loginData.email); // Lưu lại username

                setLoggedInUser(loginData.email); // Cập nhật giao diện
                console.log('Header: Login successful, dispatching session changed event');
                dispatchSessionChanged();
                alert('Đăng nhập thành công!');
                toggleLoginForm();
            }
        } catch (error: any) {
            alert('Lỗi: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleLogout = async () => {
        // 1. Lấy token từ localStorage ra để gửi đi
        const token = localStorage.getItem('accessToken');

        if (token) {
            try {
                // 2. Gửi request POST lên BE để blacklist token này
                await apiClient.post('/auth/logout', {});
            } catch (error) {
                console.error("Lỗi khi gọi API logout ở BE:", error);
                
            }
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('email');
        localStorage.removeItem('customerId');
        setLoggedInUser(null);
        dispatchSessionChanged();

        alert('Đã đăng xuất thành công!');
    };
    return (
        <>
    <header className="header fixed-top">
            <div className="container d-flex align-items-center w-100">

                {/* 1. Logo */}
                <a href="#" className="logo"> <i className="fas fa-mug-hot"></i> coffee </a>

                <nav className="navbar d-flex align-items-center ms-auto">
                    <a href="#home">home</a>
                    <a href="#about">about</a>
                    <a href="#menu">menu</a>
                    <a href="#gallery">gallery</a>
                    <a href="#reviews">reviews</a>
                    <a href="#contact">contact</a>
                    <a href="#blogs">blogs</a>
                </nav>
                <div className="icons d-flex align-items-center ms-4">
                    <div id="menu-btn" className="fas fa-bars"></div>

                    {loggedInUser ? (
                        <div className="user-menu-container">
                            <span className="username-display">{loggedInUser}</span>
                            <div className="user-dropdown">
                                <a href="/change-password">Change Password</a>
                                <button onClick={handleLogout}>Logout</button>
                            </div>
                        </div>
                    ) : (
                        <div id="login-btn" className="fas fa-user" onClick={toggleLoginForm}></div>
                    )}
                </div>
            </div>
        </header>
        
        {/* login form ends */}
            <div className={`login-form-container ${isLoginActive ? 'active' : ''}`}>
                <div id="close-login-btn" className="fas fa-times" onClick={toggleLoginForm}></div>

                <form onSubmit={handleLogin}> {/* Gán hàm handleLogin vào đây */}
                    <h3>user login</h3>

                    <input
                        type="email"
                        name="email" // Name phải khớp với key trong state
                        placeholder="your email"
                        className="box"
                        value={loginData.email}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="password"
                        name="password"
                        placeholder="your password"
                        className="box"
                        value={loginData.password}
                        onChange={handleChange}
                        required
                    />

                    <input type="submit" value="login now" className="link-btn" />
                </form>
            </div>
        </>
        

        
    );
};

export default Header;
