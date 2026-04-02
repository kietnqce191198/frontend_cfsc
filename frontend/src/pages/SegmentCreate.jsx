import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { segmentApi } from "../services/api";
import "@fortawesome/fontawesome-free/css/all.min.css";

const NUMBER_DATE_OPS = [">", ">=", "<", "<=", "="];
const TEXT_OPS = ["IN", "NOT_IN"];
const LOYALTY_TIERS = ["GOLD", "SILVER", "BRONZE"];
const NUMBER_DATE_OP_LABELS = {
  ">": "Greater than (>)",
  ">=": "Greater than or equal to (>=)",
  "<": "Less than (<)",
  "<=": "Less than or equal to (<=)",
  "=": "Equal to (=)",
};
const TEXT_OP_LABELS = {
  IN: "In set (IN)",
  NOT_IN: "Not in set (NOT_IN)",
};

const defaultForm = {
  name: "",
  description: "",
  logic: "AND",
  totalSpent: "",
  conditionSpent: ">=",
  orderCount: "",
  conditionCount: ">=",
  lastOrderDate: "",
  conditionDate: ">=",
  loyaltyTier: "GOLD",
  conditionTier: "IN",
  location: "",
  conditionLocation: "IN",
};

export default function SegmentCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const buildPayload = () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      criteria: {
        logic: form.logic,
      },
    };

    if (form.totalSpent !== "") {
      payload.criteria.totalSpent = Number(form.totalSpent);
      payload.criteria.conditionSpent = form.conditionSpent;
    }

    if (form.orderCount !== "") {
      payload.criteria.orderCount = Number(form.orderCount);
      payload.criteria.conditionCount = form.conditionCount;
    }

    if (form.lastOrderDate) {
      payload.criteria.lastOrderDate = form.lastOrderDate;
      payload.criteria.conditionDate = form.conditionDate;
    }

    if (form.loyaltyTier) {
      payload.criteria.loyaltyTier = form.loyaltyTier;
      payload.criteria.conditionTier = form.conditionTier;
    }

    if (form.location.trim()) {
      payload.criteria.location = form.location.trim();
      payload.criteria.conditionLocation = form.conditionLocation;
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = buildPayload();
      if (!payload.name) {
        throw new Error("Customer segment name cannot be empty.");
      }
      await segmentApi.createSegment(payload);
      navigate("/admin/segments");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to create segment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto" }}>
      <div style={{ marginBottom: 14, color: "#6b7280", fontSize: 14 }}>
        <a href="/admin/segments" style={{ color: "#4f46e5", textDecoration: "none", fontWeight: 600 }}>
          Customer Segments
        </a>{" "}
        &gt; <span>Create New</span>
      </div>
      <div className="admin-header">
        <div>
          <h1 style={{ fontSize: 30, marginBottom: 6 }}>Create New Customer Segment</h1>
          <p style={{ fontSize: 15 }}>Set up new conditions to filter target customers.</p>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "5px 10px" }}>
          <button
            type="button"
            className="admin-secondary-btn"
            onClick={() => navigate("/admin/segments")}
            style={{ padding: "12px 20px", borderRadius: 12, fontSize: 15, fontWeight: 600 }}
          >
            Cancel
          </button>
          <button type="submit" form="segment-create-form" className="admin-primary-btn" disabled={submitting}>
            {submitting ? "Saving..." : "Save Segment"}
          </button>
        </div>
      </div>

      {error && <div style={{ marginBottom: 12, color: "#b91c1c", fontWeight: 600 }}>{error}</div>}

      <form id="segment-create-form" onSubmit={handleSubmit}>
        <div
          className="form-card"
          style={{ marginBottom: 18, borderRadius: 14, boxShadow: "0 8px 24px rgba(15,23,42,0.06)" }}
        >
          <h3 style={{ marginTop: 0, fontSize: 22 }}>General Information</h3>
          <p style={{ marginTop: 0, color: "#6b7280" }}>Segment name and description.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
              placeholder="Segment Name"
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15 }}
            />
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
              placeholder="Segment Description"
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db", resize: "vertical", fontSize: 15 }}
            />
          </div>
        </div>

        <div className="form-card" style={{ borderRadius: 14, boxShadow: "0 8px 24px rgba(15,23,42,0.06)" }}>
          <h3 style={{ marginTop: 0, fontSize: 22 }}>Filter Criteria</h3>
          

          <div style={{ marginBottom: 14, background: "#eef2ff", borderRadius: 12, padding: 14 }}>
            <label style={{ fontWeight: 600, marginRight: 8 }}>Customers must match condition:</label>
            <select
              value={form.logic}
              onChange={(e) => updateField("logic", e.target.value)}
              style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15 }}
            >
              <option value="AND">All of the following (AND)</option>
              <option value="OR">Any of the following (OR)</option>
            </select>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr 3fr",
              gap: 8,
              marginBottom: 8,
              fontWeight: 600,
              color: "#374151",
              fontSize: 15,
            }}
          >
            <div>Field</div>
            <div>Condition</div>
            <div>Value</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 3fr", gap: 8, marginBottom: 8 }}>
            <div
              style={{
                padding: "11px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 15,
                background: "#f9fafb",
              }}
            >
              <i className="fas fa-coins" style={{ marginRight: 8 }} aria-hidden="true"></i>Total Spent
            </div>
            <select
              value={form.conditionSpent}
              onChange={(e) => updateField("conditionSpent", e.target.value)}
              style={{ padding: 11, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15 }}
            >
              {NUMBER_DATE_OPS.map((op) => (
                <option key={op} value={op}>
                  {NUMBER_DATE_OP_LABELS[op]}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={form.totalSpent}
              onChange={(e) => updateField("totalSpent", e.target.value)}
              placeholder="100000"
              style={{ padding: 11, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 3fr", gap: 8, marginBottom: 8 }}>
            <div
              style={{
                padding: "11px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 15,
                background: "#f9fafb",
              }}
            >
              <i className="fas fa-receipt" style={{ marginRight: 8 }} aria-hidden="true"></i>Order Quantity
            </div>
            <select
              value={form.conditionCount}
              onChange={(e) => updateField("conditionCount", e.target.value)}
              style={{ padding: 11, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15 }}
            >
              {NUMBER_DATE_OPS.map((op) => (
                <option key={op} value={op}>
                  {NUMBER_DATE_OP_LABELS[op]}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={form.orderCount}
              onChange={(e) => updateField("orderCount", e.target.value)}
              placeholder="1"
              style={{ padding: 11, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 3fr", gap: 8, marginBottom: 8 }}>
            <div style={{ padding: "11px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15, background: "#f9fafb" }}>
              <i className="far fa-calendar-alt" style={{ marginRight: 8 }} aria-hidden="true"></i>Order Date
            </div>
            <select
              value={form.conditionDate}
              onChange={(e) => updateField("conditionDate", e.target.value)}
              style={{ padding: 11, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15 }}
            >
              {NUMBER_DATE_OPS.map((op) => (
                <option key={op} value={op}>
                  {NUMBER_DATE_OP_LABELS[op]}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.lastOrderDate}
              onChange={(e) => updateField("lastOrderDate", e.target.value)}
              style={{ padding: 11, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 3fr", gap: 8, marginBottom: 8 }}>
            <div style={{ padding: "11px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15, background: "#f9fafb" }}>
              <i className="fas fa-medal" style={{ marginRight: 8 }} aria-hidden="true"></i>Loyalty Tier
            </div>
            <select
              value={form.conditionTier}
              onChange={(e) => updateField("conditionTier", e.target.value)}
              style={{ padding: 11, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15 }}
            >
              {TEXT_OPS.map((op) => (
                <option key={op} value={op}>
                  {TEXT_OP_LABELS[op]}
                </option>
              ))}
            </select>
            <select
              value={form.loyaltyTier}
              onChange={(e) => updateField("loyaltyTier", e.target.value)}
              style={{ padding: 11, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15 }}
            >
              {LOYALTY_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 3fr", gap: 8 }}>
            <div style={{ padding: "11px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15, background: "#f9fafb" }}>
              <i className="fas fa-map-marker-alt" style={{ marginRight: 8 }} aria-hidden="true"></i>Location
            </div>
            <select
              value={form.conditionLocation}
              onChange={(e) => updateField("conditionLocation", e.target.value)}
              style={{ padding: 11, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15 }}
            >
              {TEXT_OPS.map((op) => (
                <option key={op} value={op}>
                  {TEXT_OP_LABELS[op]}
                </option>
              ))}
            </select>
            <input
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="e.g., Ha Noi"
              style={{ padding: 11, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15 }}
            />
          </div>
        </div>
      </form>
    </div>
  );
}