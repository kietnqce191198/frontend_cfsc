import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import '../assets/order-history.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

interface OrderItem {
    productName: string;
    quantity: number;
    price: number;
}

interface StatusHistory {
    status: string;
    updatedAt: string;
}

interface OrderDetailData {
    orderId: number;
    items: OrderItem[];
    paymentInfo: {
        method: string;
        status: string;
        paidAt: string;
    };
    deliveryInfo: {
        address: string;
        receiverName: string;
        phone: string;
        status: string;
    };
    statusHistory: StatusHistory[];
}
const savedProfile = localStorage.getItem('accountProfile');
let userId = null;

if (savedProfile) {
    const profile = JSON.parse(savedProfile);
    console.log("Toàn bộ profile nè đại ca:", profile);
    userId = profile.id; // Lấy id từ object đã lưu
}
const API_BASE_URL = '/api-customer';

const OrderDetail: React.FC = () => {
    const navigate = useNavigate();
    const { orderId } = useParams<{ orderId: string }>();
    const [order, setOrder] = useState<OrderDetailData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const formatCurrency = (num: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
    const formatDate = (str: string) => str ? new Date(str).toLocaleString('vi-VN') : 'N/A';

    useEffect(() => {
            const fetchOrderDetail = async () => {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    navigate('/');
                    return;
                }

                try {
                    setLoading(true);
                    const payload = JSON.parse(atob(token.split(".")[1]));
                    const customerResp = await axios.get(`${API_BASE_URL}/api/customers/user/${payload.userId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const customerId = customerResp.data?.id || customerResp.data?.data?.id;

                    const customerResp = await customerApi.getByUserId(payload.userId);
                    const customerId = customerResp?.id || customerResp?.data?.id;
                        const response = await axios.get(`${API_BASE_URL}/api/customers/${customerId}/orders/${orderId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    setOrder(response.data.data || response.data);
                    setError(null);
                } catch (err: any) {
                    console.error("BIG BUG fetch Order Detail:", err);

                    const errorMessage = err.response?.data?.message || err.message || "Đã xảy ra lỗi không xác định";
                    setError(errorMessage);
                } finally {
                    setLoading(false);
                }
            };

        if (orderId) fetchOrderDetail();
    }, [orderId, navigate]);

    if (loading) {
        return (
            <div className="account-page">
                <section className="account-page-shell" style={{ textAlign: 'center', padding: '20rem 0' }}>
                    <div style={{ fontSize: '2rem', color: '#512a10' }}>
                        <i className="fas fa-spinner fa-spin"></i>
                    </div>
                </section>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="account-page">
                <section className="account-page-shell" style={{ textAlign: 'center', padding: '20rem 0' }}>
                    <div style={{ fontSize: '2rem', color: 'red' }}>{error}</div>
                    <button onClick={() => navigate(-1)} className="link-btn" style={{ marginTop: '2rem' }}>back</button>
                </section>
            </div>
        );
    }

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

            <section className="account-page-shell" style={{ padding: '10rem 0', display: 'block', width: '100%' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '0 2rem' }}>
                    <div className="account-card shadow-sm" style={{ background: '#fff', borderRadius: '1.5rem', width: '95%', maxWidth: '1200px', padding: '4rem', margin: '0 auto' }}>
                        
                        <div className="detail-header" style={{ borderBottom: '2px solid #512a10', paddingBottom: '2rem', marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                                <span className="account-eyebrow">invoice details</span>
                                <h3 style={{ fontSize: '3rem', marginTop: '0.5rem' }}>Order #ORD-2026-{order.orderId}</h3>
                            </div>
                            <span style={{ fontSize: '1.6rem', color: '#888' }}>
                                Placed on: {order.statusHistory.length > 0 ? formatDate(order.statusHistory[0].updatedAt) : 'N/A'}
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                            
                            <div style={{ width: '100%', borderBottom: '1px solid #eee', paddingBottom: '2rem' }}>
                                <h4 style={{ fontSize: '1.8rem', color: '#512a10', marginBottom: '1.5rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <i className="fas fa-truck"></i> Shipping Address
                                </h4>
                                <div style={{ paddingLeft: '2.8rem' }}>
                                    <p style={{ fontSize: '1.7rem', fontWeight: 'bold' }}>{order.deliveryInfo.receiverName}</p>
                                    <p style={{ fontSize: '1.6rem', color: '#666', marginTop: '0.5rem' }}>{order.deliveryInfo.phone}</p>
                                    <p style={{ fontSize: '1.6rem', color: '#666', lineHeight: '1.6' }}>{order.deliveryInfo.address}</p>
                                </div>
                            </div>

                            <div style={{ width: '100%', borderBottom: '1px solid #eee', paddingBottom: '2rem' }}>
                                <h4 style={{ fontSize: '1.8rem', color: '#512a10', marginBottom: '1.5rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <i className="fas fa-credit-card"></i> Payment Method
                                </h4>
                                <div style={{ paddingLeft: '2.8rem' }}>
                                    <p style={{ fontSize: '1.6rem' }}>Method: <strong>{order.paymentInfo.method}</strong></p>
                                    <p style={{ fontSize: '1.6rem', marginTop: '0.5rem' }}>Status: <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>{order.paymentInfo.status}</span></p>
                                    <p style={{ fontSize: '1.5rem', color: '#888', marginTop: '0.5rem' }}>Paid at: {formatDate(order.paymentInfo.paidAt)}</p>
                                </div>
                            </div>

                            <div style={{ width: '100%' }}>
                                <h4 style={{ fontSize: '1.8rem', color: '#512a10', marginBottom: '1.5rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <i className="fas fa-coffee"></i> Order Items
                                </h4>
                                <div style={{ background: '#f8f9fa', borderRadius: '1rem', padding: '3rem', width: '100%' }}>
                                    {order.items.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 0', borderBottom: idx === order.items.length - 1 ? 'none' : '1px solid #ddd' }}>
                                            <div style={{ fontSize: '1.7rem' }}>
                                                <span style={{ fontWeight: '500' }}>{item.productName}</span>
                                                <span style={{ color: '#888', marginLeft: '1.5rem' }}>x{item.quantity}</span>
                                            </div>
                                            <span style={{ fontWeight: 'bold', fontSize: '1.7rem' }}>{formatCurrency(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                    <div style={{ borderTop: '2px solid #512a10', marginTop: '2rem', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '2.2rem', fontWeight: 'bold' }}>Total Amount</span>
                                        <span style={{ fontSize: '2.4rem', fontWeight: 'bold', color: '#512a10' }}>
                                            {formatCurrency(order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0))}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ width: '100%', marginTop: '2rem' }}>
                                <h4 style={{ fontSize: '1.8rem', color: '#512a10', marginBottom: '2.5rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <i className="fas fa-history"></i> Order Timeline
                                </h4>
                                <div style={{ paddingLeft: '3rem', borderLeft: '3px solid #be9c79', marginLeft: '1rem' }}>
                                    {order.statusHistory.sort((a,b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()).map((step, idx) => (
                                        <div key={idx} style={{ position: 'relative', marginBottom: '3rem' }}>
                                            <div style={{ position: 'absolute', left: '-3.8rem', top: '0.2rem', width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: '#512a10', border: '3px solid #fff', boxShadow: '0 0 0 2px #be9c79' }}></div>
                                            <p style={{ fontSize: '1.6rem', fontWeight: 'bold', margin: '0' }}>{step.status}</p>
                                            <p style={{ fontSize: '1.4rem', color: '#888', margin: '0', marginTop: '0.3rem' }}>{formatDate(step.updatedAt)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default OrderDetail;