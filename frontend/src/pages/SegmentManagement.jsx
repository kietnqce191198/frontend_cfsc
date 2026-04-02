import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { segmentApi } from "../services/api";

export default function SegmentManagement() {
  const navigate = useNavigate();
  const [activeLeftTab, setActiveLeftTab] = useState("segments");

  const [segments, setSegments] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // STATE CHO POPUP XÓA
  const [deleteModal, setDeleteModal] = useState({ show: false, segmentId: null });

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);
  const visiblePages = useMemo(() => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  const loadSegments = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await segmentApi.getSegments(page, limit);
      setSegments(response.data?.data || []);
      setTotal(response.data?.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load segment list.");
      setSegments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/", { replace: true });
      return;
    }
    if (activeLeftTab === "segments") {
      loadSegments();
    }
  }, [activeLeftTab, page]);

  // LOGIC XỬ LÝ XÓA SAU KHI XÁC NHẬN TỪ POPUP
  const confirmDelete = async () => {
    const segmentId = deleteModal.segmentId;
    try {
      await segmentApi.deleteSegment(segmentId);
      setMessage("Segment deleted successfully.");
      setDeleteModal({ show: false, segmentId: null }); // Đóng popup
      
      if (segments.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await loadSegments();
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete segment.");
      setDeleteModal({ show: false, segmentId: null });
    }
  };

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {/* SECTION CHÍNH */}
      <section style={{ flex: 1, maxWidth: 1180, margin: "0 auto", position: "relative" }}>
        <div
          className="form-card"
          style={{
            padding: 22,
            borderRadius: 14,
            marginBottom: 18,
            boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: 30, margin: 0, color: "#111827" }}>Customer Segments</h1>
            <p style={{ fontSize: 15, margin: "6px 0 0", color: "#6b7280" }}>
              Manage segments and customer filter criteria.
            </p>
          </div>
          <button
            type="button"
            className="admin-primary-btn"
            onClick={() => navigate("/admin/segments/new")}
          >
            + Create Segment
          </button>
        </div>

        {error && <div style={{ marginBottom: 12, color: "#b91c1c", fontWeight: 600 }}>{error}</div>}
        {message && <div style={{ marginBottom: 12, color: "#15803d", fontWeight: 600 }}>{message}</div>}

        <div
          className="table-responsive"
          style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 6px 18px rgba(15,23,42,0.05)" }}
        >
          <table className="admin-table" style={{ fontSize: 15 }}>
            <thead style={{ background: "#eef2ff" }}>
              <tr>
                <th style={{ padding: "14px 12px" }}>ID</th>
                <th style={{ padding: "14px 12px" }}>Segment Name</th>
                <th style={{ padding: "14px 12px" }}>Customers</th>
                <th style={{ padding: "14px 12px" }}>Created At</th>
                <th style={{ padding: "14px 12px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && segments.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", opacity: 0.7, padding: 18 }}>
                    No data available.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 18 }}>
                    Loading...
                  </td>
                </tr>
              )}
              {!loading &&
                segments.map((segment) => (
                  <tr key={segment.segmentId}>
                    <td style={{ padding: "12px 12px" }}>{segment.segmentId}</td>
                    <td style={{ padding: "12px 12px", fontWeight: 600 }}>{segment.name}</td>
                    <td style={{ padding: "12px 12px" }}>{segment.customerCount ?? 0}</td>
                    <td style={{ padding: "12px 12px" }}>{segment.createdAt || "-"}</td>
                    <td>
                      <div className="action-buttons" style={{ display: "flex", gap: 8 }}>
                        <button
                          className="edit-btn"
                          onClick={() => navigate(`/admin/segments/${segment.segmentId}`)}
                        >
                          Details
                        </button>
                        <button
                          className="lock-btn"
                          onClick={() => navigate(`/admin/segments/${segment.segmentId}/customers`)}
                        >
                          View Customers
                        </button>
                        <button 
                          className="delete-btn" 
                          onClick={() => setDeleteModal({ show: true, segmentId: segment.segmentId })}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* PHÂN TRANG */}
        <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center" }}>
          <button
            type="button"
            className="admin-secondary-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ borderRadius: 999, width: 44, height: 44, padding: 0 }}
          >
            ‹
          </button>
          {visiblePages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setPage(pageNumber)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                border: pageNumber === page ? "1px solid #1d4ed8" : "1px solid #d1d5db",
                background: pageNumber === page ? "#2563eb" : "#fff",
                color: pageNumber === page ? "#fff" : "#111827",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            className="admin-secondary-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{ borderRadius: 999, width: 44, height: 44, padding: 0 }}
          >
            ›
          </button>
        </div>
      </section>

      {/* POPUP XÁC NHẬN XÓA (DELETE MODAL) */}
      {deleteModal.show && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#fff",
            padding: "24px",
            borderRadius: "16px",
            maxWidth: "400px",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              background: "#fee2e2",
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "0 auto 16px",
            }}>
              <i className="fas fa-trash-alt" style={{ color: "#ef4444", fontSize: "24px" }}></i>
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#111827" }}>
              Delete Segment
            </h3>
            <p style={{ color: "#6b7280", fontSize: "15px", marginBottom: "24px" }}>
              Are you sure you want to delete this segment? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setDeleteModal({ show: false, segmentId: null })}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#ef4444",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}