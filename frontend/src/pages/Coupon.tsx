import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import "../admin.css";
// Đảm bảo đại ca đã import bootstrap-icons ở đây hoặc ở file main/index
import "bootstrap-icons/font/bootstrap-icons.css";

// --- 1. INTERFACES ---
interface CouponData {
    id: number;
    promotionId: number;
    code: string;
    status: "ACTIVE" | "INACTIVE" | "EXPIRED";
    times_used: number;
    remaining_uses: number | "UNLIMITED";
}

interface PromotionData {
    id: number;
    name: string;
}

interface CouponFormState {
    code: string;
    promotionId: number | "";
    maxUses: number | "";
    status: "ACTIVE" | "INACTIVE" | "EXPIRED";
}

interface BulkCreateCouponRequest {
    promotionId: number | "";
    quantity: number | "";
    prefix: string;
    maxUsesPerCode: number | "";
}

interface PaginationProps {
    current: number;
    total: number;
    onPageChange: (page: number) => void;
}

// --- 2. CONFIG & COLORS ---
const COLORS = {
    primary: "#5d4037",
    secondary: "#795548",
    text: "#3e2723",
    lightText: "#a1887f",
    bgModal: "#ffffff",
    danger: "#d32f2f"
};

const API_BASE_URL = "/api-engagement";

