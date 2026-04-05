import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { promotionApi, segmentApi } from "../services/api";
import { toast } from "react-toastify";
import PromotionForm from "../components/PromotionForm";
import PromotionTable from "../components/PromotionTable";
import "../admin.css";
import Swal from "sweetalert2";
function formatDateTime(v) {
    if (v == null) return "—";
    if (typeof v === "string") {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
    }
    if (Array.isArray(v) && v.length >= 3) {
        const [y, m, d, h = 0, min = 0, sec = 0] = v;
        return new Date(y, m - 1, d, h, min, sec).toLocaleString();
    }
    return String(v);
}

function normalizePreviewReach(raw) {
    if (!raw || typeof raw !== "object") return null;
    const total = raw.total_customers ?? raw.totalCustomers;
    const note = raw.counting_note ?? raw.countingNote ?? "";
    const mode = raw.mode;
    const segments = Array.isArray(raw.segments) ? raw.segments : [];
    return {
        totalCustomers: total,
        mode,
        countingNote: note,
        segments: segments.map((s) => ({
            id: s.segment_id ?? s.segmentId,
            name: s.name ?? "—",
            description: s.description ?? "",
            count: s.customer_count ?? s.customerCount,
        })),
    };
}

function TargetSegmentRow({ row, onRemove, busy }) {
    const id = row.segment_id ?? row.segmentId;
    const count = row.customer_count ?? row.customerCount;
    return (
        <tr>
            <td style={{ padding: "10px 12px", fontWeight: 700 }}>{id}</td>
            <td style={{ padding: "10px 12px" }}>{row.name ?? "—"}</td>
            <td style={{ padding: "10px 12px", color: "#57534e", fontSize: 13, maxWidth: 200 }}>
                {row.description ? (
                    <span title={row.description}>{row.description.length > 80 ? `${row.description.slice(0, 80)}…` : row.description}</span>
                ) : (
                    "—"
                )}
            </td>
            <td style={{ padding: "10px 12px", textAlign: "right" }}>{count != null ? count.toLocaleString() : "—"}</td>
            <td style={{ padding: "10px 12px" }}>
                <button
                    type="button"
                    className="admin-text-btn"
                    style={{ color: "#b45309", fontWeight: 700 }}
                    disabled={busy}
                    onClick={() => onRemove(id)}
                >
                    Delete
                </button>
            </td>
        </tr>
    );
}
function PromotionManagement() {
    const [promotions, setPromotions] = useState([]);
    const [editingPromo, setEditingPromo] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);

    // =========================
    // Pagination & Filters
    // =========================
    const [pageInput, setPageInput] = useState(0);
    const [sizeInput, setSizeInput] = useState(10);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [isViewOnly, setIsViewOnly] = useState(false);

    const [filterStatus, setFilterStatus] = useState("");
    const [filterType, setFilterType] = useState("");
    const navigate = useNavigate();
    const [error, setError] = useState("");

    const [modalPromotion, setModalPromotion] = useState(null);
    const [targets, setTargets] = useState(null);
    const [targetsLoading, setTargetsLoading] = useState(false);
    const [segmentCatalog, setSegmentCatalog] = useState([]);
    const [assignMode, setAssignMode] = useState("INCLUSIVE");
    const [pickedIds, setPickedIds] = useState(() => new Set());
    const [modalError, setModalError] = useState("");
    const [modalOk, setModalOk] = useState("");
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState(false);
    const [successPopup, setSuccessPopup] = useState({ show: false, message: "" });

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        if (!token) {
            navigate("/", { replace: true });
        }
    }, [navigate]);

    const openTargetingModal = async (promo) => {
        setModalPromotion(promo);
        setTargets(null);
        setModalError("");
        setModalOk("");
        setPreview(null);
        setAssignMode(promo.targetSegmentMode || "INCLUSIVE");
        setPickedIds(new Set());
        setTargetsLoading(true);
        try {
            const [tRes, segRes] = await Promise.all([
                promotionApi.getTargetSegments(promo.id),
                segmentApi.getSegments(1, 200),
            ]);
            setTargets(tRes.data);
            setSegmentCatalog(segRes.data?.data || []);
        } catch (err) {
            setModalError(err?.response?.data?.message || err?.message || "un load setting segment.");
        } finally {
            setTargetsLoading(false);
        }
    };

    const closeModal = () => {
        setModalPromotion(null);
        setTargets(null);
        setPreview(null);
        setModalError("");
        setModalOk("");
    };

    const refreshTargets = async (promotionId) => {
        const tRes = await promotionApi.getTargetSegments(promotionId);
        setTargets(tRes.data);
        await fetchPromotions(page, size, filterStatus, filterType);
    };

    const handleRefreshTargetSegmentsOnly = async () => {
        if (!modalPromotion) return;
        setBusy(true);
        setModalError("");
        try {
            await refreshTargets(modalPromotion.id);
            // setModalOk("Have done fresh data.");
        } catch (err) {
            setModalError(err?.response?.data?.message || err?.message || "Refresh data fail.");
        } finally {
            setBusy(false);
        }
    };

    const togglePick = (segmentId) => {
        const idStr = String(segmentId);
        setPickedIds((prev) => {
            const next = new Set(prev);
            if (next.has(idStr)) next.delete(idStr);
            else next.add(idStr);
            return next;
        });
    };
 const showSuccess = (msg) => {
        setSuccessPopup({ show: true, message: msg });
        setTimeout(() => setSuccessPopup({ show: false, message: "" }), 1500);
    };
    const handleAssign = async () => {
        if (!modalPromotion) return;
        const segment_ids = [...pickedIds];
        if (segment_ids.length === 0) {
            setModalError("Select least one segment asign.");
            return;
        }
        setBusy(true);
        setModalError("");
        setModalOk("");
        try {
            await promotionApi.assignTargetSegments(modalPromotion.id, {
                segment_ids,
                mode: assignMode,
            });
            // setModalOk("Đã cập nhật segment targeting.");
            showSuccess("Assign segement success! 🔄");
            setPickedIds(new Set());
            await refreshTargets(modalPromotion.id);
        } catch (err) {
            setModalError(err?.response?.data?.message || err?.message || "Assign segment fail.");
        } finally {
            setBusy(false);
        }
    };

    const handleRemoveSegment = async (segmentId) => {
        if (!modalPromotion) return;
        setBusy(true);
        setModalError("");
        setModalOk("");
        try {
            await promotionApi.removeTargetSegment(modalPromotion.id, segmentId);
            // setModalOk("Đã xóa segment khỏi promotion.");
            showSuccess("Delete segement in promotion success");
            await refreshTargets(modalPromotion.id);
        } catch (err) {
            setModalError(err?.response?.data?.message || err?.message || "Xóa segment thất bại.");
        } finally {
            setBusy(false);
        }
    };

    const handlePreview = async () => {
        if (!modalPromotion) return;
        setBusy(true);
        setModalError("");
        try {
            const res = await promotionApi.previewReach(modalPromotion.id);
            setPreview(res.data);
        } catch (err) {
            setModalError(err?.response?.data?.message || err?.message || "Preview reach thất bại.");
        } finally {
            setBusy(false);
        }
    };

    const segmentIdList =
        targets?.segment_ids ??
        targets?.segmentIds ??
        [];
    const assignedIdSet = new Set(segmentIdList.map((x) => String(x)));
    const previewUi = normalizePreviewReach(preview);

    // =========================
    // Fetch Data
    // =========================
    useEffect(() => {
        fetchPromotions(page, size, filterStatus, filterType);
    }, [page, size, filterStatus, filterType]);

    const fetchPromotions = async (p, s, status, type) => {
        try {
            setLoading(true);
            const res = await promotionApi.getPromotions(p, s, status, type);
            const data = res?.data?.content || res?.content || [];
            setPromotions(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load promotions");
        } finally {
            setLoading(false);
        }
    };

    const applyPagination = () => {
        const p = Math.max(0, parseInt(pageInput, 10) || 0);
        const s = Math.max(1, parseInt(sizeInput, 10) || 10);
        setPage(p);
        setSize(s);
    };

    // =========================
    // CRUD Actions
    // =========================
    const handleCreate = async (data) => {
        try {
            await promotionApi.createPromotion(data);
            toast.success("Promotion created successfully!");
            fetchPromotions(page, size, filterStatus, filterType);
            setShowForm(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create promotion");
        }
    };

    const handleUpdate = async (data) => {
        try {
            await promotionApi.updatePromotion(editingPromo.id, data);
            toast.success("Promotion updated successfully!");
            fetchPromotions(page, size, filterStatus, filterType);
            setShowForm(false);
            setEditingPromo(null);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update promotion");
        }
    };

    const handleDelete = async (id) => {
        // Thay thế window.confirm bằng SweetAlert2 popup
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this promotion!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!"
        });

        if (result.isConfirmed) {
            try {
                await promotionApi.deletePromotion(id);
                Swal.fire("Deleted!", "Promotion has been deleted.", "success");
                fetchPromotions(page, size, filterStatus, filterType);
            } catch (error) {
                toast.error(error.response?.data?.message || "Failed to delete promotion");
            }
        }
    };

    const handleChangeStatus = async (id, newStatus) => {
        const result = await Swal.fire({
            title: `Change status to ${newStatus}?`,
            text: `Are you sure you want to update this promotion to ${newStatus}?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#28a745",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Yes, change it!"
        });

        if (result.isConfirmed) {
            try {
                await promotionApi.changeStatus(id, newStatus);
                Swal.fire("Success!", `Status updated to ${newStatus}.`, "success");
                fetchPromotions(page, size, filterStatus, filterType);

                setShowForm(false);
                setEditingPromo(null);
            } catch (error) {
                toast.error(error.response?.data?.message || "Error when changing state");
            }
        }
    };

    const handleViewDetails = (promo) => {
        setEditingPromo(promo);
        setIsViewOnly(true);
        setShowForm(true);
    };


    if (loading) {
        return <div className="admin-container">Loading data...</div>;
    }

    return (
        <div className="admin-container">
            <h2>Promotion Management</h2>
  {/* SUCCESS POPUP */}
            {successPopup.show && (
                <div className="modal-overlay success-overlay">
                    <div className="success-popup">
                        <div className="success-icon-circle"><i className="fas fa-check"></i></div>
                        <h4>{successPopup.message}</h4>
                        <div className="success-progress-bar"></div>
                    </div>
                </div>
            )}
            {/* TOOLBAR: PAGINATION & FILTERS */}
            <div style={{ display: "flex", gap: "15px", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>

                {/* Status Filter */}
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "5px" }}>
                    <option value="">-- All Statuses --</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="INACTIVE">INACTIVE</option>
                </select>

                {/* Type Filter */}
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: "5px" }}>
                    <option value="">-- All Types --</option>
                    <option value="PERCENTAGE_DISCOUNT">Percentage Discount</option>
                    <option value="FIXED_DISCOUNT">Fixed Discount</option>
                    <option value="BUY_X_GET_Y">Buy X Get Y</option>
                    <option value="FREE_SHIPPING">Free Shipping</option>
                    <option value="BUNDLE">Bundle (Combo)</option>
                </select>

                {/* Pagination */}
                <label>
                    Page:
                    <input
                        type="number"
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        min={0}
                        style={{ width: "60px", margin: "0 10px 0 5px" }}
                    />
                </label>
                <label>
                    Size:
                    <input
                        type="number"
                        value={sizeInput}
                        onChange={(e) => setSizeInput(e.target.value)}
                        min={1}
                        style={{ width: "60px", margin: "0 10px 0 5px" }}
                    />
                </label>
                <button onClick={applyPagination} style={{ padding: "5px 10px", cursor: "pointer" }}>Filter & Paginate</button>

                {/* Create Button */}
                <button
                    className="create-btn"
                    style={{ marginLeft: "auto" }}
                    onClick={() => {
                        if (showForm) {
                            if (isViewOnly || editingPromo) {
                                setEditingPromo(null);
                                setIsViewOnly(false);
                            } else {
                                setShowForm(false);
                            }
                        } else {
                            setEditingPromo(null);
                            setIsViewOnly(false);
                            setShowForm(true);
                        }
                    }}
                >
                    {showForm && !isViewOnly && !editingPromo ? "Close Form" : "Create Promotion"}
                </button>
            </div>

            {/* FORM AREA */}
            {showForm && (
                <div className="card shadow-sm mb-4 p-3">
                    <h4 className="mb-3">
                        {isViewOnly ? "" : editingPromo ? "" : ""}
                    </h4>
                    <PromotionForm
                        onSave={editingPromo ? handleUpdate : handleCreate}
                        initialData={editingPromo}
                        isViewOnly={isViewOnly}
                        onStatusChange={handleChangeStatus}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingPromo(null);
                        }}
                    />
                </div>
            )}
            {/* DATA TABLE AREA */}
            <PromotionTable
                promotions={promotions}
                onView={handleViewDetails}
                onEdit={(promo) => {
                    setEditingPromo(promo);
                    setIsViewOnly(false);
                    setShowForm(true);
                }}
                onDelete={handleDelete}
                onChangeStatus={handleChangeStatus}
                onSegmentTargeting={openTargetingModal}
            />

            {false && <div className="admin-container">
                <div
                    className="form-card"
                    style={{
                        padding: 22,
                        borderRadius: 14,
                        marginBottom: 18,
                        boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
                    }}
                >
                    <h1 style={{ fontSize: 30, margin: 0, color: "#111827" }}>Promotions</h1>
                    <p style={{ fontSize: 15, margin: "6px 0 0", color: "#6b7280" }}>
                        List promotion and target segement
                    </p>
                </div>

                {error && (
                    <div style={{ marginBottom: 12, color: "#b91c1c", fontWeight: 600 }}>{error}</div>
                )}

                <div
                    className="table-responsive"
                    style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 6px 18px rgba(15,23,42,0.05)" }}
                >
                    <table className="admin-table" style={{ fontSize: 15 }}>
                        <thead style={{ background: "#fef3c7" }}>
                        <tr>
                            <th style={{ padding: "14px 12px" }}>ID</th>
                            <th style={{ padding: "14px 12px" }}>Name</th>
                            <th style={{ padding: "14px 12px" }}>Status</th>
                            <th style={{ padding: "14px 12px" }}>Type</th>
                            <th style={{ padding: "14px 12px" }}>Start</th>
                            <th style={{ padding: "14px 12px" }}>End</th>
                            <th style={{ padding: "14px 12px" }}>Mode / Segments</th>
                            <th style={{ padding: "14px 12px" }}>Action</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={8} style={{ textAlign: "center", padding: 18 }}>
                                    Loading...
                                </td>
                            </tr>
                        )}
                        {!loading && promotions.length === 0 && (
                            <tr>
                                <td colSpan={8} style={{ textAlign: "center", opacity: 0.7, padding: 18 }}>
                                    Chưa có promotion.
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            promotions.map((p) => (
                                <tr key={p.id}>
                                    <td style={{ padding: "12px 12px" }}>{p.id}</td>
                                    <td style={{ padding: "12px 12px", fontWeight: 600 }}>{p.name}</td>
                                    <td style={{ padding: "12px 12px" }}>{p.status}</td>
                                    <td style={{ padding: "12px 12px" }}>{p.type}</td>
                                    <td style={{ padding: "12px 12px" }}>{formatDateTime(p.startDate)}</td>
                                    <td style={{ padding: "12px 12px" }}>{formatDateTime(p.endDate)}</td>
                                    <td style={{ padding: "12px 12px", fontSize: 13 }}>
                                        <div>{p.targetSegmentMode}</div>
                                        <div style={{ color: "#6b7280", maxWidth: 220, wordBreak: "break-all" }}>
                                            {p.targetSegmentIds || " chưa cài đặt"}
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px 12px" }}>
                                        <button
                                            type="button"
                                            className="admin-primary-btn"
                                            style={{ padding: "6px 12px", fontSize: 13 }}
                                            onClick={() => openTargetingModal(p)}
                                        >
                                            Segment targeting
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>}

            {modalPromotion && (
                <div className="admin-modal-backdrop" onClick={closeModal} role="presentation">
                    <div
                        className="admin-modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: 820, maxHeight: "90vh", overflow: "auto" }}
                    >
                        <div className="admin-modal-header">
                            <h2 style={{ margin: 0, color: "#92400e" }}>
                                Target segments — {modalPromotion.name}{" "}
                                <small style={{ fontWeight: 400, color: "#78716c" }}>(ID {modalPromotion.id})</small>
                            </h2>
                        </div>
                        <div className="admin-modal-body">
                            {modalError && (
                                <div style={{ marginBottom: 10, color: "#b91c1c", fontWeight: 600 }}>{modalError}</div>
                            )}
                            {modalOk && (
                                <div style={{ marginBottom: 10, color: "#15803d", fontWeight: 600 }}>{modalOk}</div>
                            )}
                            {targetsLoading && <p>Loading segment…</p>}
                            {!targetsLoading && targets && (
                                <>
                                    <section
                                        style={{
                                            marginBottom: 22,
                                            padding: 16,
                                            background: "#fffbeb",
                                            borderRadius: 12,
                                            border: "1px solid #fcd34d",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>Current setting</div>
                                                <div style={{ fontSize: 14, color: "#44403c", marginTop: 6 }}>
                                                    <strong>Current Mode:</strong>{" "}
                                                    <span style={{ fontFamily: "monospace", background: "#fef3c7", padding: "2px 8px", borderRadius: 6 }}>
                                                        {targets.mode || "—"}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className="admin-secondary-btn"
                                                disabled={busy}
                                                onClick={handleRefreshTargetSegmentsOnly}
                                            >
                                                Refresh data
                                            </button>
                                        </div>
                                        <div style={{ marginTop: 12 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: "#78716c", marginBottom: 6 }}>Segment đã gán</div>
                                            {segmentIdList.length === 0 ? (
                                                <span style={{ color: "#78716c" }}>Un — promotion apply limit target.</span>
                                            ) : (
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                                    {segmentIdList.map((id) => (
                                                        <span
                                                            key={id}
                                                            style={{
                                                                fontFamily: "monospace",
                                                                fontSize: 13,
                                                                background: "#fff",
                                                                border: "1px solid #e7e5e4",
                                                                padding: "4px 10px",
                                                                borderRadius: 8,
                                                            }}
                                                        >
                                                            {id}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ marginTop: 14, overflow: "auto" }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: "#78716c", marginBottom: 8 }}>Segement detail</div>
                                            <table className="admin-table" style={{ fontSize: 14, background: "#fff", margin: 0 }}>
                                                <thead>
                                                    <tr style={{ background: "#fef9c3" }}>
                                                        <th style={{ padding: "8px 12px" }}>ID</th>
                                                        <th style={{ padding: "8px 12px" }}>Name</th>
                                                        <th style={{ padding: "8px 12px" }}>Description</th>
                                                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Number customer</th>
                                                        <th style={{ padding: "8px 12px" }}>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(targets.segments || []).length === 0 && segmentIdList.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} style={{ padding: 12, color: "#78716c" }}>
                                                                Un assign segment.
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {(targets.segments || []).map((s) => (
                                                        <TargetSegmentRow key={s.segment_id ?? s.segmentId} row={s} onRemove={handleRemoveSegment} busy={busy} />
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>

                                    <h3 style={{ fontSize: 16, color: "#44403c", marginTop: 0 }}>asign more segment</h3>
                                    <div className="admin-form-group">
                                        <label className="admin-label">Mode</label>
                                        <select
                                            className="admin-input"
                                            value={assignMode}
                                            onChange={(e) => setAssignMode(e.target.value)}
                                        >
                                            <option value="INCLUSIVE">INCLUSIVE — only customer ins egment</option>
                                            <option value="EXCLUSIVE">EXCLUSIVE — without customer in segment</option>
                                        </select>
                                    </div>
                                    <div
                                        className="admin-form-group"
                                        style={{ maxHeight: 200, overflow: "auto", border: "1px solid #e7e5e4", borderRadius: 8, padding: 10 }}
                                    >
                                        <div className="admin-label" style={{ marginBottom: 8 }}>
                                            Select segment
                                        </div>
                                        {segmentCatalog.map((seg) => {
                                            const sid = seg.segmentId;
                                            const idStr = String(sid);
                                            const already = assignedIdSet.has(idStr);
                                            return (
                                                <label
                                                    key={sid}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 8,
                                                        marginBottom: 6,
                                                        opacity: already ? 0.45 : 1,
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={pickedIds.has(idStr)}
                                                        disabled={already || busy}
                                                        onChange={() => togglePick(sid)}
                                                    />
                                                    <span>
                                                        #{sid} {seg.name}{" "}
                                                        {already && <em style={{ color: "#78716c" }}>(Assigned)</em>}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                        {segmentCatalog.length === 0 && (
                                            <span style={{ color: "#78716c" }}>Cann't load segment (need permission SEGMENT:READ).</span>
                                        )}
                                    </div>
                                    <button type="button" className="admin-primary-btn" style={{ marginTop: 12, minWidth: 200 }} disabled={busy} onClick={handleAssign}>
                                        Assigned segement 
                                    </button>

                                    <hr style={{ margin: "20px 0", borderColor: "#e7e5e4" }} />

                                    <section>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                                            <h3 style={{ fontSize: 16, color: "#44403c", margin: 0 }}>Ước lượng phạm vi</h3>
                                            <button type="button" className="admin-secondary-btn" style={{ minWidth: 200 }} disabled={busy} onClick={handlePreview}>
                                                Load check effect data
                                            </button>
                                        </div>
                                        {previewUi && (
                                            <div
                                                style={{
                                                    border: "1px solid #c7d2fe",
                                                    borderRadius: 12,
                                                    overflow: "hidden",
                                                    background: "#eef2ff",
                                                }}
                                            >
                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, padding: 16 }}>
                                                    <div style={{ background: "#fff", borderRadius: 10, padding: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase" }}>Total (effect)</div>
                                                        <div style={{ fontSize: 28, fontWeight: 800, color: "#312e81", marginTop: 4 }}>
                                                            {previewUi.totalCustomers != null ? previewUi.totalCustomers.toLocaleString() : "—"}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Count value target:</div>
                                                    </div>
                                                    <div style={{ background: "#fff", borderRadius: 10, padding: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase" }}>Mode</div>
                                                        <div style={{ fontSize: 18, fontWeight: 700, color: "#1e1b4b", marginTop: 8, fontFamily: "monospace" }}>
                                                            {previewUi.mode || "—"}
                                                        </div>
                                                    </div>
                                                </div>
                                                {previewUi.countingNote && (
                                                    <div
                                                        style={{
                                                            margin: "0 16px 16px",
                                                            padding: 12,
                                                            background: "#fff",
                                                            borderRadius: 8,
                                                            fontSize: 13,
                                                            color: "#4338ca",
                                                            borderLeft: "4px solid #6366f1",
                                                        }}
                                                    >
                                                        <strong>Note count:</strong> {previewUi.countingNote}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </section>
                                </>
                            )}
                        </div>
                        <div style={{ padding: "0 24px 20px", display: "flex", justifyContent: "flex-end" }}>
                            <button type="button" className="admin-secondary-btn" style={{ minWidth: 120 }} onClick={closeModal}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PromotionManagement;