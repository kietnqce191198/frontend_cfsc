import { useEffect, useMemo, useState } from "react";
import "../assets/loyalty-admin.css";

const ENG_BASE = import.meta.env.VITE_ENGAGEMENT_BASE_URL || "http://localhost:8083";
const CUS_BASE = import.meta.env.VITE_CUSTOMER_BASE_URL || "http://localhost:8082";

function LoyaltyManage() {
  const token = localStorage.getItem("accessToken");
  const [tiers, setTiers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loyals, setLoyals] = useState({}); 
  const [balance, setBalance] = useState(null);
  const [adjustType, setAdjustType] = useState("ADD");
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState("");
  const [modalHistory, setModalHistory] = useState(null); 
  const [pointsHistory, setPointsHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [popup, setPopup] = useState({ show: false, msg: "", type: "info" });

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const showNotification = (msg, type = "info") => {
    setPopup({ show: true, msg, type });
    setTimeout(() => setPopup({ show: false, msg: "", type: "info" }), 3000);
  };

  const readErrorMessage = async (res, fallback) => {
    try {
      const payload = await res.json();
      if (typeof payload?.message === "string" && payload.message.trim()) {
        return payload.message;
      }
      return fallback;
    } catch {
      try {
        const text = await res.text();
        return text || fallback;
      } catch {
        return fallback;
      }
    }
  };

  const fetchCustomers = async (q = "") => {
    setLoading(true);
    try {
      const url = `${CUS_BASE}/api/customers/simple${q ? `?q=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url, { headers: { "Content-Type": "application/json", ...authHeaders } });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.data || []);
      setCustomers(list);
    } catch (e) {
      showNotification("Failed to fetch customers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers("");
  }, []);

  useEffect(() => {
    const h = setTimeout(() => {
      fetchCustomers(search.trim());
    }, 300);
    return () => clearTimeout(h);
  }, [search]);

  useEffect(() => {
    const run = async () => {
      if (!customers || customers.length === 0) {
        setLoyals({});
        return;
      }
      const sub = customers.slice(0, 50);
      const entries = await Promise.all(sub.map(async (c) => {
        try {
          const res = await fetch(`${ENG_BASE}/customers/${c.customerId}/loyalty/summary`, {
            headers: { "Content-Type": "application/json", ...authHeaders },
          });
          const raw = await res.json();
          const d = raw || {};
          const points = Number(d.current_points ?? 0) || 0;
          let tier = d.tier ?? "-";
          if (typeof tier !== "string") tier = String(tier ?? "-");
          return [c.customerId, { points, tier }];
        } catch {
          return [c.customerId, { points: 0, tier: "-" }];
        }
      }));
      const map = {};
      for (const [id, v] of entries) map[id] = v;
      setLoyals(map);
    };
    run();
  }, [customers]);

  useEffect(() => {
    if (!customerId) {
      setBalance(null);
      return;
    }
    fetchBalance(customerId);
  }, [customerId]);

  const fetchBalance = async (cid) => {
    try {
      const res = await fetch(`${ENG_BASE}/customers/${cid}/loyalty/balance?recent=5`, {
        headers: { "Content-Type": "application/json", ...authHeaders },
      });
      if (!res.ok) {
        setBalance(null);
        return;
      }
      const data = await res.json();
      setBalance(data);
    } catch {
      setBalance(null);
    }
  };

  const submitAdjust = async (e) => {
    e.preventDefault();
    if (!customerId) {
      showNotification("Please select a customer first", "error");
      return;
    }
    if (reason.length < 10) {
        showNotification("Reason must be at least 10 characters", "error");
        return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${ENG_BASE}/customers/${customerId}/loyalty/points/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          type: adjustType,
          amount: Number(amount),
          reason,
        }),
      });
      if (!res.ok) {
        const message = await readErrorMessage(res, "Adjust failed");
        throw new Error(message);
      }
      
      showNotification("Adjust points successfully!", "success");
      setReason("");

      if (modalHistory && String(modalHistory.customerId) === String(customerId)) {
        await fetchPointsHistory(customerId);
      }
      await fetchBalance(customerId);
      
      const sres = await fetch(`${ENG_BASE}/customers/${customerId}/loyalty/summary`, {
        headers: { "Content-Type": "application/json", ...authHeaders },
      });
      const data = await sres.json();
      const updated = {
        points: Number(data?.current_points ?? 0) || 0,
        tier: typeof data?.tier === "string" ? data.tier : String(data?.tier ?? "-"),
      };
      setLoyals((prev) => ({ ...prev, [customerId]: updated }));
      
    } catch (e) {
      showNotification(e.message || "Adjust failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchPointsHistory = async (cid) => {
    if (!cid) return;
    setLoading(true);
    try {
      const res = await fetch(`${ENG_BASE}/customers/${cid}/loyalty/points-history`, {
        headers: { "Content-Type": "application/json", ...authHeaders },
      });
      if (!res.ok) {
        const message = await readErrorMessage(res, "Failed to fetch history");
        throw new Error(message);
      }
      const data = await res.json();
      setPointsHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      showNotification(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lm-container">
      {popup.show && (
        <div className={`lm-toast-popup ${popup.type}`}>
          <div className="lm-toast-content">
            {popup.type === "success" ? "✅" : "⚠️"} {popup.msg}
          </div>
        </div>
      )}

      <div className="lm-header">
        <div className="lm-title">
          <span className="lm-icon">💎</span>
          Loyalty Manage
        </div>
      </div>

      <div className="lm-card" style={{ marginBottom: 16 }}>
        <div className="lm-card-header">
          <div className="lm-card-title">Customers</div>
          <div className="lm-actions">
            <input
              className="lm-input"
              placeholder="Search by name/email/id..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 320 }}
            />
          </div>
        </div>
        <div className="lm-card-body">
          <div className="lm-table">
            <div className="lm-thead">
              <div>Name</div>
              <div>Email</div>
              <div>Code</div>
              <div>Points</div>
              <div>Rank</div>
              <div style={{ textAlign: "right" }}>Actions</div>
            </div>
            <div className="lm-tbody lm-scroll">
              {customers.length === 0 ? (
                <div className="lm-empty" style={{ padding: 12 }}>No customers</div>
              ) : (
                customers.slice(0, 50).map((c, i) => (
                  <div key={i} className="lm-row">
                    <div>{c.fullName || "Unnamed"}</div>
                    <div className="lm-subtle">{c.email || "-"}</div>
                    <div><span className="lm-badge">{c.customerCode || "-"}</span></div>
                    <div>{loyals[c.customerId]?.points ?? "-"}</div>
                    <div>{loyals[c.customerId]?.tier ?? "-"}</div>
                    <div className="lm-actions end">
                      <button
                        className="lm-btn outline"
                        onClick={async () => {
                          setModalHistory(c);
                          await fetchPointsHistory(c.customerId);
                        }}
                      >
                        History
                      </button>
                      <button
                        className="lm-btn"
                        onClick={() => { 
                            setCustomerId(String(c.customerId)); 
                            setCustomerCode(c.customerCode || ""); 
                            showNotification(`Selected: ${c.fullName}`);
                        }}
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="lm-card" style={{ marginBottom: 16 }}>
        <div className="lm-card-header">
          <div className="lm-card-title">Adjust Points</div>
        </div>
        <div className="lm-card-body">
          {balance && (
            <div className="lm-stats" style={{ marginBottom: 10 }}>
              <div className="lm-stat">
                <div className="lm-stat-label">Current Points</div>
                <div className="lm-stat-value">{balance.current_points}</div>
              </div>
              {/* <div className="lm-stat">
                <div className="lm-stat-label">Pending</div>
                <div className="lm-stat-value">{balance.pending_points}</div>
              </div> */}
              {/* <div className="lm-stat">
                <div className="lm-stat-label">Expiring soon</div>
                <div className="lm-stat-value">
                  {(balance.expiring_soon?.points ?? 0)} {balance.expiring_soon?.date ? `(${balance.expiring_soon.date})` : ""}
                </div>
              </div> */}
              <div className="lm-stat">
                <div className="lm-stat-label">Current Total Value</div>
                <div className="lm-stat-value" style={{ color: '#2563eb' }}>
                  {new Intl.NumberFormat("vi-VN").format(balance.points_value?.current_points_value || 0)}{" "}
                  {balance.points_value?.points_value_currency || "VND"}
                </div>
              </div>
            </div>
          )}
          <form className="lm-form" onSubmit={submitAdjust}>
            <div className="lm-row">
              <div className="lm-field">
                <label>Customer Code</label>
                <input className="lm-input" value={customerCode} readOnly placeholder="Select a customer above" />
              </div>
              <div className="lm-field">
                <label>Type</label>
                <select className="lm-input" value={adjustType} onChange={e => setAdjustType(e.target.value)}>
                  <option value="ADD">ADD</option>
                  <option value="DEDUCT">DEDUCT</option>
                </select>
              </div>
              <div className="lm-field">
                <label>Amount</label>
                <input 
                    className="lm-input" 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    min={1} 
                />
                {/* HIỂN THỊ GIÁ TRỊ QUY ĐỔI REAL-TIME */}
                
              </div>
            </div>
            <div className="lm-field">
              <label>Reason</label>
              <textarea className="lm-input" rows={4} value={reason} onChange={e => setReason(e.target.value)} placeholder="At least 10 characters" />
            </div>
            <div className="lm-actions end">
              <button className="lm-btn primary" type="submit" disabled={loading}>Submit Adjustment</button>
            </div>
          </form>
        </div>
      </div>

      {modalHistory && (
        <div className="confirm-overlay" onClick={() => { setModalHistory(null); setPointsHistory([]); }}>
          <div className="loyalty-box" onClick={(e) => e.stopPropagation()}>
            <h3>History — {modalHistory.fullName} (Code: {modalHistory.customerCode || "-"})</h3>
            <div className="loyalty-scroll lm-history-list" style={{ maxHeight: 360 }}>
              {pointsHistory.length === 0 ? (
                <p className="lm-empty">No records</p>
              ) : (
                pointsHistory.map((p, i) => {
                  const isAdd = String(p.type || "").toUpperCase() === "ADD";
                  const sign = isAdd ? "+" : "-";
                  const cls = isAdd ? "add" : "deduct";
                  const dt = new Date(p.createdAt);
                  const pad = (n) => String(n).padStart(2, "0");
                  const dateStr = `${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())} ${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()}`;
                  return (
                    <div key={i} className="lm-history-item">
                      <div className="lm-history-row">
                        <span className={`lm-amount ${cls}`}>{sign}{p.amount}</span>
                        <span className="lm-subtle lm-ts">{dateStr}</span>
                      </div>
                      <div className="lm-reason">{p.reason}</div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="lm-actions end" style={{ marginTop: 12 }}>
              <button className="lm-btn" onClick={() => { setModalHistory(null); setPointsHistory([]); }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoyaltyManage;