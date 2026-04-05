import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { segmentApi } from "../services/api";

export default function SegmentCustomerList() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [rows, setRows] = useState([]);
  const [segmentName, setSegmentName] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/", { replace: true });
      return;
    }
    loadData();
  }, [id, page]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [customerRes, segmentRes] = await Promise.all([
        segmentApi.getCustomersInSegment(id, page, limit),
        segmentApi.getSegmentById(id),
      ]);
      setRows(customerRes.data?.data || []);
      setTotal(customerRes.data?.total || 0);
      setSegmentName(segmentRes.data?.name || "");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load customer list.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ marginBottom: 16, color: "#6b7280", fontSize: 15 }}>
        <a href="/admin/segments" style={{ color: "#4f46e5", textDecoration: "none", fontWeight: 600 }}>
          Customer Segments
        </a>{" "}
        &gt; <span>Customer List</span>
      </div>

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
          <h1 style={{ fontSize: 30, margin: 0, color: "#111827" }}>Customers by Segment</h1>
          <p style={{ fontSize: 15, margin: "6px 0 0", color: "#6b7280" }}>
            Segment: <span style={{ color: "#111827", fontWeight: 600 }}>{segmentName || `#${id}`}</span>
          </p>
        </div>
        <button type="button" className="admin-secondary-btn" onClick={() => navigate("/admin/segments")}>
          ← Back to Segments
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 12,
            color: "#b91c1c",
            fontWeight: 600,
            background: "#fee2e2",
            border: "1px solid #fecaca",
            padding: "10px 12px",
            borderRadius: 10,
          }}
        >
          {error}
        </div>
      )}

      <div
        className="table-responsive"
        style={{
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 6px 18px rgba(15,23,42,0.05)",
        }}
      >
        <table className="admin-table" style={{ fontSize: 15 }}>
          <thead style={{ background: "#eef2ff" }}>
            <tr>
              <th style={{ padding: "14px 12px" }}>ID</th>
              <th style={{ padding: "14px 12px" }}>Email</th>
              <th style={{ padding: "14px 12px" }}>Full Name</th>
              <th style={{ padding: "14px 12px" }}>Total Spent</th>
              <th style={{ padding: "14px 12px" }}>Orders</th>
              <th style={{ padding: "14px 12px" }}>Last Order</th>
              <th style={{ padding: "14px 12px" }}>Loyalty Tier</th>
              <th style={{ padding: "14px 12px" }}>Location</th>
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
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", opacity: 0.7, padding: 18 }}>
                  No matching customers found.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((customer, index) => (
                <tr key={customer.id || index}>
                  <td style={{ padding: "12px 12px" }}>{customer.id || "-"}</td>
                  <td style={{ padding: "12px 12px" }}>{customer.email || "-"}</td>
                  <td style={{ padding: "12px 12px" }}>{customer.name || "-"}</td>
                  <td style={{ padding: "12px 12px" }}>{customer.totalSpent ?? "-"}</td>
                  <td style={{ padding: "12px 12px" }}>{customer.orderCount ?? "-"}</td>
                  <td style={{ padding: "12px 12px" }}>{customer.lastOrderDate || "-"}</td>
                  <td style={{ padding: "12px 12px" }}>{customer.loyaltyTier || "-"}</td>
                  <td style={{ padding: "12px 12px" }}>{customer.location || "-"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}