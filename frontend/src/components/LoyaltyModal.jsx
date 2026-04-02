import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { loyaltyApi } from "../services/api";
import "./admin.css";

function LoyaltyModal({ customerId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [loyalty, setLoyalty] = useState(null);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [tierHistory, setTierHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  // Pagination
  const [pointsPage, setPointsPage] = useState(1);
  const [tierPage, setTierPage] = useState(1);

  useEffect(() => {
    fetchLoyalty();
    fetchPointsHistory(pointsPage);
    fetchTierHistory(tierPage);
  }, [customerId, pointsPage, tierPage]);

  const fetchLoyalty = async () => {
    try {
      setLoading(true);
      const res = await loyaltyApi.getLoyaltyInfo(customerId);
      setLoyalty(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load loyalty info");
    } finally {
      setLoading(false);
    }
  };

  const fetchPointsHistory = async (page) => {
    try {
      const res = await loyaltyApi.getPointsHistory(customerId, page);
      setPointsHistory(res.data?.data || res.data || []);
    } catch (error) {
      toast.error("Failed to load points history");
    }
  };

  const fetchTierHistory = async (page) => {
    try {
      const res = await loyaltyApi.getTierHistory(customerId, page);
      setTierHistory(res.data?.data || res.data || []);
    } catch (error) {
      toast.error("Failed to load tier history");
    }
  };

  if (loading) return <div className="modal-overlay">Loading...</div>;

  if (!loyalty) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>Loyalty Info - {loyalty.enrolled ? "Enrolled" : "Not Enrolled"}</h3>

        {loyalty.enrolled ? (
          <>
            {/* Tabs */}
            <div className="tabs">
              <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>Overview</button>
              <button className={activeTab === "points" ? "active" : ""} onClick={() => setActiveTab("points")}>Points History</button>
              <button className={activeTab === "tier" ? "active" : ""} onClick={() => setActiveTab("tier")}>Tier History</button>
            </div>

            {activeTab === "overview" && (
              <div className="tab-content">
                <p><strong>Current Tier:</strong> {loyalty.current_tier.name} ({loyalty.current_tier.code})</p>
                <img src={loyalty.current_tier.icon_url} alt="tier icon" width={50}/>
                <p><strong>Current Points:</strong> {loyalty.current_points}</p>
                <p><strong>Lifetime Points:</strong> {loyalty.lifetime_points}</p>

                {loyalty.points_expiring_soon && (
                  <p style={{ color: "red" }}>
                    Points expiring soon: {loyalty.points_expiring_soon.amount} by {new Date(loyalty.points_expiring_soon.expiry_date).toLocaleDateString()}
                  </p>
                )}

                <p><strong>Progress to next tier ({loyalty.tier_progress.next_tier}):</strong> {loyalty.tier_progress.progress_percentage}% ({loyalty.tier_progress.points_to_next_tier} pts needed)</p>

                <h4>Tier Benefits:</h4>
                <ul>
                  {Object.entries(loyalty.current_tier.benefits).map(([key, val]) => (
                    <li key={key}><strong>{key}:</strong> {String(val)}</li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === "points" && (
              <div className="tab-content">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Description</th>
                      <th>Order ID</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointsHistory.length === 0 ? (
                      <tr><td colSpan="5">No points history</td></tr>
                    ) : (
                      pointsHistory.map((p) => (
                        <tr key={p.id}>
                          <td>{p.type}</td>
                          <td>{p.amount}</td>
                          <td>{p.description}</td>
                          <td>{p.order_id || "-"}</td>
                          <td>{new Date(p.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "tier" && (
              <div className="tab-content">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>From Tier</th>
                      <th>To Tier</th>
                      <th>Reason</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tierHistory.length === 0 ? (
                      <tr><td colSpan="4">No tier history</td></tr>
                    ) : (
                      tierHistory.map((t) => (
                        <tr key={t.id}>
                          <td>{t.from_tier}</td>
                          <td>{t.to_tier}</td>
                          <td>{t.reason}</td>
                          <td>{new Date(t.changed_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div>
            <p>Customer not enrolled in Loyalty Program.</p>
            <button onClick={() => toast.info("Redirect to enroll page")}>Enroll Now</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoyaltyModal;