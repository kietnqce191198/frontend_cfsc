import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customerHttp } from '../lib/apiClient';
import { loyaltyApi, customerApi } from "../services/api"
import '../assets/order-history.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

interface Order {
    orderId: number;
    orderNumber: string;
    status: 'Completed' | 'Processing' | 'Pending' | 'Cancelled';
    totalAmount: number;
    createdAt: string;
    itemsCount: number;
}

// Ở trang OrderHistory.tsx
const savedProfile = localStorage.getItem('accountProfile');
let userId = null;

if (savedProfile) {
    const profile = JSON.parse(savedProfile);

    userId = profile.id;
}
const OrderHistory: React.FC = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        const fetchOrders = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) return;
            const payload = JSON.parse(atob(token.split(".")[1]));
            const customerResp = await customerApi.getByUserId(payload.userId);
            const customerId = customerResp?.id || customerResp?.data?.id;
            if (!customerId) return;
            if (!token) {
                navigate('/');
                return;
            }
            if (!customerId || customerId === "null") {
                console.error("Không tìm thấy customerId của đại ca!");
                setError("Thông tin khách hàng không tồn tại. Vui lòng đăng nhập lại.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                const response = await customerHttp.get(`/customer/${customerId}/orders`);

                // Giả sử BE trả về object có field data là mảng orders
                setOrders(response.data.data || response.data);
                setError(null);
            } catch (err: any) {
                console.error("Lỗi lấy đơn hàng:", err);
                setError(err.response?.data?.message || "Không thể tải danh sách đơn hàng.");
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [navigate]);

    const handleRowClick = (orderId: number) => {
        navigate(`/order-detail/${orderId}`);
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

            <section className="account-page-shell" style={{ display: 'block', width: '100%', minHeight: '100vh' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '10rem 0', boxSizing: 'border-box' }}>
                    <div className="account-card shadow-sm" style={{ background: '#fff', borderRadius: '1.5rem', width: '95%', maxWidth: '1200px', padding: '3rem', margin: '0 auto', flex: 'none' }}>

                        <div className="account-card-header text-center" style={{ marginBottom: '3rem' }}>
                            <span className="account-eyebrow">activity</span>
                            <h3 style={{ fontSize: '3rem' }}>Order History</h3>
                        </div>

                        <div className="account-card-body" style={{ width: '100%', padding: '0', display: 'block' }}>
                            <div className="order-table-wrapper" style={{ width: '100%', display: 'block' }}>

                                <div style={{ display: 'flex', padding: '1.5rem', background: '#f8f9fa', borderBottom: '2px solid #512a10', fontWeight: 'bold', color: '#888', fontSize: '1.4rem', textTransform: 'uppercase' }}>
                                    <div style={{ flex: 2 }}>Order #</div>
                                    <div style={{ flex: 2 }}>Date</div>
                                    <div style={{ flex: 1 }}>Items</div>
                                    <div style={{ flex: 2 }}>Total</div>
                                    <div style={{ flex: 1, textAlign: 'center' }}>Status</div>
                                </div>

                                {loading ? (
                                    <div style={{ padding: '5rem', textAlign: 'center', fontSize: '2rem', color: '#512a10' }}>
                                        <i className="fas fa-spinner fa-spin"></i> Đang tải đơn hàng...
                                    </div>
                                ) : error ? (
                                    <div style={{ padding: '5rem', textAlign: 'center', fontSize: '1.8rem', color: 'red' }}>
                                        {error}
                                    </div>
                                ) : orders.length === 0 ? (
                                    <div style={{ padding: '5rem', textAlign: 'center', fontSize: '1.8rem', color: '#666' }}>
                                        chưa có đơn hàng nào hết!
                                    </div>
                                ) : (
                                    orders.map((order) => (
                                        <div
                                            key={order.orderId}
                                            onClick={() => handleRowClick(order.orderId)}
                                            style={{ display: 'flex', alignItems: 'center', padding: '2rem 1.5rem', borderBottom: '1px solid #eee', fontSize: '1.6rem', transition: '0.3s', cursor: 'pointer' }}
                                            className="order-row-hover"
                                        >
                                            <div style={{ flex: 2, fontWeight: 'bold', color: '#512a10' }}>{order.orderNumber}</div>
                                            <div style={{ flex: 2, color: '#666' }}>{formatDate(order.createdAt)}</div>
                                            <div style={{ flex: 1 }}>{order.itemsCount} món</div>
                                            <div style={{ flex: 2, fontWeight: 'bold' }}>{formatCurrency(order.totalAmount)}</div>
                                            <div style={{ flex: 1, textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '0.6rem 1.2rem',
                                                    borderRadius: '4px',
                                                    fontSize: '1.2rem',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                    background: order.status === 'Completed' ? '#e8f5e9' : (order.status === 'Cancelled' ? '#ffebee' : '#fff3e0'),
                                                    color: order.status === 'Completed' ? '#2e7d32' : (order.status === 'Cancelled' ? '#c62828' : '#ef6c00'),
                                                    display: 'inline-block',
                                                    minWidth: '100px'
                                                }}>
                                                    {order.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default OrderHistory;