const Coupon: React.FC = () => {
    const [coupons, setCoupons] = useState<CouponData[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [pageInfo, setPageInfo] = useState({ current: 0, total: 1 });
    const [promotions, setPromotions] = useState<PromotionData[]>([]);

    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<CouponFormState>({
        code: "", promotionId: "", maxUses: "", status: "ACTIVE"
    });

    const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
    const [bulkFormData, setBulkFormData] = useState<BulkCreateCouponRequest>({
        promotionId: "", quantity: "", prefix: "", maxUsesPerCode: "",
    });

    const [deactivateTarget, setDeactivateTarget] = useState<{id: number, code: string} | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // --- 3. API CALLS ---

    const fetchCoupons = useCallback(async (page: number = 0) => {
        setLoading(true);
        const token = localStorage.getItem("accessToken");
        try {
            const res = await axios.get(`${API_BASE_URL}/coupon`, {
                params: { page, size: 10 },
                headers: { Authorization: `Bearer ${token}` }
            });
            setCoupons(res.data?.content || []);
            setPageInfo({ current: res.data.number, total: res.data.totalPages });
        } catch (error) {
            toast.error("Failed to load coupon list.");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPromotions = async () => {
        const token = localStorage.getItem("accessToken");
        try {
            const res = await axios.get(`${API_BASE_URL}/coupon/promotion`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data?.content || res.data?.data || res.data || [];
            setPromotions(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error loading promotions.");
        }
    };

    useEffect(() => {
        fetchCoupons();
        fetchPromotions();
    }, [fetchCoupons]);

    const handleDeactivate = async () => {
        if (!deactivateTarget) return;
        setIsSubmitting(true);
        const token = localStorage.getItem("accessToken");
        try {
            await axios.post(`${API_BASE_URL}/coupon/${deactivateTarget.id}/deactivate`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Coupon ${deactivateTarget.code} deactivated.`);
            setDeactivateTarget(null);
            fetchCoupons(pageInfo.current);
        } catch (error) {
            toast.error("Deactivation failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const token = localStorage.getItem("accessToken");
        try {
            const payload = {
                code: formData.code.toUpperCase(),
                promotionId: editingId ? undefined : Number(formData.promotionId),
                maxUses: formData.maxUses === "" ? null : Number(formData.maxUses),
                status: editingId ? formData.status : undefined
            };

            if (editingId) {
                await axios.post(`${API_BASE_URL}/coupon/${editingId}/update`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success("Updated successfully.");
            } else {
                await axios.post(`${API_BASE_URL}/coupon`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success("New coupon created.");
            }
            setIsModalOpen(false);
            setEditingId(null);
            fetchCoupons(editingId ? pageInfo.current : 0);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Action failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const token = localStorage.getItem("accessToken");
        try {
            await axios.post(`${API_BASE_URL}/coupon/bulk`, {
                promotionId: Number(bulkFormData.promotionId),
                quantity: Number(bulkFormData.quantity),
                prefix: bulkFormData.prefix.toUpperCase(),
                maxUsesPerCode: bulkFormData.maxUsesPerCode === "" ? null : Number(bulkFormData.maxUsesPerCode),
            }, { headers: { Authorization: `Bearer ${token}` } });

            toast.success("Bulk creation request sent.");
            setIsBulkModalOpen(false);
            fetchCoupons(0);
        } catch (error) {
            toast.error("Error during bulk creation.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const CompactPagination: React.FC<PaginationProps> = ({ current, total, onPageChange }) => {
        if (total <= 1) return null;
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '20px 0' }}>
                <button disabled={current === 0} onClick={() => onPageChange(current - 1)} className="icon-btn" style={{ color: COLORS.primary }}>
                    <i className="bi bi-chevron-left"></i>
                </button>
                <span style={{ fontSize: '13px', fontWeight: '600', color: COLORS.text }}>{current + 1} / {total}</span>
                <button disabled={current === total - 1} onClick={() => onPageChange(current + 1)} className="icon-btn" style={{ color: COLORS.primary }}>
                    <i className="bi bi-chevron-right"></i>
                </button>
            </div>
        );
    };

    return (
        <div className="admin-container">
            <header className="admin-header">
                <div>
                    <h1 style={{ color: COLORS.text }}>Coupon Management</h1>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="admin-primary-btn" style={{ backgroundColor: COLORS.secondary, color: "#fff" }} onClick={() => setIsBulkModalOpen(true)}>
                        <i className="bi bi-layers-fill me-2"></i> Bulk Generate
                    </button>
                    <button className="admin-primary-btn" style={{ backgroundColor: COLORS.primary, color: "#fff" }} onClick={() => { setEditingId(null); setFormData({code:"", promotionId:"", maxUses:"", status: "ACTIVE"}); setIsModalOpen(true); }}>
                        <i className="bi bi-plus-circle-fill me-2"></i> Generate Coupon
                    </button>
                </div>
            </header>

            <div className="table-responsive" style={{ marginTop: "20px" }}>
                {loading ? <p style={{ textAlign: "center", color: COLORS.secondary, padding: "20px" }}>Loading...</p> : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Status</th>
                                <th>Times Used</th>
                                <th>Remaining</th>
                                <th style={{ textAlign: "center" }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coupons.length === 0 ? <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px", color: COLORS.lightText }}>No Data.</td></tr> : (
                                coupons.map((c) => (
                                    <tr key={c.id}>
                                        <td style={{ fontWeight: "700", color: COLORS.text }}>{c.code}</td>
                                        <td><span style={{ color: c.status === "ACTIVE" ? "#2e7d32" : COLORS.danger, fontWeight: "600" }}>{c.status}</span></td>
                                        <td>{c.times_used}</td>
                                        <td><span style={{ padding: "2px 8px", backgroundColor: c.remaining_uses === "UNLIMITED" ? "#efebe9" : "transparent", borderRadius: "10px", color: COLORS.primary }}>{c.remaining_uses}</span></td>
                                        <td className="action-buttons" style={{ textAlign: "center" }}>
                                            <button className="edit-btn" onClick={() => {
                                                setEditingId(c.id);
                                                setFormData({ code: c.code, promotionId: c.promotionId, maxUses: c.remaining_uses === "UNLIMITED" ? "" : (Number(c.remaining_uses) + c.times_used), status: c.status });
                                                setIsModalOpen(true);
                                            }}>
                                                <i className="bi bi-pencil-square"></i>
                                            </button>
                                            <button className="delete-btn" style={{ backgroundColor: COLORS.danger }} onClick={() => setDeactivateTarget({ id: c.id, code: c.code })}>
                                                <i className="bi bi-trash-fill"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <CompactPagination current={pageInfo.current} total={pageInfo.total} onPageChange={fetchCoupons} />

            {/* ADD/EDIT MODAL */}
            {isModalOpen && (
                <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ backgroundColor: COLORS.bgModal }}>
                        <div className="admin-modal-header">
                            <h2 style={{ color: COLORS.text }}>{editingId ? "Update Coupon" : "Create Coupon"}</h2>
                            <button className="icon-btn" onClick={() => setIsModalOpen(false)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <form className="admin-modal-body" onSubmit={handleSaveCoupon}>
                            <div className="admin-form-group">
                                <label className="admin-label">Coupon Code</label>
                                <input className="admin-input" placeholder="Leave blank for auto-generation" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-label">Promotion {editingId && "(Locked)"}</label>
                                <select className="admin-input" value={formData.promotionId} disabled={!!editingId} onChange={e => setFormData({ ...formData, promotionId: e.target.value === "" ? "" : Number(e.target.value) })} required={!editingId}>
                                    <option value="">-- Select a promotion --</option>
                                    {promotions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-label">Max Usage</label>
                                <input type="number" className="admin-input" placeholder="Leave blank for unlimited" value={formData.maxUses} onChange={e => setFormData({ ...formData, maxUses: e.target.value === "" ? "" : Number(e.target.value) })} />
                            </div>
                            {editingId && (
                                <div className="admin-form-group">
                                    <label className="admin-label">Status</label>
                                    <select className="admin-input" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                        <option value="EXPIRED">EXPIRED</option>
                                    </select>
                                </div>
                            )}
                            <div style={{ textAlign: "right", marginTop: '20px', borderTop: "1px solid #f1f1f1", paddingTop: "15px" }}>
                                <button type="button" className="admin-text-btn" style={{ marginRight: 15 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="admin-primary-btn" style={{ backgroundColor: COLORS.primary, color: "#fff" }} disabled={isSubmitting}>{isSubmitting ? "Processing..." : "Save Changes"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* BULK MODAL */}
            {isBulkModalOpen && (
                <div className="admin-modal-backdrop" onClick={() => setIsBulkModalOpen(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ backgroundColor: COLORS.bgModal }}>
                        <div className="admin-modal-header">
                            <h2 style={{ color: COLORS.text }}><i className="bi bi-box-seam me-2"></i>Bulk Generate</h2>
                            <button className="icon-btn" onClick={() => setIsBulkModalOpen(false)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <form className="admin-modal-body" onSubmit={handleBulkCreate}>
                            <div className="admin-form-group">
                                <label className="admin-label">Promotion *</label>
                                <select className="admin-input" value={bulkFormData.promotionId} onChange={e => setBulkFormData({ ...bulkFormData, promotionId: e.target.value === "" ? "" : Number(e.target.value) })} required>
                                    <option value="">-- Select a promotion --</option>
                                    {promotions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="admin-form-group" style={{ flex: 1 }}>
                                    <label className="admin-label">Quantity *</label>
                                    <input type="number" className="admin-input" value={bulkFormData.quantity} onChange={e => setBulkFormData({ ...bulkFormData, quantity: e.target.value === "" ? "" : Number(e.target.value) })} min="1" required />
                                </div>
                                <div className="admin-form-group" style={{ flex: 1 }}>
                                    <label className="admin-label">Prefix</label>
                                    <input className="admin-input" placeholder="e.g., TET2026" value={bulkFormData.prefix} onChange={e => setBulkFormData({ ...bulkFormData, prefix: e.target.value })} />
                                </div>
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-label">Max Uses Per Code</label>
                                <input type="number" className="admin-input" value={bulkFormData.maxUsesPerCode} onChange={e => setBulkFormData({ ...bulkFormData, maxUsesPerCode: e.target.value === "" ? "" : Number(e.target.value) })} />
                            </div>
                            <div style={{ textAlign: "right", marginTop: '20px', borderTop: "1px solid #f1f1f1", paddingTop: "15px" }}>
                                <button type="button" className="admin-text-btn" style={{ marginRight: 15 }} onClick={() => setIsBulkModalOpen(false)}>Cancel</button>
                                <button type="submit" className="admin-primary-btn" style={{ backgroundColor: COLORS.primary, color: "#fff" }} disabled={isSubmitting}>{isSubmitting ? "Processing..." : "Start Generating"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DEACTIVATE CONFIRMATION MODAL */}
            {deactivateTarget && (
                <div className="admin-modal-backdrop" onClick={() => setDeactivateTarget(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ backgroundColor: COLORS.bgModal, maxWidth: "400px" }}>
                        <div className="admin-modal-header" style={{ borderBottom: 'none' }}>
                            <h2 style={{ color: COLORS.danger }}><i className="bi bi-exclamation-triangle-fill me-2"></i>Confirmation</h2>
                            <button className="icon-btn" onClick={() => setDeactivateTarget(null)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="admin-modal-body" style={{ textAlign: 'center', padding: "20px 0" }}>
                            <p>Are you sure you want to deactivate the coupon: <br/><strong>[{deactivateTarget.code}]</strong>?</p>
                        </div>
                        <div style={{ textAlign: "right", borderTop: "1px solid #f1f1f1", paddingTop: "15px" }}>
                            <button type="button" className="admin-text-btn" style={{ marginRight: 15 }} onClick={() => setDeactivateTarget(null)}>Go Back</button>
                            <button type="button" className="admin-primary-btn" style={{ backgroundColor: COLORS.danger, color: "#fff" }} disabled={isSubmitting} onClick={handleDeactivate}>
                                {isSubmitting ? "Processing..." : "Confirm Deactivate"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Coupon;