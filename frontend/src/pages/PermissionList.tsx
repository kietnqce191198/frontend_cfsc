import { useEffect, useState } from "react";
import axios from "axios";
import PermissionForm from "../components/PermissionForm";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

const API_URL = "/api-auth/api/permissions";

interface Permission {
    id: number;
    name: string;
    resource: string;
    action: string;
    description?: string;
}

export default function PermissionList() {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [editing, setEditing] = useState<Permission | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [showForm, setShowForm] = useState(false);

    // popup states
    const [popupType, setPopupType] = useState<null | "confirm" | "success">(null);
    const [popupMessage, setPopupMessage] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null);

    const getToken = () => localStorage.getItem("accessToken");
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        if (!token) {
            navigate("/", { replace: true });
        }
    }, []);

    /* ===================== LOAD DATA ===================== */
    const loadPermissions = async () => {
        const token = getToken();
        if (!token) {
            console.warn("No access token found");
            return;
        }

        try {
            const res = await axios.get(API_URL, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: {
                    page,
                    size: 8
                }
            });

            const pageData = res.data?.data;

            setPermissions(
                Array.isArray(pageData?.content) ? pageData.content : []
            );

            setTotalPages(pageData?.totalPages ?? 0);

        } catch (err) {
            console.error("Load permissions failed", err);
            setPermissions([]);
            setTotalPages(0);
        }
    };
    useEffect(() => {
        loadPermissions();
    }, [page]);

    /* ===================== AUTO CLOSE SUCCESS ===================== */
    useEffect(() => {
        if (popupType !== "success") return;

        const timer = setTimeout(() => setPopupType(null), 2200);
        return () => clearTimeout(timer);
    }, [popupType]);

    /* ===================== DELETE ===================== */
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;

        try {
            await axios.delete(`${API_URL}/${deleteTarget.id}`, {
                headers: {
                    Authorization: `Bearer ${getToken()}`
                }
            });

            await loadPermissions();

            setPopupMessage("Permission deleted successfully.");
            setPopupType("success");
            setDeleteTarget(null);
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    return (
        <>
            {/* <aside className="admin-sidebar">
                <a href="/" className="admin-logo">
                    Manager
                </a>

                <nav className="admin-nav">
                    <div className="admin-nav-section-label">
                        SYSTEM & STAFF MANAGEMENT
                    </div>

                    <a href="/permissions" className="admin-nav-item active">
                        Permission Management
                    </a>
                </nav>
            </aside> */}

            <div className="admin-page">
                {/* ===== HEADER ===== */}
                <div className="page-header">
                    <div>
                        <h2>Permission Management</h2>
                        <p>Manage system permissions</p>
                    </div>

                    <button
                        className="btn-primary"
                        onClick={() => {
                            setEditing(null);
                            setShowForm(true);
                        }}
                    >
                        + Add new permission
                    </button>
                </div>

                {/* ===== GRID ===== */}
                <div className="permission-grid">
                    {permissions.length === 0 && (
                        <p style={{ opacity: 0.6 }}>No permissions found</p>
                    )}

                    {permissions.map(p => (
                        <div className="permission-card" key={p.id}>
                            <h3>{p.name}</h3>

                            <div className="chip-row">
                                <span className="chip">{p.resource}</span>
                                <span className="chip action">{p.action}</span>
                            </div>

                            <p className="desc">
                                {p.description || "No description"}
                            </p>

                            <div className="card-actions">
                                <button
                                    className="btn-edit"
                                    onClick={() => {
                                        setEditing(p);
                                        setShowForm(true);
                                    }}
                                >
                                    Edit
                                </button>

                                <button
                                    className="btn-delete"
                                    onClick={() => {
                                        setDeleteTarget(p);
                                        setPopupMessage(
                                            "Are you sure you want to delete this permission?"
                                        );
                                        setPopupType("confirm");
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ===== PAGINATION ===== */}
                {totalPages > 1 && (
                    <div className="pagination">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(page - 1)}
                        >
                            ‹ Prev
                        </button>

                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                className={page === i ? "active" : ""}
                                onClick={() => setPage(i)}
                            >
                                {i + 1}
                            </button>
                        ))}

                        <button
                            disabled={page === totalPages - 1}
                            onClick={() => setPage(page + 1)}
                        >
                            Next ›
                        </button>
                    </div>
                )}
            </div >

            {/* ===================== FORM MODAL ===================== */}
            {
                showForm &&
                createPortal(
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h3>{editing ? "Edit Permission" : "Create Permission"}</h3>
                                <button
                                    className="btn-close"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditing(null);
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="modal-body">
                                <PermissionForm
                                    editing={editing}
                                    onSuccess={() => {
                                        setShowForm(false);
                                        setEditing(null);
                                        loadPermissions();

                                        setPopupMessage("Permission saved successfully.");
                                        setPopupType("success");
                                    }}
                                />
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* ===================== POPUP ===================== */}
            {
                popupType &&
                createPortal(
                    <div className="success-overlay">
                        <div className="success-modal">
                            <div
                                className="success-icon"
                                style={{
                                    background:
                                        popupType === "confirm" ? "#f87171" : "#4ade80",
                                    boxShadow:
                                        popupType === "confirm"
                                            ? "0 0 0 8px #fee2e2"
                                            : "0 0 0 8px #dcfce7",
                                }}
                            >
                                {popupType === "confirm" ? "!" : "✓"}
                            </div>

                            <h2>
                                {popupType === "confirm" ? "Confirm Delete" : "Success!"}
                            </h2>

                            <p>{popupMessage}</p>

                            {popupType === "confirm" && (
                                <div className="confirm-actions">
                                    <button
                                        className="btn-cancel"
                                        onClick={() => {
                                            setPopupType(null);
                                            setDeleteTarget(null);
                                        }}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        className="btn-delete"
                                        onClick={handleConfirmDelete}
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body
                )
            }
        </>
    );
}