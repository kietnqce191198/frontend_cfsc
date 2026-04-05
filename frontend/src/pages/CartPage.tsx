import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customerApi } from "../services/api";
import axios from 'axios';
import '../assets/style.css';
import '../assets/cart.css';

interface CartItem {
    id: number;
    productId: number;
    productName: string;
    price: number;
    quantity: number;
    subtotal: number;
}

interface CartData {
    id: number;
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    items: CartItem[];
    appliedCouponCodes: string[];
}

interface Promotion {
    id: number;
    name: string;
    description: string;
    type: string;
    status: string;
    value: number;
    startDate: string;
    endDate: string;
    minOrderAmount: number | null; // Điều kiện đơn hàng tối thiểu
    maxDiscountAmount: number | null; // Giảm tối đa bao nhiêu
}

interface Coupon {
    id: number;
    code: string;
    status: string;
    times_used: number;
    remaining_uses: number | string;
    discountValue: number; // Đây là cp.promotion.value từ BE gửi về Map.of
    type: string;          // Đây là cp.promotion.type từ BE
    promotion: Promotion;  // <-- Nguyên object promotion đại ca vừa thêm
}


const CartPage: React.FC = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState<CartData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // UI Modal states
    const [showModal, setShowModal] = useState(false);
    const [showAppliedModal, setShowAppliedModal] = useState(false);
    const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
    const [tempSelectedCode, setTempSelectedCode] = useState<string | null>(null);

    // Custom Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const customerIdRef = useRef<number | null>(null);
    const API_BASE_URL = '/api-engagement';

    // Show professional notification
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Format currency to Vietnamese Dong
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const getDiscountLabel = (value: number, type: string) => {
        if (type === 'PERCENTAGE_DISCOUNT' || type === 'PERCENTAGE') return `${value}% OFF`;
        return `${formatCurrency(value)} OFF`;
    };

    const fetchCartData = useCallback(async (cId: number, token: string) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/cart/customer/${cId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(res.data);
            setCart(res.data);
        } catch (err) {
            console.error("Cart fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCoupons = async () => {
        const token = localStorage.getItem('accessToken');
        try {
            const res = await axios.get(`${API_BASE_URL}/coupon`, {
                params: { status: 'ACTIVE', size: 50 },
                headers: { Authorization: `Bearer ${token}` }
            });
            const allCoupons: Coupon[] = res.data.content || [];
            const appliedCodes = cart?.appliedCouponCodes || [];
            // Filter out vouchers already in the cart
            const filtered = allCoupons.filter(cp => !appliedCodes.includes(cp.code));
            console.log(res.data.content);
            setAvailableCoupons(filtered);
        } catch (err) {
            setAvailableCoupons([]);
        }
    };

    const handleOpenModal = () => {
        setTempSelectedCode(null);
        fetchCoupons();
        setShowModal(true);
    };

    const handleSelectLocal = (code: string) => {
        setTempSelectedCode(prev => (prev === code ? null : code));
    };

    const handleConfirmApply = async () => {
        if (!tempSelectedCode) return;
        const token = localStorage.getItem('accessToken');
        try {
            const res = await axios.post(`${API_BASE_URL}/cart/apply-coupon`,
                { couponCode: tempSelectedCode },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setCart(res.data);
            setShowModal(false);
            showToast("Voucher applied successfully!", "success");
        } catch (err: any) {
            showToast(err.response?.data?.message || "Invalid voucher code", "error");
        }
    };

    const quickRemove = (code: string) => {
        const token = localStorage.getItem('accessToken');
        axios.delete(`${API_BASE_URL}/cart/coupon`, {
            params: { couponCode: code },
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                setCart(res.data);
                if (res.data.appliedCouponCodes.length === 0) setShowAppliedModal(false);
                showToast("Voucher removed from cart", "info");
            })
            .catch(() => showToast("Failed to remove voucher", "error"));
    };

    const handleUpdateQuantity = async (itemId: number, newQty: number) => {
        if (newQty < 1) return;
        const token = localStorage.getItem('accessToken');
        if (!token) { navigate('/'); return; }
        try {
            const res = await axios.put(`${API_BASE_URL}/cart/item/${itemId}/quantity`, null, {
                params: { quantity: newQty },
                headers: { Authorization: `Bearer ${token}` }
            });
            setCart(res.data);
            
            const payload = JSON.parse(atob(token.split(".")[1]));
            
            const resp = await customerApi.getByUserId(payload.userId);
            const cId = resp?.id || resp?.data?.id;
            fetchCartData(cId, token);
        } catch (err) {
            console.error("Update quantity failed", err);
        }
    };

    const handleRemoveItem = async (itemId: number) => {
        const token = localStorage.getItem('accessToken');
        try {
            await axios.delete(`${API_BASE_URL}/cart/item/${itemId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (customerIdRef.current) fetchCartData(customerIdRef.current, token!);
            showToast("Item removed from cart", "info");
        } catch (err) {
            console.error("Remove item failed", err);
        }
    };

    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) { navigate('/'); return; }
            try {
                if (!customerIdRef.current) {
                    const payload = JSON.parse(atob(token.split(".")[1]));
                    const resp = await customerApi.getByUserId(payload.userId);
                    const cId = resp?.id || resp?.data?.id;
                    if (cId) {
                        customerIdRef.current = cId;
                        fetchCartData(cId, token);
                    } else { setLoading(false); }
                }
            } catch (e) { setLoading(false); }
        };
        init();
    }, [navigate, fetchCartData]);

    if (loading) return <div className="account-page"><section className="account-page-shell"><div style={{ color: '#fff', textAlign: 'center', width: '100%', fontSize: '2rem' }}>☕ Processing your order...</div></section></div>;

    return (
        <div className="account-page">
            {/* Custom Toast Notification UI */}
            {toast && (
                <div className={`custom-toast toast-${toast.type}`}>
                    <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}`}></i>
                    <span>{toast.message}</span>
                </div>
            )}

            <header className="header active">
                <div className="container d-flex align-items-center w-100">
                    <Link to="/" className="logo"><i className="fas fa-mug-hot"></i> coffee</Link>
                    <button className="link-btn account-top-btn " onClick={() => navigate(-1)}><i className="fas fa-arrow-left" style={{ margin: 0 }}></i> back</button>
                </div>
            </header>

            <section className="account-page-shell">
                <div className="account-container-center">
                    <div className="account-card shadow-sm">
                        <div className="account-card-header text-center">
                            <span className="account-eyebrow">Review your bag</span>
                            <h3 style={{ fontSize: '3.5rem' }}>Shopping Cart</h3>
                        </div>

                        <div className="cart-content-wrapper">
                            <div className="cart-items-section">
                                <div className="cart-table-header">
                                    <div style={{ flex: 4 }}>Product</div>
                                    <div style={{ flex: 2 }}>Price</div>
                                    <div style={{ flex: 2 }}>Quantity</div>
                                    <div style={{ flex: 2, textAlign: 'right' }}>Subtotal</div>
                                    <div style={{ flex: 1 }}></div>
                                </div>
                                {cart?.items?.map((item) => (
                                    <div key={item.id} className="cart-item-row">
                                        <div style={{ flex: 4, display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                            <div className="cart-img-box">
                                                <img src={`/images/menu-${item.productId}.png`}
                                                //onError={(e) => e.currentTarget.src = '/images/default-coffee.png'} 
                                                /></div>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.7rem' }}>{item.productName}</div>
                                                <small style={{ color: '#888' }}>SKU: #{item.productId}</small>
                                            </div>
                                        </div>
                                        <div style={{ flex: 2 }}>{formatCurrency(item.price)}</div>
                                        <div style={{ flex: 2 }}>
                                            <div className="qty-control">
                                                <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}>-</button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                                            </div>
                                        </div>
                                        <div style={{ flex: 2, textAlign: 'right', fontWeight: 'bold', color: '#512a10' }}>{formatCurrency(item.subtotal)}</div>
                                        <div style={{ flex: 1, textAlign: 'right' }}><button className="delete-btn" onClick={() => handleRemoveItem(item.id)}><i className="fas fa-trash-alt"></i></button></div>
                                    </div>
                                ))}
                            </div>

                            <div className="cart-summary-card">
                                <h4 style={{ marginBottom: '3rem', fontSize: '2.4rem', fontWeight: '800' }}>Order Summary</h4>

                                {/* Tăng margin-bottom cho các dòng summary để tạo độ thưa */}
                                <div className="summary-line" style={{ marginBottom: '2.5rem' }}>
                                    <span>Subtotal</span>
                                    <span style={{ fontWeight: '700' }}>{formatCurrency(cart?.totalAmount || 0)}</span>
                                </div>

                                <div className="summary-line discount" style={{ color: '#27ae60', marginBottom: '3rem' }}>
                                    <span>Discounts</span>
                                    <span style={{ fontWeight: '700' }}>-{formatCurrency(cart?.discountAmount || 0)}</span>
                                </div>

                                {/* Khu vực Coupon được bao bọc thưa ra */}
                                <div className="coupon-area-modern" style={{ borderTop: '1px solid #eee', paddingTop: '3rem', marginTop: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>

                                        {/* Nhãn PROMO CODE */}
                                        <label style={{
                                            fontSize: '1.2rem',
                                            fontWeight: 800,
                                            color: '#aaa',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            margin: 0 // Khử margin mặc định
                                        }}>
                                            Promo Code
                                        </label>

                                        {/* Nhóm Input và Nút Select */}
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                placeholder="Enter code..."
                                                value={tempSelectedCode || ''}
                                                readOnly
                                                style={{
                                                    width: '200px',
                                                    height: '4.5rem',
                                                    padding: '0 1.5rem',
                                                    borderRadius: '10px',
                                                    border: '1.5px solid #f1e4d8',
                                                    fontSize: '1.4rem',
                                                    outline: 'none'
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="link-btn"
                                                style={{
                                                    height: '4.5rem',
                                                    padding: '0 2.5rem',
                                                    background: '#512a10',
                                                    color: '#fff',
                                                    borderRadius: '10px',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                onClick={handleOpenModal}
                                            >
                                                Select
                                            </button>
                                        </div>

                                        {/* Nút View Applied Offers nằm riêng biệt bên phải */}
                                        <div
                                            onClick={() => (cart?.appliedCouponCodes?.length || 0) > 0 ? setShowAppliedModal(true) : showToast("No active vouchers", "info")}
                                            style={{
                                                fontSize: '1.3rem',
                                                color: (cart?.appliedCouponCodes?.length || 0) > 0 ? '#27ae60' : '#be9c79',
                                                cursor: 'pointer',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginLeft: 'auto' // Đẩy cái này về góc phải nếu hàng đủ rộng
                                            }}
                                        >
                                            <i className="fas fa-ticket-alt"></i>
                                            <span style={{ textDecoration: 'underline' }}>View applied offers</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Grand Total nổi bật và thưa biệt lập */}
                                <div className="summary-line total" style={{
                                    borderTop: '2px solid #fdfaf7',
                                    paddingTop: '2.5rem',
                                    marginTop: '2rem',
                                    marginBottom: '4rem',
                                    fontSize: '2.6rem',
                                    fontWeight: '900',
                                    color: '#512a10'
                                }}>
                                    <span>Grand Total</span>
                                    <span>{formatCurrency(cart?.finalAmount || 0)}</span>
                                </div>

                                <button
                                    type="button"
                                    className="link-btn checkout-btn"
                                    style={{
                                        width: '100%',
                                        padding: '2rem',
                                        borderRadius: '15px',
                                        fontSize: '1.8rem',
                                        fontWeight: '800',
                                        letterSpacing: '1px',
                                        boxShadow: '0 10px 20px rgba(81, 42, 16, 0.15)'
                                    }}
                                >
                                    PROCEED TO CHECKOUT
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* MODAL 1: REDEEM NEW VOUCHER */}
            {showModal && (
                <div className="coupon-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="coupon-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="coupon-modal-header">
                            <h3 style={{ fontSize: '2.2rem' }}>Available Offers 🎫</h3>
                            <i className="fas fa-times" style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)}></i>
                        </div>
                        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
                            <button className="link-btn" style={{ flex: 1, background: '#eee', color: '#333' }} onClick={() => setShowModal(false)}>Dismiss</button>
                            <button className="link-btn" style={{ flex: 2 }} onClick={handleConfirmApply} disabled={!tempSelectedCode}>Apply Selected</button>
                        </div>
                        <div className="coupon-list" style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '10px' }}>
                            {availableCoupons.length > 0 ? availableCoupons.map(cp => {
                                // Logic kiểm tra điều kiện
                                const subtotal = cart?.totalAmount || 0;
                                const minAmount = cp.promotion?.minOrderAmount || 0;
                                const isNotEligible = subtotal < minAmount;

                                return (
                                    <div
                                        key={cp.id}
                                        className={`coupon-item ${tempSelectedCode === cp.code ? 'selected' : ''} ${isNotEligible ? 'disabled-ui' : ''}`}
                                        onClick={() => !isNotEligible && handleSelectLocal(cp.code)}
                                        style={{
                                            position: 'relative',
                                            opacity: isNotEligible ? 0.6 : 1,
                                            cursor: isNotEligible ? 'not-allowed' : 'pointer',
                                            filter: isNotEligible ? 'grayscale(0.5)' : 'none',
                                            border: tempSelectedCode === cp.code ? '2px solid #512a10' : '1.5px dashed #e1d5c9'
                                        }}
                                    >
                                        <div className="coupon-icon">
                                            <i className={`fas ${cp.type === 'PERCENTAGE_DISCOUNT' ? 'fa-percentage' : 'fa-money-bill-wave'}`}></i>
                                        </div>

                                        <div className="coupon-info" style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                                                <span className="cp-badge" style={{ background: isNotEligible ? '#ccc' : '#be9c79' }}>{cp.code}</span>
                                                <strong style={{ fontSize: '1.5rem', color: '#512a10' }}>{cp.promotion?.name}</strong>
                                            </div>

                                            <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '8px' }}>
                                                {cp.promotion?.description || "No description provided."}
                                            </p>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ color: '#e67e22', fontWeight: '800', fontSize: '1.4rem' }}>
                                                    {getDiscountLabel(cp.discountValue, cp.type)}
                                                </span>

                                                {/* Hiển thị điều kiện Min Order */}
                                                {minAmount > 0 && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <i className="fas fa-shopping-basket" style={{ fontSize: '1rem', color: '#999' }}></i>
                                                        <span style={{
                                                            fontSize: '1.2rem',
                                                            color: isNotEligible ? '#e74c3c' : '#888',
                                                            fontWeight: isNotEligible ? 'bold' : 'normal'
                                                        }}>
                                                            Min spend: {formatCurrency(minAmount)}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Cảnh báo nếu chưa đủ điều kiện */}
                                                {isNotEligible && (
                                                    <small style={{ color: '#e74c3c', fontWeight: 'bold', marginTop: '5px' }}>
                                                        <i className="fas fa-exclamation-triangle"></i> Add {formatCurrency(minAmount - subtotal)} more to unlock
                                                    </small>
                                                )}
                                            </div>
                                        </div>

                                        <div className="coupon-selector">
                                            {!isNotEligible && (
                                                <div className={`custom-checkbox ${tempSelectedCode === cp.code ? 'checked' : ''}`}>
                                                    {tempSelectedCode === cp.code && <i className="fas fa-check"></i>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <p style={{ textAlign: 'center', padding: '2rem' }}>No vouchers available.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: MANAGE APPLIED VOUCHERS */}
            {showAppliedModal && (
                <div className="coupon-modal-overlay" onClick={() => setShowAppliedModal(false)}>
                    <div className="coupon-modal" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="coupon-modal-header">
                            <h3>Applied Vouchers 🛒</h3>
                            <i className="fas fa-times" style={{ cursor: 'pointer' }} onClick={() => setShowAppliedModal(false)}></i>
                        </div>
                        <div className="applied-detail-content" style={{ padding: '2rem 0' }}>
                            {cart?.appliedCouponCodes?.map((code) => (
                                <div key={code} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '1.5rem', backgroundColor: '#f0fff4', borderRadius: '8px',
                                    border: '1px solid #27ae60', marginBottom: '1rem'
                                }}>
                                    <div>
                                        <p style={{ fontWeight: 'bold', fontSize: '1.6rem', color: '#27ae60' }}><i className="fas fa-check-circle"></i> {code}</p>
                                        <small style={{ color: '#666' }}>Currently active</small>
                                    </div>
                                    <button onClick={() => quickRemove(code)} style={{ background: '#c0392b', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Remove</button>
                                </div>
                            ))}
                        </div>
                        <button className="link-btn" style={{ width: '100%' }} onClick={() => setShowAppliedModal(false)}>Back to Cart</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartPage;