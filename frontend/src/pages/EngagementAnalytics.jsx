import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { promotionAnalyticsApi } from '../services/api';
import LoyaltyReportPage from './LoyaltyReportPage';
import PromotionAnalyticsPage from './PromotionAnalyticsPage';
import {
    RefreshCw,
    ExternalLink,
    Tag,
    ShieldAlert,
    Inbox,
    X
} from 'lucide-react';
import { hasAnyPermission } from '../lib/roleUtils';

const PROMOTION_REPORT_PERMISSIONS = ['PROMOTION:REPORT'];
const LOYALTY_REPORT_PERMISSIONS = ['LOYALTY:REPORT'];

const getStoredProfile = () => {
    const rawProfile = localStorage.getItem('accountProfile');
    if (!rawProfile) {
        return null;
    }

    try {
        return JSON.parse(rawProfile);
    } catch {
        return null;
    }
};

const AccessNotice = ({ title, description }) => (
    <div
        style={{
            backgroundColor: '#fff',
            borderRadius: '24px',
            border: '1px dashed #e8ddd3',
            padding: '30px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            color: '#5f3824'
        }}
    >
        <div
            style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                backgroundColor: '#fcfaf9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}
        >
            <ShieldAlert size={20} />
        </div>
        <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{title}</h3>
            <p style={{ margin: '8px 0 0', color: '#7c6a5b', lineHeight: 1.7 }}>{description}</p>
        </div>
    </div>
);

const EngagementAnalytics = () => {
    const [loading, setLoading] = useState(false);
    const [selectedPromoId, setSelectedPromoId] = useState(null);
    const [promotions, setPromotions] = useState([]);

    const profile = useMemo(() => getStoredProfile(), []);
    const canViewPromotionAnalytics = useMemo(
        () => hasAnyPermission(profile?.permissions, PROMOTION_REPORT_PERMISSIONS),
        [profile]
    );
    const canViewLoyaltyAnalytics = useMemo(
        () => hasAnyPermission(profile?.permissions, LOYALTY_REPORT_PERMISSIONS),
        [profile]
    );
    const canViewAnyAnalytics = canViewPromotionAnalytics || canViewLoyaltyAnalytics;

    const fetchPromotionAnalytics = useCallback(async () => {
        if (!canViewPromotionAnalytics) {
            setPromotions([]);
            return;
        }

        setLoading(true);
        try {
            const promoAnalyticsRes = await promotionAnalyticsApi.getAllAnalytics();
            const rawList = Array.isArray(promoAnalyticsRes) ? promoAnalyticsRes : (promoAnalyticsRes?.content || []);

            const mappedPromotions = rawList.map(item => ({
                id: item.promotionId,
                name: item.promotionName || `Campaign #${item.promotionId}`,
                code: item.promotionCode || 'N/A',
                usageCount: item.totalUses || 0,
                totalDiscount: item.totalDiscountGiven || 0,
                status: item.status || 'ACTIVE'
            }));

            setPromotions(mappedPromotions);
        } catch (error) {
            setPromotions([]);
        } finally {
            setLoading(false);
        }
    }, [canViewPromotionAnalytics]);

    useEffect(() => {
        fetchPromotionAnalytics();
    }, [fetchPromotionAnalytics]);

    const styles = {
        container: { backgroundColor: '#fcfaf8', minHeight: '100vh', padding: '30px 50px', fontFamily: 'system-ui, sans-serif' },
        overlay: {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(26, 13, 1, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '40px'
        },
        modal: {
            backgroundColor: '#fcfaf9',
            width: '100%', maxWidth: '1100px', maxHeight: '90vh',
            borderRadius: '40px', boxShadow: '0 50px 100px rgba(0,0,0,0.3)',
            position: 'relative', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.2)'
        },
        closeBtn: {
            position: 'absolute', top: '25px', right: '25px',
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: '#1a1a1a', color: '#fff', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
        },
        listItem: {
            display: 'grid', gridTemplateColumns: '60px 2fr 1fr 1fr 1fr 50px',
            alignItems: 'center', backgroundColor: '#fff', padding: '15px 25px',
            borderRadius: '18px', border: '1px solid #eee', transition: 'all 0.2s ease', cursor: 'pointer'
        }
    };

    return (
        <div style={styles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: '25px', fontWeight: '900', fontStyle: 'italic', margin: 0 }}>Demand Analytics</h1>
                    <p style={{ margin: '8px 0 0', color: '#7c6a5b' }}>
                        Promotion performance and loyalty reporting now load only for the permissions your account actually has.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={fetchPromotionAnalytics}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: '1px solid #e8ddd3',
                        backgroundColor: '#fff',
                        color: '#5f3824',
                        borderRadius: '999px',
                        padding: '10px 16px',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    <RefreshCw size={16} />
                    Refresh panel
                </button>
            </div>

            {!canViewAnyAnalytics ? (
                <AccessNotice
                    title="Analytics access is not enabled for this account."
                    description="Ask an administrator to grant PROMOTION:REPORT or LOYALTY:REPORT before opening this workspace."
                />
            ) : (
                <>
                    <div style={{ marginBottom: '32px' }}>
                        {canViewLoyaltyAnalytics ? (
                            <div style={{ backgroundColor: '#fff', borderRadius: '35px', padding: '10px', border: '1px solid #eee' }}>
                                <LoyaltyReportPage isEmbedded={true} />
                            </div>
                        ) : (
                            <AccessNotice
                                title="Loyalty reporting is not enabled for this account."
                                description="The command center is hiding loyalty metrics until LOYALTY:REPORT is granted."
                            />
                        )}
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '25px', flexWrap: 'wrap' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '900', fontStyle: 'italic', margin: 0 }}>Campaign Performance</h2>
                            {canViewPromotionAnalytics && (
                                <span style={{ color: '#8b6b55', fontSize: '13px' }}>
                                    {promotions.length} campaign{promotions.length === 1 ? '' : 's'} available
                                </span>
                            )}
                        </div>

                        {!canViewPromotionAnalytics ? (
                            <AccessNotice
                                title="Promotion reporting is not enabled for this account."
                                description="The campaign analytics lane needs PROMOTION:REPORT before it can load usage and revenue signals."
                            />
                        ) : loading ? (
                            <div style={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #eee', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#7b4a2e', fontWeight: 700 }}>
                                <RefreshCw size={18} style={{ animation: 'engagement-spin 1s linear infinite' }} />
                                <style>{'@keyframes engagement-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
                                Syncing campaign analytics...
                            </div>
                        ) : promotions.length === 0 ? (
                            <div style={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #eee', padding: '40px', textAlign: 'center', color: '#8b6b55' }}>
                                <Inbox size={26} style={{ marginBottom: '12px' }} />
                                <div style={{ fontWeight: 700, color: '#5f3824' }}>No promotion analytics available yet.</div>
                                <p style={{ margin: '8px 0 0' }}>Campaign metrics will appear here once qualifying promotions generate report data.</p>
                            </div>
                        ) : (
                            /* SỬA ĐỔI TẠI ĐÂY: Thêm lm-scroll và lm-tbody */
                            <div className="lm-scroll" style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '10px' }}>
                                <div className="lm-tbody" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {promotions.map((promo) => (
                                        <div
                                            key={promo.id}
                                            style={{
                                                ...styles.listItem,
                                                display: 'flex', // Chuyển sang flex để căn chỉnh cột tốt hơn khi dùng scroll
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '15px 25px'
                                            }}
                                            onClick={() => setSelectedPromoId(promo.id)}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'translateX(8px)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                                        >
                                            {/* Cột thông tin tên/code */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 2 }}>
                                                <div style={{ width: '40px', height: '40px', backgroundColor: '#f9f9f9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Tag size={18} color="#78350f" />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: '900' }}>{promo.name}</span>
                                                    <code style={{ fontSize: '0.85em', opacity: 0.7 }}>{promo.code}</code>
                                                </div>
                                            </div>

                                            {/* Cột lượt dùng */}
                                            <div style={{ flex: 1, textAlign: 'center' }}>
                                                <span style={{ color: '#7c6a5b' }}>{promo.usageCount} claims</span>
                                            </div>

                                            {/* Cột giá trị */}
                                            <div style={{ flex: 1, textAlign: 'right', marginRight: '15px' }}>
                                                <span style={{ fontWeight: '900', color: '#78350f' }}>${promo.totalDiscount}</span>
                                            </div>

                                            <ExternalLink size={16} color="#ddd" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {selectedPromoId && canViewPromotionAnalytics && (
                <div style={styles.overlay} onClick={() => setSelectedPromoId(null)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <button style={styles.closeBtn} onClick={() => setSelectedPromoId(null)}>
                            <X size={20} />
                        </button>

                        <div style={{ padding: '20px' }}>
                            <PromotionAnalyticsPage promoId={selectedPromoId} isPopup={true} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EngagementAnalytics;
