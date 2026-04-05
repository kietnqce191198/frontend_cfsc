import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { promotionAnalyticsApi } from '../services/api';
import {
    HiOutlineArrowLeft,
    HiOutlineArrowDownTray,
    HiOutlineArrowTrendingUp,
    HiOutlineTicket,
    HiOutlineCurrencyDollar,
    HiOutlineUsers
} from 'react-icons/hi2';

/**
 * Sub-component: Card hiển thị thông số tổng quan
 */
const AnalyticsCard = ({ label, value, icon, trend }) => (
    <div className="bg-white p-5 rounded-xl border border-[#f1e6dd] shadow-sm hover:shadow-md transition-shadow">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ padding: '8px', backgroundColor: '#fcfaf9', borderRadius: '8px', fontSize: '24px' }}>
                {icon}
            </div>
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#16a34a', backgroundColor: '#f0fdf4', padding: '4px 8px', borderRadius: '9999px' }}>
                {trend}
            </span>
        </div>
        <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500', margin: '4px 0' }}>{label}</p>
        <h4 style={{ fontSize: '24px', fontWeight: 'bold', color: '#5f3824', margin: 0 }}>{value}</h4>
    </div>
);

// NHẬN PROPS ĐỂ DÙNG TRONG POPUP
const PromotionAnalyticsPage = ({ promoId, isPopup }) => {
    const { id: urlId } = useParams();
    const navigate = useNavigate();

    // ƯU TIÊN ID TỪ PROPS (KHI LÀ POPUP) HOẶC URL (KHI LÀ PAGE)
    const activeId = promoId || urlId;

    const [analytics, setAnalytics] = useState(null);
    const [usageData, setUsageData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!activeId) return;

        try {
            setLoading(true);
            setError(null);

            const [details, history] = await Promise.all([
                promotionAnalyticsApi.getAnalytics(activeId),
                promotionAnalyticsApi.getUsageOverTime(activeId, 'day')
            ]);

            setAnalytics(details || {});
            setUsageData(Array.isArray(history) ? history : []);
        } catch (err) {
            console.error("Fetch Error:", err);
            setError(err.message || "Failed to load analytics data");
        } finally {
            setLoading(false);
        }
    }, [activeId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleExport = async () => {
        try {
            // 1. Gọi API với responseType là 'blob'
            // Lưu ý: Trong file promotionAnalyticsApi, bạn cần cấu hình { responseType: 'blob' } cho axios
            const response = await promotionAnalyticsApi.exportData(activeId, 'excel');

            // 2. Tạo một đường dẫn ảo (URL) cho file binary vừa tải về
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);

            // 3. Tạo một thẻ <a> ẩn để kích hoạt tải file
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `promotion_report_${activeId}.xlsx`); // Tên file mong muốn

            document.body.appendChild(link);
            link.click();

            // 4. Dọn dẹp bộ nhớ sau khi tải xong
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (err) {
            console.error("Export error:", err);
            alert("Export failed: " + (err.response?.data?.message || err.message));
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', padding: '40px' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid #f1e6dd', borderTopColor: '#7b4a2e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <p style={{ marginTop: '16px', color: '#7b4a2e', fontWeight: '900', fontSize: '12px' }}>SYNCING PERFORMANCE...</p>
            </div>
        );
    }

    return (
        <div className={isPopup ? "p-2" : "p-6"} style={{ backgroundColor: isPopup ? 'transparent' : '#fcfaf9', minHeight: isPopup ? 'auto' : '100vh' }}>

            {/* Header Section: Ẩn bớt nếu là Popup */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isPopup ? '20px' : '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {!isPopup && (
                        <button
                            onClick={() => navigate(-1)}
                            style={{ padding: '8px', border: 'none', background: 'white', cursor: 'pointer', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                        >
                            <HiOutlineArrowLeft size={24} color="#5f3824" />
                        </button>
                    )}
                    <div>
                        <h2 style={{ fontSize: isPopup ? '20px' : '24px', fontWeight: '900', fontStyle: 'italic', color: '#452111', margin: 0 }}>
                            Campaign <span style={{ fontWeight: '200', fontStyle: 'normal' }}>Performance</span>
                        </h2>
                        <p style={{ fontSize: '12px', fontWeight: '700', color: '#aaa', margin: 0, textTransform: 'uppercase' }}>
                            ID: #{activeId} • Real-time Insights
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleExport}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#1a1a1a',
                        color: 'white',
                        padding: '10px 18px',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '900',
                        fontSize: '11px',
                        marginRight: '50px'
                    }}
                >
                    <HiOutlineArrowDownTray size={16} /> EXPORT
                </button>
            </div>

            {/* Top Cards Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', // Giảm min-width xuống một chút để đủ chỗ cho 5 thẻ
                gap: '15px',
                marginBottom: '30px'
            }}>
                <AnalyticsCard
                    label="Total Claims"
                    value={analytics?.totalUses?.toLocaleString() || 0}
                    icon={<HiOutlineTicket style={{ color: '#2563eb' }} />}
                    trend="Active"
                />

                <AnalyticsCard
                    label="Conversion"
                    value={`${(analytics?.conversionRate || 0).toFixed(1)}%`}
                    icon={<HiOutlineArrowTrendingUp style={{ color: '#16a34a' }} />}
                    trend="Live"
                />

                <AnalyticsCard
                    label="Revenue Impact"
                    value={`$${(analytics?.totalRevenueGenerated || 0).toLocaleString()}`}
                    icon={<HiOutlineCurrencyDollar style={{ color: '#d97706' }} />}
                    trend="Financial"
                />

                <AnalyticsCard
                    label="Unique Reach"
                    value={analytics?.customerMetrics?.uniqueCustomers?.toLocaleString() || 0}
                    icon={<HiOutlineUsers style={{ color: '#7c3aed' }} />}
                    trend="Customers"
                />
                <AnalyticsCard
                    label="ROI"
                    value={`${(analytics?.roi || 0).toFixed(1)}%`}
                    icon={<HiOutlineArrowTrendingUp style={{ color: '#059669' }} />} // Bạn có thể đổi icon khác nếu muốn
                    trend="Return"
                />
            </div>

            {/* Main Table Content */}
            <div style={{
                backgroundColor: 'white',
                padding: isPopup ? '20px' : '32px',
                borderRadius: '24px',
                border: '1px solid #eee',
                marginBottom: '30px'
            }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#1a1a1a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '3px', height: '18px', backgroundColor: '#78350f' }}></div>
                    Usage History Details
                </h3>

                {usageData.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '10px 20px', color: '#bbb', fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', textAlign: 'left' }}>Date</th>
                                    <th style={{ padding: '10px 20px', color: '#bbb', fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', textAlign: 'right' }}>Usage Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usageData.map((item, index) => (
                                    <tr key={index}>
                                        <td style={{ padding: '15px 20px', backgroundColor: '#f9f9f9', borderRadius: '12px 0 0 12px', fontSize: '14px', fontWeight: '600' }}>
                                            {item.date}
                                        </td>
                                        <td style={{ padding: '15px 20px', backgroundColor: '#f9f9f9', borderRadius: '0 12px 12px 0', textAlign: 'right', color: '#78350f', fontSize: '16px', fontWeight: '900' }}>
                                            {item.count || item.usageCount || 0}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#ccc', border: '1px dashed #eee', borderRadius: '20px' }}>
                        No usage logs recorded yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default PromotionAnalyticsPage;